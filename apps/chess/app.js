import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.0.0-beta.6/+esm";
import {
  Chessboard,
  INPUT_EVENT_TYPE,
  COLOR,
  BORDER_TYPE
} from "https://cdn.jsdelivr.net/npm/cm-chessboard@8.7.6/src/Chessboard.js";
import { Markers, MARKER_TYPE } from "https://cdn.jsdelivr.net/npm/cm-chessboard@8.7.6/src/extensions/markers/Markers.js";
import { OPENINGS } from "./openings.js";

const ASSETS_URL = "https://cdn.jsdelivr.net/npm/cm-chessboard@8.7.6/assets/";
const STATS_KEY = "becknology-chess-stats-v1";

// custom marker types so we can recolor in CSS
const MARKER_HINT = { class: "marker-square-hint", slice: "markerSquare" };
const MARKER_LAST = { class: "marker-square", slice: "markerSquare" };
const MARKER_ERROR = { class: "marker-frame-error", slice: "markerFrame" };

const els = {
  list: document.getElementById("opening-list"),
  status: document.getElementById("status"),
  title: document.getElementById("opening-title"),
  desc: document.getElementById("opening-desc"),
  moves: document.getElementById("move-list"),
  hintBtn: document.getElementById("hint-btn"),
  resetBtn: document.getElementById("reset-btn"),
  stats: document.getElementById("stats"),
  board: document.getElementById("board")
};

let chess = new Chess();
let board = null;
let current = null;       // current opening
let moveIndex = 0;        // index into current.line of the next move to play
let errorCount = 0;
let hintsUsed = 0;
let busy = false;         // lock input during animations / computer moves
const stats = loadStats();

// ---------- init ----------

function init() {
  board = new Chessboard(els.board, {
    position: chess.fen(),
    assetsUrl: ASSETS_URL,
    style: {
      cssClass: "default autumn",
      borderType: BORDER_TYPE.frame,
      pieces: { file: "pieces/standard.svg" },
      animationDuration: 220
    },
    extensions: [{ class: Markers }]
  });

  renderOpeningList();
  renderStats();
  els.hintBtn.addEventListener("click", showHint);
  els.resetBtn.addEventListener("click", () => loadOpening(current));
}

// ---------- opening picker ----------

function renderOpeningList() {
  const whites = OPENINGS.filter(o => o.side === "white");
  const blacks = OPENINGS.filter(o => o.side === "black");

  els.list.innerHTML = "";
  appendSection("White repertoire", whites);
  appendSection("Black repertoire", blacks);
}

function appendSection(label, openings) {
  const heading = document.createElement("div");
  heading.className = "picker-section";
  heading.textContent = label;
  els.list.appendChild(heading);

  for (const op of openings) {
    const btn = document.createElement("button");
    btn.className = "opening-item";
    btn.dataset.id = op.id;
    if (stats[op.id]?.mastered) btn.classList.add("is-mastered");

    const left = document.createElement("span");
    left.textContent = op.name;

    const right = document.createElement("span");
    right.className = "eco";
    right.textContent = op.eco;

    const dot = document.createElement("span");
    dot.className = "mastered";
    dot.title = "Completed without errors";

    btn.append(left, right, dot);
    btn.addEventListener("click", () => loadOpening(op));
    els.list.appendChild(btn);
  }
}

// ---------- load + run a line ----------

function loadOpening(op) {
  if (!op) return;
  current = op;
  chess.reset();
  moveIndex = 0;
  errorCount = 0;
  hintsUsed = 0;
  busy = false;

  document.querySelectorAll(".opening-item").forEach(b => {
    b.classList.toggle("active", b.dataset.id === op.id);
  });

  els.title.textContent = op.name;
  els.desc.textContent = op.description;
  els.hintBtn.disabled = false;
  els.resetBtn.disabled = false;

  board.removeMarkers();
  board.setPosition(chess.fen(), false);

  // Orient the board so the player's side is at the bottom.
  board.setOrientation(op.side === "white" ? COLOR.white : COLOR.black);

  // Allow input only on the player's side.
  board.disableMoveInput();
  if (op.side === "black") {
    // computer plays White's first move, then we hand input to Black
    setStatus("Your opponent is thinking...", "");
    setTimeout(() => playOpponentMove(), 600);
  } else {
    enablePlayerInput();
    setStatus("Your move.", "");
  }

  renderMoveList();
}

function enablePlayerInput() {
  const color = current.side === "white" ? COLOR.white : COLOR.black;
  board.enableMoveInput(handleInput, color);
}

// ---------- input handler ----------

function handleInput(event) {
  if (busy) return false;

  if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
    return true; // allow picking up the piece
  }

  if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
    const expected = current.line[moveIndex];
    const tried = { from: event.squareFrom, to: event.squareTo, promotion: "q" };

    let result;
    try {
      result = chess.move(tried);
    } catch {
      result = null;
    }
    if (!result) return false; // illegal — bounce back, don't penalize

    if (result.san !== expected) {
      // Wrong opening move. Undo and flag.
      chess.undo();
      errorCount++;
      flashError(event.squareTo, expected);
      return false;
    }

    // Correct move.
    moveIndex++;
    board.removeMarkers(MARKER_HINT);
    board.removeMarkers(MARKER_LAST);
    board.addMarker(MARKER_LAST, event.squareFrom);
    board.addMarker(MARKER_LAST, event.squareTo);
    setStatus("Nicely played.", "success");
    renderMoveList();

    setTimeout(() => {
      if (isComplete()) {
        finishLine();
      } else {
        playOpponentMove();
      }
    }, 320);

    return true;
  }

  return true;
}

// ---------- opponent move ----------

function playOpponentMove() {
  if (isComplete()) {
    finishLine();
    return;
  }

  busy = true;
  board.disableMoveInput();
  setStatus("Your opponent is thinking...", "");

  // small think delay for vibe
  setTimeout(() => {
    const san = current.line[moveIndex];
    let move;
    try {
      move = chess.move(san);
    } catch {
      move = null;
    }
    if (!move) {
      console.error("Opening data error: illegal move", san, "at index", moveIndex, "in", current.id);
      setStatus("This line broke. Pick another?", "error");
      busy = false;
      return;
    }
    moveIndex++;

    board.removeMarkers(MARKER_LAST);
    board.setPosition(chess.fen(), true).then(() => {
      board.addMarker(MARKER_LAST, move.from);
      board.addMarker(MARKER_LAST, move.to);
      busy = false;

      if (isComplete()) {
        finishLine();
      } else {
        enablePlayerInput();
        setStatus("Your move.", "");
      }
      renderMoveList();
    });
  }, 500);
}

// ---------- helpers ----------

function isComplete() {
  return moveIndex >= current.line.length;
}

function finishLine() {
  board.disableMoveInput();
  const clean = errorCount === 0 && hintsUsed === 0;
  if (clean) {
    setStatus("Mastered. The fire crackles in approval.", "complete");
    stats[current.id] = { mastered: true, plays: (stats[current.id]?.plays || 0) + 1 };
  } else {
    setStatus(
      `Line complete — ${errorCount} miss${errorCount === 1 ? "" : "es"}, ${hintsUsed} hint${hintsUsed === 1 ? "" : "s"}.`,
      ""
    );
    stats[current.id] = {
      mastered: stats[current.id]?.mastered || false,
      plays: (stats[current.id]?.plays || 0) + 1
    };
  }
  saveStats();
  renderStats();
  renderOpeningList();
  // reactivate the active class which renderOpeningList wipes
  document.querySelectorAll(".opening-item").forEach(b => {
    b.classList.toggle("active", b.dataset.id === current.id);
  });

  // ---- Bridge progression ----
  if (typeof BridgeProgression !== "undefined") {
    // Base: 10 coins per completed line, +15 if clean (no errors, no hints)
    const coinsEarned = 10 + (clean ? 15 : 0);
    BridgeProgression.awardCoins(coinsEarned, "chess_line", {
      opening: current.id, clean, errors: errorCount, hints: hintsUsed
    });
    BridgeProgression.recordAchievement("first_light", 100, { game: "chess" });
    BridgeProgression.recordAchievement("bookworm", 50, { opening: current.id });
  }
}

function flashError(square, expectedSan) {
  board.addMarker(MARKER_ERROR, square);
  setStatus(`Not quite. Look again — try ${expectedSan}.`, "error");
  setTimeout(() => {
    board.removeMarkers(MARKER_ERROR);
    setStatus("Your move.", "");
  }, 1400);
}

function showHint() {
  if (!current || isComplete()) return;
  hintsUsed++;
  const expected = current.line[moveIndex];
  // Find the move's source square by simulating it
  const tmp = new Chess(chess.fen());
  let move;
  try {
    move = tmp.move(expected);
  } catch {
    move = null;
  }
  if (!move) return;
  board.removeMarkers(MARKER_HINT);
  board.addMarker(MARKER_HINT, move.from);
  setStatus(`Hint: move from ${move.from.toUpperCase()}.`, "");
  setTimeout(() => board.removeMarkers(MARKER_HINT), 2500);
}

function setStatus(text, kind) {
  els.status.textContent = text;
  els.status.className = "status" + (kind ? " " + kind : "");
}

// ---------- move list rendering ----------

function renderMoveList() {
  if (!current) {
    els.moves.innerHTML = `<span class="placeholder">Pick an opening from the left.</span>`;
    return;
  }

  const html = [];
  for (let i = 0; i < current.line.length; i++) {
    const moveNum = Math.floor(i / 2) + 1;
    const isWhitesMove = i % 2 === 0;

    if (isWhitesMove) {
      html.push(`<span class="move-num">${moveNum}.</span>`);
    }

    let cls = "move ";
    if (i < moveIndex) cls += "played";
    else if (i === moveIndex) cls += "next";
    else cls += "upcoming";

    html.push(`<span class="${cls}">${current.line[i]}</span>`);
  }
  els.moves.innerHTML = html.join("");
}

// ---------- stats ----------

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore quota
  }
}

function renderStats() {
  const masteredCount = Object.values(stats).filter(s => s.mastered).length;
  const total = OPENINGS.length;
  els.stats.innerHTML = `Mastered <span class="stat-num">${masteredCount}</span> / ${total}`;
}

// ---------- go ----------

renderMoveList();
init();
