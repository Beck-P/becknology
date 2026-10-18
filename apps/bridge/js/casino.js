/**
 * BridgeCasino — the Neon Royale's games (Royale Link, the app at /runouts) on the Bridge's side.
 *
 * The casino in Arcadia places `casino` interactions on its tables and terminals:
 *   { "type": "casino", "game": "blackjack", "table": "bj-1", "label": "BLACKJACK", "prompt": "PRESS E TO PLAY" }
 *   { "type": "casino", "game": "runouts", "mode": "dice", "table": "ro-dice" }      one of the Runouts games
 *   { "type": "casino", "game": "lobby" }                                             a Royale Link terminal
 * plus "stakes": "high" for the high-roller room's tables. Games: blackjack roulette craps poker slots derby crash
 * runouts. Using one opens the cabinet (js/cabinet-modal.js, the casino frame) on /runouts/?game=…&table=…
 * (a terminal: /runouts/?link=1). The Arcade's old RUNOUTS cabinets and the game room's slot are Royale Link
 * terminals now (relabelled here as their worlds load).
 *
 * Coins: inside the cabinet the chips are the pilot's coins. The game asks; this file stakes and pays through
 * BridgeProgression, and keeps `hold` — what the table owes the pilot if they walk away right now (stakes before
 * the cards are out, what a spin has already won, a poker stack). Closing the cabinet pays the hold; a page that
 * closed with something held pays it the next time the Bridge loads (localStorage `casino_open`, an entry per tab
 * with the pilot's name, refreshed every 10 s while the cabinet's open and settled by another load once it's 30 s
 * quiet; never synced to the cloud, so two devices can't both pay it):
 *   ← bridge-casino-hello                         → bridge-casino-wallet { ok, balance, pilot, high }
 *   ← bridge-casino-stake { id, amount, game, hold } → bridge-casino-staked { id, ok, balance }
 *   ← bridge-casino-pay { id, amount, game, key, hold } → bridge-casino-paid { id, balance }   (once per key)
 *   ← bridge-casino-hold { hold, game }
 *
 * Lifetime figures per game (staked, won) live in `bridge_casino` (cloud-saved). Poker's net — won minus staked,
 * a buy-in staked and a cash-out won — opens the high-roller room at HIGH_ROLLER: BridgeCasino.pokerWon().
 */
var BridgeCasino = (function () {
  var HIGH_ROLLER = 1000;
  var STATS = 'bridge_casino', OPEN = 'casino_open';
  var GAMES = ['blackjack', 'roulette', 'craps', 'poker', 'slots', 'derby', 'crash', 'runouts'];
  var NAMES = { blackjack: 'BLACKJACK', roulette: 'ROULETTE', craps: 'CRAPS', poker: "HOLD'EM", slots: 'SLOTS', derby: 'DERBY', crash: 'CRASH', runouts: 'RUNOUTS', lobby: 'ROYALE LINK' };
  var tab = Math.random().toString(36).slice(2, 9);
  var F = null;                                     // the open cabinet: { hold, game, keys, queue, staked, back, beat }

  // ---- figures --------------------------------------------------------------------------------------------------------
  function stats() { try { return JSON.parse(localStorage.getItem(STATS) || '{}') || {}; } catch (e) { return {}; } }
  function saveStats(s) { try { localStorage.setItem(STATS, JSON.stringify(s)); } catch (e) { /* private mode */ } }
  function tally(game, field, n) {
    if (!(n > 0)) return;
    var s = stats(), was = netPoker(s);
    s.games = s.games || {};
    var g = s.games[game] = s.games[game] || { staked: 0, won: 0 };
    g[field] += n;
    if (game === 'poker') { s.poker = s.poker || { staked: 0, won: 0 }; s.poker[field] += n; }
    var now = netPoker(s);
    if (game === 'poker' && now >= HIGH_ROLLER && was < HIGH_ROLLER && !s.noticed) {
      s.noticed = Date.now();
      setTimeout(function () { toast('The Neon Royale', 'The Royale has noticed you', 'The high-roller room is open'); sfx('quest'); }, 900);
    }
    saveStats(s);
  }
  function netPoker(s) { var p = (s || stats()).poker; return p ? p.won - p.staked : 0; }
  function pokerWon() { return netPoker(); }
  function unlocked() { return pokerWon() >= HIGH_ROLLER; }

  // ---- small things -----------------------------------------------------------------------------------------------------
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c, false); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function P() { return typeof BridgeProgression !== 'undefined' ? BridgeProgression : null; }
  function post(msg) { if (typeof BridgeCabinetModal !== 'undefined' && BridgeCabinetModal.post) BridgeCabinetModal.post(msg); }
  function coins(balance, delta) { if (typeof BridgeCabinetModal !== 'undefined' && BridgeCabinetModal.coins) BridgeCabinetModal.coins(balance, delta); }
  function pilotName() {
    var pl = typeof BridgeState !== 'undefined' && BridgeState.getPilot && BridgeState.getPilot();
    return (pl && pl.name) || '';
  }
  // what's on a table, per tab: { <tab>: { hold, game, pilot, at } } — a tab writes only its own
  function opens() { try { return JSON.parse(localStorage.getItem(OPEN) || '{}') || {}; } catch (e) { return {}; } }
  function setOpen(fn) {
    try {
      var o = opens(); fn(o);
      if (Object.keys(o).length) localStorage.setItem(OPEN, JSON.stringify(o)); else localStorage.removeItem(OPEN);
    } catch (e) { /* private mode */ }
  }
  function persist() {
    if (!F) return;
    setOpen(function (o) {
      if (F.hold > 0) o[tab] = { hold: F.hold, game: F.game, pilot: F.pilot || pilotName(), at: Date.now() };
      else delete o[tab];
    });
  }
  function award(n, why) {
    if (!(n > 0)) return Promise.resolve(null);
    var p = P();
    if (!p || !p.awardCoins) return Promise.resolve(null);
    return Promise.resolve(p.awardCoins(n, why)).catch(function () { return null; });
  }

  // ---- the interaction --------------------------------------------------------------------------------------------------
  function urlFor(inter) {
    var game = inter.game || 'lobby';
    if (game === 'lobby' || GAMES.indexOf(game) < 0) return '/runouts/?link=1' + (inter.stakes === 'high' ? '&stakes=high' : '');
    var q = '?game=' + encodeURIComponent(game);
    if (game === 'runouts' && inter.mode) q += '&mode=' + encodeURIComponent(inter.mode);
    q += '&table=' + encodeURIComponent(inter.table || game + '-1');
    if (inter.stakes === 'high') q += '&stakes=high';
    return '/runouts/' + q;
  }
  var HOUSES = { royale: { kicker: 'NEON ROYALE', skin: null }, chateau: { kicker: 'CHATEAU AURELLE', skin: 'chateau' } };
  function open(inter) {
    if (typeof BridgeCabinetModal === 'undefined') return;
    var game = inter.game || 'lobby';
    var house = HOUSES[inter.house] || HOUSES.royale;          // whose tables: the Neon Royale's, or Château Aurelle's salon (Hoarfell)
    BridgeCabinetModal.show({ url: urlFor(inter), title: (inter.label || NAMES[game] || 'ROYALE LINK').toUpperCase(), gameKey: 'runouts', frame: 'casino',
                              kicker: house.kicker, skin: house.skin });
  }

  // ---- the cabinet talking ----------------------------------------------------------------------------------------------
  function begin() {
    if (F) return F;
    F = { hold: 0, game: null, keys: {}, queue: Promise.resolve(), staked: 0, back: 0 };
    F.beat = setInterval(persist, 10000);
    return F;
  }
  function fromFrame(d) {
    var f = begin();
    var type = d.type.slice('bridge-casino-'.length);
    if (type === 'hello') {
      var p = P();
      var pl = typeof BridgeState !== 'undefined' && BridgeState.getPilot && BridgeState.getPilot();
      var name = (pl && pl.name) || (function () { try { return localStorage.getItem('bridge_pilot') || ''; } catch (e) { return ''; } })();
      if (!p || !name) { post({ type: 'bridge-casino-wallet', ok: false, reason: 'no_pilot' }); return; }
      f.pilot = name;
      Promise.resolve(p.getBalance()).then(function (b) {
        post({ type: 'bridge-casino-wallet', ok: b != null, reason: b == null ? 'no_pilot' : '', balance: b, pilot: name, high: unlocked() });
      }, function () { post({ type: 'bridge-casino-wallet', ok: false, reason: 'offline' }); });
      return;
    }
    // stakes and payouts go one at a time, in the order the game sent them
    f.queue = f.queue.then(function () { return handle(f, type, d); }).catch(function (e) { console.warn('[casino]', e); });
  }
  function handle(f, type, d) {
    if (type === 'hold') { f.hold = Math.max(0, Math.floor(d.hold || 0)); if (d.game) f.game = d.game; persist(); return null; }
    if (type === 'stake') {
      var amt = Math.floor(d.amount || 0), p = P();
      if (!(amt > 0) || !p || !p.wagerCoins) { post({ type: 'bridge-casino-staked', id: d.id, ok: false }); return null; }
      return Promise.resolve(p.wagerCoins(amt, 'casino:' + (d.game || 'royale'))).then(function (r) {
        var ok = !!(r && r.ok);
        if (ok) { f.hold = Math.max(0, Math.floor(d.hold || 0)); f.game = d.game || f.game; f.staked += amt; tally(d.game, 'staked', amt); persist(); coins(r.balance, -amt); }
        post({ type: 'bridge-casino-staked', id: d.id, ok: ok, balance: r && typeof r.balance === 'number' ? r.balance : undefined });
      }, function () { post({ type: 'bridge-casino-staked', id: d.id, ok: false }); });
    }
    if (type === 'pay') {
      var n = Math.floor(d.amount || 0), key = d.key || ('k' + d.id);
      if (f.keys[key]) { post({ type: 'bridge-casino-paid', id: d.id }); return null; }
      f.keys[key] = 1;
      f.hold = Math.max(0, Math.floor(d.hold || 0)); f.game = d.game || f.game;
      persist();
      return award(n, 'casino:' + (d.game || 'royale')).then(function (b) {
        if (n > 0) { f.back += n; tally(d.game, 'won', n); coins(b, n); }
        post({ type: 'bridge-casino-paid', id: d.id, balance: typeof b === 'number' ? b : undefined });
      });
    }
    return null;
  }

  // the cabinet's gone: what's on the table comes back, and how the visit went
  function frameClosed() {
    var f = F;
    if (!f) return;
    F = null;
    clearInterval(f.beat);
    f.queue.then(function () {
      var owed = f.hold, mine = { hold: owed, game: f.game, pilot: f.pilot || pilotName(), at: 0 }, key = tab + '-' + Date.now();
      f.hold = 0;
      setOpen(function (o) { delete o[tab]; });
      var done = function () {
        if (typeof BridgeCoinHUD !== 'undefined' && BridgeCoinHUD.refresh) setTimeout(BridgeCoinHUD.refresh, 300);
        var net = f.back - f.staked;
        if (f.staked > 0) toast('The Neon Royale', net > 0 ? 'Up ' + net + ' coins' : net < 0 ? 'Down ' + (-net) + ' coins' : 'Broke even', (owed > 0 ? owed + ' on the table came back · ' : '') + 'staked ' + f.staked);
      };
      if (owed > 0) award(owed, 'casino:' + (f.game || 'royale') + ':left').then(function (b) {
        if (b == null) { setOpen(function (o) { o[key] = mine; }); setTimeout(settleLeftover, 15000); return; }   // offline: it's paid when the Bridge can
        f.back += owed; tally(f.game, 'won', owed); done();
      });
      else done();
    });
  }

  // ---- a page that closed with chips on the table -------------------------------------------------------------------------
  // (another tab's entry that's gone quiet for 30 s: that tab closed; a pilot's chips go back only to that pilot)
  function settleLeftover() {
    clearTimeout(settleLeftover.t);
    var o = opens(), me = pilotName(), later = false;
    Object.keys(o).forEach(function (k) {
      var e = o[k];
      if (k === tab || !e || !(e.hold > 0)) return;
      if (e.pilot && me && e.pilot !== me) return;                     // someone else's: theirs when they're back
      if (!me || Date.now() - (e.at || 0) < 30000) { later = true; return; }   // not signed in yet / that tab may still be open
      setOpen(function (x) { delete x[k]; });
      award(e.hold, 'casino:' + (e.game || 'royale') + ':left').then(function (b) {
        if (b == null) { setOpen(function (x) { x[k] = e; }); settleLeftover.t = setTimeout(settleLeftover, 30000); return; }
        tally(e.game, 'won', e.hold);
        toast('The Neon Royale', 'Your chips came back', e.hold + ' coins left on a table');
        if (typeof BridgeCoinHUD !== 'undefined' && BridgeCoinHUD.refresh) BridgeCoinHUD.refresh();
      });
    });
    if (later) settleLeftover.t = setTimeout(settleLeftover, 15000);
  }

  // ---- the old Runouts cabinets are Royale Link terminals now ---------------------------------------------------------------
  function decorate(worldId, w) {
    if (!w || !w.interactions || w._casino) return;
    w._casino = 1;
    w.interactions.forEach(function (it) {
      if ((it.type === 'cabinet' || it.type === 'app') && /^\/runouts\/?$/.test(it.target || '')) {
        it.target = '/runouts/?link=1'; it.label = 'ROYALE LINK'; it.prompt = 'PRESS E TO PLAY';
      }
      if (it.type === 'game_slot' && it.game === 'runouts') it.label = 'ROYALE LINK';
    });
  }

  // ---- the frame's look ---------------------------------------------------------------------------------------------
  function style() {
    if (document.getElementById('casino-css')) return;
    var s = document.createElement('style');
    s.id = 'casino-css';
    s.textContent =
      // gold on velvet: a crimson-to-plum bar trimmed in gold, a gilt edge round the screen
      '#cabinet-modal-overlay.cm-casino { --cm-a: #e0c060; --cm-b: #fff0a8; --cm-bar: linear-gradient(180deg, #5a1238 0%, #3a0c2a 55%, #1e0618 100%); background: rgba(14, 4, 14, 0.97); }' +
      '#cabinet-modal-overlay.cm-casino .cm-bar { border-bottom: 3px solid #e0c060; box-shadow: 0 2px 0 #7a5a20, 0 5px 0 #0c0410, 0 0 24px rgba(240, 120, 168, 0.3);' +
        ' background-image: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.025) 0 2px, transparent 2px 6px), var(--cm-bar); }' +
      '#cabinet-modal-overlay.cm-casino .cm-kicker { color: #f078a8; text-shadow: 0 0 8px rgba(240, 120, 168, 0.75); }' +
      '#cabinet-modal-overlay.cm-casino .cm-title { color: #fff0a8; text-shadow: 0 1px 0 #6a3a10; }' +
      '#cabinet-modal-overlay.cm-casino .cm-sep { color: #a08040; }' +
      '#cabinet-modal-overlay.cm-casino .cm-coins { border-color: #e0c060; background: rgba(30, 6, 20, 0.7); box-shadow: inset 0 0 0 1px #5a3a10; }' +
      '#cabinet-modal-overlay.cm-casino #cabinet-leave-btn { border-color: #e0c060; color: #fff0a8; background: rgba(90, 18, 56, 0.6); }' +
      '#cabinet-modal-overlay.cm-casino #cabinet-leave-btn:hover { background: rgba(140, 30, 80, 0.7); }' +
      '#cabinet-modal-overlay.cm-casino .cm-screen { background: #0e0618; box-shadow: inset 0 0 0 3px #0c0410, inset 0 0 0 6px #a08040, inset 0 0 0 7px #ffe080, inset 0 0 0 9px #0c0410; }' +
      '#cabinet-modal-overlay.cm-casino #cabinet-iframe { inset: 9px; width: calc(100% - 18px); height: calc(100% - 18px); background: #0e0618; }' +
      // Château Aurelle's salon: cream and verdigris and gilt, a carved frame round the table instead of neon
      '#cabinet-modal-overlay.cm-casino.cm-chateau { --cm-a: #d8b060; --cm-b: #f6ecd4; --cm-bar: linear-gradient(180deg, #2e524c 0%, #1e3a36 55%, #12241f 100%); background: rgba(10, 18, 16, 0.97); }' +
      '#cabinet-modal-overlay.cm-casino.cm-chateau .cm-bar { border-bottom: 3px solid #d8b060; box-shadow: 0 2px 0 #6a5020, 0 5px 0 #0a1210, 0 0 18px rgba(216, 176, 96, 0.25);' +
        ' background-image: repeating-linear-gradient(90deg, rgba(246, 236, 212, 0.035) 0 1px, transparent 1px 9px), var(--cm-bar); }' +
      '#cabinet-modal-overlay.cm-casino.cm-chateau .cm-kicker { color: #f6ecd4; letter-spacing: 3px; text-shadow: 0 1px 0 #0a1210; }' +
      '#cabinet-modal-overlay.cm-casino.cm-chateau .cm-title { color: #e8c878; text-shadow: 0 1px 0 #3a2a10; }' +
      '#cabinet-modal-overlay.cm-casino.cm-chateau .cm-sep { color: #8a7a50; }' +
      '#cabinet-modal-overlay.cm-casino.cm-chateau .cm-coins { border-color: #d8b060; background: rgba(10, 24, 20, 0.7); box-shadow: inset 0 0 0 1px #4a3a18; }' +
      '#cabinet-modal-overlay.cm-casino.cm-chateau #cabinet-leave-btn { border-color: #d8b060; color: #f6ecd4; background: rgba(30, 58, 54, 0.7); }' +
      '#cabinet-modal-overlay.cm-casino.cm-chateau #cabinet-leave-btn:hover { background: rgba(46, 82, 76, 0.85); }' +
      '#cabinet-modal-overlay.cm-casino.cm-chateau .cm-screen { background: #12241f; box-shadow: inset 0 0 0 3px #0a1210, inset 0 0 0 5px #f0e4c8, inset 0 0 0 7px #a88a40, inset 0 0 0 8px #f6dc90, inset 0 0 0 10px #0a1210; }' +
      '#cabinet-modal-overlay.cm-casino.cm-chateau #cabinet-iframe { inset: 10px; width: calc(100% - 20px); height: calc(100% - 20px); background: #12241f; }';
    document.head.appendChild(s);
  }

  function init() {
    style();
    if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) BridgeInteractions.register('casino', open, 'Play');
    if (typeof BridgeState !== 'undefined' && BridgeState.onChange) {
      BridgeState.onChange(function (s) { if (s === 'world' && typeof BridgeWorld !== 'undefined') decorate(BridgeWorld.getWorldId(), BridgeWorld.getWorld()); });
    }
    if (typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld && BridgeWorld.getWorld()) decorate(BridgeWorld.getWorldId(), BridgeWorld.getWorld());
    setTimeout(settleLeftover, 5000);
    window.addEventListener('pagehide', persist);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return {
    open: open, urlFor: urlFor, fromFrame: fromFrame, frameClosed: frameClosed, decorate: decorate,
    pokerWon: pokerWon, unlocked: unlocked, HIGH_ROLLER: HIGH_ROLLER, GAMES: GAMES, stats: stats,
    _state: function () { return F; }
  };
})();
