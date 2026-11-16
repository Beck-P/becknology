/**
 * /api/chess-coach — the chess review board's coach (apps/chess/review), voiced by Claude Opus 5.5.
 *
 * GET  → { enabled, env }   (whether a key is configured — the board hides the coach without one)
 * POST → { messages, final? }  the conversation so far, as the Messages API shapes it
 *        ← text/event-stream:  {t:'text', d}…  then  {t:'done', content, stop}  or  {t:'error', error}
 *
 * The coach can't see the board or calculate: Stockfish runs in the player's browser, not here. So the
 * browser sends what the engine found with each question, and when the coach wants a line checked it
 * answers with tool calls (TOOLS below) instead of a reply. The browser runs them through its own
 * Stockfish and posts the conversation back with the results; that goes round until there's an answer
 * (stop 'end_turn'). `final: true` asks for an answer now, with no more tool calls.
 *
 * The browser keeps the conversation and sends all of it every time, each assistant turn exactly as it
 * came back (thinking blocks and all): the model's thinking is signed against what came before it, so
 * nothing earlier may be edited, and SYSTEM and TOOLS must stay the same from one request to the next.
 * Anything that changes per question (voice or typed, the position) goes in the question's own message.
 */
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 16000;            // thinking counts toward it; the replies themselves are short
const MAX_MESSAGES = 160;
const MAX_BODY = 600 * 1024;         // characters of JSON

// server-side fallback: a request the safety classifiers decline is re-run on the model Anthropic
// recommends, inside the same call. thinking-binding-controls: if the history was edited after all,
// drop the thinking blocks that no longer match rather than fail the question.
const BETAS = ['server-side-fallback-2026-07-01', 'thinking-binding-controls-2026-08-01'];

const SYSTEM = `You are the chess coach inside a game-review board. The player is looking at a position on the board right now - from one of their own games, or one they set up - and asks you, in plain language, why moves are good or bad, what the best moves are, and what each side is trying to do. Stockfish 19 is running beside you in their browser.

With each question you are given the position (FEN, a list of where every piece stands, whose move it is), how the game reached it, Stockfish's best lines with their evaluations, and, when the position comes from a game, the move that was actually played there and what the engine made of it. The first message about a game also carries the whole game with an evaluation after every move.

Where the truth comes from:
- Stockfish's evaluations and lines are the facts about what is good and bad. You are far weaker than the engine at calculating, so never overrule it and never judge a line by working it out in your head. What you add is the part the engine cannot say: why, in terms a person can use - the tactic, the loose piece, the weak square, the plan, the pattern to remember next time.
- Only say that a move wins or loses material, allows a tactic, or leads to mate when an engine line in front of you shows it. If the player asks about a move or an idea you have no engine line for ("why not Nxe5?", "what if I castle first?", "can't I just take the pawn?", "what is he threatening?"), use the tools to have Stockfish look at it before you answer. One or two tool calls is normal; several candidate moves can go in one call.
- Often the message already carries what Stockfish found when it was asked ahead about a move or a threat the question mentions. That is the tool's own result: answer from it, and call a tool only for something it does not cover.
- A question about the move that was just played - "why not Qc7 instead?", "what should I have done?" - is about the position before that move. The tools start from the position on the board unless you pass start: "before_last_move".
- Read where the pieces are from the piece list, not from memory of the opening or by decoding the FEN, and check that every piece you mention is on the square you say. After a line of moves the board has changed: ask the tools for the position rather than tracking it yourself.
- Evaluations are from White's point of view in pawns: +1.5 means White is better by about a pawn and a half, -0.8 means Black is a little better, M3 means White mates in 3 and -M2 means Black mates in 2. A change of less than about 0.3 is noise - don't build an explanation on it.
- If the engine's choice has no reason you can honestly point to, say that it is a small engine preference rather than inventing one.

How to answer:
- Talk to the player directly, as a strong, friendly coach sitting next to them. When you know which side they played, that side is "you".
- Start with the answer itself in a sentence. Then the concrete line that proves it, in standard notation and kept short (three or four moves, not the engine's whole line). Then the idea behind it, and when it helps, what to look for next time.
- Keep it brief: usually under 120 words, in plain sentences or a couple of short paragraphs. No headings and no tables. Go longer only when they ask for depth or for a review of the whole game.
- Write moves in standard algebraic notation with move numbers when you give a line (14. Rd1 Qc7 15. Nb5).
- A question marked [asked by voice] will be read aloud to them: answer in two to four short spoken sentences, say moves in words ("knight takes e5", "rook to d1", "castles kingside") instead of notation, and leave out evaluation numbers unless they matter.
- Stay on chess and this board. If the question is about something else, say so in a line and offer what you can help with.`;

const MOVES = {
  type: 'array',
  items: { type: 'string' },
  description: 'Moves in standard algebraic notation ("Nxe5", "O-O", "e8=Q") or as from-to squares ("g1f3").',
};

const START = {
  type: 'string',
  enum: ['current', 'before_last_move'],
  description: 'Where to start from: "current" (the default) is the position on the board; "before_last_move" is the position the last move was played in - use it for what could have been played instead of that move.',
};

const TOOLS = [
  {
    name: 'evaluate_moves',
    description: 'Ask Stockfish about specific candidate moves in the position the player is looking at: for each move, the evaluation after it, the best reply and how play continues, and how much worse it is than the best move. Use this whenever the question is about a move that is not among the engine lines you were given ("why not ...?", "what about ...?", "is ... playable?"). Every move in `moves` is tried separately from the same position; to try them later in a line, give the moves that lead there in `after`. An illegal move comes back marked as such, with the legal moves of that piece.',
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        moves: { ...MOVES, description: `The candidate moves to try, each on its own from the same position (1 to 6). ${MOVES.description}` },
        after: { ...MOVES, description: `Optional: moves to play first from the starting position, in order, before trying the candidates. ${MOVES.description}` },
        start: START,
      },
      required: ['moves'],
    },
  },
  {
    name: 'analyze_line',
    description: "Play a sequence of moves from the position the player is looking at and get what Stockfish sees in the position that results: its best lines with evaluations, and where every piece now stands. Use it to look further down a line (what happens after the engine's suggestion, how an attack continues, whether a plan works) and to see the board after several moves instead of working it out yourself. With no moves it analyses the position on the board more deeply.",
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        moves: { ...MOVES, description: `The moves to play from the position on the board, in order (may be empty). ${MOVES.description}` },
        lines: { type: 'integer', description: 'How many of the best lines to return, 1 to 5. Defaults to 3.' },
        start: START,
      },
      required: [],
    },
  },
  {
    name: 'find_threats',
    description: 'Find out what the side that is NOT to move is threatening: Stockfish is asked what that side would play if it could move again at once. Use it for "what is the threat?", "why do I have to respond to that?", "what does this move do?". Not available when the side to move is in check (the check is the threat).',
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        after: { ...MOVES, description: `Optional: moves to play first from the starting position, in order. ${MOVES.description}` },
        start: START,
      },
      required: [],
    },
  },
];

// ---- input hygiene -----------------------------------------------------------------------------
// The conversation is the browser's to keep, so what comes in is only checked for shape and size.
const BLOCKS = new Set(['text', 'thinking', 'redacted_thinking', 'tool_use', 'tool_result', 'fallback']);

function checkMessages(messages) {
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX_MESSAGES) return false;
  if (messages[0].role !== 'user' || messages[messages.length - 1].role !== 'user') return false;
  return messages.every((m) => {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return false;
    if (typeof m.content === 'string') return m.content.length > 0;
    return Array.isArray(m.content) && m.content.length > 0
      && m.content.every((b) => b && typeof b === 'object' && BLOCKS.has(b.type));
  });
}

// For the plain retry: the history without the blocks an edited conversation gets refused for.
function withoutThinking(messages) {
  return messages
    .map((m) => (typeof m.content === 'string' ? m : {
      role: m.role,
      content: m.content.filter((b) => b.type !== 'thinking' && b.type !== 'redacted_thinking' && b.type !== 'fallback'),
    }))
    .filter((m) => typeof m.content === 'string' || m.content.length);
}

// ---- rate limiting (per instance; the account's spend cap is the hard ceiling) -------------------
// A question is one request plus one for each round of engine checks, so this is about 30 questions.
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000, max = 90;
  const h = hits.get(ip) || { n: 0, t: now };
  if (now - h.t > win) { h.n = 0; h.t = now; }
  h.n += 1;
  hits.set(ip, h);
  if (hits.size > 5000) hits.clear();
  return h.n > max;
}

// Only this site's own pages may ask (a browser says where a POST came from).
function foreign(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try { return new URL(origin).host !== req.headers.host; } catch { return true; }
}

export function createHandler(getClient) {
  // Set once the API has refused the fuller request for a reason of its own (a field or a beta this
  // account doesn't take): from then on this instance asks the plain way first, and saves the trip.
  let plainOnly = false;
  return async function handler(req, res) {
    const client = getClient();
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ enabled: !!client, env: process.env.VERCEL_ENV || 'local' });
      return;
    }
    if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
    if (!client) { res.status(503).json({ error: 'disabled' }); return; }
    if (foreign(req)) { res.status(403).json({ error: 'origin' }); return; }
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (limited(ip)) { res.status(429).json({ error: 'busy' }); return; }

    let body = req.body;
    if (typeof body === 'string') {
      if (body.length > MAX_BODY) { res.status(413).json({ error: 'long' }); return; }
      try { body = JSON.parse(body); } catch { body = null; }
    }
    if (!body || typeof body !== 'object') { res.status(400).json({ error: 'body' }); return; }
    const messages = body.messages;
    if (!checkMessages(messages)) { res.status(400).json({ error: 'messages' }); return; }
    if (JSON.stringify(messages).length > MAX_BODY) { res.status(413).json({ error: 'long' }); return; }

    // what every attempt shares: SYSTEM and TOOLS never vary, or earlier thinking stops matching
    const base = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: { effort: 'medium' },
      system: SYSTEM,
      tools: TOOLS,
      tool_choice: { type: body.final ? 'none' : 'auto' },
    };
    const options = { timeout: 55_000, maxRetries: 1 };

    let open = false;                 // the event stream has started: errors go down it from here on
    let wrote = false;                // some of the answer has reached the page: too late to start again
    const send = (obj) => {
      if (!open) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-store, no-transform',
          'X-Accel-Buffering': 'no',
        });
        open = true;
      }
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };
    const fail = (status, error) => {
      if (open) { send({ t: 'error', error }); res.end(); } else res.status(status).json({ error });
    };

    const run = async (plain) => {
      const stream = plain
        ? client.messages.stream({ ...base, thinking: { type: 'adaptive' }, messages: withoutThinking(messages) }, options)
        : client.beta.messages.stream({
          ...base,
          betas: BETAS,
          fallbacks: 'default',
          cache_control: { type: 'ephemeral' },          // a long conversation is re-read from cache, not paid for again
          thinking: { type: 'adaptive', block_binding: { prefix_mismatch_behavior: 'drop_block' } },
          messages,
        }, options);
      stream.on('text', (d) => { if (d) { wrote = true; send({ t: 'text', d }); } });
      return stream.finalMessage();
    };

    try {
      let msg;
      try {
        msg = await run(plainOnly);
      } catch (err) {
        // refused before anything was said (a history edited after all, or a beta field this
        // account's API doesn't take): once more the plain way, without the thinking blocks
        if (plainOnly || !(err instanceof Anthropic.BadRequestError) || wrote) throw err;
        console.error('chess-coach: plain retry after', err.status, err.message);
        if (!/signature|different conversation/i.test(String(err.message))) plainOnly = true;
        msg = await run(true);
      }
      // A tool call cut off by the token limit or by a refusal mustn't be run: say the turn ended.
      const calls = msg.content.some((b) => b.type === 'tool_use');
      const stop = msg.stop_reason === 'tool_use' && calls ? 'tool_use'
        : msg.stop_reason === 'refusal' ? 'refusal'
        : msg.stop_reason === 'max_tokens' ? 'max_tokens'
        : 'end_turn';
      send({ t: 'done', stop, content: stop === 'tool_use' || stop === 'end_turn' ? msg.content : msg.content.filter((b) => b.type !== 'tool_use') });
      res.end();
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) { fail(503, 'busy'); return; }
      if (err instanceof Anthropic.APIError) {
        console.error('chess-coach failed', err.status, err.message);
        fail(err.status === 529 ? 503 : 502, err.status === 529 ? 'busy' : 'failed');
        return;
      }
      // not the API: a tool call that couldn't be read as JSON, a dropped connection
      console.error('chess-coach failed', err && err.message);
      fail(502, 'failed');
    }
  };
}

let client = null;
export default createHandler(() => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
});
