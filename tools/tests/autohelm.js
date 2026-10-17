// A helmsman for the sailing tests: steers at the gold mark, beating up any leg that's into the wind in tacks (close-hauled
// on whichever side makes more way toward it), by pressing the arrow keys as a player would. In the page:
// `await p.evaluate(require('../autohelm.js'))`, then `window.__helm.stop()` to let go.
module.exports = function () {
  if (window.__helm) window.__helm.stop();
  var held = {}, tack = 0, slow = 0, last = Date.now();
  function key(k, on) {
    if (!!held[k] === !!on) return;
    held[k] = !!on;
    document.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { key: k, bubbles: true }));
  }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  var iv = setInterval(function () {
    if (!BridgeSloop.isRunning()) return;
    var b = BridgeSloop._boat(), R = BridgeSloop._route(), w = BridgeSloop._wind(), route = R[0], leg = R[1];
    if (!b || !w || !route || !route.length || w.now == null) return;
    var p = route[Math.min(leg, route.length - 1)], dir = Math.atan2(p[1] - b.r, p[0] - b.x), want = dir;
    if (Math.abs(wrap(w.now - dir)) < 1.1) {                    // (1.1 off the wind makes the most way up it in a sloop)
      var a = w.now + 1.1, c = w.now - 1.1, va = Math.cos(wrap(a - dir)), vc = Math.cos(wrap(c - dir));
      if (!tack) tack = va >= vc ? 1 : -1;
      if (tack === 1 && vc > va + 0.3) tack = -1; else if (tack === -1 && va > vc + 0.3) tack = 1;
      var t = Date.now(); slow = b.v < 0.6 ? slow + (t - last) : 0; last = t;
      if (slow > 2500) { tack = -tack; slow = 0; }                  // aground on a tack: go about
      want = tack === 1 ? a : c;
    } else tack = 0;
    var d = wrap(want - b.h);
    key('ArrowRight', d > 0.05); key('ArrowLeft', d < -0.05);
  }, 40);
  window.__helm = { stop: function () { clearInterval(iv); key('ArrowRight', false); key('ArrowLeft', false); } };
};
