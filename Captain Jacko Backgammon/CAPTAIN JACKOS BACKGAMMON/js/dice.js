// THE DICE: marble dice, the throw, and the gold dice of the free double.
Jacko.dice = (function () {
  var PIPS = {
    1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]
  };
  var PIP_R = 0.092, PIP_D = 0.245;
  var FACES = [3, 4, 1, 6, 2, 5];
  var M = Jacko.motion, S;
  var dice = [];
  var GOLD = '#d4a83a';
  var theme = null;

  function roundedCube(size, r) {
    var g = new THREE.BoxGeometry(size, size, size, 10, 10, 10);
    var p = g.attributes.position, c = size / 2 - r;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      var cx = Math.max(-c, Math.min(c, x)), cy = Math.max(-c, Math.min(c, y)), cz = Math.max(-c, Math.min(c, z));
      var dx = x - cx, dy = y - cy, dz = z - cz, l = Math.hypot(dx, dy, dz) || 1;
      p.setXYZ(i, cx + dx / l * r, cy + dy / l * r, cz + dz / l * r);
    }
    g.computeVertexNormals();
    return g;
  }

  function isPale(hex) {
    var c = new THREE.Color(hex);
    return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b > 0.45;
  }

  var marble = new Image(), arrived;
  var ready = new Promise(function (r) { arrived = r; });
  marble.onload = function () { if (dice.length && theme) setTheme(theme); arrived(); };
  marble.onerror = function () { arrived(); };
  marble.src = 'images/textures/marble-color.jpg';

  // Real gold: a photograph of brushed gold for the faces, and its roughness for the shine.
  var goldPhoto = new Image();
  goldPhoto.onload = function () { if (dice.length && theme) setTheme(theme); };
  goldPhoto.src = 'images/textures/gold-color.jpg';
  var goldRough = new THREE.TextureLoader().load('images/textures/gold-roughness.jpg');
  var GOLD_LOOK = { metalness: 1, roughness: 0.55, clearcoat: 0, clearcoatRoughness: 0.12, envMapIntensity: 1.5 };
  var STONE_LOOK = { metalness: 0, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.7 };
  // On gold the dots are not metal, so they stay solid black instead of catching the shine.
  var dotMask = {};
  function dotsMask(v) {
    if (dotMask[v]) return dotMask[v];
    var N = 256, c = document.createElement('canvas'); c.width = c.height = N;
    var x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, N, N);
    x.fillStyle = '#000000';
    PIPS[v].forEach(function (ab) {
      x.beginPath(); x.arc(N / 2 + ab[0] * N * PIP_D, N / 2 + ab[1] * N * PIP_D, N * PIP_R * 1.08, 0, 6.2832); x.fill();
    });
    return (dotMask[v] = new THREE.CanvasTexture(c));
  }
  function look(m, gold, i) {
    var L = gold ? GOLD_LOOK : STONE_LOOK;
    Object.keys(L).forEach(function (k) { m[k] = L[k]; });
    m.roughnessMap = gold ? goldRough : null;
    m.metalnessMap = gold ? dotsMask(FACES[i]) : null;
  }

  function faceTexture(v, body) {
    var N = 256, c = document.createElement('canvas'); c.width = c.height = N;
    var x = c.getContext('2d');
    x.fillStyle = body; x.fillRect(0, 0, N, N);
    if (body === GOLD && goldPhoto.complete && goldPhoto.naturalWidth) {
      var gc = goldPhoto.naturalWidth * 0.3, gx = Math.random() * (goldPhoto.naturalWidth - gc), gy = Math.random() * (goldPhoto.naturalHeight - gc);
      x.drawImage(goldPhoto, gx, gy, gc, gc, 0, 0, N, N);
    } else if (marble.complete && marble.naturalWidth) {
      var cut = marble.naturalWidth * 0.3, sx = Math.random() * (marble.naturalWidth - cut), sy = Math.random() * (marble.naturalHeight - cut);
      x.globalCompositeOperation = 'multiply';
      x.drawImage(marble, sx, sy, cut, cut, 0, 0, N, N);
      x.globalCompositeOperation = 'source-over';
    }
    var dark = body === GOLD || isPale(body);
    PIPS[v].forEach(function (ab) {
      var px = N / 2 + ab[0] * N * PIP_D, py = N / 2 + ab[1] * N * PIP_D, r = N * PIP_R;
      var g = x.createRadialGradient(px + r * 0.32, py + r * 0.36, r * 0.08, px, py, r);
      if (dark) { g.addColorStop(0, '#141414'); g.addColorStop(0.58, '#030303'); g.addColorStop(1, '#000000'); }
      else { g.addColorStop(0, '#ffffff'); g.addColorStop(0.58, '#eef3f8'); g.addColorStop(1, '#9fb2c4'); }
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = N * 0.007;
      x.beginPath(); x.arc(px, py, r * 0.99, 3.5, 5.9); x.stroke();
    });
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }

  function hollowTexture(v) {
    var N = 256, c = document.createElement('canvas'); c.width = c.height = N;
    var x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, N, N);
    PIPS[v].forEach(function (ab) {
      var px = N / 2 + ab[0] * N * PIP_D, py = N / 2 + ab[1] * N * PIP_D, r = N * PIP_R * 1.1;
      var g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, '#000000'); g.addColorStop(0.7, '#1c1c1c'); g.addColorStop(1, '#ffffff');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill();
    });
    return new THREE.CanvasTexture(c);
  }

  var UP = {
    1: [0, 0, 0], 6: [Math.PI, 0, 0], 3: [0, 0, Math.PI / 2],
    4: [0, 0, -Math.PI / 2], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0]
  };
  function restQuat(v, yaw) {
    var f = new THREE.Quaternion().setFromEuler(new THREE.Euler(UP[v][0], UP[v][1], UP[v][2]));
    var y = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    return y.multiply(f);
  }

  var scene = null, geo = null;
  function build(sc) {
    S = Jacko.SIZE;
    scene = sc;
    var g = geo = roundedCube(S.DIE, S.DIE * 0.2);
    for (var i = 0; i < 2; i++) {
      var mats = FACES.map(function (v) {
        return new THREE.MeshPhysicalMaterial({ bumpMap: hollowTexture(v), bumpScale: 1.2,
          roughness: 0.3, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.7,
          transparent: true, opacity: 0 });
      });
      var m = new THREE.Mesh(g, mats);
      m.castShadow = m.receiveShadow = true;
      m.visible = false;
      scene.add(m);
      dice.push({ mesh: m, mats: mats, tex: {}, wear: 0, value: 1, rest: null, dim: 1, dimGoal: 1, op: 0 });
    }
  }

  function setTheme(th) {
    theme = th;
    var bodies = { 0: '#' + Jacko.tone(th.ckA).getHexString(), 1: '#' + Jacko.tone(th.ckB).getHexString(), gold: GOLD };
    dice.forEach(function (d) {
      Object.keys(d.tex).forEach(function (k) { d.tex[k].forEach(function (t) { t.dispose(); }); });
      d.tex = {};
      Object.keys(bodies).forEach(function (k) {
        d.tex[k] = FACES.map(function (v) { return faceTexture(v, bodies[k]); });
      });
      dress(d, d.wear);
    });
    if (choiceMats) choiceMats.forEach(function (m, i) { m.map = dice[0].tex.gold[i]; m.needsUpdate = true; });
    Jacko.stage.render();
  }

  function dress(d, wear) {
    d.wear = wear;
    if (!d.tex[wear]) return;
    d.mats.forEach(function (m, i) { m.map = d.tex[wear][i]; look(m, wear === 'gold', i); m.needsUpdate = true; });
  }
  function setOpacity(d) {
    var o = d.op * (0.42 + 0.58 * d.dim);
    d.mats.forEach(function (m) { m.opacity = o; });
  }

  function restSpots(dirs) {
    var mid = S.BW / 2 + 3 * S.PW;
    if (dirs[0] !== dirs[1]) {
      return dirs.map(function (dir) { return { x: dir * mid, z: (Math.random() - 0.5) * 0.02 }; });
    }
    var cx = dirs[0] * mid;
    return [
      { x: cx - S.DIE * 0.95, z: (Math.random() - 0.5) * 0.012 },
      { x: cx + S.DIE * 0.95, z: (Math.random() - 0.5) * 0.012 }
    ];
  }

  var anims = [], stepping = false;
  function loop() {
    if (stepping) return;
    stepping = true;
    M.run(function (now) {
      anims.forEach(function (a) { if (now >= a.t0) a.done = a.step(Math.min(1, (now - a.t0) / a.dur), now) || a.done; });
      var fin = anims.filter(function (a) { return a.done; });
      anims = anims.filter(function (a) { return !a.done; });
      fin.forEach(function (a) { if (a.after) a.after(); });
      var fading = false;
      dice.forEach(function (d) {
        if (Math.abs(d.dim - d.dimGoal) > 0.005) { d.dim += (d.dimGoal - d.dim) * 0.18; setOpacity(d); fading = true; }
      });
      if (anims.length || fading) return false;
      stepping = false;
      return true;
    });
  }
  function animate(dur, delay, step, after) {
    anims.push({ t0: M.clock() + (delay || 0), dur: dur, step: step, after: after });
    loop();
  }

  var QT = Math.PI / 2;
  var GRAV = 6;
  function rollIn(values, wear, done) {
    var dirs = wear.map(function (w) { return w === 1 ? -1 : 1; });
    var spots = restSpots(dirs), left = 2, a = S.DIE / 2;
    var opening = dirs[0] !== dirs[1], before = 0;
    var sharedN = 2 + ((Math.random() * 2) | 0);
    var backOne = spots[0].x * dirs[0] < spots[1].x * dirs[1] ? 0 : 1;
    dice.forEach(function (d, i) {
      var v = values[i], dir = dirs[i];
      d.flight = (d.flight || 0) + 1;
      d.value = v;
      d.dir = dir;
      dress(d, wear[i]);
      d.dim = d.dimGoal = 1;
      var yaw = (Math.random() - 0.5) * 0.5;
      var qF = restQuat(v, 0), qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      var qEnd = restQuat(v, yaw);
      var x1 = spots[i].x, z1 = spots[i].z;

      var N = opening ? 2 + ((Math.random() * 2) | 0) : sharedN;
      var VX = { fly: 0.75, hop1: 0.42, hop2: 0.28 };
      var H1 = 0.035 + Math.random() * 0.01, H2 = 0.010 + Math.random() * 0.004;
      var T = { hop1: Math.sqrt(8 * H1 / GRAV), hop2: Math.sqrt(8 * H2 / GRAV), tip: [] };
      for (var k = 0; k < N; k++) T.tip.push(S.DIE / (0.2 * Math.pow(0.68, k)));
      var L1 = VX.hop1 * T.hop1, L2 = VX.hop2 * T.hop2;
      var sLand = -N * S.DIE, sHop2 = sLand - L2, sHop1 = sHop2 - L1;
      var Y0 = 0.10, APEX = 0.22;
      var VY = Math.sqrt(2 * GRAV * (APEX - Y0));
      T.fly = VY / GRAV + Math.sqrt(2 * APEX / GRAV);
      var s0 = sHop1 - VX.fly * T.fly;
      var tHops = T.fly + T.hop1 + T.hop2;
      var tipAll = T.tip.reduce(function (p, c) { return p + c; }, 0);
      var total = tHops + tipAll;
      var Q = { fly: 8, hop1: 3, hop2: 1 };
      var z0 = z1 + (i ? 0.035 : -0.035) + (Math.random() - 0.5) * 0.02;
      var wob = (Math.random() - 0.5) * 0.9;
      var delay = opening ? (i ? before + 0.25 : 0) : (i === backOne ? 0.07 : 0);
      before = total;
      if (i === 0 || opening) setTimeout(function () { Jacko.sfx.dice(); }, (delay + T.fly) * 1000);
      d.op = 0;
      setOpacity(d);

      var axis = new THREE.Vector3(0, 0, dir), xAx = new THREE.Vector3(1, 0, 0);
      var qr = new THREE.Quaternion(), qw = new THREE.Quaternion();
      function pose(s, y, z, phi, w) {
        d.mesh.position.set(x1 + dir * s, y, z);
        qr.setFromAxisAngle(axis, phi);
        qw.setFromAxisAngle(xAx, w || 0);
        d.mesh.quaternion.copy(qw).multiply(qY).multiply(qr).multiply(qF);
      }
      function tipPose(sEdge, th, extraPhi) {
        var ds = -a * Math.cos(th) + a * Math.sin(th);
        var h = a + (a * (Math.cos(th) + Math.sin(th)) - a) * 0.72;
        return { s: sEdge + ds, y: h, phi: extraPhi };
      }

      d.rest = { x: x1, z: z1, q: qEnd };
      d.mesh.visible = false;
      animate(total, delay, function (u) {
        var t = u * total, y, s, phi, w = 0, z;
        d.mesh.visible = true;
        var zk = Math.min(1, t / tHops);
        z = z0 + (z1 - z0) * (1 - Math.pow(1 - zk, 2));
        if (t < T.fly) {
          var f = t / T.fly;
          s = s0 + VX.fly * t;
          y = a + Y0 + VY * t - GRAV * t * t / 2;
          phi = (Q.fly - (Q.fly - Q.hop1) * f + N) * QT;
          w = wob * Math.sin(Math.PI * f);
        } else if (t < T.fly + T.hop1) {
          var h1 = (t - T.fly) / T.hop1;
          s = sHop1 + L1 * h1;
          y = a + H1 * 4 * h1 * (1 - h1);
          phi = (Q.hop1 - (Q.hop1 - Q.hop2) * h1 + N) * QT;
          w = wob * 0.3 * Math.sin(Math.PI * h1);
        } else if (t < tHops) {
          var h2 = (t - T.fly - T.hop1) / T.hop2;
          s = sHop2 + L2 * h2;
          y = a + H2 * 4 * h2 * (1 - h2);
          phi = (Q.hop2 - Q.hop2 * h2 + N) * QT;
        } else {
          var tt = t - tHops, j = 0;
          while (j < N - 1 && tt > T.tip[j]) { tt -= T.tip[j]; j++; }
          var e = Math.min(1, tt / T.tip[j]), kk = j === N - 1 ? 0.3 : 0.15;
          var th = e + kk * Math.sin(2 * Math.PI * e) / (2 * Math.PI);
          var p = tipPose(sLand + j * S.DIE + a, th * QT, 0);
          s = p.s; y = p.y;
          phi = (N - j - th) * QT;
        }
        pose(s, y, z, phi, w);
        d.op = Math.min(1, t / 0.08);
        setOpacity(d);
        if (u >= 1) {
          d.mesh.position.set(x1, a + 0.0003, z1);
          d.mesh.quaternion.copy(qEnd);
          return true;
        }
        return false;
      }, function () { if (--left === 0 && done) done(); });
    });
  }

  function flyOff(done) {
    clearChoice();
    var shown = dice.filter(function (d) { return d.mesh.visible && d.op > 0; });
    if (!shown.length) { if (done) setTimeout(done, 0); return; }
    var left = shown.length;
    shown.forEach(function (d, i) {
      var p0 = d.mesh.position.clone(), q0 = d.mesh.quaternion.clone();
      var dir = d.dir || 1;
      var x1 = dir > 0 ? S.CX + S.CW / 2 + 0.8 : S.CX - S.CW / 2 - 0.8, op0 = d.op;
      var flight = d.flight = (d.flight || 0) + 1;
      var axis = new THREE.Vector3(0.25, 0.3, -dir).normalize();
      var spin = new THREE.Quaternion();
      animate(0.8, i * 0.07, function (u) {
        if (d.flight !== flight) return true;
        var e = u * u * (3 - 2 * u);
        d.mesh.position.set(p0.x + (x1 - p0.x) * (u * u * 0.6 + e * 0.4),
          p0.y + Math.sin(Math.PI * Math.min(1, u * 1.2)) * 0.07 + u * 0.03, p0.z + (i ? 0.02 : -0.02) * u);
        spin.setFromAxisAngle(axis, u * u * Math.PI * 3);
        d.mesh.quaternion.copy(spin).multiply(q0);
        d.op = op0 * (u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45);
        setOpacity(d);
        if (u >= 1) { d.mesh.visible = false; d.op = 0; d.rest = null; return true; }
        return false;
      }, function () { if (--left === 0 && done) done(); });
    });
  }

  // THE MAGIC SMOKE: soft clouds that swell and rise, with a few gold glints thrown out of them.
  var smokeTex = null;
  function smoke() {
    if (smokeTex) return smokeTex;
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 2, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,251,240,0.95)'); g.addColorStop(0.45, 'rgba(246,232,196,0.42)'); g.addColorStop(1, 'rgba(236,220,180,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    smokeTex = new THREE.CanvasTexture(c);
    smokeTex.colorSpace = THREE.SRGBColorSpace;
    return smokeTex;
  }
  function puff(pos, n) {
    if (!scene) return;
    var tex = smoke();
    for (var i = 0; i < n; i++) (function (i) {
      var glint = i % 3 === 2;
      var m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0,
        color: glint ? 0xffcf5a : 0xffffff, blending: glint ? THREE.AdditiveBlending : THREE.NormalBlending });
      var s = new THREE.Sprite(m);
      var a = Math.random() * 6.2832, r = S.DIE * (0.15 + Math.random() * 0.45);
      var p0 = new THREE.Vector3(pos.x + Math.cos(a) * r, pos.y + (Math.random() - 0.3) * S.DIE * 0.5, pos.z + Math.sin(a) * r);
      var out = glint ? 1.5 : 0.5;
      var drift = new THREE.Vector3(Math.cos(a) * S.DIE * out, S.DIE * (glint ? 0.9 : 1.3), Math.sin(a) * S.DIE * out);
      var s0 = S.DIE * (glint ? 0.32 : 0.8 + Math.random() * 0.5);
      s.position.copy(p0);
      s.scale.setScalar(s0 * 0.4);
      scene.add(s);
      animate(0.62 + Math.random() * 0.3, i * 0.02, function (u) {
        var e = 1 - Math.pow(1 - u, 2);
        s.position.copy(p0).addScaledVector(drift, e);
        s.scale.setScalar(glint ? s0 * (1 - 0.6 * u) : s0 * (0.4 + 2.0 * e));
        m.opacity = (u < 0.28 ? u / 0.28 : 1 - (u - 0.28) / 0.72) * (glint ? 1 : 0.85);
        return u >= 1;
      }, function () { scene.remove(s); m.dispose(); });
    })(i);
  }

  // THE FREE DOUBLE: six gold dice, the same dice as the pair, rise out of it and float above it,
  // bobbing and turning slowly. The chosen one dives back onto the pair; the rest go up in smoke.
  var UPV = new THREE.Vector3(0, 1, 0);
  var choice = [], choiceMats = null, floating = false;
  function goldMats() {
    return FACES.map(function (v, i) {
      var m = new THREE.MeshPhysicalMaterial({ map: dice[0].tex.gold ? dice[0].tex.gold[i] : null,
        bumpMap: dice[0].mats[i].bumpMap, bumpScale: 1.2 });
      look(m, true, i);
      return m;
    });
  }
  function pairCentre() {
    var shown = dice.filter(function (d) { return d.mesh.visible; });
    if (!shown.length) return null;
    var c = new THREE.Vector3();
    shown.forEach(function (d) { c.add(d.mesh.position); });
    return c.multiplyScalar(1 / shown.length);
  }
  var swapGen = 0;
  function clearChoice() {
    choice.forEach(function (c) { c.home = null; scene.remove(c.mesh); });
    choice = [];
    swapGen++;
  }
  function choosing() { return choice.length > 0; }

  function showChoice(seat, done) {
    clearChoice();
    if (!scene) { if (done) done(); return; }
    var c0 = pairCentre();
    if (!c0) { var mid = S.BW / 2 + 3 * S.PW; c0 = new THREE.Vector3(seat === 1 ? -mid : mid, S.DIE / 2, 0); }
    if (!choiceMats) choiceMats = goldMats();
    var hover = S.DIE * 4.8, gap = S.DIE * 1.5, left = 6;
    Jacko.sfx.good();
    for (var v = 1; v <= 6; v++) (function (v) {
      var m = new THREE.Mesh(geo, choiceMats);
      m.castShadow = true;
      m.position.copy(c0);
      m.scale.setScalar(0.18);
      m.quaternion.copy(restQuat(v, 0));
      scene.add(m);
      var c = { mesh: m, v: v, from: c0.clone(), home: new THREE.Vector3(c0.x + (v - 3.5) * gap, hover, c0.z),
                ph: Math.random() * 6.2832, risen: 0 };
      choice.push(c);
      animate(0.62, (v - 1) * 0.05, function (u) {
        if (!c.home) return true;
        var e = 1 - Math.pow(1 - u, 2.6);
        m.position.lerpVectors(c.from, c.home, e);
        m.position.y += Math.sin(Math.PI * u) * S.DIE * 0.5;
        m.scale.setScalar(0.18 + 0.82 * Math.min(1, e * 1.25));
        if (u >= 1) { m.position.copy(c.home); m.scale.setScalar(1); c.risen = M.clock(); return true; }
        return false;
      }, function () { if (--left === 0 && done) done(); });
    })(v);
    startFloat();
  }

  function startFloat() {
    if (floating) return;
    floating = true;
    var last = M.clock();
    requestAnimationFrame(function tick() {
      if (!choice.length) { floating = false; return; }
      var now = M.clock(), dt = Math.min(0.05, now - last);
      last = now;
      choice.forEach(function (c) {
        if (!c.home || !c.risen) return;
        var t = now - c.risen, amp = Math.min(1, t / 0.6);
        c.mesh.position.y = c.home.y + Math.sin(t * 1.7 + c.ph) * S.DIE * 0.16 * amp;
        c.mesh.rotateOnWorldAxis(UPV, dt * 0.5 * amp);
      });
      Jacko.stage.render();
      requestAnimationFrame(tick);
    });
  }

  function choiceAt(clientX, clientY) {
    var p = Jacko.stage.tapPx(clientX, clientY), best = null, bd = 1e9;
    if (!p) return null;
    choice.forEach(function (c) {
      if (!c.home || !c.risen) return;
      var at = c.mesh.position;
      var q = Jacko.stage.toPx(at.x, at.y, at.z), e = Jacko.stage.toPx(at.x + S.DIE, at.y, at.z);
      var r = Math.max(22, Math.hypot(e.x - q.x, e.y - q.y) * 0.75);
      var d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < r && d < bd) { bd = d; best = c.v; }
    });
    return best;
  }

  function pickChoice(v, done) {
    var win = null;
    choice.forEach(function (c) { if (c.v === v) win = c; });
    choice.forEach(function (c) {
      if (c === win) return;
      c.home = null;
      puff(c.mesh.position, 7);
      var s0 = c.mesh.scale.x;
      animate(0.26, 0, function (u) { c.mesh.scale.setScalar(Math.max(0.001, s0 * (1 - u))); return u >= 1; },
        function () { scene.remove(c.mesh); });
    });
    if (!win) { choice = []; goldSwap(v, done); return; }
    choice = [win];
    win.home = null;
    Jacko.sfx.good();
    var from, q0, s0, to, spin = new THREE.Quaternion();
    animate(0.68, 0.42, function (u) {
      if (!from) {
        from = win.mesh.position.clone(); q0 = win.mesh.quaternion.clone(); s0 = win.mesh.scale.x;
        var c0 = pairCentre() || win.from;
        to = new THREE.Vector3(c0.x, S.DIE * 1.5, c0.z);
      }
      var down = u * u * (3 - 2 * u);
      win.mesh.position.set(from.x + (to.x - from.x) * u,
        from.y + (to.y - from.y) * down + Math.sin(Math.PI * Math.min(1, u / 0.34)) * S.DIE * 0.22,
        from.z + (to.z - from.z) * u);
      win.mesh.scale.setScalar(s0 + (1 - s0) * u);
      spin.setFromAxisAngle(UPV, u * Math.PI * 1.15);
      win.mesh.quaternion.copy(spin).multiply(q0);
      return u >= 1;
    }, function () {
      if (choice[0] !== win) return;
      puff(win.mesh.position, 10);
      scene.remove(win.mesh);
      choice = [];
      goldSwap(v, done);
    });
  }

  // The pair fades into a thick cloud, turns gold only once it is gone, and fades back out of it as gold.
  function goldSwap(v, done) {
    var shown = dice.filter(function (d) { return d.mesh.visible; });
    if (!shown.length) {
      dice.forEach(function (d) { dress(d, 'gold'); d.value = v; });
      if (done) setTimeout(done, 0);
      return;
    }
    var left = shown.length, gen = swapGen;
    Jacko.sfx.good();
    shown.forEach(function (d, i) {
      var p0 = d.mesh.position.clone();
      var qEnd = restQuat(v, (Math.random() - 0.5) * 0.9);
      var op0 = d.op, hid = false, back = false;
      puff(p0, 16);
      animate(0.8, i * 0.05, function (u) {
        if (gen !== swapGen) return true;
        if (u < 0.3) {
          var e = u / 0.3;
          d.op = op0 * (1 - e * e * (3 - 2 * e));
          setOpacity(d);
          return false;
        }
        if (!hid) {
          hid = true;
          d.op = 0;
          setOpacity(d);
          d.mesh.visible = false;
          dress(d, 'gold');
          d.value = v;
          d.dim = d.dimGoal = 1;
          d.mesh.position.set(p0.x, S.DIE / 2 + 0.0003, p0.z);
          d.mesh.quaternion.copy(qEnd);
          d.rest = { x: p0.x, z: p0.z, q: qEnd };
        }
        if (!back && u >= 0.45) {
          back = true;
          puff(d.mesh.position, 12);
        }
        if (u >= 0.6) {
          var f = Math.min(1, (u - 0.6) / 0.4);
          d.mesh.visible = true;
          d.op = f * f * (3 - 2 * f);
          setOpacity(d);
        }
        return u >= 1;
      }, function () { if (--left === 0 && done) done(); });
    });
  }

  function markUsed(used, total) {
    var dbl = total === 4;
    dice.forEach(function (d, i) {
      var spent = dbl ? used >= (i === 0 ? 4 : 2) : false;
      d.dimGoal = spent ? 0 : 1;
    });
    loop();
  }
  function markUsedValues(left) {
    var pool = left.slice();
    dice.forEach(function (d) {
      var at = pool.indexOf(d.value);
      if (at >= 0) { pool.splice(at, 1); d.dimGoal = 1; } else d.dimGoal = 0;
    });
    loop();
  }

  function busy() { return anims.length > 0; }

  return { build: build, setTheme: setTheme, rollIn: rollIn, flyOff: flyOff, goldSwap: goldSwap,
           showChoice: showChoice, pickChoice: pickChoice, choosing: choosing, choiceAt: choiceAt,
           markUsed: markUsed, markUsedValues: markUsedValues, busy: busy, ready: ready };
})();
