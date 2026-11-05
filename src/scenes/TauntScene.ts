import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { LEVELS } from '../data/levels';
import { devStageScore, fmt } from '../score';
import { texFor } from '../skin';
import { ads } from '../ads';
import { C, button, panel, text } from '../ui';
import { t } from '../i18n';
import { play } from '../sound';

/**
 * 광고를 보고 인트로를 없앴는지. 저장하지 않으므로 앱을 새로 실행하면 다시 나온다.
 * (이 값이 true 인 동안에는 스테이지를 시작해도 팝업이 뜨지 않는다)
 */
let introRemoved = false;
export const shouldTaunt = () => !introRemoved;

/** 팝업이 떠 있는 시간(초, 카운트다운으로 보여준다). 이 시간이 지나면 팝업이 닫히고 스테이지가 시작된다 */
const SHOW_SECONDS = 5;

// 팝업 상자: 화면 가운데
const PX = 150, PY = 70, PW = 660, PH = 400;

/**
 * 스테이지(1~20번)를 시작할 때마다 전투 화면 위에 뜨는 약올림 팝업(약 3초).
 * 붉은 용이 날아와 비웃으며 그 스테이지의 개발자 기록으로 약을 올린다. 화면을 눌러도 건너뛰지 않고,
 * "광고 보고 인트로 없애기"로 광고를 끝까지 보면 이번 실행 동안 인트로가 나오지 않는다 (앱을 새로 실행하면 다시 나온다).
 * 팝업이 떠 있는 동안 전투는 멈춰 있다 (GameScene.update 가 이 장면이 켜져 있는지 본다).
 */
export class TauntScene extends Phaser.Scene {
  private level = 1;
  private art = false;                 // 새 용 그림(dragon_idle/dragon_prep)을 쓰는지
  private leaving = false;
  private adBusy = false;
  private dragon!: Phaser.GameObjects.Image;
  private base = 1;
  private clock = 0;
  private elapsed = 0;
  private laughing = false;
  private bar!: Phaser.GameObjects.Graphics;
  private countText!: Phaser.GameObjects.Text;
  private lastCount = -1;

  constructor() { super('Taunt'); }

  init(data: { level?: number }) { this.level = data.level ?? 1; }

  create() {
    this.leaving = false; this.adBusy = false; this.clock = 0; this.elapsed = 0; this.laughing = false; this.lastCount = -1;
    this.cameras.main.setAlpha(0);
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 180 });

    // 뒤 화면을 어둡게. 눌러도 아래 전투 화면의 버튼이 반응하지 않도록 입력을 받아 둔다
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x050810, 0.72).setInteractive();

    // 상자와 안쪽 장식(붉은 빛, 불씨, 용)은 상자 모양으로 잘라서 보여준다
    const g = this.add.graphics();
    panel(g, PX, PY, PW, PH, { fill: 0x1a0a0e, border: 0xff6a4a, borderAlpha: 0.9, r: 24, shadow: true, alpha: 0.98 });
    const clip = this.make.graphics({}, false).fillStyle(0xffffff).fillRoundedRect(PX, PY, PW, PH, 24);
    const mask = clip.createGeometryMask();

    const glow = this.add.circle(PX + 170, PY + 230, 170, 0x7a1a14, 0.34).setMask(mask);
    this.tweens.add({ targets: glow, alpha: 0.5, scale: 1.12, duration: 700, yoyo: true, repeat: -1 });
    for (let i = 0; i < 22; i++) {
      const e = this.add.circle(Phaser.Math.Between(PX, PX + PW), PY + PH + 10, Phaser.Math.Between(1, 3), 0xff8a3a, Phaser.Math.FloatBetween(0.4, 0.9)).setMask(mask);
      this.tweens.add({ targets: e, y: PY - 10, x: e.x + Phaser.Math.Between(-40, 40), duration: Phaser.Math.Between(1800, 3200), delay: Phaser.Math.Between(0, 1500), repeat: -1 });
    }

    // 붉은 용: 상자 왼쪽 밖에서 날아 들어온다. 용 그림 두 컷(대기, 볼 부풀림)을 쓰고, 없으면 기존 비룡 그림
    this.art = this.textures.exists('dragon_idle') && this.textures.exists('dragon_prep');
    this.dragon = this.add.image(PX - 120, PY + 230, this.art ? 'dragon_idle' : texFor('e_drake').key).setMask(mask).setDepth(10);
    this.base = (this.art ? 250 : 360) / this.dragon.width;
    this.dragon.setScale(this.base);
    this.tweens.add({ targets: this.dragon, x: PX + 170, duration: 700, ease: 'Cubic.Out', onComplete: () => this.sneer() });

    // 아래: 광고로 인트로 없애기, 남은 시간 막대
    const adBtn = button(this, PX + 440, PY + 322, 300, 46, t('tauntAdSkip'), () => void this.removeIntro(), C.orange, 16, { icon: 'ic_play', iconScale: 0.7, layout: 'left', radius: 16 });
    adBtn.bg.setDepth(40);
    text(this, PX + 440, PY + 362, t('tauntAdNote'), 12, C.dim, { weight: '500' }).setDepth(40);
    this.bar = this.add.graphics().setDepth(40);
    this.countText = text(this, PX + 440, PY + 262, '', 24, C.gold, { stroke: 5 }).setDepth(40);   // 카운트다운
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    this.clock += dt;
    // 날갯짓, 웃을 때는 몸을 들썩이며 흔든다
    this.dragon.setScale(this.base, this.base * (1 + Math.sin(this.clock * 11) * 0.05));
    const cy = PY + 230;
    if (this.laughing) {
      if (this.art) this.dragon.setTexture(Math.floor(this.clock * 6) % 2 ? 'dragon_prep' : 'dragon_idle');   // 크하하: 볼을 부풀렸다 풀었다
      this.dragon.setAngle(Math.sin(this.clock * 26) * 6);
      this.dragon.y = cy + Math.sin(this.clock * 26) * 7;
    } else this.dragon.y = cy + Math.sin(this.clock * 4) * 5;

    // 광고를 보는 동안에는 시간을 세지 않는다
    if (!this.adBusy && !this.leaving) {
      this.elapsed += dt;
      if (this.elapsed >= SHOW_SECONDS) this.leave();
    }
    // 카운트다운: 남은 초를 올림해서 5, 4, 3, 2, 1 로 보여주고 숫자가 바뀔 때마다 톡 튄다
    const n = Math.max(1, Math.ceil(SHOW_SECONDS - this.elapsed));
    if (n !== this.lastCount) {
      this.lastCount = n;
      this.countText.setText(t('tauntCount', { n }));
      this.tweens.add({ targets: this.countText, scale: { from: 1.35, to: 1 }, duration: 220, ease: 'Back.Out' });
    }
    const frac = Math.min(1, this.elapsed / SHOW_SECONDS);
    this.bar.clear().fillStyle(0xffffff, 0.12).fillRoundedRect(PX + 30, PY + PH - 18, PW - 60, 5, 2.5)
      .fillStyle(0xff6a4a, 0.9).fillRoundedRect(PX + 30, PY + PH - 18, (PW - 60) * frac, 5, 2.5);
  }

  /** 도착: 포효하며 말풍선과 비웃음을 띄운다 */
  private sneer() {
    this.laughing = true;
    play('taunt');
    this.cameras.main.shake(700, 0.003);

    const bubble = this.add.container(PX + 480, PY + 125).setDepth(20).setScale(0.2).setAlpha(0);
    const g = this.add.graphics();
    panel(g, -165, -88, 330, 176, { fill: 0x2a1218, border: 0xff6a4a, borderAlpha: 0.95, r: 20, shadow: true, alpha: 1 });
    // 용 입을 가리키는 꼬리: 말풍선 아래쪽에 붙이고, 붙는 부분의 테두리는 지운다
    g.fillStyle(0x2a1218, 1).fillTriangle(-140, 86, -90, 86, -215, 122);
    g.lineStyle(1.5, 0xff6a4a, 0.95).lineBetween(-140, 86, -215, 122).lineBetween(-215, 122, -90, 86);
    g.lineStyle(3, 0x2a1218, 1).lineBetween(-138, 87, -92, 87);
    bubble.add(g);
    bubble.add(text(this, 0, -52, t('tauntLine'), 20, C.gold).setWordWrapWidth(300).setAlign('center'));
    bubble.add(text(this, 0, 0, t('tauntAsk'), 17, C.text, { weight: '700' }).setWordWrapWidth(300).setAlign('center').setLineSpacing(5));
    const lv = LEVELS[Math.min(Math.max(this.level, 1), LEVELS.length) - 1];
    bubble.add(text(this, 0, 58, t('tauntStage', { lv: lv.id, n: fmt(devStageScore(lv)) }), 13, C.red).setWordWrapWidth(300).setAlign('center'));
    this.tweens.add({ targets: bubble, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });

    // 크하하하! 웃음 글자가 용 머리 위에서 팡팡 커진다
    const laugh = text(this, PX + 150, PY + 62, t('tauntLaugh'), 32, C.red, { stroke: 6 }).setAngle(-10).setDepth(30);
    this.tweens.add({ targets: laugh, scale: 1.25, duration: 160, yoyo: true, repeat: -1 });
  }

  /** 광고를 끝까지 보면 이번 실행 동안 인트로를 없애고 바로 넘어간다. 도중에 닫으면 팝업이 계속된다 */
  private async removeIntro() {
    if (this.adBusy || this.leaving) return;
    this.adBusy = true;
    const ok = await ads.show(this, 'intro');
    this.adBusy = false;
    if (ok) { introRemoved = true; this.leave(); }
  }

  private leave() {
    if (this.leaving) return;
    this.leaving = true;
    // 팝업만 서서히 사라지고, 아래 전투 화면이 이어서 시작된다
    this.tweens.add({ targets: this.cameras.main, alpha: 0, duration: 220, onComplete: () => this.scene.stop() });
  }
}
