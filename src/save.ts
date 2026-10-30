const KEY = 'realmguard.save.v1';

interface SaveData { stars: Record<number, number> }

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
