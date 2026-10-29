// 밸런스 시뮬레이터: 기본 타워 + 스펠만 쓰는 봇이 각 스테이지를 어떻게 푸는지 본다.
// 사용법: npm run dev (5199 포트) 후  node scripts/balance-sim.cjs <출력폴더> [스테이지,스테이지...]
// playwright가 필요하다. 봇은 영웅/광고 해제 타워를 쓰지 않으므로 사람보다 약하다.
const { chromium } = require('playwright');
const SP = process.argv[2] || '.';
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 960, height: 640 } });
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await pg.goto('http://localhost:5199/');
  await pg.waitForTimeout(1200);
  console.log('lvl  결과  남은생명  시간(s)  웨이브  타워  남은골드');
  for (let i = 0; i < 20; i++) {
    if (only && !only.includes(i + 1)) continue;
    await pg.evaluate((idx) => window.__game.scene.start('Game', { index: idx }), i);
    await pg.waitForTimeout(500);
    
    const r = await pg.evaluate(() => {
      const s = window.__game.scene.getScene('Game');
      const order = ['archer', 'mage', 'barracks', 'cannon', 'mage', 'archer', 'barracks', 'mage'];
      const COST = { archer: 70, barracks: 80, mage: 100, cannon: 120 };
      let k = 0, steps = 0; const wl = []; let lastW = -2;
      const lead = () => s.enemies.reduce((a, b) => (!a || b.d > a.d ? b : a), null);
      while (!s.over && steps < 20000) {
        if (s.spellCd.fire <= 0 && s.enemies.length >= 5) { const l = lead(); s.castSpell('fire', l.x, l.y); }
        if (s.spellCd.reinf <= 0 && s.enemies.length > 0) { const l = lead(); s.castSpell('reinf', l.x, l.y); }
        const free = s.spots.filter(x => !x.tower);
        let up = null;
        for (const t of s.towers) if (!t.maxed && s.gold >= t.upgradeCost && (!up || t.upgradeCost < up.upgradeCost)) up = t;
        const kind = order[k % order.length];
        const canBuild = free.length && s.gold >= COST[kind];
        if (up && (s.towers.length >= 6 || !free.length) && !(s.towers.length < 6)) { s.gold -= up.upgradeCost; up.upgrade(); }
        else if (canBuild) { s.buildTower(free[0], kind); k++; }
        else if (up && s.towers.length >= 6) { s.gold -= up.upgradeCost; up.upgrade(); }
        if (s.waveIdx !== lastW) { wl.push(s.lives); lastW = s.waveIdx; }
        s.step(0.05); steps++;
      }
      return { lives: s.lives, time: Math.round(s.clock), wave: s.waveIdx + 1, towers: s.towers.length, gold: Math.floor(s.gold), over: s.over, wl: wl.join(',') };
    });
    console.log(String(i + 1).padStart(3), (r.over ? (r.lives > 0 ? '승리' : '패배') : '미종료').padEnd(4), String(r.lives).padStart(6), String(r.time).padStart(8), String(r.wave).padStart(6), String(r.towers).padStart(5), String(r.gold).padStart(8), ' 웨이브시작시 생명:', r.wl);
  }
  console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 5).join('\n') : 'none');
  await b.close();
})();
