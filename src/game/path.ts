export interface Vec { x: number; y: number }

export class PathData {
  readonly cum: number[] = [0];
  readonly total: number;
  readonly pts: Vec[];
  readonly air: boolean;

  constructor(pts: Vec[], air = false) {
    this.pts = pts;
    this.air = air;
    for (let i = 1; i < pts.length; i++) {
      this.cum.push(this.cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
    this.total = this.cum[this.cum.length - 1];
  }

  at(d: number): Vec {
    if (d <= 0) return { ...this.pts[0] };
    if (d >= this.total) return { ...this.pts[this.pts.length - 1] };
    let i = 1;
    while (this.cum[i] < d) i++;
    const t = (d - this.cum[i - 1]) / (this.cum[i] - this.cum[i - 1]);
    const a = this.pts[i - 1], b = this.pts[i];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  /** 점 p에서 가장 가까운 경로 위의 점 */
  nearest(p: Vec, step = 4): { pt: Vec; dist: number; d: number } {
    let best = { pt: this.pts[0], dist: Infinity, d: 0 };
    for (let d = 0; d <= this.total; d += step) {
      const q = this.at(d);
      const dist = Math.hypot(q.x - p.x, q.y - p.y);
      if (dist < best.dist) best = { pt: q, dist, d };
    }
    return best;
  }

  /** 경로 거리 d 지점에서 길이 가로로 뻗는지(true) 세로로 뻗는지(false). 대각선은 더 큰 쪽을 따른다 */
  horizontalAt(d: number): boolean {
    const a = this.at(d - 8), b = this.at(d + 8);
    return Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
  }
}

/**
 * 직선으로만 이어진 경로(꺾이는 점 목록)를 곡선 느낌으로 바꾼다.
 *  1) 꺾이는 모서리를 둥글게 깎는다 (모서리를 조절점으로 하는 2차 곡선, 반지름은 이웃 구간 길이의 45%까지)
 *  2) 긴 직선 구간에는 완만한 굽이(옆으로 흔들림)를 넣는다. 구간 양 끝에서는 0으로 줄여 모서리와 매끄럽게 이어지게 한다.
 * 굽이의 크기는 위치(좌표)로만 정해서, 두 갈래가 같은 구간을 함께 지나갈 때도 길이 정확히 겹친다.
 * 맨 처음과 맨 끝 점(화면 밖)은 그대로 둔다.
 */
export function curvePath(pts: Vec[], phase = 0, radius = 70, amp = 12, wave = 170): Vec[] {
  if (pts.length < 2) return pts;
  const n = pts.length;
  const len = (a: Vec, b: Vec) => Math.hypot(b.x - a.x, b.y - a.y);
  // 모서리마다 깎는 반지름 (꺾이지 않는 점은 0)
  const r = pts.map((q, i) => {
    if (i === 0 || i === n - 1) return 0;
    const a = pts[i - 1], b = pts[i + 1];
    const cross = (q.x - a.x) * (b.y - q.y) - (q.y - a.y) * (b.x - q.x);
    if (Math.abs(cross) < 1e-6) return 0;
    return Math.min(radius, 0.45 * len(a, q), 0.45 * len(q, b));
  });
  const out: Vec[] = [{ ...pts[0] }];
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i], b = pts[i + 1], L = len(a, b);
    const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
    const s0 = r[i], s1 = L - r[i + 1];                       // 모서리 곡선을 뺀 곧은 부분
    let nx = -uy, ny = ux;
    if (ny < 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }   // 진행 방향이 반대인 길과 같은 쪽으로 흔들리게 법선 방향을 하나로 정한다
    const alongX = Math.abs(ux) >= Math.abs(uy);
    for (let s = s0; s <= s1 + 1e-6; s += 8) {
      const ss = Math.min(s, s1);
      const x = a.x + ux * ss, y = a.y + uy * ss;
      const edge = Math.min(ss - s0, s1 - ss) / 45;           // 양 끝에서 0, 가운데로 갈수록 1
      const k = edge <= 0 ? 0 : edge >= 1 ? 1 : edge * edge * (3 - 2 * edge);
      const off = amp * k * Math.sin(((alongX ? x : y) / wave) * Math.PI * 2 + phase);
      if (ss > s0) out.push({ x: x + nx * off, y: y + ny * off });
      if (ss >= s1) break;
    }
    if (i < n - 2 && r[i + 1] > 0) {                           // 다음 모서리를 둥글게
      const c = b, c2 = pts[i + 2], L2 = len(c, c2);
      const p0 = { x: c.x - ux * r[i + 1], y: c.y - uy * r[i + 1] };
      const p1 = { x: c.x + ((c2.x - c.x) / L2) * r[i + 1], y: c.y + ((c2.y - c.y) / L2) * r[i + 1] };
      for (let k = 1; k <= 10; k++) {
        const t = k / 10, m = 1 - t;
        out.push({ x: m * m * p0.x + 2 * m * t * c.x + t * t * p1.x, y: m * m * p0.y + 2 * m * t * c.y + t * t * p1.y });
      }
    }
  }
  const last = pts[n - 1], tail = out[out.length - 1];
  if (Math.hypot(tail.x - last.x, tail.y - last.y) > 0.01) out.push({ ...last });
  return out;
}
