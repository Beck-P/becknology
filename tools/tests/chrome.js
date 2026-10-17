// The Chromium the tests launch: $CHROME, else the one pre-installed in Claude Code's cloud containers, else
// Playwright's own (undefined).
const fs = require('fs');
const BUILT_IN = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
module.exports = process.env.CHROME || (fs.existsSync(BUILT_IN) ? BUILT_IN : undefined);

// BRIDGE_PORT: the game from another server than :8766 (a second checkout, a worktree working alongside this one —
// run.js starts serve.py there): every page the tests open has its :8766 requests answered from that port instead
// (fetched there and handed back under the :8766 address — rewriting the URL in flight left every file the page asked
// for after it blocked, ERR_BLOCKED_BY_CLIENT). It patches
// playwright when it's first required, so it has to be loaded before a test reads `chromium.launch`: run.js preloads it
// (NODE_OPTIONS=--require); running one test by hand, `node -r tools/tests/chrome.js tools/tests/<suite>/<file>.js`.
const PORT = process.env.BRIDGE_PORT;
if (PORT && PORT !== '8766') {
  const pw = require('playwright');
  const swap = async (r) => {
    const url = r.request().url().replace('127.0.0.1:8766', '127.0.0.1:' + PORT);
    for (let i = 0; i < 4; i++) {                                // a busy machine drops the odd one: try again
      try { await r.fulfill({ response: await r.fetch({ url, timeout: 60000 }) }); return; }
      catch (e) { if (/closed|Target|has been/i.test(String(e && e.message))) return; }
    }
    try { await r.abort(); } catch (e) { /* the page has gone */ }
  };
  const launch = pw.chromium.launch.bind(pw.chromium);
  pw.chromium.launch = async (...a) => {
    const b = await launch(...a);
    const nc = b.newContext.bind(b), np = b.newPage.bind(b);
    b.newContext = async (...c) => { const x = await nc(...c); await x.route(/^http:\/\/127\.0\.0\.1:8766\//, swap); return x; };
    b.newPage = async (...c) => { const x = await np(...c); await x.route(/^http:\/\/127\.0\.0\.1:8766\//, swap); return x; };
    return b;
  };
}
