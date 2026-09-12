/* ---------------------------------------------------------------------------
 * render.js -- turns flag shape lists into SVG.
 *
 * Every flag lives on the same 60x40 canvas. That is deliberate: if flags kept
 * their real aspect ratios, the blank grey board would give the answer away
 * before a single guess. Nepal's pennant is drawn as a shape inside the canvas
 * for the same reason.
 * ------------------------------------------------------------------------- */

var W = 60;
var H = 40;

/* The eight canonical colours. Flags are normalised into these so that colour
 * matching between two flags is a meaningful comparison. */
var PALETTE = {
  red:       { hex: '#d1222b', name: 'Red' },
  orange:    { hex: '#ef7d1a', name: 'Orange' },
  yellow:    { hex: '#f6d015', name: 'Yellow' },
  green:     { hex: '#0f8a3c', name: 'Green' },
  lightblue: { hex: '#56b4e3', name: 'Light blue' },
  blue:      { hex: '#123c8c', name: 'Blue' },
  black:     { hex: '#1a1c1f', name: 'Black' },
  white:     { hex: '#ffffff', name: 'White' }
};

var COLOR_KEYS = ['red', 'orange', 'yellow', 'green', 'lightblue', 'blue', 'black', 'white'];

/* Colour used for regions whose colour has not been unlocked yet. Every hidden
 * region is this exact value, so two adjacent hidden regions read as one blob. */
var HIDDEN = '#84898f';

/* --- shape primitives ---------------------------------------------------- */

function R(x, y, w, h, c) { return { t: 'rect', x: x, y: y, w: w, h: h, c: c }; }
function C(cx, cy, r, c) { return { t: 'circle', cx: cx, cy: cy, r: r, c: c }; }
function E(cx, cy, rx, ry, c) { return { t: 'ellipse', cx: cx, cy: cy, rx: rx, ry: ry, c: c }; }
function P(pts, c) { return { t: 'poly', pts: pts, c: c }; }
function D(d, c) { return { t: 'path', d: d, c: c }; }

/* Star. Points are generated at render time so the data stays readable.
 * `rot` is in degrees; 0 puts a point straight up. `n` defaults to 5. */
function S(cx, cy, r, c, rot, n) {
  return { t: 'star', cx: cx, cy: cy, r: r, c: c, rot: rot || 0, n: n || 5 };
}

/* Crescent: an outer disc of radius r with a smaller disc of radius r2 bitten
 * out of it, offset by (dx, dy) so the crescent can open in any direction.
 * Rendered as a single <path> with two subpaths and fill-rule=evenodd, so it
 * stays ONE shape with ONE colour and recolours atomically like everything
 * else. */
function CR(cx, cy, r, r2, dx, dy, c) {
  return { t: 'cres', cx: cx, cy: cy, r: r, r2: r2, dx: dx, dy: dy, c: c };
}

/* A ring (annulus), same evenodd trick. Useful for emblems and wreaths. */
function RING(cx, cy, r, r2, c) {
  return { t: 'ring', cx: cx, cy: cy, r: r, r2: r2, c: c };
}

/* --- composition helpers ------------------------------------------------ */

/* Bands overlap their neighbour by OVERLAP units. Without this, two adjacent
 * hidden bands antialias against each other and leave a faint hairline that
 * traces the whole layout of an unsolved flag. */
var OVERLAP = 0.06;

function bandsFrom(weights, colors, vertical) {
  var total = 0, i;
  for (i = 0; i < weights.length; i++) total += weights[i];
  var span = vertical ? W : H;
  var out = [];
  var at = 0;
  for (i = 0; i < colors.length; i++) {
    var size = (weights[i] / total) * span;
    var start = at;
    var end = at + size;
    at = end;
    /* grow into the neighbour on any side that is not the flag's own edge */
    var a = start > 0 ? start - OVERLAP : start;
    var b = end < span - 0.001 ? end + OVERLAP : end;
    out.push(vertical ? R(a, 0, b - a, H, colors[i]) : R(0, a, W, b - a, colors[i]));
  }
  return out;
}

function ones(n) { var a = []; while (n--) a.push(1); return a; }

/* hb('red','white','red')          -> equal horizontal bands, top to bottom
 * vb('green','white','orange')     -> equal vertical bands, hoist to fly
 * hbw([1,2,1], ['red','yellow','red']) -> weighted bands */
function hb() { var c = [].slice.call(arguments); return bandsFrom(ones(c.length), c, false); }
function vb() { var c = [].slice.call(arguments); return bandsFrom(ones(c.length), c, true); }
function hbw(weights, colors) { return bandsFrom(weights, colors, false); }
function vbw(weights, colors) { return bandsFrom(weights, colors, true); }

/* Nordic cross. The defining feature is that the cross is shifted toward the
 * hoist -- Sweden is 5:2:9 horizontally and 4:2:4 vertically, which is what
 * these numbers come from. `inner` is the thinner cross laid on top, as on
 * Norway (red field, white cross, blue inner) and Iceland. */
function nordic(field, cross, inner) {
  var out = [R(0, 0, W, H, field)];
  out.push(R(18.75, 0, 7.5, H, cross));
  out.push(R(0, 16, W, 8, cross));
  if (inner) {
    out.push(R(20.25, 0, 4.5, H, inner));
    out.push(R(0, 17.5, W, 5, inner));
  }
  return out;
}

/* A grid of small stars, used for the US canton and similar. */
function starGrid(x0, y0, cols, rows, dx, dy, r, c, stagger) {
  var out = [];
  for (var row = 0; row < rows; row++) {
    var n = cols - (stagger && row % 2 ? 1 : 0);
    var off = (stagger && row % 2) ? dx / 2 : 0;
    for (var col = 0; col < n; col++) {
      out.push(S(x0 + off + col * dx, y0 + row * dy, r, c));
    }
  }
  return out;
}

/* The Union Jack, shared by the UK and a family of ensigns. The counterchanged
 * saltire is approximated: white diagonals with red diagonals offset on top.
 * Not heraldically exact, but unmistakable at a glance -- and the colour set
 * ({blue, white, red}) is exactly right, which is what the game plays on. */
function unionJack(x, y, w, h) {
  var sx = function (v) { return x + v * w / 60; };
  var sy = function (v) { return y + v * h / 40; };
  var out = [R(x, y, w, h, 'blue')];
  /* white saltire */
  out.push(P([sx(0), sy(0), sx(7), sy(0), sx(60), sy(34), sx(60), sy(40), sx(53), sy(40), sx(0), sy(6)].join(' '), 'white'));
  out.push(P([sx(53), sy(0), sx(60), sy(0), sx(60), sy(6), sx(7), sy(40), sx(0), sy(40), sx(0), sy(34)].join(' '), 'white'));
  /* red saltire, offset to one side of each white arm (the counterchange) */
  out.push(P([sx(0), sy(0), sx(3), sy(0), sx(60), sy(36), sx(60), sy(40), sx(57), sy(40), sx(0), sy(4)].join(' '), 'red'));
  out.push(P([sx(57), sy(0), sx(60), sy(0), sx(60), sy(4), sx(3), sy(40), sx(0), sy(40), sx(0), sy(36)].join(' '), 'red'));
  /* white then red upright cross */
  out.push(R(sx(23), y, sx(37) - sx(23), h, 'white'));
  out.push(R(x, sy(13.5), w, sy(26.5) - sy(13.5), 'white'));
  out.push(R(sx(25.5), y, sx(34.5) - sx(25.5), h, 'red'));
  out.push(R(x, sy(16), w, sy(24) - sy(16), 'red'));
  return out;
}

/* Stars and Stripes: 13 stripes, blue canton, simplified star field. */
function usFlag() {
  var out = [];
  for (var i = 0; i < 13; i++) {
    out.push(R(0, i * H / 13 - (i > 0 ? OVERLAP : 0), W,
      H / 13 + (i > 0 ? OVERLAP : 0) + (i < 12 ? OVERLAP : 0),
      i % 2 === 0 ? 'red' : 'white'));
  }
  out.push(R(0, 0, W * 0.4, H * 7 / 13, 'blue'));
  out = out.concat(starGrid(2.2, 1.9, 6, 9, 3.8, 2.1, 0.95, 'white', true));
  return out;
}

/* --- shape -> SVG ------------------------------------------------------- */

function starPoints(cx, cy, r, rot, n) {
  var inner = r * (n === 5 ? 0.382 : 0.5);
  var pts = [];
  for (var i = 0; i < n * 2; i++) {
    var rad = (i % 2 === 0) ? r : inner;
    var a = (Math.PI / n) * i - Math.PI / 2 + (rot * Math.PI / 180);
    pts.push(round(cx + rad * Math.cos(a)) + ',' + round(cy + rad * Math.sin(a)));
  }
  return pts.join(' ');
}

function round(v) { return Math.round(v * 1000) / 1000; }

function discPath(cx, cy, r) {
  return 'M' + round(cx - r) + ',' + round(cy) +
    'a' + round(r) + ',' + round(r) + ' 0 1 0 ' + round(r * 2) + ',0' +
    'a' + round(r) + ',' + round(r) + ' 0 1 0 ' + round(-r * 2) + ',0z';
}

function shapeToSvg(s, fill) {
  switch (s.t) {
    case 'rect':
      /* crispEdges kills antialiasing on axis-aligned edges, the other half of
       * the no-hairline fix (see OVERLAP above). */
      return '<rect x="' + round(s.x) + '" y="' + round(s.y) + '" width="' + round(s.w) +
        '" height="' + round(s.h) + '" fill="' + fill + '" shape-rendering="crispEdges"/>';
    case 'circle':
      return '<circle cx="' + round(s.cx) + '" cy="' + round(s.cy) + '" r="' + round(s.r) +
        '" fill="' + fill + '"/>';
    case 'ellipse':
      return '<ellipse cx="' + round(s.cx) + '" cy="' + round(s.cy) + '" rx="' + round(s.rx) +
        '" ry="' + round(s.ry) + '" fill="' + fill + '"/>';
    case 'poly':
      return '<polygon points="' + s.pts + '" fill="' + fill + '"/>';
    case 'path':
      return '<path d="' + s.d + '" fill="' + fill + '" fill-rule="evenodd"/>';
    case 'star':
      return '<polygon points="' + starPoints(s.cx, s.cy, s.r, s.rot, s.n) + '" fill="' + fill + '"/>';
    case 'cres':
      return '<path d="' + discPath(s.cx, s.cy, s.r) +
        discPath(s.cx + s.dx, s.cy + s.dy, s.r2) +
        '" fill="' + fill + '" fill-rule="evenodd"/>';
    case 'ring':
      return '<path d="' + discPath(s.cx, s.cy, s.r) + discPath(s.cx, s.cy, s.r2) +
        '" fill="' + fill + '" fill-rule="evenodd"/>';
  }
  return '';
}

/* The colour set a flag contributes to / matches on. */
function colorsOf(flag) {
  if (!flag._colors) {
    var seen = {};
    for (var i = 0; i < flag.shapes.length; i++) seen[flag.shapes[i].c] = true;
    flag._colors = COLOR_KEYS.filter(function (k) { return seen[k]; });
  }
  return flag._colors;
}

/* Draw a flag. `unlocked` is a truthy-keyed object of colour keys; anything not
 * in it renders as HIDDEN. Hidden shapes are still drawn, in z-order, so
 * occlusion survives: white unlocked on Japan shows a grey disc on white --
 * you learn a disc is there without learning it is red. */
function flagSvg(flag, unlocked, opts) {
  opts = opts || {};
  var body = '';
  /* Backstop so any sub-pixel gap between shapes shows grey, never the page. */
  body += '<rect x="0" y="0" width="60" height="40" fill="' + HIDDEN +
    '" shape-rendering="crispEdges"/>';
  for (var i = 0; i < flag.shapes.length; i++) {
    var s = flag.shapes[i];
    var show = !unlocked || unlocked[s.c];
    body += shapeToSvg(s, show ? PALETTE[s.c].hex : HIDDEN);
  }
  return '<svg class="' + (opts.cls || 'flag') + '" viewBox="0 0 60 40" ' +
    'preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" ' +
    'role="img" aria-label="' + (opts.label || 'flag') + '">' + body + '</svg>';
}
