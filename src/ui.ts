import Phaser from 'phaser';
import { FONT } from './config';

export function text(scene: Phaser.Scene, x: number, y: number, s: string, size = 18, color = '#ffffff') {
  return scene.add.text(x, y, s, {
    fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#000000', strokeThickness: Math.max(2, size / 7),
  }).setOrigin(0.5);
}

export interface Btn {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  setEnabled(on: boolean): void;
  setLabel(s: string): void;
  setVisible(v: boolean): void;
  destroy(): void;
}

export function button(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string,
  onClick: () => void, color = 0x3b6fb6, size = 18,
): Btn {
  const bg = scene.add.rectangle(x, y, w, h, color).setStrokeStyle(3, 0x0d0d14).setInteractive({ useHandCursor: true });
  bg.setData('ui', true);
  const t = text(scene, x, y, label, size);
  let enabled = true;
  bg.on('pointerover', () => enabled && bg.setFillStyle(Phaser.Display.Color.ValueToColor(color).lighten(15).color));
  bg.on('pointerout', () => bg.setFillStyle(color));
  bg.on('pointerdown', () => enabled && onClick());
  return {
    bg, label: t,
    setEnabled(on) { enabled = on; bg.setAlpha(on ? 1 : 0.5); t.setAlpha(on ? 1 : 0.6); },
    setLabel(s) { t.setText(s); },
    setVisible(v) { bg.setVisible(v); t.setVisible(v); },
    destroy() { bg.destroy(); t.destroy(); },
  };
}
