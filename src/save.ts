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
