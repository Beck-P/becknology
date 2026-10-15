// Pixel art for Runouts, in the Bridge's own style: every mode has a 20×20 icon drawn a pixel at a time
// (hard edges, a dark outline, three or four tones to a colour), shown on a little arcade cabinet in the
// game selector. Icons are drawn once into a canvas and scaled up whole-pixel, crisp.
import React, { useEffect, useRef } from "react";

const S = 20;
const C = {
  k: "#14101e", w: "#f4f0ff", g: "#b8b4cc", G: "#6a6488", s: "#0a0810",
  r: "#e84040", R: "#901c2c", p: "#f078a8", P: "#a040c0", y: "#f8d048", Y: "#b08020", o: "#f08a30",
  c: "#5cc8d0", C: "#2a7088", b: "#4a80f0", B: "#24408a", v: "#9a7aff", V: "#4a2a8a",
  n: "#40d070", N: "#1e7040", m: "#a06a34", M: "#5a3418", l: "#ffe9a8",
};

function painter(ctx) {
  const px = (x, y, c) => { if (x < 0 || y < 0 || x >= S || y >= S) return; ctx.fillStyle = C[c] || c; ctx.fillRect(x, y, 1, 1); };
  const rect = (x, y, w, h, c) => { ctx.fillStyle = C[c] || c; ctx.fillRect(x, y, w, h); };
  const box = (x, y, w, h, fill, edge = "k") => { rect(x, y, w, h, edge); rect(x + 1, y + 1, w - 2, h - 2, fill); };
  const disc = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(cx + x, cy + y, c); };
  const ring = (cx, cy, r, c) => { for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) { const d = Math.sqrt(x * x + y * y); if (d > r - 0.6 && d <= r + 0.4) px(cx + x, cy + y, c); } };
  const rows = (x0, y0, list, pal = {}) => list.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") px(x0 + x, y0 + y, pal[ch] || ch); }));
  const line = (x0, y0, x1, y1, c) => {
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (let n = 0; n < 60; n++) { px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  };
  return { px, rect, box, disc, ring, rows, line };
}

// a playing card: white, outlined, a suit in the middle and the rank in the corner
function card(d, x, y, w, h, suit, rank) {
  d.box(x, y, w, h, "w");
  d.rect(x + 1, y + h - 2, w - 2, 1, "g");
  const col = suit === "h" || suit === "d" ? "r" : "s";
  if (rank) d.rows(x + 2, y + 2, rank, { X: col });
  const cx = x + Math.floor(w / 2), cy = y + Math.floor(h / 2) + 1;
  const SUIT = {
    h: ["X.X", "XXX", ".X."], d: [".X.", "XXX", ".X."], s: [".X.", "XXX", ".X."], c: [".X.", "XXX", "X.X"],
  };
  d.rows(cx - 1, cy - 1, SUIT[suit], { X: col });
  if (suit === "s") d.px(cx, cy + 2, col);
}
const A = ["X.", ".X", "XX"];                        // a tiny 'A' for card corners (2×3)
const K = ["X.X", "XX.", "X.X"];

const ICONS = {
  random(d) {                                         // the question block
    d.box(2, 2, 16, 16, "y");
    d.rect(3, 3, 14, 1, "l"); d.rect(3, 3, 1, 13, "l"); d.rect(4, 16, 13, 1, "Y"); d.rect(16, 4, 1, 12, "Y");
    [[3, 3], [16, 3], [3, 16], [16, 16]].forEach(([x, y]) => d.px(x, y, "Y"));
    d.rows(6, 5, ["..kkkk..", ".kwwwwk.", "kwwkkwwk", "....kwwk", "...kwwk.", "...kww..", "........", "...kww..", "...kww.."], { k: "M", w: "w" });
  },
  holdem(d) {
    d.rect(3, 2, 10, 14, "k"); d.rect(4, 3, 8, 12, "B");
    for (let y = 4; y < 14; y += 2) for (let x = 5; x < 11; x += 2) d.px(x + (y % 4 ? 1 : 0), y, "b");
    card(d, 7, 5, 10, 13, "h", A);
  },
  plo(d) {
    [["s", 1], ["d", 4], ["c", 7], ["h", 10]].forEach(([s, x], i) => card(d, x, 3 + (i % 2), 8, 12, s, i === 3 ? A : null));
  },
  rng(d) {
    d.box(1, 5, 18, 11, "s", "G");
    d.rect(2, 6, 16, 1, "k");
    const SEG = { 0: ["XXX", "X.X", "X.X", "X.X", "XXX"], 7: ["XXX", "..X", "..X", ".X.", ".X."], 3: ["XXX", "..X", ".XX", "..X", "XXX"] };
    d.rows(4, 8, SEG[0], { X: "n" }); d.rows(9, 8, SEG[7], { X: "n" }); d.rows(14, 8, SEG[3], { X: "n" });
    d.px(3, 4, "G"); d.px(16, 4, "G"); d.rect(3, 3, 14, 1, "G");
  },
  wheel(d) {
    const cx = 10, cy = 11, R = 8, cols = ["r", "y", "b", "n", "p", "o"];
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      if (x * x + y * y > R * R) continue;
      const a = (Math.atan2(y, x) + Math.PI * 2 + 0.3) % (Math.PI * 2);
      d.px(cx + x, cy + y, cols[Math.floor(a / (Math.PI * 2) * 6)]);
    }
    d.ring(cx, cy, R, "k"); d.disc(cx, cy, 1, "w"); d.px(cx, cy, "k");
    d.rows(8, 0, ["kkkkk", ".kwk.", "..k.."]);
  },
  dice(d) {
    d.box(1, 6, 10, 10, "w"); d.rect(2, 14, 8, 1, "g");
    [[3, 8], [7, 8], [5, 10], [3, 12], [7, 12]].forEach(([x, y]) => d.rect(x, y, 2, 2, "r"));
    d.box(10, 2, 9, 9, "w"); d.rect(11, 9, 7, 1, "g");
    [[11, 3], [13, 5], [15, 7]].forEach(([x, y]) => d.rect(x, y, 2, 2, "k"));
  },
  "high-card"(d) {
    d.box(4, 1, 12, 18, "w"); d.rect(5, 17, 10, 1, "g");
    d.rows(6, 3, A, { X: "s" });
    d.rows(6, 7, ["...X...", "..XXX..", ".XXXXX.", "XXXXXXX", "XXXXXXX", ".X.X.X.", "...X...", "..XXX.."], { X: "s" });
  },
  "coin-flips"(d) {
    d.disc(10, 10, 8, "Y"); d.disc(10, 10, 7, "y"); d.ring(10, 10, 8, "k");
    d.disc(9, 9, 4, "l"); d.disc(10, 10, 4, "y");
    d.rows(7, 7, ["..X..", ".XXX.", "XXXXX", ".X.X."], { X: "Y" });
    d.rect(3, 4, 2, 1, "w"); d.rect(15, 15, 2, 1, "Y");
  },
  "black-marble"(d) {
    d.rows(3, 5, ["...kkkkkkkk...", "..kmmmmmmmmk..", ".kmmmmmmmmmmk.", "kmmmmmmmmmmmmk", "kmmmmmmmmmmmmk", "kMmmmmmmmmmmMk",
                  "kMMmmmmmmmmMMk", ".kMMMMMMMMMMk.", "..kkkkkkkkkk.."], {});
    d.rect(7, 4, 6, 1, "M"); d.rect(6, 3, 8, 1, "k");
    d.disc(7, 4, 2, "s"); d.px(6, 3, "G");
    d.disc(12, 2, 2, "w"); d.px(11, 1, "w"); d.ring(12, 2, 2, "g");
  },
  slots(d) {
    d.box(1, 3, 16, 15, "r"); d.rect(2, 4, 14, 2, "R");
    d.box(2, 7, 14, 7, "w", "k");
    [3, 8, 13].forEach((x) => d.rows(x, 8, ["XXX", "..X", ".X.", ".X.", ".X."], { X: "r" }));
    d.rect(3, 15, 12, 2, "R");
    d.rect(17, 5, 1, 8, "G"); d.disc(17, 4, 1, "r");
  },
  "horse-race"(d) {
    d.rows(1, 2, [
      ".........kk.......",
      "........kmmk......",
      ".......kmmmmk.....",
      "......kmmkmmmk....",
      ".....kmmmmmmmk....",
      "....kmmmmmmmMk....",
      "...kkkMmmmmk......",
      "...k..kmmmmk......",
      "......kmmmmmkkkk..",
      ".....kmmmmmmmmmmk.",
      "....kmmmmmmmmmmMMk",
      "...kmmMMMMMMMMMk.k",
      "...kMk.kMk..kMk...",
      "...kMk.kMk..kMk...",
      "...kk..kk...kk....",
    ]);
    d.rows(14, 0, ["kkkk", "wkwk", "kwkw"]);           // a chequered flag
    d.rect(13, 0, 1, 6, "G");
  },
  rocket(d) {
    d.rows(5, 0, [
      "....kk....", "...kwwk...", "..kwwwwk..", "..kwccwk..", "..kwccwk..", "..kwwwwk..", "..kwwwwk..", "..krwwrk..",
      ".kkwwwwkk.", "kRkwwwwkRk", "kRkwwwwkRk", "kkkkkkkkkk", "...koyok..", "....kyk...", "....oyo...", ".....o....",
    ]);
  },
  "space-invaders"(d) {
    d.rows(4, 5, [
      "..X.....X..", "...X...X...", "..XXXXXXX..", ".XX.XXX.XX.", "XXXXXXXXXXX", "X.XXXXXXX.X", "X.X.....X.X", "...XX.XX...",
    ], { X: "n" });
    d.rect(9, 16, 2, 3, "y");
  },
  bomb(d) {
    d.disc(9, 12, 6, "s"); d.ring(9, 12, 6, "k"); d.disc(7, 10, 2, "G"); d.px(6, 9, "g");
    d.rect(12, 5, 3, 3, "G"); d.rect(13, 4, 1, 1, "k");
    d.line(14, 4, 16, 2, "m");
    d.px(17, 1, "y"); d.px(16, 0, "o"); d.px(18, 2, "o"); d.px(18, 0, "r"); d.px(16, 2, "y");
  },
  plinko(d) {
    for (let r = 0; r < 5; r++) for (let i = 0; i <= r; i++) d.px(10 - r * 2 + i * 4, 4 + r * 3, "c");
    d.disc(12, 7, 1, "p"); d.px(11, 6, "w");
    [2, 6, 10, 14].forEach((x, i) => d.rect(x, 18, 3, 2, ["n", "y", "o", "r"][i]));
    d.rect(1, 17, 18, 1, "G");
  },
  "battle-royale"(d) {
    d.disc(10, 10, 8, "r"); d.disc(10, 10, 6, "w"); d.disc(10, 10, 4, "r"); d.disc(10, 10, 2, "w"); d.px(10, 10, "r");
    d.ring(10, 10, 8, "k");
    for (let a = 0; a < 24; a += 2) { const t = a / 24 * Math.PI * 2; d.px(Math.round(10 + Math.cos(t) * 9.6), Math.round(10 + Math.sin(t) * 9.6), "v"); }
  },
  "stock-market"(d) {
    d.rect(2, 2, 1, 16, "G"); d.rect(2, 17, 16, 1, "G");
    for (let y = 5; y < 17; y += 4) for (let x = 4; x < 18; x += 2) d.px(x, y, "k");
    const pts = [[3, 14], [6, 12], [8, 13], [11, 7], [13, 9], [15, 4]];
    for (let i = 0; i + 1 < pts.length; i++) d.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], "n");
    d.line(15, 4, 18, 14, "r");
    d.rows(16, 13, ["X.X", ".X."], { X: "r" });
  },
};

export function drawIcon(ctx, id) {
  ctx.clearRect(0, 0, S, S);
  const d = painter(ctx);
  (ICONS[id] || ICONS.random)(d);
}

export function PixelIcon({ id, size = 60, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (cv) drawIcon(cv.getContext("2d"), id);
  }, [id]);
  return <canvas ref={ref} width={S} height={S} className={className} style={{ width: size, height: size, imageRendering: "pixelated" }} aria-hidden="true" />;
}

// each mode's glow on its cabinet, and how the selector groups them
export const MODE_COLOURS = {
  random: "#f8d048", holdem: "#4a80f0", plo: "#9a7aff", rng: "#40d070", wheel: "#f08a30", dice: "#e84040", "high-card": "#b8b4cc",
  "coin-flips": "#f8d048", "black-marble": "#8a84a8", slots: "#f078a8", "horse-race": "#a06a34", rocket: "#5cc8d0",
  "space-invaders": "#40d070", bomb: "#f08a30", plinko: "#5cc8d0", "battle-royale": "#e84040", "stock-market": "#40d070",
};
export const MODE_GROUPS = [
  { name: "CARDS", ids: ["holdem", "plo", "high-card"] },
  { name: "LUCK", ids: ["rng", "wheel", "dice", "coin-flips", "black-marble", "slots"] },
  { name: "SHOWS", ids: ["horse-race", "rocket", "space-invaders", "bomb", "plinko", "battle-royale", "stock-market"] },
];

// a little arcade cabinet: marquee with the name, a CRT screen with the icon, a control panel with the blurb
export function ModeCabinet({ id, name, blurb, onClick, disabled, featured }) {
  const col = MODE_COLOURS[id] || "#9a7aff";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`mode-cab${featured ? " mode-cab-featured" : ""}`} style={{ "--acc": col }}>
      <span className="mode-cab-marquee">{name}</span>
      <span className="mode-cab-screen"><PixelIcon id={id} size={featured ? 96 : 80} className="mode-cab-icon" /></span>
      <span className="mode-cab-panel">
        <span className="mode-cab-btns"><i /><i /></span>
        <span className="mode-cab-blurb">{blurb}</span>
      </span>
    </button>
  );
}
