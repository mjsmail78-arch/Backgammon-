// THE STAGE: real sizes, the 3D scene, the camera, angle, zoom and brightness.
window.Jacko = window.Jacko || {};

Jacko.SIZE = (function () {
  var CKR = 0.0175;
  var CKH = 0.010;
  var PW = 0.040;
  var RAIL = 0.005;
  var FR = RAIL + 0.0049;
  var BW = 0.044;
  var IW = PW * 12 + BW;
  var ID = 0.460;
  var TRAY = 0.03765;
  var touch = (navigator.maxTouchPoints || 0) > 0 ||
              (window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches);
  return {
    CKR: CKR, CKH: CKH, PW: PW, FR: FR, BW: BW, IW: IW, ID: ID, TRAY: TRAY,
    PL: ID * 0.43,
    CKSP: CKR * 2 * 1.03,
    DIE: touch ? 0.025 : 0.021,
    RAIL: RAIL,
    RAILH: CKH * 1.45,
    CW: FR + IW + FR + TRAY + FR,
    CD: FR + ID + FR,
    CX: -IW / 2 - FR + (FR + IW + FR + TRAY + FR) / 2
  };
})();

Jacko.pointX = function (i) {
  var S = Jacko.SIZE;
  if (i >= 12 && i <= 17) return -S.IW / 2 + (i - 12 + 0.5) * S.PW;
  if (i >= 18) return S.BW / 2 + (i - 18 + 0.5) * S.PW;
  if (i >= 6) return -S.IW / 2 + (11 - i + 0.5) * S.PW;
  return S.BW / 2 + (5 - i + 0.5) * S.PW;
};
Jacko.isFar = function (i) { return i >= 12; };

Jacko.stage = (function () {
  var renderer, scene, camera, host, key, fill;
  var side = 0;
  var tiltDeg = 18, tiltGoal = 18, tiltVel = 0;
  var zoomPct = 100, zoomGoal = 100, zoomVel = 0;
  var gliding = false;
  var lastW = 0, lastH = 0;
  var queued = false;

  function roomTexture() {
    var c = document.createElement('canvas'); c.width = 512; c.height = 256;
    var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#c6cfdd'); g.addColorStop(0.3, '#a7a9a8'); g.addColorStop(0.5, '#7d7a73');
    g.addColorStop(0.7, '#4e483f'); g.addColorStop(1, '#1a1613');
    x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    var w = x.createRadialGradient(140, 74, 0, 140, 74, 150);
    w.addColorStop(0, 'rgba(255,248,232,0.6)'); w.addColorStop(1, 'rgba(255,248,232,0)');
    x.fillStyle = w; x.fillRect(0, 0, 512, 256);
    var t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function init(el) {
    host = el;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = (+Jacko.store.get('bright') || 100) / 100;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
    host.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    var pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromEquirectangular(roomTexture()).texture;
    pm.dispose();

    camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);

    scene.add(new THREE.HemisphereLight(0xfff6e8, 0x2a2622, 0.55));
    key = new THREE.DirectionalLight(0xfff1dc, 1.7);
    key.position.set(0.5, 1.6, 0.6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    var sc = key.shadow.camera;
    sc.left = -0.6; sc.right = 0.6; sc.top = 0.6; sc.bottom = -0.6; sc.near = 0.5; sc.far = 3;
    key.shadow.bias = -0.0002; key.shadow.normalBias = 0.0008;
    scene.add(key);
    fill = new THREE.DirectionalLight(0xe8eeff, 0.6);
    scene.add(fill);
    aimLights();

    if (window.ResizeObserver) new ResizeObserver(fit).observe(host);
    window.addEventListener('resize', fit);
    fit();
    return scene;
  }

  // The lights stand behind the player's shoulder, so they turn with the side the player sits on.
  function aimLights() {
    var f = side ? -1 : 1;
    key.position.set(0.5 * f, 1.6, 0.6 * f);
    fill.position.set(-0.8 * f, 1.2, 0.9 * f);
  }

  // Side 0 sits at Player 1's edge of the table; side 1 sits across it, at Player 2's.
  function setSide(s) {
    s = s ? 1 : 0;
    if (s === side) return;
    if (!renderer) { side = s; return; }
    crossFade(function () {
      side = s;
      aimLights();
      fit();
    });
  }

  function fit() {
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    if (w !== lastW || h !== lastH) {
      renderer.setSize(w, h, false);
      lastW = w; lastH = h;
    }
    camera.aspect = w / h;
    placeCamera();
    renderer.render(scene, camera);
  }

  var boardEdges = null;
  function placeCards() {
    var c1 = document.getElementById('card-p1'), c2 = document.getElementById('card-p2');
    if (document.documentElement.classList.contains('phone')) {
      c1.style.left = c1.style.width = c2.style.right = c2.style.width = '';
      return;
    }
    if (!boardEdges) return;
    var V = Jacko.view;
    var top = V.rect(document.getElementById('topbar'));
    var W = V.w(), EDGE = 8, NEAR = 10, CAP = 230;
    function least(c) {
      c.style.width = '';
      var who = c.querySelector('.who'), need = 0;
      who.querySelectorAll('.name, .pip').forEach(function (e) {
        var rg = document.createRange();
        rg.selectNodeContents(e);
        need = Math.max(need, V.rect(rg).width);
      });
      return Math.max(150, Math.min(Math.ceil(c.offsetWidth - who.offsetWidth + need + 4), 260));
    }
    var m1 = least(c1), m2 = least(c2);
    var inL = top.left - NEAR, inR = top.right + NEAR;
    var l = Math.max(EDGE, inL - Math.max(m1, CAP), Math.min(boardEdges.l, inL - m1));
    var plate = Jacko.friend ? Jacko.friend.room() : 0;
    var r = Math.min(W - EDGE - plate, inR + Math.max(m2, CAP), Math.max(boardEdges.r, inR + m2));
    c1.style.left = Math.round(l) + 'px';
    c1.style.width = Math.max(0, Math.round(inL - l)) + 'px';
    c2.style.right = Math.round(W - r) + 'px';
    c2.style.width = Math.max(0, Math.round(r - inR)) + 'px';
    if (Jacko.friend) Jacko.friend.place();
  }

  var barKey = '';
  function placeCamera() {
    var S = Jacko.SIZE;
    var target = new THREE.Vector3(S.CX, 0, 0);
    var a = THREE.MathUtils.degToRad(tiltDeg), f = side ? -1 : 1;
    var dir = new THREE.Vector3(0, Math.cos(a), Math.sin(a) * f);
    var hw = S.CW / 2 * f, hd = S.CD / 2 * f;
    var corners = [];
    [-1, 1].forEach(function (sx) {
      [-1, 1].forEach(function (sz) {
        [0, S.RAILH].forEach(function (y) {
          corners.push(new THREE.Vector3(S.CX + sx * hw, y, sz * hd));
        });
      });
    });

    var FRAME = document.documentElement.classList.contains('phone') ? 1 : 0.98;
    var lo = 0.3, hi = 8, v = new THREE.Vector3();
    var w = host.clientWidth, h = host.clientHeight;
    camera.clearViewOffset();
    function at(d) {
      camera.position.copy(target).addScaledVector(dir, d);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();
    }
    function extent() {
      var e = { x0: 9, x1: -9, y0: 9, y1: -9 };
      corners.forEach(function (c) {
        v.copy(c).project(camera);
        e.x0 = Math.min(e.x0, v.x); e.x1 = Math.max(e.x1, v.x);
        e.y0 = Math.min(e.y0, v.y); e.y1 = Math.max(e.y1, v.y);
      });
      return e;
    }
    for (var i = 0; i < 30; i++) {
      var d = (lo + hi) / 2;
      at(d);
      var e = extent();
      if (e.x1 - e.x0 <= 2 * FRAME && e.y1 - e.y0 <= 2 * FRAME) hi = d; else lo = d;
    }

    at(hi);
    var fitted = extent();
    var slide = Math.round((FRAME - fitted.y1) / 2 * h);
    if (slide) camera.setViewOffset(w, h, 0, slide, w, h);

    var l = v.set(S.CX - hw, 0, hd).project(camera), lx = l.x, ly = l.y;
    var r = v.set(S.CX + hw, 0, hd).project(camera), rx = r.x;
    var px = function (nx) { return host.offsetLeft + (nx + 1) / 2 * w; };
    var bar = { c: Math.round((px(lx) + px(rx)) / 2), w: Math.round(px(rx) - px(lx)),
                t: Math.round(host.offsetTop + (1 - ly) / 2 * h + 6) };
    var fl = Math.round(px(v.set(S.CX - hw, S.RAILH, -hd).project(camera).x));
    var fr = Math.round(px(v.set(S.CX + hw, S.RAILH, -hd).project(camera).x));
    var key = bar.c + ',' + bar.w + ',' + bar.t + ',' + fl + ',' + fr;
    if (key !== barKey) {
      barKey = key;
      var st = host.parentNode.style;
      st.setProperty('--bar-c', bar.c + 'px');
      st.setProperty('--bar-w', bar.w + 'px');
      st.setProperty('--bar-t', bar.t + 'px');
      st.setProperty('--board-l', fl + 'px');
      st.setProperty('--board-r', fr + 'px');
      boardEdges = { l: fl, r: fr };
      placeCards();
    }

    camera.position.copy(target).addScaledVector(dir, hi / zoomPct * 100);
    camera.lookAt(target);
  }

  var SPRING = 90;
  var DAMP = 2 * Math.sqrt(SPRING);
  function glide() {
    if (gliding) return;
    gliding = true;
    var last = performance.now();
    requestAnimationFrame(function step(now) {
      var dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      tiltVel += ((tiltGoal - tiltDeg) * SPRING - tiltVel * DAMP) * dt;
      zoomVel += ((zoomGoal - zoomPct) * SPRING - zoomVel * DAMP) * dt;
      tiltDeg += tiltVel * dt;
      zoomPct += zoomVel * dt;
      var settled = Math.abs(tiltGoal - tiltDeg) < 0.01 && Math.abs(tiltVel) < 0.05 &&
                    Math.abs(zoomGoal - zoomPct) < 0.02 && Math.abs(zoomVel) < 0.1;
      if (settled) { tiltDeg = tiltGoal; zoomPct = zoomGoal; tiltVel = zoomVel = 0; }
      placeCamera();
      renderer.render(scene, camera);
      if (settled) gliding = false;
      else requestAnimationFrame(step);
    });
  }

  function render() {
    if (queued || !renderer) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      renderer.render(scene, camera);
    });
  }

  function crossFade(change) {
    if (!renderer) { change(); return; }
    var src = renderer.domElement;
    renderer.render(scene, camera);
    var shot = document.createElement('canvas');
    shot.width = src.width;
    shot.height = src.height;
    shot.getContext('2d').drawImage(src, 0, 0);
    shot.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;' +
      'opacity:1;transition:opacity 0.7s ease';
    host.appendChild(shot);
    change();
    renderer.render(scene, camera);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { shot.style.opacity = '0'; });
    });
    setTimeout(function () { shot.remove(); }, 800);
  }

  function setTilt(deg, now) {
    tiltGoal = deg;
    if (now) { tiltDeg = deg; tiltVel = 0; fit(); } else glide();
  }
  function setZoom(pct, now) {
    zoomGoal = pct || 100;
    if (now) { zoomPct = zoomGoal; zoomVel = 0; fit(); } else glide();
  }

  function setBrightness(pct) {
    if (!renderer) return;
    renderer.toneMappingExposure = (pct || 100) / 100;
    render();
  }

  function now() { if (renderer) renderer.render(scene, camera); }

  function warm() {
    if (!renderer) return;
    var hidden = [];
    scene.traverse(function (o) { if (!o.visible) { hidden.push(o); o.visible = true; } });
    try { renderer.compile(scene, camera); } catch (e) { }
    hidden.forEach(function (o) { o.visible = false; });
    fit();
  }

  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
  var cloth = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function pick(clientX, clientY) {
    if (!renderer) return null;
    var p = Jacko.view.toLocal(clientX, clientY);
    var r = Jacko.view.rect(renderer.domElement);
    ndc.set((p.x - r.left) / r.width * 2 - 1, -((p.y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(cloth, hit) ? { x: hit.x, z: hit.z } : null;
  }

  var pv = new THREE.Vector3();
  function project(x, y, z) {
    if (!renderer) return null;
    pv.set(x, y, z).project(camera);
    return { x: host.offsetLeft + (pv.x + 1) / 2 * host.clientWidth,
             y: host.offsetTop + (1 - pv.y) / 2 * host.clientHeight };
  }

  // A tap and a point in the scene, both in the canvas's own pixels, so they can be compared.
  function tapPx(clientX, clientY) {
    if (!renderer) return null;
    var p = Jacko.view.toLocal(clientX, clientY), r = Jacko.view.rect(renderer.domElement);
    return { x: p.x - r.left, y: p.y - r.top };
  }
  function toPx(x, y, z) {
    if (!renderer) return null;
    var r = Jacko.view.rect(renderer.domElement);
    pv.set(x, y, z).project(camera);
    return { x: (pv.x + 1) / 2 * r.width, y: (1 - pv.y) / 2 * r.height };
  }

  return { init: init, render: render, now: now, warm: warm, placeCards: placeCards, pick: pick, project: project,
           tapPx: tapPx, toPx: toPx, setSide: setSide,
           setTilt: setTilt, setZoom: setZoom, setBrightness: setBrightness, crossFade: crossFade };
})();
