// THE RULES OF PLAY: the board, every legal move, bearing off, the pip count, the score and the
// house rules on the throw.
//
// THE HOUSE RULES
//   7 (6-1, 5-2, 4-3)   a miss: nothing is played and the turn passes.
//   8 (6-2, 5-3, 4-4)   play it, then throw again.
//   2-1, the jackpot    play the 2 and the 1, pick any double free, play all four of it,
//                       then throw again.
//   Blocked             the jackpot or the extra throw is lost when any die cannot be played.
//   Bearing off         a die that matches a point holding your checker must bear it off.
// No doubling cube.
//
// THE BOARD AS NUMBERS: b[0]..b[23], one per point; a positive number is Player 1's checkers,
// a negative one Player 2's. Player 1 runs from 23 down to 0, Player 2 from 0 up to 23.
// bar[p] the hit-off bar, pool[p] the checkers waiting in the tray at a Fresh start, off[p] those
// borne off. A move is { from, to, hit }: from 24 is off the bar or out of the tray, to -1 is off.
window.Jacko = window.Jacko || {};

Jacko.rules = (function () {

  function startBoard(kind) {
    var b = new Array(24).fill(0);
    if (kind === 'fresh') return b;
    if (kind === 'tjs') {
      b[23] = 2; b[12] = 5; b[7] = 3; b[18] = 5;
      b[0] = -2; b[11] = -5; b[16] = -3; b[5] = -5;
      return b;
    }
    b[23] = 2; b[12] = 5; b[7] = 3; b[5] = 5;
    b[0] = -2; b[11] = -5; b[16] = -3; b[18] = -5;
    return b;
  }

  function ownCount(b, i, p) { var v = b[i]; return p === 0 ? (v > 0 ? v : 0) : (v < 0 ? -v : 0); }
  function oppCount(b, i, p) { return ownCount(b, i, 1 - p); }

  function canBearOff(b, bar, pool, p) {
    if (bar[p] > 0 || pool[p] > 0) return false;
    var i;
    if (p === 0) { for (i = 6; i < 24; i++) if (b[i] > 0) return false; }
    else { for (i = 0; i < 18; i++) if (b[i] < 0) return false; }
    return true;
  }

  function singleMoves(b, bar, pool, p, die) {
    var out = [];
    var entryTo = p === 0 ? 24 - die : die - 1;
    if (bar[p] > 0) {
      if (oppCount(b, entryTo, p) < 2) out.push({ from: 24, to: entryTo, hit: oppCount(b, entryTo, p) === 1 });
      return out;
    }
    if (canBearOff(b, bar, pool, p)) {
      var match = p === 0 ? die - 1 : 24 - die;
      if (ownCount(b, match, p) > 0) return [{ from: match, to: -1, hit: false }];
    }
    if (pool[p] > 0 && oppCount(b, entryTo, p) < 2) out.push({ from: 24, to: entryTo, hit: oppCount(b, entryTo, p) === 1 });
    var dir = p === 0 ? -1 : 1;
    for (var i = 0; i < 24; i++) {
      if (ownCount(b, i, p) === 0) continue;
      var to = i + dir * die;
      if (to >= 0 && to < 24 && oppCount(b, to, p) < 2) out.push({ from: i, to: to, hit: oppCount(b, to, p) === 1 });
    }
    if (canBearOff(b, bar, pool, p)) {
      var hi = -1, k;
      if (p === 0) {
        var exact = die - 1;
        if (b[exact] > 0) out.push({ from: exact, to: -1, hit: false });
        else {
          for (k = 5; k >= 0; k--) if (b[k] > 0) { hi = k; break; }
          if (hi >= 0 && die - 1 > hi) out.push({ from: hi, to: -1, hit: false });
        }
      } else {
        var ex = 24 - die;
        if (b[ex] < 0) out.push({ from: ex, to: -1, hit: false });
        else {
          for (k = 18; k < 24; k++) if (b[k] < 0) { hi = k; break; }
          if (hi >= 0 && ex < hi) out.push({ from: hi, to: -1, hit: false });
        }
      }
    }
    return out;
  }

  function applyMove(b, bar, pool, off, p, m) {
    var nb = b.slice(), nbar = bar.slice(), npool = pool.slice(), noff = off.slice();
    var sign = p === 0 ? 1 : -1;
    if (m.from === 24) { if (nbar[p] > 0) nbar[p]--; else npool[p]--; }
    else nb[m.from] -= sign;
    if (m.to === -1) noff[p]++;
    else {
      if (m.hit) { nb[m.to] = 0; nbar[1 - p]++; }
      nb[m.to] += sign;
    }
    return { b: nb, bar: nbar, pool: npool, off: noff };
  }

  function allSequences(b, bar, pool, off, p, d1, d2) {
    var seqs = [], seen = {};
    function rec(bb, bbar, bpool, boff, dice, seq) {
      var extended = false, tried = {};
      for (var k = 0; k < dice.length; k++) {
        if (tried[dice[k]]) continue;
        tried[dice[k]] = true;
        var ms = singleMoves(bb, bbar, bpool, p, dice[k]);
        for (var j = 0; j < ms.length; j++) {
          var m = ms[j];
          extended = true;
          var st = applyMove(bb, bbar, bpool, boff, p, m);
          var rest = dice.slice(); rest.splice(k, 1);
          rec(st.b, st.bar, st.pool, st.off, rest,
            seq.concat([{ from: m.from, to: m.to, hit: m.hit, die: dice[k] }]));
        }
      }
      if (!extended) {
        var key = seq.map(function (m) { return m.from + ':' + m.to + ':' + m.die; }).join('|');
        if (!seen[key]) { seen[key] = true; seqs.push({ seq: seq, b: bb, bar: bbar, pool: bpool, off: boff }); }
      }
    }
    var dice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
    rec(b, bar, pool, off, dice, []);
    var maxLen = 0;
    seqs.forEach(function (s) { maxLen = Math.max(maxLen, s.seq.length); });
    if (maxLen === 0) return [];
    var best = seqs.filter(function (s) { return s.seq.length === maxLen; });
    if (d1 !== d2 && maxLen === 1) {
      var hi = Math.max(d1, d2);
      if (best.some(function (s) { return s.seq[0].die === hi; })) best = best.filter(function (s) { return s.seq[0].die === hi; });
    }
    return best;
  }

  function pipCount(b, bar, pool, p) {
    var s = (bar[p] + pool[p]) * 25;
    for (var i = 0; i < 24; i++) { var n = ownCount(b, i, p); if (n) s += n * (p === 0 ? i + 1 : 24 - i); }
    return s;
  }

  function gameValue(st, winner) {
    var loser = 1 - winner;
    if (st.off[loser] > 0) return 1;
    var home = winner === 0 ? [0, 5] : [18, 23];
    var caught = st.bar[loser] > 0 || st.pool[loser] > 0;
    for (var i = home[0]; i <= home[1]; i++) if (ownCount(st.b, i, loser) > 0) caught = true;
    return caught ? 3 : 2;
  }

  function throwKind(d1, d2) {
    var total = d1 + d2;
    if (total === 7) return 'miss';
    if (total === 3) return 'jackpot';
    if (total === 8) return 'again';
    return 'plain';
  }

  function hasBonus(kind) { return kind === 'jackpot' || kind === 'again' || kind === 'double'; }

  function bonusLost(kind, used, diceN) { return hasBonus(kind) && used < diceN; }

  function afterPlay(kind, used, diceN) {
    if (kind === 'miss' || used < diceN) return 'pass';
    if (kind === 'jackpot') return 'double';
    if (kind === 'again' || kind === 'double') return 'again';
    return 'pass';
  }

  return {
    startBoard: startBoard, ownCount: ownCount, canBearOff: canBearOff,
    applyMove: applyMove, allSequences: allSequences,
    pipCount: pipCount, gameValue: gameValue,
    throwKind: throwKind, hasBonus: hasBonus, bonusLost: bonusLost, afterPlay: afterPlay
  };
})();
