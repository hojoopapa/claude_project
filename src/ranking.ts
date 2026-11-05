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
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
    return await res.json();
  } finally { clearTimeout(timer); }
}

const room = () => cleanRoom(getPlayer().room) || 'public';

/**
 * 이름 중복 방지. 방마다 이름 장부 r/<방>/names/<이름 키> = 그 이름을 쓰는 플레이어 id 를 둔다.
 * 규칙이 "이미 있는 키는 쓰기 거부"라서 두 명이 동시에 같은 이름을 눌러도 한 명만 성공한다.
 * 이름 키는 대소문자, 공백을 무시한 이름의 UTF-8 16진수다 (Firebase 키에 쓸 수 없는 글자를 피한다).
 * 로그인이 없어서 장부를 직접 지우는 사람까지 막지는 못한다 (친구끼리 쓰는 용도의 한계, docs/ranking-setup.md 참고).
 */
export const nameKey = (name: string): string =>
  Array.from(new TextEncoder().encode(name.normalize('NFKC').toLowerCase().replace(/\s+/g, '')))
    .map((b) => b.toString(16).padStart(2, '0')).join('');

export class NameTakenError extends Error { constructor() { super('name-taken'); } }

const CLAIM_KEY = 'realmguard.claim.v1';
const claimId = (name: string) => `${room()}:${getPlayer().id}:${nameKey(name)}`;
const claimedBefore = (name: string): boolean => { try { return localStorage.getItem(CLAIM_KEY) === claimId(name); } catch { return false; } };
const rememberClaim = (name: string | null): void => {
  try { if (name) localStorage.setItem(CLAIM_KEY, claimId(name)); else localStorage.removeItem(CLAIM_KEY); } catch { /* ignore */ }
};

/** 이 이름을 내가 쓰도록 장부에 올린다. ok = 내 이름, taken = 다른 사람이 쓰는 이름, error = 확인 실패 (연결, 규칙 문제) */
export async function claimName(name: string): Promise<'ok' | 'taken' | 'error'> {
  if (claimedBefore(name)) return 'ok';
  const path = `r/${room()}/names/${nameKey(name)}.json`;
  const me = getPlayer().id;
  const verdict = (cur: unknown): 'ok' | 'taken' | null => (cur === me ? 'ok' : cur ? 'taken' : null);
  try {
    const first = verdict(await http('GET', path));
    if (first) { if (first === 'ok') rememberClaim(name); return first; }
    await http('PUT', path, me);
    rememberClaim(name);
    return 'ok';
  } catch {
    // 쓰기가 거부됐다면 그 사이 다른 사람이 가져갔을 수 있으니 한 번 더 읽어서 판단한다
    try {
      const again = verdict(await http('GET', path));
      if (again === 'ok') rememberClaim(name);
      if (again) return again;
    } catch { /* ignore */ }
    return 'error';
  }
}

/** 장부에서 내 이름을 뺀다 (이름을 바꾸거나 내 기록을 지울 때). 남이 쓰는 이름이면 건드리지 않는다 */
export async function releaseName(name: string): Promise<void> {
  if (!name) return;
  const path = `r/${room()}/names/${nameKey(name)}.json`;
  try {
    if ((await http('GET', path)) === getPlayer().id) await http('DELETE', path);
    rememberClaim(null);
  } catch { /* 지우지 못해도 기록 삭제와 이름 변경은 계속한다 */ }
}

/** 한 스테이지 점수와 전체 합계를 올린다 */
export async function submitScore(level: number, score: number, diff: number): Promise<void> {
  const p = getPlayer();
  const name = cleanName(p.name);
  if (!name) throw new Error('no name');
  const claim = await claimName(name);        // 내 이름으로 확정돼 있어야만 올린다
  if (claim === 'taken') throw new NameTakenError();
  if (claim === 'error') throw new Error('name-check');
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
  await releaseName(cleanName(getPlayer().name));   // 이름도 다른 사람이 쓸 수 있게 풀어 준다
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
