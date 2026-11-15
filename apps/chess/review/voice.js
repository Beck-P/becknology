// Talking to the coach: the browser's own speech recognition for the question and its own voices for
// the answer (the Web Speech API). Nothing to install and no key; what it can't do is noted where it
// matters: Firefox has no recognition, and Chrome sends the audio to Google to be transcribed.

const Recognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

export const canListen = Boolean(Recognition);
export const canSpeak = Boolean(synth && typeof SpeechSynthesisUtterance !== "undefined");

// ---------- hearing ----------

const WHY = {
  "not-allowed": "The microphone is blocked for this page. Allow it in the browser's site settings.",
  "service-not-allowed": "The browser won't allow speech recognition here.",
  "audio-capture": "No microphone was found.",
  network: "Speech recognition couldn't reach its service.",
  "language-not-supported": "Speech recognition doesn't have English here.",
};

// One question. Calls back as words arrive and once at the end: onEnd(finalText, errorMessage).
// Returns a function that stops listening (what was heard so far still counts).
export function listen({ onHeard, onEnd }) {
  if (!Recognition) { onEnd("", "This browser has no speech recognition (Chrome, Edge and Safari do)."); return () => {}; }
  const rec = new Recognition();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = "", error = "", over = false;
  rec.onresult = (e) => {
    let interim = "";
    finalText = "";
    for (let i = 0; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    if (onHeard) onHeard((finalText + " " + interim).trim());
  };
  rec.onerror = (e) => {
    // nothing said, or stopped by us: not worth a message
    if (e.error !== "no-speech" && e.error !== "aborted") error = WHY[e.error] || "Speech recognition stopped unexpectedly.";
  };
  rec.onend = () => { if (!over) { over = true; onEnd(finalText.trim(), error); } };
  try { rec.start(); } catch { over = true; onEnd("", "The microphone is already in use."); }
  return () => { try { rec.stop(); } catch { /* already stopped */ } };
}

// Chess as speech recognition hears it, put right before it's shown and sent
export function tidyHeard(text) {
  return text
    .replace(/\bnight\b/gi, "knight")
    .replace(/\b(rook|rock|brook)\b(?=\s+(?:to\s+|takes?\s+|on\s+)?[a-h]\s?[1-8]\b)/gi, "rook")
    .replace(/\b([a-h])\s([1-8])\b/gi, (m, f, r) => f.toLowerCase() + r)
    .replace(/\b([A-H])([1-8])\b/g, (m, f, r) => f.toLowerCase() + r);
}

// ---------- speaking ----------

let voice = null;
function pickVoice() {
  if (!canSpeak) return null;
  const all = synth.getVoices().filter((v) => /^en[-_]/i.test(v.lang) || v.lang === "en");
  if (!all.length) return null;
  const want = [/natural/i, /Google US English/i, /Samantha/i, /Google UK English Female/i, /Aria|Jenny|Ava|Daniel|Karen/i];
  for (const re of want) { const v = all.find((x) => re.test(x.name)); if (v) return v; }
  return all.find((v) => /en[-_]US/i.test(v.lang)) || all[0];
}
if (canSpeak) {
  voice = pickVoice();
  // most browsers load their voices after the page; pick again when they arrive
  try { synth.addEventListener("voiceschanged", () => { voice = pickVoice(); }); } catch { /* old Safari */ }
}

const PIECES = { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight" };

// Notation and markup as a person would say it: "14. Nxe5+" → "knight takes e5, check"
export function speakable(text) {
  return String(text)
    .replace(/\*\*|__|`|^#+\s*/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\bO-O-O\b/g, "castles queenside")
    .replace(/\bO-O\b/g, "castles kingside")
    .replace(/\b\d+\.(?:\.\.)?\s*(?=[KQRBNa-hO])/g, "")
    .replace(/\b([KQRBN])([a-h]?[1-8]?)(x?)([a-h][1-8])(=[QRBN])?([+#])?/g,
      (m, p, from, x, to, promo, chk) => `${PIECES[p]}${from ? " " + from : ""}${x ? " takes " : " to "}${to}${chk === "#" ? ", checkmate" : chk ? ", check" : ""}`)
    .replace(/\b([a-h])x([a-h][1-8])(=[QRBN])?([+#])?/g,
      (m, f, to, promo, chk) => `${f} takes ${to}${promo ? ", promoting to a " + PIECES[promo[1]] : ""}${chk === "#" ? ", checkmate" : chk ? ", check" : ""}`)
    .replace(/\b([a-h][1-8])=([QRBN])([+#])?/g, (m, to, p, chk) => `${to}, promoting to a ${PIECES[p]}${chk === "#" ? ", checkmate" : chk ? ", check" : ""}`)
    .replace(/\b([a-h][1-8])([+#])/g, (m, to, chk) => `${to}${chk === "#" ? ", checkmate" : ", check"}`)
    .replace(/(^|[\s(])-M(\d+)/g, "$1Black mates in $2")
    .replace(/(^|[\s(])\+?M(\d+)\b/g, "$1White mates in $2")
    .replace(/(^|[\s(])\+(\d+(?:\.\d+)?)/g, "$1plus $2")
    .replace(/(^|[\s(])[-−](\d+(?:\.\d+)?)/g, "$1minus $2")
    .replace(/\s+/g, " ")
    .trim();
}

const queue = [];
let talking = false;
let onQuiet = null;

function next() {
  if (!queue.length) {
    talking = false;
    if (onQuiet) { const fn = onQuiet; onQuiet = null; fn(); }
    return;
  }
  talking = true;
  const u = new SpeechSynthesisUtterance(queue.shift());
  if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-US";
  u.rate = 1.04;
  u.onend = next;
  u.onerror = next;
  synth.speak(u);
}

// Phones only let a page speak once it has spoken from inside a tap: an answer arrives long after the
// tap that asked for it. So a tap on anything voice says nothing, once, and the voice is the page's from then on.
let primed = false;
export function prime() {
  if (primed || !canSpeak) return;
  primed = true;
  try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; synth.speak(u); } catch { /* no voice after all */ }
}

// Say something (after whatever is already being said)
export function say(text) {
  if (!canSpeak) return;
  const t = speakable(text);
  if (!t) return;
  queue.push(t);
  if (!talking) next();
}

export function hush() {
  queue.length = 0;
  onQuiet = null;
  talking = false;
  if (canSpeak) synth.cancel();
}

export const isTalking = () => talking;

// Run `fn` once everything queued has been said (at once if nothing is)
export function whenQuiet(fn) {
  if (!talking && !queue.length) { fn(); return; }
  onQuiet = fn;
}

// An answer arriving a few words at a time, spoken a sentence at a time so it starts before it's all in
export function speaker() {
  let buf = "";
  return {
    add(delta) {
      buf += delta;
      // up to the last sentence end that has something after it (a "14." isn't the end of a sentence)
      let cut = -1;
      const re = /[.!?…]["”)]?\s+(?=[A-Z"“(\d])/g;
      let x;
      while ((x = re.exec(buf))) {
        const before = buf.slice(0, x.index + 1);
        if (/\b\d+\.$/.test(before) || /\b(?:vs|e\.g|i\.e|etc)\.$/i.test(before)) continue;
        cut = x.index + x[0].length;
      }
      if (cut > 0) { say(buf.slice(0, cut)); buf = buf.slice(cut); }
    },
    end() { if (buf.trim()) say(buf); buf = ""; },
  };
}
