// CHOICES, FADES AND POP-UP WINDOWS: the player's choices for this visit, and how windows fade in and out.
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
  var OUT = 220;

  function show(el) {
    if (el._fadeTimer) { clearTimeout(el._fadeTimer); el._fadeTimer = null; }
    el.classList.remove('fade-out');
    el.hidden = false;
  }

  function hide(el) {
    if (el.hidden || el._fadeTimer) return;
    el.classList.add('fade-out');
    el._fadeTimer = setTimeout(function () {
      el._fadeTimer = null;
      el.hidden = true;
      el.classList.remove('fade-out');
    }, OUT);
  }

  return { show: show, hide: hide };
})();

Jacko.pops = (function () {
  var open = null;

  function close() {
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
    Jacko.fade.show(el);
    if (btn) btn.classList.add('on');
    open = { el: el, btn: btn };
  }

  document.addEventListener('pointerdown', function (e) {
    if (!open) return;
    if (open.el.contains(e.target) || (open.btn && open.btn.contains(e.target))) return;
    close();
  });

  return { toggle: toggle, close: close };
})();
