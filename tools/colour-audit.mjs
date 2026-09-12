/* Lists, for every flag, each colour covering a meaningful share of the area,
 * with the hue/lightness the classifier sees and the family it assigns.
 *
 * The families decide what counts as an overlap, so a gold that lands in
 * "orange" or an orange that lands in "red" quietly changes which guesses
 * uncover ground. This is how those get found.
 *
 *   node tools/colour-audit.mjs [minSharePercent]
 */
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const MIN = Number(process.argv[2] || 4);

const browser = await chromium.launch({ executablePath: CHROME });
const p = await browser.newPage({ viewport: { width: 600, height: 400 } });
await p.goto('file://' + join(root, 'index.html'));
await p.waitForFunction(() => typeof FLAGS !== 'undefined');

const rows = await p.evaluate(async (MIN) => {
  const W = 160, H = 120, N = W * H;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const out = [];

  for (const f of FLAGS) {
    const img = await loadFlag(f);
    g.clearRect(0, 0, W, H);
    g.drawImage(img, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data;
    const tally = new Map();
    for (let i = 0; i < N; i++) {
      const p4 = i * 4;
      /* round off so antialiased fringes collapse onto their source colour */
      const k = ((d[p4] >> 3) << 10) | ((d[p4 + 1] >> 3) << 5) | (d[p4 + 2] >> 3);
      const e = tally.get(k);
      if (e) e.n++;
      else tally.set(k, { n: 1, r: d[p4], g: d[p4 + 1], b: d[p4 + 2] });
    }
    for (const e of [...tally.values()].sort((a, b) => b.n - a.n)) {
      const share = e.n / N * 100;
      if (share < MIN) break;
      const mx = Math.max(e.r, e.g, e.b), mn = Math.min(e.r, e.g, e.b);
      const l = (mx + mn) / 510;
      let h = 0;
      if (mx !== mn) {
        const dd = mx - mn;
        if (mx === e.r) h = ((e.g - e.b) / dd + (e.g < e.b ? 6 : 0));
        else if (mx === e.g) h = (e.b - e.r) / dd + 2;
        else h = (e.r - e.g) / dd + 4;
        h *= 60;
      }
      out.push({
        flag: f.name,
        hex: '#' + [e.r, e.g, e.b].map((v) => v.toString(16).padStart(2, '0')).join(''),
        share: +share.toFixed(1),
        h: +h.toFixed(0),
        l: +l.toFixed(2),
        fam: FAMILIES[classify(e.r, e.g, e.b)]
      });
    }
  }
  return out;
}, MIN);

/* Group by assigned family and print the hue range each covers, so boundary
 * problems show up as overlapping ranges. */
const byFam = {};
for (const r of rows) (byFam[r.fam] ||= []).push(r);

for (const fam of ['red', 'orange', 'yellow', 'green', 'lightblue', 'blue', 'black', 'white']) {
  const list = (byFam[fam] || []).slice().sort((a, b) => a.h - b.h);
  if (!list.length) { console.log(`\n== ${fam}: none`); continue; }
  console.log(`\n== ${fam} (${list.length} regions)  hue ${list[0].h}..${list[list.length - 1].h}`);
  const edge = list.slice(0, 3).concat(list.slice(-3));
  for (const r of edge) {
    console.log(`   h=${String(r.h).padStart(3)} l=${r.l} ${r.hex} ${r.share}% ${r.flag}`);
  }
}

await browser.close();
