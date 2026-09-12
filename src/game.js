/* ---------------------------------------------------------------------------
 * game.js -- state, input and rendering for the guessing loop.
 * ------------------------------------------------------------------------- */

var STORE_KEY = 'flaggame.v1';

var state = {
  tier: 3,        /* include flags up to and including this tier */
  answer: null,
  unlocked: {},   /* colour key -> true, once a guess has matched it */
  tested: {},     /* colour key -> 'hit' | 'miss', once a guess has contained it */
  guesses: [],    /* flag ids, oldest first */
  done: false,
  gaveUp: false
};

var stats = { played: 0, won: 0, best: 0, streak: 0, bestStreak: 0, totalGuesses: 0 };

/* --- persistence --------------------------------------------------------
 * Wrapped because storage throws in private windows and when site data is
 * blocked; the game must still be playable on a plane if it does. */

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      tier: state.tier,
      answer: state.answer ? state.answer.id : null,
      unlocked: state.unlocked,
      tested: state.tested,
      guesses: state.guesses,
      done: state.done,
      gaveUp: state.gaveUp,
      stats: stats
    }));
  } catch (e) { /* not fatal */ }
}

function load() {
  var raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return false; }
  if (!raw) return false;
  var d;
  try { d = JSON.parse(raw); } catch (e) { return false; }
  if (d.stats) for (var k in stats) if (d.stats[k] !== undefined) stats[k] = d.stats[k];
  if (typeof d.tier === 'number') state.tier = d.tier;
  var f = byId(d.answer);
  if (!f) return false;
  state.answer = f;
  state.unlocked = d.unlocked || {};
  state.tested = d.tested || {};
  state.guesses = d.guesses || [];
  state.done = !!d.done;
  state.gaveUp = !!d.gaveUp;
  return true;
}

function byId(id) {
  for (var i = 0; i < FLAGS.length; i++) if (FLAGS[i].id === id) return FLAGS[i];
  return null;
}

/* --- name matching ------------------------------------------------------ */

/* Fold accents and punctuation so "cote d'ivoire" finds "Côte d'Ivoire". */
function norm(s) {
  s = s.toLowerCase();
  var from = 'áàâäãåéèêëíìîïóòôöõúùûüçñý';
  var to = 'aaaaaaeeeeiiiiooooouuuucny';
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var j = from.indexOf(s[i]);
    out += j < 0 ? s[i] : to[j];
  }
  return out.replace(/[^a-z0-9]/g, '');
}

FLAGS.forEach(function (f) {
  f._keys = [norm(f.name)].concat(f.alt.map(norm));
});

function pool() {
  return FLAGS.filter(function (f) { return f.tier <= state.tier; });
}

function search(q) {
  var n = norm(q);
  if (!n) return [];
  var starts = [], contains = [];
  var list = pool();
  for (var i = 0; i < list.length; i++) {
    var f = list[i], hit = 0;
    for (var j = 0; j < f._keys.length; j++) {
      if (f._keys[j].indexOf(n) === 0) { hit = 2; break; }
      if (f._keys[j].indexOf(n) > 0) hit = 1;
    }
    if (hit === 2) starts.push(f); else if (hit === 1) contains.push(f);
  }
  return starts.concat(contains).slice(0, 8);
}

/* --- game flow ---------------------------------------------------------- */

function newGame() {
  var list = pool();
  var pick = list[Math.floor(Math.random() * list.length)];
  /* Avoid immediately repeating the flag just played. */
  if (state.answer && list.length > 1 && pick.id === state.answer.id) {
    pick = list[(list.indexOf(pick) + 1) % list.length];
  }
  state.answer = pick;
  state.unlocked = {};
  state.tested = {};
  state.guesses = [];
  state.done = false;
  state.gaveUp = false;
  save();
  render();
}

function submitGuess(flag) {
  if (state.done || !flag) return;
  if (state.guesses.indexOf(flag.id) >= 0) { flash('Already guessed ' + flag.name); return; }

  var answerColors = colorsOf(state.answer);
  var mine = colorsOf(flag);
  for (var i = 0; i < mine.length; i++) {
    var c = mine[i];
    if (answerColors.indexOf(c) >= 0) { state.unlocked[c] = true; state.tested[c] = 'hit'; }
    else if (state.tested[c] !== 'hit') state.tested[c] = 'miss';
  }
  state.guesses.push(flag.id);

  if (flag.id === state.answer.id) {
    state.done = true;
    stats.played++;
    stats.won++;
    stats.totalGuesses += state.guesses.length;
    stats.streak++;
    if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
    if (!stats.best || state.guesses.length < stats.best) stats.best = state.guesses.length;
  }
  save();
  render();
}

function giveUp() {
  if (state.done) return;
  state.done = true;
  state.gaveUp = true;
  stats.played++;
  stats.streak = 0;
  save();
  render();
}

/* --- rendering ---------------------------------------------------------- */

var el = {};

function render() {
  var revealAll = state.done;
  var unlocked = revealAll ? null : state.unlocked;

  el.board.innerHTML = flagSvg(state.answer, unlocked, {
    cls: 'flag board-flag',
    label: state.done ? state.answer.name : 'the hidden flag'
  });

  /* palette */
  var html = '';
  for (var i = 0; i < COLOR_KEYS.length; i++) {
    var k = COLOR_KEYS[i];
    var st = state.unlocked[k] ? 'hit' : (state.tested[k] === 'miss' ? 'miss' : 'unknown');
    html += '<div class="chip ' + st + '">' +
      '<span class="swatch" style="background:' + PALETTE[k].hex + '"></span>' +
      '<span class="chip-name">' + PALETTE[k].name + '</span>' +
      '<span class="chip-mark">' + (st === 'hit' ? '✓' : st === 'miss' ? '✕' : '') +
      '</span></div>';
  }
  el.palette.innerHTML = html;

  var found = COLOR_KEYS.filter(function (k) { return state.unlocked[k]; }).length;
  var untested = COLOR_KEYS.filter(function (k) { return !state.tested[k]; }).length;
  el.count.textContent = state.guesses.length +
    (state.guesses.length === 1 ? ' guess' : ' guesses') +
    ' · ' + found + ' colour' + (found === 1 ? '' : 's') + ' found' +
    (untested ? ' · ' + untested + ' untested' : ' · all colours tested');

  /* guess history, newest first */
  var rows = '';
  for (var g = state.guesses.length - 1; g >= 0; g--) {
    var f = byId(state.guesses[g]);
    var ac = colorsOf(state.answer);
    var chips = colorsOf(f).map(function (c) {
      var ok = ac.indexOf(c) >= 0;
      return '<span class="mini ' + (ok ? 'hit' : 'miss') + '" title="' + PALETTE[c].name + '">' +
        '<i style="background:' + PALETTE[c].hex + '"></i>' + (ok ? '✓' : '✕') + '</span>';
    }).join('');
    rows += '<li' + (f.id === state.answer.id ? ' class="correct"' : '') + '>' +
      '<div class="thumb">' + flagSvg(f, null, { cls: 'flag', label: f.name }) + '</div>' +
      '<div class="guess-body"><div class="guess-name">' + f.name + '</div>' +
      '<div class="minis">' + chips + '</div></div>' +
      '<div class="guess-no">' + (g + 1) + '</div></li>';
  }
  el.history.innerHTML = rows;

  /* result banner */
  if (state.done) {
    el.result.hidden = false;
    el.result.className = 'result ' + (state.gaveUp ? 'lost' : 'won');
    el.result.innerHTML = '<p class="verdict">' +
      (state.gaveUp ? 'It was <strong>' + state.answer.name + '</strong>'
        : 'Got it — <strong>' + state.answer.name + '</strong> in ' +
          state.guesses.length + (state.guesses.length === 1 ? ' guess' : ' guesses')) +
      '</p><button class="primary" id="next">Next flag</button>';
    document.getElementById('next').addEventListener('click', newGame);
    el.entry.hidden = true;
  } else {
    el.result.hidden = true;
    el.entry.hidden = false;
  }

  el.stats.textContent = stats.played
    ? 'Solved ' + stats.won + '/' + stats.played +
      ' · streak ' + stats.streak + ' (best ' + stats.bestStreak + ')' +
      (stats.best ? ' · fewest ' + stats.best : '')
    : '';
  el.tierLabel.textContent = TIER_NAMES[state.tier] + ' · ' + pool().length + ' flags';
}

var TIER_NAMES = { 1: 'Famous flags', 2: 'Well known', 3: 'Every flag' };

var flashTimer = null;
function flash(msg) {
  el.toast.textContent = msg;
  el.toast.hidden = false;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(function () { el.toast.hidden = true; }, 1800);
}

/* --- autocomplete ------------------------------------------------------- */

function renderSuggestions() {
  var q = el.input.value;
  var results = search(q);
  if (!results.length) { el.suggest.hidden = true; el.suggest.innerHTML = ''; return; }
  el.suggest.innerHTML = results.map(function (f) {
    var used = state.guesses.indexOf(f.id) >= 0;
    return '<button type="button" data-id="' + f.id + '"' + (used ? ' class="used"' : '') + '>' +
      f.name + (used ? ' <span class="tick">already guessed</span>' : '') + '</button>';
  }).join('');
  el.suggest.hidden = false;
}

function wire() {
  el.board = document.getElementById('board');
  el.palette = document.getElementById('palette');
  el.count = document.getElementById('count');
  el.history = document.getElementById('history');
  el.result = document.getElementById('result');
  el.entry = document.getElementById('entry');
  el.input = document.getElementById('guess');
  el.suggest = document.getElementById('suggest');
  el.stats = document.getElementById('stats');
  el.toast = document.getElementById('toast');
  el.tierLabel = document.getElementById('tier-label');

  el.input.addEventListener('input', renderSuggestions);
  el.input.addEventListener('focus', renderSuggestions);

  el.suggest.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-id]');
    if (!b) return;
    submitGuess(byId(b.getAttribute('data-id')));
    el.input.value = '';
    el.suggest.hidden = true;
    el.input.blur();
  });

  document.getElementById('entry').addEventListener('submit', function (e) {
    e.preventDefault();
    var results = search(el.input.value);
    if (!results.length) { flash('No flag matches that'); return; }
    submitGuess(results[0]);
    el.input.value = '';
    el.suggest.hidden = true;
  });

  document.getElementById('giveup').addEventListener('click', function () {
    if (confirm('Reveal the answer? This counts as a loss.')) giveUp();
  });

  document.getElementById('skip').addEventListener('click', newGame);

  document.querySelectorAll('#tiers button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.tier = parseInt(b.getAttribute('data-tier'), 10);
      save();
      newGame();
      document.getElementById('menu').hidden = true;
    });
  });

  document.getElementById('menu-open').addEventListener('click', function () {
    var m = document.getElementById('menu');
    m.hidden = !m.hidden;
  });
  document.getElementById('menu-close').addEventListener('click', function () {
    document.getElementById('menu').hidden = true;
  });
}

function boot() {
  wire();
  if (!load() || !state.answer) newGame();
  else render();

  /* Offline caching when served over http(s). Fails silently on file://,
   * which is fine -- a local copy of this page is already offline. */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
}

document.addEventListener('DOMContentLoaded', boot);
