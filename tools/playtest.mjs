/* Drives the built index.html in a phone-sized viewport and plays a real round,
 * screenshotting as it goes. Loads over file:// on purpose: that is how the game
 * will actually be opened on a plane.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
mkdirSync(join(root, 'build'), { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const p = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
});

const errors = [];
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await p.goto('file://' + join(root, 'index.html'));
await p.waitForFunction(() => typeof state !== 'undefined' && state.answer);

/* Force a known answer so the run is deterministic and worth looking at. */
async function setAnswer(name) {
  await p.evaluate(async (n) => {
    state.answer = FLAGS.find((f) => f.name === n);
    state.guesses = [];
    state.mask = new Uint8Array(GRID_N);
    state.done = false; state.gaveUp = false;
    await gridOf(state.answer);
    await render();
  }, name);
  await p.waitForTimeout(200);
}

await setAnswer('Japan');
await p.screenshot({ path: join(root, 'build/app-1-blank.png') });

async function guess(name) {
  await p.fill('#guess', name);
  await p.waitForTimeout(150);
  await p.click('#suggest button:first-child');
  await p.waitForTimeout(400);
}

/* France is white down the middle: against Japan that should uncover the middle
 * strip with a bite out of it where the red disc sits -- not the whole field. */
await guess('France');
await p.screenshot({ path: join(root, 'build/app-2-after-france.png') });

await guess('Indonesia');
await p.screenshot({ path: join(root, 'build/app-3-after-indonesia.png') });

const mid = await p.evaluate(() => ({
  uncovered: countMask(state.mask) / GRID_N,
  guesses: state.guesses.map((g) => [g.id, +(g.added / GRID_N).toFixed(3)])
}));

await guess('Japan');
await p.waitForTimeout(300);
await p.screenshot({ path: join(root, 'build/app-4-solved.png'), fullPage: true });

await p.click('#menu-open');
await p.waitForTimeout(150);
await p.screenshot({ path: join(root, 'build/app-5-menu.png') });
await p.click('#menu-close');

/* Does a reload rebuild the mask from the saved guesses? */
await setAnswer('Kenya');
await guess('Sudan');
const before = await p.evaluate(() => countMask(state.mask));
await p.reload();
await p.waitForFunction(() => typeof state !== 'undefined' && state.answer && state.mask);
await p.waitForTimeout(400);
const after = await p.evaluate(() => ({
  answer: state.answer.name, guesses: state.guesses.length, mask: countMask(state.mask)
}));

const overflow = await p.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);

console.log('mid-round:', JSON.stringify(mid));
console.log('mask before reload:', before, '-> after:', JSON.stringify(after));
console.log('horizontal overflow px:', overflow);
console.log('page errors:', errors.length ? errors : 'none');

await browser.close();
const ok = !errors.length && overflow === 0 &&
  after.answer === 'Kenya' && after.mask === before && before > 0;
process.exit(ok ? 0 : 1);
