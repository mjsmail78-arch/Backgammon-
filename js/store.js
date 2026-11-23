window.Jacko = window.Jacko || {};

Jacko.store = (function () {
  var KEY = 'jacko-backgammon';
  var defaults = {
    name1: '', name2: '',
    bg: 'p-gb',
    theme: 'gb',
    matchBg: true,
    sound: true,
    hints: false,
    tilt: document.documentElement.classList.contains('phone') ? 8 : 18,
    zoom: 100,
    captions: true,
    bright: 100,
    bgBright: 100,
    autoBear: 'off',
    autoMove: 'off',
    autoRoll: 'off',
    autoConfirm: 'off',
    speed: 'smooth',
    variant: 'house',
    mode: 'ai', ai: 'easy', match: '5', start: 'classic',
    p1col: 'light'
  };
  var data = Object.assign({}, defaults);

  try { localStorage.removeItem(KEY); } catch (e) { }

  return {
    get: function (k) { return data[k]; },
    set: function (k, v) { data[k] = v; }
  };
})();

Jacko.fade = (function () {
  var OUT = 220, WAIT = OUT + 30;
  var SOLO = '#notice, #emoji-grid, #settings-pop, #hints-pop, #view-pop, #graphics-pop, .sub-pop, #menu, #round-pop, #install-pop, #ready-pop';
  var MODAL = '#install-pop, #ready-pop, #round-pop, #exit-pop, #saved-ask, #fp-pop, #wait-pop';
  var shield = null;

  function busy(el, sel) {
    return [].some.call(document.querySelectorAll(sel), function (w) { return w !== el && !w.hidden; });
  }

  function dropNotice(el) {
    var n = document.getElementById('notice');
    if (!n || n === el) return;
    clearTimeout(n._showT); n._showT = null;
    clearTimeout(n._noticeT);
    if (!n.hidden) hide(n);
  }

  function after(el, fn) {
    dropNotice(el);
    if (!busy(el, SOLO)) { fn(); return null; }
    return setTimeout(fn, WAIT);
  }

  function guard() {
    var up = [].filter.call(document.querySelectorAll(MODAL), function (w) { return (!w.hidden && !w._fadeTimer) || w._waitT; });
    if (!shield) {
      shield = document.createElement('div');
      shield.id = 'shield';
      shield.hidden = true;
      shield.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); });
    }
    if (!up.length) { shield.hidden = true; return; }
    var top = up.reduce(function (a, w) { return (+getComputedStyle(w).zIndex || 0) >= (+getComputedStyle(a).zIndex || 0) ? w : a; });
    top.parentNode.insertBefore(shield, top);
    shield.style.zIndex = String((+getComputedStyle(top).zIndex || 1) - 1);
    shield.hidden = false;
  }

  function reveal(el) {
    if (el._fadeTimer) { clearTimeout(el._fadeTimer); el._fadeTimer = null; }
    el.classList.remove('fade-out');
    el.hidden = false;
    if (el.matches(MODAL)) guard();
  }

  function show(el) {
    clearTimeout(el._waitT); el._waitT = null;
    if (!el.matches(MODAL)) { reveal(el); return; }
    if (Jacko.pops) Jacko.pops.close();
    dropNotice(el);
    if (!busy(el, SOLO.replace(', #menu', ''))) { reveal(el); return; }
    el._waitT = setTimeout(function () { el._waitT = null; reveal(el); }, WAIT);
    guard();
  }

  function hide(el) {
    if (el._waitT) { clearTimeout(el._waitT); el._waitT = null; guard(); }
    if (el.hidden || el._fadeTimer) return;
    el.classList.add('fade-out');
    el._fadeTimer = setTimeout(function () {
      el._fadeTimer = null;
      el.hidden = true;
      el.classList.remove('fade-out');
      if (el.matches(MODAL)) guard();
    }, OUT);
    if (el.matches(MODAL)) guard();
  }

  return { show: show, hide: hide, after: after, OUT: OUT };
})();

Jacko.pops = (function () {
  var open = null, wait = null;

  function close() {
    clearTimeout(wait); wait = null;
    if (!open) return;
    Jacko.fade.hide(open.el);
    if (open.btn) open.btn.classList.remove('on');
    open = null;
  }

  function toggle(el, btn) {
    var same = open && open.el === el;
    close();
    if (same) return;
    if (Jacko.menu && Jacko.menu.close) Jacko.menu.close();
    if (btn) btn.classList.add('on');
    open = { el: el, btn: btn };
    wait = Jacko.fade.after(el, function () { wait = null; Jacko.fade.show(el); });
  }

  document.addEventListener('pointerdown', function (e) {
    if (!open) return;
    if (open.el.contains(e.target) || (open.btn && open.btn.contains(e.target))) return;
    close();
  });

  return { toggle: toggle, close: close };
})();
