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
  nearest(p: Vec, step = 4): { pt: Vec; dist: number } {
    let best = { pt: this.pts[0], dist: Infinity };
    for (let d = 0; d <= this.total; d += step) {
      const q = this.at(d);
      const dist = Math.hypot(q.x - p.x, q.y - p.y);
      if (dist < best.dist) best = { pt: q, dist };
    }
    return best;
  }
}
