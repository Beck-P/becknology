// The title page (js/intro.js): the Wayfarer over the planet she's parked at, lit by its clock; the menu; every way on
// from it — Continue (Enter, a click, a tap), the records out of reach, New pilot and Sign in (js/identity.js) and back,
// someone new clicking the sky. Wide (1280×800) and a phone (390×844), with a pilot saved and without, by day and night;
// screenshots wide-*.png and phone-*.png in the shots folder.
// node world/title.js [shots dir]
const CHROME = require(__dirname + '/../chrome.js');            // first, so BRIDGE_PORT's reroute is in place
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || __dirname + '/../shots/title';
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8766/?at=';
const DAY = '2026-10-17T13:00', NIGHT = '2026-10-17T09:00';      // Lumar 5:00 midday, 1:00 at night
let errors = 0;

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });

  async function open(name, o) {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 800 } }, o.ctx || {}));
    const p = await ctx.newPage();
    p.on('pageerror', e => { errors++; console.log(name, 'PAGEERR', e.message.slice(0, 200)); });
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) { errors++; console.log(name, 'CONSOLE-ERR', m.text().slice(0, 200)); } });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    if (o.init) await p.addInitScript(o.init);
    await p.addInitScript(([loc, pilot]) => {
      localStorage.setItem('bridge_ship_location', loc);
      if (pilot) localStorage.setItem('bridge_pilot', pilot);
    }, [o.loc || 'lumar', o.pilot || null]);
    await p.goto(URL + (o.at || DAY), { waitUntil: 'domcontentloaded', timeout: 90000 });
    // the title up, the ship and the planet in (slow on a busy machine)
    await p.waitForFunction(() => typeof BridgeIntro !== 'undefined' && BridgeIntro._state().booted && BridgeIntro._state().planet && BridgeIntro._state().ship,
                            null, { timeout: 60000 }).catch(() => console.log(name, 'the title was slow to come up'));
    await p.waitForTimeout(o.wait || 1500);
    return { p, ctx };
  }
  // pilot records that answer (the Supabase CDN is blocked here, so the real ones never do)
  const records = (p) => p.evaluate(() => {
    BridgeDB.lookupPilot = async (n) => ({ id: 't-' + n, name: n, suit_color: 'gold' });
    BridgeDB.updateLastSeen = async () => {};
  });
  const st = (p) => p.evaluate(() => Object.assign(BridgeIntro._state(), { state: BridgeState.getState(), world: BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null }));
  const saved = [];
  const shot = async (p, file) => { await p.screenshot({ path: OUT + '/' + file }); saved.push(file); };
  const waitWorld = (p, ms) => p.waitForFunction(() => BridgeState.getState() === 'world', null, { timeout: ms || 40000 }).then(() => true, () => false);

  // the title as it stands: what it says, the light under her, no starfield under it
  async function look(p, label, when) {
    const s = await st(p);
    const ui = await p.evaluate(() => ({
      card: (document.querySelector('.ti-card') || {}).innerText,
      where: (document.getElementById('ti-where') || {}).innerText,
      clock: (document.getElementById('ti-clock') || {}).innerText,
      mark: (() => { const c = document.getElementById('ti-mark'); return c ? [c.width, c.height, c.style.width] : null; })(),
      site: (document.getElementById('ti-site') || {}).innerText
    }));
    ui.starfield = await p.evaluate(() => new Promise(r => { let n = 0; const f = BridgeStarfield.draw; BridgeStarfield.draw = function () { n++; return f.apply(this, arguments); }; setTimeout(() => { BridgeStarfield.draw = f; r(n); }, 300); }));
    console.log(label + ' ' + when + ': place ' + s.place + ', light under her ' + s.light + ', ship ' + s.ship + ', planet ' + s.planet + ', booted ' + s.booted +
                ', menu ' + s.items.join('/') + ', buffer ' + s.size.join('x'));
    console.log('  card: ' + String(ui.card).replace(/\s+/g, ' ') + ' | hud: ' + String(ui.where).replace(/\s+/g, ' ') + ' / ' + String(ui.clock).replace(/\s+/g, ' '));
    console.log('  wordmark ' + JSON.stringify(ui.mark) + ', starfield draws under the title ' + ui.starfield + ', the ground below: ' + String(ui.site).replace(/\s+/g, ' '));
    if (ui.starfield) { errors++; console.log('FAILED: the starfield is drawn under the title'); }
    if (when === 'day' && !(s.light > 0)) { errors++; console.log('FAILED: the ground under her should be lit by day'); }
    if (when === 'night' && !(s.light < 0)) { errors++; console.log('FAILED: the ground under her should be dark at night'); }
    return s;
  }
  // the same page at another time (the sun moves on the next frames, the readouts within half a second)
  const clockTo = async (p, at) => { await p.evaluate((at) => BridgeClock._at(at), at); await p.waitForTimeout(1500); };

  // ---- wide, a pilot saved: by night, then by day; Enter continues ---------------------------------------------------
  {
    const { p, ctx } = await open('wide', { pilot: 'BECK', at: NIGHT });
    await look(p, '1280×800', 'night');
    await shot(p, 'wide-pilot-night.png');
    await clockTo(p, DAY);
    await look(p, '1280×800', 'day');
    await shot(p, 'wide-pilot-day.png');
    // Enter continues: the push in through the gallery, a flash, the bridge
    await records(p);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(700);
    console.log('  Enter: boarding ' + (await st(p)).boarding);
    await shot(p, 'wide-boarding.png');
    const ok = await waitWorld(p);
    await p.waitForTimeout(250);
    const flash = await p.evaluate(() => !!document.querySelector('.ti-flash'));
    const after = await st(p);
    console.log('  after Enter: state ' + after.state + ', world ' + after.world + ', pilot ' + await p.evaluate(() => (BridgeState.getPilot() || {}).name) +
                ', title gone ' + !after.active + ', flash over the bridge ' + flash);
    if (!ok || after.world !== 'bridge') { errors++; console.log('FAILED: Enter did not reach the bridge'); }
    await p.waitForTimeout(1000);
    await shot(p, 'wide-arrived.png');
    await ctx.close();
  }

  // ---- records that answer as the page opens: the face in their suit, their coins, who's on the wire ----------------
  {
    const { p, ctx } = await open('records', { pilot: 'BECK', init: () => {
      // a stand-in for supabase-js: the pilot, their coins, Alyssa in the lobby's presence; anything else answers nothing
      const rows = { pilots: { id: 'p-beck', name: 'BECK', suit_color: 'cyan' }, pilot_coins: { balance: 1240 } };
      const q = (table) => { const b = new Proxy({}, { get: (t, k) => k === 'then' ? (a, c) => Promise.resolve({ data: rows[table] || null, error: null }).then(a, c) : () => b }); return b; };
      const chan = () => { const c = new Proxy({}, { get: (t, k) => {
        if (k === 'then') return undefined;
        if (k === 'subscribe') return (cb) => { setTimeout(() => cb && cb('SUBSCRIBED'), 50); return c; };
        if (k === 'on') return (type, f, cb) => { if (type === 'presence') setTimeout(() => cb && cb({}), 150); return c; };
        if (k === 'presenceState') return () => ({ 'p-aly': [{ name: 'ALYSSA', place: 'Brambleford' }], 'p-beck': [{ name: 'BECK', place: 'The Bridge' }] });
        return () => Promise.resolve('ok');
      } }); return c; };
      const client = { from: q, rpc: () => Promise.resolve({ data: null, error: null }), channel: chan, removeChannel: () => Promise.resolve('ok'), getChannels: () => [] };
      window.supabase = { createClient: () => client };
    } });
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => ({ card: document.querySelector('.ti-card').innerText.replace(/\s+/g, ' '), wire: document.getElementById('ti-wire').innerText,
      face: document.getElementById('ti-face').classList.contains('on') && document.getElementById('ti-face').getContext('2d').getImageData(12, 12, 1, 1).data[3] > 0,
      portrait: performance.getEntriesByType('resource').some(e => /\/portraits\/pilots\//.test(e.name)), coinsShown: !document.getElementById('ti-coins').hidden }));
    console.log('records that answer: card "' + r.card + '", face drawn ' + r.face + ' (portrait ' + r.portrait + '), coins shown ' + r.coinsShown + ', wire "' + r.wire + '"');
    if (!r.coinsShown || !/1,240/.test(r.card) || !/ALYSSA/.test(r.wire) || /BECK/.test(r.wire)) { errors++; console.log('FAILED: coins or the wire missing'); }
    if (!r.face || !r.portrait) { errors++; console.log('FAILED: the pilot\'s face is not their portrait'); }
    await shot(p, 'wide-records-wire.png');
    await ctx.close();
  }

  // ---- the records out of reach: back on the title, nobody forgotten --------------------------------------------
  {
    const { p, ctx } = await open('comms', { pilot: 'BECK' });
    await p.click('.ti-card');
    await p.waitForFunction(() => document.querySelector('.ti-bl.bad') && !BridgeIntro._state().boarding, null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(300);
    const s = await st(p);
    const note = await p.evaluate(() => (document.querySelector('.ti-bl.bad') || {}).innerText || '');
    console.log('records out of reach: state ' + s.state + ', boarding ' + s.boarding + ', pilot kept ' + await p.evaluate(() => localStorage.getItem('bridge_pilot')) +
                ', note "' + note.replace(/\s+/g, ' ') + '"');
    if (s.state !== 'intro' || s.boarding || !note) { errors++; console.log('FAILED: a failed lookup should leave you on the title with a note'); }
    // and once they answer, a click on the sky continues
    await records(p);
    await p.mouse.click(1100, 300);
    const ok = await waitWorld(p);
    console.log('  then a click on the sky: ' + (ok ? 'aboard, ' + (await st(p)).world : 'still ' + (await st(p)).state));
    if (!ok) errors++;
    await ctx.close();
  }

  // ---- desktop, someone new: the sky, New pilot, Sign in, and back ---------------------------------------------------
  {
    const { p, ctx } = await open('new', { at: NIGHT });
    const s = await st(p);
    console.log('no pilot: menu ' + s.items.join('/') + ', hint "' + await p.evaluate(() => document.getElementById('ti-hint').innerText) + '"');
    await shot(p, 'wide-new-night.png');
    await p.mouse.click(1100, 300);                                   // the sky: who are you?
    await p.waitForTimeout(400);
    const choice = await p.evaluate(() => [BridgeState.getState(), !!document.getElementById('btn-new'), BridgeIntro.covers()]);
    console.log('  the sky: state ' + choice[0] + ', the identity choice ' + choice[1] + ', the scene behind ' + choice[2]);
    await shot(p, 'wide-identity-choice.png');
    await p.click('#btn-title');
    await p.waitForTimeout(400);
    console.log('  BACK: state ' + (await st(p)).state);
    await p.click('.ti-item[data-id="new"]');
    await p.waitForTimeout(600);
    const form = await p.evaluate(() => [BridgeState.getState(), !!document.getElementById('pilot-name'), !!document.getElementById('pilot-preview')]);
    console.log('  New pilot: state ' + form[0] + ', callsign box ' + form[1] + ', look preview ' + form[2]);
    await shot(p, 'wide-new-pilot-form.png');
    await p.click('#btn-back-choice');
    await p.waitForTimeout(400);
    console.log('  its BACK: state ' + (await st(p)).state);
    // ↓ then Enter: Sign in; a callsign; the records answer; aboard
    await p.keyboard.press('ArrowDown');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(500);
    console.log('  ↓ Enter: state ' + (await st(p)).state + ', returning form ' + await p.evaluate(() => !!document.getElementById('btn-login')));
    await records(p);
    await p.fill('#pilot-name', 'alyssa');
    await p.click('#btn-login');
    await p.waitForTimeout(600);
    console.log('  signing in: boarding ' + (await st(p)).boarding);
    const ok = await waitWorld(p);
    const after = await st(p);
    console.log('  signed in: state ' + after.state + ', world ' + after.world + ', pilot ' + await p.evaluate(() => (BridgeState.getPilot() || {}).name));
    if (!ok || after.world !== 'bridge') { errors++; console.log('FAILED: signing in did not reach the bridge'); }
    await ctx.close();
  }

  // ---- a phone: with a pilot by night and by day (a tap continues), someone new --------------------------------------
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true };
  const fits = async (p, name) => {
    const f = await p.evaluate(() => {
      const r = (q) => { const e = document.querySelector(q); return e ? e.getBoundingClientRect() : null; };
      const m = r('#ti-mark'), pn = r('#ti-panel');
      return { mark: m && [Math.round(m.left), Math.round(m.right)], panel: pn && [Math.round(pn.left), Math.round(pn.right), Math.round(pn.top), Math.round(pn.bottom)],
               scroll: document.documentElement.scrollWidth > innerWidth, hint: document.getElementById('ti-hint').innerText, light: BridgeIntro._state().light, size: BridgeIntro._state().size };
    });
    console.log(name + ': light ' + f.light + ', buffer ' + f.size.join('x') + ', wordmark x ' + f.mark + ', panel ' + f.panel + ', sideways scroll ' + f.scroll + ', hint "' + f.hint + '"');
    if (f.scroll || (f.mark && (f.mark[0] < 0 || f.mark[1] > 390))) { errors++; console.log('FAILED: the phone layout spills off the screen'); }
  };
  {
    const { p, ctx } = await open('phone', { ctx: phone, pilot: 'BECK', at: NIGHT });
    await fits(p, 'phone-pilot-night');
    await shot(p, 'phone-pilot-night.png');
    await clockTo(p, DAY);
    await fits(p, 'phone-pilot-day');
    await shot(p, 'phone-pilot-day.png');
    await records(p);
    await p.tap('.ti-card');
    const ok = await waitWorld(p);
    console.log('  a tap on Continue: ' + (ok ? 'aboard, ' + (await st(p)).world : 'still ' + (await st(p)).state));
    if (!ok) errors++;
    await p.waitForTimeout(1000);
    await shot(p, 'phone-arrived.png');
    await ctx.close();
  }
  {
    const { p, ctx } = await open('phone-new', { ctx: phone, at: DAY });
    await fits(p, 'phone-new-day');
    await shot(p, 'phone-new-day.png');
    await ctx.close();
  }

  // ---- every other place she can be parked (one page: the title shown again for each); then hide() -------------------
  {
    const { p, ctx } = await open('places', { pilot: 'BECK', at: '2026-10-17T19:30' });
    for (const loc of ['verdance', 'hoarfell', 'sylvara', 'arcadia', 'enigma', 'singularity']) {
      await p.evaluate((loc) => { localStorage.setItem('bridge_ship_location', loc); BridgeIntro.hide(); BridgeIntro.show(); }, loc);
      await p.waitForFunction(() => BridgeIntro._state().planet, null, { timeout: 30000 }).catch(() => {});
      await p.waitForTimeout(1300);
      const s = await st(p);
      const clock = await p.evaluate(() => (document.getElementById('ti-clock') || {}).innerText || '');
      console.log(loc + ': place ' + s.place + ', light ' + s.light + ', hud "' + clock.replace(/\s+/g, ' ') + '"');
      if (s.place !== loc) { errors++; console.log('FAILED: shown again, the title should be over ' + loc); }
      await shot(p, 'wide-' + loc + '.png');
    }
    // hide(): every other test skips the title with it
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(600);
    const s = await st(p);
    const vis = await p.evaluate(() => getComputedStyle(document.getElementById('intro-overlay')).display);
    console.log('hide(): covers ' + s.active + ', overlay ' + vis + ', state ' + s.state + ' (Enter does nothing after)');
    if (s.active || vis !== 'none' || s.state !== 'intro') { errors++; console.log('FAILED: hide() should leave nothing behind'); }
    await ctx.close();
  }

  console.log('screens saved: ' + saved.length + ' in ' + OUT);
  console.log('title: errors ' + errors);
  await b.close();
})();
