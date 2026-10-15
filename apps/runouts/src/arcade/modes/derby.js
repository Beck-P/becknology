// The Derby: tin horses on the wall cabinet's lanes, one per player in their colour; each turn one of them clatters
// forward a notch. The players crowd the counter cheering their horse on.
import { PAL, PCOL, W, H, text, hud, verdict, clamp, ease } from "../kit.js";
import { scene, row, players, zoomed } from "./common.js";

/** Which lane (from the top) a runner is in: the one they picked in the draft, else their place in the list. */
function laneOf(r, p, k, lanes) {
  const pick = r.playerLanes && r.playerLanes[p.name], j = pick && r.lanes ? r.lanes.indexOf(pick) : -1;
  return j >= 0 && j < lanes ? j : k;
}

// a tin racer the size of a lane: the jockey in the player's silks, the horse at a gallop (two frames)
const RIDER = [["...ss...", "...ss.cc", "ccccccc.", "cccccc..", ".c..c.c.", "c..c..c."],
               ["...ss...", "...ss.cc", "ccccccc.", "cccccc..", "c.c..c..", ".c..c..c"]];
function rider(ctx, x, y, silk, f = 0) {
  RIDER[f & 1].forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (c === ".") continue;
      ctx.fillStyle = c === "s" ? silk : j < 2 ? "#e8e8f0" : "#d8d4e4";
      ctx.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1);
    }
  });
  ctx.fillStyle = "#0c0814"; ctx.fillRect(Math.round(x) + 7, Math.round(y) + 1, 1, 1);
}

/** Where the close-up camera looks: the middle of the cabinet, a little down toward the players. */
function focus(sc, a) {
  const [x0, y0] = sc.px((a.x0 + a.x1) / 2, a.r, 1.55), [, y1] = sc.px(a.x0, 4.75, 0);
  return [Math.round(x0) - 20, Math.round((y0 + y1) / 2) + 3];
}

/** The lane draft: the horses waiting at the gate, saddles empty until someone claims the lane. */
function draft(ctx, s, sc, a) {
  const r = s.result, list = r.players || [], n = list.length, lanes = r.lanes || [];
  const pk = (typeof window !== "undefined" && window.__horseLanePicks) || { taken: {}, currentPickerIndex: 0 };
  const order = r.lanePickOrder || list.map((p) => p.name), picker = order[pk.currentPickerIndex];
  const L = a.lanes.length;
  zoomed(ctx, s, 2, ...focus(sc, a), () => {
  scene(ctx, s, "horse-race", [0, 2.2]);
  lanes.slice(0, L).forEach((ln, j) => {
    const owner = pk.taken[ln], lz = a.lanes[L - 1 - j];
    const [hx, hy] = sc.px(a.x0 + 0.05, a.r, lz);
    rider(ctx, hx, hy - 6, owner ? PCOL[s.index(owner) % PCOL.length] : "#3a3450", owner ? Math.floor(s.t * 3 + j) : 0);
  });
  const seats = row(n, a.x0 - 0.2, a.x1 + 0.2, 4.75).map((q) => ({ ...q, facing: "up" }));
  players(ctx, s, sc, seats, { active: list.findIndex((p) => p.name === picker), mood: (p) => (Object.values(pk.taken).includes(p.name) ? "cheer" : "idle") });
  });
  // the board of lanes along the bottom
  ctx.fillStyle = "rgba(8,4,24,0.86)"; ctx.fillRect(0, H - 34, W, 34); ctx.fillStyle = PAL.pink; ctx.fillRect(0, H - 34, W, 1);
  const cw = Math.min(78, Math.floor((W - 8) / Math.max(1, lanes.length)));
  lanes.forEach((ln, j) => {
    const x = Math.round(W / 2 - (lanes.length * cw) / 2 + j * cw), owner = pk.taken[ln];
    const col = owner ? PCOL[s.index(owner) % PCOL.length] : PAL.grey;
    ctx.fillStyle = owner ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)"; ctx.fillRect(x + 2, H - 30, cw - 4, 26);
    ctx.fillStyle = col; ctx.fillRect(x + 2, H - 30, cw - 4, 1);
    text(ctx, "LANE " + (j + 1), x + cw / 2, H - 27, PAL.white, { align: "center" });
    text(ctx, owner || "OPEN", x + cw / 2, H - 16, col, { align: "center", max: Math.floor((cw - 6) / 6) });
  });
  hud(ctx, s, "THE DERBY", picker ? picker + " PICKS A LANE" : "AT THE GATE");
}

export default {
  station: "horse-race",
  drafts: true,
  draw(ctx, s) {
    const sc = scene(ctx, s, "horse-race", [0, 2.2]);
    const r = s.result, list = r.players || [], n = list.length, turns = r.turns || [];
    const a = sc.a || { x0: 18.6, x1: 23.04, lanes: [1.09, 1.27, 1.46, 1.64, 1.82, 2.0], laneH: 0.18, r: 3.45 };
    if (r.draftPhase) return draft(ctx, s, sc, a);
    const max = Math.max(1, (r.race && r.race.max) || 1);
    const t = turns[clamp(s.step, 0, turns.length) - 1], prevT = turns[clamp(s.step - 1, 0, turns.length) - 1];
    const lanes = a.lanes.length, top = a.lanes[lanes - 1], bot = a.lanes[0];
    zoomed(ctx, s, 2, ...focus(sc, a), () => {
    scene(ctx, s, "horse-race", [0, 2.2]);
    // back lanes first, so the nearer horses run in front of them
    const runners = list.map((p, k) => ({ p, k, j: n <= lanes ? laneOf(r, p, k, lanes) : k })).sort((u, v) => u.j - v.j);
    runners.forEach(({ p, j }) => {
      // the render's lanes count up from the bottom; more runners than lanes squeeze in
      const i = s.index(p.name), lz = n <= lanes ? a.lanes[lanes - 1 - j] : top - ((top - bot) * j) / (n - 1);
      const pos = t ? t.positions[p.name] || 0 : 0, was = prevT ? prevT.positions[p.name] || 0 : 0;
      const moving = t && t.mover === p.name && s.stepT < 0.7;
      const u = moving ? ease.out(s.stepT / 0.7) : 1, cur = was + (pos - was) * u;
      const x = a.x0 + ((a.x1 - a.x0 - 0.4) * cur) / max;
      const [hx, hy] = sc.px(x, a.r, lz);
      const bob = moving ? Math.round(Math.abs(Math.sin(s.stepT * 18))) : 0;
      const lead = s.done && (p.selected || p.tied);
      if (lead) { ctx.fillStyle = Math.sin(s.t * 10) > 0 ? PAL.gold : PAL.white; ctx.fillRect(Math.round(hx) - 1, Math.round(hy) - 8 - bob, 10, 8); }
      rider(ctx, hx, hy - 6 - bob, PCOL[i % PCOL.length], moving ? Math.floor(s.stepT * 12) : 0);
      if (moving && !s.mem["h" + s.step]) { s.mem["h" + s.step] = 1; s.fx.burst(hx, hy - 1, 4, "smoke", ["#c8b090"]); }
    });
    const seats = row(n, a.x0 - 0.2, a.x1 + 0.2, 4.75).map((q) => ({ ...q, facing: "up" }));
    players(ctx, s, sc, seats, { mood: (p) => (s.done ? (p.selected === (s.goal === "winner") ? "cheer" : "slump") : t && t.mover === p.name && s.stepT < 0.8 ? "cheer" : "idle") });
    });
    // the call
    const call = t ? (t.mover + " MOVES UP - TURN " + t.turn + " OF " + turns.length) : "THEY'RE AT THE GATE";
    ctx.fillStyle = "rgba(8,4,24,0.86)"; ctx.fillRect(0, H - 20, W, 20); ctx.fillStyle = PAL.pink; ctx.fillRect(0, H - 20, W, 1);
    text(ctx, s.done ? "THE RESULT IS IN" : call, W / 2, H - 13, PAL.white, { align: "center", max: 60 });
    hud(ctx, s, "THE DERBY", s.goal === "winner" ? "FIRST PAST THE POST WINS" : "LAST HORSE IS PICKED");
    if (s.done && !s.mem.end) { s.mem.end = 1; if (s.goal === "winner" && !r.isTie) s.fx.rain(60, [PAL.gold, PAL.pink, PAL.cyan]); }
    verdict(ctx, s, { y: 150 });
  },
};
