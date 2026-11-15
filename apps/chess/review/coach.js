// The coach: questions in plain language about the position on the board, answered by Claude
// (api/chess-coach.mjs) from what Stockfish finds here in the browser.
//
// Each question goes up with the position spelled out and the engine's lines for it. When the coach
// wants something checked ("why not Nxe5?" needs the engine's view of Nxe5), its reply is a set of
// tool calls instead of an answer: they're run on this page's Stockfish (runTool) and the conversation
// goes back up with the results, round after round until there's an answer.
//
// The conversation is kept here and only ever added to: every reply goes back exactly as it came
// (the server's file says why). A new game starts a new conversation.
import { Chess, describePosition, evalText, finishedEval, legalHints, lineToSan, passedFen, sideName, tryMove } from "./chessx.js";
import { ENGINE_NAME } from "./engine.js";

const API = "/api/chess-coach";
const MAX_ROUNDS = 4;                 // rounds of engine checks for one question, before "answer now"
const MAX_CHARS = 350000;             // of conversation: past this the next question starts a fresh one
const TOOL_SEARCH = { depth: 18, movetime: 1200 };

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

function playLine(fen, moves) {
  const c = new Chess(fen);
  const played = [];
  for (const mv of Array.isArray(moves) ? moves.slice(0, 40) : []) {
    const before = c.fen();
    const m = tryMove(c, mv);
    if (!m) {
      const sofar = played.length ? `after ${lineToSan(fen, played, 40).text}` : "in the position on the board";
      return { error: `"${mv}" is not a legal move ${sofar} (${sideName(new Chess(before).turn())} to move). Legal moves there: ${legalHints(new Chess(before), mv).join(", ")}.` };
    }
    played.push(m.from + m.to + (m.promotion || ""));
  }
  return { fen: c.fen(), text: played.length ? lineToSan(fen, played, 40).text : "", chess: c };
}

const overText = (c) => (c.isCheckmate() ? `checkmate - ${sideName(c.turn() === "w" ? "b" : "w")} wins` : c.isStalemate() ? "stalemate - a draw" : "a draw");

async function search(engine, fen, multipv) {
  const r = await engine.analyze(fen, { kind: "tool", multipv, ...TOOL_SEARCH });
  if (!r || !r.lines.length) throw new CoachError("failed");
  return r;
}

// Run one tool call against the position the question was asked about. → { text, isError }
export async function runTool(engine, name, input, base) {
  const arg = input && typeof input === "object" ? input : {};
  try {
    if (name === "evaluate_moves") {
      const cands = Array.isArray(arg.moves) ? arg.moves.filter((m) => typeof m === "string").slice(0, 6) : [];
      if (!cands.length) return { text: "Give at least one move to try in `moves`.", isError: true };
      const line = playLine(base.fen, arg.after);
      if (line.error) return { text: line.error, isError: true };
      const here = line.text ? `After ${line.text}` : "In the position on the board";
      const over = finishedEval(line.chess);
      if (over) return { text: `${here} the game is over (${overText(line.chess)}), so there are no moves to try.`, isError: false };
      const mover = line.chess.turn();
      const best = !line.text && base.live && base.live.fen === line.fen && base.live.depth >= 14 ? base.live : await search(engine, line.fen, 1);
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
      const line = playLine(base.fen, arg.moves);
      if (line.error) return { text: line.error, isError: true };
      const here = line.text ? `After ${line.text}` : "The position on the board";
      const over = finishedEval(line.chess);
      if (over) return { text: `${here}: ${overText(line.chess)}.\n${describePosition(line.fen)}`, isError: false };
      const n = Math.max(1, Math.min(5, Math.round(Number(arg.lines)) || 3));
      const r = await search(engine, line.fen, n);
      return { text: `${here}:\n${describePosition(line.fen)}\n${linesText(line.fen, r, n)}`, isError: false };
    }

    if (name === "find_threats") {
      const line = playLine(base.fen, arg.after);
      if (line.error) return { text: line.error, isError: true };
      const here = line.text ? `after ${line.text}` : "in the position on the board";
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
    return { text: `There is no tool called ${name}.`, isError: true };
  } catch (e) {
    if (e instanceof CoachError) return { text: "Stockfish isn't available right now, so this couldn't be checked.", isError: true };
    throw e;
  }
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
  //   { key, fen, where, played, game, complete, live }
  //   key: which game or set-up this is about; where: how the position came about, in a line or two;
  //   played: what happened next in the game, if anything; game: the whole game in text (null for a
  //   bare position); complete: whether the game's review has finished; live: the engine's result
  //   for `fen`, if it has one.
  constructor({ engine, snapshot }) {
    this.engine = engine;
    this.snapshot = snapshot;
    this.messages = [];
    this.key = null;
    this.sentGame = null;         // 'partial' | 'complete' once the game's text has gone up
    this.abort = null;
    this.trimmed = false;
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
      const base = { fen: snap.fen, live };
      this.messages.push({ role: "user", content: this.frame(snap, live, question, voice) });

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

  // The question with everything the coach needs to see the board, as one message
  frame(snap, live, question, voice) {
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
