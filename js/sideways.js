// LOCKED SIDEWAYS: an upright phone or tablet draws the game turned; black until the screen settles.
window.Jacko = window.Jacko || {};

Jacko.view = (function () {
  var root = document.documentElement;
  var touch = (navigator.maxTouchPoints || 0) > 0 ||
              (window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches);
  var turned = false, W = 0, H = 0;
  var SETTLE = 400;
  var LONGEST = 2000;
  var lastSW = 0, lastSH = 0, changedAt = 0, settledAt = 0;

  root.classList.add('settling');

  function update() {
    var sw = window.innerWidth, sh = window.innerHeight;
    if (!sw || !sh) return;
    if (sw !== lastSW || sh !== lastSH) { lastSW = sw; lastSH = sh; changedAt = performance.now(); }
    turned = touch && sh > sw;
    W = turned ? sh : sw;
    H = turned ? sw : sh;
    root.classList.toggle('turned', turned);
    root.classList.toggle('short', W > H && H <= 480);
    root.classList.toggle('wide', W > H && W >= 700);
    root.classList.toggle('slim', W <= 560);
    root.classList.toggle('phone', touch && W > H && H <= 500);
    root.style.setProperty('--W', W + 'px');
    root.style.setProperty('--H', H + 'px');
    root.style.setProperty('--SW', sw + 'px');
  }
  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', function () { setTimeout(update, 50); });

  // Jacko's photo is in the logo before the logo fades in; a very slow device waits no longer than FACE_WAIT.
  var FACE_WAIT = 4000, faceReady = false;
  var face = new Image();
  function faceIn() { faceReady = true; }
  face.onload = function () { if (face.decode) face.decode().then(faceIn, faceIn); else faceIn(); };
  face.onerror = faceIn;
  face.src = 'images/captain-jacko-cutout.png';

  var settled = new Promise(function (done) {
    (function check() {
      update();
      var now = performance.now();
      var screenOk = (now - changedAt >= SETTLE && now >= SETTLE) || now >= LONGEST;
      if ((screenOk && faceReady) || now >= FACE_WAIT) {
        settledAt = now;
        root.classList.remove('settling');
        done();
        return;
      }
      setTimeout(check, 50);
    })();
  });

  function toLocal(x, y) {
    if (!turned) return { x: x, y: y };
    return { x: y, y: window.innerWidth - x };
  }
  function rect(el) {
    var r = el.getBoundingClientRect();
    if (!turned) return r;
    var sw = window.innerWidth;
    var left = r.top, top = sw - r.right, width = r.height, height = r.width;
    return { left: left, top: top, width: width, height: height, right: left + width, bottom: top + height };
  }

  return {
    w: function () { return W; },
    h: function () { return H; },
    turned: function () { return turned; },
    toLocal: toLocal,
    rect: rect,
    settled: settled,
    settledAt: function () { return settledAt; }
  };
})();
