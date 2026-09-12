/* ---------------------------------------------------------------------------
 * flags.js -- the flag set.
 *
 * INVARIANT, please preserve it when editing: a flag must never be built from
 * shapes that merely ABUT one another. Start with a full-bleed background and
 * layer on top of it, or use the hb/vb band helpers (which overlap their
 * neighbours on purpose). The reason is the core of the game: while a colour is
 * still locked its regions are painted one flat grey, and two grey shapes that
 * share an exact edge antialias into a visible hairline that would trace the
 * whole design of an unsolved flag. Overlapping layers put every edge on top of
 * an already-painted region, so grey-on-grey is invisible.
 *
 * Emblems are simplified. Coats of arms, Arabic calligraphy and animals are
 * drawn as recognisable stand-ins in the right position; a simplified emblem
 * must never introduce a colour the real flag does not have, because a flag's
 * colour set is what the game is played on.
 *
 * Tiers: 1 = most people could name it, 2 = a flag enthusiast would, 3 = deep cuts.
 * ------------------------------------------------------------------------- */

/* concat shapes and arrays-of-shapes into one flat list */
function cc() {
  var out = [];
  for (var i = 0; i < arguments.length; i++) {
    var a = arguments[i];
    if (a && a.length !== undefined && a.t === undefined) out = out.concat(a);
    else out.push(a);
  }
  return out;
}

function F(id, name, tier, shapes, alt) {
  return { id: id, name: name, tier: tier, shapes: shapes, alt: alt || [] };
}

/* n stars evenly spaced on a circle */
function ring(cx, cy, rad, n, r, c, fromDeg) {
  var out = [];
  var from = (fromDeg === undefined ? -90 : fromDeg);
  for (var i = 0; i < n; i++) {
    var a = (from + i * 360 / n) * Math.PI / 180;
    out.push(S(cx + rad * Math.cos(a), cy + rad * Math.sin(a), r, c));
  }
  return out;
}

/* n stars along an arc from fromDeg to toDeg */
function arc(cx, cy, rad, n, r, c, fromDeg, toDeg) {
  var out = [];
  for (var i = 0; i < n; i++) {
    var t = n === 1 ? 0.5 : i / (n - 1);
    var a = (fromDeg + (toDeg - fromDeg) * t) * Math.PI / 180;
    out.push(S(cx + rad * Math.cos(a), cy + rad * Math.sin(a), r, c));
  }
  return out;
}

/* A serrated hoist band, as on Qatar and Bahrain: flat to x=flat, then n
 * triangular teeth pointing to x=tip. */
function serrated(flat, tip, n, c) {
  var pts = ['0,0', flat + ',0'];
  var step = H / n;
  for (var i = 0; i < n; i++) {
    pts.push(tip + ',' + round(step * i + step / 2));
    pts.push(flat + ',' + round(step * (i + 1)));
  }
  pts.push('0,40');
  return P(pts.join(' '), c);
}

/* A pall (a sideways Y), used by South Africa and Vanuatu. Given the hoist
 * half-widths and the junction, returns one closed polygon. */
function pall(outerTop, outerBot, junctionX, armTop, armBot, innerTop, innerBot, apexX, c) {
  return P([
    '0,' + outerTop,
    junctionX + ',' + armTop,
    '60,' + armTop,
    '60,' + armBot,
    junctionX + ',' + armBot,
    '0,' + outerBot,
    '0,' + innerBot,
    apexX + ',20',
    '0,' + innerTop
  ].join(' '), c);
}

var FLAGS = [

F('af', 'Afghanistan', 2, cc(vb('black', 'red', 'green'),
  C(30, 20, 5.5, 'white'), C(30, 20, 4, 'green'), R(28.6, 16, 2.8, 8, 'white'))),

F('al', 'Albania', 2, cc(R(0, 0, 60, 40, 'red'),
  P('18.5,11 20,8.5 23,10 25.5,13 30,14 34.5,13 37,10 40,8.5 41.5,11 38.5,13 36,15.5 43,17 38,20 42,24 35.5,23 37.5,28.5 33,28 33,32.5 30,34 27,32.5 27,28 22.5,28.5 24.5,23 18,24 22,20 17,17 24,15.5 21.5,13', 'black'))),

F('dz', 'Algeria', 1, cc(vb('green', 'white'),
  CR(28, 20, 7.2, 5.9, 2.4, 0, 'red'), S(35.6, 20, 3.4, 'red', 0))),

F('ad', 'Andorra', 3, cc(vb('blue', 'yellow', 'red'),
  P('25,13 35,13 35,23 30,27.5 25,23', 'red'),
  R(26.5, 14.5, 7, 1.4, 'yellow'), R(26.5, 17.5, 7, 1.4, 'yellow'),
  R(26.5, 20.5, 7, 1.4, 'yellow'))),

F('ao', 'Angola', 2, cc(hb('red', 'black'),
  RING(30, 20, 6.5, 4.6, 'yellow'), S(30, 12.5, 3, 'yellow'),
  P('22,24 38,15 39,17 23,26', 'yellow'))),

F('ag', 'Antigua and Barbuda', 3, cc(R(0, 0, 60, 40, 'red'),
  P('0,0 60,0 45,20 15,20', 'black'),
  C(30, 20, 7, 'yellow'),
  P('15,20 45,20 39.75,27 20.25,27', 'lightblue'),
  P('20.25,27 39.75,27 30,40', 'white'))),

F('ar', 'Argentina', 1, cc(hb('lightblue', 'white', 'lightblue'),
  S(30, 20, 5, 'yellow', 0, 16), C(30, 20, 2.6, 'yellow'))),

F('am', 'Armenia', 2, hb('red', 'blue', 'orange')),

F('au', 'Australia', 1, cc(R(0, 0, 60, 40, 'blue'), unionJack(0, 0, 30, 20),
  S(15, 30, 4.6, 'white', 0, 7),
  S(45, 8, 2.6, 'white'), S(52.5, 17, 2.6, 'white'), S(45, 27, 2.6, 'white'),
  S(38, 18.5, 2.6, 'white'), S(47.5, 13, 1.5, 'white'))),

F('at', 'Austria', 1, hb('red', 'white', 'red')),

F('az', 'Azerbaijan', 2, cc(hb('lightblue', 'red', 'green'),
  CR(27, 20, 4.4, 3.6, 1.6, 0, 'white'), S(33.2, 20, 2.6, 'white'))),

F('bs', 'Bahamas', 2, cc(hb('lightblue', 'yellow', 'lightblue'),
  P('0,0 0,40 21,20', 'black'))),

F('bh', 'Bahrain', 2, cc(R(0, 0, 60, 40, 'red'), serrated(12, 19, 5, 'white'))),

F('bd', 'Bangladesh', 1, cc(R(0, 0, 60, 40, 'green'), C(26, 20, 9.5, 'red'))),

F('bb', 'Barbados', 2, cc(vb('blue', 'yellow', 'blue'),
  R(28.8, 16, 2.4, 13, 'black'), P('28.8,29 31.2,29 30,32', 'black'),
  R(23.8, 15.5, 12.4, 2.2, 'black'),
  P('28.6,15.5 31.4,15.5 30,7.5', 'black'),
  P('24.1,15.5 26.1,15.5 25.1,9', 'black'),
  P('33.9,15.5 35.9,15.5 34.9,9', 'black'))),

F('by', 'Belarus', 3, cc(hbw([2, 1], ['red', 'green']),
  R(0, 0, 8, 40, 'white'),
  P('4,4 6.5,7 4,10 1.5,7', 'red'), P('4,14 6.5,17 4,20 1.5,17', 'red'),
  P('4,24 6.5,27 4,30 1.5,27', 'red'), P('4,34 6.5,37 4,40 1.5,37', 'red'))),

F('be', 'Belgium', 1, vb('black', 'yellow', 'red')),

F('bz', 'Belize', 3, cc(R(0, 0, 60, 40, 'blue'),
  R(0, 0, 60, 4, 'red'), R(0, 36, 60, 4, 'red'),
  C(30, 20, 13, 'white'), RING(30, 20, 13, 10.5, 'green'),
  P('26,14 34,14 34,22 30,26 26,22', 'green'), R(29.2, 14, 1.6, 12, 'red'))),

F('bj', 'Benin', 2, cc(hb('yellow', 'red'), R(0, 0, 24, 40, 'green'))),

F('bt', 'Bhutan', 2, cc(R(0, 0, 60, 40, 'yellow'), P('60,0 60,40 0,40', 'orange'),
  D('M13,27 C19,19 25,31 31,23 C35,18 43,21 47,14 C44,23 36,21 31,27 ' +
    'C26,34 19,23 13,27 Z', 'white'),
  C(46, 15, 2, 'white'))),

F('bo', 'Bolivia', 2, hb('red', 'yellow', 'green')),

F('ba', 'Bosnia and Herzegovina', 2, cc(R(0, 0, 60, 40, 'blue'),
  P('20,1 58,1 58,39', 'yellow'),
  S(19.5, 4, 1.7, 'white'), S(24, 8.5, 1.7, 'white'), S(28.5, 13, 1.7, 'white'),
  S(33, 17.5, 1.7, 'white'), S(37.5, 22, 1.7, 'white'), S(42, 26.5, 1.7, 'white'),
  S(46.5, 31, 1.7, 'white'), S(51, 35.5, 1.7, 'white'))),

F('bw', 'Botswana', 2, cc(R(0, 0, 60, 40, 'lightblue'),
  R(0, 14, 60, 12, 'white'), R(0, 16.5, 60, 7, 'black'))),

F('br', 'Brazil', 1, cc(R(0, 0, 60, 40, 'green'),
  P('30,3.5 56.5,20 30,36.5 3.5,20', 'yellow'),
  C(30, 20, 9, 'blue'),
  D('M21.31,17.67 A10,10 0 0 1 38.69,17.67 A16,16 0 0 0 21.31,17.67 Z', 'white'),
  S(26, 16, 1, 'white'), S(31, 15.5, 0.9, 'white'), S(35, 17, 0.8, 'white'),
  S(28, 24, 0.9, 'white'), S(33.5, 23.5, 0.8, 'white'), S(24, 20.5, 0.8, 'white'))),

F('bn', 'Brunei', 3, cc(R(0, 0, 60, 40, 'yellow'),
  P('0,6 60,22 60,35 0,19', 'white'), P('0,12.5 60,28.5 60,35 0,19', 'black'),
  CR(30, 21, 5.5, 4.4, 2, 0, 'red'), P('24,14 36,14 30,10', 'red'),
  R(23, 26, 14, 1.6, 'red'))),

F('bg', 'Bulgaria', 2, hb('white', 'green', 'red')),

F('bf', 'Burkina Faso', 2, cc(hb('red', 'green'), S(30, 20, 5.2, 'yellow'))),

F('bi', 'Burundi', 3, cc(R(0, 0, 60, 40, 'white'),
  P('2.5,0 57.5,0 30,17.5', 'red'), P('2.5,40 57.5,40 30,22.5', 'red'),
  P('0,2.5 0,37.5 26,20', 'green'), P('60,2.5 60,37.5 34,20', 'green'),
  C(30, 20, 6.8, 'white'),
  S(30, 15.6, 2.1, 'red'), S(26.4, 22.4, 2.1, 'red'), S(33.6, 22.4, 2.1, 'red'))),

F('kh', 'Cambodia', 2, cc(hbw([1, 2, 1], ['blue', 'red', 'blue']),
  R(22, 25, 16, 2.2, 'white'),
  R(28.6, 12, 2.8, 14, 'white'), P('30,9 32.2,13 27.8,13', 'white'),
  R(23.5, 17, 2.4, 9, 'white'), P('24.7,14.5 26.4,18 23,18', 'white'),
  R(34.1, 17, 2.4, 9, 'white'), P('35.3,14.5 37,18 33.6,18', 'white'))),

F('cm', 'Cameroon', 2, cc(vb('green', 'red', 'yellow'), S(30, 20, 4.8, 'yellow'))),

F('ca', 'Canada', 1, cc(vbw([1, 2, 1], ['red', 'white', 'red']),
  P('30,4.5 31.1,7.75 34.75,7 33.9,10.75 38.25,14.25 37.25,16 40.5,19.25 ' +
    '35,20.75 35.75,23 31.75,22.5 32,25 30.6,24.25 30.6,31 29.4,31 29.4,24.25 ' +
    '28,25 28.25,22.5 24.25,23 25,20.75 19.5,19.25 22.75,16 21.75,14.25 ' +
    '26.1,10.75 25.25,7 28.9,7.75', 'red'))),

F('cv', 'Cabo Verde', 3, cc(R(0, 0, 60, 40, 'blue'),
  R(0, 21, 60, 8.5, 'white'), R(0, 23.8, 60, 2.6, 'red'),
  ring(22.5, 25, 9.5, 10, 1.4, 'yellow')), ['Cape Verde']),

F('cf', 'Central African Republic', 3, cc(hb('blue', 'white', 'green', 'yellow'),
  R(24, 0, 7, 40, 'red'), S(9, 6, 3.2, 'yellow'))),

F('td', 'Chad', 2, vb('blue', 'yellow', 'red')),

F('cl', 'Chile', 1, cc(hb('white', 'red'),
  R(0, 0, 20, 20, 'blue'), S(10, 10, 5.5, 'white'))),

F('cn', 'China', 1, cc(R(0, 0, 60, 40, 'red'),
  S(10, 9, 5, 'yellow'),
  S(20, 3.5, 1.9, 'yellow'), S(24.5, 8, 1.9, 'yellow'),
  S(24.5, 13.5, 1.9, 'yellow'), S(20, 18, 1.9, 'yellow'))),

F('co', 'Colombia', 1, hbw([2, 1, 1], ['yellow', 'blue', 'red'])),

F('km', 'Comoros', 3, cc(hb('yellow', 'white', 'red', 'blue'),
  P('0,0 0,40 26,20', 'green'),
  CR(9, 20, 5, 4, 1.8, 0, 'white'),
  S(14.5, 13, 1.3, 'white'), S(16, 17, 1.3, 'white'),
  S(16, 23, 1.3, 'white'), S(14.5, 27, 1.3, 'white'))),

F('cg', 'Congo', 3, cc(R(0, 0, 60, 40, 'green'),
  P('0,40 60,0 60,40', 'red'),
  P('0,34 51,0 60,0 60,6 9,40 0,40', 'yellow')), ['Republic of the Congo', 'Congo-Brazzaville']),

F('cd', 'DR Congo', 2, cc(R(0, 0, 60, 40, 'lightblue'),
  P('0,33 49.5,0 60,0 60,7 10.5,40 0,40', 'yellow'),
  P('0,35.5 53.25,0 60,0 60,4.5 6.75,40 0,40', 'red'),
  S(8.5, 9, 4.2, 'yellow')), ['Democratic Republic of the Congo', 'Zaire']),

F('cr', 'Costa Rica', 2, hbw([1, 1, 2, 1, 1], ['blue', 'white', 'red', 'white', 'blue'])),

F('ci', "Cote d'Ivoire", 2, vb('orange', 'white', 'green'), ['Ivory Coast']),

F('hr', 'Croatia', 1, cc(hb('red', 'white', 'blue'),
  P('24,11.5 36,11.5 36,22 30,28 24,22', 'red'),
  R(24, 11.5, 3, 3, 'white'), R(30, 11.5, 3, 3, 'white'),
  R(27, 14.5, 3, 3, 'white'), R(33, 14.5, 3, 3, 'white'),
  R(24, 17.5, 3, 3, 'white'), R(30, 17.5, 3, 3, 'white'))),

F('cu', 'Cuba', 1, cc(hb('blue', 'white', 'blue', 'white', 'blue'),
  P('0,0 0,40 24,20', 'red'), S(8.5, 20, 3.6, 'white'))),

F('cy', 'Cyprus', 2, cc(R(0, 0, 60, 40, 'white'),
  D('M20,15 C24,11.5 30,12.5 34.5,14.5 C38.5,16 42,17 40,20 C38,22.5 34,21 30,22 ' +
    'C26,23 22,22.5 20,20.5 C18,18.5 18,16 20,15 Z', 'orange'),
  P('25,24 28,28.5 30,27.5 26.8,23.2', 'green'),
  P('35,24 32,28.5 30,27.5 33.2,23.2', 'green'))),

F('cz', 'Czechia', 1, cc(hb('white', 'red'), P('0,0 0,40 26,20', 'blue')),
  ['Czech Republic']),

F('dk', 'Denmark', 1, nordic('red', 'white')),

F('dj', 'Djibouti', 3, cc(hb('lightblue', 'green'),
  P('0,0 0,40 26,20', 'white'), S(8.5, 20, 3.4, 'red'))),

F('dm', 'Dominica', 3, cc(R(0, 0, 60, 40, 'green'),
  R(25, 0, 3.06, 40, 'yellow'), R(28, 0, 3.06, 40, 'black'), R(31, 0, 3, 40, 'white'),
  R(0, 16, 60, 3.06, 'yellow'), R(0, 19, 60, 3.06, 'black'), R(0, 22, 60, 3, 'white'),
  C(30, 20, 6.5, 'red'),
  P('29,16.5 31,16.5 32,20 30,24 28,20', 'green'),
  ring(30, 20, 5.4, 10, 1, 'green'))),

F('do', 'Dominican Republic', 2, cc(R(0, 0, 60, 40, 'blue'),
  R(30, 0, 30, 20, 'red'), R(0, 20, 30, 20, 'red'),
  R(26, 0, 8, 40, 'white'), R(0, 16, 60, 8, 'white'),
  P('26.5,16.5 33.5,16.5 33.5,21.5 30,24 26.5,21.5', 'blue'),
  R(29.4, 17.5, 1.2, 5, 'red'))),

F('ec', 'Ecuador', 2, cc(hbw([2, 1, 1], ['yellow', 'blue', 'red']),
  E(30, 20, 5.5, 7, 'yellow'), E(30, 20, 4.3, 5.8, 'blue'),
  P('30,15 33,21 27,21', 'yellow'), S(30, 12, 2.2, 'yellow'))),

F('eg', 'Egypt', 1, cc(hb('red', 'white', 'black'),
  P('30,15 27,17 21,17.5 24.5,20 22,23 27.5,21.5 30,26 32.5,21.5 38,23 35.5,20 ' +
    '39,17.5 33,17', 'yellow'),
  C(30, 14, 1.7, 'yellow'), P('31.5,13.5 34,14.5 31.5,15.5', 'yellow'),
  R(25.5, 26, 9, 1.3, 'yellow'))),

F('sv', 'El Salvador', 3, cc(hb('blue', 'white', 'blue'),
  P('24,14.5 36,14.5 30,25.5', 'blue'),
  P('26.4,17 33.6,17 30,23.5', 'white'),
  S(30, 19.5, 1.8, 'yellow'))),

F('gq', 'Equatorial Guinea', 3, cc(hb('green', 'white', 'red'),
  P('0,0 0,40 19,20', 'blue'))),

F('er', 'Eritrea', 3, cc(hb('green', 'lightblue'),
  P('0,0 60,20 0,40', 'red'),
  RING(13, 20, 6.2, 4.2, 'yellow'), R(12.3, 14.5, 1.4, 11, 'yellow'))),

F('ee', 'Estonia', 2, hb('blue', 'black', 'white')),

F('sz', 'Eswatini', 3, cc(hbw([1, 0.35, 3, 0.35, 1], ['blue', 'yellow', 'red', 'yellow', 'blue']),
  R(14, 18.9, 32, 2.2, 'black'),
  E(30, 20, 11, 3.8, 'white'), E(30, 20, 11, 1.5, 'black'),
  R(19, 18.4, 3, 3.2, 'black'), R(38, 18.4, 3, 3.2, 'black')), ['Swaziland']),

F('et', 'Ethiopia', 2, cc(hb('green', 'yellow', 'red'),
  C(30, 20, 8.5, 'blue'), S(30, 20, 6, 'yellow', 0, 5),
  ring(30, 20, 7, 5, 0.9, 'yellow', -54))),

F('fj', 'Fiji', 3, cc(R(0, 0, 60, 40, 'lightblue'), unionJack(0, 0, 30, 20),
  P('38,10 50,10 50,21 44,28 38,21', 'white'),
  R(42.8, 10, 2.4, 18, 'red'), R(38, 15.5, 12, 2.4, 'red'),
  P('40,11 42,11 42,14 40,14', 'red'))),

F('fi', 'Finland', 1, nordic('white', 'blue')),

F('fr', 'France', 1, vb('blue', 'white', 'red')),

F('ga', 'Gabon', 3, hb('green', 'yellow', 'blue')),

F('gm', 'Gambia', 3, hbw([3, 0.5, 3, 0.5, 3], ['red', 'white', 'blue', 'white', 'green'])),

F('ge', 'Georgia', 2, cc(R(0, 0, 60, 40, 'white'),
  R(25.5, 0, 9, 40, 'red'), R(0, 15.5, 60, 9, 'red'),
  R(11.3, 4.3, 2.4, 6.4, 'red'), R(9.3, 6.3, 6.4, 2.4, 'red'),
  R(46.3, 4.3, 2.4, 6.4, 'red'), R(44.3, 6.3, 6.4, 2.4, 'red'),
  R(11.3, 29.3, 2.4, 6.4, 'red'), R(9.3, 31.3, 6.4, 2.4, 'red'),
  R(46.3, 29.3, 2.4, 6.4, 'red'), R(44.3, 31.3, 6.4, 2.4, 'red'))),

F('de', 'Germany', 1, hb('black', 'red', 'yellow')),

F('gh', 'Ghana', 1, cc(hb('red', 'yellow', 'green'), S(30, 20, 5.2, 'black'))),

F('gr', 'Greece', 1, cc(hb('blue', 'white', 'blue', 'white', 'blue', 'white', 'blue', 'white', 'blue'),
  R(0, 0, 22.2, 22.2, 'blue'),
  R(9.1, 0, 4, 22.2, 'white'), R(0, 9.1, 22.2, 4, 'white'))),

F('gd', 'Grenada', 3, cc(R(0, 0, 60, 40, 'red'),
  R(5, 5, 50, 30, 'yellow'),
  P('5,5 5,35 30.5,20', 'green'), P('55,5 55,35 29.5,20', 'green'),
  C(30, 20, 6, 'red'), S(30, 20, 3.6, 'yellow'),
  S(15, 2.6, 2, 'yellow'), S(30, 2.6, 2, 'yellow'), S(45, 2.6, 2, 'yellow'),
  S(15, 37.4, 2, 'yellow'), S(30, 37.4, 2, 'yellow'), S(45, 37.4, 2, 'yellow'),
  C(15, 20, 2.6, 'yellow'))),

F('gt', 'Guatemala', 2, cc(vb('lightblue', 'white', 'lightblue'),
  RING(30, 21, 7.5, 5.6, 'green'),
  P('30,13 32,17 30,21 28,17', 'green'), R(22, 19.5, 16, 1.4, 'green'))),

F('gn', 'Guinea', 2, vb('red', 'yellow', 'green')),

F('gw', 'Guinea-Bissau', 3, cc(hb('yellow', 'green'),
  R(0, 0, 20, 40, 'red'), S(10, 20, 5, 'black'))),

F('gy', 'Guyana', 3, cc(R(0, 0, 60, 40, 'green'),
  P('0,0 0,40 50,20', 'white'), P('0,2 0,38 45,20', 'yellow'),
  P('0,3 0,37 28,20', 'black'), P('0,5 0,35 25,20', 'red'))),

F('ht', 'Haiti', 3, cc(hb('blue', 'red'),
  R(22, 12, 16, 16, 'white'),
  R(29.3, 15, 1.4, 11, 'green'),
  P('30,13 34,16 30,18 26,16', 'green'), P('30,16 35,19 30,21 25,19', 'green'),
  R(24, 25.5, 12, 1.4, 'green'))),

F('hn', 'Honduras', 2, cc(hb('blue', 'white', 'blue'),
  S(30, 20, 2.1, 'blue'), S(23.5, 16.8, 2.1, 'blue'), S(36.5, 16.8, 2.1, 'blue'),
  S(23.5, 23.2, 2.1, 'blue'), S(36.5, 23.2, 2.1, 'blue'))),

F('hu', 'Hungary', 1, hb('red', 'white', 'green')),

F('is', 'Iceland', 1, nordic('blue', 'white', 'red')),

F('in', 'India', 1, cc(hb('orange', 'white', 'green'),
  RING(30, 20, 5, 4, 'blue'), C(30, 20, 1.1, 'blue'),
  R(29.6, 15, 0.8, 10, 'blue'), R(25, 19.6, 10, 0.8, 'blue'),
  P('26.5,16.2 27.1,15.6 34,22.5 33.4,23.1', 'blue'),
  P('33.4,16.2 34,16.8 27.1,23.7 26.5,23.1', 'blue'))),

F('id', 'Indonesia', 1, hb('red', 'white')),

F('ir', 'Iran', 1, cc(hb('green', 'white', 'red'),
  P('30,15 32,19 30,25 28,19', 'red'),
  P('26,17 27.4,21 25.6,23 24.6,19', 'red'),
  P('34,17 32.6,21 34.4,23 35.4,19', 'red'))),

F('iq', 'Iraq', 2, cc(hb('red', 'white', 'black'),
  R(20, 18.6, 5, 1.5, 'green'), R(27.5, 18.6, 5, 1.5, 'green'),
  R(35, 18.6, 5, 1.5, 'green'),
  R(22, 21.5, 16, 1.1, 'green'))),

F('ie', 'Ireland', 1, vb('green', 'white', 'orange')),

F('il', 'Israel', 1, cc(R(0, 0, 60, 40, 'white'),
  R(0, 5, 60, 4.2, 'blue'), R(0, 30.8, 60, 4.2, 'blue'),
  S(30, 20, 6.4, 'blue', 0, 6), S(30, 20, 3.5, 'white', 0, 6))),

F('it', 'Italy', 1, vb('green', 'white', 'red')),

F('jm', 'Jamaica', 1, cc(R(0, 0, 60, 40, 'green'),
  P('0,0 0,40 30,20', 'black'), P('60,0 60,40 30,20', 'black'),
  P('0,0 4.6,0 60,37 60,40 55.4,40 0,3', 'yellow'),
  P('55.4,0 60,0 60,3 4.6,40 0,40 0,37', 'yellow'))),

F('jp', 'Japan', 1, cc(R(0, 0, 60, 40, 'white'), C(30, 20, 12, 'red')), ['Nippon']),

F('jo', 'Jordan', 2, cc(hb('black', 'white', 'green'),
  P('0,0 0,40 24,20', 'red'), S(9, 20, 2.4, 'white', 0, 7))),

F('kz', 'Kazakhstan', 2, cc(R(0, 0, 60, 40, 'lightblue'),
  S(32, 17, 8, 'yellow', 0, 16), C(32, 17, 4.4, 'yellow'),
  P('22,25 27,22 32,25 37,22 42,25 32,29', 'yellow'),
  R(1.5, 0, 3.5, 40, 'yellow'))),

F('ke', 'Kenya', 1, cc(hbw([3, 0.4, 3, 0.4, 3], ['black', 'white', 'red', 'white', 'green']),
  P('19,20 22,9 24,9 27,20 24,31 22,31', 'white'),
  P('41,20 38,9 36,9 33,20 36,31 38,31', 'white'),
  E(30, 20, 6, 9.5, 'red'),
  R(24, 17.6, 12, 1.6, 'white'), R(24, 21, 12, 1.6, 'white'),
  E(30, 20, 2.6, 4.4, 'black'))),

/* The sun is a full yellow disc centred on the red/blue boundary; the blue half
 * is painted over it afterwards, which leaves a clean half-disc with no arc
 * maths and no abutting edges. */
F('ki', 'Kiribati', 3, cc(R(0, 0, 60, 40, 'red'),
  C(30, 20, 8.5, 'yellow'),
  P('29.4,13 30.6,13 30,8', 'yellow'),
  P('23.5,14.5 24.5,13.8 21.5,10', 'yellow'), P('36.5,14.5 35.5,13.8 38.5,10', 'yellow'),
  R(0, 20, 60, 20, 'blue'),
  R(0, 22, 60, 1.9, 'white'), R(0, 26.8, 60, 1.9, 'white'), R(0, 31.6, 60, 1.9, 'white'),
  P('19,7 26,3.5 34,3.5 41,7 34,6 30,8.5 26,6', 'yellow'), C(42, 6, 1.5, 'yellow'))),

F('xk', 'Kosovo', 3, cc(R(0, 0, 60, 40, 'blue'),
  D('M22,15 C26,12 32,13 36,15 C40,17 40,23 36,26 C32,29 26,28 23,25 ' +
    'C20,22 19,17 22,15 Z', 'yellow'),
  S(19, 8, 1.9, 'white'), S(23.5, 6, 1.9, 'white'), S(28, 5, 1.9, 'white'),
  S(32.5, 5, 1.9, 'white'), S(37, 6, 1.9, 'white'), S(41.5, 8, 1.9, 'white'))),

F('kw', 'Kuwait', 2, cc(hb('green', 'white', 'red'),
  P('0,0 14,13.33 14,26.67 0,40', 'black'))),

F('kg', 'Kyrgyzstan', 3, cc(R(0, 0, 60, 40, 'red'),
  S(30, 20, 11, 'yellow', 0, 20), C(30, 20, 7, 'yellow'),
  RING(30, 20, 4.4, 3.2, 'red'),
  R(25.6, 19.4, 8.8, 1.2, 'red'), R(29.4, 15.6, 1.2, 8.8, 'red'))),

F('la', 'Laos', 2, cc(hbw([1, 2, 1], ['red', 'blue', 'red']), C(30, 20, 7, 'white'))),

F('lv', 'Latvia', 2, hbw([2, 1, 2], ['red', 'white', 'red'])),

F('lb', 'Lebanon', 1, cc(hbw([1, 2, 1], ['red', 'white', 'red']),
  P('30,11 26.5,16.5 28.5,16.5 24.5,21.5 27,21.5 22.5,27 37.5,27 33,21.5 35.5,21.5 ' +
    '31.5,16.5 33.5,16.5', 'green'),
  R(29.2, 27, 1.6, 2.2, 'green'))),

F('ls', 'Lesotho', 3, cc(hbw([3, 4, 3], ['blue', 'white', 'green']),
  P('30,13 34,20.5 26,20.5', 'black'), R(24.5, 20.5, 11, 1.3, 'black'),
  R(29.4, 10.5, 1.2, 3, 'black'))),

F('lr', 'Liberia', 3, cc(hbw(ones(11),
  ['red', 'white', 'red', 'white', 'red', 'white', 'red', 'white', 'red', 'white', 'red']),
  R(0, 0, 24, 18.2, 'blue'), S(12, 9.1, 6, 'white'))),

F('ly', 'Libya', 2, cc(hbw([1, 2, 1], ['red', 'black', 'green']),
  CR(28, 20, 4.6, 3.7, 1.7, 0, 'white'), S(34, 20, 2.5, 'white'))),

F('li', 'Liechtenstein', 3, cc(hb('blue', 'red'),
  P('11,7.5 13,5.5 15,7.5 17,5.5 19,7.5 19,10.5 11,10.5', 'yellow'),
  R(10, 10.5, 10, 1.8, 'yellow'), C(11, 5, 1.1, 'yellow'), C(19, 5, 1.1, 'yellow'))),

F('lt', 'Lithuania', 2, hb('yellow', 'green', 'red')),

F('lu', 'Luxembourg', 2, hb('red', 'white', 'lightblue')),

F('mg', 'Madagascar', 2, cc(hb('red', 'green'), R(0, 0, 20, 40, 'white'))),

F('mw', 'Malawi', 3, cc(hb('black', 'red', 'green'),
  C(30, 13.33, 7.5, 'red'),
  P('29.3,5.5 30.7,5.5 30,1.5', 'red'),
  P('24.2,7 25.4,6.3 22.5,3', 'red'), P('35.8,7 34.6,6.3 37.5,3', 'red'),
  P('21.5,10.5 22.2,9.3 18,7', 'red'), P('38.5,10.5 37.8,9.3 42,7', 'red'),
  P('20.5,13.5 20.5,12.2 16,12', 'red'), P('39.5,13.5 39.5,12.2 44,12', 'red'))),

F('my', 'Malaysia', 2, cc(hbw(ones(14),
  ['red', 'white', 'red', 'white', 'red', 'white', 'red',
   'white', 'red', 'white', 'red', 'white', 'red', 'white']),
  R(0, 0, 30, 22.86, 'blue'),
  CR(11.5, 11.5, 5.8, 4.7, 2.1, 0, 'yellow'), S(19.5, 12, 3.6, 'yellow', 0, 14))),

F('mv', 'Maldives', 3, cc(R(0, 0, 60, 40, 'red'),
  R(12, 8, 36, 24, 'green'), CR(28, 20, 5.2, 4.2, 1.9, 0, 'white'))),

F('ml', 'Mali', 2, vb('green', 'yellow', 'red')),

F('mt', 'Malta', 2, cc(vb('white', 'red'),
  R(9, 5, 4, 14, 'red'), R(4, 10, 14, 4, 'red'),
  R(10, 6, 2, 12, 'white'), R(5, 11, 12, 2, 'white'))),

F('mh', 'Marshall Islands', 3, cc(R(0, 0, 60, 40, 'blue'),
  P('0,26 60,2 60,16 0,40', 'white'), P('0,33 60,9 60,16 0,40', 'orange'),
  S(13, 10, 5.2, 'white', 0, 24))),

F('mr', 'Mauritania', 3, cc(R(0, 0, 60, 40, 'green'),
  R(0, 0, 60, 5, 'red'), R(0, 35, 60, 5, 'red'),
  CR(30, 21, 7.5, 6.2, 0, -2.8, 'yellow'), S(30, 16, 2.4, 'yellow'))),

F('mu', 'Mauritius', 3, hb('red', 'blue', 'yellow', 'green')),

F('mx', 'Mexico', 1, cc(vb('green', 'white', 'red'),
  E(30, 20, 4.2, 3.2, 'green'),
  P('27,18 31,16 33,19 30,22', 'red'), P('30,22 33,23 29,25 27,23', 'green'),
  R(24, 25.5, 12, 1.2, 'green'))),

F('fm', 'Micronesia', 3, cc(R(0, 0, 60, 40, 'lightblue'),
  S(30, 11, 3.2, 'white'), S(30, 29, 3.2, 'white'),
  S(21, 20, 3.2, 'white'), S(39, 20, 3.2, 'white'))),

F('md', 'Moldova', 3, cc(vb('blue', 'yellow', 'red'),
  P('30,13 26.5,16.5 27.5,20 30,27 32.5,20 33.5,16.5', 'yellow'),
  C(30, 12.5, 1.8, 'yellow'),
  P('27.8,17.5 32.2,17.5 32.2,21 30,23.5 27.8,21', 'red'))),

F('mc', 'Monaco', 2, hb('red', 'white')),

F('mn', 'Mongolia', 2, cc(vb('red', 'blue', 'red'),
  S(10, 8, 2.6, 'yellow'), P('7.4,11 12.6,11 10,15.5', 'yellow'),
  R(6, 16.5, 8, 1.6, 'yellow'), R(6, 19.6, 8, 1.6, 'yellow'),
  R(6, 22.7, 8, 1.6, 'yellow'),
  R(4.6, 12, 1.3, 16, 'yellow'), R(14.1, 12, 1.3, 16, 'yellow'),
  C(10, 28.5, 2.2, 'yellow'), C(10, 32.5, 2.2, 'yellow'))),

F('me', 'Montenegro', 3, cc(R(0, 0, 60, 40, 'yellow'),
  R(2.5, 2.5, 55, 35, 'red'),
  P('18.5,11 20,8.5 23,10 25.5,13 30,14 34.5,13 37,10 40,8.5 41.5,11 38.5,13 36,15.5 43,17 38,20 42,24 35.5,23 37.5,28.5 33,28 33,32.5 30,34 27,32.5 27,28 22.5,28.5 24.5,23 18,24 22,20 17,17 24,15.5 21.5,13', 'yellow'))),

F('ma', 'Morocco', 1, cc(R(0, 0, 60, 40, 'red'),
  S(30, 20, 9.5, 'green'), S(30, 20, 5.9, 'red'))),

F('mz', 'Mozambique', 3, cc(hbw([3, 0.4, 3, 0.4, 3],
  ['green', 'white', 'black', 'white', 'yellow']),
  P('0,0 0,40 22,20', 'red'), S(8, 20, 4.2, 'white'),
  R(3, 22, 10, 1.1, 'yellow'), R(3, 24, 10, 1.1, 'black'))),

F('mm', 'Myanmar', 2, cc(hb('yellow', 'green', 'red'), S(30, 20, 9.5, 'white')),
  ['Burma']),

F('na', 'Namibia', 3, cc(R(0, 0, 60, 40, 'blue'),
  P('0,40 60,0 60,40', 'green'),
  P('0,33 49.5,0 60,0 60,7 10.5,40 0,40', 'white'),
  P('0,36 54,0 60,0 60,4 6,40 0,40', 'red'),
  S(14, 10, 5.4, 'yellow', 0, 12), C(14, 10, 2.6, 'yellow'))),

F('nr', 'Nauru', 3, cc(R(0, 0, 60, 40, 'blue'),
  R(0, 19, 60, 2, 'yellow'), S(18, 28, 3.6, 'white', 0, 12))),

F('np', 'Nepal', 2, cc(R(0, 0, 60, 40, 'white'),
  P('18,2 42,17 25,19.5 46,36 18,36', 'blue'),
  P('20,5 38,16.2 26.5,18.2 42,33.6 20,33.6', 'red'),
  CR(26, 12, 3.4, 2.6, 0, -1.5, 'white'),
  S(27, 26, 4.2, 'white', 0, 12), C(27, 26, 2.1, 'white'))),

F('nl', 'Netherlands', 1, hb('red', 'white', 'blue'), ['Holland']),

F('nz', 'New Zealand', 1, cc(R(0, 0, 60, 40, 'blue'), unionJack(0, 0, 30, 20),
  S(46, 10, 3.1, 'white'), S(46, 10, 2, 'red'),
  S(52, 20, 3.1, 'white'), S(52, 20, 2, 'red'),
  S(45, 30, 3.1, 'white'), S(45, 30, 2, 'red'),
  S(39.5, 17.5, 2.7, 'white'), S(39.5, 17.5, 1.7, 'red'))),

F('ni', 'Nicaragua', 3, cc(hb('lightblue', 'white', 'lightblue'),
  P('24,14.5 36,14.5 30,25.5', 'lightblue'),
  P('26.4,17 33.6,17 30,23.5', 'white'),
  R(27.5, 18.6, 5, 1.1, 'yellow'),
  P('30,19.5 31.6,22.5 28.4,22.5', 'lightblue'))),

F('ne', 'Niger', 2, cc(hb('orange', 'white', 'green'), C(30, 20, 5, 'orange'))),

F('ng', 'Nigeria', 1, vb('green', 'white', 'green')),

F('kp', 'North Korea', 2, cc(hbw([2, 0.5, 5, 0.5, 2],
  ['blue', 'white', 'red', 'white', 'blue']),
  C(21, 20, 6.4, 'white'), S(21, 20, 4.2, 'red')), ['DPRK']),

F('mk', 'North Macedonia', 2, cc(R(0, 0, 60, 40, 'red'),
  P('30,20 26,0 34,0', 'yellow'), P('30,20 26,40 34,40', 'yellow'),
  P('30,20 0,17 0,23', 'yellow'), P('30,20 60,17 60,23', 'yellow'),
  P('30,20 0,7 0,0 9,0', 'yellow'), P('30,20 51,0 60,0 60,7', 'yellow'),
  P('30,20 0,33 0,40 9,40', 'yellow'), P('30,20 51,40 60,40 60,33', 'yellow'),
  C(30, 20, 8, 'red'), C(30, 20, 6.5, 'yellow')), ['Macedonia']),

F('no', 'Norway', 1, nordic('red', 'white', 'blue')),

F('om', 'Oman', 2, cc(hb('white', 'red', 'green'),
  R(0, 0, 17, 40, 'red'),
  P('8.5,5 6,9 8.5,13.5 11,9', 'white'), R(3.5, 8, 10, 1.5, 'white'),
  R(7.9, 4, 1.2, 10, 'white'))),

F('pk', 'Pakistan', 1, cc(R(0, 0, 60, 40, 'green'),
  R(0, 0, 15, 40, 'white'),
  CR(33, 20, 8.5, 7, 2.8, 0, 'white'), S(41.5, 13.5, 3.2, 'white', 20))),

F('pw', 'Palau', 3, cc(R(0, 0, 60, 40, 'lightblue'), C(26, 20, 9.5, 'yellow'))),

F('ps', 'Palestine', 1, cc(hb('black', 'white', 'green'),
  P('0,0 0,40 22,20', 'red'))),

F('pa', 'Panama', 2, cc(R(0, 0, 60, 40, 'white'),
  R(30, 0, 30, 20, 'red'), R(0, 20, 30, 20, 'blue'),
  S(15, 10, 5.2, 'blue'), S(45, 30, 5.2, 'red'))),

F('pg', 'Papua New Guinea', 2, cc(R(0, 0, 60, 40, 'red'),
  P('0,0 0,40 60,40', 'black'),
  S(14, 30, 2.7, 'white'), S(22.5, 24.5, 2.1, 'white'), S(10, 22, 2.1, 'white'),
  S(18.5, 36, 2.3, 'white'), S(7.5, 34, 1.4, 'white'),
  P('38,20 40,13 44,9 48,8.5 50,10.5 47,12.5 44.5,16 43,21 40.5,23', 'yellow'),
  C(49.5, 9, 1.6, 'yellow'),
  P('40,22 35,26 31,27 34,24 37,21', 'yellow'),
  P('43,21 41,27 38,31 40,25 41.5,21', 'yellow'))),

F('py', 'Paraguay', 3, cc(hb('red', 'white', 'blue'),
  C(30, 20, 5.4, 'white'), RING(30, 20, 5, 3.8, 'green'), S(30, 20, 2.8, 'yellow'))),

F('pe', 'Peru', 1, vb('red', 'white', 'red')),

F('ph', 'Philippines', 1, cc(hb('blue', 'red'),
  P('0,0 0,40 26,20', 'white'),
  S(9.5, 20, 4.2, 'yellow', 0, 8),
  S(2.8, 3.4, 1.8, 'yellow'), S(2.8, 36.6, 1.8, 'yellow'), S(21.5, 20, 1.8, 'yellow'))),

F('pl', 'Poland', 1, hb('white', 'red')),

F('pt', 'Portugal', 1, cc(vbw([2, 3], ['green', 'red']),
  RING(24, 20, 7.5, 5.4, 'yellow'),
  R(16.5, 19.4, 15, 1.2, 'yellow'), R(23.4, 12.5, 1.2, 15, 'yellow'),
  P('20.5,15.5 27.5,15.5 27.5,22 24,25.5 20.5,22', 'white'),
  P('21.8,16.8 26.2,16.8 26.2,21.5 24,23.9 21.8,21.5', 'red'))),

F('qa', 'Qatar', 2, cc(R(0, 0, 60, 40, 'red'), serrated(12, 19, 9, 'white'))),

F('ro', 'Romania', 2, vb('blue', 'yellow', 'red')),

F('ru', 'Russia', 1, hb('white', 'blue', 'red')),

F('rw', 'Rwanda', 2, cc(hbw([2, 1, 1], ['lightblue', 'yellow', 'green']),
  S(48, 9, 4, 'yellow', 0, 24), C(48, 9, 2, 'yellow'))),

F('kn', 'Saint Kitts and Nevis', 3, cc(R(0, 0, 60, 40, 'green'),
  P('0,40 60,0 60,40', 'red'),
  P('0,32 50,0 60,0 60,8 10,40 0,40', 'yellow'),
  P('0,35 54,0 60,0 60,5 6,40 0,40', 'black'),
  S(18, 27, 3.3, 'white'), S(38, 13, 3.3, 'white'))),

F('lc', 'Saint Lucia', 3, cc(R(0, 0, 60, 40, 'lightblue'),
  P('30,7 45,32.5 15,32.5', 'white'),
  P('30,10.5 42.2,31 17.8,31', 'black'),
  P('30,19 40,32.5 20,32.5', 'yellow'))),

F('vc', 'Saint Vincent and the Grenadines', 3, cc(vbw([1, 2, 1], ['blue', 'yellow', 'green']),
  P('25,15 27,19 25,23 23,19', 'green'),
  P('35,15 37,19 35,23 33,19', 'green'),
  P('30,22 32,26 30,30 28,26', 'green'))),

F('ws', 'Samoa', 3, cc(R(0, 0, 60, 40, 'red'),
  R(0, 0, 27, 20, 'blue'),
  S(13.5, 6, 2.7, 'white'), S(19, 11.5, 2.1, 'white'), S(13.5, 17, 2.3, 'white'),
  S(8, 11.5, 2.1, 'white'), S(15.5, 10, 1.3, 'white'))),

F('sm', 'San Marino', 3, cc(hb('white', 'lightblue'),
  C(30, 20, 6.8, 'white'),
  R(25.5, 17.5, 2.6, 5.5, 'lightblue'), R(28.7, 16.5, 2.6, 6.5, 'lightblue'),
  R(31.9, 17.5, 2.6, 5.5, 'lightblue'),
  S(30, 11.5, 2, 'yellow'))),

F('st', 'Sao Tome and Principe', 3, cc(hbw([1, 1.5, 1], ['green', 'yellow', 'green']),
  P('0,0 0,40 15,20', 'red'),
  S(24, 20, 3, 'black'), S(38, 20, 3, 'black'))),

F('sa', 'Saudi Arabia', 1, cc(R(0, 0, 60, 40, 'green'),
  R(13, 13, 34, 2.4, 'white'), R(17, 17.5, 26, 1.8, 'white'),
  R(13, 26, 32, 1.8, 'white'), P('45,24.5 49,26.9 45,29.3', 'white'))),

F('sn', 'Senegal', 2, cc(vb('green', 'yellow', 'red'), S(30, 20, 5, 'green'))),

F('rs', 'Serbia', 2, cc(hb('red', 'blue', 'white'),
  P('22,12.5 34,12.5 34,24 28,30 22,24', 'red'),
  P('24,14 32,14 30,19 32,24 28,27 24,24 26,19', 'white'),
  P('21,10.5 24,7.5 28,10.5 32,7.5 35,10.5 35,12.5 21,12.5', 'yellow'))),

F('sc', 'Seychelles', 3, cc(R(0, 0, 60, 40, 'blue'),
  P('0,40 18,0 60,0 60,40', 'yellow'),
  P('0,40 42,0 60,0 60,40', 'red'),
  P('0,40 60,12 60,40', 'white'),
  P('0,40 60,28 60,40', 'green'))),

F('sl', 'Sierra Leone', 3, hb('green', 'white', 'lightblue')),

F('sg', 'Singapore', 1, cc(hb('red', 'white'),
  CR(15, 11, 6.2, 5, 2.3, 0, 'white'),
  S(21, 6.8, 1.7, 'white'), S(25, 9.7, 1.7, 'white'), S(23.5, 14.4, 1.7, 'white'),
  S(18.5, 14.4, 1.7, 'white'), S(17, 9.7, 1.7, 'white'))),

F('sk', 'Slovakia', 2, cc(hb('white', 'blue', 'red'),
  P('17,12.5 31,12.5 31,24.5 24,31 17,24.5', 'red'),
  R(22.8, 14.5, 2.4, 13, 'white'),
  R(19.5, 17, 9, 2.2, 'white'), R(20.7, 21, 6.6, 2.2, 'white'),
  P('17,24.5 31,24.5 31,26 27.5,23.5 24,26.5 20.5,23.5 17,26', 'blue'))),

F('si', 'Slovenia', 2, cc(hb('white', 'blue', 'red'),
  P('11,7 25,7 25,18 18,24 11,18', 'blue'),
  P('13.5,17 18,10 22.5,17', 'white'),
  R(12.5, 18, 11, 1, 'white'), R(12.5, 20, 11, 1, 'white'),
  S(15, 9, 1.3, 'yellow'), S(21, 9, 1.3, 'yellow'), S(18, 6.2, 1.3, 'yellow'))),

F('sb', 'Solomon Islands', 3, cc(R(0, 0, 60, 40, 'blue'),
  P('0,40 60,0 60,40', 'green'),
  P('0,37 57,0 60,0 60,3 3,40 0,40', 'yellow'),
  S(8, 7, 2.5, 'white'), S(17, 7, 2.5, 'white'), S(8, 16, 2.5, 'white'),
  S(17, 16, 2.5, 'white'), S(12.5, 11.5, 2.5, 'white'))),

F('so', 'Somalia', 2, cc(R(0, 0, 60, 40, 'lightblue'), S(30, 20, 10.5, 'white'))),

F('za', 'South Africa', 1, cc(hb('red', 'blue'),
  P('0,10 0,30 20,20', 'yellow'),
  pall(1, 39, 27, 14, 26, 13, 27, 14, 'white'),
  pall(4, 36, 27, 16.5, 23.5, 15, 25, 11, 'green'),
  P('0,17 0,23 9,20', 'black'))),

F('kr', 'South Korea', 1, cc(R(0, 0, 60, 40, 'white'),
  C(30, 20, 7.5, 'red'),
  D('M22.5,20 A7.5,7.5 0 0 0 37.5,20 Z', 'blue'),
  C(26.25, 20, 3.75, 'red'), C(33.75, 20, 3.75, 'blue'),
  R(8, 7.5, 8, 1.1, 'black'), R(8, 9.6, 8, 1.1, 'black'), R(8, 11.7, 8, 1.1, 'black'),
  R(44, 7.5, 3.4, 1.1, 'black'), R(48.6, 7.5, 3.4, 1.1, 'black'),
  R(44, 9.6, 8, 1.1, 'black'),
  R(44, 11.7, 3.4, 1.1, 'black'), R(48.6, 11.7, 3.4, 1.1, 'black'),
  R(8, 27.2, 3.4, 1.1, 'black'), R(12.6, 27.2, 3.4, 1.1, 'black'),
  R(8, 29.3, 8, 1.1, 'black'),
  R(8, 31.4, 3.4, 1.1, 'black'), R(12.6, 31.4, 3.4, 1.1, 'black'),
  R(44, 27.2, 3.4, 1.1, 'black'), R(48.6, 27.2, 3.4, 1.1, 'black'),
  R(44, 29.3, 3.4, 1.1, 'black'), R(48.6, 29.3, 3.4, 1.1, 'black'),
  R(44, 31.4, 3.4, 1.1, 'black'), R(48.6, 31.4, 3.4, 1.1, 'black'))),

F('ss', 'South Sudan', 3, cc(hbw([3, 0.4, 3, 0.4, 3],
  ['black', 'white', 'red', 'white', 'green']),
  P('0,0 0,40 20,20', 'blue'), S(7, 20, 3.4, 'yellow'))),

F('es', 'Spain', 1, cc(hbw([1, 2, 1], ['red', 'yellow', 'red']),
  R(15.5, 13.5, 1.8, 13, 'red'), R(26.2, 13.5, 1.8, 13, 'red'),
  P('17.8,13.5 26,13.5 26,23 21.9,26.5 17.8,23', 'red'),
  R(18.6, 15, 6.6, 1.1, 'yellow'), R(18.6, 17.5, 6.6, 1.1, 'yellow'),
  R(18.6, 20, 6.6, 1.1, 'yellow'))),

F('lk', 'Sri Lanka', 2, cc(R(0, 0, 60, 40, 'yellow'),
  R(3, 3.5, 8.06, 33, 'green'), R(11, 3.5, 8, 33, 'orange'),
  R(21, 3.5, 36, 33, 'red'),
  P('38,12 41,15 40,20 42,26 38,29 34,26 35,20 34,15', 'yellow'),
  R(45, 11, 1.4, 8, 'yellow'),
  S(24.5, 8, 1.8, 'yellow'), S(53.5, 8, 1.8, 'yellow'),
  S(24.5, 32, 1.8, 'yellow'), S(53.5, 32, 1.8, 'yellow'))),

F('sd', 'Sudan', 2, cc(hb('red', 'white', 'black'),
  P('0,0 0,40 22,20', 'green'))),

F('sr', 'Suriname', 3, cc(hbw([1, 1, 2, 1, 1], ['green', 'white', 'red', 'white', 'green']),
  S(30, 20, 5.2, 'yellow'))),

F('se', 'Sweden', 1, nordic('blue', 'yellow')),

F('ch', 'Switzerland', 1, cc(R(0, 0, 60, 40, 'red'),
  R(25.5, 9, 9, 22, 'white'), R(19, 15.5, 22, 9, 'white'))),

F('sy', 'Syria', 2, cc(hb('green', 'white', 'black'),
  S(20, 20, 3.2, 'red'), S(30, 20, 3.2, 'red'), S(40, 20, 3.2, 'red'))),

F('tw', 'Taiwan', 2, cc(R(0, 0, 60, 40, 'red'),
  R(0, 0, 30, 20, 'blue'),
  S(15, 10, 7.8, 'white', 0, 12), C(15, 10, 5, 'white'))),

F('tj', 'Tajikistan', 3, cc(hbw([2, 3, 2], ['red', 'white', 'green']),
  P('25,22.5 25,19 27,19 27,21 29,21 29,17.5 31,17.5 31,21 33,21 33,19 35,19 35,22.5',
    'yellow'),
  R(24.5, 22.5, 11, 1.2, 'yellow'),
  S(23, 15, 1.1, 'yellow'), S(26, 13.6, 1.1, 'yellow'), S(30, 13.1, 1.1, 'yellow'),
  S(34, 13.6, 1.1, 'yellow'), S(37, 15, 1.1, 'yellow'))),

F('tz', 'Tanzania', 2, cc(R(0, 0, 60, 40, 'green'),
  P('0,40 60,0 60,40', 'blue'),
  P('0,33 49.5,0 60,0 60,7 10.5,40 0,40', 'yellow'),
  P('0,36 54,0 60,0 60,4 6,40 0,40', 'black'))),

F('th', 'Thailand', 1, hbw([1, 1, 2, 1, 1], ['red', 'white', 'blue', 'white', 'red'])),

F('tl', 'Timor-Leste', 3, cc(R(0, 0, 60, 40, 'red'),
  P('0,0 0,40 30,20', 'yellow'), P('0,0 0,40 20,20', 'black'),
  S(8, 20, 3.4, 'white')), ['East Timor']),

F('tg', 'Togo', 3, cc(hbw(ones(5), ['green', 'yellow', 'green', 'yellow', 'green']),
  R(0, 0, 16, 16, 'red'), S(8, 8, 5.2, 'white'))),

F('to', 'Tonga', 3, cc(R(0, 0, 60, 40, 'red'),
  R(0, 0, 24, 16, 'white'),
  R(10, 2.5, 4, 11, 'red'), R(5.5, 6, 13, 4, 'red'))),

F('tt', 'Trinidad and Tobago', 2, cc(R(0, 0, 60, 40, 'red'),
  P('9,0 60,34 60,40 51,40 0,6 0,0', 'white'),
  P('5.25,0 60,36.5 60,40 54.75,40 0,3.5 0,0', 'black'))),

F('tn', 'Tunisia', 2, cc(R(0, 0, 60, 40, 'red'),
  C(30, 20, 10.5, 'white'),
  CR(29, 20, 6.8, 5.5, 2.1, 0, 'red'), S(33.2, 20, 2.8, 'red'))),

F('tr', 'Turkey', 1, cc(R(0, 0, 60, 40, 'red'),
  CR(24, 20, 7.8, 6.4, 2.3, 0, 'white'), S(35.5, 20, 3.5, 'white'))),

F('tm', 'Turkmenistan', 3, cc(R(0, 0, 60, 40, 'green'),
  R(6, 2, 9, 36, 'red'),
  R(8, 6, 5, 1.2, 'white'), R(8, 13, 5, 1.2, 'white'),
  R(8, 20, 5, 1.2, 'white'), R(8, 27, 5, 1.2, 'white'),
  CR(32, 13, 5.2, 4.2, 1.9, 0, 'white'),
  S(38.5, 7.5, 1.5, 'white'), S(40.5, 11, 1.5, 'white'), S(41, 14.8, 1.5, 'white'),
  S(39.5, 18.3, 1.5, 'white'), S(36.5, 20.8, 1.5, 'white'))),

F('tv', 'Tuvalu', 3, cc(R(0, 0, 60, 40, 'lightblue'), unionJack(0, 0, 30, 20),
  S(40, 8, 2.1, 'yellow'), S(48, 6, 2.1, 'yellow'), S(54.5, 10, 2.1, 'yellow'),
  S(38, 16, 2.1, 'yellow'), S(46, 15, 2.1, 'yellow'), S(53.5, 19, 2.1, 'yellow'),
  S(40, 25, 2.1, 'yellow'), S(48, 26, 2.1, 'yellow'), S(44, 33, 2.1, 'yellow'))),

F('ug', 'Uganda', 2, cc(hbw(ones(6), ['black', 'yellow', 'red', 'black', 'yellow', 'red']),
  C(30, 20, 7.2, 'white'),
  P('28.5,16 31.5,16 32.5,20 30,25 27.5,20', 'red'),
  C(29, 14.8, 1.5, 'red'), R(29.4, 24.5, 1.2, 3, 'black'),
  R(30.8, 14.2, 2.4, 1, 'yellow'))),

F('ua', 'Ukraine', 1, hb('blue', 'yellow')),

F('ae', 'United Arab Emirates', 1, cc(hb('green', 'white', 'black'),
  R(0, 0, 15, 40, 'red')), ['UAE']),

F('gb', 'United Kingdom', 1, unionJack(0, 0, 60, 40),
  ['Great Britain', 'Britain', 'UK']),

F('us', 'United States', 1, usFlag(), ['USA', 'America']),

F('uy', 'Uruguay', 2, cc(hbw(ones(9),
  ['white', 'lightblue', 'white', 'lightblue', 'white',
   'lightblue', 'white', 'lightblue', 'white']),
  R(0, 0, 26.7, 22.2, 'white'),
  S(13.3, 11, 6.5, 'yellow', 0, 16), C(13.3, 11, 3.2, 'yellow'))),

F('uz', 'Uzbekistan', 3, cc(hbw([1, 0.12, 1, 0.12, 1],
  ['lightblue', 'red', 'white', 'red', 'green']),
  CR(11, 8, 4.4, 3.6, 1.6, 0, 'white'),
  S(19, 4, 1.1, 'white'), S(23, 4, 1.1, 'white'), S(27, 4, 1.1, 'white'),
  S(19, 8, 1.1, 'white'), S(23, 8, 1.1, 'white'), S(27, 8, 1.1, 'white'),
  S(31, 8, 1.1, 'white'),
  S(19, 12, 1.1, 'white'), S(23, 12, 1.1, 'white'), S(27, 12, 1.1, 'white'),
  S(31, 12, 1.1, 'white'), S(35, 12, 1.1, 'white'))),

F('vu', 'Vanuatu', 3, cc(hb('red', 'green'),
  pall(0, 40, 30, 17.5, 22.5, 9, 31, 21, 'black'),
  pall(3, 37, 30, 18.2, 21.8, 11, 29, 18, 'yellow'),
  P('0,11 0,29 18,20', 'black'),
  RING(9, 20, 4, 3, 'yellow'),
  P('6,18 12,18 9,15', 'yellow'))),

F('va', 'Vatican City', 2, cc(vb('yellow', 'white'),
  P('37,11.5 43,11.5 41.5,8 38.5,8', 'yellow'), R(38, 11, 4, 1.4, 'yellow'),
  P('35,24 43,15 44.5,16.5 36.5,25.5', 'yellow'),
  P('45,24 37,15 35.5,16.5 43.5,25.5', 'yellow'),
  C(35.5, 25.5, 1.7, 'yellow'), C(44.5, 25.5, 1.7, 'yellow')), ['Holy See']),

F('ve', 'Venezuela', 2, cc(hb('yellow', 'blue', 'red'),
  arc(30, 26, 9.5, 8, 1.5, 'white', 200, 340))),

F('vn', 'Vietnam', 1, cc(R(0, 0, 60, 40, 'red'), S(30, 20, 10.5, 'yellow'))),

F('ye', 'Yemen', 2, hb('red', 'white', 'black')),

F('zm', 'Zambia', 2, cc(R(0, 0, 60, 40, 'green'),
  R(44, 14, 4.8, 26, 'red'), R(48.7, 14, 4.8, 26, 'black'), R(53.4, 14, 4.6, 26, 'orange'),
  P('44,10.5 48.5,5.5 54,7.5 50.5,13 46,14', 'orange'),
  C(53.5, 6.5, 1.6, 'orange'))),

F('zw', 'Zimbabwe', 2, cc(hbw(ones(7),
  ['green', 'yellow', 'red', 'black', 'red', 'yellow', 'green']),
  P('0,0 0,40 23,20', 'white'),
  S(7.5, 20, 4.8, 'red'),
  P('6,17 9,15 10,18 8,22 6,21', 'yellow'), C(9.5, 14.5, 1.1, 'yellow'))
)];

/* Sorted for the guess list; the game picks from here. */
FLAGS.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
