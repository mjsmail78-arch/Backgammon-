// NEW MATCH MENU: opponent, strength, points, starting position, Player 1 checkers and Start Game.
Jacko.menu = (function () {
  var menu, aiPart, btn, closing = null;

  function showModeParts() {
    var off = Jacko.store.get('mode') !== 'ai';
    aiPart.classList.toggle('off', off);
    aiPart.querySelectorAll('button').forEach(function (b) { b.disabled = off; });
  }

  function init() {
    menu = document.getElementById('menu');
    aiPart = menu.querySelector('.only-ai');
    btn = document.getElementById('btn-new');

    Jacko.picker(menu.querySelector('[data-pick="mode"]'), 'mode', showModeParts);
    Jacko.picker(menu.querySelector('[data-pick="ai"]'), 'ai');
    Jacko.picker(menu.querySelector('[data-pick="match"]'), 'match', told);
    Jacko.picker(menu.querySelector('[data-pick="start"]'), 'start', told);
    Jacko.picker(menu.querySelector('[data-pick="p1col"]'), 'p1col', function () {
      Jacko.play.previewColour(Jacko.store.get('p1col'));
      told();
    });
    showModeParts();

    document.getElementById('btn-rules').addEventListener('click', function () { Jacko.guide.open(); });

    Jacko.saves.init();
    document.getElementById('btn-start').addEventListener('click', function () {
      close();
      Jacko.play.newMatch();
    });
    menu.addEventListener('click', function (e) { if (e.target === menu) close(); });
    var back = document.getElementById('btn-menu-back');
    if (back) back.addEventListener('click', function () { close(); });

    var exitPop = document.getElementById('exit-pop');
    document.getElementById('btn-exit').addEventListener('click', function () { Jacko.fade.show(exitPop); });
    document.getElementById('exit-no').addEventListener('click', function () { Jacko.fade.hide(exitPop); });
    document.getElementById('exit-yes').addEventListener('click', function () {
      Jacko.fade.hide(exitPop);
      close();
      Jacko.pops.close();
      Jacko.splash.end();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (Jacko.guide.isOpen()) Jacko.guide.close();
      else if (!exitPop.hidden) Jacko.fade.hide(exitPop);
      else if (Jacko.saves.askOpen()) document.getElementById('saved-no').click();
      else if (Jacko.saves.isOpen()) Jacko.saves.close();
      else close();
    });
  }

  function isOpen() { return !menu.hidden && !closing; }

  function open() {
    if (closing) { clearTimeout(closing); closing = null; menu.classList.remove('closing'); }
    var bar = Jacko.view.rect(document.getElementById('topbar'));
    menu.style.top = Math.round(bar.bottom) + 'px';
    menu.hidden = false;
    btn.classList.add('on');
    btn.setAttribute('aria-expanded', 'true');
  }

  function close() {
    if (menu.hidden || closing) return;
    var ask = document.getElementById('exit-pop');
    if (ask && !ask.hidden) Jacko.fade.hide(ask);
    if (Jacko.guide) Jacko.guide.close();
    if (Jacko.saves && Jacko.saves.isOpen()) Jacko.saves.close();
    btn.classList.remove('on');
    btn.setAttribute('aria-expanded', 'false');
    menu.classList.add('closing');
    closing = setTimeout(function () {
      menu.hidden = true;
      menu.classList.remove('closing');
      closing = null;
      if (Jacko.play && Jacko.play.keepColour) Jacko.play.keepColour();
      told();
    }, 220);
  }

  function toggle() { if (isOpen()) close(); else open(); }

  // Play a Friend: the room maker's picks show on the friend's menu and board as they are made.
  function told() { if (Jacko.online) Jacko.online.menuChanged(); }

  return { init: init, open: open, close: close, toggle: toggle, isOpen: isOpen };
})();
