// PLAY A FRIEND: one device makes a room, the other joins with its code (PeerJS). The only part that uses the internet.
// The room maker keeps the room open when the friend drops out or leaves, and the friend comes back with the same
// code. A friend who comes back with nothing in hand is sent the match as it stands.
Jacko.online = (function () {
  var PREFIX = 'captain-jacko-bg-';
  var CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
  var STILL = 10000;
  var store = Jacko.store;
  var $ = function (id) { return document.getElementById(id); };

  var role = null;
  var code = '';
  var token = '';
  var me = '', friend = '';
  var peer = null, conn = null, pending = null, pendingAt = 0;
  var status = 'off';
  var everLive = false;
  var outbox = [], outN = 0;
  var inN = 0, early = {};
  var queue = [], playing = false, waitT = null;
  var lastHeard = 0, joinT = null;
  var gameLine = '', lostNews = '';
  var win, P;
  var wait, waitWhy = '', stillT = null;
  var endAsk = false, endWait = false;

  function makeCode() {
    var s = 'bg';
    for (var i = 0; i < 6; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
    return s;
  }
  function clean(raw) {
    var s = String(raw || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (s.length === 6 && s.indexOf('bg') !== 0) s = 'bg' + s;
    return /^bg[a-z0-9]{6}$/.test(s) ? s : '';
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function seat() { return role === 'guest' ? 1 : 0; }
  function isHost() { return role === 'host'; }
  function live() { return status === 'live'; }
  function friendName() { return friend || (seat() === 0 ? 'Player 2' : 'Player 1'); }
  function hostName() { return seat() === 0 ? (me || 'Player 1') : friendName(); }

  function newPeer(id) {
    if (typeof Peer === 'undefined') return null;
    try { return id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 }); } catch (e) { return null; }
  }
  function hello(sync) {
    var h = { c: 'hello', name: me, token: token, seen: inN };
    if (sync) h.sync = sync;
    return h;
  }
  function raw(d) { if (conn && conn.open) { try { conn.send(d); } catch (e) { } } }

  function send(m) {
    if (!role) return;
    var e = { n: ++outN, m: m };
    outbox.push(e);
    if (live()) raw(e);
  }
  function resend(seen) {
    outbox.forEach(function (e) { if (e.n > seen) raw(e); });
  }
  // A fresh start for the numbered messages, when the match itself is handed over whole.
  function resetLink() {
    if (waitT) { clearTimeout(waitT); waitT = null; }
    outbox = []; outN = 0; inN = 0; early = {}; queue = []; playing = false;
  }

  function got(c, d) {
    if (!d || typeof d !== 'object') return;
    if (d.c === 'hello') { heard(c, d); return; }
    if (c !== conn) return;
    lastHeard = Date.now();
    if (d.c === 'ping') return;
    if (d.c === 'bye') { friendLeft(d.why); return; }
    if (d.c === 'full') { joinFail('That room already has two players.'); return; }
    if (d.c === 'names') { friend = String(d.name || '').slice(0, 20); putNames(); return; }
    if (d.c === 'emo') { showEmoji(d.name); return; }
    if (d.c === 'look') { takeLook(d); return; }
    if (d.c === 'menu') { takeMenu(d); return; }
    if (d.c === 'end') { if (role === 'guest') finish(friendName() + ' ended the match. The match is saved.'); return; }
    if (d.c === 'end-ask') { endAsked(); return; }
    if (d.c === 'end-no') { if (role === 'guest' && endWait) { endWait = false; Jacko.friend.note('PLAY A FRIEND', friendName() + ' wants to keep playing.'); } return; }
    if (d.c === 'end-cancel') { if (role === 'host' && endAsk) { endAsk = false; Jacko.friend.hide(); } return; }
    if (d.c === 'photo' || d.c === 'chat' || (typeof d.c === 'string' && d.c.indexOf('call-') === 0)) {
      if (Jacko.friend) Jacko.friend.got(d);
      return;
    }
    if (typeof d.n !== 'number' || d.n <= inN || d.n > inN + 500 || early[d.n]) return;
    if (!d.m || typeof d.m !== 'object' || typeof d.m.k !== 'string') return;
    early[d.n] = d.m;
    while (early[inN + 1]) { inN++; queue.push(early[inN]); delete early[inN]; }
    pump();
  }

  function pump() {
    if (playing || !queue.length || waitT) return;
    var m = queue[0];
    if (Jacko.motion.busy() || Jacko.dice.busy() || !P.net.ready(m)) {
      waitT = setTimeout(function () { waitT = null; pump(); }, 110);
      return;
    }
    queue.shift();
    playing = true;
    if (m.k === 'start') {
      if ([3, 5, 10].indexOf(m.match) >= 0) store.set('match', String(m.match));
      if (['classic', 'fresh', 'tjs'].indexOf(m.start) >= 0) store.set('start', m.start);
      store.set('p1col', m.p1col === 'dark' ? 'dark' : 'light');
      paintMenu();
      Jacko.menu.close();
      hideWin();
    }
    P.net.apply(m, function () {
      Jacko.motion.whenStill(function () { playing = false; pump(); }, 90);
    });
  }

  // A hello opens (or reopens) the link. The room maker turns away a second friend only while the
  // seat is taken; a friend it does not know gets the match as it stands, in the hello itself.
  function heard(c, d) {
    var sync = null;
    if (role === 'host') {
      if (token && d.token !== token && live() && conn && conn !== c && conn.open) {
        try { c.send({ c: 'full' }); } catch (e) {}
        setTimeout(function () { try { c.close(); } catch (e) {} }, 300);
        return;
      }
      var fresh = d.token !== token;
      token = d.token;
      if (fresh && everLive) sync = P.syncData();
    }
    if (conn && conn !== c) { try { conn.close(); } catch (e) {} }
    conn = c;
    if (pending === c) pending = null;
    friend = String(d.name || '').slice(0, 20);
    lastHeard = Date.now();
    var given = role === 'guest' && d.sync && typeof d.sync === 'object' ? d.sync : null;
    if (sync || given) resetLink();
    if (role === 'host') { raw(hello(sync)); sendLook(); sendMenu(); }
    var back = status === 'lost';
    status = 'live';
    if (!sync && !given) resend(d.seen || 0);
    putNames();
    paintLights();
    hideWait();
    if (joinT) { clearTimeout(joinT); joinT = null; }
    if (role === 'guest') { joinLine(''); $('fr-join-go').disabled = false; }
    if (!everLive) {
      everLive = true;
      if (given && !given.idle) { setupLive(); hideWin(); Jacko.menu.close(); P.resume(given); paintMenu(); backNews(); }
      else firstLive();
    } else {
      if (sync && !sync.idle) { P.resume(sync); paintMenu(); }
      else if (given) {
        if (given.idle) { P.park(guestLine()); Jacko.menu.open(); }
        else { P.resume(given); paintMenu(); }
      }
      if (back || sync || given) backNews();
    }
    if (Jacko.friend) Jacko.friend.linked();
    paintWin();
  }

  function backNews() {
    if (P.caption() !== lostNews) gameLine = P.caption();
    var news = 'Back online with <b>' + esc(friendName()) + '</b>.';
    P.say(news);
    setTimeout(function () { if (P.caption() === news && gameLine) P.say(gameLine); }, 2200);
  }

  function guestLine() { return 'Connected to <b>' + esc(friendName()) + '</b> — <b>' + esc(friendName()) + '</b> sets up the match.'; }

  // Both screens in a room: the side of the table, the menu locks, and the way out only through Leave Room.
  function setupLive() {
    Jacko.stage.setSide(seat());
    store.set('mode', 'online');
    paintMenu();
    lockNames(true);
    lockMenu(role === 'guest');
    lockLook(role === 'guest');
    lockMode(true);
  }

  function firstLive() {
    setupLive();
    P.park(role === 'host'
      ? 'Connected to <b>' + esc(friendName()) + '</b> — choose the points and starting position, then press Start Game.'
      : guestLine());
    showScreen('live');
    setTimeout(function () {
      hideWin();
      Jacko.menu.open();
    }, 1400);
  }

  function lost() {
    if (status !== 'live') return;
    status = 'lost';
    var c = conn; conn = null;
    try { if (c) c.close(); } catch (e) {}
    paintLights();
    paintWin();
    gameLine = P.caption();
    lostNews = 'Connection lost — reconnecting to <b>' + esc(friendName()) + '</b>…';
    P.say(lostNews);
    if (role === 'guest') rejoin();
    else showWait('drop');
  }

  setInterval(function () {
    if (!role) return;
    if (live()) {
      raw({ c: 'ping' });
      if (Date.now() - lastHeard > 8000) lost();
      return;
    }
    if (status === 'lost') kick();
  }, 2000);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || !role) return;
    if (live() && Date.now() - lastHeard > 8000) lost();
    else if (status === 'lost') kick();
  });

  function kick() {
    if (role === 'guest') { rejoin(); return; }
    if (!peer || peer.destroyed) openRoom();
    else if (peer.disconnected) { try { peer.reconnect(); } catch (e) {} }
  }

  function host() {
    shut();
    role = 'host';
    me = store.get('name1') || '';
    code = makeCode();
    status = 'opening';
    showScreen('create');
    paintCode();
    hostLine('Opening the room', true);
    openRoom();
  }

  // A friend match loaded from Saved Matches on the room maker's device: the room opens again on its
  // old code and waits for the friend.
  function reopen(r) {
    var c = clean(r && r.room);
    if (!c || typeof Peer === 'undefined') return false;
    shut();
    role = 'host';
    code = c;
    token = '';
    everLive = true;
    me = String((r.raw && r.raw[0]) || '').slice(0, 20);
    friend = String(r.friend || (r.raw && r.raw[1]) || '').slice(0, 20);
    status = 'lost';
    setupLive();
    putNames();
    paintCode();
    openRoom();
    showWait('drop');
    if (Jacko.friend) Jacko.friend.paint();
    return true;
  }

  function openRoom() {
    var p = newPeer(PREFIX + code);
    if (!p) { hostLine('This browser cannot play online.'); return; }
    peer = p;
    p.on('open', function () {
      if (peer !== p) return;
      if (status === 'opening') { status = 'waiting'; hostLine('Waiting for your friend to join', true); }
    });
    p.on('call', function (mc) { answerCall(p, mc); });
    p.on('connection', function (c) {
      if (peer !== p) return;
      c.on('data', function (d) { got(c, d); });
      c.on('close', function () { if (conn === c) lost(); });
      c.on('error', function () { if (conn === c) lost(); });
    });
    p.on('disconnected', function () {
      if (peer !== p || p.destroyed) return;
      setTimeout(function () { if (peer === p && p.disconnected && !p.destroyed) { try { p.reconnect(); } catch (e) {} } }, 1500);
    });
    p.on('error', function (err) {
      if (peer !== p) return;
      var t = err && err.type;
      if (t === 'unavailable-id') {
        try { p.destroy(); } catch (e) {}
        peer = null;
        if (!everLive) { code = makeCode(); paintCode(); openRoom(); }
        else setTimeout(function () { if (role === 'host' && !peer) openRoom(); }, 3000);
        return;
      }
      if (t === 'browser-incompatible') { hostLine('This browser cannot play online.'); return; }
      if (!everLive) hostLine('No internet connection — trying again', true);
      setTimeout(function () {
        if (peer !== p) return;
        if (p.destroyed) { peer = null; openRoom(); }
        else if (p.disconnected) { try { p.reconnect(); } catch (e) {} }
      }, 2500);
    });
  }

  function join(rawCode) {
    var c = clean(rawCode);
    if (!c) { joinLine('Type the room code — it starts with bg and has 8 letters.'); shake(); return; }
    shut();
    role = 'guest';
    me = store.get('name1') || '';
    code = c;
    token = makeCode() + makeCode();
    status = 'joining';
    joinLine('Looking for room ' + code, true);
    $('fr-join-go').disabled = true;
    joinT = setTimeout(function () {
      if (status === 'joining') joinLine('Still looking — check the code, and that the room is open', true);
    }, 10000);
    rejoin();
  }

  function rejoin() {
    if (role !== 'guest') return;
    if (!peer || peer.destroyed) {
      var p = newPeer();
      if (!p) { joinFail('This browser cannot play online.'); return; }
      peer = p;
      p.on('open', function () { if (peer === p) dial(); });
      p.on('call', function (mc) { answerCall(p, mc); });
      p.on('disconnected', function () {
        if (peer !== p || p.destroyed) return;
        setTimeout(function () { if (peer === p && p.disconnected && !p.destroyed) { try { p.reconnect(); } catch (e) {} } }, 1500);
      });
      p.on('error', function (err) {
        if (peer !== p) return;
        var t = err && err.type;
        if (t === 'peer-unavailable') {
          if (!everLive) joinFail('No room with that code. Check it and try again.');
          return;
        }
        if (!everLive && status === 'joining') joinLine('No internet connection — trying again', true);
        if (p.destroyed) peer = null;
      });
      return;
    }
    if (peer.disconnected) { try { peer.reconnect(); } catch (e) {} return; }
    if (peer.open) dial();
  }

  function dial() {
    if (role !== 'guest' || (conn && conn.open)) return;
    if (pending && Date.now() - pendingAt < 6000) return;
    if (pending) { try { pending.close(); } catch (e) {} }
    var c = peer.connect(PREFIX + code, { reliable: true });
    if (!c) return;
    pending = c;
    pendingAt = Date.now();
    c.on('open', function () { try { c.send(hello()); } catch (e) {} });
    c.on('data', function (d) { got(c, d); });
    c.on('close', function () { if (conn === c) lost(); });
    c.on('error', function () { if (conn === c) lost(); });
  }

  // A video call from the friend, on the same link; anything else is turned away.
  function answerCall(p, mc) {
    if (peer === p && conn && mc.peer === conn.peer && Jacko.friend) Jacko.friend.incoming(mc);
    else { try { mc.close(); } catch (e) {} }
  }

  function joinFail(line) {
    shut();
    showScreen('join');
    joinLine(line);
    shake();
  }

  // Closes the room or the link. The goodbye says why: 'left' for Leave Room, 'closed' when the game closes.
  function shut(why) {
    if (conn && conn.open) raw({ c: 'bye', why: why || 'left' });
    var p = peer, c = conn, q = pending;
    peer = conn = pending = null;
    setTimeout(function () {
      try { if (c) c.close(); } catch (e) {}
      try { if (q) q.close(); } catch (e) {}
      try { if (p) p.destroy(); } catch (e) {}
    }, 200);
    if (joinT) { clearTimeout(joinT); joinT = null; }
    resetLink();
    hideWait();
    role = null; status = 'off'; everLive = false; token = '';
    Jacko.stage.setSide(0);
    lockMenu(false);
    lockLook(false);
    lockNames(false);
    lockMode(false);
    paintLights();
    var go = $('fr-join-go'); if (go) go.disabled = false;
  }

  function leave() {
    var was = everLive;
    shut();
    if (!was) return;
    if (store.get('mode') === 'online') store.set('mode', 'local');
    paintMenu();
    P.takeOver('Left the room — the match carries on as 2 Players on this device.');
  }

  // The friend said goodbye. The room maker keeps the room open and waits; the friend's device, when the
  // room maker leaves or closes the game, carries on as 2 Players.
  function friendLeft(why) {
    if (role === 'host') {
      if (status !== 'live') return;
      status = 'lost';
      var c = conn; conn = null;
      setTimeout(function () { try { if (c) c.close(); } catch (e) {} }, 200);
      paintLights();
      paintWin();
      showWait('left');
      return;
    }
    var name = friendName(), kept = why === 'closed' && P.saved();
    shut();
    if (store.get('mode') === 'online') store.set('mode', 'local');
    paintMenu();
    P.takeOver('<b>' + esc(name) + '</b> left the room — the match carries on as 2 Players on this device.');
    if (!win.hidden) showScreen('choose');
    if (Jacko.friend) Jacko.friend.note('PLAY A FRIEND', kept
      ? name + '\'s game has closed. The match is kept in Saved Matches.'
      : name + ' left the room. The match carries on as 2 Players on this device.');
  }

  // THE WAITING WINDOW, on the room maker's screen while the friend's seat is empty. After 10 seconds
  // it offers CLOSE ROOM, which asks first; NO goes back to waiting, for as long as it takes.
  function showWait(why) {
    if (role !== 'host' || !wait) return;
    waitWhy = why;
    paintWait(false);
    Jacko.fade.show(wait.pop);
    clearTimeout(stillT);
    stillT = setTimeout(function () { stillT = null; if (!wait.pop.hidden && wait.ask.hidden) paintWait(true); }, STILL);
  }
  function paintWait(still) {
    var n = friendName(), left = waitWhy === 'left';
    wait.title.textContent = 'PLAY A FRIEND';
    wait.sub.textContent = left ? n + ' left the room.' : 'Connection to ' + n + ' lost.';
    wait.line.textContent = (still ? 'Still waiting for ' : 'Waiting for ') + n + (left ? ' to come back' : ' to reconnect');
    wait.line.hidden = false;
    wait.row.hidden = !still;
    wait.ask.hidden = true;
  }
  function askClose() {
    wait.title.textContent = 'CLOSE ROOM';
    wait.sub.textContent = 'Are you sure?';
    wait.line.hidden = true;
    wait.row.hidden = true;
    wait.ask.hidden = false;
  }
  function hideWait() {
    clearTimeout(stillT);
    stillT = null;
    if (wait && !wait.pop.hidden) Jacko.fade.hide(wait.pop);
  }

  // ENDING A FRIEND MATCH from Saved Matches. The match is already saved at the last hand-over on both
  // devices. Player 1 ends it; Player 2 asks Player 1. Ending closes the room on both screens and shows
  // the match in its slot. Before anything is saved, Saved Matches only shows, with every slot greyed.
  function savedPress() {
    var F = Jacko.friend;
    if (!P.saved() || (role === 'guest' && !live())) { Jacko.saves.open({ dimAll: true }); return; }
    if (role === 'host') {
      F.ask('PLAY A FRIEND', 'The game is auto saved. Do you want to end the match?', 'YES', 'NO', endMatch);
      return;
    }
    F.ask('PLAY A FRIEND', 'The game is auto saved. Do you want to ask ' + friendName() + ' to end the match?', 'YES', 'NO', askEnd);
  }
  function askEnd() {
    if (role !== 'guest' || !live()) return;
    endWait = true;
    raw({ c: 'end-ask' });
    Jacko.friend.ask('PLAY A FRIEND', 'Waiting for ' + friendName() + '…', null, 'CANCEL', null, function () {
      if (!endWait) return;
      endWait = false;
      raw({ c: 'end-cancel' });
    });
  }
  function endAsked() {
    if (role !== 'host' || !P.saved()) return;
    endAsk = true;
    Jacko.friend.ask('PLAY A FRIEND', friendName() + ' wants to end the match. The game is auto saved.', 'YES', 'NO',
      function () { endAsk = false; endMatch(); },
      function () { endAsk = false; raw({ c: 'end-no' }); });
  }
  function endMatch() {
    if (role !== 'host') return;
    raw({ c: 'end' });
    finish('Match saved.');
  }
  function finish(line) {
    var id = P.saveName();
    endAsk = endWait = false;
    Jacko.friend.hide();
    shut('ended');
    store.set('mode', 'local');
    paintMenu();
    P.stopMatch(line);
    hideWin();
    Jacko.menu.open();
    Jacko.saves.open({ just: id, line: line });
  }

  function putNames() {
    var mine = seat() + 1, theirs = 2 - seat();
    store.set('name' + mine, me);
    store.set('name' + theirs, friend);
    $('set-name' + mine).value = me;
    $('set-name' + theirs).value = friend;
    Jacko.showNames();
    paintLights();
  }
  function lockNames(on) {
    ['1', '2'].forEach(function (n) {
      var inp = $('set-name' + n);
      inp.disabled = on && +n !== seat() + 1;
    });
  }
  function nameTyped(n) {
    if (!role || +n !== seat() + 1) return;
    me = $('set-name' + n).value.trim().slice(0, 20);
    raw({ c: 'names', name: me });
  }

  // Checker speed and the board theme: the room maker's, on both screens.
  function sendLook() {
    if (role === 'host') raw({ c: 'look', speed: store.get('speed'), theme: store.get('theme') });
  }
  function takeLook(d) {
    if (role !== 'guest') return;
    if (['slow', 'smooth', 'fast'].indexOf(d.speed) >= 0) store.set('speed', d.speed);
    var th = Jacko.THEMES.some(function (t) { return t.id === d.theme; }) ? d.theme : '';
    var turn = th && th !== store.get('theme');
    if (th) store.set('theme', th);
    if (Jacko.showLook) Jacko.showLook();
    if (turn) Jacko.showTheme(true);
  }
  // The room maker's New Match picks (points, starting position, Player 1 checkers), live on the friend's
  // menu; the friend's board shows the checker colour while the room maker's menu is open.
  function sendMenu() {
    if (role === 'host') raw({ c: 'menu', match: store.get('match'), start: store.get('start'),
                               p1col: store.get('p1col'), open: Jacko.menu.isOpen() });
  }
  function takeMenu(d) {
    if (role !== 'guest') return;
    var menu = $('menu');
    function has(k, v) {
      return !!menu.querySelector('[data-pick="' + k + '"] .opt[data-v="' + String(v).replace(/[^a-z0-9-]/gi, '') + '"]');
    }
    if (has('match', d.match)) store.set('match', String(d.match));
    if (has('start', d.start)) store.set('start', String(d.start));
    store.set('p1col', d.p1col === 'dark' ? 'dark' : 'light');
    paintMenu();
    if (d.open) P.previewColour(store.get('p1col'));
    else P.keepColour();
  }
  function lockLook(on) {
    document.querySelectorAll('#settings-pop [data-pick="speed"], #theme-row').forEach(function (row) {
      row.classList.toggle('net-locked', on);
      row.querySelectorAll('.opt').forEach(function (b) { b.disabled = on; });
    });
  }
  // In a room, Play Computer and 2 Players are greyed on both screens: the way out is Leave Room.
  function lockMode(on) {
    document.querySelectorAll('#menu [data-pick="mode"] .opt:not([data-v="online"])').forEach(function (b) {
      b.disabled = on;
      b.classList.toggle('net-off', on);
    });
  }

  function emoji(name) { if (live()) raw({ c: 'emo', name: name }); }
  function showEmoji(name) {
    var img = document.querySelector('#emoji-grid [data-emo="' + String(name).replace(/[^a-z0-9]/g, '') + '"] img');
    if (img) Jacko.flyEmoji(img.src, name);
  }

  function paintLights() {
    [0, 1].forEach(function (s) {
      var dot = $('net-p' + (s + 1));
      if (!dot) return;
      var theirs = role && s !== seat();
      dot.classList.toggle('live', !!theirs && status === 'live');
      dot.classList.toggle('lost', !!theirs && status === 'lost');
      dot.title = theirs ? (status === 'live' ? 'Online' : 'Reconnecting…') : '';
    });
    if (Jacko.friend) Jacko.friend.paint();
  }

  function paintMenu() {
    var menu = $('menu');
    ['mode', 'ai', 'match', 'start', 'p1col'].forEach(function (k) {
      var row = menu.querySelector('[data-pick="' + k + '"]');
      if (row) row.querySelectorAll('.opt').forEach(function (b) { b.classList.toggle('on', b.dataset.v === String(store.get(k))); });
    });
    var off = store.get('mode') !== 'ai', ai = menu.querySelector('.only-ai');
    ai.classList.toggle('off', off);
    ai.querySelectorAll('button').forEach(function (b) { b.disabled = off; });
  }
  function lockMenu(on) {
    var menu = $('menu'), start = $('btn-start');
    menu.classList.toggle('net-guest', on);
    menu.querySelectorAll('[data-pick="match"] .opt, [data-pick="start"] .opt, [data-pick="p1col"] .opt').forEach(function (b) { b.disabled = on; });
    start.disabled = on;
    start.textContent = on ? hostName() + ' starts the match' : 'Start Game';
  }

  function showWin() {
    Jacko.fade.show(win);
    showScreen(role && everLive ? 'live' : role === 'host' ? 'create' : role === 'guest' ? 'join' : 'choose');
    paintWin();
  }
  function hideWin() { Jacko.fade.hide(win); }

  function showScreen(name) {
    win.querySelectorAll('[data-screen]').forEach(function (s) { s.hidden = s.dataset.screen !== name; });
    win.dataset.on = name;
  }

  function paintWin() {
    if (!win || win.hidden) return;
    var on = win.dataset.on;
    if (on === 'live') {
      $('fr-live-name').textContent = friendName();
      $('fr-live-line').textContent = status === 'live' ? 'Connected' : 'Reconnecting…';
      win.querySelector('.fr-tick').classList.toggle('lost', status !== 'live');
    }
  }

  function paintCode() {
    var box = $('fr-code');
    box.innerHTML = '';
    code.split('').forEach(function (ch, i) {
      var s = document.createElement('span');
      s.textContent = ch;
      s.style.animationDelay = (i * 0.06) + 's';
      box.appendChild(s);
    });
  }

  function line(id, text, busy) {
    var el = $(id);
    el.textContent = text;
    el.classList.toggle('busy', !!busy);
  }
  function hostLine(t, busy) { line('fr-host-status', t, busy); }
  function joinLine(t, busy) { line('fr-join-status', t, busy); }
  function shake() {
    var b = $('fr-input');
    b.classList.remove('shake');
    void b.offsetWidth;
    b.classList.add('shake');
  }

  function share() {
    var btn = $('fr-share'), text = 'Play Captain Jacko\'s Backgammon with me! Room code: ' + code;
    function done(word) {
      btn.textContent = word;
      setTimeout(function () { btn.textContent = navigator.share ? 'Share code' : 'Copy code'; }, 1600);
    }
    if (navigator.share) { navigator.share({ text: text }).catch(function () {}); return; }
    var ok = function () { done('Copied!'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(ok, old);
    else old();
    function old() {
      var t = document.createElement('textarea');
      t.value = code;
      t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); ok(); } catch (e) { done('Select the code'); }
      t.remove();
    }
  }

  function init() {
    P = Jacko.play;
    win = $('friend-pop');
    wait = { pop: $('wait-pop'), title: $('wait-title'), sub: $('wait-sub'), line: $('wait-line'),
             row: $('wait-row'), ask: $('wait-ask') };

    var card = document.querySelector('#menu [data-pick="mode"] [data-v="online"]');
    card.addEventListener('click', function (e) { e.stopPropagation(); showWin(); }, true);

    $('fr-make').addEventListener('click', host);
    $('fr-join').addEventListener('click', function () {
      showScreen('join');
      joinLine('');
    });
    $('fr-join-go').addEventListener('click', function () { join($('fr-input').value); });
    $('fr-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') join($('fr-input').value); });
    $('fr-share').textContent = navigator.share ? 'Share code' : 'Copy code';
    $('fr-share').addEventListener('click', share);
    $('fr-leave').addEventListener('click', function () { leave(); showScreen('choose'); });
    $('fr-play').addEventListener('click', function () { hideWin(); Jacko.menu.open(); });
    $('fr-back').addEventListener('click', function () {
      var on = win.dataset.on;
      if ((on === 'create' || on === 'join') && !everLive) { shut(); showScreen('choose'); return; }
      hideWin();
    });
    win.addEventListener('click', function (e) { if (e.target === win) hideWin(); });

    $('wait-close').addEventListener('click', askClose);
    $('wait-no').addEventListener('click', function () { paintWait(true); });
    $('wait-yes').addEventListener('click', function () { hideWait(); leave(); });

    ['1', '2'].forEach(function (n) {
      $('set-name' + n).addEventListener('input', function () { nameTyped(n); });
    });

    [1, 2].forEach(function (n) {
      var dot = document.createElement('i');
      dot.className = 'net-dot';
      dot.id = 'net-p' + n;
      $('card-p' + n).appendChild(dot);
    });

    window.addEventListener('pagehide', function () { if (conn && conn.open) raw({ c: 'bye', why: 'closed' }); });
  }

  return { init: init, send: send, seat: seat, isHost: isHost, live: live, emoji: emoji, lookChanged: sendLook, menuChanged: sendMenu,
           linkedUp: function () { return !!role && everLive; }, reopen: reopen, code: function () { return code; }, savedPress: savedPress,
           friendName: friendName, friendRaw: function () { return friend; },
           talk: raw, peer: function () { return peer; }, remote: function () { return conn && conn.open ? conn.peer : null; } };
})();
