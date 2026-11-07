// REPLAY: a player's scoreboard checker shows that player's whole last turn again.
Jacko.replay = (function () {
  var C = Jacko.checkers, D = Jacko.dice, M = Jacko.motion, P = Jacko.play, I = P.inside;
  var $ = function (id) { return document.getElementById(id); };
  var run = null;
  var slow = false;

  var SLOW = 1.45;
  var baseSpeed = M.speed;
  M.speed = function () { return slow ? SLOW : baseSpeed(); };

  var SIGNS = { '7': ['7', 'SKIPPED', 'bad'], '8': ['8', 'ANOTHER GO', 'good'],
                '21': ['21', 'ACEY DEUCEY', 'acey'], 'BLOCKED': ['BLOCKED', '', 'bad'] };

  function copy(s) { return { b: s.b.slice(), bar: s.bar.slice(), pool: s.pool.slice(), off: s.off.slice() }; }
  function locOf(id, side, st) {
    if (id === 24) return st.bar[side] > 0 ? 'bar' : 'pool';
    if (id === -1) return 'off';
    return 'p' + id;
  }

  // Replay waits for Roll, so it is off while Auto roll is on.
  function allowed() { return !!Jacko.store.get('hints') && Jacko.store.get('autoRoll') !== 'on'; }

  function paint() {
    var on = allowed();
    [0, 1].forEach(function (s) {
      var b = $('rp-p' + (s + 1));
      if (!b) return;
      var c = '';
      if (on) {
        if (run && run.seat === s) c = run.paused ? 'paused' : 'playing';
        else if (!run && I.canReplay(s)) c = 'ready';
      }
      b.classList.toggle('ready', c === 'ready');
      b.classList.toggle('playing', c === 'playing');
      b.classList.toggle('paused', c === 'paused');
    });
  }

  function go(r, fn) {
    if (r !== run) return;
    if (r.gen !== I.gen()) { abandon(); return; }
    if (r.paused) { r.held = function () { go(r, fn); }; return; }
    fn();
  }
  function later(fn, ms) { var r = run; setTimeout(function () { go(r, fn); }, ms || 0); }
  function still(fn, ms) { var r = run; M.whenStill(function () { setTimeout(function () { go(r, fn); }, ms || 0); }); }
  function then(fn) { var r = run; return function () { go(r, fn); }; }

  function start(seat, remote) {
    var G = I.G, visit = G.tape[seat];
    if (!visit || !visit.throws || !visit.throws.length) return;
    run = { seat: seat, remote: remote, gen: I.gen(), paused: false, held: null,
            phase: G.phase, caption: P.caption(), live: I.boardNow(),
            throws: visit.throws, i: 0, k: 0, diceOut: false };
    G.phase = 'replay';
    I.select(null);
    I.clearBalloons();
    C.setMarks([]);
    I.controls();
    if (remote) P.say(I.nm(G.turn) + ' is replaying your moves.');
    slow = false;
    C.show(copy(run.throws[0].b0));
    still(nextThrow, 300);
  }

  function nextThrow() {
    if (run.i >= run.throws.length) { end(); return; }
    var t = run.throws[run.i++], seat = run.seat;
    run.k = 0;
    slow = false;
    C.show(copy(t.b0));
    var landed = then(function () {
      used(t, 0);
      if (t.sign && SIGNS[t.sign]) {
        var s = SIGNS[t.sign];
        I.sign(s[0], s[1], s[2]);
        if (s[2] === 'bad') Jacko.sfx.bad(); else Jacko.sfx.good();
      }
      if (!run.remote && t.say) P.say((t.who ? I.nm(seat) : '') + I.esc(t.say));
      later(step, t.sign ? 1400 : 800);
    });
    var pick = then(function () {
      D.showChoice(seat, then(function () { later(function () { D.pickChoice(t.gold, landed); }, 900); }));
    });
    if (t.gold && run.diceOut) { pick(); return; }
    var pair = t.gold ? [2, 1] : t.d;
    var thrown = then(function () {
      run.diceOut = true;
      D.rollIn(pair, [seat, seat], t.gold ? then(function () { D.markUsedValues([]); pick(); }) : landed);
    });
    D.flyOff(thrown);
  }

  function step() {
    var t = run.throws[run.i - 1];
    if (run.k >= t.steps.length) { later(nextThrow, t.steps.length ? 700 : 300); return; }
    var p = t.steps[run.k], before = run.k ? t.steps[run.k - 1].b : t.b0;
    C.lift(C.topOf(run.seat, locOf(p.m.from, run.seat, before), before), true);
    later(function () {
      run.k++;
      slow = true;
      C.show(copy(p.b));
      slow = false;
      used(t, run.k);
      still(step, 280);
    }, 380);
  }

  function used(t, k) {
    if (t.gold || t.d[0] === t.d[1]) { D.markUsed(k, 4); return; }
    var left = t.d.slice();
    t.steps.slice(0, k).forEach(function (p) { var at = left.indexOf(p.m.die); if (at >= 0) left.splice(at, 1); });
    D.markUsedValues(left);
  }

  function end() {
    D.flyOff(then(function () {
      C.show(copy(run.live));
      still(finish, 120);
    }));
  }
  function finish() {
    var r = run, G = I.G;
    run = null;
    slow = false;
    G.phase = r.phase;
    P.say(r.caption);
    I.controls();
    I.hints();
  }

  function stop() {
    if (!run) return;
    var r = run, G = I.G;
    run = null;
    slow = false;
    C.dropAll();
    C.show(copy(r.live), { now: true });
    D.flyOff();
    if (G.phase === 'replay') G.phase = r.phase;
    P.say(r.caption);
    I.controls();
    I.hints();
  }
  function abandon() {
    run = null;
    slow = false;
    paint();
  }

  function pause(on, mine) {
    if (!run) return;
    run.paused = on;
    if (mine) I.send({ k: 'rpPause', on: on });
    if (!on && run.held) { var h = run.held; run.held = null; h(); }
    paint();
  }

  function press(seat) {
    if (run) {
      if (!run.remote && seat === run.seat) pause(!run.paused, true);
      return;
    }
    if (!allowed() || !I.canReplay(seat)) return;
    I.send({ k: 'replay', seat: seat });
    start(seat, false);
  }
  function remote(m) {
    if (m.k === 'replay') { if (!run && (m.seat === 0 || m.seat === 1)) start(m.seat, true); return; }
    if (!run || !run.remote) return;
    if (m.k === 'rpPause') pause(!!m.on, false);
    else if (m.k === 'rpStop') stop();
  }

  [0, 1].forEach(function (s) {
    var b = $('rp-p' + (s + 1));
    if (b) b.addEventListener('click', function () { press(s); });
  });
  var autoRow = document.querySelector('#settings-pop [data-pick="autoRoll"]');
  if (autoRow) autoRow.addEventListener('click', function () { setTimeout(paint, 0); });
  var logo = $('btn-new');
  if (logo) logo.addEventListener('click', function () {
    if (!run) return;
    if (!run.remote) I.send({ k: 'rpStop' });
    stop();
  }, true);

  return { paint: paint, remote: remote, busy: function () { return !!run; } };
})();
