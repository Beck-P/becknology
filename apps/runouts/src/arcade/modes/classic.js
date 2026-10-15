// The luck games at their stations in the Runout Room: the coin table, the marble urn, the slot bank, the wheel of
// fortune and the lucky-number board.
import { PAL, PCOL, W, H, text, textW, hud, verdict, clamp, ease, hash, disc, roomPx } from "../kit.js";
import { scene, row, players, bubble, spot } from "./common.js";
import { icon } from "./icons.js";

const goalCol = (s, p) => (p.tied ? PAL.yel : s.goal === "winner" ? PAL.gold : PAL.red);
function endFx(s) {
  if (s.done && !s.mem.end) { s.mem.end = 1; if (s.goal === "winner" && !s.result.isTie) s.fx.rain(60, [PAL.gold, PAL.pink, PAL.cyan, PAL.white]); }
}
/** A coin, 9 across, edge-on as it spins (spin 0..1 per turn); heads gold with a crown, tails silver with a moon. */
function coin(ctx, x, y, face, spin = 0) {
  const sx = Math.abs(Math.cos(spin * Math.PI * 2)), w = Math.max(1, Math.round(4 * sx));
  const heads = face === "H";
  disc(ctx, x, y, w + 1, PAL.ink, 5);
  disc(ctx, x, y, w, heads ? "#e8c040" : "#b8c0cc", 4);
  if (w >= 3) {
    ctx.fillStyle = heads ? "#a07010" : "#606878";
    if (heads) { ctx.fillRect(x - 2, y, 5, 2); ctx.fillRect(x - 2, y - 2, 1, 2); ctx.fillRect(x, y - 2, 1, 2); ctx.fillRect(x + 2, y - 2, 1, 2); }
    else { ctx.fillRect(x - 1, y - 2, 2, 1); ctx.fillRect(x - 2, y - 1, 1, 3); ctx.fillRect(x - 1, y + 2, 2, 1); }
    ctx.fillStyle = heads ? "#fff0a0" : "#e8eef8"; ctx.fillRect(x - w + 1, y - 3, 1, 1);
  }
}

// ---- Coin Gauntlet: five flips each at the coin table, heads counted -----------------------------------------------------
export const coins = {
  station: "coin-flips",
  draw(ctx, s) {
    const sc = scene(ctx, s, "coin-flips", [1.6, 0.9]);
    const r = s.result, list = r.players || [], n = list.length;
    const a = sc.a || { centre: [5, 7.2, 0.84], R: 0.78 };
    const [cx, cr] = a.centre;
    const seats = row(n, cx - 2.2, cx + 2.2, cr - 1.25).map((q, k) => ({ ...q, r: q.r - (Math.abs(k - (n - 1) / 2) < 1 ? 0 : 0.05) }));
    const cur = Math.min(Math.floor(s.step / 5), n - 1), flips = s.step;           // step k: k flips done in all
    const active = s.done ? null : Math.min(Math.floor(s.step / 5), n - 1);
    if (active != null) { const [x, y] = sc.px(seats[active].x, seats[active].r); spot(ctx, x, y, 14); }
    players(ctx, s, sc, seats, { active });
    // the flip in the air: the latest one, from the flipper's hand up and down onto the table
    if (flips > 0 && s.stepT < 1.0 && !s.done) {
      const k = Math.floor((flips - 1) / 5), f = (flips - 1) % 5, p = list[k];
      const [sx, sy] = sc.px(seats[k].x, seats[k].r, 1.0), [tx, ty] = sc.px(cx + (f - 2) * 0.22, cr + 0.1, a.centre[2]);
      const u = clamp(s.stepT / 0.8, 0, 1), x = sx + (tx - sx) * u, y = sy + (ty - sy) * u - Math.sin(u * Math.PI) * 40;
      coin(ctx, x, y, p.flips[f], u < 1 ? s.stepT * 5 : 0);
      if (u >= 1 && !s.mem["c" + flips]) { s.mem["c" + flips] = 1; s.fx.burst(tx, ty, 5, "spark", [PAL.gold, PAL.white]); }
    }
    // each player's five on the strip along the bottom, heads counted
    const bw = Math.min(88, Math.floor(470 / n) - 4), y0 = H - 40;
    ctx.fillStyle = "rgba(8,4,24,0.86)"; ctx.fillRect(0, y0 - 4, W, 44); ctx.fillStyle = PAL.pink; ctx.fillRect(0, y0 - 4, W, 1);
    list.forEach((p, k) => {
      const i = s.index(p.name), x = Math.round(240 - (n * (bw + 4) - 4) / 2 + k * (bw + 4));
      const hot = s.done && (p.selected || p.tied);
      ctx.fillStyle = hot ? "rgba(232,64,64,0.25)" : "rgba(255,255,255,0.04)"; if (hot && (p.tied || s.goal === "winner")) ctx.fillStyle = "rgba(232,192,64,0.25)";
      ctx.fillRect(x, y0, bw, 34);
      ctx.fillStyle = PCOL[i % PCOL.length]; ctx.fillRect(x, y0, bw, 1);
      text(ctx, p.name, x + 3, y0 + 3, PCOL[i % PCOL.length], { max: Math.floor((bw - 16) / 6) });
      let heads = 0;
      for (let f = 0; f < 5; f++) {
        const done = k * 5 + f < flips || s.done, fx = x + 8 + f * Math.min(16, (bw - 10) / 5);
        if (done) { coin(ctx, Math.round(fx), y0 + 23, p.flips[f]); if (p.flips[f] === "H") heads++; }
        else { ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(Math.round(fx) - 3, y0 + 21, 7, 5); }
      }
      text(ctx, String(heads), x + bw - 4, y0 + 3, PAL.white, { align: "right" });
    });
    hud(ctx, s, "COIN GAUNTLET", s.goal === "winner" ? "MOST HEADS WINS" : "FEWEST HEADS IS PICKED");
    endFx(s);
    verdict(ctx, s, { y: 110 });
  },
};

// ---- Black (or Gold) Marble: drawn from the urn one by one; the odd one out decides ------------------------------------------
export const marble = {
  station: "black-marble",
  draw(ctx, s) {
    const sc = scene(ctx, s, "black-marble", [0, 0.6]);
    const r = s.result, list = r.players || [], n = list.length;
    const a = sc.a || { urn: [9, 6.55, 1.4], tray: [9, 6.87, 1.06] };
    const [ux, ur] = a.urn;
    const seats = row(n, ux - 2.4, ux + 2.4, ur + 1.45).map((q) => ({ ...q, facing: "up" }));
    const drawn = clamp(s.step, 0, n), win = s.goal === "winner";
    const target = win ? "Gold" : "Black";
    const active = s.done ? null : (s.stepT < 1.4 && drawn > 0 ? drawn - 1 : drawn < n ? drawn : null);
    players(ctx, s, sc, seats, { active, mood: (p, k) => (s.done ? ((p.selected) === win ? "cheer" : p.selected ? "slump" : "idle") : k === drawn - 1 && s.stepT < 1.2 ? "walk" : "idle") });
    const MC = { Black: "#14101c", White: "#f4f0f8", Gold: "#ffd040" };
    // the marble just drawn: up out of the urn's neck, held over the drawer's head
    for (let k = 0; k < drawn; k++) {
      const p = list[k], fresh = k === drawn - 1 && s.stepT < 1.6;
      const [hx, hy] = sc.px(seats[k].x, seats[k].r, 1.9);
      let x = hx, y = hy;
      if (fresh) {
        const [nx, ny] = sc.px(ux, ur, 1.9), u = ease.inOut(clamp(s.stepT / 1.1, 0, 1));
        x = nx + (hx - nx) * u; y = ny + (hy - ny) * u - Math.sin(u * Math.PI) * 18;
      }
      const odd = p.marble === target;
      disc(ctx, x, y, 5, PAL.ink);
      disc(ctx, x, y, 4, MC[p.marble] || "#f4f0f8");
      ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 2, 1);
      if (odd && (!fresh || s.stepT > 1.1)) {
        if (!s.mem["m" + k]) { s.mem["m" + k] = 1; s.fx.burst(x, y, 24, win ? "confetti" : "smoke", win ? [PAL.gold, PAL.white] : ["#3a3050", "#14101c", "#5a5070"]); }
        const glow = Math.sin(s.t * 8) > 0 ? (win ? PAL.gold : PAL.red) : PAL.white;
        ctx.fillStyle = glow; ctx.fillRect(Math.round(x) - 6, Math.round(y) - 7, 13, 1); ctx.fillRect(Math.round(x) - 6, Math.round(y) + 7, 13, 1);
      }
    }
    hud(ctx, s, win ? "GOLD MARBLE" : "BLACK MARBLE", win ? "DRAW THE GOLD ONE AND WIN" : "DRAW THE BLACK ONE AND YOU'RE PICKED");
    const left = n - drawn;
    if (!s.done) text(ctx, left + " IN THE URN, ONE OF THEM " + target.toUpperCase(), 240, 252, PAL.white, { align: "center", shadow: PAL.ink });
    endFx(s);
    verdict(ctx, s);
  },
};

// ---- Slot Machine: each player pulls the middle machine; the reels spin big under the bank --------------------------------
const SYMS = ["🍒", "🍋", "⭐", "🍀", "🔔", "7️⃣"];
export const slots = {
  station: "slots",
  draw(ctx, s) {
    const sc = scene(ctx, s, "slots", [3.2, 2.4], false);
    const r = s.result, list = r.players || [], n = list.length;
    const done = clamp(s.step, 0, n);
    const seats = row(n, 0.9, 4.6, 4.7).map((q) => ({ ...q, facing: "up" }));
    const active = s.done ? null : (s.stepT < 2.2 && done > 0 ? done - 1 : done < n ? done : null);
    players(ctx, s, sc, seats, { active });
    // the reel window: whoever pulled last, spinning then stopping left to right
    const k = s.done ? null : (done > 0 && s.stepT < 3.5 ? done - 1 : null);
    const cw = 30, chh = 34, bx = k != null ? Math.round(clamp(sc.px(seats[k].x, seats[k].r)[0] - 48, 8, W - 120)) : 0, by = 150;
    if (k != null) {
      ctx.fillStyle = "rgba(8,4,24,0.9)"; ctx.fillRect(bx - 8, by - 18, cw * 3 + 22, chh + 34);
      ctx.fillStyle = PAL.pink; ctx.fillRect(bx - 8, by - 18, cw * 3 + 22, 1);
      const p = list[k];
      text(ctx, p.name + " PULLS", bx + (cw * 3 + 6) / 2, by - 13, PCOL[s.index(p.name) % PCOL.length], { align: "center", max: 16 });
      for (let j = 0; j < 3; j++) {
        const x = bx + j * (cw + 3), stop = 0.7 + j * 0.45, spinning = s.stepT < stop;
        ctx.fillStyle = PAL.ink; ctx.fillRect(x - 1, by - 1, cw + 2, chh + 2);
        ctx.fillStyle = "#f0ead8"; ctx.fillRect(x, by, cw, chh);
        if (spinning) {
          const off = (s.t * 220 + j * 13) % 18;
          for (let q = -1; q < 3; q++) icon(ctx, SYMS[(Math.floor(s.t * 12) + q + j) % 6], x + 6, by + q * 18 + off - 4, 2);
          ctx.fillStyle = "rgba(240,234,216,0.5)"; ctx.fillRect(x, by, cw, 6); ctx.fillRect(x, by + chh - 6, cw, 6);
        } else {
          icon(ctx, p.reels[j], x + 6, by + 8, 2);
          if (!s.mem["s" + k + j]) { s.mem["s" + k + j] = 1; s.fx.burst(x + cw / 2, by + chh, 4, "spark", [PAL.white]); }
        }
      }
      if (s.stepT > 1.7) text(ctx, (p.score && p.score.label || "").toUpperCase(), bx + (cw * 3 + 6) / 2, by + chh + 5, PAL.gold, { align: "center", max: 16 });
    } else if (!s.done && list[done]) {
      text(ctx, list[done].name + " TO PULL", W / 2, 150, PAL.white, { align: "center", shadow: PAL.ink, max: 24 });
    }
    // everyone's line along the bottom
    const bw = Math.min(110, Math.floor(470 / n) - 4), y0 = H - 34;
    ctx.fillStyle = "rgba(8,4,24,0.86)"; ctx.fillRect(0, y0 - 4, W, 38); ctx.fillStyle = PAL.pink; ctx.fillRect(0, y0 - 4, W, 1);
    list.forEach((p, q) => {
      const i = s.index(p.name), x = Math.round(240 - (n * (bw + 4) - 4) / 2 + q * (bw + 4)), hot = s.done && (p.selected || p.tied);
      ctx.fillStyle = hot ? (p.tied || s.goal === "winner" ? "rgba(232,192,64,0.25)" : "rgba(232,64,64,0.25)") : "rgba(255,255,255,0.04)";
      ctx.fillRect(x, y0, bw, 28);
      ctx.fillStyle = PCOL[i % PCOL.length]; ctx.fillRect(x, y0, bw, 1);
      text(ctx, p.name, x + 3, y0 + 3, PCOL[i % PCOL.length], { max: Math.floor((bw - 4) / 6) });
      const shown = q < done && (q < done - 1 || s.stepT > 1.8 || s.done);
      for (let j = 0; j < 3; j++) {
        if (shown) icon(ctx, p.reels[j], x + 3 + j * 11, y0 + 15, 1);
        else { ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(x + 3 + j * 11, y0 + 15, 9, 9); }
      }
    });
    hud(ctx, s, "SLOT MACHINE", s.goal === "winner" ? "BEST LINE WINS" : "WORST LINE IS PICKED");
    endFx(s);
    verdict(ctx, s, { y: 150 });
  },
};

// ---- The Wheel: spun once on its stand; the slice under the pointer is picked ----------------------------------------------------
export const wheel = {
  station: "wheel",
  draw(ctx, s) {
    const sc = scene(ctx, s, "wheel", [0.6, 1.6]);
    const r = s.result, names = (r.wheel && r.wheel.names) || (r.players || []).map((p) => p.name), n = names.length;
    const a = sc.a || { centre: [6.4, 3.41, 1.95], R: 1.2 };
    const [wx, wy] = sc.px(a.centre[0], a.centre[1], a.centre[2]), R = Math.round(a.R * 32);
    const ry = Math.round(R * Math.SQRT1_2 * 1.0);                 // the disc faces the camera: squashed by the 45° view
    const end = r.wheel ? r.wheel.rotation : 0, from = end - 360 * 5 - 47;
    const spinT = s.step >= 1 ? (s.step >= 2 || s.done ? 1 : clamp(s.stepT / 3.4, 0, 1)) : 0;
    const ang = s.step >= 1 ? from + (end - from) * ease.out(spinT) : from + Math.sin(s.t * 0.7) * 3;
    const seg = 360 / n;
    // the face, pixel by pixel: each slice in its player's colour
    const rad = (ang * Math.PI) / 180;
    for (let y = -ry; y <= ry; y++) {
      for (let x = -R; x <= R; x++) {
        const nx = x / R, ny = y / ry, d = nx * nx + ny * ny;
        if (d > 1) continue;
        let th = Math.atan2(nx, -ny) - rad;                       // clockwise from the top, turned back by the wheel's angle
        th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const idx = Math.floor((th * 180) / Math.PI / seg) % n, edge = ((th * 180) / Math.PI) % seg < 1.4;
        const col = PCOL[s.index(names[idx]) % PCOL.length];
        ctx.fillStyle = edge || d > 0.9 ? PAL.ink : d < 0.05 ? PAL.brass : col;
        ctx.fillRect(wx + x, wy + y, 1, 1);
      }
    }
    // initials round the face, riding with the slices
    names.forEach((nm, idx) => {
      const th = ((idx + 0.5) * seg * Math.PI) / 180 + rad;
      const tx = wx + Math.sin(th) * R * 0.62, ty = wy - Math.cos(th) * ry * 0.62;
      text(ctx, nm[0] || "?", tx, ty - 3, PAL.ink, { align: "center" });
    });
    // the pointer, ticking against the pegs while it spins
    const tick = spinT > 0 && spinT < 1 ? Math.abs(Math.sin(((ang % seg) / seg) * Math.PI)) * 3 : 0;
    ctx.fillStyle = PAL.ink; ctx.fillRect(wx - 4, wy - ry - 8 - tick, 9, 4);
    ctx.fillStyle = PAL.red; ctx.fillRect(wx - 3, wy - ry - 7 - tick, 7, 3); ctx.fillRect(wx - 1, wy - ry - 4 - tick, 3, 3);
    // the players in a half-ring in front
    const seats = row(n, a.centre[0] - 2.6, a.centre[0] + 2.6, 5.4).map((q) => ({ ...q, facing: "up" }));
    players(ctx, s, sc, seats, {});
    if (s.step >= 1 && spinT >= 1 && !s.mem.landed) { s.mem.landed = 1; s.fx.burst(wx, wy - ry - 6, 20, "spark", [PAL.gold, PAL.white, PAL.red]); }
    hud(ctx, s, "WHEEL OF FORTUNE", s.step === 0 ? "ONE SPIN DECIDES IT" : spinT < 1 ? "ROUND AND ROUND..." : "");
    endFx(s);
    verdict(ctx, s, { y: 175 });
  },
};

// ---- Random Number: the lucky-number board flips to each player's number -----------------------------------------------------
export const number = {
  station: "rng",
  draw(ctx, s) {
    const sc = scene(ctx, s, "rng", [0, 1.4]);
    const r = s.result, list = r.players || [], n = list.length;
    const a = sc.a || { cells: [[9.0, 9.36], [9.42, 9.78], [9.84, 10.2]], z0: 1.31, z1: 1.91, r: 3.17 };
    const shown = clamp(s.step, 0, n), cur = s.done ? null : shown > 0 && s.stepT < 2.4 ? shown - 1 : null;
    // between flips the board holds the last number shown; when it's over, the number that decided it
    const held = s.done ? (list.find((p) => p.selected) || list[shown - 1]) : shown > 0 ? list[shown - 1] : null;
    const val = cur != null ? list[cur].value : held ? held.value : null;
    // the three flaps: scrambling, then stopping left to right on the number
    a.cells.forEach((cell, j) => {
      const [x0, y0] = sc.px(cell[0], a.r, a.z1), [x1, y1] = sc.px(cell[1], a.r, a.z0);
      const w = Math.round(x1 - x0), h = Math.round(y1 - y0);
      ctx.fillStyle = "#1e1e26"; ctx.fillRect(Math.round(x0), Math.round(y0), w, h);
      let d = " ";
      if (val != null) {
        const digits = String(val).padStart(3, "0"), stopAt = 0.6 + j * 0.35;
        d = cur != null && s.stepT < stopAt ? String(Math.floor(hash(Math.floor(s.t * 20) + j * 3) * 10)) : digits[j];
        if (cur != null && s.stepT >= stopAt && !s.mem["f" + cur + j]) { s.mem["f" + cur + j] = 1; s.fx.burst(x0 + w / 2, y0 + h / 2, 3, "spark", [PAL.cream]); }
      }
      text(ctx, d, x0 + w / 2, y0 + h / 2 - 7, PAL.cream, { align: "center", scale: 2 });
      ctx.fillStyle = "#060608"; ctx.fillRect(Math.round(x0), Math.round(y0 + h / 2), w, 1);
    });
    const seats = row(n, 7.3, 12.7, 5.0).map((q) => ({ ...q, facing: "up" }));
    players(ctx, s, sc, seats, { active: cur != null ? cur : (!s.done && shown < n ? shown : null) });
    list.forEach((p, k) => {
      if (k >= shown || (k === cur && s.stepT < 1.4)) return;
      const [x, y] = sc.px(seats[k].x, seats[k].r, 1.85);
      bubble(ctx, x, y, String(p.value), s.done && (p.selected || p.tied) ? goalCol(s, p) : PCOL[s.index(p.name) % PCOL.length], 1);
    });
    hud(ctx, s, "LUCKY NUMBER", s.goal === "winner" ? "HIGHEST NUMBER WINS" : "LOWEST NUMBER IS PICKED");
    endFx(s);
    verdict(ctx, s, { y: 200 });
  },
};
