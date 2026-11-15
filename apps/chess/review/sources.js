// Where games come from: chess.com and lichess (their public APIs, straight from the browser — both
// allow it and neither needs a key or a sign-in for finished games), and the battles played here in
// Wizard Chess. Every source gives the same thing: a list entry
//   { id, source, pgn, white: { name, rating }, black: { … }, result: '1-0' | '0-1' | '1/2-1/2' | '*',
//     endTime (ms), speed, opening, url, me: 'w' | 'b' | null }

const ARCHIVE_KEY = "becknology-chess-archive-v1";      // finished Wizard Chess games (app.js keeps it)
const WIZARD_SAVE_KEY = "becknology-chess-wizard-save-v1";

async function get(url, { accept = "application/json", ms = 20000 } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { headers: { Accept: accept }, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

const same = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();

// ---------- chess.com ----------
// Games are filed by month. `more()` reads the next month back and resolves to its games, newest
// first; `done` once every month has been read.

const CC_DRAWS = new Set(["agreed", "repetition", "stalemate", "insufficient", "50move", "timevsinsufficient"]);

function fromChessCom(g, user) {
  const res = g.white.result === "win" ? "1-0" : g.black.result === "win" ? "0-1" : CC_DRAWS.has(g.white.result) ? "1/2-1/2" : "*";
  return {
    id: "cc:" + (g.uuid || g.url),
    source: "chess.com",
    pgn: g.pgn || "",
    white: { name: g.white.username, rating: g.white.rating },
    black: { name: g.black.username, rating: g.black.rating },
    result: res,
    endTime: (g.end_time || 0) * 1000,
    speed: g.time_class || "",
    opening: "",
    url: g.url || "",
    me: same(g.white.username, user) ? "w" : same(g.black.username, user) ? "b" : null,
  };
}

export async function chessCom(username) {
  const user = username.trim();
  const r = await get(`https://api.chess.com/pub/player/${encodeURIComponent(user.toLowerCase())}/games/archives`);
  if (r.status === 404) throw new Error(`chess.com has no player called "${user}".`);
  if (!r.ok) throw new Error(`chess.com didn't answer (${r.status}). Try again in a moment.`);
  const months = ((await r.json()).archives || []).slice();
  const feed = {
    user,
    done: !months.length,
    async more() {
      // an empty month (it happens) isn't the end: keep going back until there's something to show
      while (months.length) {
        const url = months.pop();
        feed.done = !months.length;
        const m = await get(url);
        if (!m.ok) throw new Error(`chess.com didn't answer (${m.status}). Try again in a moment.`);
        const games = ((await m.json()).games || [])
          .filter((g) => g.rules === "chess" && g.pgn && g.white && g.black)
          .map((g) => fromChessCom(g, user))
          .sort((a, b) => b.endTime - a.endTime);
        if (games.length) return games;
      }
      feed.done = true;
      return [];
    },
  };
  return feed;
}

// ---------- lichess ----------
// One request streams the newest games as lines of JSON; `until` pages back in time.

const LI_PAGE = 30;

function liPlayer(p) {
  if (!p) return { name: "?", rating: null };
  if (p.user) return { name: p.user.name, rating: p.rating || null };
  if (p.aiLevel) return { name: `Stockfish level ${p.aiLevel}`, rating: null };
  return { name: "Anonymous", rating: p.rating || null };
}

function fromLichess(g, user) {
  const w = liPlayer(g.players && g.players.white), b = liPlayer(g.players && g.players.black);
  const over = !["created", "started"].includes(g.status);
  return {
    id: "li:" + g.id,
    source: "lichess",
    pgn: g.pgn || "",
    white: w,
    black: b,
    result: g.winner === "white" ? "1-0" : g.winner === "black" ? "0-1" : over ? "1/2-1/2" : "*",
    endTime: g.lastMoveAt || g.createdAt || 0,
    startTime: g.createdAt || 0,
    speed: g.speed || "",
    opening: (g.opening && g.opening.name) || "",
    url: "https://lichess.org/" + g.id,
    me: same(w.name, user) ? "w" : same(b.name, user) ? "b" : null,
  };
}

export async function lichess(username) {
  const user = username.trim();
  let until = null;
  const feed = {
    user,
    done: false,
    async more() {
      const q = new URLSearchParams({ max: String(LI_PAGE), pgnInJson: "true", opening: "true", clocks: "false", evals: "false" });
      if (until) q.set("until", String(until));
      const r = await get(`https://lichess.org/api/games/user/${encodeURIComponent(user)}?${q}`, { accept: "application/x-ndjson", ms: 30000 });
      if (r.status === 404) throw new Error(`lichess has no player called "${user}".`);
      if (r.status === 429) throw new Error("lichess asks for a minute's pause between requests. Try again shortly.");
      if (!r.ok) throw new Error(`lichess didn't answer (${r.status}). Try again in a moment.`);
      const rows = (await r.text()).split("\n").map((l) => l.trim()).filter(Boolean)
        .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      if (rows.length < LI_PAGE) feed.done = true;
      if (rows.length) until = Math.min(...rows.map((g) => g.createdAt || Infinity)) - 1;
      return rows.filter((g) => g.pgn && (g.variant === "standard" || g.variant === "fromPosition")).map((g) => fromLichess(g, user));
    },
  };
  return feed;
}

// ---------- the games played here ----------

function store(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}

const TIERS = { 1: "Novice", 2: "Apprentice", 3: "Battlemage", 4: "Archmage", 5: "Grandmaster", 6: "Supreme Oracle" };

export function wizardOpponent(mode, level) {
  return mode === "ai" ? `Stockfish · ${TIERS[level] || "Battlemage"}` : mode === "net" ? "another pilot" : "Pass & Play";
}

// The battle in progress (if any) first, then the finished ones, newest first
export function wizardGames() {
  const out = [];
  const live = store(WIZARD_SAVE_KEY);
  if (live && live.pgn && live.moves > 0) {
    const you = live.mode === "ai" ? (live.playerColor === "b" ? "b" : "w") : null;
    const foe = wizardOpponent(live.mode, live.aiDifficulty);
    out.push({
      id: "wz:live:" + (live.savedAt || 0),
      source: "wizard",
      pgn: live.pgn,
      white: { name: you === "b" ? foe : you ? "You" : "Ivory", rating: null },
      black: { name: you === "w" ? foe : you ? "You" : "Obsidian", rating: null },
      result: "*",
      endTime: live.savedAt || Date.now(),
      speed: "in progress",
      opening: "",
      url: "",
      me: you,
    });
  }
  const done = store(ARCHIVE_KEY);
  if (Array.isArray(done)) done.forEach((g) => { if (g && g.pgn) out.push({ ...g, source: "wizard" }); });
  return out;
}

// Called by app.js when a Wizard Chess battle ends. Keeps the last 40.
export function archiveWizardGame(entry) {
  try {
    const list = store(ARCHIVE_KEY);
    const games = Array.isArray(list) ? list : [];
    if (games.length && games[0].pgn === entry.pgn) return;
    games.unshift(entry);
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(games.slice(0, 40)));
  } catch {
    // storage full or blocked: the game just isn't kept
  }
}
