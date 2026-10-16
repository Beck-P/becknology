// helpers for the play-together tests
const fs = require('fs');
const S = __dirname;
const lib = require(__dirname + '/../mp_lib.js');
const AID = '22222222-2222-2222-2222-222222222222', BID = '11111111-1111-1111-1111-111111111111';
const click = (p, re) => p.evaluate(src => { const r = new RegExp(src); const b = [...document.querySelectorAll('.wd-opt, .wd-sell-row.pick')].find(e => r.test(e.innerText) && !e.disabled && !e.classList.contains('none')); if (b) { b.click(); return true; } return false; }, re.source);
const dlg = p => p.evaluate(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ').slice(0, 400) : 'none'; });
const errs = [];
function watchErrors(p, who) {
  p.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (!/Failed to load resource|ERR_FAILED|net::|ERR_TUNNEL/.test(t)) { errs.push(who + ': ' + t); console.log(who, 'CONSOLE-ERR', t); } } });
}
// the CDN modules chess needs, from the npm registry's copies (the CDNs aren't reachable from here)
const NPM = __dirname + '/../npm';               // tools/tests/npm.sh fetches them
async function cdn(ctx) {
  const js = (body) => ({ status: 200, contentType: 'application/javascript', body });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/chess\.js@1\.0\.0-beta\.6\/\+esm/, r => r.fulfill(js(fs.readFileSync(NPM + '/chess/package/dist/esm/chess.js'))));
  await ctx.route(/esm\.sh\/three@0\.160\.0(\/.*)?$/, r => {
    const u = new URL(r.request().url()), rest = u.pathname.replace(/^\/three@0\.160\.0/, '');
    const file = rest ? NPM + '/three/package' + rest : NPM + '/three/package/build/three.module.js';
    if (!fs.existsSync(file)) return r.fulfill({ status: 404, body: '' });
    let body = fs.readFileSync(file, 'utf8').replace(/from ['"]three['"]/g, "from 'https://esm.sh/three@0.160.0'");
    return r.fulfill(js(body));
  });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/cm-chessboard@8\.7\.6\/(.*)$/, r => {
    const rest = new URL(r.request().url()).pathname.replace(/^\/npm\/cm-chessboard@8\.7\.6/, '');
    const file = NPM + '/cmcb/package' + rest;
    if (!fs.existsSync(file)) return r.fulfill({ status: 404, body: '' });
    const ct = /\.svg$/.test(file) ? 'image/svg+xml' : /\.css$/.test(file) ? 'text/css' : 'application/javascript';
    return r.fulfill({ status: 200, contentType: ct, body: fs.readFileSync(file) });
  });
  await ctx.route(/stockfish/, r => r.abort());
}
async function two(b, world, spawnB, spawnA) {
  await lib.reset();
  const beck = await lib.player(b, S, lib.BECK), aly = await lib.player(b, S, lib.ALY);
  await cdn(beck.context()); await cdn(aly.context());
  watchErrors(beck, 'BECK'); watchErrors(aly, 'ALY');
  await lib.enter(beck, world, spawnB); await lib.enter(aly, world, spawnA);
  await beck.waitForTimeout(1500);
  return { beck, aly };
}
const frame = p => p.frames().find(f => /together=/.test(f.url()));
const coins = p => p.evaluate(() => window._coins);
const sess = p => p.evaluate(() => { const s = BridgeTogether.session(); return s ? { state: s.state, mine: s.mine, theirs: s.theirs, target: s.target, pot: s.pot, outcome: s.outcome } : null; });
module.exports = Object.assign({ S, AID, BID, click, dlg, errs, two, frame, coins, sess, cdn }, lib);
