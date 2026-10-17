// The Royale's sounds, synthesised (no files): chips clacking, cards snapping, the wheel ticking, dice rattling,
// reels, a win jingle and the big-win fanfare. Off, effects, all — remembered in localStorage.
let ctx = null, master = null, on = true;
try { on = localStorage.getItem('royale_sound') !== 'off'; } catch (e) { /* private mode */ }

// the Bridge's sound switch (its ♪ pill / M): off means off in here too
const bridgeOff = () => { try { return (JSON.parse(localStorage.getItem('bridge_audio') || '{}') || {}).mode === 'off'; } catch (e) { return false; } };

function ac() {
  if (!on || bridgeOff()) return null;
  if (!ctx) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    ctx = new A();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
export const soundOn = () => on;
export function setSound(v) {
  on = !!v;
  try { localStorage.setItem('royale_sound', on ? 'on' : 'off'); } catch (e) { /* */ }
  if (!on && ctx) ctx.suspend().catch(() => {});
}
// unlock on the first touch or key (browsers start audio suspended)
if (typeof window !== 'undefined') {
  const unlock = () => { if (on) ac(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

let noiseBuf = null;
function noise(c) {
  if (noiseBuf) return noiseBuf;
  noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
function tone(c, { f = 440, f2 = null, type = 'square', t = 0, dur = 0.1, vol = 0.2, attack = 0.004 }) {
  const o = c.createOscillator(), g = c.createGain(), at = c.currentTime + t;
  o.type = type; o.frequency.setValueAtTime(f, at);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g); g.connect(master);
  o.start(at); o.stop(at + dur + 0.02);
}
function hiss(c, { t = 0, dur = 0.05, vol = 0.3, f = 3000, q = 1.2, type = 'bandpass', f2 = null }) {
  const s = c.createBufferSource(), b = c.createBiquadFilter(), g = c.createGain(), at = c.currentTime + t;
  s.buffer = noise(c); b.type = type; b.frequency.setValueAtTime(f, at); b.Q.value = q;
  if (f2) b.frequency.exponentialRampToValueAtTime(f2, at + dur);
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  s.connect(b); b.connect(g); g.connect(master);
  s.start(at, Math.random() * 0.3); s.stop(at + dur + 0.02);
}

const FX = {
  chip(c) { hiss(c, { dur: 0.035, vol: 0.5, f: 4200, q: 3 }); hiss(c, { t: 0.03, dur: 0.03, vol: 0.32, f: 5200, q: 4 }); tone(c, { f: 2600, type: 'triangle', dur: 0.03, vol: 0.05 }); },
  chips(c) { for (let i = 0; i < 5; i++) hiss(c, { t: i * 0.035 + Math.random() * 0.01, dur: 0.03, vol: 0.35, f: 3600 + Math.random() * 1800, q: 3 }); },
  card(c) { hiss(c, { dur: 0.07, vol: 0.4, f: 2200, q: 0.8, f2: 900 }); },
  flip(c) { hiss(c, { dur: 0.05, vol: 0.35, f: 1600, q: 1 }); tone(c, { f: 900, type: 'triangle', dur: 0.04, vol: 0.04 }); },
  tick(c) { tone(c, { f: 2400, type: 'square', dur: 0.012, vol: 0.05 }); },
  click(c) { tone(c, { f: 1200, f2: 900, type: 'square', dur: 0.03, vol: 0.06 }); },
  deny(c) { tone(c, { f: 220, f2: 160, type: 'square', dur: 0.12, vol: 0.08 }); },
  ball(c) { tone(c, { f: 1800 + Math.random() * 800, type: 'triangle', dur: 0.025, vol: 0.08 }); },
  drop(c) { for (let i = 0; i < 4; i++) tone(c, { f: 1400 - i * 150, type: 'triangle', t: i * 0.07, dur: 0.04, vol: 0.09 - i * 0.015 }); },
  dice(c) { for (let i = 0; i < 7; i++) hiss(c, { t: i * 0.05 + Math.random() * 0.02, dur: 0.04, vol: 0.4, f: 900 + Math.random() * 900, q: 2 }); },
  thud(c) { tone(c, { f: 140, f2: 60, type: 'sine', dur: 0.12, vol: 0.25 }); hiss(c, { dur: 0.05, vol: 0.2, f: 600, q: 1 }); },
  reel(c) { tone(c, { f: 180, type: 'square', dur: 0.02, vol: 0.03 }); },
  stop(c) { tone(c, { f: 160, f2: 90, type: 'square', dur: 0.08, vol: 0.12 }); hiss(c, { dur: 0.04, vol: 0.2, f: 800 }); },
  win(c) { [523, 659, 784, 1047].forEach((f, i) => tone(c, { f, type: 'square', t: i * 0.075, dur: 0.12, vol: 0.07 })); },
  bigwin(c) {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(c, { f, type: 'square', t: i * 0.09, dur: 0.16, vol: 0.08 }));
    [262, 330, 392].forEach((f) => tone(c, { f, type: 'triangle', t: 0.54, dur: 0.6, vol: 0.06 }));
  },
  lose(c) { tone(c, { f: 330, f2: 220, type: 'triangle', dur: 0.25, vol: 0.08 }); },
  push(c) { tone(c, { f: 660, type: 'triangle', dur: 0.08, vol: 0.06 }); tone(c, { f: 660, type: 'triangle', t: 0.1, dur: 0.08, vol: 0.06 }); },
  coin(c) { tone(c, { f: 1568, type: 'square', dur: 0.06, vol: 0.05 }); tone(c, { f: 2093, type: 'square', t: 0.06, dur: 0.12, vol: 0.05 }); },
  whoosh(c) { hiss(c, { dur: 0.35, vol: 0.25, f: 400, f2: 2400, q: 0.7 }); },
  launch(c) { hiss(c, { dur: 1.2, vol: 0.28, f: 200, f2: 1400, q: 0.6, type: 'lowpass' }); },
  boom(c) { hiss(c, { dur: 0.9, vol: 0.7, f: 900, f2: 80, q: 0.5, type: 'lowpass' }); tone(c, { f: 90, f2: 40, type: 'sine', dur: 0.6, vol: 0.3 }); },
  bell(c) { [1318, 1760, 2637].forEach((f, i) => tone(c, { f, type: 'triangle', t: i * 0.02, dur: 0.7, vol: 0.05 })); },
  gate(c) { tone(c, { f: 880, type: 'square', dur: 0.1, vol: 0.06 }); tone(c, { f: 1175, type: 'square', t: 0.12, dur: 0.25, vol: 0.06 }); },
  hoof(c) { tone(c, { f: 110 + Math.random() * 30, type: 'sine', dur: 0.04, vol: 0.05 }); },
  open(c) { tone(c, { f: 440, f2: 880, type: 'triangle', dur: 0.12, vol: 0.06 }); },
};
let last = {};
/** Play a sound by name (rate-limited per name so a burst doesn't pile up). */
export function sfx(name, gapMs = 25) {
  const c = ac();
  if (!c || !FX[name]) return;
  const now = performance.now();
  if (last[name] && now - last[name] < gapMs) return;
  last[name] = now;
  try { FX[name](c); } catch (e) { /* audio hiccup */ }
}
