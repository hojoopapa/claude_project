export type HeroKind = 'knight' | 'sorc';

export interface HeroDef {
  tex: string;
  /** 공격하는 순간에 쓰는 그림 (없으면 tex 한 장만 쓴다) */
  atkTex?: string;
  hp: number;
  dmg: number;
  cd: number;
  range: number;      // 원거리 영웅의 사거리 / 근접 영웅의 순찰 반경
  ranged: boolean;
  regen: number;      // 전투 중이 아닐 때 초당 회복
  abilityCd: number;
  respawn: number;
}

export const HEROES: Record<HeroKind, HeroDef> = {
  knight: { tex: 'h_knight', atkTex: 'h_knight_atk', hp: 520, dmg: 15, cd: 0.9, range: 110, ranged: false, regen: 6, abilityCd: 24, respawn: 12 },
  sorc: { tex: 'h_sorc', atkTex: 'h_sorc_atk', hp: 260, dmg: 24, cd: 1.0, range: 150, ranged: true, regen: 0, abilityCd: 26, respawn: 12 },
};
