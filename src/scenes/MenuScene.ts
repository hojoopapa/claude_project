import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { button, text } from '../ui';
import { LANGS, langIndex, nextLang, t } from '../i18n';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.cameras.main.setBackgroundColor(0x1d3a24);
    for (let i = 0; i < 40; i++) {
      this.add.circle(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(0, GAME_H), Phaser.Math.Between(20, 70), 0x25482c, 0.5);
    }
    this.add.image(GAME_W / 2 - 150, 360, 't_archer').setScale(1.6);
    this.add.image(GAME_W / 2 + 150, 360, 't_mage').setScale(1.6);
    this.add.image(GAME_W / 2, 390, 't_barracks').setScale(2);
    text(this, GAME_W / 2, 110, t('title'), 60, '#ffe9a0');
    button(this, GAME_W / 2, 470, 220, 56, t('start'), () => this.scene.start('LevelSelect'), 0x3b8f4a, 26);
    button(this, GAME_W - 80, 30, 130, 36, `${LANGS[langIndex()].name} ▾`, () => { nextLang(); this.scene.restart(); }, 0x555566, 15);
  }
}
