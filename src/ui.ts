import Phaser from 'phaser';
import { FONT } from './config';

/** UI 색 팔레트. 어두운 남색 바탕에 금색 포인트, 동작별 색은 채도를 낮춘 톤으로 맞춘다. */
export const C = {
  panel: 0x141b2e,
  panelHi: 0x1e2842,
  line: 0xffffff,
  text: '#f2f5fb',
  dim: '#9aa7c4',
  gold: '#ffd36b',
  goldHex: 0xffd36b,
  red: '#ff7b7b',
  green: 0x2fb872,
  blue: 0x3b78e0,
  orange: 0xe8802a,
  purple: 0x7a5be0,
  slate: 0x2a3555,
  danger: 0xd9484f,
};

interface TextOpts { stroke?: number; weight?: string; shadow?: boolean }

/** 기본은 외곽선 없는 깔끔한 글자. 맵 위에 겹치는 글자만 stroke 를 준다. */
export function text(scene: Phaser.Scene, x: number, y: number, s: string, size = 16, color: string = C.text, o: TextOpts = {}) {
  const t = scene.add.text(x, y, s, {
    fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: o.weight ?? '600',
    stroke: '#0b1020', strokeThickness: o.stroke ?? 0,
  }).setOrigin(0.5);
  if (o.shadow !== false && !o.stroke) t.setShadow(0, 1, 'rgba(0,0,0,0.45)', 2, false, true);
  return t;
}

/** 아이콘 텍스처(BootScene 에서 2배 크기로 만든다)를 0.5배로 그린다 */
export function icon(scene: Phaser.Scene, key: string, x: number, y: number, scale = 1) {
  return scene.add.image(x, y, key).setScale(0.5 * scale);
}

/** 둥근 사각형 패널 (좌상단 기준 좌표) */
export function panel(
  g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
  o: { fill?: number; alpha?: number; r?: number; border?: number; borderAlpha?: number; shadow?: boolean } = {},
) {
  const r = o.r ?? 14;
  if (o.shadow) g.fillStyle(0x000000, 0.35).fillRoundedRect(x, y + 4, w, h, r);
  g.fillStyle(o.fill ?? C.panel, o.alpha ?? 0.94).fillRoundedRect(x, y, w, h, r);
  g.lineStyle(1.5, o.border ?? C.line, o.borderAlpha ?? 0.14).strokeRoundedRect(x, y, w, h, r);
  return g;
}

/** 중앙 정렬 모달: 어두운 배경 + 패널 + 등장 애니메이션. 닫을 때는 objects 를 destroy 한다. */
export function modal(scene: Phaser.Scene, w: number, h: number, depth: number, accent: number = C.goldHex) {
  const cx = scene.scale.width / 2, cy = scene.scale.height / 2;
  const shade = scene.add.rectangle(cx, cy, scene.scale.width, scene.scale.height, 0x050810, 0.72).setDepth(depth).setInteractive();
  shade.setData('ui', true);
  const g = scene.add.graphics().setDepth(depth + 1);
  panel(g, cx - w / 2, cy - h / 2, w, h, { r: 18, shadow: true, border: accent, borderAlpha: 0.55 });
  g.fillStyle(accent, 0.9).fillRoundedRect(cx - 38, cy - h / 2 + 10, 76, 4, 2);
  const objects: Phaser.GameObjects.GameObject[] = [shade, g];
  scene.tweens.add({ targets: [shade, g], alpha: { from: 0, to: 1 }, duration: 160 });
  return { shade, g, cx, cy, objects, depth };
}

export interface Btn {
  bg: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  setEnabled(on: boolean): void;
  setLabel(s: string): void;
  setVisible(v: boolean): void;
  setIcon(key: string | null, scale?: number): void;
  setSelected(on: boolean): void;
  /** 0 이면 없음, 1 이면 가득 (위에서부터 줄어드는 어두운 막) */
  setCooldown(frac: number): void;
  destroy(): void;
}

export interface BtnOpts {
  icon?: string;
  iconScale?: number;
  /** 아이콘 위치: left(옆), top(위, 글자는 아래), only(가운데) */
  layout?: 'left' | 'top' | 'only';
  radius?: number;
}

/** 둥근 모서리, 은은한 광택과 그림자가 있는 버튼 */
export function button(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string,
  onClick: () => void, color: number = C.blue, size = 16, o: BtnOpts = {},
): Btn {
  const r = o.radius ?? Math.min(14, h / 2.4);
  const c = scene.add.container(x, y).setSize(w, h);
  const g = scene.add.graphics();
  const cd = scene.add.graphics();
  c.add([g, cd]);
  let iconImg: Phaser.GameObjects.Image | null = null;
  const lbl = text(scene, 0, 0, label, size, C.text);
  c.add(lbl);
  let hover = false, enabled = true, selected = false, cdFrac = 0, iconKey = o.icon ?? null, iconScale = o.iconScale ?? 1;

  const layout = () => {
    const mode = o.layout ?? (label === '' && !iconKey ? 'only' : w >= h * 1.5 ? 'left' : 'top');
    const hasText = lbl.text !== '';
    if (iconImg) {
      iconImg.setScale(0.5 * iconScale);
      if (!hasText || mode === 'only') iconImg.setPosition(0, 0);
      else if (mode === 'left') iconImg.setPosition(-w / 2 + 14 + iconImg.displayWidth / 2, 0);
      else iconImg.setPosition(0, -h * 0.16);
    }
    if (mode === 'left' && iconImg && hasText) lbl.setPosition(iconImg.x + iconImg.displayWidth / 2 + (w / 2 - iconImg.x - iconImg.displayWidth / 2) / 2, 0);
    else if (mode === 'top' && iconImg && hasText) lbl.setPosition(0, h * 0.3);
    else lbl.setPosition(0, 0);
    lbl.setWordWrapWidth(mode === 'left' && iconImg ? w - iconImg.displayWidth - 30 : w - 10).setAlign('center');
  };
  const setIconKey = (key: string | null) => {
    iconKey = key;
    iconImg?.destroy(); iconImg = null;
    if (key) { iconImg = scene.add.image(0, 0, key); c.add(iconImg); }
    layout();
  };
  const draw = () => {
    g.clear();
    const k = Phaser.Display.Color.ValueToColor(color);
    const base = hover && enabled ? k.clone().lighten(12).color : k.color;
    g.fillStyle(0x000000, 0.38).fillRoundedRect(-w / 2, -h / 2 + 3, w, h, r);
    g.fillStyle(base, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(0xffffff, 0.1).fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h * 0.46, { tl: r - 2, tr: r - 2, bl: 4, br: 4 });
    if (selected) g.lineStyle(2.5, C.goldHex, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    else g.lineStyle(1.5, 0xffffff, hover && enabled ? 0.4 : 0.2).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    cd.clear();
    if (cdFrac > 0) cd.fillStyle(0x050810, 0.62).fillRoundedRect(-w / 2, -h / 2, w, Math.max(r, h * cdFrac), r);
  };

  if (o.icon) setIconKey(o.icon);
  layout();
  draw();
  c.setInteractive({ useHandCursor: true });
  c.setData('ui', true);
  c.on('pointerover', () => { hover = true; draw(); });
  c.on('pointerout', () => { hover = false; c.setScale(1); draw(); });
  c.on('pointerdown', () => { if (!enabled) return; c.setScale(0.96); onClick(); });
  c.on('pointerup', () => c.setScale(1));

  return {
    bg: c, label: lbl,
    setEnabled(on) { enabled = on; c.setAlpha(on ? 1 : 0.55); },
    setLabel(s) { if (lbl.text !== s) { lbl.setText(s); layout(); } },
    setVisible(v) { c.setVisible(v); },
    setIcon(key, s) { if (s !== undefined) iconScale = s; if (key !== iconKey) setIconKey(key); else layout(); },
    setSelected(on) { if (on !== selected) { selected = on; draw(); } },
    setCooldown(f) { const v = Math.max(0, Math.min(1, f)); if (Math.abs(v - cdFrac) > 0.004) { cdFrac = v; draw(); } },
    destroy() { c.destroy(); },
  };
}
