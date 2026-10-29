export type TowerKind = 'archer' | 'mage' | 'cannon' | 'barracks' | 'frost' | 'thunder';

export interface TowerLvl {
  cost: number;     // 이 레벨로 만드는 데 드는 골드
  range: number;    // 바라크는 병사 순찰 반경
  dmg: number;
  cd: number;       // 공격 간격(초)
  splash?: number;
  soldierHp?: number;
  slow?: number;    // 이동속도 배율 (0.6 = 40% 감속)
  slowDur?: number;
  chain?: number;   // 번개가 튀는 적의 수
}

export interface TowerDef {
  tex: string;
  /** true면 광고를 시청해야 해당 스테이지에서 사용 가능 */
  adLock?: boolean;
  levels: TowerLvl[];
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  archer: {
    tex: 't_archer',
    levels: [
      { cost: 70, range: 140, dmg: 8, cd: 0.6 },
      { cost: 90, range: 150, dmg: 14, cd: 0.55 },
      { cost: 140, range: 165, dmg: 23, cd: 0.5 },
    ],
  },
  mage: {
    tex: 't_mage',
    levels: [
      { cost: 100, range: 130, dmg: 30, cd: 1.4 },
      { cost: 130, range: 140, dmg: 52, cd: 1.3 },
      { cost: 180, range: 150, dmg: 88, cd: 1.2 },
    ],
  },
  cannon: {
    tex: 't_cannon',
    levels: [
      { cost: 120, range: 150, dmg: 32, cd: 2.2, splash: 45 },
      { cost: 140, range: 160, dmg: 56, cd: 2.0, splash: 52 },
      { cost: 200, range: 170, dmg: 90, cd: 1.9, splash: 58 },
    ],
  },
  barracks: {
    tex: 't_barracks',
    levels: [
      { cost: 80, range: 90, dmg: 6, cd: 1, soldierHp: 70 },
      { cost: 100, range: 95, dmg: 10, cd: 1, soldierHp: 115 },
      { cost: 150, range: 100, dmg: 15, cd: 1, soldierHp: 170 },
    ],
  },
  frost: {
    tex: 't_frost', adLock: true,
    levels: [
      { cost: 110, range: 120, dmg: 10, cd: 1.2, slow: 0.65, slowDur: 2 },
      { cost: 130, range: 130, dmg: 17, cd: 1.1, slow: 0.55, slowDur: 2.5 },
      { cost: 170, range: 140, dmg: 26, cd: 1.0, slow: 0.45, slowDur: 3 },
    ],
  },
  thunder: {
    tex: 't_thunder', adLock: true,
    levels: [
      { cost: 140, range: 140, dmg: 40, cd: 1.6, chain: 3 },
      { cost: 160, range: 150, dmg: 66, cd: 1.5, chain: 4 },
      { cost: 220, range: 160, dmg: 105, cd: 1.4, chain: 5 },
    ],
  },
};

export const SELL_RATIO = 0.6;
