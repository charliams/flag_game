/* Inlines src/* into a single self-contained index.html.
 *
 * The point of the single file is the plane: one file saved to a phone opens and
 * plays with no server and no network. Run `node build.mjs` after editing src/.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');

/* render.js first: flag-art.js is data, game.js uses both at load time. */
const JS_FILES = ['src/render.js', 'src/flag-art.js', 'src/game.js'];

const js = JS_FILES.map((f) => `/* ===== ${f} ===== */\n${read(f)}`).join('\n');
const css = read('src/style.css');

const html = read('src/template.html')
  .replace('{{CSS}}', () => css.trim())
  .replace('{{JS}}', () => js.trim());

if (html.includes('{{')) throw new Error('unreplaced placeholder left in template');

writeFileSync(join(root, 'index.html'), html);
console.log(`index.html written: ${(html.length / 1024).toFixed(1)} KB`);
