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
import { saveStars } from '../save';
import { Btn, button, text } from '../ui';

interface Spot { pos: Vec; img: Phaser.GameObjects.Image; tower: Tower | null }
interface Pending { t: number; kind: EnemyKind; path: number }
type Spell = 'fire' | 'reinf';

const THEMES: Record<Theme, { ground: number; patch: number; road: number; edge: number; deco: number }> = {
  meadow: { ground: 0x4c8a3a, patch: 0x569a42, road: 0xc9b07a, edge: 0x8a7248, deco: 0x2f6b2a },
  desert: { ground: 0xd8b878, patch: 0xcfae6a, road: 0xa8845a, edge: 0x7a5c38, deco: 0x6a8f3a },
  snow: { ground: 0xdfe9f2, patch: 0xcfdcea, road: 0x9aa8b8, edge: 0x6b7888, deco: 0x2e5a45 },
};

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
    this.selHero = null; this.tip = null; this.dialog = [];
  }

  create() {
    this.level = LEVELS[this.index];
    this.gold = this.level.startGold;
    this.lives = this.maxLives = this.level.lives;
    this.paths = this.level.paths.map((p) => new PathData(p.pts, p.air));
    this.nextWaveAt = Infinity;

    this.drawMap();
    this.bars = this.add.graphics().setDepth(950);

    for (const pos of this.level.spots) {
      const img = this.add.image(pos.x, pos.y + 4, 'spot').setDepth(1).setInteractive({ useHandCursor: true });
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
    this.nextWaveAt = this.clock + 12; // 첫 웨이브 전 준비 시간
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
    for (let i = 0; i < 60; i++) {
      g.fillStyle(th.patch, 0.7).fillEllipse(rnd() * GAME_W, rnd() * GAME_H, 40 + rnd() * 90, 20 + rnd() * 50);
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
    for (let i = 0, placed = 0; i < 400 && placed < 38; i++) {
      const v = { x: 20 + rnd() * (GAME_W - 40), y: 60 + rnd() * (GAME_H - 80) };
      if (ground.some((p) => p.nearest(v, 8).dist < 55)) continue;
      if (this.level.spots.some((s) => Math.hypot(s.x - v.x, s.y - v.y) < 50)) continue;
      const s = 0.7 + rnd() * 0.7;
      g.fillStyle(0x000000, 0.18).fillEllipse(v.x, v.y + 14 * s, 30 * s, 10 * s);
      g.fillStyle(0x5a3b22).fillRect(v.x - 3 * s, v.y, 6 * s, 14 * s);
      g.fillStyle(th.deco).fillCircle(v.x, v.y - 6 * s, 15 * s);
      g.fillStyle(0xffffff, 0.12).fillCircle(v.x - 4 * s, v.y - 10 * s, 7 * s);
      placed++;
    }
    // 입구/출구 표시
    const first = this.paths.filter((p) => !p.air);
    for (const p of first) {
      const s = p.pts[0], e = p.pts[p.pts.length - 1];
      g.fillStyle(0xc0392b, 0.9).fillTriangle(Math.max(14, s.x + 24), s.y - 14, Math.max(14, s.x + 24), s.y + 14, Math.max(14, s.x + 48), s.y);
      g.fillStyle(0x2ecc71, 0.9).fillTriangle(Math.min(GAME_W - 14, e.x - 60), e.y - 14, Math.min(GAME_W - 14, e.x - 60), e.y + 14, Math.min(GAME_W - 14, e.x - 36), e.y);
    }
  }

  // ---------- HUD ----------
  private buildHud() {
    const bar = this.add.rectangle(GAME_W / 2, 18, GAME_W, 36, 0x000000, 0.55).setDepth(900);
    bar.setData('ui', true).setInteractive();
    this.hud = {
      lives: text(this, 70, 18, '', 20, '#ff8a8a').setDepth(901),
      gold: text(this, 190, 18, '', 20, '#ffd34d').setDepth(901),
      wave: text(this, GAME_W / 2, 18, '', 20, '#ffffff').setDepth(901),
      hint: text(this, GAME_W / 2, 70, '', 22, '#ffffff').setDepth(901).setVisible(false),
    };
    const d = (b: Btn) => { b.bg.setDepth(901); b.label.setDepth(902); return b; };
    const y = GAME_H - 40;
    this.buttons = {
      pause: d(button(this, GAME_W - 28, 18, 44, 28, 'II', () => this.togglePause(), 0x555566, 16)),
      speed: d(button(this, GAME_W - 82, 18, 54, 28, 'x1', () => this.toggleSpeed(), 0x555566, 16)),
      fire: d(button(this, 48, y, 80, 56, t('fire'), () => this.pickSpell('fire'), 0xc0541f, 15)),
      reinf: d(button(this, 134, y, 80, 56, t('reinf'), () => this.pickSpell('reinf'), 0x2f7bd0, 15)),
      ad: d(button(this, 490, y, 140, 56, '', () => this.watchAdGold(), 0x8a5bd0, 14)),
      next: d(button(this, GAME_W - 90, y, 150, 56, '', () => this.callNextWave(), 0x3b8f4a, 16)),
    };
    const mkHero = (k: HeroKind, x: number) => ({
      pick: d(button(this, x, y, 96, 56, '', () => this.pickHero(k), 0x8a5a2b, 14)),
      skill: d(button(this, x, y - 44, 96, 26, t('skill.' + k), () => this.useAbility(k), 0x2f8f8f, 14)),
    });
    this.heroBtns = { knight: mkHero('knight', 240), sorc: mkHero('sorc', 344) };
    (['knight', 'sorc'] as HeroKind[]).forEach((k) => {
      this.add.image(this.heroBtns[k].pick.bg.x - 30, y, HEROES[k].tex).setScale(0.8).setDepth(903);
    });
  }

  private updateHud() {
    const b = this.buttons!;
    this.hud.lives.setText(t('lives', { n: this.lives }));
    this.hud.gold.setText(t('gold', { n: Math.floor(this.gold) }));
    const total = this.level.waves.length;
    this.hud.wave.setText(t('wave', { n: Math.max(0, this.waveIdx + 1), m: total }));
    for (const k of ['fire', 'reinf'] as Spell[]) {
      const cd = this.spellCd[k];
      const name = t(k);
      b[k].setLabel(cd > 0 ? `${name}\n${Math.ceil(cd)}s` : this.spell === k ? `${name}\n${t('selected')}` : name);
      b[k].setEnabled(cd <= 0);
    }
    const adWait = Math.ceil((this.adGoldReady - performance.now()) / 1000);
    b.ad.setLabel(adWait > 0 ? t('adWait', { s: adWait }) : t('adGold', { n: AD_GOLD }));
    b.ad.setEnabled(adWait <= 0 && !this.adBusy);
    for (const k of ['knight', 'sorc'] as HeroKind[]) {
      const st = this.heroes[k], ui = this.heroBtns[k], name = t('hero.' + k);
      const on = this.unlocked.has(k);
      if (!on) ui.pick.setLabel(`${name}\n[${t('adTag')}]`);
      else if (!st.hero || st.hero.dead) ui.pick.setLabel(`${name}\n${Math.ceil(Math.max(0, st.respawn))}s`);
      else ui.pick.setLabel(this.selHero === k ? `${name}\n${t('selected')}` : name);
      ui.pick.label.setX(ui.pick.bg.x + 14).setWordWrapWidth(66).setAlign('center');
      ui.skill.setVisible(on);
      const alive = !!st.hero && !st.hero.dead;
      ui.skill.setLabel(st.cd > 0 ? `${t('skill.' + k)} ${Math.ceil(st.cd)}s` : t('skill.' + k));
      ui.skill.setEnabled(alive && st.cd <= 0);
    }
    const canCall = this.waveIdx + 1 < total && !this.over;
    b.next.setVisible(canCall);
    if (canCall) {
      const left = Math.max(0, Math.ceil(this.nextWaveAt - this.clock));
      b.next.setLabel(Number.isFinite(left) ? `${t('nextWave')}\n${left}s (+${this.earlyBonus()})` : t('nextWave'));
    }
  }

  private earlyBonus() {
    const left = this.nextWaveAt - this.clock;
    return Number.isFinite(left) ? Math.max(0, Math.floor(left * 2)) : 0;
  }

  private togglePause() {
    if (this.over) return;
    this.paused = !this.paused;
    this.buttons!.pause.setLabel(this.paused ? '▶' : 'II');
    if (this.paused) this.showBanner(t('paused'), t('pausedSub'), true);
    else this.hud.hint.setVisible(false);
  }

  private toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1;
    this.buttons!.speed.setLabel(`x${this.speed}`);
  }

  private showBanner(title: string, sub: string, sticky = false) {
    const t = this.hud.hint.setText(`${title}\n${sub}`).setVisible(true).setAlpha(1).setAlign('center');
    this.tweens.killTweensOf(t);
    if (!sticky) this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 600 });
  }

  private floatText(x: number, y: number, s: string, color: string) {
    const t = text(this, x, y, s, 16, color).setDepth(960);
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
    opts: { tip?: string; subColor?: string } = {}) {
    const bg = this.add.rectangle(x, y, 56, 56, enabled ? 0x2a3550 : 0x40363a, 0.95).setStrokeStyle(3, enabled ? 0xffe9a0 : 0x77666a)
      .setDepth(1000).setInteractive({ useHandCursor: true });
    bg.setData('ui', true);
    bg.on('pointerdown', () => cb());
    if (opts.tip !== undefined) {
      bg.on('pointerover', () => this.tip?.setText(opts.tip!));
      bg.on('pointerout', () => this.tip?.setText(''));
    }
    this.menu.push(bg);
    if (tex) this.menu.push(this.add.image(x, y - 5, tex).setScale(0.48).setDepth(1001));
    else this.menu.push(text(this, x, y - 6, label, 16).setDepth(1001));
    this.menu.push(text(this, x, y + 21, sub, 13, opts.subColor ?? (enabled ? '#ffd34d' : '#aa8888')).setDepth(1002));
  }

  private openBuildMenu(spot: Spot) {
    this.closeMenu();
    const c = this.clampCenter(spot.pos.x, spot.pos.y);
    this.menu.push(this.add.circle(c.x, c.y, 100, 0x000000, 0.25).setStrokeStyle(2, 0xffffff, 0.4).setDepth(999));
    this.tip = text(this, c.x, c.y, '', 12, '#ffffff').setDepth(1003).setWordWrapWidth(84).setAlign('center');
    this.menu.push(this.tip);
    const kinds: TowerKind[] = ['archer', 'barracks', 'mage', 'cannon', 'frost', 'thunder'];
    const offs = [[0, -70], [61, -35], [61, 35], [0, 70], [-61, 35], [-61, -35]];
    kinds.forEach((k, i) => {
      const def = TOWERS[k], cost = def.levels[0].cost;
      const locked = !!def.adLock && !this.unlocked.has(k);
      const tip = `${t('tower.' + k)}\n${t('desc.' + k)}`;
      this.menuButton(c.x + offs[i][0], c.y + offs[i][1], def.tex, '', locked ? `[${t('adTag')}]` : `${cost}`,
        locked || this.gold >= cost, () => {
          if (locked) void this.unlockWithAd(k, t('tower.' + k)).then((ok) => { if (ok && !this.over) this.buildTower(spot, k); });
          else if (this.gold >= cost) this.buildTower(spot, k);
        }, { tip, subColor: locked ? '#d9a8ff' : undefined });
    });
  }

  private openTowerMenu(spot: Spot) {
    this.closeMenu();
    const tw = spot.tower!;
    const c = this.clampCenter(spot.pos.x, spot.pos.y);
    this.menu.push(this.add.circle(spot.pos.x, spot.pos.y, tw.lv.range, 0xffffff, 0.12).setStrokeStyle(2, 0xffffff, 0.5).setDepth(998));
    this.menu.push(text(this, c.x, c.y - 100, `${t('tower.' + tw.kind)} Lv.${tw.level + 1}`, 16).setDepth(1002));
    if (!tw.maxed) {
      this.menuButton(c.x, c.y - 62, null, '▲', `${tw.upgradeCost}`, this.gold >= tw.upgradeCost, () => {
        if (this.gold < tw.upgradeCost) return;
        this.gold -= tw.upgradeCost; tw.upgrade(); this.floatText(spot.pos.x, spot.pos.y - 50, t('levelUp'), '#9fe870'); this.closeMenu();
      });
    } else {
      this.menuButton(c.x, c.y - 62, null, 'MAX', '', false, () => {});
    }
    this.menuButton(c.x, c.y + 62, null, '$', `+${tw.sellValue}`, true, () => {
      this.gold += tw.sellValue; tw.destroy();
      this.towers.splice(this.towers.indexOf(tw), 1);
      spot.tower = null; spot.img.setVisible(true).setInteractive();
      this.closeMenu();
    });
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
    if (this.over || this.adBusy) return;
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
    else this.hud.hint.setVisible(false);
  }

  private moveHero(k: HeroKind, x: number, y: number) {
    const h = this.heroes[k].hero;
    this.selHero = null;
    this.hud.hint.setVisible(false);
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
    const bonus = this.earlyBonus();
    if (bonus > 0 && this.waveIdx >= 0) { this.gold += bonus; this.floatText(GAME_W - 90, GAME_H - 80, t('early', { n: bonus }), '#9fe870'); }
    this.startNextWave();
  }

  // ---------- 스펠 ----------
  private pickSpell(s: Spell) {
    if (this.spellCd[s] > 0 || this.over) return;
    this.closeMenu();
    this.spell = this.spell === s ? null : s;
    if (this.spell) this.showBanner(t(s), t('castHint'), true);
    else this.hud.hint.setVisible(false);
  }

  private castSpell(s: Spell, x: number, y: number) {
    this.spell = null;
    this.hud.hint.setVisible(false);
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
      const ui = this.dialog;
      const close = (v: boolean) => { ui.forEach((o) => o.destroy()); ui.length = 0; resolve(v); };
      const shade = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.6).setDepth(3000).setInteractive();
      shade.setData('ui', true);
      ui.push(shade,
        this.add.rectangle(GAME_W / 2, GAME_H / 2, 440, 210, 0x20263a).setStrokeStyle(4, 0xd9a8ff).setDepth(3001),
        text(this, GAME_W / 2, GAME_H / 2 - 55, title, 22).setDepth(3002).setWordWrapWidth(400).setAlign('center'),
        text(this, GAME_W / 2, GAME_H / 2 - 5, sub, 16, '#cfd6e6').setDepth(3002).setWordWrapWidth(400).setAlign('center'));
      const mk = (x: number, label: string, color: number, v: boolean) => {
        const b = button(this, x, GAME_H / 2 + 60, 180, 48, label, () => close(v), color, 18);
        b.bg.setDepth(3002); b.label.setDepth(3003);
        ui.push(b.bg, b.label);
      };
      mk(GAME_W / 2 - 100, t('watch'), 0x8a5bd0, true);
      mk(GAME_W / 2 + 100, t('cancel'), 0x555566, false);
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
    if (this.adBusy || this.over) return;
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
    const ui = this.resultUi;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { ui.push(o); return o; };
    const shade = add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.6).setDepth(2000).setInteractive());
    shade.setData('ui', true);
    add(this.add.rectangle(GAME_W / 2, GAME_H / 2, 420, 300, 0x20263a).setStrokeStyle(4, 0xffe9a0).setDepth(2001));
    add(text(this, GAME_W / 2, GAME_H / 2 - 100, win ? t('victory') : t('defeat'), 44, win ? '#ffe9a0' : '#ff8a8a').setDepth(2002));
    if (win) add(text(this, GAME_W / 2, GAME_H / 2 - 45, '★'.repeat(stars) + '☆'.repeat(3 - stars), 40, '#ffd34d').setDepth(2002));
    const mk = (y: number, label: string, cb: () => void, color: number) => {
      const b = button(this, GAME_W / 2, y, 280, 48, label, cb, color, 20);
      b.bg.setDepth(2002); b.label.setDepth(2003);
      ui.push(b.bg, b.label);
    };
    let y = GAME_H / 2 + 10;
    if (win) {
      if (this.index + 1 < LEVELS.length) mk(y, t('nextStage'), () => this.scene.restart({ index: this.index + 1 }), 0x3b8f4a), y += 56;
    } else if (!this.revived) {
      mk(y, t('revive'), () => this.reviveWithAd(), 0x8a5bd0), y += 56;
    }
    mk(y, t('retry'), () => this.scene.restart({ index: this.index }), 0x3b6fb6); y += 56;
    mk(y, t('stageSelect'), () => this.scene.start('LevelSelect'), 0x555566);
  }

  // ---------- 메인 루프 ----------
  update(_time: number, delta: number) {
    this.updateHud();
    this.drawBars();
    if (this.paused || this.over || this.adBusy) return;
    const dt = Math.min(delta, 50) / 1000 * this.speed;
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
      g.fillStyle(0x000000, 0.7).fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
      g.fillStyle(color, 1).fillRect(x - w / 2, y, w * Math.max(0, frac), 3);
    };
    for (const e of this.enemies) {
      if (e.hp < e.maxHp) bar(e.x, e.y - (e.def.flying ? 44 : 26) - (e.def.tex === 'e_ogre' ? 16 : 0), e.def.tex === 'e_ogre' ? 44 : 26, e.hp / e.maxHp, 0xe74c3c);
    }
    if (this.selHero) {
      const h = this.heroes[this.selHero].hero;
      if (h && !h.dead) g.lineStyle(2, 0x9fe870, 1).strokeEllipse(h.x, h.y + 12, 34, 16);
    }
    for (const s of this.soldiers) if (s.hp < s.maxHp) bar(s.x, s.y - 18, 20, s.hp / s.maxHp, 0x4aa3ff);
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
