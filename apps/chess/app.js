import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.0.0-beta.6/+esm";
import {
  Chessboard,
  INPUT_EVENT_TYPE,
  COLOR,
  BORDER_TYPE
} from "https://cdn.jsdelivr.net/npm/cm-chessboard@8.7.6/src/Chessboard.js";
import { Markers } from "https://cdn.jsdelivr.net/npm/cm-chessboard@8.7.6/src/extensions/markers/Markers.js";
import { OPENINGS } from "./openings.js";
import {
  WizardChess3D,
  WIZARD_THEMES,
  DIFFICULTY_TIERS,
  readChessDaily,
  payChessCoins
} from "./wizard-chess.js";

// The module graph loaded (three.js, chess.js): the boot watchdog in index.html can stand down
window.__wizardChessBooted = true;

const ASSETS_URL = "https://cdn.jsdelivr.net/npm/cm-chessboard@8.7.6/assets/";
const STATS_KEY = "becknology-chess-stats-v1";
// The Wizard Chess game in progress, so closing the Bridge's modal and coming back resumes it
const SAVE_KEY = "becknology-chess-wizard-save-v1";

const IN_FRAME = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

// Another pilot over the wire (the Bridge's js/together.js, through js/shared/together-frame.js): null otherwise
const TF = window.BridgeTogetherFrame || null;
let netOver = false; // the together game has been decided
let netEscAt = 0;

// ?theme= picks the board for where the game was opened (the Bridge opens /chess?theme=ship)
const URL_THEME = (new URLSearchParams(window.location.search).get("theme") || "").toLowerCase();
const LAUNCH_THEME = WIZARD_THEMES[URL_THEME] ? URL_THEME : "classic";

const WIZARD_SUBTITLES = {
  classic: "Carved stone and obsidian sentinels clash by hearthfire. Drag to orbit, click a piece to command.",
  ship: "Boxwood and walnut on the captain's chart table, by lantern light. Drag to orbit, click a piece to command."
};

// custom marker types so we can recolor in CSS
const MARKER_HINT = { class: "marker-square-hint", slice: "markerSquare" };
const MARKER_LAST = { class: "marker-square", slice: "markerSquare" };
const MARKER_ERROR = { class: "marker-frame-error", slice: "markerFrame" };

const PIECE_GLYPHS = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
  k: "♚"
};

const els = {
  // Mode tabs & views
  tabWizard: document.getElementById("tab-wizard"),
  tabTrainer: document.getElementById("tab-trainer"),
  viewWizard: document.getElementById("view-wizard"),
  viewTrainer: document.getElementById("view-trainer"),
  pageTitle: document.getElementById("page-title"),
  pageSubtitle: document.getElementById("page-subtitle"),

  // Wizard Chess 3D elements
  wizardStage: document.getElementById("wizard-stage"),
  wizardStatus: document.getElementById("wizard-status"),
  wizardMoves: document.getElementById("wizard-moves"),
  capByWhite: document.getElementById("cap-by-white"),
  capByBlack: document.getElementById("cap-by-black"),
  wcMode: document.getElementById("wc-mode"),
  wcDifficulty: document.getElementById("wc-difficulty"),
  wcDiffGroup: document.getElementById("wc-difficulty-group"),
  wcSideGroup: document.getElementById("wc-side-group"),
  wcNewBtn: document.getElementById("wc-new-btn"),
  wcUndoBtn: document.getElementById("wc-undo-btn"),
  wcReviewBtn: document.getElementById("wc-review-btn"),
  wcBattleCamBtn: document.getElementById("wc-battlecam-btn"),
  wcAudioBtn: document.getElementById("wc-audio-btn"),
  wcEngineBadge: document.getElementById("wc-engine-badge"),
  wcEvalWhite: document.getElementById("wc-eval-white"),
  wcEvalScore: document.getElementById("wc-eval-score"),
  wcDuelBanner: document.getElementById("wc-duel-banner"),
  wcDuelBannerText: document.getElementById("wc-duel-banner-text"),
  wcReviewPill: document.getElementById("wc-review-pill"),
  wcReviewPanel: document.getElementById("wc-review-panel"),
  wcAccW: document.getElementById("wc-acc-w"),
  wcAccB: document.getElementById("wc-acc-b"),
  wcClassCounts: document.getElementById("wc-class-counts"),
  wcEvalChart: document.getElementById("wc-eval-chart"),
  wcCoachNote: document.getElementById("wc-coach-note"),
  wcRevFirst: document.getElementById("wc-rev-first"),
  wcRevPrev: document.getElementById("wc-rev-prev"),
  wcRevNext: document.getElementById("wc-rev-next"),
  wcRevLast: document.getElementById("wc-rev-last"),
  wcRevExit: document.getElementById("wc-rev-exit"),
  wcTheaterBtn: document.getElementById("wc-theater-btn"),
  wcStageThemeBtn: document.getElementById("wc-stage-theme-btn"),
  wcStageCamBtn: document.getElementById("wc-stage-cam-btn"),
  wcStageUndoBtn: document.getElementById("wc-stage-undo-btn"),
  wcStageReviewBtn: document.getElementById("wc-stage-review-btn"),
  wcTheme: document.getElementById("wc-theme"),
  promoModal: document.getElementById("promo-modal"),
  wcSpoils: document.getElementById("wc-spoils"),
  wcRewardNote: document.getElementById("wc-reward-note"),
  wcOverlay: document.getElementById("wc-stage-overlay"),
  wcLoading: document.getElementById("wc-loading"),
  wcLoadingTitle: document.getElementById("wc-loading-title"),
  wcLoadingDetail: document.getElementById("wc-loading-detail"),
  wcLoadingEngine: document.getElementById("wc-loading-engine"),
  wcProgressBar: document.getElementById("wc-progress-bar"),
  wcResume: document.getElementById("wc-resume"),
  wcResumeDetail: document.getElementById("wc-resume-detail"),
  wcResumeBtn: document.getElementById("wc-resume-btn"),
  wcResumeNewBtn: document.getElementById("wc-resume-new-btn"),

  // Opening Trainer elements
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

let wizardGame = null;
let pendingPromoCallback = null;
let currentReviewPly = 0;
let lastWizardState = null;
let isTheaterMode = false;
let userExitedTheater = false;
const CAM_CYCLE = ["white", "cinematic", "top", "black"];
let camCycleIdx = 0;
const THEME_CYCLE = ["classic", "ship", "lumar", "arcadia", "enigma", "singularity"];
let themeCycleIdx = Math.max(0, THEME_CYCLE.indexOf(LAUNCH_THEME));
let assetsLoaded = false; // the sculpted pieces arrived (or we gave up waiting)
let resumePending = null; // a saved game offered to the player, not yet resumed or dismissed

let chess = new Chess();
let board = null;
let trainerInitialized = false;
let current = null;       // current opening
let moveIndex = 0;        // index into current.line of the next move to play
let errorCount = 0;
let hintsUsed = 0;
let busy = false;         // lock input during animations / computer moves
const stats = loadStats();

// ---------- Mode Tabs ----------

function setupTabs() {
  els.tabWizard.addEventListener("click", () => switchTab("wizard"));
  els.tabTrainer.addEventListener("click", () => switchTab("trainer"));
}

function switchTab(tab) {
  const isWizard = tab === "wizard";
  if (!isWizard && isTheaterMode) {
    setTheaterMode(false);
  }
  els.tabWizard.classList.toggle("active", isWizard);
  els.tabWizard.setAttribute("aria-selected", String(isWizard));
  els.tabTrainer.classList.toggle("active", !isWizard);
  els.tabTrainer.setAttribute("aria-selected", String(!isWizard));

  els.viewWizard.hidden = !isWizard;
  els.viewTrainer.hidden = isWizard;

  if (isWizard) {
    els.pageTitle.textContent = "Wizard Chess 3D";
    els.pageSubtitle.textContent = wizardSubtitle();
    if (wizardGame) {
      wizardGame.activeTab = true;
      wizardGame.onResize();
    }
  } else {
    els.pageTitle.textContent = "Chess Opening Trainer";
    els.pageSubtitle.textContent = "Practice your prep by the fire.";
    if (wizardGame) wizardGame.activeTab = false;
    if (!trainerInitialized) {
      initTrainer();
    }
  }
}

function setTheaterMode(enabled, manual = false) {
  isTheaterMode = Boolean(enabled);
  if (manual && !isTheaterMode) {
    userExitedTheater = true;
  } else if (manual && isTheaterMode) {
    userExitedTheater = false;
  }
  document.body.classList.toggle("wizard-theater", isTheaterMode);
  // Inside the Bridge's modal, Esc leaves full screen first; the next Esc closes the modal
  // (progression.js asks the Bridge to close unless the page owns Esc)
  if (IN_FRAME) window.__bridgeOwnsEsc = isTheaterMode || (TF && !netOver);
  if (!isTheaterMode) {
    document.body.classList.remove("theater-drawer-open");
  }
  if (els.wcTheaterBtn) {
    els.wcTheaterBtn.textContent = isTheaterMode ? "⤢ Half Screen (Esc)" : "⛶ Full Screen";
  }
  if (wizardGame) {
    requestAnimationFrame(() => wizardGame.onResize());
    setTimeout(() => wizardGame.onResize(), 260);
  }
}

// ---------- Wizard Chess 3D Setup ----------

function initWizardChess() {
  wizardGame = new WizardChess3D(els.wizardStage, {
    onStateChange: renderWizardState,
    onReward: () => {
      renderRewardInfo();
      saveWizardGame();
    },
    onAssetProgress: showAssetProgress,
    onAssetsReady: finishAssetLoading,
    onEvalUpdate: updateEvalBar,
    onBattleStart: () => {
      if (!isTheaterMode && !userExitedTheater) {
        setTheaterMode(true);
      }
    },
    onDuelBanner: (text) => {
      if (!els.wcDuelBanner) return;
      if (text) {
        els.wcDuelBannerText.textContent = text;
        els.wcDuelBanner.hidden = false;
      } else {
        els.wcDuelBanner.hidden = true;
      }
    },
    onEngineStatus: showEngineStatus,
    onNetMove: (uci) => {
      if (TF) TF.send("mv", { uci, ply: wizardGame ? wizardGame.timeline.length : 0 });
    },
    onPromotionPrompt: (cb) => {
      pendingPromoCallback = cb;
      els.promoModal.hidden = false;
    }
  }, { theme: LAUNCH_THEME });
  reflectTheme(wizardGame.currentTheme);
  renderRewardInfo();
  if (!assetsLoaded) {
    // (clears the boot watchdog's error if the CDN was merely slow)
    els.wcLoading.classList.remove("is-error");
    els.wcLoadingTitle.textContent = "Summoning the pieces…";
    els.wcLoadingDetail.textContent = "Fetching the sculpted statues (4 MB)";
    if (engineState === null) els.wcLoadingEngine.textContent = "Stockfish is waking…";
  }

  // Don't leave the loading card up forever on a slow link: play with stand-in pieces
  setTimeout(() => {
    if (!assetsLoaded) finishAssetLoading(false, true);
  }, 30000);
  // Stockfish never answered either way: say the arcane engine is playing
  setTimeout(() => {
    if (engineState === null) showEngineStatus(false, true);
  }, 20000);

  // Offer the game left in progress (resume / new) while the pieces load (not when another pilot's waiting)
  if (!TF) offerResume();
  if (els.wcResumeBtn) els.wcResumeBtn.addEventListener("click", resumeSavedGame);
  if (els.wcResumeNewBtn) {
    els.wcResumeNewBtn.addEventListener("click", () => startNewWizardGame(false));
  }

  // Save on the way out too (closing the Bridge's modal unloads this page)
  window.addEventListener("pagehide", saveWizardGame);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveWizardGame();
  });

  // Mode change
  els.wcMode.addEventListener("change", () => {
    const isAI = els.wcMode.value === "ai";
    els.wcDiffGroup.style.display = isAI ? "flex" : "none";
    els.wcSideGroup.style.display = isAI ? "flex" : "none";
    startNewWizardGame(false);
  });

  // Difficulty change (rewards follow the easiest level played this game)
  els.wcDifficulty.addEventListener("change", () => {
    wizardGame.setDifficulty(Number(els.wcDifficulty.value));
    saveWizardGame();
  });

  // Theme / Sculpt Style change
  if (els.wcTheme) {
    els.wcTheme.addEventListener("change", () => applyTheme(els.wcTheme.value));
  }

  // Side selection pills
  document.querySelectorAll(".pill-btn[data-side]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pill-btn[data-side]").forEach((b) =>
        b.classList.toggle("active", b === btn)
      );
      startNewWizardGame(false);
    });
  });

  // New game, Undo & Game Review
  els.wcNewBtn.addEventListener("click", () => {
    userExitedTheater = false;
    startNewWizardGame(true);
  });
  els.wcUndoBtn.addEventListener("click", () => {
    closeReviewPanel();
    wizardGame.undoLastRound();
  });
  if (els.wcReviewBtn) {
    els.wcReviewBtn.addEventListener("click", startGameReview);
  }

  // Floating Stage HUD buttons
  if (els.wcTheaterBtn) {
    els.wcTheaterBtn.addEventListener("click", () => {
      setTheaterMode(!isTheaterMode, true);
    });
  }
  if (els.wcStageThemeBtn) {
    els.wcStageThemeBtn.addEventListener("click", () => {
      applyTheme(THEME_CYCLE[(themeCycleIdx + 1) % THEME_CYCLE.length]);
    });
  }
  if (els.wcStageCamBtn) {
    els.wcStageCamBtn.addEventListener("click", () => {
      camCycleIdx = (camCycleIdx + 1) % CAM_CYCLE.length;
      wizardGame.setCameraPreset(CAM_CYCLE[camCycleIdx]);
    });
  }
  if (els.wcStageUndoBtn) {
    els.wcStageUndoBtn.addEventListener("click", () => {
      closeReviewPanel();
      wizardGame.undoLastRound();
    });
  }
  if (els.wcStageReviewBtn) {
    els.wcStageReviewBtn.addEventListener("click", () => {
      if (isTheaterMode) {
        document.body.classList.add("theater-drawer-open");
      }
      startGameReview();
    });
  }

  // Review transport buttons
  if (els.wcRevFirst) {
    els.wcRevFirst.addEventListener("click", () => stepReviewTo(0));
    els.wcRevPrev.addEventListener("click", () => stepReviewTo(currentReviewPly - 1));
    els.wcRevNext.addEventListener("click", () => stepReviewTo(currentReviewPly + 1));
    els.wcRevLast.addEventListener("click", () =>
      stepReviewTo(wizardGame.timeline.length - 1)
    );
    els.wcRevExit.addEventListener("click", closeReviewPanel);
  }

  // Click on Eval Chart to scrub through moves
  if (els.wcEvalChart) {
    els.wcEvalChart.addEventListener("click", (e) => {
      if (!wizardGame || wizardGame.timeline.length <= 1) return;
      const rect = els.wcEvalChart.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetPly = Math.round(ratio * (wizardGame.timeline.length - 1));
      stepReviewTo(targetPly);
    });
  }

  // Keyboard shortcuts: Esc exits Full Screen Theater Mode, Left/Right steps through Review
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isTheaterMode) {
      e.preventDefault();
      setTheaterMode(false, true);
      return;
    }
    if (!wizardGame || !wizardGame.reviewMode) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      stepReviewTo(currentReviewPly - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      stepReviewTo(currentReviewPly + 1);
    }
  });

  // Camera presets
  document.querySelectorAll(".cam-btn[data-cam]").forEach((btn) => {
    btn.addEventListener("click", () => {
      wizardGame.setCameraPreset(btn.dataset.cam);
    });
  });

  // Battle Cam toggle
  els.wcBattleCamBtn.addEventListener("click", () => {
    wizardGame.battleCamEnabled = !wizardGame.battleCamEnabled;
    els.wcBattleCamBtn.classList.toggle("active", wizardGame.battleCamEnabled);
    els.wcBattleCamBtn.textContent = `Battle Cam: ${wizardGame.battleCamEnabled ? "ON" : "OFF"}`;
  });

  // Audio SFX toggle
  els.wcAudioBtn.addEventListener("click", () => {
    wizardGame.audio.enabled = !wizardGame.audio.enabled;
    const on = wizardGame.audio.enabled;
    els.wcAudioBtn.classList.toggle("active", on);
    els.wcAudioBtn.textContent = `SFX: ${on ? "ON" : "OFF"}`;
  });

  // Promotion buttons
  document.querySelectorAll(".promo-buttons button[data-promo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const piece = btn.dataset.promo;
      els.promoModal.hidden = true;
      if (pendingPromoCallback) {
        const fn = pendingPromoCallback;
        pendingPromoCallback = null;
        fn(piece);
      }
    });
  });
}

function applyTheme(id) {
  const t = wizardGame.setTheme(id);
  reflectTheme(t);
  saveWizardGame();
}

// Sidebar select, the stage's Style button and the subtitle follow the board's theme
function reflectTheme(t) {
  if (!t) return;
  themeCycleIdx = Math.max(0, THEME_CYCLE.indexOf(t.id));
  if (els.wcTheme) els.wcTheme.value = t.id;
  if (els.wcStageThemeBtn) {
    els.wcStageThemeBtn.textContent = `🎨 ${t.whiteLabel}`;
    els.wcStageThemeBtn.title = `Theme: ${t.name} (Click to cycle)`;
  }
  if (!els.viewWizard.hidden) els.pageSubtitle.textContent = wizardSubtitle();
}

function wizardSubtitle() {
  const id = wizardGame ? wizardGame.themeId : LAUNCH_THEME;
  return WIZARD_SUBTITLES[id] || WIZARD_SUBTITLES.classic;
}

// ---------- Loading card (the 4.3 MB sculpt file and Stockfish) ----------

let engineState = null; // null = still waking, true = Stockfish, false = the local engine

function showAssetProgress(loaded, total) {
  if (assetsLoaded) return;
  const mb = (n) => (n / 1048576).toFixed(1);
  els.wcLoadingTitle.textContent = "Summoning the pieces…";
  if (total > 0) {
    const pct = Math.min(100, Math.round((loaded / total) * 100));
    els.wcProgressBar.style.width = `${pct}%`;
    els.wcLoadingDetail.textContent = `Carving the statues · ${mb(loaded)} of ${mb(total)} MB`;
  } else {
    els.wcLoading.classList.add("is-indeterminate");
    els.wcLoadingDetail.textContent = `Carving the statues · ${mb(loaded)} MB`;
  }
}

function finishAssetLoading(ok, timedOut = false) {
  if (assetsLoaded) return;
  assetsLoaded = true;
  els.wcProgressBar.style.width = "100%";
  els.wcLoading.hidden = true;
  if (!ok) {
    els.wizardStatus.textContent = timedOut
      ? "The sculpted pieces are still on their way — playing with stand-ins until they arrive."
      : "The sculpted pieces couldn't be loaded — playing with stand-in pieces.";
  }
  updateStageOverlay();
}

function showEngineStatus(isReady, timedOut = false) {
  engineState = Boolean(isReady);
  if (els.wcEngineBadge) {
    els.wcEngineBadge.textContent = isReady ? "⚡ Stockfish UCI" : "⚡ Arcane Engine";
    els.wcEngineBadge.classList.remove("is-waking");
    els.wcEngineBadge.title = isReady
      ? "Stockfish is playing"
      : "Stockfish couldn't be reached — the built-in engine is playing";
  }
  if (els.wcLoadingEngine) {
    els.wcLoadingEngine.textContent = isReady
      ? "Stockfish is awake."
      : timedOut
        ? "Stockfish is slow to wake — the arcane engine plays meanwhile."
        : "Stockfish is out of reach — the arcane engine will play.";
  }
}

function updateStageOverlay() {
  if (!els.wcOverlay) return;
  els.wcResume.hidden = !resumePending;
  els.wcOverlay.hidden = assetsLoaded && !resumePending;
}

// ---------- Save / resume the game in progress ----------

function saveWizardGame() {
  if (!wizardGame || resumePending || TF) return; // don't overwrite a save the player hasn't answered (or one with another pilot)
  const st = wizardGame.exportState();
  try {
    if (st.moves === 0 || st.over) localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, JSON.stringify(st));
  } catch {
    // storage full or blocked: the game just won't resume
  }
}

function loadSavedGame() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    return s && s.v === 1 && s.moves > 0 && !s.over ? s : null;
  } catch {
    return null;
  }
}

function discardSavedGame() {
  resumePending = null;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // nothing to discard
  }
  updateStageOverlay();
}

function offerResume() {
  const saved = loadSavedGame();
  if (!saved) return;
  resumePending = saved;
  const tier = DIFFICULTY_TIERS[saved.aiDifficulty] || DIFFICULTY_TIERS[3];
  const who =
    saved.mode === "2p"
      ? "Pass & Play"
      : `${saved.playerColor === "b" ? "Obsidian" : "Ivory"} vs ${tier.name}`;
  const moveNo = Math.max(1, Math.ceil(saved.moves / 2));
  const theme = WIZARD_THEMES[saved.themeId];
  els.wcResumeDetail.textContent =
    `${who} · move ${moveNo}` +
    (theme ? ` · ${theme.worldName}` : "") +
    (saved.reward && saved.reward.practice ? " · practice game" : "");
  updateStageOverlay();
}

function resumeSavedGame() {
  const saved = resumePending;
  resumePending = null;
  updateStageOverlay();
  if (!saved) return;

  // Put the sidebar back the way that game was set up
  els.wcMode.value = saved.mode === "2p" ? "2p" : "ai";
  const isAI = els.wcMode.value === "ai";
  els.wcDiffGroup.style.display = isAI ? "flex" : "none";
  els.wcSideGroup.style.display = isAI ? "flex" : "none";
  if (DIFFICULTY_TIERS[saved.aiDifficulty]) els.wcDifficulty.value = String(saved.aiDifficulty);
  const side = saved.playerColor === "b" ? "b" : "w";
  document.querySelectorAll(".pill-btn[data-side]").forEach((b) =>
    b.classList.toggle("active", b.dataset.side === side)
  );
  if (WIZARD_THEMES[saved.themeId] && saved.themeId !== wizardGame.themeId) {
    reflectTheme(wizardGame.setTheme(saved.themeId));
  }

  closeReviewPanel();
  if (!wizardGame.resumeGame(saved)) {
    startNewWizardGame(false);
    els.wizardStatus.textContent = "That saved battle couldn't be read — a fresh one is set up.";
  }
}

// ---------- Rewards (see payChessCoins in wizard-chess.js) ----------

function renderRewardInfo() {
  if (!wizardGame || !els.wcSpoils) return;
  const info = wizardGame.getRewardInfo();
  const dailyFull = info.dailyCoins >= info.dailyCap;
  const today = `Today <span class="stat-num">${info.dailyCoins}/${info.dailyCap}🪙</span>`;
  let note = "";

  if (info.mode === "net" && TF) {
    els.wcSpoils.innerHTML = TF.cfg.wager ? `Against ${TF.cfg.vs} · the pot <span class="stat-num">${TF.cfg.pot}🪙</span> to the winner` : `Against ${TF.cfg.vs} · just for fun`;
  } else if (info.mode !== "ai") {
    els.wcSpoils.innerHTML = `Pass &amp; Play pays no coins · ${today}`;
    note = "Pass & Play — practice, no rewards";
  } else if (info.practice) {
    els.wcSpoils.innerHTML = `Practice game — undo used, no rewards · ${today}`;
    note = "Practice game — undo used, no rewards";
  } else {
    const win = info.winPaid
      ? `Victory paid <span class="stat-num">+${info.winCoins}🪙</span>`
      : `<span class="stat-num">+${info.winReward}🪙</span> checkmate vs ${info.tierName}`;
    els.wcSpoils.innerHTML =
      `Spoils: <span class="stat-num">+${info.capReward}🪙</span> / shatter ` +
      `(${info.captureCoins}/${info.captureCap} this game) · ${win} · ${today}`;
    if (dailyFull) note = "Daily chess coins reached — play on for glory";
  }

  if (els.wcRewardNote) {
    els.wcRewardNote.textContent = note;
    els.wcRewardNote.hidden = !note;
  }
}

function updateEvalBar(whiteCp, whiteMate) {
  if (!els.wcEvalWhite || !els.wcEvalScore) return;
  const clamped = Math.max(-900, Math.min(900, whiteCp || 0));
  const whitePct = 50 + (clamped / 900) * 46;
  els.wcEvalWhite.style.height = `${whitePct.toFixed(1)}%`;

  if (whiteMate !== null && whiteMate !== undefined) {
    els.wcEvalScore.textContent = `M${Math.abs(whiteMate)}`;
  } else {
    const pawns = (whiteCp || 0) / 100;
    els.wcEvalScore.textContent = (pawns >= 0 ? "+" : "") + pawns.toFixed(1);
  }
}

function startNewWizardGame(autoExpand = false) {
  discardSavedGame(); // a new battle replaces the one left in progress
  closeReviewPanel();
  if (autoExpand) {
    setTheaterMode(true);
  }
  const activeSideBtn = document.querySelector(".pill-btn[data-side].active");
  const playerColor = activeSideBtn ? activeSideBtn.dataset.side : "w";
  wizardGame.newGame({
    mode: els.wcMode.value,
    aiDifficulty: Number(els.wcDifficulty.value),
    playerColor
  });
}

async function startGameReview() {
  if (!wizardGame || wizardGame.timeline.length <= 1) return;
  if (isTheaterMode) {
    document.body.classList.add("theater-drawer-open");
  }
  els.wcReviewBtn.disabled = true;
  els.wcReviewBtn.textContent = "🔮 Analyzing...";
  els.wcReviewPanel.hidden = false;
  els.wcReviewPill.hidden = false;
  els.wcCoachNote.textContent = "Stockfish Oracle is evaluating every ply of the battle...";

  const report = await wizardGame.analyzeGameHistory((done, total) => {
    els.wcCoachNote.textContent = `Analyzing move ${done} of ${total - 1} with Stockfish...`;
  });

  els.wcReviewBtn.disabled = false;
  els.wcReviewBtn.textContent = "🔮 Game Review & Eval";
  if (!report) return;

  els.wcAccW.textContent = `${report.whiteAccuracy}%`;
  els.wcAccB.textContent = `${report.blackAccuracy}%`;

  const c = report.counts;
  els.wcClassCounts.innerHTML = [
    c.brilliant ? `<span class="class-chip chip-brilliant">!! ${c.brilliant}</span>` : "",
    `<span class="class-chip chip-best">★ Best ${c.best}</span>`,
    `<span class="class-chip chip-good">✓ Good ${c.good}</span>`,
    c.inaccuracy ? `<span class="class-chip chip-inacc">?! ${c.inaccuracy}</span>` : "",
    c.mistake ? `<span class="class-chip chip-mistake">? ${c.mistake}</span>` : "",
    c.blunder ? `<span class="class-chip chip-blunder">?? ${c.blunder}</span>` : ""
  ].join("");

  if (lastWizardState) {
    renderWizardMovesList(lastWizardState.history, wizardGame.timeline.length - 1);
  }
  stepReviewTo(wizardGame.timeline.length - 1);
}

function stepReviewTo(plyIdx) {
  if (!wizardGame || wizardGame.timeline.length === 0) return;
  currentReviewPly = Math.max(0, Math.min(wizardGame.timeline.length - 1, plyIdx));
  const entry = wizardGame.viewReviewPly(currentReviewPly);
  drawEvalChart(wizardGame.timeline, currentReviewPly);

  if (lastWizardState) {
    renderWizardMovesList(lastWizardState.history, currentReviewPly);
  }

  if (!entry || currentReviewPly === 0) {
    els.wcCoachNote.textContent =
      "Starting battle formation. Use < / > (or Left/Right arrow keys) to step through every move.";
    return;
  }

  const moveNum = Math.ceil(currentReviewPly / 2);
  const dots = entry.color === "w" ? "." : "...";
  const pawns = ((entry.evalCpWhite || 0) / 100).toFixed(2);
  const evalStr = (entry.evalCpWhite >= 0 ? "+" : "") + pawns;
  const labelMap = {
    brilliant: "Brilliant sacrifice!!",
    best: "Best engine move ★",
    good: "Solid move ✓",
    inaccuracy: "Inaccuracy ?!",
    mistake: "Mistake ?",
    blunder: "Blunder ??"
  };
  const label = labelMap[entry.classification] || "Move played";
  let recText = "";
  if (
    entry.recommendedSan &&
    entry.recommendedUci !== entry.uci &&
    ["inaccuracy", "mistake", "blunder"].includes(entry.classification)
  ) {
    recText = ` — Best was ${entry.recommendedSan} (green arrow on board).`;
  }
  els.wcCoachNote.textContent = `${moveNum}${dots} ${entry.san} (${evalStr}) · ${label}${recText}`;
}

function closeReviewPanel() {
  if (!els.wcReviewPanel) return;
  els.wcReviewPanel.hidden = true;
  els.wcReviewPill.hidden = true;
  document.body.classList.remove("theater-drawer-open");
  if (wizardGame && wizardGame.reviewMode) {
    wizardGame.exitReviewMode();
    if (lastWizardState) {
      renderWizardMovesList(lastWizardState.history, -1);
    }
  }
}

function drawEvalChart(timeline, activePly) {
  const canvas = els.wcEvalChart;
  if (!canvas || !timeline || timeline.length === 0) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Midline (0.0 eval)
  ctx.strokeStyle = "rgba(255, 210, 140, 0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  if (timeline.length < 2) return;

  const xFor = (i) => (i / (timeline.length - 1)) * (w - 12) + 6;
  const yFor = (cp) => {
    const clamped = Math.max(-700, Math.min(700, cp || 0));
    return h / 2 - (clamped / 700) * (h * 0.42);
  };

  // Fill area under curve
  ctx.beginPath();
  ctx.moveTo(xFor(0), h / 2);
  for (let i = 0; i < timeline.length; i++) {
    ctx.lineTo(xFor(i), yFor(timeline[i].evalCpWhite));
  }
  ctx.lineTo(xFor(timeline.length - 1), h / 2);
  ctx.closePath();
  ctx.fillStyle = "rgba(235, 218, 185, 0.22)";
  ctx.fill();

  // Eval curve line
  ctx.beginPath();
  for (let i = 0; i < timeline.length; i++) {
    const x = xFor(i);
    const y = yFor(timeline[i].evalCpWhite);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#f5d796";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Plot mistake/blunder dots & active ply cursor
  for (let i = 1; i < timeline.length; i++) {
    const cls = timeline[i].classification;
    if (cls === "blunder" || cls === "mistake") {
      ctx.fillStyle = cls === "blunder" ? "#ff5252" : "#ffab40";
      ctx.beginPath();
      ctx.arc(xFor(i), yFor(timeline[i].evalCpWhite), 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const ax = xFor(activePly);
  const ay = yFor(timeline[activePly].evalCpWhite);
  ctx.strokeStyle = "#b388ff";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(ax, 0);
  ctx.lineTo(ax, h);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(ax, ay, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function renderWizardMovesList(history, activePly = -1) {
  if (!history || history.length === 0) {
    els.wizardMoves.innerHTML = `<span class="placeholder">No moves yet — advance a piece to begin the battle.</span>`;
    return;
  }
  const html = [];
  for (let i = 0; i < history.length; i++) {
    if (i % 2 === 0) {
      html.push(`<span class="move-num">${Math.floor(i / 2) + 1}.</span>`);
    }
    const mv = history[i];
    const ply = i + 1;
    const tNode = wizardGame && wizardGame.timeline[ply];
    const isCap = Boolean(mv.captured);
    const isActive = ply === activePly;
    const cls = [
      "move played review-clickable",
      isCap ? "capture-move" : "",
      isActive ? "active-ply" : ""
    ]
      .filter(Boolean)
      .join(" ");
    const prefix = isCap ? "⚔" : "";
    let badgeHtml = "";
    if (tNode && tNode.badge) {
      const chipMap = {
        brilliant: "chip-brilliant",
        best: "chip-best",
        good: "chip-good",
        inaccuracy: "chip-inacc",
        mistake: "chip-mistake",
        blunder: "chip-blunder"
      };
      badgeHtml = `<span class="move-badge ${chipMap[tNode.classification] || ""}">${tNode.badge}</span>`;
    }
    html.push(`<span class="${cls}" data-ply="${ply}">${prefix}${mv.san}${badgeHtml}</span>`);
  }
  els.wizardMoves.innerHTML = html.join("");
  els.wizardMoves.querySelectorAll(".move[data-ply]").forEach((el) => {
    el.addEventListener("click", () => {
      const ply = Number(el.dataset.ply);
      if (!wizardGame.reviewMode) {
        startGameReview().then(() => stepReviewTo(ply));
      } else {
        stepReviewTo(ply);
      }
    });
  });
  if (activePly < 0) {
    els.wizardMoves.scrollTop = els.wizardMoves.scrollHeight;
  }
}

function renderWizardState(state) {
  lastWizardState = state;
  renderRewardInfo();
  saveWizardGame();
  const fmtCaps = (arr) =>
    arr.length ? arr.map((p) => PIECE_GLYPHS[p] || p).join(" ") : "—";
  els.capByWhite.textContent = fmtCaps(state.capturedCounts.w);
  els.capByBlack.textContent = fmtCaps(state.capturedCounts.b);

  if (els.wcReviewBtn) {
    els.wcReviewBtn.disabled = !state.history || state.history.length === 0;
  }

  renderWizardMovesList(state.history, wizardGame && wizardGame.reviewMode ? currentReviewPly : -1);

  const sideName = state.turn === "w" ? "Ivory Legion (White)" : "Obsidian Legion (Black)";
  if (TF && wizardGame && wizardGame.mode === "net") {
    renderNetState(state);
    return;
  }
  if (state.isCheckmate) {
    const winner =
      state.turn === "w" ? "Obsidian Legion (Black)" : "Ivory Legion (White)";
    els.wizardStatus.textContent = `Checkmate! ${winner} triumphs! Click "🔮 Game Review & Eval" to inspect the match.`;
    els.wizardStatus.className = "status complete";
  } else if (state.isDraw) {
    els.wizardStatus.textContent = `Battle concluded in a draw. Click "🔮 Game Review & Eval" to analyze.`;
    els.wizardStatus.className = "status";
  } else if (state.inCheck) {
    els.wizardStatus.textContent = `Warning — ${sideName} is in CHECK!`;
    els.wizardStatus.className = "status error";
  } else if (state.lastMove && state.lastMove.captured) {
    els.wizardStatus.textContent = `Shattered! ${sideName} to move.`;
    els.wizardStatus.className = "status success";
  } else {
    els.wizardStatus.textContent = `${sideName} to move.`;
    els.wizardStatus.className = "status";
  }
}

// ---------- Playing another pilot (from the Bridge) ----------
// Whoever asked plays Ivory. Each board makes its own moves and plays the other's as they arrive; both see the
// same mate (or draw) and say how it went for them. Leaving the cabinet gives the game up (Esc twice).

function setupTogether() {
  document.body.classList.add("together");
  const hide = (el) => { if (el) el.hidden = true; };
  hide(els.wcMode && els.wcMode.closest(".field-group"));
  if (els.wcDiffGroup) els.wcDiffGroup.style.display = "none";
  if (els.wcSideGroup) els.wcSideGroup.style.display = "none";
  hide(els.wcNewBtn);
  hide(els.wcUndoBtn);
  hide(els.wcStageUndoBtn);
  const side = TF.cfg.side === "b" ? "b" : "w";
  els.pageSubtitle.textContent =
    `You play ${side === "w" ? "Ivory" : "Obsidian"} against ${TF.cfg.vs}.` +
    (TF.cfg.wager ? ` ${TF.cfg.wager} each on it — checkmate takes the pot of ${TF.cfg.pot}.` : "");
  wizardGame.newGame({ mode: "net", playerColor: side });
  TF.on("data", (m) => {
    if (m.k === "mv" && m.d && !netOver) wizardGame.applyRemoteMove(m.d.uci);
  });
  TF.on("verdict", (v) => {
    netOver = true;
    if (IN_FRAME) window.__bridgeOwnsEsc = isTheaterMode;
    runState(false);
    els.wizardStatus.textContent = v.head + (v.paid ? ` · +${v.paid} coins` : v.outcome === "draw" && TF.cfg.wager ? " · your stake's back" : "");
    els.wizardStatus.className = v.outcome === "win" ? "status complete" : "status";
  });
  TF.on("gone", () => {
    netOver = true;
    if (IN_FRAME) window.__bridgeOwnsEsc = isTheaterMode;
    runState(false);
    els.wizardStatus.textContent = `${TF.cfg.vs} left the board. Your stake is back.`;
    els.wizardStatus.className = "status";
  });
  // Esc twice gives the game up (the first only warns); full screen's own Esc comes first
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || isTheaterMode || netOver) return;
    e.preventDefault();
    if (Date.now() - netEscAt < 2500) {
      if (IN_FRAME) window.parent.postMessage({ type: "bridge-request-close", source: "chess" }, "*");
      return;
    }
    netEscAt = Date.now();
    els.wizardStatus.textContent = `Esc again to give the game up to ${TF.cfg.vs}.`;
    els.wizardStatus.className = "status error";
  });
  if (IN_FRAME) window.__bridgeOwnsEsc = true;
  window.__chessNet = { game: wizardGame };       // (for the test scripts)
  runState(true);
  TF.ready();
}

function runState(active) {
  if (IN_FRAME) window.parent.postMessage({ type: "bridge-run-state", game: "chess", active, paused: false, hint: "Esc again to give the game up" }, "*");
}

function renderNetState(state) {
  const side = TF.cfg.side === "b" ? "b" : "w";
  const mine = state.turn === side;
  if (state.isCheckmate) {
    const won = state.turn !== side;
    els.wizardStatus.textContent = won ? `Checkmate! ${TF.cfg.vs}'s king falls.` : `Checkmate. ${TF.cfg.vs} has you.`;
    els.wizardStatus.className = won ? "status complete" : "status error";
    if (!netOver) TF.result(won ? "win" : "lose");
    return;
  }
  if (state.isDraw || state.isGameOver) {
    els.wizardStatus.textContent = "Drawn — neither legion can win this.";
    els.wizardStatus.className = "status";
    if (!netOver) TF.result("draw");
    return;
  }
  const who = mine ? "Your move" : `${TF.cfg.vs} is thinking…`;
  els.wizardStatus.textContent = (state.inCheck ? (mine ? "Check! " : `${TF.cfg.vs} is in check. `) : "") + who;
  els.wizardStatus.className = state.inCheck ? "status error" : mine ? "status success" : "status";
  TF.score(state.history ? state.history.length : 0, false,
    `${side === "w" ? "Ivory" : "Obsidian"} · ${mine ? "your move" : TF.cfg.vs + "'s move"}${state.inCheck ? " · check" : ""}`);
}

// ---------- Opening Trainer Init ----------

function initTrainer() {
  trainerInitialized = true;
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
  const coinNote = payLineReward(clean);
  if (clean) {
    setStatus(`Mastered. The fire crackles in approval.${coinNote}`, "complete");
    stats[current.id] = { mastered: true, plays: (stats[current.id]?.plays || 0) + 1 };
  } else {
    setStatus(
      `Line complete — ${errorCount} miss${errorCount === 1 ? "" : "es"}, ${hintsUsed} hint${hintsUsed === 1 ? "" : "s"}.${coinNote}`,
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
}

// ---- Bridge progression ----
// 10 coins a completed line, +15 if clean (no errors, no hints) — paid the first
// time each line is completed in a day, inside the daily chess allowance.
// Returns a note for the status line.
function payLineReward(clean) {
  if (typeof BridgeProgression === "undefined") return "";
  BridgeProgression.recordAchievement("first_light", 100, { game: "chess" });
  BridgeProgression.recordAchievement("bookworm", 50, { opening: current.id });
  if (readChessDaily().lines.includes(current.id)) return " (Already rewarded today.)";
  const paid = payChessCoins(
    10 + (clean ? 15 : 0),
    "chess_line",
    { opening: current.id, clean, errors: errorCount, hints: hintsUsed },
    (rec) => rec.lines.push(current.id)
  );
  if (wizardGame) renderRewardInfo();
  return paid > 0 ? ` +${paid}🪙` : " (Today's chess coins are all won.)";
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

setupTabs();
renderMoveList();
initWizardChess();
if (TF) setupTogether();
