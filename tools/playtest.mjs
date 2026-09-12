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
await p.waitForTimeout(300);

/* Force a known answer so the run is deterministic and worth looking at. */
await p.evaluate(() => {
  state.answer = FLAGS.find((f) => f.name === 'Brazil');
  state.unlocked = {}; state.tested = {}; state.guesses = []; state.done = false;
  render();
});
await p.screenshot({ path: join(root, 'build/app-1-blank.png') });

async function guess(name) {
  await p.fill('#guess', name);
  await p.waitForTimeout(120);
  await p.click('#suggest button:first-child');
  await p.waitForTimeout(150);
}

await guess('France');            /* blue + white hit, red miss */
await p.screenshot({ path: join(root, 'build/app-2-after-france.png') });

await guess('Jamaica');           /* green + yellow hit, black miss */
await p.screenshot({ path: join(root, 'build/app-3-after-jamaica.png') });

await guess('Brazil');            /* solved */
await p.waitForTimeout(200);
await p.screenshot({ path: join(root, 'build/app-4-solved.png'), fullPage: true });

/* menu / tier picker */
await p.click('#menu-open');
await p.waitForTimeout(150);
await p.screenshot({ path: join(root, 'build/app-5-menu.png') });

/* Does a reload restore the in-progress game from storage? */
await p.click('#menu-close');
await p.evaluate(() => {
  state.answer = FLAGS.find((f) => f.name === 'Kenya');
  state.unlocked = { red: true }; state.tested = { red: 'hit' };
  state.guesses = ['ch']; state.done = false; save(); render();
});
await p.reload();
await p.waitForTimeout(300);
const restored = await p.evaluate(() => ({
  answer: state.answer.name, guesses: state.guesses.length, unlocked: Object.keys(state.unlocked)
}));

/* Horizontal overflow check at phone width. */
const overflow = await p.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);

console.log('restored after reload:', JSON.stringify(restored));
console.log('horizontal overflow px:', overflow);
console.log('page errors:', errors.length ? errors : 'none');

await browser.close();
process.exit(errors.length || overflow > 0 || restored.answer !== 'Kenya' ? 1 : 0);
