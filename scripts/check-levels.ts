import { LEVELS } from '../src/data/levels.ts';
import { PathData } from '../src/game/path.ts';
import { ENEMIES } from '../src/data/enemies.ts';

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
  let hp = 0, gold = 0, n = 0;
  for (const w of lv.waves) for (const gr of w.groups) {
    const d = ENEMIES[gr.kind];
    hp += gr.count * d.hp / (1 - Math.min(d.armor, d.mr) * 0.5);
    gold += gr.count * d.gold; n += gr.count;
  }
  console.log(`L${String(lv.id).padStart(2)} ${lv.theme.padEnd(7)} 자리=${String(lv.spots.length).padStart(2)} 웨이브=${lv.waves.length} 적=${String(n).padStart(3)} 총HP=${String(Math.round(hp)).padStart(6)} 골드=${String(gold).padStart(5)} 시작골드=${lv.startGold} ~${Math.round((total + 45) / 6) / 10}분`);
}
process.exit(bad ? 1 : 0);
