// The show games: Rocket Launch and Space Invaders on the cabinets' screens, the Bomb at its table, Battle Royale on
// the holo-table's map, the Stock Market on the ticker wall. Rocket, the bomb's lone fuse and the market run on their
// own clocks: their timing, the window flags the app reads (__rocketElapsed, __stockDrawIndex) and the
// 'rocket-complete' event are the old playbacks', unchanged.
import { PAL, PCOL, W, H, text, textW, hud, verdict, clamp, ease, hash, disc, box, rect } from "../kit.js";
import { scene, row, players, bubble } from "./common.js";
import { icon } from "./icons.js";

const complete = () => window.dispatchEvent(new Event("rocket-complete"));
function endFx(s) {
  if (s.done && !s.mem.end) { s.mem.end = 1; if (s.goal === "winner" && !s.result.isTie) s.fx.rain(60, [PAL.gold, PAL.pink, PAL.cyan, PAL.white]); }
}
/** A screen game's frame: dark glass, scanline glow at the edges. */
function screenBg(ctx, top, bot) {
  for (let y = 0; y < H; y += 2) { ctx.fillStyle = mix(top, bot, y / H); ctx.fillRect(0, y, W, 2); }
}
// colours as '#rrggbb' or 'rgb(r,g,b)', mixed
function rgbOf(c) {
  if (c[0] === "#") return [1, 3, 5].map((i) => parseInt(c.substr(i, 2), 16));
  return c.replace(/[^\d,]/g, "").split(",").map(Number);
}
function mix(a, b, t) {
  const A = rgbOf(a), B = rgbOf(b);
  return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * clamp(t, 0, 1))).join(",") + ")";
}

// ---- Rocket Launch -----------------------------------------------------------------------------------------------------------
const TIME_SCALE = 3;
const MILESTONES = [[100, "LEAVING THE ATMOSPHERE"], [400, "PASSING THE STATION"], [2000, "LOW ORBIT"], [20000, "PASSING THE SATELLITES"],
                    [36000, "HIGH ORBIT"], [384000, "PASSING THE MOON"], [800000, "DEEP SPACE"], [1000000, "UNCHARTED"]];
const distAt = (t) => 100 * t + 100 * t * t;
const fmtD = (d) => (d >= 1e6 ? (d / 1e6).toFixed(1) + "M KM" : Math.round(d).toLocaleString("en-US") + " KM");

function rocketSprite(ctx, x, y, col, flame, t) {
  x = Math.round(x); y = Math.round(y);
  if (flame) {
    const f = 4 + Math.round(Math.abs(Math.sin(t * 30)) * 4);
    ctx.fillStyle = "#ffd060"; ctx.fillRect(x - 2, y + 14, 5, f);
    ctx.fillStyle = "#ff7030"; ctx.fillRect(x - 1, y + 14, 3, f + 3);
  }
  ctx.fillStyle = PAL.ink; ctx.fillRect(x - 4, y - 9, 9, 24);
  ctx.fillStyle = PAL.cream; ctx.fillRect(x - 3, y - 6, 7, 20);
  ctx.fillStyle = col; ctx.fillRect(x - 3, y - 1, 7, 3); ctx.fillRect(x - 2, y - 8, 5, 3); ctx.fillRect(x - 1, y - 10, 3, 2);
  ctx.fillStyle = "#5cc8d0"; ctx.fillRect(x - 1, y + 3, 3, 3);
  ctx.fillStyle = col; ctx.fillRect(x - 6, y + 9, 3, 6); ctx.fillRect(x + 4, y + 9, 3, 6);
}

export const rocket = {
  station: "rocket",
  button(s) { const m = s.mem; return !s.done && (!m.phase || m.phase === "ready") ? "LAUNCH" : null; },
  press(s) { if (!s.mem.phase || s.mem.phase === "ready") { s.mem.phase = "countdown"; s.mem.cdAt = s.now; } },
  draw(ctx, s) {
    const r = s.result, list = r.players || [], n = list.length, m = s.mem;
    if (!m.phase) m.phase = s.done ? "complete" : "ready";
    if (m.phase === "countdown" && s.now - m.cdAt >= 3000) { m.phase = "flying"; m.flyAt = s.now; }
    const sorted = m.sorted || (m.sorted = [...list].sort((a, b) => a.crashTime - b.crashTime));
    const maxCrash = sorted[sorted.length - 1].crashTime;
    let el = 0;
    if (m.phase === "flying") el = ((s.now - m.flyAt) / 1000) * TIME_SCALE;
    if (m.phase === "complete" || s.done) el = m.elFinal != null ? m.elFinal : maxCrash;
    const ej = (typeof window !== "undefined" && window.__interactiveRocketEjects) || {};
    const interactive = typeof window !== "undefined" && window.__rocketInteractive;
    if (m.phase === "flying") {
      window.__rocketElapsed = el;
      const out = sorted.filter((p) => ej[p.name] || el >= p.crashTime).length;
      const crashedN = sorted.filter((p) => !ej[p.name] && el >= p.crashTime).length;
      if ((interactive && out >= n) || (!interactive && crashedN >= n - 1)) { m.phase = "complete"; m.elFinal = el; complete(); }
    }
    // the sky by altitude: blue, violet, black and stars; the planet's curve falling away
    const lead = distAt(Math.min(el, maxCrash)), alt = clamp(Math.log10(1 + lead) / 6, 0, 1);
    screenBg(ctx, mix("#4a7ad0", "#02020a", alt * 1.3), mix("#a8c8f0", "#0a0820", alt * 1.15));
    for (let i = 0; i < 70; i++) {
      const a = clamp((alt - 0.25) * 2, 0, 1) * (0.5 + 0.5 * Math.sin(s.t * 2 + i));
      if (a <= 0.05) continue;
      ctx.globalAlpha = a; ctx.fillStyle = "#ffffff";
      ctx.fillRect((i * 97) % W, (i * 53 + Math.floor(el * 6 * (1 + (i % 3)))) % H, 1, 1);
    }
    ctx.globalAlpha = 1;
    if (lead < 300) {                                                         // clouds streaming down past the pads
      for (let i = 0; i < 6; i++) {
        const cy = ((i * 61 + el * 120) % (H + 60)) - 30, cx = (i * 131) % W;
        ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fillRect(cx, cy, 60, 6); ctx.fillRect(cx + 10, cy - 4, 36, 4);
      }
    }
    const groundY = Math.round(H - 30 + Math.min(200, el * 40));             // the pads drop away below
    if (groundY < H) { rect(ctx, 0, groundY, W, H - groundY, "#2a3040"); rect(ctx, 0, groundY, W, 2, "#5a6070"); }
    if (lead > 300000) { const my = Math.round(40 + (lead - 300000) / 3000); disc(ctx, 380, my, 18, "#d8d8e0"); disc(ctx, 386, my - 4, 4, "#b0b0bc"); }
    // the rockets, side by side
    const colW = W / n;
    list.forEach((p, k) => {
      const i = s.index(p.name), x = Math.round(colW * (k + 0.5));
      const dead = !ej[p.name] && el >= p.crashTime, ejected = !!ej[p.name];
      let y = m.phase === "flying" || m.phase === "complete" || s.done ? 150 : groundY - 26;
      if (m.phase === "countdown") y = groundY - 26 + Math.round(Math.sin(s.t * 40) * 0.6);
      if (m.phase === "flying" && el < 2) y = groundY - 26 - el * 30;
      if (dead) {
        const since = el - p.crashTime;
        if (!m["x" + k]) { m["x" + k] = 1; s.fx.burst(x, y, 30, "spark", ["#ffd060", "#ff7030", "#ffffff"]); s.fx.burst(x, y, 10, "smoke", ["#5a5070", "#3a3050"]); }
        if (since < 1.5) { ctx.globalAlpha = clamp(1 - since / 1.5, 0, 1); rocketSprite(ctx, x, y + since * 60, "#5a5060", false, s.t); ctx.globalAlpha = 1; }
      } else if (ejected) {
        const e = ej[p.name], since = el - e.time;
        const py = y - 20 + since * 8;
        ctx.fillStyle = PCOL[i % PCOL.length]; ctx.fillRect(x - 6, py - 8, 13, 4); ctx.fillRect(x - 7, py - 5, 2, 2); ctx.fillRect(x + 6, py - 5, 2, 2);
        ctx.fillStyle = PAL.white; ctx.fillRect(x - 1, py, 3, 4);
        text(ctx, fmtD(e.distance), x, py + 8, PAL.white, { align: "center", shadow: PAL.ink });
      } else {
        rocketSprite(ctx, x, y, PCOL[i % PCOL.length], m.phase === "flying", s.t + k);
        if (m.phase === "flying" && Math.random() < 0.5) s.fx.burst(x, y + 20, 1, "smoke", ["#c8c8d8", "#9090a8"]);
      }
      text(ctx, p.name, x, H - 12, dead ? PAL.grey : PCOL[i % PCOL.length], { align: "center", shadow: PAL.ink, max: Math.floor(colW / 6) });
      if (dead) text(ctx, fmtD(p.distance), x, H - 22, PAL.red, { align: "center", shadow: PAL.ink, max: Math.floor(colW / 6) });
    });
    // the readouts
    if (m.phase === "countdown") { const c = 3 - Math.floor((s.now - m.cdAt) / 1000); text(ctx, String(Math.max(1, c)), W / 2, 90, PAL.white, { align: "center", scale: 5, shadow: PAL.ink }); }
    if (m.phase === "flying" || m.phase === "complete") {
      text(ctx, fmtD(lead), W - 10, 10, PAL.white, { align: "right", scale: 2, shadow: PAL.ink });
      const ms = MILESTONES.filter((q) => lead >= q[0]).pop();
      if (ms && m.lastMs !== ms[1]) { m.lastMs = ms[1]; m.msAt = s.now; }
      if (m.msAt && s.now - m.msAt < 2500) text(ctx, m.lastMs, W / 2, 60, PAL.cyan, { align: "center", shadow: PAL.ink });
    }
    if (m.phase === "ready") text(ctx, "ALL ROCKETS ON THE PADS", W / 2, 80, PAL.white, { align: "center", shadow: PAL.ink });
    hud(ctx, { ...s, total: 1 }, "ROCKET LAUNCH", interactive ? "EJECT BEFORE YOU BLOW" : s.goal === "winner" ? "LAST ROCKET FLYING WINS" : "FIRST TO BLOW IS PICKED");
    endFx(s);
    verdict(ctx, s, { y: 100 });
  },
};

// ---- Space Invaders: the players are the aliens; the cannon picks them off ----------------------------------------------------------
const ALIEN = ["..x.....x..", "...x...x...", "..xxxxxxx..", ".xx.xxx.xx.", "xxxxxxxxxxx", "x.xxxxxxx.x", "x.x.....x.x", "...xx.xx..."];
function alien(ctx, x, y, col, frame) {
  ctx.fillStyle = col;
  ALIEN.forEach((rw, j) => { for (let i = 0; i < rw.length; i++) if (rw[i] === "x" || (frame && j === 7 && (i === 1 || i === 9))) ctx.fillRect(x + i * 2, y + j * 2, 2, 2); });
}
export const invaders = {
  station: "space-invaders",
  draw(ctx, s) {
    const r = s.result, list = r.players || [], n = list.length, order = r.eliminationOrder || [];
    rect(ctx, 0, 0, W, H, "#04040c");
    for (let i = 0; i < 40; i++) { ctx.fillStyle = "rgba(255,255,255," + (0.2 + 0.3 * hash(i)) + ")"; ctx.fillRect((i * 113) % W, (i * 71) % 200, 1, 1); }
    const k = clamp(s.step, 0, order.length), killed = new Set(order.slice(0, k)), target = k > 0 ? order[k - 1] : null;
    const cols = Math.min(n, 4), rowsN = Math.ceil(n / cols), march = Math.round(Math.sin(s.t * 1.2) * 20), fr = Math.floor(s.t * 2) % 2;
    const pos = {};
    list.forEach((p, q) => {
      const cx = Math.round(W / 2 - ((cols - 1) * 90) / 2 + (q % cols) * 90 + march), cy = 60 + Math.floor(q / cols) * 50;
      pos[p.name] = [cx, cy];
    });
    // the cannon slides under the target and fires
    const fresh = target && s.stepT < 1.5;
    const tx = target ? pos[target][0] : W / 2;
    const cannonX = fresh ? Math.round(W / 2 + (tx - W / 2) * ease.out(clamp(s.stepT / 0.3, 0, 1))) : target ? tx : W / 2 + Math.round(Math.sin(s.t) * 60);
    list.forEach((p) => {
      const i = s.index(p.name), [cx, cy] = pos[p.name], dead = killed.has(p.name), justHit = p.name === target && fresh;
      if (dead && !(justHit && s.stepT < 0.4)) {
        if (justHit && s.stepT < 1.0) {
          if (!s.mem["b" + p.name]) { s.mem["b" + p.name] = 1; s.fx.burst(cx + 11, cy + 8, 26, "spark", [PCOL[i % PCOL.length], PAL.white, PAL.gold]); }
          ctx.fillStyle = PAL.white; for (let a = 0; a < 8; a++) ctx.fillRect(cx + 11 + Math.round(Math.cos(a) * s.stepT * 14), cy + 8 + Math.round(Math.sin(a) * s.stepT * 14), 2, 2);
        }
        text(ctx, p.name, cx + 11, cy + 22, "#3a3a52", { align: "center", max: 12 });
        return;
      }
      const win = s.done && p.selected;
      alien(ctx, cx, cy, win ? (Math.sin(s.t * 10) > 0 ? PAL.gold : PAL.white) : PCOL[i % PCOL.length], fr);
      text(ctx, p.name, cx + 11, cy + 22, PCOL[i % PCOL.length], { align: "center", max: 12 });
    });
    if (fresh && s.stepT < 0.4 && s.stepT > 0.15) { const [, ty] = pos[target]; rect(ctx, tx + 10, ty + 18, 2, 230 - ty - 18, "#ffffff"); rect(ctx, tx + 9, ty + 18, 4, 4, PAL.cyan); }
    // bunkers and the cannon
    for (let b = 0; b < 4; b++) { const bx = 70 + b * 110; rect(ctx, bx, 200, 30, 10, "#40e080"); rect(ctx, bx + 6, 196, 18, 4, "#40e080"); rect(ctx, bx + 10, 206, 10, 4, "#04040c"); }
    rect(ctx, cannonX - 9, 232, 19, 6, PAL.green); rect(ctx, cannonX - 2, 227, 5, 5, PAL.green); rect(ctx, cannonX, 224, 1, 3, PAL.green);
    rect(ctx, 0, 242, W, 1, PAL.green);
    text(ctx, "SCORE " + String(k * 100).padStart(4, "0"), 10, 250, PAL.white);
    text(ctx, (n - k) + " LEFT", W - 10, 250, PAL.white, { align: "right" });
    hud(ctx, s, "SPACE INVADERS", s.goal === "winner" ? "LAST ALIEN STANDING WINS" : "LAST ALIEN STANDING IS PICKED");
    endFx(s);
    verdict(ctx, s, { y: 120 });
  },
};

// ---- Battle Royale: the holo-table's map, the zone closing in -------------------------------------------------------------------------
export const royale = {
  station: "battle-royale",
  draw(ctx, s) {
    const r = s.result, list = r.players || [], n = list.length, order = r.eliminationOrder || [], zones = r.zones || [{ cx: 50, cy: 50, radius: 45 }];
    rect(ctx, 0, 0, W, H, "#031418");
    const M = 244, mx = 10, my = 18, sc = M / 100;
    // the map: islands of holo-terrain, a grid over it
    if (!s.mem.terrain) {
      const c = document.createElement("canvas"); c.width = M; c.height = M;
      const x = c.getContext("2d");
      for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
        const u = i / M, v = j / M, d = Math.hypot(u - 0.5, v - 0.5);
        const h = 0.6 - d + 0.12 * Math.sin(u * 13 + v * 5) + 0.08 * Math.sin(v * 17 - u * 7) + 0.05 * Math.sin((u + v) * 31);
        x.fillStyle = h < 0.1 ? "#062a34" : h < 0.16 ? "#0c4048" : h < 0.32 ? "#0f5a5a" : h < 0.45 ? "#127068" : "#1a8a78";
        x.fillRect(i, j, 1, 1);
      }
      x.fillStyle = "rgba(80,224,240,0.18)";
      for (let g = 0; g <= M; g += M / 10) { x.fillRect(Math.round(g), 0, 1, M); x.fillRect(0, Math.round(g), M, 1); }
      s.mem.terrain = c;
    }
    ctx.drawImage(s.mem.terrain, mx, my);
    const k = clamp(s.step, 0, order.length), z = zones[Math.min(k, zones.length - 1)], zp = zones[Math.max(0, Math.min(k - 1, zones.length - 1))];
    const u = s.stepT < 1.2 && k > 0 ? ease.inOut(s.stepT / 1.2) : 1;
    const zx = zp.cx + (z.cx - zp.cx) * u, zy = zp.cy + (z.cy - zp.cy) * u, zr = zp.radius + (z.radius - zp.radius) * u;
    // the storm outside the circle
    const img = ctx.getImageData(mx, my, M, M), d = img.data;
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
      const dx = i / sc - zx, dy = j / sc - zy, o = (j * M + i) * 4, dist = Math.hypot(dx, dy);
      if (dist > zr) { const n2 = (Math.sin(i * 0.3 + s.t * 3) + Math.sin(j * 0.25 - s.t * 2)) * 6; d[o] = d[o] * 0.5 + 70 + n2; d[o + 1] = d[o + 1] * 0.4 + 10; d[o + 2] = d[o + 2] * 0.5 + 90 + n2; }
      else if (dist > zr - 1.2) { d[o] = 240; d[o + 1] = 250; d[o + 2] = 255; }
    }
    ctx.putImageData(img, mx, my);
    const killed = new Set(order.slice(0, k)), target = k > 0 ? order[k - 1] : null;
    list.forEach((p) => {
      const i = s.index(p.name), q = (r.positions || []).find((t) => t.name === p.name) || p;
      const x = mx + q.x * sc, y = my + q.y * sc, dead = killed.has(p.name), justOut = p.name === target && s.stepT < 1.4;
      if (dead) {
        if (justOut && !s.mem["o" + p.name]) { s.mem["o" + p.name] = 1; s.fx.burst(x, y, 18, "spark", ["#c060ff", PAL.white]); }
        ctx.fillStyle = "#c060ff"; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 1, 1); ctx.fillRect(Math.round(x) + 2, Math.round(y) - 2, 1, 1);
        ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); ctx.fillRect(Math.round(x) - 2, Math.round(y) + 2, 1, 1); ctx.fillRect(Math.round(x) + 2, Math.round(y) + 2, 1, 1);
        return;
      }
      const pulse = s.done && p.selected ? Math.round(Math.abs(Math.sin(s.t * 6)) * 3) : 0;
      disc(ctx, x, y, 6 + pulse, PAL.ink); disc(ctx, x, y, 5 + pulse, PCOL[i % PCOL.length]);
      text(ctx, (p.name || "?")[0], x, y - 3, PAL.ink, { align: "center" });
      text(ctx, p.name, x, y + 8, PAL.white, { align: "center", shadow: PAL.ink, max: 8 });
    });
    // the roster on the right
    const px0 = mx + M + 14;
    text(ctx, "ZONE " + Math.min(k + 1, zones.length) + " / " + zones.length, px0, my + 2, PAL.cyan2);
    text(ctx, (n - k) + " ALIVE", px0, my + 14, PAL.white);
    list.forEach((p, q) => {
      const i = s.index(p.name), dead = killed.has(p.name), y = my + 34 + q * 16;
      rect(ctx, px0, y, 200, 13, dead ? "rgba(255,255,255,0.03)" : "rgba(80,224,240,0.08)");
      rect(ctx, px0, y, 3, 13, dead ? "#3a3a52" : PCOL[i % PCOL.length]);
      text(ctx, p.name, px0 + 8, y + 3, dead ? "#4a4a62" : PAL.white, { max: 16 });
      text(ctx, dead ? "OUT " + (order.indexOf(p.name) + 1) : s.done && p.selected ? "LAST ONE IN" : "IN", px0 + 196, y + 3, dead ? "#c060ff" : PAL.green, { align: "right" });
    });
    hud(ctx, s, "BATTLE ROYALE", s.goal === "winner" ? "LAST ONE IN THE ZONE WINS" : "FIRST CAUGHT OUTSIDE IS PICKED");
    endFx(s);
    verdict(ctx, s, { y: 200 });
  },
};

// ---- Stock Market: the ticker wall's terminal, every player's stock running for sixty ticks ----------------------------------------------
export const stocks = {
  station: "stock-market",
  draw(ctx, s) {
    const r = s.result, list = r.players || [], n = list.length, m = s.mem;
    rect(ctx, 0, 0, W, H, "#020a06");
    for (let y = 30; y < H - 24; y += 20) rect(ctx, 10, y, 330, 1, "rgba(64,224,128,0.08)");
    if (r.draftPhase) {
      const ds = (typeof window !== "undefined" && window.__stockDraftState) || {}, picks = ds.playerStocks || {};
      text(ctx, "THE DRAFT: PICK YOUR STOCK", W / 2, 40, PAL.green, { align: "center", scale: 2 });
      (r.stockPool || []).forEach((st, q) => {
        const x = 30 + (q % 4) * 108, y = 80 + Math.floor(q / 4) * 70, owner = Object.keys(picks).find((nm) => picks[nm] === st.ticker);
        box(ctx, x, y, 100, 56, owner ? "#0c2a18" : "#06140c", owner ? PAL.green : "#1a4028");
        text(ctx, st.ticker, x + 6, y + 6, owner ? PAL.white : PAL.green, { scale: 2 });
        text(ctx, (st.note || "").toUpperCase(), x + 6, y + 26, PAL.grey, { max: 15 });
        if (owner) text(ctx, owner, x + 6, y + 42, PCOL[s.index(owner) % PCOL.length], { max: 15 });
      });
      hud(ctx, { ...s, total: 1 }, "STOCK MARKET", "TAKE YOUR PICK");
      return;
    }
    // trading: starts on its own after a beat, four ticks a second, sixty ticks
    if (!m.phase) { m.phase = s.done ? "complete" : "ready"; m.readyAt = s.now; }
    if (m.phase === "ready" && s.now - m.readyAt >= 1200) { m.phase = "trading"; m.tradeAt = s.now; window.__stockDrawIndex = 0; }
    let idx = m.phase === "trading" ? Math.min(59, Math.floor(((s.now - m.tradeAt) / 1000) * 4)) : m.phase === "complete" || s.done ? 59 : 0;
    if (m.phase === "trading") {
      window.__stockDrawIndex = idx;
      if (idx >= 59) {
        m.phase = "complete";
        const sell = (typeof window !== "undefined" && window.__stockSellState) || {};
        if (window.__stockInteractive && r.isInteractiveChart && s.helpers) {
          const fin = r.players.map((p) => {
            const sold = sell[p.name], fp = sold ? sold.price : p.prices[59], pct = ((fp - 100) / 100) * 100;
            return { ...p, endPrice: fp, percentChange: pct, sold: !!sold, headline: p.ticker + " — " + (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%",
                     subline: sold ? "Sold at $" + fp.toFixed(2) : "Held to $" + fp.toFixed(2), chips: [p.ticker, (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%", sold ? "SOLD" : "HELD"] };
          }).sort((a, b) => b.percentChange - a.percentChange);
          fin.forEach((p, q) => { p.rank = q + 1; });
          const sel = r.selectionGoal === "winner" ? fin[0] : fin[fin.length - 1];
          const H2 = s.helpers;
          r.selectedName = sel.name;
          r.headline = H2.pickRandomMessage(r.selectionGoal === "winner" ? H2.WIN_MESSAGES : H2.LOSE_MESSAGES, sel.name, r.selectionGoal === "winner" ? "win" : "lose");
          r.summary = sel.name + "'s " + sel.ticker + " " + (sel.percentChange >= 0 ? "gained" : "lost") + " " + Math.abs(sel.percentChange).toFixed(1) + "%.";
          r.isTie = false;
          r.players = fin.map((p) => ({ ...p, selected: p.name === sel.name }));
        }
        complete();
      }
    }
    const sell = (typeof window !== "undefined" && window.__stockSellState) || {};
    // the chart: every line from 100, the scale fitted to what's been drawn
    let lo = 100, hi = 100;
    list.forEach((p) => { for (let q = 0; q <= idx; q++) { lo = Math.min(lo, p.prices[q]); hi = Math.max(hi, p.prices[q]); } });
    lo *= 0.95; hi *= 1.05;
    const X0 = 14, X1 = 334, Y0 = 34, Y1 = H - 30;
    const yOf = (v) => Math.round(Y1 - ((v - lo) / (hi - lo || 1)) * (Y1 - Y0)), xOf = (q) => Math.round(X0 + ((X1 - X0) * q) / 59);
    rect(ctx, X0, yOf(100), X1 - X0, 1, "rgba(255,255,255,0.25)");
    text(ctx, "100", X1 + 3, yOf(100) - 3, PAL.grey);
    list.forEach((p) => {
      const i = s.index(p.name), col = PCOL[i % PCOL.length], soldAt = sell[p.name] ? Math.round(sell[p.name].progress != null ? sell[p.name].progress : 59) : null;
      ctx.fillStyle = col;
      for (let q = 1; q <= idx; q++) {
        const xa = xOf(q - 1), xb = xOf(q), ya = yOf(p.prices[q - 1]), yb = yOf(p.prices[q]);
        const steps = Math.max(Math.abs(xb - xa), Math.abs(yb - ya), 1);
        if (soldAt != null && q > soldAt) ctx.globalAlpha = 0.25;
        for (let t = 0; t <= steps; t++) ctx.fillRect(Math.round(xa + ((xb - xa) * t) / steps), Math.round(ya + ((yb - ya) * t) / steps), 1, 1);
        ctx.globalAlpha = 1;
      }
      const yy = yOf(p.prices[Math.min(idx, soldAt != null ? soldAt : idx)]);
      rect(ctx, xOf(Math.min(idx, soldAt != null ? soldAt : idx)) - 1, yy - 1, 3, 3, PAL.white);
    });
    // the board on the right: tickers, prices, change
    const bx = 350;
    list.forEach((p, q) => {
      const i = s.index(p.name), y = 34 + q * 26, sold = sell[p.name], price = sold ? sold.price : p.prices[idx], pct = ((price - 100) / 100) * 100;
      const hot = s.done && (p.selected || p.tied);
      box(ctx, bx, y, 122, 22, hot ? (s.goal === "winner" ? "#2a2408" : "#2a0a0a") : "#06140c", hot ? (s.goal === "winner" ? PAL.gold : PAL.red) : "#1a4028");
      rect(ctx, bx + 1, y + 1, 2, 20, PCOL[i % PCOL.length]);
      text(ctx, p.name, bx + 6, y + 3, PCOL[i % PCOL.length], { max: 9 });
      text(ctx, p.ticker || "", bx + 118, y + 3, PAL.grey, { align: "right" });
      text(ctx, (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%" + (sold ? " SOLD" : ""), bx + 6, y + 13, pct >= 0 ? PAL.green : PAL.red);
    });
    // the ticker tape
    rect(ctx, 0, H - 14, W, 14, "#140806");
    const tape = list.map((p) => (p.ticker || "") + " " + p.prices[idx].toFixed(1)).join("   ") + "   ";
    const off = Math.floor(s.t * 30) % (textW(tape) + 40);
    text(ctx, tape + tape, -off, H - 10, "#ffb040");
    if (m.phase === "ready") text(ctx, "THE BELL'S ABOUT TO RING...", 174, 120, PAL.white, { align: "center", shadow: PAL.ink });
    hud(ctx, { ...s, total: 1 }, "STOCK MARKET", window.__stockInteractive ? "SELL BEFORE IT TANKS" : s.goal === "winner" ? "BEST STOCK WINS" : "WORST STOCK IS PICKED");
    endFx(s);
    verdict(ctx, s, { y: 120 });
  },
};

// ---- the Bomb: passed hand to hand round the bomb table ------------------------------------------------------------------------------------
function bombSprite(ctx, x, y, t, lit = true) {
  x = Math.round(x); y = Math.round(y);
  disc(ctx, x, y, 6, PAL.ink); disc(ctx, x, y, 5, "#2a2a36"); ctx.fillStyle = "#5a5a6e"; ctx.fillRect(x - 3, y - 3, 2, 2);
  rect(ctx, x + 2, y - 8, 3, 3, "#5a5a6e"); rect(ctx, x + 4, y - 10, 1, 2, "#c8a060");
  if (lit) { const f = Math.floor(t * 20) % 2; rect(ctx, x + 4 - f, y - 12 - f, 2, 2, f ? "#ffd060" : "#ff7030"); }
}
export const bomb = {
  station: "bomb",
  button(s) { return !s.bomb && !s.done && (!s.mem.phase || s.mem.phase === "ready") ? "LIGHT THE FUSE" : null; },
  press(s) { if (!s.mem.phase || s.mem.phase === "ready") { s.mem.phase = "ticking"; s.mem.tickAt = s.now; } },
  draw(ctx, s) {
    const sc = scene(ctx, s, "bomb", [0, 0.4]);
    const r = s.result, list = r.players || [], n = list.length, m = s.mem, B = s.bomb;
    const a = sc.a || { centre: [23.6, 11.2, 0.84] };
    const [cx, cr] = a.centre;
    const ring = list.map((p, k) => {
      const ang = Math.PI + (k / Math.max(1, n - 1)) * Math.PI * (n > 1 ? 1 : 0);
      return { x: cx + Math.cos(ang) * 1.7, r: cr + Math.sin(ang) * 0.9 - 0.2, facing: Math.sin(ang) < -0.3 ? "down" : Math.cos(ang) < 0 ? "right" : "left" };
    });
    let holder = null, phaseTxt = "", out = new Set();
    if (B && B.alive) {                                                       // the pass-it-on game
      holder = B.holder;
      (B.eliminated || []).forEach((nm) => out.add(nm));
      if (B.phase === "playing") {
        const left = Math.max(0, 4000 - (s.now - (B.holderStartedAt || s.now)));
        phaseTxt = (holder || "") + " HAS IT - " + (left / 1000).toFixed(1) + "S TO THROW";
      } else if (B.phase === "exploded") phaseTxt = "BOOM";
      else if (B.phase === "gameOver") phaseTxt = (B.winner || "") + " IS THE LAST ONE STANDING";
      if (B.phase === "exploded" && m.boomRound !== B.round) {
        m.boomRound = B.round;
        const k = list.findIndex((p) => p.name === holder);
        if (k >= 0) { const [x, y] = sc.px(ring[k].x, ring[k].r, 1.6); s.fx.burst(x, y, 40, "spark", ["#ffd060", "#ff7030", PAL.white]); s.fx.burst(x, y, 16, "smoke", ["#4a4050", "#2a2030"]); }
      }
    } else {                                                                  // the lone fuse: the sequence plays out
      if (!m.phase) m.phase = s.done ? "complete" : "ready";
      const total = r.totalTicks || 1, seq = r.sequence || [];
      const iv = (q) => (total - q <= 5 ? 250 : total - q <= 10 ? 400 : 600);
      let tick = 0;
      if (m.phase === "ticking") {
        const el = s.now - m.tickAt;
        let sum = 0;
        for (let q = 0; q < total; q++) { sum += iv(q); if (el >= sum) tick = q + 1; else break; }
        if (tick >= total) { m.phase = "complete"; m.boomAt = s.now; complete(); }
      }
      if (m.phase === "complete" || s.done) tick = total;
      holder = seq[Math.min(tick, total - 1)] || r.selectedName;
      m.tickN = tick;
      if ((m.phase === "complete" || s.done) && !m.boomed) {
        m.boomed = 1;
        const k = list.findIndex((p) => p.name === holder);
        if (k >= 0) { const [x, y] = sc.px(ring[k].x, ring[k].r, 1.6); s.fx.burst(x, y, 40, "spark", ["#ffd060", "#ff7030", PAL.white]); s.fx.burst(x, y, 16, "smoke", ["#4a4050", "#2a2030"]); }
      }
      phaseTxt = m.phase === "ready" ? "WHO'S HOLDING IT WHEN IT GOES?" : m.phase === "ticking" ? "TICK " + tick + "..." : "BOOM";
      if (m.phase === "complete" || s.done) out.add(holder);
    }
    players(ctx, s, sc, ring, {
      mood: (p) => (out.has(p.name) ? "slump" : p.name === holder && !(B && B.phase === "gameOver") ? "hit" : s.done || (B && B.phase === "gameOver") ? "cheer" : "idle"),
      active: list.findIndex((p) => p.name === holder),
    });
    // the bomb: over the holder's head, or flying to them when it's just been thrown
    const k = list.findIndex((p) => p.name === holder);
    if (k >= 0 && !(B && (B.phase === "exploded" || B.phase === "gameOver")) && !(m.phase === "complete" || (!B && s.done))) {
      if (m.lastHolder !== holder) { m.from = m.lastHolder; m.passAt = s.now; m.lastHolder = holder; }
      const [tx, ty] = sc.px(ring[k].x, ring[k].r, 1.85);
      let x = tx, y = ty;
      const fk = list.findIndex((p) => p.name === m.from), u = clamp((s.now - (m.passAt || 0)) / 350, 0, 1);
      if (fk >= 0 && u < 1) { const [fx, fy] = sc.px(ring[fk].x, ring[fk].r, 1.85); x = fx + (tx - fx) * u; y = fy + (ty - fy) * u - Math.sin(u * Math.PI) * 24; }
      bombSprite(ctx, x, y, s.t);
      if (B && B.phase === "playing") {
        const left = clamp(1 - (s.now - (B.holderStartedAt || s.now)) / 4000, 0, 1);
        for (let q = 0; q < 16; q++) if (q / 16 < left) { const an = (q / 16) * Math.PI * 2 - Math.PI / 2; ctx.fillStyle = left < 0.3 ? PAL.red : PAL.gold; ctx.fillRect(Math.round(x + Math.cos(an) * 10), Math.round(y + Math.sin(an) * 10), 1, 1); }
      }
    }
    out.forEach((nm) => { const q = list.findIndex((p) => p.name === nm); if (q >= 0) { const [x, y] = sc.px(ring[q].x, ring[q].r, 1.9); icon(ctx, "skull", x - 3, y - 6, 1); } });
    rect(ctx, 0, H - 20, W, 20, "rgba(8,4,24,0.86)"); rect(ctx, 0, H - 20, W, 1, PAL.pink);
    text(ctx, phaseTxt, W / 2, H - 13, PAL.white, { align: "center", max: 70 });
    hud(ctx, { ...s, total: 1 }, "THE BOMB", B && B.alive ? "ROUND " + (B.round || 1) + " - " + (B.alive || []).length + " LEFT" : s.goal === "winner" ? "DON'T HOLD IT WHEN IT BLOWS" : "HOLD IT WHEN IT BLOWS AND YOU'RE PICKED");
    endFx(s);
    verdict(ctx, s, { y: 40 });
  },
};
