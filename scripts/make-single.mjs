// dist/index.html + JS 번들을 하나의 HTML 파일로 합친다 (미리보기/공유용).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const m = html.match(/<script type="module"[^>]*src="\.\/assets\/([^"]+)"[^>]*><\/script>/);
if (!m) throw new Error('bundle script tag not found');
const js = readFileSync(`dist/assets/${m[1]}`, 'utf8').replace(/<\/script/gi, '<\\/script');
const out = html.replace(m[0], () => `<script type="module">${js}</script>`);
writeFileSync('dist/single.html', out);
console.log('dist/single.html', Math.round(out.length / 1024), 'KB', readdirSync('dist').join(','));
