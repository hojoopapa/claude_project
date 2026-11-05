import { RANKING_URL } from './config';
import { allBestScores, getPlayer, totalScore } from './save';

/**
 * 온라인 랭킹 (Firebase Realtime Database REST).
 * 구조: r/<방 코드>/scores/<스테이지>/<플레이어 id> = {name, score, diff, t}, r/<방 코드>/totals/<플레이어 id> = {name, score, n, t}
 * 방 코드는 친구끼리 같은 코드를 쓰면 서로의 점수만 보이게 하는 용도다 (기본 'public').
 * 점수는 브라우저가 직접 보내는 값이라 조작할 수 있다. 친구끼리 비교하는 용도로만 쓴다.
 */
export interface Entry { id: string; name: string; score: number; diff: number; n?: number; t: number }

/** 개발 서버에서는 ?rankdb=주소 로 테스트용 DB 를 지정할 수 있다 */
const base = (): string => {
  const dev = import.meta.env.DEV ? new URLSearchParams(location.search).get('rankdb') : null;
  return (dev || RANKING_URL).replace(/\/+$/, '');
};

export const rankingEnabled = () => base() !== '';

export const cleanRoom = (s: string) => s.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 16);
export const cleanName = (s: string) => s.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12);

async function http(method: 'GET' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<unknown> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 7000);
  try {
    const res = await fetch(`${base()}/${path}`, {
      method, signal: ctl.signal,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

const room = () => cleanRoom(getPlayer().room) || 'public';

/** 한 스테이지 점수와 전체 합계를 올린다 */
export async function submitScore(level: number, score: number, diff: number): Promise<void> {
  const p = getPlayer();
  const name = cleanName(p.name);
  if (!name) throw new Error('no name');
  const now = Date.now();
  await http('PUT', `r/${room()}/scores/${level}/${p.id}.json`, { name, score, diff, t: now });
  const n = Object.keys(allBestScores()).length;
  await http('PUT', `r/${room()}/totals/${p.id}.json`, { name, score: totalScore(), n, t: now });
}

/** 내 기록을 전부 올린다 (랭킹을 켜기 전에 쌓인 기록용) */
export async function submitAll(): Promise<number> {
  const best = allBestScores();
  let count = 0;
  for (const [lv, v] of Object.entries(best)) { await submitScore(Number(lv), v.score, v.diff); count++; }
  return count;
}

/** 온라인에 올린 내 기록(스테이지별과 전체 합계)을 모두 지운다. 현재 방 코드의 기록만 지운다 */
export async function clearMine(levels: number): Promise<void> {
  const id = getPlayer().id;
  const jobs = [http('DELETE', `r/${room()}/totals/${id}.json`)];
  for (let lv = 1; lv <= levels; lv++) jobs.push(http('DELETE', `r/${room()}/scores/${lv}/${id}.json`));
  await Promise.all(jobs);
}

function toList(data: unknown): Entry[] {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data as Record<string, Omit<Entry, 'id'>>)
    .filter(([, v]) => v && typeof v.score === 'number')
    .map(([id, v]) => ({ id, name: String(v.name ?? '?'), score: v.score, diff: v.diff ?? 1, n: v.n, t: v.t ?? 0 }))
    .sort((a, b) => b.score - a.score || a.t - b.t);
}

const q = (limit: number) => `?orderBy=${encodeURIComponent('"score"')}&limitToLast=${limit}`;

export async function fetchLevel(level: number, limit = 10): Promise<Entry[]> {
  return toList(await http('GET', `r/${room()}/scores/${level}.json${q(limit)}`));
}

export async function fetchTotals(limit = 10): Promise<Entry[]> {
  return toList(await http('GET', `r/${room()}/totals.json${q(limit)}`));
}
