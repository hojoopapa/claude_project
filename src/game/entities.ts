import Phaser from 'phaser';
import { ENEMIES, EnemyDef, EnemyKind } from '../data/enemies';
import { TOWERS, TowerKind, TowerLvl, SELL_RATIO } from '../data/towers';
import { HEROES, HeroKind } from '../data/heroes';
import { PathData, Vec } from './path';

/** 엔티티가 게임 상태에 접근하는 창구 */
export interface World {
  readonly gs: Phaser.Scene;
  enemies: Enemy[];
  soldiers: Soldier[];
  projs: Projectile[];
  gainGold(n: number, x: number, y: number): void;
  leak(lives: number): void;
  splashFx(x: number, y: number, r: number, color: number): void;
}

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

export class Enemy {
  readonly def: EnemyDef;
  readonly img: Phaser.GameObjects.Image;
  hp: number;
  maxHp: number;
  d = 0;
  x: number;
  y: number;
  dead = false;
  blocker: Soldier | null = null;
  private atk = 0.5;
  private flash = 0;
  private slowMul = 1;
  private slowT = 0;
  private stunT = 0;

  constructor(private w: World, kind: EnemyKind, readonly path: PathData) {
    this.def = ENEMIES[kind];
    this.hp = this.maxHp = this.def.hp;
    const p = path.at(0);
    this.x = p.x; this.y = p.y;
    this.img = w.gs.add.image(p.x, p.y, this.def.tex).setScale(this.def.scale);
  }

  hurt(amount: number, magic: boolean) {
    const reduce = magic ? this.def.mr : this.def.armor;
    this.hp -= amount * (1 - reduce);
    this.flash = 0.08;
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
    this.img.destroy();
    if (killed) this.w.gainGold(this.def.gold, this.x, this.y);
  }

  update(dt: number) {
    if (this.flash > 0) this.flash -= dt;
    if (this.slowT > 0 && (this.slowT -= dt) <= 0) this.slowMul = 1;
    if (this.flash > 0) this.img.setTint(0xff8080);
    else if (this.slowT > 0 || this.stunT > 0) this.img.setTint(0x99ccff);
    else this.img.clearTint();
    if (this.stunT > 0) { this.stunT -= dt; return; }
    if (this.blocker?.dead) this.blocker = null;
    if (this.blocker && dist(this.blocker, this) < 30) {
      if ((this.atk -= dt) <= 0) { this.atk = 1; this.blocker.hurt(this.def.dmg); }
      return;
    }
    const before = this.x;
    this.d += this.def.speed * this.slowMul * dt;
    if (this.d >= this.path.total) {
      this.w.leak(this.def.lives);
      this.die(false);
      return;
    }
    const p = this.path.at(this.d);
    this.x = p.x; this.y = p.y;
    if (Math.abs(this.x - before) > 0.01) this.img.setFlipX(this.x < before);
    const bob = this.def.flying ? -20 + Math.sin(this.d / 12) * 4 : 0;
    this.img.setPosition(this.x, this.y + bob).setDepth(this.def.flying ? 700 : this.y);
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

  constructor(
    protected w: World, public home: Vec, public dmg: number, hp: number,
    public leash = 90, public life = Infinity, tex = 'soldier',
  ) {
    this.hp = this.maxHp = hp;
    this.x = home.x; this.y = home.y;
    this.img = w.gs.add.image(this.x, this.y, tex);
  }

  hurt(n: number) {
    this.hp -= n;
    if (this.hp <= 0) this.kill();
  }

  kill() {
    this.dead = true;
    if (this.target && this.target.blocker === this) this.target.blocker = null;
    this.img.destroy();
  }

  update(dt: number) {
    if ((this.life -= dt) <= 0) { this.kill(); return; }
    const t = this.target;
    if (t && (t.dead || dist(t, this.home) > this.leash * 1.7)) {
      if (t.blocker === this) t.blocker = null;
      this.target = null;
    }
    if (!this.target) {
      let best: Enemy | null = null, bd = Infinity;
      for (const e of this.w.enemies) {
        if (e.dead || e.def.flying || (e.blocker && !e.blocker.dead)) continue;
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
    if (dd > stop) {
      const k = Math.min(dd - stop, 95 * dt) / dd;
      this.x += (goal.x - this.x) * k;
      this.y += (goal.y - this.y) * k;
    } else if (this.target) {
      if ((this.atk -= dt) <= 0) { this.atk = this.atkCd; this.target.hurt(this.dmg, false); }
    }
    this.img.setPosition(this.x, this.y).setDepth(this.y);
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
    this.img = w.gs.add.image(x, y, `p_${kind}`).setDepth(800);
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
  private slots: { s: Soldier | null; respawn: number }[] = [];
  private rally: Vec = { x: 0, y: 0 };

  constructor(private w: World, readonly kind: TowerKind, readonly pos: Vec, paths: PathData[]) {
    this.spent = TOWERS[kind].levels[0].cost;
    this.img = w.gs.add.image(pos.x, pos.y + 6, TOWERS[kind].tex).setOrigin(0.5, 0.85).setDepth(pos.y);
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
    for (const sl of this.slots) {
      if (sl.s && !sl.s.dead) {
        sl.s.maxHp = this.lv.soldierHp!; sl.s.hp = sl.s.maxHp;
        sl.s.dmg = this.lv.dmg; sl.s.leash = this.lv.range;
      }
    }
  }

  destroy() {
    this.img.destroy();
    for (const sl of this.slots) if (sl.s && !sl.s.dead) sl.s.kill();
  }

  update(dt: number) {
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
    const from = { x: this.pos.x, y: this.pos.y - 34 };
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

  private updateBarracks(dt: number) {
    this.slots.forEach((sl, i) => {
      if (sl.s && !sl.s.dead) return;
      sl.s = null;
      if ((sl.respawn -= dt) > 0) return;
      const home = { x: this.rally.x + (i - 1) * 18, y: this.rally.y + (i % 2 ? 8 : -8) };
      const s = new Soldier(this.w, home, this.lv.dmg, this.lv.soldierHp!, this.lv.range);
      s.x = this.pos.x; s.y = this.pos.y;
      this.w.soldiers.push(s);
      sl.s = s;
      sl.respawn = 10;
    });
  }
}

export class Hero extends Soldier {
  readonly kind: HeroKind;
  private cd = 0;
  private regenT = 0;

  constructor(w: World, kind: HeroKind, home: Vec) {
    const d = HEROES[kind];
    super(w, home, d.dmg, d.hp, d.range, Infinity, d.tex);
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
    const dx = this.home.x - this.x, dy = this.home.y - this.y, dd = Math.hypot(dx, dy);
    if (dd > 3) {
      const k = Math.min(dd, 110 * dt) / dd;
      this.x += dx * k; this.y += dy * k;
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
        this.w.projs.push(new Projectile(this.w, 'orb', this.x, this.y - 18, best, dmg));
      }
    }
    this.img.setPosition(this.x, this.y).setDepth(this.y);
  }
}
