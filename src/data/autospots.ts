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

/**
 * 건설 자리 그림(66x45, 중심이 4px 아래)이 길(폭 60)에 닿지 않게 한다.
 * 길 중심에서 필요한 거리 = 길 반폭 30 + 자리 그림이 길 쪽으로 뻗은 길이(옆으로 33, 위아래로 26).
 * 모든 길(갈래 포함)에서 이 거리를 지키는 가장 가까운 위치를 원래 자리 주변 38px 안에서 찾고(화면 x 30~930, y 46~458, 다른 자리와 50px 이상),
 * 없으면 길에서 가장 멀어지는 위치를 쓴다. 직접 찍은 자리와 자동 자리 모두 적용한다.
 */
export function clearRoad(spots: Vec[], groundPaths: Vec[][]): Vec[] {
  const paths = groundPaths.map((p) => new PathData(p));
  /** 모든 길에 대해 (실제 거리 - 필요한 거리) 중 가장 작은 값. 0 이상이면 길을 침범하지 않는다 */
  const slack = (x: number, y: number) => {
    let m = Infinity;
    for (const p of paths) {
      const n = p.nearest({ x, y });
      const d = n.dist || 1;
      m = Math.min(m, n.dist - (31 + Math.abs((x - n.pt.x) / d) * 33 + Math.abs((y - n.pt.y) / d) * 26));
    }
    return m;
  };
  const out: Vec[] = [];
  for (const s of spots) {
    const clash = (x: number, y: number) => out.some((o) => Math.hypot(o.x - x, o.y - y) < 50);
    let best: Vec | null = slack(s.x, s.y) >= 0 ? { x: s.x, y: s.y } : null;
    let far: { p: Vec; sl: number } = { p: { x: s.x, y: s.y }, sl: slack(s.x, s.y) };
    for (let r = 2; !best && r <= 38; r += 2) {
      for (let a = 0; a < 360; a += 10) {
        const x = Math.round(s.x + r * Math.cos((a * Math.PI) / 180)), y = Math.round(s.y + r * Math.sin((a * Math.PI) / 180));
        if (x < 30 || x > 930 || y < 46 || y > 458) continue;
        const sl = slack(x, y);
        if (sl > far.sl && !clash(x, y)) far = { p: { x, y }, sl };
        if (sl >= 0 && !clash(x, y)) { best = { x, y }; break; }
      }
    }
    out.push(best ?? far.p);
  }
  return out;
}
