// Review & Coach: any game or position on a board, Stockfish's view of it, and a coach to ask why.
//
//   games in        sources.js (chess.com, lichess, the battles played here), a pasted PGN or FEN,
//                   a position set up by hand
//   the engine      engine.js — two workers: one reviews the whole game in the background (every
//                   position once, giving the evaluation graph, the marks and the accuracy), one
//                   follows the position on the board and answers the coach's tool calls
//   the coach       coach.js (questions, in text or by voice — voice.js)
//
// The board shows the game after `S.ply` of its moves, plus any moves you've tried from there
// (`S.side`): move a piece and you're in a side line, which Stockfish and the coach follow too.
import { Chessboard, INPUT_EVENT_TYPE, COLOR, BORDER_TYPE, POINTER_EVENTS } from "https://cdn.jsdelivr.net/npm/cm-chessboard@8.7.6/src/Chessboard.js";
import { Markers } from "https://cdn.jsdelivr.net/npm/cm-chessboard@8.7.6/src/extensions/markers/Markers.js";
import {
  Chess, START_FEN, MARKS, castlingFor, checkPosition, evalText, finishedEval, gameAccuracy, judgeMove,
  lineToSan, looksLikeFen, moveLabel, openingFromUrl, pgnHeaders, pickMove, playUci, readFen, readPgn,
  sideName, splitPgn, tryMove, winPct,
} from "./chessx.js";
import { Engine, ENGINE_NAME } from "./engine.js";
import * as Sources from "./sources.js";
import { Coach, coachAvailable } from "./coach.js";
import * as Voice from "./voice.js";

const ASSETS_URL = "https://cdn.jsdelivr.net/npm/cm-chessboard@8.7.6/assets/";
const PREFS_KEY = "becknology-chess-review-v1";
const MARKER_LAST = { class: "marker-square", slice: "markerSquare" };

const REVIEW_SEARCH = { depth: 16, movetime: 800 };      // each position of a game, in the background
const LIVE_SEARCH = { multipv: 3, depth: 22, movetime: 12000 };   // the position on the board

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

const S = {
  game: null,
  ply: 0,
  side: [],
  flipped: false,
  live: null,
  source: "chesscom",
  feeds: {},              // source → the feed its games come from (for "Older games")
  lists: {},              // source → the entries shown
  editing: null,
  visible: false,
};

let board = null;
let fg = null, bg = null;          // the engines: fg follows the board and the coach, bg reviews the game
let coach = null;
let reviewRun = 0;
let prefs = { source: "chesscom", users: {}, last: null };
const kept = new Map();            // games already opened this visit, by id (their review isn't redone)
let promoWait = null;
let listening = null;              // stops the microphone, while it's on
let voiceMode = false;
let quietTurns = 0;
let coachOn = null;
const timings = [];                // how long each answer took (shown under it; kept for comparing settings)

// ---------- the game on the board ----------

const fenAt = (g, ply) => (ply === 0 ? g.startFen : g.moves[ply - 1].after);
const curFen = () => (S.side.length ? S.side[S.side.length - 1].after : fenAt(S.game, S.ply));
const lastMove = () => (S.side.length ? S.side[S.side.length - 1] : S.ply > 0 ? S.game.moves[S.ply - 1] : null);

function makeGame(entry, parsed) {
  const n = parsed.moves.length;
  return {
    ...entry,
    startFen: parsed.startFen,
    moves: parsed.moves,
    warning: parsed.warning || "",
    evals: new Array(n + 1).fill(null),      // the engine on each position: { cp, mate, best, pv, depth }
    judged: new Array(n + 1).fill(null),     // judged[i]: move i (1-based) — { loss, accuracy, mark }
    reviewed: false,
    failed: false,
  };
}

function positionGame(fen) {
  return makeGame({
    id: "pos:" + fen, source: "position", white: { name: "White", rating: null }, black: { name: "Black", rating: null },
    result: "*", me: null, opening: "", url: "", endTime: 0, speed: "",
  }, { startFen: fen, moves: [] });
}

// A game as it comes from a list (or built from a pasted PGN's own headers), opened on the board
function openEntry(entry, { remember = true } = {}) {
  let g = kept.get(entry.id);
  if (!g) {
    const parsed = readPgn(entry.pgn);
    if (parsed.error) { note(parsed.error, true); return false; }
    const h = parsed.headers;
    g = makeGame({ ...entry, opening: entry.opening || h.Opening || openingFromUrl(h.ECOUrl) || "" }, parsed);
    kept.set(g.id, g);
    if (kept.size > 30) kept.delete(kept.keys().next().value);
  }
  if (remember) { prefs.last = { ...entry }; savePrefs(); }
  setGame(g);
  if (g.warning) note(g.warning, true);
  return true;
}

function entryFromPgn(pgn, i = 0) {
  const h = pgnHeaders(pgn);
  const when = Date.parse(String(h.UTCDate || h.Date || "").replace(/\./g, "-"));
  return {
    id: "pgn:" + hash(pgn),
    source: "pasted",
    pgn,
    white: { name: h.White && h.White !== "?" ? h.White : "White", rating: +h.WhiteElo || null },
    black: { name: h.Black && h.Black !== "?" ? h.Black : "Black", rating: +h.BlackElo || null },
    result: ["1-0", "0-1", "1/2-1/2"].includes(h.Result) ? h.Result : "*",
    endTime: Number.isFinite(when) ? when : 0,
    speed: h.Event && h.Event !== "?" ? h.Event : "",
    opening: h.Opening || "",
    url: /^https?:/.test(h.Link || h.Site || "") ? h.Link || h.Site : "",
    me: null,
    n: i,
  };
}

function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function setGame(g) {
  reviewRun++;
  if (bg) bg.cancel("batch");
  S.game = g;
  S.ply = 0;
  S.side = [];
  S.flipped = g.me === "b";
  leaveEditor(false);
  orient();
  renderSummary();
  renderMoves();
  renderGraph();
  show(false);
  reviewGame(g);
}

// ---------- moving about ----------

function goTo(ply) {
  if (!S.game) return;
  const to = Math.max(0, Math.min(S.game.moves.length, ply));
  const near = !S.side.length && Math.abs(to - S.ply) === 1;      // a jump isn't animated: thirty pieces flying is no help
  S.side = [];
  S.ply = to;
  show(near);
}

function step(d) {
  if (!S.game || S.editing) return;
  if (d < 0) {
    if (S.side.length) S.side.pop();
    else if (S.ply > 0) S.ply--;
    else return;
  } else if (!S.side.length && S.ply < S.game.moves.length) S.ply++;
  else return;
  show(true);
}

// Moves played from the position on the board: along the game while they match it, a side line once they don't
function play(ucis, animate = true) {
  const g = S.game;
  for (const uci of ucis) {
    if (!S.side.length && S.ply < g.moves.length && g.moves[S.ply].uci === uci) { S.ply++; continue; }
    const c = new Chess(curFen());
    const m = playUci(c, uci);
    if (!m) break;
    S.side.push(pickMove(m));
  }
  show(animate);
}

// ---------- the board ----------

function makeBoard() {
  board = new Chessboard($("rv-board"), {
    position: START_FEN,
    assetsUrl: ASSETS_URL,
    style: { cssClass: "default autumn", borderType: BORDER_TYPE.none, showCoordinates: true, pieces: { file: "pieces/standard.svg" }, animationDuration: 180 },
    extensions: [{ class: Markers }],
  });
  board.enableMoveInput(onInput);
}

function onInput(ev) {
  if (S.editing || !S.game) return false;
  if (ev.type === INPUT_EVENT_TYPE.moveInputStarted) {
    const c = new Chess(curFen());
    const p = c.get(ev.squareFrom);
    return Boolean(p) && p.color === c.turn() && !finishedEval(c);
  }
  if (ev.type === INPUT_EVENT_TYPE.validateMoveInput) {
    const c = new Chess(curFen());
    const found = c.moves({ square: ev.squareFrom, verbose: true }).filter((m) => m.to === ev.squareTo);
    if (!found.length) return false;
    if (found[0].promotion) { promoWait = { from: ev.squareFrom, to: ev.squareTo }; return true; }
    promoWait = null;
    return true;
  }
  if (ev.type === INPUT_EVENT_TYPE.moveInputFinished && ev.legalMove) {
    if (promoWait) { $("rv-promo").hidden = false; return true; }
    // after the board's own animation: castling, en passant and the marks need the full redraw
    setTimeout(() => play([ev.squareFrom + ev.squareTo], false), 0);
  }
  return true;
}

function choosePromotion(piece) {
  $("rv-promo").hidden = true;
  const w = promoWait;
  promoWait = null;
  if (!w) return;
  if (piece) play([w.from + w.to + piece], false);
  else show(false);
}

// Redraw everything that depends on where we are
function show(animate) {
  const g = S.game;
  if (!g || !board) return;
  if (!$("rv-promo").hidden) { $("rv-promo").hidden = true; promoWait = null; }
  const fen = curFen();
  board.setPosition(fen, Boolean(animate));
  board.removeMarkers(MARKER_LAST);
  const lm = lastMove();
  if (lm) { board.addMarker(MARKER_LAST, lm.from); board.addMarker(MARKER_LAST, lm.to); }
  S.live = null;
  renderPlayers();
  renderVerdict();
  renderOverlay();
  renderLines();
  renderEvalBar();
  markCurrentMove();
  renderSideline();
  renderGraph();
  renderChips();
  $("rv-back").hidden = !S.side.length;
  $("rv-prev").disabled = !S.side.length && S.ply === 0;
  $("rv-first").disabled = $("rv-prev").disabled;
  $("rv-next").disabled = Boolean(S.side.length) || S.ply >= g.moves.length;
  $("rv-last").disabled = !S.side.length && S.ply >= g.moves.length;
  follow();
}

// --- arrows and marks, drawn over the board (an 8 × 8 grid)
function centre(square) {
  const f = "abcdefgh".indexOf(square[0]);
  const r = +square[1] - 1;
  return S.flipped ? [7 - f + 0.5, r + 0.5] : [f + 0.5, 7 - r + 0.5];
}

function arrow(uci, cls) {
  if (!uci || uci.length < 4) return "";
  const [x1, y1] = centre(uci.slice(0, 2));
  const [x2, y2] = centre(uci.slice(2, 4));
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (!len) return "";
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const tip = [x2 - ux * 0.1, y2 - uy * 0.1];
  const neck = [x2 - ux * 0.46, y2 - uy * 0.46];
  const p = (pt, side) => `${(pt[0] - uy * side).toFixed(3)},${(pt[1] + ux * side).toFixed(3)}`;
  return `<g class="rv-arrow ${cls}"><line x1="${(x1 + ux * 0.26).toFixed(3)}" y1="${(y1 + uy * 0.26).toFixed(3)}" x2="${neck[0].toFixed(3)}" y2="${neck[1].toFixed(3)}"/>`
    + `<polygon points="${p(tip, 0)} ${p(neck, 0.23)} ${p(neck, -0.23)}"/></g>`;
}

function renderOverlay(hover) {
  const g = S.game;
  if (!g || S.editing) { $("rv-overlay").innerHTML = ""; return; }
  let out = "";
  const lm = lastMove();
  const j = !S.side.length && S.ply > 0 ? g.judged[S.ply] : null;
  // what should have been played instead of the move just made
  if (j && ["inaccuracy", "mistake", "blunder"].includes(j.mark)) out += arrow(g.evals[S.ply - 1].best, "better");
  // the best move from here
  const best = hover || (S.live && S.live.lines[0] ? S.live.lines[0].pv[0] : !S.side.length && g.evals[S.ply] ? g.evals[S.ply].best : null);
  out += arrow(best, hover ? "hover" : "best");
  if (j && lm && MARKS[j.mark].glyph) {
    const [x, y] = centre(lm.to);
    out += `<g class="rv-badge rv-mk-${j.mark}"><circle cx="${x + 0.36}" cy="${y - 0.36}" r="0.2"/><text x="${x + 0.36}" y="${y - 0.36}" dy="0.085" text-anchor="middle">${MARKS[j.mark].glyph}</text></g>`;
  }
  $("rv-overlay").innerHTML = out;
}

// ---------- the engine following the board ----------

let liveDue = false;
async function follow() {
  if (!S.game || !S.visible || S.editing) return;
  const fen = curFen();
  if (finishedEval(new Chess(fen))) { fg.cancel("live"); return; }
  const mine = (r) => r && r.fen === fen && S.game && !S.editing && curFen() === fen;
  const r = await fg.analyze(fen, {
    kind: "live", ...LIVE_SEARCH,
    onInfo: (part) => {
      if (!mine(part)) return;
      S.live = part;
      if (liveDue) return;
      liveDue = true;
      setTimeout(() => { liveDue = false; renderLive(); }, 140);
    },
  });
  if (mine(r) && r.lines.length) { S.live = r; renderLive(); }
  if (fg.state === "failed") renderLines();
}

function renderLive() {
  renderLines();
  renderEvalBar();
  renderOverlay();
}

function renderLines() {
  const box = $("rv-lines");
  const g = S.game;
  if (!g) { box.innerHTML = ""; $("rv-engine-depth").textContent = ""; return; }
  const fen = curFen();
  const c = new Chess(fen);
  const over = finishedEval(c);
  if (over) {
    $("rv-engine-depth").textContent = "";
    box.innerHTML = `<div class="rv-line rv-line-note">${c.isCheckmate() ? `Checkmate — ${sideName(c.turn() === "w" ? "b" : "w")} wins.` : c.isStalemate() ? "Stalemate — a draw." : "A draw."}</div>`;
    return;
  }
  if (fg && fg.state === "failed") {
    $("rv-engine-depth").textContent = "";
    box.innerHTML = `<div class="rv-line rv-line-note">Stockfish couldn't start in this browser, so there are no engine lines.</div>`;
    return;
  }
  const r = S.live;
  if (!r || !r.lines.length) {
    $("rv-engine-depth").textContent = "thinking…";
    if (!box.querySelector(".rv-line-move")) box.innerHTML = `<div class="rv-line rv-line-note">Stockfish is looking at the position…</div>`;
    else box.classList.add("is-stale");
    return;
  }
  box.classList.remove("is-stale");
  $("rv-engine-depth").textContent = `depth ${r.depth}`;
  box.innerHTML = r.lines.map((l, i) => {
    const pv = l.pv.slice(0, 9);
    const sans = lineToSan(fen, pv);
    let no = +fen.split(" ")[5], white = fen.split(" ")[1] === "w";
    const moves = sans.sans.map((san, k) => {
      const num = white ? `${no}.` : k === 0 ? `${no}…` : "";
      if (!white) no++;
      white = !white;
      return `${num ? `<span class="rv-line-no">${num}</span>` : ""}<button type="button" class="rv-line-move" data-upto="${k + 1}">${esc(san)}</button>`;
    }).join(" ");
    const good = l.cp > 30 ? "is-white" : l.cp < -30 ? "is-black" : "";
    // (the line carries its own moves: the engine may have changed its mind by the time one is clicked)
    return `<div class="rv-line" data-first="${esc(l.pv[0])}" data-pv="${esc(pv.join(" "))}" data-fen="${esc(fen)}"><span class="rv-line-eval ${good}">${evalText(l)}</span><span class="rv-line-moves">${moves}</span></div>`;
  }).join("");
}

function renderEvalBar() {
  const g = S.game;
  let ev = null;
  if (g) {
    const over = finishedEval(new Chess(curFen()));
    ev = over || (S.live && S.live.lines[0]) || (!S.side.length ? g.evals[S.ply] : null);
  }
  const bar = $("rv-evalbar");
  bar.classList.toggle("is-flipped", S.flipped);
  if (!ev) { bar.classList.add("is-waiting"); return; }
  bar.classList.remove("is-waiting");
  const pct = Math.max(3, Math.min(97, winPct(ev)));
  $("rv-evalbar-white").style.height = pct.toFixed(1) + "%";
  const num = $("rv-evalbar-num");
  num.textContent = evalText(ev).replace(/^[+-]/, "");
  num.classList.toggle("on-white", ev.cp >= 0);
}

// ---------- reviewing the whole game ----------

async function reviewGame(g) {
  const run = reviewRun;
  const n = g.moves.length;
  if (!n) { g.reviewed = true; renderSummary(); return; }
  g.failed = false;
  for (let i = 0; i <= n; i++) {
    if (!g.evals[i]) {
      const fen = fenAt(g, i);
      const over = finishedEval(new Chess(fen));
      let ev;
      if (over) ev = { ...over, best: null, pv: [], depth: 0 };
      else {
        const r = await bg.analyze(fen, { kind: "batch", multipv: 1, ...REVIEW_SEARCH });
        if (run !== reviewRun) return;                       // another game is on the board now
        if (!r || !r.lines.length) { g.failed = true; renderSummary(); return; }
        ev = { cp: r.lines[0].cp, mate: r.lines[0].mate, best: r.best, pv: r.lines[0].pv, depth: r.depth };
      }
      g.evals[i] = ev;
    }
    if (i > 0 && !g.judged[i]) g.judged[i] = judgeMove(g.moves[i - 1].color, g.evals[i - 1], g.evals[i], g.moves[i - 1].uci, g.evals[i - 1].best);
    if (run !== reviewRun) return;
    reviewStep(g, i);
  }
  g.reviewed = true;
  const acc = (color) => gameAccuracy(g.judged.filter((j, i) => j && g.moves[i - 1].color === color).map((j) => j.accuracy));
  g.accuracy = { w: acc("w"), b: acc("b") };
  renderSummary();
  renderMoves();
  renderGraph();
  renderVerdict();
  renderOverlay();
  renderChips();
}

let stepDue = false;
function reviewStep(g, i) {
  if (g !== S.game) return;
  const n = g.moves.length;
  $("rv-progress-bar").style.width = `${Math.round((i / n) * 100)}%`;
  $("rv-progress-text").textContent = `Stockfish is reviewing the game… move ${Math.ceil(i / 2)} of ${Math.ceil(n / 2)}`;
  markMove(i);
  if (!S.side.length && (S.ply === i || S.ply === i + 1)) { renderVerdict(); renderOverlay(); if (!S.live) renderEvalBar(); }
  if (stepDue) return;
  stepDue = true;
  setTimeout(() => { stepDue = false; renderGraph(); }, 200);
}

// ---------- the side panel: who, how well, the graph, the moves ----------

const RESULT = { "1-0": ["1", "0"], "0-1": ["0", "1"], "1/2-1/2": ["½", "½"] };

function nameOf(p) {
  return `${esc(p.name)}${p.rating ? ` <span class="rv-rating">${p.rating}</span>` : ""}`;
}

function renderPlayers() {
  const g = S.game;
  if (!g) return;
  const turn = curFen().split(" ")[1];
  const row = (color) => {
    const p = color === "w" ? g.white : g.black;
    const res = RESULT[g.result] ? RESULT[g.result][color === "w" ? 0 : 1] : "";
    return `<span class="rv-dot rv-dot-${color}"></span><span class="rv-player-name">${nameOf(p)}${g.me === color ? ' <span class="rv-you">you</span>' : ""}</span>`
      + `${res ? `<span class="rv-player-res">${res}</span>` : ""}<span class="rv-turn"${turn === color && !finishedEval(new Chess(curFen())) ? "" : " hidden"}>to move</span>`;
  };
  $("rv-player-top").innerHTML = row(S.flipped ? "w" : "b");
  $("rv-player-bottom").innerHTML = row(S.flipped ? "b" : "w");
}

function renderSummary() {
  const g = S.game;
  const title = $("rv-game-title"), acc = $("rv-acc"), prog = $("rv-progress");
  if (!g) { title.textContent = "No game yet"; acc.hidden = true; prog.hidden = true; $("rv-graph").hidden = true; return; }
  if (g.source === "position") {
    title.innerHTML = g.moves.length ? "Analysis board" : "A position <span class=\"rv-sub\">move the pieces to try things; ask the coach about any of it</span>";
  } else {
    const bits = [g.result !== "*" ? g.result : g.speed === "in progress" ? "in progress" : "", g.speed && g.speed !== "in progress" ? g.speed : "", g.endTime ? new Date(g.endTime).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "", g.opening]
      .filter(Boolean).map(esc).join(" · ");
    title.innerHTML = `${esc(g.white.name)} <span class="rv-vs">vs</span> ${esc(g.black.name)}<span class="rv-sub">${bits}${/^https:\/\//.test(g.url) ? ` · <a href="${esc(g.url)}" target="_blank" rel="noopener">original</a>` : ""}</span>`;
  }
  const n = g.moves.length;
  $("rv-graph").hidden = !n;
  prog.hidden = !n || g.reviewed;
  if (g.failed) { prog.hidden = false; $("rv-progress-text").textContent = "Stockfish couldn't finish reviewing this game."; }
  if (!g.reviewed || !n) { acc.hidden = true; return; }
  acc.hidden = false;
  const count = (color) => {
    const c = {};
    g.judged.forEach((j, i) => { if (j && g.moves[i - 1].color === color) c[j.mark] = (c[j.mark] || 0) + 1; });
    return ["blunder", "mistake", "inaccuracy"].map((k) => `<span class="rv-count rv-mk-${k}" title="${MARKS[k].label}">${MARKS[k].glyph} ${c[k] || 0}</span>`).join("");
  };
  const box = (color) => `<div class="rv-acc-box"><span class="rv-acc-who"><span class="rv-dot rv-dot-${color}"></span>${esc((color === "w" ? g.white : g.black).name)}</span>`
    + `<span class="rv-acc-num" title="Accuracy">${g.accuracy[color] === null ? "—" : g.accuracy[color].toFixed(1)}<small>%</small></span><span class="rv-acc-counts">${count(color)}</span></div>`;
  acc.innerHTML = box("w") + box("b");
}

function renderMoves() {
  const g = S.game, box = $("rv-moves");
  if (!g || !g.moves.length) { box.innerHTML = g ? "" : `<span class="rv-placeholder">Pick a game on the left, paste one, or set up a position.</span>`; return; }
  const out = [];
  g.moves.forEach((m, i) => {
    const f = m.before.split(" ");
    if (m.color === "w") out.push(`<span class="rv-mv-no">${f[5]}.</span>`);
    else if (i === 0) out.push(`<span class="rv-mv-no">${f[5]}.</span><span class="rv-mv rv-mv-gap">…</span>`);
    out.push(`<button type="button" class="rv-mv" data-ply="${i + 1}">${esc(m.san)}<span class="rv-mk"></span></button>`);
  });
  box.innerHTML = out.join("");
  g.judged.forEach((j, i) => { if (j) markMove(i); });
  markCurrentMove();
}

function markMove(i) {
  const g = S.game, j = g && g.judged[i];
  if (!j) return;
  const el = $("rv-moves").querySelector(`.rv-mv[data-ply="${i}"] .rv-mk`);
  if (!el) return;
  const show = ["inaccuracy", "mistake", "blunder"].includes(j.mark);
  el.textContent = show ? MARKS[j.mark].glyph : "";
  el.className = "rv-mk" + (show ? ` rv-mk-${j.mark}` : "");
  el.parentNode.title = `${MARKS[j.mark].label}${j.loss >= 2 ? ` (winning chances down ${Math.round(j.loss)} points)` : ""}`;
}

function markCurrentMove() {
  const box = $("rv-moves");
  box.querySelectorAll(".rv-mv.is-now").forEach((el) => el.classList.remove("is-now", "is-branch"));
  const el = box.querySelector(`.rv-mv[data-ply="${S.ply}"]`);
  if (!el) return;
  el.classList.add("is-now");
  el.classList.toggle("is-branch", Boolean(S.side.length));
  const top = el.offsetTop;                       // (the list is the offset parent)
  if (top < box.scrollTop || top + el.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top - box.clientHeight / 2;
}

function sideText() {
  if (!S.side.length) return "";
  return lineToSan(fenAt(S.game, S.ply), S.side.map((m) => m.uci)).text;
}

function renderSideline() {
  const el = $("rv-sideline");
  el.hidden = !S.side.length;
  if (S.side.length) el.innerHTML = `<span class="rv-sideline-tag">${S.game.moves.length ? "Side line" : "Your moves"}</span> ${esc(sideText())}`;
}

// What the engine made of the move that led here, in a sentence
function verdict() {
  const g = S.game;
  if (S.side.length || S.ply === 0 || !g) return null;
  const m = g.moves[S.ply - 1], j = g.judged[S.ply];
  const label = moveLabel(m.before, m.san);
  if (!j) return { label, text: `${label}`, mark: null };
  const before = g.evals[S.ply - 1], after = g.evals[S.ply];
  const bestSan = before.best ? lineToSan(m.before, [before.best], 1).sans[0] : "";
  const swing = `${evalText(before)} → ${evalText(after)}`;
  if (j.mark === "best") return { label, mark: j.mark, text: `${label} — the best move.`, why: `Why is ${label} the best move here?` };
  if (j.mark === "excellent" || j.mark === "good") return { label, mark: j.mark, text: `${label} — ${j.mark === "excellent" ? "an excellent move" : "a good move"}${bestSan && j.mark === "good" ? ` (Stockfish slightly preferred ${bestSan})` : ""}.`, why: `What is the idea behind ${label}?` };
  const noun = { inaccuracy: "an inaccuracy", mistake: "a mistake", blunder: "a blunder" }[j.mark];
  return { label, mark: j.mark, text: `${label}${MARKS[j.mark].nag} — ${noun} (${swing}).${bestSan ? ` Stockfish wanted ${bestSan}.` : ""}`, why: `Why is ${label} ${noun}${bestSan ? `, and why is ${bestSan} better` : ""}?` };
}

function renderVerdict() {
  const el = $("rv-verdict"), g = S.game;
  if (!g || S.editing) { el.innerHTML = ""; return; }
  if (S.side.length) {
    el.innerHTML = `<span class="rv-verdict-text">${g.moves.length ? "A side line — not what was played." : "Your own moves from the position."} Stockfish follows along below.</span>`;
    return;
  }
  const v = verdict();
  if (!v) {
    el.innerHTML = `<span class="rv-verdict-text">${g.moves.length ? "The start of the game. Step through with ◀ ▶ or the arrow keys, or move a piece to try something else." : "Move the pieces to try things. Stockfish follows along below."}</span>`;
    return;
  }
  el.innerHTML = `<span class="rv-verdict-text${v.mark ? ` rv-mk-${v.mark}` : ""}">${esc(v.text)}</span>`
    + (v.why && coachOn ? `<button type="button" class="rv-why" id="rv-why">Why?</button>` : "");
}

function renderGraph() {
  const canvas = $("rv-graph"), g = S.game;
  if (!g || !g.moves.length || canvas.hidden) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height, n = g.moves.length;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#2a1a12";
  ctx.fillRect(0, 0, w, h);
  const x = (i) => (i / n) * w;
  const y = (ev) => h - (winPct(ev) / 100) * h;
  // White's share, from the bottom
  let last = -1;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let i = 0; i <= n; i++) { if (!g.evals[i]) break; ctx.lineTo(x(i), y(g.evals[i])); last = i; }
  if (last >= 0) { ctx.lineTo(x(last), h); ctx.closePath(); ctx.fillStyle = "#e8d4a8"; ctx.fill(); }
  ctx.strokeStyle = "rgba(200, 122, 58, 0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  // the moves that cost something
  for (let i = 1; i <= last; i++) {
    const j = g.judged[i];
    if (!j || (j.mark !== "blunder" && j.mark !== "mistake")) continue;
    ctx.fillStyle = j.mark === "blunder" ? "#e5484d" : "#f08c2e";
    ctx.beginPath(); ctx.arc(x(i), y(g.evals[i]), 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#14080a"; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // where we are
  ctx.strokeStyle = "#b388ff";
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x(S.ply), 0); ctx.lineTo(x(S.ply), h); ctx.stroke();
}

// ---------- the list of games ----------

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    if (p && typeof p === "object") prefs = { source: p.source || "chesscom", users: p.users || {}, last: p.last || null };
  } catch { /* first visit */ }
}

function savePrefs() {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* storage full or blocked */ }
}

function note(text, bad = false) {
  const el = $("rv-list-note");
  el.textContent = text || "";
  el.classList.toggle("rv-note-error", Boolean(bad && text));
}

const SITE = { chesscom: "chess.com", lichess: "lichess" };

// The picker folds away under its heading once a game is on the board (a click on the heading brings it back)
function foldGames(fold) {
  $("rv-games").classList.toggle("is-folded", Boolean(fold));
  $("rv-games-toggle").setAttribute("aria-expanded", String(!fold));
}

function gamesNow() {
  const src = S.source;
  $("rv-games-now").textContent = SITE[src] ? `${SITE[src]}${prefs.users[src] ? " · " + prefs.users[src] : ""}` : src === "here" ? "played here" : "paste or set up";
}

function setSource(src) {
  S.source = src;
  prefs.source = src;
  savePrefs();
  document.querySelectorAll(".rv-source").forEach((b) => { const on = b.dataset.source === src; b.classList.toggle("active", on); b.setAttribute("aria-selected", String(on)); });
  const site = Boolean(SITE[src]);
  $("rv-user-form").hidden = !site;
  $("rv-paste-box").hidden = src !== "paste";
  note("");
  if (site) {
    $("rv-user").placeholder = `${SITE[src]} username`;
    $("rv-user").value = prefs.users[src] || "";
    if (!S.lists[src] && prefs.users[src]) fetchGames();
  }
  if (src === "here") {
    S.lists.here = Sources.wizardGames();
    if (!S.lists.here.length) note("No battles yet. Play one in Wizard Chess 3D and it shows up here.");
  }
  gamesNow();
  renderList();
}

async function fetchGames() {
  const src = S.source;
  const user = $("rv-user").value.trim();
  if (!user || !SITE[src]) return;
  prefs.users[src] = user;
  savePrefs();
  gamesNow();
  S.lists[src] = [];
  S.feeds[src] = null;
  renderList();
  note(`Asking ${SITE[src]} for ${user}'s games…`);
  $("rv-user-go").disabled = true;
  try {
    const feed = await (src === "chesscom" ? Sources.chessCom(user) : Sources.lichess(user));
    const games = await feed.more();
    if (S.source !== src) { S.feeds[src] = feed; S.lists[src] = games; return; }
    S.feeds[src] = feed;
    S.lists[src] = games;
    note(games.length ? "" : `${user} has no games on ${SITE[src]} yet.`);
  } catch (e) {
    S.lists[src] = null;
    if (S.source === src) note(e.message && !/Failed to fetch|NetworkError|aborted|Load failed/i.test(e.message) ? e.message : `Couldn't reach ${SITE[src]}. Check the connection and try again.`, true);
  } finally {
    $("rv-user-go").disabled = false;
    if (S.source === src) renderList();
  }
}

async function moreGames() {
  const src = S.source, feed = S.feeds[src];
  if (!feed || feed.done) return;
  const btn = $("rv-more");
  btn.disabled = true;
  btn.textContent = "Loading…";
  try {
    const games = await feed.more();
    S.lists[src] = (S.lists[src] || []).concat(games);
  } catch (e) {
    note(e.message || "Couldn't load more.", true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Older games";
    if (S.source === src) renderList();
  }
}

function renderList() {
  const box = $("rv-game-list");
  const list = S.lists[S.source] || [];
  const feed = S.feeds[S.source];
  $("rv-more").hidden = !(feed && !feed.done && list.length);
  box.innerHTML = list.map((e, i) => {
    const mine = e.me ? (e.result === "1/2-1/2" ? "draw" : e.result === "*" ? "live" : (e.result === "1-0") === (e.me === "w") ? "win" : "loss") : e.result === "*" ? "live" : "none";
    const foe = e.me === "w" ? e.black : e.white;
    const who = e.me ? `vs ${nameOf(foe)}` : `${nameOf(e.white)} – ${nameOf(e.black)}`;
    const opening = e.opening || openingFromUrl(pgnHeaders(e.pgn).ECOUrl);
    const meta = [e.me ? (e.me === "w" ? "White" : "Black") : e.result !== "*" ? e.result : "", e.speed, e.endTime ? new Date(e.endTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" }) : "", opening]
      .filter(Boolean).map(esc).join(" · ");
    const word = { win: "Won", loss: "Lost", draw: "Drew", live: "In progress", none: "" }[mine];
    return `<button type="button" class="rv-game${S.game && S.game.id === e.id ? " active" : ""}" data-i="${i}">`
      + `<span class="rv-res rv-res-${mine}" title="${word}"></span><span class="rv-game-who">${who}</span><span class="rv-game-meta">${meta}</span></button>`;
  }).join("");
}

function loadPasted() {
  const text = $("rv-paste").value.trim();
  if (!text) { note("Paste a game or a position first.", true); return; }
  note("");
  if (looksLikeFen(text)) {
    const r = readFen(text);
    if (r.error) { note(r.error, true); return; }
    S.lists.paste = [];
    renderList();
    prefs.last = { fen: r.fen };
    savePrefs();
    setGame(positionGame(r.fen));
    foldGames(true);
    return;
  }
  const games = splitPgn(text).map(entryFromPgn);
  if (!games.length) { note("I couldn't read that as a game or a position.", true); return; }
  S.lists.paste = games.length > 1 ? games : [];
  renderList();
  if (games.length > 1) note(`${games.length} games in that file — pick one.`);
  if (openEntry(games[0]) && games.length === 1) foldGames(true);
  renderList();
}

// ---------- setting up a position by hand ----------

const GLYPH = { wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙", bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟" };

function boardFromFen(fen) {
  const map = {};
  fen.split(" ")[0].split("/").forEach((row, r) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { f += +ch; continue; }
      map["abcdefgh"[f] + (8 - r)] = (ch === ch.toUpperCase() ? "w" : "b") + ch.toLowerCase();
      f++;
    }
  });
  return map;
}

function fenFromBoard(map, turn) {
  const rows = [];
  for (let r = 8; r >= 1; r--) {
    let row = "", gap = 0;
    for (const f of "abcdefgh") {
      const p = map[f + r];
      if (!p) { gap++; continue; }
      if (gap) { row += gap; gap = 0; }
      row += p[0] === "w" ? p[1].toUpperCase() : p[1];
    }
    rows.push(row + (gap || ""));
  }
  return `${rows.join("/")} ${turn} ${castlingFor(map)} - 0 1`;
}

function enterEditor() {
  if (S.editing) return;
  const fen = S.game ? curFen() : START_FEN;
  S.editing = { map: boardFromFen(fen), turn: fen.split(" ")[1], brush: "wp" };
  fg.cancel("live");
  board.disableMoveInput();
  board.removeMarkers(MARKER_LAST);
  board.enableSquareSelect(POINTER_EVENTS.pointerdown, (ev) => {
    const ed = S.editing;
    // (a click on a piece lands on its drawing, which doesn't carry the square: its group does)
    const at = ev.square ? null : ev.event && ev.event.target && ev.event.target.closest && ev.event.target.closest("[data-square]");
    const square = ev.square || (at && at.getAttribute("data-square"));
    if (!ed || !square) return;
    if (ed.brush === "x" || ed.map[square] === ed.brush) delete ed.map[square];
    else ed.map[square] = ed.brush;
    board.setPiece(square, ed.map[square] || null);
    $("rv-ed-note").textContent = "";
  });
  $("rv-editor").hidden = false;
  $("rv-nav").hidden = true;
  $("rv-palette").innerHTML = Object.keys(GLYPH).map((p) => `<button type="button" class="rv-brush rv-brush-${p[0]}" data-brush="${p}" title="${sideName(p[0])} ${p[1]}">${GLYPH[p]}</button>`).join("")
    + `<button type="button" class="rv-brush" data-brush="x" title="Take pieces off">✕</button>`;
  paintEditor();
  renderVerdict();
  renderOverlay();
  $("rv-lines").innerHTML = "";
  $("rv-engine-depth").textContent = "";
}

function paintEditor() {
  const ed = S.editing;
  $("rv-palette").querySelectorAll(".rv-brush").forEach((b) => b.classList.toggle("active", b.dataset.brush === ed.brush));
  $("rv-ed-turn").textContent = `${sideName(ed.turn)} to move`;
}

function leaveEditor(redraw = true) {
  if (!S.editing) return;
  S.editing = null;
  board.disableSquareSelect(POINTER_EVENTS.pointerdown);
  board.enableMoveInput(onInput);
  $("rv-editor").hidden = true;
  $("rv-nav").hidden = false;
  if (redraw && S.game) show(false);
}

function finishEditor() {
  const ed = S.editing;
  const r = checkPosition(fenFromBoard(ed.map, ed.turn));
  if (r.error) { $("rv-ed-note").textContent = r.error; return; }
  prefs.last = { fen: r.fen };
  savePrefs();
  setGame(positionGame(r.fen));
}

// ---------- the coach ----------

// Everything the coach needs to know about what's on the board (coach.js sends it with each question)
function snapshot() {
  const g = S.game;
  const fen = curFen();
  const stm = sideName(fen.split(" ")[1]);
  let where, played = "";
  const known = [];
  const v = verdict();
  if (S.side.length) {
    const from = S.ply > 0 ? `the game position after ${moveLabel(g.moves[S.ply - 1].before, g.moves[S.ply - 1].san)}` : g.moves.length ? "the start of the game" : "the position that was set up";
    where = `a side line the player is trying on the board - from ${from}, then ${sideText()}. These moves were not played in the game. ${stm} to move.`;
  } else if (S.ply === 0) {
    where = g.moves.length ? `the starting position of the game. ${stm} to move.` : `a position the player set up. ${stm} to move.`;
  } else {
    where = `the game after ${v.label}. ${stm} to move.`;
    const j = g.judged[S.ply];
    if (j) {
      const before = g.evals[S.ply - 1], m = g.moves[S.ply - 1];
      const bestSan = before.best ? lineToSan(m.before, [before.best], 1).text : "";
      if (before.best && before.pv.length > 1) known.push(lineToSan(m.before, [before.best], 1).sans[0]);
      where += `\nThe move just played, ${v.label}, was judged ${MARKS[j.mark].label === "best move" ? "the best move" : `${/^[aeiou]/.test(MARKS[j.mark].label) ? "an" : "a"} ${MARKS[j.mark].label}`}: the evaluation went from ${evalText(before)} to ${evalText(g.evals[S.ply])}.`
        + (j.mark !== "best" && bestSan ? ` Stockfish preferred ${bestSan}${before.pv.length > 1 ? `, continuing ${lineToSan(m.before, before.pv, 6).text}` : ""}.` : "");
    }
  }
  if (!S.side.length && S.ply < g.moves.length) {
    const nx = g.moves[S.ply], j = g.judged[S.ply + 1];
    played = `In the game, ${sideName(nx.color)} now played ${moveLabel(nx.before, nx.san)}${j ? ` (${MARKS[j.mark].label}; evaluation after it ${evalText(g.evals[S.ply + 1])})` : ""}.`;
  }
  const lm = lastMove();
  return {
    key: g.id, fen, where, played, game: gameText(g), complete: g.reviewed, live: S.live && S.live.fen === fen ? S.live : null,
    prev: lm ? lm.before : null, last: lm ? moveLabel(lm.before, lm.san) : "", lastSan: lm ? lm.san : "", known,
  };
}

// The whole game as text: who, the result, and every move with the engine's number after it
function gameText(g) {
  if (!g.moves.length) return null;
  const head = [`The game: ${g.white.name}${g.white.rating ? ` (${g.white.rating})` : ""} as White against ${g.black.name}${g.black.rating ? ` (${g.black.rating})` : ""} as Black.`];
  const facts = [g.result !== "*" ? `Result ${g.result}` : "Not finished", g.speed, g.opening && `Opening: ${g.opening}`, g.source !== "pasted" && `from ${g.source === "wizard" ? "this site's Wizard Chess" : g.source}`].filter(Boolean).join(". ");
  head.push(facts + ".");
  head.push(g.me ? `The player asking is ${g.me === "w" ? g.white.name : g.black.name}, who had ${sideName(g.me)}.` : "Which side the player asking had isn't known - ask if it matters.");
  const any = g.evals.some(Boolean);
  const parts = [];
  g.moves.forEach((m, i) => {
    const f = m.before.split(" ");
    const no = m.color === "w" ? `${f[5]}. ` : i === 0 ? `${f[5]}... ` : "";
    const j = g.judged[i + 1], ev = g.evals[i + 1];
    const bad = j && ["inaccuracy", "mistake", "blunder"].includes(j.mark);
    const best = bad && g.evals[i].best ? `; best was ${lineToSan(m.before, [g.evals[i].best], 1).sans[0]}` : "";
    parts.push(`${no}${m.san}${bad ? MARKS[j.mark].nag : ""}${ev ? ` (${evalText(ev)}${best})` : ""}`);
  });
  head.push(any
    ? `Moves, each with Stockfish's evaluation after it in pawns from White's point of view; ?! is an inaccuracy, ? a mistake, ?? a blunder${g.reviewed ? "" : " (the review is still running: later moves have no numbers yet)"}:`
    : "Moves (Stockfish hasn't reviewed the game yet):");
  head.push(parts.join(" "));
  if (g.reviewed && g.accuracy) head.push(`Accuracy: White ${g.accuracy.w ?? "-"}%, Black ${g.accuracy.b ?? "-"}%.`);
  if (g.startFen !== START_FEN) head.push(`The game started from this position: ${g.startFen}`);
  return head.join("\n");
}

// --- moves in an answer: each one a link that shows it on the board

const SAN = /(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][1-8](?:=[QRBN])?)[+#]?/g;
const A = "", B = "", C = "";         // marks round a move while the text is made into HTML

// Every move written in a reply: { at, end, san, run, i, no, color }. Moves written one after another
// ("10. Nxb5 cxb5 11. Bxb5+") are one run; no/color are the move number and side when the text gives them.
function movesIn(text) {
  const out = [];
  let m, run = -1;
  SAN.lastIndex = 0;
  while ((m = SAN.exec(text))) {
    const at = m.index, end = at + m[0].length;
    if (/[\w-]/.test(text[at - 1] || " ") || /[\w-]/.test(text[end] || " ")) continue;      // part of a word
    const prev = out[out.length - 1];
    const gap = prev ? text.slice(prev.end, at) : null;
    const follows = gap !== null && /^[\s,]*(?:\d+\s*\.(?:\s*\.\.)?\s*)?$/.test(gap) && !/,/.test(gap) && gap.length < 12;
    const num = text.slice(Math.max(0, at - 9), at).match(/(\d+)\s*\.(\s*\.\.|…)?\s*$/);
    const bare = /^[a-h][1-8]/.test(m[0]);
    if (bare && !num && !follows) continue;              // "the pawn on e5" is a square, not a move
    const t = { at, end, san: m[0], run: follows ? prev.run : ++run, i: follows ? prev.i + 1 : 0, no: null, color: null };
    if (num) { t.no = +num[1]; t.color = num[2] ? "b" : "w"; }
    else if (follows && prev.no) { t.no = prev.color === "w" ? prev.no : prev.no + 1; t.color = prev.color === "w" ? "b" : "w"; }
    out.push(t);
  }
  return out;
}

// A reply's words into safe HTML: paragraphs, **bold**, simple lists, and (links) its moves as buttons
function rich(text, links = false) {
  let src = text.trim();
  const moves = links ? movesIn(src) : [];
  for (let k = moves.length - 1; k >= 0; k--) src = `${src.slice(0, moves[k].at)}${A}${k}${B}${src.slice(moves[k].at, moves[k].end)}${C}${src.slice(moves[k].end)}`;
  const inline = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>").replace(/`([^`]+)`/g, "$1");
  const html = src.split(/\n{2,}/).map((block) => {
    const rows = block.split("\n");
    if (rows.every((r) => /^\s*([-*•]|\d+[.)])\s+/.test(r) && !/^\s*\d+\.\s*[KQRBNa-hO]/.test(r))) return `<ul>${rows.map((r) => `<li>${inline(r.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>`).join("")}</ul>`;
    return `<p>${rows.map((r) => inline(r.replace(/^#+\s*/, ""))).join("<br>")}</p>`;
  }).join("").replace(/(\d+)([^]*)/g, (m, k, san) => `<button type="button" class="rv-san" data-k="${k}" title="Show on the board">${san}</button>`);
  return links ? { html, moves } : html;
}

// A move clicked in an answer: find the position its line starts from and play it out there.
// The line is the run of moves up to the one clicked; it starts where the answer was asked about, or
// the position before (what "better was …" means), or wherever in the game its move number says.
function showMove(msg, k) {
  const moves = msg.__moves, base = msg.__base, g = S.game;
  if (!moves || !base || !g || g.id !== base.id || S.editing) return false;
  const t = moves[k];
  const line = moves.filter((x) => x.run === t.run && x.i <= t.i);
  const starts = [];
  for (let n = base.side.length; n >= 0; n--) starts.push({ ply: base.ply, side: base.side.slice(0, n) });
  for (let p = base.ply - 1; p >= 0; p--) starts.push({ ply: p, side: [] });
  for (let p = base.ply + 1; p <= g.moves.length; p++) starts.push({ ply: p, side: [] });
  const from = (st, toks) => {
    const c = new Chess(fenAt(g, st.ply));
    for (const u of st.side) if (!playUci(c, u)) return null;
    const f = c.fen().split(" ");
    if (toks[0].no && (+f[5] !== toks[0].no || f[1] !== toks[0].color)) return null;      // not where its number says
    const ucis = [];
    for (const x of toks) { const m = tryMove(c, x.san); if (!m) return null; ucis.push(m.from + m.to + (m.promotion || "")); }
    return ucis;
  };
  // the whole line first; failing that the one move, from the position asked about or the one before it
  for (const [toks, where] of [[line, starts], [[t], t.no ? starts : starts.slice(0, base.side.length + 2)]]) {
    for (const st of where) {
      const ucis = from(st, toks);
      if (!ucis) continue;
      S.ply = st.ply;
      S.side = [];
      play(st.side.concat(ucis), false);
      return true;
    }
  }
  return false;
}

function bubble(kind, html) {
  const chat = $("rv-chat");
  const el = document.createElement("div");
  el.className = `rv-msg rv-msg-${kind}`;
  el.innerHTML = html;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}

function coachState(text) {
  $("rv-coach-state").textContent = text || "";
}

// The Ask button is Stop while an answer is on its way
function askButton() {
  const b = $("rv-send"), busy = Boolean(coach && coach.busy);
  b.textContent = busy ? "Stop" : "Ask";
  b.title = busy ? "Stop this answer" : "Ask (Enter)";
  b.classList.toggle("is-stop", busy);
}

const onPhone = () => window.matchMedia("(max-width: 860px)").matches;

async function ask(question, { voice = false } = {}) {
  const q = String(question || "").trim();
  if (!q || !S.game || !coachOn) return;
  if (S.editing) { bubble("note", "Finish setting up the position first, then ask."); return; }
  Voice.hush();
  stopListening();
  const chat = $("rv-chat");
  if (coach.key !== null && coach.key !== S.game.id && chat.children.length) bubble("note", "— a new game —");
  const mine = bubble("you", esc(q));
  const el = bubble("coach is-waiting", `<span class="rv-wait"></span>`);
  const wait = el.querySelector(".rv-wait");
  const speak = voice || voiceMode ? Voice.speaker() : null;
  const base = { id: S.game.id, ply: S.ply, side: S.side.map((m) => m.uci) };     // what the answer's moves are about
  const t0 = performance.now();
  let text = "", first = 0;
  if (onPhone()) $("rv-coach").scrollIntoView({ block: "nearest", behavior: "smooth" });
  const asking = coach.ask(q, {
    voice: Boolean(speak),
    onStatus: (s) => { if (!text) wait.textContent = s; coachState(s); },
    onText: (d) => {
      if (!first) first = performance.now();
      text += d;
      el.classList.remove("is-waiting");
      el.innerHTML = rich(text);
      chat.scrollTop = chat.scrollHeight;
      if (speak) speak.add(d);
    },
  });
  askButton();
  renderChips();
  try {
    const answer = await asking;
    const done = rich(answer, true);
    el.classList.remove("is-waiting");
    el.innerHTML = done.html;
    el.__moves = done.moves;
    el.__base = base;
    if (speak) speak.end();
    // under it: how long it took (and why, on hover), and reading it aloud
    const secs = (ms) => (ms / 1000).toFixed(ms < 9950 ? 1 : 0) + " s";
    const last = coach.last;
    const foot = document.createElement("div");
    foot.className = "rv-msg-foot";
    foot.innerHTML = `<span class="rv-took" title="First words after ${secs(first - t0)}${last.ahead ? ` · ${last.ahead} Stockfish check${last.ahead > 1 ? "s" : ""} made before asking` : ""}${last.rounds ? ` · ${last.rounds} trip${last.rounds > 1 ? "s" : ""} back for more checks` : ""}">${secs(performance.now() - t0)}</span>`;
    if (Voice.canSpeak) {
      const again = document.createElement("button");
      again.type = "button";
      again.className = "rv-say";
      again.title = "Read this aloud";
      again.textContent = "🔊";
      again.addEventListener("click", () => { Voice.hush(); stopListening(); Voice.prime(); Voice.say(answer); });
      foot.appendChild(again);
    }
    el.appendChild(foot);
    timings.push({ q, first: Math.round(first - t0), total: Math.round(performance.now() - t0), rounds: last.rounds, ahead: last.ahead });
    quietTurns = 0;
  } catch (e) {
    if (e && e.name === "AbortError") {
      // stopped: as if it hadn't been asked, with the question back in the box to change
      el.remove();
      mine.remove();
      Voice.hush();
      const input = $("rv-question");
      if (!input.value) { input.value = q; growInput(); }
      return;
    }
    el.className = "rv-msg rv-msg-note rv-msg-error";
    el.textContent = e.message || "The coach couldn't answer just now.";
    if (speak) Voice.say(el.textContent);
  } finally {
    coachState("");
    askButton();
    chat.scrollTop = chat.scrollHeight;
    renderChips();
    follow();                                    // the coach's checks had the engine; back to the board
    if (voiceMode) Voice.whenQuiet(() => { if (voiceMode && !coach.busy) startListening(); });
  }
}

// The questions most often asked, one tap each: a short label, the full question behind it
function renderChips() {
  const box = $("rv-chips"), g = S.game;
  if (!g || !coachOn || S.editing || (coach && coach.busy)) { box.innerHTML = ""; return; }
  const qs = [];
  const v = verdict();
  if (v && v.why) qs.push([`Why ${v.label}?`, v.why, true]);
  if (!finishedEval(new Chess(curFen()))) {
    qs.push(["Best move?", "What's the best move here, and why?"]);
    qs.push(["Threats?", `What is ${sideName(curFen().split(" ")[1] === "w" ? "b" : "w")} threatening?`]);
    qs.push(["Plans?", "What are the plans for both sides?"]);
  }
  if (g.moves.length && g.reviewed && !S.side.length) qs.push(g.me ? ["Takeaways", "What should I take away from this game?"] : ["Turning point", "Where did this game turn?"]);
  box.innerHTML = qs.map(([label, q, lead]) => `<button type="button" class="rv-chip${lead ? " is-lead" : ""}" data-q="${esc(q)}" title="${esc(q)}">${esc(label)}</button>`).join("");
  box.scrollLeft = 0;
}

// The question box grows with what's typed, up to a few lines
function growInput() {
  const input = $("rv-question");
  input.style.height = "auto";
  input.style.height = Math.min(120, input.scrollHeight + 2) + "px";
}

// ---------- voice ----------

function stopListening() {
  if (listening) { const stop = listening; listening = null; stop(); }
  $("rv-mic").classList.remove("is-on");
}

function startListening() {
  if (listening || !Voice.canListen || !coachOn) return;
  Voice.hush();
  const input = $("rv-question");
  $("rv-mic").classList.add("is-on");
  coachState("Listening…");
  listening = Voice.listen({
    onHeard: (t) => { input.value = Voice.tidyHeard(t); growInput(); },
    onEnd: (finalText, error) => {
      listening = null;
      $("rv-mic").classList.remove("is-on");
      coachState("");
      const heard = Voice.tidyHeard(finalText);
      input.value = "";
      growInput();
      if (error) { bubble("note rv-msg-error", esc(error)); setVoiceMode(false); return; }
      if (heard) { ask(heard, { voice: true }); return; }
      // nothing said: in voice mode keep an ear open a couple of times, then rest
      if (voiceMode && ++quietTurns < 3) startListening();
      else if (voiceMode) { setVoiceMode(false); bubble("note", "Voice mode is resting. Tap 🎧 or the microphone to go on."); }
    },
  });
}

function setVoiceMode(on) {
  voiceMode = Boolean(on) && Voice.canListen;
  quietTurns = 0;
  const b = $("rv-voice-mode");
  b.classList.toggle("active", voiceMode);
  b.textContent = voiceMode ? "🎧 Voice: on" : "🎧 Voice";
  if (voiceMode) { if (!coach.busy) startListening(); } else { stopListening(); Voice.hush(); }
}

// ---------- wiring ----------

function wire() {
  document.querySelectorAll(".rv-source").forEach((b) => b.addEventListener("click", () => setSource(b.dataset.source)));
  $("rv-user-form").addEventListener("submit", (e) => { e.preventDefault(); fetchGames(); });
  $("rv-more").addEventListener("click", moreGames);
  $("rv-game-list").addEventListener("click", (e) => {
    const b = e.target.closest(".rv-game");
    if (!b) return;
    const entry = (S.lists[S.source] || [])[+b.dataset.i];
    if (entry && openEntry(entry)) { renderList(); foldGames(true); }
  });
  $("rv-games-toggle").addEventListener("click", () => foldGames(!$("rv-games").classList.contains("is-folded")));
  $("rv-paste-go").addEventListener("click", loadPasted);
  $("rv-setup-btn").addEventListener("click", () => { if (!S.game) setGame(positionGame(START_FEN)); enterEditor(); foldGames(true); });
  $("rv-fresh-btn").addEventListener("click", () => { prefs.last = { fen: START_FEN }; savePrefs(); setGame(positionGame(START_FEN)); renderList(); foldGames(true); });

  $("rv-first").addEventListener("click", () => goTo(0));
  $("rv-prev").addEventListener("click", () => step(-1));
  $("rv-next").addEventListener("click", () => step(1));
  $("rv-last").addEventListener("click", () => goTo(S.game ? S.game.moves.length : 0));
  $("rv-back").addEventListener("click", () => goTo(S.ply));
  $("rv-flip").addEventListener("click", flip);
  $("rv-moves").addEventListener("click", (e) => { const b = e.target.closest(".rv-mv[data-ply]"); if (b) goTo(+b.dataset.ply); });
  $("rv-graph").addEventListener("click", (e) => {
    if (!S.game) return;
    const r = e.currentTarget.getBoundingClientRect();
    goTo(Math.round(((e.clientX - r.left) / r.width) * S.game.moves.length));
  });
  $("rv-promo").addEventListener("click", (e) => { const b = e.target.closest("[data-promo]"); choosePromotion(b ? b.dataset.promo : null); });

  const lines = $("rv-lines");
  lines.addEventListener("click", (e) => {
    const b = e.target.closest(".rv-line-move");
    const line = b && b.closest(".rv-line");
    if (!line || !S.game || line.dataset.fen !== curFen()) return;
    play(line.dataset.pv.split(" ").slice(0, +b.dataset.upto));
  });
  lines.addEventListener("mouseover", (e) => { const l = e.target.closest(".rv-line[data-first]"); if (l) renderOverlay(l.dataset.first); });
  lines.addEventListener("mouseleave", () => renderOverlay());

  $("rv-palette").addEventListener("click", (e) => { const b = e.target.closest(".rv-brush"); if (b && S.editing) { S.editing.brush = b.dataset.brush; paintEditor(); } });
  $("rv-ed-turn").addEventListener("click", () => { S.editing.turn = S.editing.turn === "w" ? "b" : "w"; paintEditor(); });
  $("rv-ed-start").addEventListener("click", () => { S.editing.map = boardFromFen(START_FEN); S.editing.turn = "w"; board.setPosition(START_FEN); paintEditor(); });
  $("rv-ed-clear").addEventListener("click", () => { S.editing.map = {}; board.setPosition("8/8/8/8/8/8/8/8"); });
  $("rv-ed-done").addEventListener("click", finishEditor);
  $("rv-ed-cancel").addEventListener("click", () => leaveEditor());

  $("rv-ask").addEventListener("submit", (e) => {
    e.preventDefault();
    if (coach.busy) { coach.stop(); return; }            // the button reads Stop while an answer is coming
    const input = $("rv-question");
    const q = input.value;
    input.value = "";
    growInput();
    ask(q);
  });
  $("rv-question").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!coach.busy) $("rv-ask").requestSubmit(); }
  });
  $("rv-question").addEventListener("input", growInput);
  $("rv-chips").addEventListener("click", (e) => { const b = e.target.closest(".rv-chip"); if (b) ask(b.dataset.q); });
  $("rv-chat").addEventListener("click", (e) => {
    const b = e.target.closest(".rv-san");
    if (!b || b.classList.contains("is-off")) return;
    if (!showMove(b.closest(".rv-msg"), +b.dataset.k)) b.classList.add("is-off");          // nowhere it can be played: just text
    else if (onPhone()) $("rv-board-wrap").scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  $("rv-verdict").addEventListener("click", (e) => { if (e.target.id === "rv-why") { const v = verdict(); if (v && v.why) ask(v.why); } });
  $("rv-coach-new").addEventListener("click", () => { coach.reset(); Voice.hush(); $("rv-chat").innerHTML = ""; greet(); askButton(); renderChips(); });
  $("rv-mic").addEventListener("click", () => { Voice.prime(); if (listening) stopListening(); else { quietTurns = 0; startListening(); } });
  $("rv-voice-mode").addEventListener("click", () => { Voice.prime(); setVoiceMode(!voiceMode); });

  window.addEventListener("keydown", (e) => {
    if (!S.visible || !S.game || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || "")) return;
    if (e.key === "/" && coachOn) $("rv-question").focus();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "Home") goTo(0);
    else if (e.key === "End") goTo(S.game.moves.length);
    else if (e.key === "f" || e.key === "F") flip();
    else return;
    e.preventDefault();
  });
}

// Turn the board to match S.flipped. The board turns in its own time (after any moves it's still
// animating) and ignores a turn asked for meanwhile, so one turn at a time: when it's done, look again.
let turning = null;
function orient() {
  if (!board || turning) return;
  const want = S.flipped ? COLOR.black : COLOR.white;
  if (board.getOrientation() === want) return;
  const done = () => { turning = null; orient(); renderOverlay(); };
  turning = board.setOrientation(want).then(done, done);
}

function flip() {
  if (!board) return;
  S.flipped = !S.flipped;
  orient();
  renderPlayers();
  renderOverlay();
  renderEvalBar();
}

function greet() {
  if (coachOn === false) {
    bubble("note", "The coach is switched off on this copy of the site (it needs the site's AI key). Everything Stockfish does still works.");
  } else if (coachOn) {
    bubble("coach", `<p>Ask about whatever is on the board: why a move is good or bad, the best moves, what's threatened. Click a move in my answer to see it played.${Voice.canListen ? " 🎤 asks out loud; 🎧 is hands-free." : ""}</p>`);
  }
}

// ---------- in and out ----------

let started = false;

// Called by app.js the first time the tab opens (and never again)
export function initReview() {
  if (started) return api;
  started = true;
  loadPrefs();
  fg = new Engine();
  bg = new Engine();
  coach = new Coach({ engine: fg, snapshot });
  makeBoard();
  wire();
  $("rv-engine-name").textContent = ENGINE_NAME;

  const q = new URLSearchParams(window.location.search);
  const site = q.get("cc") ? "chesscom" : q.get("lichess") ? "lichess" : null;
  if (site) prefs.users[site] = (q.get("cc") || q.get("lichess")).trim().slice(0, 40);
  setSource(site || (["chesscom", "lichess", "here", "paste"].includes(prefs.source) ? prefs.source : "chesscom"));

  // what was on the board last time (or what the link asks for), else an empty analysis board
  let opened = false;
  if (q.get("fen")) { const r = readFen(q.get("fen")); if (!r.error) { setGame(positionGame(r.fen)); opened = true; } }
  if (!opened && q.get("pgn")) opened = openEntry(entryFromPgn(q.get("pgn")), { remember: false });
  if (!opened && prefs.last && prefs.last.pgn) opened = openEntry(prefs.last, { remember: false });
  if (!opened && prefs.last && prefs.last.fen) { const r = readFen(prefs.last.fen); if (!r.error) { setGame(positionGame(r.fen)); opened = true; } }
  foldGames(opened && S.game.moves.length > 0);          // a game on the board: the picker waits under its heading
  if (!opened) setGame(positionGame(START_FEN));
  renderList();

  $("rv-mic").hidden = true;
  coachAvailable().then((on) => {
    coachOn = on;
    $("rv-coach").classList.toggle("is-off", !on);
    $("rv-question").disabled = !on;
    $("rv-send").disabled = !on;
    $("rv-mic").hidden = !(on && Voice.canListen);
    $("rv-voice-mode").hidden = !(on && Voice.canListen);
    greet();
    renderVerdict();
    renderChips();
  });
  window.__chessReview = { S, play, goTo, ask, timings, engines: () => ({ fg, bg }), coach: () => coach };       // (for the test scripts)
  return api;
}

const api = {
  // the tab came into view / went out of it
  shown() {
    S.visible = true;
    if (S.game) follow();
  },
  hidden() {
    S.visible = false;
    if (fg) fg.cancel("live");
    stopListening();
    if (voiceMode) setVoiceMode(false);
    Voice.hush();
  },
  // a game handed over from Wizard Chess
  open(entry) {
    if (openEntry(entry)) {
      S.lists.here = Sources.wizardGames();
      if (S.source === "here") renderList();
      foldGames(true);
      goTo(S.game.moves.length);
    }
  },
};
