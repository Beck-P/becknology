/**
 * BridgeSpires — the Spires, Arcadia above the smog (L480): the Orrery's door, LUMEN's designer implants, the Lyra's
 * stage seen from a box. The places themselves are scenes (tools/bridge-art/scenes/arcadia_spires.py and its rooms);
 * this is what they do.
 *
 *   orrery_door  the private members' club: in for members; otherwise Mr Ashdown at the grille — membership by
 *                introduction (the Penthouse or Ashcombe House is yours, or the Neon Royale's Crown Room is open to
 *                you) or bought (MEMBERSHIP coins). Kept in localStorage bridge_spires { member, since, how }.
 *   implants     LUMEN, the atelier: the designer tier of js/implants.js (BridgeImplants) — its own shop
 *                (`BridgeImplants.shop('lumen', …)`, the interaction's `shop`) with two pieces of the house's own
 *                (Starlight Optics, Gilt Lace); without the module, the collection behind glass.
 *   view 'opera' the Lyra's stage from a box (BridgeActions.addView): the curtain, the diva and the chorus, the pit,
 *                the house in the dark below — an act every few minutes by the clock, the same for everyone.
 *
 *   BridgeSpires.member() / _reset()
 */
var BridgeSpires = (function () {
  var KEY = 'bridge_spires', MEMBERSHIP = 25000;
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private */ } }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function say(t, x) { BridgeInteractions.say(t, x); }
  function toast(k, t, s) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(k, t, s); }

  // ---- the Orrery --------------------------------------------------------------------------------------------------------
  function introduction() {                                            // who'd vouch for you, if anyone
    var H = typeof BridgeHome !== 'undefined' && BridgeHome.owns ? BridgeHome : null;
    if (H && H.owns('arcadia-penthouse')) return 'the Penthouse';
    if (H && H.owns('lumar-manor')) return 'Ashcombe House';
    if (typeof BridgeCasino !== 'undefined' && BridgeCasino.unlocked && BridgeCasino.unlocked()) return 'the Duchess';
    return null;
  }
  function member() { return !!load().member; }
  function admit(how, inter) {
    var s = load();
    s.member = true; s.since = Date.now(); s.how = how;
    save(s);
    sfx('door');
    toast('The Orrery', 'Member', how === 'bought' ? 'Your name is in the book' : 'Introduced by ' + how);
    setTimeout(function () { BridgeWorld.enterWorld(inter.target || 'arcadia-members', inter.spawn || [11, 12]); }, 900);
  }
  function orrery(inter) {
    if (member()) { sfx('door'); BridgeWorld.enterWorld(inter.target || 'arcadia-members', inter.spawn || [11, 12]); return; }
    var intro = introduction();
    var rows = [];
    if (intro) rows.push({ label: 'Mention ' + intro, sub: 'an introduction they\'ll honour', note: 'free', pick: function () { admit(intro, inter); } });
    rows.push({ label: 'Put your name down', sub: 'membership, for life', note: MEMBERSHIP.toLocaleString() + ' coins', pick: function () {
      BridgeProgression.wagerCoins(MEMBERSHIP, 'spires:orrery').then(function (r) {
        if (!r || !r.ok) return say('THE ORRERY', 'MR ASHDOWN CONSULTS A LEDGER, THEN YOU, THEN THE LEDGER AGAIN. "PERHAPS ANOTHER YEAR." THE GRILLE CLOSES WITHOUT A SOUND.');
        admit('bought', inter);
      });
    } });
    BridgeInteractions.choose({
      title: 'The Orrery',
      text: 'YOU KNOCK. A BRASS GRILLE SLIDES BACK AND A GREY EYE CONSIDERS YOU.\n\n"THE ORRERY IS A PRIVATE CLUB. MEMBERS, AND THOSE A MEMBER ' +
        'VOUCHES FOR." A PAUSE. "' + (intro ? 'YOUR NAME HAS COME UP, AS IT HAPPENS.' : 'OR THOSE WHOSE NAME IS ALREADY IN THE BOOK. FOR A CONSIDERATION.') + '"',
      rows: rows,
      closeLabel: 'Bow out'
    });
  }

  // ---- LUMEN: designer implants ---------------------------------------------------------------------------------------------
  var COLLECTION = [                                                   // what's in the cases until js/implants.js arrives
    ['Starlight optics', 'eyes that see the stars through any smog'],
    ['Gilt lace', 'chrome filigree under the skin of the arm, warm to the touch'],
    ['Nightingale', 'a voice box tuned by the Lyra\'s own coach'],
    ['Halo', 'a ring of pale light that keeps time with your heart']
  ];
  // LUMEN's own face in js/implants.js, and two pieces of the house's own (sidegrades: two gifts each, less of either)
  var lumenReady = false;
  function lumen(I) {
    if (lumenReady) return;
    lumenReady = true;
    I.register('starlight_optics', { slot: 'eyes', tier: 'designer', name: 'Starlight Optics', price: 3200, perk: { crit: 0.14, energy: 15 },
      finish: 'irises flecked like the night sky', blurb: 'Eyes that see the stars through any smog. Iris Kade cuts each pair herself.' });
    I.register('gilt_lace', { slot: 'arm', tier: 'designer', name: 'Gilt Lace', price: 3000, perk: { damage: 0.32, armour: 2 },
      finish: 'gold filigree under the skin', blurb: 'Chrome lace worked under the skin of the arm, warm to the touch and harder than it looks.' });
    I.shop('lumen', { title: 'LUMEN · the collection', who: 'IRIS KADE', tiers: ['designer'], tune: 0,
      line: 'IRIS KADE LIFTS A GLASS DOME FROM A VELVET STAND. "EVERYTHING HERE IS MADE FOR ONE PERSON. TELL ME WHICH PIECE, AND WE\'LL MEASURE YOU."' });
  }
  function implants(inter) {
    var I = typeof BridgeImplants !== 'undefined' ? BridgeImplants : null;
    if (I && I.open && I.shop && I.register) { lumen(I); I.open({ shop: inter.shop || 'lumen' }); return; }
    BridgeInteractions.choose({
      title: 'LUMEN · the collection',
      text: 'IRIS KADE LIFTS A GLASS DOME FROM A VELVET STAND. "EVERYTHING HERE IS MADE FOR ONE PERSON. THE NEW SEASON ARRIVES SOON - ' +
        'THE CLINIC BELOW IS STILL CERTIFYING THE FITTINGS. COME BACK, AND WE\'LL MEASURE YOU."',
      rows: COLLECTION.map(function (c) { return { label: c[0], sub: c[1], note: 'arriving soon', info: true }; }),
      closeLabel: 'Leave'
    });
  }

  // ---- the Lyra's stage from a box --------------------------------------------------------------------------------------------
  var ACT = 150000;                                                    // an act and its interval, by the clock
  function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
  function stage(c, W, H, now) {
    var t = (Date.now() % ACT) / ACT;                                  // 0..1 through this act
    var open = t < 0.78 ? Math.min(1, t / 0.06) : Math.max(0, 1 - (t - 0.78) / 0.05);
    px(c, 0, 0, W, H, '#0c0610');
    var sx = W * 0.14, sw = W * 0.72, sy = H * 0.12, sh = H * 0.52;     // the stage opening
    // the set: a night sky with a painted moon, a balustrade, a staircase
    var g = c.createLinearGradient(0, sy, 0, sy + sh);
    g.addColorStop(0, '#1a2050'); g.addColorStop(1, '#4a3a7a');
    c.fillStyle = g; c.fillRect(sx, sy, sw, sh);
    for (var i = 0; i < 40; i++) px(c, sx + ((i * 97) % sw), sy + ((i * 53) % (sh * 0.6)), 1, 1, i % 4 ? '#c8d0ff' : '#fff6d0');
    px(c, sx + sw * 0.72, sy + sh * 0.14, 10, 10, '#f4f0dc');
    px(c, sx, sy + sh * 0.78, sw, sh * 0.22, '#3a2a3e');                 // the boards
    for (var b = 0; b < 12; b++) px(c, sx + b * sw / 12, sy + sh * 0.7, 3, sh * 0.08, '#d8d0e8');
    px(c, sx, sy + sh * 0.68, sw, 2, '#e8e0f0');
    // the chorus in a line and the diva in front, singing (her arms lift, notes drift up)
    var lit = 0.6 + 0.4 * Math.sin(now / 900);
    for (var k = 0; k < 6; k++) {
      var cx = sx + sw * (0.14 + k * 0.14), cy = sy + sh * 0.62 + Math.sin(now / 600 + k) * 1;
      px(c, cx - 2, cy - 10, 5, 10, ['#5a3a6a', '#3a4a7a', '#6a3a4a'][k % 3]);
      px(c, cx - 1, cy - 13, 3, 3, '#e0b090');
    }
    var dx = sx + sw * 0.47, dy = sy + sh * 0.86;
    c.fillStyle = 'rgba(255,240,200,' + (0.18 * lit).toFixed(2) + ')';   // the follow spot
    c.beginPath(); c.moveTo(dx - 4, sy); c.lineTo(dx + 4, sy); c.lineTo(dx + 16, dy); c.lineTo(dx - 16, dy); c.fill();
    px(c, dx - 6, dy - 16, 12, 16, '#b8a8e0'); px(c, dx - 4, dy - 18, 8, 3, '#d8c8f8');
    px(c, dx - 2, dy - 22, 4, 4, '#e0b090'); px(c, dx - 3, dy - 24, 6, 2, '#1a1418');
    var arm = Math.sin(now / 700) > 0 ? 4 : 1;
    px(c, dx - 9, dy - 15 - arm, 3, 2, '#e0b090'); px(c, dx + 6, dy - 15 - arm, 3, 2, '#e0b090');
    for (var n = 0; n < 4; n++) {
      var life = ((now / 1600) + n / 4) % 1;
      px(c, dx + 4 + Math.sin(life * 6 + n) * 6, dy - 26 - life * 30, 2, 2, 'rgba(255,230,160,' + (1 - life).toFixed(2) + ')');
    }
    // the curtain: red velvet in folds, gold fringe, drawn by the act
    var half = sw / 2 * (1 - open);
    for (var side = 0; side < 2; side++) {
      var x0 = side ? sx + sw - half : sx;
      for (var f = 0; f < Math.ceil(half / 4); f++) px(c, x0 + f * 4, sy, 4, sh, f % 2 ? '#8a1428' : '#a81a32');
      if (half > 1) px(c, side ? x0 : x0 + half - 2, sy, 2, sh, '#d8b060');
    }
    // the proscenium: gold, a crest, the swag over the top
    px(c, sx - 10, sy - 10, sw + 20, 10, '#c89a3a'); px(c, sx - 10, sy, 10, sh, '#b88a30'); px(c, sx + sw, sy, 10, sh, '#b88a30');
    for (var s = 0; s < 14; s++) px(c, sx + s * sw / 14, sy, sw / 14 - 1, 6 + (s % 2) * 3, '#6a0a1e');
    px(c, W / 2 - 6, sy - 9, 12, 7, '#f0d088');
    // the pit (the conductor's baton, lamps on the stands) and the house below, heads in the dark
    px(c, sx - 10, sy + sh, sw + 20, H * 0.08, '#1a0a12');
    for (var l = 0; l < 10; l++) px(c, sx + l * sw / 10 + 4, sy + sh + 4, 2, 2, '#ffd890');
    px(c, W / 2, sy + sh + 2 + (Math.sin(now / 250) > 0 ? 0 : 2), 1, 4, '#f4f0e8');
    for (var r = 0; r < 4; r++) for (var q = 0; q < 26; q++) {
      var hx = (q + (r % 2) * 0.5) * W / 25, hy = H * 0.72 + r * H * 0.07;
      px(c, hx, hy, 5, 4, '#140a14'); px(c, hx + 1, hy - 2, 3, 2, '#1e1018');
    }
    // the box's own rail in front of you, red plush on gold
    px(c, 0, H * 0.9, W, H * 0.1, '#5a0a1a'); px(c, 0, H * 0.9, W, 2, '#d8b060');
    if (t >= 0.83) {                                                    // the interval: the house lights up a little
      c.fillStyle = 'rgba(255,220,170,0.12)'; c.fillRect(0, 0, W, H);
    }
  }

  // ---- windows onto the Spires' night (a room's HOLDOUT panes: the world JSON's spires.windows, screen tiles) -----------------
  var winCv = null;
  function drawWindows(ctx, world, offX, offY, ts, now) {
    if (!world.spires || !world.spires.windows || typeof BridgeSkyline === 'undefined') return;
    world.spires.windows.forEach(function (S, i) {
      var x = Math.round(offX + S[0] * ts), y = Math.round(offY + S[1] * ts), w = Math.round((S[2] - S[0]) * ts), h = Math.round((S[3] - S[1]) * ts);
      if (w < 2 || h < 2) return;
      var H = Math.max(200, h * 3);
      if (!winCv) winCv = document.createElement('canvas');
      if (winCv.width !== w || winCv.height !== H) { winCv.width = w; winCv.height = H; }
      var c = winCv.getContext('2d');
      c.imageSmoothingEnabled = false;
      var real = BridgeWorld.getView, vOffY = Math.round((0.5 * H - H / 2) / 0.3 + H / 2 - 6 * 32);
      BridgeWorld.getView = function () { return { offX: w / 2 - (16 + i * 7) * 32, offY: vOffY, ts: 32, w: w, h: H }; };
      try { BridgeSkyline.draw(c, w, H, now, { baseRow: 6, railRow: 9, centerCol: 16, mode: 'spires' }); }
      finally { BridgeWorld.getView = real; }
      ctx.drawImage(winCv, 0, Math.round(H * 0.42 - h / 2), w, h, x, y, w, h);
    });
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('arcadia', { behind: drawWindows });

  function init() {
    if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
      BridgeInteractions.register('orrery_door', orrery, 'Knock');
      BridgeInteractions.register('implants', implants, 'Browse');
    }
    if (typeof BridgeActions !== 'undefined' && BridgeActions.addView) BridgeActions.addView('opera', stage);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return { member: member, introduction: introduction, act: function () { return (Date.now() % ACT) / ACT; },
           _reset: function () { save({}); } };
})();
