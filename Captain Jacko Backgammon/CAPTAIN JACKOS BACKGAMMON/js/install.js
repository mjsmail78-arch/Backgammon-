// THE INSTALL MESSAGE: shown after the logo lands when the game is open in a browser and not yet
// installed. INSTALL GAME installs it where the browser allows, or turns to the steps for that device.
Jacko.install = (function () {
  var asked = null, steps = false, swapTimer = null;
  var CHROMIUM = { android: 1, samsung: 1, computer: 1 };
  var SWAP = 200;
  var HOW = 'HOW TO INSTALL';
  var WHY = ['Install Captain Jacko to play it like any other app: full screen, from its own icon, with saved matches kept safe.',
             'Playing in the browser works too, but clearing the browser\'s history deletes saved matches.',
             'Matches started in the browser can\'t be moved to the installed game later, so it\'s best to install now.'];

  var TEXT = {
    'app-apple': { title: 'OPEN IN THE BROWSER FIRST', how: 'OPEN IN THE BROWSER FIRST',
      lines: ['Captain Jacko can only be installed from the browser.'],
      steps: ['Tap the three dots at the top right.', 'Tap Open in external browser.'] },
    'app-other': { title: 'OPEN IN THE BROWSER FIRST', how: 'OPEN IN THE BROWSER FIRST',
      lines: ['Captain Jacko can only be installed from the browser.'],
      steps: ['Tap the three dots at the top right.', 'Tap Open in browser.'] },
    apple: { title: 'INSTALL CAPTAIN JACKO', lines: WHY,
      steps: ['Tap Share, the box with an arrow pointing up. On some iPhones it sits inside the ••• menu.',
              'Scroll down and tap Add to Home Screen.',
              'Tap Add.',
              'Open Captain Jacko from its new icon.'] },
    android: { title: 'INSTALL CAPTAIN JACKO', lines: WHY,
      steps: ['Tap the three dots at the top right.', 'Tap Add to Home screen or Install app.'] },
    samsung: { title: 'INSTALL CAPTAIN JACKO', lines: WHY,
      steps: ['Tap the menu, the three lines at the bottom right.', 'Tap Add page to, then Home screen.'] },
    computer: { title: 'INSTALL CAPTAIN JACKO', lines: WHY,
      steps: ['Click the install icon at the right end of the address bar.'] },
    'mac-safari': { title: 'INSTALL CAPTAIN JACKO', lines: WHY,
      steps: ['Click File in the menu bar.', 'Click Add to Dock.'] },
    firefox: { title: 'INSTALL CAPTAIN JACKO', lines: WHY,
      note: 'Firefox cannot install games. Open Captain Jacko in Chrome or Edge to install it.', steps: [] }
  };

  function $(id) { return document.getElementById(id); }

  function installed() {
    var mm = window.matchMedia;
    return navigator.standalone === true || !!(mm && (mm('(display-mode: standalone)').matches ||
      mm('(display-mode: fullscreen)').matches || mm('(display-mode: minimal-ui)').matches));
  }

  function where() {
    var ua = navigator.userAgent || '';
    var apple = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (/FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram/i.test(ua)) return apple ? 'app-apple' : 'app-other';
    if (apple) return 'apple';
    if (/Firefox/.test(ua) && !/Android/.test(ua)) return 'firefox';
    if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua)) return 'mac-safari';
    if (/SamsungBrowser/.test(ua)) return 'samsung';
    if (/Android/.test(ua)) return 'android';
    return 'computer';
  }

  function add(parent, tag, text) {
    var el = document.createElement(tag);
    el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  function paint() {
    var t = TEXT[where()];
    var body = $('install-body');
    body.innerHTML = '';
    $('install-title').textContent = steps ? (t.how || HOW) : t.title;
    if (steps) {
      if (t.note) add(body, 'p', t.note);
      if (t.steps.length) {
        var ol = add(body, 'ol', '');
        t.steps.forEach(function (s) { add(ol, 'li', s); });
      }
    } else {
      t.lines.forEach(function (line) { add(body, 'p', line); });
    }
    $('install-go').hidden = steps;
    $('install-close').hidden = steps;
    $('install-back').hidden = !steps;
  }

  function turn(toSteps) {
    var pop = $('install-pop');
    clearTimeout(swapTimer);
    pop.classList.add('swap');
    swapTimer = setTimeout(function () {
      swapTimer = null;
      steps = toSteps;
      paint();
      pop.scrollTop = 0;
      pop.classList.remove('swap');
    }, SWAP);
  }

  function hide() {
    var pop = $('install-pop');
    if (pop && !pop.hidden) Jacko.fade.hide(pop);
  }

  function check() {
    if (installed()) return;
    steps = false;
    paint();
    Jacko.fade.show($('install-pop'));
  }

  function installGame() {
    if (!(asked && CHROMIUM[where()])) { turn(true); return; }
    var q = asked;
    asked = null;
    q.prompt();
    q.userChoice.then(function (r) {
      if (r && r.outcome === 'accepted') hide();
    }, function () {});
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    asked = e;
  });
  window.addEventListener('appinstalled', function () { asked = null; hide(); });

  document.addEventListener('DOMContentLoaded', function () {
    $('install-close').addEventListener('click', hide);
    $('install-go').addEventListener('click', installGame);
    $('install-back').addEventListener('click', function () { turn(false); });
  });

  return { check: check };
})();
