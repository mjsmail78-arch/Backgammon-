// MOTION AND SOUND: checker speed, smooth easing, and the game's sounds.
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
  function ctx() {
    if (!Jacko.store.get('sound')) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { return null; }
    return ac;
  }
  function tone(f, at, dur, type, vol, slide) {
    var a = ctx(); if (!a) return;
    var t = a.currentTime + (at || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(at, dur, vol, hp) {
    var a = ctx(); if (!a) return;
    var t = a.currentTime + (at || 0), n = Math.round(a.sampleRate * dur);
    var buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp || 900; g.gain.value = vol || 0.2;
    s.connect(f); f.connect(g); g.connect(a.destination);
    s.start(t);
  }
  return {
    knock: function () { tone(190, 0, 0.07, 'triangle', 0.16, 120); noise(0, 0.04, 0.12, 1400); },
    dice: function () { for (var i = 0; i < 5; i++) noise(i * 0.09 + Math.random() * 0.03, 0.035, 0.16, 2200); },
    good: function () { tone(880, 0, 0.14, 'triangle', 0.1); tone(1174, 0.12, 0.26, 'triangle', 0.1); },
    bad: function () { tone(150, 0, 0.32, 'sawtooth', 0.06, 90); },
    win: function () { [660, 880, 1046, 1318].forEach(function (f, i) { tone(f, i * 0.12, 0.3, 'triangle', 0.1); }); }
  };
})();
