// What the review board knows about chess beyond chess.js: reading games and positions in, turning
// engine numbers into "blunder" and "74% accuracy", and describing a position in words for the coach.
import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.0.0-beta.6/+esm";

export { Chess };

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const PIECE_NAME = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
export const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const SIDE = { w: "White", b: "Black" };
export const sideName = (c) => SIDE[c];

// ---------- evaluations ----------
// An evaluation is { cp, mate } from White's point of view; mate is null, or moves to mate (negative:
// Black mates; 0: the side to move is already mated, and cp's sign says who).

// White's winning chances, 0 to 100 (the curve lichess fits to real games)
export function winPct(ev) {
  if (!ev) return 50;
  if (ev.mate !== null && ev.mate !== undefined) return ev.cp > 0 ? 100 : 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * ev.cp)) - 1);
}

export function evalText(ev) {
  if (!ev) return "…";
  if (ev.mate !== null && ev.mate !== undefined) {
    if (ev.mate === 0) return ev.cp > 0 ? "1-0" : "0-1";
    return `${ev.mate < 0 ? "-" : ""}M${Math.abs(ev.mate)}`;
  }
  const p = ev.cp / 100;
  return (p > 0 ? "+" : "") + p.toFixed(Math.abs(p) >= 10 ? 0 : 1).replace(/^-0\.0$/, "0.0");
}

// The evaluation of a position where the game is over, or null if it isn't
export function finishedEval(chess) {
  if (chess.isCheckmate()) return { cp: chess.turn() === "w" ? -100000 : 100000, mate: 0, over: "mate" };
  if (chess.isDraw() || chess.isStalemate()) return { cp: 0, mate: null, over: "draw" };
  return null;
}

// ---------- judging a move ----------
// How good a move was, from the engine's evaluation before it (with best play) and after it.

export const MARKS = {
  best: { label: "best move", glyph: "★", nag: "" },
  excellent: { label: "excellent", glyph: "✓", nag: "" },
  good: { label: "good", glyph: "", nag: "" },
  inaccuracy: { label: "inaccuracy", glyph: "?!", nag: "?!" },
  mistake: { label: "mistake", glyph: "?", nag: "?" },
  blunder: { label: "blunder", glyph: "??", nag: "??" },
};

export function judgeMove(color, before, after, playedUci, bestUci) {
  const side = (ev) => (color === "w" ? winPct(ev) : 100 - winPct(ev));
  const loss = Math.max(0, side(before) - side(after));
  const accuracy = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669 + 1));
  let mark;
  if (bestUci && playedUci === bestUci) mark = "best";
  else if (loss < 2) mark = "excellent";
  else if (loss < 5) mark = "good";
  else if (loss < 10) mark = "inaccuracy";
  else if (loss < 20) mark = "mistake";
  else mark = "blunder";
  // letting a forced mate go is never just "good", whatever the winning chances still say
  if (before.mate && Math.sign(before.mate) === (color === "w" ? 1 : -1) && !(after.mate !== null && Math.sign(after.cp) === Math.sign(before.cp)) && mark !== "best") {
    if (loss < 10) mark = "inaccuracy";
  }
  return { loss, accuracy, mark };
}

// One number for a side's whole game: between the plain average of its moves and the harmonic one
// (which a few terrible moves pull down hard), as lichess does it
export function gameAccuracy(list) {
  if (!list.length) return null;
  const mean = list.reduce((a, b) => a + b, 0) / list.length;
  const harmonic = list.length / list.reduce((a, b) => a + 1 / Math.max(b, 1), 0);
  return Math.round(((mean + harmonic) / 2) * 10) / 10;
}

// ---------- reading moves ----------

// A move as someone might write or say it: SAN, from-to squares, with move numbers or marks attached
export function tryMove(chess, text) {
  let s = String(text || "").trim().replace(/^\d+\s*\.+\s*/, "").replace(/[!?]+$/g, "").replace(/\s+/g, "");
  if (!s) return null;
  s = s.replace(/^0-0-0/, "O-O-O").replace(/^0-0/, "O-O").replace(/^o-o-o/i, "O-O-O").replace(/^o-o/i, "O-O");
  const uci = s.toLowerCase().match(/^([a-h][1-8])-?([a-h][1-8])=?([qrbn])?$/);
  const attempts = [];
  if (uci) attempts.push({ from: uci[1], to: uci[2], promotion: uci[3] || "q" });
  attempts.push(s);
  if (/^[kqrbn][a-h1-8x]/.test(s) && !/^b[1-8x]/.test(s)) attempts.push(s[0].toUpperCase() + s.slice(1));
  for (const a of attempts) {
    try {
      const m = chess.move(a);
      if (m) return m;
    } catch { /* not that one */ }
  }
  return null;
}

// a from-to move ('e7e8q') played on a position; null if it isn't legal
export function playUci(chess, uci) {
  try {
    return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
  } catch {
    return null;
  }
}

// An engine line (from-to moves) written out in SAN with move numbers: "14. Rd1 Qc7 15. Nb5"
export function lineToSan(fen, uciMoves, max = 99) {
  const c = new Chess(fen);
  const out = [];
  const sans = [];
  let first = true;
  for (const u of uciMoves.slice(0, max)) {
    const no = c.moveNumber();
    const white = c.turn() === "w";
    const m = playUci(c, u);
    if (!m) break;
    sans.push(m.san);
    out.push(white ? `${no}. ${m.san}` : first ? `${no}...${m.san}` : m.san);
    first = false;
  }
  return { text: out.join(" "), sans, fen: c.fen() };
}

export function moveLabel(fenBefore, san) {
  const p = fenBefore.split(" ");
  return `${p[5]}${p[1] === "w" ? ". " : "..."}${san}`;
}

// ---------- reading games and positions ----------

const FEN_BOARD = /^\s*((?:[pnbrqkPNBRQK1-8]{1,8}\/){7}[pnbrqkPNBRQK1-8]{1,8})(?:\s+([wb])(?:\s+([KQkq]{1,4}|-)(?:\s+([a-h][36]|-)(?:\s+(\d+)(?:\s+(\d+))?)?)?)?)?\s*$/;

export function looksLikeFen(text) {
  return FEN_BOARD.test(String(text || ""));
}

// A FEN as pasted (the last fields may be missing) made whole and checked. { fen } or { error }
export function readFen(text) {
  const m = String(text || "").match(FEN_BOARD);
  if (!m) return { error: "That isn't a position (FEN) I can read." };
  return checkPosition(`${m[1]} ${m[2] || "w"} ${m[3] || "-"} ${m[4] || "-"} ${m[5] || "0"} ${m[6] || "1"}`);
}

// Is this a position a game could be played from? chess.js takes almost anything; the engine doesn't.
export function checkPosition(fen) {
  const rows = fen.split(" ")[0].split("/");
  const count = (ch) => (fen.split(" ")[0].match(new RegExp(ch, "g")) || []).length;
  if (rows.some((r) => [...r].reduce((n, ch) => n + (/\d/.test(ch) ? +ch : 1), 0) !== 8)) return { error: "Each rank needs eight squares." };
  if (count("K") !== 1 || count("k") !== 1) return { error: "Each side needs exactly one king." };
  if (/[pP]/.test(rows[0]) || /[pP]/.test(rows[7])) return { error: "Pawns can't stand on the first or last rank." };
  let c;
  try { c = new Chess(fen); } catch (e) { return { error: "That position isn't legal." }; }
  // the side that just moved can't have left its own king in check
  const p = fen.split(" ");
  try {
    const other = new Chess(`${p[0]} ${p[1] === "w" ? "b" : "w"} - - 0 1`);
    if (other.inCheck()) return { error: `${SIDE[p[1]]} is to move, but ${SIDE[p[1] === "w" ? "b" : "w"]}'s king is in check. Switch who's to move.` };
  } catch { /* can't tell */ }
  return { fen: c.fen() };
}

// The castling rights a set-up position can still have: king and rook on their own squares
export function castlingFor(board) {
  const at = (sq) => board[sq] || "";
  let s = "";
  if (at("e1") === "wk" && at("h1") === "wr") s += "K";
  if (at("e1") === "wk" && at("a1") === "wr") s += "Q";
  if (at("e8") === "bk" && at("h8") === "br") s += "k";
  if (at("e8") === "bk" && at("a8") === "br") s += "q";
  return s || "-";
}

// A pasted file of games, one string each
export function splitPgn(text) {
  const t = String(text || "").replace(/\r/g, "").trim();
  if (!t) return [];
  const parts = t.split(/\n\s*\n(?=\[Event )/);
  return parts.map((s) => s.trim()).filter(Boolean);
}

export function pgnHeaders(pgn) {
  const h = {};
  const re = /^\s*\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm;
  let m;
  while ((m = re.exec(pgn))) h[m[1]] = m[2].replace(/\\(.)/g, "$1");
  return h;
}

// Movetext with nothing but moves: no comments, clock times, side lines, marks or result
function bareMoves(pgn) {
  let s = pgn.replace(/^\s*\[.*\]\s*$/gm, " ").replace(/\{[^}]*\}/g, " ").replace(/;[^\n]*/g, " ");
  for (let i = 0; i < 12 && /\([^()]*\)/.test(s); i++) s = s.replace(/\([^()]*\)/g, " ");
  return s.replace(/\$\d+/g, " ").replace(/\d+\.(\.\.)?/g, " ").replace(/\.\.\./g, " ")
    .replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, " ").split(/\s+/).filter(Boolean);
}

// A game from PGN: its headers and every move with the position before and after it.
// { headers, startFen, moves: [{ san, uci, from, to, color, piece, captured, before, after }] } or { error }
export function readPgn(pgn) {
  const headers = pgnHeaders(pgn);
  let startFen = START_FEN;
  if (headers.FEN) {
    const r = readFen(headers.FEN);
    if (r.error) return { error: `This game starts from a position I can't read. ${r.error}` };
    startFen = r.fen;
  }
  if (headers.Variant && !/^(standard|chess|from position)$/i.test(headers.Variant)) {
    return { error: `This is a ${headers.Variant} game — the board only knows standard chess.` };
  }
  const c = new Chess(startFen);
  const moves = [];
  for (const tok of bareMoves(pgn)) {
    const m = tryMove(c, tok);
    if (!m) {
      if (!moves.length) return { error: "I couldn't read any moves in that." };
      return { headers, startFen, moves, warning: `Stopped at "${tok}" (move ${Math.floor(moves.length / 2) + 1}): it isn't legal there.` };
    }
    moves.push(pickMove(m));
  }
  if (!moves.length && !headers.FEN) return { error: "I couldn't read any moves in that." };
  return { headers, startFen, moves };
}

export function pickMove(m) {
  return {
    san: m.san, uci: m.from + m.to + (m.promotion || ""), from: m.from, to: m.to, color: m.color,
    piece: m.piece, captured: m.captured || null, promotion: m.promotion || null, before: m.before, after: m.after,
  };
}

// chess.com names the opening in a link: …/openings/Sicilian-Defense-Najdorf-Variation-6.Be2
export function openingFromUrl(url) {
  const m = String(url || "").match(/\/openings\/([^?#]+)/);
  if (!m) return "";
  return decodeURIComponent(m[1]).replace(/-/g, " ").replace(/\s+\d+\..*$/, "").trim();
}

// ---------- describing a position ----------

function boardMap(chess) {
  const map = {};
  chess.board().forEach((row) => row.forEach((p) => { if (p) map[p.square] = p; }));
  return map;
}

const FILES = "abcdefgh";
const sq = (f, r) => (f >= 0 && f < 8 && r >= 0 && r < 8 ? FILES[f] + (r + 1) : null);
const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Every piece of `by` that attacks `square` right now (pins and all; no x-rays)
export function attackers(map, square, by) {
  const f = FILES.indexOf(square[0]);
  const r = +square[1] - 1;
  const out = [];
  const is = (s, types) => { const p = s && map[s]; if (p && p.color === by && types.includes(p.type)) out.push(p); };
  KNIGHT.forEach(([df, dr]) => is(sq(f + df, r + dr), "n"));
  KING.forEach(([df, dr]) => is(sq(f + df, r + dr), "k"));
  const pr = by === "w" ? r - 1 : r + 1;                 // a pawn attacks from the rank behind, its side
  is(sq(f - 1, pr), "p");
  is(sq(f + 1, pr), "p");
  const ray = (dirs, types) => dirs.forEach(([df, dr]) => {
    for (let i = 1; i < 8; i++) {
      const s = sq(f + df * i, r + dr * i);
      if (!s) break;
      if (map[s]) { is(s, types); break; }
    }
  });
  ray(DIAG, "bq");
  ray(ORTH, "rq");
  return out;
}

const pieceAt = (p) => (p.type === "p" ? p.square : p.type.toUpperCase() + p.square);
const ORDER = "kqrbnp";

// The position in words, for a reader who can't see the board and miscounts when decoding a FEN
export function describePosition(fen) {
  const c = new Chess(fen);
  const map = boardMap(c);
  const all = Object.values(map);
  const lines = [];
  for (const color of ["w", "b"]) {
    const mine = all.filter((p) => p.color === color).sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type) || a.square.localeCompare(b.square));
    const pieces = mine.filter((p) => p.type !== "p").map(pieceAt).join(" ");
    const pawns = mine.filter((p) => p.type === "p").map((p) => p.square).join(" ");
    lines.push(`${SIDE[color]}: ${pieces}${pawns ? `, pawns ${pawns}` : ", no pawns"}`);
  }
  const mat = (color) => all.filter((p) => p.color === color).reduce((n, p) => n + PIECE_VALUE[p.type], 0);
  const w = mat("w"), b = mat("b");
  lines.push(`Material (pawn 1, knight/bishop 3, rook 5, queen 9): White ${w}, Black ${b}${w === b ? " - level" : ` - ${w > b ? "White" : "Black"} is up ${Math.abs(w - b)}`}.`);

  const loose = [];
  for (const p of all) {
    if (p.type === "k") continue;
    const foe = p.color === "w" ? "b" : "w";
    const att = attackers(map, p.square, foe);
    if (!att.length) continue;
    const def = attackers(map, p.square, p.color);
    const cheapest = att.reduce((a, x) => (PIECE_VALUE[x.type] < PIECE_VALUE[a.type] ? x : a), att[0]);
    const by = att.map(pieceAt).join(", ");
    const who = `${SIDE[p.color]}'s ${PIECE_NAME[p.type]} on ${p.square}`;
    if (!def.length) loose.push(`${who} is attacked (by ${by}) and not defended.`);
    else if (cheapest.type !== "k" && PIECE_VALUE[cheapest.type] < PIECE_VALUE[p.type]) loose.push(`${who} is attacked by a less valuable piece (${pieceAt(cheapest)}).`);
    else if (att.length > def.length) loose.push(`${who} is attacked ${att.length} times (${by}) and defended ${def.length}.`);
  }
  if (loose.length) lines.push("Pieces under fire: " + loose.join(" "));

  const turn = c.turn();
  if (c.isCheckmate()) lines.push(`${SIDE[turn]} is checkmated.`);
  else if (c.isStalemate()) lines.push(`${SIDE[turn]} is stalemated - a draw.`);
  else if (c.isDraw()) lines.push("The position is a draw.");
  else lines.push(`${SIDE[turn]} to move${c.inCheck() ? ", and in check" : ""}.`);
  const rights = fen.split(" ")[2];
  if (rights && rights !== "-") {
    const can = [];
    if (/[KQ]/.test(rights)) can.push(`White ${[/K/.test(rights) && "kingside", /Q/.test(rights) && "queenside"].filter(Boolean).join(" and ")}`);
    if (/[kq]/.test(rights)) can.push(`Black ${[/k/.test(rights) && "kingside", /q/.test(rights) && "queenside"].filter(Boolean).join(" and ")}`);
    lines.push(`Castling still allowed: ${can.join("; ")}.`);
  }
  return lines.join("\n");
}

// The same position with the turn handed back: what would the side that just moved do next?
// null when the side to move is in check (there's no passing then).
export function passedFen(fen) {
  const c = new Chess(fen);
  if (c.inCheck() || c.isGameOver()) return null;
  const p = fen.split(" ");
  const flipped = `${p[0]} ${p[1] === "w" ? "b" : "w"} ${p[2]} - 0 ${p[5] || 1}`;
  try { new Chess(flipped); } catch { return null; }
  return flipped;
}

// The legal moves of the piece a mistaken move was probably about ("Nxe5" → what the knights can do)
export function legalHints(chess, text) {
  const all = chess.moves();
  const first = String(text || "").trim()[0] || "";
  const same = /[KQRBN]/.test(first) ? all.filter((m) => m[0] === first) : /[a-h]/.test(first) ? all.filter((m) => /^[a-h]/.test(m)) : [];
  return (same.length ? same : all).slice(0, 24);
}
