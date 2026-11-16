// The chess Review & Coach tab (apps/chess/review): a game in from chess.com, lichess, a paste and Wizard Chess;
// Stockfish reviewing it (the real engine, in the page); stepping through, side lines, a position set up by hand;
// the coach asked by typing, by the Why? button and by voice, with its tool calls run on the page's Stockfish.
// chess.com, lichess, the coach's API, the microphone and the voice are stand-ins (a test container has none of them).
//   node tools/tests/chess/review.js [shots dir]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const NPM = path.join(__dirname, '..', 'npm');                 // tools/tests/npm.sh fetches these
const SHOTS = process.argv[2] || path.join(__dirname, 'shots');
const URL0 = 'http://127.0.0.1:8766';
fs.mkdirSync(SHOTS, { recursive: true });

let failed = 0;
const check = (name, ok, more = '') => { if (!ok) failed++; console.log((ok ? 'ok   ' : 'FAILED ') + name + (more ? '  — ' + more : '')); };

const OPERA = '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
// as chess.com writes a game: headers, a clock after every move
const clocked = (moves) => moves.replace(/(\d+)\. (\S+) (\S+)/g, '$1. $2 {[%clk 0:09:5$1]} $1... $3 {[%clk 0:09:4$1]}');
const ccGame = (n, white, black, wres, bres, moves, extra = {}) => ({
  url: 'https://www.chess.com/game/live/' + n, uuid: 'uuid-' + n, time_class: 'rapid', rules: 'chess', end_time: 1794300000 + n * 3600,
  white: { username: white, rating: 1210 + n, result: wres }, black: { username: black, rating: 1195, result: bres },
  pgn: `[Event "Live Chess"]\n[Site "Chess.com"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${wres === 'win' ? '1-0' : bres === 'win' ? '0-1' : '1/2-1/2'}"]\n[ECOUrl "https://www.chess.com/openings/Philidor-Defense-3.d4-Bg4"]\n[WhiteElo "${1210 + n}"]\n[BlackElo "1195"]\n\n${clocked(moves)}`,
  ...extra,
});
const MONTHS = {
  '2026/10': [ccGame(1, 'rival_one', 'BeckP', 'win', 'resigned', '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0')],
  '2026/11': [
    ccGame(2, 'BeckP', 'duke_karl', 'win', 'checkmated', OPERA),
    ccGame(3, 'drawish', 'BeckP', 'agreed', 'agreed', '1. d4 d5 2. c4 e6 1/2-1/2'),
    ccGame(4, 'BeckP', 'shuffler', 'win', 'resigned', '1. e4 e5 1-0', { rules: 'chess960' }),
  ],
};
const LICHESS = [
  { id: 'abcd1234', rated: true, variant: 'standard', speed: 'blitz', createdAt: 1794400000000, lastMoveAt: 1794400400000, status: 'mate', winner: 'white',
    players: { white: { user: { name: 'BeckP', id: 'beckp' }, rating: 1500 }, black: { user: { name: 'lichess_rival', id: 'lichess_rival' }, rating: 1480 } },
    opening: { eco: 'C41', name: 'Philidor Defense', ply: 4 }, pgn: `[Event "Rated Blitz game"]\n[White "BeckP"]\n[Black "lichess_rival"]\n[Result "1-0"]\n\n${OPERA}` },
  { id: 'efgh5678', rated: false, variant: 'standard', speed: 'rapid', createdAt: 1794300000000, lastMoveAt: 1794300400000, status: 'resign', winner: 'white',
    players: { white: { aiLevel: 3 }, black: { user: { name: 'BeckP', id: 'beckp' }, rating: 1500 } }, pgn: '[Event "Casual"]\n[White "?"]\n[Black "BeckP"]\n[Result "1-0"]\n\n1. e4 e5 2. Qh5 Ke7 3. Qxe5# 1-0' },
];

(async () => {
  const browser = await chromium.launch({ executablePath: require(path.join(__dirname, '..', 'chrome.js')), args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const errs = [];
  const posts = [];                // every conversation the page sent up to the coach
  let coachMode = 'ok';

  async function context(opts) {
    const ctx = await browser.newContext(opts);
    const js = (body) => ({ status: 200, contentType: 'application/javascript', body });
    const json = (obj, status = 200) => ({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(obj) });
    await ctx.route(/cdn\.jsdelivr\.net\/npm\/chess\.js@1\.0\.0-beta\.6\/\+esm/, (r) => r.fulfill(js(fs.readFileSync(NPM + '/chess/package/dist/esm/chess.js'))));
    await ctx.route(/esm\.sh\/three@0\.160\.0(\/.*)?$/, (r) => {
      const rest = new URL(r.request().url()).pathname.replace(/^\/three@0\.160\.0/, '');
      const file = rest ? NPM + '/three/package' + rest : NPM + '/three/package/build/three.module.js';
      if (!fs.existsSync(file)) return r.fulfill({ status: 404, body: '' });
      return r.fulfill(js(fs.readFileSync(file, 'utf8').replace(/from ['"]three['"]/g, "from 'https://esm.sh/three@0.160.0'")));
    });
    await ctx.route(/cdn\.jsdelivr\.net\/npm\/cm-chessboard@8\.7\.6\/(.*)$/, (r) => {
      const file = NPM + '/cmcb/package' + new URL(r.request().url()).pathname.replace(/^\/npm\/cm-chessboard@8\.7\.6/, '');
      if (!fs.existsSync(file)) return r.fulfill({ status: 404, body: '' });
      return r.fulfill({ status: 200, contentType: /\.svg$/.test(file) ? 'image/svg+xml' : /\.css$/.test(file) ? 'text/css' : 'application/javascript', body: fs.readFileSync(file) });
    });
    // the 3D game's own engine comes from a CDN (it falls back to its built-in one); fonts and the like aren't needed
    await ctx.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net\/npm\/stockfish|fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net\/npm\/@supabase/, (r) => r.abort());

    await ctx.route(/api\.chess\.com\/pub\/player\/([^/]+)\/games\/archives$/, (r) => {
      const user = r.request().url().match(/player\/([^/]+)\//)[1];
      if (user !== 'beckp') return r.fulfill(json({ code: 0, message: 'User "' + user + '" not found.' }, 404));
      return r.fulfill(json({ archives: Object.keys(MONTHS).map((m) => `https://api.chess.com/pub/player/beckp/games/${m}`) }));
    });
    await ctx.route(/api\.chess\.com\/pub\/player\/beckp\/games\/(\d{4}\/\d{2})$/, (r) => r.fulfill(json({ games: MONTHS[r.request().url().match(/games\/(\d{4}\/\d{2})$/)[1]] || [] })));
    await ctx.route(/lichess\.org\/api\/games\/user\//, (r) => {
      const u = new URL(r.request().url());
      if (!/beckp$/i.test(u.pathname)) return r.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*' }, body: '' });
      const rows = u.searchParams.get('until') ? [] : LICHESS;
      return r.fulfill({ status: 200, contentType: 'application/x-ndjson', headers: { 'access-control-allow-origin': '*' }, body: rows.map((g) => JSON.stringify(g)).join('\n') + '\n' });
    });

    // the coach: says what a real one would, in shape — a tool call when asked about a move or a threat, then an
    // answer built from what the page's Stockfish sent back
    await ctx.route(/\/api\/chess-coach/, async (r) => {
      const req = r.request();
      if (req.method() === 'GET') return r.fulfill(json({ enabled: true, env: 'test' }));
      if (coachMode === 'busy') return r.fulfill(json({ error: 'busy' }, 429));
      const body = JSON.parse(req.postData());
      posts.push(body);
      const last = body.messages[body.messages.length - 1];
      const thinking = { type: 'thinking', thinking: '', signature: 'sig-' + posts.length };
      const say = (text) => text.match(/\S+\s*/g).map((d) => ({ t: 'text', d }));
      let events;
      const asked = typeof last.content === 'string';
      const q = asked ? last.content.split('</board>').pop() : '';
      const ahead = asked ? (last.content.match(/Stockfish was asked ahead[\s\S]*?(?=\n<\/board>)/) || [''])[0] : '';
      const lines = (t) => t.split('\n').filter((l) => /^- |^1\. \(|is in check/.test(l)).slice(0, 2).join(' ');
      if (!asked) {                                                // the results of its tool calls: answer from them
        const text = 'Stockfish says: ' + lines(last.content.map((c) => c.content).join('\n'));
        events = [...say(text), { t: 'done', stop: 'end_turn', content: [thinking, { type: 'text', text }] }];
      } else if (ahead) {                                          // the page checked ahead: no tool call needed
        const text = 'Stockfish says: ' + lines(ahead);
        events = [...say(text), { t: 'done', stop: 'end_turn', content: [thinking, { type: 'text', text }] }];
      } else if (/check the bishop/i.test(q) && !body.final) {
        events = [{ t: 'done', stop: 'tool_use', content: [thinking, { type: 'tool_use', id: 'toolu_' + posts.length, name: 'Evaluate_Moves', input: { candidates: ['Bxf6', 'Zz9'] } }] }];      // (a near-miss on the name and the key, as a model sometimes writes them)
      } else if (/dig into/i.test(q) && !body.final) {
        events = [{ t: 'done', stop: 'tool_use', content: [thinking, { type: 'tool_use', id: 'toolu_' + posts.length, name: 'find_threats', input: {} }, { type: 'tool_use', id: 'toolu_b' + posts.length, name: 'analyze_line', input: { moves: ['Qc7'], lines: 2, start: 'before_last_move' } }] }];
      } else if (/what was better/i.test(q)) {
        const text = 'Better was 9...Qc7, keeping the pawn on e5 safe.';
        events = [...say(text), { t: 'done', stop: 'end_turn', content: [thinking, { type: 'text', text }] }];
      } else {
        const text = 'The key move is **10. Nxb5**. After 10. Nxb5 cxb5 11. Bxb5+ White wins material, about +4.4.\n\nLook for loose pieces next time.';
        events = [...say(text), { t: 'done', stop: 'end_turn', content: [thinking, { type: 'text', text }] }];
      }
      if (coachMode === 'slow') await new Promise((ok) => setTimeout(ok, 4000));
      return r.fulfill({ status: 200, contentType: 'text/event-stream', body: events.map((e) => 'data: ' + JSON.stringify(e) + '\n\n').join('') }).catch(() => {});   // (the page may have stopped waiting)
    });

    // a microphone that hears what the test tells it to, and a voice that writes down what it's given to say
    await ctx.addInitScript(() => {
      window.__spoken = [];
      window.__recStarts = 0;
      class FakeRec {
        start() { window.__rec = this; window.__recStarts++; }
        stop() { if (this.onend) this.onend(); }
        abort() { if (this.onend) this.onend(); }
      }
      window.SpeechRecognition = FakeRec;
      window.webkitSpeechRecognition = FakeRec;
      window.__hear = (text) => {
        const r = window.__rec;
        window.__rec = null;
        if (text) r.onresult({ results: [Object.assign([{ transcript: text }], { isFinal: true })] });
        r.onend();
      };
      const synth = { speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 5); }, cancel() {}, getVoices() { return []; }, addEventListener() {} };
      Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    });
    return ctx;
  }

  const watch = (p, who) => {
    p.on('pageerror', (e) => { errs.push(who + ': ' + e.message); console.log('PAGEERR', who, e.message); });
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::|ERR_/.test(m.text())) { errs.push(who + ': ' + m.text()); console.log('CONSOLE-ERR', who, m.text().slice(0, 300)); } });
  };
  const ready = (p) => p.waitForFunction(() => window.__chessReview && window.__chessReview.S.game, null, { timeout: 30000 });
  const reviewed = (p) => p.waitForFunction(() => window.__chessReview.S.game.reviewed, null, { timeout: 120000 });
  // Stockfish has looked at the position on the board to some depth, and its lines are on the page
  const live = (p, depth = 10) => p.waitForFunction((d) => {
    const S = window.__chessReview.S, box = document.getElementById('rv-lines');
    return S.live && S.live.depth >= d && S.live.lines.length >= 2 && !box.classList.contains('is-stale') && box.querySelectorAll('.rv-line-eval').length >= 2
      && box.querySelector('.rv-line').dataset.first === S.live.lines[0].pv[0];
  }, depth, { timeout: 30000 });
  const answered = (p, n) => p.waitForFunction((k) => document.querySelectorAll('#rv-chat .rv-msg-coach:not(.is-waiting), #rv-chat .rv-msg-error').length >= k && !window.__chessReview.coach().busy, n, { timeout: 60000 });
  const bubbles = (p) => p.evaluate(() => document.querySelectorAll('#rv-chat .rv-msg-coach:not(.is-waiting), #rv-chat .rv-msg-error').length);
  // type a question (or pass a function that asks it another way) and wait for its answer
  const ask = async (p, q, how = 'enter') => {
    const n = await bubbles(p);
    if (typeof q === 'function') await q();
    else { await p.fill('#rv-question', q); if (how === 'enter') await p.press('#rv-question', 'Enter'); else await p.click('#rv-send'); }
    await answered(p, n + 1);
  };
  const lastAnswer = (p) => p.evaluate(() => { const all = document.querySelectorAll('#rv-chat .rv-msg-coach'); const e = all[all.length - 1]; return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; });
  const unfold = async (p) => { if (await p.evaluate(() => document.getElementById('rv-games').classList.contains('is-folded'))) await p.click('#rv-games-toggle'); };
  const text = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
  const state = (p) => p.evaluate(() => { const S = window.__chessReview.S; return { ply: S.ply, side: S.side.map((m) => m.san), n: S.game.moves.length, id: S.game.id, flipped: S.flipped }; });

  // ================= desktop =================
  const ctx = await context({ viewport: { width: 1500, height: 950 } });
  const p = await ctx.newPage();
  watch(p, 'desk');
  await p.goto(URL0 + '/chess?tab=review');
  await ready(p);
  check('opens on the review tab, with an empty analysis board', await p.evaluate(() => !document.getElementById('view-review').hidden && document.getElementById('view-wizard').hidden) && (await state(p)).n === 0);
  await live(p);
  const l0 = await p.evaluate(() => ({ depth: window.__chessReview.S.live.depth, lines: [...document.querySelectorAll('#rv-lines .rv-line')].map((l) => l.innerText.replace(/\s+/g, ' ')) }));
  console.log('review: engine on the start position — depth', l0.depth, '|', l0.lines.join(' | ').slice(0, 160));
  check('Stockfish gives three lines for the position on the board', l0.lines.length === 3 && /^[+-]?\d/.test(l0.lines[0]));

  // --- chess.com
  await p.fill('#rv-user', 'nobody_here');
  await p.click('#rv-user-go');
  await p.waitForFunction(() => /no player/.test(document.getElementById('rv-list-note').textContent), null, { timeout: 10000 });
  check('an unknown chess.com name says so', /no player called "nobody_here"/.test(await text(p, '#rv-list-note')));
  await p.fill('#rv-user', 'BeckP');
  await p.click('#rv-user-go');
  await p.waitForSelector('#rv-game-list .rv-game', { timeout: 10000 });
  let rows = await p.$$eval('#rv-game-list .rv-game', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim() + ' [' + e.querySelector('.rv-res').className.replace('rv-res rv-res-', '') + ']'));
  console.log('review: chess.com list —', rows.join(' || '));
  check("chess.com's standard games are listed newest first with how they went, the month before read too when this one is thin", rows.length === 3 && /drawish/.test(rows[0]) && /\[draw\]/.test(rows[0]) && /duke_karl/.test(rows[1]) && /\[win\]/.test(rows[1]) && /Philidor Defense/.test(rows[1]) && /rival_one/.test(rows[2]) && /\[loss\]/.test(rows[2]) && await p.evaluate(() => document.getElementById('rv-more').hidden), rows.length + ' rows');
  check('the name goes into the address, for a bookmark to carry', /[?&]cc=BeckP/.test(await p.evaluate(() => location.search)) && /tab=review/.test(await p.evaluate(() => location.search)), await p.evaluate(() => location.search));

  // --- a game opened and reviewed
  await p.click('#rv-game-list .rv-game:nth-child(2)');
  const t0 = Date.now();
  await reviewed(p);
  const g = await p.evaluate(() => { const g = window.__chessReview.S.game; return { n: g.moves.length, me: g.me, acc: g.accuracy, marks: g.judged.map((j, i) => (j ? g.moves[i - 1].san + ':' + j.mark : '')).filter(Boolean), clk: g.moves.some((m) => /clk/.test(m.san)) }; });
  console.log('review: reviewed in', Date.now() - t0, 'ms — accuracy', JSON.stringify(g.acc), '|', g.marks.filter((m) => /inacc|mistake|blunder/.test(m)).join(' '));
  check('the game is read through its clock comments: 33 moves, you as White', g.n === 33 && g.me === 'w' && !g.clk);
  check("the review marks Black's ...b5 as an error and the winner as the more accurate", /b5:(mistake|blunder|inaccuracy)/.test(g.marks.join(' ')) && g.acc.w > g.acc.b && g.acc.w > 80, JSON.stringify(g.acc));
  check('the accuracy boxes and the graph show', /BeckP \d+\.\d% .*duke_karl \d+\.\d%/.test(await text(p, '#rv-acc')) && await p.evaluate(() => !document.getElementById('rv-graph').hidden && document.getElementById('rv-progress').hidden));
  const folded = await p.evaluate(() => ({ folded: document.getElementById('rv-games').classList.contains('is-folded'), list: document.getElementById('rv-game-list').offsetParent !== null, now: document.getElementById('rv-games-now').textContent }));
  check('on a wide screen the picker stays open beside the game, under a heading that says whose games they are', !folded.folded && folded.list && folded.now === 'chess.com · BeckP', JSON.stringify(folded));
  const col = await p.evaluate(() => { const r = (sel) => document.querySelector(sel).getBoundingClientRect(); return { left: Math.round(r('.rv-left').bottom), moves: Math.round(r('#rv-moves').height), list: Math.round(r('#rv-game-list').height), h: innerHeight, scroll: document.documentElement.scrollHeight > innerHeight + 1 || document.body.scrollHeight > document.body.clientHeight + 1 }; });
  check('the games and the moves share the left column, all of it on screen, and the page has nothing to scroll', col.left <= col.h && col.moves >= 120 && col.list >= 140 && !col.scroll, JSON.stringify(col));
  const title = await text(p, '#rv-game-title');
  check('the title says who, the result and the opening', /BeckP vs duke_karl/.test(title) && /1-0/.test(title) && /Philidor Defense/.test(title), title);

  // --- stepping through
  await p.click('#rv-moves .rv-mv[data-ply="18"]');
  await live(p);
  const verdict = await text(p, '#rv-verdict');
  console.log('review: verdict —', verdict);
  check('a move in the list jumps there; the verdict names the error and what Stockfish wanted', (await state(p)).ply === 18 && /9\.\.\.b5\?+ — (a mistake|a blunder|an inaccuracy)/.test(verdict) && /Stockfish wanted/.test(verdict) && /Why\?/.test(verdict));
  const marks = await p.evaluate(() => ({ arrows: [...document.querySelectorAll('#rv-overlay .rv-arrow')].map((a) => a.getAttribute('class')), badge: (document.querySelector('#rv-overlay .rv-badge text') || {}).textContent, last: document.querySelectorAll('#rv-board .marker-square').length }));
  check('the board shows the best move now, the better move instead, the mark and the last move', marks.arrows.join().includes('best') && marks.arrows.join().includes('better') && /\?/.test(marks.badge || '') && marks.last === 2, JSON.stringify(marks));
  await p.screenshot({ path: SHOTS + '/review_game.png' });
  await p.keyboard.press('ArrowLeft');
  await p.keyboard.press('ArrowLeft');
  check('the arrow keys step back', (await state(p)).ply === 16);
  await p.keyboard.press('End');
  check('End goes to the last move, and the engine panel says mate', (await state(p)).ply === 33 && /Checkmate — White wins/.test(await text(p, '#rv-lines')));
  await p.click('#rv-flip');
  check('Flip turns the board round', (await state(p)).flipped === true && await p.evaluate(() => /duke_karl/.test(document.getElementById('rv-player-bottom').textContent)));
  await p.click('#rv-flip');
  await p.click('#rv-flip');
  await p.click('#rv-flip');                                  // (flipped back, and twice more faster than the board turns)
  await p.waitForTimeout(600);
  const a1 = await p.evaluate(() => { const b = document.getElementById('rv-board').getBoundingClientRect(), q = document.querySelector('#rv-board .board [data-square="a1"]').getBoundingClientRect(); return { left: q.left - b.left < 5, bottom: b.bottom - q.bottom < 5, flipped: window.__chessReview.S.flipped }; });
  check('however fast Flip is clicked, the board ends up the way the page thinks it is', a1.flipped === false && a1.left && a1.bottom, JSON.stringify(a1));

  // --- a side line: an engine line clicked, then a piece moved by hand
  await p.click('#rv-moves .rv-mv[data-ply="17"]');
  await live(p);
  const lineMoves = await p.$$eval('#rv-lines .rv-line:first-child .rv-line-move', (els) => els.map((e) => e.textContent));
  // (read and clicked in one go: the engine is still thinking, and its lines can change between two looks)
  const second = await p.evaluate(() => { const els = [...document.querySelectorAll('#rv-lines .rv-line:nth-child(2) .rv-line-move')]; els[2].click(); return els.map((e) => e.textContent); });
  let st = await state(p);
  console.log('review: best line', lineMoves.join(' '), '| side line now', st.side.join(' '));
  check("clicking the third move of Stockfish's second line plays those three as a side line", st.ply === 17 && st.side.join() === second.slice(0, 3).join() && /side line/i.test(await text(p, '#rv-sideline')) && await p.evaluate(() => !document.getElementById('rv-back').hidden), second.join(' '));
  await p.click('#rv-back');
  st = await state(p);
  check('Back to the game leaves it', st.side.length === 0 && st.ply === 17);
  await p.click('#rv-first');
  await p.waitForTimeout(300);
  const sq = async (s) => { const b = await p.locator(`#rv-board .board [data-square="${s}"]`).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const drag = async (a, z) => { const [x1, y1] = await sq(a), [x2, y2] = await sq(z); await p.mouse.move(x1, y1); await p.mouse.down(); await p.mouse.move((x1 + x2) / 2, (y1 + y2) / 2, { steps: 4 }); await p.mouse.move(x2, y2, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(250); };
  await drag('e2', 'e4');
  st = await state(p);
  check("dragging the game's own next move steps along the game", st.ply === 1 && st.side.length === 0, JSON.stringify(st));
  await drag('d7', 'd5');
  st = await state(p);
  check('dragging a different move starts a side line', st.ply === 1 && st.side.join() === 'd5', JSON.stringify(st));
  await drag('e4', 'e6');
  check("a move that isn't legal is refused", (await state(p)).side.join() === 'd5');
  await p.click('#rv-back');

  // --- the coach: the suggestions, the Why? button, moves in an answer, checks made ahead, tool calls, an error, Stop
  await p.click('#rv-moves .rv-mv[data-ply="18"]');
  await live(p, 12);
  const chips = await p.evaluate(() => { const c = [...document.querySelectorAll('#rv-chips .rv-chip')], box = document.getElementById('rv-coach').getBoundingClientRect(); return { labels: c.map((e) => e.textContent), tops: [...new Set(c.map((e) => Math.round(e.getBoundingClientRect().top)))].length, inside: c[0].getBoundingClientRect().top > box.top && c[0].getBoundingClientRect().bottom < box.bottom, q: c[1].dataset.q }; });
  check('the suggestions are short, in one row, inside the coach\'s panel', chips.labels.join('|') === 'Why 9...b5?|Best move?|Threats?|Plans?|Takeaways' && chips.tops === 1 && chips.inside && chips.q === "What's the best move here, and why?", JSON.stringify(chips));
  await ask(p, () => p.click('#rv-why'));
  const first = posts[0].messages[0].content;
  console.log('review: the question as sent —', first.split('</board>').pop().trim());
  check('Why? asks about the move, by name', /Why is 9\.\.\.b5 (a mistake|a blunder|an inaccuracy), and why is \S+ better\?/.test(first));
  check('the question carries the whole game with its evaluations', /The game: BeckP \(1212\) as White against duke_karl/.test(first) && /The player asking is BeckP, who had White/.test(first) && /9\. Bg5 \([+-]?\d/.test(first) && /b5\?+ \(/.test(first) && /Accuracy: White/.test(first));
  check('…and the position: where it is, the FEN, every piece, the loose ones', /the game after 9\.\.\.b5\. White to move/.test(first) && /FEN: rn2kb1r\/p3qppp\/2p2n2\/1p2p1B1\/2B1P3\/1QN5\/PPP2PPP\/R3K2R w KQkq/.test(first) && /White: Ke1 Qb3 Ra1 Rh1 Bc4 Bg5 Nc3, pawns a2 b2 c2 e4 f2 g2 h2/.test(first) && /Pieces under fire: /.test(first) && /Black's pawn on b5 is attacked/.test(first));
  check("…and Stockfish's lines for it, in notation", /Stockfish 19, depth \d+ - best lines for White here/.test(first) && /1\. \([+-]?[\d.M]+\) 10\. \S+/.test(first) && /In the game, White now played 10\. Nxb5/.test(first), first.split('\n').filter((l) => /^1\. \(/.test(l)).join(''));
  check('…with nothing checked ahead: the better move it names already has its line there', !/asked ahead/.test(first) && /Stockfish preferred 9\.\.\.(\S+), continuing 9\.\.\.\1 10\. /.test(first) && posts.length === 1);
  const ans = await lastAnswer(p);
  const made = await p.evaluate(() => { const all = document.querySelectorAll('#rv-chat .rv-msg-coach'), e = all[all.length - 1]; return { strong: Boolean(e.querySelector('strong')), moves: [...e.querySelectorAll('.rv-san')].map((b) => b.textContent), took: (e.querySelector('.rv-took') || {}).textContent, why: (e.querySelector('.rv-took') || {}).title }; });
  check('the answer arrives formatted, its moves as links, with how long it took under it', /The key move is 10\. Nxb5\./.test(ans) && made.strong && made.moves.join() === 'Nxb5,Nxb5,cxb5,Bxb5+' && /^\d+(\.\d)? s$/.test(made.took) && /First words after/.test(made.why), JSON.stringify(made));
  await p.evaluate(() => { const all = document.querySelectorAll('#rv-chat .rv-msg-coach'); all[all.length - 1].querySelectorAll('.rv-san')[3].click(); });
  st = await state(p);
  check('a move clicked in the answer is played out on the board with the moves before it in its line', st.ply === 21 && st.side.length === 0, JSON.stringify(st));

  await p.click('#rv-moves .rv-mv[data-ply="18"]');
  await live(p, 12);
  await ask(p, 'what was better?');
  made.moves = await p.evaluate(() => { const all = document.querySelectorAll('#rv-chat .rv-msg-coach'); return [...all[all.length - 1].querySelectorAll('.rv-san')].map((b) => b.textContent); });
  await p.evaluate(() => { const all = document.querySelectorAll('#rv-chat .rv-msg-coach'); all[all.length - 1].querySelector('.rv-san').click(); });
  st = await state(p);
  check('"Better was 9...Qc7" plays from the position before the move; a square that is only mentioned is no link', made.moves.join() === 'Qc7' && st.ply === 17 && st.side.join() === 'Qc7', JSON.stringify(made.moves) + JSON.stringify(st));

  await p.click('#rv-moves .rv-mv[data-ply="18"]');
  await live(p, 12);
  let n = posts.length;
  await ask(p, 'why not Bxf6?');
  let sentQ = posts[n].messages.slice(-1)[0].content;
  console.log('review: checked ahead —', (sentQ.match(/Stockfish was asked ahead[\s\S]*?(?=\n<\/board>)/) || [''])[0].replace(/\n/g, ' / ').slice(0, 300));
  check('a move named in the question is checked on the page\'s Stockfish before the coach is asked', /Stockfish was asked ahead/.test(sentQ) && /In the position on the board \(White to move\), Stockfish's best move is 10\. \S+ \([+-]?[\d.M]+\)/.test(sentQ) && /- 10\. Bxf6: [+-]?[\d.M]+(, [\d.]+ worse than the best move|, about as good as the best move)?\. Then: 10\.\.\.\S+/.test(sentQ));
  const took = await p.evaluate(() => { const all = document.querySelectorAll('#rv-chat .rv-msg-coach'); return all[all.length - 1].querySelector('.rv-took').title; });
  check('…so the answer takes one trip, and says so', posts.length === n + 1 && /Stockfish says: - 10\. Bxf6:/.test(await lastAnswer(p)) && /1 Stockfish check made before asking/.test(took) && !/trip/.test(took), took);
  n = posts.length;
  await ask(p, 'why not Nbd7 instead?');
  sentQ = posts[n].messages.slice(-1)[0].content;
  console.log('review: instead —', (sentQ.match(/Stockfish was asked ahead[\s\S]*?(?=\n<\/board>)/) || [''])[0].replace(/\n/g, ' / ').slice(0, 260));
  check('a move that could have been played instead of the last one is checked from the position before it', /In the position before 9\.\.\.b5 \(Black to move\), Stockfish's best move is 9\.\.\.\S+/.test(sentQ) && /- 9\.\.\.Nbd7: [+-]?[\d.M]+/.test(sentQ) && posts.length === n + 1);
  n = posts.length;
  await ask(p, 'what is he threatening here?', 'button');
  sentQ = posts[n].messages.slice(-1)[0].content;
  check('a question about threats has the threat looked up ahead', /If Black could move again at once in the position on the board \(White doing nothing\)/.test(sentQ) && /With White to move as normal the evaluation is/.test(sentQ) && posts.length === n + 1);

  n = posts.length;
  await ask(p, 'check the bishop capture for me');
  const tool = posts[posts.length - 1].messages;
  const result = tool[tool.length - 1].content;
  console.log('review: the tool result —', JSON.stringify(result[0].content).slice(0, 330));
  check('a tool call from the coach is run on the page\'s Stockfish and its result sent back', posts.length === n + 2 && !/asked ahead/.test(posts[n].messages.slice(-1)[0].content) && Array.isArray(result) && result[0].type === 'tool_result' && /^toolu_/.test(result[0].tool_use_id) && /Stockfish's best move is 10\. \S+ \([+-]?[\d.M]+\)/.test(result[0].content) && /- 10\. Bxf6: [+-]?[\d.M]+/.test(result[0].content));
  check('…even when the coach gets the tool\'s name or a key slightly wrong', /- 10\. Bxf6: /.test(result[0].content) && !result[0].is_error);
  check('an illegal move in a tool call is answered as such, not run', /- Zz9: not a legal move here\. Legal moves like it: /.test(result[0].content));
  check('the answer uses what Stockfish found, and counts the trip', /Stockfish says: - 10\. Bxf6:/.test(await lastAnswer(p)) && /1 trip back for more checks/.test(await p.evaluate(() => { const all = document.querySelectorAll('#rv-chat .rv-msg-coach'); return all[all.length - 1].querySelector('.rv-took').title; })));
  await ask(p, 'dig into the main line');
  const pair = posts[posts.length - 1].messages.slice(-1)[0].content;
  console.log('review: two tools —', JSON.stringify(pair[1].content).slice(0, 200));
  check('two tool calls in one reply get two results in one message', pair.length === 2 && /If Black could move again at once/.test(pair[0].content));
  check('analyze_line can start from the position before the last move, and describes the board after its moves', /^After 9\.\.\.Qc7 from the position before 9\.\.\.b5:/.test(pair[1].content) && /Black: Ke8 Qc7 Ra8 Rh8 Bf8 Nb8 Nf6, pawns/.test(pair[1].content) && /best lines for White here/.test(pair[1].content) && (pair[1].content.match(/^\d\. \(/gm) || []).length === 2, pair[1].content.slice(0, 120));
  const sent = posts.map((b) => JSON.stringify(b.messages));
  check('the conversation only ever grows: each request starts with the one before it', sent.every((x, i) => i === 0 || x.startsWith(sent[i - 1].slice(0, -1))));
  const whole = posts[posts.length - 1].messages;
  check('each reply goes back as it came (thinking block and all)', whole[1].content[0].type === 'thinking' && whole[1].content[0].signature === 'sig-1' && whole.some((m) => Array.isArray(m.content) && m.content.some((b) => b.type === 'tool_use')));
  check('a later question sends the position again but not the game', !/The game: BeckP/.test(whole[2].content) && /FEN: /.test(whole[2].content));

  coachMode = 'busy';
  const before = posts.length, held = posts[posts.length - 1].messages.length + 1;
  await p.fill('#rv-question', 'and now?');
  await p.click('#rv-send');
  await p.waitForSelector('#rv-chat .rv-msg-error', { timeout: 20000 });
  check('a busy coach says so', /busy right now/.test(await text(p, '#rv-chat .rv-msg-error')));
  coachMode = 'slow';
  await p.fill('#rv-question', 'tell me a long story');
  await p.press('#rv-question', 'Enter');
  await p.waitForFunction(() => document.getElementById('rv-send').textContent === 'Stop', null, { timeout: 10000 });
  const mid = await p.evaluate(() => document.querySelectorAll('#rv-chat .rv-msg-you').length);
  await p.click('#rv-send');
  await p.waitForFunction(() => document.getElementById('rv-send').textContent === 'Ask' && !window.__chessReview.coach().busy, null, { timeout: 10000 });
  const stopped = await p.evaluate(() => ({ you: document.querySelectorAll('#rv-chat .rv-msg-you').length, waiting: document.querySelectorAll('#rv-chat .is-waiting').length, box: document.getElementById('rv-question').value }));
  check('Ask is Stop while an answer is coming: stopping takes the question back into the box', stopped.you === mid - 1 && stopped.waiting === 0 && stopped.box === 'tell me a long story', JSON.stringify(stopped));
  coachMode = 'ok';
  await p.waitForTimeout(4200);                               // (let the slow reply nobody is waiting for go by)
  const m0 = posts.length;
  await ask(p, 'ok, the best move?', 'button');
  const after = posts[posts.length - 1].messages;
  check('…and neither the failed question nor the stopped one leaves a trace in the conversation', posts.length === m0 + 1 && m0 >= before && !/and now\?|long story/.test(JSON.stringify(after)) && after.length === held + 1, JSON.stringify({ posts: posts.length, m0, before, messages: after.length, held, trace: (JSON.stringify(after).match(/and now\?|long story/) || [''])[0] }));

  // --- by voice
  await p.click('#rv-mic');
  check('the microphone button starts listening', await p.evaluate(() => window.__recStarts === 1 && document.getElementById('rv-mic').classList.contains('is-on')));
  n = posts.length;
  await ask(p, () => p.evaluate(() => window.__hear('what about night takes B5')));
  const voiced = posts[n].messages.slice(-1)[0].content.split('</board>').pop().trim();
  const spoken = await p.evaluate(() => window.__spoken.join(' | '));
  console.log('review: heard as —', voiced, '| spoken —', spoken.slice(0, 200));
  check('what was heard is tidied into chess and marked as asked by voice', voiced === '[asked by voice] what about knight takes b5');
  check('a move said in words is checked ahead too', /- 10\. Nxb5: this is the engine's best move/.test(posts[n].messages.slice(-1)[0].content) && posts.length === n + 1);
  check('the answer is read aloud, moves as words', /Stockfish says/.test(spoken) && /knight takes b5/.test(spoken) && !/Nxb5/.test(spoken), spoken);
  await p.click('#rv-voice-mode');
  check('voice mode listens straight away', await p.evaluate(() => window.__recStarts === 2 && document.getElementById('rv-voice-mode').classList.contains('active')));
  await ask(p, () => p.evaluate(() => window.__hear('what is the best move')));
  await p.waitForFunction(() => window.__recStarts === 3, null, { timeout: 10000 });
  check('…and listens again once the answer has been spoken', true);
  await p.evaluate(() => window.__hear(''));
  await p.evaluate(() => window.__hear(''));
  await p.evaluate(() => window.__hear(''));
  check('three silences and voice mode rests', await p.evaluate(() => !document.getElementById('rv-voice-mode').classList.contains('active')) && /Voice mode is resting/.test(await text(p, '#rv-chat')));
  const fit = await p.evaluate(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(); return { ask: Math.round(r('rv-ask').bottom), chips: Math.round(r('rv-chips').bottom), coach: Math.round(r('rv-coach').bottom), h: innerHeight, y: Math.round(scrollY || document.body.scrollTop), chat: Math.round(r('rv-chat').height) }; });
  check("the coach's box is on screen without scrolling the page, inside its panel, under a tall conversation", fit.ask <= fit.coach && fit.coach <= fit.h && fit.y === 0 && fit.chat > 400, JSON.stringify(fit));
  await p.screenshot({ path: SHOTS + '/review_coach.png' });

  // --- lichess
  await unfold(p);
  await p.click('.rv-source[data-source="lichess"]');
  await p.fill('#rv-user', 'BeckP');
  await p.click('#rv-user-go');
  await p.waitForSelector('#rv-game-list .rv-game', { timeout: 10000 });
  rows = await p.$$eval('#rv-game-list .rv-game', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim() + ' [' + e.querySelector('.rv-res').className.replace('rv-res rv-res-', '') + ']'));
  console.log('review: lichess list —', rows.join(' || '));
  check('lichess lists the games: a win as White, a loss to its computer', rows.length === 2 && /lichess_rival/.test(rows[0]) && /\[win\]/.test(rows[0]) && /Philidor Defense/.test(rows[0]) && /Stockfish level 3/.test(rows[1]) && /\[loss\]/.test(rows[1]));
  await p.click('#rv-game-list .rv-game:nth-child(2)');
  await reviewed(p);
  st = await state(p);
  check('a game as Black opens from Black\'s side', st.n === 5 && st.flipped === true && st.id === 'li:efgh5678', JSON.stringify(st));
  const n0 = posts.length;
  await p.click('#rv-last');
  await ask(p, 'what went wrong?', 'button');
  const fresh = posts[n0].messages;
  check('a new game starts a new conversation, and a finished position needs no engine lines', fresh.length === 1 && /The game: Stockfish level 3 as White against BeckP/.test(fresh[0].content) && /Black is checkmated/.test(fresh[0].content) && !/best lines for/.test(fresh[0].content) && /a new game/.test(await text(p, '#rv-chat')));

  // --- pasted: a position, then one set up by hand
  await unfold(p);
  await p.click('.rv-source[data-source="paste"]');
  await p.fill('#rv-paste', 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3');
  await p.click('#rv-paste-go');
  await live(p);
  st = await state(p);
  check('a pasted FEN becomes the position on the board, Black to move', st.n === 0 && /^pos:r1bqkbnr/.test(st.id) && await p.evaluate(() => /to move/.test(document.getElementById('rv-player-top').textContent)));
  await unfold(p);
  await p.fill('#rv-paste', 'this is not chess');
  await p.click('#rv-paste-go');
  check('nonsense is refused with a reason', /couldn't read/.test(await text(p, '#rv-list-note')));
  await p.fill('#rv-paste', `[Event "A"]\n[White "Ann"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 (2. f4 exf4) Nc6 $1 3. Bb5 a6 1-0\n\n[Event "B"]\n[White "Cy"]\n[Black "Di"]\n[Result "0-1"]\n\n1. d4 d5 0-1`);
  await p.click('#rv-paste-go');
  await p.waitForSelector('#rv-game-list .rv-game:nth-child(2)', { timeout: 10000 });
  st = await state(p);
  check('a pasted file of two games lists both and opens the first, side lines and marks skipped', st.n === 6 && /Ann – Bob/.test(await text(p, '#rv-game-list .rv-game:nth-child(1)')) && /2 games in that file/.test(await text(p, '#rv-list-note')));

  await p.click('#rv-setup-btn');
  await p.click('#rv-ed-clear');
  const tap = async (s) => { const [x, y] = await sq(s); await p.mouse.click(x, y); };
  await p.click('.rv-brush[data-brush="wk"]'); await tap('g1');
  await p.click('.rv-brush[data-brush="wq"]'); await tap('h5');
  await p.click('.rv-brush[data-brush="wr"]'); await tap('a8'); await tap('a8'); await tap('f1');     // put down, taken off, put elsewhere
  await p.click('#rv-ed-done');
  check("a position with no black king isn't accepted", /exactly one king/.test(await text(p, '#rv-ed-note')));
  await p.click('.rv-brush[data-brush="bk"]'); await tap('h8');
  await p.click('.rv-brush[data-brush="bp"]'); await tap('g7'); await tap('h7');
  await p.screenshot({ path: SHOTS + '/review_setup.png' });
  await p.click('#rv-ed-done');
  await live(p);
  st = await state(p);
  const mateLine = await text(p, '#rv-lines .rv-line:first-child');
  console.log('review: set up', st.id, '|', mateLine);
  check('the position set up by hand is analysed: Stockfish finds the mate', st.id === 'pos:7k/6pp/8/7Q/8/8/8/5RK1 w - - 0 1' && /^M\d/.test(mateLine) && await p.evaluate(() => document.getElementById('rv-editor').hidden), mateLine);

  // --- where things are on the page
  const box = await p.evaluate(() => {
    const r = (id) => { const b = document.getElementById(id).getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
    return { board: r('rv-board-wrap'), lines: r('rv-lines'), overlay: r('rv-overlay'), svg: (() => { const b = document.querySelector('#rv-board svg').getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; })(), h: innerHeight, wide: document.documentElement.scrollWidth > innerWidth };
  });
  check("the board, its overlay and Stockfish's lines are on one screen", box.lines[3] <= box.h && box.board[2] - box.board[0] >= 440 && Math.abs(box.overlay[0] - box.svg[0]) <= 1 && Math.abs(box.overlay[3] - box.svg[3]) <= 1 && !box.wide, JSON.stringify(box));
  await ctx.close();

  // ================= a battle from Wizard Chess =================
  const ctx2 = await context({ viewport: { width: 1400, height: 900 } });
  const w = await ctx2.newPage();
  watch(w, 'wizard');
  await w.addInitScript(() => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    localStorage.setItem('becknology-chess-wizard-save-v1', JSON.stringify({ v: 1, pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', moves: 5, over: false, mode: 'ai', aiDifficulty: 3, playerColor: 'w', themeId: 'classic', reward: {}, savedAt: Date.now() }));
  });
  await w.goto(URL0 + '/chess');
  await w.waitForSelector('#wc-resume-btn', { state: 'visible', timeout: 60000 });
  check('the page still opens on Wizard Chess, offering the battle left in progress', await w.evaluate(() => !document.getElementById('view-wizard').hidden && document.getElementById('view-review').hidden));
  await w.click('#tab-review');
  await ready(w);
  await w.click('.rv-source[data-source="here"]');
  const here = await text(w, '#rv-game-list .rv-game:first-child');
  check('Played here lists the battle in progress', /vs Stockfish · Battlemage/.test(here) && /in progress/.test(here), here);
  await w.click('#tab-wizard');
  await w.click('#wc-resume-btn');
  await w.waitForFunction(() => !document.getElementById('wc-review-btn').disabled, null, { timeout: 60000 });
  await w.click('#wc-review-btn');
  await w.waitForSelector('#wc-coach-btn', { state: 'visible', timeout: 60000 });
  await w.click('#wc-coach-btn');
  await w.waitForFunction(() => window.__chessReview.S.game.source === 'wizard' && window.__chessReview.S.game.moves.length >= 5, null, { timeout: 30000 });
  st = await state(w);                                         // (the engine may have answered 3. Bc4 by now)
  const wt = await text(w, '#rv-game-title');
  check('Ask the coach about this game opens the battle on the review board at its last move', !await w.evaluate(() => document.getElementById('view-review').hidden) && st.ply === st.n && /You vs Stockfish · Battlemage/.test(wt), wt + ' ' + JSON.stringify(st));
  await ctx2.close();

  // ================= a phone =================
  const ctx3 = await context({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const m = await ctx3.newPage();
  watch(m, 'phone');
  await m.goto(URL0 + '/chess?tab=review&pgn=' + encodeURIComponent(`[White "Morphy"]\n[Black "Duke Karl"]\n[Result "1-0"]\n\n${OPERA}`));
  await ready(m);
  await reviewed(m);
  await m.evaluate(() => window.__chessReview.goTo(18));
  await live(m);
  const ph = await m.evaluate(() => {
    const vis = (e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0;
    const small = [...document.querySelectorAll('#view-review button')].filter((b) => vis(b) && !b.closest('.rv-lines, .rv-moves, .rv-msg') && Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height) < 30).map((b) => b.id || b.className);
    const r = (id) => document.getElementById(id).getBoundingClientRect();
    const lib = document.querySelector('.library');
    return {
      n: window.__chessReview.S.game.moves.length, small,
      wide: document.documentElement.scrollWidth > innerWidth + 1,
      scrolls: document.documentElement.scrollHeight > innerHeight + 1 || document.body.scrollHeight > document.body.clientHeight + 1 || lib.scrollHeight > lib.clientHeight + 1,
      board: [Math.round(r('rv-board-wrap').top), Math.round(r('rv-board-wrap').bottom), Math.round(r('rv-board-wrap').width)],
      ask: Math.round(r('rv-ask').bottom), chat: Math.round(r('rv-chat').height), h: innerHeight,
      pane: document.getElementById('view-review').dataset.pane,
      shown: ['rv-coach', 'rv-summary', 'rv-games'].filter((id) => vis(document.getElementById(id))).concat(vis(document.querySelector('.rv-engine')) ? ['engine'] : []),
      zoom: document.querySelector('meta[name=viewport]').content, font: [getComputedStyle(document.getElementById('rv-question')).fontSize, getComputedStyle(document.getElementById('rv-user')).fontSize],
    };
  });
  check('a link carrying a game opens it', ph.n === 33);
  check('on a phone the review board is one screen that does not scroll: the board, and under it the coach with its question box at the foot', !ph.scrolls && !ph.wide && ph.pane === 'coach' && ph.shown.join() === 'rv-coach' && ph.board[0] >= 44 && ph.board[2] >= 290 && ph.ask <= ph.h && ph.ask > ph.h - 40 && ph.chat >= 90, JSON.stringify(ph));
  check('…that never zooms: the page is held at its size and its boxes are big enough not to be zoomed into', /maximum-scale=1/.test(ph.zoom) && ph.font.every((f) => parseFloat(f) >= 16), ph.zoom + ' ' + ph.font);
  check('no button on the phone is too small to tap', ph.small.length === 0, ph.small.join(', '));
  await m.screenshot({ path: SHOTS + '/review_phone.png' });
  const nb = await bubbles(m);
  await m.tap('#rv-chips .rv-chip:nth-child(2)');
  await answered(m, nb + 1);
  const told = await m.evaluate(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(); const all = document.querySelectorAll('#rv-chat .rv-msg-coach'); const a = all[all.length - 1].getBoundingClientRect(); return { board: Math.round(r('rv-board-wrap').top), answer: [Math.round(a.top), Math.round(a.bottom)], chat: [Math.round(r('rv-chat').top), Math.round(r('rv-chat').bottom)], h: innerHeight }; });
  check('an answer comes up under the board, both on screen', told.board >= 44 && told.answer[1] > told.chat[0] && told.answer[0] < told.chat[1] && told.chat[1] <= told.h, JSON.stringify(told));
  await m.screenshot({ path: SHOTS + '/review_phone_coach.png' });
  const panes = {};
  for (const pane of ['engine', 'moves', 'games']) {
    await m.tap(`.rv-tab[data-pane="${pane}"]`);
    panes[pane] = await m.evaluate(() => { const vis = (e) => e && e.offsetParent !== null && e.getBoundingClientRect().height > 0; const lib = document.querySelector('.library'); return { lines: vis(document.getElementById('rv-lines')), moves: vis(document.getElementById('rv-moves')), games: vis(document.getElementById('rv-user-form')) || vis(document.getElementById('rv-paste-box')), coach: vis(document.getElementById('rv-ask')), board: vis(document.getElementById('rv-board-wrap')), scrolls: lib.scrollHeight > lib.clientHeight + 1 }; });
  }
  await m.screenshot({ path: SHOTS + '/review_phone_games.png' });
  check('the tabs under the board swap what is there: Stockfish, the moves, the games (which take the board\'s room too)', panes.engine.lines && !panes.engine.coach && panes.engine.board && panes.moves.moves && !panes.moves.lines && panes.games.games && !panes.games.board && !panes.games.moves && !Object.values(panes).some((x) => x.scrolls), JSON.stringify(panes));
  await m.tap('.rv-tab[data-pane="coach"]');
  await m.tap('#rv-tall');
  const tall = await m.evaluate(() => ({ board: document.getElementById('rv-board-wrap').offsetParent !== null, chat: Math.round(document.getElementById('rv-chat').getBoundingClientRect().height) }));
  await m.tap('#rv-tall');
  check('⤢ gives the conversation the board\'s room, and gives it back', !tall.board && tall.chat > told.chat[1] - told.chat[0] + 200 && await m.evaluate(() => document.getElementById('rv-board-wrap').offsetParent !== null), JSON.stringify(tall));

  // a keyboard: the screen shrinks to what can be seen, and the board steps aside for what's being typed
  await m.evaluate(() => {
    const vv = window.visualViewport;
    Object.defineProperty(vv, 'height', { configurable: true, get: () => 500 });
    document.getElementById('rv-question').focus();
    vv.dispatchEvent(new Event('resize'));
  });
  const kb = await m.evaluate(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(); return { typing: document.getElementById('view-review').classList.contains('is-typing'), board: document.getElementById('rv-board-wrap').offsetParent !== null, ask: Math.round(r('rv-ask').bottom), chat: Math.round(r('rv-chat').height), lib: Math.round(document.querySelector('.library').getBoundingClientRect().bottom) }; });
  check('with the keyboard up, the question box and the conversation sit in what is left of the screen', kb.typing && !kb.board && kb.ask <= 500 && kb.lib <= 500 && kb.chat >= 150, JSON.stringify(kb));
  await m.evaluate(() => { const vv = window.visualViewport; delete vv.height; document.getElementById('rv-question').blur(); vv.dispatchEvent(new Event('resize')); });
  await m.waitForTimeout(150);
  check('…and the board is back when it goes', await m.evaluate(() => !document.getElementById('view-review').classList.contains('is-typing') && document.getElementById('rv-board-wrap').offsetParent !== null && Math.round(document.querySelector('.library').getBoundingClientRect().bottom) === innerHeight));

  // the short address, as saved on a phone's home screen
  const c = await ctx3.newPage();
  watch(c, 'coach link');
  await c.goto(URL0 + '/coach?cc=BeckP');
  await ready(c);
  await c.waitForSelector('#rv-game-list .rv-game', { timeout: 10000 });
  const short = await c.evaluate(() => ({ review: !document.getElementById('view-review').hidden, wizard: document.getElementById('view-wizard').hidden, title: document.title, icon: (document.querySelector('link[rel="apple-touch-icon"]') || {}).href, user: document.getElementById('rv-user').value, games: document.querySelectorAll('#rv-game-list .rv-game').length, pane: document.getElementById('view-review').dataset.pane, listed: document.getElementById('rv-game-list').offsetParent !== null }));
  const icon = await c.request.get(short.icon);
  check('/coach opens straight on the review board, named Chess Coach, with its icon', short.review && short.wizard && short.title === 'Chess Coach · Becknology' && icon.ok() && /image\/png/.test(icon.headers()['content-type']), JSON.stringify(short));
  check('…and with a name in the address, that player\'s games are there at once, nothing typed', short.user === 'BeckP' && short.games === 3 && short.pane === 'games' && short.listed, JSON.stringify(short));
  await c.tap('#rv-game-list .rv-game:nth-child(2)');
  await c.waitForFunction(() => window.__chessReview.S.game.moves.length === 33, null, { timeout: 10000 });
  check('a game tapped in the list goes onto the board with the coach under it', await c.evaluate(() => document.getElementById('view-review').dataset.pane === 'coach' && document.getElementById('rv-board-wrap').offsetParent !== null && window.__chessReview.S.game.me === 'w'));
  await c.reload();
  await ready(c);
  await c.waitForSelector('#rv-game-list .rv-game', { state: 'attached', timeout: 10000 });
  const back = await c.evaluate(() => ({ n: window.__chessReview.S.game.moves.length, user: document.getElementById('rv-user').value, games: document.querySelectorAll('#rv-game-list .rv-game').length, search: location.search }));
  check('coming back, it remembers: the same game on the board, the name, the games fetched again', back.n === 33 && back.user === 'BeckP' && back.games === 3 && /cc=BeckP/.test(back.search), JSON.stringify(back));
  await c.close();
  await ctx3.close();

  // ================= a short, narrower window =================
  for (const [w, h] of [[1280, 700], [1100, 640]]) {
    const ctx4 = await context({ viewport: { width: w, height: h } });
    const s2 = await ctx4.newPage();
    watch(s2, 'short');
    await s2.goto(URL0 + '/chess?tab=review&pgn=' + encodeURIComponent(`[White "Morphy"]\n[Black "Duke Karl"]\n[Result "1-0"]\n\n${OPERA}`));
    await ready(s2);
    await reviewed(s2);
    await s2.evaluate(() => window.__chessReview.goTo(18));
    await live(s2);
    for (const q of ['what is the best move', 'and after that?', 'thanks']) { const n = await bubbles(s2); await s2.fill('#rv-question', q); await s2.press('#rv-question', 'Enter'); await answered(s2, n + 1); }
    const sh = await s2.evaluate(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(); return { coachTop: Math.round(r('rv-coach').top), coach: Math.round(r('rv-coach').bottom), ask: Math.round(r('rv-ask').bottom), chips: Math.round(r('rv-chips').top), chat: Math.round(r('rv-chat').height), h: innerHeight, wide: document.documentElement.scrollWidth > innerWidth + 1 }; });
    if (w <= 1240) check(`in a ${w}-wide window the picker is folded under its heading`, await s2.evaluate(() => document.getElementById('rv-games').classList.contains('is-folded') && document.getElementById('rv-game-list').offsetParent === null));
    check(`in a ${w} × ${h} window the suggestions and the question box stay inside the coach's panel, on screen`, sh.ask <= sh.coach && sh.chips > sh.coachTop && sh.coach <= sh.h && sh.chat >= 100 && !sh.wide, JSON.stringify(sh));
    await s2.screenshot({ path: SHOTS + `/review_${w}.png` });
    await ctx4.close();
  }

  console.log('errors:', errs.length + failed);
  await browser.close();
})().catch((e) => { console.log('FAILED: the test crashed —', e.message.split('\n')[0]); process.exit(1); });
