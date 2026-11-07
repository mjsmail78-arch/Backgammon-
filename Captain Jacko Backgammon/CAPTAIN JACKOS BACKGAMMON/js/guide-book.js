// CAPTAIN JACKO'S GUIDE BOOK: the rules in chapters, and the Credits page.
Jacko.guide = (function () {

  var CHAPTERS = [
    { id: 'basics', tab: 'The Basics', title: 'The Basics',
      intro: 'Backgammon is a race with a fight in the middle. This is everything you need to get going.',
      secs: [
        { h: 'The goal', lines: [
          'You have 15 checkers. Move them all round the board into your home board, then take them off. The first player to take all 15 off wins the round.'] },
        { h: 'The board', lines: [
          'The board has 24 long triangles called points: 12 on each side, in four quarters of six.',
          'The bar runs down the middle and splits the board in half.',
          'Your home board is the last quarter your checkers reach. Your opponent\'s home board is straight across from it.',
          'Points are counted from your home end: your 1 point is the last point before your checkers come off, and your 24 point is where the journey starts.'] },
        { h: 'Two sides, two directions', lines: [
          'All your checkers travel the same way round the board. Your opponent\'s travel the opposite way, so the two sides pass each other on the way home. That is where the hitting and blocking happen.'] },
        { h: 'The bar and the tray', lines: [
          '- The bar, in the middle: a checker that is hit waits here to come back in.',
          '- The tray, on the side: your checkers stand here once you take them off. At a Fresh start they also wait here before walking onto the board.'] },
        { h: 'The opening throw', lines: [
          'Every round starts with the opening throw. Press Roll and each player throws one die. The higher number goes first and rolls for the first turn. A tie throws again.'] },
        { h: 'The pip count', lines: [
          'The number under each name shows how far that player\'s checkers still have to travel, counted in pips. A checker on the bar or in the tray counts 25. The lower number is ahead in the race.'] }
      ] },

    { id: 'moving', tab: 'Moving', title: 'Moving the Checkers',
      intro: 'Two dice, two moves. Here is how a turn works and where a checker can go.',
      secs: [
        { fig: 'paths' },
        { h: 'Your turn', lines: [
          '1. Press Roll. The two dice roll onto the board.',
          '2. Each die is a move of its own. A 5 and a 3 moves one checker 5 points and another 3 points, or one checker 8 points.',
          '3. Press the tick to end your turn.'] },
        { h: 'Doubles', lines: [
          'Throw the same number on both dice and you play it four times. A double 4 is four moves of 4.'] },
        { h: 'Where a checker can land', lines: [
          '- On an empty point.',
          '- On a point holding your own checkers, as many as you like.',
          '- On a point holding just one of your opponent\'s checkers. That is a hit: their checker goes to the bar.',
          'A point holding two or more of your opponent\'s checkers is shut. You can\'t land there, and a checker using both dice can\'t stop there on the way.'] },
        { h: 'Safe points and walls', lines: [
          'Two or more of your checkers on a point make it safe: it can\'t be hit. Six safe points in a row make a wall, called a prime, that nothing can get past.'] },
        { h: 'Coming back off the bar', lines: [
          'If you have a checker on the bar, it must come back in before anything else moves. It comes in on your opponent\'s home board, on the point that matches a die: a 3 brings it in on your 22 point, the third point in.',
          'If both points are shut, your whole turn is lost.'] },
        { h: 'Play as much as you can', lines: [
          'You must play both dice whenever you can. If only one can be played, you play it; if either one could be played but not both, you play the higher one.',
          'If neither die can be played, the turn is blocked and passes to your opponent.'] }
      ] },

    { id: 'house', tab: 'Rules', title: 'Rules',
      intro: 'Captain Jacko plays with his own rules on the throw. They make every roll count. ' +
             'Captain Jacko made these rules himself. He took European acey-deucey and added his own 7 and 8. ' +
             'From European acey-deucey comes the bearing-off rule too: when a die names a point with your checker on it, that checker must come off.',
      secs: [
        { badge: '7', h: 'Miss a go', lines: [
          'Any throw adding up to 7 (6-1, 5-2 or 4-3) is not played. The sign says SKIPPED and the turn passes to your opponent.'] },
        { badge: '8', h: 'Another go', lines: [
          'A throw adding up to 8 (6-2, 5-3 or 4-4) is played as normal, then you roll again. The sign says ANOTHER GO.'] },
        { badge: '2-1', h: 'Acey deucey: the jackpot', lines: [
          '1. Play the 2 and the 1.',
          '2. Pick any double you like, free, and play all four moves of it.',
          '3. Then roll again.',
          'The sign says ACEY DEUCEY, and the dice turn gold as your chosen double.'] },
        { badge: 'Blocked', h: 'No move at all', lines: [
          'If nothing can be played, the sign says BLOCKED and the turn passes. Any bonus from that throw is lost.'] },
        { badge: 'Bonus', h: 'Losing a bonus', lines: [
          'An extra go or a jackpot is lost if you can\'t play every die: one die of two, or three moves of four on a double.',
          'Checkers stuck on the bar never cost you the jackpot. As long as the 2 and the 1 are both played, you still pick your double, and its moves can bring them back in.',
          'A lost bonus never costs you the turn itself: you still play what you can.'] },
        { badge: 'Cube', h: 'No doubling cube', lines: [
          'This game is played without the doubling cube. Every round is worth what it is won by.'] }
      ] },

    { id: 'start', tab: 'Start Positions', title: 'Starting Positions',
      intro: 'Pick one in the New Match menu, under Starting position.',
      secs: [
        { badge: 'Classic', h: 'The standard set-up', lines: [
          'Two checkers on your 24 point, five on your 13, three on your 8 and five on your 6. Your opponent is set up the same way from their side.'] },
        { badge: 'Fresh start', h: 'An empty board', lines: [
          'The board starts empty. All 15 of each player\'s checkers wait in the tray.',
          'They walk onto the board one die at a time, coming in on your opponent\'s home board just like a checker off the bar.',
          'On each move you can bring a new checker on, or move one that is already on the board.',
          'You can only start taking checkers off once all 15 are in your home board.'] },
        { badge: 'TJ\'s Way', h: 'The fives swap sides', lines: [
          'Set up like Classic, except the two stacks of five beside the bar swap colours: your five stand on your opponent\'s 6 point, and theirs stand on yours.'] }
      ] },

    { id: 'scoring', tab: 'Scoring', title: 'Bearing Off and Scoring',
      intro: 'Get them home, get them off, and count the points.',
      secs: [
        { h: 'Bearing checkers off', lines: [
          'When all 15 of your checkers are in your home board, you start taking them off the board. This is called bearing off.',
          '- If a checker sits on the point that matches a die, it must come off. A 4 takes one off your 4 point.',
          '- If that point is empty, use the die to move a checker inside your home board.',
          '- If the die is higher than every checker you have left, it takes one off your highest point.',
          'If one of yours is hit while you are bearing off, it must go all the way round again. Nothing more comes off until it is back home.'] },
        { h: 'How many points a round is worth', lines: [
          '- 1 point, a win: your opponent has taken at least one checker off.',
          '- 2 points, a gammon: your opponent has taken none off.',
          '- 3 points, a backgammon: your opponent has taken none off, and still has a checker in your home board, on the bar or in the tray.'] },
        { h: 'Winning the match', lines: [
          'Pick the match length in the New Match menu, under Points: the first player to reach 3, 5 or 10 points wins the match. Each new round starts with the opening throw.'] }
      ] },

    { id: 'buttons', tab: 'The Buttons', title: 'Every Button in the Game',
      intro: 'Everything is a tap. With Hints on, bright green shows the way.',
      secs: [
        { h: 'The play buttons', lines: [
          '@btn-roll Roll: throws the dice. They roll in from your side of the board.',
          '@btn-undo Undo: takes your last move back. You can undo every move until you confirm.',
          '@btn-redo Redo: puts an undone move back again.',
          '@btn-confirm Confirm: ends your turn once your whole throw is played, and the dice fly off the board.'] },
        { h: 'Moving a checker', lines: [
          '1. Tap the checker you want to move.',
          '2. Tap the point you want it to go to.',
          'Tap the picked checker again to put it back down. To take a checker off, tap the tray. A checker that was hit is picked up for you, or tap the middle strip to pick it up.'] },
        { h: 'Moving several checkers on a double', lines: [
          'On a double, each tap on the picked point lifts one more checker, as many as the throw can move together, each with a green ring. Tap where they go and they all fly there, one just after another. Once no more can be lifted, the next tap on the point puts them all down. Undo brings them back one move at a time.'] },
        { h: 'The free double', lines: [
          'After an acey deucey, six gold dice pop up. Tap the double you want to play.'] },
        { h: 'The scoreboards', lines: [
          'One in each top corner: the player\'s checker, name, pip count and score. The player whose turn it is glows gold.'] },
        { h: 'Replay', lines: [
          '@rp-p1 The checker in each scoreboard is a Replay button. After your opponent confirms, and before you roll, press their checker to watch their last turn again, slowly.',
          '- Press it again to pause, and once more to carry on.',
          '- With Hints on, a green ring spins round it while a replay is waiting.',
          '- In Play a Friend, both of you watch the replay.'] },
        { h: 'The buttons along the top', lines: [
          '@btn-new Captain Jacko: opens the New Match menu.',
          '@btn-hints Hints: turns hints on and off. With Hints on, the game shows where to press next in bright green, and guides every move step by step:',
          '1. Tap a checker with a green ring.',
          '2. Green rings show where it can go. Each one has a balloon showing the dice it uses: 4, 2 or 4+2.',
          '3. Tap the green ring or its balloon to move there.',
          '4+2 plays the 4 first, then the 2. 2+4 plays the 2 first, then the 4. When both balloons show, tap the one for the order wanted.',
          '@btn-settings Settings: how the game plays (see below).',
          '@btn-graphics Graphics: the board\'s look (see below).',
          '@btn-sound Sound: on and off.',
          '@btn-view View: Angle, Zoom, Brightness and Background brightness, on four sliders.',
          '@btn-emojis Emojis: pick a face and it pops up big on the screen. In Play a Friend, your friend sees it too.'] },
        { h: 'Settings', lines: [
          '- Checker speed: Slow, Smooth or Fast, for every checker move.',
          '- Auto bear off: when your checkers are all home and the race is clear, they come off by themselves.',
          '- Auto move limited moves: a throw with only one way to play plays itself.',
          '- Auto confirm: your turn ends by itself once your whole throw is played.',
          '- Auto roll: your dice roll by themselves at the start of your turn, after a short wait so there is time to press Replay. The opening throw is still yours to roll.',
          'They all start off.'] },
        { h: 'Graphics', lines: [
          '- Themes: the board\'s colours, its checkers and its dice, all in one pick. Match Background, on at the start, brings up each theme\'s own photo behind the board.',
          '- Background: four plain colours and a photo for every theme. Picking one yourself turns Match Background off.',
          '- Captions: the line of words over the board, on and off.'] },
        { h: 'The New Match menu', lines: [
          '- Opponent: Play Computer, 2 Players (on one device) or Play a Friend (on two devices).',
          '- Computer strength: Easy, Hard or Expert, against the computer only.',
          '- Points: play to 3, 5 or 10.',
          '- Starting position: Classic, Fresh start or TJ\'s Way.',
          '- Player 1 checkers: Light or Dark. Player 2 plays the other colour.',
          '- Player names: type your own names.',
          '- Captain Jacko\'s Guide Book: this book.',
          '- Back: the menu rolls back up. Exit Game: closes the game, after asking first.',
          '- Saved Matches: carry on where you left off. Start Game: a new match with your choices.'] },
        { h: 'Saved Matches', lines: [
          'Every match against the computer or on 2 Players saves itself as you play. Up to 3 unfinished matches are kept, newest first: tap one to carry on. A won match takes itself off.',
          '- Save to File: keeps a match as a small file on your device (on a phone, Share, then Save to Files).',
          '- Load from File: brings a saved file back in.',
          '- Delete: takes a match off, after asking first.'] },
        { h: 'Play a Friend', lines: [
          '1. One of you presses Create Room and sends the room code.',
          '2. The other presses Join Room and types the code in.',
          '3. The one who made the room picks the match and presses Start Game. You play on one board across two devices.',
          'Player 2 sees the board from across the table, with the tray on the left.',
          'Play a Friend is the only part of the game that needs the internet.'] }
      ] }
  ];

  var CREDITS = { id: 'credits', title: 'Credits',
    secs: [
      { h: 'Editors', lines: ['Jacko and Boulan'] },
      { h: 'Made with', lines: ['Claude Opus 5.5 by Anthropic'] },
      { h: 'Computer player', lines: ['Taught itself, after Gerald Tesauro\'s TD-Gammon (IBM, 1992); fall-back: pubeval by Gerald Tesauro'] },
      { h: 'Code', lines: ['three.js and PeerJS, MIT Licence'] },
      { h: 'Checker and dice marble', lines: ['Marble012 by ambientCG, CC0'] },
      { h: 'Gold dice', lines: ['Brushed Gold Dirty by Lucas Anton Gomez, 3DTexel, CC0'] },
      { h: 'Emojis', lines: ['Noto Animated Emoji by Google, CC BY 4.0'] },
      { h: 'Background photos', lines: [
        'From Unsplash (Unsplash Licence): Fiona Smallwood (Sydney Harbour), Jason Murphy (green fields), Hat Trick (Japanese garden), Tjaard Krusch (Burano), Sulthan Auliya (teal water), Leo_Visions (Golden Gate Bridge), Ivan Ivankovic (Croatian coast), Photoholgic (Uluru), Armand Mckenzie (turquoise lagoon), Niklas Weiss (Bali rice terraces), Jose P. Ortiz (old sailing ship), Martijn Vonk (rainforest river), Scott K (Las Vegas Strip)'] }
    ] };

  var FIG = (function () {
    var NS = 'http://www.w3.org/2000/svg';
    var PTS = [[34, 79], [79, 124], [124, 169], [169, 214], [214, 259], [259, 304],
               [340, 385], [385, 430], [430, 475], [475, 520], [520, 565], [565, 610]];
    var GAP = 0.8, SL = 0.4, T = 5, REST = 0.7, FD = 1.1, STG = 0.08;
    var FLY0 = 5 * GAP + 2 * SL + T + REST, CYCLE = FLY0 + 5 * STG + FD + REST;
    var PLAYERS = [
      { name: 'PLAYER 1', col: '#f4f2ec', edge: '#8f9cb8', ring: '#c9cfdc',
        path: 'M612 102 H78.5 Q56.5 102 56.5 124 V260 Q56.5 282 78.5 282 H612',
        heads: [[470, 102, 180], [200, 102, 180], [56.5, 192, 90], [200, 282, 0], [470, 282, 0], [600, 282, 0]],
        from: [176, 152, 128, 104, 80, 56], to: [208, 232, 256, 280, 304, 328] },
      { name: 'PLAYER 2', col: '#e8c770', edge: '#7a5c14', ring: '#b8891f',
        path: 'M612 282 H78.5 Q56.5 282 56.5 260 V124 Q56.5 102 78.5 102 H612',
        heads: [[470, 282, 180], [200, 282, 180], [56.5, 192, -90], [200, 102, 0], [470, 102, 0], [600, 102, 0]],
        from: [208, 232, 256, 280, 304, 328], to: [176, 152, 128, 104, 80, 56] }
    ];

    function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

    function points() {
      return PTS.map(function (p, k) {
        var m = (p[0] + p[1]) / 2, a = k % 2 ? '#2a58a0' : '#d8d2c0', b = k % 2 ? '#d8d2c0' : '#2a58a0';
        return '<polygon points="' + p[0] + ',44 ' + p[1] + ',44 ' + m + ',160" fill="' + a + '"/>' +
               '<polygon points="' + p[0] + ',340 ' + p[1] + ',340 ' + m + ',224" fill="' + b + '"/>';
      }).join('');
    }

    function heads(o) {
      return o.heads.map(function (h) {
        return '<polygon points="-8,-10 10,0 -8,10" transform="translate(' + h[0] + ' ' + h[1] + ') rotate(' + h[2] +
               ')" fill="' + o.col + '" stroke="#060b1e" stroke-width="2" stroke-linejoin="round"/>';
      }).join('');
    }

    // Turned: the same board seen from across the table, as Player 2 sees it in Play a Friend.
    function svg(o, turned) {
      return '<svg viewBox="0 0 680 390" role="img" aria-label="' + o.name + '">' +
        '<rect x="0" y="0" width="680" height="390" rx="14" fill="#0a1a2a"/>' +
        '<text x="340" y="32" text-anchor="middle" font-size="28" font-weight="800" letter-spacing="2.2" fill="' + o.col + '">' + o.name + '</text>' +
        '<rect x="20" y="52" width="640" height="320" rx="8" fill="#060b1e" stroke="#d4af37" stroke-width="3"/>' +
        '<g transform="translate(0 20)' + (turned ? ' rotate(180 340 192)' : '') + '">' +
        '<rect x="34" y="44" width="270" height="296" fill="#0b1330"/><rect x="340" y="44" width="270" height="296" fill="#0b1330"/>' +
        '<rect x="304" y="44" width="36" height="296" fill="#060b1e" stroke="#d4af37"/>' +
        '<rect x="618" y="44" width="34" height="296" fill="#050912" stroke="#d4af37"/>' +
        points() +
        '<path d="' + o.path + '" fill="none" stroke="#060b1e" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path class="gb-route" d="' + o.path + '" fill="none" stroke="' + o.col + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>' +
        heads(o) + '<g class="gb-movers"></g></g></svg>';
    }

    function place(B, i, t) {
      var o = B.o, sx = 635, sy = o.from[i], fy = o.to[i], lv = i * GAP, x, y, k = 1, e, u, f0;
      if (t < lv) { x = sx; y = sy; }
      else if (t < lv + SL) {
        e = ease((t - lv) / SL);
        x = sx + (B.a.x - sx) * e; y = sy + (B.a.y - sy) * e; k = 1 + 0.2 * Math.sin(Math.PI * e);
      } else if (t < lv + SL + T) {
        var p = B.route.getPointAtLength((t - lv - SL) / T * B.len);
        x = p.x; y = p.y;
      } else if (t < lv + 2 * SL + T) {
        e = ease((t - lv - SL - T) / SL);
        x = B.b.x + (sx - B.b.x) * e; y = B.b.y + (fy - B.b.y) * e; k = 1 + 0.2 * Math.sin(Math.PI * e);
      } else {
        f0 = FLY0 + i * STG;
        if (t < f0) { x = sx; y = fy; }
        else if (t < f0 + FD) {
          e = ease((t - f0) / FD); u = 1 - e;
          x = u * u * sx + 2 * u * e * 520 + e * e * sx;
          y = u * u * fy + 2 * u * e * ((fy + sy) / 2) + e * e * sy;
          k = 1 + 0.35 * Math.sin(Math.PI * e);
        } else { x = sx; y = sy; }
      }
      return [x, y, k];
    }

    var VIEWS = [{ title: 'Player 1\'s View', turned: false }, { title: 'Player 2\'s View', turned: true }];

    function start(host) {
      var boards = [];
      VIEWS.forEach(function (v) {
        var head = document.createElement('div');
        head.className = 'gb-head';
        head.style.flex = '0 0 100%';
        head.innerHTML = '<span class="gb-h">' + v.title + '</span>';
        host.appendChild(head);
        PLAYERS.forEach(function (o) {
          var holder = document.createElement('div');
          holder.innerHTML = svg(o, v.turned);
          var el = holder.firstChild;
          host.appendChild(el);
          var route = el.querySelector('.gb-route'), layer = el.querySelector('.gb-movers'), len = route.getTotalLength();
          var cks = [];
          for (var i = 0; i < 6; i++) {
            var g = document.createElementNS(NS, 'g');
            g.innerHTML = '<circle r="12" fill="' + o.col + '" stroke="' + o.edge + '" stroke-width="2"/>' +
                          '<circle r="6.5" fill="none" stroke="' + o.ring + '" stroke-width="1.3"/>';
            layer.appendChild(g);
            cks.push(g);
          }
          boards.push({ o: o, route: route, len: len, layer: layer, cks: cks,
                        a: route.getPointAtLength(0), b: route.getPointAtLength(len) });
        });
      });
      var t0 = performance.now(), raf = 0;
      function frame(now) {
        var t = ((now - t0) / 1000) % CYCLE;
        boards.forEach(function (B) {
          var order = B.cks.map(function (g, i) {
            var q = place(B, i, t);
            g.setAttribute('transform', 'translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ') scale(' + q[2].toFixed(3) + ')');
            return [q[2], g];
          });
          order.sort(function (m, n) { return m[0] - n[0]; }).forEach(function (m) { B.layer.appendChild(m[1]); });
        });
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      return function () { cancelAnimationFrame(raf); };
    }

    return { start: start };
  })();

  var pop, body, tabsRow, creditsBtn, cur = null, swapTimer = null, built = false, figStop = null, keyStop = null;
  var SWAP = 200;

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function lineHTML(t) {
    var key = t.match(/^@([\w-]+) (.*)$/);
    if (key) return '<li class="gb-key-line"><span class="gb-key" data-key="' + key[1] + '"></span><span>' + esc(key[2]) + '</span></li>';
    var m = t.match(/^(\d+)\. (.*)$/);
    if (t.indexOf('- ') === 0) return '<li class="gb-dot"><span class="gb-mark"></span><span>' + esc(t.slice(2)) + '</span></li>';
    if (m) return '<li class="gb-step"><span class="gb-mark">' + m[1] + '</span><span>' + esc(m[2]) + '</span></li>';
    return '<li class="gb-para"><span>' + esc(t) + '</span></li>';
  }

  function chapterHTML(ch) {
    var h = '<h3 class="gb-title">' + esc(ch.title) + '</h3>';
    if (ch.intro) h += '<p class="gb-intro">' + esc(ch.intro) + '</p>';
    ch.secs.forEach(function (s) {
      if (s.fig) { h += '<section class="gb-sec gb-fig-sec"><div class="gb-fig"></div></section>'; return; }
      h += '<section class="gb-sec"><div class="gb-head">';
      if (s.badge) h += '<span class="gb-badge">' + esc(s.badge) + '</span>';
      h += '<span class="gb-h">' + esc(s.h) + '</span></div><ul>' + s.lines.map(lineHTML).join('') + '</ul></section>';
    });
    return h;
  }

  function build() {
    pop = document.getElementById('guide');
    body = document.getElementById('guide-body');
    tabsRow = document.getElementById('guide-tabs');
    CHAPTERS.forEach(function (ch) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gb-tab';
      b.dataset.ch = ch.id;
      b.textContent = ch.tab;
      b.addEventListener('click', function () { showChapter(ch.id); });
      tabsRow.appendChild(b);
    });
    document.getElementById('guide-close').addEventListener('click', close);
    creditsBtn = document.getElementById('guide-credits');
    creditsBtn.addEventListener('click', function () { showChapter(CREDITS.id); });
    pop.addEventListener('click', function (e) { if (e.target === pop) close(); });
    built = true;
  }

  function lightTab(id) {
    Array.prototype.forEach.call(tabsRow.children, function (b) {
      var on = b.dataset.ch === id;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    var cr = id === CREDITS.id;
    creditsBtn.classList.toggle('on', cr);
    creditsBtn.setAttribute('aria-pressed', String(cr));
  }

  function fill(id) {
    var ch = id === CREDITS.id ? CREDITS
           : CHAPTERS.filter(function (c) { return c.id === id; })[0] || CHAPTERS[0];
    cur = ch.id;
    stopFig();
    body.classList.toggle('gb-credits', ch === CREDITS);
    body.innerHTML = chapterHTML(ch);
    body.scrollTop = 0;
    var host = body.querySelector('.gb-fig');
    if (host) figStop = FIG.start(host);
    Array.prototype.forEach.call(body.querySelectorAll('.gb-key'), function (slot) {
      var copy = keyCopy(slot.dataset.key);
      if (copy) slot.appendChild(copy);
    });
    var rp = body.querySelector('.gb-key-btn.rp-key');
    if (rp) keyStop = cycleReplay(rp);
  }

  function cycleReplay(el) {
    var STEPS = [['ready', 3000], ['playing', 2000], ['paused', 2000]], i = 0, t = null;
    function next() {
      el.classList.remove('ready', 'playing', 'paused');
      el.classList.add(STEPS[i][0]);
      t = setTimeout(next, STEPS[i][1]);
      i = (i + 1) % STEPS.length;
    }
    next();
    return function () { clearTimeout(t); };
  }

  function keyCopy(id) {
    var src = document.getElementById(id);
    if (!src) return null;
    var c = src.cloneNode(true);
    ['id', 'title', 'aria-label', 'aria-controls', 'aria-expanded', 'aria-pressed'].forEach(function (a) { c.removeAttribute(a); });
    c.classList.remove('off', 'on', 'ready', 'muted');
    c.classList.add('gb-key-btn', 'gb-key-' + id);
    c.setAttribute('aria-hidden', 'true');
    c.tabIndex = -1;
    c.disabled = true;
    Array.prototype.forEach.call(c.querySelectorAll('#logo-plate, .snd-off, .slash'), function (el) {
      if (el.id === 'logo-plate') el.removeAttribute('id'); else el.parentNode.removeChild(el);
    });
    var from = src.querySelectorAll('canvas'), to = c.querySelectorAll('canvas');
    Array.prototype.forEach.call(to, function (cv, i) {
      cv.removeAttribute('id');
      cv.width = from[i].width;
      cv.height = from[i].height;
      cv.getContext('2d').drawImage(from[i], 0, 0);
    });
    return c;
  }

  function stopFig() {
    if (figStop) { figStop(); figStop = null; }
    if (keyStop) { keyStop(); keyStop = null; }
  }

  function showChapter(id) {
    if (id === cur && !swapTimer) return;
    lightTab(id);
    clearTimeout(swapTimer);
    body.classList.add('out');
    swapTimer = setTimeout(function () {
      swapTimer = null;
      fill(id);
      body.classList.remove('out');
    }, SWAP);
  }

  function isOpen() { return built && !pop.hidden && !pop.classList.contains('fade-out'); }

  function open() {
    if (!built) build();
    clearTimeout(swapTimer); swapTimer = null;
    body.classList.remove('out');
    fill(CHAPTERS[0].id);
    lightTab(cur);
    Jacko.fade.show(pop);
    document.getElementById('btn-rules').setAttribute('aria-expanded', 'true');
  }

  function close() {
    if (!built || pop.hidden) return;
    stopFig();
    Jacko.fade.hide(pop);
    document.getElementById('btn-rules').setAttribute('aria-expanded', 'false');
  }

  return { open: open, close: close, isOpen: isOpen };
})();
