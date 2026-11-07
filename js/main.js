// START-UP: builds the game behind the logo, then quietly loads the emojis and the offline copy.
document.addEventListener('DOMContentLoaded', function () {
  var scene;
  var QUIET = 1500;

  function emojiImgs() {
    return Array.prototype.filter.call(document.querySelectorAll('#emoji-grid img[data-src]'),
      function (img) { return !img.getAttribute('src'); });
  }
  function loadEmojis() {
    return new Promise(function (done) {
      (function next() {
        var img = emojiImgs()[0];
        if (!img) { done(); return; }
        img.addEventListener('load', next, { once: true });
        img.addEventListener('error', next, { once: true });
        img.src = img.dataset.src;
      })();
    });
  }
  document.getElementById('btn-emojis').addEventListener('click', function () {
    emojiImgs().forEach(function (img) { img.src = img.dataset.src; });
  }, true);

  function keepCopy() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
      navigator.serviceWorker.register('offline.js').catch(function () { });
    }
  }
  function afterStart() {
    if (Jacko.logoHint) Jacko.logoHint();
    if (Jacko.install) Jacko.install.check();
    setTimeout(function () { loadEmojis().then(keepCopy); }, QUIET);
  }

  var appMode = window.matchMedia && (window.matchMedia('(display-mode: fullscreen)').matches ||
                                      window.matchMedia('(display-mode: standalone)').matches);
  if (appMode && screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(function () { });
  }
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(function () { });
  }

  function step(work) {
    return function () {
      work();
      return new Promise(function (r) { setTimeout(r, 30); });
    };
  }

  function pageLoaded() {
    if (document.readyState === 'complete') return Promise.resolve();
    return new Promise(function (r) { window.addEventListener('load', r, { once: true }); });
  }

  Jacko.splash.start()
    .then(step(function () {
      Jacko.showScenery();
      Jacko.showNames();
      Jacko.showCaptions();
    }))
    .then(step(function () { scene = Jacko.stage.init(document.getElementById('table')); }))
    .then(step(function () { Jacko.board.build(scene); }))
    .then(step(function () { Jacko.checkers.build(scene); }))
    .then(step(function () { Jacko.dice.build(scene); }))
    .then(step(function () {
      Jacko.stage.setZoom(Jacko.store.get('zoom'), true);
      Jacko.stage.setTilt(Jacko.store.get('tilt'), true);
    }))
    .then(step(function () {
      Jacko.topbar();
      Jacko.showTheme();
      Jacko.menu.init();
    }))
    .then(step(function () { Jacko.play.init(); }))
    .then(function () {
      return Promise.all([Jacko.MARBLE.ready, Jacko.dice.ready, pageLoaded()]);
    })
    .then(step(function () { Jacko.stage.warm(); }))
    .then(function () { Jacko.splash.finish(afterStart); })
    .catch(function (e) { console.error(e); Jacko.splash.finish(afterStart); });
});
