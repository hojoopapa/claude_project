import Phaser from 'phaser';
import { ENEMIES, EnemyDef, EnemyKind } from '../data/enemies';
import { TOWERS, TowerKind, TowerLvl, SELL_RATIO } from '../data/towers';
import { HEROES, HeroKind } from '../data/heroes';
import { WALL_REACH, WallTier } from '../data/walls';
import { PathData, Vec } from './path';
import { hasSkinTexture, texFor } from '../skin';
import { play } from '../sound';

/** 엔티티가 게임 상태에 접근하는 창구 */
export interface World {
  readonly gs: Phaser.Scene;
  enemies: Enemy[];
  soldiers: Soldier[];
  projs: Projectile[];
  gainGold(n: number, x: number, y: number): void;
  leak(lives: number): void;
  splashFx(x: number, y: number, r: number, color: number): void;
  /** 난이도에 따른 적 체력 배율 */
  readonly hpMul: number;
  /** 파괴 공격(breath)이 있는 보스가 움직일 때마다 불린다: 발밑 파괴와 브레스 */
  bossTick(e: Enemy, dt: number): void;
  /** 돌아다니는 보스(roams)가 다음에 날아갈 곳 */
  roamTarget(e: Enemy): Vec;
}

/** 돌아다니는 보스가 경로를 따라 이 거리(px)만큼 들어온 뒤부터 자유롭게 날아다닌다 */
const ROAM_ENTER = 170;
/** 돌아다닐 때의 속도 배율 (경로를 따라올 때보다 빠르게) */
const ROAM_SPEED = 1.8;

/** 적을 막아 세우는 것 (병사, 영웅, 벽) */
export interface Blocker { x: number; y: number; dead: boolean; hurt(n: number): void }

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

const easeOutBack = (p: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

/** 몸 아래 그림자. 공중 유닛은 더 작고 옅게 그린다. */
function makeShadow(w: World, img: Phaser.GameObjects.Image, flying = false) {
  const wd = img.displayWidth * (flying ? 0.42 : 0.6);
  return w.gs.add.ellipse(img.x, img.y, wd, wd * 0.3, 0x000000, flying ? 0.13 : 0.24).setDepth(2);
}

/** 쓰러지거나 사라질 때: 줄어들며 기울고 가라앉는 연출 후 정리 */
function vanish(w: World, img: Phaser.GameObjects.Image, fall: number, spin: number, ms: number) {
  w.gs.tweens.add({
    targets: img, alpha: 0, scaleX: img.scaleX * 0.55, scaleY: img.scaleY * 0.55, y: img.y + fall, angle: spin,
    duration: ms, ease: 'Quad.In', onComplete: () => img.destroy(),
  });
}

interface Pose { dy: number; rot: number; sx: number; sy: number }

/** 걷기: 위아래로 통통 튀고, 좌우로 기울고, 살짝 눌렸다 펴진다. 멈추면 숨쉬듯 부풀었다 가라앉는다. */
function walkPose(heavy: boolean, t: number, speed: number, moving: boolean): Pose {
  if (!moving) return { dy: 0, rot: 0, sx: 1, sy: 1 + Math.sin(t * 2.4) * 0.02 };
  const w = (heavy ? 5 : 7) + speed * (heavy ? 0.06 : 0.1);
  const s = Math.sin(t * w), c = Math.cos(t * w * 2);
  return { dy: -Math.abs(s) * (heavy ? 2.6 : 3.4), rot: s * (heavy ? 0.04 : 0.085), sx: 1 - c * 0.02, sy: 1 + c * 0.035 };
}

/** 공격할 때 상대 쪽으로 잠깐 내미는 거리 */
const lungeOf = (swing: number, dir: number) => (swing > 0 ? Math.sin(Math.PI * (1 - swing / 0.22)) * 6 * dir : 0);

export class Enemy {
  readonly def: EnemyDef;
  readonly img: Phaser.GameObjects.Image;
  hp: number;
  maxHp: number;
  d = 0;
  x: number;
  y: number;
  dead = false;
  blocker: Blocker | null = null;
  breathT = NaN;                  // 다음 브레스까지 남은 시간 (breath 가 있는 보스만 씀)
  chargeT = 0;                    // 브레스를 모으는 중인 남은 시간 (이 동안 sprite.alt 그림을 쓴다)
  hurtT = 0;                      // 맞은 뒤 놀란 표정을 유지하는 남은 시간 (frames.hurt 가 있는 적)
  private roamTo: Vec | null = null;   // 돌아다니는 보스의 다음 목적지
  private roamHold = 0;                // 목적지에 도착해서 머무는 남은 시간
  facing: 1 | -1 = 1;             // 가는 방향 (1 = 오른쪽)
  private atk = 0.5;
  private flash = 0;
  private slowMul = 1;
  private slowT = 0;
  private stunT = 0;
  private healT = 0;
  private anim = Math.random() * 6;   // 움직임 위상
  private swing = 0;                  // 공격 때 내미는 연출의 남은 시간
  private swingDir = 1;
  private pop = 0;                    // 맞았을 때 순간 부푸는 연출
  private born = 0;
  private baseScale: number;
  private shadow: Phaser.GameObjects.Ellipse;

  constructor(private w: World, kind: EnemyKind, readonly path: PathData) {
    this.def = ENEMIES[kind];
    this.hp = this.maxHp = this.def.hp * w.hpMul;
    const p = path.at(0);
    this.x = p.x; this.y = p.y;
    // 한 장짜리 PNG 그림(sprite)이 있으면 그것으로, 없으면 SVG 그림으로 그린다
    const sp = this.def.sprite && w.gs.textures.exists(this.def.sprite.key) ? this.def.sprite : null;
    const tx = texFor(this.def.tex);
    this.img = w.gs.add.image(p.x, p.y, sp ? sp.key : tx.key);
    this.baseScale = sp ? sp.width / this.img.width : this.def.scale * tx.scale;
    this.img.setScale(this.baseScale).setAlpha(0);
    if (sp?.facesLeft) this.img.setFlipX(true);          // 원본이 왼쪽을 보고 있으니 처음(오른쪽으로 감)에는 뒤집는다
    this.shadow = makeShadow(w, this.img, this.def.flying).setAlpha(0);
  }

  /**
   * 돌아다니기: 목적지(타워와 병사 주변)까지 날아가 2~4초 머물다가 다음 목적지로 간다. 죽을 때까지 끝나지 않고, 경로 끝에 닿아도 나가지 않는다.
   * 경로 거리(d)를 끝 가까이로 두어 타워가 가장 먼저 노리게 한다 (놓아두면 아무도 못 잡는 보스가 되지 않도록).
   */
  private roam(dt: number) {
    this.d = this.path.total * 0.99;
    const before = this.x;
    let moving = false;
    if (this.roamHold > 0) this.roamHold -= dt;
    else {
      if (!this.roamTo) this.roamTo = this.w.roamTarget(this);
      const dd = dist(this.roamTo, this);
      if (dd < 6) { this.roamTo = null; this.roamHold = 2 + Math.random() * 2; }
      else {
        const step = Math.min(dd, this.def.speed * ROAM_SPEED * this.slowMul * dt);
        this.x += ((this.roamTo.x - this.x) / dd) * step;
        this.y += ((this.roamTo.y - this.y) / dd) * step;
        moving = true;
      }
    }
    if (Math.abs(this.x - before) > 0.01) {
      this.facing = this.x < before ? -1 : 1;
      this.img.setFlipX(this.def.sprite?.facesLeft ? this.facing === 1 : this.facing === -1);
    }
    this.applyPose(moving);
    if (this.def.breath) this.w.bossTick(this, dt);
  }

  /** 입 위치. 용이 브레스를 쏘는 곳 */
  mouth(): Vec {
    const sp = this.def.sprite;
    return sp ? { x: this.x + this.facing * sp.width * 0.38, y: this.y - 14 } : { x: this.x + this.facing * 24, y: this.y - 44 };
  }

  hurt(amount: number, magic: boolean) {
    const reduce = magic ? this.def.mr : this.def.armor;
    this.hp -= amount * (1 - reduce);
    this.flash = 0.08;
    this.pop = 0.12;
    this.hurtT = 0.35;
    this.img.setTint(0xff8080);
    if (this.hp <= 0 && !this.dead) this.die(true);
  }

  slow(mul: number, dur: number) {
    if (this.slowT <= 0 || mul <= this.slowMul) this.slowMul = mul;
    this.slowT = Math.max(this.slowT, dur);
  }

  stun(dur: number) { this.stunT = Math.max(this.stunT, dur); }

  die(killed: boolean) {
    this.dead = true;
    this.shadow.destroy();
    if (killed) play('die');
    if (killed) vanish(this.w, this.img, this.def.flying ? 28 : -6, (this.x % 2 < 1 ? 1 : -1) * (this.def.flying ? 50 : 24), this.def.flying ? 340 : 260);
    else vanish(this.w, this.img, 0, 0, 180);
    if (killed) this.w.gainGold(this.def.gold, this.x, this.y);
  }

  /**
   * 프레임 그림 고르기: 걷는 중이면 두 장을 0.22초마다 번갈아, 막혀서 싸우는 중이면 준비(공격1)와 찌르기(공격2).
   * 그림이 없으면 false 를 돌려주고 기존 그림을 그대로 쓴다.
   */
  private pickFrame(moving: boolean): boolean {
    const fr = this.def.frames;
    if (!fr || !hasSkinTexture(fr.walk[0])) return false;
    const engaged = !!this.blocker && !this.blocker.dead && dist(this.blocker, this) < 30;
    const key = fr.hurt && this.hurtT > 0 && hasSkinTexture(fr.hurt) ? fr.hurt
      : engaged ? (this.swing > 0 ? fr.atk[1] : fr.atk[0])
      : fr.walk[moving ? Math.floor(this.anim / (fr.dt ?? 0.22)) % 2 : 0];
    if (this.img.texture.key !== key) this.img.setTexture(key);
    return true;
  }

  /** 현재 자세(걷기/날갯짓/둥실)를 이미지와 그림자에 반영 */
  private applyPose(moving: boolean) {
    const t = this.anim, def = this.def;
    let p: Pose;
    if (def.anim === 'flap') {
      const drake = def.tex === 'e_drake';
      p = { dy: Math.sin(t * (drake ? 3.5 : 5)) * 3, rot: Math.sin(t * (drake ? 3.5 : 5)) * (drake ? 0.03 : 0.08), sx: 1, sy: 1 + Math.sin(t * (drake ? 7 : 24)) * (drake ? 0.07 : 0.17) };
    } else if (def.anim === 'float') {
      p = { dy: Math.sin(t * 2.6) * 3, rot: Math.sin(t * 1.6) * 0.05, sx: 1 + Math.sin(t * 3.4) * 0.03, sy: 1 + Math.sin(t * 3.4) * 0.03 };
    } else p = walkPose(def.anim === 'heavy', t, def.speed, moving);
    const k = 1 + Math.max(0, this.pop) * 0.7;
    const air = def.flying ? -20 : 0;
    // 용: 브레스를 모으는 동안은 볼을 부풀린 그림으로 바꾼다
    const sp = def.sprite;
    if (sp?.alt && hasSkinTexture(sp.alt)) {
      const key = this.chargeT > 0 ? sp.alt : sp.key;
      if (this.img.texture.key !== key) this.img.setTexture(key);
    }
    // 프레임 그림이 있으면 걷기/공격 장면을 골라 바꾼다. 그림 자체가 움직임을 담고 있어서 통통 튀는 정도는 줄인다
    const framed = this.pickFrame(moving);
    if (framed) { p.dy *= 0.6; p.rot *= 0.4; }
    this.img
      .setPosition(this.x + lungeOf(this.swing, this.swingDir), this.y + air + p.dy)
      .setRotation(this.stunT > 0 ? Math.sin(t * 22) * 0.18 : p.rot)
      .setScale(this.baseScale * p.sx * k, this.baseScale * p.sy * k)
      .setDepth(def.flying ? 700 : this.y);
    this.shadow.setPosition(this.x, this.y + (def.flying ? 8 : this.img.displayHeight * 0.4));
  }

  update(dt: number) {
    if (this.dead) return; // 같은 틱에 스펠 등으로 이미 죽었으면 건드리지 않는다 (그림자는 이미 정리됨)
    this.anim += dt;
    if (this.swing > 0) this.swing -= dt;
    if (this.pop > 0) this.pop -= dt;
    if (this.chargeT > 0) this.chargeT -= dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.born < 0.3) { this.born += dt; const a = Math.min(1, this.born / 0.3); this.img.setAlpha(a); this.shadow.setAlpha(a); }
    if (this.flash > 0) this.flash -= dt;
    if (this.slowT > 0 && (this.slowT -= dt) <= 0) this.slowMul = 1;
    if (this.flash > 0) this.img.setTint(0xff8080);
    else if (this.slowT > 0 || this.stunT > 0) this.img.setTint(0x99ccff);
    else this.img.clearTint();
    if (this.stunT > 0) { this.stunT -= dt; this.applyPose(false); return; }
    const heal = this.def.heal;
    if (heal && (this.healT -= dt) <= 0) {
      this.healT = heal.every;
      let any = false;
      for (const e of this.w.enemies) {
        if (e === this || e.dead || e.hp >= e.maxHp || dist(e, this) > heal.radius) continue;
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * heal.pct);
        any = true;
      }
      if (any) this.w.splashFx(this.x, this.y, heal.radius * 0.55, 0x66ff88);
    }
    if (this.blocker?.dead) this.blocker = null;
    if (this.blocker && dist(this.blocker, this) < 30) {
      if ((this.atk -= dt) <= 0) {
        this.atk = 1;
        const bk = this.blocker;      // hurt()가 상대를 죽이면 this.blocker 가 비워지므로 먼저 잡아 둔다
        this.swing = 0.22;
        this.swingDir = bk.x >= this.x ? 1 : -1;
        bk.hurt(this.def.dmg);
      }
      this.applyPose(false);
      return;
    }
    if (this.def.roams && this.d >= ROAM_ENTER) { this.roam(dt); return; }   // 화면에 들어온 보스 용은 나가지 않고 돌아다닌다
    const before = this.x;
    this.d += this.def.speed * this.slowMul * dt;
    if (this.d >= this.path.total) {
      this.w.leak(this.def.lives);
      this.die(false);
      return;
    }
    const p = this.path.at(this.d);
    this.x = p.x; this.y = p.y;
    if (Math.abs(this.x - before) > 0.01) {
      this.facing = this.x < before ? -1 : 1;
      this.img.setFlipX(this.def.sprite?.facesLeft ? this.facing === 1 : this.facing === -1);
    }
    this.applyPose(true);
    if (this.def.breath) this.w.bossTick(this, dt);
  }
}

export class Soldier {
  readonly img: Phaser.GameObjects.Image;
  hp: number;
  maxHp: number;
  dead = false;
  x: number;
  y: number;
  target: Enemy | null = null;
  atkCd = 1;
  protected atk = 0;
  protected anim = Math.random() * 6;
  protected swing = 0;
  protected swingDir = 1;
  protected pop = 0;
  private born = 0;
  private base: number;
  private idleKey: string;
  protected atkTex: string | null = null;     // 공격하는 순간에 바꿔 쓰는 그림 (영웅 기사)
  private shadow: Phaser.GameObjects.Ellipse;

  constructor(
    protected w: World, public home: Vec, public dmg: number, hp: number,
    public leash = 90, public life = Infinity, tex = 'soldier', tier?: number,
  ) {
    this.hp = this.maxHp = hp;
    this.x = home.x; this.y = home.y;
    const tx = texFor(tex, tier);
    this.base = tx.scale;
    this.idleKey = tx.key;
    this.img = w.gs.add.image(this.x, this.y, tx.key).setScale(tx.scale).setAlpha(0);
    this.shadow = makeShadow(w, this.img).setAlpha(0);
  }

  /** 병영 레벨이 오르면 병사 그림(soldier_1~3)도 바꾼다 */
  setTier(tier: number) {
    const tx = texFor('soldier', tier);
    this.base = tx.scale;
    this.idleKey = tx.key;
    this.img.setTexture(tx.key);
  }

  hurt(n: number) {
    this.hp -= n;
    this.pop = 0.12;
    if (this.hp <= 0) this.kill();
  }

  kill() {
    this.dead = true;
    if (this.target && this.target.blocker === this) this.target.blocker = null;
    this.shadow.destroy();
    vanish(this.w, this.img, 4, this.img.flipX ? -70 : 70, 300);
  }

  /** 움직임 시계, 등장 페이드, 연출 타이머 갱신 */
  protected tick(dt: number) {
    this.anim += dt;
    if (this.swing > 0) this.swing -= dt;
    if (this.pop > 0) this.pop -= dt;
    if (this.born < 0.25) { this.born += dt; const a = Math.min(1, this.born / 0.25); this.img.setAlpha(a); this.shadow.setAlpha(a); }
  }

  /** 현재 자세를 이미지와 그림자에 반영 */
  protected applyPose(moving: boolean) {
    const p = walkPose(false, this.anim, 55, moving);
    const k = 1 + Math.max(0, this.pop) * 0.7;
    if (this.atkTex) {                      // 칼을 휘두르는 동안(swing)은 공격 그림, 아니면 평소 그림
      const key = this.swing > 0 ? this.atkTex : this.idleKey;
      if (this.img.texture.key !== key) this.img.setTexture(key);
    }
    this.img
      .setPosition(this.x + lungeOf(this.swing, this.swingDir), this.y + p.dy)
      .setRotation(p.rot)
      .setScale(this.base * p.sx * k, this.base * p.sy * k)
      .setDepth(this.y);
    this.shadow.setPosition(this.x, this.y + this.img.displayHeight * 0.42);
  }

  update(dt: number) {
    if (this.dead) return;
    this.tick(dt);
    if ((this.life -= dt) <= 0) { this.kill(); return; }
    const t = this.target;
    if (t && (t.dead || dist(t, this.home) > this.leash * 1.7)) {
      if (t.blocker === this) t.blocker = null;
      this.target = null;
    }
    if (!this.target) {
      let best: Enemy | null = null, bd = Infinity;
      for (const e of this.w.enemies) {
        // 다른 병사가 이미 맡은 적은 건너뛴다. 벽에 막혀 있는 적은 병사가 가서 붙을 수 있다
        if (e.dead || e.def.flying || (e.blocker instanceof Soldier && !e.blocker.dead)) continue;
        const dh = dist(e, this.home);
        if (dh > this.leash) continue;
        const ds = dist(e, this);
        if (ds < bd) { bd = ds; best = e; }
      }
      if (best) { this.target = best; best.blocker = this; }
    }
    const goal: Vec = this.target ?? this.home;
    const dd = dist(goal, this);
    const stop = this.target ? 22 : 3;
    let moving = false;
    if (dd > stop) {
      const k = Math.min(dd - stop, 95 * dt) / dd;
      this.x += (goal.x - this.x) * k;
      this.y += (goal.y - this.y) * k;
      moving = true;
      if (Math.abs(goal.x - this.x) > 1) this.img.setFlipX(goal.x < this.x);
    } else if (this.target) {
      if ((this.atk -= dt) <= 0) {
        this.atk = this.atkCd;
        const tg = this.target;
        this.swing = 0.22;
        this.swingDir = tg.x >= this.x ? 1 : -1;
        play('hit');
        tg.hurt(this.dmg, false);
      }
    }
    this.applyPose(moving);
    if (this.target) this.img.setFlipX(this.target.x < this.x);
  }
}

export class Projectile {
  readonly img: Phaser.GameObjects.Image;
  done = false;
  private t = 0;
  private flight: number;
  private sx: number;
  private sy: number;
  private tx: number;
  private ty: number;

  constructor(
    private w: World, private kind: 'arrow' | 'orb' | 'ball', x: number, y: number,
    private target: Enemy, private dmg: number, private splash = 0,
    private fx?: { slow: number; dur: number; tint: number },
  ) {
    this.sx = x; this.sy = y;
    const speed = kind === 'ball' ? 260 : kind === 'orb' ? 420 : 520;
    const guess = target.path.at(target.d + 0);
    this.tx = guess.x; this.ty = guess.y;
    if (kind === 'ball') {
      // 이동하는 표적을 예측해서 조준
      let T = dist({ x, y }, target) / speed;
      for (let i = 0; i < 3; i++) {
        const f = target.path.at(Math.min(target.path.total, target.d + target.def.speed * T));
        this.tx = f.x; this.ty = f.y;
        T = dist({ x, y }, f) / speed;
      }
      this.flight = Math.max(0.15, T);
    } else {
      this.flight = Math.max(0.05, dist({ x, y }, target) / speed);
    }
    const tx = texFor(`p_${kind}`);
    this.img = w.gs.add.image(x, y, tx.key).setScale(tx.scale).setDepth(800);
    if (fx) this.img.setTint(fx.tint);
  }

  update(dt: number) {
    this.t += dt;
    const p = Math.min(1, this.t / this.flight);
    if (this.kind === 'ball') {
      const x = this.sx + (this.tx - this.sx) * p;
      const y = this.sy + (this.ty - this.sy) * p - Math.sin(p * Math.PI) * 60;
      this.img.setPosition(x, y);
    } else {
      // 유도: 표적이 살아있으면 표적 위치로
      if (!this.target.dead) {
        this.tx = this.target.x;
        this.ty = this.target.y - (this.target.def.flying ? 20 : 4);
      }
      const x = this.sx + (this.tx - this.sx) * p;
      const y = this.sy + (this.ty - this.sy) * p;
      this.img.setRotation(Math.atan2(this.ty - this.img.y, this.tx - this.img.x));
      this.img.setPosition(x, y);
    }
    if (p >= 1) this.impact();
  }

  private impact() {
    this.done = true;
    this.img.destroy();
    if (this.kind === 'ball') {
      this.w.splashFx(this.tx, this.ty, this.splash, 0xffa040);
      for (const e of this.w.enemies) {
        if (!e.dead && !e.def.flying && dist(e, { x: this.tx, y: this.ty }) <= this.splash) e.hurt(this.dmg, false);
      }
    } else if (!this.target.dead) {
      this.target.hurt(this.dmg, this.kind === 'orb');
      if (this.fx) this.target.slow(this.fx.slow, this.fx.dur);
      if (this.kind === 'orb') this.w.splashFx(this.target.x, this.target.y, 16, this.fx?.tint ?? 0xb06cff);
    }
  }
}

export class Tower {
  readonly img: Phaser.GameObjects.Image;
  level = 0;
  spent: number;
  private cd = 0;
  private stunT = 0;               // 불타는 동안 남은 시간 (이 동안은 공격도, 병사 보충도 멈춘다)
  private fire: Phaser.GameObjects.Image | null = null;
  private fireT = 0;
  private age = 0;                 // 지은 뒤/올린 뒤 시간 (튀어오르는 연출)
  private pulse = 0;                // 공격할 때 살짝 튀는 연출의 남은 시간
  private baseScale = 1;
  private slots: { s: Soldier | null; respawn: number }[] = [];
  rally: Vec = { x: 0, y: 0 };      // 병영 집결지점 (병사 3명이 이 주변에서 대기)

  /** 집결지점을 타워에서 얼마나 멀리 둘 수 있는지 */
  static readonly RALLY_MAX = 150;

  constructor(private w: World, readonly kind: TowerKind, readonly pos: Vec, paths: PathData[]) {
    this.spent = TOWERS[kind].levels[0].cost;
    const tx = texFor(TOWERS[kind].tex, 0);
    this.baseScale = tx.scale;
    this.img = w.gs.add.image(pos.x, pos.y + 6, tx.key).setScale(tx.scale * 0.3).setOrigin(0.5, tx.scale === 1 ? 0.85 : 0.9).setDepth(pos.y);
    if (kind === 'barracks') {
      let best = { pt: pos, dist: Infinity };
      for (const p of paths) { const n = p.nearest(pos); if (n.dist < best.dist) best = n; }
      this.rally = best.pt;
      for (let i = 0; i < 3; i++) this.slots.push({ s: null, respawn: 0.3 + i * 0.2 });
    }
  }

  get lv(): TowerLvl { return TOWERS[this.kind].levels[this.level]; }
  get maxed() { return this.level >= TOWERS[this.kind].levels.length - 1; }
  get upgradeCost() { return this.maxed ? 0 : TOWERS[this.kind].levels[this.level + 1].cost; }
  get sellValue() { return Math.floor(this.spent * SELL_RATIO); }

  upgrade() {
    this.spent += this.upgradeCost;
    this.level++;
    const tx = texFor(TOWERS[this.kind].tex, this.level);
    this.baseScale = tx.scale;
    this.age = 0;
    this.img.setTexture(tx.key);
    for (const sl of this.slots) {
      if (sl.s && !sl.s.dead) {
        sl.s.maxHp = this.lv.soldierHp!; sl.s.hp = sl.s.maxHp;
        sl.s.dmg = this.lv.dmg; sl.s.leash = this.lv.range;
        sl.s.setTier(this.level);
      }
    }
  }

  /**
   * 불을 붙인다 (용의 브레스). sec 초 동안 불타며 멈춘다. 이미 불타는 중이면 아무것도 하지 않고 false 를 돌려준다.
   * 타워는 부서지지 않는다.
   */
  ignite(sec: number): boolean {
    if (this.stunT > 0) return false;
    this.stunT = sec;
    this.w.splashFx(this.pos.x, this.pos.y - 24, 30, 0xff7a1a);
    return true;
  }

  /** 불타는 동안: 주황빛으로 물들고, 위에서 불꽃이 일렁인다 */
  private burn(dt: number) {
    if (!this.fire) {
      this.fire = this.w.gs.add.image(this.pos.x, this.pos.y - 30, 'breath_flame').setRotation(-Math.PI / 2).setDepth(this.pos.y + 2);
      this.img.setTint(0xff9a55);
    }
    this.fireT += dt;
    const base = 40 / this.fire.width;
    this.fire.setScale(base * (1 + 0.18 * Math.sin(this.fireT * 22)), base * (1 + 0.22 * Math.sin(this.fireT * 17 + 1)));
  }

  private extinguish() {
    this.fire?.destroy(); this.fire = null;
    this.img.clearTint();
  }

  destroy() {
    this.fire?.destroy(); this.fire = null;
    this.img.destroy();
    for (const sl of this.slots) if (sl.s && !sl.s.dead) sl.s.kill();
  }

  /** 지을 때/올릴 때 튀어오르고, 공격할 때 살짝 튄다 */
  private animate(dt: number) {
    this.age += dt;
    let k = 1;
    if (this.age < 0.35) k = Math.max(0.02, easeOutBack(this.age / 0.35));
    else if (this.pulse > 0) { this.pulse -= dt; k = 1 + Math.sin(Math.PI * (1 - Math.max(0, this.pulse) / 0.16)) * 0.045; }
    this.img.setScale(this.baseScale * (1 + (k - 1) * 0.6), this.baseScale * k);
  }

  update(dt: number) {
    this.animate(dt);
    if (this.stunT > 0) { this.stunT -= dt; this.burn(dt); return; }   // 불타는 동안 멈춘다
    if (this.fire) this.extinguish();
    if (this.kind === 'barracks') { this.updateBarracks(dt); return; }
    this.cd -= dt;
    if (this.cd > 0) return;
    const r = this.lv.range;
    let best: Enemy | null = null;
    for (const e of this.w.enemies) {
      if (e.dead) continue;
      if (this.kind === 'cannon' && e.def.flying) continue;
      if (dist(e, this.pos) > r) continue;
      if (!best || e.d > best.d) best = e;
    }
    if (!best) return;
    this.cd = this.lv.cd;
    this.pulse = 0.16;
    const from = { x: this.pos.x, y: this.pos.y - 34 };
    play(this.kind === 'archer' ? 'arrow' : this.kind === 'mage' ? 'magic' : this.kind === 'frost' ? 'frost' : this.kind === 'thunder' ? 'thunder' : 'cannon');
    if (this.kind === 'archer') this.w.projs.push(new Projectile(this.w, 'arrow', from.x, from.y, best, this.lv.dmg));
    else if (this.kind === 'mage') this.w.projs.push(new Projectile(this.w, 'orb', from.x, from.y - 6, best, this.lv.dmg));
    else if (this.kind === 'frost') {
      const fx = { slow: this.lv.slow!, dur: this.lv.slowDur!, tint: 0x66ccff };
      this.w.projs.push(new Projectile(this.w, 'orb', from.x, from.y - 6, best, this.lv.dmg, 0, fx));
    } else if (this.kind === 'thunder') this.zap(from, best);
    else this.w.projs.push(new Projectile(this.w, 'ball', from.x, from.y - 6, best, this.lv.dmg, this.lv.splash));
  }

  /** 즉발 연쇄 번개 */
  private zap(from: Vec, first: Enemy) {
    const hit: Enemy[] = [first];
    let cur = first;
    for (let i = 1; i < (this.lv.chain ?? 1); i++) {
      let next: Enemy | null = null, bd = 95;
      for (const e of this.w.enemies) {
        if (e.dead || hit.includes(e)) continue;
        const dd = dist(e, cur);
        if (dd < bd) { bd = dd; next = e; }
      }
      if (!next) break;
      hit.push(next); cur = next;
    }
    const g = this.w.gs.add.graphics().setDepth(900);
    g.lineStyle(3, 0xfff27a, 1).beginPath().moveTo(from.x, from.y);
    let prev: Vec = from;
    hit.forEach((e, i) => {
      const ty = e.y - (e.def.flying ? 20 : 6);
      const mx = (prev.x + e.x) / 2 + (Math.random() - 0.5) * 24, my = (prev.y + ty) / 2 + (Math.random() - 0.5) * 24;
      g.lineTo(mx, my).lineTo(e.x, ty);
      prev = { x: e.x, y: ty };
      e.hurt(this.lv.dmg * Math.pow(0.8, i), true);
    });
    g.strokePath();
    this.w.gs.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  /** i번째 병사가 서 있을 자리 (집결지점 주변에 나란히) */
  private slotHome(i: number): Vec {
    return { x: this.rally.x + (i - 1) * 18, y: this.rally.y + (i % 2 ? 8 : -8) };
  }

  /** 집결지점을 옮기고, 살아 있는 병사들을 새 자리로 보낸다. 타워에서 RALLY_MAX 안으로 보정한다 */
  setRally(p: Vec) {
    const dx = p.x - this.pos.x, dy = p.y - this.pos.y;
    const d = Math.hypot(dx, dy);
    const k = d > Tower.RALLY_MAX ? Tower.RALLY_MAX / d : 1;
    this.rally = { x: this.pos.x + dx * k, y: this.pos.y + dy * k };
    this.slots.forEach((sl, i) => { if (sl.s && !sl.s.dead) sl.s.home = this.slotHome(i); }); // 적과 너무 멀어지면 Soldier.update 가 알아서 교전을 풀고 이동
  }

  private updateBarracks(dt: number) {
    this.slots.forEach((sl, i) => {
      if (sl.s && !sl.s.dead) return;
      sl.s = null;
      if ((sl.respawn -= dt) > 0) return;
      const home = this.slotHome(i);
      const s = new Soldier(this.w, home, this.lv.dmg, this.lv.soldierHp!, this.lv.range, Infinity, 'soldier', this.level);
      s.x = this.pos.x; s.y = this.pos.y;
      this.w.soldiers.push(s);
      sl.s = s;
      sl.respawn = 10;
    });
  }
}

/** 길 위에 세운 벽. 지상 적이 닿으면 멈춰서 벽을 공격하고, 체력이 다하면 부서진다. */
export class Wall implements Blocker {
  readonly img: Phaser.GameObjects.Image;
  readonly maxHp: number;
  hp: number;
  dead = false;
  private flash = 0;

  /** vertical: 길이 좌우로 뻗어 적이 가로로 지나가므로, 길을 가로막는 벽은 위아래로 길게 세운다 */
  constructor(private w: World, readonly pos: Vec, readonly tier: WallTier, vertical = false) {
    this.hp = this.maxHp = tier.hp;
    const tx = texFor(vertical ? tier.tex + '_v' : tier.tex);
    this.img = w.gs.add.image(pos.x, pos.y, tx.key).setScale(tx.scale * 0.3).setDepth(pos.y - 1);
    w.gs.tweens.add({ targets: this.img, scale: tx.scale, duration: 220, ease: 'Back.Out' });
  }

  get x() { return this.pos.x; }
  get y() { return this.pos.y; }

  hurt(n: number) {
    this.hp -= n;
    this.flash = 0.08;
    if (this.hp <= 0 && !this.dead) this.kill();
  }

  kill() {
    this.dead = true;
    this.w.splashFx(this.pos.x, this.pos.y, 22, 0xd9c8a0);
    vanish(this.w, this.img, 6, 0, 260);
  }

  update(dt: number) {
    if (this.dead) return;
    if (this.flash > 0) { this.flash -= dt; this.img.setTint(0xffb0b0); } else this.img.clearTint();
    // 닿은 지상 적 중 아직 아무에게도 막히지 않은 적을 붙잡는다
    for (const e of this.w.enemies) {
      if (e.dead || e.def.flying || (e.blocker && !e.blocker.dead)) continue;
      if (dist(e, this.pos) <= WALL_REACH) e.blocker = this;
    }
  }
}

export class Hero extends Soldier {
  readonly kind: HeroKind;
  private cd = 0;
  private regenT = 0;

  constructor(w: World, kind: HeroKind, home: Vec) {
    const d = HEROES[kind];
    super(w, home, d.dmg, d.hp, d.range, Infinity, d.tex);
    if (d.atkTex && hasSkinTexture(d.atkTex)) this.atkTex = d.atkTex;
    this.kind = kind;
    this.atkCd = d.cd;
  }

  update(dt: number) {
    const d = HEROES[this.kind];
    if (d.ranged) { this.updateRanged(dt, d.range, d.dmg, d.cd); return; }
    super.update(dt);
    if (this.dead) return;
    this.regenT = this.target ? 0 : this.regenT + dt;
    if (!this.target && this.regenT > 2) this.hp = Math.min(this.maxHp, this.hp + d.regen * dt);
  }

  private updateRanged(dt: number, range: number, dmg: number, cd: number) {
    if (this.dead) return;
    this.tick(dt);
    const dx = this.home.x - this.x, dy = this.home.y - this.y, dd = Math.hypot(dx, dy);
    let moving = false;
    if (dd > 3) {
      const k = Math.min(dd, 110 * dt) / dd;
      this.x += dx * k; this.y += dy * k;
      moving = true;
      if (Math.abs(dx) > 1) this.img.setFlipX(dx < 0);
    }
    this.cd -= dt;
    let best: Enemy | null = null, bd = range;
    for (const e of this.w.enemies) {
      if (e.dead) continue;
      const de = dist(e, this);
      if (de < bd) { bd = de; best = e; }
    }
    if (best) {
      this.img.setFlipX(best.x < this.x);
      if (this.cd <= 0) {
        this.cd = cd;
        this.swing = 0.22;           // 시전할 때 살짝 앞으로 내민다
        this.swingDir = best.x >= this.x ? 1 : -1;
        this.w.projs.push(new Projectile(this.w, 'orb', this.x, this.y - 18, best, dmg));
      }
    }
    this.applyPose(moving);
  }
}
