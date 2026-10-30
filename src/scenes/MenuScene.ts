import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { button, text } from '../ui';
import { LANGS, langIndex, nextLang, t } from '../i18n';
import { getSkin, switchSkin, texFor } from '../skin';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.cameras.main.setBackgroundColor(0x1d3a24);
    for (let i = 0; i < 40; i++) {
      this.add.circle(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(0, GAME_H), Phaser.Math.Between(20, 70), 0x25482c, 0.5);
    }
    const big = (x: number, y: number, base: string, k: number) => { const tx = texFor(base, 2); this.add.image(x, y, tx.key).setScale(k * tx.scale); };
    big(GAME_W / 2 - 150, 335, 't_archer', 1.6);
    big(GAME_W / 2 + 150, 335, 't_mage', 1.6);
    big(GAME_W / 2, 345, 't_barracks', 2);
    text(this, GAME_W / 2, 110, t('title'), 60, '#ffe9a0');
    button(this, GAME_W / 2, 470, 220, 56, t('start'), () => this.scene.start('LevelSelect'), 0x3b8f4a, 26);
    const skin = getSkin();
    button(this, GAME_W - 80, 74, 130, 36, `${t('graphics')}: ${t('skin.' + skin)}`, () => switchSkin(skin === 'svg' ? 'image' : 'svg'), 0x555566, 14);
    button(this, GAME_W - 80, 30, 130, 36, `${LANGS[langIndex()].name} ▾`, () => { nextLang(); this.scene.restart(); }, 0x555566, 15);
  }
}
