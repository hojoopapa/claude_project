export type EnemyKind = 'goblin' | 'wolf' | 'orc' | 'wisp' | 'ogre' | 'golem' | 'bat' | 'wraith' | 'shaman' | 'drake';

export interface EnemyDef {
  name: string;
  hp: number;
  speed: number;   // px/s
  armor: number;   // 물리 피해 감소 0~1
  mr: number;      // 마법 피해 감소 0~1
  gold: number;
  lives: number;   // 도달 시 깎이는 생명
  flying: boolean;
  dmg: number;     // 병사 상대 공격력 (초당 1회)
  tex: string;
  scale: number;
  /** 주변 아군 회복 (shaman) */
  heal?: { radius: number; pct: number; every: number };
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  goblin: { name: '고블린', hp: 40, speed: 55, armor: 0, mr: 0, gold: 4, lives: 1, flying: false, dmg: 4, tex: 'e_goblin', scale: 1 },
  wolf: { name: '늑대', hp: 32, speed: 100, armor: 0, mr: 0, gold: 4, lives: 1, flying: false, dmg: 5, tex: 'e_wolf', scale: 1 },
  orc: { name: '오크', hp: 170, speed: 40, armor: 0.45, mr: 0, gold: 10, lives: 2, flying: false, dmg: 9, tex: 'e_orc', scale: 1 },
  wisp: { name: '도깨비불', hp: 70, speed: 70, armor: 0, mr: 0.5, gold: 7, lives: 1, flying: true, dmg: 0, tex: 'e_wisp', scale: 1 },
  golem: { name: '바위 골렘', hp: 650, speed: 28, armor: 0.6, mr: 0, gold: 28, lives: 3, flying: false, dmg: 18, tex: 'e_golem', scale: 1 },
  bat: { name: '박쥐', hp: 24, speed: 115, armor: 0, mr: 0, gold: 3, lives: 1, flying: true, dmg: 0, tex: 'e_bat', scale: 1 },
  wraith: { name: '망령', hp: 95, speed: 62, armor: 0, mr: 0.65, gold: 8, lives: 2, flying: false, dmg: 8, tex: 'e_wraith', scale: 1 },
  shaman: { name: '주술사', hp: 85, speed: 48, armor: 0.15, mr: 0.2, gold: 9, lives: 2, flying: false, dmg: 4, tex: 'e_shaman', scale: 1, heal: { radius: 100, pct: 0.12, every: 2.5 } },
  drake: { name: '화염 비룡', hp: 3800, speed: 38, armor: 0.3, mr: 0.3, gold: 200, lives: 10, flying: true, dmg: 0, tex: 'e_drake', scale: 1 },
  ogre: { name: '오우거 군주', hp: 1600, speed: 30, armor: 0.5, mr: 0.3, gold: 120, lives: 5, flying: false, dmg: 22, tex: 'e_ogre', scale: 1 },
};
