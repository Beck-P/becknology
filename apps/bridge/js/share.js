/**
 * BridgeShare — giving, trading and letters between pilots (on js/net.js and js/multi.js).
 *
 * - Give (walk up to them → Give…): pick something from your pack, or coins. It leaves your pack at once (held for
 *   them); they're asked to take it. Taken: it's theirs. Declined, no room in their pack, or they go offline: it comes
 *   back. Anything still held when the page closed comes back next time (`bridge_gift_pending`).
 * - Trade (→ Trade…): both of you get a trade window — your pack, what you're putting in, what they're putting in,
 *   coins. Any change unreadies both; when both are ready the one who asked takes their side out and tells the
 *   other, who checks theirs is still there, swaps, and says so; then the first takes theirs in. A failed check puts
 *   everything back.
 * - Letters (the players pill → Write a letter): to anyone you've played with (`bridge_known_pilots`), online or
 *   not, with something attached if you like. Kept in `pilot_mail` (docs/supabase/2026-10-16-multiplayer.sql) and
 *   delivered when they're next in a world — a card with the letter, and the gift into their pack.
 */
var BridgeShare = (function () {
  function N() { return typeof BridgeNet !== 'undefined' ? BridgeNet : null; }
  function M() { return typeof BridgeMulti !== 'undefined' ? BridgeMulti : null; }
  function inv() { return typeof BridgeInventory !== 'undefined' ? BridgeInventory : null; }
  function item(id) { return typeof BridgeItems !== 'undefined' ? BridgeItems.get(id) : null; }
  function nm(id) { var it = item(id); return it ? it.name : id; }
  function cap(t) { return M() ? M().cap(t) : t; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function nameOf(id) { var p = N() && N().peer(id); return cap(p ? p.name : known()[id] || 'them'); }
  function rid() { return Math.random().toString(36).slice(2, 10); }
  function inWorld() { return typeof BridgeState !== 'undefined' && BridgeState.getState() === 'world'; }

  // a "thing": { items: [{ id, n }], coins }
  function desc(t) {
    var parts = (t.items || []).map(function (x) { return (x.n > 1 ? x.n + ' × ' : '') + nm(x.id); });
    if (t.coins) parts.push(t.coins + ' coins');
    return parts.join(', ') || 'nothing';
  }
  function empty(t) { return !(t.coins > 0) && !(t.items || []).some(function (x) { return x.n > 0; }); }
  // out of your pack (and purse) for safe keeping; false if you haven't got it all
  function hold(t) {
    var I = inv();
    var ok = (t.items || []).every(function (x) { return I && I.getCount(x.id) >= x.n; });
    if (!ok) return Promise.resolve(false);
    var coins = t.coins > 0 && typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins ? BridgeProgression.wagerCoins(t.coins, 'gift') : Promise.resolve({ ok: true });
    return coins.then(function (r) {
      if (!r || !r.ok) return false;
      (t.items || []).forEach(function (x) { I.removeItem(x.id, x.n); });
      return true;
    });
  }
  // into your pack (and purse); returns what wouldn't fit
  function take(t, why) {
    var I = inv(), left = [];
    (t.items || []).forEach(function (x) { if (!I || I.addItem(x.id, x.n) === false) left.push(x); });
    if (t.coins > 0 && typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) BridgeProgression.awardCoins(t.coins, why || 'gift');
    return left;
  }
  // will it all fit? (a new kind needs a free slot)
  function fits(t) {
    var I = inv();
    if (!I) return false;
    var have = I.getAll(), need = (t.items || []).filter(function (x) { return !have[x.id]; }).length;
    var free = I.freeSlots ? I.freeSlots() : 99;
    return need <= free;
  }

  // ---- picking something to give -----------------------------------------------------------------------------------
  function pick(title, done, back) {
    var I = inv(), all = I ? I.getAll() : {};
    var rows = Object.keys(all).filter(function (id) { return all[id] > 0 && item(id); }).map(function (id) {
      return { label: nm(id), icon: id, sub: '× ' + all[id], pick: function () { howMany(title, id, all[id], done, back); return false; } };
    });
    rows.unshift({ label: 'Coins', sub: 'from your purse', pick: function () { coins(title, done, back); return false; } });
    choose({ title: title, text: 'WHAT WILL IT BE?', rows: rows, buttons: back ? [{ label: 'Back', act: function () { back(); return false; } }] : [], closeLabel: 'Never mind' });
  }
  function howMany(title, id, have, done, back) {
    if (have <= 1) { done({ items: [{ id: id, n: 1 }], coins: 0 }); return; }
    var opts = [1, 5, Math.ceil(have / 2), have].filter(function (n, i, a) { return n <= have && a.indexOf(n) === i; }).sort(function (a, b) { return a - b; });
    choose({ title: title, text: ('HOW MANY ' + nm(id) + '? YOU HAVE ' + have + '.').toUpperCase(),
             buttons: opts.map(function (n) { return { label: n === have ? 'All ' + n : String(n), act: function () { done({ items: [{ id: id, n: n }], coins: 0 }); } }; })
               .concat([{ label: 'Back', act: function () { pick(title, done, back); return false; } }]), closeLabel: 'Never mind' });
  }
  function coins(title, done, back) {
    choose({ title: title, text: 'HOW MANY COINS?', input: { placeholder: '50', max: 7, button: 'OK', submit: function (v) {
      var n = Math.floor(+String(v).replace(/[^0-9]/g, ''));
      if (n > 0) done({ items: [], coins: n });
    } }, buttons: [{ label: 'Back', act: function () { pick(title, done, back); return false; } }], closeLabel: 'Never mind' });
  }

  // ---- giving ------------------------------------------------------------------------------------------------------
  var KEY = 'bridge_gift_pending', pending = load();
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function savePending() { try { localStorage.setItem(KEY, JSON.stringify(pending)); } catch (e) { /* */ } }
  function give(to) {
    var who = nameOf(to);
    pick('Give ' + who + '…', function (t) {
      hold(t).then(function (ok) {
        if (!ok) { toast('Gift', 'Not enough', 'You haven\'t got ' + desc(t)); return; }
        var gid = rid(), me = N().me();
        pending[gid] = { to: to, t: t, at: Date.now() }; savePending();
        N().send('gift', { gid: gid, t: t, name: me && me.name }, to);
        toast('Gift', 'For ' + who, desc(t) + ' - waiting for ' + who + ' to take it');
        sfx('click');
      });
    }, function () { if (M()) M().menu(to); });
  }
  function giveBack(gid, why) {
    var g = pending[gid];
    if (!g) return;
    delete pending[gid]; savePending();
    take(g.t, 'gift back');
    toast('Gift', 'Back in your pack', desc(g.t) + (why ? ' - ' + why : ''));
  }
  function onGift(d, from) {
    if (!d || !d.gid || !d.t) return;
    var who = cap(d.name || nameOf(from));
    var answer = function (yes) {
      if (!yes) { N().send('gift-no', { gid: d.gid, why: 'no thanks' }, from); return; }
      if (!fits(d.t)) { N().send('gift-no', { gid: d.gid, why: 'no room in their pack' }, from); toast('Gift', 'No room', 'Your pack is full - make room and ask again'); return; }
      take(d.t, 'gift from ' + who);
      N().send('gift-ok', { gid: d.gid }, from);
      toast('A gift', 'From ' + who, desc(d.t));
      sfx('pickup');
    };
    whenFree(function () {
      choose({ title: 'A gift from ' + who, text: (who + ' wants to give you ' + desc(d.t) + '.').toUpperCase(),
               buttons: [{ label: 'Take it', act: function () { answer(true); } }, { label: 'No thanks', act: function () { answer(false); } }], closeLabel: 'Later' });
    });
  }
  // don't snatch the screen from a conversation: wait till the world's clear (or show it at once if it's been a while)
  function whenFree(f, since) {
    since = since || Date.now();
    var busy = !inWorld() || document.querySelector('.world-dialog') || document.getElementById('trade-panel');
    if (!busy || Date.now() - since > 20000) { if (inWorld()) f(); else setTimeout(function () { whenFree(f, since); }, 1000); return; }
    setTimeout(function () { whenFree(f, since); }, 600);
  }

  // ---- trading -----------------------------------------------------------------------------------------------------
  var T = null;          // { tid, with, lead, mine: {items:{id:n}, coins}, theirs, ready, theyReady, el }
  function trade(to) {
    if (T) return;
    var tid = rid();
    T = { tid: tid, with: to, lead: true, mine: { items: {}, coins: 0 }, theirs: { items: {}, coins: 0 }, ready: false, theyReady: false, asked: Date.now() };
    N().send('trade-ask', { tid: tid, name: N().me() && N().me().name }, to);
    toast('Trade', 'Asking ' + nameOf(to), 'They\'ll see a trade window if they say yes');
    setTimeout(function () { if (T && T.tid === tid && !T.el) T = null; }, 30000);
  }
  function onAsk(d, from) {
    if (!d || !d.tid || T) { if (d && d.tid) N().send('trade-no', { tid: d.tid }, from); return; }
    var who = cap(d.name || nameOf(from));
    whenFree(function () {
      choose({ title: who + ' wants to trade', text: 'A TRADE WINDOW OPENS FOR YOU BOTH.',
               buttons: [{ label: 'Trade', act: function () { T = { tid: d.tid, with: from, lead: false, mine: { items: {}, coins: 0 }, theirs: { items: {}, coins: 0 }, ready: false, theyReady: false };
                                                              N().send('trade-yes', { tid: d.tid }, from); openTrade(); } },
                         { label: 'Not now', act: function () { N().send('trade-no', { tid: d.tid }, from); } }], closeLabel: 'Not now' });
    });
  }
  function asThing(o) { return { items: Object.keys(o.items).filter(function (id) { return o.items[id] > 0; }).map(function (id) { return { id: id, n: o.items[id] }; }), coins: o.coins || 0 }; }
  function sendOffer() { T.ready = false; T.theyReady = false; N().send('trade-offer', { tid: T.tid, o: T.mine }, T.with); paint(); }
  function openTrade() {
    if (!T) return;
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    var el = T.el = document.createElement('div');
    el.id = 'trade-panel';
    el.innerHTML = '<div class="tp-card"><div class="tp-head"><span class="tp-title"></span><button class="qj-close tp-x" aria-label="Cancel"><span class="ip-key">Esc</span></button></div>' +
      '<div class="tp-cols"><div class="tp-col"><div class="tp-label">Your pack <i>tap to put in</i></div><div class="tp-pack"></div></div>' +
      '<div class="tp-col"><div class="tp-label">You give <i>tap to take out</i></div><div class="tp-mine"></div>' +
      '<label class="tp-coins">Coins <input type="number" min="0" step="1" value="0"></label>' +
      '<div class="tp-label tp-their-label"></div><div class="tp-theirs"></div></div></div>' +
      '<div class="tp-foot"><span class="tp-status"></span><button class="tp-ready">Ready</button></div></div>';
    document.body.appendChild(el);
    el.querySelector('.tp-title').textContent = 'Trading with ' + nameOf(T.with);
    el.querySelector('.tp-their-label').textContent = nameOf(T.with) + ' gives';
    el.querySelector('.tp-x').addEventListener('click', function () { cancel(true); });
    el.querySelector('.tp-ready').addEventListener('click', function () { setReady(!T.ready); });
    var ci = el.querySelector('.tp-coins input');
    ci.addEventListener('change', function () { T.mine.coins = Math.max(0, Math.floor(+ci.value || 0)); ci.value = T.mine.coins; sendOffer(); });
    document.addEventListener('keydown', onTradeKey, true);
    paint();
  }
  function onTradeKey(e) {
    if (!T || !T.el) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(true); }
    else if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    else if (/^(e|E|j|J|c|C|i|I)$/.test(e.key)) { e.stopPropagation(); }
  }
  function cell(id, n, onClick) {
    var b = document.createElement('button'); b.className = 'tp-item'; b.type = 'button';
    var cv = document.createElement('canvas'); cv.width = 24; cv.height = 24;
    var it = item(id); if (it && it.draw) { var g = cv.getContext('2d'); g.imageSmoothingEnabled = false; it.draw(g, 0, 0, 24); }
    b.appendChild(cv);
    var s = document.createElement('span'); s.textContent = nm(id) + (n > 1 ? ' × ' + n : ''); b.appendChild(s);
    if (onClick) b.addEventListener('click', onClick); else b.disabled = true;
    return b;
  }
  function paint() {
    if (!T || !T.el) return;
    var el = T.el, I = inv(), all = I ? I.getAll() : {};
    var pack = el.querySelector('.tp-pack'), mine = el.querySelector('.tp-mine'), theirs = el.querySelector('.tp-theirs');
    pack.innerHTML = ''; mine.innerHTML = ''; theirs.innerHTML = '';
    Object.keys(all).forEach(function (id) {
      var left = all[id] - (T.mine.items[id] || 0);
      if (left > 0 && item(id)) pack.appendChild(cell(id, left, function () { T.mine.items[id] = (T.mine.items[id] || 0) + 1; sendOffer(); }));
    });
    Object.keys(T.mine.items).forEach(function (id) { if (T.mine.items[id] > 0) mine.appendChild(cell(id, T.mine.items[id], function () { T.mine.items[id]--; sendOffer(); })); });
    Object.keys(T.theirs.items).forEach(function (id) { if (T.theirs.items[id] > 0) theirs.appendChild(cell(id, T.theirs.items[id], null)); });
    if (T.theirs.coins > 0) { var c = document.createElement('div'); c.className = 'tp-their-coins'; c.textContent = T.theirs.coins + ' coins'; theirs.appendChild(c); }
    if (!theirs.children.length) theirs.innerHTML = '<div class="tp-none">nothing yet</div>';
    if (!mine.children.length) mine.innerHTML = '<div class="tp-none">nothing yet</div>';
    el.querySelector('.tp-status').textContent = T.ready && T.theyReady ? 'Swapping…' : T.ready ? 'Waiting for ' + nameOf(T.with) + '…' : T.theyReady ? nameOf(T.with) + ' is ready' : '';
    var rb = el.querySelector('.tp-ready'); rb.textContent = T.ready ? 'Not ready' : 'Ready'; rb.classList.toggle('on', T.ready);
  }
  function setReady(r) {
    T.ready = r;
    N().send('trade-ready', { tid: T.tid, r: r }, T.with);
    paint();
    maybeSwap();
  }
  function maybeSwap() {
    if (!T || !T.lead || !T.ready || !T.theyReady || T.swapping) return;
    T.swapping = true;
    var give = asThing(T.mine), get = asThing(T.theirs);
    hold(give).then(function (ok) {
      if (!ok) { T.swapping = false; setReady(false); toast('Trade', 'Not enough', 'You haven\'t got all you put in'); return; }
      T.held = give;
      N().send('trade-do', { tid: T.tid, give: give, get: get }, T.with);
    });
  }
  function same(a, b) { return JSON.stringify(norm(a)) === JSON.stringify(norm(b)); }
  function norm(t) { var o = {}; (t.items || []).forEach(function (x) { if (x.n > 0) o[x.id] = (o[x.id] || 0) + x.n; }); return { i: Object.keys(o).sort().map(function (k) { return k + ':' + o[k]; }), c: t.coins || 0 }; }
  function onDo(d, from) {
    if (!T || T.tid !== d.tid || T.lead) return;
    var give = asThing(T.mine), get = asThing(T.theirs);
    if (!same(d.get, give) || !same(d.give, get) || !fits(get)) { N().send('trade-fail', { tid: T.tid, why: fits(get) ? 'the offer changed' : 'no room in their pack' }, from); T.ready = T.theyReady = false; paint(); return; }
    hold(give).then(function (ok) {
      if (!ok) { N().send('trade-fail', { tid: T.tid, why: 'they haven\'t got it all' }, from); T.ready = T.theyReady = false; paint(); return; }
      take(get, 'trade with ' + nameOf(from));
      N().send('trade-done', { tid: T.tid }, from);
      done(give, get);
    });
  }
  function onDone(d, from) {
    if (!T || T.tid !== d.tid || !T.lead) return;
    var get = asThing(T.theirs);
    take(get, 'trade with ' + nameOf(from));
    done(T.held, get);
  }
  function onFail(d) {
    if (!T || T.tid !== d.tid) return;
    if (T.held) { take(T.held, 'trade undone'); T.held = null; }
    T.swapping = false; T.ready = T.theyReady = false; paint();
    toast('Trade', 'Not swapped', d.why || 'try again');
  }
  function done(gave, got) {
    var who = nameOf(T.with);
    closeTrade();
    toast('Traded with ' + who, 'You got ' + desc(got), 'You gave ' + desc(gave));
    sfx('coin');
  }
  function cancel(tell) {
    if (!T) return;
    if (tell) N().send('trade-cancel', { tid: T.tid }, T.with);
    if (T.held) take(T.held, 'trade undone');
    closeTrade();
  }
  function closeTrade() {
    if (T && T.el) { T.el.remove(); document.removeEventListener('keydown', onTradeKey, true); if (typeof BridgeControls !== 'undefined') BridgeControls.enable(); }
    T = null;
  }

  // ---- letters -------------------------------------------------------------------------------------------------------
  function known() { try { return JSON.parse(localStorage.getItem('bridge_known_pilots') || '{}') || {}; } catch (e) { return {}; } }
  function remember(list) {
    var k = known(), changed = false;
    (list || []).forEach(function (p) { if (p && p.id && p.name && k[p.id] !== p.name) { k[p.id] = p.name; changed = true; } });
    if (changed) try { localStorage.setItem('bridge_known_pilots', JSON.stringify(k)); } catch (e) { /* */ }
  }
  function db() { return typeof BridgeDB !== 'undefined' && BridgeDB.client ? BridgeDB.client() : null; }
  function writeTo(back) {
    var k = known(), ids = Object.keys(k);
    if (!ids.length) { choose({ title: 'Write a letter', text: 'YOU CAN WRITE TO ANYONE YOU\'VE PLAYED ALONGSIDE. NOBODY YET.', buttons: [] }); return; }
    choose({ title: 'Write a letter', text: 'WHO TO?', rows: ids.map(function (id) {
      var on = N() && N().peer(id);
      return { label: cap(k[id]), sub: on ? 'online' : 'offline - it waits for them', pick: function () { compose(id); return false; } };
    }), buttons: back ? [{ label: 'Back', act: function () { back(); return false; } }] : [] });
  }
  function compose(to, body) {
    var who = nameOf(to);
    choose({ title: 'A letter to ' + who, text: 'WHAT DO YOU WANT TO SAY?', input: { placeholder: 'Dear ' + who + '…', max: 240, value: body || '', button: 'Next', submit: function (v) {
      v = String(v || '').trim();
      if (!v) return;
      setTimeout(function () { attach(to, v); }, 0);
    } }, buttons: [] });
  }
  function attach(to, body) {
    var who = nameOf(to);
    choose({ title: 'A letter to ' + who, text: ('“' + body + '”').toUpperCase(), buttons: [
      { label: 'Send it', act: function () { post(to, body, { items: [], coins: 0 }); } },
      { label: 'Put something in with it', act: function () { pick('With the letter…', function (t) { post(to, body, t); }, function () { attach(to, body); }); return false; } }
    ], closeLabel: 'Tear it up' });
  }
  function post(to, body, t) {
    var c = db(), me = N() && N().me();
    if (!c || !me) { toast('Letter', 'Can\'t send', 'No connection'); return; }
    hold(t).then(function (ok) {
      if (!ok) { toast('Letter', 'Not enough', 'You haven\'t got ' + desc(t)); return; }
      c.from('pilot_mail').insert({ from_pilot: me.id, to_pilot: to, from_name: me.name, body: body, items: (t.items || []).map(function (x) { return { id: x.id, count: x.n }; }), coins: t.coins || 0 })
        .then(function (r) {
          if (r.error) { take(t, 'letter not sent'); toast('Letter', 'Not sent', 'The post isn\'t running yet (the database needs its letters table)'); return; }
          if (N()) N().send('mail', {}, to);
          toast('Letter', 'Sent to ' + nameOf(to), empty(t) ? 'It\'ll be waiting for them' : 'With ' + desc(t));
          sfx('open');
        });
    });
  }
  var checking = false, queue = [];
  function checkMail() {
    var c = db(), me = N() && N().me();
    if (!c || !me || checking) return;
    checking = true;
    c.from('pilot_mail').select('id, from_name, body, items, coins, created_at').eq('to_pilot', me.id).is('opened_at', null).order('created_at', { ascending: true })
      .then(function (r) {
        checking = false;
        if (r.error || !r.data) return;
        r.data.forEach(function (m) { if (!queue.some(function (q) { return q.id === m.id; })) queue.push(m); });
        if (queue.length) deliver();
      }, function () { checking = false; });
  }
  var delivering = false, current = null;
  // a letter put away unread (Esc, or "Later") comes round again
  setInterval(function () {
    if (delivering && current && !document.querySelector('.world-dialog')) { queue.unshift(current); current = null; delivering = false; setTimeout(deliver, 120000); }
  }, 4000);
  function deliver() {
    if (delivering || !queue.length) return;
    delivering = true;
    whenFree(function () {
      var m = current = queue.shift(), t = { items: (m.items || []).map(function (x) { return { id: x.id, n: x.count || x.n || 1 }; }), coins: m.coins || 0 };
      var who = cap(m.from_name || 'someone');
      var open = function () {
        var c = db();
        if (!empty(t)) {
          if (!fits(t)) { toast('Letter', 'No room', 'Make room in your pack - the gift waits with the letter'); current = null; delivering = false; queue.unshift(m); setTimeout(deliver, 60000); return; }
          take(t, 'letter from ' + who);
        }
        current = null;
        if (c) c.from('pilot_mail').update({ opened_at: new Date().toISOString() }).eq('id', m.id).then(function () {});
        if (typeof BridgeQuests !== 'undefined' && BridgeQuests.note) BridgeQuests.note('Letter from ' + who, '“' + m.body + '”', empty(t) ? '' : 'With ' + desc(t));
        sfx('pickup');
        delivering = false;
        if (queue.length) setTimeout(deliver, 400);
      };
      choose({ title: 'A letter from ' + who, text: ('“' + m.body + '”' + (empty(t) ? '' : ' — tucked inside: ' + desc(t) + '.')).toUpperCase(),
               buttons: [{ label: empty(t) ? 'Keep it' : 'Take it', act: open }], closeLabel: 'Later' });
    });
  }

  // ---- wiring ------------------------------------------------------------------------------------------------------
  function wire() {
    var n = N();
    if (!n) return;
    n.on('gift', onGift);
    n.on('gift-ok', function (d, from) { var g = pending[d && d.gid]; if (!g) return; delete pending[d.gid]; savePending();
      toast('Gift', nameOf(from) + ' took it', desc(g.t)); sfx('success'); });
    n.on('gift-no', function (d) { giveBack(d && d.gid, d && d.why); });
    n.on('trade-ask', onAsk);
    n.on('trade-yes', function (d) { if (T && T.tid === d.tid && T.lead) openTrade(); });
    n.on('trade-no', function (d) { if (T && T.tid === d.tid && !T.el) { toast('Trade', nameOf(T.with) + ' said not now', ''); T = null; } });
    n.on('trade-offer', function (d) { if (T && T.tid === d.tid) { T.theirs = d.o || { items: {}, coins: 0 }; T.ready = T.theyReady = false; paint(); } });
    n.on('trade-ready', function (d) { if (T && T.tid === d.tid) { T.theyReady = !!d.r; paint(); maybeSwap(); } });
    n.on('trade-do', onDo);
    n.on('trade-done', onDone);
    n.on('trade-fail', onFail);
    n.on('trade-cancel', function (d) { if (T && T.tid === d.tid) { var who = nameOf(T.with); cancel(false); toast('Trade', who + ' called it off', ''); } });
    n.on('leave', function (p, id) {
      Object.keys(pending).forEach(function (g) { if (pending[g].to === id) giveBack(g, 'they went offline'); });
      if (T && T.with === id) { cancel(false); toast('Trade', 'Called off', 'They went offline'); }
    });
    n.on('peers', remember);
    n.on('up', function () { setTimeout(checkMail, 1500); });
    n.on('mail', function () { checkMail(); });
    setInterval(checkMail, 300000);
  }
  // anything held for a gift when the page last closed comes back
  Object.keys(pending).forEach(function (g) { if (Date.now() - pending[g].at > 5000) setTimeout(function () { giveBack(g, 'never collected'); }, 4000); });

  if (typeof BridgeMulti !== 'undefined') {
    BridgeMulti.addMenu(function (id, p, remote) {
      if (remote) return [{ label: 'Write a letter', act: function () { compose(id); return false; } }];
      return [{ label: 'Give…', act: function () { give(id); return false; } }, { label: 'Trade…', act: function () { trade(id); } },
              { label: 'Write a letter', act: function () { compose(id); return false; } }];
    });
    BridgeMulti.addPanel(function () { return [{ label: 'Write a letter', act: function () { writeTo(function () { BridgeMulti.panel(); }); return false; } }]; });
  }
  wire();

  return { give: give, trade: trade, writeTo: writeTo, compose: compose, post: post, checkMail: checkMail, _trade: function () { return T; }, _pending: function () { return pending; } };
})();
