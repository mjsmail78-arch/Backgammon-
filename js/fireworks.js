Jacko.fireworks = (function () {
  var cv = null, cx = null, W = 0, H = 0, DPR = 1;
  var stars = [], sparks = [], rockets = [], flashes = [], puffs = [];
  var running = false, launching = false, endAt = 0, nextAt = 0, finaleAt = 0, finaleDone = true;
  var show = null, last = 0;

  var C = {
    red: [255, 48, 40], green: [60, 255, 90], blue: [60, 110, 255], purple: [185, 70, 255],
    orange: [255, 120, 30], gold: [255, 178, 70], silver: [225, 232, 255]
  };
  var PALETTE = ['red', 'green', 'blue', 'purple', 'orange', 'gold', 'silver'];
  var MAX = 1800;

  function ensure() {
    if (cv) return;
    cv = document.createElement('canvas');
    cv.id = 'fireworks';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:400;';
    document.getElementById('game').insertBefore(cv, document.getElementById('balloons'));
    cx = cv.getContext('2d');
  }
  function fit() {
    var game = document.getElementById('game');
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = game.clientWidth; H = game.clientHeight;
    var w = Math.round(W * DPR), h = Math.round(H * DPR);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }
  function U() { return Math.min(W, H) / 100; }

  function nearest(hex) {
    var hsl = {};
    new THREE.Color(hex).getHSL(hsl);
    if (hsl.s < 0.25 || hsl.l > 0.82) return 'silver';
    var h = hsl.h * 360;
    if (h < 18 || h >= 330) return 'red';
    if (h < 40) return 'orange';
    if (h < 68) return 'gold';
    if (h < 170) return 'green';
    if (h < 255) return 'blue';
    return 'purple';
  }
  function colourPick() {
    return Math.random() < 0.35 ? show.mine : pick(PALETTE);
  }
  function other(than) {
    var c;
    do { c = pick(PALETTE); } while (c === than);
    return c;
  }

  function launch(kind, finale) {
    var u = U(), z = show.zone;
    var x0 = z[0] * W + (z[1] - z[0]) * W * 0.14, x1 = z[1] * W - (z[1] - z[0]) * W * 0.14;
    var x = rnd(x0, x1);
    var top = H * rnd(0.12, show.big ? 0.38 : 0.32);
    var y = H + 2 * u, g = 55 * u;
    rockets.push({ x: x, y: y, vx: rnd(-3, 3) * u, vy: -Math.sqrt(2 * g * (y - top)), g: g,
                   kind: kind || shellKind(), finale: !!finale, hist: [] });
  }
  function shellKind() {
    var list = ['peony', 'peony', 'chrys', 'chrys', 'willow', 'palm', 'crossette', 'strobe', 'change'];
    return pick(list);
  }

  function addStar(o) {
    if (stars.length >= MAX) return;
    o.hist = []; o.life = 0;
    stars.push(o);
  }

  function ballDir() {
    var z = rnd(-1, 1), a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - z * z);
    return [Math.cos(a) * r, Math.sin(a) * r];
  }

  function burst(r) {
    var u = U(), big = show.big ? 1.25 : 1, small = W < 700 ? 0.7 : 1;
    var k = r.kind, c1 = colourPick(), c2 = Math.random() < 0.5 ? c1 : other(c1);
    var n, speed, life, drag, g, size, tail, glitter = 0, strobe = false, change = null, split = false;
    switch (k) {
      case 'chrys':  n = 85; speed = 34; life = 1.7; drag = 1.5; g = 20; size = 0.34; tail = 24; glitter = 0.25; break;
      case 'willow': n = 70; speed = 27; life = 3.0; drag = 2.1; g = 11; size = 0.28; tail = 26; glitter = 0.5; c1 = c2 = 'gold'; break;
      case 'palm':   n = 9;  speed = 36; life = 2.2; drag = 1.1; g = 22; size = 0.62; tail = 22; glitter = 1; c1 = c2 = 'gold'; break;
      case 'crossette': n = 16; speed = 30; life = 0.75; drag = 1.0; g = 18; size = 0.45; tail = 18; split = true; break;
      case 'strobe': n = 60; speed = 28; life = 2.0; drag = 1.8; g = 14; size = 0.38; tail = 2; strobe = true; c1 = c2 = 'silver'; break;
      case 'change': n = 90; speed = 33; life = 1.8; drag = 1.6; g = 18; size = 0.36; tail = 14; change = other(c1); c2 = c1; break;
      default:       n = 100; speed = 33; life = 1.5; drag = 1.7; g = 18; size = 0.36; tail = 14;
    }
    n = Math.max(6, Math.round(n * big * small));
    speed *= u * big;
    for (var i = 0; i < n; i++) {
      var d = k === 'palm' || k === 'crossette'
        ? (function () { var a = (i / n) * Math.PI * 2 + rnd(-0.25, 0.25); return [Math.cos(a), Math.sin(a)]; })()
        : ballDir();
      var s = speed * rnd(0.82, 1.08);
      addStar({
        x: r.x, y: r.y, vx: d[0] * s + r.vx * 0.25, vy: d[1] * s + r.vy * 0.1,
        g: g * u * rnd(0.85, 1.15), drag: drag * rnd(0.85, 1.2), max: life * rnd(0.7, 1.15),
        c: C[i % 2 ? c2 : c1], to: change ? C[change] : null, size: size * u * rnd(0.85, 1.15),
        tail: tail, glitter: glitter, strobe: strobe, phase: Math.random() * 6.28, rate: rnd(9, 15),
        split: split
      });
    }
    flashes.push({ x: r.x, y: r.y, life: 0, max: 0.09, r: 7 * u * big });
    puffs.push({ x: r.x, y: r.y, r: 5 * u * big, life: 0, max: 1.4 });
    var crackle = k === 'willow' || k === 'palm' || k === 'chrys' || k === 'strobe';
    if (Jacko.sfx && Jacko.sfx.firework) Jacko.sfx.firework(crackle, show.big || r.finale, (r.x / W) * 2 - 1);
  }

  function crossette(s) {
    var u = U(), a = Math.random() * Math.PI / 2, sp = rnd(16, 22) * u;
    for (var i = 0; i < 4; i++) {
      var t = a + i * Math.PI / 2;
      addStar({ x: s.x, y: s.y, vx: Math.cos(t) * sp + s.vx * 0.4, vy: Math.sin(t) * sp + s.vy * 0.4,
                g: 18 * u, drag: 1.6, max: rnd(0.7, 1.0), c: s.c, to: null, size: s.size * 0.75,
                tail: 9, glitter: 0.15, strobe: false, phase: 0, rate: 0, split: false });
    }
  }

  function spark(x, y, vx, vy, c, max, size) {
    if (sparks.length >= MAX) return;
    sparks.push({ x: x, y: y, vx: vx, vy: vy, c: c, life: 0, max: max, size: size });
  }

  function step(dt) {
    var u = U(), i;
    for (i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i];
      r.vy += r.g * dt;
      r.x += r.vx * dt; r.y += r.vy * dt;
      r.hist.unshift(r.x, r.y);
      if (r.hist.length > 20) r.hist.length = 20;
      for (var e = 0; e < 2; e++) spark(r.x, r.y, rnd(-4, 4) * u, rnd(4, 12) * u, C.gold, rnd(0.2, 0.45), 0.22 * u);
      if (r.vy >= -3 * u) { burst(r); rockets.splice(i, 1); }
    }
    for (i = stars.length - 1; i >= 0; i--) {
      var s = stars[i];
      s.life += dt;
      var k = Math.exp(-s.drag * dt);
      s.vx *= k; s.vy = s.vy * k + s.g * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.hist.unshift(s.x, s.y);
      if (s.hist.length > s.tail * 2) s.hist.length = s.tail * 2;
      if (s.glitter && Math.random() < s.glitter) {
        spark(s.x, s.y, s.vx * 0.1 + rnd(-2, 2) * u, s.vy * 0.1 + rnd(-1, 3) * u,
              s.c === C.gold ? C.gold : C.silver, rnd(0.25, 0.6), s.size * 0.55);
      }
      if (s.life >= s.max) {
        if (s.split) crossette(s);
        stars.splice(i, 1);
      }
    }
    for (i = sparks.length - 1; i >= 0; i--) {
      var p = sparks[i];
      p.life += dt;
      p.vx *= Math.exp(-2.5 * dt); p.vy = p.vy * Math.exp(-2.5 * dt) + 14 * u * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life >= p.max) sparks.splice(i, 1);
    }
    for (i = flashes.length - 1; i >= 0; i--) { flashes[i].life += dt; if (flashes[i].life >= flashes[i].max) flashes.splice(i, 1); }
    for (i = puffs.length - 1; i >= 0; i--) { puffs[i].life += dt; puffs[i].r += 3 * u * dt; if (puffs[i].life >= puffs[i].max) puffs.splice(i, 1); }
  }

  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + Math.max(0, a).toFixed(3) + ')'; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  function glow(s) {
    var t = s.life / s.max;
    var a = t < 0.05 ? t / 0.05 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    a *= 0.88 + Math.random() * 0.12;
    if (s.strobe && t > 0.2 && Math.sin(s.life * s.rate * 6.28 + s.phase) < 0.2) a = 0;
    return a;
  }

  function tail(hist, c, a, width) {
    var n = hist.length / 2;
    if (n < 2) return;
    var pieces = Math.min(4, n - 1), per = (n - 1) / pieces;
    for (var p = 0; p < pieces; p++) {
      var from = Math.floor(p * per), to = Math.floor((p + 1) * per);
      var f = 1 - p / pieces;
      cx.strokeStyle = rgba(c, a * f * f * 0.75);
      cx.lineWidth = width * (0.35 + 0.65 * f);
      cx.beginPath();
      cx.moveTo(hist[from * 2], hist[from * 2 + 1]);
      for (var q = from + 1; q <= to; q++) cx.lineTo(hist[q * 2], hist[q * 2 + 1]);
      cx.stroke();
    }
  }

  function draw() {
    var c = cx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.setTransform(DPR, 0, 0, DPR, 0, 0);

    c.globalCompositeOperation = 'source-over';
    puffs.forEach(function (p) {
      var a = 0.05 * (1 - p.life / p.max);
      var g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, 'rgba(150,145,140,' + a + ')');
      g.addColorStop(1, 'rgba(150,145,140,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.2832); c.fill();
    });

    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round'; c.lineJoin = 'round';

    flashes.forEach(function (f) {
      var a = 0.45 * (1 - f.life / f.max);
      var g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, 'rgba(255,240,210,' + a + ')');
      g.addColorStop(1, 'rgba(255,200,120,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(f.x, f.y, f.r, 0, 6.2832); c.fill();
    });

    var u = U();
    rockets.forEach(function (r) { tail(r.hist, C.gold, 0.9, 0.35 * u); });

    stars.forEach(function (s) {
      var a = glow(s);
      if (a <= 0) return;
      var t = s.life / s.max;
      var col = s.to ? mix(s.c, s.to, Math.min(1, Math.max(0, (t - 0.4) / 0.15))) : s.c;
      tail(s.hist, col, a * 1.2, s.size * 1.5);
      c.fillStyle = rgba(col, a * 0.13);
      c.beginPath(); c.arc(s.x, s.y, s.size * 1.8, 0, 6.2832); c.fill();
      c.fillStyle = rgba(mix(col, [255, 255, 255], 0.35), a);
      c.beginPath(); c.arc(s.x, s.y, s.size * 0.7, 0, 6.2832); c.fill();
    });

    sparks.forEach(function (p) {
      var a = (1 - p.life / p.max) * (Math.random() < 0.3 ? 0.2 : 1);
      c.fillStyle = rgba(p.c, a);
      c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.04, (now - last) / 1000 || 0.016);
    last = now;
    fit();
    var t = performance.now();
    if (launching) {
      if (t >= endAt) launching = false;
      else if (t >= nextAt) {
        var n = show.big ? 1 + ((Math.random() * 3) | 0) : 1 + (Math.random() < 0.3 ? 1 : 0);
        for (var i = 0; i < n; i++) launch();
        nextAt = t + (show.big ? rnd(260, 480) : rnd(420, 680));
      }
    }
    if (!finaleDone && t >= finaleAt) {
      finaleDone = true;
      var salvo = ['palm', 'willow', 'chrys', 'crossette', 'peony', 'change', 'willow', 'strobe', 'chrys', 'palm', 'peony', 'willow'];
      salvo.forEach(function (k, j) { setTimeout(function () { if (running && show) launch(k, true); }, j * 90); });
    }
    step(dt);
    draw();
    if (!launching && finaleDone && !rockets.length && !stars.length && !sparks.length && !flashes.length && !puffs.length) {
      running = false;
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.clearRect(0, 0, cv.width, cv.height);
      return;
    }
    requestAnimationFrame(frame);
  }

  function start(big, where, colour) {
    ensure();
    fit();
    var zone = where === 'left' ? [0, 0.5] : where === 'right' ? [0.5, 1] : [0, 1];
    show = { big: !!big, zone: zone, mine: nearest(colour || '#ffffff') };
    var t = performance.now();
    launching = true;
    endAt = t + (big ? 10000 : 4000);
    finaleAt = endAt - 1800;
    finaleDone = !big;
    nextAt = t;
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  }

  function stop() { launching = false; finaleDone = true; }

  return { start: start, stop: stop };
})();
