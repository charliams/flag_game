/* Renders the flag art to build/sheet.png for checking by eye.
 *
 *   node tools/contact-sheet.mjs [--from N] [--to N] [--cols N] [--quantised]
 *
 * --quantised shows what the matching code actually sees: every pixel snapped to
 * its colour family. Worth a look when changing classify(), because that is what
 * decides whether two flags count as overlapping.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
mkdirSync(join(root, 'build'), { recursive: true });

const args = process.argv.slice(2);
const num = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i < 0 ? dflt : Number(args[i + 1]);
};
const from = num('from', 0);
const to = num('to', 1e9);
const cols = num('cols', 6);
const quantised = args.includes('--quantised');

const browser = await chromium.launch({ executablePath: CHROME });
const p = await browser.newPage({
  viewport: { width: cols * 190, height: 900 },
  deviceScaleFactor: 2
});
await p.goto('file://' + join(root, 'index.html'));
await p.waitForFunction(() => typeof FLAGS !== 'undefined');

await p.evaluate(async ({ from, to, cols, quantised }) => {
  document.body.innerHTML = '<div id="sheet"></div>';
  document.body.style.background = '#fff';
  document.body.style.color = '#111';
  const style = document.createElement('style');
  style.textContent = `
    #sheet{display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px 12px;padding:14px}
    figure{margin:0;font:12px system-ui,sans-serif}
    .c{border:1px solid #bbb;line-height:0}
    .c>*{display:block;width:100%;height:auto;aspect-ratio:4/3}
    figcaption{padding-top:4px;line-height:1.3}
    .t{color:#777}`;
  document.head.appendChild(style);

  const sheet = document.getElementById('sheet');
  for (const f of FLAGS.slice(from, to)) {
    const fig = document.createElement('figure');
    const box = document.createElement('div');
    box.className = 'c';

    if (quantised) {
      /* Paint the grid back out in family colours. */
      const grid = await gridOf(f);
      const cv = document.createElement('canvas');
      cv.width = GRID_W; cv.height = GRID_H;
      const g = cv.getContext('2d');
      const im = g.createImageData(GRID_W, GRID_H);
      const hex = {
        red: [209, 34, 43], orange: [239, 125, 26], yellow: [246, 208, 21],
        green: [15, 138, 60], lightblue: [86, 180, 227], blue: [18, 60, 140],
        black: [26, 28, 31], white: [255, 255, 255]
      };
      for (let i = 0, q = 0; i < grid.length; i++, q += 4) {
        const c = hex[FAMILIES[grid[i]]];
        im.data[q] = c[0]; im.data[q + 1] = c[1]; im.data[q + 2] = c[2]; im.data[q + 3] = 255;
      }
      g.putImageData(im, 0, 0);
      box.appendChild(cv);
    } else {
      const img = new Image();
      img.src = svgUrl(f);
      box.appendChild(img);
    }

    const cap = document.createElement('figcaption');
    cap.innerHTML = f.name + '<br><span class="t">t' + f.tier + '</span>';
    fig.appendChild(box);
    fig.appendChild(cap);
    sheet.appendChild(fig);
  }
  /* let the <img> elements decode before the screenshot */
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
}, { from, to, cols, quantised });

await p.waitForTimeout(400);
const file = join(root, 'build/sheet.png');
await p.screenshot({ path: file, fullPage: true });
console.log('wrote', file);
await browser.close();
