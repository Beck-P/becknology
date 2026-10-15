/**
 * BridgeHarbour — the harbourmasters of Lumar's ports: your ships, the yards, fitting out, hands, the hold and the
 * market, all from one person at the head of each pier.
 *
 * Each island's harbourmaster stands by its pier (PORTS: `at`, added to the world as it loads, like the Peddler) and is
 * a person in assets/people.json (label HARBOURMASTER) whose `harbour` topic opens the book:
 *   - YOUR SHIPS: every ship you own, where she lies, her hull, hold, guns and hands; take one out, rename her, sell her
 *     to a yard;
 *   - THE YARD: the ships this port builds (each sea its own: cutters on Diggen's Point, brigantines at Sapphire's
 *     great yard, everything up to a galleon at the Royal Yard in Crownhaven, the raider from Crimson's pirate slip);
 *   - FIT OUT: guns for her slots and fittings, each port its own (Crimson's heavy guns, Rose's crystal sails and
 *     roseite sheathing, the Ferryman's moonglass);
 *   - REPAIRS: patch her hull;
 *   - SIGN ON HANDS: the three people looking for a berth here today (js/fleet.js `recruits`, each sea its own);
 *   - THE HOLD: your pack to her hold and back (ore, gems, crystals and fish you've found go to market by the crate);
 *   - MARKET: buy this port's goods into her hold, sell anything in it (js/trade.js);
 *   - CONTRACTS: two a day, carry goods to another port for a fee - and any due here are handed over as you open the book.
 */
var BridgeHarbour = (function () {
  var PORTS = {
    'lumar':          { at: [9, 13], face: 'left', who: 'Bess Tolliver', sheet: 'npc-hm-bess', yard: ['cutter'],
                        guns: ['swivel', 'long_nine'], fits: ['sheathing', 'oak'] },
    'lumar-crown':    { at: [24, 32], face: 'left', who: 'Rowena Ashgrove', sheet: 'npc-hm-rowena', yard: ['cutter', 'brigantine', 'galleon'],
                        guns: ['swivel', 'long_nine', 'carronade', 'chaser'], fits: ['sheathing', 'oak'] },
    'lumar-tern':     { at: [18, 16], face: 'right', who: 'Old Pell', sheet: 'npc-hm-pell', yard: [], guns: ['swivel'], fits: [] },
    'lumar-sapphire': { at: [30, 24], face: 'left', who: 'Aldous Penhallow', sheet: 'npc-hm-aldous', yard: ['cutter', 'brigantine'],
                        guns: ['swivel', 'long_nine', 'carronade'], fits: ['sheathing', 'oak'] },
    'lumar-rose':     { at: [30, 19], face: 'left', who: 'Mira Quell', sheet: 'npc-hm-mira', yard: [],
                        guns: [], fits: ['crystal_sails', 'roseite'] },
    'lumar-crimson':  { at: [31, 35], face: 'left', who: 'Garro', sheet: 'npc-hm-garro', yard: ['raider'],
                        guns: ['swivel', 'long_nine', 'carronade', 'chaser'], fits: ['storm_rig', 'oak'] },
    'lumar-midnight': { at: [26, 35], face: 'left', who: 'the Ferryman', sheet: 'npc-ferryman', yard: [],
                        guns: ['moon_harpoon'], fits: ['moon_lantern'] },
    'lumar-holm':     { at: null, own: true, who: 'Your own', yard: [], guns: [], fits: [] }      // your island: js/holm.js keeps its book
  };
  var LABEL = 'HARBOURMASTER';

  function F() { return typeof BridgeFleet !== 'undefined' ? BridgeFleet : null; }
  function T() { return typeof BridgeTrade !== 'undefined' ? BridgeTrade : null; }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function why(r) {
    var x = r && r.reason;
    return x === 'offline' || x === 'no_client' || x === 'no_pilot' || x === 'error' ? 'NO WAY TO MOVE COINS RIGHT NOW.' :
           x === 'slots' ? 'EVERY GUN PORT SHE HAS IS FULL.' : x === 'fitted' ? 'SHE HAS ONE ALREADY.' :
           x === 'berths' ? 'NO BERTH FREE ON ANY SHIP OF YOURS HERE.' : x === 'full' ? 'HER HOLD IS FULL.' :
           x === 'sold_out' ? 'SOLD OUT FOR TODAY.' : x === 'cargo' ? 'EMPTY HER HOLD FIRST.' : 'NOT ENOUGH COINS.';
  }
  function portOf(worldId) { var f = F(); var P = f ? f.islandOf(worldId) : worldId; return PORTS[P] ? P : null; }

  // ---- in the world: the harbourmaster at the head of the pier ----------------------------------------------------
  function decorate(worldId, data) {
    var P = PORTS[worldId];
    if (!P || !P.at || !data) return;
    data.interactions = (data.interactions || []).filter(function (it) { return it.label !== LABEL; });
    data.interactions.push({ x: P.at[0], y: P.at[1], type: 'dialog', label: LABEL, prompt: 'PRESS E TO TALK', text: '...' });
    if (data.scene) {
      data.scene.actors = (data.scene.actors || []).filter(function (a) { return a.sheet !== P.sheet; });
      data.scene.actors.push({ sheet: P.sheet, x: P.at[0], y: P.at[1], facing: P.face });
    }
    if (data.collisions && data.collisions[P.at[1]]) data.collisions[P.at[1]][P.at[0]] = 1;
  }

  // ---- the book ---------------------------------------------------------------------------------------------------
  function open(worldId, intro) {
    var P = portOf(worldId), f = F(), t = T();
    if (!P || !f) return;
    var Pd = PORTS[P];
    // contracts due here: handed over before anything else
    var due = t ? t.mine().filter(function (c) { return c.to === P; }) : [];
    if (due.length) {
      var ships = f.here(worldId);
      Promise.all(ships.map(function (s) { return t.deliver(s, P); })).then(function (res) {
        var done = [].concat.apply([], res).filter(function (r) { return r.ok; });
        done.forEach(function (r) { toast('Contract', r.contract.n + ' × ' + t.name(r.contract.good) + ' delivered', '+' + r.contract.fee + ' coins'); sfx('coin'); });
        menu(worldId, intro, done.length ? 'CONTRACT' + (done.length > 1 ? 'S' : '') + ' DELIVERED. THE FEE IS YOURS.' : null);
      });
      return;
    }
    menu(worldId, intro);
  }
  function menu(worldId, intro, note) {
    var P = portOf(worldId), Pd = PORTS[P], f = F(), here = f.here(worldId);
    var hurt = here.filter(function (s) { return f.repairCost(s) > 0; });
    var rows = [
      { label: 'Your ships', sub: f.all().length + ' in all, ' + here.length + ' here', pick: function () { ledger(worldId); } }
    ];
    if (Pd.yard.length) rows.push({ label: 'The yard', sub: Pd.yard.map(function (y) { return f.spec(y).name; }).join(', '), pick: function () { yard(worldId); } });
    if (Pd.guns.length || Pd.fits.length) rows.push({ label: 'Fit out', sub: Pd.guns.concat(Pd.fits).map(function (g) { return (f.GUNS[g] || f.FITS[g]).name; }).join(', '),
                                                      pick: function () { pickShip(worldId, 'Fit out which ship?', fitOut); } });
    rows.push({ label: 'Repairs', sub: hurt.length ? hurt.map(function (s) { return s.name + ' ' + Math.round(s.hull * 100) + '%'; }).join(', ') : 'all sound',
                disabled: !hurt.length, pick: function () { repairs(worldId); } });
    rows.push({ label: 'Sign on hands', sub: f.recruits(worldId).filter(function (r) { return !r.signed; }).length + ' looking for a berth today', pick: function () { hands(worldId); } });
    rows.push({ label: 'The hold', sub: 'your pack to her hold, and back', pick: function () { pickShip(worldId, 'Whose hold?', hold); } });
    rows.push({ label: 'Market', sub: 'buy and sell cargo', pick: function () { pickShip(worldId, 'Trade from which ship?', market); } });
    rows.push({ label: 'Contracts', sub: T() ? T().mine().length + ' taken' : '', pick: function () { contracts(worldId); } });
    if (typeof BridgeChart !== 'undefined') {
      var unc = ['sapphire', 'rose', 'crimson', 'midnight'].filter(function (s) { return !BridgeChart.charted(s); }).length;
      rows.push({ label: 'Charts', sub: unc ? unc + ' sea' + (unc > 1 ? 's' : '') + ' still uncharted' : 'every sea charted', pick: function () { BridgeChart.shop(worldId, null, function () { menu(worldId); }); } });
    }
    choose({ title: Pd.who + ', harbourmaster', text: note || intro || 'WHAT CAN I DO FOR YOU?', rows: rows, closeLabel: 'Done' });
  }
  function pickShip(worldId, title, then) {
    var f = F(), here = f.here(worldId);
    if (here.length === 1) { then(worldId, here[0]); return; }
    choose({ title: title, rows: here.map(function (s) { return { label: s.name, sub: f.line(s), pick: function () { then(worldId, s); } }; }),
             buttons: [{ label: 'Back', act: function () { menu(worldId); } }], closeLabel: 'Done' });
  }

  // ---- your ships -------------------------------------------------------------------------------------------------
  function ledger(worldId) {
    var f = F(), isle = f.islandOf(worldId), act = f.active().ship;
    choose({
      title: 'Your ships',
      text: 'EVERY SHIP YOU OWN, AND WHERE SHE LIES. THE ONE MARKED ⚓ IS THE ONE YOU\'LL TAKE OUT.',
      rows: f.all().map(function (s) {
        var hereNow = s.type === 'sloop' || s.at === isle;
        return { label: (s.id === act.id ? '⚓ ' : '') + s.name, sub: f.line(s) + ' — ' + f.where(s), note: hereNow ? 'here' : 'away',
                 pick: function () { shipCard(worldId, s); } };
      }),
      buttons: [{ label: 'Back', act: function () { back(worldId); } }],
      closeLabel: 'Done'
    });
  }
  function back(worldId) { var P = PORTS[portOf(worldId)]; if (P && P.own && typeof BridgeHolm !== 'undefined') BridgeHolm.ledger(); else menu(worldId); }
  function shipCard(worldId, s, note) {
    var f = F(), sp = f.effective(s), base = f.spec(s.type), isle = f.islandOf(worldId), hereNow = s.type === 'sloop' || s.at === isle;
    var crew = f.crewOn(s.id), Pd = PORTS[portOf(worldId)];
    var rows = [
      { label: 'Hull', sub: Math.round(s.hull * 100) + '% of ' + sp.hull, note: f.repairCost(s) ? f.repairCost(s) + ' to mend' : 'sound', disabled: true },
      { label: 'Hold', sub: (T() ? T().crates(s) : 0) + ' of ' + sp.hold + ' crates', note: '', disabled: true },
      { label: 'Guns', sub: s.guns.length ? s.guns.map(function (g) { return f.GUNS[g].name; }).join(', ') : 'none', note: s.guns.length + '/' + base.slots, disabled: true },
      { label: 'Fittings', sub: s.fits.length ? s.fits.map(function (g) { return f.FITS[g].name; }).join(', ') : 'none', disabled: true },
      { label: 'Hands', sub: crew.length ? crew.map(function (c) { return c.name + ' (' + f.ROLES[c.role].name.toLowerCase() + ')'; }).join(', ') : 'none',
        note: crew.length + '/' + base.crew + ' needed', pick: function () { crewCard(worldId, s); } }
    ];
    var buttons = [];
    if (hereNow && s.id !== f.active().ship.id) buttons.push({ label: 'Take her out', act: function () { f.sail(s.id); sfx('click'); shipCard(worldId, s, 'SHE\'S THE ONE YOU\'LL SAIL. GO SAILING FROM THE PIER.'); } });
    buttons.push({ label: 'Rename', act: function () { rename(worldId, s); } });
    if (hereNow && s.type !== 'sloop' && Pd.yard.length) buttons.push({ label: 'Sell (' + f.value(s) + ')', act: function () { sellShip(worldId, s); } });
    buttons.push({ label: 'Back', act: function () { ledger(worldId); } });
    choose({ title: s.name + ', ' + base.name.toLowerCase(), text: note || base.blurb.toUpperCase(), rows: rows, buttons: buttons, closeLabel: 'Done' });
  }
  function rename(worldId, s) {
    choose({ title: 'Rename her', text: 'WHAT\'LL YOU CALL HER?', input: { value: s.name, max: 24, button: 'Paint it on', placeholder: s.name,
             submit: function (v) { F().rename(s.id, v); shipCard(worldId, s, 'THE NEW NAME\'S PAINTED ON HER STERN.'); } },
             buttons: [{ label: 'Back', act: function () { shipCard(worldId, s); } }] });
  }
  function sellShip(worldId, s) {
    var f = F();
    choose({ title: 'Sell the ' + s.name + '?', text: 'THE YARD GIVES ' + f.value(s) + ' COINS FOR HER. HER HANDS ARE PAID OFF AT THE QUAY.',
             buttons: [{ label: 'Sell her', act: function () {
               f.sellShip(s.id).then(function (r) {
                 if (!r.ok) { shipCard(worldId, s, why(r)); return; }
                 toast('Ship sold', s.name, '+' + r.value + ' coins'); sfx('coin');
                 ledger(worldId);
               });
             } }, { label: 'Keep her', act: function () { shipCard(worldId, s); } }] });
  }
  function crewCard(worldId, s) {
    var f = F(), crew = f.crewOn(s.id), others = f.all().filter(function (o) { return o.id !== s.id && f.crewOn(o.id).length < f.berths(o); });
    choose({
      title: 'Hands aboard the ' + s.name,
      text: 'SHE NEEDS ' + f.spec(s.type).crew + ' TO SAIL AND BERTHS ' + f.berths(s) + '. PICK SOMEONE TO MOVE THEM OR PAY THEM OFF.',
      rows: crew.map(function (c) {
        return { label: c.name, sub: f.ROLES[c.role].name + ' · skill ' + c.skill + ' · from the ' + c.sea + ' Sea', pick: function () {
          choose({ title: c.name, text: f.ROLES[c.role].blurb.toUpperCase(),
                   rows: others.map(function (o) { return { label: 'Move to the ' + o.name, sub: f.where(o), pick: function () { f.assign(c.id, o.id); crewCard(worldId, s); } }; }),
                   buttons: [{ label: 'Pay them off', act: function () { f.dismiss(c.id); crewCard(worldId, s); } }, { label: 'Back', act: function () { crewCard(worldId, s); } }],
                   closeLabel: 'Done' });
        } };
      }),
      buttons: [{ label: 'Back', act: function () { shipCard(worldId, s); } }],
      closeLabel: 'Done'
    });
  }

  // ---- the yard ---------------------------------------------------------------------------------------------------
  function stats(sp) {
    return 'hold ' + sp.hold + ' · ' + (sp.slots ? sp.slots + ' gun' + (sp.slots > 1 ? 's' : '') : 'no guns') + ' · ' +
      (sp.crew ? sp.crew + ' hand' + (sp.crew > 1 ? 's' : '') : 'sails alone') + ' · ' + (sp.vmax >= 5 ? 'quick' : sp.vmax >= 4.5 ? 'steady' : 'stately');
  }
  function yard(worldId, note) {
    var f = F(), Pd = PORTS[portOf(worldId)];
    choose({
      title: 'The yard',
      text: note || 'EVERY ONE BUILT ON THIS SLIP. SHE\'S DELIVERED TO THE PIER, AND SHE\'LL WANT HANDS: SIGN THEM ON HERE.',
      rows: Pd.yard.map(function (type) {
        var sp = f.spec(type);
        return { label: sp.name, sub: stats(sp), note: sp.price + ' coins', pick: function () {
          choose({ title: 'A ' + sp.name.toLowerCase(), text: sp.blurb.toUpperCase(), rows: [{ label: sp.name, sub: stats(sp), note: sp.price + ' coins', disabled: true }],
                   buttons: [{ label: 'Buy her (' + sp.price + ')', act: function () {
                     f.buy(type, worldId).then(function (r) {
                       if (!r.ok) { yard(worldId, why(r)); return; }
                       toast('New ship', r.ship.name, sp.name + ', at the pier'); sfx('coin');
                       shipCard(worldId, r.ship, 'SHE\'S YOURS. SHE\'S TIED UP AT THE PIER.' + (sp.crew ? ' SHE NEEDS ' + sp.crew + ' HAND' + (sp.crew > 1 ? 'S' : '') + ' BEFORE SHE SAILS.' : ''));
                     });
                   } }, { label: 'Back', act: function () { yard(worldId); } }] });
        } };
      }),
      buttons: [{ label: 'Back', act: function () { menu(worldId); } }],
      closeLabel: 'Done'
    });
  }

  // ---- fitting out ------------------------------------------------------------------------------------------------
  function fitOut(worldId, s, note) {
    var f = F(), Pd = PORTS[portOf(worldId)], base = f.spec(s.type);
    var rows = Pd.guns.map(function (g) {
      var G = f.GUNS[g], full = s.guns.length >= base.slots;
      var sub = G.dmg + ' a shot · ' + G.range + ' tiles · ' + (G.arc === 'bow' ? 'ahead' : 'abeam') + (G.holy ? ' · moonglass' : '');
      return { label: G.name, sub: sub, note: base.slots ? (full ? 'ports full' : G.price + ' coins') : 'no gun ports', disabled: !base.slots || full,
               pick: function () { confirmFit(worldId, s, g, G, sub, 'Mount it'); } };
    }).concat(Pd.fits.map(function (k) {
      var X = f.FITS[k], has = s.fits.indexOf(k) >= 0;
      return { label: X.name, sub: 'fitting', note: has ? 'fitted' : X.price + ' coins', disabled: has,
               pick: function () { confirmFit(worldId, s, k, X, 'fitting', 'Fit it'); } };
    }));
    var buttons = [];
    if (s.guns.length) buttons.push({ label: 'Unmount a gun', act: function () {
      choose({ title: 'Unmount which?', rows: s.guns.map(function (g, i) { return { label: f.GUNS[g].name, sub: 'no refund: it goes to the yard', pick: function () { f.unmount(s.id, i); fitOut(worldId, s); } }; }),
               buttons: [{ label: 'Back', act: function () { fitOut(worldId, s); } }] });
    } });
    buttons.push({ label: 'Back', act: function () { menu(worldId); } });
    choose({ title: 'Fit out the ' + s.name, text: note || (base.slots ? s.guns.length + ' OF ' + base.slots + ' GUN PORTS FILLED.' : 'NO GUN PORTS ON A ' + base.name.toUpperCase() + '.'),
             rows: rows, buttons: buttons, closeLabel: 'Done' });
  }

  function confirmFit(worldId, s, id, X, sub, verb) {
    var f = F();
    choose({ title: X.name, text: X.blurb.toUpperCase(), rows: [{ label: X.name, sub: sub, note: X.price + ' coins', disabled: true }],
             buttons: [{ label: verb + ' (' + X.price + ')', act: function () {
               f.fit(s.id, id).then(function (r) { if (r.ok) sfx('coin'); fitOut(worldId, s, r.ok ? X.name.toUpperCase() + (f.GUNS[id] ? ' MOUNTED.' : ' FITTED.') : why(r)); });
             } }, { label: 'Back', act: function () { fitOut(worldId, s); } }] });
  }

  // ---- repairs ----------------------------------------------------------------------------------------------------
  function repairs(worldId, note) {
    var f = F(), hurt = f.here(worldId).filter(function (s) { return f.repairCost(s) > 0; });
    choose({ title: 'Repairs', text: note || (hurt.length ? 'PLANKS, OAKUM, PITCH. SHE\'LL BE SOUND BY THE TIME YOU\'VE HAD A DRINK.' : 'EVERYTHING HERE\'S SOUND.'),
             rows: hurt.map(function (s) {
               return { label: s.name, sub: 'hull ' + Math.round(s.hull * 100) + '%', note: f.repairCost(s) + ' coins',
                        pick: function () { f.repair(s.id).then(function (r) { if (r.ok) sfx('coin'); repairs(worldId, r.ok ? s.name.toUpperCase() + ' IS SOUND AGAIN.' : why(r)); }); } };
             }),
             buttons: [{ label: 'Back', act: function () { back(worldId); } }], closeLabel: 'Done' });
  }

  // ---- hands ------------------------------------------------------------------------------------------------------
  function hands(worldId, note) {
    var f = F(), recs = f.recruits(worldId), here = f.here(worldId);
    var room = here.some(function (s) { return f.crewOn(s.id).length < f.berths(s); });
    choose({
      title: 'Looking for a berth',
      text: note || (room ? 'THEY\'LL GO ABOARD WHICHEVER SHIP OF YOURS HERE HAS ROOM, THE BIGGEST FIRST. A FRESH LOT TOMORROW.' : 'NO SHIP OF YOURS HERE HAS A BERTH FREE. A BIGGER SHIP BERTHS MORE.'),
      rows: recs.map(function (r) {
        var R = f.ROLES[r.role];
        var sub = R.name + ' · ' + ['', 'green', 'able', 'old hand'][r.skill] + ' · the ' + r.sea + ' Sea';
        return { label: r.name, sub: sub, note: r.signed ? 'signed on' : r.fee + ' coins', disabled: r.signed || !room,
                 pick: function () {
                   choose({ title: r.name, text: R.blurb.toUpperCase(), rows: [{ label: r.name, sub: sub, note: r.fee + ' coins', disabled: true }],
                            buttons: [{ label: 'Sign them on (' + r.fee + ')', act: function () {
                              f.hire(r, worldId).then(function (res) {
                                if (res.ok) { sfx('coin'); toast('Crew', r.name + ' signs on', R.name + ', aboard the ' + res.ship.name); }
                                hands(worldId, res.ok ? r.name.toUpperCase() + ' GOES ABOARD THE ' + res.ship.name.toUpperCase() + '.' : why(res));
                              });
                            } }, { label: 'Back', act: function () { hands(worldId); } }] });
                 } };
      }),
      buttons: [{ label: 'Back', act: function () { menu(worldId); } }],
      closeLabel: 'Done'
    });
  }

  // ---- the hold ---------------------------------------------------------------------------------------------------
  function hold(worldId, s, note) {
    var f = F(), t = T(), inv = typeof BridgeInventory !== 'undefined' ? BridgeInventory : null;
    if (!t || !inv) return;
    var rows = [];
    Object.keys(s.hold).forEach(function (id) {
      var mine = !t.isGood(id) || t.GOODS[id].item;
      rows.push({ label: t.name(id), icon: id, sub: s.hold[id] + ' aboard (' + Math.ceil(s.hold[id] / t.per(id)) + ' crate' + (Math.ceil(s.hold[id] / t.per(id)) > 1 ? 's' : '') + ')',
                  note: mine ? 'to your pack' : 'cargo', disabled: !mine,
                  pick: function () { var r = t.unload(s, id, s.hold[id]); hold(worldId, s, r.ok ? r.n + ' INTO YOUR PACK.' : 'NO ROOM IN YOUR PACK.'); } });
    });
    Object.keys(t.HAUL).concat(['roseite']).forEach(function (id) {
      var n = inv.getCount(id);
      if (!n) return;
      rows.push({ label: t.name(id), icon: id, sub: n + ' in your pack, ' + t.per(id) + ' to a crate', note: 'load',
                  pick: function () { var r = t.load(s, id, n); hold(worldId, s, r.ok ? r.n + ' LOADED.' : why(r)); } });
    });
    choose({ title: 'The ' + s.name + '\'s hold', text: note || t.crates(s) + ' OF ' + f.effective(s).hold + ' CRATES. ORE, GEMS, CRYSTALS AND FISH YOU\'VE FOUND GO BY THE CRATE.',
             rows: rows, buttons: [{ label: 'Back', act: function () { menu(worldId); } }], closeLabel: 'Done' });
  }

  // ---- the market -------------------------------------------------------------------------------------------------
  function market(worldId, s, note) {
    var f = F(), t = T(), P = portOf(worldId);
    if (!t) return;
    var stock = t.stock(P), ids = stock.slice();
    Object.keys(s.hold).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
    var rows = ids.map(function (id) {
      var have = s.hold[id] || 0, sells = stock.indexOf(id) >= 0;
      return { label: t.name(id), icon: id, sub: (sells ? 'buy ' + t.price(id, P, 'buy') + ' · ' : '') + 'sell ' + t.price(id, P, 'sell') + (have ? ' · ' + have + ' aboard' : ''),
               note: have ? 'trade' : 'buy', pick: function () { deal(worldId, s, id); } };
    });
    choose({ title: 'Market', text: note || 'PRICES EACH, TODAY - A BIG DEAL MOVES THEM. ' + t.room(s) + ' CRATES FREE IN THE ' + s.name.toUpperCase() + '.',
             rows: rows, buttons: [{ label: 'Back', act: function () { menu(worldId); } }], closeLabel: 'Done' });
  }
  function deal(worldId, s, id, note) {
    var t = T(), P = portOf(worldId), have = s.hold[id] || 0, sells = t.stock(P).indexOf(id) >= 0, buyP = t.price(id, P, 'buy'), sellP = t.price(id, P, 'sell');
    var can = sells ? Math.min(t.fits(s, id), Math.max(0, t.supply(id, P))) : 0, buttons = [];
    var cost = function (n) { return t.price(id, P, 'buy', n) * n; }, take = function (n) { return t.price(id, P, 'sell', n) * n; };   // a big deal moves the price
    function go(fn) { return function () { fn().then(function (r) { if (r.ok) sfx('coin'); deal(worldId, s, id, r.ok ? (r.total ? 'SOLD ' + r.n + ' FOR ' + r.total + '.' : 'BOUGHT ' + r.n + ' FOR ' + r.cost + '.') : why(r)); }); }; }
    if (sells) [1, 5, 20].forEach(function (n) { if (n <= can) buttons.push({ label: 'Buy ' + n + ' (' + cost(n) + ')', act: go(function () { return t.buy(s, id, n, P); }) }); });
    if (sells && can > 20) buttons.push({ label: 'Fill her: ' + can + ' (' + cost(can) + ')', act: go(function () { return t.buy(s, id, can, P); }) });
    if (have > 5) buttons.push({ label: 'Sell 5 (' + take(5) + ')', act: go(function () { return t.sell(s, id, 5, P); }) });
    if (have) buttons.push({ label: 'Sell all ' + have + ' (' + take(have) + ')', act: go(function () { return t.sell(s, id, have, P); }) });
    buttons.push({ label: 'Back', act: function () { market(worldId, s); } });
    var G = t.GOODS[id], it = typeof BridgeItems !== 'undefined' && BridgeItems.get(id);
    choose({ title: t.name(id), text: note || ((G ? G.desc : it ? it.desc : '') + '').toUpperCase(),
             rows: [{ label: 'Here', icon: id, sub: (sells ? 'they sell at ' + buyP + ' · ' : 'not sold here · ') + 'they buy at ' + sellP, note: have + ' aboard', disabled: true }],
             buttons: buttons, closeLabel: 'Done' });
  }

  // ---- contracts --------------------------------------------------------------------------------------------------
  function contracts(worldId, note) {
    var t = T(), P = portOf(worldId), f = F();
    if (!t) return;
    var isles = typeof BridgeVoyage !== 'undefined' && BridgeVoyage._isles || {};
    var nm = function (id) { return isles[id] ? isles[id].name : id; };
    var offer = t.contracts(P), mine = t.mine();
    var rows = offer.map(function (c) {
      return { label: c.n + ' × ' + t.name(c.good) + ' to ' + nm(c.to), icon: c.good, sub: 'by the end of ' + (c.due - Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000) > 0 ? 'tomorrow' : 'today'),
               note: c.done ? 'done' : c.taken ? 'taken' : c.fee + ' coins', disabled: c.taken || c.done,
               pick: function () { t.take(c); contracts(worldId, 'TAKEN. LOAD ' + c.n + ' ' + t.name(c.good).toUpperCase() + ' AND HAND THEM TO THE HARBOURMASTER AT ' + nm(c.to).toUpperCase() + '.'); } };
    }).concat(mine.filter(function (c) { return c.from !== P; }).map(function (c) {
      return { label: c.n + ' × ' + t.name(c.good) + ' to ' + nm(c.to), icon: c.good, sub: 'taken at ' + nm(c.from), note: c.fee + ' coins', disabled: true };
    }));
    choose({ title: 'Contracts', text: note || 'CARRY THESE AND BE PAID WELL OVER THE MARKET. BUY THE GOODS WHEREVER THEY\'RE CHEAP.',
             rows: rows, buttons: [{ label: 'Back', act: function () { menu(worldId); } }], closeLabel: 'Done' });
  }

  // ---- the Merchants' Exchange board (Crownhaven): every good, where it's cheap and where it's dear today --------------
  function exchange(note) {
    var t = T();
    if (!t) return;
    var isles = typeof BridgeVoyage !== 'undefined' && BridgeVoyage._isles || {};
    var nm = function (id) { return isles[id] ? isles[id].name : id; };
    var rows = Object.keys(t.GOODS).map(function (g) {
      var sells = t.PORTS.filter(function (P) { return t.stock(P).indexOf(g) >= 0; });
      var cheap = sells.map(function (P) { return [P, t.price(g, P, 'buy')]; }).sort(function (a, b) { return a[1] - b[1]; })[0];
      var dear = t.PORTS.map(function (P) { return [P, t.price(g, P, 'sell')]; }).sort(function (a, b) { return b[1] - a[1]; })[0];
      return { label: t.name(g), icon: g, sub: (cheap ? 'buy at ' + nm(cheap[0]) + ' ' + cheap[1] : 'not sold anywhere today') + ' · sell at ' + nm(dear[0]) + ' ' + dear[1],
               note: cheap ? '+' + Math.max(0, dear[1] - cheap[1]) : '', disabled: true };
    });
    var best = t.routes(40).slice(0, 3);
    choose({ title: "The Exchange board", text: note || ('TODAY\'S PRICES, CHALKED UP EVERY MORNING. BEST RUNS FOR A FORTY-CRATE HOLD: ' +
             best.map(function (r) { return nm(r.from).toUpperCase() + ' TO ' + nm(r.to).toUpperCase() + ' (' + r.goods.map(function (g) { return t.name(g.good).toUpperCase(); }).join(' AND ') + ')'; }).join('; ') + '.'),
             rows: rows, closeLabel: 'Done' });
  }

  return { PORTS: PORTS, decorate: decorate, open: open, ledger: ledger, yard: yard, repairs: repairs, exchange: exchange };
})();
