// THE MATCH: the opening throw, every turn, Roll, Undo, Redo, Confirm, captions and the score.
Jacko.play = (function () {
  var R = Jacko.rules, C = Jacko.checkers, D = Jacko.dice, M = Jacko.motion, store = Jacko.store;
  var $ = function (id) { return document.getElementById(id); };

  var G = {
    b: R.startBoard('classic'), bar: [0, 0], pool: [0, 0], off: [0, 0],
    turn: 0, phase: 'idle', thrown: [], seqs: [], moves: [], undo: [], redo: [],
    extraGo: false, rule21: 0, bonus: false, score: [0, 0], matchTo: 5,
    mode: 'ai', level: 'easy', start: 'classic', p1col: 'light', sel: null, selN: 0, gen: 0, asked: false,
    saveId: null, started: false, last: null, netBase: '', netN: 0,
    tape: [null, null], visit: null
  };

  function state() { return { b: G.b, bar: G.bar, pool: G.pool, off: G.off }; }
  function rnd() { return 1 + Math.floor(Math.random() * 6); }
  function online() { return G.mode === 'online' && !!Jacko.online; }
  function human(seat) {
    if (online()) return seat === Jacko.online.seat();
    return G.mode !== 'ai' || seat === 0;
  }
  function bot(seat) { return G.mode === 'ai' && seat === 1; }
  function far(seat) { return online() && seat !== Jacko.online.seat(); }
  function send(m) { if (online()) Jacko.online.send(m); }
  function isAI() { return G.mode === 'ai'; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function nm(seat) {
    var n = seat === 0 ? store.get('name1') || 'Player 1'
                       : store.get('name2') || (isAI() ? 'Computer' : 'Player 2');
    return '<b>' + esc(n) + '</b>';
  }

  function later(fn, ms) {
    var g = G.gen;
    setTimeout(function () { if (g === G.gen) fn(); }, ms);
  }
  function still(fn, ms) {
    var g = G.gen;
    M.whenStill(function () { if (g === G.gen) fn(); }, ms);
  }
  function mine(fn) {
    var g = G.gen;
    return function () { if (g === G.gen && fn) return fn.apply(null, arguments); };
  }

  function plainName(seat) {
    return seat === 0 ? store.get('name1') || 'Player 1'
                      : store.get('name2') || (isAI() ? 'Computer' : 'Player 2');
  }
  // Every match is saved at each hand-over, a friend match on both devices. The room maker's copy keeps
  // the room code, so loading it opens the room again; the last save is also what a friend who comes
  // back is handed.
  function save(phase, over) {
    if (!G.started || !G.saveId || !Jacko.saves) return;
    var r = {
      id: G.saveId, phase: phase,
      mode: G.mode, level: G.level, matchTo: G.matchTo, start: G.start, p1col: G.p1col,
      names: [plainName(0), plainName(1)], raw: [store.get('name1') || '', store.get('name2') || ''],
      score: G.score.slice(), b: G.b.slice(), bar: G.bar.slice(), pool: G.pool.slice(), off: G.off.slice(),
      turn: G.turn, thrown: G.thrown.slice(), extraGo: G.extraGo, rule21: G.rule21, bonus: G.bonus,
      tape: G.tape
    };
    if (online()) {
      r.room = Jacko.online.code();
      r.host = Jacko.online.isHost();
      r.friend = Jacko.online.friendRaw();
    }
    if (over) Object.keys(over).forEach(function (k) { r[k] = over[k]; });
    G.last = r;
    Jacko.saves.put(r);
  }
  function savePass(seat, bonus) {
    save('preroll', { turn: seat, bonus: !!bonus, thrown: [], extraGo: false, rule21: 0 });
  }
  function saveOpening() {
    var pool = G.start === 'fresh' ? [15, 15] : [0, 0];
    save('opening', { b: R.startBoard(G.start), bar: [0, 0], pool: pool, off: [0, 0], turn: 0,
                      thrown: [], extraGo: false, rule21: 0, bonus: false });
  }

  function boardNow() { return { b: G.b.slice(), bar: G.bar.slice(), pool: G.pool.slice(), off: G.off.slice() }; }
  function tapeThrow(d, gold) {
    if (!G.visit || G.visit.seat !== G.turn) G.visit = { seat: G.turn, throws: [] };
    var t = { d: d.slice(), b0: boardNow(), steps: [] };
    if (gold) t.gold = gold;
    G.visit.throws.push(t);
  }
  function tapeSay(sign, text, who) {
    var t = G.visit && G.visit.throws[G.visit.throws.length - 1];
    if (!t) return;
    if (sign) t.sign = sign;
    t.say = text;
    t.who = !!who;
  }
  function tapeSteps() {
    var t = G.visit && G.visit.throws[G.visit.throws.length - 1];
    if (!t) return;
    t.steps = G.moves.map(function (m, k) {
      var s = G.undo[k + 1];
      return { m: { from: m.from, to: m.to, die: m.die },
               b: s ? { b: s.b.slice(), bar: s.bar.slice(), pool: s.pool.slice(), off: s.off.slice() } : boardNow() };
    });
  }
  function tapeFile() {
    if (G.visit && G.visit.throws.length) G.tape[G.visit.seat] = G.visit;
    G.visit = null;
  }
  function canReplay(s) {
    var v = G.tape[s];
    return G.phase === 'preroll' && s !== G.turn && human(G.turn) && !G.bonus &&
           !!(v && v.throws && v.throws.length) && !(G.visit && G.visit.throws.length);
  }

  var capT = null, capNext = '';
  function say(html) {
    capNext = html;
    if (capT) return;
    var el = $('caption');
    el.classList.add('swap');
    capT = setTimeout(function () {
      el.innerHTML = capNext;
      el.classList.remove('swap');
      capT = null;
    }, 170);
  }

  function sign(big, word, mood) {
    var s = document.createElement('div');
    s.className = 'sign ' + (mood || '');
    s.innerHTML = '<b>' + big + '</b>' + (word ? '<span>' + word + '</span>' : '');
    s.addEventListener('animationend', function () { s.remove(); });
    $('game').appendChild(s);
  }

  function cards() {
    [0, 1].forEach(function (p) {
      var n = String(p + 1);
      $('score-p' + n).textContent = G.score[p];
      $('pip-p' + n).textContent = R.pipCount(G.b, G.bar, G.pool, p) + ' pips';
      $('card-p' + n).classList.toggle('turn', G.phase !== 'opening' && G.phase !== 'over' && G.phase !== 'idle' && G.turn === p);
    });
  }

  function playDone() { return !G.seqs.length || G.seqs.every(function (s) { return !s.seq.length; }); }
  function controls() {
    var me = human(G.turn), moving = G.phase === 'moving' && me;
    var opening = G.phase === 'opening' && !G.asked;
    set('btn-roll', opening || (G.phase === 'preroll' && me));
    set('btn-undo', moving && G.undo.length > 0);
    set('btn-redo', moving && G.redo.length > 0);
    set('btn-confirm', moving && playDone());
    var hint = !!store.get('hints');
    $('btn-confirm').classList.toggle('ready', hint && moving && playDone());
    $('btn-roll').classList.toggle('ready', hint && (opening || (G.phase === 'preroll' && me)));
    if (Jacko.replay) Jacko.replay.paint();
  }
  function set(id, on) {
    var b = $(id);
    b.disabled = !on;
    b.classList.toggle('off', !on);
  }

  function sources() {
    var out = [];
    G.seqs.forEach(function (s) { if (s.seq.length && out.indexOf(s.seq[0].from) < 0) out.push(s.seq[0].from); });
    return out;
  }
  function same(a, b) { return a.from === b.from && a.to === b.to && a.die === b.die; }

  function destsFor(src) {
    var out = {}, tally = {};
    G.seqs.forEach(function (s) {
      var q = s.seq;
      if (!q.length || q[0].from !== src) return;
      var key = q[0].to + ':' + q[0].die;
      tally[key] = (tally[key] || 0) + 1;
    });
    G.seqs.forEach(function (s) {
      var q = s.seq;
      if (!q.length || q[0].from !== src) return;
      var cur = out[q[0].to];
      if (!cur || tally[q[0].to + ':' + q[0].die] > tally[q[0].to + ':' + cur[0].die]) out[q[0].to] = [q[0]];
    });
    G.seqs.forEach(function (s) {
      var q = s.seq;
      if (q.length < 2 || q[0].from !== src || q[0].to === -1 || q[1].from !== q[0].to) return;
      if (!(q[1].to in out)) out[q[1].to] = [q[0], q[1]];
    });
    return out;
  }

  function locOf(id, side) {
    if (id === 24) return G.bar[side] > 0 ? 'bar' : 'pool';
    if (id === -1) return 'off';
    return 'p' + id;
  }

  function roadsOne(src) {
    var out = [], seen = {};
    G.seqs.forEach(function (s) {
      var q = s.seq;
      if (!q.length || q[0].from !== src) return;
      var dice = [];
      for (var n = 0; n < q.length; n++) {
        if (n > 0 && (q[n].from !== q[n - 1].to || q[n - 1].to === -1)) break;
        dice.push(q[n].die);
        var key = q[n].to + '|' + dice.join('+');
        if (seen[key]) continue;
        seen[key] = true;
        out.push({ to: q[n].to, label: dice.join('+'), path: q.slice(0, n + 1) });
      }
    });
    return out;
  }

  function walk(path) {
    var seqs = G.seqs, real = [];
    for (var i = 0; i < path.length; i++) {
      var m = path[i];
      seqs = seqs.filter(function (s) { return s.seq.length > i && same(s.seq[i], m); });
      if (!seqs.length) return null;
      real.push(seqs[0].seq[i]);
    }
    return real;
  }
  function roadsFor(src, n) {
    var one = roadsOne(src);
    if (!n || n < 2) return one;
    var out = [];
    one.forEach(function (r) {
      var path = [];
      for (var c = 0; c < n; c++) path = path.concat(r.path);
      var real = walk(path);
      if (real) out.push({ to: r.to, label: r.label + ' ×' + n, path: real });
    });
    return out;
  }
  function maxLift(src) {
    var have = C.counts(state(), G.turn)[locOf(src, G.turn)] || 0, n = 1;
    while (n < have && roadsFor(src, n + 1).length) n++;
    return n;
  }
  function destsLifted() {
    if (G.selN < 2) return destsFor(G.sel);
    var out = {};
    roadsFor(G.sel, G.selN).forEach(function (r) { if (!(r.to in out)) out[r.to] = r.path; });
    return out;
  }

  var balloonBox = null;
  function clearBalloons() {
    if (!balloonBox) return;
    Array.prototype.forEach.call(balloonBox.children, function (b) {
      if (b.classList.contains('out')) return;
      b.classList.add('out');
      setTimeout(function () { b.remove(); }, 220);
    });
  }
  // Everything on screen a balloon must never sit under, in the balloons' own frame.
  function balloonWalls() {
    var box = Jacko.view.rect(balloonBox), walls = [];
    document.querySelectorAll('#topbar, .player-card, .caption, #playbar .play-btn').forEach(function (el) {
      var r = Jacko.view.rect(el);
      if (r.width > 0 && r.height > 0) {
        walls.push({ l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top });
      }
    });
    return walls;
  }

  // Every balloon for a point stacks above its ring; only when the stack can't fit there does it go below.
  function showBalloons(src) {
    var st = state(), side = G.turn, S = Jacko.SIZE, byTo = {};
    var EDGE = 6, GAP = 6, W = balloonBox.clientWidth, H = balloonBox.clientHeight, walls = balloonWalls();
    roadsFor(src, G.selN).forEach(function (r) { (byTo[r.to] = byTo[r.to] || []).push(r); });
    Object.keys(byTo).forEach(function (key) {
      var to = +key, list = byTo[key], at, sp;
      if (to === -1) sp = C.spotOf(side, 'off', G.off[side], st);
      else {
        var hit = list[0].path[list[0].path.length - 1].hit;
        sp = C.spotOf(side, 'p' + to, hit ? 0 : R.ownCount(G.b, to, side), st);
      }
      var R0 = S.CKR * 1.45;
      at = Jacko.stage.project(sp.x, sp.y, sp.z - R0);
      var below = Jacko.stage.project(sp.x, sp.y, sp.z + R0);
      if (!at || !below) return;
      if (at.y > below.y) { var across = at; at = below; below = across; }
      var made = list.map(function (road) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'balloon';
        b.textContent = road.label;
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (G.phase !== 'moving' || !human(G.turn) || G.sel !== src) return;
          playPath(road.path);
        });
        balloonBox.appendChild(b);
        var w = b.offsetWidth;
        return { b: b, w: w, h: b.offsetHeight, x: Math.max(EDGE + w / 2, Math.min(W - EDGE - w / 2, at.x)) };
      });
      function stack(up) {
        var y = up ? at.y - GAP : below.y + GAP;
        return made.map(function (m) {
          var top = up ? y - m.h : y;
          y = up ? top - GAP : top + m.h + GAP;
          return { m: m, top: top };
        });
      }
      function clear(spots) {
        return spots.every(function (s) {
          var l = s.m.x - s.m.w / 2, r = s.m.x + s.m.w / 2, t = s.top, bt = s.top + s.m.h;
          if (t < EDGE || bt > H - EDGE) return false;
          return walls.every(function (k) { return r <= k.l || l >= k.r || bt <= k.t || t >= k.b; });
        });
      }
      var up = stack(true), down = stack(false);
      var under = !clear(up) && clear(down);
      (under ? down : up).forEach(function (s) {
        var b = s.m.b;
        if (under) b.classList.add('below');
        b.style.top = Math.round(under ? s.top : s.top + s.m.h) + 'px';
        b.style.left = Math.round(s.m.x) + 'px';
        b.style.setProperty('--nudge', Math.round(s.m.x - at.x) + 'px');
      });
    });
  }

  function hints() {
    clearBalloons();
    if (G.phase !== 'moving' || !human(G.turn)) { C.setMarks([]); return; }
    var st = state(), side = G.turn, marks = [], on = !!store.get('hints');
    if (G.sel === null) {
      if (on) sources().forEach(function (src) {
        var loc = locOf(src, side), n = C.counts(st, side)[loc] || 0;
        if (n) marks.push({ kind: 'src', side: side, loc: loc, k: n - 1, st: st });
      });
    } else {
      if (on) {
        var loc0 = locOf(G.sel, side), n0 = C.counts(st, side)[loc0] || 0;
        for (var f = 0; f < Math.min(G.selN || 1, n0); f++) {
          marks.push({ kind: 'src', side: side, loc: loc0, k: n0 - 1 - f, st: st, lifted: true });
        }
        var ringed = {};
        roadsFor(G.sel, G.selN).forEach(function (r) {
          if (ringed[r.to]) return;
          ringed[r.to] = true;
          var last = r.path[r.path.length - 1];
          if (r.to === -1) marks.push({ kind: 'dst', side: side, loc: 'off', k: G.off[side], st: st });
          else marks.push({ kind: 'dst', side: side, loc: 'p' + r.to, k: last.hit ? 0 : R.ownCount(G.b, r.to, side), st: st });
        });
      }
      if (on) showBalloons(G.sel);
    }
    C.setMarks(marks);
  }

  function select(id) {
    C.dropAll();
    G.sel = id;
    G.selN = id === null ? 0 : 1;
    if (id !== null) C.lift(C.topOf(G.turn, locOf(id, G.turn), state()), true);
    hints();
  }
  function liftMore() {
    if (G.selN >= maxLift(G.sel)) { select(null); return; }
    C.lift(C.nthFromTop(G.turn, locOf(G.sel, G.turn), G.selN, state()), true);
    G.selN++;
    hints();
  }

  function autoPick() {
    var s = sources();
    if (G.phase === 'moving' && human(G.turn) && s.length === 1 && s[0] === 24 && G.bar[G.turn] > 0) select(24);
    else select(null);
  }

  function snap() {
    return { b: G.b.slice(), bar: G.bar.slice(), pool: G.pool.slice(), off: G.off.slice(), seqs: G.seqs, moves: G.moves.slice() };
  }
  function restore(s) {
    G.b = s.b; G.bar = s.bar; G.pool = s.pool; G.off = s.off; G.seqs = s.seqs; G.moves = s.moves;
    C.show(state());
    showDice();
    cards();
  }

  function doMove(m, group) {
    G.undo.push(snap());
    G.redo = [];
    var st = R.applyMove(G.b, G.bar, G.pool, G.off, G.turn, m);
    G.b = st.b; G.bar = st.bar; G.pool = st.pool; G.off = st.off;
    G.moves.push(m);
    G.seqs = G.seqs.filter(function (s) { return s.seq.length && same(s.seq[0], m); })
      .map(function (s) { return { seq: s.seq.slice(1), b: s.b, bar: s.bar, pool: s.pool, off: s.off }; });
    C.show(state(), group === true ? { group: true } : undefined);
    showDice();
    cards();
  }

  function showDice() {
    if (G.thrown.length === 4) { D.markUsed(G.moves.length, 4); return; }
    var left = G.thrown.slice();
    G.moves.forEach(function (m) { var at = left.indexOf(m.die); if (at >= 0) left.splice(at, 1); });
    D.markUsedValues(left);
  }

  function playPath(path) {
    var group = G.selN > 1;
    C.dropAll();
    G.sel = null;
    G.selN = 0;
    send({ k: 'path', path: path });
    path.forEach(function (m) { doMove(m, group); });
    if (G.off[G.turn] === 15) { endRound(G.turn); return; }
    autoPick();
    controls();
    if (playDone() && !autoConfirm()) say(nm(G.turn) + ' — press the tick to confirm, or undo.');
  }

  function autoConfirm() {
    if (store.get('autoConfirm') !== 'on' || G.phase !== 'moving' || !human(G.turn) || !playDone()) return false;
    still(function () { if (G.phase === 'moving' && human(G.turn) && playDone()) pressConfirm(); }, 250);
    return true;
  }

  function spotAt(x, z) {
    var S = Jacko.SIZE;
    if (Math.abs(z) > S.CD / 2 + 0.01) return null;
    if (x > S.IW / 2 + S.FR * 0.4 && x < S.IW / 2 + 2 * S.FR + S.TRAY + 0.015) return 'tray';
    if (Math.abs(x) <= S.BW / 2) return 'bar';
    if (x < -S.IW / 2 - 0.006 || x > S.IW / 2) return null;
    var far = z < 0, col;
    if (x < 0) {
      col = Math.max(0, Math.min(5, Math.floor((x + S.IW / 2) / S.PW)));
      return far ? 12 + col : 11 - col;
    }
    col = Math.max(0, Math.min(5, Math.floor((x - S.BW / 2) / S.PW)));
    return far ? 18 + col : 5 - col;
  }

  function onTap(x, z) {
    if (G.phase !== 'moving' || !human(G.turn)) return;
    var spot = spotAt(x, z);
    if (spot === null) { if (G.sel !== null) select(null); return; }
    var srcs = sources(), id;
    if (spot === 'bar') id = 24;
    else if (spot === 'tray') {
      var ds0 = G.sel !== null ? destsLifted() : {};
      id = (-1 in ds0) ? -1 : (G.pool[G.turn] > 0 ? 24 : -1);
    } else id = spot;

    if (G.sel !== null) {
      var ds = destsLifted();
      if (id === G.sel) { liftMore(); return; }
      if (id in ds) { playPath(ds[id]); return; }
    }
    if (srcs.indexOf(id) >= 0) { select(id); return; }
    if (G.sel !== null) say('That checker can\'t go there. The green rings show where it can.');
    else if (srcs.length) say('Tap one of the checkers with a green ring.');
  }

  function listenTaps() {
    var el = $('table'), down = null;
    el.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', function (e) {
      if (!down) return;
      var moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 14) return;
      if (G.phase === 'choose') {
        var v = human(G.turn) ? D.choiceAt(e.clientX, e.clientY) : null;
        if (v) applyDouble(v);
        return;
      }
      var p = Jacko.stage.pick(e.clientX, e.clientY);
      if (p) onTap(p.x, p.z);
    });
  }

  function openThrow(a, b) {
    G.phase = 'rolling';
    G.asked = false;
    controls();
    say('Each player throws one die…');
    if (a === undefined) { a = rnd(); b = rnd(); }
    D.rollIn([a, b], [0, 1], mine(function () {
      if (a === b) {
        say('Both threw ' + a + ' — a tie. Press Roll to throw again.');
        Jacko.sfx.bad();
        later(function () {
          D.flyOff();
          G.phase = 'opening';
          controls();
        }, 1300);
        return;
      }
      G.turn = a > b ? 0 : 1;
      G.started = true;
      savePass(G.turn, false);
      say(nm(0) + ' threw ' + a + ' · ' + nm(1) + ' threw ' + b + ' — ' + nm(G.turn) + ' goes first!');
      Jacko.sfx.good();
      cards();
      later(function () { handOver(startTurn); }, 1700);
    }));
  }

  function startTurn() {
    G.phase = 'preroll';
    G.thrown = []; G.seqs = []; G.moves = []; G.undo = []; G.redo = [];
    if (!G.bonus || !G.visit || G.visit.seat !== G.turn) G.visit = { seat: G.turn, throws: [] };
    select(null);
    cards();
    controls();
    save('preroll');
    if (G.bonus) say(nm(G.turn) + ' — another go! Roll again.');
    else say(nm(G.turn) + ' to roll.');
    // The computer throws the moment its turn comes, like a player pressing Roll as it lights;
    // on another go its own dice have already gone, and it throws 0.5 s later.
    if (bot(G.turn)) later(roll, G.bonus ? 500 : 0);
    else if (human(G.turn) && store.get('autoRoll') === 'on') later(autoRoll, G.bonus ? 500 : 700);
  }

  function autoRoll() {
    if (Jacko.replay && Jacko.replay.busy()) { later(autoRoll, 400); return; }
    if (G.phase !== 'preroll' || !human(G.turn) || store.get('autoRoll') !== 'on') return;
    roll();
  }

  function roll(d1, d2) {
    if (G.phase !== 'preroll') return;
    G.phase = 'rolling';
    controls();
    if (d1 === undefined) {
      d1 = rnd(); d2 = rnd();
      if (human(G.turn)) send({ k: 'roll', d: [d1, d2] });
    }
    G.thrown = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
    D.rollIn([d1, d2], [G.turn, G.turn], mine(function () { afterRoll(d1, d2); }));
  }

  function afterRoll(d1, d2) {
    var kind = R.throwKind(d1, d2), who = nm(G.turn);
    var thrown = d1 === d2 ? 'a double ' + d1 : d1 + ' and ' + d2;
    tapeThrow([d1, d2]);

    if (kind === 'miss') {
      G.phase = 'busy';
      controls();
      savePass(1 - G.turn, false);
      sign('7', 'SKIPPED', 'bad');
      Jacko.sfx.bad();
      var said7 = ' rolled ' + d1 + ' and ' + d2 + ' = 7 — misses a go!';
      tapeSay('7', said7, true);
      say(who + said7);
      later(function () { handOver(nextTurn); }, 1700);
      return;
    }
    var jackpot = kind === 'jackpot', eight = kind === 'again';
    if (jackpot) G.rule21 = 1;
    if (eight) G.extraGo = true;

    G.seqs = R.allSequences(G.b, G.bar, G.pool, G.off, G.turn, d1, d2);
    G.moves = []; G.undo = []; G.redo = [];

    if (!G.seqs.length) {
      var hadBonus = R.hasBonus(kind);
      G.extraGo = false; G.rule21 = 0;
      G.phase = 'busy';
      controls();
      savePass(1 - G.turn, false);
      sign('BLOCKED', '', 'bad');
      Jacko.sfx.bad();
      var saidB = ' rolled ' + thrown + ' — blocked, nothing can be played.' + (hadBonus ? ' Bonus lost.' : '');
      tapeSay('BLOCKED', saidB, true);
      say(who + saidB);
      later(function () { handOver(nextTurn); }, 1800);
      return;
    }

    var maxPlay = G.seqs[0].seq.length, diceN = G.thrown.length;
    var shortBonus = R.bonusLost(kind, maxPlay, diceN);
    var tail = [];
    if (d1 !== d2 && maxPlay === 1) tail.push((G.seqs[0].seq[0].die === d1 ? d2 : d1) + ' blocked');
    else if (maxPlay < diceN) tail.push('only ' + maxPlay + ' of ' + diceN + ' can be played');
    if (shortBonus) tail.push(jackpot ? 'jackpot lost' : 'extra go lost');

    if (!shortBonus) {
      if (jackpot) { sign('21', 'ACEY DEUCEY', 'acey'); Jacko.sfx.good(); }
      else if (eight) { sign('8', 'ANOTHER GO', 'good'); Jacko.sfx.good(); }
    }
    G.phase = 'moving';
    save('moving', { dice: [d1, d2] });
    var said = ' rolled ' + thrown + (tail.length ? ' — ' + tail.join(', ') + '.' : '.');
    tapeSay(shortBonus ? null : jackpot ? '21' : eight ? '8' : null, said, true);
    var line = who + said;
    if (human(G.turn)) line += autoSeq() ? ' Played for you.' : ' Tap a checker with a green ring.';
    say(line);
    startMoving();
  }

  function raceClear(p) {
    if (!R.canBearOff(G.b, G.bar, G.pool, p) || G.bar[1 - p] || G.pool[1 - p]) return false;
    var i;
    if (p === 0) {
      var hi = -1;
      for (i = 5; i >= 0; i--) if (G.b[i] > 0) { hi = i; break; }
      for (i = 0; i <= hi; i++) if (G.b[i] < 0) return false;
    } else {
      var lo = 24;
      for (i = 18; i < 24; i++) if (G.b[i] < 0) { lo = i; break; }
      for (i = lo; i < 24; i++) if (G.b[i] > 0) return false;
    }
    return true;
  }
  function endKey(s) { return s.b.join(',') + '|' + s.bar.join(',') + '|' + s.pool.join(',') + '|' + s.off.join(','); }
  function autoSeq() {
    if (!human(G.turn) || !G.seqs.length) return null;
    var p = G.turn;
    if (store.get('autoBear') === 'on' && raceClear(p)) {
      var best = G.seqs[0];
      G.seqs.forEach(function (s) {
        if (s.off[p] > best.off[p] || (s.off[p] === best.off[p] &&
            R.pipCount(s.b, s.bar, s.pool, p) < R.pipCount(best.b, best.bar, best.pool, p))) best = s;
      });
      return best.seq;
    }
    if (store.get('autoMove') === 'on') {
      var k = endKey(G.seqs[0]);
      if (G.seqs.every(function (s) { return endKey(s) === k; })) return G.seqs[0].seq;
    }
    return null;
  }
  function autoRun(list) {
    if (G.phase !== 'auto') return;
    if (!list.length) {
      still(function () { if (G.phase !== 'auto') return; send({ k: 'confirm' }); endRoll(); }, 450);
      return;
    }
    var m = list.shift();
    send({ k: 'path', path: [m] });
    doMove(m);
    if (G.off[G.turn] === 15) { endRound(G.turn); return; }
    still(function () { autoRun(list); }, 140);
  }

  function startMoving() {
    showDice();
    var auto = autoSeq();
    if (auto) {
      G.phase = 'auto';
      select(null);
      controls();
      still(function () { autoRun(auto.slice()); }, 350);
      return;
    }
    if (human(G.turn)) { autoPick(); controls(); }
    else { controls(); hints(); if (bot(G.turn)) aiPlay(); }
  }

  function aiPlay() {
    var how = { kind: G.rule21 === 2 ? 'double' : R.throwKind(G.thrown[0], G.thrown[1]),
                diceN: G.thrown.length, seat: G.turn };
    later(function () {
      Jacko.ai.choose(state(), G.seqs, G.level, mine(function (seq) { aiRun(flockOrder(seq)); }), how);
    }, Jacko.ai.thinkMs(state(), G.seqs));
  }

  // The same play, in the order that lets checkers making the same hop fly together.
  function sameHop(a, b) { return a && b && a.from === b.from && a.to === b.to && a.die === b.die; }
  function flights(seq) {
    var n = 0;
    seq.forEach(function (m, i) { if (!sameHop(seq[i - 1], m)) n++; });
    return n;
  }
  function flockOrder(chosen) {
    function endOf(s) { return s.b.join() + '/' + s.bar.join() + '/' + s.pool.join() + '/' + s.off.join(); }
    var end = endOf(chosen), best = chosen.seq, fewest = flights(chosen.seq);
    G.seqs.forEach(function (s) {
      if (s.seq.length !== best.length || endOf(s) !== end) return;
      var n = flights(s.seq);
      if (n < fewest) { best = s.seq; fewest = n; }
    });
    return best.slice();
  }
  function aiRun(list) {
    if (!list.length) { still(endRoll, 300); return; }
    var flock = [list.shift()];
    while (list.length && sameHop(flock[0], list[0])) flock.push(list.shift());
    flock.forEach(function (m) { doMove(m, flock.length > 1); });
    if (G.off[G.turn] === 15) { endRound(G.turn); return; }
    still(function () { aiRun(list); }, 140);
  }

  function endRoll() {
    G.phase = 'busy';
    tapeSteps();
    select(null);
    C.setMarks([]);
    controls();
    var diceN = G.thrown.length, used = G.moves.length, short = used < diceN, who = nm(G.turn);
    var kind = G.rule21 === 1 ? 'jackpot' : G.rule21 === 2 ? 'double' : G.extraGo ? 'again' : 'plain';
    var next = R.afterPlay(kind, used, diceN);

    if (next === 'double') { G.rule21 = 2; chooseDouble(); return; }
    G.rule21 = 0;
    G.extraGo = false;

    savePass(next === 'again' ? G.turn : 1 - G.turn, next === 'again');

    if (R.bonusLost(kind, used, diceN)) {
      say(who + ' played only ' + used + ' of ' + diceN + ' — ' + (kind === 'jackpot' ? 'jackpot' : 'extra go') + ' lost.');
      Jacko.sfx.bad();
      later(function () { handOver(nextTurn); }, 1300);
      return;
    }
    if (next === 'again') {
      G.bonus = true;
      againGo();
      return;
    }
    if (short) {
      var left = G.thrown.slice();
      G.moves.forEach(function (m) { var at = left.indexOf(m.die); if (at >= 0) left.splice(at, 1); });
      say(diceN === 2 && used === 1 ? 'Only the ' + G.moves[0].die + ' could be played — the ' + left[0] + ' is blocked.'
                                    : 'Only ' + used + ' of ' + diceN + ' could be played — the rest are blocked.');
      later(function () { handOver(nextTurn); }, 1300);
      return;
    }
    handOver(nextTurn);
  }

  // The dice fly off and the next throw is ready the same moment; a new throw takes over from them.
  function handOver(next) {
    D.flyOff();
    next();
  }

  // Another go for the same player: their dice leave the screen fully before the next throw.
  function againGo() {
    D.flyOff(mine(startTurn));
  }

  function nextTurn() {
    tapeFile();
    G.bonus = false;
    G.turn = 1 - G.turn;
    startTurn();
  }

  function chooseDouble() {
    G.phase = 'choose';
    controls();
    save('choose', { thrown: [] });
    var t = G.turn;
    say('ACEY DEUCEY! ' + nm(t) + (human(t) ? ' picks a free double.' : ' picks…'));
    later(function () {
      if (G.phase !== 'choose' || D.choosing()) return;
      D.showChoice(t, mine(function () {
        if (G.phase === 'choose' && bot(t)) later(function () { applyDouble(Jacko.ai.chooseDouble(state(), G.level)); }, 1000);
      }));
    }, 400);
  }

  function applyDouble(v) {
    if (G.phase !== 'choose') return;
    if (human(G.turn)) send({ k: 'double', v: v });
    G.phase = 'busy';
    D.pickChoice(v, mine(function () {
      G.thrown = [v, v, v, v];
      G.extraGo = true;
      G.seqs = R.allSequences(G.b, G.bar, G.pool, G.off, G.turn, v, v);
      G.moves = []; G.undo = []; G.redo = [];
      tapeThrow([v, v], v);
      if (!G.seqs.length) {
        G.extraGo = false;
        savePass(1 - G.turn, false);
        tapeSay(null, 'No move for the free double ' + v + ' — extra go lost.', false);
        say('No move for the free double ' + v + ' — extra go lost.');
        Jacko.sfx.bad();
        later(function () { handOver(nextTurn); }, 1500);
        return;
      }
      G.phase = 'moving';
      tapeSay(null, ' plays a free double ' + v + '.', true);
      save('moving', { dice: [v, v], gold: v });
      say(nm(G.turn) + ' plays a free double ' + v + '.' +
          (human(G.turn) ? (autoSeq() ? ' Played for you.' : ' Tap a checker with a green ring.') : ''));
      startMoving();
    }));
  }

  function endRound(winner) {
    G.phase = 'over';
    clearBalloons();
    C.setMarks([]);
    controls();
    var pts = R.gameValue(state(), winner);
    G.score[winner] += pts;
    cards();
    var how = pts === 1 ? 'a single game, 1 point' : pts === 2 ? 'a gammon, 2 points' : 'a backgammon, 3 points';
    var match = G.score[winner] >= G.matchTo;
    if (match) { if (G.saveId && Jacko.saves) Jacko.saves.remove(G.saveId); G.saveId = null; G.started = false; G.last = null; }
    else saveOpening();
    say(nm(winner) + ' wins the round with ' + how + '!');
    sign(pts === 1 ? 'WIN' : pts === 2 ? 'GAMMON' : 'BACKGAMMON', '', 'acey');
    Jacko.sfx.win();
    still(function () {
      D.flyOff();
      $('round-title').innerHTML = match ? nm(winner) + ' wins the match!' : nm(winner) + ' wins the round';
      $('round-text').textContent = 'Won with ' + how + '.';
      $('round-score').innerHTML = nm(0) + ' <span>' + G.score[0] + ' – ' + G.score[1] + '</span> ' + nm(1);
      $('round-next').textContent = match ? 'New Match' : 'Next Round';
      $('round-next').dataset.match = match ? '1' : '';
      Jacko.fade.show($('round-pop'));
      if (match && Jacko.logoGlow) Jacko.logoGlow(true);
    }, 900);
  }

  // A friend match carries the room maker's save name on both devices, so each keeps one copy of it.
  function newMatch(first, fromNet, netId) {
    G.mode = store.get('mode');
    G.level = store.get('ai');
    G.matchTo = +store.get('match') || 5;
    G.start = store.get('start');
    setColour(store.get('p1col'), first);
    G.score = [0, 0];
    G.saveId = typeof netId === 'string' && netId ? netId.slice(0, 40) : Jacko.saves ? Jacko.saves.newId() : null;
    G.netBase = G.saveId || ''; G.netN = 0;
    G.started = false;
    G.last = null;
    if (online() && !fromNet && Jacko.online.isHost()) send({ k: 'start', match: G.matchTo, start: G.start, p1col: G.p1col, id: G.saveId });
    Jacko.showNames();
    newRound(first);
  }

  function setColour(v, now) {
    G.p1col = v === 'dark' ? 'dark' : 'light';
    showColour(G.p1col, now);
  }
  function showColour(v, now) {
    var dark = v === 'dark';
    if (dark === Jacko.p1dark) return;
    Jacko.p1dark = dark;
    if (Jacko.showTheme) Jacko.showTheme(!now);
  }
  function previewColour(v) { showColour(v === 'dark' ? 'dark' : 'light'); }
  function keepColour() { showColour(G.p1col); }

  function newRound(first) {
    G.gen++;
    G.asked = false;
    if (Jacko.logoGlow) Jacko.logoGlow(false);
    Jacko.fade.hide($('round-pop'));
    G.b = R.startBoard(G.start);
    G.bar = [0, 0];
    G.off = [0, 0];
    G.pool = G.start === 'fresh' ? [15, 15] : [0, 0];
    G.turn = 0; G.phase = 'opening';
    G.extraGo = false; G.rule21 = 0; G.bonus = false;
    G.thrown = []; G.seqs = []; G.moves = []; G.undo = []; G.redo = []; G.sel = null;
    G.tape = [null, null]; G.visit = null;
    D.flyOff();
    C.dropAll();
    clearBalloons();
    C.setMarks([]);
    C.show(state(), first ? { now: true } : { deal: true });
    cards();
    controls();
    save('opening');
    say('Press Roll — each player throws one die, and the higher one goes first.');
  }

  function pickIn(key, v) {
    var b = document.querySelector('#menu [data-pick="' + key + '"] [data-v="' + v + '"]');
    if (b && !b.disabled && !b.classList.contains('on')) b.click();
    else store.set(key, v);
  }
  // A friend match: on the room maker's device the room opens again on its code; on the friend's device
  // the spare copy carries on as 2 Players.
  function loadMatch(r) {
    if (r.mode === 'online') {
      if (r.host && Jacko.online && Jacko.online.reopen(r)) { netPicks(r); continueMatch(r, true); return; }
      r = JSON.parse(JSON.stringify(r));
      r.mode = 'local';
      delete r.room; delete r.host; delete r.friend;
    }
    pickIn('mode', r.mode);
    pickIn('ai', r.level);
    pickIn('match', String(r.matchTo));
    pickIn('start', r.start);
    pickIn('p1col', r.p1col === 'dark' ? 'dark' : 'light');
    ['1', '2'].forEach(function (n, i) {
      store.set('name' + n, r.raw[i] || '');
      var inp = $('set-name' + n);
      if (inp) inp.value = r.raw[i] || '';
    });
    continueMatch(r, false);
  }
  function netPicks(r) {
    store.set('match', String(r.matchTo));
    store.set('start', r.start);
    store.set('p1col', r.p1col === 'dark' ? 'dark' : 'light');
  }

  // Play a Friend: what a friend who comes back is handed, and taking it. The match as it stands at the
  // last hand-over; before the first throw, the match's set-up; while the room maker is still choosing,
  // nothing.
  function syncData() {
    if (G.phase === 'idle') return { idle: true };
    if (G.started && G.last) return { rec: JSON.parse(JSON.stringify(G.last)) };
    return { match: G.matchTo, start: G.start, p1col: G.p1col, id: G.saveId };
  }
  function resume(s) {
    if (s.rec) {
      var rec = typeof s.rec === 'object' && Jacko.saves ? Jacko.saves.check(s.rec) : null;
      if (!rec) return;
      netPicks(rec);
      continueMatch(rec, true);
      return;
    }
    if ([3, 5, 10].indexOf(+s.match) >= 0) store.set('match', String(s.match));
    if (['classic', 'fresh', 'tjs'].indexOf(s.start) >= 0) store.set('start', s.start);
    store.set('p1col', s.p1col === 'dark' ? 'dark' : 'light');
    newMatch(false, true, netId(s.id));
  }
  function die(x) { return typeof x === 'number' && x >= 1 && x <= 6 && x === Math.floor(x); }
  function netId(x) { return typeof x === 'string' && /^[a-z0-9-]{1,40}$/i.test(x) ? x : undefined; }

  function continueMatch(r, net) {
    G.gen++;
    G.mode = net ? 'online' : r.mode; G.level = r.level; G.matchTo = r.matchTo; G.start = r.start;
    G.last = r;
    G.netBase = r.id; G.netN = 0;
    setColour(r.p1col);
    G.score = r.score.slice();
    G.b = r.b.slice(); G.bar = r.bar.slice(); G.pool = r.pool.slice(); G.off = r.off.slice();
    G.turn = r.turn;
    G.extraGo = !!r.extraGo; G.rule21 = r.rule21 || 0; G.bonus = !!r.bonus;
    G.thrown = []; G.seqs = []; G.moves = []; G.undo = []; G.redo = []; G.sel = null;
    G.tape = Array.isArray(r.tape) && r.tape.length === 2 ? r.tape.slice() : [null, null];
    G.visit = { seat: r.turn, throws: [] };
    G.asked = false;
    G.saveId = r.id; G.started = true;
    G.phase = 'busy';

    Jacko.showNames();
    Jacko.fade.hide($('round-pop'));
    C.dropAll();
    clearBalloons();
    C.setMarks([]);
    C.show(state(), { now: true });
    cards();
    controls();

    var t = G.turn;
    D.flyOff(mine(function () {
      if (r.phase === 'opening') {
        G.phase = 'opening';
        controls();
        say('Match continued. Press Roll — each player throws one die, and the higher one goes first.');
        return;
      }
      if (r.phase === 'preroll') { startTurn(); return; }
      if (r.phase === 'choose') {
        say(nm(t) + '\'s throw comes back…');
        D.rollIn([2, 1], [t, t], mine(function () { D.markUsedValues([]); chooseDouble(); }));
        return;
      }
      var a = r.dice[0], b = r.dice[1];
      function play() {
        G.thrown = a === b ? [a, a, a, a] : [a, b];
        G.seqs = R.allSequences(G.b, G.bar, G.pool, G.off, G.turn, a, b);
        G.moves = []; G.undo = []; G.redo = [];
        var thrown = a === b ? 'a double ' + a : a + ' and ' + b;
        tapeThrow([a, b], r.gold);
        tapeSay(null, r.gold ? ' plays a free double ' + r.gold + '.' : ' rolled ' + thrown + '.', true);
        if (!G.seqs.length) { G.extraGo = false; G.rule21 = 0; handOver(nextTurn); return; }
        G.phase = 'moving';
        say(nm(t) + ' rolled ' + thrown + '.' +
            (human(t) ? (autoSeq() ? ' Played for you.' : ' Tap a checker with a green ring.') : ''));
        startMoving();
      }
      say(nm(t) + '\'s throw comes back…');
      if (r.gold) {
        D.rollIn([2, 1], [t, t], mine(function () { D.markUsedValues([]); D.goldSwap(r.gold, mine(play)); }));
      } else D.rollIn([a, b], [t, t], mine(play));
    }));
  }
  function forget(id) {
    if (G.saveId === id) { G.saveId = null; G.started = false; }
  }

  function pressRoll() {
    if (Jacko.logoGlow) Jacko.logoGlow(false);
    if (G.phase === 'opening' && !G.asked) {
      if (!online()) { openThrow(); return; }
      if (Jacko.online.isHost()) {
        var a = rnd(), b = rnd();
        send({ k: 'open', a: a, b: b });
        openThrow(a, b);
      } else {
        G.asked = true;
        controls();
        send({ k: 'openAsk' });
      }
    } else if (G.phase === 'preroll' && human(G.turn)) roll();
  }
  function undoOne() {
    G.redo.push(snap());
    var r = G.redo.slice();
    restore(G.undo.pop());
    G.redo = r;
    autoPick();
    controls();
    say(nm(G.turn) + ' took a move back.');
  }
  function redoOne() {
    var r = G.redo.slice(), s = r.pop();
    G.undo.push(snap());
    restore(s);
    G.redo = r;
    if (G.off[G.turn] === 15) { endRound(G.turn); return; }
    autoPick();
    controls();
    if (!human(G.turn)) return;
    if (playDone()) { if (!autoConfirm()) say(nm(G.turn) + ' — press the tick to confirm, or undo.'); }
    else say('Tap one of the checkers with a green ring.');
  }
  function pressUndo() {
    if (G.phase !== 'moving' || !human(G.turn) || !G.undo.length) return;
    send({ k: 'undo' });
    undoOne();
  }
  function pressRedo() {
    if (G.phase !== 'moving' || !human(G.turn) || !G.redo.length) return;
    send({ k: 'redo' });
    redoOne();
  }
  function pressConfirm() {
    if (G.phase !== 'moving' || !human(G.turn) || !playDone()) return;
    send({ k: 'confirm' });
    endRoll();
  }
  function pressNext() {
    if (G.phase !== 'over') return;
    send({ k: 'next' });
    nextOn();
  }
  function nextOn() {
    if (!$('round-next').dataset.match) { newRound(); return; }
    if (!online()) { newMatch(); return; }
    G.score = [0, 0];
    G.saveId = G.netBase ? G.netBase + '-' + (++G.netN) : null;
    G.started = false;
    G.last = null;
    newRound();
  }

  // A friend's move is played only if it is one of the legal moves right now; the rest of the path stops.
  function legalNow(m) {
    if (!m || typeof m !== 'object') return null;
    for (var i = 0; i < G.seqs.length; i++) {
      var f = G.seqs[i].seq[0];
      if (f && same(f, m)) return f;
    }
    return null;
  }
  function farPath(path, done) {
    var list = Array.isArray(path) ? path.slice(0, 4) : [], g = G.gen;
    function next() {
      if (g !== G.gen) { done(); return; }
      var m = list.length ? legalNow(list[0]) : null;
      if (!m) { done(); return; }
      C.lift(C.topOf(G.turn, locOf(m.from, G.turn), state()), true);
      setTimeout(function () {
        if (g !== G.gen) { done(); return; }
        list.shift();
        doMove(m);
        if (G.off[G.turn] === 15) { endRound(G.turn); done(); return; }
        controls();
        M.whenStill(next, 140);
      }, 280);
    }
    next();
  }

  var net = {
    ready: function (m) {
      var theirs = far(G.turn);
      switch (m.k) {
        case 'open': return G.phase === 'opening';
        case 'roll': return G.phase === 'preroll' && theirs;
        case 'path': case 'undo': case 'redo': case 'confirm': return G.phase === 'moving' && theirs;
        case 'double': return G.phase === 'choose' && theirs;
        case 'replay': return G.phase === 'preroll' && theirs;
        default: return true;
      }
    },
    // Everything from the friend's device is checked first; anything that does not fit is ignored.
    apply: function (m, done) {
      switch (m.k) {
        case 'start':
          newMatch(false, true, netId(m.id));
          break;
        case 'openAsk':
          if (G.phase === 'opening' && Jacko.online.isHost()) pressRoll();
          break;
        case 'open':
          if (die(m.a) && die(m.b)) openThrow(m.a, m.b);
          break;
        case 'roll':
          if (Array.isArray(m.d) && die(m.d[0]) && die(m.d[1])) roll(m.d[0], m.d[1]);
          break;
        case 'path':
          farPath(m.path, done);
          return;
        case 'undo':
          if (G.undo.length) undoOne();
          break;
        case 'redo':
          if (G.redo.length) redoOne();
          break;
        case 'confirm':
          if (playDone()) endRoll();
          break;
        case 'double':
          if (die(m.v)) applyDouble(m.v);
          break;
        case 'next':
          if (G.phase === 'over') nextOn();
          break;
        case 'replay': case 'rpPause': case 'rpStop':
          if (Jacko.replay) Jacko.replay.remote(m);
          break;
      }
      done();
    }
  };

  function park(line) {
    G.gen++;
    G.mode = store.get('mode');
    G.phase = 'idle';
    G.asked = false;
    G.sel = null;
    Jacko.fade.hide($('round-pop'));
    D.flyOff();
    C.dropAll();
    clearBalloons();
    C.setMarks([]);
    Jacko.showNames();
    cards();
    controls();
    say(line);
  }

  // A friend match ended from Saved Matches: it stays in its slot as saved at the last hand-over, and
  // nothing more is written to it; the board rests until a new match or a saved one.
  function stopMatch(line) {
    G.saveId = null;
    G.started = false;
    G.last = null;
    park(line);
  }

  function takeOver(line) {
    G.mode = store.get('mode');
    G.asked = false;
    Jacko.showNames();
    if (G.phase === 'idle' || G.mode !== 'local') { newMatch(); say(line + ' New match: press Roll to start.'); return; }
    if (G.phase === 'choose' && !D.choosing()) D.showChoice(G.turn);
    if (G.phase === 'moving') autoPick();
    if (G.phase === 'over') Jacko.fade.show($('round-pop'));
    cards();
    controls();
    hints();
    say(line);
  }

  function init() {
    balloonBox = $('balloons');
    listenTaps();
    $('btn-roll').addEventListener('click', pressRoll);
    $('btn-undo').addEventListener('click', pressUndo);
    $('btn-redo').addEventListener('click', pressRedo);
    $('btn-confirm').addEventListener('click', pressConfirm);
    $('round-next').addEventListener('click', pressNext);
    if (Jacko.online) Jacko.online.init();
    newMatch(true);
  }

  return { init: init, newMatch: newMatch, loadMatch: loadMatch, previewColour: previewColour, keepColour: keepColour, forget: forget, isAI: isAI, refreshHints: function () { controls(); hints(); },
           net: net, park: park, takeOver: takeOver, say: say, caption: function () { return capNext; },
           syncData: syncData, resume: resume, saved: function () { return G.started && !!G.saveId; },
           saveName: function () { return G.saveId; }, stopMatch: stopMatch,
           inside: { G: G, gen: function () { return G.gen; }, canReplay: canReplay, boardNow: boardNow,
                     select: select, clearBalloons: clearBalloons, controls: controls, hints: hints,
                     sign: sign, nm: nm, esc: esc, send: send } };
})();
