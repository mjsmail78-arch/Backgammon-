// THE BRAIN'S WORKINGS: how the trained brain sees a board, judges it and picks a play.
(function (root) {
  var Jacko = root.Jacko = root.Jacko || {};
  var IN = 198, OUT = 5;

  function create(hidden) {
    var H = hidden || 80;
    var br = { H: H, w1: new Float32Array(IN * H), b1: new Float32Array(H),
               w2: new Float32Array(H * OUT), b2: new Float32Array(OUT) };
    for (var i = 0; i < br.w1.length; i++) br.w1[i] = (Math.random() * 2 - 1) * 0.1;
    for (i = 0; i < br.w2.length; i++) br.w2[i] = (Math.random() * 2 - 1) * 0.1;
    for (i = 0; i < H; i++) br.b1[i] = (Math.random() * 2 - 1) * 0.1;
    return withBuffers(br);
  }
  function withBuffers(br) {
    br.xi = new Int16Array(IN); br.xv = new Float32Array(IN); br.xn = 0;
    br.h = new Float32Array(br.H); br.y = new Float32Array(OUT);
    return br;
  }
  function toPlain(br) {
    function arr(a) { var o = new Array(a.length); for (var i = 0; i < a.length; i++) o[i] = Math.round(a[i] * 1e6) / 1e6; return o; }
    return { H: br.H, w1: arr(br.w1), b1: arr(br.b1), w2: arr(br.w2), b2: arr(br.b2) };
  }
  function fromPlain(o) {
    if (!o || !o.H || !o.w1 || o.w1.length !== IN * o.H || !o.w2 || o.w2.length !== o.H * OUT ||
        !o.b1 || o.b1.length !== o.H || !o.b2 || o.b2.length !== OUT) return null;
    return withBuffers({ H: o.H, w1: Float32Array.from(o.w1), b1: Float32Array.from(o.b1),
                         w2: Float32Array.from(o.w2), b2: Float32Array.from(o.b2) });
  }
  function copyInto(dst, src) { dst.w1.set(src.w1); dst.b1.set(src.b1); dst.w2.set(src.w2); dst.b2.set(src.b2); }

  function encode(br, st, p) {
    var n = 0, xi = br.xi, xv = br.xv, b = st.b;
    function marks(base, c) {
      if (!c) return;
      xi[n] = base; xv[n++] = 1;
      if (c >= 2) { xi[n] = base + 1; xv[n++] = 1; }
      if (c >= 3) { xi[n] = base + 2; xv[n++] = 1; }
      if (c > 3) { xi[n] = base + 3; xv[n++] = (c - 3) / 2; }
    }
    for (var i = 0; i < 24; i++) {
      var v = b[i];
      if (!v) continue;
      var k = p === 0 ? i : 23 - i;
      var mine = p === 0 ? v > 0 : v < 0, c = v < 0 ? -v : v;
      marks((mine ? 0 : 96) + k * 4, c);
    }
    var q = 1 - p;
    if (st.bar[p]) { xi[n] = 192; xv[n++] = st.bar[p] / 2; }
    if (st.bar[q]) { xi[n] = 193; xv[n++] = st.bar[q] / 2; }
    if (st.pool[p]) { xi[n] = 194; xv[n++] = st.pool[p] / 15; }
    if (st.pool[q]) { xi[n] = 195; xv[n++] = st.pool[q] / 15; }
    if (st.off[p]) { xi[n] = 196; xv[n++] = st.off[p] / 15; }
    if (st.off[q]) { xi[n] = 197; xv[n++] = st.off[q] / 15; }
    br.xn = n;
  }

  function sig(z) { return z > 30 ? 1 : z < -30 ? 0 : 1 / (1 + Math.exp(-z)); }

  function run(br) {
    var H = br.H, h = br.h, w1 = br.w1, j, o;
    h.set(br.b1);
    for (var t = 0; t < br.xn; t++) {
      var row = br.xi[t] * H, x = br.xv[t];
      for (j = 0; j < H; j++) h[j] += w1[row + j] * x;
    }
    for (j = 0; j < H; j++) h[j] = sig(h[j]);
    for (o = 0; o < OUT; o++) {
      var z = br.b2[o];
      for (j = 0; j < H; j++) z += h[j] * br.w2[j * OUT + o];
      br.y[o] = sig(z);
    }
    return br.y;
  }
  function judge(br, st, p) { encode(br, st, p); return run(br); }

  function equity(y) { return 2 * y[0] - 1 + y[1] - y[3] + y[2] - y[4]; }
  function flip(y, out) {
    out[0] = 1 - y[0]; out[1] = y[3]; out[2] = y[4]; out[3] = y[1]; out[4] = y[2];
    return out;
  }

  function worth(br, st, p, kind, used, diceN) {
    if (st.off[p] >= 15) return Jacko.rules.gameValue(st, p);
    var next = Jacko.rules.afterPlay(kind, used, diceN);
    if (next === 'pass') return -equity(judge(br, st, 1 - p));
    return equity(judge(br, st, p));
  }
  function endKey(s) { return s.b.join(',') + '|' + s.bar[0] + s.bar[1] + '|' + s.pool[0] + ',' + s.pool[1] + '|' + s.off[0] + ',' + s.off[1]; }

  function bestPlay(br, seqs, p, kind, diceN) {
    var seen = {}, best = null, bv = -1e9;
    for (var i = 0; i < seqs.length; i++) {
      var s = seqs[i], key = endKey(s);
      if (seen[key]) continue;
      seen[key] = true;
      var v = worth(br, s, p, kind, s.seq.length, diceN);
      if (v > bv) { bv = v; best = s; }
    }
    return { play: best, value: bv };
  }

  function bestDouble(br, st, p) {
    var R = Jacko.rules, best = { v: 6, play: null, value: -1e9 };
    for (var v = 1; v <= 6; v++) {
      var seqs = R.allSequences(st.b, st.bar, st.pool, st.off, p, v, v), val, play = null;
      if (!seqs.length) val = -equity(judge(br, st, 1 - p));
      else { var bp = bestPlay(br, seqs, p, 'double', 4); val = bp.value; play = bp.play; }
      if (val > best.value) best = { v: v, play: play, value: val };
    }
    return best;
  }

  function sample(br) {
    return { xi: br.xi.slice(0, br.xn), xv: br.xv.slice(0, br.xn), h: br.h.slice(), y: br.y.slice() };
  }
  var dOut = new Float32Array(OUT);
  function learn(br, smp, target, alpha) {
    var H = br.H, o, j, h = smp.h, y = smp.y;
    for (o = 0; o < OUT; o++) dOut[o] = (target[o] - y[o]) * y[o] * (1 - y[o]);
    for (j = 0; j < H; j++) {
      var back = 0, row = j * OUT;
      for (o = 0; o < OUT; o++) back += dOut[o] * br.w2[row + o];
      for (o = 0; o < OUT; o++) br.w2[row + o] += alpha * dOut[o] * h[j];
      var g = alpha * back * h[j] * (1 - h[j]);
      br.b1[j] += g;
      for (var t = 0; t < smp.xi.length; t++) br.w1[smp.xi[t] * H + j] += g * smp.xv[t];
    }
    for (o = 0; o < OUT; o++) br.b2[o] += alpha * dOut[o];
  }

  Jacko.net = { IN: IN, OUT: OUT, create: create, toPlain: toPlain, fromPlain: fromPlain, copyInto: copyInto,
                judge: judge, equity: equity, flip: flip, worth: worth, bestPlay: bestPlay,
                bestDouble: bestDouble, sample: sample, learn: learn };
})(typeof self !== 'undefined' ? self : this);
