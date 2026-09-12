/* Proves the core invariant: with no colours unlocked, every flag must rasterise
 * to ONE uniform grey. Any second colour means an antialiasing seam or a stray
 * shape is tracing part of the design before the player has earned it.
 *
 * Also checks each partially-unlocked state only ever shows unlocked colours
 * plus the hidden grey -- never a colour the player has not unlocked.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const src = readFileSync(join(root, 'src/render.js'), 'utf8') + '\n' +
            readFileSync(join(root, 'src/flags.js'), 'utf8');

const browser = await chromium.launch({ executablePath: CHROME });
const p = await browser.newPage();
await p.goto('data:text/html,<meta charset="utf-8"><body></body>');
await p.addScriptTag({ content: src });

const result = await p.evaluate(async () => {
  const SIZE = 360;  /* well above the size the board is actually shown at */

  function rasterise(flag, unlocked) {
    return new Promise((resolve) => {
      const svg = flagSvg(flag, unlocked, {})
        .replace('<svg ', `<svg width="${SIZE}" height="${SIZE * 2 / 3}" `);
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = SIZE; cv.height = SIZE * 2 / 3;
        const g = cv.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, cv.width, cv.height).data;
        const seen = new Map();
        for (let i = 0; i < d.length; i += 4) {
          const k = `${d[i]},${d[i + 1]},${d[i + 2]}`;
          seen.set(k, (seen.get(k) || 0) + 1);
        }
        resolve(seen);
      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  const blankLeaks = [];
  const revealLeaks = [];

  for (const f of FLAGS) {
    /* 1. Fully hidden must rasterise to one flat grey. Grey-on-grey edges still
     * composite to values a shade off, so what matters is the MAGNITUDE of the
     * deviation, not the count: anything within a couple of steps of #84898f is
     * below the threshold of vision, anything beyond it draws a visible line. */
    const seen = await rasterise(f, {});
    const base = [132, 137, 143];
    let worst = 0, worstKey = null, worstPx = 0;
    for (const [k, n] of seen) {
      const v = k.split(',').map(Number);
      const dev = Math.max(Math.abs(v[0] - base[0]), Math.abs(v[1] - base[1]),
                           Math.abs(v[2] - base[2]));
      if (dev > worst) { worst = dev; worstKey = k; worstPx = n; }
    }
    if (worst > 2) {
      blankLeaks.push({ name: f.name, dev: worst, colour: worstKey, px: worstPx });
    }

    /* 2. unlock one colour at a time: nothing but that colour and grey may show */
    const cols = colorsOf(f);
    for (const c of cols) {
      const un = {}; un[c] = true;
      const got = await rasterise(f, un);
      const allowed = new Set(['132,137,143', hexToKey(PALETTE[c].hex)]);
      for (const key of got.keys()) {
        if (!allowed.has(key) && !nearAllowed(key, allowed)) {
          revealLeaks.push({ name: f.name, unlocked: c, stray: key, px: got.get(key) });
          break;
        }
      }
    }
  }

  function hexToKey(hex) {
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',');
  }
  /* antialiased edge pixels blend the two allowed colours; allow anything on
   * the line between them */
  function nearAllowed(key, allowed) {
    const [r, g, b] = key.split(',').map(Number);
    const pts = [...allowed].map((k) => k.split(',').map(Number));
    const [a, c] = pts.length === 2 ? pts : [pts[0], pts[0]];
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const dr = a[0] + (c[0] - a[0]) * t - r;
      const dg = a[1] + (c[1] - a[1]) * t - g;
      const db = a[2] + (c[2] - a[2]) * t - b;
      if (dr * dr + dg * dg + db * db < 400) return true;
    }
    return false;
  }

  return { blankLeaks, revealLeaks, total: FLAGS.length };
});

console.log(`checked ${result.total} flags`);
console.log(`blank-board leaks (deviation > 2/255 from flat grey): ${result.blankLeaks.length}`);
for (const l of result.blankLeaks.slice(0, 25)) {
  console.log(`  ${l.name}: deviation ${l.dev} at rgb(${l.colour}), ${l.px}px`);
}
console.log(`single-colour reveal leaks: ${result.revealLeaks.length}`);
for (const l of result.revealLeaks.slice(0, 25)) {
  console.log(`  ${l.name} [${l.unlocked}] stray ${l.stray} x${l.px}`);
}

await browser.close();
process.exit(result.blankLeaks.length || result.revealLeaks.length ? 1 : 0);
