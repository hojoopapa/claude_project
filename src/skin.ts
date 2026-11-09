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
export const PNG_FRAMES = [
  'e_goblin_walk1', 'e_goblin_walk2', 'e_goblin_stab1', 'e_goblin_stab2',
  'dragon_idle', 'dragon_prep',          // 보스 용: 평소 / 브레스를 모을 때 (scripts/slice-dragon-knight.py)
  'h_knight_atk',                        // 기사 영웅이 공격하는 순간 (평소 그림 h_knight 는 PNG_REPLACE)
  'e_wolf_run1', 'e_wolf_run2',           // 늑대: 달리기 두 장 (scripts/slice-wolf.py)
  'e_wisp_idle1', 'e_wisp_idle2', 'e_wisp_atk',   // 도깨비불: 날아다닐 때 번갈아 / 맞았을 때 (scripts/slice-wisp.py)
  // 오크, 주술사, 망령, 골렘, 오우거 군주: 걷기 2장 + 공격 2장, 박쥐: 날갯짓 2장, 병사 1~3레벨, 마법사 영웅 공격 컷 (scripts/fit-sprites.py)
  ...['orc', 'shaman', 'wraith', 'golem', 'ogre'].flatMap((k) => ['walk1', 'walk2', 'atk1', 'atk2'].map((f) => `e_${k}_${f}`)),
  'e_bat_1', 'e_bat_2',
  'soldier_1', 'soldier_2', 'soldier_3', 'soldier_reinf',   // soldier_reinf: 지원군(붉은색)
  'h_sorc_atk',
  // 벽 그림 (가로 / 세로 '_v'). (scripts/fit-sprites.py)
  ...['wood', 'dirt', 'brick', 'metal'].flatMap((k) => [`wp_${k}`, `wp_${k}_v`]),
] as const;

/**
 * SVG 대신 PNG 로 바꿔 쓰는 그림 (키는 SVG 와 같다): 궁수탑 1~3레벨(scripts/slice-archer-tower.py)과
 * 기사 영웅의 평소 그림(scripts/slice-dragon-knight.py). 같은 키의 SVG 는 불러오지 않는다 (BootScene).
 */
export const PNG_REPLACE = ['t_archer_1', 't_archer_2', 't_archer_3', 'h_knight', 'spot',
  't_barracks_1', 't_barracks_2', 't_barracks_3', 't_frost_1', 't_frost_2', 't_frost_3', 't_cannon_1', 't_cannon_2', 't_cannon_3',
  't_mage_1', 't_mage_2', 't_mage_3', 't_thunder_1', 't_thunder_2', 't_thunder_3',   // scripts/fit-sprites.py
  'h_sorc',
  // 아이콘 그림 (etc.png, 48x48 을 0.5배로 그린다). 트로피(ic_trophy)는 그림이 없어 도형 그대로
  ...['heart', 'coin', 'star', 'star_off', 'lock', 'pause', 'ff', 'play', 'back', 'up', 'edit', 'sound', 'mute', 'home', 'flag', 'reinf', 'sell', 'fire'].map((k) => `ic_${k}`),
] as const;   // spot = 건물 자리 (scripts/slice-spot.py)

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
