import Phaser from 'phaser';

/**
 * 그래픽 스킨. 게임성은 같고 그림만 다르다.
 * - svg: 코드로 그린 벡터 그림 (public/skins/svg, scripts/gen-svg-skin.cjs 로 생성)
 * - image: 이미지 생성 AI로 만든 PNG (public/skins/image, scripts/process-assets.py 로 변환)
 * image 스킨에 없는 에셋은 svg 스킨으로, 거기에도 없으면 BootScene 의 도형 텍스처로 대신한다.
 */
export type SkinId = 'svg' | 'image';
export const SKINS: SkinId[] = ['svg', 'image'];
const STORE = 'realmguard.skin.v1';

export function getSkin(): SkinId {
  const q = new URLSearchParams(location.search).get('skin');
  if (q === 'svg' || q === 'image') return q;
  try {
    const v = localStorage.getItem(STORE);
    if (v === 'svg' || v === 'image') return v;
  } catch { /* ignore */ }
  return 'svg';
}

/** 저장하고 페이지를 다시 불러온다 (텍스처는 시작할 때만 불러온다). 주소의 ?skin= 은 제거한다. */
export function switchSkin(next: SkinId): void {
  try { localStorage.setItem(STORE, next); } catch { /* ignore */ }
  const u = new URL(location.href);
  u.searchParams.delete('skin');
  location.href = u.toString();
}

/** 스킨 이미지가 로드된 텍스처 키 (표시 크기의 2배로 만들었다) */
const loaded = new Set<string>();
export const markSkinTexture = (key: string) => loaded.add(key);
export const hasSkinTexture = (key: string) => loaded.has(key);

/** 스킨 텍스처는 표시 크기의 2배라 0.5배로 그린다 */
export const SKIN_SCALE = 0.5;

/** 이미지 키와 배율. 타워는 level(0부터)을 주면 t_<종류>_<레벨> 이미지를 우선 쓴다. */
export function texFor(base: string, level?: number): { key: string; scale: number } {
  if (level !== undefined) {
    const stem = base.replace(/_\d$/, '');
    // 해당 레벨 그림이 없으면 낮은 레벨 그림을 대신 쓴다 (이미지 스킨에서 레벨 1만 있을 때 스타일이 섞이지 않게)
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

/** 현재 스킨에서 불러올 목록: svg 목록 위에 (image 스킨이면) image 목록을 덮어쓴다 */
export function mergeIndex(skin: SkinId, svg: SkinIndex | undefined, image: SkinIndex | undefined) {
  const out: Record<string, SkinEntry & { kind: 'svg' | 'image' }> = {};
  for (const [k, v] of Object.entries(svg ?? {})) out[k] = { ...v, kind: 'svg' };
  if (skin === 'image') {
    for (const [k, v] of Object.entries(image ?? {})) out[k] = { ...v, kind: 'image' };
    // 이미지 스킨에 그 종류의 타워가 있으면, 이미지가 없는 상위 레벨은 SVG 대신 낮은 레벨 이미지를 쓰도록 SVG 항목을 뺀다
    for (const k of Object.keys(out)) {
      const m = /^(t_[a-z]+)_(\d)$/.exec(k);
      if (m && out[k].kind === 'svg' && image?.[`${m[1]}_1`]) delete out[k];
    }
  }
  return out;
}

export function queueSkin(loader: Phaser.Loader.LoaderPlugin, skin: SkinId, merged: ReturnType<typeof mergeIndex>) {
  const base = import.meta.env.BASE_URL;
  let n = 0;
  for (const [key, e] of Object.entries(merged)) {
    if (/^[gr]_/.test(key)) continue; // 배경 타일(g_*, r_*)은 아직 게임에서 쓰지 않는다
    const url = `${base}skins/${e.kind}/${e.file}`;
    if (e.kind === 'svg') loader.svg(key, url, { width: e.w, height: e.h });
    else loader.image(key, url);
    n++;
  }
  void skin;
  return n;
}
