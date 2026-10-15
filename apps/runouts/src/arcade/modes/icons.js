// Little pixel icons from strings: each row a line, a character a pixel, the key says which colour.
const ICONS = {
  // the slot symbols (App.jsx SLOT_SYMBOLS: 🍒 🍋 ⭐ 🍀 🔔 7️⃣)
  cherry: { pal: { o: "#1a0a08", r: "#e02a3a", R: "#ff7080", g: "#40a040" }, rows: [
    "....gg...", "...g.g...", "..g...g..", ".g....g..", "rrr..rrr.", "rRrr.rRrr", "rrrr.rrrr", ".rr...rr.", "........."] },
  lemon: { pal: { y: "#f0d030", Y: "#fff090", o: "#a08010" }, rows: [
    ".........", "...yyy...", ".yyYYyy..", "yyYYyyyy.", "yyyyyyyyo", ".yyyyyyo.", "..yyyyo..", "...ooo...", "........."] },
  star: { pal: { y: "#f0c020", Y: "#fff0a0", o: "#a07010" }, rows: [
    "....y....", "....y....", "...yYy...", "yyyyYyyyy", ".yyYYYyy.", "..yyyyy..", ".yyy.yyy.", ".yy...yy.", "........."] },
  clover: { pal: { g: "#30a040", G: "#80e080", s: "#206030" }, rows: [
    "..gg.gg..", ".gGgggGg.", ".ggggggg.", "..gg.gg..", ".gGgggGg.", ".ggggggg.", "..gg.gg..", "....s....", "....s...."] },
  bell: { pal: { b: "#e0a020", B: "#ffe080", o: "#805010" }, rows: [
    "....o....", "...bbb...", "..bBbbb..", "..bBbbb..", ".bBbbbbb.", ".bbbbbbb.", "bbbbbbbbb", "ooooooooo", "....o...."] },
  seven: { pal: { r: "#e02a3a", R: "#ff8090", o: "#600810" }, rows: [
    "rrrrrrrr.", "RRRRRRrr.", "......rr.", ".....rr..", "....rr...", "...rr....", "...rr....", "..rr.....", "..oo....."] },
  // a tin horse for the derby (facing right)
  horse: { pal: { c: "#e8e8f0", d: "#0c0814", h: "#8a84a8" }, rows: [
    "........cc..", ".......cccc.", "......cc.cd.", "cccccccc....", "cccccccc....", ".cccccccc...", ".c..c..c.c..", ".c..c..c.c.."] },
  skull: { pal: { w: "#f4f0e6", d: "#0c0814" }, rows: [".wwwww.", "wwwwwww", "wdwwwdw", "wwwdwww", ".wwwww.", ".w.w.w."] },
};
const EMOJI = { "🍒": "cherry", "🍋": "lemon", "⭐": "star", "🍀": "clover", "🔔": "bell", "7️⃣": "seven", "7": "seven" };

/** Draw icon `name` (or a slot emoji) at (x, y) top-left, scale s; tint overrides every colour (silhouettes). */
export function icon(ctx, name, x, y, s = 1, tint = null) {
  const ic = ICONS[EMOJI[name] || name];
  if (!ic) return;
  x = Math.round(x); y = Math.round(y);
  ic.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (c === ".") continue;
      ctx.fillStyle = tint || ic.pal[c] || "#ffffff";
      ctx.fillRect(x + i * s, y + j * s, s, s);
    }
  });
}
export function iconSize(name) { const ic = ICONS[EMOJI[name] || name]; return ic ? [ic.rows[0].length, ic.rows.length] : [0, 0]; }
