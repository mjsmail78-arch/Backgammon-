Jacko.directions = (function () {
  var S = Jacko.SIZE, M = Jacko.motion;
  var scene = null, run = null;

  var BAR_W = 0.016, BAR_T = 0.008;
  var ROUND = 0.0025;
  var LINE = 0.0016;
  var HEAD_L = 0.048, HEAD_W = 0.040;
  var HEAD_UP = 0.0004;
  var HIGH = 0.0021 + 2 * S.CKH + 0.004;
  var ROW = S.ID / 2 - S.PL / 2;
  var EDGE = S.IW / 2 - HEAD_W / 2 - LINE - 0.002;
  var DRAW = 2.6, HOLD = 0.45, FADE = 0.4, RUNS = 2, N = 640;
  var TURN_R = 0.032;
  var TUCK = 0.003;
  var GLOW_W = BAR_W * 3.4, GLOW_D = 0.1;
  var SWEEP = 1.1;

  function build(sc) { scene = sc; }

  function route(seat) {
    var f = seat === 0 ? -1 : 1, x = Jacko.pointX, pts = [], i, a, V = THREE.Vector3, L = -EDGE, R = TURN_R;
    for (i = 23; i >= 14; i--) pts.push(new V(x(i), 0, f * ROW));
    for (a = 0; a <= 90; a += 10) {
      var r1 = a * Math.PI / 180;
      pts.push(new V(L + R - R * Math.sin(r1), 0, f * (ROW - R + R * Math.cos(r1))));
    }
    for (a = 0; a <= 90; a += 10) {
      var r2 = a * Math.PI / 180;
      pts.push(new V(L + R - R * Math.cos(r2), 0, -f * (ROW - R + R * Math.sin(r2))));
    }
    for (i = 9; i >= 1; i--) pts.push(new V(x(i), 0, -f * ROW));
    pts.push(new V(EDGE - HEAD_L * 0.62, 0, -f * ROW));
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  }

  function bar(spots, w, y0, y1, round) {
    var K = 4, P = 4 * (K + 1), n = spots.length, prof = [], i, j;
    [[1, y1 - round], [-1, y1 - round], [-1, y0 + round], [1, y0 + round]].forEach(function (c, q) {
      for (var k = 0; k <= K; k++) {
        var a = (q + k / K) * Math.PI / 2;
        prof.push({ s: c[0] * (w / 2 - round) + round * Math.cos(a), y: c[1] + round * Math.sin(a),
                    ns: Math.cos(a), ny: Math.sin(a) });
      }
    });
    var count = n * P + P, pos = new Float32Array(count * 3), nor = new Float32Array(count * 3);
    var along = new Float32Array(count), idx = [];
    for (i = 0; i < n; i++) {
      var a0 = spots[Math.max(0, i - 1)], b0 = spots[Math.min(n - 1, i + 1)];
      var tx = b0.x - a0.x, tz = b0.z - a0.z, len = Math.hypot(tx, tz) || 1;
      var ux = -tz / len, uz = tx / len, p = spots[i];
      for (j = 0; j < P; j++) {
        var v = (i * P + j) * 3, f = prof[j];
        pos[v] = p.x + ux * f.s; pos[v + 1] = f.y; pos[v + 2] = p.z + uz * f.s;
        nor[v] = ux * f.ns; nor[v + 1] = f.ny; nor[v + 2] = uz * f.ns;
        along[i * P + j] = i / (n - 1);
      }
      if (i === 0) {
        for (j = 0; j < P; j++) {
          var c = (n * P + j) * 3;
          pos[c] = pos[j * 3]; pos[c + 1] = pos[j * 3 + 1]; pos[c + 2] = pos[j * 3 + 2];
          nor[c] = -tx / len; nor[c + 1] = 0; nor[c + 2] = -tz / len;
        }
      }
    }
    for (j = 1; j < P - 1; j++) idx.push(n * P, n * P + j, n * P + j + 1);
    for (i = 0; i < n - 1; i++) {
      for (j = 0; j < P; j++) {
        var A = i * P + j, B = i * P + (j + 1) % P, C = A + P, D = B + P;
        idx.push(A, C, D, A, D, B);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('along', new THREE.BufferAttribute(along, 1));
    g.setIndex(idx);
    g.userData = { cap: (P - 2) * 3, seg: P * 6 };
    return g;
  }

  function arrowhead(grow, y0, y1, round) {
    var L = HEAD_L + grow * 2, W = HEAD_W + grow * 2, sh = new THREE.Shape();
    sh.moveTo(HEAD_L * 0.62 + grow * 1.6, 0);
    sh.lineTo(-L * 0.38, W / 2);
    sh.lineTo(-L * 0.38, -W / 2);
    sh.closePath();
    var g = new THREE.ExtrudeGeometry(sh, round
      ? { depth: y1 - y0 - 2 * round, bevelEnabled: true, bevelThickness: round, bevelSize: round,
          bevelOffset: -round, bevelSegments: 4 }
      : { depth: y1 - y0, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, y0 + round, 0);
    return g;
  }

  function ribbon(spots, w, y) {
    var n = spots.length, pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = [];
    for (var i = 0; i < n; i++) {
      var a = spots[Math.max(0, i - 1)], b = spots[Math.min(n - 1, i + 1)];
      var tx = b.x - a.x, tz = b.z - a.z, len = Math.hypot(tx, tz) || 1;
      var nx = -tz / len * w / 2, nz = tx / len * w / 2, p = spots[i];
      pos.set([p.x + nx, y, p.z + nz, p.x - nx, y, p.z - nz], i * 6);
      uv.set([0, 0.5, 1, 0.5], i * 4);
      if (i < n - 1) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }
  var bandTex = null, discTex = null;
  function light(w, h, grad) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d'), g = grad(x);
    g.addColorStop(0, 'rgba(70, 255, 130, 0)');
    g.addColorStop(0.5, 'rgba(70, 255, 130, 1)');
    g.addColorStop(1, 'rgba(70, 255, 130, 0)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function band() {
    return bandTex || (bandTex = light(64, 4, function (x) { return x.createLinearGradient(0, 0, 64, 0); }));
  }
  function disc() {
    if (discTex) return discTex;
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(70, 255, 130, 1)');
    g.addColorStop(1, 'rgba(70, 255, 130, 0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    discTex = new THREE.CanvasTexture(c);
    discTex.colorSpace = THREE.SRGBColorSpace;
    return discTex;
  }
  function glow(map) {
    return new THREE.MeshBasicMaterial({ map: map, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  }

  function green(streak) {
    var m = new THREE.MeshPhysicalMaterial({ color: 0x18c44a, emissive: 0x0b7a2c, emissiveIntensity: 0.7,
      roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.8,
      transparent: true, toneMapped: false });
    if (streak) {
      m.onBeforeCompile = function (sh) {
        sh.uniforms.streak = streak;
        sh.vertexShader = 'attribute float along;\nvarying float vAlong;\n' +
          sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vAlong = along;');
        sh.fragmentShader = 'uniform float streak;\nvarying float vAlong;\n' +
          sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' +
            '  float streakAt = (vAlong - streak) / 0.03;\n' +
            '  totalEmissiveRadiance += vec3(0.5, 1.0, 0.55) * exp(-streakAt * streakAt) * 1.3;');
      };
    }
    return m;
  }
  function black() {
    return new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, side: THREE.BackSide });
  }
  function mesh(g, m, order, shadow) {
    var o = new THREE.Mesh(g, m);
    o.renderOrder = order;
    o.frustumCulled = false;
    o.castShadow = !!shadow;
    return o;
  }

  function stop() {
    if (!run) return;
    var r = run;
    run = null;
    document.removeEventListener('pointerdown', stop, true);
    r.parts.forEach(function (o) { scene.remove(o); o.geometry.dispose(); o.material.dispose(); });
    Jacko.stage.now();
  }

  function show(seat) {
    if (!scene) return;
    stop();
    var curve = route(seat), spots = curve.getSpacedPoints(N), length = curve.getLength();
    spots.forEach(function (p) { p.x = Math.max(-EDGE, Math.min(EDGE, p.x)); });
    var top = HIGH + BAR_T, streak = { value: -1 };
    var under = top - ROUND - 0.0003, floor = HIGH - LINE - 0.0004;
    var body = mesh(bar(spots, BAR_W, HIGH, top, ROUND), green(streak), 6, true);
    var line = mesh(bar(spots, BAR_W + 2 * LINE, HIGH - LINE, under, 0), black(), 7);
    var tip = mesh(arrowhead(0, HIGH, top + HEAD_UP, ROUND), green(), 5, true);
    var tipLine = mesh(arrowhead(LINE, HIGH - LINE, under, 0), black(), 7);
    var shine = mesh(ribbon(spots, GLOW_W, floor), glow(band()), 4);
    var pool = mesh(new THREE.PlaneGeometry(GLOW_D, GLOW_D).rotateX(-Math.PI / 2), glow(disc()), 4);
    pool.position.y = floor;
    shine.userData.glow = pool.userData.glow = 0.5;
    var parts = [shine, pool, line, body, tipLine, tip];
    parts.forEach(function (o) { scene.add(o); });
    var r = run = { parts: parts, t0: M.clock() };
    setTimeout(function () { if (run === r) document.addEventListener('pointerdown', stop, true); }, 0);

    var P = DRAW + HOLD + FADE, cap = body.geometry.userData.cap, seg = body.geometry.userData.seg;
    M.run(function (now) {
      if (run !== r) return true;
      var t = now - r.t0;
      if (t >= RUNS * P) { stop(); return true; }
      var k = t - Math.floor(t / P) * P;
      var u = M.ease.car(Math.min(1, k / DRAW));
      var fade = k <= DRAW + HOLD ? 1 : Math.max(0, 1 - (k - DRAW - HOLD) / FADE);
      var end = u - TUCK / length, steps = end <= 0 ? 0 : Math.floor(end * (N - 1));
      [body, line].forEach(function (o) { o.geometry.setDrawRange(0, steps ? cap + seg * steps : 0); });
      shine.geometry.setDrawRange(0, steps * 6);
      streak.value = u * ((k / SWEEP) % 1);
      var p = curve.getPointAt(Math.min(u, 0.9999)), tg = curve.getTangentAt(Math.min(u, 0.9999));
      var turn = Math.atan2(-tg.z, tg.x), px = Math.max(-EDGE, Math.min(EDGE, p.x));
      [tip, tipLine].forEach(function (o) {
        o.position.set(px, 0, p.z);
        o.rotation.y = turn;
      });
      pool.position.x = px;
      pool.position.z = p.z;
      parts.forEach(function (o) {
        var g = o.userData.glow;
        o.material.opacity = g ? fade * g : fade;
      });
      return false;
    });
  }

  return { build: build, show: show, stop: stop, busy: function () { return !!run; } };
})();
