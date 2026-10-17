// The Chromium the tests launch: $CHROME, else the one pre-installed in Claude Code's cloud containers, else
// Playwright's own (undefined).
const fs = require('fs');
const BUILT_IN = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
module.exports = process.env.CHROME || (fs.existsSync(BUILT_IN) ? BUILT_IN : undefined);

// BRIDGE_PORT: the game from another server than :8766 (a second checkout, a worktree working alongside this one —
// run.js starts serve.py there): every page the tests open has its :8766 requests answered by this checkout instead.
// A file is read straight from this checkout's disk, through vercel.json's rewrites as serve.py does (quick and steady);
// anything else is fetched from that port. (Rewriting the request's own URL to the port gets the page's scripts
// blocked as cross-origin, ERR_BLOCKED_BY_CLIENT.)
const PORT = process.env.BRIDGE_PORT;
// SUPA_PORT: the Supabase stand-in on another port than :8767 (the second checkout's own fakesupa.py, so two checkouts'
// multiplayer tests don't reset each other's): every page the tests open is told it (fakesupa.js reads __SUPA_PORT).
const SUPA = process.env.SUPA_PORT;
const BRIDGE = PORT && PORT !== '8766', OWN_SUPA = SUPA && SUPA !== '8767';
if (BRIDGE || OWN_SUPA) {
  const pw = require('playwright');
  const path = require('path');
  const ROOT = path.join(__dirname, '..', '..');
  const rules = (JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).rewrites || [])
    .map((r) => [new RegExp('^' + r.source.replace(/\(\.\*\)/g, '(.*)') + '$'), r.destination]);
  const fileFor = (url) => {
    let p = decodeURIComponent(new URL(url).pathname);
    if (p === '/runouts' || p.startsWith('/runouts/')) p = '/apps/runouts/dist/' + (p.slice(8).replace(/^\//, '') || 'index.html');
    else for (const [rx, dest] of rules) if (rx.test(p)) { p = p.replace(rx, dest); break; }
    let f = path.join(ROOT, p);
    if (!f.startsWith(ROOT)) return null;
    try { if (fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); return fs.statSync(f).isFile() ? f : null; } catch (e) { return null; }
  };
  const swap = async (r) => {
    const req = r.request(), f = req.method() === 'GET' ? fileFor(req.url()) : null;
    try {
      if (f) await r.fulfill({ path: f, headers: { 'cache-control': 'no-store' } });
      else await r.fulfill({ response: await r.fetch({ url: req.url().replace('127.0.0.1:8766', '127.0.0.1:' + PORT), maxRedirects: 0 }) });
    } catch (e) { try { await r.abort(); } catch (e2) { /* the page has gone */ } }
  };
  const reroute = (b) => {
    if (!b || b.__rerouted) return b;
    b.__rerouted = true;
    const nc = b.newContext.bind(b), np = b.newPage.bind(b);
    // a page sent to :8766 goes to the port itself, so the game is served there natively (its own origin: the Supabase
    // stand-in's stream, which never came up through the route below); the route still answers any :8766 request
    const goes = (pg) => {
      const g = pg.goto.bind(pg);
      if (BRIDGE) pg.goto = (u, ...r) => g(String(u).replace('127.0.0.1:8766', '127.0.0.1:' + PORT), ...r);
      return pg;
    };
    const fit = async (x) => {
      if (OWN_SUPA) await x.addInitScript('window.__SUPA_PORT = ' + (+SUPA) + ';');
      if (BRIDGE) await x.route(/^http:\/\/127\.0\.0\.1:8766\//, swap);
      if (typeof x.newPage === 'function' && !x.__goes) { const xp = x.newPage.bind(x); x.newPage = async (...a) => goes(await xp(...a)); x.__goes = true; }
      if (typeof x.goto === 'function') goes(x);
      return x;
    };
    b.newContext = async (...c) => fit(await nc(...c));
    b.newPage = async (...c) => fit(await np(...c));
    return b;
  };
  const launch = pw.chromium.launch.bind(pw.chromium);
  pw.chromium.launch = async (...a) => reroute(await launch(...a));
  // `chromium.launch({ executablePath: require('./chrome.js') })` looks launch up before this file has run, so the
  // call it makes is the original one: catch the browser as that hands it back (through the browser type's own wrapper)
  const wrap = pw.chromium._wrapApiCall;
  if (typeof wrap === 'function') {
    pw.chromium._wrapApiCall = function (...a) {
      return Promise.resolve(wrap.apply(this, a)).then((r) => (r && typeof r.newContext === 'function' && typeof r.contexts === 'function' ? reroute(r) : r));
    };
  }
}
