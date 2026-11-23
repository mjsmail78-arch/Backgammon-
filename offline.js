var VERSION = 'jacko-158';

var TONES = ['yellow', 'light', 'medium-light', 'medium', 'medium-dark', 'dark'];

var FILES = [
  'index.html',
  'manifest.webmanifest',
  'css/base.css', 'css/splash.css', 'css/game.css', 'css/menu.css', 'css/guide.css', 'css/friend.css',
  'js/lib/three.min.js', 'js/lib/peerjs.min.js',
  'js/sideways.js', 'js/store.js', 'js/themes.js', 'js/stage.js', 'js/motion.js', 'js/rules.js', 'js/board.js',
  'js/checkers.js', 'js/dice.js', 'js/net.js', 'js/brain.js', 'js/ai.js', 'js/splash.js', 'js/topbar.js', 'js/saves.js',
  'js/menu.js', 'js/guide-book.js', 'js/scrollbars.js', 'js/online.js', 'js/friend.js', 'js/fireworks.js', 'js/directions.js', 'js/play.js', 'js/replay.js', 'js/install.js', 'js/main.js',
  'images/captain-jacko-cutout.png',
  'images/app-icon-180.png', 'images/app-icon-192.png', 'images/app-icon-512.png',
  'images/textures/marble-color.jpg', 'images/textures/marble-normal.jpg', 'images/textures/marble-roughness.jpg',
  'images/textures/gold-color.jpg', 'images/textures/gold-roughness.jpg'
].concat([
  'chip-lay-1', 'chip-lay-2', 'chip-lay-3', 'chips-collide-1', 'chips-collide-2', 'chips-collide-3', 'chips-collide-4',
  'dice-throw-1', 'dice-throw-2', 'dice-throw-3',
  'bang_01', 'bang_02', 'bang_03', 'bang_04', 'bang_05', 'bang_06', 'bang_07', 'bang_08', 'bang_09', 'bang_10',
  'fw_01', 'fw_03', 'fw_04', 'fw_06'
].map(function (n) { return 'sounds/' + n + '.ogg'; }), [
  'faces/facewithtearsofjoy', 'faces/rollingonthefloorlaughing', 'faces/beamingfacewithsmilingeyes', 'faces/starstruck', 'faces/partyingface',
  'faces/smilingfacewithsunglasses', 'faces/smilingfacewithhalo', 'faces/upsidedownface', 'faces/winkingface', 'faces/winkingfacewithtongue',
  'faces/facewithtongue', 'faces/zanyface', 'faces/smirkingface', 'faces/moneymouthface', 'faces/nerdface',
  'faces/smilingfacewithhorns', 'faces/shushingface', 'faces/facewithhandovermouth', 'faces/zippermouthface', 'faces/smilingfacewithhearteyes',
  'faces/faceblowingakiss', 'faces/thinkingface', 'faces/facewithmonocle', 'faces/facewithraisedeyebrow', 'faces/facewithrollingeyes',
  'faces/unamusedface', 'faces/grimacingface', 'faces/facewithoutmouth', 'faces/faceexhaling', 'faces/yawningface',
  'faces/sleepingface', 'faces/woozyface', 'faces/facewithspiraleyes', 'faces/confusedface', 'faces/worriedface',
  'faces/frowningface', 'faces/disappointedface', 'faces/cryingface', 'faces/loudlycryingface', 'faces/anguishedface',
  'faces/anxiousfacewithsweat', 'faces/confoundedface', 'faces/fearfulface', 'faces/flushedface', 'faces/facewithsteamfromnose',
  'faces/poutingface', 'faces/angryface', 'faces/angryfacewithhorns', 'faces/facewithsymbolsonmouth', 'faces/facescreaminginfear',
  'faces/explodinghead', 'faces/facevomiting', 'faces-2/grinningsquintingface', 'faces-2/lyingface', 'faces-2/facewithopeneyesandhandovermouth',
  'faces-2/kissingface', 'faces-2/kissingfacewithclosedeyes', 'faces-2/kissingfacewithsmilingeyes', 'faces-2/huggingface', 'faces-2/headshakinghorizontally',
  'faces-2/headshakingvertically', 'faces-2/pleadingface', 'faces-2/facewithopenmouth',
  'others/clinkingbeermugs', 'others/partypopper', 'others/fire', 'others/glowingstar', 'others/hundredpoints',
  'others/seenoevilmonkey', 'others/hearnoevilmonkey', 'others/speaknoevilmonkey', 'others/ghost', 'others/alien', 'others/clownface', 'others/skull', 'others/pileofpoo',
  'hands-yellow/chinflick', 'hands-yellow/bastard', 'hands-yellow/bitch'
].map(function (n) { return 'images/emoji/' + n + '.webp'; }),
TONES.reduce(function (all, t) {
  return all.concat([
    'thumbsup', 'thumbsdown', 'clappinghands', 'wavinghand', 'okhand',
    'victoryhand', 'crossedfingers', 'loveyougesture', 'signofthehorns', 'callmehand',
    'middlefinger', 'oncomingfist', 'leftfacingfist', 'rightfacingfist', 'raisedhand',
    'raisinghands', 'hearthands', 'handshake', 'pinchedfingers', 'handwithindexfingerandthumbcrossed',
    'indexpointingattheviewer', 'indexpointingup', 'backhandindexpointingup', 'backhandindexpointingdown', 'backhandindexpointingleft',
    'backhandindexpointingright', 'leftwardspushinghand', 'rightwardspushinghand', 'raisedbackofhand', 'flexedbiceps',
    'foldedhands', 'pinchinghand', 'selfie', 'asshole'
  ].map(function (n) { return 'images/emoji/hands-' + t + '/' + n + '.webp'; }),
    [
      'personfacepalming', 'personshrugging', 'persongesturingno', 'womangesturingno', 'mangesturingno'
    ].map(function (n) { return 'images/emoji/others/' + n + '-' + t + '.webp'; }));
}, []), [
  'gb', 'classic', 'moss', 'mint', 'sage', 'ash', 'crimson', 'bone', 'lagoon', 'olive', 'timber',
  'rainforest', 'casino'
].map(function (n) { return 'images/backgrounds/' + n + '.jpg'; }));

var FACES_TONED = [
  'facewithtearsofjoy', 'rollingonthefloorlaughing', 'beamingfacewithsmilingeyes', 'grinningsquintingface', 'starstruck', 'partyingface',
  'smilingfacewithsunglasses', 'smilingfacewithhalo', 'upsidedownface', 'winkingface', 'winkingfacewithtongue', 'facewithtongue',
  'zanyface', 'smirkingface', 'lyingface', 'moneymouthface', 'nerdface', 'shushingface',
  'facewithhandovermouth', 'facewithopeneyesandhandovermouth', 'zippermouthface', 'smilingfacewithhearteyes', 'faceblowingakiss', 'kissingface',
  'kissingfacewithclosedeyes', 'kissingfacewithsmilingeyes', 'huggingface', 'thinkingface', 'facewithmonocle', 'facewithraisedeyebrow',
  'facewithrollingeyes', 'unamusedface', 'headshakinghorizontally', 'headshakingvertically', 'grimacingface', 'facewithoutmouth',
  'faceexhaling', 'yawningface', 'sleepingface', 'woozyface', 'facewithspiraleyes', 'confusedface',
  'worriedface', 'frowningface', 'disappointedface', 'pleadingface', 'cryingface', 'loudlycryingface',
  'anguishedface', 'anxiousfacewithsweat', 'confoundedface', 'fearfulface', 'flushedface', 'facewithopenmouth',
  'facewithsteamfromnose', 'angryface', 'facescreaminginfear', 'explodinghead',
  'facevomiting', 'chinflick', 'bastard', 'bitch'
];
FILES = FILES.concat(TONES.slice(1).reduce(function (all, t) {
  return all.concat(FACES_TONED.map(function (n) { return 'images/emoji/faces-tone/' + t + '/' + n + '.webp'; }));
}, []));

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

function plain(href) {
  var p = new URL(href).pathname;
  try { return decodeURIComponent(p); } catch (err) { return p; }
}

function isGamePage(url) {
  var path = plain(url.href);
  var folder = plain(self.registration.scope);
  return path === folder + 'index.html' || (!LOCAL && path === folder);
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (plain(url.href).indexOf(plain(self.registration.scope)) !== 0) return;

  var page = req.mode === 'navigate';
  if (page && !isGamePage(url)) return;
  if (url.pathname.slice(-1) === '/' && !isGamePage(url)) return;

  var key = page ? here('index.html') : req.url;

  if (!page && /\.(webp|jpe?g|png)$/i.test(url.pathname)) {
    e.respondWith(caches.open(VERSION).then(function (cache) {
      return cache.match(key).then(function (kept) {
        if (kept) return kept;
        return fetch(req).then(function (res) {
          if (res && res.ok && res.type === 'basic') cache.put(key, res.clone());
          return res;
        });
      });
    }));
    return;
  }

  function ask() {
    if (page) return fetch(url.href, { cache: LOCAL ? 'no-cache' : 'default', credentials: 'same-origin' });
    return LOCAL ? fetch(req, { cache: 'no-cache' }) : fetch(req);
  }

  e.respondWith(caches.open(VERSION).then(function (cache) {
    var fresh = ask().then(function (res) {
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
