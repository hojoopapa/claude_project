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
  /** 움직임 종류: walk 걷기, heavy 묵직한 걸음, float 둥실, flap 날갯짓 */
  anim: 'walk' | 'heavy' | 'float' | 'flap';
  /**
   * 보스 용의 파괴 공격. 날아가는 동안 발밑(stomp 반경)의 유닛과 건물을 부수고,
   * every 초마다 range 안의 목표를 골라 예고 후 radius 반경에 브레스를 쏜다 (first 는 첫 브레스까지의 시간).
   */
  breath?: { stomp: number; every: number; first: number; radius: number; range: number };
  /** 화면에 들어온 뒤에는 경로를 따라 나가지 않고, 죽을 때까지 타워와 아군 주변을 돌아다닌다 (보스 용) */
  roams?: boolean;
  /** 프레임 그림이 있으면 걸을 때는 walk 두 장을 번갈아, 막혀서 싸울 때는 atk[0]=준비, atk[1]=찌르기를 쓴다 */
  frames?: { walk: readonly [string, string]; atk: readonly [string, string]; /** 맞은 직후 잠깐 쓰는 그림 */ hurt?: string };
  /** PNG 그림으로 그릴 때: key=평소 텍스처, alt=브레스를 모을 때 텍스처, width=화면 표시 폭(그림 캔버스 기준), facesLeft=원본이 왼쪽을 보고 있음 (없으면 기존 SVG 그림을 쓴다) */
  sprite?: { key: string; alt?: string; width: number; facesLeft?: boolean };
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  goblin: { name: '고블린', hp: 40, speed: 55, armor: 0, mr: 0, gold: 4, lives: 1, flying: false, dmg: 4, tex: 'e_goblin', scale: 1, anim: 'walk', frames: { walk: ['e_goblin_walk1', 'e_goblin_walk2'], atk: ['e_goblin_stab1', 'e_goblin_stab2'] } },
  wolf: { name: '늑대', hp: 32, speed: 100, armor: 0, mr: 0, gold: 4, lives: 1, flying: false, dmg: 5, tex: 'e_wolf', scale: 1, anim: 'walk' },
  orc: { name: '오크', hp: 170, speed: 40, armor: 0.45, mr: 0, gold: 10, lives: 2, flying: false, dmg: 9, tex: 'e_orc', scale: 1, anim: 'walk' },
  wisp: { name: '도깨비불', hp: 70, speed: 70, armor: 0, mr: 0.5, gold: 7, lives: 1, flying: true, dmg: 0, tex: 'e_wisp', scale: 1, anim: 'float', frames: { walk: ['e_wisp_idle1', 'e_wisp_idle2'], atk: ['e_wisp_idle1', 'e_wisp_atk'], hurt: 'e_wisp_atk' } },
  golem: { name: '바위 골렘', hp: 650, speed: 28, armor: 0.6, mr: 0, gold: 28, lives: 3, flying: false, dmg: 18, tex: 'e_golem', scale: 1, anim: 'heavy' },
  bat: { name: '박쥐', hp: 24, speed: 115, armor: 0, mr: 0, gold: 3, lives: 1, flying: true, dmg: 0, tex: 'e_bat', scale: 1, anim: 'flap' },
  wraith: { name: '망령', hp: 95, speed: 62, armor: 0, mr: 0.65, gold: 8, lives: 2, flying: false, dmg: 8, tex: 'e_wraith', scale: 1, anim: 'float' },
  shaman: { name: '주술사', hp: 85, speed: 48, armor: 0.15, mr: 0.2, gold: 9, lives: 2, flying: false, dmg: 4, tex: 'e_shaman', scale: 1, heal: { radius: 100, pct: 0.12, every: 2.5 }, anim: 'walk' },
  drake: { name: '화염 비룡', hp: 3800, speed: 38, armor: 0.3, mr: 0.3, gold: 200, lives: 10, flying: true, dmg: 0, tex: 'e_drake', scale: 1, anim: 'flap', roams: true, breath: { stomp: 38, every: 6.5, first: 2.5, radius: 85, range: 320 }, sprite: { key: 'dragon_idle', alt: 'dragon_prep', width: 118 } },
  ogre: { name: '오우거 군주', hp: 1600, speed: 30, armor: 0.5, mr: 0.3, gold: 120, lives: 5, flying: false, dmg: 22, tex: 'e_ogre', scale: 1, anim: 'heavy' },
};
