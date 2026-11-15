/**
 * BridgeArcadiaDeep — Arcadia, deeper (spec-deeper-worlds A3, A5–A8): the small things that send you between the city's
 * levels and give its people something to do with you. Each lives on what's already drawn and who's already there.
 *
 *   A7  Chrome All the Way Up (assets/quests.json `iris-arm`): this module keeps its one gate — the hand in the heap under
 *       Saint Ruin's throne is only yours once you've beaten him (`ruin-beaten`, from js/undercity.js's save: his trophy
 *       dropped, or beaten today).
 *   A3  Fishing in the Sump: js/fishing.js's `sump` pool (assets/fishing.json: two spots off the Sump's quays, one off the
 *       drowned station's platform), the line-caught `sump_eel` (js/fishart.js draws it), Teo buying it (js/undercity.js
 *       `boat`), Gage the rest; its use line here (`USES`).
 *   A5  Chrome you can tune: js/implants.js — the chop shop's `steady` (two chrome parts and a circuit: a street piece
 *       glitches half as often for a week, `slots[slot].steady`) and LUMEN's `deposit` (a chrome part off a designer
 *       piece, js/spires.js); the parts' use lines here.
 *   A6  The Orrery, worth joining: Lady Perpetua deals Eights for stakes (js/eights.js `at`), Sir Augustin keeps a wager
 *       book on the week (the regatta's last start, the Pit's big bout), the members' book lists your firsts — an
 *       interaction type `orrery` (`act`: eights | wager | book), from people's topics (`use`) and the book itself.
 *
 *   BridgeArcadiaDeep.decorate(worldId, data)   (js/world.js, as a world loads)
 */
var BridgeArcadiaDeep = (function () {
  function has(n) { return typeof window[n] !== 'undefined'; }

  // ---- A7: the gate on the heap -------------------------------------------------------------------------------------
  function ruinBeaten() {
    if (!has('BridgeUndercity') || !BridgeUndercity._save) return true;
    var s = BridgeUndercity._save();
    return !!(s && (s.knuckles || s.ruin));
  }
  if (has('BridgeQuests') && BridgeQuests.gate) BridgeQuests.gate('ruin-beaten', ruinBeaten);

  // ---- what its things are for (js/uses.js reads `USES` as a module's own lines) ---------------------------------------
  var USES = [
    { id: 'sump_eel', p: 7, t: '<b>Old Teo</b> buys it off his noodle boat in the Sump, for the laksa: more than a fillet fetches' },
    { id: 'chrome_part', p: 8, t: '<b>Steady street chrome:</b> Doc Sallow takes two, and a circuit board, and it glitches half as often for a week' },
    { id: 'chrome_part', p: 6, t: '<b>A deposit:</b> Iris Kade takes one off the price of a designer piece at LUMEN' },
    { id: 'circuit', p: 8, t: '<b>Steady street chrome:</b> Doc Sallow takes one, and two chrome parts, and it glitches half as often for a week' }
  ];

  // ---- A6: the Orrery, worth joining -----------------------------------------------------------------------------------
  // Kept in localStorage bridge_orrery (cloud-saved): { bets: { key: { pick, stake, odds, at, done, won } }, firsts: { key: t } }
  var KEY = 'bridge_orrery', DAY = 86400000, MIN = 60000;
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; s.bets = s.bets || {}; s.firsts = s.firsts || {}; return s; } catch (e) { return { bets: {}, firsts: {} }; } }
  function store(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private */ } }
  function now() { return has('BridgeClock') && BridgeClock.now ? BridgeClock.now() : Date.now(); }
  function etOff(ms) { return has('BridgeClock') && BridgeClock.etAt ? BridgeClock.etAt(ms) - ms : -4 * 3600000; }
  function say(who, t) { BridgeInteractions.say(who, t); }
  function sfx(n) { if (has('BridgeAudio') && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function toast(a, b, c) { if (has('BridgeQuests') && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function pay(n, why) {
    if (!has('BridgeProgression') || !BridgeProgression.wagerCoins) return Promise.resolve({ ok: false });
    return BridgeProgression.wagerCoins(n, why).then(function (r) { return r || { ok: false }; }, function () { return { ok: false }; });
  }
  function award(n, why) { if (has('BridgeProgression') && BridgeProgression.awardCoins) BridgeProgression.awardCoins(n, why); }
  function first(key) { var s = load(); if (s.firsts[key]) return false; s.firsts[key] = now(); store(s); return true; }

  // Lady Perpetua deals Eights for stakes at the card table (js/eights.js `at`): heads up, seven cards each; she holds her
  // eights to the last and changes the suit on you when you're close — "I cheat, and it's so tiresome when people notice"
  var PERPETUA = { id: 'perpetua', name: 'Lady Perpetua', sheet: 'npc-member-a', style: { hoard: 1, spite: 1 },
    say: { eight: 'AN EIGHT, DARLING.', draw: 'HOW TIRESOME.', last: 'ONE LEFT. DON\'T LOOK SO WORRIED.', win: 'THE DUCHESS TAUGHT ME THAT ONE.', lose: 'WELL. SOMEBODY HAS BEEN PRACTISING.' } };
  var STAKES = [25, 100];
  function eights() {
    if (!has('BridgeEights') || !BridgeEights.at) return say('LADY PERPETUA', 'SHE SHUFFLES, LOOKS AT YOU, AND DEALS HERSELF ANOTHER HAND OF PATIENCE.');
    BridgeInteractions.choose({
      title: 'Eights with Lady Perpetua',
      text: 'SHE SWEEPS HER PATIENCE INTO A PILE. "EIGHTS. MATCH THE SUIT OR THE NUMBER, EIGHTS ARE WILD, FIRST OUT TAKES THE POT. I PUT IN WHAT YOU PUT IN, DARLING. I ALWAYS DO."',
      rows: STAKES.map(function (st) {
        return { label: 'Sit down for ' + st, sub: st + ' coins each, heads up: the winner takes ' + (st * 2), note: st + ' coins', pick: function () { deal(st); } };
      }).concat([{ label: 'Just the game', sub: 'for the pleasure of it', pick: function () { deal(0); } }]),
      closeLabel: 'Not tonight'
    });
  }
  function deal(stake) {
    BridgeEights.at({ title: 'Eights at the Orrery', rivals: [PERPETUA], onOver: function (o) {
      if (o.won && o.stake && first('eights')) toast('The Orrery', 'Beat Lady Perpetua at Eights', 'Mr Ashdown writes it in the members\' book');
    } }, stake);
  }

  // Sir Augustin's wager book on the week: the Emerald Regatta's last start on Friday (which of the Emerald's own sloops
  // takes it — js/race.js `fleetFor`, the same boats and speeds everyone's race sees) and the Pit's big bout on Saturday
  // night (Tally's house bout at 10pm Eastern, js/undercity.js `_bout`: the same fighters and winner). Odds from the
  // chances, as a bookmaker would (the regatta's worked out over the sloops' form, not today's wind and luck); a bet a
  // wager, taken until the gun or the bell; settled, paid at his chair.
  var GOOD = 0.9;
  function weekStart(ms) {                                   // the Sunday that starts this week, as an Eastern day number
    var d = Math.floor((ms + etOff(ms)) / DAY), dow = ((d + 4) % 7 + 7) % 7;
    return d - dow;
  }
  function etToMs(etMs) { return etMs - etOff(etMs); }
  function odds(p) { return Math.min(50, Math.max(1.2, Math.round(GOOD / Math.max(0.01, p) * 10) / 10)); }
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function regattaWager(ws) {
    if (!has('BridgeRace') || !BridgeRace.fleetFor || !BridgeRace.REGATTA) return null;
    var R = BridgeRace.REGATTA, step = R.every * MIN, et = (ws + R.dow) * DAY + R.to * 3600000 - step, slot = Math.round(et / step), at = etToMs(et);
    var boats = BridgeRace.fleetFor(slot, at), form = {};
    R.fleet.forEach(function (b) { form[b[0]] = b[1]; });
    // each boat's chance from its form, the luck of the day (±4%) worked over a fixed set of draws: the same on every page
    var wins = boats.map(function () { return 0; }), N = 1500;
    for (var k = 0; k < N; k++) {
      var best = -1, bi = 0;
      boats.forEach(function (b, i) { var v = form[b.name] * (0.96 + hash(k * 13.7 + i * 3.3) * 0.08); if (v > best) { best = v; bi = i; } });
      wins[bi]++;
    }
    var win = boats.slice().sort(function (a, b) { return b.v - a.v; })[0].name;
    return { key: 'regatta-' + slot, title: 'The Emerald Regatta', when: 'Friday\'s last start, 11:45pm', at: at, win: win,
             picks: boats.map(function (b, i) { return { name: b.name, odds: odds(wins[i] / N) }; }),
             line: function (w) { return w.toUpperCase() + ' TAKES THE LAST START OFF CROWNHAVEN.'; } };
  }
  function boutWager(ws) {
    if (!has('BridgeUndercity') || !BridgeUndercity._bout) return null;
    var at = etToMs((ws + 6) * DAY + 22 * 3600000 + 5 * MIN), B = BridgeUndercity._bout(at);
    return { key: 'bout-' + B.slot, title: 'The Pit\'s big bout', when: 'Saturday night, 10pm', at: at, win: B.win,
             picks: [{ name: B.a, odds: odds(B.pa) }, { name: B.b, odds: odds(1 - B.pa) }],
             line: function (w) { return w + ' IS LEFT STANDING IN THE PIT.'; } };
  }
  function wagers(ms) { var ws = weekStart(ms == null ? now() : ms); return [regattaWager(ws), boutWager(ws)].filter(Boolean); }
  // bets whose race or bout is over: settled and paid, once
  function settle() {
    var s = load(), t = now(), out = [];
    Object.keys(s.bets).forEach(function (k) {
      var b = s.bets[k];
      if (b.done || t < b.at) return;
      b.done = t; b.won = b.pick === b.win;
      if (b.won) { award(Math.round(b.stake * b.odds), 'casino:orrery-wager-won'); if (!s.firsts.wager) s.firsts.wager = t; }
      out.push(b);
    });
    if (out.length) store(s);
    return out;
  }
  function book() {
    var paid = settle(), s = load(), t = now(), rows = [];
    var told = paid.map(function (b) {
      return b.title.toUpperCase() + ': ' + b.line + (b.won ? ' YOU HAD ' + b.stake + ' ON IT AT ' + b.odds + ' TO 1. HE COUNTS OUT ' + Math.round(b.stake * b.odds) + '.' : ' YOU HAD ' + String(b.pick).toUpperCase() + '. "HARD LUCK."');
    });
    if (paid.some(function (b) { return b.won; })) sfx('coin');
    wagers().forEach(function (W) {
      var mine = s.bets[W.key];
      if (mine) { rows.push({ label: W.title, sub: mine.done ? (mine.won ? 'won: ' + mine.pick : 'lost: ' + W.win + ' won it') : 'your ' + mine.stake + ' on ' + mine.pick + ' at ' + mine.odds + ' to 1 · ' + W.when, note: mine.done ? 'settled' : 'on', info: true }); return; }
      if (t >= W.at) { rows.push({ label: W.title, sub: W.win + ' won it · ' + W.when, note: 'over', info: true }); return; }
      W.picks.forEach(function (P) {
        [50, 200].forEach(function (st) {
          rows.push({ label: P.name + ' for ' + st, sub: W.title + ' · ' + W.when + ' · pays ' + P.odds + ' to 1', note: st + ' coins', pick: function () { bet(W, P, st); } });
        });
      });
    });
    BridgeInteractions.choose({
      title: 'Sir Augustin\'s book',
      text: (told.length ? told.join('\n\n') + '\n\n' : '') + 'A LEATHER BOOK ON HIS KNEE, THE WEEK RULED OFF IN RED INK. "THE REGATTA AND THE PIT. I TAKE ANY GENTLEMAN\'S MONEY, AND SEVERAL LADIES\'. ONE BET A RACE."',
      rows: rows, closeLabel: 'Close the book'
    });
  }
  function bet(W, P, stake) {
    pay(stake, 'casino:orrery-wager').then(function (r) {
      if (!r.ok) return say('SIR AUGUSTIN', '"NO COINS? THEN NO BOOK. I\'M OLD, NOT A CHARITY."');
      var s = load();
      if (s.bets[W.key]) return;
      s.bets[W.key] = { pick: P.name, stake: stake, odds: P.odds, at: W.at, win: W.win, title: W.title, line: W.line(W.win) };
      store(s); sfx('coin');
      say('SIR AUGUSTIN', 'HE WRITES IT IN WITHOUT OPENING HIS OTHER EYE. "' + stake + ' ON ' + String(P.name).toUpperCase() + ', ' + P.odds + ' TO ONE. COME BACK AFTER ' + W.when.toUpperCase() + ' AND I\'LL SETTLE."');
    });
  }

  // the members' book: a line in Mr Ashdown's hand for each of your firsts — what the game already keeps, dated where it
  // knows when (quests), else from the day the book first saw it
  function firsts() {
    var s = load(), out = [], seen = function (k) { if (!s.firsts[k]) { s.firsts[k] = now(); dirty = true; } return s.firsts[k]; }, dirty = false;
    var sp = has('BridgeSpires') ? (function () { try { return JSON.parse(localStorage.getItem('bridge_spires') || '{}'); } catch (e) { return {}; } })() : {};
    if (sp.member) out.push({ t: sp.since || seen('member'), text: 'Elected to the Orrery' + (sp.how && sp.how !== 'bought' ? ', introduced by ' + sp.how : '') });
    if (has('BridgeQuests') && BridgeQuests.finished) BridgeQuests.finished().forEach(function (f) { var q = BridgeQuests.def(f.id); if (q) out.push({ t: f.at, text: 'Saw "' + q.title + '" through' }); });
    var U = has('BridgeUndercity') && BridgeUndercity._save ? BridgeUndercity._save() : {};
    if (U.knuckles) out.push({ t: seen('ruin'), text: 'Put Saint Ruin down, in his own yard' });
    if (U.heart) out.push({ t: seen('dredge'), text: 'Sank the Dredge' });
    if (U.ring) out.push({ t: seen('pit'), text: 'Won the Pit\'s three rounds' });
    var reg = (function () { try { return JSON.parse(localStorage.getItem('bridge_regatta') || '{}'); } catch (e) { return {}; } })();
    if (reg.cup) out.push({ t: seen('cup'), text: 'Took the Regatta Cup' });
    if (has('BridgeFishing') && BridgeFishing.journal) BridgeFishing.journal().fish.filter(function (f) { return f.tier === 3; }).forEach(function (f) { out.push({ t: seen('fish-' + f.id), text: 'Landed ' + (/^[AEIOU]/i.test(f.name) ? 'an ' : 'a ') + f.name }); });
    if (s.firsts.eights) out.push({ t: s.firsts.eights, text: 'Beat Lady Perpetua at Eights, for money' });
    if (s.firsts.wager) out.push({ t: s.firsts.wager, text: 'Won a wager off Sir Augustin' });
    if (dirty) store(s);
    return out.sort(function (a, b) { return a.t - b.t; });
  }
  function membersBook() {
    var L = firsts(), name = has('BridgeState') && BridgeState.getPilot && BridgeState.getPilot() ? String(BridgeState.getPilot().name || '').toUpperCase() : 'YOU';
    var date = function (t) { var d = new Date(t); return d.getDate() + ' ' + ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getMonth()]; };
    BridgeInteractions.choose({
      title: 'The members\' book',
      text: 'NAMES IN INK GOING BACK THREE HUNDRED YEARS. ON THE LAST PAGE, IN MR ASHDOWN\'S COPPERPLATE: ' + name + '.' +
        (L.length > 1 ? '' : '\n\n"WE WRITE IN WHAT A MEMBER HAS DONE, THE FIRST TIME THEY DO IT," SAYS MR ASHDOWN. "THE PAGE IS LOOKING FORWARD TO IT."'),
      rows: L.slice(-14).reverse().map(function (l) { return { label: l.text, note: date(l.t), info: true }; }),
      closeLabel: 'Close it'
    });
  }

  function orrery(inter) {
    var a = inter.act;
    if (a === 'eights') return eights();
    if (a === 'wager') return book();
    if (a === 'book') return membersBook();
  }
  function init() { if (has('BridgeInteractions') && BridgeInteractions.register) BridgeInteractions.register('orrery', orrery, 'Look'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  function decorate(worldId, data) {
    (data.interactions || []).forEach(function (it) {
      if (worldId === 'arcadia-members' && it.label === 'THE MEMBERS\' BOOK' && it.type === 'dialog') { it.type = 'orrery'; it.act = 'book'; it.prompt = 'PRESS E TO READ'; }
    });
  }

  return { decorate: decorate, ruinBeaten: ruinBeaten, USES: USES, wagers: wagers, settle: settle, firsts: firsts, _st: load };
})();
