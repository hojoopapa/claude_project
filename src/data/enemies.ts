export type EnemyKind = 'goblin' | 'wolf' | 'orc' | 'wisp' | 'ogre';

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
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  goblin: { name: '고블린', hp: 40, speed: 55, armor: 0, mr: 0, gold: 4, lives: 1, flying: false, dmg: 4, tex: 'e_goblin', scale: 1 },
  wolf: { name: '늑대', hp: 32, speed: 100, armor: 0, mr: 0, gold: 4, lives: 1, flying: false, dmg: 5, tex: 'e_wolf', scale: 1 },
  orc: { name: '오크', hp: 170, speed: 40, armor: 0.45, mr: 0, gold: 10, lives: 2, flying: false, dmg: 9, tex: 'e_orc', scale: 1 },
  wisp: { name: '도깨비불', hp: 70, speed: 70, armor: 0, mr: 0.5, gold: 7, lives: 1, flying: true, dmg: 0, tex: 'e_wisp', scale: 1 },
  ogre: { name: '오우거 군주', hp: 1600, speed: 30, armor: 0.5, mr: 0.3, gold: 120, lives: 5, flying: false, dmg: 22, tex: 'e_ogre', scale: 1 },
};
