import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { LEVELS } from '../data/levels';
import { devTotalScore, fmt } from '../score';
import { texFor } from '../skin';
import { C, panel, text } from '../ui';
import { t } from '../i18n';
import { play } from '../sound';

/** 이 접속에서 이미 보여줬는지. 한 번만 보여주고 (다시 하려면 새로고침) 이후에는 바로 넘어간다 */
let shown = false;
export const shouldTaunt = () => !shown;

/** 게임 시작 때 약 3초: 20번 스테이지의 붉은 용이 날아와 비웃으며 개발자 기록으로 약을 올린다. 화면을 누르면 건너뛴다. */
export class TauntScene extends Phaser.Scene {
  private leaving = false;
  private dragon!: Phaser.GameObjects.Image;
  private base = 1;
  private clock = 0;
  private laughing = false;

  constructor() { super('Taunt'); }

  create() {
    shown = true;
    this.leaving = false; this.clock = 0; this.laughing = false;
    this.cameras.main.setBackgroundColor(0x12060a);

    // 배경: 붉게 일렁이는 빛과 떠오르는 불씨
    const glow = this.add.circle(300, 300, 280, 0x7a1a14, 0.34);
    this.tweens.add({ targets: glow, alpha: 0.5, scale: 1.12, duration: 700, yoyo: true, repeat: -1 });
    for (let i = 0; i < 34; i++) {
      const e = this.add.circle(Phaser.Math.Between(0, GAME_W), GAME_H + 20, Phaser.Math.Between(1, 3), 0xff8a3a, Phaser.Math.FloatBetween(0.4, 0.9));
      this.tweens.add({ targets: e, y: -20, x: e.x + Phaser.Math.Between(-60, 60), duration: Phaser.Math.Between(1800, 3400), delay: Phaser.Math.Between(0, 1500), repeat: -1 });
    }

    // 붉은 용: 왼쪽에서 날아 들어온다
    const tx = texFor('e_drake');
    this.dragon = this.add.image(-220, 320, tx.key).setDepth(10);
    this.base = 360 / this.dragon.width;
    this.dragon.setScale(this.base);
    this.tweens.add({ targets: this.dragon, x: 290, duration: 800, ease: 'Cubic.Out', onComplete: () => this.sneer() });

    this.add.text(GAME_W / 2, GAME_H - 22, t('tauntSkip'), { fontSize: '13px', color: C.dim }).setOrigin(0.5).setAlpha(0.7);
    this.input.once('pointerdown', () => this.leave());
    this.time.delayedCall(3100, () => this.leave());   // 약 3초 뒤 자동으로 시작
  }

  update(_time: number, delta: number) {
    this.clock += delta / 1000;
    // 날갯짓, 웃을 때는 몸을 들썩이며 흔든다
    const flap = 1 + Math.sin(this.clock * 11) * 0.06;
    this.dragon.setScale(this.base, this.base * flap);
    if (this.laughing) {
      this.dragon.setAngle(Math.sin(this.clock * 26) * 7);
      this.dragon.y = 320 + Math.sin(this.clock * 26) * 9;
    } else this.dragon.y = 320 + Math.sin(this.clock * 4) * 6;
  }

  /** 도착: 포효하며 말풍선과 비웃음을 띄운다 */
  private sneer() {
    this.laughing = true;
    play('taunt');
    this.cameras.main.shake(900, 0.004);

    const bubble = this.add.container(690, 170).setDepth(20).setScale(0.2).setAlpha(0);
    const g = this.add.graphics();
    panel(g, -200, -100, 400, 200, { fill: 0x1c0c10, border: 0xff6a4a, borderAlpha: 0.95, r: 22, shadow: true, alpha: 0.97 });
    // 용 머리를 가리키는 꼬리: 말풍선 아래쪽에 붙이고, 붙는 부분의 테두리는 지운다
    g.fillStyle(0x1c0c10, 1).fillTriangle(-150, 98, -88, 98, -250, 138);
    g.lineStyle(1.5, 0xff6a4a, 0.95).lineBetween(-150, 98, -250, 138).lineBetween(-250, 138, -88, 98);
    g.lineStyle(3, 0x1c0c10, 1).lineBetween(-148, 99, -90, 99);
    bubble.add(g);
    bubble.add(text(this, 0, -52, t('tauntLine'), 24, C.gold).setWordWrapWidth(360).setAlign('center'));
    bubble.add(text(this, 0, 6, t('tauntAsk'), 21, C.text, { weight: '700' }).setWordWrapWidth(360).setAlign('center').setLineSpacing(6));
    bubble.add(text(this, 0, 72, t('tauntScore', { n: fmt(devTotalScore(LEVELS)) }), 15, C.red).setWordWrapWidth(360).setAlign('center'));
    this.tweens.add({ targets: bubble, scale: 1, alpha: 1, duration: 280, ease: 'Back.Out' });

    // 크하하하! 웃음 글자가 용 머리 위에서 팡팡 커진다 (말풍선 글자를 가리지 않는 왼쪽 위)
    const laugh = text(this, 215, 120, t('tauntLaugh'), 38, C.red, { stroke: 6 }).setAngle(-10).setDepth(30);
    this.tweens.add({ targets: laugh, scale: 1.3, duration: 160, yoyo: true, repeat: -1 });
  }

  private leave() {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(280, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('LevelSelect'));
  }
}
