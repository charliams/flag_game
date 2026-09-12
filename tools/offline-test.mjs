/* Proves the installed-app path works with no network: serve the repo, let the
 * service worker cache it, stop the server, then reload and confirm the game
 * still comes up and is playable.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.css': 'text/css'
};

const server = createServer(async (req, res) => {
  const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('nope');
  }
});
await new Promise((r) => server.listen(8791, r));

const browser = await chromium.launch({ executablePath: CHROME });
const p = await browser.newPage({ viewport: { width: 390, height: 844 } });

await p.goto('http://localhost:8791/index.html');
await p.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 10000 })
  .catch(() => {});
/* Give the install handler time to finish caching. */
await p.evaluate(() => navigator.serviceWorker.ready);
await p.waitForTimeout(600);

const swActive = await p.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  const keys = await caches.keys();
  const c = await caches.open(keys[0]);
  return { scope: r && r.scope, caches: keys, entries: (await c.keys()).map((k) => k.url) };
});
console.log('service worker:', swActive.scope);
console.log('cached:', swActive.entries.length, 'entries');

/* Now go dark. */
await new Promise((r) => server.close(r));
console.log('server stopped');

await p.reload();
await p.waitForTimeout(500);

const alive = await p.evaluate(() => ({
  flags: typeof FLAGS !== 'undefined' ? FLAGS.length : 0,
  boardDrawn: !!document.querySelector('#board svg'),
  answer: typeof state !== 'undefined' && state.answer ? state.answer.name : null
}));
console.log('after going offline:', JSON.stringify(alive));

await browser.close();
process.exit(alive.flags === 197 && alive.boardDrawn ? 0 : 1);
