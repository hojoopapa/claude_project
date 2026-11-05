const KEY = 'realmguard.save.v1';

interface SaveData { stars: Record<number, number>; scores?: Record<number, { score: number; diff: number }> }

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as SaveData;
  } catch { /* storage unavailable */ }
  return { stars: {} };
}

export function getStars(levelId: number): number {
  return load().stars[levelId] ?? 0;
}

export function saveStars(levelId: number, stars: number): void {
  const d = load();
  d.stars[levelId] = Math.max(d.stars[levelId] ?? 0, stars);
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ }
}

/** 스테이지별 내 최고 점수 */
export function getBestScore(levelId: number): { score: number; diff: number } | null {
  return load().scores?.[levelId] ?? null;
}

/** 최고 점수를 갱신한다. 신기록이면 true. */
export function saveBestScore(levelId: number, score: number, diff: number): boolean {
  const d = load();
  d.scores ??= {};
  const prev = d.scores[levelId]?.score ?? 0;
  if (score <= prev) return false;
  d.scores[levelId] = { score, diff };
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ }
  return true;
}

/** 내 최고 점수를 모두 지운다. 별(클리어 기록)은 그대로 둔다. */
export function resetScores(): void {
  const d = load();
  delete d.scores;
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ }
}

export function allBestScores(): Record<number, { score: number; diff: number }> {
  return load().scores ?? {};
}

export function totalScore(): number {
  return Object.values(allBestScores()).reduce((a, v) => a + v.score, 0);
}

const PLAYER_KEY = 'realmguard.player.v1';
export interface Player { id: string; name: string; room: string }

/** 랭킹용 플레이어 정보 (익명 id, 닉네임, 친구끼리 쓰는 방 코드) */
export function getPlayer(): Player {
  let p: Partial<Player> = {};
  try { p = JSON.parse(localStorage.getItem(PLAYER_KEY) ?? '{}'); } catch { /* ignore */ }
  if (!p.id) {
    p.id = (Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/[^a-z0-9]/g, '').slice(0, 20);
    p.name ??= '';
    p.room ??= 'public';
    try { localStorage.setItem(PLAYER_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  }
  return { id: p.id, name: p.name ?? '', room: p.room ?? 'public' };
}

export function setPlayer(patch: Partial<Pick<Player, 'name' | 'room'>>): void {
  const p = { ...getPlayer(), ...patch };
  try { localStorage.setItem(PLAYER_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

const TUT_KEY = 'realmguard.tutorial.v1';
const DIFF_KEY = 'realmguard.difficulty.v1';

/** 설명창을 이미 봤는지. 주소에 ?tutorial=always 가 있으면 매번 다시 보여준다. */
export function tutorialSeen(key: string): boolean {
  if (new URLSearchParams(location.search).get('tutorial') === 'always') return false;
  try { return !!JSON.parse(localStorage.getItem(TUT_KEY) ?? '{}')[key]; } catch { return false; }
}

export function markTutorialSeen(key: string): void {
  try {
    const d = JSON.parse(localStorage.getItem(TUT_KEY) ?? '{}');
    d[key] = true;
    localStorage.setItem(TUT_KEY, JSON.stringify(d));
  } catch { /* ignore */ }
}

export function getDifficulty(): 0 | 1 | 2 {
  try {
    const v = Number(localStorage.getItem(DIFF_KEY));
    if (v === 0 || v === 2) return v;
  } catch { /* ignore */ }
  return 1;
}

export function setDifficulty(v: 0 | 1 | 2): void {
  try { localStorage.setItem(DIFF_KEY, String(v)); } catch { /* ignore */ }
}
