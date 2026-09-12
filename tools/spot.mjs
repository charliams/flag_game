/* Renders a named set of flags large, for checking a specific design closely.
 *   node tools/spot.mjs Canada Albania Barbados
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const names = process.argv.slice(2);
mkdirSync(join(root, 'build'), { recursive: true });

const src = readFileSync(join(root, 'src/render.js'), 'utf8') + '\n' +
            readFileSync(join(root, 'src/flags.js'), 'utf8');

const page = `<!doctype html><meta charset="utf-8">
<style>
 body{margin:0;background:#fff;font:14px system-ui;color:#111}
 .g{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:16px}
 .c{border:1px solid #999;line-height:0}
 svg{display:block;width:100%;height:auto;aspect-ratio:3/2}
 figcaption{padding-top:5px;font-size:13px}
 figure{margin:0}
</style>
<div id="o"></div>
<script>${src}</script>
<script>
 const want = ${JSON.stringify(names)};
 const list = want.map(n => FLAGS.find(f => f.name.toLowerCase().indexOf(n.toLowerCase()) === 0))
                  .filter(Boolean);
 document.getElementById('o').innerHTML = '<div class="g">' + list.map(f =>
   '<figure><div class="c">' + flagSvg(f, null, {}) + '</div><figcaption>' + f.name +
   '</figcaption></figure>').join('') + '</div>';
</script>`;

const browser = await chromium.launch({ executablePath: CHROME });
const p = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1000, height: 700 } });
await p.goto('data:text/html;charset=utf-8,' + encodeURIComponent(page));
await p.waitForTimeout(200);
await p.screenshot({ path: join(root, 'build/spot.png'), fullPage: true });
console.log('wrote build/spot.png');
await browser.close();
