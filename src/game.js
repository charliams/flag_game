/* ---------------------------------------------------------------------------
 * game.js -- state, input and the guessing loop.
 *
 * The reveal mask is never stored: it is derived from the answer plus the list
 * of guesses, so a saved game is just those ids and can be rebuilt on load.
 * ------------------------------------------------------------------------- */

var STORE_KEY = 'flaggame.v2';

var state = {
  tier: 3,
  answer: null,
  guesses: [],      /* [{ id, added }] oldest first; added = cells this guess uncovered */
  mask: null,       /* Uint8Array, derived */
  done: false,
  gaveUp: false,
  busy: false
};

var stats = { played: 0, won: 0, best: 0, streak: 0, bestStreak: 0 };

/* --- persistence -------------------------------------------------------- */

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      tier: state.tier,
      answer: state.answer ? state.answer.id : null,
      guesses: state.guesses.map(function (g) { return g.id; }),
      done: state.done,
      gaveUp: state.gaveUp,
      stats: stats
    }));
  } catch (e) { /* private windows and blocked storage: not fatal */ }
}

function loadSaved() {
  var raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function byId(id) {
  for (var i = 0; i < FLAGS.length; i++) if (FLAGS[i].id === id) return FLAGS[i];
  return null;
}

/* --- name matching ------------------------------------------------------ */

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

FLAGS.forEach(function (f) { f._keys = [norm(f.name)].concat(f.alt.map(norm)); });

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
  if (state.answer && list.length > 1 && pick.id === state.answer.id) {
    pick = list[(list.indexOf(pick) + 1) % list.length];
  }
  state.answer = pick;
  state.guesses = [];
  state.mask = new Uint8Array(GRID_N);
  state.done = false;
  state.gaveUp = false;
  save();
  return gridOf(pick).then(render);
}

function submitGuess(flag) {
  if (state.done || state.busy || !flag) return Promise.resolve();
  for (var i = 0; i < state.guesses.length; i++) {
    if (state.guesses[i].id === flag.id) {
      flash('Already guessed ' + flag.name);
      return Promise.resolve();
    }
  }
  state.busy = true;
  return Promise.all([gridOf(state.answer), gridOf(flag)]).then(function (grids) {
    var added = addOverlap(state.mask, grids[0], grids[1]);
    state.guesses.push({ id: flag.id, added: added });

    if (flag.id === state.answer.id) {
      state.done = true;
      stats.played++;
      stats.won++;
      stats.streak++;
      if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
      if (!stats.best || state.guesses.length < stats.best) stats.best = state.guesses.length;
    }
    state.busy = false;
    save();
    return render();
  }).catch(function (e) {
    state.busy = false;
    flash('Could not load that flag');
    throw e;
  });
}

function giveUp() {
  if (state.done) return Promise.resolve();
  state.done = true;
  state.gaveUp = true;
  stats.played++;
  stats.streak = 0;
  save();
  return render();
}

/* --- rendering ---------------------------------------------------------- */

var el = {};

function pct(cells) { return Math.round(cells / GRID_N * 100); }

function render() {
  var uncovered = state.done ? GRID_N : countMask(state.mask);
  var shown = state.done ? true : (uncovered ? state.mask : null);

  var drawing = drawBoard(el.board, state.answer, shown);

  el.count.textContent = state.done
    ? (state.gaveUp ? 'Revealed' : 'Solved in ' + state.guesses.length +
        (state.guesses.length === 1 ? ' guess' : ' guesses'))
    : pct(uncovered) + '% uncovered · ' + state.guesses.length +
      (state.guesses.length === 1 ? ' guess' : ' guesses');

  el.bar.style.width = (state.done ? 100 : pct(uncovered)) + '%';

  /* guess history, newest first */
  var rows = '';
  for (var i = state.guesses.length - 1; i >= 0; i--) {
    var g = state.guesses[i];
    var f = byId(g.id);
    var gain = pct(g.added);
    rows += '<li' + (f.id === state.answer.id ? ' class="correct"' : '') + '>' +
      '<div class="thumb"><img alt="" src="' + svgUrl(f) + '"></div>' +
      '<div class="guess-body"><div class="guess-name">' + f.name + '</div>' +
      '<div class="guess-gain' + (g.added ? '' : ' zero') + '">' +
      (g.added ? '+' + (gain < 1 ? '<1' : gain) + '% uncovered' : 'nothing in common') +
      '</div></div><div class="guess-no">' + (i + 1) + '</div></li>';
  }
  el.history.innerHTML = rows;

  if (state.done) {
    el.result.hidden = false;
    el.result.className = 'result ' + (state.gaveUp ? 'lost' : 'won');
    el.result.innerHTML = '<p class="verdict">' +
      (state.gaveUp ? 'It was <strong>' + state.answer.name + '</strong>'
        : '<strong>' + state.answer.name + '</strong> — ' + state.guesses.length +
          (state.guesses.length === 1 ? ' guess' : ' guesses')) +
      '</p><button class="primary" id="next">Next flag</button>';
    document.getElementById('next').addEventListener('click', function () { newGame(); });
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

  return drawing;
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
  var results = search(el.input.value);
  if (!results.length) { el.suggest.hidden = true; el.suggest.innerHTML = ''; return; }
  var used = {};
  state.guesses.forEach(function (g) { used[g.id] = true; });
  el.suggest.innerHTML = results.map(function (f) {
    return '<button type="button" data-id="' + f.id + '"' + (used[f.id] ? ' class="used"' : '') +
      '><img alt="" src="' + svgUrl(f) + '"><span>' + f.name + '</span>' +
      (used[f.id] ? '<span class="tick">guessed</span>' : '') + '</button>';
  }).join('');
  el.suggest.hidden = false;
}

function wire() {
  el.board = document.getElementById('board');
  el.bar = document.getElementById('bar');
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

  el.entry.addEventListener('submit', function (e) {
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
  document.getElementById('skip').addEventListener('click', function () { newGame(); });

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

  /* The board is a canvas, so it has to be redrawn at the new pixel size when
   * the window changes -- rotating the phone, mainly. */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (state.answer) render(); }, 120);
  });
}

/* Rebuild the reveal mask from the saved guess list. */
function restore(d) {
  var answer = byId(d.answer);
  if (!answer) return newGame();
  state.answer = answer;
  state.done = !!d.done;
  state.gaveUp = !!d.gaveUp;
  state.mask = new Uint8Array(GRID_N);
  state.guesses = [];

  var ids = (d.guesses || []).filter(byId);
  return gridOf(answer).then(function (ag) {
    return ids.reduce(function (chain, id) {
      return chain.then(function () {
        return gridOf(byId(id)).then(function (gg) {
          state.guesses.push({ id: id, added: addOverlap(state.mask, ag, gg) });
        });
      });
    }, Promise.resolve());
  }).then(render);
}

function boot() {
  wire();
  var d = loadSaved();
  if (d && d.stats) for (var k in stats) if (d.stats[k] !== undefined) stats[k] = d.stats[k];
  if (d && typeof d.tier === 'number') state.tier = d.tier;

  var ready = (d && d.answer && byId(d.answer)) ? restore(d) : newGame();
  ready.catch(function () { return newGame(); });

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
}

document.addEventListener('DOMContentLoaded', boot);
