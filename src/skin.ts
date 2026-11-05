import Phaser from 'phaser';

/**
 * 그래픽: 코드로 그린 SVG 스프라이트(public/skins/svg, scripts/gen-svg-skin.cjs 로 생성)를 불러온다.
 * SVG 에 없는 키는 BootScene 의 도형 텍스처로 대신한다. 스프라이트는 표시 크기의 2배로 만들어 0.5배로 그린다.
 */
export const SKIN_SCALE = 0.5;

/**
 * 프레임 애니메이션용 PNG 그림 (public/skins/png). 걷기 2장, 공격 2장이 한 벌이다.
 * 만드는 법: scripts/slice-goblin-frames.py. 화면 표시 크기의 2배로 만들어 0.5배로 그린다.
 */
export const PNG_FRAMES = ['e_goblin_walk1', 'e_goblin_walk2', 'e_goblin_stab1', 'e_goblin_stab2'] as const;

/**
 * SVG 대신 PNG 로 바꿔 쓰는 그림 (키는 SVG 와 같다): 궁수탑 1~3레벨(scripts/slice-archer-tower.py)과
 * 기사 영웅(시작 화면 시안에서 오려냄, scripts/prepare-start-art.py). 같은 키의 SVG 는 불러오지 않는다 (BootScene).
 */
export const PNG_REPLACE = ['t_archer_1', 't_archer_2', 't_archer_3', 'h_knight'] as const;

/** SVG 로 불러온 텍스처 키 */
const loaded = new Set<string>();
export const markSkinTexture = (key: string) => loaded.add(key);
export const hasSkinTexture = (key: string) => loaded.has(key);

/** 이미지 키와 배율. 타워는 level(0부터)을 주면 t_<종류>_<레벨> 이미지를 쓴다. */
export function texFor(base: string, level?: number): { key: string; scale: number } {
  if (level !== undefined) {
    const stem = base.replace(/_\d$/, '');
    for (let l = level; l >= 0; l--) {
      const k = `${stem}_${l + 1}`;
      if (loaded.has(k)) return { key: k, scale: SKIN_SCALE };
    }
    return { key: stem, scale: 1 };
  }
  return loaded.has(base) ? { key: base, scale: SKIN_SCALE } : { key: base.replace(/_\d$/, ''), scale: 1 };
}

export interface SkinEntry { file: string; w: number; h: number }
export type SkinIndex = Record<string, SkinEntry>;

/** 목록의 SVG 를 불러오도록 로더에 올린다. 배경 타일(g_*, r_*)은 아직 쓰지 않는다. */
export function queueSkin(loader: Phaser.Loader.LoaderPlugin, index: SkinIndex | undefined) {
  const base = import.meta.env.BASE_URL;
  let n = 0;
  for (const [key, e] of Object.entries(index ?? {})) {
    if (/^[gr]_/.test(key)) continue;
    loader.svg(key, `${base}skins/svg/${e.file}`, { width: e.w, height: e.h });
    n++;
  }
  return n;
}
