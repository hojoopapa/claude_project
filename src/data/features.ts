/** 스테이지별로 열려 있는 기능. 1~4번은 튜토리얼 구간이라 기능을 하나씩 연다. */
export interface Features {
  /** 타워를 올릴 수 있는 최대 단계 (1 = 건설만, 3 = 전부) */
  maxTowerLevel: number;
  reinf: boolean;
  fire: boolean;
  /** 영웅 (광고 해제) */
  heroes: boolean;
  /** 광고 보고 골드 */
  adGold: boolean;
  /** 냉기탑/번개탑 (광고 해제) */
  adTowers: boolean;
}

export const TUTORIAL_STAGES = 4;

export function featuresFor(stage: number): Features {
  if (stage > TUTORIAL_STAGES) return { maxTowerLevel: 3, reinf: true, fire: true, heroes: true, adGold: true, adTowers: true };
  return {
    maxTowerLevel: stage === 1 ? 1 : 2,
    reinf: stage >= 3,
    fire: stage >= 4,
    heroes: false,
    adGold: false,
    adTowers: false,
  };
}

/** 난이도: 0 쉬움, 1 보통(기준), 2 어려움 */
export const DIFFICULTIES = [
  { hp: 0.75, gold: 1.25, lives: 5 },
  { hp: 1, gold: 1, lives: 0 },
  { hp: 1.25, gold: 0.9, lives: -5 },
] as const;
