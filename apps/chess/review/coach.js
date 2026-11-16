// The coach: questions in plain language about the position on the board, answered by Claude
// (api/chess-coach.mjs) from what Stockfish finds here in the browser.
//
// Each question goes up with the position spelled out and the engine's lines for it. When the coach
// wants something checked ("why not Nxe5?" needs the engine's view of Nxe5), its reply is a set of
// tool calls instead of an answer: they're run on this page's Stockfish (runTool) and the conversation
// goes back up with the results, round after round until there's an answer.
//
// Each round trip to the model is seconds of waiting, so what a question is plainly going to need is
// looked up first (lookAhead): a move it names, a threat it asks about. The answer then usually comes
// in one trip.
//
// The conversation is kept here and only ever added to: every reply goes back exactly as it came
// (the server's file says why). A new game starts a new conversation.
import { Chess, describePosition, evalText, finishedEval, legalHints, lineToSan, passedFen, sideName, tryMove } from "./chessx.js";
import { ENGINE_NAME } from "./engine.js";

const API = "/api/chess-coach";
const MAX_ROUNDS = 4;                 // rounds of engine checks for one question, before "answer now"
const MAX_CHARS = 350000;             // of conversation: past this the next question starts a fresh one
const TOOL_SEARCH = { depth: 18, movetime: 1000 };

const SORRY = {
  disabled: "The coach is switched off on this copy of the site (it has no AI key). Stockfish still works.",
  busy: "The coach is busy right now. Give it a minute and ask again.",
  long: "This conversation has grown too long. Start a new one with the ↺ button.",
  origin: "The coach only answers from its own page.",
  refusal: "The coach declined to answer that one. Try asking it another way.",
  max_tokens: "The coach ran out of room before finishing. Ask again, perhaps more narrowly.",
  failed: "The coach couldn't answer just now. Try again in a moment.",
  offline: "Couldn't reach the coach. Check the connection and try again.",
};

export class CoachError extends Error {
  constructor(code) { super(SORRY[code] || SORRY.failed); this.code = code; }
}

let enabled = null;
// Is there a coach on this deployment? (asked once)
export async function coachAvailable() {
  if (enabled !== null) return enabled;
  try {
    const r = await fetch(API, { headers: { Accept: "application/json" } });
    enabled = r.ok ? Boolean((await r.json()).enabled) : false;
  } catch {
    enabled = false;
  }
  return enabled;
}

// ---------- what the engine found, in words ----------

export function linesText(fen, result, count = 3) {
  if (!result || !result.lines.length) return "";
  const stm = sideName(fen.split(" ")[1]);
  const rows = result.lines.slice(0, count).map((l, i) => `${i + 1}. (${evalText(l)}) ${lineToSan(fen, l.pv, 10).text}`);
  return `${ENGINE_NAME}, depth ${result.depth} - best lines for ${stm} here (evaluations from White's point of view):\n${rows.join("\n")}`;
}

const pawns = (ev) => (ev.mate === null || ev.mate === undefined ? ev.cp / 100 : null);

// ---------- the tools ----------

// Where a tool call starts from: the position on the board, or (start: "before_last_move") the one
// the last move was played in — where "why not … instead?" has to be looked at.
function origin(base, arg) {
  if (arg.start !== "before_last_move") return { fen: base.fen, name: "the position on the board", live: base.live };
  if (!base.prev) return { error: "There is no move before the position on the board, so there is no earlier position to start from. Leave `start` out." };
  return { fen: base.prev, name: `the position before ${base.last}`, live: null };
}

function playLine(from, moves) {
  if (from.error) return from;
  const fen = from.fen;
  const c = new Chess(fen);
  const played = [];
  for (const mv of Array.isArray(moves) ? moves.slice(0, 40) : []) {
    const before = c.fen();
    const m = tryMove(c, mv);
    if (!m) {
      const sofar = played.length ? `after ${lineToSan(fen, played, 40).text}` : `in ${from.name}`;
      return { error: `"${mv}" is not a legal move ${sofar} (${sideName(new Chess(before).turn())} to move). Legal moves there: ${legalHints(new Chess(before), mv).join(", ")}.` };
    }
    played.push(m.from + m.to + (m.promotion || ""));
  }
  const text = played.length ? lineToSan(fen, played, 40).text : "";
  const cap = (t) => t[0].toUpperCase() + t.slice(1);
  // "After 14. Rd1" / "In the position on the board", and the same inside a sentence
  const after = text ? (from.name === "the position on the board" ? `after ${text}` : `after ${text} from ${from.name}`) : `in ${from.name}`;
  return { fen: c.fen(), text, chess: c, after, After: cap(after), plain: !text && from.live ? from.live : null };
}

const overText = (c) => (c.isCheckmate() ? `checkmate - ${sideName(c.turn() === "w" ? "b" : "w")} wins` : c.isStalemate() ? "stalemate - a draw" : "a draw");

async function search(engine, fen, multipv) {
  const r = await engine.analyze(fen, { kind: "tool", multipv, ...TOOL_SEARCH });
  if (!r || !r.lines.length) throw new CoachError("failed");
  return r;
}

const TOOL_NAMES = ["evaluate_moves", "analyze_line", "find_threats"];

// Run one tool call against the position the question was asked about. → { text, isError }
// (A name that differs only in its letters' case, or a list of moves under a near-miss key, is
// taken as meant: the smaller models do that now and then.)
export async function runTool(engine, called, input, base) {
  const arg = input && typeof input === "object" ? { ...input } : {};
  const name = TOOL_NAMES.find((n) => n === String(called || "").trim().toLowerCase().replace(/[\s-]+/g, "_")) || called;
  if (name === "evaluate_moves" && !Array.isArray(arg.moves)) arg.moves = [arg.move, arg.candidates, arg.candidate].flat().filter((m) => typeof m === "string");
  if (name === "analyze_line" && !Array.isArray(arg.moves) && Array.isArray(arg.line)) arg.moves = arg.line;
  try {
    if (name === "evaluate_moves") {
      const cands = Array.isArray(arg.moves) ? arg.moves.filter((m) => typeof m === "string").slice(0, 6) : [];
      if (!cands.length) return { text: "Give at least one move to try in `moves`.", isError: true };
      const line = playLine(origin(base, arg), arg.after);
      if (line.error) return { text: line.error, isError: true };
      const here = line.After;
      const over = finishedEval(line.chess);
      if (over) return { text: `${here} the game is over (${overText(line.chess)}), so there are no moves to try.`, isError: false };
      const mover = line.chess.turn();
      const best = line.plain && line.plain.fen === line.fen && line.plain.depth >= 14 ? line.plain : await search(engine, line.fen, 1);
      const bestSan = lineToSan(line.fen, best.lines[0].pv, 1).text;
      const out = [`${here} (${sideName(mover)} to move), Stockfish's best move is ${bestSan} (${evalText(best.lines[0])}). Evaluations are from White's point of view.`];
      for (const cand of cands) {
        const c = new Chess(line.fen);
        const m = tryMove(c, cand);
        if (!m) { out.push(`- ${cand}: not a legal move here. Legal moves like it: ${legalHints(new Chess(line.fen), cand).join(", ")}.`); continue; }
        const label = lineToSan(line.fen, [m.from + m.to + (m.promotion || "")], 1).text;
        const done = finishedEval(c);
        if (done) { out.push(`- ${label}: ${overText(c)}.`); continue; }
        if (m.from + m.to + (m.promotion || "") === best.lines[0].pv[0]) {
          out.push(`- ${label}: this is the engine's best move (${evalText(best.lines[0])}). Then: ${lineToSan(line.fen, best.lines[0].pv, 9).text}.`);
          continue;
        }
        const r = await search(engine, c.fen(), 1);
        const a = pawns(best.lines[0]), b = pawns(r.lines[0]);
        const worse = a !== null && b !== null ? (mover === "w" ? a - b : b - a) : null;
        const gap = worse === null ? "" : worse < 0.25 ? ", about as good as the best move" : `, ${worse.toFixed(1)} worse than the best move`;
        out.push(`- ${label}: ${evalText(r.lines[0])}${gap}. Then: ${lineToSan(c.fen(), r.lines[0].pv, 8).text}.`);
      }
      return { text: out.join("\n"), isError: false };
    }

    if (name === "analyze_line") {
      const line = playLine(origin(base, arg), arg.moves);
      if (line.error) return { text: line.error, isError: true };
      const here = line.After.replace(/^In /, "").replace(/^t/, "T");
      const over = finishedEval(line.chess);
      if (over) return { text: `${here}: ${overText(line.chess)}.\n${describePosition(line.fen)}`, isError: false };
      const n = Math.max(1, Math.min(5, Math.round(Number(arg.lines)) || 3));
      const r = await search(engine, line.fen, n);
      return { text: `${here}:\n${describePosition(line.fen)}\n${linesText(line.fen, r, n)}`, isError: false };
    }

    if (name === "find_threats") {
      const line = playLine(origin(base, arg), arg.after);
      if (line.error) return { text: line.error, isError: true };
      const here = line.after;
      if (finishedEval(line.chess)) return { text: `The game is over ${here} (${overText(line.chess)}).`, isError: false };
      const mover = line.chess.turn();
      const foe = sideName(mover === "w" ? "b" : "w");
      const pass = passedFen(line.fen);
      if (!pass) return { text: `${sideName(mover)} is in check ${here}: the check itself is what has to be answered, so there is no "what if ${sideName(mover)} passes".`, isError: false };
      const [threat, normal] = [await search(engine, pass, 2), await search(engine, line.fen, 1)];
      const rows = threat.lines.map((l, i) => `${i + 1}. (${evalText(l)}) ${lineToSan(pass, l.pv, 7).text}`);
      return {
        text: `If ${foe} could move again at once ${here} (${sideName(mover)} doing nothing), Stockfish would play:\n${rows.join("\n")}\n`
          + `With ${sideName(mover)} to move as normal the evaluation is ${evalText(normal.lines[0])} (best: ${lineToSan(line.fen, normal.lines[0].pv, 1).text}). `
          + "If the first number is much better for " + foe + " than the second, that line is the threat; if they are close, there is no serious threat.",
        isError: false,
      };
    }
    return { text: `There is no tool called ${called}. The tools are ${TOOL_NAMES.join(", ")}.`, isError: true };
  } catch (e) {
    if (e instanceof CoachError) return { text: "Stockfish isn't available right now, so this couldn't be checked.", isError: true };
    throw e;
  }
}

// ---------- looking ahead ----------

const PIECE_WORD = { king: "K", queen: "Q", rook: "R", bishop: "B", knight: "N" };

// "knight takes e5", "castle kingside", "bishop to c4" as the notation they mean
export function spokenMoves(text) {
  return String(text)
    .replace(/\b(?:castl(?:e|es|ing)\s+(?:on\s+the\s+)?(?:queen\s?side|long)|(?:long|queen\s?side)\s+castl(?:e|es|ing))\b/gi, " O-O-O ")
    .replace(/\b(?:castl(?:e|es|ing)\s+(?:on\s+the\s+)?(?:king\s?side|short)|(?:short|king\s?side)\s+castl(?:e|es|ing))\b/gi, " O-O ")
    .replace(/\b(king|queen|rook|bishop|knight)\s+(?:(takes|captures|x)\s+(?:on\s+)?|to\s+)?([a-h][1-8])\b/gi, (m, p, x, sq) => ` ${PIECE_WORD[p.toLowerCase()]}${x ? "x" : ""}${sq.toLowerCase()} `)
    .replace(/\b([a-h])\s*(?:pawn\s+)?(?:takes|captures)\s+(?:on\s+)?([a-h][1-8])\b/gi, (m, f, sq) => ` ${f.toLowerCase()}x${sq.toLowerCase()} `);
}

const MOVE_WORD = /^(?:O-O(?:-O)?|[KQRBNkqrn]?[a-h]?[1-8]?x?[a-h][1-8](?:=?[QRBNqrbn])?|[a-h][1-8][a-h][1-8][qrbn]?)$/;
const BARE_SQUARE = /^[a-h][1-8]$/;
const ASKS_ABOUT_A_MOVE = /why not|what about|how about|what if|instead|rather than|can i|could i|can't i|couldn't i|should i|shouldn't i|is it|was it|\bplay(?:ed|ing|s)?\b|\bmove\b|\bpush/i;
const ASKS_ABOUT_THREATS = /\bthreat|threaten|\bwhy (?:do|did|must|should) (?:i|he|she|they|white|black) (?:have to|need to)|what (?:is|was|does|did) (?:he|she|they|white|black|my opponent|the opponent)\b.*\b(?:want|up to|planning|trying|going for|do)/i;

// The moves a question names that could be played here, or could have been played instead of the last move
export function namedMoves(question, base) {
  const here = [], instead = [];
  const words = spokenMoves(question).replace(/\b\d+\s*\.+/g, " ").split(/[^A-Za-z0-9+#=-]+/).filter(Boolean);
  const intent = ASKS_ABOUT_A_MOVE.test(question);
  for (const w0 of words) {
    const w = w0.replace(/[+#]+$/, "");
    if (!MOVE_WORD.test(w)) continue;
    if (BARE_SQUARE.test(w) && !intent) continue;                 // "the pawn on e5" isn't a move
    const find = (fen) => { const c = new Chess(fen); const m = tryMove(c, w); return m ? m.san : null; };
    const a = find(base.fen);
    const b = !a && base.prev ? find(base.prev) : null;
    if (a && !here.includes(a)) here.push(a);
    else if (b && b !== base.lastSan && !(base.known || []).includes(b) && !instead.includes(b)) instead.push(b);   // (known: its line is already in the message)
  }
  return { here: here.slice(0, 3), instead: instead.slice(0, 3) };
}

function toolStatus(call) {
  const a = call.input || {};
  const list = (x) => (Array.isArray(x) ? x.filter((m) => typeof m === "string").slice(0, 6).join(", ") : "");
  if (call.name === "evaluate_moves") return `Stockfish is checking ${list(a.moves) || "that"}…`;
  if (call.name === "find_threats") return "Stockfish is looking for the threat…";
  return list(a.moves) ? `Stockfish is looking at ${list(a.moves).replace(/, /g, " ")}…` : "Stockfish is looking deeper…";
}

// ---------- the conversation ----------

export class Coach {
  // engine: the Engine for tool searches. snapshot(): what's on the board now —
  //   { key, fen, where, played, game, complete, live, prev, last, lastSan }
  //   key: which game or set-up this is about; where: how the position came about, in a line or two;
  //   played: what happened next in the game, if anything; game: the whole game in text (null for a
  //   bare position); complete: whether the game's review has finished; live: the engine's result
  //   for `fen`, if it has one; prev: the position the last move was played in (null at the start),
  //   last: that move with its number ("9...b5"), lastSan: without ("b5"); known: moves instead of
  //   it whose engine line `where` already gives.
  constructor({ engine, snapshot }) {
    this.engine = engine;
    this.snapshot = snapshot;
    this.messages = [];
    this.key = null;
    this.sentGame = null;         // 'partial' | 'complete' once the game's text has gone up
    this.abort = null;
    this.trimmed = false;
    this.last = { rounds: 0, ahead: 0 };    // the last question: trips back for engine checks, checks made ahead
  }

  reset() {
    this.stop();
    this.messages = [];
    this.key = null;
    this.sentGame = null;
    this.trimmed = false;
  }

  stop() {
    if (this.abort) this.abort.abort();
    this.abort = null;
  }

  get busy() { return Boolean(this.abort); }

  // Ask. onText(delta) as the answer arrives, onStatus(text) for what's happening meanwhile.
  // Resolves to the whole answer; rejects with a CoachError (its message is for the player).
  async ask(question, { voice = false, onText = () => {}, onStatus = () => {} } = {}) {
    this.stop();
    const ctl = new AbortController();
    this.abort = ctl;
    const snap = this.snapshot();
    if (snap.key !== this.key) { this.messages = []; this.key = snap.key; this.sentGame = null; this.trimmed = false; }
    if (JSON.stringify(this.messages).length > MAX_CHARS) { this.messages = []; this.sentGame = null; this.trimmed = true; }
    const mark = this.messages.length;
    const sentGame = this.sentGame;
    try {
      onStatus("Reading the position…");
      let live = snap.live;
      if (!finishedEval(new Chess(snap.fen)) && (!live || live.depth < 12 || live.lines.length < 2)) {
        live = await this.engine.analyze(snap.fen, { kind: "tool", multipv: 3, depth: 16, movetime: 1500 });
      }
      if (ctl.signal.aborted) throw new DOMException("stopped", "AbortError");
      const base = { fen: snap.fen, live, prev: snap.prev || null, last: snap.last || "", lastSan: snap.lastSan || "", known: snap.known || [] };
      const ahead = await this.lookAhead(question, base, onStatus);
      if (ctl.signal.aborted) throw new DOMException("stopped", "AbortError");
      this.last = { rounds: 0, ahead: ahead.count };
      this.messages.push({ role: "user", content: this.frame(snap, live, question, voice, ahead.text) });

      let answer = "";
      for (let round = 0; ; round++) {
        onStatus(round ? "Putting it together…" : "Thinking…");
        const res = await this.send(round >= MAX_ROUNDS, ctl.signal, (d) => {
          if (!answer && !d.trim()) return;
          answer += d;
          onText(d);
        });
        if (res.stop !== "end_turn" && res.stop !== "tool_use") throw new CoachError(res.stop);
        this.messages.push({ role: "assistant", content: res.content });
        const calls = res.content.filter((b) => b.type === "tool_use");
        if (res.stop !== "tool_use" || !calls.length) break;
        if (answer && !answer.endsWith("\n")) { answer += "\n\n"; onText("\n\n"); }
        this.last.rounds = round + 1;
        const results = [];
        for (const call of calls) {
          onStatus(toolStatus(call));
          const out = await runTool(this.engine, call.name, call.input, base);
          if (ctl.signal.aborted) throw new DOMException("stopped", "AbortError");
          results.push({ type: "tool_result", tool_use_id: call.id, content: out.text, ...(out.isError ? { is_error: true } : {}) });
        }
        this.messages.push({ role: "user", content: results });
      }
      if (!answer.trim()) throw new CoachError("failed");
      return answer.trim();
    } catch (e) {
      // a question that didn't get its answer never happened, as far as the conversation goes
      this.messages.length = mark;
      this.sentGame = sentGame;
      if (e instanceof CoachError) throw e;
      if (e && e.name === "AbortError") throw e;
      throw new CoachError("offline");
    } finally {
      if (this.abort === ctl) this.abort = null;
    }
  }

  // What the question is plainly going to need from the engine, asked for before the model is: a
  // move it names (here, or instead of the move just played), what the other side threatens.
  // → { text, count }
  async lookAhead(question, base, onStatus) {
    const out = [];
    let count = 0;
    const run = async (name, input) => {
      const r = await runTool(this.engine, name, input, base);
      if (!r.isError) { out.push(r.text); count++; }
    };
    try {
      const over = finishedEval(new Chess(base.fen));
      const named = namedMoves(question, base);
      if (named.here.length && !over) { onStatus(`Stockfish is checking ${named.here.join(", ")}…`); await run("evaluate_moves", { moves: named.here }); }
      if (named.instead.length) { onStatus(`Stockfish is checking ${named.instead.join(", ")}…`); await run("evaluate_moves", { moves: named.instead, start: "before_last_move" }); }
      if (ASKS_ABOUT_THREATS.test(question) && !over && !new Chess(base.fen).inCheck()) { onStatus("Stockfish is looking for the threat…"); await run("find_threats", {}); }
    } catch { /* the engine isn't there: the coach can still ask for what it needs */ }
    return { text: out.length ? `Stockfish was asked ahead about what the question mentions (the same checks the tools would run):\n${out.join("\n\n")}` : "", count };
  }

  // The question with everything the coach needs to see the board, as one message
  frame(snap, live, question, voice, ahead = "") {
    const parts = [];
    if (this.trimmed && !this.messages.length) parts.push("(The earlier part of this conversation was cleared to save space. It was about the same game.)");
    const want = snap.game ? (snap.complete ? "complete" : "partial") : null;
    // the game goes up with the first question about it, and once more when its review has finished
    if (want && this.sentGame !== "complete" && this.sentGame !== want) {
      parts.push(snap.game);
      this.sentGame = want;
    }
    const c = new Chess(snap.fen);
    const pos = [`Position on the board now: ${snap.where}`, `FEN: ${snap.fen}`, describePosition(snap.fen)];
    if (!finishedEval(c)) pos.push(linesText(snap.fen, live) || "(Stockfish has no lines for this position yet.)");
    if (snap.played) pos.push(snap.played);
    parts.push(pos.join("\n"));
    if (ahead) parts.push(ahead);
    return `<board>\n${parts.join("\n\n")}\n</board>\n\n${voice ? "[asked by voice] " : ""}${question.trim()}`;
  }

  // One request: the conversation up, the reply's words down as they come. → { stop, content }
  async send(final, signal, onText) {
    let res;
    try {
      res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ messages: this.messages, final }),
        signal,
      });
    } catch (e) {
      if (e && e.name === "AbortError") throw e;
      throw new CoachError("offline");
    }
    if (!res.ok || !res.body) {
      let code = "failed";
      try { code = (await res.json()).error || code; } catch { /* no body */ }
      if (res.status === 404 || res.status === 405) code = "disabled";
      throw new CoachError(code);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", done = null;
    for (;;) {
      const { value, done: end } = await reader.read();
      buf += dec.decode(value || new Uint8Array(), { stream: !end });
      let at;
      while ((at = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, at);
        buf = buf.slice(at + 2);
        const data = chunk.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("");
        if (!data) continue;
        let ev;
        try { ev = JSON.parse(data); } catch { continue; }
        if (ev.t === "text") onText(ev.d || "");
        else if (ev.t === "error") throw new CoachError(ev.error);
        else if (ev.t === "done") done = ev;
      }
      if (end) break;
    }
    if (!done || !Array.isArray(done.content)) throw new CoachError("failed");
    return { stop: done.stop, content: done.content };
  }
}
