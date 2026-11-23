window.Jacko = window.Jacko || {};

Jacko.friend = (function () {
  var $ = function (id) { return document.getElementById(id); };
  var O, V, game, plate, photoEl, letterEl, roundVid, menu, callBtn, photoBtn, fileIn;
  var win, themVid, meVid, voice, winLine, muteBtn, nudgeBtn;
  var pop, popTitle, popSub, popYes, popNo, popYesDo = null, popNoDo = null;
  var chatBtn, chat, chatList, chatIn, chatSend, badge, unread = 0;
  var CHAT_MAX = 200;

  var WAIT = 30000;
  var PHOTO = 192;
  var NUDGE_MS = 1500, nudgeT = null, nudgeEl = null;
  var BLOCKED = 'The camera or microphone is blocked. Allow them for this game in the browser\'s settings, then try again.';

  var myPhoto = '', theirPhoto = '';
  var state = 'idle';
  var mine = null, media = null, waitT = null;
  var shrunk = false, muted = false;

  function phone() { return document.documentElement.classList.contains('phone'); }

  function paint() {
    if (!plate) return;
    if (!O.linkedUp()) {
      if (state !== 'idle') hangUp('');
      theirPhoto = '';
      closeMenu();
      clearChat();
      if (!plate.hidden) { plate.hidden = true; reflow(); }
      return;
    }
    var appear = plate.hidden;
    plate.hidden = false;
    var live = O.live();
    plate.classList.toggle('lost', !live);
    plate.setAttribute('aria-label', O.friendName() + (live ? ' is online' : ' is reconnecting'));
    if (!live && state !== 'idle') hangUp('The video call ended because the connection dropped.');
    var raw = String(O.friendRaw() || '').trim();
    var mark = raw ? raw.charAt(0).toUpperCase() : 'P' + (2 - O.seat());
    letterEl.textContent = mark;
    letterEl.classList.toggle('two', mark.length > 1);
    if (theirPhoto) {
      photoEl.setAttribute('href', theirPhoto);
      photoEl.style.display = '';
      letterEl.style.display = 'none';
    } else {
      photoEl.removeAttribute('href');
      photoEl.style.display = 'none';
      letterEl.style.display = '';
    }
    callBtn.textContent = 'Video call ' + O.friendName();
    chatBtn.textContent = 'Chat with ' + O.friendName();
    photoBtn.textContent = myPhoto ? 'Change my photo' : 'Add my photo';
    chatSend.disabled = !live;
    if (appear) reflow(); else place();
  }

  var GAP = 8;
  var SIDE_PAD = 16, SIDE_MIN = 140, SIDE_MAX = 280;
  function onLeft() { return O.seat() === 1; }
  function reflow() {
    if (Jacko.stage && Jacko.stage.placeCards) Jacko.stage.placeCards();
    place();
  }
  function place() {
    if (!plate) return;
    var left = !plate.hidden && onLeft();
    game.classList.toggle('logo-right', left && phone());
    if (plate.hidden) return;
    plate.classList.toggle('left', left);
    if (win) win.classList.toggle('from-left', left);
    plate.style.removeProperty('--fp-t');
    plate.style.removeProperty('--fp-r');
    plate.style.removeProperty('--fp-l');
    plate.style.removeProperty('--fp-big');
    plate.style.removeProperty('--fp-vx');
    plate.classList.remove('side');
    if (!phone()) {
      var g = V.rect(game), c = V.rect($(left ? 'card-p1' : 'card-p2')), mid = (c.left + c.right) / 2;
      var top = c.bottom - g.top + GAP;
      plate.style.setProperty('--fp-t', Math.round(top) + 'px');
      if (left) plate.style.setProperty('--fp-l', Math.round(mid - g.left) + 'px');
      else plate.style.setProperty('--fp-r', Math.round(g.right - mid) + 'px');
      var bl = parseFloat(game.style.getPropertyValue('--board-l')),
          br = parseFloat(game.style.getPropertyValue('--board-r')),
          bar = parseFloat(game.style.getPropertyValue('--bar-t'));
      var gapW = left ? bl : g.width - br;
      var size = Math.min(gapW - 2 * SIDE_PAD, SIDE_MAX, (bar || g.height) - top - SIDE_PAD);
      if (size >= SIDE_MIN) {
        plate.classList.add('side');
        plate.style.setProperty('--fp-big', Math.floor(size) + 'px');
        plate.style.setProperty('--fp-vx', Math.round(gapW / 2) + 'px');
      }
    }
    if (!menu.hidden) placeMenu();
  }
  function placeMenu() {
    var g = V.rect(game), p = V.rect(plate);
    menu.style.top = Math.round(p.bottom - g.top + 6) + 'px';
    if (onLeft()) {
      menu.style.left = Math.round(p.left - g.left) + 'px';
      menu.style.right = '';
    } else {
      menu.style.right = Math.round(g.right - p.right) + 'px';
      menu.style.left = '';
    }
  }
  function openMenu() {
    Jacko.fade.show(menu);
    placeMenu();
    plate.classList.add('on');
  }
  function closeMenu() {
    if (!menu || menu.hidden) return;
    Jacko.fade.hide(menu);
    plate.classList.remove('on');
  }

  function tapPlate(e) {
    e.stopPropagation();
    if (state === 'on' || state === 'joining') { setShrunk(!shrunk); return; }
    if (state !== 'idle') return;
    if (menu.hidden) openMenu(); else closeMenu();
  }

  function pickedPhoto() {
    var f = fileIn.files && fileIn.files[0];
    fileIn.value = '';
    if (!f) return;
    var url = URL.createObjectURL(f), img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas'), s = Math.min(img.naturalWidth, img.naturalHeight);
      c.width = c.height = PHOTO;
      c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, PHOTO, PHOTO);
      URL.revokeObjectURL(url);
      myPhoto = c.toDataURL('image/jpeg', 0.85);
      O.talk({ c: 'photo', data: myPhoto });
      paint();
      note('YOUR PHOTO', 'Your photo is now on ' + O.friendName() + '\'s screen.');
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      note('YOUR PHOTO', 'That picture could not be opened. Try a different photo.');
    };
    img.src = url;
  }

  function ask(title, sub, yes, no, onYes, onNo) {
    popTitle.textContent = title;
    popSub.textContent = sub;
    popYes.textContent = yes || '';
    popYes.hidden = !yes;
    popNo.textContent = no || '';
    popNo.hidden = !no;
    popYesDo = onYes || null;
    popNoDo = onNo || null;
    Jacko.fade.show(pop);
  }
  function note(title, sub) { ask(title, sub, 'OK', null, null, null); }
  function hidePop() { Jacko.fade.hide(pop); popYesDo = popNoDo = null; }

  function camera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error('none'));
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' },
      audio: { echoCancellation: true, noiseSuppression: true } });
  }
  function stopTracks(s) {
    if (s) s.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
  }
  function waitFor(what, line) {
    clearTimeout(waitT);
    waitT = setTimeout(function () {
      if (state !== what) return;
      O.talk({ c: 'call-cancel' });
      hangUp(line);
    }, WAIT);
  }

  function startCall() {
    if (state !== 'idle' || !O.live()) return;
    state = 'calling';
    camera().then(function (s) {
      if (state !== 'calling') { stopTracks(s); return; }
      mine = s;
      meVid.srcObject = s;
      O.talk({ c: 'call-ask' });
      ask('VIDEO CALL', 'Calling ' + O.friendName() + '…', null, 'CANCEL', null, function () {
        O.talk({ c: 'call-cancel' });
        hangUp('');
      });
      waitFor('calling', O.friendName() + ' did not answer.');
    }, function () {
      state = 'idle';
      note('VIDEO CALL', BLOCKED);
    });
  }

  function accept() {
    camera().then(function (s) {
      if (state !== 'asked') { stopTracks(s); return; }
      mine = s;
      meVid.srcObject = s;
      join();
    }, function () {
      O.talk({ c: 'call-no' });
      state = 'idle';
      note('VIDEO CALL', BLOCKED);
    });
  }
  function join() {
    state = 'joining';
    O.talk({ c: 'call-yes' });
    openWin('Connecting…');
    waitFor('joining', 'The video call could not connect.');
  }

  function addMsg(text, mine) {
    var m = document.createElement('div');
    m.className = 'chat-msg ' + (mine ? 'mine' : 'theirs');
    m.textContent = text;
    chatList.appendChild(m);
    chatList.scrollTop = chatList.scrollHeight;
  }
  function sendMsg() {
    var t = chatIn.value.trim().slice(0, CHAT_MAX);
    if (!t || !O.live()) return;
    O.talk({ c: 'chat', t: t });
    addMsg(t, true);
    chatIn.value = '';
  }
  function paintBadge() {
    badge.hidden = !unread;
    badge.textContent = unread > 9 ? '9+' : String(unread);
  }
  function openChat() {
    closeMenu();
    unread = 0;
    paintBadge();
    chat.classList.remove('tight');
    Jacko.fade.show(chat);
    fitChat();
    chatList.scrollTop = chatList.scrollHeight;
    if (!touch) chatIn.focus();
  }
  function closeChat() {
    chatIn.blur();
    if (!chat.hidden) Jacko.fade.hide(chat);
  }
  function clearChat() {
    if (!chat) return;
    closeChat();
    chatList.innerHTML = '';
    chatIn.value = '';
    unread = 0;
    paintBadge();
  }
  var touch = (navigator.maxTouchPoints || 0) > 0 ||
              (window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches);
  function fitChat() {
    if (!chat || chat.hidden) return;
    var vv = window.visualViewport;
    var vt = vv ? vv.offsetTop : 0, vl = vv ? vv.offsetLeft : 0;
    var vw = vv ? vv.width : window.innerWidth, vh = vv ? vv.height : window.innerHeight;
    var box;
    if (V.turned()) box = { top: 0, left: vt, width: vh, height: V.h() };
    else box = { top: vt, left: vl, width: vw, height: vh };
    chat.style.top = Math.round(box.top) + 'px';
    chat.style.left = Math.round(box.left) + 'px';
    chat.style.width = Math.round(box.width) + 'px';
    chat.style.height = Math.round(box.height) + 'px';
    chat.classList.toggle('tight', box.height < 260);
    chatList.scrollTop = chatList.scrollHeight;
  }

  function got(d) {
    if (d.c === 'chat') {
      var t = typeof d.t === 'string' ? d.t.trim().slice(0, CHAT_MAX) : '';
      if (!t) return;
      addMsg(t, false);
      if (chat.hidden) { unread++; paintBadge(); }
      return;
    }
    if (d.c === 'photo') {
      if (typeof d.data === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(d.data) && d.data.length < 400000) {
        theirPhoto = d.data;
        paint();
      }
      return;
    }
    var who = O.friendName();
    if (d.c === 'call-ask') {
      if (state === 'calling' && !O.isHost() && mine) { hidePop(); join(); return; }
      if (state === 'calling') return;
      if (state !== 'idle') { O.talk({ c: 'call-no', busy: true }); return; }
      state = 'asked';
      closeMenu();
      ask('VIDEO CALL', who + ' wants to video call.', 'ACCEPT', 'DECLINE', accept, function () {
        O.talk({ c: 'call-no' });
        state = 'idle';
      });
      return;
    }
    if (d.c === 'call-yes') {
      if (state === 'calling') { hidePop(); dial(); }
      return;
    }
    if (d.c === 'call-no') {
      if (state === 'calling') hangUp(who + (d.busy ? ' is busy right now.' : ' declined the video call.'));
      return;
    }
    if (d.c === 'call-cancel') {
      if (state === 'asked' || state === 'joining') hangUp(state === 'asked' ? who + ' stopped calling.' : '');
      return;
    }
    if (d.c === 'call-end') {
      if (state !== 'idle') hangUp(who + ' ended the video call.');
      return;
    }
    if (d.c === 'call-nudge') {
      if (state === 'on') shake();
    }
  }

  function nudge() {
    if (state !== 'on' || nudgeBtn.disabled) return;
    O.talk({ c: 'call-nudge' });
    nudgeBtn.disabled = true;
    setTimeout(function () { nudgeBtn.disabled = false; }, NUDGE_MS);
  }
  function shake() {
    stopShake();
    nudgeEl = shrunk ? plate : win;
    void nudgeEl.offsetWidth;
    nudgeEl.classList.add('nudged');
    nudgeT = setTimeout(stopShake, NUDGE_MS);
  }
  function stopShake() {
    clearTimeout(nudgeT);
    nudgeT = null;
    if (nudgeEl) nudgeEl.classList.remove('nudged');
    nudgeEl = null;
  }

  function dial() {
    state = 'joining';
    openWin('Connecting…');
    var p = O.peer(), to = O.remote(), mc = null;
    try { if (p && to && mine) mc = p.call(to, mine); } catch (e) { mc = null; }
    if (!mc) { O.talk({ c: 'call-end' }); hangUp('The video call could not connect.'); return; }
    hook(mc);
    waitFor('joining', 'The video call could not connect.');
  }

  function incoming(mc) {
    if (state !== 'joining' || !mine) { try { mc.close(); } catch (e) {} return; }
    try { mc.answer(mine); } catch (e) { O.talk({ c: 'call-end' }); hangUp('The video call could not connect.'); return; }
    hook(mc);
  }

  function hook(mc) {
    media = mc;
    mc.on('stream', function (s) {
      if (media !== mc) return;
      clearTimeout(waitT);
      state = 'on';
      [themVid, roundVid, voice].forEach(function (el) {
        el.srcObject = s;
        var go = el.play && el.play();
        if (go && go.catch) go.catch(function () {});
      });
      winLine.textContent = '';
      plate.classList.toggle('video', shrunk);
    });
    mc.on('close', function () { if (media === mc && state !== 'idle') hangUp(O.friendName() + ' ended the video call.'); });
    mc.on('error', function () { if (media === mc && state !== 'idle') hangUp('The video call dropped.'); });
  }

  function hangUp(line) {
    clearTimeout(waitT);
    waitT = null;
    var mc = media;
    media = null;
    if (mc) { try { mc.close(); } catch (e) {} }
    stopTracks(mine);
    mine = null;
    [themVid, roundVid, meVid, voice].forEach(function (el) { el.srcObject = null; });
    state = 'idle';
    muted = false;
    paintMute();
    stopShake();
    setShrunk(false);
    closeWin();
    hidePop();
    if (line) note('VIDEO CALL', line);
  }

  function endCall() {
    O.talk({ c: 'call-end' });
    hangUp('');
  }

  function paintMute() {
    muteBtn.textContent = muted ? 'UNMUTE' : 'MUTE';
    muteBtn.classList.toggle('on', muted);
  }
  function toggleMute() {
    if (!mine) return;
    muted = !muted;
    mine.getAudioTracks().forEach(function (t) { t.enabled = !muted; });
    paintMute();
  }

  function openWin(line) {
    winLine.textContent = line || '';
    setShrunk(false);
    win.hidden = false;
    game.classList.add('fp-open');
  }
  function closeWin() {
    if (!win) return;
    win.hidden = true;
    game.classList.remove('fp-open');
  }
  function setShrunk(on) {
    shrunk = on;
    if (!win) return;
    win.classList.toggle('shrunk', on);
    plate.classList.toggle('video', on && state === 'on');
    game.classList.toggle('fp-open', !on && !win.hidden);
    if (on) {
      var go = roundVid.play && roundVid.play();
      if (go && go.catch) go.catch(function () {});
    }
  }

  function linked() {
    if (myPhoto) O.talk({ c: 'photo', data: myPhoto });
    paint();
  }

  function init() {
    O = Jacko.online;
    V = Jacko.view;
    game = $('game');
    plate = $('friend-plate');
    photoEl = $('fp-photo');
    letterEl = $('fp-letter');
    roundVid = $('fp-round');
    menu = $('fp-menu');
    callBtn = $('fp-call-btn');
    photoBtn = $('fp-photo-btn');
    chatBtn = $('fp-chat-btn');
    chat = $('chat-pop');
    chatList = $('chat-list');
    chatIn = $('chat-input');
    chatSend = $('chat-send');
    badge = $('fp-badge');
    fileIn = $('fp-file');
    win = $('fp-call');
    themVid = $('fp-them');
    meVid = $('fp-me');
    voice = $('fp-voice');
    winLine = $('fp-call-line');
    muteBtn = $('fp-mute');
    nudgeBtn = $('fp-nudge');
    pop = $('fp-pop');
    popTitle = $('fp-pop-title');
    popSub = $('fp-pop-sub');
    popYes = $('fp-pop-yes');
    popNo = $('fp-pop-no');

    plate.addEventListener('click', tapPlate);
    callBtn.addEventListener('click', function () { closeMenu(); startCall(); });
    photoBtn.addEventListener('click', function () { closeMenu(); fileIn.click(); });
    fileIn.addEventListener('change', pickedPhoto);
    muteBtn.addEventListener('click', toggleMute);
    nudgeBtn.addEventListener('click', nudge);
    $('fp-end').addEventListener('click', endCall);
    $('fp-back').addEventListener('click', function () { setShrunk(true); });
    chatBtn.addEventListener('click', openChat);
    $('fp-chat').addEventListener('click', openChat);
    $('chat-back').addEventListener('click', closeChat);
    chatSend.addEventListener('pointerdown', function (e) { e.preventDefault(); });
    chatSend.addEventListener('click', sendMsg);
    chatIn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); sendMsg(); }
      else if (e.key === 'Escape') closeChat();
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', fitChat);
      window.visualViewport.addEventListener('scroll', fitChat);
    }
    window.addEventListener('resize', fitChat);
    window.addEventListener('orientationchange', function () { setTimeout(fitChat, 300); setTimeout(fitChat, 800); });
    chatIn.addEventListener('focus', function () { setTimeout(fitChat, 300); });
    chatIn.addEventListener('blur', function () { setTimeout(fitChat, 300); });
    popYes.addEventListener('click', function () { var go = popYesDo; hidePop(); if (go) go(); });
    popNo.addEventListener('click', function () { var go = popNoDo; hidePop(); if (go) go(); });
    document.addEventListener('pointerdown', function (e) {
      if (!menu.hidden && !menu.contains(e.target) && !plate.contains(e.target)) closeMenu();
    });
    window.addEventListener('resize', place);
    if (window.ResizeObserver) new ResizeObserver(place).observe($('card-p2'));
    window.addEventListener('pagehide', function () { if (state !== 'idle') endCall(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { paint: paint, linked: linked, got: got, incoming: incoming, place: place, note: note,
           ask: ask, hide: hidePop };
})();
