Jacko.motion = (function () {
  var tasks = [], waiters = [], running = false;

  function clock() { return performance.now() / 1000; }

  function speed() {
    return { slow: 1.45, smooth: 1, fast: 0.56 }[Jacko.store.get('speed')] || 1;
  }

  function frame() {
    var now = clock();
    var cur = tasks;
    tasks = [];
    var keep = cur.filter(function (t) { return !t(now); });
    tasks = keep.concat(tasks);
    Jacko.stage.now();
    if (tasks.length) { requestAnimationFrame(frame); return; }
    running = false;
    var w = waiters; waiters = [];
    w.forEach(function (fn) { fn(); });
  }

  function run(step) {
    tasks.push(step);
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  function busy() { return running || tasks.length > 0; }

  function whenStill(fn, ms) {
    var go = function () { setTimeout(fn, ms || 0); };
    if (busy()) waiters.push(go); else go();
  }

  var RUP = 0.42, RDN = 0.46, RTOT = 1 - RUP / 2 - RDN / 2;
  function car(k) {
    var d;
    if (k < RUP) { var x = k / RUP; d = RUP * (x * x * x - x * x * x * x * 0.5); }
    else if (k < 1 - RDN) d = RUP * 0.5 + (k - RUP);
    else { var y = (k - (1 - RDN)) / RDN; d = RUP * 0.5 + (1 - RUP - RDN) + RDN * (y - y * y * y + y * y * y * y * 0.5); }
    return d / RTOT;
  }
  function smooth(k) { return 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, k))); }

  return { clock: clock, speed: speed, run: run, busy: busy, whenStill: whenStill,
           ease: { car: car, smooth: smooth } };
})();

Jacko.sfx = (function () {
  var ac = null;
  var TAKES = {
    checker: ['chip-lay-1', 'chip-lay-2', 'chip-lay-3', 'chips-collide-1', 'chips-collide-2', 'chips-collide-3', 'chips-collide-4'],
    dice: ['dice-throw-1', 'dice-throw-2', 'dice-throw-3'],
    pop: ['bang_01', 'bang_02', 'bang_03', 'bang_04', 'bang_05', 'bang_06', 'bang_07', 'bang_08', 'bang_09', 'bang_10'],
    crackle: ['fw_01', 'fw_03', 'fw_04', 'fw_06']
  };
  var bank = {}, lastTake = {}, loading = false;

  function load(a) {
    if (loading) return;
    loading = true;
    var queue = [];
    Object.keys(TAKES).forEach(function (kind) {
      bank[kind] = [];
      TAKES[kind].forEach(function (name) { queue.push([kind, name]); });
    });
    queue.reduce(function (chain, job) {
      var kind = job[0], name = job[1];
      return chain.then(function () {
        return fetch('sounds/' + name + '.ogg').then(function (r) {
          if (!r.ok) throw new Error(name);
          return r.arrayBuffer();
        }).then(function (raw) {
          return new Promise(function (ok, no) { a.decodeAudioData(raw, ok, no); });
        }).then(function (buf) {
          var peak = 0, first = 0, c, i, d;
          for (c = 0; c < buf.numberOfChannels; c++) {
            d = buf.getChannelData(c);
            for (i = 0; i < d.length; i++) if (Math.abs(d[i]) > peak) peak = Math.abs(d[i]);
          }
          d = buf.getChannelData(0);
          for (i = 0; i < d.length; i++) if (Math.abs(d[i]) > peak * 0.1) { first = i; break; }
          bank[kind].push({ buf: buf, level: peak > 0 ? 1 / peak : 1,
                            start: Math.max(0, first / buf.sampleRate - 0.004) });
        }).catch(function () { });
      });
    }, Promise.resolve());
  }

  function ctx() {
    if (!Jacko.store.get('sound')) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { return null; }
    load(ac);
    return ac;
  }
  ['pointerdown', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function wake() {
      window.removeEventListener(ev, wake, true);
      ctx();
    }, true);
  });

  function take(kind, vol, at, pan, spread) {
    var a = ctx(); if (!a) return;
    var list = bank[kind];
    if (!list || !list.length) return;
    var n = (Math.random() * list.length) | 0;
    if (list.length > 1 && n === lastTake[kind]) n = (n + 1) % list.length;
    lastTake[kind] = n;
    var t = list[n], s = a.createBufferSource(), g = a.createGain(), out = g;
    s.buffer = t.buf;
    s.playbackRate.value = 1 + (Math.random() * 2 - 1) * (spread || 0.05);
    g.gain.value = t.level * vol;
    s.connect(g);
    if (pan && a.createStereoPanner) {
      var p = a.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p); out = p;
    }
    out.connect(a.destination);
    s.start(a.currentTime + (at || 0), t.start);
  }
  return {
    knock: function () { take('checker', 0.55, 0, 0, 0.06); },
    dice: function () { take('dice', 0.7, 0, 0, 0.05); },
    firework: function (crackle, big, pan) {
      take(crackle ? 'crackle' : 'pop', (big ? 0.42 : 0.3) * (0.8 + Math.random() * 0.2), 0, pan * 0.7, 0.12);
    }
  };
})();
