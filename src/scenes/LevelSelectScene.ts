import Phaser from 'phaser';
import { GAME_W } from '../config';
import { LEVELS } from '../data/levels';
import { getStars } from '../save';
import { button, text } from '../ui';
import { t } from '../i18n';

const TOTAL_SLOTS = 20;

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelect'); }

  create() {
    this.cameras.main.setBackgroundColor(0x1b2a3a);
    text(this, GAME_W / 2, 44, t('stageSelect'), 34, '#ffe9a0');
    button(this, 70, 44, 100, 40, t('back'), () => this.scene.start('Menu'), 0x555566, 16);

    const cols = 5, cw = 150, ch = 100, x0 = GAME_W / 2 - (cols - 1) * cw / 2, y0 = 130;
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const x = x0 + (i % cols) * cw, y = y0 + Math.floor(i / cols) * ch;
      const lv = LEVELS[i];
      const unlocked = !!lv && (i === 0 || getStars(LEVELS[i - 1].id) > 0);
      const stars = lv ? getStars(lv.id) : 0;
      const b = button(this, x, y, 128, 80, lv ? `${lv.id}. ${t('level.' + lv.id)}` : `${i + 1}`, () => this.scene.start('Game', { index: i }),
        unlocked ? 0x3b6fb6 : 0x333344, 15);
      b.setEnabled(unlocked);
      b.label.setWordWrapWidth(116).setAlign('center').setY(y - 10);
      if (lv) text(this, x, y + 26, '★'.repeat(stars) + '☆'.repeat(3 - stars), 18, '#ffd34d');
      else b.setLabel(`${i + 1}\n${t('soon')}`);
    }
  }
}
