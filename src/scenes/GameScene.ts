import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { LEVELS, LevelDef, Theme } from '../data/levels';
import { EnemyKind } from '../data/enemies';
import { TOWERS, TowerKind } from '../data/towers';
import { HEROES, HeroKind } from '../data/heroes';
import { Enemy, Hero, Projectile, Soldier, Tower, World } from '../game/entities';
import { t } from '../i18n';
import { PathData, Vec } from '../game/path';
import { ads } from '../ads';
import { hasSkinTexture, texFor } from '../skin';
import { saveStars, getDifficulty, tutorialSeen, markTutorialSeen } from '../save';
import { DIFFICULTIES, Features, featuresFor, TUTORIAL_STAGES } from '../data/features';
import { Btn, button, text, C, icon, panel, modal } from '../ui';

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

const FIRE_CD = 40, REINF_CD = 22, AD_GOLD = 150, AD_GOLD_CD = 90;

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
  private paused = false;
  private over = false;
  private revived = false;
  private adBusy = false;
  private adGoldReady = 0;
  private features!: Features;
  hpMul = 1;
  private modal = false;
  private tutShown = new Set<string>();

  private unlocked = new Set<string>();
  private heroes: Record<HeroKind, { hero: Hero | null; respawn: number; cd: number }> = {
    knight: { hero: null, respawn: 0, cd: 0 }, sorc: { hero: null, respawn: 0, cd: 0 },
  };
  private selHero: HeroKind | null = null;
  private heroBtns!: Record<HeroKind, { pick: Btn; skill: Btn }>;
  private tip: Phaser.GameObjects.Text | null = null;
  private dialog: Phaser.GameObjects.GameObject[] = [];

  private spell: Spell | null = null;
  private spellCd: Record<Spell, number> = { fire: 0, reinf: 0 };
  private strikes: { t: number; x: number; y: number }[] = [];

  private hud!: { gold: Phaser.GameObjects.Text; lives: Phaser.GameObjects.Text; wave: Phaser.GameObjects.Text; hint: Phaser.GameObjects.Text };
  private hintBg!: Phaser.GameObjects.Graphics;
  private waveBar!: Phaser.GameObjects.Graphics;
  private bars!: Phaser.GameObjects.Graphics;
  private menu: Phaser.GameObjects.GameObject[] = [];
  private buttons: { fire: Btn; reinf: Btn; ad: Btn; next: Btn; speed: Btn; pause: Btn } | null = null;
  private resultUi: Phaser.GameObjects.GameObject[] = [];

  constructor() { super('Game'); }

  get gs(): Phaser.Scene { return this; }

  init(data: { index?: number }) {
    this.index = data.index ?? 0;
    this.enemies = []; this.soldiers = []; this.projs = []; this.towers = []; this.spots = [];
    this.pending = []; this.menu = []; this.resultUi = []; this.strikes = [];
    this.waveIdx = -1; this.clock = 0; this.speed = 1; this.paused = false; this.over = false;
    this.revived = false; this.adBusy = false; this.adGoldReady = 0; this.spell = null;
    this.spellCd = { fire: 0, reinf: 0 };
    this.unlocked = new Set();
    this.heroes = { knight: { hero: null, respawn: 0, cd: 0 }, sorc: { hero: null, respawn: 0, cd: 0 } };
    this.selHero = null; this.tip = null; this.dialog = []; this.modal = false; this.tutShown = new Set();
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
      img.on('pointerdown', () => { if (!this.spell && !this.selHero && !this.over) this.openBuildMenu(spot); });
      this.spots.push(spot);
    }

    this.buildHud();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.over) return;
      if (over.some((o) => o.getData('ui'))) return;
      if (this.spell) { this.castSpell(this.spell, p.x, p.y); return; }
      if (this.selHero) { this.moveHero(this.selHero, p.x, p.y); return; }
      if (over.length === 0) this.closeMenu();
    });
    this.input.keyboard?.on('keydown-SPACE', () => this.togglePause());

    this.showBanner(`${this.level.id}. ${t('level.' + this.level.id)}`, t('startHint'));
    this.nextWaveAt = this.clock + (this.level.id <= TUTORIAL_STAGES ? 25 : 12); // 첫 웨이브 전 준비 시간
  }

  // ---------- World ----------
  gainGold(n: number, x: number, y: number) {
    this.gold += n;
    this.floatText(x, y - 14, `+${n}`, '#ffd34d');
  }

  leak(lives: number) {
    this.lives = Math.max(0, this.lives - lives);
    this.cameras.main.shake(120, 0.004);
    this.floatText(GAME_W - 40, 60, `-${lives}`, '#ff6060');
  }

  splashFx(x: number, y: number, r: number, color: number) {
    const c = this.add.circle(x, y, r, color, 0.55).setDepth(850);
    this.tweens.add({ targets: c, alpha: 0, scale: 1.3, duration: 260, onComplete: () => c.destroy() });
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
      pause: d(button(this, GAME_W - 30, 22, 40, 32, '', () => this.togglePause(), C.slate, 14, { icon: 'ic_pause', iconScale: 0.7, ...small })),
      speed: d(button(this, GAME_W - 76, 22, 40, 32, '', () => this.toggleSpeed(), C.slate, 14, { icon: 'ic_ff', iconScale: 0.7, ...small })),
      fire: d(button(this, spellX('fire'), y, 66, 66, t('fire'), () => this.pickSpell('fire'), C.orange, 12, { icon: 'ic_fire', iconScale: 1.05, layout: 'top' })),
      reinf: d(button(this, spellX('reinf'), y, 66, 66, t('reinf'), () => this.pickSpell('reinf'), C.blue, 12, { icon: 'ic_reinf', iconScale: 1.05, layout: 'top' })),
      ad: d(button(this, 520, y, 150, 58, '', () => this.watchAdGold(), C.purple, 13, { icon: 'ic_coin', iconScale: 1.0 })),
      next: d(button(this, GAME_W - 100, y, 170, 58, '', () => this.callNextWave(), C.green, 14, { icon: 'ic_play', iconScale: 0.8 })),
    };
    this.buttons.fire.setVisible(f.fire);
    this.buttons.reinf.setVisible(f.reinf);
    this.buttons.ad.setVisible(f.adGold);
    const mkHero = (k: HeroKind, x: number) => {
      const hx = texFor(HEROES[k].tex);
      return {
        pick: d(button(this, x, y, 118, 58, '', () => this.pickHero(k), 0x6b4a2a, 12, { icon: hx.key, iconScale: hx.scale === 1 ? 1.5 : 0.85 })),
        skill: d(button(this, x, y - 46, 118, 26, t('skill.' + k), () => this.useAbility(k), 0x258a8a, 12, { radius: 9 })),
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
    if (f.adGold) {
      const adWait = Math.ceil((this.adGoldReady - performance.now()) / 1000);
      b.ad.setLabel(adWait > 0 ? t('adWait', { s: adWait }) : t('adGold', { n: AD_GOLD }));
      b.ad.setCooldown(adWait > 0 ? adWait / AD_GOLD_CD : 0);
      b.ad.setEnabled(adWait <= 0 && !this.adBusy);
    }
    for (const k of ['knight', 'sorc'] as HeroKind[]) {
      if (!f.heroes) break;
      const st = this.heroes[k], ui = this.heroBtns[k], name = t('hero.' + k);
      const on = this.unlocked.has(k);
      const down = on && (!st.hero || st.hero.dead);
      if (!on) ui.pick.setLabel(`${name}\n[${t('adTag')}]`);
      else if (down) ui.pick.setLabel(`${name}\n${Math.ceil(Math.max(0, st.respawn))}s`);
      else ui.pick.setLabel(name);
      ui.pick.setCooldown(down ? st.respawn / HEROES[k].respawn : 0);
      ui.pick.setSelected(this.selHero === k);
      ui.skill.setVisible(on);
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

  private togglePause() {
    if (this.over) return;
    this.paused = !this.paused;
    this.buttons!.pause.setIcon(this.paused ? 'ic_play' : 'ic_pause');
    if (this.paused) this.showBanner(t('paused'), t('pausedSub'), true);
    else this.hideBanner();
  }

  private toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1;
    this.buttons!.speed.setSelected(this.speed === 2);
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
    c.on('pointerdown', () => cb());
    c.on('pointerover', () => { draw(true); c.setScale(1.06); if (opts.tip !== undefined) this.tip?.setText(opts.tip); });
    c.on('pointerout', () => { draw(false); c.setScale(1); if (opts.tip !== undefined) this.tip?.setText(''); });
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
    const kinds = all.filter((k) => !TOWERS[k].adLock || this.features.adTowers);
    const offs = kinds.length > 4
      ? [[0, -70], [61, -35], [61, 35], [0, 70], [-61, 35], [-61, -35]]
      : [[0, -66], [66, 0], [0, 66], [-66, 0]];
    kinds.forEach((k, i) => {
      const def = TOWERS[k], cost = def.levels[0].cost;
      const locked = !!def.adLock && !this.unlocked.has(k);
      const tip = `${t('tower.' + k)}\n${t('desc.' + k)}`;
      this.menuButton(c.x + offs[i][0], c.y + offs[i][1], def.tex, '', locked ? `[${t('adTag')}]` : `${cost}`,
        locked || this.gold >= cost, () => {
          if (locked) void this.unlockWithAd(k, t('tower.' + k)).then((ok) => { if (ok && !this.over) this.buildTower(spot, k); });
          else if (this.gold >= cost) this.buildTower(spot, k);
        }, { tip, subColor: locked ? '#c9b3ff' : undefined });
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
    this.menu.push(this.add.circle(spot.pos.x, spot.pos.y, tw.lv.range, 0xffffff, 0.12).setStrokeStyle(2, 0xffffff, 0.5).setDepth(998));
    this.menu.push(text(this, c.x, c.y - 112, `${t('tower.' + tw.kind)} Lv.${tw.level + 1}`, 16, C.text, { stroke: 4 }).setDepth(1002));
    if (this.canUpgrade(tw)) {
      this.menuButton(c.x, c.y - 66, null, '', `${tw.upgradeCost}`, this.gold >= tw.upgradeCost, () => {
        if (this.gold < tw.upgradeCost) return;
        this.gold -= tw.upgradeCost; tw.upgrade(); this.floatText(spot.pos.x, spot.pos.y - 50, t('levelUp'), '#9fe870'); this.closeMenu();
      }, { icon: 'ic_up' });
    } else if (this.features.maxTowerLevel > 1) {
      this.menuButton(c.x, c.y - 66, null, 'MAX', '', false, () => {});
    }
    this.menuButton(c.x, c.y + 66, null, '', `+${tw.sellValue}`, true, () => {
      this.gold += tw.sellValue; tw.destroy();
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
    const tw = new Tower(this, kind, spot.pos, this.paths.filter((p) => !p.air));
    spot.tower = tw;
    this.towers.push(tw);
    spot.img.setVisible(false);
    tw.img.setInteractive({ useHandCursor: true });
    tw.img.on('pointerdown', () => { if (!this.spell && !this.selHero && !this.over) this.openTowerMenu(spot); });
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

  private async pickHero(k: HeroKind) {
    if (!this.features.heroes || this.over || this.adBusy) return;
    this.closeMenu();
    if (!this.unlocked.has(k)) {
      const ok = await this.unlockWithAd(k, t('hero.' + k));
      if (ok && !this.over) this.spawnHero(k);
      return;
    }
    const h = this.heroes[k].hero;
    if (!h || h.dead) return;
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

  private useAbility(k: HeroKind) {
    const st = this.heroes[k], h = st.hero;
    if (this.over || !h || h.dead || st.cd > 0) return;
    st.cd = HEROES[k].abilityCd;
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
    const wave = this.level.waves[this.waveIdx];
    for (const grp of wave.groups) {
      for (let i = 0; i < grp.count; i++) {
        this.pending.push({ t: this.clock + (grp.delay ?? 0) + i * grp.interval, kind: grp.kind, path: grp.path ?? 0 });
      }
    }
    this.nextWaveAt = wave.time > 0 ? this.clock + wave.time : Infinity;
    const last = this.waveIdx === this.level.waves.length - 1;
    this.showBanner(last ? t('lastWave') : t('waveBanner', { n: this.waveIdx + 1 }), '');
  }

  private callNextWave() {
    if (this.over || this.waveIdx + 1 >= this.level.waves.length) return;
    if (this.tutorial('nextwave', () => this.callNextWave())) return;
    const bonus = this.earlyBonus();
    if (bonus > 0 && this.waveIdx >= 0) { this.gold += bonus; this.floatText(GAME_W - 90, GAME_H - 80, t('early', { n: bonus }), '#9fe870'); }
    this.startNextWave();
  }

  // ---------- 스펠 ----------
  private pickSpell(s: Spell) {
    if (!this.features[s] || this.spellCd[s] > 0 || this.over) return;
    if (this.tutorial(s, () => this.pickSpell(s))) return;
    this.closeMenu();
    this.spell = this.spell === s ? null : s;
    if (this.spell) this.showBanner(t(s), t('castHint'), true);
    else this.hideBanner();
  }

  private castSpell(s: Spell, x: number, y: number) {
    this.spell = null;
    this.hideBanner();
    if (y < 40) return;
    if (s === 'fire') {
      this.spellCd.fire = FIRE_CD;
      for (let i = 0; i < 9; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 80;
        const tx = x + Math.cos(a) * r, ty = y + Math.sin(a) * r * 0.7;
        const delay = 0.2 + i * 0.18;
        this.strikes.push({ t: this.clock + delay + 0.35, x: tx, y: ty });
        const rock = this.add.circle(tx + 30, ty - 260, 9, 0xff7a1a).setDepth(940);
        this.tweens.add({ targets: rock, x: tx, y: ty, delay: delay * 1000, duration: 350, onComplete: () => rock.destroy() });
      }
    } else {
      this.spellCd.reinf = REINF_CD;
      for (let i = 0; i < 2; i++) {
        const home = { x: x + (i ? 16 : -16), y: y + 6 };
        this.soldiers.push(new Soldier(this, home, 9, 90, 110, 20));
      }
      this.splashFx(x, y, 28, 0x4aa3ff);
    }
  }

  // ---------- 광고 ----------
  private confirmAd(title: string, sub: string): Promise<boolean> {
    return new Promise((resolve) => {
      const m = modal(this, 520, 250, 3000, C.purple);
      const ui = this.dialog;
      ui.push(...m.objects);
      const close = (v: boolean) => { ui.forEach((o) => o.destroy()); ui.length = 0; resolve(v); };
      ui.push(
        icon(this, 'ic_ad', m.cx, m.cy - 78, 1.4).setDepth(3002),
        text(this, m.cx, m.cy - 28, title, 22).setDepth(3002).setWordWrapWidth(470).setAlign('center'),
        text(this, m.cx, m.cy + 16, sub, 15, C.dim, { weight: '500' }).setDepth(3002).setWordWrapWidth(470).setAlign('center'));
      const mk = (x: number, label: string, color: number, v: boolean) => {
        const b = button(this, x, m.cy + 82, 190, 48, label, () => close(v), color, 18);
        b.bg.setDepth(3002);
        ui.push(b.bg);
      };
      mk(m.cx - 102, t('watch'), C.purple, true);
      mk(m.cx + 102, t('cancel'), C.slate, false);
    });
  }

  /** 확인 → 보상형 광고 시청 → 이번 스테이지 동안 잠금 해제 */
  private async unlockWithAd(key: string, name: string): Promise<boolean> {
    if (this.adBusy || this.over) return false;
    this.adBusy = true;
    let ok = false;
    try {
      if (await this.confirmAd(t('adUnlockTitle', { name }), t('adUnlockSub'))) {
        ok = await ads.showRewarded(t('reasonUnlock', { name }));
      }
    } finally {
      this.adBusy = false;
    }
    if (ok) this.unlocked.add(key);
    return ok;
  }

  private async watchAdGold() {
    if (!this.features.adGold || this.adBusy || this.over) return;
    this.adBusy = true;
    let ok = false;
    try { ok = await ads.showRewarded(t('reasonGold', { n: AD_GOLD })); } finally { this.adBusy = false; }
    if (ok) {
      this.gold += AD_GOLD;
      this.floatText(490, GAME_H - 90, `+${AD_GOLD}`, '#ffd34d');
      this.adGoldReady = performance.now() + AD_GOLD_CD * 1000;
    }
  }

  private async reviveWithAd() {
    if (this.adBusy) return;
    this.adBusy = true;
    let ok = false;
    try { ok = await ads.showRewarded(t('reasonRevive')); } finally { this.adBusy = false; }
    if (!ok) return;
    this.revived = true;
    this.lives = 10;
    this.over = false;
    this.clearResult();
  }

  // ---------- 결과 ----------
  private clearResult() {
    this.resultUi.forEach((o) => o.destroy());
    this.resultUi = [];
  }

  private finish(win: boolean) {
    this.over = true;
    this.spell = null;
    this.closeMenu();
    const stars = win ? (this.lives >= this.maxLives * 0.9 ? 3 : this.lives >= this.maxLives * 0.5 ? 2 : 1) : 0;
    if (win) saveStars(this.level.id, stars);
    const canNext = win && this.index + 1 < LEVELS.length;
    const canRevive = !win && !this.revived;
    const nBtn = (canNext || canRevive ? 1 : 0) + 2;
    const H = (win ? 250 : 190) + nBtn * 56;
    const m = modal(this, 480, H, 2000, win ? C.goldHex : C.danger);
    const ui = this.resultUi;
    ui.push(...m.objects);
    const top = m.cy - H / 2;
    ui.push(text(this, m.cx, top + 56, win ? t('victory') : t('defeat'), 44, win ? C.gold : C.red).setDepth(2002));
    let y = top + 100;
    if (win) {
      for (let i = 0; i < 3; i++) {
        const st = icon(this, i < stars ? 'ic_star' : 'ic_star_off', m.cx + (i - 1) * 64, y + 28, 1.7).setDepth(2002).setScale(0);
        this.tweens.add({ targets: st, scale: 0.85, duration: 260, delay: 180 + i * 160, ease: 'Back.Out' });
        ui.push(st);
      }
      y += 84;
    } else y += 6;
    y += 22;
    const mk = (label: string, cb: () => void, color: number, ic?: string) => {
      const b = button(this, m.cx, y, 380, 46, label, cb, color, 17, ic ? { icon: ic, iconScale: 0.9 } : {});
      b.bg.setDepth(2002);
      ui.push(b.bg);
      y += 56;
    };
    if (canNext) mk(t('nextStage'), () => this.scene.restart({ index: this.index + 1 }), C.green, 'ic_play');
    else if (canRevive) mk(t('revive'), () => this.reviveWithAd(), C.purple, 'ic_ad');
    mk(t('retry'), () => this.scene.restart({ index: this.index }), C.blue);
    mk(t('stageSelect'), () => this.scene.start('LevelSelect'), C.slate);
  }

  // ---------- 메인 루프 ----------
  update(_time: number, delta: number) {
    this.updateHud();
    this.drawBars();
    if (this.paused || this.over || this.adBusy || this.modal) return;
    this.step(Math.min(delta, 50) / 1000 * this.speed);
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
      if (!this.unlocked.has(k)) continue;
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

    this.enemies.forEach((e) => e.update(dt));
    this.soldiers.forEach((s) => s.update(dt));
    this.towers.forEach((t) => t.update(dt));
    this.projs.forEach((p) => p.update(dt));

    this.enemies = this.enemies.filter((e) => !e.dead);
    this.soldiers = this.soldiers.filter((s) => !s.dead);
    this.projs = this.projs.filter((p) => !p.done);

    if (this.lives <= 0) this.finish(false);
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
      if (e.hp < e.maxHp) bar(e.x, e.y - (e.def.flying ? 44 : 26) - (e.def.tex === 'e_ogre' ? 16 : 0), e.def.tex === 'e_ogre' ? 44 : 26, e.hp / e.maxHp, hpColor(e.hp / e.maxHp));
    }
    if (this.selHero) {
      const h = this.heroes[this.selHero].hero;
      if (h && !h.dead) g.lineStyle(2, 0x9fe870, 1).strokeEllipse(h.x, h.y + 12, 34, 16);
    }
    for (const s of this.soldiers) if (s.hp < s.maxHp) bar(s.x, s.y - 18, 20, s.hp / s.maxHp, 0x5aa8ff);
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
