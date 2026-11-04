/**
 * 벽: 길 위에 설치해서 지상 적을 막는 아이템. 업그레이드는 없고, 스테이지 구간마다 재질이 바뀐다.
 * 적이 벽에 닿으면 멈춰서 벽을 공격한다 (공중 적은 막지 못한다). 체력이 다하면 부서진다.
 */
export interface WallTier {
  key: 'wood' | 'dirt' | 'brick' | 'metal';
  /** 이 스테이지 번호까지 이 재질을 쓴다 */
  maxStage: number;
  cost: number;
  hp: number;
  /** 텍스처 키 (BootScene 에서 도형으로 그린다) */
  tex: string;
}

export const WALL_TIERS: WallTier[] = [
  { key: 'wood', maxStage: 5, cost: 25, hp: 80, tex: 'w_wood' },
  { key: 'dirt', maxStage: 10, cost: 35, hp: 170, tex: 'w_dirt' },
  { key: 'brick', maxStage: 15, cost: 50, hp: 320, tex: 'w_brick' },
  { key: 'metal', maxStage: 20, cost: 70, hp: 560, tex: 'w_metal' },
];

/** 동시에 세워 둘 수 있는 벽 개수 (무한정 깔아 두고 쉽게 깨는 것을 막는다) */
export const WALL_MAX = 3;
/** 벽끼리 최소 간격, 클릭 위치에서 길까지 허용하는 거리, 적이 벽에 걸리는 반경 */
export const WALL_GAP = 36;
export const WALL_SNAP = 40;
export const WALL_REACH = 24;

export function wallFor(stage: number): WallTier {
  return WALL_TIERS.find((t) => stage <= t.maxStage) ?? WALL_TIERS[WALL_TIERS.length - 1];
}
