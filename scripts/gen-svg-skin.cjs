#!/usr/bin/env node
// SVG 스킨 생성기: public/skins/svg/ 아래에 SVG 50개와 index.json 을 만든다.
// 사용법: node scripts/gen-svg-skin.cjs
// 그림을 고치려면 이 파일을 수정하고 다시 실행한다. 크기(out_w x out_h)는 docs/art/manifest.json 을 따르며,
// 게임은 이 크기(표시 크기의 2배)로 SVG를 불러와 0.5배로 그린다. 모든 스프라이트는 오른쪽을 본다.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTDIR = path.join(ROOT, 'public/skins/svg');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/art/manifest.json'), 'utf8'));
const M = Object.fromEntries(manifest.assets.map((a) => [a.key, a]));

const OUT = '#2b1b12';

// ---------- 공통 그라데이션 ----------
const lg = (id, cols, dir = 'd') => {
  const [x2, y2] = dir === 'h' ? [1, 0] : dir === 'v' ? [0, 1] : [1, 1];
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${cols.map((c, i) => `<stop offset="${(i / (cols.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
};
const rg = (id, cols, cx = 0.4, cy = 0.35) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r=".8">${cols.map((c, i) => `<stop offset="${(i / (cols.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</radialGradient>`;

const DEFS = `<defs>${[
  lg('stone', ['#d6cebd', '#ada591', '#80776a'], 'h'),
  lg('stoneB', ['#d4dcee', '#a3aecb', '#6e7a9c'], 'h'),
  lg('stoneD', ['#8a8a9a', '#5d5c6d', '#3c3b49'], 'h'),
  lg('wood', ['#c48f52', '#7d512b'], 'v'),
  lg('roofG', ['#86d25f', '#2d7a34']),
  lg('roofR', ['#ee6a58', '#9c2a22']),
  lg('roofP', ['#a67ae8', '#4a2c98']),
  lg('steel', ['#eef2f6', '#b3bcc7', '#7a8593']),
  lg('gold', ['#ffe27a', '#c8901a']),
  lg('blue', ['#5b9be8', '#1f4c9a']),
  lg('copper', ['#f0b27a', '#a35f2e']),
  lg('ice', ['#f2fdff', '#8fdcf5', '#3d98cf']),
  lg('iron', ['#7c7c88', '#2f2f38']),
  lg('lava', ['#ffd24a', '#ff6a1a']),
  rg('goblin', ['#aee572', '#4f9e32']),
  rg('orc', ['#6fae4a', '#2f6a22']),
  rg('wolf', ['#b8bec9', '#6c7380']),
  rg('ogre', ['#b27a4c', '#6a4126']),
  rg('rock', ['#b9b9c2', '#6a6a78']),
  rg('wisp', ['#ffffff', '#9ae9ff', '#2fa6e0']),
  rg('drake', ['#e8604e', '#8c1c1c']),
  rg('bat', ['#8f5cc0', '#4a2a68']),
  rg('ghost', ['#eaffff', '#9bded6', '#4fa8a0']),
  rg('orb', ['#ffffff', '#d9a8ff', '#8a4fe0']),
  rg('glowY', ['#fffbd0', '#ffe14a', '#ff9d1a']),
  rg('glowC', ['#ffffff', '#a8f0ff', '#2fb8e8']),
].join('')}</defs>`;

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${DEFS}` +
  `<g stroke="${OUT}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;

const thin = (c = '#6b6455', w = 3) => `stroke="${c}" stroke-width="${w}" fill="none"`;
const nos = 'stroke="none"';

// ---------- 타워 ----------
const TW = 256, TH = 320;
const foundation = () => `<path d="M44 302 Q128 320 212 302 L202 274 L54 274 Z" fill="url(#stone)"/>`;
const stoneLines = (x1, x2) => `<g ${thin('#7a7262', 3)} opacity=".85"><path d="M${x1} 250 H${x2} M${x1 + 3} 224 H${x2 - 3} M${x1 + 6} 198 H${x2 - 6}"/><path d="M104 250 V224 M146 250 V224 M124 224 V198 M160 224 V198"/></g>`;
const door = (fill = '#4e321d') => `<path d="M110 276 V248 a18 18 0 0 1 36 0 V276 Z" fill="${fill}"/>`;
const flag = (x, y, c = '#d9362b', n = 1) => `<path d="M${x} ${y} V${y - 24}" stroke-width="4"/><path d="M${x} ${y - 22} L${x + 34 * n} ${y - 12} L${x} ${y - 2} Z" fill="${c}"/>`;
const archerFig = (x, y, c = '#3f9c46') =>
  `<path d="M${x - 10} ${y} L${x - 5} ${y - 28} H${x + 9} L${x + 13} ${y} Z" fill="${c}"/><circle cx="${x}" cy="${y - 38}" r="11" fill="#f2c48f"/><path d="M${x - 13} ${y - 40} Q${x} ${y - 58} ${x + 13} ${y - 40} Z" fill="#2d7a34"/>` +
  `<path d="M${x + 17} ${y - 52} Q${x + 33} ${y - 26} ${x + 17} ${y}" fill="none" stroke="#6b3f1a" stroke-width="5"/><path d="M${x + 17} ${y - 52} V${y}" stroke="#e8dcc0" stroke-width="2"/>`;

function archer(l) {
  const wide = l >= 2 ? 6 : 0;
  let s = foundation();
  s += `<path d="M${72 - wide} 276 L86 152 H170 L${184 + wide} 276 Z" fill="url(#stone)"/>` + stoneLines(76, 182) + door();
  if (l >= 2) s += `<rect x="78" y="212" width="100" height="10" fill="#6d6d7c"/><rect x="82" y="168" width="92" height="9" fill="#6d6d7c"/>`;
  s += `<path d="M60 152 H196 L188 176 H68 Z" fill="url(#wood)"/><g ${thin('#5a3a1f', 2.5)}><path d="M92 152 V176 M128 152 V176 M164 152 V176"/></g>`;
  s += `<rect x="92" y="98" width="72" height="56" fill="url(#stone)"/><rect x="119" y="110" width="18" height="28" rx="9" fill="${OUT}"/>`;
  s += `<path d="M64 104 L128 26 L192 104 Q128 118 64 104Z" fill="url(#roofG)"/><g ${thin('#1f5a27', 3)}><path d="M82 100 Q128 108 174 100 M96 82 Q128 90 160 82 M110 62 Q128 68 146 62"/></g>`;
  if (l >= 3) s += `<path d="M64 104 Q128 118 192 104" fill="none" stroke="url(#gold)" stroke-width="7"/><path d="M128 26 L132 8 L124 8 Z" fill="url(#gold)"/>`;
  s += flag(128, 26, l >= 3 ? '#f2c230' : '#d9362b', l >= 3 ? 1.4 : 1);
  s += archerFig(78, 152);
  if (l >= 2) s += archerFig(178, 152, '#2f8a9c');
  if (l >= 3) s += `<path d="M64 152 V138 M192 152 V138 M60 138 H196" stroke="url(#gold)" stroke-width="4" fill="none"/>`;
  return svg(TW, TH, s);
}

function mage(l) {
  let s = foundation();
  s += `<path d="M96 276 L102 140 H154 L162 276 Z" fill="url(#stoneB)"/>`;
  s += `<g ${thin('#6a7596', 3)}><path d="M98 250 H160 M99 222 H158 M101 194 H156 M102 166 H154"/></g>`;
  s += door('#3a2a5a') + `<rect x="120" y="170" width="16" height="26" rx="8" fill="#7ee8ff" stroke-width="3.5"/>`;
  s += `<path d="M78 148 Q128 160 178 148 L128 44 Z" fill="url(#roofP)"/>`;
  s += `<g ${thin('#2c1a68', 3)}><path d="M96 130 Q128 140 160 130 M108 108 Q128 114 148 108"/></g>`;
  if (l >= 2) s += `<g fill="#7ee8ff" ${nos}><circle cx="112" cy="214" r="4"/><circle cx="144" cy="236" r="4"/><circle cx="118" cy="256" r="3.5"/></g>`;
  if (l >= 3) s += `<ellipse cx="128" cy="96" rx="62" ry="14" fill="none" stroke="url(#gold)" stroke-width="6"/><path d="M78 148 Q128 160 178 148" fill="none" stroke="url(#gold)" stroke-width="7"/>`;
  const crystal = (x, y, k = 1) => `<circle cx="${x}" cy="${y}" r="${26 * k}" fill="url(#glowC)" opacity=".45" ${nos}/><path d="M${x} ${y - 24 * k} L${x + 12 * k} ${y} L${x} ${y + 24 * k} L${x - 12 * k} ${y} Z" fill="url(#glowC)" stroke-width="4"/>`;
  s += crystal(128, 22, l >= 3 ? 1.25 : 1);
  if (l >= 2) s += crystal(78, 66, 0.6) + crystal(178, 58, 0.6);
  if (l >= 3) s += crystal(128, 70, 0.5);
  return svg(TW, TH, s);
}

function cannon(l) {
  let s = foundation();
  s += `<path d="M54 276 Q50 214 62 172 H194 Q206 214 202 276 Z" fill="url(#stone)"/>`;
  s += `<g ${thin('#7a7262', 3)} opacity=".85"><path d="M56 250 H200 M54 224 H202 M58 198 H198"/><path d="M92 250 V224 M156 250 V224 M124 224 V198 M180 224 V198 M96 198 V176"/></g>`;
  if (l >= 2) {
    const band = l >= 3 ? 'url(#gold)' : 'url(#iron)';
    s += `<rect x="56" y="214" width="144" height="12" fill="${band}"/><rect x="60" y="188" width="136" height="10" fill="${band}"/>`;
  }
  s += door();
  s += `<path d="M50 172 H206 V152 H188 V164 H168 V152 H148 V164 H128 V152 H108 V164 H88 V152 H68 V164 H50 Z" fill="url(#stone)"/>`;
  if (l >= 3) s += `<g fill="url(#gold)"><path d="M66 152 L74 132 L82 152 Z"/><path d="M174 152 L182 132 L190 152 Z"/></g>`;
  // 포
  const barrel = (rot, len, th) =>
    `<g transform="rotate(${rot} 128 150)"><rect x="118" y="${150 - th / 2}" width="${len}" height="${th}" rx="${th / 3}" fill="url(#iron)"/><rect x="${118 + len - 12}" y="${150 - th / 2 - 4}" width="14" height="${th + 8}" rx="5" fill="#3a3a44"/><circle cx="${118 + len + 4}" cy="150" r="${th / 3.4}" fill="#0e0e12" stroke="none"/></g>`;
  s += `<path d="M108 168 L148 168 L140 140 L116 140 Z" fill="url(#wood)"/>`;
  s += barrel(-38, 70 + l * 8, 34 + l * 3);
  if (l >= 3) s += barrel(-12, 70, 30);
  s += `<circle cx="128" cy="150" r="16" fill="#4a4a56"/><circle cx="128" cy="150" r="6" fill="#a8a8b6" stroke-width="3"/>`;
  s += `<g fill="#26262e"><circle cx="80" cy="294" r="10"/><circle cx="102" cy="296" r="10"/><circle cx="92" cy="282" r="10"/></g><g fill="#9a9aa6" ${nos}><circle cx="77" cy="291" r="3"/><circle cx="99" cy="293" r="3"/><circle cx="89" cy="279" r="3"/></g>`;
  if (l >= 3) s += flag(190, 152, '#f2c230');
  return svg(TW, TH, s);
}

function barracks(l) {
  let s = foundation();
  if (l >= 3) {
    s += `<rect x="102" y="86" width="52" height="90" fill="url(#stone)"/><path d="M96 90 L128 42 L160 90 Z" fill="url(#roofR)"/>`;
    s += `<path d="M30 276 V170 H70 V276 Z" fill="url(#stone)"/><path d="M26 174 L50 128 L74 174 Z" fill="url(#roofR)"/>`;
    s += `<path d="M186 276 V170 H226 V276 Z" fill="url(#stone)"/><path d="M182 174 L206 128 L230 174 Z" fill="url(#roofR)"/>`;
    s += flag(128, 44, '#f2c230', 1.3) + flag(50, 130, '#3a7bd5') + flag(206, 130, '#3a7bd5');
  } else if (l === 2) {
    s += `<path d="M178 276 V170 H222 V276 Z" fill="url(#stone)"/><path d="M174 174 L200 126 L226 174 Z" fill="url(#roofR)"/>` + flag(200, 128, '#3a7bd5');
  }
  const x0 = l >= 3 ? 70 : 40, x1 = l >= 3 ? 186 : l === 2 ? 180 : 216;
  s += `<path d="M${x0} 276 V172 H${x1} V276 Z" fill="url(#wood)"/><g ${thin('#5a3a1f', 2.5)}><path d="M${x0 + 24} 172 V276 M${x0 + 52} 172 V276 M${x0 + 80} 172 V276"/></g>`;
  s += `<path d="M${x0 - 14} 178 L${x0 + 18} 118 H${x1 - 18} L${x1 + 14} 178 Z" fill="url(#roofR)"/>`;
  s += `<g ${thin('#7a1f19', 3)}><path d="M${x0 + 4} 160 H${x1 - 4} M${x0 + 18} 142 H${x1 - 18}"/></g>`;
  const cx = (x0 + x1) / 2;
  s += `<path d="M${cx - 22} 276 V240 a22 22 0 0 1 44 0 V276 Z" fill="#3c2616"/><path d="M${cx} 218 V276" stroke="#6b4426" stroke-width="3"/>`;
  s += `<g fill="#ffb040"><path d="M${cx - 40} 238 q5 -12 10 0 q-5 8 -10 0Z"/><path d="M${cx + 30} 238 q5 -12 10 0 q-5 8 -10 0Z"/></g>`;
  if (l < 3) s += flag(x0 + 6, 120, '#3a7bd5');
  if (l === 2) s += `<g stroke-width="3"><path d="M${x1 - 36} 262 V226 M${x1 - 48} 262 V230" /><path d="M${x1 - 40} 226 l-8 -14 M${x1 - 48} 230 l-8 -14" stroke="#cfd3d8"/></g>`;
  return svg(TW, TH, s);
}

function frost(l) {
  let s = foundation();
  s += `<path d="M92 276 L100 150 H156 L164 276 Z" fill="url(#stoneB)"/>`;
  s += `<g ${thin('#6a7596', 3)}><path d="M94 250 H162 M96 222 H160 M98 194 H158 M99 168 H157"/></g>`;
  s += door('#2d3c63') + `<rect x="120" y="172" width="16" height="22" rx="8" fill="#bff3ff" stroke-width="3.5"/>`;
  s += `<path d="M80 156 H176 L168 134 H88 Z" fill="url(#stoneB)"/>`;
  s += `<path d="M80 156 q10 -16 20 0 q10 -14 20 0 q10 -16 20 0 q10 -14 20 0 q10 -12 16 0 Z" fill="#ffffff"/>`;
  const cr = (x, y, w, h, op = 1) => `<g opacity="${op}"><path d="M${x} ${y - h} L${x + w} ${y - h * 0.35} L${x + w * 0.55} ${y} H${x - w * 0.55} L${x - w} ${y - h * 0.35} Z" fill="url(#ice)"/><path d="M${x} ${y - h} L${x + w * 0.2} ${y - h * 0.4} L${x} ${y}" fill="none" stroke="#ffffff" stroke-width="3" opacity=".7"/></g>`;
  if (l >= 3) s += `<circle cx="128" cy="86" r="76" fill="#bff3ff" opacity=".28" ${nos}/>`;
  s += cr(128, 138, 26, l >= 3 ? 124 : 104);
  if (l >= 2) s += cr(92, 144, 16, 58) + cr(164, 144, 16, 66);
  if (l >= 3) s += cr(66, 152, 12, 40) + cr(190, 152, 12, 44);
  if (l >= 2) s += `<g fill="#ffffff" opacity=".8" ${nos}><circle cx="70" cy="262" r="6"/><circle cx="186" cy="268" r="7"/><circle cx="100" cy="294" r="5"/></g>`;
  if (l >= 3) s += `<g fill="#ffffff" ${nos}><path d="M52 90 l4 -10 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 Z"/><path d="M200 60 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 Z"/></g>`;
  return svg(TW, TH, s);
}

function thunder(l) {
  let s = foundation();
  s += `<path d="M86 276 L98 150 H158 L170 276 Z" fill="url(#stoneD)"/>`;
  s += `<g ${thin('#2c2b36', 3)}><path d="M90 250 H166 M93 222 H163 M95 194 H161 M97 168 H159"/></g>`;
  s += door('#1c1822') + `<rect x="121" y="172" width="14" height="22" rx="7" fill="#ffe14a" stroke-width="3.5"/>`;
  s += `<path d="M82 156 H174 V140 H82 Z" fill="url(#iron)"/>`;
  s += `<rect x="120" y="70" width="16" height="72" fill="url(#iron)"/>`;
  const coil = (y, w) => `<ellipse cx="128" cy="${y}" rx="${w}" ry="${w * 0.34}" fill="none" stroke="url(#copper)" stroke-width="9"/><ellipse cx="128" cy="${y}" rx="${w}" ry="${w * 0.34}" fill="none" stroke="${OUT}" stroke-width="2"/>`;
  s += coil(128, 34) + coil(108, 30);
  if (l >= 2) s += coil(88, 26);
  if (l >= 3) s += coil(68, 22);
  const top = l >= 3 ? 46 : l === 2 ? 44 : 52;
  const r = l >= 3 ? 30 : 24;
  s += `<circle cx="128" cy="${top}" r="${r + 14}" fill="url(#glowY)" opacity=".4" ${nos}/><circle cx="128" cy="${top}" r="${r}" fill="url(#glowY)"/>`;
  const bolt = (x, y, k = 1) => `<path d="M${x} ${y} l${-9 * k} ${18 * k} h${8 * k} l${-6 * k} ${16 * k} l${16 * k} ${-22 * k} h${-9 * k} l${7 * k} ${-12 * k} Z" fill="#fff27a" stroke-width="2.5"/>`;
  if (l >= 2) s += bolt(78, 74, 1.1) + bolt(184, 80, 1);
  if (l >= 3) s += bolt(56, 40, 0.9) + bolt(204, 46, 0.9);
  if (l >= 3) s += `<path d="M84 140 L70 100 M172 140 L186 100" stroke="url(#iron)" stroke-width="7"/><circle cx="70" cy="98" r="6" fill="#ffe14a" stroke-width="3"/><circle cx="186" cy="98" r="6" fill="#ffe14a" stroke-width="3"/>`;
  return svg(TW, TH, s);
}

// ---------- 병사 / 영웅 ----------
function soldier() {
  return svg(130, 150, `
  <path d="M40 112 L36 140 H58 L60 112 Z" fill="url(#steel)"/><path d="M68 112 L72 140 H94 L84 112 Z" fill="url(#steel)"/>
  <path d="M34 140 q-2 8 10 8 H62 L58 140 Z" fill="#6c4a26"/><path d="M70 140 q0 8 12 8 H98 q2 -8 -6 -8 Z" fill="#6c4a26"/>
  <path d="M38 62 Q66 54 92 62 L96 116 H34 Z" fill="url(#blue)"/>
  <path d="M34 106 H96 V118 H34 Z" fill="#6c4a26"/>
  <path d="M92 74 Q112 78 116 96" fill="none" stroke="${OUT}" stroke-width="14"/><path d="M92 74 Q112 78 116 96" fill="none" stroke="url(#steel)" stroke-width="7"/>
  <path d="M112 96 L124 40 L130 44 L120 100 Z" fill="url(#steel)" stroke-width="3.5"/>
  <path d="M40 78 L66 78 V104 Q66 118 53 124 Q40 118 40 104 Z" fill="url(#gold)" transform="translate(-14 -4)"/>
  <circle cx="66" cy="42" r="22" fill="#f2c48f"/>
  <path d="M42 44 Q42 14 66 14 Q90 14 90 44 H80 V36 H52 V44 Z" fill="url(#steel)"/>
  <circle cx="74" cy="46" r="3.5" fill="${OUT}" stroke="none"/><circle cx="58" cy="46" r="3.5" fill="${OUT}" stroke="none"/>`);
}

function knight() {
  return svg(220, 260, `
  <path d="M84 96 Q40 150 52 226 L104 206 L120 110 Z" fill="#c7352b"/><path d="M84 96 Q56 150 62 214" fill="none" stroke="#8f1f19" stroke-width="3"/>
  <path d="M92 176 L88 230 H116 L118 176 Z" fill="url(#steel)"/><path d="M122 176 L128 230 H154 L142 176 Z" fill="url(#steel)"/>
  <path d="M84 230 Q80 246 100 246 H120 L116 230 Z" fill="#6c4a26"/><path d="M124 230 Q124 246 144 246 H164 Q166 232 154 230 Z" fill="#6c4a26"/>
  <path d="M84 104 Q118 92 150 104 L156 178 H86 Z" fill="url(#steel)"/><path d="M86 168 H156 V180 H86 Z" fill="url(#gold)"/>
  <path d="M121 104 V168" stroke="#8d97a4" stroke-width="3"/><circle cx="121" cy="136" r="11" fill="url(#gold)" stroke-width="3.5"/>
  <ellipse cx="84" cy="108" rx="18" ry="16" fill="url(#gold)"/><ellipse cx="156" cy="108" rx="18" ry="16" fill="url(#gold)"/>
  <path d="M156 114 Q176 120 180 144" fill="none" stroke="${OUT}" stroke-width="22"/><path d="M156 114 Q176 120 180 144" fill="none" stroke="url(#steel)" stroke-width="13"/>
  <g transform="translate(-12 0) rotate(6 182 150)"><path d="M174 150 L174 30 L182 14 L190 30 L190 150 Z" fill="url(#steel)"/><path d="M182 24 V140" stroke="#8d97a4" stroke-width="2.5"/><path d="M164 150 H200 V160 H164 Z" fill="url(#gold)"/><path d="M174 160 H190 V178 H174 Z" fill="#6c4a26"/></g>
  <path d="M54 118 L100 118 V158 Q100 190 77 202 Q54 190 54 158 Z" fill="url(#blue)"/>
  <path d="M77 134 L82 148 L96 150 L85 158 L89 172 L77 164 L65 172 L69 158 L58 150 L72 148 Z" fill="url(#gold)" stroke-width="2.5"/>
  <circle cx="121" cy="76" r="30" fill="url(#steel)"/><path d="M96 78 H146 V88 Q121 100 96 88 Z" fill="${OUT}" stroke="none"/><path d="M101 80 H141" stroke="#bcd2f0" stroke-width="3" fill="none"/>
  <path d="M121 46 Q106 22 96 8 Q124 6 146 12 Q132 26 121 46 Z" fill="#c7352b"/><path d="M121 48 V84" stroke="#8d97a4" stroke-width="3" fill="none"/>`);
}

function sorc() {
  return svg(200, 240, `
  <path d="M76 100 L36 222 H150 L128 100 Z" fill="#6b3fb8"/><path d="M76 100 L36 222 H92 Z" fill="#8c63d8" stroke="none"/>
  <path d="M36 222 H150" stroke="url(#gold)" stroke-width="8"/>
  <path d="M60 222 L56 236 H84 L86 222 Z" fill="#4a2c98"/><path d="M104 222 L108 236 H136 L128 222 Z" fill="#4a2c98"/>
  <path d="M82 100 Q102 92 124 100 L128 130 H80 Z" fill="#8c63d8"/><path d="M80 126 H130" stroke="url(#gold)" stroke-width="7"/>
  <path d="M126 108 Q150 108 160 90" fill="none" stroke="${OUT}" stroke-width="16"/><path d="M126 108 Q150 108 160 90" fill="none" stroke="#f2c48f" stroke-width="8"/>
  <path d="M164 44 V204" stroke="#7a4a22" stroke-width="7"/>
  <circle cx="164" cy="38" r="28" fill="url(#glowC)" opacity=".5" stroke="none"/><circle cx="164" cy="38" r="14" fill="url(#glowC)" stroke-width="4"/>
  <path d="M60 100 Q40 150 56 180" fill="none" stroke="#f5f5ff" stroke-width="14"/><path d="M60 100 Q40 150 56 180" fill="none" stroke="${OUT}" stroke-width="3"/>
  <circle cx="102" cy="76" r="24" fill="#f2c48f"/>
  <path d="M76 82 Q70 110 82 126 L90 90 Z" fill="#f5f5ff"/>
  <circle cx="112" cy="78" r="3.5" fill="${OUT}" stroke="none"/><circle cx="96" cy="78" r="3.5" fill="${OUT}" stroke="none"/><path d="M100 90 q5 4 10 0" fill="none" stroke-width="3"/>
  <path d="M70 66 Q102 56 134 66 L102 8 Z" fill="url(#roofP)"/><ellipse cx="102" cy="66" rx="40" ry="9" fill="#4a2c98"/><path d="M102 10 q16 -4 18 12" fill="none" stroke-width="3"/>`);
}

// ---------- 적 ----------
function goblin() {
  return svg(200, 200, `
  <path d="M80 140 L72 176 H98 L100 140 Z" fill="#4f9e32"/><path d="M72 176 Q70 186 84 186 H104 Q108 176 98 176 Z" fill="#6f4522"/>
  <path d="M108 140 L112 176 H138 L128 140 Z" fill="url(#goblin)"/><path d="M112 176 Q108 188 124 188 H146 Q148 176 138 176 Z" fill="#6f4522"/>
  <path d="M70 92 Q104 80 136 92 L144 146 H66 Z" fill="url(#wood)"/><path d="M66 126 H144" stroke="#3b2412" stroke-width="7"/><rect x="98" y="120" width="14" height="12" fill="#d9a63c" stroke-width="3"/>
  <path d="M130 100 Q152 104 160 120" fill="none" stroke="${OUT}" stroke-width="18"/><path d="M130 100 Q152 104 160 120" fill="none" stroke="#6bb340" stroke-width="10"/>
  <path d="M158 112 L196 92 L192 104 L164 126 Z" fill="#cfd3d8"/><path d="M156 118 L168 128" stroke="#5c3b1e" stroke-width="8"/>
  <path d="M78 102 Q60 112 62 128" fill="none" stroke="${OUT}" stroke-width="16"/><path d="M78 102 Q60 112 62 128" fill="none" stroke="#4f9e32" stroke-width="8"/>
  <path d="M72 62 L26 44 L62 92 Z" fill="#5fae3a"/><path d="M72 64 L40 52 L62 84 Z" fill="#e59a9a" stroke="none"/>
  <path d="M130 62 L178 42 L142 92 Z" fill="url(#goblin)"/><path d="M130 64 L164 52 L142 84 Z" fill="#e59a9a" stroke="none"/>
  <ellipse cx="104" cy="70" rx="40" ry="34" fill="url(#goblin)"/>
  <ellipse cx="94" cy="64" rx="10" ry="11" fill="#fff"/><ellipse cx="122" cy="64" rx="10" ry="11" fill="#fff"/>
  <circle cx="98" cy="66" r="5" fill="#1a1a1a" stroke="none"/><circle cx="126" cy="66" r="5" fill="#1a1a1a" stroke="none"/>
  <path d="M82 50 L104 58 M138 50 L116 58" stroke-width="5" fill="none"/>
  <path d="M108 72 L122 80 L108 82 Z" fill="#4a8a2c" stroke-width="3"/><path d="M86 88 Q108 100 130 86" fill="#3a1a14"/>
  <path d="M94 90 L99 98 L104 92 M112 93 L117 98 L121 90" fill="#fff" stroke-width="2.5"/>`);
}

function wolf() {
  return svg(275, 200, `
  <path d="M30 96 Q6 70 14 40 Q40 60 52 92 Z" fill="url(#wolf)"/>
  <path d="M62 150 L50 190 H78 L84 150 Z" fill="#6c7380"/><path d="M178 150 L190 190 H218 L204 150 Z" fill="#6c7380"/>
  <ellipse cx="130" cy="110" rx="86" ry="46" fill="url(#wolf)"/>
  <path d="M96 150 L84 192 H112 L116 150 Z" fill="url(#wolf)"/><path d="M150 150 L160 192 H190 L176 150 Z" fill="url(#wolf)"/>
  <path d="M96 78 Q130 66 166 78" fill="none" stroke="#e1e5ec" stroke-width="5" opacity=".6"/>
  <path d="M188 74 L206 30 L220 66 Z" fill="url(#wolf)"/><path d="M210 66 L232 36 L238 78 Z" fill="#6c7380"/>
  <path d="M170 66 Q196 50 232 76 L262 104 Q266 122 240 124 L204 122 Q170 120 170 66 Z" fill="url(#wolf)"/>
  <path d="M232 104 L262 106 Q262 122 242 122 Z" fill="#e1e5ec" stroke="none"/>
  <circle cx="264" cy="106" r="7" fill="${OUT}" stroke="none"/>
  <path d="M206 116 Q230 124 252 116" fill="#3a1a14"/><path d="M216 118 l4 8 l4 -8 M232 120 l4 8 l4 -8" fill="#fff" stroke-width="2.5"/>
  <circle cx="214" cy="84" r="8" fill="#ff4a3a"/><circle cx="216" cy="84" r="3.5" fill="${OUT}" stroke="none"/>
  <path d="M200 76 L224 70" stroke-width="5" fill="none"/>`);
}

function orc() {
  return svg(200, 200, `
  <path d="M72 140 L68 184 H100 L100 140 Z" fill="url(#orc)"/><path d="M104 140 L110 184 H142 L136 140 Z" fill="url(#orc)"/>
  <path d="M64 184 Q62 196 78 196 H104 L100 184 Z" fill="#4a3a2a"/><path d="M108 184 Q110 196 126 196 H150 Q152 186 142 184 Z" fill="#4a3a2a"/>
  <path d="M54 88 Q100 72 148 88 L152 148 H54 Z" fill="url(#orc)"/>
  <path d="M60 92 Q100 80 144 92 L148 140 H60 Z" fill="url(#steel)"/><path d="M60 124 H148" stroke="#6a7585" stroke-width="4"/>
  <circle cx="104" cy="112" r="9" fill="url(#gold)" stroke-width="3"/>
  <ellipse cx="52" cy="96" rx="20" ry="16" fill="url(#iron)"/><ellipse cx="152" cy="96" rx="20" ry="16" fill="url(#iron)"/>
  <path d="M152 104 Q172 116 168 134" fill="none" stroke="${OUT}" stroke-width="22"/><path d="M152 104 Q172 116 168 134" fill="none" stroke="#4a8a30" stroke-width="13"/>
  <path d="M160 142 L172 30" stroke="#7a4a22" stroke-width="9"/><path d="M164 34 Q198 20 196 62 Q190 76 170 70 Z" fill="url(#iron)"/>
  <path d="M52 108 Q36 120 42 140" fill="none" stroke="${OUT}" stroke-width="20"/><path d="M52 108 Q36 120 42 140" fill="none" stroke="#3d7a28" stroke-width="11"/>
  <ellipse cx="104" cy="66" rx="40" ry="34" fill="url(#orc)"/>
  <path d="M70 60 L52 48 L64 76 Z" fill="#3d7a28"/><path d="M138 60 L156 48 L144 76 Z" fill="#4a8a30"/>
  <ellipse cx="92" cy="60" rx="8" ry="8" fill="#fff"/><ellipse cx="118" cy="60" rx="8" ry="8" fill="#fff"/>
  <circle cx="95" cy="62" r="4" fill="#c01818" stroke="none"/><circle cx="121" cy="62" r="4" fill="#c01818" stroke="none"/>
  <path d="M80 46 L100 54 M130 46 L112 54" stroke-width="5" fill="none"/>
  <path d="M82 80 Q104 90 128 80 L124 92 Q104 98 86 92 Z" fill="#2a1a14"/>
  <path d="M86 82 L80 66 L94 80 Z M122 82 L130 66 L116 80 Z" fill="#f4eed0" stroke-width="3"/>`);
}

function wisp() {
  return svg(200, 200, `
  <circle cx="100" cy="108" r="86" fill="url(#wisp)" opacity=".35" stroke="none"/>
  <path d="M100 12 Q134 56 150 92 Q164 130 134 160 Q100 186 66 160 Q36 130 52 92 Q66 56 100 12 Z" fill="url(#wisp)" stroke-width="4.5"/>
  <path d="M100 38 Q122 74 130 100" fill="none" stroke="#ffffff" stroke-width="5" opacity=".8"/>
  <ellipse cx="84" cy="112" rx="11" ry="14" fill="#fff"/><ellipse cx="118" cy="112" rx="11" ry="14" fill="#fff"/>
  <circle cx="88" cy="116" r="6" fill="${OUT}" stroke="none"/><circle cx="122" cy="116" r="6" fill="${OUT}" stroke="none"/>
  <path d="M70 96 L94 104 M132 96 L108 104" stroke-width="5" fill="none"/>
  <path d="M86 140 Q102 150 118 140" fill="none" stroke-width="4.5"/>`);
}

function bat() {
  return svg(250, 175, `
  <path d="M125 80 Q70 20 4 40 Q30 62 22 86 Q48 80 56 106 Q84 92 100 118 Z" fill="url(#bat)"/>
  <path d="M125 80 Q180 20 246 40 Q220 62 228 86 Q202 80 194 106 Q166 92 150 118 Z" fill="url(#bat)"/>
  <g ${thin('#2a1740', 3)}><path d="M120 84 Q70 56 26 52 M120 88 Q76 80 52 98 M130 84 Q180 56 224 52 M130 88 Q174 80 198 98"/></g>
  <path d="M104 58 L96 18 L120 44 Z" fill="url(#bat)"/><path d="M146 58 L154 18 L130 44 Z" fill="url(#bat)"/>
  <ellipse cx="125" cy="94" rx="30" ry="40" fill="url(#bat)"/>
  <ellipse cx="125" cy="112" rx="16" ry="22" fill="#c9a0e8" stroke="none"/>
  <circle cx="125" cy="64" r="26" fill="url(#bat)"/>
  <circle cx="114" cy="62" r="7" fill="#ff4a4a"/><circle cx="136" cy="62" r="7" fill="#ff4a4a"/>
  <circle cx="115" cy="62" r="3" fill="${OUT}" stroke="none"/><circle cx="137" cy="62" r="3" fill="${OUT}" stroke="none"/>
  <path d="M112 78 Q125 88 138 78 Z" fill="#2a1428"/><path d="M116 78 l3 9 l3 -9 M128 78 l3 9 l3 -9" fill="#fff" stroke-width="2"/>
  <path d="M106 54 L122 58 M144 54 L128 58" stroke-width="4" fill="none"/>`);
}

function wraith() {
  return svg(190, 220, `
  <path d="M30 120 Q30 40 95 26 Q160 40 160 120 L170 200 L146 182 L128 214 L106 184 L86 214 L66 182 L44 204 Z" fill="url(#ghost)" opacity=".95"/>
  <path d="M50 120 Q52 66 95 48" fill="none" stroke="#ffffff" stroke-width="5" opacity=".7"/>
  <path d="M42 70 Q95 -10 148 70 Q150 110 95 112 Q40 110 42 70 Z" fill="#2c6a66"/>
  <path d="M60 78 Q95 36 130 78 Q132 104 95 106 Q58 104 60 78 Z" fill="#0f2a2a"/>
  <ellipse cx="80" cy="82" rx="9" ry="12" fill="#bfffee" stroke="none"/><ellipse cx="112" cy="82" rx="9" ry="12" fill="#bfffee" stroke="none"/>
  <ellipse cx="96" cy="100" rx="6" ry="8" fill="#6fd8c8" stroke="none"/>
  <path d="M146 120 Q172 126 176 146" fill="none" stroke="#2c6a66" stroke-width="12"/><path d="M174 142 l8 10 l-12 2 Z" fill="#bdeee8" stroke-width="3"/>`);
}

function shaman() {
  return svg(210, 240, `
  <path d="M60 100 L24 224 H146 L124 100 Z" fill="#9a2a3c"/><path d="M60 100 L24 224 H80 Z" fill="#b8485a" stroke="none"/>
  <path d="M24 224 H146" stroke="#d9a63c" stroke-width="7"/>
  <path d="M50 224 L48 238 H80 L80 224 Z" fill="#6f4522"/><path d="M96 224 L100 238 H130 L124 224 Z" fill="#6f4522"/>
  <path d="M154 40 V226" stroke="#7a4a22" stroke-width="7"/><circle cx="154" cy="34" r="26" fill="#66ff88" opacity=".35" stroke="none"/><circle cx="154" cy="34" r="13" fill="#66ff88" stroke-width="4"/>
  <path d="M64 100 L120 100 L128 140 H56 Z" fill="#b8485a"/>
  <path d="M122 106 Q148 108 154 92" fill="none" stroke="${OUT}" stroke-width="16"/><path d="M122 106 Q148 108 154 92" fill="none" stroke="#6bb340" stroke-width="8"/>
  <path d="M66 112 Q92 142 120 112" fill="none" stroke="#f4eed0" stroke-width="7"/><g fill="#f4eed0" stroke-width="2.5"><circle cx="76" cy="126" r="5"/><circle cx="92" cy="134" r="5"/><circle cx="108" cy="126" r="5"/></g>
  <circle cx="92" cy="76" r="26" fill="url(#goblin)"/>
  <path d="M60 84 Q56 40 92 30 Q128 40 124 84 Q108 62 92 62 Q76 62 60 84 Z" fill="#9a2a3c"/>
  <ellipse cx="82" cy="78" rx="6" ry="7" fill="#fff"/><ellipse cx="104" cy="78" rx="6" ry="7" fill="#fff"/><circle cx="84" cy="80" r="3" fill="${OUT}" stroke="none"/><circle cx="106" cy="80" r="3" fill="${OUT}" stroke="none"/>
  <path d="M84 94 Q94 100 104 94" fill="none" stroke-width="3.5"/>`);
}

function golem() {
  return svg(200, 200, `
  <path d="M60 140 L52 188 H98 L100 140 Z" fill="url(#rock)"/><path d="M104 140 L108 188 H156 L146 140 Z" fill="url(#rock)"/>
  <path d="M42 100 Q100 70 158 100 L164 150 H38 Z" fill="url(#rock)"/>
  <g ${thin('#4a4a58', 3.5)}><path d="M62 112 L84 132 L72 150 M122 104 L112 128 L136 144 M98 112 L94 132"/></g>
  <g fill="none" stroke="#ff9a2a" stroke-width="4" opacity=".95"><path d="M64 114 L84 132 L74 148 M124 106 L113 128 L134 142"/></g>
  <path d="M154 104 Q176 116 174 154" fill="none" stroke="${OUT}" stroke-width="34"/><path d="M154 104 Q176 116 174 154" fill="none" stroke="#8a8a98" stroke-width="24"/>
  <circle cx="174" cy="164" r="22" fill="url(#rock)"/>
  <path d="M46 104 Q26 116 26 154" fill="none" stroke="${OUT}" stroke-width="34"/><path d="M46 104 Q26 116 26 154" fill="none" stroke="#7a7a88" stroke-width="24"/>
  <circle cx="26" cy="164" r="22" fill="url(#rock)"/>
  <path d="M60 78 Q100 36 140 78 L146 110 H54 Z" fill="url(#rock)"/>
  <path d="M60 52 L48 36 L72 44 Z M140 52 L152 36 L128 44 Z" fill="#7da048"/>
  <path d="M64 64 Q100 22 136 64 Q130 78 100 78 Q70 78 64 64 Z" fill="#6f9d3a" opacity=".9"/>
  <path d="M72 84 H92 L92 94 H72 Z M108 84 H128 V94 H108 Z" fill="#ffb020" stroke-width="3.5"/>
  <path d="M82 104 Q100 112 118 104" fill="none" stroke-width="4.5"/>`);
}

function ogre() {
  return svg(200, 200, `
  <path d="M64 142 L56 188 H100 L100 142 Z" fill="url(#ogre)"/><path d="M104 142 L110 188 H152 L142 142 Z" fill="url(#ogre)"/>
  <path d="M50 188 Q48 198 66 198 H100 V188 Z" fill="#4a3a2a"/><path d="M108 188 Q108 198 128 198 H154 Q156 188 146 188 Z" fill="#4a3a2a"/>
  <path d="M46 92 Q100 70 156 92 L164 150 H38 Z" fill="url(#ogre)"/>
  <path d="M38 126 H164 V148 H38 Z" fill="#4a3a2a"/><g fill="#f4eed0" stroke-width="3"><path d="M56 148 l8 -14 l8 14 Z M86 148 l8 -14 l8 14 Z M116 148 l8 -14 l8 14 Z"/></g>
  <circle cx="102" cy="126" r="9" fill="url(#gold)" stroke-width="3"/>
  <path d="M154 100 Q180 112 178 142" fill="none" stroke="${OUT}" stroke-width="30"/><path d="M154 100 Q180 112 178 142" fill="none" stroke="#a46d42" stroke-width="20"/>
  <g transform="rotate(-12 178 150)"><path d="M178 150 L190 18" stroke="#7a4a22" stroke-width="12"/><path d="M178 28 Q166 8 190 4 Q214 10 202 30 Q196 40 184 40 Z" fill="url(#iron)"/>
  <g fill="#e0e4ea" stroke-width="3"><path d="M182 24 l-6 -10 l10 4 Z M198 26 l8 -8 l-2 12 Z"/></g></g>
  <path d="M46 108 Q26 120 32 146" fill="none" stroke="${OUT}" stroke-width="28"/><path d="M46 108 Q26 120 32 146" fill="none" stroke="#8c5a34" stroke-width="18"/>
  <ellipse cx="102" cy="68" rx="44" ry="38" fill="url(#ogre)"/>
  <path d="M60 36 L66 6 L82 30 L102 0 L122 30 L138 6 L144 36 Q102 20 60 36 Z" fill="url(#iron)"/><path d="M64 34 H140" stroke="url(#gold)" stroke-width="6"/>
  <ellipse cx="86" cy="68" rx="9" ry="9" fill="#ffe066"/><ellipse cx="120" cy="68" rx="9" ry="9" fill="#ffe066"/>
  <circle cx="89" cy="70" r="4.5" fill="#b01818" stroke="none"/><circle cx="123" cy="70" r="4.5" fill="#b01818" stroke="none"/>
  <path d="M70 54 L96 62 M136 54 L112 62" stroke-width="6" fill="none"/>
  <path d="M82 90 Q102 100 124 90 L120 100 Q102 106 86 100 Z" fill="#2a1a14"/>
  <path d="M86 92 L80 74 L94 90 Z M120 92 L128 74 L114 90 Z" fill="#f4eed0" stroke-width="3"/>`);
}

function drake() {
  return svg(400, 300, `
  <path d="M170 150 Q120 40 12 24 Q40 64 36 100 Q66 90 82 126 Q110 118 130 156 Z" fill="url(#drake)"/>
  <path d="M170 150 Q210 60 300 28 Q282 70 292 96 Q262 92 252 128 Q224 120 206 156 Z" fill="#a82a24"/>
  <g ${thin('#4a0e0e', 3.5)}><path d="M160 146 Q110 80 40 54 M150 150 Q100 120 66 118 M214 146 Q250 86 292 56 M222 150 Q250 124 272 116"/></g>
  <path d="M90 224 Q70 262 30 270 Q70 286 120 262 Q136 238 130 214 Z" fill="url(#drake)"/>
  <path d="M120 232 L112 274 H150 L158 232 Z" fill="#c0392b"/><path d="M196 232 L204 276 H242 L232 232 Z" fill="#a82a24"/>
  <path d="M100 150 Q180 120 262 150 Q300 190 252 238 Q190 262 130 244 Q76 210 100 150 Z" fill="url(#drake)"/>
  <path d="M130 200 Q180 238 250 214 Q240 240 200 248 Q150 252 130 200 Z" fill="#f0c070" stroke="none"/>
  <g fill="#7a1616" ${nos}><path d="M124 154 l14 -26 l10 24 Z M158 140 l14 -26 l10 24 Z M194 138 l14 -26 l10 24 Z M228 144 l12 -22 l10 22 Z"/></g>
  <path d="M244 112 Q290 84 346 104 L388 134 Q394 162 360 164 Q318 160 296 150 Q252 154 244 112 Z" fill="url(#drake)"/>
  <path d="M258 96 L268 54 L286 90 Z M290 96 L306 58 L316 100 Z" fill="#e8dcc0"/>
  <circle cx="300" cy="112" r="10" fill="#ffd34d"/><ellipse cx="302" cy="112" rx="3.5" ry="8" fill="${OUT}" stroke="none"/>
  <path d="M278 100 L316 100" stroke-width="5" fill="none"/>
  <path d="M310 152 Q350 162 380 148 L372 160 Q344 176 314 166 Z" fill="#3a1010"/>
  <path d="M384 142 Q398 136 399 146 Q392 150 386 154 Z" fill="#ff9a30" opacity=".9" stroke="none"/>`);
}

// ---------- 건설 자리 / 투사체 ----------
const spot = () => svg(224, 132, `
  <ellipse cx="112" cy="76" rx="100" ry="46" fill="#000" opacity=".22" stroke="none"/>
  <ellipse cx="112" cy="62" rx="98" ry="46" fill="#b8ab94"/>
  <ellipse cx="112" cy="62" rx="98" ry="46" fill="none" stroke="#6e6454" stroke-width="7"/>
  <ellipse cx="112" cy="62" rx="68" ry="29" fill="#a89b84" stroke="#e8dcc0" stroke-width="3.5"/>
  <g ${thin('#8a7e68', 3)}><path d="M34 48 q10 -6 18 0 M168 78 q10 6 20 0 M66 96 q8 4 16 0"/></g>
  <g fill="#6fbf4a" ${nos}><path d="M184 34 q4 -14 8 0 q6 -10 6 4 q-8 6 -14 -4Z"/><path d="M26 74 q4 -12 8 0 q6 -8 6 4 q-8 6 -14 -4Z"/></g>`);
const arrow = () => svg(192, 64, `
  <path d="M20 32 H146" stroke="#8a5a2b" stroke-width="9"/><path d="M146 14 L186 32 L146 50 Z" fill="#dfe3e8"/>
  <path d="M14 32 L40 14 L50 32 L40 50 Z" fill="#f4f6fa" stroke-width="3.5"/>`);
const orb = () => svg(160, 160, `
  <circle cx="80" cy="80" r="72" fill="url(#orb)" opacity=".5" stroke="none"/><circle cx="80" cy="80" r="40" fill="url(#orb)" stroke-width="4"/>
  <circle cx="68" cy="68" r="12" fill="#fff" stroke="none" opacity=".9"/>`);
const ball = () => svg(160, 160, `
  <circle cx="80" cy="80" r="62" fill="#2d2d36"/><circle cx="62" cy="60" r="18" fill="#8a8a98" stroke="none" opacity=".85"/>
  <path d="M120 70 Q124 100 100 122" fill="none" stroke="#14141a" stroke-width="6" opacity=".6"/>`);

// ---------- 소품 ----------
const PW = 224, PH = 256;
const shadow = `<ellipse cx="112" cy="236" rx="70" ry="14" fill="#000" opacity=".2" stroke="none"/>`;
const props = {
  d_meadow_tree: () => svg(PW, PH, `${shadow}<path d="M100 236 L104 150 H124 L128 236 Z" fill="url(#wood)"/><g fill="#3f9a3a"><circle cx="112" cy="104" r="62"/><circle cx="64" cy="132" r="40"/><circle cx="160" cy="130" r="42"/></g><circle cx="94" cy="84" r="30" fill="#62bb52" stroke="none"/><circle cx="140" cy="100" r="18" fill="#62bb52" stroke="none" opacity=".8"/>`),
  d_meadow_bush: () => svg(PW, PH, `${shadow}<g fill="#3f9a3a"><circle cx="70" cy="196" r="44"/><circle cx="150" cy="196" r="44"/><circle cx="110" cy="170" r="52"/></g><circle cx="96" cy="154" r="24" fill="#62bb52" stroke="none"/><g fill="#e0453a" stroke-width="3"><circle cx="76" cy="196" r="8"/><circle cx="130" cy="176" r="8"/><circle cx="150" cy="208" r="8"/></g>`),
  d_meadow_rock: () => svg(PW, PH, `${shadow}<path d="M30 234 Q22 170 70 148 Q110 120 150 150 Q204 170 196 234 Z" fill="url(#rock)"/><path d="M60 178 Q90 160 118 172" fill="none" stroke="#e6e6ee" stroke-width="5" opacity=".6"/><g fill="#5fae4a" ${nos}><path d="M52 232 Q56 206 76 220 Q86 232 52 232Z"/><path d="M150 232 Q158 214 176 226 Z"/></g>`),
  d_desert_palm: () => svg(PW, PH, `${shadow}<path d="M104 238 Q96 160 116 78 L132 80 Q120 160 128 238 Z" fill="#b98a4e"/><g ${thin('#6b4a22', 3)}><path d="M104 200 H130 M106 170 H128 M110 140 H128 M114 110 H130"/></g><g fill="#3f9a3a"><path d="M124 80 Q70 40 20 76 Q64 70 124 92 Z"/><path d="M124 80 Q176 36 214 78 Q170 70 124 92 Z"/><path d="M124 80 Q96 22 52 26 Q96 40 124 92 Z"/><path d="M124 80 Q152 20 196 28 Q150 42 124 92 Z"/></g><circle cx="116" cy="92" r="9" fill="#7a4a22"/><circle cx="134" cy="94" r="9" fill="#7a4a22"/>`),
  d_desert_cactus: () => svg(PW, PH, `${shadow}<path d="M92 238 V70 Q92 38 112 38 Q132 38 132 70 V238 Z" fill="#4aa44a"/><path d="M92 170 H62 Q44 170 44 140 V110 Q44 96 58 96 Q72 96 72 110 V140 H92 Z" fill="#4aa44a"/><path d="M132 150 H160 Q180 150 180 122 V96 Q180 82 166 82 Q152 82 152 96 V122 H132 Z" fill="#4aa44a"/><g ${thin('#2f7a32', 3)}><path d="M112 60 V230 M102 80 V220 M122 80 V220"/></g><circle cx="112" cy="36" r="9" fill="#ff6aa8" stroke-width="3.5"/>`),
  d_desert_rock: () => svg(PW, PH, `${shadow}<path d="M26 236 L44 150 L86 120 L120 132 L160 106 L196 150 L204 236 Z" fill="#c99a62"/><path d="M44 150 L86 120 L84 170 Z" fill="#dcb47a" stroke="none"/><g ${thin('#8a5e32', 3.5)}><path d="M86 120 L84 180 M120 132 L130 200 M160 106 L150 168"/></g>`),
  d_swamp_tree: () => svg(PW, PH, `${shadow}<path d="M96 238 Q90 190 98 150 Q70 120 58 70 Q86 90 104 110 Q104 70 90 34 Q120 56 124 110 Q150 80 176 66 Q154 110 134 150 Q148 196 136 238 Z" fill="#5a4630"/><g fill="#6b8a4a" stroke-width="3"><path d="M54 76 Q40 120 54 150 Q64 120 62 80 Z"/><path d="M96 40 Q86 90 98 118 Q108 90 102 44 Z"/><path d="M170 72 Q158 120 172 140 Q182 110 176 76 Z"/></g>`),
  d_swamp_mushroom: () => svg(PW, PH, `${shadow}<path d="M96 236 Q90 190 98 168 H128 Q136 190 130 236 Z" fill="#efe3c8"/><path d="M40 176 Q40 94 112 94 Q184 94 184 176 Q112 190 40 176 Z" fill="#c0412e"/><g fill="#fff3d8" stroke-width="3"><circle cx="82" cy="134" r="12"/><circle cx="128" cy="116" r="10"/><circle cx="150" cy="152" r="12"/><circle cx="104" cy="160" r="8"/></g><path d="M170 236 Q168 214 176 206 H192 Q200 214 196 236 Z" fill="#efe3c8"/><path d="M152 210 Q154 176 184 176 Q214 176 214 210 Q184 216 152 210 Z" fill="#8a52c0"/><g fill="#e9d8ff" stroke-width="2.5"><circle cx="172" cy="196" r="5"/><circle cx="196" cy="192" r="5"/></g>`),
  d_swamp_reeds: () => svg(PW, PH, `${shadow}<g fill="none" stroke-width="9"><path d="M60 238 Q56 150 44 70" stroke="#3d7a3a"/><path d="M92 238 Q94 130 92 40" stroke="#4a9a46"/><path d="M126 238 Q132 140 150 64" stroke="#3d7a3a"/><path d="M160 238 Q170 170 188 110" stroke="#4a9a46"/></g><g fill="#7a4a22"><rect x="82" y="30" width="20" height="56" rx="10"/><rect x="140" y="54" width="20" height="50" rx="10"/><rect x="34" y="62" width="20" height="46" rx="10"/></g>`),
  d_snow_pine: () => svg(PW, PH, `${shadow}<path d="M102 238 V196 H122 V238 Z" fill="url(#wood)"/><path d="M112 20 L166 100 H140 L184 160 H152 L198 214 H26 L72 160 H40 L84 100 H58 Z" fill="#2f7a55"/><path d="M112 20 L138 58 Q112 70 86 58 Z M84 100 L112 80 L140 100 Q112 112 84 100 Z M66 160 L112 138 L158 160 Q112 176 66 160 Z" fill="#fff" stroke-width="3"/>`),
  d_snow_rock: () => svg(PW, PH, `${shadow}<path d="M28 236 Q24 170 70 144 Q112 116 154 146 Q200 170 198 236 Z" fill="url(#rock)"/><path d="M40 190 Q40 150 76 134 Q112 112 148 138 Q176 152 184 184 Q150 150 112 154 Q70 156 40 190 Z" fill="#f4fbff"/>`),
  d_snow_crystal: () => svg(PW, PH, `${shadow}<path d="M112 20 L138 90 L128 236 H96 L86 90 Z" fill="url(#ice)"/><path d="M60 80 L84 130 L78 236 H48 L40 130 Z" fill="url(#ice)"/><path d="M164 100 L190 150 L184 236 H154 L142 150 Z" fill="url(#ice)"/><path d="M112 20 L120 100 L112 230" fill="none" stroke="#fff" stroke-width="4" opacity=".7"/>`),
  d_volcano_tree: () => svg(PW, PH, `${shadow}<path d="M100 238 Q96 180 104 140 Q76 110 56 76 Q90 86 108 108 Q104 66 90 38 Q122 60 124 108 Q150 82 178 68 Q154 108 132 140 Q142 190 132 238 Z" fill="#2c2420"/><g fill="#ff7a1a" ${nos}><circle cx="58" cy="78" r="6"/><circle cx="92" cy="42" r="6"/><circle cx="176" cy="70" r="6"/><circle cx="116" cy="196" r="5"/></g>`),
  d_volcano_rock: () => svg(PW, PH, `${shadow}<path d="M28 236 Q22 170 68 142 Q112 112 156 144 Q204 170 198 236 Z" fill="#3b3434"/><g fill="none" stroke="#ff8a2a" stroke-width="6" opacity=".95"><path d="M70 160 L92 190 L80 226 M130 138 L122 178 L152 206"/></g><path d="M70 150 Q110 124 150 152" fill="none" stroke="#6e5c58" stroke-width="5" opacity=".7"/>`),
  d_volcano_spike: () => svg(PW, PH, `${shadow}<path d="M100 238 L84 30 L128 238 Z" fill="#2a2230"/><path d="M52 238 L58 100 L96 238 Z" fill="#3a3040"/><path d="M130 238 L156 80 L182 238 Z" fill="#3a3040"/><path d="M84 30 L98 160" stroke="#8a70c8" stroke-width="4" opacity=".6" fill="none"/><path d="M150 140 Q154 190 166 226" stroke="#ff7a1a" stroke-width="5" fill="none"/>`),
};

// ---------- 출력 ----------
const files = {};
const TOWERS = { archer, mage, cannon, barracks, frost, thunder };
for (const [k, fn] of Object.entries(TOWERS)) for (let l = 1; l <= 3; l++) files[`t_${k}_${l}`] = fn(l);
Object.assign(files, {
  e_goblin: goblin(), e_wolf: wolf(), e_orc: orc(), e_wisp: wisp(), e_bat: bat(), e_wraith: wraith(),
  e_shaman: shaman(), e_golem: golem(), e_ogre: ogre(), e_drake: drake(),
  h_knight: knight(), h_sorc: sorc(), soldier: soldier(), spot: spot(), p_arrow: arrow(), p_orb: orb(), p_ball: ball(),
});
for (const [k, fn] of Object.entries(props)) files[k] = fn();

fs.rmSync(OUTDIR, { recursive: true, force: true });
const index = {};
for (const [key, body] of Object.entries(files)) {
  const a = M[key];
  if (!a) throw new Error(`manifest 에 없는 key: ${key}`);
  const dir = path.join(OUTDIR, a.category);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${key}.svg`), body);
  index[key] = { file: `${a.category}/${key}.svg`, w: a.out_w, h: a.out_h };
}
fs.writeFileSync(path.join(OUTDIR, 'index.json'), JSON.stringify(index, null, 1));
const missing = manifest.assets.filter((a) => !files[a.key] && a.category !== 'tiles').map((a) => a.key);
console.log(`SVG ${Object.keys(files).length}개 생성 → ${path.relative(ROOT, OUTDIR)}`);
if (missing.length) console.log('SVG 없는 에셋:', missing.join(', '));
