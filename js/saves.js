Jacko.saves = (function () {
  var OLD = 'jacko-saved-matches', SLOTS = 'jacko-save-slots', AUTO = 'jacko-unfinished';
  var MAX = 5;

  function load(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }
  function keepIn(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { }
  }
  function wipe(key) {
    try { localStorage.removeItem(key); } catch (e) { }
  }
  function ok(s) { return !!s && s.v === 1 && !!check(s); }
  function five(a) {
    var out = [];
    for (var i = 0; i < MAX; i++) out.push(ok(a[i]) ? a[i] : null);
    return out;
  }
  function slots() {
    var a = load(SLOTS);
    if (!Array.isArray(a)) {
      var old = load(OLD);
      a = five(Array.isArray(old) ? old.filter(ok).sort(function (x, y) { return y.at - x.at; }) : []);
      keepIn(SLOTS, a);
      wipe(OLD);
    }
    return five(a);
  }
  function unfinished() { var s = load(AUTO); return ok(s) ? s : null; }
  function at(k) { return k < 0 ? unfinished() : slots()[k] || null; }

  function keep(rec) {
    rec.v = 1;
    rec.at = Date.now();
    keepIn(AUTO, rec);
  }
  function dropAuto(id) {
    var s = unfinished();
    if (s && (id === undefined || s.id === id)) wipe(AUTO);
  }
  function saveTo(k, rec) {
    var a = slots().map(function (s) { return s && s.id === rec.id ? null : s; });
    rec.v = 1;
    rec.at = Date.now();
    a[k] = rec;
    keepIn(SLOTS, a);
    dropAuto(rec.id);
  }
  function empty(k) {
    if (k < 0) { dropAuto(); return; }
    var a = slots();
    a[k] = null;
    keepIn(SLOTS, a);
  }
  function won(id) {
    dropAuto(id);
    keepIn(SLOTS, slots().map(function (s) { return s && s.id === id ? null : s; }));
  }
  function newId() { return 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

  var win, box, ask, askK = null;
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function when(t) {
    var d = new Date(t), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] +
      ' ' + d.getFullYear() + ', ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function against(s) {
    if (s.mode === 'online') return 'Play a Friend';
    if (s.mode !== 'ai') return '2 Players';
    return 'Computer, ' + ({ easy: 'Easy', hard: 'Hard', expert: 'Expert' }[s.level] || 'Easy');
  }

  var view = null;
  function saving() { return !!(view && view.save); }
  function look(s) {
    if (!view || view.save) return '';
    if (view.dimAll || !s) return ' sv-dim';
    return s.id === view.just ? ' sv-just' : ' sv-dim';
  }
  function card(s, k) {
    if (!s) {
      return '<div class="sv-card' + look(null) + '">' +
        '<button type="button" class="opt sv-open sv-blank" data-k="' + k + '"' + (saving() ? '' : ' disabled') + '>Empty</button></div>';
    }
    return '<div class="sv-card' + look(s) + '">' +
      '<button type="button" class="opt sv-open" data-k="' + k + '">' +
        (k < 0 ? '<span class="sv-line sv-tag">Unfinished match</span>' : '') +
        '<span class="sv-names">' + esc(s.names[0]) + ' <b>' + s.score[0] + ' – ' + s.score[1] + '</b> ' + esc(s.names[1]) + '</span>' +
        '<span class="sv-line">' + s.matchTo + ' points · ' + esc(against(s)) + '</span>' +
        '<span class="sv-line">' + esc(when(s.at)) + '</span>' +
      '</button>' +
      (saving() ? '' : '<div class="sv-side">' +
        (k < 0 ? '' : '<button type="button" class="opt sv-file" data-k="' + k + '">SAVE TO FILE</button>') +
        '<button type="button" class="opt sv-del" data-k="' + k + '" aria-label="Delete">DELETE</button>' +
      '</div>') +
    '</div>';
  }
  function paint() {
    var auto = saving() ? null : unfinished();
    $('saved-title').textContent = saving() ? 'Save Match' : 'Saved Matches';
    $('saved-load').hidden = saving();
    box.innerHTML = (auto ? card(auto, -1) : '') + slots().map(card).join('');
  }

  function saveHere(k) {
    var rec = view.save;
    saveTo(k, rec);
    Jacko.play.stopMatch('Match saved.');
    Jacko.menu.sync();
    view = { just: rec.id };
    paint();
    status('Match saved.', false, true);
  }
  function askFor(k, title, sub) {
    askK = k;
    $('saved-ask-title').textContent = title;
    ask.querySelector('.pop-sub').textContent = sub;
    Jacko.fade.show(ask);
  }

  var MARK = 'captain-jacko-backgammon';
  var stT = null;
  function status(text, bad, keep) {
    var el = $('saved-status');
    el.textContent = text;
    el.classList.toggle('bad', !!bad);
    clearTimeout(stT);
    if (!keep) stT = setTimeout(function () { el.textContent = ''; }, 4000);
  }
  function fileName(s) {
    var d = new Date(s.at);
    var day = d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getFullYear();
    var n = 'Captain Jacko - ' + s.names[0] + ' v ' + s.names[1] + ' - ' + s.score[0] + '-' + s.score[1] + ' - ' + day;
    return n.replace(/[\\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim() + '.json';
  }
  var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  function saveFile(s) {
    var text = JSON.stringify({ game: MARK, kind: 'match', v: 1, match: s }, null, 1);
    var name = fileName(s);
    var file = null;
    try { file = new File([text], name, { type: 'application/json' }); } catch (e) { }
    if (touch && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file] }).then(function () { status('Match saved to file.'); })
        .catch(function (e) { if (!e || e.name !== 'AbortError') download(text, name); });
      return;
    }
    download(text, name);
  }
  function download(text, name) {
    var url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    status('Match saved to file.');
  }

  function nums(a, n, lo, hi) {
    return Array.isArray(a) && a.length === n && a.every(function (x) { return typeof x === 'number' && isFinite(x) && x === Math.round(x) && x >= lo && x <= hi; });
  }
  function valid(f) {
    if (!f || f.game !== MARK || f.kind !== 'match' || f.v !== 1 || !f.match) return null;
    var s = f.match;
    if (typeof s.id !== 'string' || !s.id) return null;
    if (['opening', 'preroll', 'moving', 'choose'].indexOf(s.phase) < 0) return null;
    if (['ai', 'local', 'online'].indexOf(s.mode) < 0) return null;
    if (s.mode === 'online') {
      s.host = s.host === true;
      if (typeof s.room !== 'string' || !/^bg[a-z0-9]{6}$/.test(s.room)) { s.host = false; delete s.room; }
      s.friend = typeof s.friend === 'string' ? s.friend.slice(0, 20) : '';
    }
    if (['easy', 'hard', 'expert'].indexOf(s.level) < 0) return null;
    if ([1, 3, 5, 10].indexOf(s.matchTo) < 0) return null;
    if (['classic', 'fresh', 'tjs'].indexOf(s.start) < 0) return null;
    if (!Array.isArray(s.names) || s.names.length !== 2 || !Array.isArray(s.raw) || s.raw.length !== 2) return null;
    if (!s.names.concat(s.raw).every(function (x) { return typeof x === 'string' && x.length <= 20; })) return null;
    if (!nums(s.score, 2, 0, 99) || !nums(s.b, 24, -15, 15) || !nums(s.bar, 2, 0, 15) ||
        !nums(s.pool, 2, 0, 15) || !nums(s.off, 2, 0, 15)) return null;
    if (s.turn !== 0 && s.turn !== 1) return null;
    if (!Array.isArray(s.thrown) || !nums(s.thrown, s.thrown.length, 1, 6)) return null;
    if (s.phase === 'moving' && !nums(s.dice, 2, 1, 6)) return null;
    if (s.gold !== undefined && !nums([s.gold], 1, 1, 6)) return null;
    var p0 = s.bar[0] + s.pool[0] + s.off[0], p1 = s.bar[1] + s.pool[1] + s.off[1];
    s.b.forEach(function (x) { if (x > 0) p0 += x; else p1 -= x; });
    if (p0 !== 15 || p1 !== 15) return null;
    s.extraGo = !!s.extraGo; s.bonus = !!s.bonus;
    s.rule21 = [0, 1, 2].indexOf(s.rule21) >= 0 ? s.rule21 : 0;
    s.at = typeof s.at === 'number' ? s.at : Date.now();
    if (!tapeOk(s.tape)) delete s.tape;
    return s;
  }
  function check(rec) { return valid({ game: MARK, kind: 'match', v: 1, match: rec }); }
  function boardOk(x) {
    return !!x && nums(x.b, 24, -15, 15) && nums(x.bar, 2, 0, 15) && nums(x.pool, 2, 0, 15) && nums(x.off, 2, 0, 15);
  }
  function tapeOk(t) {
    if (!Array.isArray(t) || t.length !== 2) return false;
    return t.every(function (v, seat) {
      if (v === null) return true;
      if (!v || v.seat !== seat || !Array.isArray(v.throws) || !v.throws.length || v.throws.length > 40) return false;
      return v.throws.every(function (w) {
        if (!w || !nums(w.d, 2, 1, 6) || !boardOk(w.b0) || !Array.isArray(w.steps) || w.steps.length > 4) return false;
        if (w.gold !== undefined && !nums([w.gold], 1, 1, 6)) return false;
        if (w.sign !== undefined && ['7', '8', '21', 'BLOCKED'].indexOf(w.sign) < 0) return false;
        if (w.say !== undefined && (typeof w.say !== 'string' || w.say.length > 200)) return false;
        w.who = !!w.who;
        return w.steps.every(function (p) {
          return !!p && !!p.m && nums([p.m.from, p.m.to], 2, -1, 24) && nums([p.m.die], 1, 1, 6) && boardOk(p.b);
        });
      });
    });
  }
  function loadFile(file) {
    if (!file) return;
    if (file.size > 200000) { status('That file is not a Captain Jacko match.', true); return; }
    var rd = new FileReader();
    rd.onload = function () {
      var s = null;
      try { s = valid(JSON.parse(rd.result)); } catch (e) { s = null; }
      if (!s) { status('That file is not a Captain Jacko match.', true); return; }
      var saved = s.at, a = slots(), k = -1;
      a.forEach(function (x, i) { if (x && x.id === s.id) k = i; });
      if (k < 0) k = a.indexOf(null);
      if (k < 0) { status('All 5 slots are full. Delete a saved match first.', true); return; }
      saveTo(k, s);
      paint();
      status('Match loaded: ' + s.names[0] + ' v ' + s.names[1] + ', saved ' + when(saved) + '.');
    };
    rd.onerror = function () { status('That file could not be read.', true); };
    rd.readAsText(file);
  }

  function open(how) {
    view = how && (how.save || how.just || how.dimAll) ? how : null;
    clearTimeout(stT);
    $('saved-status').textContent = '';
    $('saved-status').classList.remove('bad');
    paint();
    Jacko.fade.show(win);
    if (how && how.line) status(how.line, false, true);
  }
  function close() { Jacko.fade.hide(ask); askK = null; view = null; Jacko.fade.hide(win); }
  function press() {
    if (Jacko.online && Jacko.online.linkedUp()) Jacko.online.savedPress();
    else if (Jacko.play.pausable()) open({ save: Jacko.play.saveRec() });
    else open();
  }
  function isOpen() { return !win.hidden; }

  function init() {
    win = $('saved-pop');
    box = $('saved-list');
    ask = $('saved-ask');
    $('btn-saved').addEventListener('click', press);
    $('saved-back').addEventListener('click', close);
    win.addEventListener('click', function (e) { if (e.target === win) close(); });
    var pick = $('saved-file');
    if (/Android/i.test(navigator.userAgent)) pick.removeAttribute('accept');
    $('saved-load').addEventListener('click', function () { pick.value = ''; pick.click(); });
    pick.addEventListener('change', function () { loadFile(pick.files && pick.files[0]); });

    box.addEventListener('click', function (e) {
      var b = e.target.closest('.sv-file, .sv-del, .sv-open');
      if (!b) return;
      var k = +b.dataset.k, rec = at(k);
      if (saving()) {
        if (!b.classList.contains('sv-open')) return;
        if (rec && rec.id !== view.save.id) askFor(k, 'SAVE MATCH', 'Replace this saved match?');
        else saveHere(k);
        return;
      }
      if (!rec) { paint(); return; }
      if (b.classList.contains('sv-file')) { saveFile(rec); return; }
      if (b.classList.contains('sv-del')) { askFor(k, 'DELETE MATCH', 'Are you sure?'); return; }
      close();
      Jacko.menu.close();
      Jacko.play.loadMatch(rec);
    });
    $('saved-yes').addEventListener('click', function () {
      var k = askK;
      askK = null;
      Jacko.fade.hide(ask);
      if (k === null) return;
      if (saving()) { saveHere(k); return; }
      var rec = at(k);
      empty(k);
      if (rec && Jacko.play.forget) Jacko.play.forget(rec.id);
      paint();
    });
    $('saved-no').addEventListener('click', function () { askK = null; Jacko.fade.hide(ask); });
  }

  return { keep: keep, won: won, newId: newId, check: check,
           init: init, open: open, close: close, isOpen: isOpen, askOpen: function () { return !ask.hidden; } };
})();
