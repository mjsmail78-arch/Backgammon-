// THE OFFLINE COPY: keeps every file the game needs on the device, so it opens and plays with no
// internet. Only Play a Friend goes out to the internet.
// VERSION: raise it whenever any file changes, so every device fetches the new copy.
var VERSION = 'jacko-94';

var FILES = [
  'index.html',
  'manifest.webmanifest',
  'css/base.css', 'css/splash.css', 'css/game.css', 'css/menu.css', 'css/guide.css', 'css/friend.css',
  'js/lib/three.min.js', 'js/lib/peerjs.min.js',
  'js/sideways.js', 'js/store.js', 'js/themes.js', 'js/stage.js', 'js/motion.js', 'js/rules.js', 'js/board.js',
  'js/checkers.js', 'js/dice.js', 'js/net.js', 'js/brain.js', 'js/ai.js', 'js/splash.js', 'js/topbar.js', 'js/saves.js',
  'js/menu.js', 'js/guide-book.js', 'js/scrollbars.js', 'js/online.js', 'js/friend.js', 'js/play.js', 'js/replay.js', 'js/install.js', 'js/main.js',
  'images/captain-jacko-cutout.png',
  'images/app-icon-180.png', 'images/app-icon-192.png', 'images/app-icon-512.png',
  'images/textures/marble-color.jpg', 'images/textures/marble-normal.jpg', 'images/textures/marble-roughness.jpg',
  'images/textures/gold-color.jpg', 'images/textures/gold-roughness.jpg'
].concat([
  'wave', 'thumb', 'thumbdown', 'clap', 'finger', 'laugh', 'rofl', 'tongue', 'zany', 'wink',
  'smirk', 'kiss', 'cool', 'party', 'money', 'nerd', 'eyeroll', 'woozy', 'sleep', 'cry', 'angry',
  'swear', 'explode', 'puke', 'hearteyes', 'scream', 'thinking', 'grimace', 'halo', 'beers',
  'ghost', 'monkey', 'clown', 'poo', 'devil', 'skull', 'fire', 'clover', 'trophy', 'popper', 'hundred'
].map(function (n) { return 'images/emoji/' + n + '.webp'; }), ['images/emoji/fistbump.webp?v=2'], [
  'gb', 'classic', 'moss', 'mint', 'sage', 'ash', 'crimson', 'bone', 'lagoon', 'olive', 'timber',
  'rainforest', 'casino'
].map(function (n) { return 'images/backgrounds/' + n + '.jpg'; }));

var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(self.location.hostname);
function here(path) { return new URL(path, self.registration.scope).href; }

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (cache) {
    return FILES.reduce(function (chain, f) {
      return chain.then(function () {
        return fetch(here(f), { cache: 'no-cache' }).then(function (res) {
          if (res.ok) return cache.put(here(f), res);
        }).catch(function () { });
      });
    }, Promise.resolve());
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('jacko-') === 0 && k !== VERSION; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.href.indexOf(self.registration.scope) !== 0) return;

  var key = req.mode === 'navigate' ? here('index.html') : req.url;

  e.respondWith(caches.open(VERSION).then(function (cache) {
    var fresh = (LOCAL ? fetch(req, { cache: 'no-cache' }) : fetch(req)).then(function (res) {
      if (res && res.ok && res.type === 'basic') cache.put(key, res.clone());
      return res;
    });
    return cache.match(key).then(function (kept) {
      if (LOCAL) return fresh.catch(function () { return kept || Response.error(); });
      if (kept) { fresh.catch(function () {}); e.waitUntil(fresh.catch(function () {})); return kept; }
      return fresh;
    });
  }));
});
