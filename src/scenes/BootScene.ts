import Phaser from 'phaser';

type G = Phaser.GameObjects.Graphics;

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function circ(g: G, x: number, y: number, r: number, fill: number, stroke = 0x1b1b1b) {
  g.fillStyle(fill, 1).fillCircle(x, y, r);
  g.lineStyle(2, stroke, 1).strokeCircle(x, y, r);
}

/** 프로그래머 아트: 외부 이미지 없이 도형으로 모든 텍스처를 생성한다. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
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

    this.scene.start('Menu');
  }
}
