// TOP BUTTONS: Emojis, Settings, Graphics, New Game, Sound, View and Hints.
Jacko.topbar = function () {
  var store = Jacko.store;
  var pops = Jacko.pops;
  var $ = function (id) { return document.getElementById(id); };

  var btnEmojis = $('btn-emojis');
  var grid = $('emoji-grid');
  btnEmojis.addEventListener('click', function () { pops.toggle(grid, btnEmojis); });
  grid.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-emo]');
    if (!b) return;
    Jacko.flyEmoji(b.querySelector('img').src, b.dataset.emo);
    if (Jacko.online) Jacko.online.emoji(b.dataset.emo);
    pops.close();
  });

  var btnSettings = $('btn-settings');
  var settings = $('settings-pop');
  btnSettings.addEventListener('click', function () { pops.toggle(settings, btnSettings); });
  settings.querySelector('.close-pop').addEventListener('click', pops.close);
  Jacko.picker(settings.querySelector('[data-pick="autoBear"]'), 'autoBear');
  Jacko.picker(settings.querySelector('[data-pick="autoMove"]'), 'autoMove');
  Jacko.picker(settings.querySelector('[data-pick="autoConfirm"]'), 'autoConfirm');
  Jacko.picker(settings.querySelector('[data-pick="autoRoll"]'), 'autoRoll');

  ['1', '2'].forEach(function (n) {
    var inp = $('set-name' + n);
    inp.value = store.get('name' + n);
    inp.addEventListener('input', function () {
      store.set('name' + n, inp.value.trim());
      Jacko.showNames();
    });
  });

  var sceneryRow = $('scenery-row');
  Jacko.THEMES.forEach(function (th, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt tile' + (i === 0 ? ' wide' : '');
    b.dataset.v = 'p-' + th.id;
    b.innerHTML = '<span class="tile-pic bg-p-' + th.id + '"></span><span class="tile-name"></span>';
    b.querySelector('.tile-name').textContent = Jacko.PHOTOS[th.id] || th.label;
    sceneryRow.appendChild(b);
  });
  var showBgPick = Jacko.picker(sceneryRow, 'bg', function () {
    if (store.get('matchBg')) { store.set('matchBg', false); showMatchBg(); }
    Jacko.showScenery();
  });
  function told() { if (Jacko.online) Jacko.online.lookChanged(); }
  var showSpeed = Jacko.picker(settings.querySelector('[data-pick="speed"]'), 'speed', told);

  var themeRow = $('theme-row');
  if (!Jacko.THEMES.some(function (t) { return t.id === store.get('theme'); })) store.set('theme', 'gb');
  Jacko.THEMES.forEach(function (th, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt theme-btn' + (i === 0 ? ' wide' : '');
    b.dataset.v = th.id;
    b.textContent = th.label;
    themeRow.appendChild(b);
  });
  var showThemePick = Jacko.picker(themeRow, 'theme', function () { Jacko.showTheme(true); matchBg(); told(); });
  Jacko.showLook = function () { showSpeed(); showThemePick(); };

  var btnMatch = $('btn-matchbg');
  function showMatchBg() {
    var on = !!store.get('matchBg');
    btnMatch.classList.toggle('on', on);
    btnMatch.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  function matchBg() {
    if (!store.get('matchBg')) return;
    store.set('bg', 'p-' + store.get('theme'));
    showBgPick();
    Jacko.showScenery();
  }
  btnMatch.addEventListener('click', function () {
    store.set('matchBg', !store.get('matchBg'));
    showMatchBg();
    matchBg();
    Jacko.notice(store.get('matchBg') ? 'MATCH BACKGROUND ON' : 'MATCH BACKGROUND OFF');
  });
  showMatchBg();

  var btnNew = $('btn-new');
  Jacko.logoGlow = function (on) { btnNew.classList.toggle('ready', !!on); };
  Jacko.logoHint = function () { Jacko.logoGlow(true); };
  btnNew.addEventListener('click', function () {
    Jacko.logoGlow(false);
    pops.close();
    Jacko.menu.toggle();
  });

  var btnSound = $('btn-sound');
  function showSound() { btnSound.classList.toggle('muted', !store.get('sound')); }
  btnSound.addEventListener('click', function () {
    store.set('sound', !store.get('sound'));
    showSound();
    Jacko.notice(store.get('sound') ? 'SOUND ON' : 'SOUND OFF');
  });
  showSound();

  var btnHints = $('btn-hints');
  function showHints() {
    var on = !!store.get('hints');
    btnHints.classList.toggle('off', !on);
    btnHints.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  btnHints.addEventListener('click', function () {
    store.set('hints', !store.get('hints'));
    showHints();
    if (Jacko.play && Jacko.play.refreshHints) Jacko.play.refreshHints();
    Jacko.notice(store.get('hints') ? 'HINTS ON' : 'HINTS OFF');
  });
  showHints();

  var groups = {
    view: { btn: $('btn-view'), pop: $('view-pop') },
    graphics: { btn: $('btn-graphics'), pop: $('graphics-pop') }
  };
  Object.keys(groups).forEach(function (k) {
    var g = groups[k];
    g.btn.addEventListener('click', function () {
      if (g.btn.classList.contains('on')) pops.close();
      else pops.toggle(g.pop, g.btn);
    });
    g.pop.addEventListener('click', function (e) {
      var b = e.target.closest('[data-open]');
      if (b) pops.toggle($(b.dataset.open), g.btn);
    });
  });
  document.querySelectorAll('.sub-pop').forEach(function (sub) {
    var g = groups[sub.dataset.back];
    sub.querySelector('.back').addEventListener('click', function () { pops.toggle(g.pop, g.btn); });
  });

  var bright = $('bright');
  var brightVal = $('bright-val');
  bright.value = store.get('bright');
  brightVal.textContent = bright.value + '%';
  bright.addEventListener('input', function () {
    brightVal.textContent = bright.value + '%';
    store.set('bright', +bright.value);
    Jacko.stage.setBrightness(+bright.value);
  });

  var bgBright = $('bgbright');
  var bgBrightVal = $('bgbright-val');
  bgBright.value = store.get('bgBright');
  bgBrightVal.textContent = bgBright.value + '%';
  bgBright.addEventListener('input', function () {
    bgBrightVal.textContent = bgBright.value + '%';
    store.set('bgBright', +bgBright.value);
    Jacko.showBgBright();
  });
  Jacko.showBgBright();

  var tilt = $('tilt');
  var tiltVal = $('tilt-val');
  tilt.value = store.get('tilt');
  tiltVal.textContent = tilt.value + '°';
  tilt.addEventListener('input', function () {
    tiltVal.textContent = tilt.value + '°';
    store.set('tilt', +tilt.value);
    Jacko.stage.setTilt(+tilt.value);
  });

  var zoom = $('zoom');
  var zoomVal = $('zoom-val');
  var z = Math.min(150, Math.max(50, +store.get('zoom') || 100));
  if (z !== store.get('zoom')) { store.set('zoom', z); Jacko.stage.setZoom(z, true); }
  zoom.value = z;
  zoomVal.textContent = zoom.value + '%';
  zoom.addEventListener('input', function () {
    zoomVal.textContent = zoom.value + '%';
    store.set('zoom', +zoom.value);
    Jacko.stage.setZoom(+zoom.value);
  });

  var btnCap = $('btn-captions');
  function showCapBtn() {
    var on = !!store.get('captions');
    btnCap.classList.toggle('on', on);
    btnCap.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  btnCap.addEventListener('click', function () {
    store.set('captions', !store.get('captions'));
    showCapBtn();
    Jacko.showCaptions();
    Jacko.notice(store.get('captions') ? 'CAPTIONS ON' : 'CAPTIONS OFF');
  });
  showCapBtn();
};

Jacko.showBgBright = function () {
  var v = +Jacko.store.get('bgBright') || 100;
  var el = document.getElementById('scenery-dim');
  if (v <= 100) {
    el.style.mixBlendMode = 'normal';
    el.style.background = 'rgba(0, 0, 0, ' + ((100 - v) / 100).toFixed(2) + ')';
  } else {
    el.style.mixBlendMode = 'soft-light';
    el.style.background = 'rgba(255, 255, 255, ' + ((v - 100) / 30 * 0.7).toFixed(2) + ')';
  }
};

Jacko.notice = function (text) {
  var el = document.getElementById('notice');
  el.textContent = text;
  Jacko.fade.show(el);
  clearTimeout(el._noticeT);
  el._noticeT = setTimeout(function () { Jacko.fade.hide(el); }, 3000);
};

Jacko.showCaptions = function () {
  document.getElementById('game').classList.toggle('captions-on', !!Jacko.store.get('captions'));
};

Jacko.p1dark = false;
Jacko.showTheme = function (fade) {
  var th = Jacko.theme(Jacko.store.get('theme'));
  var menu = document.getElementById('menu');
  if (menu) {
    menu.style.setProperty('--ck-light', th.ckA);
    menu.style.setProperty('--ck-dark', th.ckB);
  }
  if (Jacko.p1dark) th = Object.assign({}, th, { ckA: th.ckB, ckB: th.ckA });
  function apply() {
    Jacko.board.setTheme(th);
    Jacko.checkers.setTheme(th, fade);
    Jacko.dice.setTheme(th);
  }
  if (fade) Jacko.stage.crossFade(apply);
  else { apply(); Jacko.stage.render(); }
};

Jacko.flyEmoji = function (src, name) {
  var layer = document.getElementById('fly-layer');
  layer.innerHTML = '';
  var fly = document.createElement('div');
  fly.className = 'fly';
  var img = document.createElement('img');
  img.src = src;
  img.alt = '';
  fly.appendChild(img);
  fly.addEventListener('animationend', function (e) { if (e.target === fly) fly.remove(); });
  document.getElementById('fly-layer').appendChild(fly);
};

Jacko.showNames = function () {
  document.getElementById('name-p1').textContent = Jacko.store.get('name1') || 'Player 1';
  var ai = Jacko.play && Jacko.play.isAI();
  document.getElementById('name-p2').textContent = Jacko.store.get('name2') || (ai ? 'Computer' : 'Player 2');
  if (Jacko.stage && Jacko.stage.placeCards) Jacko.stage.placeCards();
};

Jacko.showScenery = (function () {
  var gen = 0;
  function ready(cls) {
    var m = /^bg-p-(.+)$/.exec(cls);
    if (!m) return Promise.resolve();
    return new Promise(function (done) {
      var img = new Image();
      img.onload = function () {
        if (img.decode) img.decode().then(done, done); else done();
      };
      img.onerror = done;
      img.src = 'images/backgrounds/' + m[1] + '.jpg';
      setTimeout(done, 3000);
    });
  }
  return function () {
    var game = document.getElementById('game');
    var old = document.getElementById('scenery-old');
    var was = (game.className.match(/\bbg-\S+/) || [])[0];
    var now = 'bg-' + Jacko.store.get('bg');
    if (was === now) return;
    var fade = was && game.classList.contains('shown');
    if (fade) {
      old.className = was;
      old.style.opacity = '1';
    }
    game.className = game.className.replace(/\bbg-\S+/g, '').trim();
    game.classList.add(now);
    if (!fade) return;
    var mine = ++gen;
    ready(now).then(function () {
      if (mine !== gen) return;
      requestAnimationFrame(function () {
        if (mine !== gen) return;
        void old.offsetWidth;
        old.classList.add('fading');
        old.style.opacity = '0';
      });
    });
  };
})();

Jacko.picker = function (row, key, onChange) {
  function show() {
    row.querySelectorAll('.opt').forEach(function (b) {
      b.classList.toggle('on', b.dataset.v === String(Jacko.store.get(key)));
    });
  }
  row.addEventListener('click', function (e) {
    var b = e.target.closest('.opt');
    if (!b) return;
    Jacko.store.set(key, b.dataset.v);
    show();
    if (onChange) onChange();
  });
  show();
  return show;
};
