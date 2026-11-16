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
    await ctx.route(/\/api\/chess-coach/, (r) => {
      const req = r.request();
      if (req.method() === 'GET') return r.fulfill(json({ enabled: true, env: 'test' }));
      if (coachMode === 'busy') return r.fulfill(json({ error: 'busy' }, 429));
      const body = JSON.parse(req.postData());
      posts.push(body);
      const last = body.messages[body.messages.length - 1];
      const thinking = { type: 'thinking', thinking: '', signature: 'sig-' + posts.length };
      const say = (text) => text.match(/\S+\s*/g).map((d) => ({ t: 'text', d }));
      let events;
      if (Array.isArray(last.content)) {
        const got = last.content.map((c) => c.content).join('\n');
        const text = 'Stockfish says: ' + got.split('\n').filter((l) => /^- |^1\. \(|is in check/.test(l)).slice(0, 2).join(' ');
        events = [...say(text), { t: 'done', stop: 'end_turn', content: [thinking, { type: 'text', text }] }];
      } else if (/why not|what about/i.test(last.content.split('</board>').pop()) && !body.final) {
        const q = last.content.split('</board>').pop();
        const mv = /knight takes b5/.test(q) ? 'Nxb5' : q.match(/(?:why not|what about)\s+([A-Za-z0-9+#=-]+)/i)[1];      // (a real coach turns spoken moves into notation itself)
        events = [{ t: 'done', stop: 'tool_use', content: [thinking, { type: 'tool_use', id: 'toolu_' + posts.length, name: 'evaluate_moves', input: { moves: [mv, 'Zz9'] } }] }];
      } else if (/threat/i.test(last.content.split('</board>').pop()) && !body.final) {
        events = [{ t: 'done', stop: 'tool_use', content: [thinking, { type: 'tool_use', id: 'toolu_' + posts.length, name: 'find_threats', input: {} }, { type: 'tool_use', id: 'toolu_b' + posts.length, name: 'analyze_line', input: { moves: ['Nxb5', 'cxb5'], lines: 2 } }] }];
      } else {
        const text = 'The key move is **10. Nxb5**. After 10. Nxb5 cxb5 11. Bxb5+ White wins material, about +4.4.\n\nLook for loose pieces next time.';
        events = [...say(text), { t: 'done', stop: 'end_turn', content: [thinking, { type: 'text', text }] }];
      }
      return r.fulfill({ status: 200, contentType: 'text/event-stream', body: events.map((e) => 'data: ' + JSON.stringify(e) + '\n\n').join('') });
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
  check("chess.com's newest month lists its standard games, newest first, with how they went", rows.length === 2 && /drawish/.test(rows[0]) && /\[draw\]/.test(rows[0]) && /duke_karl/.test(rows[1]) && /\[win\]/.test(rows[1]) && /Philidor Defense/.test(rows[1]));
  await p.click('#rv-more');
  await p.waitForFunction(() => document.querySelectorAll('#rv-game-list .rv-game').length === 3, null, { timeout: 10000 });
  rows = await p.$$eval('#rv-game-list .rv-game', (els) => els.map((e) => e.querySelector('.rv-res').className));
  check('Older games reads the month before (a loss), and then there are no more', /loss/.test(rows[2]) && await p.evaluate(() => document.getElementById('rv-more').hidden));

  // --- a game opened and reviewed
  await p.click('#rv-game-list .rv-game:nth-child(2)');
  const t0 = Date.now();
  await reviewed(p);
  const g = await p.evaluate(() => { const g = window.__chessReview.S.game; return { n: g.moves.length, me: g.me, acc: g.accuracy, marks: g.judged.map((j, i) => (j ? g.moves[i - 1].san + ':' + j.mark : '')).filter(Boolean), clk: g.moves.some((m) => /clk/.test(m.san)) }; });
  console.log('review: reviewed in', Date.now() - t0, 'ms — accuracy', JSON.stringify(g.acc), '|', g.marks.filter((m) => /inacc|mistake|blunder/.test(m)).join(' '));
  check('the game is read through its clock comments: 33 moves, you as White', g.n === 33 && g.me === 'w' && !g.clk);
  check("the review marks Black's ...b5 as an error and the winner as the more accurate", /b5:(mistake|blunder|inaccuracy)/.test(g.marks.join(' ')) && g.acc.w > g.acc.b && g.acc.w > 80, JSON.stringify(g.acc));
  check('the accuracy boxes and the graph show', /% accuracy/.test(await text(p, '#rv-acc')) && await p.evaluate(() => !document.getElementById('rv-graph').hidden && document.getElementById('rv-progress').hidden));
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

  // --- the coach: the Why? button, a typed question with a tool round, a tool pair, an error
  await p.click('#rv-moves .rv-mv[data-ply="18"]');
  await live(p, 12);
  await p.click('#rv-why');
  await answered(p, 2);                                       // (the greeting is the first bubble)
  const first = posts[0].messages[0].content;
  console.log('review: the question as sent —', first.split('</board>').pop().trim());
  check('Why? asks about the move, by name', /Why is 9\.\.\.b5 (a mistake|a blunder|an inaccuracy), and why is \S+ better\?/.test(first));
  check('the question carries the whole game with its evaluations', /The game: BeckP \(1212\) as White against duke_karl/.test(first) && /The player asking is BeckP, who had White/.test(first) && /9\. Bg5 \([+-]?\d/.test(first) && /b5\?+ \(/.test(first) && /Accuracy: White/.test(first));
  check('…and the position: where it is, the FEN, every piece, the loose ones', /the game after 9\.\.\.b5\. White to move/.test(first) && /FEN: rn2kb1r\/p3qppp\/2p2n2\/1p2p1B1\/2B1P3\/1QN5\/PPP2PPP\/R3K2R w KQkq/.test(first) && /White: Ke1 Qb3 Ra1 Rh1 Bc4 Bg5 Nc3, pawns a2 b2 c2 e4 f2 g2 h2/.test(first) && /Pieces under fire: /.test(first) && /Black's pawn on b5 is attacked/.test(first));
  check("…and Stockfish's lines for it, in notation", /Stockfish 19, depth \d+ - best lines for White here/.test(first) && /1\. \([+-]?[\d.M]+\) 10\. \S+/.test(first) && /In the game, White now played 10\. Nxb5/.test(first), first.split('\n').filter((l) => /^1\. \(/.test(l)).join(''));
  const ans = await text(p, '#rv-chat .rv-msg-coach:last-of-type');
  check('the answer arrives formatted', /The key move is 10\. Nxb5\./.test(ans) && await p.evaluate(() => Boolean(document.querySelector('#rv-chat .rv-msg-coach:last-of-type strong'))), ans);

  await p.fill('#rv-question', 'why not Bxf6?');
  await p.press('#rv-question', 'Enter');
  await answered(p, 3);
  const tool = posts[posts.length - 1].messages;
  const result = tool[tool.length - 1].content;
  console.log('review: the tool result —', JSON.stringify(result[0].content).slice(0, 330));
  check('a "why not" question comes back as a tool call, run on the page\'s Stockfish', Array.isArray(result) && result[0].type === 'tool_result' && /^toolu_/.test(result[0].tool_use_id) && /Stockfish's best move is 10\. \S+ \([+-]?[\d.M]+\)/.test(result[0].content) && /- 10\. Bxf6: [+-]?[\d.M]+(, [\d.]+ worse than the best move|, about as good as the best move)?\. Then: 10\.\.\.\S+/.test(result[0].content));
  check('an illegal move in a tool call is answered as such, not run', /- Zz9: not a legal move here\. Legal moves like it: /.test(result[0].content));
  const sent = posts.map((b) => JSON.stringify(b.messages));
  check('the conversation only ever grows: each request starts with the one before it', sent.every((s, i) => i === 0 || s.startsWith(sent[i - 1].slice(0, -1))));
  check('each reply goes back as it came (thinking block and all)', tool[1].content[0].type === 'thinking' && tool[1].content[0].signature === 'sig-1' && tool[3].content[1].type === 'tool_use');
  check('a later question sends the position again but not the game', !/The game: BeckP/.test(tool[2].content) && /FEN: /.test(tool[2].content));
  check('the answer uses what Stockfish found', /Stockfish says: - 10\. Bxf6:/.test(await text(p, '#rv-chat .rv-msg-coach:last-of-type')));

  await p.fill('#rv-question', 'what is the threat here?');
  await p.click('#rv-send');
  await answered(p, 4);
  const pair = posts[posts.length - 1].messages.slice(-1)[0].content;
  console.log('review: threats —', JSON.stringify(pair[0].content).slice(0, 260));
  check('two tool calls in one reply get two results in one message', pair.length === 2 && /If Black could move again at once/.test(pair[0].content) && /With White to move as normal the evaluation is/.test(pair[0].content));
  check('analyze_line plays the moves and describes the board after them', /^After 10\. Nxb5 cxb5:/.test(pair[1].content) && /White: Ke1 Qb3 Ra1 Rh1 Bc4 Bg5, pawns/.test(pair[1].content) && /best lines for White here/.test(pair[1].content) && (pair[1].content.match(/^\d\. \(/gm) || []).length === 2);

  coachMode = 'busy';
  const before = posts.length;
  await p.fill('#rv-question', 'and now?');
  await p.click('#rv-send');
  await p.waitForSelector('#rv-chat .rv-msg-error', { timeout: 20000 });
  check('a busy coach says so', /busy right now/.test(await text(p, '#rv-chat .rv-msg-error')));
  coachMode = 'ok';
  await p.fill('#rv-question', 'ok, the best move?');
  await p.click('#rv-send');
  await answered(p, 6);
  const after = posts[posts.length - 1].messages;
  check('…and the question that failed leaves no trace in the conversation', posts.length === before + 1 && !JSON.stringify(after).includes('and now?') && after.length === 11, 'messages ' + after.length);

  // --- by voice
  await p.click('#rv-mic');
  check('the microphone button starts listening', await p.evaluate(() => window.__recStarts === 1 && document.getElementById('rv-mic').classList.contains('is-on')));
  await p.evaluate(() => window.__hear('what about night takes B5'));
  await answered(p, 7);
  const voiced = posts[posts.length - 2].messages.slice(-1)[0].content.split('</board>').pop().trim();
  const spoken = await p.evaluate(() => window.__spoken.join(' | '));
  console.log('review: heard as —', voiced, '| spoken —', spoken.slice(0, 200));
  check('what was heard is tidied into chess and marked as asked by voice', voiced === '[asked by voice] what about knight takes b5');
  check('the answer is read aloud, moves as words', /Stockfish says/.test(spoken) && /knight takes b5/.test(spoken) && !/Nxb5/.test(spoken), spoken);
  await p.click('#rv-voice-mode');
  check('voice mode listens straight away', await p.evaluate(() => window.__recStarts === 2 && document.getElementById('rv-voice-mode').classList.contains('active')));
  await p.evaluate(() => window.__hear('what is the best move'));
  await answered(p, 8);
  await p.waitForFunction(() => window.__recStarts === 3, null, { timeout: 10000 });
  check('…and listens again once the answer has been spoken', true);
  await p.evaluate(() => window.__hear(''));
  await p.evaluate(() => window.__hear(''));
  await p.evaluate(() => window.__hear(''));
  check('three silences and voice mode rests', await p.evaluate(() => !document.getElementById('rv-voice-mode').classList.contains('active')) && /Voice mode is resting/.test(await text(p, '#rv-chat')));
  const fit = await p.evaluate(() => ({ ask: Math.round(document.getElementById('rv-ask').getBoundingClientRect().bottom), h: innerHeight, y: Math.round(scrollY || document.body.scrollTop) }));
  check("the coach's box is on screen without scrolling the page", fit.ask <= fit.h && fit.y === 0, JSON.stringify(fit));
  await p.screenshot({ path: SHOTS + '/review_coach.png' });

  // --- lichess
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
  await p.fill('#rv-question', 'what went wrong?');
  await p.click('#rv-send');
  await answered(p, 9);
  const fresh = posts[n0].messages;
  check('a new game starts a new conversation, and a finished position needs no engine lines', fresh.length === 1 && /The game: Stockfish level 3 as White against BeckP/.test(fresh[0].content) && /Black is checkmated/.test(fresh[0].content) && !/best lines for/.test(fresh[0].content) && /a new game/.test(await text(p, '#rv-chat')));

  // --- pasted: a position, then one set up by hand
  await p.click('.rv-source[data-source="paste"]');
  await p.fill('#rv-paste', 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3');
  await p.click('#rv-paste-go');
  await live(p);
  st = await state(p);
  check('a pasted FEN becomes the position on the board, Black to move', st.n === 0 && /^pos:r1bqkbnr/.test(st.id) && await p.evaluate(() => /to move/.test(document.getElementById('rv-player-top').textContent)));
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
    const small = [...document.querySelectorAll('#view-review button')].filter((b) => b.offsetParent && !b.closest('.rv-lines, .rv-moves, .rv-msg') && Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height) < 30).map((b) => b.id || b.className);
    return { wide: document.documentElement.scrollWidth > innerWidth + 1, board: Math.round(document.getElementById('rv-board-wrap').getBoundingClientRect().width), small, n: window.__chessReview.S.game.moves.length };
  });
  check('a link carrying a game opens it; on a phone nothing runs off the side and the board fills the width', ph.n === 33 && !ph.wide && ph.board >= 330, JSON.stringify(ph));
  check('no button on the phone is too small to tap', ph.small.length === 0, ph.small.join(', '));
  await m.screenshot({ path: SHOTS + '/review_phone.png' });
  // the short address, as saved on a phone's home screen
  const c = await ctx3.newPage();
  watch(c, 'coach link');
  await c.goto(URL0 + '/coach?cc=BeckP');
  await ready(c);
  await c.waitForSelector('#rv-game-list .rv-game', { timeout: 10000 });
  const short = await c.evaluate(() => ({ review: !document.getElementById('view-review').hidden, wizard: document.getElementById('view-wizard').hidden, title: document.title, icon: (document.querySelector('link[rel="apple-touch-icon"]') || {}).href, user: document.getElementById('rv-user').value, games: document.querySelectorAll('#rv-game-list .rv-game').length }));
  const icon = await c.request.get(short.icon);
  check('/coach opens straight on the review board, named Chess Coach, with its icon and the named player\'s games', short.review && short.wizard && short.title === 'Chess Coach · Becknology' && icon.ok() && /image\/png/.test(icon.headers()['content-type']) && short.user === 'BeckP' && short.games === 2, JSON.stringify(short));
  await c.close();
  await m.evaluate(() => document.getElementById('rv-coach').scrollIntoView());
  await m.screenshot({ path: SHOTS + '/review_phone_coach.png' });
  await ctx3.close();

  console.log('errors:', errs.length + failed);
  await browser.close();
})().catch((e) => { console.log('FAILED: the test crashed —', e.message.split('\n')[0]); process.exit(1); });
