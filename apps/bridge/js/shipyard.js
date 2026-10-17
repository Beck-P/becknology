/**
 * BridgeShipyard — the slipway on your holm: build a ship of your own from timber, iron, rope and canvas over days, give
 * her a name and colours, launch her into your fleet; fit what your workshop makes to the ships lying there for nothing
 * (Beck: "build your own ship from enough timber and iron… take it to your courtyard and hire smiths… progression should
 * feel natural"). The plan: _claude_docs/spec-empire.md, chunk 2. Built from the holm's ledger once the workshop is up
 * (js/holm.js BUILD.slipway): the timber and iron are worked there first.
 *
 * HULL PLANS come from the yards that build each kind (`HULLS[type].sold`, a `workshop` topic's shop in js/workshop.js
 * lists them): the cutter's from Bess on Diggen's Point, the brigantine's from Aldous at Sapphire's Great Yard, the
 * raider's from Garro's pirate slip, the galleon's from Agnes Rook at the Royal Yard. A plan costs a fraction of the ship.
 *
 * A BUILD lays a keel and goes in three stages (`STAGES`): the keel, framing and planking, masts and rigging — each wants
 * its own materials (`HULLS[type].stages`, put in from your pack, the holm's store and your ships' holds at the jetty, as
 * the Workshop takes them: BridgeWorkshop.have / take) and a share of the hours (`hours`, an apprentice's). SHIPWRIGHTS
 * do the work (js/business.js `engage` at the place 'slipway': faces, grades, wages on the same payroll): apprentice ×1,
 * journeyman ×1.5, master ×2.2 (a master won't come till you've launched a ship); two can work her at once. Worked out
 * on the clock a minute at a time (`advance`), so she grows while you're away. Done, she waits on the slip for you to
 * launch her (BridgeFleet.launch): lying at the holm, her own name and colours.
 *
 * HER COLOURS (`PAINT`, `SAILS`, `FIGURES`): chosen while she's on the slip, and for any ship of yours lying at the holm
 * after (BridgeFleet.setLook) — js/sloop.js draws them.
 *
 * localStorage bridge_shipyard. summary() is what the holm's ledger and the game menu's Ledger read.
 */
var BridgeShipyard = (function () {
  var KEY = 'bridge_shipyard', WID = 'lumar-holm', PLACE = 'slipway';
  var WRIGHTS = 2;                          // two can work a hull at once
  var STEP = 60000, BACK = 14 * 86400000;   // worked out a minute at a time, up to a fortnight back
  var HOUR = 3600000;

  // each kind you can build: an apprentice's hours, the plan's price and who sells it, and what each stage wants
  var HULLS = {
    cutter:     { hours: 8, plan: 900, sold: 'bess', where: 'Bess Tolliver on Diggen\'s Point',
                  stages: [{ oak_plank: 6, iron_bar: 2 }, { plank: 24, pitch: 4, iron_bar: 2 }, { rope: 8, sailcloth: 4 }] },
    brigantine: { hours: 20, plan: 4500, sold: 'aldous', where: 'Aldous at Sapphire\'s Great Yard',
                  stages: [{ oak_plank: 20, iron_bar: 6 }, { plank: 50, oak_plank: 16, pitch: 10, iron_bar: 6, copper_sheet: 4 }, { rope: 20, sailcloth: 12 }] },
    raider:     { hours: 22, plan: 6500, sold: 'garro', where: 'Garro on Crimson Reach',
                  stages: [{ oak_plank: 16, iron_bar: 6 }, { plank: 36, oak_plank: 10, pitch: 8, iron_bar: 6 }, { rope: 16, sailcloth: 10 }] },
    galleon:    { hours: 40, plan: 16000, sold: 'wright', where: 'Agnes Rook at the Royal Yard in Crownhaven',
                  stages: [{ oak_plank: 40, iron_bar: 12 }, { plank: 100, oak_plank: 40, pitch: 22, iron_bar: 14, copper_sheet: 10 }, { rope: 40, sailcloth: 28 }] }
  };
  var STAGES = [{ name: 'Laying the keel', short: 'keel', done: 'keel laid' },
                { name: 'Framing and planking', short: 'planking', done: 'planked' },
                { name: 'Masts and rigging', short: 'rigging', done: 'rigged' }];
  var GRADES = {
    apprentice: { name: 'Apprentice shipwright', short: 'apprentice', pace: 1.0, wage: [90, 150], colour: 'white' },
    journeyman: { name: 'Journeyman shipwright', short: 'journeyman', pace: 1.5, wage: [220, 340], colour: 'cyan' },
    master:     { name: 'Master shipwright', short: 'master', pace: 2.2, wage: [500, 750], colour: 'gold' }
  };
  var NAMES = ['Hal Corbett', 'Wenna Trist', 'Ezra Kell', 'Rose Lanyon', 'Tobias Venn', 'Morwen Hale', 'Davy Polglase', 'Jory Hicks',
               'Elowen Tremayne', 'Ned Carthew', 'Loveday Pascoe', 'Petroc Nance'];

  // her colours: the hull's paint (a wash over her sprite, js/sloop.js `tint`), her sails (`CLOTH`), her figurehead
  var PAINT = { natural: { name: 'Bare oak', hex: null }, black: { name: 'Tarred black', hex: '#1c1c22' }, oxblood: { name: 'Oxblood', hex: '#6a1e18' },
                green: { name: 'Sea green', hex: '#1e5a46' }, navy: { name: 'Navy blue', hex: '#1e2e5a' }, white: { name: 'White', hex: '#e6e2d6' },
                ochre: { name: 'Ochre', hex: '#9a7428' } };
  var SAILS = { canvas: { name: 'Canvas', hex: null }, white: { name: 'Bleached white', hex: '#f4f2ea' }, tan: { name: 'Tanned', hex: '#b8865a' },
                red: { name: 'Red', hex: '#b03a2e' }, black: { name: 'Black', hex: '#2a2a30' }, blue: { name: 'Sky blue', hex: '#7aa8d8' } };
  var FIGURES = { none: { name: 'None' }, mermaid: { name: 'A mermaid' }, lion: { name: 'A gilded lion' }, swan: { name: 'A white swan' },
                  dragon: { name: 'A red dragon' }, owl: { name: 'An owl' }, starling: { name: 'A starling' } };

  var st = load();
  function load() {
    var d;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { plans: d.plans || {}, job: d.job || null, launched: d.launched || 0, log: d.log || [], n: d.n || 0, last: d.last || Date.now() };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }

  function H() { return typeof BridgeHolm !== 'undefined' ? BridgeHolm : null; }
  function F() { return typeof BridgeFleet !== 'undefined' ? BridgeFleet : null; }
  function B() { return typeof BridgeBusiness !== 'undefined' ? BridgeBusiness : null; }
  function Wk() { return typeof BridgeWorkshop !== 'undefined' ? BridgeWorkshop : null; }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function pay(n, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins ? BridgeProgression.wagerCoins(n, why).then(function (r) { return r || { ok: false, reason: 'error' }; })
                                                                                   : Promise.resolve({ ok: false, reason: 'offline' });
  }
  function why(r) { var x = r && r.reason; return x === 'offline' || x === 'no_client' || x === 'no_pilot' || x === 'error' ? 'NO WAY TO MOVE COINS RIGHT NOW.' : 'NOT ENOUGH COINS.'; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
  function etDay() { return Math.floor((typeof BridgeClock !== 'undefined' && BridgeClock.etNow ? BridgeClock.etNow() : Date.now()) / 86400000); }
  function iname(id) { var it = typeof BridgeItems !== 'undefined' && BridgeItems.get(id); return it ? it.name : id; }
  function hm(ms) { var mins = Math.max(1, Math.round(ms / 60000)); return mins < 60 ? mins + ' min' : mins < 48 * 60 ? Math.floor(mins / 60) + 'h' + (mins % 60 ? ' ' + mins % 60 + 'm' : '') : Math.round(mins / 1440 * 10) / 10 + ' days'; }
  function kind(type) { var S = F() && F().SHIPS && F().SHIPS[type]; return S ? S.name : type; }
  function an(word) { return (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word; }
  function note(line) { st.log.unshift({ t: Date.now(), line: line }); st.log = st.log.slice(0, 20); }

  function built() { return !!(H() && H().owned() && H().built('slipway')); }
  function known(type) { return !!st.plans[type]; }
  function have(id) { return Wk() ? Wk().have(id) : 0; }
  function take(id, n) { return Wk() && Wk().take ? Wk().take(id, n) : 0; }

  // ---- the shipwrights --------------------------------------------------------------------------------------------------
  function wrights() { return B() && B().staff ? B().staff(PLACE) : []; }
  function wright(id) { return wrights().filter(function (p) { return p.id === id; })[0] || null; }
  function working(p, t) { return !(p.missed > 0) && (!p.arrives || p.arrives <= (t || Date.now())); }    // unpaid, they down tools
  function pace(p) { var G = GRADES[p.grade] || GRADES.apprentice; return G.pace * (p.skill || 1); }
  function faceOf(p) { var G = GRADES[p.grade] || GRADES.apprentice; return { seed: p.name + ':' + p.key, style: 'coat', colour: G.colour }; }
  function perk(p) { return 'builds at ×' + Math.round(pace(p) * 10) / 10; }
  /** Today's three looking for work on a slip: an apprentice, a journeyman and (once you've launched a ship) a master. */
  function candidates() {
    var day = etDay(), taken = B() ? B().staff().map(function (p) { return p.key; }) : [];
    return ['apprentice', 'journeyman', 'master'].map(function (g, i) {
      var key = day + ':slipway:' + g, h = hash(key), G = GRADES[g];
      return { key: key, grade: g, tier: g, title: G.name, skill: 0.92 + h * 0.2, taken: taken.indexOf(key) >= 0, locked: g === 'master' && st.launched < 1,
               name: NAMES[(Math.floor(hash(day + ':slipway:names') * NAMES.length) + i * 5) % NAMES.length],
               wage: Math.round((G.wage[0] + (G.wage[1] - G.wage[0]) * h) / 10) * 10 };
    });
  }

  // ---- the build ----------------------------------------------------------------------------------------------------------
  function stageNeed(j) { return HULLS[j.type].hours * HOUR / STAGES.length; }
  function wants(j, s) {                       // what stage s still wants: { id: n }
    var need = HULLS[j.type].stages[s], put = j.put[s] || {}, out = {};
    Object.keys(need).forEach(function (id) { var n = need[id] - (put[id] || 0); if (n > 0) out[id] = n; });
    return out;
  }
  function stocked(j, s) { return !Object.keys(wants(j, s)).length; }
  function crewPace(t) { return wrights().filter(function (p) { return working(p, t) && t >= (p.hired || 0); }).slice(0, WRIGHTS).reduce(function (a, p) { return a + pace(p); }, 0); }
  function advance(now) {
    now = now || Date.now();
    var j = st.job, t = Math.max(st.last || now, now - BACK);
    if (j && !j.ready) {
      while (t < now && !j.ready) {
        var dt = Math.min(STEP, now - t);
        if (stocked(j, j.stage)) {
          j.done += dt * crewPace(t);
          if (j.done >= stageNeed(j)) {
            note(j.name + ': ' + STAGES[j.stage].done);
            j.done = 0; j.stage++;
            if (j.stage >= STAGES.length) { j.ready = t + dt; toast('Ready to launch', j.name, 'On the slipway on ' + (H() ? H().name() : 'your holm')); }
          }
        }
        t += dt;
      }
    }
    st.last = now;
    save();
    return j;
  }
  /** Where she is: { stage (0-3), name, pct of this stage, of the whole, left (ms at today's pace) or null, waiting: 'materials'|'shipwright'|null } */
  function progress(j) {
    j = j || st.job;
    if (!j) return null;
    var need = stageNeed(j), cp = crewPace(Date.now());
    var whole = (j.stage + Math.min(1, j.done / need)) / STAGES.length;
    var waiting = j.ready ? null : !stocked(j, j.stage) ? 'materials' : !cp ? 'shipwright' : null;
    var left = j.ready ? 0 : cp ? ((STAGES.length - j.stage) * need - j.done) / cp : null;
    return { stage: j.stage, label: j.ready ? 'Ready to launch' : STAGES[j.stage].name, pct: Math.floor(Math.min(1, j.done / need) * 100), whole: whole, left: left, waiting: waiting };
  }
  function layKeel(type, name) {
    if (st.job) return null;
    st.job = { id: 'h' + (++st.n), type: type, name: (name || defaultName(type)).slice(0, 24), look: { paint: 'natural', sails: 'canvas', figure: 'none' },
               stage: 0, done: 0, put: [{}, {}, {}], started: Date.now(), ready: 0 };
    st.last = Date.now();
    note('Keel laid for ' + an(kind(type).toLowerCase()) + ', the ' + st.job.name);
    save();
    return st.job;
  }
  function defaultName(type) {
    var names = ['Starling', 'Holm Lass', 'Second Wind', 'Homeward', 'Kestrel', 'Fair Isle', 'Dovetail', 'Ironside'];
    var taken = F() ? F().all().map(function (s) { return s.name; }) : [];
    return names.filter(function (n) { return taken.indexOf(n) < 0; })[0] || kind(type) + ' ' + (st.launched + 1);
  }
  /** Put in everything you have toward what she still wants, stage by stage. Returns { id: n } put in. */
  function putIn() {
    var j = st.job, got = {};
    if (!j) return got;
    advance();
    for (var s = j.stage; s < STAGES.length; s++) {
      var w = wants(j, s);
      Object.keys(w).forEach(function (id) {
        var n = Math.min(w[id], have(id));
        if (n <= 0 || !take(id, n)) return;                    // (never more than she has, so it all comes)
        j.put[s][id] = (j.put[s][id] || 0) + n;
        got[id] = (got[id] || 0) + n;
      });
    }
    st.last = Date.now();
    save();
    return got;
  }
  function launch() {
    var j = st.job, f = F();
    if (!j || !j.ready || !f || !f.launch) return null;
    var s = f.launch(j.type, WID, { name: j.name, look: j.look });
    if (!s) return null;
    st.launched++;
    note(j.name + ' launched');
    st.job = null;
    save();
    sfx('quest');
    toast('Launched', s.name, an(kind(s.type).toLowerCase()) + ' of your own building, lying at ' + (H() ? H().name() : 'your holm'));
    return s;
  }
  /** Break her up: what was put in goes on the racks (the holm's store). */
  function scrap() {
    var j = st.job, h = H();
    if (!j) return;
    j.put.forEach(function (p) { Object.keys(p).forEach(function (id) { if (h && p[id] > 0) h.storeAdd(id, p[id]); }); });
    note(j.name + ' broken up on the slip');
    st.job = null;
    save();
  }

  // ---- screens ----------------------------------------------------------------------------------------------------------
  function wantText(w) {
    var ids = Object.keys(w);
    return ids.length ? ids.map(function (id) { return w[id] + ' ' + iname(id).toLowerCase() + ' (have ' + have(id) + ')'; }).join(', ') : 'all in';
  }
  function statusText() {
    var j = st.job, p = progress(j);
    if (!j) return 'THE SLIP IS EMPTY: SLEEPERS GREASED, THE CRADLE WAITING. LAY A KEEL FROM ANY HULL PLAN YOU KNOW.';
    if (j.ready) return ('THE ' + j.name + ' SITS FINISHED IN HER CRADLE, ' + an(kind(j.type).toLowerCase()) + ' OF YOUR OWN BUILDING. KNOCK OUT THE CHOCKS AND SHE\'S AFLOAT.').toUpperCase();
    var line = 'THE ' + j.name + ', ' + an(kind(j.type).toLowerCase()) + ': ' + p.label + ', ' + p.pct + '% (' + Math.floor(p.whole * 100) + '% of her). ';
    if (p.waiting === 'materials') line += 'SHE WANTS ' + wantText(wants(j, j.stage)) + '.';
    else if (p.waiting === 'shipwright') line += 'NOBODY\'S WORKING HER: HIRE A SHIPWRIGHT.';
    else line += 'DONE IN ABOUT ' + hm(p.left) + ' AT THIS PACE.';
    return line.toUpperCase();
  }
  function open(msg) {
    if (!built()) return choose({ title: 'The slipway', text: 'AN OLD SLIP OF ROTTEN SLEEPERS RUNS DOWN INTO THE WATER BELOW THE GARDEN WALL. SHIPS WERE BUILT HERE ONCE.', closeLabel: 'Done' });
    advance();
    var j = st.job, rows = [];
    if (!j) {
      Object.keys(HULLS).forEach(function (type) {
        var Hh = HULLS[type], k = known(type);
        rows.push({ label: 'Lay a keel: ' + kind(type).toLowerCase(), sub: k ? 'about ' + hm(Hh.hours * HOUR) + ' for one apprentice · ' + totalText(type) : 'you need her plans: ' + Hh.where,
                    note: k ? 'lay it' : 'no plans', disabled: !k, pick: function () { nameFirst(type); } });
      });
    } else {
      rows.push({ label: j.name, sub: kind(j.type) + ' · ' + STAGES.map(function (S, i) { return (i < j.stage || j.ready ? '✓ ' : i === j.stage ? '▸ ' : '· ') + S.short; }).join('  '),
                  note: j.ready ? 'ready' : Math.floor(progress(j).whole * 100) + '%', disabled: true });
      if (!j.ready) {
        var all = {};
        for (var s = j.stage; s < STAGES.length; s++) { var w = wants(j, s); Object.keys(w).forEach(function (id) { all[id] = (all[id] || 0) + w[id]; }); }
        var can = Object.keys(all).some(function (id) { return have(id) > 0; });
        rows.push({ label: 'Put in materials', sub: Object.keys(all).length ? 'still to come: ' + wantText(all) : 'everything she needs is in', note: can ? 'put in' : '—', disabled: !can,
                    pick: function () {
                      var got = putIn(), ids = Object.keys(got);
                      if (ids.length) sfx('pickup');
                      open(ids.length ? 'PUT IN: ' + ids.map(function (id) { return got[id] + ' ' + iname(id).toLowerCase(); }).join(', ').toUpperCase() + '.' : 'NOTHING TO PUT IN.');
                    } });
      } else {
        rows.push({ label: 'Launch her', sub: 'she\'ll lie at ' + (H() ? H().name() : 'the holm') + ', yours to sail or send', note: 'launch', pick: function () {
          var s = launch();
          open(s ? 'THE CHOCKS COME OUT, SHE SHIVERS, AND THEN SHE\'S RUNNING DOWN THE SLIP IN A ROAR OF GREASE AND SPRAY. THE ' + s.name.toUpperCase() + ' IS AFLOAT.' : 'SHE WON\'T BUDGE. (SOMETHING\'S WRONG WITH THE FLEET.)');
        } });
      }
      rows.push({ label: 'Her name and colours', sub: lookLine(j.look), note: 'choose', pick: function () { lookView(j.look, j.name, function (nm) { j.name = nm; save(); }, function () { save(); open(); }, { type: j.type }); } });
    }
    var wr = wrights();
    rows.push({ label: 'Shipwrights', sub: wr.length ? wr.map(function (p) { return p.name.split(' ')[0] + ' (' + (GRADES[p.grade] || GRADES.apprentice).short + ')'; }).join(', ') : 'nobody hired: nothing gets built', note: wr.length + '/' + WRIGHTS, pick: function () { wrightsView(); } });
    var here = ships();
    if (here.length) {
      rows.push({ label: 'Fit out a ship lying here', sub: 'what your workshop made, fitted for nothing', note: here.length + ' here', pick: function () { fitView(); } });
      rows.push({ label: 'Repaint a ship lying here', sub: 'her paint, her sails, her figurehead', note: 'paint', pick: function () { repaintView(); } });
    }
    var buttons = j && !j.ready ? [{ label: 'Break her up', act: function () {
      choose({ title: 'Break her up?', text: ('THE ' + j.name + ' COMES APART AGAIN. WHAT WENT INTO HER GOES BACK ON THE RACKS; THE WORK IS LOST.').toUpperCase(),
               buttons: [{ label: 'Break her up', act: function () { scrap(); open('SHE\'S TIMBER AND IRON AGAIN, STACKED ON THE RACKS.'); } }, { label: 'Keep building', act: function () { open(); } }], closeLabel: 'Back' });
    } }] : [];
    choose({ title: 'The slipway', text: msg || statusText(), rows: rows, buttons: buttons, closeLabel: 'Done' });
  }
  function totalText(type) {
    var all = {};
    HULLS[type].stages.forEach(function (S) { Object.keys(S).forEach(function (id) { all[id] = (all[id] || 0) + S[id]; }); });
    return Object.keys(all).map(function (id) { return all[id] + ' ' + iname(id).toLowerCase(); }).join(', ');
  }
  function nameFirst(type) {
    choose({ title: 'Lay a keel', text: ('A ' + kind(type) + '. WHAT WILL YOU CALL HER?').toUpperCase(),
             input: { value: defaultName(type), max: 24, button: 'Lay the keel', placeholder: defaultName(type), submit: function (v) {
               layKeel(type, v || defaultName(type)); sfx('impact_pick'); open('THE KEEL GOES DOWN ON THE BLOCKS: ' + String(v || defaultName(type)).toUpperCase() + ', TO BE.');
             } },
             closeLabel: 'Not yet' });
  }
  function lookLine(L) {
    L = L || {};
    return (PAINT[L.paint] || PAINT.natural).name + ' · ' + (SAILS[L.sails] || SAILS.canvas).name.toLowerCase() + ' sails · ' + ((FIGURES[L.figure] || FIGURES.none).name === 'None' ? 'no figurehead' : FIGURES[L.figure].name.toLowerCase());
  }
  /** Choose a look: paint, sails, figurehead (and her name, when `rename` is given). `done` when you're finished. */
  // her name and colours; `ship` (one of yours, or { type } for the hull on the slip) draws her in them as you choose
  function lookView(L, name, rename, done, ship) {
    var rows = [], again = function () { lookView(L, name, rename, done, ship); };
    if (rename) rows.push({ label: 'Her name', sub: name, note: 'rename', pick: function () {
      choose({ title: 'Her name', text: 'WHAT WILL YOU CALL HER?', input: { value: name, max: 24, button: 'Name her', submit: function (v) { if (v) { name = v.slice(0, 24); rename(name); } again(); } }, closeLabel: 'Back' });
    } });
    rows.push({ label: 'Paint', sub: (PAINT[L.paint] || PAINT.natural).name, note: 'change', pick: function () {
      pick('Her paint', PAINT, L.paint, function (k) { L.paint = k; again(); });
    } });
    rows.push({ label: 'Sails', sub: (SAILS[L.sails] || SAILS.canvas).name, note: 'change', pick: function () {
      pick('Her sails', SAILS, L.sails, function (k) { L.sails = k; again(); });
    } });
    rows.push({ label: 'Figurehead', sub: (FIGURES[L.figure] || FIGURES.none).name, note: 'change', pick: function () {
      pick('Her figurehead', FIGURES, L.figure, function (k) { L.figure = k; again(); });
    } });
    var her = ship && { id: ship.id || '_slip', type: ship.type, guns: ship.guns || [], fits: ship.fits || [], at: WID, look: L };
    var art = her && typeof BridgeSloop !== 'undefined' && BridgeSloop.portrait ? function (cv) { BridgeSloop.portrait(cv, her); } : null;
    choose({ title: name, text: lookLine(L).toUpperCase(), art: art, rows: rows, buttons: [{ label: 'Done', act: function () { done(); } }], closeLabel: 'Back' });
  }
  function pick(title, set, cur, then) {
    choose({ title: title, text: 'CHOOSE ONE.', rows: Object.keys(set).map(function (k) {
      return { label: set[k].name, sub: k === cur ? 'as she is' : '', note: k === cur ? '✓' : 'this', pick: function () { then(k); } };
    }), closeLabel: 'Back' });
  }
  // the ships lying at the holm, not away (the sloop goes where you go)
  function ships() {
    var f = F();
    return f ? f.all().filter(function (s) { return s.type !== 'sloop' && !s.away && s.at === WID; }) : [];
  }
  function fitView(msg) {
    var f = F(), w = Wk(), rows = [];
    var parts = w && w.parts ? w.parts() : [];
    var WHY = { slots: 'every gun port taken', fitted: 'she has one', better: 'she has better', no: 'won\'t take it' };
    ships().forEach(function (s) {
      parts.forEach(function (pt) {
        var no = f.canFit ? f.canFit(s, pt.what) : null;
        rows.push({ label: s.name + ': ' + pt.name, icon: 'part_' + pt.what, sub: no ? WHY[no] || no : pt.n + ' on the racks', note: no ? '—' : 'fit', disabled: !!no,
                    pick: function () {
                      if (!w.takePart(pt.what)) return fitView('IT\'S NOT ON THE RACKS ANY MORE.');
                      var r = f.mount(s.id, pt.what);
                      if (r && r.ok === false) { if (H()) H().storeAdd('part_' + pt.what, 1); return fitView(String(WHY[r.reason] || 'IT WON\'T GO ON.').toUpperCase()); }
                      sfx('impact_pick'); fitView('YOUR SHIPWRIGHTS FIT IT TO THE ' + s.name.toUpperCase() + '. NO CHARGE: SHE\'S ON YOUR OWN SLIP.');
                    } });
      });
    });
    if (!rows.length) rows.push({ label: 'Nothing to fit', sub: 'guns and fittings your workshop makes go on the racks; they\'re fitted here for nothing', disabled: true });
    choose({ title: 'Fit out', text: msg || 'WHAT YOUR WORKSHOP MADE, ONTO THE SHIPS LYING HERE.', rows: rows, buttons: [{ label: 'Back', act: function () { open(); } }], closeLabel: 'Done' });
  }
  function repaintView() {
    var f = F();
    choose({ title: 'Repaint', text: 'WHICH SHIP?', rows: ships().map(function (s) {
      return { label: s.name, sub: kind(s.type) + ' · ' + lookLine(s.look), note: 'paint', pick: function () {
        var L = Object.assign({ paint: 'natural', sails: 'canvas', figure: 'none' }, s.look || {});
        lookView(L, s.name, null, function () { if (f.setLook) f.setLook(s.id, L); sfx('pickup'); open('THE ' + s.name.toUpperCase() + ' IN HER NEW COLOURS.'); }, s);
      } };
    }), buttons: [{ label: 'Back', act: function () { open(); } }], closeLabel: 'Done' });
  }
  function wrightsView(msg) {
    var wr = wrights(), rows = wr.map(function (p) {
      return { label: p.name, face: faceOf(p), sub: (GRADES[p.grade] || GRADES.apprentice).short + ' · ' + perk(p) + (working(p) ? '' : ' · downed tools: unpaid'), note: p.wage + '/day', pick: function () { wrightCard(p.id); } };
    });
    if (wr.length < WRIGHTS) candidates().forEach(function (c) {
      var G = GRADES[c.grade];
      rows.push({ label: c.name, face: { seed: c.name + ':' + c.key, style: 'coat', colour: G.colour }, sub: G.name.toLowerCase() + ' · builds at ×' + Math.round(G.pace * c.skill * 10) / 10 +
                  (c.locked ? ' · won\'t come till you\'ve launched a ship' : ''), note: c.taken ? 'hired' : c.wage + '/day', disabled: c.taken || c.locked, pick: function () {
        if (!B()) return;
        B().engage(PLACE, c).then(function (r) {
          if (!r || !r.ok) return wrightsView(r && r.reason === 'taken' ? 'SOMEONE ELSE TOOK THEM ON.' : why(r));
          advance(); sfx('coin'); wrightsView(c.name.toUpperCase() + ' ROLLS UP THEIR SLEEVES. A DAY\'S WAGE UP FRONT, THEN ONE EACH MORNING.');
        });
      } });
    });
    choose({ title: 'Shipwrights', text: msg || 'TWO CAN WORK A HULL AT ONCE. THEY\'RE PAID LIKE YOUR OTHER STAFF, EACH EASTERN MIDNIGHT.', rows: rows,
             buttons: [{ label: 'Back', act: function () { open(); } }], closeLabel: 'Done' });
  }
  function wrightCard(id) {
    var p = wright(id);
    if (!p) return wrightsView();
    var G = GRADES[p.grade] || GRADES.apprentice;
    choose({ title: p.name, text: (G.name + '. ' + perk(p) + '. ' + p.wage + ' a day' + (p.owe > 0 ? ', ' + Math.ceil(p.owe) + ' owed' : '') + '.').toUpperCase(),
             rows: [{ label: p.name, face: faceOf(p), sub: G.short + ' · ' + perk(p), note: p.wage + '/day', disabled: true }],
             buttons: [{ label: 'Let them go', act: function () { advance(); B().dismiss(p.id); wrightsView(p.name.toUpperCase() + ' SHOULDERS THEIR TOOLS AND GOES.'); } },
                       { label: 'Back', act: function () { wrightsView(); } }], closeLabel: 'Done' });
  }

  // ---- plans, in the yards' shops (js/workshop.js shop) -------------------------------------------------------------------
  /** Rows for the hull plans this yard sells (a `workshop` topic's key); `again(note)` reopens the shop. */
  function planRows(key, again) {
    return Object.keys(HULLS).filter(function (t) { return HULLS[t].sold === key; }).map(function (type) {
      var Hh = HULLS[type], k = known(type);
      return { label: 'Plans: build ' + an(kind(type).toLowerCase()), icon: 'plan_hull', sub: k ? 'you have them' : 'every frame and plank of her, for your own slipway', note: k ? '✓' : Hh.plan.toLocaleString() + ' coins',
               disabled: k, pick: function () {
                 pay(Hh.plan, 'plan:hull:' + type).then(function (r) {
                   if (!r.ok) return again(why(r));
                   st.plans[type] = Date.now(); save(); sfx('coin');
                   again(('"THERE: HER LINES, HER FRAMES, EVERY SCANTLING. LAY HER DOWN ON YOUR OWN SLIP." ' + (built() ? 'YOU CAN LAY A KEEL AT YOUR SLIPWAY NOW.' : 'BUILD A SLIPWAY ON YOUR HOLM TO USE THEM.')).toUpperCase());
                 });
               } };
    });
  }

  // ---- what the ledgers read ----------------------------------------------------------------------------------------------
  /** { built, job: {name, type, kind, stage, label, whole, left, waiting, ready} | null, wrights: [{id, name, grade, face}], plans: [types], line } */
  function summary() {
    if (!built()) return { built: false, job: null, wrights: [], plans: Object.keys(st.plans), line: 'not built', launched: st.launched };
    var j = advance(), p = progress(j);
    var job = j ? { name: j.name, type: j.type, kind: kind(j.type), stage: j.stage, label: p.label, whole: p.whole, left: p.left, waiting: p.waiting, ready: !!j.ready } : null;
    var line = !j ? 'the slip is empty' : j.ready ? 'the ' + j.name + ' is ready to launch' : 'the ' + j.name + ': ' + p.label.toLowerCase() + ' (' + Math.floor(p.whole * 100) + '%)' +
               (p.waiting === 'materials' ? ', waiting on materials' : p.waiting === 'shipwright' ? ', nobody working her' : ', ' + hm(p.left) + ' to go');
    return { built: true, job: job, wrights: wrights().map(function (x) { return { id: x.id, name: x.name, grade: x.grade, face: faceOf(x) }; }), plans: Object.keys(st.plans), line: line, launched: st.launched };
  }
  function wrightRow(p) {
    var j = st.job;
    return { face: faceOf(p), sub: perk(p) + ' · ' + (!working(p) ? 'downed tools: unpaid' : j && !j.ready ? 'building the ' + j.name : 'idle on the slip') };
  }
  /** The hull on the slip for the holm's render (js/holm.js layers): 'keel' | 'frame' | 'planked' | null */
  function stage() { var j = st.job; return !j ? null : j.ready || j.stage >= 2 ? 'planked' : j.stage === 1 ? 'frame' : 'keel'; }

  if (typeof window !== 'undefined') setInterval(function () { if (st.job && !st.job.ready) advance(); }, 30000);

  return { HULLS: HULLS, STAGES: STAGES, GRADES: GRADES, PAINT: PAINT, SAILS: SAILS, FIGURES: FIGURES,
           open: open, built: built, known: known, planRows: planRows, summary: summary, wrightRow: wrightRow, wrightCard: wrightCard,
           candidates: candidates, stage: stage, lookLine: lookLine,
           _advance: advance, _layKeel: layKeel, _putIn: putIn, _launch: launch, _learn: function (t) { st.plans[t] = Date.now(); save(); },
           _state: function () { return st; }, reload: function () { st = load(); } };
})();
