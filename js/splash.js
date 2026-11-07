// START-UP AND ENDING: the logo fades in over LOADING and flies to its button; Exit Game plays it backwards.
Jacko.splash = (function () {
  var IN = 1800;
  var SIGN_MIN = 1200;
  var SIGN_OUT = 450;
  var PAUSE = 250;
  var FLY = 1800;
  var signAt = 0;

  function wait(ms) { return new Promise(function (r) { setTimeout(r, Math.max(0, ms)); }); }

  function start() {
    var splash = document.getElementById('splash');
    return Jacko.view.settled.then(function () {
      return wait(IN - (performance.now() - Jacko.view.settledAt()));
    }).then(function () {
      splash.classList.add('loading');
      signAt = performance.now();
      return wait(300);
    });
  }

  function finish(done) {
    var splash = document.getElementById('splash');
    var game = document.getElementById('game');
    var plate = document.getElementById('logo-plate');
    var btn = document.getElementById('btn-new');

    function land() {
      plate.removeAttribute('style');
      btn.appendChild(plate);
      splash.remove();
      if (done) done();
    }

    wait(signAt + SIGN_MIN - performance.now()).then(function () {
      splash.classList.remove('loading');
      return wait(SIGN_OUT + PAUSE);
    }).then(function () {
      plate.style.animation = 'none';
      plate.style.opacity = '1';
      plate.style.transform = 'none';
      var from = Jacko.view.rect(plate);
      var to = Jacko.view.rect(btn);
      var s = to.height / from.height;
      var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      var dy = (to.top + to.height / 2) - (from.top + from.height / 2);

      game.classList.add('shown');
      splash.classList.add('out');

      if (!plate.animate) { land(); return; }
      var flight = plate.animate([
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: 'translate(' + dx * 0.35 + 'px, ' + dy * 0.6 + 'px) scale(' + (1 + (s - 1) * 0.6) + ')', offset: 0.45 },
        { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')' }
      ], { duration: FLY, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'forwards' });
      flight.onfinish = function () { flight.cancel(); land(); };
    });
  }

  var HOLD = 600;
  var GONE = 1400;
  var ending = false;

  function end() {
    if (ending) return;
    ending = true;
    var plate = document.getElementById('logo-plate');
    var black = document.getElementById('exit-black');
    var game = document.getElementById('game');

    var V = Jacko.view;
    var from = V.rect(plate);
    var layer = document.createElement('div');
    layer.id = 'end-layer';
    document.body.appendChild(layer);
    var size = Math.min(V.w() * 0.8, V.h() * 0.8, 520);
    var left = (V.w() - size) / 2, top = (V.h() - size) / 2;
    plate.style.cssText = 'position:absolute;left:' + left + 'px;top:' + top + 'px;width:' + size + 'px;height:' + size + 'px;';
    layer.appendChild(plate);
    var s = from.height / size;
    var dx = (from.left + from.width / 2) - (left + size / 2);
    var dy = (from.top + from.height / 2) - (top + size / 2);

    black.style.transition = 'opacity ' + FLY + 'ms ease';
    black.classList.add('on');

    function close() {
      game.style.visibility = 'hidden';
      layer.remove();
      try { window.close(); } catch (e) { }
      setTimeout(function () {
        black.classList.add('rest');
        black.addEventListener('pointerup', function () { location.reload(); }, { once: true });
      }, 300);
    }
    function fadeLogo() {
      if (!plate.animate) { close(); return; }
      var out = plate.animate([{ opacity: 1 }, { opacity: 0 }], { duration: GONE, easing: 'ease-in', fill: 'forwards' });
      out.onfinish = close;
    }

    if (!plate.animate) { wait(FLY + HOLD).then(fadeLogo); return; }
    var flight = plate.animate([
      { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')' },
      { transform: 'translate(' + dx * 0.35 + 'px, ' + dy * 0.6 + 'px) scale(' + (1 + (s - 1) * 0.6) + ')', offset: 0.55 },
      { transform: 'translate(0px, 0px) scale(1)' }
    ], { duration: FLY, easing: 'cubic-bezier(0.8, 0, 0.55, 1)', fill: 'forwards' });
    flight.onfinish = function () { wait(HOLD).then(fadeLogo); };
  }

  return { start: start, finish: finish, end: end };
})();
