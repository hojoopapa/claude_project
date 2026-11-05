import Phaser from 'phaser';
import { GAME_W, GAME_H, FONT } from '../config';
import { button, soundButton, C } from '../ui';
import { LANGS, langIndex, nextLang, t } from '../i18n';
import { shouldTaunt } from './TauntScene';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.cameras.main.setBackgroundColor(0x0c1322);

    // 배경: 시작 화면 그림. 그림 속 제목, 버튼, 소리/언어 버튼은 지워 두었고(여러 언어와 터치를 위해 게임이 직접 그린다),
    // 화면 비율과 약간 달라서 꽉 차도록 키운다 (좌우 몇 픽셀이 잘린다).
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, 'start_bg');
    bg.setScale(Math.max(GAME_W / bg.width, GAME_H / bg.height));

    // 제목: 금색 글자에 갈색 테두리와 은은한 빛. 긴 제목(스페인어 등)은 폭에 맞춰 줄인다.
    const title = this.add.text(GAME_W / 2, 92, t('title'), {
      fontFamily: FONT, fontSize: '84px', fontStyle: '700', color: '#ffcf4a', stroke: '#5a2d0c', strokeThickness: 12,
    }).setOrigin(0.5).setShadow(0, 4, 'rgba(255,205,90,0.6)', 16, true, true);
    if (title.width > 660) title.setScale(660 / title.width);

    button(this, GAME_W / 2, 440, 260, 64, t('start'), () => this.scene.start(shouldTaunt() ? 'Taunt' : 'LevelSelect'), C.green, 26, { icon: 'ic_play', iconScale: 0.8, layout: 'left', radius: 20 });
    button(this, GAME_W / 2, 502, 200, 40, t('ranking'), () => this.scene.start('Ranking'), C.slate, 16, { icon: 'ic_trophy', iconScale: 0.65, radius: 20 });

    // 오른쪽 위: 소리와 언어
    soundButton(this, GAME_W - 192, 32, 52, 42);
    button(this, GAME_W - 82, 32, 134, 42, `${LANGS[langIndex()].name}`, () => { nextLang(); this.scene.restart(); }, C.slate, 14, { radius: 17 });
  }
}
