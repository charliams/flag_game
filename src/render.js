/* ---------------------------------------------------------------------------
 * render.js -- flag art, colour classification, and the spatial reveal.
 *
 * The reveal is positional, not by colour: a guess uncovers exactly those parts
 * of the hidden flag where the guess has the same colour IN THE SAME PLACE.
 * Guessing France against a flag that is white in the middle uncovers that
 * middle strip and nothing else -- not every white region on the flag.
 *
 * So each flag is rasterised once to a fixed grid and every cell classified
 * into one of a few broad colour families. Two flags are compared cell by cell.
 * The families are deliberately coarse: France's blue and the Netherlands' blue
 * are different hex values but must count as the same colour, or matching would
 * turn on shade differences a player cannot see.
 * ------------------------------------------------------------------------- */

/* Grid the comparison runs on. A board is at most about 1000 device pixels
 * wide, so 640 cells across puts a cell under a pixel and the edge of an
 * uncovered region reads as a clean curve. At 320 the stair-stepping along a
 * circle was plainly visible. */
var GRID_W = 640;
var GRID_H = 480;
var GRID_N = GRID_W * GRID_H;

/* Colour of everything not yet uncovered. */
var HIDDEN = '#84898f';

/* Colour families. Indices are what the grids store. */
var FAMILIES = ['red', 'orange', 'yellow', 'green', 'lightblue', 'blue', 'black', 'white'];

/* --- art ---------------------------------------------------------------- */

function svgUrl(flag) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(flag.svg);
}

var imgCache = {};

/* Data URIs are same-origin, so drawing these to a canvas does not taint it --
 * which matters because the grid is built by reading the pixels back. */
function loadFlag(flag) {
  if (imgCache[flag.id]) return imgCache[flag.id];
  imgCache[flag.id] = new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { reject(new Error('could not load ' + flag.id)); };
    img.src = svgUrl(flag);
  });
  return imgCache[flag.id];
}

/* --- colour classification ---------------------------------------------- */

/* Classify by hue and lightness rather than by nearest fixed colour, because
 * flag reds run from crimson to scarlet and a nearest-RGB match splits them
 * apart. Returns an index into FAMILIES.
 *
 * The boundaries below are measured against the actual artwork rather than
 * guessed -- run tools/colour-audit.mjs to see the distribution. Flag colours
 * form a continuum with no natural gaps, so each one is placed where it
 * separates the most regions correctly:
 *
 *   15  reds reach hue 14 (Uganda), Bhutan's orange starts at 15
 *   40  oranges end at 36 (Cote d'Ivoire), golds start at 40 (Kosovo)
 *  168  greens reach 166 (Cameroon's teal-green), cyans start at 182
 *  200  everything from 182 to 199 is a sky blue (Kazakhstan, Botswana,
 *       Bahamas, Palau, Rwanda...), so hue alone decides there; only above
 *       200 do pale blues and navies share a hue and need lightness.
 *
 * Armenia's orange (hue 42) lands in yellow and Estonia's blue in light blue:
 * both sit right on top of colours from the other family and no threshold
 * separates them. Neither changes much in play. */
function classify(r, g, b) {
  var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  var l = (mx + mn) / 510;                        /* 0..1 */
  var s = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255));

  /* Near-neutral: only lightness matters. Greys in coats of arms land here. */
  if (s < 0.18) return l > 0.55 ? 7 : 6;
  if (l > 0.9) return 7;
  if (l < 0.13) return 6;

  var h;
  var d = mx - mn;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;

  if (h < 15 || h >= 335) return 0;               /* red (and magenta/pink) */
  if (h < 40) return l < 0.30 ? 0 : 1;            /* orange; brown -> red */
  if (h < 70) return 2;                           /* yellow / gold */
  if (h < 168) return 3;                          /* green */
  if (h < 200) return l < 0.22 ? 5 : 4;           /* cyan -> light blue */
  if (h < 265) return l > 0.58 ? 4 : 5;           /* pale blue vs navy */
  return 5;                                       /* violet -> blue */
}

/* --- grids -------------------------------------------------------------- */

var gridCache = {};
var gridOrder = [];
var gridWork = null;

/* A grid is 300 KB, so caching all 197 would be 60 MB on a phone that is also
 * running a browser. Keep the recent ones; anything evicted is a few
 * milliseconds to rebuild. */
var GRID_CACHE_MAX = 30;

function cacheGrid(id, grid) {
  gridCache[id] = grid;
  gridOrder.push(id);
  while (gridOrder.length > GRID_CACHE_MAX) {
    var drop = gridOrder.shift();
    if (drop !== id) delete gridCache[drop];
  }
}

function gridOf(flag) {
  if (gridCache[flag.id]) return Promise.resolve(gridCache[flag.id]);
  return loadFlag(flag).then(function (img) {
    if (!gridWork) {
      gridWork = document.createElement('canvas');
      gridWork.width = GRID_W;
      gridWork.height = GRID_H;
    }
    var g = gridWork.getContext('2d', { willReadFrequently: true });
    g.clearRect(0, 0, GRID_W, GRID_H);
    g.drawImage(img, 0, 0, GRID_W, GRID_H);
    var px = g.getImageData(0, 0, GRID_W, GRID_H).data;
    var out = new Uint8Array(GRID_N);
    for (var i = 0, p = 0; i < GRID_N; i++, p += 4) {
      out[i] = classify(px[p], px[p + 1], px[p + 2]);
    }
    cacheGrid(flag.id, out);
    return out;
  });
}

/* Cells where the two flags agree. Returns how many were newly added to mask. */
function addOverlap(mask, answerGrid, guessGrid) {
  var added = 0;
  for (var i = 0; i < GRID_N; i++) {
    if (!mask[i] && answerGrid[i] === guessGrid[i]) { mask[i] = 1; added++; }
  }
  return added;
}

function countMask(mask) {
  var n = 0;
  for (var i = 0; i < GRID_N; i++) n += mask[i];
  return n;
}

/* --- drawing ------------------------------------------------------------ */

var maskCv = null;

function maskToCanvas(mask) {
  if (!maskCv) {
    maskCv = document.createElement('canvas');
    maskCv.width = GRID_W;
    maskCv.height = GRID_H;
  }
  var g = maskCv.getContext('2d');
  var im = g.createImageData(GRID_W, GRID_H);
  var d = im.data;
  for (var i = 0, p = 0; i < GRID_N; i++, p += 4) {
    d[p] = d[p + 1] = d[p + 2] = 255;
    d[p + 3] = mask[i] ? 255 : 0;
  }
  g.putImageData(im, 0, 0);
  return maskCv;
}

var boardWork = null;

/* Draw `flag` into `canvas`, showing only the cells set in `mask`. Pass mask as
 * `true` to show the whole flag (solved, or given up). */
function drawBoard(canvas, flag, mask) {
  var dpr = Math.min(window.devicePixelRatio || 1, 3);
  var cssW = canvas.clientWidth || 360;
  var cssH = Math.round(cssW * 3 / 4);
  var w = Math.max(1, Math.round(cssW * dpr));
  var h = Math.max(1, Math.round(cssH * dpr));

  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  canvas.style.height = cssH + 'px';

  var g = canvas.getContext('2d');
  g.fillStyle = HIDDEN;
  g.fillRect(0, 0, w, h);

  /* Nothing uncovered yet: a flat grey rectangle, identical for every flag.
   * Because unrevealed parts are simply never drawn, there is no shape edge to
   * antialias and therefore nothing that could trace the design early. */
  if (!mask) return Promise.resolve();

  return loadFlag(flag).then(function (img) {
    if (!boardWork) boardWork = document.createElement('canvas');
    if (boardWork.width !== w || boardWork.height !== h) {
      boardWork.width = w; boardWork.height = h;
    }
    var t = boardWork.getContext('2d');
    t.globalCompositeOperation = 'source-over';
    t.clearRect(0, 0, w, h);
    t.drawImage(img, 0, 0, w, h);

    if (mask !== true) {
      t.globalCompositeOperation = 'destination-in';
      t.imageSmoothingEnabled = true;
      t.drawImage(maskToCanvas(mask), 0, 0, w, h);
    }
    g.drawImage(boardWork, 0, 0);
  });
}
