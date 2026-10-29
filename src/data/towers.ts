export type TowerKind = 'archer' | 'mage' | 'cannon' | 'barracks';

export interface TowerLvl {
  cost: number;     // 이 레벨로 만드는 데 드는 골드
  range: number;    // 바라크는 병사 순찰 반경
  dmg: number;
  cd: number;       // 공격 간격(초)
  splash?: number;
  soldierHp?: number;
}

export interface TowerDef {
  name: string;
  desc: string;
  tex: string;
  levels: TowerLvl[];
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  archer: {
    name: '궁수탑', desc: '빠른 단일 물리 공격\n공중 가능', tex: 't_archer',
    levels: [
      { cost: 70, range: 140, dmg: 8, cd: 0.6 },
      { cost: 90, range: 150, dmg: 14, cd: 0.55 },
      { cost: 140, range: 165, dmg: 23, cd: 0.5 },
    ],
  },
  mage: {
    name: '마법탑', desc: '강력한 마법 피해\n방어구 무시', tex: 't_mage',
    levels: [
      { cost: 100, range: 130, dmg: 30, cd: 1.4 },
      { cost: 130, range: 140, dmg: 52, cd: 1.3 },
      { cost: 180, range: 150, dmg: 88, cd: 1.2 },
    ],
  },
  cannon: {
    name: '대포탑', desc: '지상 범위 공격\n공중 불가', tex: 't_cannon',
    levels: [
      { cost: 120, range: 150, dmg: 32, cd: 2.2, splash: 45 },
      { cost: 140, range: 160, dmg: 56, cd: 2.0, splash: 52 },
      { cost: 200, range: 170, dmg: 90, cd: 1.9, splash: 58 },
    ],
  },
  barracks: {
    name: '병영', desc: '병사 3명이 적을 막음\n죽으면 자동 보충', tex: 't_barracks',
    levels: [
      { cost: 80, range: 90, dmg: 6, cd: 1, soldierHp: 70 },
      { cost: 100, range: 95, dmg: 10, cd: 1, soldierHp: 115 },
      { cost: 150, range: 100, dmg: 15, cd: 1, soldierHp: 170 },
    ],
  },
};

export const SELL_RATIO = 0.6;
