import Phaser from 'phaser';
import { markSkinTexture, PNG_FRAMES, queueSkin, SkinIndex } from '../skin';

type G = Phaser.GameObjects.Graphics;

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void) {
  if (scene.textures.exists(key)) return; // 스킨 이미지가 이미 있으면 도형 텍스처를 만들지 않는다
  const g = scene.make.graphics(new Phaser.Math.Vector2(0, 0), false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function circ(g: G, x: number, y: number, r: number, fill: number, stroke = 0x1b1b1b) {
  g.fillStyle(fill, 1).fillCircle(x, y, r);
  g.lineStyle(2, stroke, 1).strokeCircle(x, y, r);
}

/**
 * 먼저 SVG 그림을 불러오고, 그림이 없는 키만 도형으로 만든 텍스처로 채운다.
 * (그림 파일이 하나도 없어도 게임이 돌아가도록 하는 폴백이다)
 */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const base = import.meta.env.BASE_URL;
    this.load.json('skin-svg', `${base}skins/svg/index.json`);
    for (const k of PNG_FRAMES) this.load.image(k, `${base}skins/png/${k}.png`);
  }

  create() {
    const index = this.cache.json.exists('skin-svg') ? (this.cache.json.get('skin-svg') as SkinIndex) : undefined;
    const finish = () => {
      for (const k of Object.keys(index ?? {})) if (this.textures.exists(k)) markSkinTexture(k);
      for (const k of PNG_FRAMES) if (this.textures.exists(k)) markSkinTexture(k);
      this.makeProceduralTextures();
      this.scene.start('Menu');
    };
    if (queueSkin(this.load, index) === 0) { finish(); return; }
    this.load.once('complete', finish);
    this.load.start();
  }

  /** UI 아이콘 (48x48, 화면에는 0.5배로 그린다). 스킨과 상관없이 코드로 그린다. */
  private makeIcons() {
    const pts = (cx: number, cy: number, R: number, r: number, n = 5) => {
      const p: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < n * 2; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / n, rad = i % 2 ? r : R;
        p.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad));
      }
      return p;
    };
    tex(this, 'ic_heart', 48, 48, (g) => {
      g.fillStyle(0xff5a6c).fillCircle(16, 18, 11).fillCircle(32, 18, 11).fillTriangle(6, 23, 42, 23, 24, 43);
      g.fillStyle(0xffffff, 0.35).fillCircle(13, 14, 4);
    });
    tex(this, 'ic_coin', 48, 48, (g) => {
      g.fillStyle(0xf6b82e).fillCircle(24, 24, 19);
      g.lineStyle(3, 0xd48a10, 1).strokeCircle(24, 24, 13);
      g.fillStyle(0xffe27a).fillCircle(24, 24, 9);
      g.fillStyle(0xffffff, 0.5).fillCircle(17, 16, 4);
    });
    tex(this, 'ic_star', 48, 48, (g) => { g.fillStyle(0xffcf3a).fillPoints(pts(24, 25, 21, 9), true); g.fillStyle(0xffffff, 0.35).fillCircle(18, 17, 3); });
    tex(this, 'ic_star_off', 48, 48, (g) => { g.fillStyle(0x38425f).fillPoints(pts(24, 25, 21, 9), true); });
    tex(this, 'ic_lock', 48, 48, (g) => {
      g.lineStyle(5, 0x9aa7c4, 1).beginPath().arc(24, 22, 9, Math.PI, 0, false).strokePath();
      g.fillStyle(0x9aa7c4).fillRoundedRect(10, 22, 28, 22, 5);
      g.fillStyle(0x38425f).fillCircle(24, 32, 3.5);
    });
    tex(this, 'ic_play', 48, 48, (g) => { g.fillStyle(0xffffff).fillTriangle(14, 8, 14, 40, 40, 24); });
    tex(this, 'ic_pause', 48, 48, (g) => { g.fillStyle(0xffffff).fillRoundedRect(11, 8, 10, 32, 3).fillRoundedRect(27, 8, 10, 32, 3); });
    tex(this, 'ic_ff', 48, 48, (g) => { g.fillStyle(0xffffff).fillTriangle(6, 10, 6, 38, 24, 24).fillTriangle(24, 10, 24, 38, 42, 24); });
    tex(this, 'ic_back', 48, 48, (g) => { g.lineStyle(6, 0xffffff, 1).beginPath().moveTo(30, 9).lineTo(14, 24).lineTo(30, 39).strokePath(); });
    tex(this, 'ic_up', 48, 48, (g) => { g.fillStyle(0x7dffb0).fillTriangle(24, 5, 5, 26, 43, 26).fillRect(17, 26, 14, 16); });
    tex(this, 'ic_fire', 48, 48, (g) => {
      g.fillStyle(0xff7a1a).fillCircle(24, 31, 14).fillTriangle(10, 28, 38, 28, 24, 2);
      g.fillStyle(0xffd24a).fillCircle(24, 34, 8).fillTriangle(16, 32, 32, 32, 24, 14);
    });
    tex(this, 'ic_reinf', 48, 48, (g) => {
      g.fillStyle(0x4aa3ff).fillPoints([new Phaser.Math.Vector2(8, 7), new Phaser.Math.Vector2(40, 7), new Phaser.Math.Vector2(40, 26), new Phaser.Math.Vector2(24, 44), new Phaser.Math.Vector2(8, 26)], true);
      g.fillStyle(0xa9d6ff).fillPoints([new Phaser.Math.Vector2(14, 13), new Phaser.Math.Vector2(34, 13), new Phaser.Math.Vector2(34, 24), new Phaser.Math.Vector2(24, 36), new Phaser.Math.Vector2(14, 24)], true);
      g.fillStyle(0x2a68c0).fillRect(22, 15, 4, 18).fillRect(16, 21, 16, 4);
    });
    tex(this, 'ic_trophy', 48, 48, (g) => {
      g.lineStyle(4, 0xf6b82e, 1).beginPath().arc(11, 16, 6, Math.PI * 0.5, Math.PI * 1.5).strokePath();
      g.lineStyle(4, 0xf6b82e, 1).beginPath().arc(37, 16, 6, -Math.PI * 0.5, Math.PI * 0.5).strokePath();
      g.fillStyle(0xffcf3a).fillPoints([new Phaser.Math.Vector2(11, 6), new Phaser.Math.Vector2(37, 6), new Phaser.Math.Vector2(35, 23), new Phaser.Math.Vector2(29, 31), new Phaser.Math.Vector2(19, 31), new Phaser.Math.Vector2(13, 23)], true);
      g.fillStyle(0xd98e12).fillRect(21, 31, 6, 7).fillRoundedRect(13, 38, 22, 6, 2);
      g.fillStyle(0xffffff, 0.45).fillRect(15, 9, 4, 12);
    });
    tex(this, 'ic_edit', 48, 48, (g) => {
      g.fillStyle(0xffffff).fillPoints([new Phaser.Math.Vector2(30, 8), new Phaser.Math.Vector2(40, 18), new Phaser.Math.Vector2(18, 40), new Phaser.Math.Vector2(8, 40), new Phaser.Math.Vector2(8, 30)], true);
      g.fillStyle(0xffb347).fillPoints([new Phaser.Math.Vector2(8, 30), new Phaser.Math.Vector2(18, 40), new Phaser.Math.Vector2(8, 40)], true);
    });
    // 스피커 몸통 (소리/음소거 공통)
    const speaker = (g: Phaser.GameObjects.Graphics) => {
      g.fillStyle(0xffffff).fillRect(7, 18, 8, 12).fillTriangle(15, 18, 27, 8, 27, 40).fillTriangle(15, 30, 27, 40, 27, 24).fillRect(15, 18, 12, 12);
    };
    tex(this, 'ic_sound', 48, 48, (g) => {
      speaker(g);
      g.lineStyle(3.5, 0xffffff, 1);
      g.beginPath().arc(27, 24, 8, -Math.PI * 0.32, Math.PI * 0.32).strokePath();
      g.beginPath().arc(27, 24, 15, -Math.PI * 0.32, Math.PI * 0.32).strokePath();
    });
    tex(this, 'ic_mute', 48, 48, (g) => {
      speaker(g);
      g.lineStyle(4, 0xff6b6b, 1).lineBetween(32, 17, 44, 31).lineBetween(44, 17, 32, 31);
    });
    tex(this, 'ic_home', 48, 48, (g) => {
      g.fillStyle(0xffffff).fillTriangle(24, 6, 4, 25, 44, 25).fillRect(10, 24, 28, 18);
      g.fillStyle(0x2a3350).fillRect(20, 30, 8, 12);
    });
    tex(this, 'ic_flag', 48, 48, (g) => {
      g.fillStyle(0xe8e0d0).fillRect(11, 5, 4, 38);
      g.fillStyle(0xff5a4a).fillTriangle(15, 7, 41, 16, 15, 26);
      g.fillStyle(0xffffff, 0.35).fillTriangle(15, 7, 28, 11.5, 15, 16);
    });
    tex(this, 'ic_sell', 48, 48, (g) => {
      g.fillStyle(0xf6b82e).fillCircle(24, 24, 19);
      g.lineStyle(3, 0xd48a10, 1).strokeCircle(24, 24, 13);
      g.fillStyle(0x8a5a00).fillRect(22, 12, 4, 24).fillRect(17, 16, 14, 4).fillRect(17, 28, 14, 4);
    });
  }

  /** 벽 4종(나무, 흙, 벽돌, 금속). 48x32 크기의 가로로 긴 방벽 */
  private makeWalls() {
    const line = 0x1b1b1b;
    tex(this, 'w_wood', 48, 32, (g) => {
      g.fillStyle(0x000000, 0.25).fillEllipse(24, 28, 44, 8);
      g.fillStyle(0x9a6b3a).fillRect(3, 8, 42, 18);
      g.fillStyle(0xb98550).fillRect(3, 8, 42, 5);
      g.lineStyle(2, 0x5c3b1c).lineBetween(3, 14, 45, 14).lineBetween(3, 20, 45, 20).lineBetween(16, 8, 16, 26).lineBetween(32, 8, 32, 26);
      g.lineStyle(2, line).strokeRect(3, 8, 42, 18);
      g.fillStyle(0x7a5228).fillRect(7, 3, 6, 25).fillRect(35, 3, 6, 25);
      g.lineStyle(2, line).strokeRect(7, 3, 6, 25).strokeRect(35, 3, 6, 25);
    });
    tex(this, 'w_dirt', 48, 32, (g) => {
      g.fillStyle(0x000000, 0.25).fillEllipse(24, 28, 44, 8);
      g.fillStyle(0x7d5a3a).fillPoints([new Phaser.Math.Vector2(2, 27), new Phaser.Math.Vector2(8, 12), new Phaser.Math.Vector2(18, 6), new Phaser.Math.Vector2(30, 6), new Phaser.Math.Vector2(41, 12), new Phaser.Math.Vector2(46, 27)], true);
      g.fillStyle(0x9a7550).fillPoints([new Phaser.Math.Vector2(10, 14), new Phaser.Math.Vector2(18, 8), new Phaser.Math.Vector2(30, 8), new Phaser.Math.Vector2(38, 14), new Phaser.Math.Vector2(24, 17)], true);
      g.fillStyle(0x5e4129).fillCircle(14, 22, 3).fillCircle(30, 21, 4).fillCircle(38, 24, 2.5).fillCircle(22, 24, 2.5);
      g.lineStyle(2, line).strokePoints([new Phaser.Math.Vector2(2, 27), new Phaser.Math.Vector2(8, 12), new Phaser.Math.Vector2(18, 6), new Phaser.Math.Vector2(30, 6), new Phaser.Math.Vector2(41, 12), new Phaser.Math.Vector2(46, 27)], false);
    });
    tex(this, 'w_brick', 48, 32, (g) => {
      g.fillStyle(0x000000, 0.25).fillEllipse(24, 28, 46, 8);
      g.fillStyle(0xb5533c).fillRect(2, 6, 44, 21);
      g.fillStyle(0xd0705a).fillRect(2, 6, 44, 4);
      g.lineStyle(2, 0x6b2f22).lineBetween(2, 13, 46, 13).lineBetween(2, 20, 46, 20)
        .lineBetween(14, 6, 14, 13).lineBetween(30, 6, 30, 13).lineBetween(8, 13, 8, 20).lineBetween(24, 13, 24, 20).lineBetween(40, 13, 40, 20)
        .lineBetween(14, 20, 14, 27).lineBetween(30, 20, 30, 27);
      g.lineStyle(2, line).strokeRect(2, 6, 44, 21);
    });
    tex(this, 'w_metal', 48, 32, (g) => {
      g.fillStyle(0x000000, 0.25).fillEllipse(24, 28, 46, 8);
      g.fillStyle(0x7f8da0).fillRect(2, 5, 44, 22);
      g.fillStyle(0xaab7c8).fillRect(2, 5, 44, 6);
      g.lineStyle(2, 0x4a5568).lineBetween(2, 16, 46, 16).lineBetween(24, 5, 24, 27);
      g.fillStyle(0xdfe8f2).fillCircle(7, 10, 1.8).fillCircle(41, 10, 1.8).fillCircle(7, 22, 1.8).fillCircle(41, 22, 1.8).fillCircle(20, 10, 1.8).fillCircle(28, 22, 1.8);
      g.lineStyle(2.5, line).strokeRect(2, 5, 44, 22);
    });
  }

  private makeProceduralTextures() {
    this.makeIcons();
    this.makeWalls();
    // --- 적 ---
    tex(this, 'e_goblin', 30, 30, (g) => {
      g.fillStyle(0x5da832).fillTriangle(2, 8, 10, 6, 8, 16).fillTriangle(28, 8, 20, 6, 22, 16);
      circ(g, 15, 16, 10, 0x6bbf3a);
      g.fillStyle(0xffffff).fillCircle(11, 14, 3).fillCircle(19, 14, 3);
      g.fillStyle(0x111111).fillCircle(12, 14, 1.5).fillCircle(20, 14, 1.5);
    });
    tex(this, 'e_wolf', 34, 26, (g) => {
      g.fillStyle(0x777777).fillTriangle(22, 2, 26, 10, 18, 9);
      g.fillStyle(0x8a8f98).fillEllipse(15, 15, 28, 16);
      g.lineStyle(2, 0x1b1b1b).strokeEllipse(15, 15, 28, 16);
      circ(g, 27, 13, 6, 0x9aa0aa);
      g.fillStyle(0xff3030).fillCircle(29, 12, 1.5);
    });
    tex(this, 'e_orc', 40, 40, (g) => {
      circ(g, 20, 21, 15, 0x3f7a2a);
      g.fillStyle(0x8c8c96).fillRect(7, 22, 26, 9);
      g.lineStyle(2, 0x1b1b1b).strokeRect(7, 22, 26, 9);
      g.fillStyle(0xffffff).fillCircle(14, 15, 3).fillCircle(26, 15, 3);
      g.fillStyle(0x111111).fillCircle(14, 15, 1.5).fillCircle(26, 15, 1.5);
      g.fillStyle(0xeeeeaa).fillTriangle(12, 24, 15, 24, 13.5, 20).fillTriangle(25, 24, 28, 24, 26.5, 20);
    });
    tex(this, 'e_wisp', 32, 32, (g) => {
      g.fillStyle(0x66ccff, 0.25).fillCircle(16, 16, 15);
      g.fillStyle(0x66ccff, 0.6).fillCircle(16, 16, 10);
      g.fillStyle(0xe8fbff, 1).fillCircle(16, 16, 5);
    });
    tex(this, 'e_ogre', 64, 64, (g) => {
      circ(g, 32, 34, 27, 0x7a4d2b);
      g.fillStyle(0x4a3a2a).fillRect(10, 40, 44, 12);
      g.lineStyle(2, 0x1b1b1b).strokeRect(10, 40, 44, 12);
      g.fillStyle(0xffe066).fillCircle(22, 26, 5).fillCircle(42, 26, 5);
      g.fillStyle(0xaa0000).fillCircle(22, 26, 2.5).fillCircle(42, 26, 2.5);
      g.fillStyle(0xf2e8c8).fillTriangle(18, 42, 24, 42, 21, 33).fillTriangle(40, 42, 46, 42, 43, 33);
      g.fillStyle(0xd9d9d9).fillTriangle(8, 14, 16, 8, 16, 20).fillTriangle(56, 14, 48, 8, 48, 20);
    });

    tex(this, 'e_golem', 56, 56, (g) => {
      circ(g, 28, 30, 22, 0x8a8a92);
      g.fillStyle(0x6e6e78).fillRect(10, 36, 36, 12);
      g.lineStyle(2, 0x1b1b1b).strokeRect(10, 36, 36, 12);
      g.fillStyle(0x5a5a64).fillRect(18, 14, 20, 8);
      g.fillStyle(0xffb020).fillRect(19, 24, 6, 4).fillRect(31, 24, 6, 4);
      g.fillStyle(0x4f4f58).fillTriangle(8, 20, 18, 12, 18, 26).fillTriangle(48, 20, 38, 12, 38, 26);
    });
    tex(this, 'e_bat', 36, 26, (g) => {
      g.fillStyle(0x4a2a66).fillTriangle(2, 4, 16, 14, 8, 22).fillTriangle(34, 4, 20, 14, 28, 22);
      circ(g, 18, 15, 7, 0x6a3f8f);
      g.fillStyle(0x6a3f8f).fillTriangle(12, 6, 15, 10, 11, 12).fillTriangle(24, 6, 21, 10, 25, 12);
      g.fillStyle(0xff4040).fillCircle(15, 14, 1.6).fillCircle(21, 14, 1.6);
    });
    tex(this, 'e_wraith', 34, 40, (g) => {
      g.fillStyle(0x8fd8d0, 0.35).fillCircle(17, 16, 16);
      g.fillStyle(0xbdeee8, 0.9).fillTriangle(17, 2, 3, 36, 31, 36);
      g.fillStyle(0xbdeee8, 0.9).fillCircle(17, 14, 10);
      g.fillStyle(0x103030).fillCircle(13, 14, 2.5).fillCircle(21, 14, 2.5).fillEllipse(17, 21, 5, 6);
    });
    tex(this, 'e_shaman', 38, 44, (g) => {
      g.fillStyle(0x8a2a3a).fillTriangle(19, 12, 4, 42, 34, 42);
      g.lineStyle(2, 0x1b1b1b).strokeTriangle(19, 12, 4, 42, 34, 42);
      circ(g, 19, 16, 9, 0x6bbf3a);
      g.fillStyle(0x8a2a3a).fillTriangle(19, 0, 8, 14, 30, 14);
      g.fillStyle(0xffffff).fillCircle(15, 17, 2).fillCircle(23, 17, 2);
      g.fillStyle(0x8a5a2b).fillRect(33, 10, 2, 30);
      g.fillStyle(0x66ff88).fillCircle(34, 9, 4);
    });
    tex(this, 'e_drake', 96, 70, (g) => {
      g.fillStyle(0x8a1f1f).fillTriangle(4, 8, 44, 34, 30, 52).fillTriangle(92, 8, 52, 34, 66, 52);
      g.lineStyle(2, 0x1b1b1b).strokeTriangle(4, 8, 44, 34, 30, 52).strokeTriangle(92, 8, 52, 34, 66, 52);
      g.fillStyle(0xc0392b).fillEllipse(48, 40, 34, 40);
      g.lineStyle(2, 0x1b1b1b).strokeEllipse(48, 40, 34, 40);
      circ(g, 48, 22, 13, 0xd04a3a);
      g.fillStyle(0xffd34d).fillCircle(42, 20, 3.5).fillCircle(54, 20, 3.5);
      g.fillStyle(0x1b1b1b).fillCircle(42, 20, 1.5).fillCircle(54, 20, 1.5);
      g.fillStyle(0xe8dcc0).fillTriangle(38, 8, 42, 2, 44, 10).fillTriangle(58, 8, 54, 2, 52, 10);
      g.fillStyle(0xff9a30, 0.9).fillTriangle(48, 62, 40, 70, 56, 70);
    });

    // --- 병사 ---
    tex(this, 'soldier', 22, 24, (g) => {
      circ(g, 11, 14, 8, 0x3a7bd5);
      g.fillStyle(0xb8c2cc).fillRect(4, 3, 14, 8);
      g.lineStyle(2, 0x1b1b1b).strokeRect(4, 3, 14, 8);
      g.fillStyle(0xffd9a8).fillRect(7, 11, 8, 4);
    });

    // --- 타워 ---
    tex(this, 't_archer', 56, 72, (g) => {
      g.fillStyle(0x9a8f80).fillRect(12, 34, 32, 32);
      g.lineStyle(2, 0x1b1b1b).strokeRect(12, 34, 32, 32);
      g.fillStyle(0x3f8f3a).fillTriangle(6, 36, 28, 6, 50, 36);
      g.lineStyle(2, 0x1b1b1b).strokeTriangle(6, 36, 28, 6, 50, 36);
      g.fillStyle(0x2a2118).fillRect(24, 50, 8, 16).fillRect(25, 38, 6, 7);
    });
    tex(this, 't_mage', 56, 72, (g) => {
      g.fillStyle(0x8f94a8).fillRect(15, 30, 26, 36);
      g.lineStyle(2, 0x1b1b1b).strokeRect(15, 30, 26, 36);
      g.fillStyle(0x7a3fb0).fillTriangle(10, 32, 28, 2, 46, 32);
      g.lineStyle(2, 0x1b1b1b).strokeTriangle(10, 32, 28, 2, 46, 32);
      g.fillStyle(0x66e0ff).fillCircle(28, 38, 5);
      g.fillStyle(0x2a2118).fillRect(24, 52, 8, 14);
    });
    tex(this, 't_cannon', 56, 72, (g) => {
      g.fillStyle(0x8d8d8d).fillRect(8, 36, 40, 30);
      g.lineStyle(2, 0x1b1b1b).strokeRect(8, 36, 40, 30);
      g.fillStyle(0x4a4a4a).fillRect(6, 30, 44, 8);
      g.fillStyle(0x2d2d2d).fillRect(24, 8, 14, 30);
      g.lineStyle(2, 0x1b1b1b).strokeRect(24, 8, 14, 30);
      g.fillStyle(0x111111).fillCircle(31, 9, 6);
      g.fillStyle(0x2a2118).fillRect(22, 50, 12, 16);
    });
    tex(this, 't_barracks', 56, 72, (g) => {
      g.fillStyle(0x8b5a2b).fillRect(6, 34, 44, 32);
      g.lineStyle(2, 0x1b1b1b).strokeRect(6, 34, 44, 32);
      g.fillStyle(0xb03a2e).fillRect(2, 24, 52, 12);
      g.lineStyle(2, 0x1b1b1b).strokeRect(2, 24, 52, 12);
      g.fillStyle(0x1b1b1b).fillRect(27, 4, 2, 22);
      g.fillStyle(0x3a7bd5).fillTriangle(29, 4, 29, 14, 42, 9);
      g.fillStyle(0x2a2118).fillRect(22, 46, 12, 20);
    });
    tex(this, 't_frost', 56, 72, (g) => {
      g.fillStyle(0x9fb4c8).fillRect(15, 36, 26, 30);
      g.lineStyle(2, 0x1b1b1b).strokeRect(15, 36, 26, 30);
      g.fillStyle(0xcfeeff).fillTriangle(28, 2, 18, 38, 38, 38);
      g.fillStyle(0x8fd8ff).fillTriangle(16, 14, 8, 38, 24, 38).fillTriangle(40, 14, 32, 38, 48, 38);
      g.lineStyle(2, 0x1b1b1b).strokeTriangle(28, 2, 18, 38, 38, 38);
      g.fillStyle(0x2a2118).fillRect(24, 52, 8, 14);
    });
    tex(this, 't_thunder', 56, 72, (g) => {
      g.fillStyle(0x4a4a5c).fillRect(16, 34, 24, 32);
      g.lineStyle(2, 0x1b1b1b).strokeRect(16, 34, 24, 32);
      g.fillStyle(0x30303c).fillRect(12, 28, 32, 8);
      g.fillStyle(0xffe14a).fillCircle(28, 18, 11);
      g.lineStyle(2, 0x1b1b1b).strokeCircle(28, 18, 11);
      g.fillStyle(0x30303c).fillTriangle(30, 8, 22, 20, 28, 20).fillTriangle(26, 28, 34, 16, 28, 16);
      g.fillStyle(0x2a2118).fillRect(24, 52, 8, 14);
    });
    tex(this, 'h_knight', 34, 40, (g) => {
      g.fillStyle(0xc0392b).fillTriangle(17, 12, 3, 38, 31, 38);
      circ(g, 17, 24, 11, 0xe0b84a);
      g.fillStyle(0xb8c2cc).fillRect(8, 6, 18, 12);
      g.lineStyle(2, 0x1b1b1b).strokeRect(8, 6, 18, 12);
      g.fillStyle(0x1b1b1b).fillRect(10, 11, 14, 3);
      g.fillStyle(0xc0392b).fillTriangle(17, 0, 13, 8, 21, 8);
    });
    tex(this, 'h_sorc', 34, 42, (g) => {
      g.fillStyle(0x6a3fa8).fillTriangle(17, 14, 4, 40, 30, 40);
      g.lineStyle(2, 0x1b1b1b).strokeTriangle(17, 14, 4, 40, 30, 40);
      circ(g, 17, 18, 7, 0xffd9a8);
      g.fillStyle(0x4a2a80).fillTriangle(17, 0, 7, 14, 27, 14);
      g.lineStyle(2, 0x1b1b1b).strokeTriangle(17, 0, 7, 14, 27, 14);
      g.fillStyle(0x66e0ff).fillCircle(30, 12, 3);
      g.fillStyle(0x8a5a2b).fillRect(29, 14, 2, 24);
    });
    tex(this, 'spot', 50, 30, (g) => {
      g.fillStyle(0x000000, 0.25).fillEllipse(25, 17, 46, 22);
      g.fillStyle(0xb8ab94).fillEllipse(25, 15, 44, 22);
      g.lineStyle(3, 0x6e6454).strokeEllipse(25, 15, 44, 22);
      g.lineStyle(2, 0xe8dcc0, 0.7).strokeEllipse(25, 15, 30, 14);
    });

    // --- 투사체 ---
    tex(this, 'p_arrow', 16, 6, (g) => {
      g.fillStyle(0x8a5a2b).fillRect(0, 2, 12, 2);
      g.fillStyle(0xdddddd).fillTriangle(16, 3, 11, 0, 11, 6);
    });
    tex(this, 'p_orb', 16, 16, (g) => {
      g.fillStyle(0xb06cff, 0.35).fillCircle(8, 8, 8);
      g.fillStyle(0xd9a8ff).fillCircle(8, 8, 5);
      g.fillStyle(0xffffff).fillCircle(8, 8, 2);
    });
    tex(this, 'p_ball', 16, 16, (g) => {
      circ(g, 8, 8, 6, 0x2f2f2f, 0x000000);
      g.fillStyle(0x777777).fillCircle(6, 6, 2);
    });

  }
}
