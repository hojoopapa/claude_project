export type HeroKind = 'knight' | 'sorc';

export interface HeroDef {
  tex: string;
  /** 레벨이 1 오를 때마다 늘어나는 정도: dmg, hp 는 기본값의 비율, range 는 px */
  grow: { dmg: number; hp: number; range: number };
  /** 그림 크기 배율 (기본 1). 영웅끼리 키를 맞출 때 쓴다 */
  scale?: number;
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
  knight: { tex: 'h_knight', atkTex: 'h_knight_atk', scale: 0.75, grow: { dmg: 0.18, hp: 0.22, range: 0 }, hp: 520, dmg: 15, cd: 0.9, range: 110, ranged: false, regen: 6, abilityCd: 24, respawn: 12 },
  sorc: { tex: 'h_sorc', atkTex: 'h_sorc_atk', grow: { dmg: 0.18, hp: 0, range: 12 }, hp: 260, dmg: 24, cd: 1.0, range: 150, ranged: true, regen: 0, abilityCd: 26, respawn: 12 },
};

// ---------- 영웅 레벨 (경험치) ----------
// 경험치 = 적을 처치할 때 그 적의 골드값 (영웅이 필드에 있을 때만, 처치한 주체와 무관). 레벨 6(최대)에 필요한 12,000 은
// 1~15 스테이지의 적 골드 합계(11,965)에 맞춘 값이라, 영웅이 매번 살아 있고 레벨을 계속 이어 가도 15판은 해야 최대가 된다.
/** 레벨 1~6 에 필요한 누적 경험치 */
export const HERO_XP = [0, 600, 1800, 3800, 6800, 12000];
export const HERO_MAX_LV = HERO_XP.length;

export function heroLevel(xp: number): number {
  let l = 1;
  for (let i = 1; i < HERO_XP.length; i++) if (xp >= HERO_XP[i]) l = i + 1;
  return l;
}

/** 현재 레벨 안에서 경험치가 찬 비율 0~1 (최대 레벨이면 1) */
export function heroXpFrac(xp: number): number {
  const l = heroLevel(xp);
  return l >= HERO_MAX_LV ? 1 : (xp - HERO_XP[l - 1]) / (HERO_XP[l] - HERO_XP[l - 1]);
}

/** 레벨에 따른 공격력, 체력, 사거리 */
export function heroStats(kind: HeroKind, lv: number): { dmg: number; hp: number; range: number } {
  const d = HEROES[kind], g = d.grow;
  return { dmg: Math.round(d.dmg * (1 + g.dmg * (lv - 1))), hp: Math.round(d.hp * (1 + g.hp * (lv - 1))), range: d.range + g.range * (lv - 1) };
}
