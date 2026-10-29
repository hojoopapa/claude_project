import { LEVELS } from '../src/data/levels.ts';
import { PathData } from '../src/game/path.ts';

let bad = 0;
for (const lv of LEVELS) {
  const paths = lv.paths.filter((p) => !p.air).map((p) => new PathData(p.pts));
  lv.spots.forEach((s, i) => {
    const d = Math.min(...paths.map((p) => p.nearest(s).dist));
    if (d < 42) { console.log(`L${lv.id} spot#${i} (${s.x},${s.y}) 길과 너무 가까움 ${d.toFixed(0)}`); bad++; }
    if (d > 110) console.log(`L${lv.id} spot#${i} (${s.x},${s.y}) 길에서 멀음 ${d.toFixed(0)}`);
    if (s.x < 30 || s.x > 930 || s.y < 40 || s.y > 520) { console.log(`L${lv.id} spot#${i} 화면 밖/가장자리`); bad++; }
    lv.spots.forEach((o, j) => {
      if (j > i && Math.hypot(o.x - s.x, o.y - s.y) < 55) { console.log(`L${lv.id} spot#${i}-#${j} 너무 가까움`); bad++; }
    });
  });
  const total = lv.waves.reduce((a, w) => a + (w.time || 25), 0);
  console.log(`L${lv.id} ${lv.name}: spots=${lv.spots.length} waves=${lv.waves.length} 예상 ~${Math.round(total / 60 * 10) / 10}분(자동진행 기준)`);
}
process.exit(bad ? 1 : 0);
