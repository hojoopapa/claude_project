import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { LEVELS, LevelDef, Theme } from '../data/levels';
import { EnemyKind } from '../data/enemies';
import { TOWERS, TowerKind } from '../data/towers';
import { HEROES, HeroKind } from '../data/heroes';
import { Enemy, Hero, Projectile, Soldier, Tower, Wall, World } from '../game/entities';
import { WALL_GAP, WALL_MAX, WALL_SNAP, wallFor } from '../data/walls';
import { t } from '../i18n';
import { PathData, Vec } from '../game/path';
import { hasSkinTexture, texFor } from '../skin';
import { saveStars, getDifficulty, tutorialSeen, markTutorialSeen, saveBestScore, getBestScore, getPlayer } from '../save';
import { calcScore, fmt } from '../score';
import { NameTakenError, cleanName, rankingEnabled, submitScore } from '../ranking';
import { askUniqueName } from '../nameDialog';
import { promptText } from '../domDialog';
import { DIFFICULTIES, Features, featuresFor, NORMAL_SPEED_STAGES, SPEEDS, SpeedTier, TUTORIAL_STAGES } from '../data/features';
import { ads } from '../ads';
import { shouldTaunt } from './TauntScene';
import { Btn, button, confirmModal, soundButton, text, C, icon, panel, modal } from '../ui';
import { play } from '../sound';

interface Spot { pos: Vec; img: Phaser.GameObjects.Image; tower: Tower | null }
interface Pending { t: number; kind: EnemyKind; path: number }
type Spell = 'fire' | 'reinf';

const THEMES: Record<Theme, { ground: number; patch: number; road: number; edge: number; deco: number }> = {
  meadow: { ground: 0x4c8a3a, patch: 0x569a42, road: 0xc9b07a, edge: 0x8a7248, deco: 0x2f6b2a },
  desert: { ground: 0xd8b878, patch: 0xcfae6a, road: 0xa8845a, edge: 0x7a5c38, deco: 0x6a8f3a },
  swamp: { ground: 0x56653f, patch: 0x4a5a38, road: 0x8a7a55, edge: 0x4e4128, deco: 0x2c4a2e },
  snow: { ground: 0xdfe9f2, patch: 0xcfdcea, road: 0x9aa8b8, edge: 0x6b7888, deco: 0x2e5a45 },
  volcano: { ground: 0x4a3434, patch: 0x3d2a2a, road: 0x8a7468, edge: 0x2e2220, deco: 0x7a2a1a },
};

/** 테마별 소품 그림 종류 (d_<테마>_<종류>) */
const PROPS: Record<Theme, string[]> = {
  meadow: ['tree', 'bush', 'rock'],
  desert: ['palm', 'cactus', 'rock'],
  swamp: ['tree', 'mushroom', 'reeds'],
  snow: ['pine', 'rock', 'crystal'],
  volcano: ['tree', 'rock', 'spike'],
};

/** 맵 장식(나무, 바위 등) 개수. 많으면 복잡해 보인다 */
const MAX_PROPS = 14;

const FIRE_CD = 40, REINF_CD = 22;

/** 보스(오우거, 용)가 나오는 웨이브에서 보스가 등장하기까지 늘려 주는 시간(초). 이 동안 등장 연출이 나온다 */
const BOSS_KINDS = new Set<EnemyKind>(['ogre', 'drake']);
const BOSS_INTRO = 4;
/** 용의 브레스: 목표를 찍어 두고 터지기까지의 예고 시간(게임 시계 기준 초) */
const BREATH_DELAY = 1.1;
/** 브레스나 발밑에 맞은 타워가 불타며 멈추는 시간(초). 타워는 부서지지 않는다 */
const TOWER_BURN_SECONDS = 1;

/** 패배 후 광고를 보고 이어할 때: 스테이지당 횟수, 되살아나는 생명 비율(최대 생명 기준) */
const REVIVE_PER_STAGE = 1, REVIVE_LIVES_RATIO = 0.5;

export class GameScene extends Phaser.Scene implements World {
  enemies: Enemy[] = [];
  soldiers: Soldier[] = [];
  projs: Projectile[] = [];
  private towers: Tower[] = [];
  private spots: Spot[] = [];
  private paths: PathData[] = [];
  private level!: LevelDef;
  private index = 0;

  private gold = 0;
  private lives = 0;
  private maxLives = 0;
  private waveIdx = -1;
  private nextWaveAt = 0;
  private clock = 0;
  private pending: Pending[] = [];
  private speed = 1;
  private speedTier: 1 | SpeedTier = 1;                  // 지금 선택된 배속 단계
  private speedUnlocked = new Set<SpeedTier>();          // 이 스테이지에서 광고를 보고 해제한 단계
  private paused = false;
  private over = false;
  private features!: Features;
  hpMul = 1;
  private modal = false;
  private tutShown = new Set<string>();

  private heroes: Record<HeroKind, { hero: Hero | null; respawn: number; cd: number }> = {
    knight: { hero: null, respawn: 0, cd: 0 }, sorc: { hero: null, respawn: 0, cd: 0 },
  };
  private selHero: HeroKind | null = null;
  private selRally: Tower | null = null;                      // 집결지점을 고르는 중인 병영
  private rallyUi: Phaser.GameObjects.GameObject[] = [];       // 집결지점 선택 중 표시 (범위 원, 깃발)
  private rallyPickDown = -1;                                  // 깃발 버튼을 누른 포인터 다운 시각
  private armedTip: string | null = null;                      // 터치로 설명을 본 건설 메뉴 버튼 (한 번 더 탭하면 실행)
  private menuRefresh: (() => void)[] = [];                    // 메뉴 버튼들의 강조 표시 갱신 함수
  private reviveLeft = 1;                                    // 이번 스테이지에서 남은 이어하기 횟수
  private inFrame = false;                                     // 실제 화면 루프(update) 안에서 step 이 불렸는지
  private walls: Wall[] = [];                                  // 지금 서 있는 벽
  private selWall = false;                                     // 벽을 놓을 자리를 고르는 중
  private heroBtns!: Record<HeroKind, { pick: Btn; skill: Btn }>;
  private tip: Phaser.GameObjects.Text | null = null;

  private spell: Spell | null = null;
  private spellCd: Record<Spell, number> = { fire: 0, reinf: 0 };
  private strikes: { t: number; x: number; y: number }[] = [];
  /** 용의 브레스: 예고 중인 폭발 (t 에 터진다). warn 은 예고 표시 */
  private blasts: { t: number; x: number; y: number; r: number; from: Vec; warn: Phaser.GameObjects.GameObject[] }[] = [];

  private hud!: { gold: Phaser.GameObjects.Text; lives: Phaser.GameObjects.Text; wave: Phaser.GameObjects.Text; hint: Phaser.GameObjects.Text };
  private hintBg!: Phaser.GameObjects.Graphics;
  private waveBar!: Phaser.GameObjects.Graphics;
  private bars!: Phaser.GameObjects.Graphics;
  private menu: Phaser.GameObjects.GameObject[] = [];
  private buttons: { fire: Btn; reinf: Btn; next: Btn; speed2: Btn; speed3: Btn; pause: Btn; wall: Btn } | null = null;
  private resultUi: Phaser.GameObjects.GameObject[] = [];

  constructor() { super('Game'); }

  get gs(): Phaser.Scene { return this; }

  init(data: { index?: number }) {
    this.index = data.index ?? 0;
    this.enemies = []; this.soldiers = []; this.projs = []; this.towers = []; this.spots = [];
    this.pending = []; this.menu = []; this.resultUi = []; this.strikes = [];
    this.waveIdx = -1; this.clock = 0; this.speed = 1; this.paused = false; this.over = false;
    this.speedTier = 1; this.speedUnlocked = new Set();
    this.spell = null;
    this.spellCd = { fire: 0, reinf: 0 };
    this.heroes = { knight: { hero: null, respawn: 0, cd: 0 }, sorc: { hero: null, respawn: 0, cd: 0 } };
    this.selHero = null; this.tip = null; this.modal = false; this.tutShown = new Set();
    this.selRally = null; this.rallyUi = [];
    this.walls = []; this.selWall = false;
    this.reviveLeft = REVIVE_PER_STAGE; this.inFrame = false;
    this.armedTip = null; this.menuRefresh = [];
    this.blasts = [];
  }

  create() {
    this.level = LEVELS[this.index];
    this.features = featuresFor(this.level.id);
    const diff = DIFFICULTIES[getDifficulty()];
    this.hpMul = diff.hp;
    this.gold = Math.round(this.level.startGold * diff.gold);
    this.lives = this.maxLives = this.level.lives + diff.lives;
    this.paths = this.level.paths.map((p) => new PathData(p.pts, p.air));
    this.nextWaveAt = Infinity;

    this.drawMap();
    this.bars = this.add.graphics().setDepth(950);

    for (const pos of this.level.spots) {
      const st = texFor('spot');
      const img = this.add.image(pos.x, pos.y + 4, st.key).setScale(st.scale).setDepth(1).setInteractive({ useHandCursor: true });
      const spot: Spot = { pos, img, tower: null };
      img.on('pointerdown', () => { if (!this.spell && !this.selHero && !this.selRally && !this.selWall && !this.over) this.openBuildMenu(spot); });
      this.spots.push(spot);
    }

    this.buildHud();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.over) return;
      if (over.some((o) => o.getData('ui'))) return;
      if (this.spell) { this.castSpell(this.spell, p.x, p.y); return; }
      if (this.selHero) { this.moveHero(this.selHero, p.x, p.y); return; }
      if (this.selWall) { this.placeWall(p.x, p.y); return; }
      if (this.selRally) {
        if (p.downTime === this.rallyPickDown) return;   // 깃발 버튼을 누른 바로 그 클릭은 위치 지정으로 쓰지 않는다
        this.placeRally(p.x, p.y);
        return;
      }
      if (over.length === 0) this.closeMenu();
    });
    this.input.keyboard?.on('keydown-SPACE', () => this.togglePause());

    this.showBanner(`${this.level.id}. ${t('level.' + this.level.id)}`, t('startHint'));
    this.nextWaveAt = this.clock + (this.level.id <= TUTORIAL_STAGES ? 25 : 12); // 첫 웨이브 전 준비 시간

    // 스테이지를 시작할 때마다 약올림 팝업 (광고로 없앴으면 안 뜬다). 다시 하기, 다음 스테이지에서도 뜬다
    if (shouldTaunt()) this.scene.launch('Taunt', { level: this.level.id });
  }

  // ---------- World ----------
  gainGold(n: number, x: number, y: number) {
    this.gold += n;
    this.floatText(x, y - 14, `+${n}`, '#ffd34d');
  }

  leak(lives: number) {
    this.lives = Math.max(0, this.lives - lives);
    play('leak');
    this.cameras.main.shake(120, 0.004);
    this.floatText(GAME_W - 40, 60, `-${lives}`, '#ff6060');
  }

  splashFx(x: number, y: number, r: number, color: number) {
    const c = this.add.circle(x, y, r, color, 0.55).setDepth(850);
    this.tweens.add({ targets: c, alpha: 0, scale: 1.3, duration: 260, onComplete: () => c.destroy() });
  }

  // ---------- 보스 용: 파괴 공격 ----------
  /** 용이 움직일 때마다: 발밑의 유닛과 건물을 부수고, 때가 되면 브레스 목표를 정한다 */
  bossTick(e: Enemy, dt: number) {
    const b = e.def.breath!;
    this.smashAt(e.x, e.y, b.stomp);
    if (Number.isNaN(e.breathT)) e.breathT = b.first;
    if ((e.breathT -= dt) > 0) return;
    e.breathT = b.every;
    const tgt = this.breathTarget(e, b.range);
    if (tgt) this.startBreath(e, tgt, b.radius);
  }

  /**
   * 돌아다니는 보스 용의 다음 목적지: 대부분(85%)은 타워나 병사 하나를 골라 그 둘레(55~100px 떨어진 곳)로,
   * 나머지는 화면 안 아무 곳이나. 바로 위에 눌러앉으면 발밑 공격(stomp)이 계속 걸리므로 일부러 조금 떨어진 곳을 고른다.
   */
  roamTarget(_e: Enemy): Vec {
    const marks: Vec[] = [...this.towers.map((tw) => tw.pos), ...this.soldiers.filter((s) => !s.dead).map((s) => ({ x: s.x, y: s.y }))];
    let x: number, y: number;
    if (marks.length && Math.random() < 0.85) {
      const m = marks[Math.floor(Math.random() * marks.length)];
      const a = Math.random() * Math.PI * 2, r = 55 + Math.random() * 45;
      x = m.x + Math.cos(a) * r; y = m.y + Math.sin(a) * r;
    } else { x = 90 + Math.random() * (GAME_W - 180); y = 90 + Math.random() * 320; }
    return { x: Phaser.Math.Clamp(x, 60, GAME_W - 60), y: Phaser.Math.Clamp(y, 80, GAME_H - 130) };
  }

  /** 반경 안의 타워는 불태워 잠깐 멈추게 하고(부수지 않는다), 병사, 영웅, 벽은 부순다 */
  private smashAt(x: number, y: number, r: number) {
    let hit = false;
    for (const tw of [...this.towers]) {
      if (Math.hypot(tw.pos.x - x, tw.pos.y - y) > r) continue;
      if (tw.ignite(TOWER_BURN_SECONDS)) hit = true;
    }
    for (const s of this.soldiers) {
      if (s.dead || Math.hypot(s.x - x, s.y - y) > r) continue;
      s.kill(); this.splashFx(s.x, s.y, 16, 0xff7a1a); hit = true;
    }
    for (const w of this.walls) {
      if (w.dead || Math.hypot(w.x - x, w.y - y) > r) continue;
      w.kill(); hit = true;
    }
    if (hit) { play('smash'); this.cameras.main.shake(160, 0.005); }
  }

  /** 브레스 목표: 사거리 안에서 가장 가까운 타워, 없으면 가장 가까운 병사/영웅/벽 */
  private breathTarget(e: Enemy, range: number): Vec | null {
    const nearest = (list: Vec[]) => list
      .filter((p) => Math.hypot(p.x - e.x, p.y - e.y) <= range)
      .sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0] ?? null;
    return nearest(this.towers.map((tw) => tw.pos))
      ?? nearest([...this.soldiers.filter((s) => !s.dead), ...this.walls.filter((w) => !w.dead)].map((o) => ({ x: o.x, y: o.y })));
  }

  /** 브레스 예고: 목표 지점에 붉은 원을 띄우고 BREATH_DELAY 뒤에 터뜨린다 */
  private startBreath(e: Enemy, tgt: Vec, r: number) {
    play('breath');
    this.cameras.main.shake(350, 0.004);
    const warn = this.add.circle(tgt.x, tgt.y, r, 0xff3a1a, 0.2).setStrokeStyle(3, 0xff6a3a, 0.9).setDepth(930);
    this.tweens.add({ targets: warn, alpha: { from: 0.35, to: 1 }, yoyo: true, repeat: -1, duration: 220 });
    const label = text(this, tgt.x, tgt.y - r - 12, t('breathWarn'), 16, '#ff9a6a', { stroke: 4 }).setDepth(960);
    e.chargeT = BREATH_DELAY;           // 예고 동안 용이 볼을 부풀린다
    this.blasts.push({ t: this.clock + BREATH_DELAY, x: tgt.x, y: tgt.y, r, from: e.mouth(), warn: [warn, label] });
  }

  private fireBlast(b: { x: number; y: number; r: number; from: Vec }) {
    const g = this.add.graphics().setDepth(935);
    g.lineStyle(16, 0xff6a1a, 0.9).lineBetween(b.from.x, b.from.y, b.x, b.y);
    g.lineStyle(6, 0xffe08a, 1).lineBetween(b.from.x, b.from.y, b.x, b.y);
    this.tweens.add({ targets: g, alpha: 0, duration: 450, onComplete: () => g.destroy() });
    this.splashFx(b.x, b.y, b.r, 0xff5a1a);
    this.splashFx(b.x, b.y, b.r * 0.6, 0xffd34d);
    // 불꽃 그림 (시작 화면 시안의 불꽃): 입에서 목표까지 줄지어 날아가고, 목표에서 크게 터진다
    if (this.textures.exists('breath_flame')) {
      const ang = Math.atan2(b.y - b.from.y, b.x - b.from.x) + Math.PI;   // 그림의 넓은 쪽(왼쪽)이 가는 방향을 향하게
      for (let i = 0; i < 4; i++) {
        const k = (i + 1) / 5;
        const f = this.add.image(b.from.x + (b.x - b.from.x) * k, b.from.y + (b.y - b.from.y) * k, 'breath_flame').setRotation(ang).setDepth(936);
        f.setScale((34 + 14 * i) / f.width);
        this.tweens.add({ targets: f, alpha: 0, scale: f.scale * 1.6, duration: 520, delay: i * 40, onComplete: () => f.destroy() });
      }
      const big = this.add.image(b.x, b.y, 'breath_flame').setRotation(ang).setDepth(937);
      big.setScale((b.r * 2.4) / big.width);
      this.tweens.add({ targets: big, alpha: 0, scale: big.scale * 1.3, duration: 650, onComplete: () => big.destroy() });
    }
    play('fire');
    this.cameras.main.shake(300, 0.008);
    this.smashAt(b.x, b.y, b.r);
  }

  // ---------- 보스 등장 연출 ----------
  /** 보스 웨이브가 시작될 때: 웅장한 소리, 화면 흔들림, 붉은 어둠, 스산한 바람 */
  private bossIntro() {
    play('boss');
    this.cameras.main.shake(BOSS_INTRO * 1000, 0.004);
    const dark = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x240606, 0).setDepth(945);
    this.tweens.add({ targets: dark, alpha: 0.5, duration: 1400, hold: 600, yoyo: true, onComplete: () => dark.destroy() });
    for (let i = 0; i < 46; i++) {
      const len = Phaser.Math.Between(50, 150);
      const s = this.add.rectangle(-len, Phaser.Math.Between(40, GAME_H - 40), len, Phaser.Math.Between(1, 3), 0xdfe6f2, Phaser.Math.FloatBetween(0.15, 0.4)).setDepth(946);
      this.tweens.add({ targets: s, x: GAME_W + len, duration: Phaser.Math.Between(900, 1800), delay: Phaser.Math.Between(0, 3000), onComplete: () => s.destroy() });
    }
    this.showBanner(t('bossWarn'), t('bossWarnSub'));
  }

  // ---------- 맵 ----------
  private drawMap() {
    const th = THEMES[this.level.theme];
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(th.ground).fillRect(0, 0, GAME_W, GAME_H);
    const rnd = mulberry32(this.level.id * 7919);
    for (let i = 0; i < 22; i++) {
      g.fillStyle(th.patch, 0.5).fillEllipse(rnd() * GAME_W, rnd() * GAME_H, 40 + rnd() * 90, 20 + rnd() * 50);
    }
    for (const p of this.paths) {
      if (p.air) {
        g.lineStyle(3, 0xffffff, 0.35);
        for (let d = 0; d < p.total; d += 28) {
          const a = p.at(d), b = p.at(d + 12);
          g.lineBetween(a.x, a.y, b.x, b.y);
        }
        continue;
      }
      g.lineStyle(60, 0x000000, 0.1).beginPath().moveTo(p.pts[0].x, p.pts[0].y);
      p.pts.slice(1).forEach((q) => g.lineTo(q.x, q.y));
      g.strokePath();
      g.lineStyle(52, th.edge, 1).beginPath().moveTo(p.pts[0].x, p.pts[0].y);
      p.pts.slice(1).forEach((q) => g.lineTo(q.x, q.y));
      g.strokePath();
      p.pts.forEach((q) => g.fillStyle(th.edge).fillCircle(q.x, q.y, 26));
    }
    for (const p of this.paths) {
      if (p.air) continue;
      g.lineStyle(42, th.road, 1).beginPath().moveTo(p.pts[0].x, p.pts[0].y);
      p.pts.slice(1).forEach((q) => g.lineTo(q.x, q.y));
      g.strokePath();
      p.pts.forEach((q) => g.fillStyle(th.road).fillCircle(q.x, q.y, 21));
    }
    // 길 가운데 은은한 밝은 띠와 자갈
    const light = Phaser.Display.Color.ValueToColor(th.road).lighten(12).color;
    for (const p of this.paths) {
      if (p.air) continue;
      g.lineStyle(20, light, 0.3).beginPath().moveTo(p.pts[0].x, p.pts[0].y);
      p.pts.slice(1).forEach((q) => g.lineTo(q.x, q.y));
      g.strokePath();
      p.pts.forEach((q) => g.fillStyle(light, 0.3).fillCircle(q.x, q.y, 10));
      for (let d = 14; d < p.total; d += 26 + rnd() * 26) {
        const a0 = p.at(d), a1 = p.at(d + 2), nx = -(a1.y - a0.y), ny = a1.x - a0.x, nl = Math.hypot(nx, ny) || 1;
        const off = (rnd() - 0.5) * 30;
        g.fillStyle(th.edge, 0.28).fillEllipse(a0.x + (nx / nl) * off, a0.y + (ny / nl) * off, 4 + rnd() * 4, 3 + rnd() * 2);
      }
    }
    // 장식 (길/타워 자리에서 떨어진 곳에만)
    const ground = this.paths.filter((p) => !p.air);
    for (let i = 0, placed = 0; i < 400 && placed < MAX_PROPS; i++) {
      const v = { x: 20 + rnd() * (GAME_W - 40), y: 60 + rnd() * (GAME_H - 80) };
      if (ground.some((p) => p.nearest(v, 8).dist < 55)) continue;
      if (this.level.spots.some((s) => Math.hypot(s.x - v.x, s.y - v.y) < 50)) continue;
      const s = 0.7 + rnd() * 0.7;
      // 스킨에 이 테마의 소품 그림이 있으면 그림으로, 없으면 도형 나무로 그린다
      const kinds = PROPS[this.level.theme].filter((k) => hasSkinTexture(`d_${this.level.theme}_${k}`));
      if (kinds.length) {
        const k = kinds[Math.floor(rnd() * kinds.length)];
        const sz = 0.26 + rnd() * 0.12;
        this.add.image(v.x, v.y + 18, `d_${this.level.theme}_${k}`).setScale(sz).setOrigin(0.5, 0.92).setDepth(v.y);
        placed++;
        continue;
      }
      g.fillStyle(0x000000, 0.18).fillEllipse(v.x, v.y + 14 * s, 30 * s, 10 * s);
      g.fillStyle(0x5a3b22).fillRect(v.x - 3 * s, v.y, 6 * s, 14 * s);
      g.fillStyle(th.deco).fillCircle(v.x, v.y - 6 * s, 15 * s);
      g.fillStyle(0xffffff, 0.12).fillCircle(v.x - 4 * s, v.y - 10 * s, 7 * s);
      placed++;
    }
    // 화면 가장자리를 은은하게 어둡게 해서 가운데(길과 타워)에 시선이 모이게 한다
    const vg = this.add.graphics().setDepth(3);
    const edge = 0x050810;
    vg.fillGradientStyle(edge, edge, edge, edge, 0.34, 0.34, 0, 0).fillRect(0, 0, GAME_W, 90);
    vg.fillGradientStyle(edge, edge, edge, edge, 0, 0, 0.38, 0.38).fillRect(0, GAME_H - 110, GAME_W, 110);
    vg.fillGradientStyle(edge, edge, edge, edge, 0.3, 0, 0.3, 0).fillRect(0, 0, 80, GAME_H);
    vg.fillGradientStyle(edge, edge, edge, edge, 0, 0.3, 0, 0.3).fillRect(GAME_W - 80, 0, 80, GAME_H);
    // 입구/출구 표시: 경로 방향을 따라 회전한 화살표
    const arrow = (at: Vec, dir: Vec, color: number) => {
      const a = Math.atan2(dir.y, dir.x), c = Math.cos(a), sn = Math.sin(a);
      const pt = (fx: number, fy: number) => ({ x: at.x + fx * c - fy * sn, y: at.y + fx * sn + fy * c });
      const [p1, p2, p3] = [pt(-12, -14), pt(-12, 14), pt(14, 0)];
      g.fillStyle(color, 0.92).fillTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      g.lineStyle(2, 0x000000, 0.5).strokeTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    };
    const clampV = (v: Vec): Vec => ({ x: Phaser.Math.Clamp(v.x, 18, GAME_W - 18), y: Phaser.Math.Clamp(v.y, 58, GAME_H - 80) });
    for (const p of this.paths.filter((q) => !q.air)) {
      const s0 = p.at(48), s1 = p.at(56), e0 = p.at(p.total - 56), e1 = p.at(p.total - 48);
      arrow(clampV(s0), { x: s1.x - s0.x, y: s1.y - s0.y }, 0xc0392b);
      arrow(clampV(e0), { x: e1.x - e0.x, y: e1.y - e0.y }, 0x2ecc71);
    }
  }

  // ---------- HUD ----------
  private buildHud() {
    const g = this.add.graphics().setDepth(900);
    // 위쪽: 생명 / 골드 / 웨이브 진행 / 속도·일시정지
    panel(g, 10, 6, 100, 32, { r: 16, alpha: 0.85 });
    panel(g, 118, 6, 124, 32, { r: 16, alpha: 0.85 });
    panel(g, GAME_W / 2 - 110, 6, 220, 36, { r: 16, alpha: 0.85 });
    icon(this, 'ic_heart', 30, 22).setDepth(901);
    icon(this, 'ic_coin', 138, 22).setDepth(901);
    this.waveBar = this.add.graphics().setDepth(902);
    this.hintBg = this.add.graphics().setDepth(900);
    this.hud = {
      lives: text(this, 72, 22, '', 17, C.text).setDepth(901),
      gold: text(this, 194, 22, '', 17, C.gold).setDepth(901),
      wave: text(this, GAME_W / 2, 20, '', 14, C.text).setDepth(901),
      hint: text(this, GAME_W / 2, 74, '', 20, C.text).setDepth(902).setVisible(false),
    };
    const d = (b: Btn, depth = 901) => { b.bg.setDepth(depth); return b; };
    const y = GAME_H - 44, f = this.features;
    // 열려 있는 스펠만 왼쪽부터 차례로 배치
    const spellX = (k: Spell) => 48 + (['fire', 'reinf'] as Spell[]).filter((q) => f[q]).indexOf(k) * 78;
    const small = { radius: 10 };
    this.buttons = {
      // 상단 버튼은 폰 화면에서도 누르기 쉽게 키웠다 (52x42, 간격 56)
      pause: d(button(this, GAME_W - 32, 25, 52, 42, '', () => this.togglePause(), C.slate, 15, { icon: 'ic_pause', iconScale: 0.8, ...small })),
      speed3: d(button(this, GAME_W - 88, 25, 52, 42, SPEEDS[3].label, () => this.pickSpeed(3), C.slate, 16, small)),
      speed2: d(button(this, GAME_W - 144, 25, 52, 42, SPEEDS[2].label, () => this.pickSpeed(2), C.slate, 16, small)),
      fire: d(button(this, spellX('fire'), y, 66, 66, t('fire'), () => this.pickSpell('fire'), C.orange, 12, { icon: 'ic_fire', iconScale: 1.05, layout: 'top' })),
      reinf: d(button(this, spellX('reinf'), y, 66, 66, t('reinf'), () => this.pickSpell('reinf'), C.blue, 12, { icon: 'ic_reinf', iconScale: 1.05, layout: 'top' })),
      next: d(button(this, GAME_W - 100, y, 170, 58, '', () => this.callNextWave(), C.green, 14, { icon: 'ic_play', iconScale: 0.8 })),
      // 벽 버튼: 열려 있는 스펠 바로 오른쪽, 영웅이 나오는 스테이지에서는 영웅 버튼 오른쪽
      wall: d(button(this, f.heroes ? 486 : 48 + 78 * ([f.fire, f.reinf].filter(Boolean).length), y, 66, 66,
        `${t('wall')} ${wallFor(this.level.id).cost}`, () => this.pickWall(), 0x8a6a3a, 12,
        { icon: wallFor(this.level.id).tex, iconScale: 1.7, layout: 'top' })),
    };
    soundButton(this, GAME_W - 200, 25, 52, 42).bg.setDepth(901);
    button(this, GAME_W - 256, 25, 52, 42, '', () => void this.askHome(), C.slate, 15, { icon: 'ic_home', iconScale: 0.8, ...small }).bg.setDepth(901);
    this.refreshSpeedButtons();
    this.buttons.fire.setVisible(f.fire);
    this.buttons.reinf.setVisible(f.reinf);
    const mkHero = (k: HeroKind, x: number) => {
      const hx = texFor(HEROES[k].tex);
      return {
        pick: d(button(this, x, y, 118, 58, '', () => this.pickHero(k), 0x6b4a2a, 12, { icon: hx.key, iconScale: hx.scale === 1 ? 1.5 : 0.85 })),
        skill: d(button(this, x, y - 50, 118, 34, t('skill.' + k), () => this.useAbility(k), 0x258a8a, 13, { radius: 10 })),
      };
    };
    this.heroBtns = { knight: mkHero('knight', 252), sorc: mkHero('sorc', 378) };
    if (!f.heroes) for (const k of ['knight', 'sorc'] as HeroKind[]) { this.heroBtns[k].pick.setVisible(false); this.heroBtns[k].skill.setVisible(false); }
  }

  private updateHud() {
    const b = this.buttons!;
    this.hud.lives.setText(`${this.lives}`);
    this.hud.gold.setText(`${Math.floor(this.gold)}`);
    const total = this.level.waves.length;
    this.hud.wave.setText(t('wave', { n: Math.max(0, this.waveIdx + 1), m: total }));
    this.waveBar.clear()
      .fillStyle(0xffffff, 0.12).fillRoundedRect(GAME_W / 2 - 90, 31, 180, 5, 2.5)
      .fillStyle(C.goldHex, 1).fillRoundedRect(GAME_W / 2 - 90, 31, Math.max(5, 180 * (Math.max(0, this.waveIdx + 1) / total)), 5, 2.5);
    const f = this.features;
    for (const k of ['fire', 'reinf'] as Spell[]) {
      if (!f[k]) continue;
      const cd = this.spellCd[k];
      b[k].setLabel(cd > 0 ? `${Math.ceil(cd)}s` : t(k));
      b[k].setCooldown(cd / (k === 'fire' ? FIRE_CD : REINF_CD));
      b[k].setSelected(this.spell === k);
      b[k].setEnabled(cd <= 0);
    }
    for (const k of ['knight', 'sorc'] as HeroKind[]) {
      if (!f.heroes) break;
      const st = this.heroes[k], ui = this.heroBtns[k], name = t('hero.' + k);
      const down = !st.hero || st.hero.dead;
      if (down) ui.pick.setLabel(`${name}\n${Math.ceil(Math.max(0, st.respawn))}s`);
      else ui.pick.setLabel(name);
      ui.pick.setCooldown(down ? st.respawn / HEROES[k].respawn : 0);
      ui.pick.setSelected(this.selHero === k);
      ui.skill.setVisible(true);
      const alive = !!st.hero && !st.hero.dead;
      ui.skill.setLabel(st.cd > 0 ? `${t('skill.' + k)} ${Math.ceil(st.cd)}s` : t('skill.' + k));
      ui.skill.setCooldown(st.cd > 0 ? st.cd / HEROES[k].abilityCd : 0);
      ui.skill.setEnabled(alive && st.cd <= 0);
    }
    const canCall = this.waveIdx + 1 < total && !this.over;
    b.next.setVisible(canCall);
    if (canCall) {
      const left = Math.max(0, Math.ceil(this.nextWaveAt - this.clock));
      const nw = t('nextWave').replace(/\s*▶/, '');
      b.next.setLabel(Number.isFinite(left) ? `${nw}\n${left}s (+${this.earlyBonus()})` : nw);
    }
  }

  private earlyBonus() {
    const left = this.nextWaveAt - this.clock;
    return Number.isFinite(left) ? Math.max(0, Math.floor(left * 2)) : 0;
  }

  /** 스테이지 도중 초기화면으로 나가기 (진행 중인 스테이지는 저장되지 않으므로 먼저 묻는다) */
  private async askHome() {
    if (this.over || this.modal) return;
    this.modal = true;                       // 묻는 동안 전투를 멈춘다
    const ok = await confirmModal(this, { title: t('homeTitle'), body: t('homeBody'), ok: t('homeOk'), cancel: t('homeStay'), accent: C.danger, danger: true });
    this.modal = false;
    if (ok) this.scene.start('Menu');
  }

  private togglePause() {
    if (this.over) return;
    this.paused = !this.paused;
    this.buttons!.pause.setIcon(this.paused ? 'ic_play' : 'ic_pause');
    if (this.paused) this.showBanner(t('paused'), t('pausedSub'), true);
    else this.hideBanner();
  }

  /**
   * 2X/3X 버튼. 처음 3판은 안내만 띄우고, 아직 해제하지 않은 단계는 광고를 본 뒤 켠다.
   * 이미 켜져 있는 단계를 다시 누르면 보통 속도로 돌아간다.
   */
  private async pickSpeed(tier: SpeedTier) {
    if (this.over || this.modal) return;
    if (this.level.id <= NORMAL_SPEED_STAGES) { this.showBanner(t('speedLocked'), ''); return; }
    if (this.speedTier === tier) { this.applySpeed(1); return; }
    if (!this.speedUnlocked.has(tier)) {
      if (!(await this.askSpeedAd(tier))) return;
      this.speedUnlocked.add(tier);
    }
    if (!this.over) this.applySpeed(tier);
  }

  /** 광고 안내창 → 광고 재생. 끝까지 보면 true */
  private async askSpeedAd(tier: SpeedTier): Promise<boolean> {
    const def = SPEEDS[tier];
    this.modal = true;                       // 안내창과 광고가 나오는 동안 전투를 멈춘다
    try {
      const wants = await new Promise<boolean>((resolve) => {
        const m = modal(this, 600, 290, 3000);
        const ui = m.objects;
        const close = (v: boolean) => { ui.forEach((o) => o.destroy()); resolve(v); };
        const body = text(this, m.cx, m.cy - 40, t(def.ad === 'short' ? 'adAskShort' : 'adAskLong', { x: def.label }), 20, C.text, { weight: '500' })
          .setDepth(3002).setWordWrapWidth(520).setAlign('center').setLineSpacing(8);
        const yes = button(this, m.cx + 100, m.cy + 85, 170, 48, t('adWatch'), () => close(true), C.green, 19);
        const no = button(this, m.cx - 100, m.cy + 85, 170, 48, t('cancel'), () => close(false), C.slate, 18);
        yes.bg.setDepth(3002); no.bg.setDepth(3002);
        ui.push(body, yes.bg, no.bg);
      });
      return wants && await ads.show(this, def.ad);
    } finally {
      this.modal = false;
    }
  }

  private applySpeed(tier: 1 | SpeedTier) {
    this.speedTier = tier;
    this.speed = tier === 1 ? 1 : SPEEDS[tier].mul;
    this.refreshSpeedButtons();
  }

  /** 선택된 단계는 금색 테두리, 아직 해제 전이거나 처음 3판이면 흐리게 */
  private refreshSpeedButtons() {
    const b = this.buttons!;
    const locked = (k: SpeedTier) => this.level.id <= NORMAL_SPEED_STAGES || !this.speedUnlocked.has(k);
    b.speed2.setSelected(this.speedTier === 2);
    b.speed3.setSelected(this.speedTier === 3);
    b.speed2.bg.setAlpha(locked(2) ? 0.6 : 1);
    b.speed3.bg.setAlpha(locked(3) ? 0.6 : 1);
  }

  private showBanner(title: string, sub: string, sticky = false) {
    const h = this.hud.hint;
    h.setText(sub ? `${title}\n${sub}` : title).setVisible(true).setAlpha(1).setAlign('center').setLineSpacing(4);
    this.hintBg.clear().setVisible(true).setAlpha(1);
    panel(this.hintBg, GAME_W / 2 - h.width / 2 - 22, h.y - h.height / 2 - 10, h.width + 44, h.height + 20, { r: 14, alpha: 0.82 });
    this.tweens.killTweensOf([h, this.hintBg]);
    if (!sticky) this.tweens.add({ targets: [h, this.hintBg], alpha: 0, delay: 2400, duration: 600 });
  }

  private hideBanner() {
    this.tweens.killTweensOf([this.hud.hint, this.hintBg]);
    this.hud.hint.setVisible(false);
    this.hintBg.setVisible(false);
  }

  private floatText(x: number, y: number, s: string, color: string) {
    const t = text(this, x, y, s, 16, color, { stroke: 4 }).setDepth(960);
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  // ---------- 건설 메뉴 ----------
  private closeMenu() {
    this.menu.forEach((o) => o.destroy());
    this.menu = [];
    this.tip = null;
    this.armedTip = null; this.menuRefresh = [];
  }

  private clampCenter(x: number, y: number): Vec {
    return { x: Phaser.Math.Clamp(x, 80, GAME_W - 80), y: Phaser.Math.Clamp(y, 100, GAME_H - 95) };
  }

  private menuButton(x: number, y: number, tex: string | null, label: string, sub: string, enabled: boolean, cb: () => void,
    opts: { tip?: string; subColor?: string; icon?: string } = {}) {
    const R = 30;
    const c = this.add.container(x, y).setDepth(1000).setSize(R * 2, R * 2);
    const g = this.add.graphics();
    c.add(g);
    const draw = (hover: boolean) => {
      g.clear();
      g.fillStyle(0x000000, 0.4).fillCircle(0, 3, R);
      g.fillStyle(enabled ? (hover ? C.panelHi : C.panel) : 0x2a2430, 0.97).fillCircle(0, 0, R);
      g.lineStyle(2, enabled ? (hover ? C.goldHex : 0xffffff) : 0x77666a, enabled ? (hover ? 1 : 0.3) : 0.5).strokeCircle(0, 0, R);
    };
    draw(false);
    c.setInteractive(new Phaser.Geom.Circle(R, R, R), Phaser.Geom.Circle.Contains); // 컨테이너 히트 영역은 좌상단 기준 좌표
    c.input!.cursor = 'pointer';
    c.setData('ui', true);
    // 터치에는 '마우스를 올리기'가 없어 설명(tip)을 볼 수 없다. 설명 창이 있는 메뉴(건설 메뉴)에서는
    // 터치 첫 탭에서 설명을 보여주고, 같은 버튼을 한 번 더 탭하면 실행한다. 마우스는 그대로 (올리면 설명, 클릭하면 실행).
    const armed = () => opts.tip !== undefined && this.armedTip === opts.tip;
    const refresh = () => { draw(armed()); c.setScale(armed() ? 1.06 : 1); };
    this.menuRefresh.push(refresh);
    c.on('pointerdown', (p?: Phaser.Input.Pointer) => {
      if (p?.wasTouch && this.tip && opts.tip !== undefined && !armed()) {
        this.armedTip = opts.tip;
        this.tip.setText(opts.tip);
        this.menuRefresh.forEach((fn) => fn());     // 이전에 선택돼 있던 버튼의 강조는 푼다
        return;
      }
      cb();
    });
    c.on('pointerover', () => { draw(true); c.setScale(1.06); if (opts.tip !== undefined) this.tip?.setText(opts.tip); });
    c.on('pointerout', () => { refresh(); if (opts.tip !== undefined && !armed()) this.tip?.setText(''); });
    if (tex) { const ix = texFor(tex, 0); c.add(this.add.image(0, -7, ix.key).setScale(0.44 * ix.scale)); }
    else if (opts.icon) c.add(icon(this, opts.icon, 0, -7, 1.0));
    else c.add(text(this, 0, -8, label, 15, enabled ? C.dim : '#775f66'));
    if (sub) c.add(text(this, 0, 19, sub, 12, opts.subColor ?? (enabled ? C.gold : '#aa8888')));
    this.menu.push(c);
  }

  private openBuildMenu(spot: Spot) {
    if (this.tutorial('build', () => this.openBuildMenu(spot))) return;
    this.closeMenu();
    const c = this.clampCenter(spot.pos.x, spot.pos.y);
    this.menu.push(this.add.circle(c.x, c.y, 102, 0x050810, 0.3).setStrokeStyle(1.5, 0xffffff, 0.22).setDepth(999));
    this.tip = text(this, c.x, c.y, '', 12, C.text, { stroke: 3 }).setDepth(1003).setWordWrapWidth(84).setAlign('center');
    this.menu.push(this.tip);
    const all: TowerKind[] = ['archer', 'barracks', 'mage', 'cannon', 'frost', 'thunder'];
    const kinds = all.filter((k) => !TOWERS[k].extra || this.features.extraTowers);
    const offs = kinds.length > 4
      ? [[0, -70], [61, -35], [61, 35], [0, 70], [-61, 35], [-61, -35]]
      : [[0, -66], [66, 0], [0, 66], [-66, 0]];
    kinds.forEach((k, i) => {
      const def = TOWERS[k], cost = def.levels[0].cost;
      const tip = `${t('tower.' + k)}\n${t('desc.' + k)}`;
      this.menuButton(c.x + offs[i][0], c.y + offs[i][1], def.tex, '', `${cost}`, this.gold >= cost, () => {
        if (this.gold >= cost) this.buildTower(spot, k);
      }, { tip });
    });
  }

  /** 이 스테이지에서 타워를 한 단계 더 올릴 수 있는지 */
  private canUpgrade(tw: Tower) {
    return !tw.maxed && tw.level + 1 < this.features.maxTowerLevel;
  }

  private openTowerMenu(spot: Spot) {
    const tw = spot.tower!;
    if (this.features.maxTowerLevel > 1 && this.tutorial('upgrade', () => this.openTowerMenu(spot))) return;
    this.closeMenu();
    const c = this.clampCenter(spot.pos.x, spot.pos.y);
    const isBarracks = tw.kind === 'barracks';
    // 병영은 공격 사거리 대신 집결지점을 둘 수 있는 범위와 현재 집결지점(깃발)을 보여준다
    const showR = isBarracks ? Tower.RALLY_MAX : tw.lv.range;
    this.menu.push(this.add.circle(spot.pos.x, spot.pos.y, showR, 0xffffff, 0.12).setStrokeStyle(2, 0xffffff, 0.5).setDepth(998));
    if (isBarracks) this.menu.push(this.add.image(tw.rally.x, tw.rally.y - 12, 'ic_flag').setScale(0.6).setDepth(999));
    this.menu.push(text(this, c.x, c.y - 112, `${t('tower.' + tw.kind)} Lv.${tw.level + 1}`, 16, C.text, { stroke: 4 }).setDepth(1002));
    if (this.canUpgrade(tw)) {
      this.menuButton(c.x, c.y - 66, null, '', `${tw.upgradeCost}`, this.gold >= tw.upgradeCost, () => {
        if (this.gold < tw.upgradeCost) return;
        this.gold -= tw.upgradeCost; tw.upgrade(); play('upgrade'); this.floatText(spot.pos.x, spot.pos.y - 50, t('levelUp'), '#9fe870'); this.closeMenu();
      }, { icon: 'ic_up' });
    } else if (this.features.maxTowerLevel > 1) {
      this.menuButton(c.x, c.y - 66, null, 'MAX', '', false, () => {});
    }
    if (isBarracks) {
      this.menuButton(c.x - 66, c.y, null, '', '', true, () => this.pickRally(tw), { icon: 'ic_flag', tip: t('rallyBtn') });
    }
    this.menuButton(c.x, c.y + 66, null, '', `+${tw.sellValue}`, true, () => {
      this.gold += tw.sellValue; tw.destroy(); play('sell');
      this.towers.splice(this.towers.indexOf(tw), 1);
      spot.tower = null; spot.img.setVisible(true).setInteractive();
      this.closeMenu();
    }, { icon: 'ic_sell' });
  }

  // ---------- 튜토리얼 설명창 ----------
  /**
   * 튜토리얼 구간(1~4번)에서 새 기능을 처음 쓰면 게임을 멈추고 설명창을 띄운다.
   * 설명창을 띄웠으면 true를 돌려주고, 닫은 뒤 then 을 다시 실행한다.
   */
  private tutorial(key: string, then: () => void): boolean {
    if (this.level.id > TUTORIAL_STAGES || this.modal || this.tutShown.has(key) || tutorialSeen(key)) return false;
    this.modal = true;
    this.tutShown.add(key);
    markTutorialSeen(key);
    const m = modal(this, 660, 330, 3000);
    const ui = m.objects;
    const close = () => { ui.forEach((o) => o.destroy()); this.modal = false; then(); };
    const title = text(this, m.cx, m.cy - 118, t(`tut.${key}.title`), 27, C.gold).setDepth(3002);
    const body = text(this, m.cx, m.cy - 8, t(`tut.${key}.body`), 17, C.text, { weight: '500' })
      .setDepth(3002).setWordWrapWidth(580).setAlign('center').setLineSpacing(8);
    const ok = button(this, m.cx, m.cy + 118, 190, 48, t('ok'), close, C.green, 19);
    ok.bg.setDepth(3002);
    ui.push(title, body, ok.bg);
    return true;
  }

  private buildTower(spot: Spot, kind: TowerKind) {
    const cost = TOWERS[kind].levels[0].cost;
    if (this.gold < cost || spot.tower) return;
    this.gold -= cost;
    play('build');
    const tw = new Tower(this, kind, spot.pos, this.paths.filter((p) => !p.air));
    spot.tower = tw;
    this.towers.push(tw);
    spot.img.setVisible(false);
    tw.img.setInteractive({ useHandCursor: true });
    tw.img.on('pointerdown', () => { if (!this.spell && !this.selHero && !this.selRally && !this.selWall && !this.over) this.openTowerMenu(spot); });
    this.closeMenu();
  }

  // ---------- 영웅 ----------
  private heroSpawnPoint(): Vec {
    const p = this.paths.find((q) => !q.air) ?? this.paths[0];
    return p.at(p.total * 0.35);
  }

  private spawnHero(k: HeroKind) {
    const st = this.heroes[k];
    const h = new Hero(this, k, this.heroSpawnPoint());
    st.hero = h;
    this.soldiers.push(h);
    this.splashFx(h.x, h.y, 30, 0xffe9a0);
  }

  private pickHero(k: HeroKind) {
    if (!this.features.heroes || this.over) return;
    this.closeMenu();
    const h = this.heroes[k].hero;
    if (!h || h.dead) return;
    this.cancelRally(); this.cancelWall();
    this.spell = null;
    this.selHero = this.selHero === k ? null : k;
    if (this.selHero) this.showBanner(t('heroMove', { name: t('hero.' + k) }), '', true);
    else this.hideBanner();
  }

  private moveHero(k: HeroKind, x: number, y: number) {
    const h = this.heroes[k].hero;
    this.selHero = null;
    this.hideBanner();
    if (!h || h.dead || y < 44) return;
    h.home = { x, y };
    this.splashFx(x, y, 14, 0x9fe870);
  }

  // ---------- 벽 ----------
  /** 벽 버튼: 설치 자리를 고르는 모드를 켜고 끈다 */
  private pickWall() {
    if (this.over) return;
    if (this.tutorial('wall', () => this.pickWall())) return;
    if (this.selWall) { this.cancelWall(); return; }
    this.closeMenu(); this.cancelRally();
    this.spell = null; this.selHero = null;
    this.selWall = true;
    const tier = wallFor(this.level.id);
    this.showBanner(t('wallMove', { name: t('wall.' + tier.key), cost: tier.cost }), '', true);
  }

  private cancelWall() {
    if (!this.selWall) return;
    this.selWall = false;
    this.hideBanner();
  }

  /** 누른 곳에서 가장 가까운 길 위의 점에 벽을 세운다 (조건이 안 맞으면 이유를 띄우고 계속 고르게 둔다) */
  private placeWall(x: number, y: number) {
    if (y < 44) return;
    const tier = wallFor(this.level.id);
    const live = this.walls.filter((w) => !w.dead);
    let best: { pt: Vec; dist: number; horizontal: boolean } | null = null;
    for (const p of this.paths) {
      if (p.air) continue;
      const n = p.nearest({ x, y });
      if (!best || n.dist < best.dist) best = { ...n, horizontal: p.horizontalAt(n.d) };
    }
    if (live.length >= WALL_MAX) { this.floatText(x, y - 20, t('wallMax', { n: WALL_MAX }), '#ff9a6a'); return; }
    if (!best || best.dist > WALL_SNAP || live.some((w) => Math.hypot(w.x - best!.pt.x, w.y - best!.pt.y) < WALL_GAP)) {
      this.floatText(x, y - 20, t('wallBad'), '#ff9a6a');
      return;
    }
    if (this.gold < tier.cost) { this.floatText(x, y - 20, t('wallGold'), '#ff6060'); return; }
    this.gold -= tier.cost;
    this.walls.push(new Wall(this, best.pt, tier, best.horizontal));
    play('build');
    this.cancelWall();
  }

  // ---------- 병영 집결지점 ----------
  /** 병영 메뉴의 깃발 버튼: 집결지점을 고르는 모드로 들어간다 */
  private pickRally(tw: Tower) {
    this.closeMenu();
    this.cancelWall();
    this.spell = null; this.selHero = null;
    this.selRally = tw;
    this.rallyPickDown = this.input.activePointer.downTime;
    this.rallyUi.push(
      this.add.circle(tw.pos.x, tw.pos.y, Tower.RALLY_MAX, 0xffffff, 0.12).setStrokeStyle(2, 0xffffff, 0.5).setDepth(998),
      this.add.image(tw.rally.x, tw.rally.y - 12, 'ic_flag').setScale(0.6).setDepth(999),
    );
    this.showBanner(t('rallyMove'), '', true);
  }

  /** 누른 곳(범위 밖이면 가장 가까운 가장자리)으로 집결지점을 옮긴다 */
  private placeRally(x: number, y: number) {
    const tw = this.selRally;
    this.cancelRally();
    if (!tw || y < 44) return;
    tw.setRally({ x, y });
    play('rally');
    this.splashFx(tw.rally.x, tw.rally.y, 14, 0x9fe870);
  }

  private cancelRally() {
    if (!this.selRally) return;
    this.selRally = null;
    this.rallyUi.forEach((o) => o.destroy());
    this.rallyUi = [];
    this.hideBanner();
  }

  private useAbility(k: HeroKind) {
    const st = this.heroes[k], h = st.hero;
    if (this.over || !h || h.dead || st.cd > 0) return;
    st.cd = HEROES[k].abilityCd;
    play('hero');
    if (k === 'knight') {
      this.splashFx(h.x, h.y, 85, 0xffd34d);
      for (const e of this.enemies) {
        if (e.dead || e.def.flying || Math.hypot(e.x - h.x, e.y - h.y) > 85) continue;
        e.hurt(70, false);
        e.stun(2);
      }
    } else {
      this.splashFx(h.x, h.y, 140, 0x66ccff);
      for (const e of this.enemies) {
        if (e.dead || Math.hypot(e.x - h.x, e.y - h.y) > 140) continue;
        e.hurt(40, true);
        e.slow(0.4, 4);
      }
    }
  }

  // ---------- 웨이브 ----------
  private startNextWave() {
    this.waveIdx++;
    play('wave');
    const wave = this.level.waves[this.waveIdx];
    const hasBoss = wave.groups.some((grp) => BOSS_KINDS.has(grp.kind));
    for (const grp of wave.groups) {
      const wait = hasBoss && BOSS_KINDS.has(grp.kind) ? BOSS_INTRO : 0;   // 보스는 등장 연출이 끝난 뒤에 나온다
      for (let i = 0; i < grp.count; i++) {
        this.pending.push({ t: this.clock + wait + (grp.delay ?? 0) + i * grp.interval, kind: grp.kind, path: grp.path ?? 0 });
      }
    }
    this.nextWaveAt = wave.time > 0 ? this.clock + wave.time : Infinity;
    const last = this.waveIdx === this.level.waves.length - 1;
    this.showBanner(last ? t('lastWave') : t('waveBanner', { n: this.waveIdx + 1 }), '');
    if (hasBoss) this.bossIntro();           // 일반 웨이브 배너 뒤에 불러서 "보스 출현!"이 보이게 한다
  }

  private callNextWave() {
    if (this.over || this.waveIdx + 1 >= this.level.waves.length) return;
    if (this.tutorial('nextwave', () => this.callNextWave())) return;
    const bonus = this.earlyBonus();
    if (bonus > 0 && this.waveIdx >= 0) { this.gold += bonus; play('coin'); this.floatText(GAME_W - 90, GAME_H - 80, t('early', { n: bonus }), '#9fe870'); }
    this.startNextWave();
  }

  // ---------- 스펠 ----------
  private pickSpell(s: Spell) {
    if (!this.features[s] || this.spellCd[s] > 0 || this.over) return;
    if (this.tutorial(s, () => this.pickSpell(s))) return;
    this.closeMenu();
    this.cancelRally(); this.cancelWall();
    this.spell = this.spell === s ? null : s;
    if (this.spell) this.showBanner(t(s), t('castHint'), true);
    else this.hideBanner();
  }

  /** 화염비 한 발: 불꽃 그림이 떨어지다가 닿으면 착탄 효과가 터진다. 그림이 없으면 주황 공으로 대신한다 */
  private fireDrop(tx: number, ty: number, delay: number) {
    if (!this.anims.exists('fire_fall')) {
      const rock = this.add.circle(tx + 30, ty - 260, 9, 0xff7a1a).setDepth(940);
      this.tweens.add({ targets: rock, x: tx, y: ty, delay: delay * 1000, duration: 350, onComplete: () => rock.destroy() });
      return;
    }
    const k = 0.21;                        // 도트 그림(88px 칸)을 화면에서 약 18px 로 그린다 (처음 0.7 의 30%, 2026-11-06 사용자 요청)
    const fall = this.add.sprite(tx + 30, ty - 260, 'fire_fall').setScale(k).setDepth(940).setVisible(false);
    fall.play({ key: 'fire_fall', startFrame: Math.floor(Math.random() * 5) });
    this.tweens.add({
      targets: fall, x: tx, y: ty - 5, delay: delay * 1000, duration: 350,
      onStart: () => fall.setVisible(true),
      onComplete: () => {
        fall.destroy();
        const hit = this.add.sprite(tx, ty - 4, 'fire_hit').setScale(k * 1.1).setDepth(940);
        hit.play('fire_hit');
        hit.once('animationcomplete', () => hit.destroy());
      },
    });
  }

  private castSpell(s: Spell, x: number, y: number) {
    this.spell = null;
    this.hideBanner();
    if (y < 40) return;
    if (s === 'fire') {
      play('fire');
      this.spellCd.fire = FIRE_CD;
      for (let i = 0; i < 9; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 80;
        const tx = x + Math.cos(a) * r, ty = y + Math.sin(a) * r * 0.7;
        const delay = 0.2 + i * 0.18;
        this.strikes.push({ t: this.clock + delay + 0.35, x: tx, y: ty });
        this.fireDrop(tx, ty, delay);
      }
    } else {
      play('reinf');
      this.spellCd.reinf = REINF_CD;
      for (let i = 0; i < 2; i++) {
        const home = { x: x + (i ? 16 : -16), y: y + 6 };
        this.soldiers.push(new Soldier(this, home, 9, 90, 110, 20, 'soldier_reinf'));
      }
      this.splashFx(x, y, 28, 0x4aa3ff);
    }
  }

  // ---------- 결과 ----------
  private finish(win: boolean) {
    this.over = true;
    this.spell = null;
    this.closeMenu();
    this.cancelRally(); this.cancelWall();
    play(win ? 'win' : 'lose');
    const stars = win ? (this.lives >= this.maxLives * 0.9 ? 3 : this.lives >= this.maxLives * 0.5 ? 2 : 1) : 0;
    if (win) saveStars(this.level.id, stars);
    const diff = getDifficulty();
    const sc = win ? calcScore(this.level, this.lives, this.clock, diff) : null;
    const record = sc ? saveBestScore(this.level.id, sc.total, diff) : false;
    const canNext = win && this.index + 1 < LEVELS.length;

    const W = 780, H = 370;
    const m = modal(this, W, H, 2000, win ? C.goldHex : C.danger);
    const ui = this.resultUi;
    ui.push(...m.objects);
    const top = m.cy - H / 2, lx = m.cx - 205, rx = m.cx + 195;
    m.g.lineStyle(1, 0xffffff, 0.1).lineBetween(m.cx - 5, top + 34, m.cx - 5, top + H - 34);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { ui.push(o); return o; };

    // ----- 왼쪽: 결과와 점수 -----
    add(text(this, lx, top + (win ? 50 : 150), win ? t('victory') : t('defeat'), 40, win ? C.gold : C.red).setDepth(2002));
    if (sc) {
      for (let i = 0; i < 3; i++) {
        const st = icon(this, i < stars ? 'ic_star' : 'ic_star_off', lx + (i - 1) * 58, top + 104, 1.45).setDepth(2002).setScale(0);
        this.tweens.add({ targets: st, scale: 0.72, duration: 260, delay: 150 + i * 150, ease: 'Back.Out' });
        add(st);
      }
      add(text(this, lx, top + 150, t('score'), 13, C.dim, { weight: '500' }).setDepth(2002));
      const val = add(text(this, lx, top + 184, '0', 42, C.gold, { weight: '700' }).setDepth(2002)) as Phaser.GameObjects.Text;
      this.tweens.addCounter({ from: 0, to: sc.total, duration: 800, delay: 300, onUpdate: (tw) => val.setText(fmt(tw.getValue() ?? 0)) });
      const best = getBestScore(this.level.id);
      if (record) {
        const nr = add(text(this, lx, top + 216, t('newRecord'), 15, '#7dffb0', { weight: '700' }).setDepth(2002).setScale(0)) as Phaser.GameObjects.Text;
        this.tweens.add({ targets: nr, scale: 1, duration: 300, delay: 1000, ease: 'Back.Out' });
      } else if (best) add(text(this, lx, top + 216, t('bestScore', { n: fmt(best.score) }), 14, C.dim, { weight: '500' }).setDepth(2002));
      const rows: [string, string][] = [
        [t('scoreClear'), `+${fmt(sc.base)}`],
        [t('scoreLives', { n: this.lives }), `+${fmt(sc.lives)}`],
        [t('scoreTime'), `+${fmt(sc.time)}`],
        [t('scoreDiff', { m: sc.mult }), ''],
      ];
      rows.forEach(([a, b], i) => {
        const y = top + 246 + i * 21;
        add(text(this, lx - 140, y, a, 13, C.dim, { weight: '500' }).setOrigin(0, 0.5).setDepth(2002));
        add(text(this, lx + 140, y, b, 13, C.text, { weight: '600' }).setOrigin(1, 0.5).setDepth(2002));
      });
    }

    // ----- 오른쪽: 버튼 -----
    let y = top + (win ? 56 : 120);
    const mk = (label: string, cb: () => void, color: number, ic?: string) => {
      const b = button(this, rx, y, 320, 44, label, cb, color, 17, ic ? { icon: ic, iconScale: 0.8 } : {});
      b.bg.setDepth(2002);
      ui.push(b.bg);
      y += 54;
      return b;
    };
    if (canNext) mk(t('nextStage'), () => void this.afterAd(() => this.scene.restart({ index: this.index + 1 })), C.green, 'ic_play');
    if (sc && rankingEnabled()) {
      let busy = false;
      const sb = mk(t('rankSubmit'), async () => {
        if (busy) return;
        busy = true;
        try {
          if (!cleanName(getPlayer().name)) {
            const v = await askUniqueName('');
            if (!v) { busy = false; return; }
          }
          const bs = getBestScore(this.level.id) ?? { score: sc.total, diff };
          try { await submitScore(this.level.id, bs.score, bs.diff); } catch (e) {
            // 예전에 정한 이름을 다른 사람이 먼저 가져갔다면 새 이름을 받아서 다시 올린다
            if (!(e instanceof NameTakenError) || !(await askUniqueName(getPlayer().name, t('nameTaken')))) throw e;
            await submitScore(this.level.id, bs.score, bs.diff);
          }
          sb.setLabel(t('rankDone')); sb.setEnabled(false);
        } catch { sb.setLabel(t('rankFail')); busy = false; }
      }, C.orange, 'ic_trophy');
    }
    if (sc) {
      const share = `${t('title')} · ${t('stageN', { n: this.level.id })} ${t('level.' + this.level.id)}: ${fmt(sc.total)} (${t('diff.' + diff)}) ${'★'.repeat(stars)}\n${location.origin}${location.pathname}`;
      const cb = mk(t('copyResult'), async () => {
        try { await navigator.clipboard.writeText(share); cb.setLabel(t('copied')); } catch {
          await promptText({ title: t('copyResult'), value: share, maxLen: 300, ok: t('ok'), cancel: t('cancel') });
        }
      }, C.slate);
    }
    mk(t('retry'), () => void this.afterAd(() => this.scene.restart({ index: this.index })), C.blue);
    mk(t('stageSelect'), () => void this.afterAd(() => this.scene.start('LevelSelect')), C.slate);
  }

  // ---------- 메인 루프 ----------
  update(_time: number, delta: number) {
    this.updateHud();
    this.drawBars();
    if (this.paused || this.over || this.modal || this.scene.isActive('Taunt')) return;   // 팝업이 떠 있는 동안은 멈춘다
    this.inFrame = true;                       // 이어하기 안내는 실제 화면 루프에서만 띄운다 (밸런스 시뮬레이션은 step 을 직접 부른다)
    this.step(Math.min(delta, 50) / 1000 * this.speed);
    this.inFrame = false;
  }

  // ---------- 패배 후 이어하기 (보상형 광고) ----------
  /** 생명이 0이 됐을 때 광고를 보고 이어할지 묻는다. 안내창을 띄웠으면 true (그동안 전투는 멈춘다) */
  private tryRevive(): boolean {
    if (!this.inFrame || this.reviveLeft <= 0 || this.modal || this.over) return false;
    this.reviveLeft--;
    this.modal = true;
    void this.askRevive();
    return true;
  }

  private async askRevive() {
    const n = Math.max(1, Math.ceil(this.maxLives * REVIVE_LIVES_RATIO));
    const wants = await new Promise<boolean>((resolve) => {
      const m = modal(this, 600, 310, 3000, C.danger);
      const ui = m.objects;
      const close = (v: boolean) => { ui.forEach((o) => o.destroy()); resolve(v); };
      const title = text(this, m.cx, m.cy - 100, t('reviveTitle'), 28, C.red).setDepth(3002);
      const body = text(this, m.cx, m.cy - 20, t('reviveBody', { n }), 20, C.text, { weight: '500' })
        .setDepth(3002).setWordWrapWidth(520).setAlign('center').setLineSpacing(8);
      const yes = button(this, m.cx + 110, m.cy + 100, 210, 50, t('reviveBtn'), () => close(true), C.green, 18);
      const no = button(this, m.cx - 110, m.cy + 100, 150, 50, t('reviveNo'), () => close(false), C.slate, 18);
      yes.bg.setDepth(3002); no.bg.setDepth(3002);
      ui.push(title, body, yes.bg, no.bg);
    });
    const ok = wants && await ads.show(this, 'revive');
    this.modal = false;
    if (ok) {
      this.lives = n;
      this.cameras.main.flash(300, 120, 255, 160);
      this.floatText(GAME_W / 2, GAME_H / 2, `♥ ${n}`, '#9fe870');
    } else {
      this.finish(false);
    }
  }

  /** 결과 화면에서 다른 화면으로 넘어가기 직전, 스테이지 사이 전면 광고 자리를 거친다 */
  private async afterAd(go: () => void) {
    await ads.interstitial(this);
    go();
  }

  /** 한 틱 진행. 밸런스 시뮬레이션에서도 직접 호출한다. */
  step(dt: number) {
    this.clock += dt;

    if (this.waveIdx + 1 < this.level.waves.length && this.clock >= this.nextWaveAt) this.startNextWave();

    for (let i = this.pending.length - 1; i >= 0; i--) {
      const s = this.pending[i];
      if (s.t <= this.clock) {
        this.enemies.push(new Enemy(this, s.kind, this.paths[s.path] ?? this.paths[0]));
        this.pending.splice(i, 1);
      }
    }
    for (const k of ['knight', 'sorc'] as HeroKind[]) {
      const st = this.heroes[k];
      st.cd = Math.max(0, st.cd - dt);
      if (!this.features.heroes) continue;
      if (st.hero?.dead) { st.hero = null; st.respawn = HEROES[k].respawn; if (this.selHero === k) this.selHero = null; }
      else if (!st.hero && (st.respawn -= dt) <= 0) this.spawnHero(k);
    }
    this.spellCd.fire = Math.max(0, this.spellCd.fire - dt);
    this.spellCd.reinf = Math.max(0, this.spellCd.reinf - dt);
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i];
      if (s.t > this.clock) continue;
      this.splashFx(s.x, s.y, 44, 0xff6a1a);
      for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - s.x, e.y - s.y) <= 44) e.hurt(46, true);
      this.strikes.splice(i, 1);
    }
    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const b = this.blasts[i];
      if (b.t > this.clock) continue;
      b.warn.forEach((o) => { this.tweens.killTweensOf(o); o.destroy(); });
      this.blasts.splice(i, 1);
      this.fireBlast(b);
    }

    this.enemies.forEach((e) => e.update(dt));
    this.soldiers.forEach((s) => s.update(dt));
    this.walls.forEach((w) => w.update(dt));
    this.towers.forEach((t) => t.update(dt));
    this.projs.forEach((p) => p.update(dt));

    this.enemies = this.enemies.filter((e) => !e.dead);
    this.soldiers = this.soldiers.filter((s) => !s.dead);
    this.walls = this.walls.filter((w) => !w.dead);
    this.projs = this.projs.filter((p) => !p.done);

    if (this.lives <= 0) { if (!this.tryRevive()) this.finish(false); }
    else if (this.waveIdx === this.level.waves.length - 1 && this.pending.length === 0 && this.enemies.length === 0) this.finish(true);
  }

  private drawBars() {
    const g = this.bars;
    g.clear();
    const bar = (x: number, y: number, w: number, frac: number, color: number) => {
      g.fillStyle(0x050810, 0.65).fillRoundedRect(x - w / 2 - 1, y - 1, w + 2, 6, 3);
      g.fillStyle(color, 1).fillRoundedRect(x - w / 2, y, Math.max(3, w * Math.max(0, frac)), 4, 2);
    };
    const hpColor = (f: number) => (f > 0.6 ? 0x4cd27a : f > 0.3 ? 0xffc83d : 0xff5a5a);
    for (const e of this.enemies) {
      // 체력바는 몸 위에 둔다 (한 장짜리 큰 그림은 그림 높이에 맞춘다)
      const big = e.def.tex === 'e_ogre' || !!e.def.sprite;
      const top = e.def.sprite ? e.img.displayHeight * 0.5 + 12 : (e.def.flying ? 44 : 26) + (e.def.tex === 'e_ogre' ? 16 : 0);
      if (e.hp < e.maxHp) bar(e.x, e.y - top, big ? 44 : 26, e.hp / e.maxHp, hpColor(e.hp / e.maxHp));
    }
    if (this.selHero) {
      const h = this.heroes[this.selHero].hero;
      if (h && !h.dead) g.lineStyle(2, 0x9fe870, 1).strokeEllipse(h.x, h.y + 12, 34, 16);
    }
    for (const s of this.soldiers) if (s.hp < s.maxHp) bar(s.x, s.y - 18, 20, s.hp / s.maxHp, 0x5aa8ff);
    for (const w of this.walls) if (w.hp < w.maxHp) bar(w.x, w.y - 24, 30, w.hp / w.maxHp, 0xd9b36a);
    for (const t of this.towers) {
      for (let i = 0; i <= t.level; i++) g.fillStyle(0xffd34d, 1).fillCircle(t.pos.x - t.level * 5 + i * 10, t.pos.y + 18, 3);
    }
  }
}

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
