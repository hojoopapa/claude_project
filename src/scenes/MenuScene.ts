import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { button, text, C } from '../ui';
import { LANGS, langIndex, nextLang, t } from '../i18n';
import { getSkin, switchSkin, texFor } from '../skin';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.cameras.main.setBackgroundColor(0x0c1322);
    // 은은한 배경: 큰 원 몇 개와 아래쪽 어둡게
    const bg = this.add.graphics();
    const glow = [[160, 120, 260, 0x1c4a3a], [800, 90, 240, 0x1d3a5e], [480, 420, 340, 0x173a2e], [880, 430, 200, 0x2a2f5e]];
    for (const [x, y, r, c] of glow) bg.fillStyle(c, 0.35).fillCircle(x, y, r);
    bg.fillStyle(0x070b14, 0.5).fillRect(0, GAME_H - 130, GAME_W, 130);

    const big = (x: number, y: number, base: string, k: number) => { const tx = texFor(base, 2); this.add.image(x, y, tx.key).setScale(k * tx.scale); };
    big(GAME_W / 2 - 190, 330, 't_archer', 1.5);
    big(GAME_W / 2 + 190, 330, 't_mage', 1.5);
    big(GAME_W / 2, 338, 't_barracks', 1.9);

    text(this, GAME_W / 2, 100, t('title'), 60, C.gold, { weight: '700' });
    this.add.rectangle(GAME_W / 2, 142, 90, 4, 0xffd36b, 0.9);

    button(this, GAME_W / 2, 468, 260, 64, t('start'), () => this.scene.start('LevelSelect'), C.green, 26, { icon: 'ic_play', iconScale: 0.8, layout: 'left', radius: 20 });

    // 오른쪽 위: 언어, 그래픽
    const skin = getSkin();
    button(this, GAME_W - 82, 30, 134, 34, `${LANGS[langIndex()].name}`, () => { nextLang(); this.scene.restart(); }, C.slate, 14, { radius: 17 });
    button(this, GAME_W - 82, 72, 134, 34, `${t('graphics')}: ${t('skin.' + skin)}`, () => switchSkin(skin === 'svg' ? 'image' : 'svg'), C.slate, 13, { radius: 17 });
  }
}
