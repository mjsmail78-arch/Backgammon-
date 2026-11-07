// GOLD SCROLL BARS: a slim gold bar on every window that holds more than it shows.
window.Jacko = window.Jacko || {};
(function () {
  var SEL = '.panel, .menu-body, .saved-list, .set-body, #guide-body, #emoji-grid, ' +
            '#view-pop, #background-pop .scenery-grid, #themes-pop .theme-grid, #install-pop';
  var PAD = 4;
  var LEAST = 28;
  var queued = false;

  function barOf(el) {
    var b = el._gbar;
    if (!b) {
      b = document.createElement('div');
      b.className = 'gbar';
      b.setAttribute('aria-hidden', 'true');
      var t = document.createElement('div');
      t.className = 'gbar-thumb';
      b.appendChild(t);
      b._thumb = t;
      b._el = el;
      t.addEventListener('pointerdown', drag);
      el._gbar = b;
    }
    if (b.parentNode !== el) el.appendChild(b);
    return b;
  }

  function place(el) {
    var cs = getComputedStyle(el);
    var scrolls = cs.overflowY === 'auto' || cs.overflowY === 'scroll';
    var view = el.clientHeight, full = el.scrollHeight;
    if (!scrolls || !view || full <= view + 1) {
      if (el._gbar && el._gbar.style.display !== 'none') el._gbar.style.display = 'none';
      return;
    }
    if (cs.position === 'static') el.style.position = 'relative';
    var b = barOf(el), track = view - PAD * 2;
    var th = Math.max(LEAST, Math.round(track * view / full));
    var at = Math.round((track - th) * el.scrollTop / (full - view));
    b.style.display = 'block';
    b.style.top = (el.scrollTop + PAD) + 'px';
    b.style.height = track + 'px';
    b._thumb.style.height = th + 'px';
    b._thumb.style.transform = 'translateY(' + at + 'px)';
  }

  function refresh() {
    queued = false;
    Array.prototype.forEach.call(document.querySelectorAll(SEL), place);
  }
  function soon() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
  }

  function drag(e) {
    var t = e.currentTarget, el = t.parentNode._el;
    e.preventDefault();
    e.stopPropagation();
    var y0 = Jacko.view.toLocal(e.clientX, e.clientY).y, top0 = el.scrollTop;
    var track = el.clientHeight - PAD * 2, th = t.offsetHeight;
    var per = (el.scrollHeight - el.clientHeight) / Math.max(1, track - th);
    t.setPointerCapture(e.pointerId);
    t.classList.add('held');
    function move(m) {
      el.scrollTop = top0 + (Jacko.view.toLocal(m.clientX, m.clientY).y - y0) * per;
    }
    function up() {
      t.classList.remove('held');
      t.removeEventListener('pointermove', move);
      t.removeEventListener('pointerup', up);
      t.removeEventListener('pointercancel', up);
    }
    t.addEventListener('pointermove', move);
    t.addEventListener('pointerup', up);
    t.addEventListener('pointercancel', up);
  }

  function ours(n) { return n.nodeType === 1 && (n.classList.contains('gbar') || n.classList.contains('gbar-thumb')); }
  function changed(list) {
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (ours(r.target)) continue;
      if (r.type === 'childList') {
        var all = Array.prototype.slice.call(r.addedNodes).concat(Array.prototype.slice.call(r.removedNodes));
        if (all.length && all.every(ours)) continue;
      }
      return soon();
    }
  }

  function init() {
    document.addEventListener('scroll', function (e) {
      var el = e.target;
      if (el && el.nodeType === 1 && el._gbar) place(el); else soon();
    }, true);
    window.addEventListener('resize', soon);
    new MutationObserver(changed).observe(document.body,
      { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open'] });
    document.addEventListener('load', soon, true);
    soon();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
