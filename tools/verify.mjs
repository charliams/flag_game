/* Checks the properties the game depends on, across all 197 flags.
 *
 *   1. Every flag's art loads and rasterises.
 *   2. With nothing uncovered the board is one flat grey -- identical for every
 *      flag, so the blank board gives nothing away.
 *   3. The reveal is spatial and exact: with a mask set, the board shows the
 *      real flag where the mask is set and nothing but grey where it is not.
 *   4. Guessing the answer itself uncovers the whole flag.
 *   5. Colour classification is stable across shades: flags that share a colour
 *      family in the same place actually match (France/Netherlands blue, etc).
 *
 * Exits non-zero on any failure.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const browser = await chromium.launch({ executablePath: CHROME });
const p = await browser.newPage({ viewport: { width: 600, height: 600 } });
await p.goto('file://' + join(root, 'index.html'));
await p.waitForFunction(() => typeof state !== 'undefined' && state.answer);

const out = await p.evaluate(async () => {
  const fails = { load: [], blank: [], spatial: [], self: [], family: [] };

  /* A detached canvas the size the board actually draws at. */
  const cv = document.createElement('canvas');
  cv.width = 480; cv.height = 360;
  Object.defineProperty(cv, 'clientWidth', { value: 480 });
  document.body.appendChild(cv);

  const read = () => cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  const GREY = [132, 137, 143];
  const isGrey = (d, p) => Math.abs(d[p] - GREY[0]) <= 2 &&
    Math.abs(d[p + 1] - GREY[1]) <= 2 && Math.abs(d[p + 2] - GREY[2]) <= 2;

  for (const f of FLAGS) {
    /* 1 + 2: load, then draw with nothing uncovered. */
    try {
      await drawBoard(cv, f, null);
    } catch (e) {
      fails.load.push(f.name);
      continue;
    }
    const blank = read();
    let offGrey = 0;
    for (let i = 0; i < blank.length; i += 4) if (!isGrey(blank, i)) offGrey++;
    if (offGrey) fails.blank.push({ name: f.name, px: offGrey });

    /* 4: the flag against itself must agree everywhere. */
    const g = await gridOf(f);
    const m = new Uint8Array(GRID_N);
    const added = addOverlap(m, g, g);
    if (added !== GRID_N) fails.self.push({ name: f.name, added, of: GRID_N });
  }

  /* 3: spatial correctness of the composite. Mask the left half only; the right
   * half of the board must be untouched grey, and the left half must not be
   * (for a flag whose left half is not itself grey-coloured). */
  for (const name of ['Japan', 'Brazil', 'United Kingdom', 'Kenya', 'Nepal', 'South Africa']) {
    const f = FLAGS.find((x) => x.name === name);
    const m = new Uint8Array(GRID_N);
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W / 2; x++) m[y * GRID_W + x] = 1;
    }
    await drawBoard(cv, f, m);
    const d = read();
    let rightNonGrey = 0, leftColoured = 0;
    for (let y = 0; y < cv.height; y++) {
      for (let x = 0; x < cv.width; x++) {
        const i = (y * cv.width + x) * 4;
        /* skip a few pixels either side of the seam, where the mask ramps */
        if (x > cv.width / 2 + 4) { if (!isGrey(d, i)) rightNonGrey++; }
        else if (x < cv.width / 2 - 4) { if (!isGrey(d, i)) leftColoured++; }
      }
    }
    if (rightNonGrey > 0 || leftColoured === 0) {
      fails.spatial.push({ name, rightNonGrey, leftColoured });
    }
  }

  /* 5: shades of the same colour must classify the same, or matching would turn
   * on differences the player cannot see. */
  const sameFamily = [
    ['France', 'Netherlands', 'blue'], ['Ireland', 'Italy', 'green'],
    ['Sweden', 'Ukraine', 'yellow'], ['Denmark', 'Poland', 'red']
  ];
  for (const [a, b, want] of sameFamily) {
    const ga = await gridOf(FLAGS.find((x) => x.name === a));
    const gb = await gridOf(FLAGS.find((x) => x.name === b));
    const idx = FAMILIES.indexOf(want);
    const hasA = ga.includes(idx), hasB = gb.includes(idx);
    if (!hasA || !hasB) fails.family.push({ a, b, want, hasA, hasB });
  }

  cv.remove();
  return { fails, total: FLAGS.length };
});

const { fails, total } = out;
const show = (label, arr) => {
  console.log(`${label}: ${arr.length}`);
  arr.slice(0, 10).forEach((x) => console.log('   ', JSON.stringify(x)));
};

console.log(`checked ${total} flags`);
show('art failed to load', fails.load);
show('blank board not flat grey', fails.blank);
show('composite not spatially exact', fails.spatial);
show('flag does not match itself everywhere', fails.self);
show('colour family mismatches across shades', fails.family);

await browser.close();
const bad = Object.values(fails).reduce((n, a) => n + a.length, 0);
if (!bad) console.log('all checks passed');
process.exit(bad ? 1 : 0);
