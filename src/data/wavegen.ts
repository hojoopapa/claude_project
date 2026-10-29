import type { EnemyKind } from './enemies.ts';
import type { Wave, WaveGroup } from './levels.ts';

/** 적 한 마리가 차지하는 위협 점수. 웨이브 예산을 이 값으로 나눠 마릿수를 정한다. */
export const THREAT: Record<EnemyKind, number> = {
  goblin: 1, wolf: 1, bat: 1, wisp: 2, wraith: 3, shaman: 3, orc: 4, golem: 12, ogre: 40, drake: 50,
};
const INTERVAL: Record<EnemyKind, number> = {
  goblin: 0.7, wolf: 0.5, bat: 0.45, wisp: 0.8, wraith: 1.1, shaman: 1.8, orc: 1.5, golem: 3.5, ogre: 1, drake: 1,
};
const CAP: Partial<Record<EnemyKind, number>> = { shaman: 4, golem: 4, wraith: 12 };
const FLYING = new Set<EnemyKind>(['wisp', 'bat', 'drake']);

/** 난이도 곡선: 1웨이브 예산 = BASE0 + BASE_STEP*(스테이지-1), 웨이브마다 WAVE_GROWTH 배씩 증가 */
const BASE0 = 7, BASE_STEP = 0.9, WAVE_GROWTH = 0.4;

export interface PoolEntry { kind: EnemyKind; w: number; from?: number }

export interface GenOpts {
  seed: number;
  stage: number;
  pool: PoolEntry[];
  /** 지상 경로 개수 (경로 번호 0..lanes-1) */
  lanes: number;
  /** 날아다니는 적이 쓸 공중 경로 번호 */
  airPath?: number;
  /** 마지막 웨이브에 추가되는 보스 */
  boss?: WaveGroup[];
  waves?: number;
  /** 난이도 배율 (밸런스 조정용) */
  power?: number;
}

function rng(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function genWaves(o: GenOpts): Wave[] {
  const rnd = rng(o.seed * 104729 + o.stage);
  const N = o.waves ?? 8;
  const base = (BASE0 + BASE_STEP * (o.stage - 1)) * (o.power ?? 1);
  const out: Wave[] = [];
  for (let w = 0; w < N; w++) {
    const budget = base * (1 + WAVE_GROWTH * w);
    const nGroups = w < 2 ? 1 : w < 5 ? 2 : 3;
    const avail = o.pool.filter((p) => (p.from ?? 0) <= w);
    const used = new Set<EnemyKind>();
    const groups: WaveGroup[] = [];
    let offset = 0;
    for (let gi = 0; gi < nGroups; gi++) {
      const cands = avail.filter((p) => !used.has(p.kind) && (THREAT[p.kind] <= budget / nGroups * 1.5 || gi > 0));
      if (!cands.length) break;
      let r = rnd() * cands.reduce((a, c) => a + c.w, 0);
      let pick = cands[0];
      for (const c of cands) { r -= c.w; if (r <= 0) { pick = c; break; } }
      used.add(pick.kind);
      const share = budget / nGroups;
      const count = Math.min(CAP[pick.kind] ?? 40, Math.max(1, Math.round(share / THREAT[pick.kind])));
      const interval = INTERVAL[pick.kind] * (count > 18 ? 0.85 : 1);
      const lanes = FLYING.has(pick.kind) && o.airPath !== undefined ? [o.airPath] : Array.from({ length: o.lanes }, (_, i) => i);
      lanes.forEach((path, li) => {
        const n = Math.floor(count / lanes.length) + (li < count % lanes.length ? 1 : 0);
        if (n > 0) groups.push({ kind: pick.kind, count: n, interval: +(interval * lanes.length).toFixed(2), delay: +(offset + li * interval).toFixed(2), path });
      });
      offset += count * interval * 0.5;
    }
    if (w === N - 1 && o.boss) groups.push(...o.boss);
    out.push({ groups, time: w === N - 1 ? 0 : 20 + Math.min(w, 6) });
  }
  return out;
}
