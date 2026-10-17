#!/usr/bin/env node
// Becknology's browser tests, in one go: `node tools/tests/run.js [suite ...]` (suites below; none = all of them).
// Starts the local server (serve.py, :8766) and the Supabase stand-in (fakesupa.py, :8767) if they aren't up, runs
// each test in headless Chromium, and prints the lines that say how it went. A test FAILS when it crashes, times out,
// or reports a page error / console error / a non-zero error count; everything else is read by eye (see README.md).
const { execFileSync, execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const D = __dirname, ROOT = path.join(D, '..', '..');
const SHOTS = path.join(D, 'shots');

const SUITES = {
  // every world loads with no page errors, missing files or console errors; the pads you land on; Lumar's harbours; the title page
  world: [
    ['world/errs.js'],
    ['world/actors.js'],
    ['world/clock.js'],
    ['world/business.js', SHOTS],
    ['world/weather.js', SHOTS],
    ['world/legacy.js', SHOTS],
    ['world/hands.js'],
    ['world/staff.js', SHOTS],
    ['world/office.js', SHOTS],
    ['world/empire.js', SHOTS],
    ['world/aquarium.js', SHOTS],
    ['world/foliage.js', SHOTS],
    ['world/nature.js', SHOTS],
    ['world/orders.js', SHOTS],
    ['world/sleep.js', SHOTS],
    ['world/workshop.js', SHOTS],
    ['world/gpu.js', SHOTS],
    ['world/routines.js', SHOTS],
    ['world/crowd.js', SHOTS],
    ['world/festivals.js', SHOTS],
    ['world/music.js'],
    ['world/dungeon.js', SHOTS],
    ['world/events.js', SHOTS],
    ['world/regatta.js', SHOTS],
    ['world/landings.js', SHOTS + '/landings'],
    ['world/arrive.js', SHOTS + '/arrive'],
    ['world/title.js', SHOTS + '/title'],
  ],
  // two pilots on the fake Supabase: seeing each other, walking, presence, sharing, partners, fighting, sailing, a party
  multi: ['mp_see', 'mp_walk', 'mp_visible', 'mp_presence', 'mp_away', 'mp_share', 'mp_partner', 'mp_clue', 'mp_fight', 'mp_hp',
    'mp_sail', 'mp_sailcol', 'mp_seapill', 'mp_seafight', 'mp_party'].map((t) => ['multi/' + t + '.js', D]),
  // playing every game together (js/together.js), and the table chat
  together: [['t_cab.js', 'asteroids'], ['t_cab.js', 'breakout'], ['t_cab.js', 'space-invaders', 'Co-op', 'Just for fun'],
    ['t_heli.js', 'Score duel'], ['t_heli.js', 'Tandem'], ['t_dice.js', 'With'], ['t_dice.js', 'Heads', 'lumar-crown-pub'], ['t_diceleave.js'],
    ['t_chess.js'], ['t_dance.js'], ['t_dance.js', 'In step'], ['t_solodance.js'], ['t_pach.js'], ['t_pach.js', 'Beat the house'],
    ['t_splice.js', 'Race'], ['t_splice.js', 'Four hands'], ['t_cipher.js', 'Race'], ['t_cipher.js', 'Decode'], ['t_typist.js'],
    ['t_typist.js', 'Two operators'], ['t_misc.js'], ['t_travel.js'], ['t_solo.js'], ['t_err.js'], ['t_chat.js'], ['t_chat.js', '390', '760'],
    ['t_chat_dice.js'], ['t_race_ski.js'], ['t_race_climb.js'], ['t_race_sail.js']].map(([f, ...a]) => ['together/' + f, ...a]),
  // the Neon Royale: every casino table opens its Royale Link game; coins through the Bridge; typing a hold'em bet
  royale: [['royale/tables.js'], ['royale/bridge_cab.js'], ['royale/poker_amt.js'], ['royale/poker_amt.js', '390', '760']],
  // weapons: every swing lands and does what it says; a fight, blacking out and waking; a sea fight; what a fight costs in
  // energy and the second wind; the look of a fight (no boxes)
  combat: [
    ['combat/hits.js', SHOTS + '/hits'],
    ['combat/combattest.js', SHOTS + '/combat'],
    ['combat/fight_test.js', SHOTS],
    ['combat/monsters.js', SHOTS],
    ['combat/energy.js'],
    ['combat/look.js', SHOTS + '/look'],
    ['combat/shipviz.js', SHOTS + '/shipviz'],
  ]
};
// what of each test's output is shown: one group of alternatives a line (add a test's own on a new line)
const KEEP = new RegExp([
  /PAGEERR|light under her|out of reach|signed in|a tap on|hide\(\)|office|through the door|roster/,
  /board|orders|accounts|seated|the view|back on the bridge|before:|asleep|woken early|up and about/,
  /slept through|recovery bed|tanks in|the tank:|in the tank|looking:|aboard at|aly visiting|into his save/,
  /left at Midnight|sent to|a passage|after the passage|send screen|orders given|the Ferryman|leaves in the render/,
  /wind |a flock over|a summer night|indoors:|grade|monster:|serpent:|eel:|kraken:|out on the|guns mounted/,
  /portrait|faces|staff page|signed on|owing|desk|tapped|sky |seasons|bakery|stocked|bought in/,
  /chronometer|away|brought in|in the bin|in the ground|world watch|time by|sells|bought|statue/,
  /commissioned|Sovereign|legacy|mix|outlook|effects|storm on|shot |catalogue|hire|payday|venue/,
  /specialist|move|screen|topics|CONSOLE|FAILED|Error|errors?\b|worlds|same|coins|verdict|bar /,
  /status|mate:|settled|beck:|aly:|chat|heard|unread|after|typed|my turn|sunk|crew|things match/,
  /hp|down|up:|roll|chain|energy|boxes/,
  /contract|dispatch|orders away|route lines|treasury/,
  /party:|waits:|called:|aboard his|jump call|landed:|declined:|stayed aboard|sail call|at the pier|sailing:|mine call|left:|alone again/,
  /schedule|in a storm|the gun:|finished|prizes|at the gate|at the foot|gun: beck|racing:/,
].map((r) => r.source).join('|'), 'i');
const BAD = /PAGEERR|CONSOLE-ERR|^CONSOLE (?!log |info |warning |debug )|FAILED|\berrors?:? [1-9]|TypeError|ReferenceError|Cannot read/m;

const up = (url) => { try { execSync('curl -s -o /dev/null -m 2 ' + url, { stdio: 'ignore' }); return true; } catch (e) { return false; } };
const spawned = [];
function ensure(port, script, probe) {
  if (up(probe)) return;
  const p = spawn('python3', [path.join(D, script), String(port)], { stdio: 'ignore', detached: true });
  spawned.push(p);
  for (let i = 0; i < 40 && !up(probe); i++) execSync('sleep 0.25');
  if (!up(probe)) { console.error('could not start ' + script); process.exit(2); }
}

const want = process.argv.slice(2);
const names = want.length ? want : Object.keys(SUITES);
for (const n of names) if (!SUITES[n]) { console.error('no suite "' + n + '" (' + Object.keys(SUITES).join(', ') + ')'); process.exit(2); }
if (names.includes('royale') && !fs.existsSync(path.join(ROOT, 'apps/runouts/dist/index.html'))) {
  console.error('royale needs Royale Link built: cd apps/runouts && npm install && npm run build'); process.exit(2);
}
if (names.includes('together') && !fs.existsSync(path.join(D, 'npm/chess/package'))) execFileSync(path.join(D, 'npm.sh'), { stdio: 'inherit' });

const PORT = +(process.env.BRIDGE_PORT || 8766);                 // another checkout's server (see chrome.js)
ensure(PORT, 'serve.py', 'http://127.0.0.1:' + PORT + '/bridge/');
const SUPA = +(process.env.SUPA_PORT || 8767);                    // a second checkout's Supabase stand-in (see chrome.js)
ensure(SUPA, 'fakesupa.py', 'http://127.0.0.1:' + SUPA + '/');
[SHOTS, ...Object.keys(SUITES).map((s) => path.join(D, s, 'shots')), ...[].concat(...Object.values(SUITES)).flat().filter((a) => a.startsWith(SHOTS + '/'))]
  .forEach((d) => fs.mkdirSync(d, { recursive: true }));
let npmRoot = ''; try { npmRoot = execSync('npm root -g', { encoding: 'utf8' }).trim(); } catch (e) { /* playwright local */ }
const env = Object.assign({}, process.env, { NODE_PATH: [process.env.NODE_PATH, npmRoot].filter(Boolean).join(path.delimiter) });

const results = [];
for (const n of names) {
  console.log('\n######## ' + n);
  for (const [file, ...args] of SUITES[n]) {
    const t0 = Date.now();
    let out = '', ok = true;
    // chrome.js loaded first (-r): a test asks for it in its first chromium.launch(...) call, by when launch has
    // already been looked up, so its BRIDGE_PORT reroute would miss that browser
    try { out = execFileSync('node', ['-r', path.join(D, 'chrome.js'), path.join(D, file), ...args], { env, cwd: D, timeout: 300000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { ok = false; out = (e.stdout || '') + '\nFAILED: ' + String(e.stderr || e.message).split('\n').filter((l) => l.trim() && !/^\s+at /.test(l)).slice(0, 4).join(' | '); }
    if (BAD.test(out)) ok = false;
    const label = [file, ...args.filter((a) => !a.startsWith('/'))].join(' ');
    results.push([label, ok]);
    console.log((ok ? 'PASS ' : 'FAIL ') + label + '  (' + Math.round((Date.now() - t0) / 1000) + 's)');
    out.split('\n').filter((l) => KEEP.test(l) && !/^\s+at /.test(l)).slice(0, 14).forEach((l) => console.log('     ' + l.slice(0, 200)));
  }
}
spawned.forEach((p) => { try { process.kill(-p.pid); } catch (e) { /* gone */ } });
const bad = results.filter((r) => !r[1]);
console.log('\n' + (results.length - bad.length) + '/' + results.length + ' passed' + (bad.length ? ' · failed: ' + bad.map((r) => r[0]).join(', ') : ''));
console.log('screenshots: tools/tests/shots and tools/tests/<suite>/shots');
process.exit(bad.length ? 1 : 0);
