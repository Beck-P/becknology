// Texas Hold'em and PLO at the card table: the players round the felt, their hole cards turned over one hand at
// a time in the strip along the bottom (with each one's odds of being picked as the board runs out), the flop,
// turn and river dealt big onto the felt, then the showdown.
import { PAL, PCOL, text, hud, verdict, clamp, ease } from "../kit.js";
import { scene, players } from "./common.js";
import { card, seatsAround, handStrip } from "./cards.js";

const PLURAL = { twos: "2S", threes: "3S", fours: "4S", fives: "5S", sixes: "6S", sevens: "7S", eights: "8S", nines: "9S",
                 tens: "10S", jacks: "JS", queens: "QS", kings: "KS", aces: "AS" };
/** A hand's name short enough for its box: "Pair of Kings" → "PAIR KS", "Full house, ..." → "FULL HOUSE". */
export function shortHand(h = "") {
  const w = h.toLowerCase(), r = (re) => { const m = w.match(re); return m ? PLURAL[m[1]] || "" : ""; };
  if (w.startsWith("straight flush")) return "STR FLUSH";
  if (w.startsWith("four")) return ("QUADS " + r(/kind, (\w+)/)).trim();
  if (w.startsWith("full house")) return "FULL HOUSE";
  if (w.includes("flush")) return "FLUSH";
  if (w.startsWith("straight")) return "STRAIGHT";
  if (w.startsWith("three")) return ("TRIPS " + r(/kind, (\w+)/)).trim();
  if (w.startsWith("two pair")) return "TWO PAIR";
  if (w.startsWith("pair")) return ("PAIR " + r(/pair of (\w+)/)).trim();
  if (w.startsWith("high card")) { const m = w.match(/high card, (\w+)/); return m ? m[1].toUpperCase() + " HIGH" : "HIGH CARD"; }
  return h.toUpperCase();
}

/** The draft: everyone at the table with their dealt cards face down, the board face down in the middle, and who
 *  has locked in their keepers (the picking itself happens in the action bar under the screen). */
export function draftView(ctx, s, title, opts) {
  const sc = scene(ctx, s, "holdem", [0, 0.9]);
  const r = s.result, list = r.players || [], n = list.length;
  const a = sc.a || { centre: [17, 8, 0.9], rx: 3.24, ry: 1.19 };
  const seats = seatsAround(n, a);
  const done = (p) => opts.locked(p.name);
  players(ctx, s, sc, seats, { tagDy: 2, mood: (p) => (done(p) ? "cheer" : "idle") });
  const [bx, by] = sc.px(a.centre[0], a.centre[1], a.centre[2]);
  if (opts.board) for (let c = 0; c < 5; c++) card(ctx, bx - 52 + c * 21, by - 14, null, 0, 18, 25);
  // the hands along the bottom: dealt face down, the keepers lifted once they're locked in
  const deal = opts.deal, t0 = s.mem.t0 != null ? s.mem.t0 : (s.mem.t0 = s.t);
  const L = handStrip(ctx, s, list, { ncards: deal, cardW: 13, cardH: 18, overlap: deal > 3 ? 5 : 2 });
  list.forEach((p, k) => {
    const b = L.boxes[k], i = s.index(p.name), col = PCOL[i % PCOL.length], lk = done(p);
    ctx.fillStyle = lk ? "rgba(96,208,128,0.14)" : "rgba(255,255,255,0.04)"; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = col; ctx.fillRect(b.x, b.y, b.w, 1);
    text(ctx, p.name, b.x + b.w / 2, b.y + 2, lk ? PAL.white : col, { align: "center", max: 8 });
    const keep = lk ? opts.keepers(p.name) : null;
    for (let ci = 0; ci < deal; ci++) {
      const dealt = clamp((s.t - t0 - 0.15 - (k * deal + ci) * 0.05) / 0.25, 0, 1);
      if (dealt <= 0) continue;
      const cx = b.cx + ci * (L.cardW - L.over), dim = keep && !keep.includes(ci);
      card(ctx, cx, b.cy + (1 - ease.out(dealt)) * 10, null, 0, L.cardW, L.cardH);
      if (dim) { ctx.fillStyle = "rgba(8,4,24,0.6)"; ctx.fillRect(cx - 1, b.cy - 1, L.cardW + 2, L.cardH + 2); }
      else if (keep) { ctx.fillStyle = PAL.green; ctx.fillRect(cx, b.cy + L.cardH + 1, L.cardW - (ci < deal - 1 ? L.over : 0), 1); }
    }
    const pulse = Math.sin(s.t * 5 + k) > 0;
    text(ctx, lk ? "LOCKED IN" : "PICKING" + ".".repeat(1 + Math.floor(s.t * 2 + k) % 3), b.x + b.w / 2, b.y + b.h - 8,
         lk ? PAL.green : pulse ? PAL.white : PAL.grey, { align: "center", max: Math.floor((b.w - 2) / 6) });
  });
  const left = list.filter((p) => !done(p)).length;
  hud(ctx, s, title, opts.sub);
  text(ctx, left ? left + " STILL CHOOSING - MAKE YOUR PICK BELOW" : "EVERYONE'S IN - DEALING", 240, L.boxes[0].y - 14, PAL.white, { align: "center", shadow: PAL.ink });
}

function poker(omaha) {
  return {
    station: "holdem",
    drafts: true,
    draw(ctx, s) {
      if (s.result.draftPhase) {
        const r = s.result, picks = () => (typeof window !== "undefined" && window.__draftChoices) || {};
        const deal = ((r.draftHands && Object.values(r.draftHands)[0]) || []).length || (omaha ? 6 : 4);
        return draftView(ctx, s, omaha ? "PLO" : "TEXAS HOLD'EM", {
          deal, board: true, sub: "KEEP " + (r.keepCount || (omaha ? 4 : 2)) + " OF " + deal,
          locked: (name) => !!picks()[name], keepers: (name) => picks()[name] || [],
        });
      }
      const sc = scene(ctx, s, "holdem", [0, 0.9]);
      const r = s.result, list = r.players || [], n = list.length;
      const a = sc.a || { centre: [17, 8, 0.9], rx: 3.24, ry: 1.19 };
      const seats = seatsAround(n, a);
      players(ctx, s, sc, seats, { tagDy: 2 });
      // the board: flop at step n+1, turn n+2, river n+3
      const boardShown = s.step >= n + 3 ? 5 : s.step >= n + 2 ? 4 : s.step >= n + 1 ? 3 : 0;
      const [bx, by] = sc.px(a.centre[0], a.centre[1], a.centre[2]);
      const BW = 18, BH = 25;
      for (let c = 0; c < 5; c++) {
        const x = bx - (5 * (BW + 3) - 3) / 2 + c * (BW + 3), y = by - BH / 2 - 2;
        if (c >= boardShown) { ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(Math.round(x), Math.round(y), BW, BH); continue; }
        const dealtAt = c < 3 ? n + 1 : c === 3 ? n + 2 : n + 3, fresh = s.step === dealtAt;
        const f = fresh ? clamp((s.stepT - c * 0.12 * (c < 3 ? 1 : 0)) / 0.45, 0, 1) : 1;
        const slide = fresh ? (1 - ease.out(clamp((s.stepT - (c < 3 ? c * 0.12 : 0)) / 0.3, 0, 1))) * 30 : 0;
        card(ctx, x + slide, y - slide * 0.4, (r.board || [])[c], f, BW, BH);
      }
      // the odds stage for the strip: preflop at step n, then flop / turn / river
      const stage = s.step >= n + 3 ? "river" : s.step >= n + 2 ? "turn" : s.step >= n + 1 ? "flop" : s.step >= n ? "preflop" : null;
      const odds = stage && r.pokerPercentages ? r.pokerPercentages[stage] : null;
      // the hands along the bottom
      const nc = omaha ? 4 : 2;
      const L = handStrip(ctx, s, list, { ncards: nc, cardW: 13, cardH: 18, overlap: omaha ? 4 : 2 });
      list.forEach((p, k) => {
        const b = L.boxes[k], i = s.index(p.name), col = PCOL[i % PCOL.length];
        const hot = s.done && (p.selected || p.tied);
        ctx.fillStyle = hot ? (p.tied ? "rgba(232,192,64,0.25)" : s.goal === "winner" ? "rgba(255,208,96,0.25)" : "rgba(232,64,64,0.28)") : "rgba(255,255,255,0.04)";
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = col; ctx.fillRect(b.x, b.y, b.w, 1);
        text(ctx, p.name, b.x + b.w / 2, b.y + 2, hot ? PAL.white : col, { align: "center", max: 8 });
        const shown = s.step > k, fresh = s.step === k + 1;
        (p.cards || []).forEach((c, ci) => {
          const f = shown ? (fresh ? clamp((s.stepT - ci * 0.1) / 0.4, 0, 1) : 1) : 0;
          card(ctx, b.cx + ci * (L.cardW - L.over), b.cy, c, f, L.cardW, L.cardH);
        });
        // under the cards: their odds of being picked while the board runs out, the hand at the showdown
        if (s.done) text(ctx, shortHand(p.headline), b.x + b.w / 2, b.y + b.h - 8, hot ? PAL.white : PAL.grey, { align: "center", max: Math.floor((b.w - 2) / 6) });
        else if (odds && odds.byPlayer && odds.byPlayer[p.name] != null) {
          const v = odds.byPlayer[p.name], bw = b.w - 8;
          ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(b.x + 4, b.y + b.h - 6, bw, 3);
          ctx.fillStyle = s.goal === "winner" ? PAL.green : PAL.red; ctx.fillRect(b.x + 4, b.y + b.h - 6, Math.round((bw * v) / 100), 3);
        }
      });
      if (odds && !s.done) text(ctx, (s.goal === "winner" ? "CHANCE TO WIN" : "CHANCE TO BE PICKED") + " - " + (odds.method || "").toUpperCase(), 240, L.boxes[0].y - 14, PAL.grey, { align: "center" });
      const sub = s.step < n ? "TURNING OVER " + (list[s.step] ? list[s.step].name : "") : stage === "preflop" ? "BEFORE THE FLOP" : stage ? "THE " + stage.toUpperCase() : "";
      hud(ctx, s, omaha ? "PLO" : "TEXAS HOLD'EM", s.done ? (s.goal === "winner" ? "BEST HAND WINS" : "WORST HAND IS PICKED") : sub);
      if (s.done && !s.mem.end) { s.mem.end = 1; if (s.goal === "winner" && !r.isTie) s.fx.rain(60, [PAL.gold, PAL.pink, PAL.cyan]); }
      verdict(ctx, s, { y: 96 });
    },
  };
}

export const holdem = poker(false);
export const plo = poker(true);
