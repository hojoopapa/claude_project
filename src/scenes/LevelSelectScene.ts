import Phaser from 'phaser';
import { GAME_W } from '../config';
import { LEVELS, Theme } from '../data/levels';
import { getDifficulty, getStars, setDifficulty } from '../save';
import { button, text, icon, C } from '../ui';
import { t } from '../i18n';

const TOTAL_SLOTS = 20;
const THEME_COLOR: Record<Theme, number> = { meadow: 0x3fa35a, desert: 0xd0a050, swamp: 0x7a9a4a, snow: 0x7fb7e0, volcano: 0xd9602a };
const DIFF_COLOR = [0x2fb872, 0x3b78e0, 0xd9484f];

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelect'); }

  create() {
    this.cameras.main.setBackgroundColor(0x0c1322);
    const bg = this.add.graphics();
    bg.fillStyle(0x1d3a5e, 0.25).fillCircle(120, 60, 260);
    bg.fillStyle(0x1c4a3a, 0.25).fillCircle(860, 520, 300);

    // 머리줄: 뒤로, 제목, 난이도(세 칸 선택)
    button(this, 44, 44, 52, 40, '', () => this.scene.start('Menu'), C.slate, 16, { icon: 'ic_back', iconScale: 0.7, radius: 12 });
    text(this, GAME_W / 2 - 40, 44, t('stageSelect'), 30, C.gold, { weight: '700' });
    const diff = getDifficulty();
    text(this, GAME_W - 270, 44, t('difficulty'), 13, C.dim);
    [0, 1, 2].forEach((d) => {
      const b = button(this, GAME_W - 200 + d * 78, 44, 72, 34, t(`diff.${d}`), () => {
        if (d === diff) return;
        setDifficulty(d as 0 | 1 | 2);
        this.scene.restart();
      }, d === diff ? DIFF_COLOR[d] : C.slate, 14, { radius: 17 });
      b.setSelected(d === diff);
      if (d !== diff) b.bg.setAlpha(0.7);
    });

    const cols = 5, cw = 176, ch = 104, x0 = GAME_W / 2 - (cols - 1) * cw / 2, y0 = 146;
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const x = x0 + (i % cols) * cw, y = y0 + Math.floor(i / cols) * ch;
      const lv = LEVELS[i];
      const unlocked = !!lv && (i === 0 || getStars(LEVELS[i - 1].id) > 0);
      this.card(x, y, i, lv, unlocked);
    }
  }

  /** 스테이지 카드: 왼쪽 번호 배지(테마 색), 이름, 별 */
  private card(x: number, y: number, i: number, lv: (typeof LEVELS)[number] | undefined, unlocked: boolean) {
    const W = 160, H = 92;
    const c = this.add.container(x, y).setSize(W, H);
    const g = this.add.graphics();
    c.add(g);
    const accent = lv ? THEME_COLOR[lv.theme] : 0x3a4566;
    const draw = (hover: boolean) => {
      g.clear();
      g.fillStyle(0x000000, 0.35).fillRoundedRect(-W / 2, -H / 2 + 4, W, H, 14);
      g.fillStyle(unlocked ? (hover ? C.panelHi : C.panel) : 0x10172a, 1).fillRoundedRect(-W / 2, -H / 2, W, H, 14);
      g.lineStyle(1.5, unlocked ? accent : 0xffffff, unlocked ? (hover ? 1 : 0.7) : 0.1).strokeRoundedRect(-W / 2, -H / 2, W, H, 14);
      if (unlocked) g.fillStyle(accent, 0.95).fillRoundedRect(-W / 2, -H / 2, 42, H, { tl: 14, bl: 14, tr: 0, br: 0 });
    };
    draw(false);
    if (!lv) {
      c.add(text(this, 0, -8, `${i + 1}`, 22, '#4a5678'));
      c.add(text(this, 0, 20, t('soon'), 12, '#4a5678', { weight: '500' }));
      return;
    }
    const numColor = unlocked ? '#ffffff' : '#56627f';
    c.add(text(this, -W / 2 + 21, 0, `${lv.id}`, 24, numColor, { weight: '700' }));
    c.add(text(this, 22, -18, t('level.' + lv.id), 13, unlocked ? C.text : '#56627f', { weight: '500' }).setWordWrapWidth(104).setAlign('center'));
    if (unlocked) {
      const stars = getStars(lv.id);
      for (let s = 0; s < 3; s++) c.add(icon(this, s < stars ? 'ic_star' : 'ic_star_off', 22 + (s - 1) * 26, 24, 0.62));
      c.setInteractive({ useHandCursor: true });
      c.on('pointerover', () => { draw(true); c.setScale(1.04); });
      c.on('pointerout', () => { draw(false); c.setScale(1); });
      c.on('pointerdown', () => this.scene.start('Game', { index: i }));
    } else {
      c.add(icon(this, 'ic_lock', 22, 24, 0.7));
    }
  }
}
