/* Ludo rules engine. This must stay identical to LudoEngine() in Code.gs (the online
   rooms server). If you change the rules, change both files and raise VERSION in both. */
function LudoEngine() {
  var START = [0, 13, 26, 39];               // track index of each colour's start
  var SAFE = [0, 8, 13, 21, 26, 34, 39, 47]; // start squares + stars
  var LAST_TRACK = 50;                       // last square on the shared track
  var HOME = 56;                             // 51..55 = home column, 56 = home

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function isSafe(a) { return SAFE.indexOf(a) >= 0; }
  function abs(c, p) { return (p >= 0 && p <= LAST_TRACK) ? (START[c] + p) % 52 : -1; }
  function current(s) { return s.colors[s.turn]; }
  function canMove(p, d) { return p < 0 ? d === 6 : p + d <= HOME; }
  function notFinished(s, c) { return s.finished.indexOf(c) < 0; }

  function create(colors, opts) {
    var cs = colors.slice().sort();
    opts = opts || {};
    return {
      colors: cs,
      watch: (opts.watch || []).slice(),
      turn: 0,
      phase: 'roll',
      dice: 0,
      tokens: [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]],
      finished: [],
      seq: 0,
      events: [{ t: 'turn', c: cs[0] }]
    };
  }

  function legal(s) {
    if (s.phase !== 'move') return [];
    var c = current(s), out = [];
    for (var k = 0; k < 4; k++) if (canMove(s.tokens[c][k], s.dice)) out.push(k);
    return out;
  }

  function advance(s, ev) {
    var n = s.colors.length;
    for (var i = 0; i < n; i++) {
      s.turn = (s.turn + 1) % n;
      if (notFinished(s, s.colors[s.turn])) break;
    }
    s.phase = 'roll';
    ev.push({ t: 'turn', c: current(s) });
  }

  function progress(s, c) {
    var t = 0;
    for (var k = 0; k < 4; k++) t += s.tokens[c][k] + 1;
    return t;
  }

  function finishGame(s, ev) {
    var rest = s.colors.filter(function (c) { return notFinished(s, c); });
    rest.sort(function (a, b) { return progress(s, b) - progress(s, a); });
    for (var i = 0; i < rest.length; i++) s.finished.push(rest[i]);
    s.phase = 'over';
    ev.push({ t: 'over', order: s.finished.slice() });
  }

  function roll(s0, d) {
    if (s0.phase !== 'roll') throw new Error('Not time to roll');
    if (!(d >= 1 && d <= 6)) throw new Error('Bad dice value');
    var s = clone(s0), c = current(s), ev = [{ t: 'roll', c: c, d: d }];
    s.dice = d;
    s.phase = 'move';
    if (!legal(s).length) {
      ev.push({ t: 'nomove', c: c, d: d });
      if (d === 6) { s.phase = 'roll'; ev.push({ t: 'again', c: c }); }
      else advance(s, ev);
    }
    s.seq++;
    s.events = ev;
    return s;
  }

  function move(s0, k) {
    if (s0.phase !== 'move') throw new Error('Not time to move');
    var s = clone(s0), c = current(s), d = s.dice, p = s.tokens[c][k];
    if (!(k >= 0 && k < 4) || !canMove(p, d)) throw new Error('That token cannot move');
    var to = p < 0 ? 0 : p + d;
    var ev = [{ t: 'move', c: c, k: k, from: p, to: to }];
    var extra = d === 6;
    var a = abs(c, to);
    s.tokens[c][k] = to;

    if (a >= 0 && !isSafe(a)) {
      for (var i = 0; i < s.colors.length; i++) {
        var oc = s.colors[i];
        if (oc === c) continue;
        for (var j = 0; j < 4; j++) {
          if (abs(oc, s.tokens[oc][j]) === a) {
            ev.push({ t: 'cap', c: oc, k: j, from: s.tokens[oc][j], by: c });
            s.tokens[oc][j] = -1;
            extra = true;
          }
        }
      }
    }
    if (to === HOME) { ev.push({ t: 'home', c: c, k: k }); extra = true; }

    var allHome = s.tokens[c].every(function (x) { return x === HOME; });
    if (allHome) {
      s.finished.push(c);
      ev.push({ t: 'finish', c: c, rank: s.finished.length });
      extra = false;
      var rest = s.colors.filter(function (x) { return notFinished(s, x); });
      var watchedDone = s.watch.length > 0 &&
        s.watch.every(function (x) { return !notFinished(s, x) || s.colors.indexOf(x) < 0; });
      if (rest.length <= 1 || watchedDone) finishGame(s, ev);
    }
    if (s.phase !== 'over') {
      if (extra) { s.phase = 'roll'; ev.push({ t: 'again', c: c }); }
      else advance(s, ev);
    }
    s.seq++;
    s.events = ev;
    return s;
  }

  /** Index of the token to move automatically when the choice doesn't matter, else -1. */
  function autoChoice(s) {
    var L = legal(s);
    if (!L.length) return -1;
    var c = current(s), p0 = s.tokens[c][L[0]];
    for (var i = 1; i < L.length; i++) if (s.tokens[c][L[i]] !== p0) return -1;
    return L[0];
  }

  /** How many opponent tokens could land on track square a with one roll. */
  function threatAt(s, c, a) {
    if (a < 0 || isSafe(a)) return 0;
    var n = 0;
    for (var i = 0; i < s.colors.length; i++) {
      var oc = s.colors[i];
      if (oc === c || !notFinished(s, oc)) continue;
      for (var j = 0; j < 4; j++) {
        var q = s.tokens[oc][j];
        if (q < 0 || q > LAST_TRACK) continue;
        var dist = (a - abs(oc, q) + 52) % 52;
        if (dist >= 1 && dist <= 6 && q + dist <= LAST_TRACK) n++;
      }
    }
    return n;
  }

  function scoreMove(s, c, k, d) {
    var p = s.tokens[c][k], to = p < 0 ? 0 : p + d, a = abs(c, to), sc = 0;
    if (p < 0) sc += 40;
    if (to === HOME) sc += 50;
    else if (to > LAST_TRACK && p <= LAST_TRACK) sc += 28;
    if (a >= 0 && !isSafe(a)) {
      for (var i = 0; i < s.colors.length; i++) {
        var oc = s.colors[i];
        if (oc === c) continue;
        for (var j = 0; j < 4; j++) if (abs(oc, s.tokens[oc][j]) === a) sc += 55 + s.tokens[oc][j] * 0.6;
      }
    }
    if (a >= 0 && isSafe(a)) sc += 14;
    if (p >= 0 && p <= LAST_TRACK) sc += threatAt(s, c, abs(c, p)) * (18 + p * 0.4);
    if (a >= 0) sc -= threatAt(s, c, a) * (22 + to * 0.4);
    sc += d * 0.6 + (p >= 0 ? p * 0.05 : 0);
    return sc;
  }

  function aiChoice(s, level) {
    var L = legal(s);
    if (!L.length) return -1;
    if (L.length === 1) return L[0];
    var c = current(s), best = L[0], bestScore = -1e9;
    var noise = level === 'easy' ? 70 : 2;
    for (var i = 0; i < L.length; i++) {
      var sc = scoreMove(s, c, L[i], s.dice) + Math.random() * noise;
      if (sc > bestScore) { bestScore = sc; best = L[i]; }
    }
    return best;
  }

  return {
    VERSION: 1,
    START: START, SAFE: SAFE, LAST_TRACK: LAST_TRACK, HOME: HOME,
    create: create, roll: roll, move: move, legal: legal, current: current,
    abs: abs, isSafe: isSafe, autoChoice: autoChoice, aiChoice: aiChoice
  };
}
