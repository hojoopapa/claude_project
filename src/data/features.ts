/** 스테이지별로 열려 있는 기능. 1~4번은 튜토리얼 구간이라 기능을 하나씩 연다. */
export interface Features {
  /** 타워를 올릴 수 있는 최대 단계 (1 = 건설만, 3 = 전부) */
  maxTowerLevel: number;
  reinf: boolean;
  fire: boolean;
  heroes: boolean;
  /** 냉기탑/번개탑 */
  extraTowers: boolean;
}

export const TUTORIAL_STAGES = 4;

/** 처음 N개 스테이지는 보통 속도로만 진행한다 (배속 버튼을 눌러도 안내만 뜬다) */
export const NORMAL_SPEED_STAGES = 3;

/**
 * 배속 단계. 2X는 짧은 광고, 3X는 긴 광고를 본 뒤 그 스테이지 동안 쓸 수 있다.
 * mul 은 실제 진행 배율이다 (3X 가 예전의 빠른 속도 = 2배, 2X 는 그 중간 1.5배).
 */
export const SPEEDS = {
  2: { label: '2X', mul: 1.5, ad: 'short' },
  3: { label: '3X', mul: 2, ad: 'long' },
} as const;
export type SpeedTier = keyof typeof SPEEDS;

export function featuresFor(stage: number): Features {
  if (stage > TUTORIAL_STAGES) return { maxTowerLevel: 3, reinf: true, fire: true, heroes: true, extraTowers: true };
  return {
    maxTowerLevel: stage === 1 ? 1 : 2,
    reinf: stage >= 3,
    fire: stage >= 4,
    heroes: false,
    extraTowers: false,
  };
}

/** 난이도: 0 쉬움, 1 보통(기준), 2 어려움 */
export const DIFFICULTIES = [
  { hp: 0.825, gold: 1.25, lives: 5 },   // 벽 추가로 쉬워지는 만큼 적 체력 +10% (0.75 → 0.825)
  { hp: 1, gold: 1, lives: 0 },
  { hp: 1.25, gold: 0.9, lives: -5 },
] as const;
