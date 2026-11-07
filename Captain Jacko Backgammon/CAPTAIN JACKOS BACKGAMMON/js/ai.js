// THE COMPUTER PLAYER
// The trained brain (brain.js, net.js) judges every legal play. Easy and Hard add a random shake
// to its judgement, but never take a play far worse than the best; Expert takes the best play
// after looking at every throw the other player could answer with. The 2-1's free double is
// picked the same way. Without the brain it falls back to Gerald Tesauro's pubeval numbers.
Jacko.ai = (function () {
  var R = Jacko.rules, N = Jacko.net;
  var brain = null;
  try { brain = N && Jacko.BRAIN ? N.fromPlain(Jacko.BRAIN) : null; } catch (e) { brain = null; }

  var ROLLS = (function () {
    var r = [];
    for (var a = 1; a <= 6; a++) for (var c = a; c <= 6; c++) r.push([a, c, a === c ? 1 / 36 : 2 / 36]);
    return r;
  })();
  function endKey(s) { return s.b.join(',') + '|' + s.bar.join(',') + '|' + s.off.join(',') + '|' + s.pool.join(','); }

  var SHAKE = { easy: 0.20, hard: 0.10, expert: 0 };
  var LIMIT = { easy: 0.16, hard: 0.06, expert: 0 };
  var LOOK = 6;

  function gauss() {
    var u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function shaken(level, cand) {
    var sd = SHAKE[level] || 0;
    if (!sd || cand.length < 2) return 0;
    var top = cand[0].v, lim = LIMIT[level], bi = 0, bv = -1e18;
    for (var i = 0; i < cand.length; i++) {
      if (top - cand[i].v > lim) break;
      var nv = cand[i].v + sd * gauss();
      if (nv > bv) { bv = nv; bi = i; }
    }
    return bi;
  }

  function lookAhead(s, p) {
    var q = 1 - p, stay = N.equity(N.judge(brain, s, p)), tot = 0;
    for (var i = 0; i < ROLLS.length; i++) {
      var d1 = ROLLS[i][0], d2 = ROLLS[i][1], kind = R.throwKind(d1, d2), v;
      if (kind === 'miss') v = stay;
      else {
        var rep = R.allSequences(s.b, s.bar, s.pool, s.off, q, d1, d2);
        v = rep.length ? -N.bestPlay(brain, rep, q, kind, d1 === d2 ? 4 : 2).value : stay;
      }
      tot += ROLLS[i][2] * v;
    }
    return tot;
  }

  function brainChoose(state, seqs, level, done, how) {
    var p = how.seat, seen = {}, cand = [];
    seqs.forEach(function (s) {
      var key = endKey(s);
      if (seen[key]) return;
      seen[key] = true;
      cand.push({ s: s, v: N.worth(brain, s, p, how.kind, s.seq.length, how.diceN) });
    });
    if (!cand.length) { done(seqs[0]); return; }
    cand.sort(function (a, b) { return b.v - a.v; });
    if (level !== 'expert' || cand.length < 2) { done(cand[shaken(level, cand)].s); return; }
    var top = cand.slice(0, Math.min(LOOK, cand.length)), i = 0, bi = 0, bv = -1e18;
    (function step() {
      var c = top[i], s = c.s, v = c.v;
      if (s.off[p] < 15 && R.afterPlay(how.kind, s.seq.length, how.diceN) === 'pass') v = lookAhead(s, p);
      if (v > bv) { bv = v; bi = i; }
      if (++i < top.length) { setTimeout(step, 0); return; }
      done(top[bi].s);
    })();
  }

  function brainDouble(state, level, seat) {
    var cand = [];
    for (var v = 1; v <= 6; v++) {
      var seqs = R.allSequences(state.b, state.bar, state.pool, state.off, seat, v, v);
      var val = seqs.length ? N.bestPlay(brain, seqs, seat, 'double', 4).value
                            : -N.equity(N.judge(brain, state, 1 - seat));
      cand.push({ d: v, v: val });
    }
    cand.sort(function (a, b) { return b.v - a.v; });
    return cand[shaken(level, cand)].d;
  }

  var WR = [0.00000,-0.17160,0.27010,0.29906,-0.08471,0.00000,-1.40375,-1.05121,0.07217,-0.01351,0.00000,-1.29506,-2.16183,0.13246,-1.03508,0.00000,-2.29847,-2.34631,0.17253,0.08302,0.00000,-1.27266,-2.87401,-0.07456,-0.34240,0.00000,-1.34640,-2.46556,-0.13022,-0.01591,0.00000,0.27448,0.60015,0.48302,0.25236,0.00000,0.39521,0.68178,0.05281,0.09266,0.00000,0.24855,-0.06844,-0.37646,0.05685,0.00000,0.17405,0.00430,0.74427,0.00576,0.00000,0.12392,0.31202,-0.91035,-0.16270,0.00000,0.01418,-0.10839,-0.02781,-0.88035,0.00000,1.07274,2.00366,1.16242,0.22520,0.00000,0.85631,1.06349,1.49549,0.18966,0.00000,0.37183,-0.50352,-0.14818,0.12039,0.00000,0.13681,0.13978,1.11245,-0.12707,0.00000,-0.22082,0.20178,-0.06285,-0.52728,0.00000,-0.13597,-0.19412,-0.09308,-1.26062,0.00000,3.05454,5.16874,1.50680,5.35000,0.00000,2.19605,3.85390,0.88296,2.30052,0.00000,0.92321,1.08744,-0.11696,-0.78560,0.00000,-0.09795,-0.83050,-1.09167,-4.94251,0.00000,-1.00316,-3.66465,-2.56906,-9.67677,0.00000,-2.77982,-7.26713,-3.40177,-12.32252,0.00000,3.42040];
  var WC = [0.25696,-0.66937,-1.66135,-2.02487,-2.53398,-0.16092,-1.11725,-1.06654,-0.92830,-1.99558,-1.10388,-0.80802,0.09856,-0.62086,-1.27999,-0.59220,-0.73667,0.89032,-0.38933,-1.59847,-1.50197,-0.60966,1.56166,-0.47389,-1.80390,-0.83425,-0.97741,-1.41371,0.24500,0.10970,-1.36476,-1.05572,1.15420,0.11069,-0.38319,-0.74816,-0.59244,0.81116,-0.39511,0.11424,-0.73169,-0.56074,1.09792,0.15977,0.13786,-1.18435,-0.43363,1.06169,-0.21329,0.04798,-0.94373,-0.22982,1.22737,-0.13099,-0.06295,-0.75882,-0.13658,1.78389,0.30416,0.36797,-0.69851,0.13003,1.23070,0.40868,-0.21081,-0.64073,0.31061,1.59554,0.65718,0.25429,-0.80789,0.08240,1.78964,0.54304,0.41174,-1.06161,0.07851,2.01451,0.49786,0.91936,-0.90750,0.05941,1.83120,0.58722,1.28777,-0.83711,-0.33248,2.64983,0.52698,0.82132,-0.58897,-1.18223,3.35809,0.62017,0.57353,-0.07276,-0.36214,4.37655,0.45481,0.21746,0.10504,-0.61977,3.54001,0.04612,-0.18108,0.63211,-0.87046,2.47673,-0.48016,-1.27157,0.86505,-1.11342,1.24612,-0.82385,-2.77082,1.23606,-1.59529,0.10438,-1.30206,-4.11520,5.62596,-2.75800];

  function pos(s, p) {
    var a = new Float64Array(28);
    for (var i = 0; i < 24; i++) {
      var v = s.b[i] | 0;
      if (!v) continue;
      a[p === 0 ? i + 1 : 24 - i] = p === 0 ? v : -v;
    }
    a[25] = (s.bar[p] | 0) + (s.pool[p] | 0);
    a[0] = -((s.bar[1 - p] | 0) + (s.pool[1 - p] | 0));
    a[26] = s.off[p] | 0;
    a[27] = -(s.off[1 - p] | 0);
    return a;
  }
  function evalPos(race, a) {
    if (a[26] >= 15) return 99999999;
    var w = race ? WR : WC, s = 0;
    for (var j = 1; j <= 24; j++) {
      var n = a[25 - j];
      if (!n) continue;
      var o = 5 * (j - 1);
      if (n === -1) s += w[o];
      else if (n === 1) s += w[o + 1];
      else if (n >= 2) { s += w[o + 2]; if (n === 3) s += w[o + 3]; if (n >= 4) s += w[o + 4] * ((n - 3) / 2); }
    }
    s += w[120] * (-a[0] / 2);
    s += w[121] * (a[26] / 15);
    return s;
  }
  function score(s, p, race) { return evalPos(race, pos(s, p)); }

  function contact(s) {
    if (s.bar[0] || s.bar[1] || s.pool[0] || s.pool[1]) return true;
    var rear0 = -1, rear1 = 99;
    for (var i = 0; i < 24; i++) {
      if (R.ownCount(s.b, i, 0) > 0 && i > rear0) rear0 = i;
      if (R.ownCount(s.b, i, 1) > 0 && i < rear1) rear1 = i;
    }
    return rear0 > rear1;
  }
  function replyValue(s, race) {
    var tot = 0;
    ROLLS.forEach(function (r) {
      var rep = R.allSequences(s.b, s.bar, s.pool, s.off, 0, r[0], r[1]);
      if (!rep.length) { tot += r[2] * score(s, 1, race); return; }
      var hv = -1e18, hb = null;
      rep.forEach(function (t) { var v = score(t, 0, race); if (v > hv) { hv = v; hb = t; } });
      tot += r[2] * score(hb, 1, race);
    });
    return tot;
  }
  function oldChoose(state, seqs, level, done) {
    var race = !contact(state), seen = {}, cand = [];
    seqs.forEach(function (s) {
      var key = endKey(s);
      if (seen[key]) return;
      seen[key] = true;
      cand.push({ s: s, v: score(s, 1, race) });
    });
    if (!cand.length) { done(seqs[0]); return; }
    cand.sort(function (a, b) { return b.v - a.v; });
    if (level === 'easy') {
      if (Math.random() < 0.32) done(cand[(Math.random() * cand.length) | 0].s);
      else done(cand[(Math.random() * Math.min(3, cand.length)) | 0].s);
      return;
    }
    if (level === 'hard') {
      var k = 0;
      if (cand.length > 1 && Math.random() < 0.12) k = 1;
      if (cand.length > 2 && Math.random() < 0.04) k = 2;
      done(cand[k].s);
      return;
    }
    var top = cand.slice(0, Math.min(6, cand.length));
    if (top.length < 2) { done(top[0].s); return; }
    var bi = 0, bv = -1e18, i = 0;
    (function step() {
      var v = replyValue(top[i].s, race);
      if (v > bv) { bv = v; bi = i; }
      if (++i < top.length) { setTimeout(step, 0); return; }
      done(top[bi].s);
    })();
  }
  function oldDouble(state, level) {
    if (level === 'easy' && Math.random() < 0.5) return 1 + ((Math.random() * 6) | 0);
    var race = !contact(state), best = 6, bv = -1e18;
    for (var v = 1; v <= 6; v++) {
      var seqs = R.allSequences(state.b, state.bar, state.pool, state.off, 1, v, v);
      var top = -1e17;
      seqs.forEach(function (s) { var sc = score(s, 1, race); if (sc > top) top = sc; });
      if (top > bv) { bv = top; best = v; }
    }
    return best;
  }

  function choose(state, seqs, level, done, how) {
    if (brain && how) brainChoose(state, seqs, level, done, how);
    else oldChoose(state, seqs, level, done);
  }
  function chooseDouble(state, level, seat) {
    return brain ? brainDouble(state, level, seat === undefined ? 1 : seat) : oldDouble(state, level);
  }

  function thinkMs(state, seqs) {
    var plays = {};
    seqs.forEach(function (s) { plays[s.seq.map(function (m) { return m.from + '>' + m.to; }).join('|')] = 1; });
    var n = Object.keys(plays).length;
    return n <= 1 ? 250 : 400;
  }

  return { choose: choose, chooseDouble: chooseDouble, thinkMs: thinkMs,
           shake: { spread: SHAKE, limit: LIMIT }, old: { choose: oldChoose, chooseDouble: oldDouble } };
})();
