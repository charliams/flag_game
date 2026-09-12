/* Generates the PWA icons: a half-revealed flag, which is the game in one image.
 *   node tools/make-icons.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
mkdirSync(join(root, 'icons'), { recursive: true });

/* Kept deliberately simple and legible at 48px: a grey board with a couple of
 * bands filled in, on the app's dark ground. Maskable-safe (art inside ~80%). */
const art = (s) => `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;width:${s}px;height:${s}px;overflow:hidden}</style>
<svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#14161a"/>
  <g>
    <rect x="18" y="26" width="64" height="48" rx="4" fill="#84898f"/>
    <rect x="18" y="26" width="64" height="16" rx="4" fill="#d1222b"/>
    <rect x="18" y="38" width="64" height="4" fill="#d1222b"/>
    <rect x="18" y="58" width="64" height="16" rx="4" fill="#f6d015"/>
    <rect x="18" y="58" width="64" height="4" fill="#f6d015"/>
  </g>
</svg>`;

const browser = await chromium.launch({ executablePath: CHROME });
for (const size of [192, 512, 180]) {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  await p.goto('data:text/html;charset=utf-8,' + encodeURIComponent(art(size)));
  await p.screenshot({ path: join(root, `icons/icon-${size}.png`), omitBackground: false });
  await p.close();
  console.log('icons/icon-' + size + '.png');
}
await browser.close();
