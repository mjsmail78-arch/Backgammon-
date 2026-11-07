// THE BOARD: cloth, points, bar, tray and gold frame, at real size.
Jacko.board = (function () {
  var S, group, cloth, ptMat = [], clothMat;

  function canvasTex(c, repeat) {
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
    return t;
  }

  function brushedCanvas() {
    var c = document.createElement('canvas'); c.width = 64; c.height = 512;
    var x = c.getContext('2d');
    x.fillStyle = '#dcb456'; x.fillRect(0, 0, 64, 512);
    for (var i = 0; i < 260; i++) {
      x.fillStyle = (Math.random() < 0.5 ? 'rgba(255,240,196,' : 'rgba(110,76,18,') + (0.05 + Math.random() * 0.14) + ')';
      x.fillRect(Math.random() * 64, 0, 0.6 + Math.random() * 1.2, 512);
    }
    return c;
  }

  function buildFrame() {
    var tex = canvasTex(brushedCanvas(), 0);
    var mat = new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, metalness: 0.92,
      roughness: 0.3, envMapIntensity: 1.0 });
    var hw = S.CW / 2, hd = S.CD / 2, R = S.RAIL, cx = S.CX;
    function piece(pts) {
      var s = new THREE.Shape();
      pts.forEach(function (p, i) { if (i) s.lineTo(p[0], -p[1]); else s.moveTo(p[0], -p[1]); });
      s.closePath();
      var g = new THREE.ExtrudeGeometry(s, { depth: S.RAILH, bevelEnabled: true,
        bevelThickness: 0.0006, bevelSize: 0.0006, bevelSegments: 2 });
      g.rotateX(-Math.PI / 2);
      var m = new THREE.Mesh(g, mat);
      m.position.set(cx, 0.0002, 0);
      m.castShadow = m.receiveShadow = true;
      group.add(m);
    }
    piece([[-hw, hd], [hw, hd], [hw - R, hd - R], [-hw + R, hd - R]]);
    piece([[-hw, -hd], [hw, -hd], [hw - R, -hd + R], [-hw + R, -hd + R]]);
    piece([[-hw, -hd], [-hw, hd], [-hw + R, hd - R], [-hw + R, -hd + R]]);
    piece([[hw, -hd], [hw, hd], [hw - R, hd - R], [hw - R, -hd + R]]);
    var dc = S.IW / 2 + S.FR / 2 + 0.002 - cx;
    piece([[dc - R / 2, -hd + R], [dc - R / 2, hd - R], [dc + R / 2, hd - R], [dc + R / 2, -hd + R]]);
    piece([[dc + R / 2, -R / 2], [hw - R, -R / 2], [hw - R, R / 2], [dc + R / 2, R / 2]]);
  }

  function clothCanvas(th) {
    var PX = 2048, PY = Math.round(PX * S.CD / S.CW);
    var c = document.createElement('canvas'); c.width = PX; c.height = PY;
    var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, PY);
    function soft(hex) { return '#' + Jacko.tone(hex).getHexString(); }
    g.addColorStop(0, soft(th.felt2)); g.addColorStop(0.55, soft(th.felt)); g.addColorStop(1, soft(th.edge));
    x.fillStyle = g; x.fillRect(0, 0, PX, PY);
    for (var i = -PY; i < PX + PY; i += 4) {
      x.strokeStyle = 'rgba(255,255,255,' + (0.025 + Math.random() * 0.03) + ')';
      x.lineWidth = 1.6; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + PY, PY); x.stroke();
      x.strokeStyle = 'rgba(0,0,0,' + (0.04 + Math.random() * 0.05) + ')';
      x.lineWidth = 1; x.beginPath(); x.moveTo(i + 2, 0); x.lineTo(i + 2 + PY, PY); x.stroke();
    }
    for (var k = 0; k < 40000; k++) {
      x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,' + (Math.random() * 0.25) + ')'
                                        : 'rgba(255,255,255,' + (Math.random() * 0.07) + ')';
      x.fillRect(Math.random() * PX, Math.random() * PY, 2, 2);
    }
    var left = S.CX - S.CW / 2, front = -S.CD / 2;
    var u = function (m) { return (m - left) / S.CW * PX; };
    var w = function (m) { return (m - front) / S.CD * PY; };
    x.fillStyle = 'rgba(0,0,0,0.18)';
    x.fillRect(u(-S.BW / 2), w(-S.ID / 2), u(S.BW / 2) - u(-S.BW / 2), w(S.ID / 2) - w(-S.ID / 2));
    x.fillRect(u(S.IW / 2), w(-S.ID / 2), u(S.IW / 2 + S.FR) - u(S.IW / 2), w(S.ID / 2) - w(-S.ID / 2));
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 3; x.setLineDash([10, 7]);
    x.strokeRect(u(-S.IW / 2 - S.FR * 0.5), w(-S.ID / 2 - S.FR * 0.5),
      u(S.IW / 2 + S.FR + S.TRAY + S.FR * 0.5) - u(-S.IW / 2 - S.FR * 0.5),
      w(S.ID / 2 + S.FR * 0.5) - w(-S.ID / 2 - S.FR * 0.5));
    return c;
  }

  function pebbleCanvas() {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 900; i++) {
      var px = Math.random() * 256, py = Math.random() * 256, r = 1.5 + Math.random() * 3;
      var g = x.createRadialGradient(px - r * 0.35, py - r * 0.35, 0.3, px, py, r);
      g.addColorStop(0, 'rgba(255,255,255,.3)'); g.addColorStop(0.6, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(60,58,54,.16)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill();
    }
    return c;
  }

  function pointGeo() {
    var hw = S.PW * 0.46, tip = S.PW * 0.055, T = 0.0007;
    var s = new THREE.Shape();
    s.moveTo(-hw, 0); s.lineTo(hw, 0);
    s.quadraticCurveTo(tip, S.PL * 0.9, 0, S.PL);
    s.quadraticCurveTo(-tip, S.PL * 0.9, -hw, 0);
    var g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: true, bevelThickness: T * 0.9,
      bevelSize: S.PW * 0.012, bevelSegments: 3, curveSegments: 10 });
    g.rotateX(-Math.PI / 2);
    return g;
  }

  function stitchPlaces() {
    var inset = 0.0028, hw = S.PW * 0.46 - inset, tip = S.PW * 0.055, y0 = 0.0034, len = S.PL - y0 - 0.0042;
    var s = new THREE.Shape();
    s.moveTo(-hw, y0); s.lineTo(hw, y0);
    s.quadraticCurveTo(tip, y0 + len * 0.9, 0, y0 + len);
    s.quadraticCurveTo(-tip, y0 + len * 0.9, -hw, y0);
    var pts = s.getPoints(200), out = [], SP = 0.0062, dist = 0, next = SP / 2;
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i - 1], q = pts[i], dx = q.x - p.x, dy = q.y - p.y, seg = Math.hypot(dx, dy);
      if (seg < 1e-9) continue;
      while (next <= dist + seg) {
        var f = (next - dist) / seg;
        out.push({ x: p.x + dx * f, y: p.y + dy * f, a: Math.atan2(dy, dx) });
        next += SP;
      }
      dist += seg;
    }
    return out;
  }

  function build(scene) {
    S = Jacko.SIZE;
    group = new THREE.Group();
    scene.add(group);

    clothMat = new THREE.MeshPhysicalMaterial({ roughness: 0.66, metalness: 0, sheen: 1,
      sheenRoughness: 0.34, sheenColor: new THREE.Color(0x8fa4d8), envMapIntensity: 0.22 });
    cloth = new THREE.Mesh(new THREE.PlaneGeometry(S.CW, S.CD), clothMat);
    cloth.rotation.x = -Math.PI / 2;
    cloth.position.set(S.CX, 0.0002, 0);
    cloth.receiveShadow = true;
    group.add(cloth);

    var pebble = pebbleCanvas();
    [0, 1].forEach(function (k) {
      ptMat[k] = new THREE.MeshPhysicalMaterial({ map: canvasTex(pebble, 3.4), roughness: 0.47,
        metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.38, envMapIntensity: 0.38 });
    });
    var geo = pointGeo();
    var Y = 0.0004;
    for (var i = 0; i < 24; i++) {
      var m = new THREE.Mesh(geo, ptMat[i % 2]);
      var far = Jacko.isFar(i);
      m.position.set(Jacko.pointX(i), Y, far ? -S.ID / 2 : S.ID / 2);
      if (far) m.rotation.y = Math.PI;
      m.receiveShadow = true;
      group.add(m);
    }

    var places = stitchPlaces();
    var sg = new THREE.CapsuleGeometry(0.0006, 0.003, 3, 6);
    sg.rotateZ(Math.PI / 2);
    var sm = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.78 });
    var stitches = new THREE.InstancedMesh(sg, sm, places.length * 24);
    var d = new THREE.Object3D(), n = 0, SY = Y + 0.0007 * 1.9 + 0.0003;
    for (var p = 0; p < 24; p++) {
      var farP = Jacko.isFar(p), px = Jacko.pointX(p), pz = farP ? -S.ID / 2 : S.ID / 2;
      places.forEach(function (st) {
        var lx = farP ? -st.x : st.x, lz = farP ? st.y : -st.y;
        d.position.set(px + lx, SY, pz + lz);
        d.rotation.set(0, farP ? st.a + Math.PI : st.a, 0);
        d.updateMatrix();
        stitches.setMatrixAt(n++, d.matrix);
      });
    }
    group.add(stitches);

    buildFrame();
  }

  function setTheme(th) {
    if (clothMat.map) clothMat.map.dispose();
    clothMat.map = canvasTex(clothCanvas(th), 0);
    clothMat.needsUpdate = true;
    ptMat[0].color.copy(Jacko.tone(th.ptA));
    ptMat[1].color.copy(Jacko.tone(th.ptB));
  }

  return { build: build, setTheme: setTheme };
})();
