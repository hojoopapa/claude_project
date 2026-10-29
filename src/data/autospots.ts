import { PathData, type Vec } from '../game/path.ts';

/**
 * 지상 경로 옆에서 사거리 안에 길이 가장 많이 들어오는 자리를 고른다.
 * 길에서 50~78px, 서로 72px 이상 떨어지고, 먼저 고른 자리와 가까울수록 감점해서 고르게 퍼뜨린다.
 */
export function autoSpots(groundPaths: Vec[][], count: number): Vec[] {
  const paths = groundPaths.map((p) => new PathData(p));
  const fine: Vec[] = [];
  const cover: Vec[] = [];
  for (const p of paths) {
    for (let d = 0; d <= p.total; d += 6) fine.push(p.at(d));
    for (let d = 0; d <= p.total; d += 14) cover.push(p.at(d));
  }
  const cands: { x: number; y: number; cov: number }[] = [];
  for (let y = 70; y <= 450; y += 10) {
    for (let x = 40; x <= 920; x += 10) {
      let dmin = Infinity;
      for (const s of fine) { const d = Math.hypot(s.x - x, s.y - y); if (d < dmin) dmin = d; }
      if (dmin < 50 || dmin > 78) continue;
      let cov = 0;
      for (const s of cover) if (Math.hypot(s.x - x, s.y - y) <= 135) cov++;
      cands.push({ x, y, cov });
    }
  }
  const picked: Vec[] = [];
  while (picked.length < count) {
    let best: { x: number; y: number; score: number } | null = null;
    for (const c of cands) {
      let near = 0, tooClose = false;
      for (const q of picked) {
        const d = Math.hypot(q.x - c.x, q.y - c.y);
        if (d < 72) { tooClose = true; break; }
        if (d < 135) near++;
      }
      if (tooClose) continue;
      const score = c.cov * (1 - 0.2 * near);
      if (!best || score > best.score || (score === best.score && (c.y < best.y || (c.y === best.y && c.x < best.x)))) {
        best = { x: c.x, y: c.y, score };
      }
    }
    if (!best) break;
    picked.push({ x: best.x, y: best.y });
  }
  return picked;
}
