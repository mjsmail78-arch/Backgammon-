// THE CHECKERS: marble checkers, their moves, hint rings and the scoreboard checkers.
Jacko.checkers = (function () {
  var mats = [], meshes = [[], []], S, G3, scene3;
  var M = Jacko.motion;
  var flights = [], stepping = false, lastStart = 0;
  var rings = [], ringGeo, ringMat = {};

  var PROFILE = [
    0, 0, 0.870, 0, 0.927, 0.023, 0.970, 0.083, 0.992, 0.185, 1, 0.306,
    1, 0.648, 0.994, 0.769, 0.977, 0.870, 0.952, 0.940, 0.918, 0.981, 0.879, 1,
    0.606, 1, 0, 1
  ];

  var loader = new THREE.TextureLoader();
  var arrivals = [];
  function marbleTex(name, colour) {
    var arrived;
    arrivals.push(new Promise(function (r) { arrived = r; }));
    var t = loader.load('images/textures/marble-' + name + '.jpg', function () {
      Jacko.stage.render();
      if (Jacko.checkers && Jacko.checkers.portraits) Jacko.checkers.portraits();
      arrived();
    }, undefined, function () { arrived(); });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (colour) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  Jacko.MARBLE = { color: marbleTex('color', true), normal: marbleTex('normal'), rough: marbleTex('roughness') };
  Jacko.MARBLE.ready = Promise.all(arrivals);

  var CREAM = new THREE.Color('#d8ccb0');
  Jacko.tone = function (hex) {
    var c = new THREE.Color(hex);
    var lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    if (lum > 0.55) c.lerp(CREAM, 0.35).multiplyScalar(0.86);
    return c;
  };

  // Each checker is cut from its own part of the marble: a window 0.35 of the slab wide, placed, turned
  // and sometimes mirrored by its number, so no two checkers show the same veins. Cut 0 is the
  // scoreboard checkers' middle of the slab.
  var SPAN = 0.35;
  function cut(n) {
    if (!n) return { u: 0.5, v: 0.5, a: 0, flip: 1 };
    var lo = SPAN / 2 + 0.01, room = 1 - 2 * lo;
    return {
      u: lo + ((n * 0.6180339887) % 1) * room,
      v: lo + ((n * 0.7548776662 + 0.31) % 1) * room,
      a: (n * 2.39996323) % (Math.PI * 2),
      flip: n % 3 === 1 ? -1 : 1
    };
  }
  function geo(n) {
    var v = [];
    for (var i = 0; i < PROFILE.length; i += 2) v.push(new THREE.Vector2(PROFILE[i] * S.CKR, PROFILE[i + 1] * S.CKH));
    var g = new THREE.LatheGeometry(v, 64);
    var p = g.attributes.position, uv = g.attributes.uv, c = cut(n || 0);
    var ca = Math.cos(c.a), sa = Math.sin(c.a);
    for (var k = 0; k < p.count; k++) {
      var x = p.getX(k) / (S.CKR * 2) * SPAN * c.flip, z = p.getZ(k) / (S.CKR * 2) * SPAN;
      uv.setXY(k, c.u + x * ca - z * sa, c.v + x * sa + z * ca);
    }
    g.computeVertexNormals();
    return g;
  }

  var LIFT = 0.0021;
  var COURSE = [5, 4, 3, 2, 1];

  function course(k) {
    var L = 0, j = k;
    while (L < COURSE.length - 1 && j >= COURSE[L]) { j -= COURSE[L]; L++; }
    return { L: L, j: j };
  }

  function trayX() { return (S.IW / 2 + S.FR / 2 + 0.002 + S.RAIL / 2 + S.IW / 2 + 2 * S.FR + S.TRAY - S.RAIL) / 2; }
  var Z_MID, Z_OUT;

  function onPoint(p, k) {
    var c = course(k), end = S.CKR + 0.0006;
    var along = end + (c.j + c.L * 0.5) * S.CKSP;
    var far = Jacko.isFar(p);
    return { x: Jacko.pointX(p), y: LIFT + c.L * S.CKH * 0.98, z: far ? -S.ID / 2 + along : S.ID / 2 - along, stand: false };
  }
  function onBar(side, k) {
    var c = course(k), along = S.CKR + 0.012 + (c.j + c.L * 0.5) * S.CKSP;
    return { x: 0, y: 0.0004 + c.L * S.CKH * 0.98, z: side === 0 ? along : -along, stand: false };
  }
  function inTray(zc) {
    return { x: trayX(), y: S.CKR + 0.0004, z: zc + S.CKH / 2, stand: true };
  }
  function traySpacing(n) { return Math.min(S.CKH * 1.08, (Z_OUT - Z_MID) / Math.max(1, n)); }
  function offSpot(side, k, st) {
    var n = side === 0 ? st.off[0] + st.pool[1] : st.off[1] + st.pool[0], sp = traySpacing(n);
    var zc = Z_MID + (k + 0.5) * sp;
    return inTray(side === 0 ? zc : -zc);
  }
  function poolSpot(side, k, st) {
    var n = side === 0 ? st.off[1] + st.pool[0] : st.off[0] + st.pool[1], sp = traySpacing(n);
    var zc = Z_OUT - (k + 0.5) * sp;
    return inTray(side === 0 ? -zc : zc);
  }

  function spotFor(side, loc, k, st) {
    if (loc === 'bar') return onBar(side, k);
    if (loc === 'off') return offSpot(side, k, st);
    if (loc === 'pool') return poolSpot(side, k, st);
    return onPoint(+loc.slice(1), k);
  }

  function counts(st, side) {
    var c = {};
    for (var i = 0; i < 24; i++) { var n = Jacko.rules.ownCount(st.b, i, side); if (n) c['p' + i] = n; }
    if (st.bar[side]) c.bar = st.bar[side];
    if (st.pool[side]) c.pool = st.pool[side];
    if (st.off[side]) c.off = st.off[side];
    return c;
  }

  function build(scene) {
    S = Jacko.SIZE;
    G3 = geo();
    Z_MID = S.RAIL / 2 + 0.003;
    Z_OUT = S.CD / 2 - S.RAIL - 0.003;
    [0, 1].forEach(function (side) {
      mats[side] = new THREE.MeshPhysicalMaterial({ map: Jacko.MARBLE.color, normalMap: Jacko.MARBLE.normal,
        normalScale: new THREE.Vector2(0.6, 0.6), roughnessMap: Jacko.MARBLE.rough, roughness: 0.9,
        metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.55 });
      for (var k = 0; k < 15; k++) {
        var m = new THREE.Mesh(geo(1 + side * 15 + k), mats[side]);
        m.castShadow = m.receiveShadow = true;
        m.visible = false;
        m.userData = { side: side, key: null, rest: null, yaw: Math.random() * 6.28, float: 0, floatGoal: 0, busyTo: 0 };
        scene.add(m);
        meshes[side].push(m);
      }
    });

    function flat(g) { g.rotateX(-Math.PI / 2); return g; }
    ringGeo = {
      src: flat(new THREE.RingGeometry(S.CKR * 1.02, S.CKR * 1.02 + 0.0025, 64)),
      dst: flat(new THREE.RingGeometry(S.CKR * 1.046 - 0.0025, S.CKR * 1.046, 64))
    };
    ringMat = new THREE.MeshBasicMaterial({ color: 0x3dff7a, transparent: true, opacity: 0,
      depthWrite: false, depthTest: false, toneMapped: false });
    scene3 = scene;
  }

  function outlineGeo(w, d, e) {
    function pts(W, D, r) {
      var x = Math.max(0, W / 2 - r), z = Math.max(0, D / 2 - r), out = [];
      [[x, z, 0], [-x, z, Math.PI / 2], [-x, -z, Math.PI], [x, -z, Math.PI * 1.5]].forEach(function (q) {
        for (var i = 0; i <= 6; i++) {
          var a = q[2] + i / 6 * (Math.PI / 2);
          out.push(new THREE.Vector2(q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r));
        }
      });
      return out;
    }
    var r = S.CKR * 0.35;
    var s = new THREE.Shape(pts(w, d, r));
    s.holes.push(new THREE.Path(pts(w - e * 2, d - e * 2, Math.max(0.0005, r - e)).reverse()));
    return flat2(new THREE.ShapeGeometry(s));
  }
  function flat2(g) { g.rotateX(-Math.PI / 2); return g; }

  function place(m, sp) {
    m.position.set(sp.x, sp.y, sp.z);
    if (sp.stand) m.rotation.set(-Math.PI / 2, 0, 0);
    else m.rotation.set(0, m.userData.yaw, 0);
  }

  function show(st, opts) {
    opts = opts || {};
    var moves = [];
    [0, 1].forEach(function (side) {
      var need = counts(st, side), free = [], want = [];
      var held = {};
      meshes[side].forEach(function (m) {
        var key = m.userData.key;
        if (!key) { free.push(m); return; }
        var loc = key.split(':')[0], k = +key.split(':')[1];
        if (k < (need[loc] || 0)) { held[key] = m; }
        else free.push(m);
      });
      Object.keys(need).forEach(function (loc) {
        for (var k = 0; k < need[loc]; k++) {
          var key = loc + ':' + k;
          if (!held[key]) want.push({ loc: loc, k: k, key: key, sp: spotFor(side, loc, k, st) });
        }
      });
      Object.keys(held).forEach(function (key) {
        var m = held[key], loc = key.split(':')[0], k = +key.split(':')[1];
        var sp = spotFor(side, loc, k, st);
        var r = m.userData.rest;
        if (!r || Math.abs(r.x - sp.x) + Math.abs(r.y - sp.y) + Math.abs(r.z - sp.z) > 1e-5 || r.stand !== sp.stand) {
          moves.push({ m: m, sp: sp, key: key, shuffle: true });
        }
      });
      want.forEach(function (w) {
        var bi = -1, bd = 1e9;
        free.forEach(function (m, i) {
          var r = m.userData.rest;
          var d = r ? Math.hypot(r.x - w.sp.x, r.z - w.sp.z) : 50;
          if (d < bd) { bd = d; bi = i; }
        });
        var m = free.splice(bi, 1)[0];
        moves.push({ m: m, sp: w.sp, key: w.key, from: m.userData.key });
      });
      free.forEach(function (m) { m.userData.key = null; m.visible = false; });
    });

    if (opts.now || !moves.some(function (mv) { return mv.m.userData.rest; })) {
      moves.forEach(function (mv) {
        var u = mv.m.userData;
        u.key = mv.key; u.rest = mv.sp; u.float = u.floatGoal = 0;
        place(mv.m, mv.sp);
        mv.m.visible = true;
      });
      Jacko.stage.render();
      return;
    }

    var SP = M.speed(), now = M.clock();
    var toBar = function (mv) { return !mv.shuffle && mv.key.indexOf('bar') === 0 && mv.from && mv.from[0] === 'p'; };
    var carries = moves.filter(function (mv) { return !mv.shuffle && !(toBar(mv) && hitBy(moves, mv)); });
    var hits = moves.filter(function (mv) { return toBar(mv) && hitBy(moves, mv); });
    var shuffles = moves.filter(function (mv) { return mv.shuffle; });
    var STAG = (opts.deal ? 0.045 : opts.group ? 0.09 : 0.2) * SP;

    carries.forEach(function (mv) {
      var fl = makeFlight(mv, false, SP, opts.deal);
      fl.t0 = Math.max(now, lastStart + STAG, mv.m.userData.busyTo);
      lastStart = fl.t0;
      launch(fl);
      mv.flight = fl;
    });
    hits.forEach(function (mv) {
      var mover = hitBy(moves, mv).flight;
      var fl = makeFlight(mv, true, SP);
      fl.t0 = mover ? mover.t0 + mover.dur * 0.78 : now;
      launch(fl);
    });
    shuffles.forEach(function (mv) {
      var fl = makeFlight(mv, false, SP);
      fl.t0 = Math.max(now, mv.m.userData.busyTo);
      fl.dur = 0.35 * SP; fl.lift = 0.004;
      launch(fl);
    });
  }

  function hitBy(moves, mv) {
    var pt = mv.from.split(':')[0], side = mv.m.userData.side;
    for (var i = 0; i < moves.length; i++) {
      var o = moves[i];
      if (o.m.userData.side !== side && !o.shuffle && o.key.split(':')[0] === pt) return o;
    }
    return null;
  }

  function makeFlight(mv, flick, SP, deal) {
    var u = mv.m.userData;
    var from = u.rest ? new THREE.Vector3(u.rest.x, u.rest.y, u.rest.z) : new THREE.Vector3(mv.sp.x, mv.sp.y + 0.05, mv.sp.z);
    var to = new THREE.Vector3(mv.sp.x, mv.sp.y, mv.sp.z);
    var dist = from.distanceTo(to);
    var fl = {
      m: mv.m, from: from, to: to, rest: mv.sp, flick: flick,
      fromStand: u.rest ? u.rest.stand : mv.sp.stand, toStand: mv.sp.stand,
      dur: flick ? 0.74 * SP : (0.70 + Math.min(0.52, dist * 3.05 * 0.40)) * 0.80 * SP * (deal ? 0.8 : 1),
      lift: flick ? Math.min(0.072, 0.033 + dist * 0.06) : Math.min(0.0443, 0.0256 + dist * 0.048),
      started: false, knocked: false
    };
    u.key = mv.key;
    u.rest = mv.sp;
    return fl;
  }

  function launch(fl) {
    fl.m.visible = true;
    fl.m.userData.busyTo = fl.t0 + fl.dur;
    flights.push(fl);
    loop();
  }

  function loop() {
    if (stepping) return;
    stepping = true;
    M.run(step);
  }

  function step(now) {
    flights.forEach(function (fl) {
      var m = fl.m, u = m.userData;
      if (now < fl.t0) return;
      if (!fl.started) {
        fl.started = true;
        fl.from.copy(m.position);
        u.float = u.floatGoal = 0;
      }
      var k = Math.min(1, (now - fl.t0) / fl.dur);
      if (fl.flick) {
        var t = 1 - Math.pow(1 - k, 2.1);
        m.position.lerpVectors(fl.from, fl.to, t);
        m.position.y += Math.sin(Math.PI * Math.pow(k, 0.85)) * fl.lift;
        m.rotation.set(t * Math.PI * 4, u.yaw + t * Math.PI * 2, Math.sin(Math.PI * k) * 0.45);
        if (!fl.knocked) { fl.knocked = true; Jacko.sfx.knock(); }
      } else {
        var e = M.ease.car(k);
        m.position.lerpVectors(fl.from, fl.to, e);
        var up;
        if (k < 0.40) up = fl.lift * (0.5 - 0.5 * Math.cos(Math.PI * (k / 0.40)));
        else if (k < 0.58) up = fl.lift;
        else up = fl.lift * (0.5 + 0.5 * Math.cos(Math.PI * ((k - 0.58) / 0.42)));
        m.position.y += up;
        var sway = Math.sin(Math.PI * k) * 0.085 * (1 - k * 0.55);
        var rt = M.ease.smooth(k);
        var rx0 = fl.fromStand ? -Math.PI / 2 : 0, rx1 = fl.toStand ? -Math.PI / 2 : 0;
        var ry0 = fl.fromStand ? 0 : u.yaw, ry1 = fl.toStand ? 0 : u.yaw;
        m.rotation.set(rx0 + (rx1 - rx0) * rt, ry0 + (ry1 - ry0) * rt, sway);
      }
      if (k >= 1) {
        place(m, fl.rest);
        fl.done = true;
        if (!fl.flick) Jacko.sfx.knock();
      }
    });
    flights = flights.filter(function (f) { return !f.done; });

    var floating = false;
    [0, 1].forEach(function (side) {
      meshes[side].forEach(function (m) {
        var u = m.userData;
        if (!u.rest || u.busyTo > now) return;
        if (Math.abs(u.float - u.floatGoal) < 0.00005) { if (u.float !== u.floatGoal) { u.float = u.floatGoal; m.position.y = u.rest.y + u.float; } return; }
        u.float += (u.floatGoal - u.float) * 0.22;
        m.position.y = u.rest.y + u.float;
        floating = true;
      });
    });

    var fading = false;
    rings.forEach(function (r) {
      var d = r.goal - r.k;
      if (Math.abs(d) > 0.01) { r.k += d * 0.2; fading = true; }
      else r.k = r.goal;
      r.parts.forEach(function (p) { p.mesh.material.opacity = p.base * r.k; });
      if (r.goal === 0 && r.k <= 0.01) { r.obj.visible = false; r.dead = true; }
    });
    rings = rings.filter(function (r) {
      if (r.dead) {
        scene3.remove(r.obj);
        r.parts.forEach(function (p) { p.mesh.material.dispose(); if (p.own) p.mesh.geometry.dispose(); });
      }
      return !r.dead;
    });

    if (flights.length || floating || fading) return false;
    stepping = false;
    return true;
  }

  function topOf(side, loc, st) {
    var c = counts(st, side)[loc] || 0;
    if (!c) return null;
    var key = loc + ':' + (c - 1);
    for (var i = 0; i < 15; i++) if (meshes[side][i].userData.key === key) return meshes[side][i];
    return null;
  }

  function nthFromTop(side, loc, n, st) {
    var c = counts(st, side)[loc] || 0;
    if (n >= c) return null;
    var key = loc + ':' + (c - 1 - n);
    for (var i = 0; i < 15; i++) if (meshes[side][i].userData.key === key) return meshes[side][i];
    return null;
  }

  function lift(m, on) {
    if (!m) return;
    m.userData.floatGoal = on ? S.CKH * 0.9 : 0;
    loop();
  }
  function dropAll() {
    [0, 1].forEach(function (s) { meshes[s].forEach(function (m) { m.userData.floatGoal = 0; }); });
    loop();
  }

  function setMarks(list) {
    rings.forEach(function (r) { r.goal = 0; });
    var trayDone = {};
    list.forEach(function (mk) {
      var obj = new THREE.Group(), parts = [];
      var sp = spotFor(mk.side, mk.loc, mk.k, mk.st);
      function part(geo, base, order, own) {
        var mat = ringMat.clone();
        mat.opacity = 0;
        var m = new THREE.Mesh(geo, mat);
        m.renderOrder = 900 + order;
        obj.add(m);
        parts.push({ mesh: m, base: base, own: !!own });
      }
      if (sp.stand) {
        var half = sp.z < 0 ? -1 : 1;
        if (trayDone[half]) return;
        trayDone[half] = true;
        var clear = (S.IW / 2 + 2 * S.FR + S.TRAY - S.RAIL) - (S.IW / 2 + S.FR / 2 + 0.002 + S.RAIL / 2);
        var w = clear - 0.001, d = Z_OUT - Z_MID + S.CKH * 1.2;
        part(outlineGeo(w, d, 0.003), 1, 1, true);
        obj.position.set(trayX(), 0.0016, half * (Z_MID + Z_OUT) / 2);
      } else if (mk.kind === 'src') {
        part(ringGeo.src, 1, 1);
        obj.position.set(sp.x, sp.y + S.CKH + (mk.lifted ? S.CKH * 0.9 : 0) + 0.0004, sp.z);
      } else {
        part(ringGeo.dst, 1, 1);
        obj.position.set(sp.x, sp.y + 0.0008, sp.z);
      }
      scene3.add(obj);
      rings.push({ obj: obj, parts: parts, k: 0, goal: 1 });
    });
    loop();
  }

  function setTheme(th, fade) {
    mats[0].color.copy(Jacko.tone(th.ckA));
    mats[1].color.copy(Jacko.tone(th.ckB));
    portraits(fade);
  }

  var pr = null, prQueued = false, prFade = false, PR_FADE = 700;
  function portraits(fade) {
    if (fade) prFade = true;
    if (prQueued || !G3) return;
    prQueued = true;
    requestAnimationFrame(function () {
      prQueued = false;
      var f = prFade;
      prFade = false;
      drawPortraits(f);
    });
  }
  function copyOf(cv) {
    var c = document.createElement('canvas');
    c.width = cv.width;
    c.height = cv.height;
    c.getContext('2d').drawImage(cv, 0, 0);
    return c;
  }
  function blendIn(cv, old) {
    var fresh = copyOf(cv), x = cv.getContext('2d'), t0 = performance.now(), mine = {};
    cv._blend = mine;
    (function step(t) {
      if (cv._blend !== mine) return;
      var k = Math.min(1, Math.max(0, (t - t0) / PR_FADE));
      var e = k * k * (3 - 2 * k);
      x.globalAlpha = 1;
      x.drawImage(fresh, 0, 0);
      x.globalAlpha = 1 - e;
      x.drawImage(old, 0, 0);
      x.globalAlpha = 1;
      if (k < 1) requestAnimationFrame(step); else cv._blend = null;
    })(t0);
  }
  function drawPortraits(fade) {
    if (!pr) {
      var r = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
      r.setPixelRatio(1);
      r.setSize(160, 160, false);
      r.setClearColor(0x000000, 0);
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.3;
      r.outputColorSpace = THREE.SRGBColorSpace;
      var sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(0xfff6e8, 0x3a3632, 1.5));
      var key = new THREE.DirectionalLight(0xfff1dc, 3.4);
      key.position.set(0.4, 0.8, 1);
      sc.add(key);
      var fill = new THREE.DirectionalLight(0xfff6ec, 1.2);
      fill.position.set(-0.6, 0.2, 1);
      sc.add(fill);
      var rim = new THREE.DirectionalLight(0xdfe8ff, 1.8);
      rim.position.set(-0.8, 0.4, -0.6);
      sc.add(rim);
      var cam = new THREE.PerspectiveCamera(28, 1, 0.01, 2);
      cam.position.set(0, 0.012, 0.1);
      cam.lookAt(0, 0, 0);
      var stand = new THREE.Group(), lean = new THREE.Group(), m = new THREE.Mesh(G3, mats[0]);
      m.rotation.x = Math.PI / 2;
      m.position.z = -S.CKH / 2;
      lean.add(m);
      stand.add(lean);
      sc.add(stand);
      pr = { r: r, sc: sc, cam: cam, stand: stand, lean: lean, m: m };
    }
    [0, 1].forEach(function (side) {
      var cv = document.getElementById('portrait-p' + (side + 1));
      if (!cv) return;
      var old = fade && cv.width === 160 ? copyOf(cv) : null;
      cv._blend = null;
      pr.m.material = mats[side];
      pr.lean.rotation.x = -0.26;
      pr.stand.rotation.y = side === 0 ? 0.62 : -0.62;
      pr.r.render(pr.sc, pr.cam);
      if (cv.width !== 160) { cv.width = 160; cv.height = 160; }
      var x = cv.getContext('2d');
      x.fillStyle = '#000';
      x.fillRect(0, 0, 160, 160);
      var glow = x.createRadialGradient(80, 80, 30, 80, 80, 80);
      glow.addColorStop(0, 'rgba(255, 238, 205, 0.55)');
      glow.addColorStop(0.55, 'rgba(255, 238, 205, 0.22)');
      glow.addColorStop(1, 'rgba(255, 238, 205, 0)');
      x.fillStyle = glow;
      x.fillRect(0, 0, 160, 160);
      x.drawImage(pr.r.domElement, 0, 0);
      if (old) blendIn(cv, old);
    });
  }

  return { build: build, show: show, setTheme: setTheme, topOf: topOf, nthFromTop: nthFromTop, lift: lift, dropAll: dropAll,
           setMarks: setMarks, counts: counts, spotOf: spotFor, portraits: portraits };
})();
