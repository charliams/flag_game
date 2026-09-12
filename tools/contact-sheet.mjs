/* Renders every flag, fully revealed, into a labelled grid and screenshots it,
 * so the designs can actually be checked by eye against the real thing.
 *
 *   node tools/contact-sheet.mjs [outDir] [--from N] [--to N] [--cols N]
 *
 * Also renders the blank board and a couple of partial-reveal states, which is
 * how we prove no hairline seam or aspect-ratio difference leaks the answer
 * before any colour is unlocked.
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const args = process.argv.slice(2);
const outDir = args[0] && !args[0].startsWith('--') ? args[0] : join(root, 'build');
const opt = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i < 0 ? dflt : Number(args[i + 1]);
};
const from = opt('from', 0);
const to = opt('to', 1e9);
const cols = opt('cols', 6);

mkdirSync(outDir, { recursive: true });

const src = readFileSync(join(root, 'src/render.js'), 'utf8') + '\n' +
            readFileSync(join(root, 'src/flags.js'), 'utf8');

const page = `<!doctype html><meta charset="utf-8">
<style>
  body { margin:0; background:#fff; font:13px system-ui, sans-serif; color:#111; }
  .grid { display:grid; gap:10px 12px; padding:14px; }
  figure { margin:0; }
  .cell { border:1px solid #bbb; line-height:0; }
  svg { display:block; width:100%; height:auto; aspect-ratio:3/2; }
  figcaption { line-height:1.3; padding-top:4px; font-size:12px; }
  .t { color:#777; }
  h2 { font:600 15px system-ui; margin:16px 14px 0; }
</style>
<div id="out"></div>
<script>${src}</script>
<script>
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode') || 'all';
  const from = +params.get('from') || 0;
  const to = params.get('to') ? +params.get('to') : 1e9;
  const cols = +params.get('cols') || 6;
  const out = document.getElementById('out');

  function cell(flag, unlocked, note) {
    return '<figure><div class="cell">' +
      flagSvg(flag, unlocked, {}) + '</div><figcaption>' + flag.name +
      '<br><span class="t">' + (note !== undefined ? note : 't' + flag.tier + ' \\u00b7 ' +
        colorsOf(flag).join(' ')) + '</span></figcaption></figure>';
  }

  if (mode === 'all') {
    const list = FLAGS.slice(from, to);
    out.innerHTML = '<div class="grid" style="grid-template-columns:repeat(' + cols +
      ',1fr)">' + list.map(f => cell(f, null)).join('') + '</div>';
  } else if (mode === 'blank') {
    /* Every flag with nothing unlocked. All of these MUST look identical. */
    const list = FLAGS.slice(0, 24);
    out.innerHTML = '<div class="grid" style="grid-template-columns:repeat(6,1fr)">' +
      list.map(f => cell(f, {}, 'blank')).join('') + '</div>';
  } else if (mode === 'partial') {
    const picks = [
      ['jp', { white: 1 }], ['jp', { red: 1 }],
      ['br', { green: 1, yellow: 1 }], ['br', { blue: 1, white: 1 }],
      ['gb', { blue: 1 }], ['gb', { white: 1 }], ['gb', { red: 1, white: 1 }],
      ['us', { red: 1 }], ['za', { green: 1, yellow: 1 }],
      ['np', { red: 1 }], ['np', { blue: 1 }], ['ch', { white: 1 }],
      ['ke', { red: 1 }], ['in', { orange: 1, green: 1 }],
      ['de', { black: 1 }], ['se', { yellow: 1 }]
    ];
    out.innerHTML = '<div class="grid" style="grid-template-columns:repeat(4,1fr)">' +
      picks.map(([id, unlocked]) => {
        const f = FLAGS.find(x => x.id === id);
        return cell(f, unlocked, 'unlocked: ' + Object.keys(unlocked).join(' '));
      }).join('') + '</div>';
  }
</script>`;

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ deviceScaleFactor: 2 });
const p = await ctx.newPage();

async function shoot(name, query, width) {
  await p.setViewportSize({ width, height: 900 });
  await p.goto('data:text/html;charset=utf-8,' + encodeURIComponent(page) + query);
  await p.waitForTimeout(250);
  const file = join(outDir, name);
  await p.screenshot({ path: file, fullPage: true });
  console.log('wrote', file);
}

if (args.includes('--only-checks')) {
  await shoot('check-blank.png', '?mode=blank', 1100);
  await shoot('check-partial.png', '?mode=partial', 900);
} else {
  await shoot('sheet.png', `?mode=all&from=${from}&to=${to}&cols=${cols}`, cols * 190);
}

await browser.close();
