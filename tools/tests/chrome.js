// The Chromium the tests launch: $CHROME, else the one pre-installed in Claude Code's cloud containers, else
// Playwright's own (undefined).
const fs = require('fs');
const BUILT_IN = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
module.exports = process.env.CHROME || (fs.existsSync(BUILT_IN) ? BUILT_IN : undefined);

// BRIDGE_PORT: the game from another server than :8766 (a second checkout, a worktree working alongside this one —
// run.js starts serve.py there): every page the tests open has its :8766 requests sent to that port instead.
const PORT = process.env.BRIDGE_PORT;
if (PORT && PORT !== '8766') {
  const pw = require('playwright');
  // fetched from that port and handed back as the page's own (continue() to another port is blocked for its scripts)
  const swap = (r) => r.fetch({ url: r.request().url().replace('127.0.0.1:8766', '127.0.0.1:' + PORT) })
    .then((res) => r.fulfill({ response: res }), () => r.abort().catch(() => {}));
  const launch = pw.chromium.launch.bind(pw.chromium);
  pw.chromium.launch = async (...a) => {
    const b = await launch(...a);
    const nc = b.newContext.bind(b), np = b.newPage.bind(b);
    b.newContext = async (...c) => { const x = await nc(...c); await x.route(/^http:\/\/127\.0\.0\.1:8766\//, swap); return x; };
    b.newPage = async (...c) => { const x = await np(...c); await x.route(/^http:\/\/127\.0\.0\.1:8766\//, swap); return x; };
    return b;
  };
}
