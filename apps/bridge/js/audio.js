/**
 * BridgeAudio — music, ambience and sound effects, all synthesised with Web
 * Audio (no sound files).
 *
 * Music is generated as it plays: each theme is a key and mode, a chord
 * progression, a tempo and a band (pad, plucked arpeggios, bass, a lead that
 * improvises phrases from the chord tones and repeats them A A' B A, drums
 * for the city) through a shared reverb and echo. Every eight bars the band
 * thins or fills so it breathes. Themes by place: Lumar outdoors (folk, the
 * sea), Lumar indoors (warm, by the fire), Arcadia's streets (synthwave in
 * the rain), its arcades (chiptune), its back rooms (lo-fi), the Neon Royale (smoky lounge jazz:
 * a walking bass, brushes, a sax; the slot floor's chimes and payouts), Enigma (drones
 * and sonar), the Singularity (deep, glassy), the Wayfarer (a music box over
 * warm pads), caves and towers. Ambience runs under it: sea, rain, wind,
 * station hum, fire, a crowd, arcade bleeps, drips, the ship's creaks.
 *
 *   BridgeAudio.setWorld(id, world)   pick music + ambience for a world (world.js)
 *   BridgeAudio.sfx(name)             'blip', 'open', 'close', 'door', 'coin', 'clue', 'quest', 'pickup', 'pick', 'crumble',
 *                                     'step', 'sit', 'sleep', 'splash', 'plop', 'catch', 'ball', 'pocket',
 *                                     'fever', 'click', 'success', 'fail', 'error'
 *
 * Starts on the first tap or key (browsers won't play before). The ♪ pill
 * (or M) cycles all on → effects only → off; saved in localStorage.
 */
var BridgeAudio = (function () {
  var KEY = 'bridge_audio';
  var prefs = { mode: 'all', music: 0.55, sfx: 0.7, amb: 0.6 };
  try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* defaults */ }
  function savePrefs() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* private mode */ } }

  var ac = null, master, musicBus, ambBus, sfxBus, revIn, dlyIn, noiseBuf = null, meter = null;
  var wanted = null;            // { theme, amb } waiting for the context

  // ---- the graph -----------------------------------------------------------------------------
  function ensure() {
    if (ac) return ac;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    master = ac.createGain(); master.gain.value = 0.9;
    master.connect(comp); comp.connect(ac.destination);
    meter = ac.createAnalyser(); meter.fftSize = 2048; comp.connect(meter);
    musicBus = ac.createGain(); ambBus = ac.createGain(); sfxBus = ac.createGain();
    musicBus.connect(master); ambBus.connect(master); sfxBus.connect(master);
    // a reverb (a decaying burst of noise as the room) and a filtered echo
    var conv = ac.createConvolver();
    conv.buffer = impulse(2.8, 2.4);
    revIn = ac.createGain(); revIn.gain.value = 1;
    var revOut = ac.createGain(); revOut.gain.value = 0.55;
    revIn.connect(conv); conv.connect(revOut); revOut.connect(master);
    dlyIn = ac.createGain();
    var dl = ac.createDelay(2), fb = ac.createGain(), lp = ac.createBiquadFilter();
    dl.delayTime.value = 0.42; fb.gain.value = 0.32; lp.type = 'lowpass'; lp.frequency.value = 2200;
    dlyIn.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(revIn); lp.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    var nd = noiseBuf.getChannelData(0);
    for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    applyLevels();
    document.addEventListener('visibilitychange', function () {
      if (!ac) return;
      if (document.hidden) ac.suspend(); else ac.resume();
    });
    return ac;
  }

  function impulse(secs, decay) {
    var n = Math.floor(ac.sampleRate * secs), b = ac.createBuffer(2, n, ac.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = b.getChannelData(c);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return b;
  }

  function applyLevels() {
    if (!ac) return;
    var t = ac.currentTime;
    musicBus.gain.setTargetAtTime(prefs.mode === 'all' ? prefs.music * 0.5 : 0, t, 0.4);
    ambBus.gain.setTargetAtTime(prefs.mode === 'all' ? prefs.amb * 0.5 : 0, t, 0.4);
    sfxBus.gain.setTargetAtTime(prefs.mode === 'off' ? 0 : prefs.sfx * 0.6, t, 0.05);
  }

  function unlock() {
    if (!ensure()) return;
    if (ac.state === 'suspended') ac.resume();
    if (wanted) { var w = wanted; wanted = null; start(w.theme, w.amb); }
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });

  // ---- notes ---------------------------------------------------------------------------------------
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function voice(dest, t, dur, o) {
    // o: { type, freq, detune, gain, a, d, s, r, cutoff, q, fenv, rev, dly, vib, pan }
    var g = ac.createGain(), f = ac.createBiquadFilter(), out = g;
    f.type = 'lowpass'; f.frequency.value = o.cutoff || 6000; f.Q.value = o.q || 0.7;
    var a = o.a || 0.005, d = o.d || 0.1, s = o.s != null ? o.s : 0.5, r = o.r || 0.2, peak = o.gain || 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(peak * s, t + a, d / 3);
    g.gain.setTargetAtTime(0.0001, t + Math.max(a, dur), r / 4);
    if (o.fenv) { f.frequency.setValueAtTime(o.cutoff * o.fenv, t); f.frequency.setTargetAtTime(o.cutoff, t + 0.005, o.fdec || 0.08); }
    var oscs = [];
    (o.unison || [0]).forEach(function (dt) {
      var osc = ac.createOscillator();
      osc.type = o.type || 'sine';
      osc.frequency.value = o.freq;
      osc.detune.value = (o.detune || 0) + dt;
      if (o.vib) {
        var l = ac.createOscillator(), lg = ac.createGain();
        l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1];
        l.connect(lg); lg.connect(osc.detune); l.start(t); l.stop(t + dur + r * 2 + 0.1);
      }
      if (o.glide) { osc.frequency.setValueAtTime(o.freq * o.glide, t); osc.frequency.exponentialRampToValueAtTime(o.freq, t + (o.glideT || 0.06)); }
      osc.connect(f);
      osc.start(t); osc.stop(t + dur + r * 2 + 0.1);
      oscs.push(osc);
    });
    f.connect(g);
    if (o.pan && ac.createStereoPanner) { var p = ac.createStereoPanner(); p.pan.value = o.pan; g.connect(p); out = p; }
    out.connect(dest);
    if (o.rev) { var rs = ac.createGain(); rs.gain.value = o.rev; out.connect(rs); rs.connect(revIn); }
    if (o.dly) { var ds = ac.createGain(); ds.gain.value = o.dly; out.connect(ds); ds.connect(dlyIn); }
    return oscs;
  }

  function noiseHit(dest, t, dur, o) {
    var src = ac.createBufferSource(); src.buffer = noiseBuf;
    var f = ac.createBiquadFilter(); f.type = o.ftype || 'highpass'; f.frequency.value = o.freq || 6000; f.Q.value = o.q || 0.7;
    var g = ac.createGain();
    g.gain.setValueAtTime(o.gain || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    if (o.rev) { var rs = ac.createGain(); rs.gain.value = o.rev; g.connect(rs); rs.connect(revIn); }
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  }

  // instruments: what each part of a band sounds like
  var INST = {
    pad:   function (d, t, m, dur, v) { voice(d, t, dur, { type: 'sawtooth', freq: hz(m), unison: [-9, 0, 8], gain: 0.045 * v, a: 1.1, d: 1, s: 0.8, r: 1.6, cutoff: 900, rev: 0.6 }); },
    warm:  function (d, t, m, dur, v) { voice(d, t, dur, { type: 'triangle', freq: hz(m), unison: [-6, 6], gain: 0.07 * v, a: 0.6, d: 1, s: 0.8, r: 1.4, cutoff: 1400, rev: 0.5 }); },
    organ: function (d, t, m, dur, v) { voice(d, t, dur, { type: 'square', freq: hz(m), unison: [-5, 5], gain: 0.025 * v, a: 0.15, d: 0.4, s: 0.85, r: 0.5, cutoff: 1300, rev: 0.35, vib: [5, 6] }); },
    drone: function (d, t, m, dur, v) { voice(d, t, dur, { type: 'sawtooth', freq: hz(m), unison: [-14, -3, 4, 13], gain: 0.03 * v, a: 3, d: 2, s: 0.9, r: 4, cutoff: 420, q: 2, rev: 0.8 }); },
    pluck: function (d, t, m, dur, v) { voice(d, t, 0.05, { type: 'triangle', freq: hz(m), gain: 0.16 * v, a: 0.003, d: 0.35, s: 0.0, r: 0.6, cutoff: 2600, fenv: 2.2, rev: 0.35, dly: 0.12 }); },
    lute:  function (d, t, m, dur, v) { voice(d, t, 0.05, { type: 'sawtooth', freq: hz(m), gain: 0.07 * v, a: 0.002, d: 0.5, s: 0.0, r: 0.7, cutoff: 1500, fenv: 3, fdec: 0.05, rev: 0.4, dly: 0.08 }); },
    bell:  function (d, t, m, dur, v) {
      voice(d, t, 0.05, { type: 'sine', freq: hz(m), gain: 0.11 * v, a: 0.002, d: 1.4, s: 0, r: 1.6, rev: 0.6, dly: 0.25 });
      voice(d, t, 0.05, { type: 'sine', freq: hz(m) * 2.76, gain: 0.035 * v, a: 0.002, d: 0.5, s: 0, r: 0.6, rev: 0.6 });
    },
    box:   function (d, t, m, dur, v) {                       // music box: bright tine, quick decay
      voice(d, t, 0.05, { type: 'sine', freq: hz(m + 12), gain: 0.09 * v, a: 0.001, d: 0.8, s: 0, r: 0.9, rev: 0.5, dly: 0.15 });
      voice(d, t, 0.05, { type: 'sine', freq: hz(m + 12) * 3, gain: 0.018 * v, a: 0.001, d: 0.2, s: 0, r: 0.2 });
    },
    flute: function (d, t, m, dur, v) { voice(d, t, dur, { type: 'sine', freq: hz(m), gain: 0.07 * v, a: 0.08, d: 0.3, s: 0.8, r: 0.3, vib: [5.2, 9], rev: 0.5, dly: 0.15 }); },
    lead:  function (d, t, m, dur, v) { voice(d, t, dur, { type: 'sawtooth', freq: hz(m), unison: [-7, 7], gain: 0.04 * v, a: 0.02, d: 0.3, s: 0.6, r: 0.3, cutoff: 2200, vib: [5, 7], rev: 0.4, dly: 0.25 }); },
    chip:  function (d, t, m, dur, v) { voice(d, t, dur * 0.9, { type: 'square', freq: hz(m), gain: 0.055 * v, a: 0.002, d: 0.1, s: 0.7, r: 0.05, cutoff: 5000, rev: 0.1 }); },
    keys:  function (d, t, m, dur, v) {                       // a soft electric piano
      voice(d, t, dur, { type: 'sine', freq: hz(m), gain: 0.09 * v, a: 0.004, d: 1.2, s: 0.25, r: 0.6, rev: 0.4 });
      voice(d, t, dur, { type: 'triangle', freq: hz(m) * 2, gain: 0.02 * v, a: 0.004, d: 0.25, s: 0, r: 0.3 });
    },
    arp:   function (d, t, m, dur, v) { voice(d, t, dur * 0.8, { type: 'square', freq: hz(m), gain: 0.03 * v, a: 0.002, d: 0.12, s: 0.2, r: 0.1, cutoff: 1800, fenv: 2, rev: 0.25, dly: 0.3 }); },
    bass:  function (d, t, m, dur, v) { voice(d, t, dur * 0.9, { type: 'triangle', freq: hz(m), gain: 0.16 * v, a: 0.01, d: 0.3, s: 0.6, r: 0.15, cutoff: 700 }); },
    sub:   function (d, t, m, dur, v) { voice(d, t, dur * 0.95, { type: 'sawtooth', freq: hz(m), gain: 0.06 * v, a: 0.01, d: 0.2, s: 0.7, r: 0.1, cutoff: 500, fenv: 2.5 }); },
    kick:  function (d, t, m, dur, v) { voice(d, t, 0.02, { type: 'sine', freq: 52, glide: 3.2, glideT: 0.07, gain: 0.32 * v, a: 0.002, d: 0.22, s: 0, r: 0.2 }); },
    snare: function (d, t, m, dur, v) { noiseHit(d, t, 0.18, { freq: 1800, gain: 0.09 * v, rev: 0.3 }); voice(d, t, 0.02, { type: 'triangle', freq: 190, gain: 0.05 * v, a: 0.001, d: 0.08, s: 0, r: 0.05 }); },
    hat:   function (d, t, m, dur, v) { noiseHit(d, t, 0.04, { freq: 8000, gain: 0.04 * v }); },
    shaker:function (d, t, m, dur, v) { noiseHit(d, t, 0.07, { freq: 5000, ftype: 'bandpass', q: 1.2, gain: 0.03 * v }); },
    tom:   function (d, t, m, dur, v) { voice(d, t, 0.02, { type: 'sine', freq: 120, glide: 1.6, glideT: 0.1, gain: 0.13 * v, a: 0.002, d: 0.25, s: 0, r: 0.2, rev: 0.2 }); },
    chipdrum: function (d, t, m, dur, v) { noiseHit(d, t, m ? 0.09 : 0.03, { freq: m ? 2500 : 9000, ftype: m ? 'bandpass' : 'highpass', gain: 0.05 * v }); },
    // the Neon Royale's lounge band: a breathy synth sax, an upright bass walking, brushes and a ride cymbal
    sax:   function (d, t, m, dur, v) {
      voice(d, t, dur, { type: 'sawtooth', freq: hz(m), unison: [-4, 4], gain: 0.045 * v, a: 0.05, d: 0.25, s: 0.7, r: 0.22, cutoff: 1500, q: 1.4, vib: [5.2, 11], glide: 0.97, glideT: 0.05, rev: 0.5, dly: 0.18 });
      noiseHit(d, t, Math.min(0.25, dur), { freq: 1800, ftype: 'bandpass', q: 3, gain: 0.012 * v });
    },
    upright: function (d, t, m, dur, v) {
      voice(d, t, dur * 0.85, { type: 'triangle', freq: hz(m), gain: 0.18 * v, a: 0.006, d: 0.35, s: 0.35, r: 0.12, cutoff: 600 });
      voice(d, t, 0.03, { type: 'sine', freq: hz(m) * 2, gain: 0.04 * v, a: 0.002, d: 0.06, s: 0, r: 0.05 });
    },
    brush: function (d, t, m, dur, v) { noiseHit(d, t, 0.22, { freq: 3200, ftype: 'bandpass', q: 0.6, gain: 0.035 * v, rev: 0.2 }); },
    // the folk band (the fair, a tavern when you sit down): a bowed fiddle, a squeezebox, a tambourine
    fiddle: function (d, t, m, dur, v) {
      voice(d, t, dur, { type: 'sawtooth', freq: hz(m), unison: [-5, 5], gain: 0.036 * v, a: 0.045, d: 0.2, s: 0.75, r: 0.18, cutoff: 2600, q: 1.1, vib: [6, 12], rev: 0.35, dly: 0.1 });
      noiseHit(d, t, Math.min(0.12, dur), { freq: 2600, ftype: 'bandpass', q: 2, gain: 0.008 * v });
    },
    squeeze: function (d, t, m, dur, v) { voice(d, t, dur, { type: 'square', freq: hz(m), unison: [-8, 0, 8], gain: 0.02 * v, a: 0.12, d: 0.4, s: 0.85, r: 0.35, cutoff: 1800, vib: [4.5, 4], rev: 0.3 }); },
    tamb:  function (d, t, m, dur, v) { noiseHit(d, t, 0.16, { freq: 7000, ftype: 'bandpass', q: 3, gain: 0.045 * v, rev: 0.15 }); noiseHit(d, t + 0.03, 0.1, { freq: 9500, gain: 0.02 * v }); },
    ride:  function (d, t, m, dur, v) {
      noiseHit(d, t, 0.35, { freq: 7000, ftype: 'highpass', gain: 0.022 * v, rev: 0.25 });
      voice(d, t, 0.02, { type: 'sine', freq: 5200, gain: 0.006 * v, a: 0.001, d: 0.4, s: 0, r: 0.3 });
    }
  };

  var MODES = { ionian: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10],
                lydian: [0, 2, 4, 6, 7, 9, 11], phrygian: [0, 1, 3, 5, 7, 8, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10] };

  // ---- the themes -------------------------------------------------------------------------------
  // chords: scale degrees per bar. parts: which instruments play what.
  //   pad: held chord; arp: chord tones on a step pattern; bass: roots on steps; lead: improvised
  //   phrases; perc: [inst, steps] patterns over 16 steps.
  var THEMES = {
    lumar:    { bpm: 76, root: 50, mode: 'dorian', chords: [0, 6, 3, 4], swing: 0.12,
                pad: 'warm', arp: { inst: 'lute', steps: [0, 3, 6, 8, 10, 13], oct: 12 }, bass: { inst: 'bass', steps: [0, 8] },
                lead: { inst: 'flute', oct: 24, density: 0.45 } },
    'lumar-in': { bpm: 84, root: 52, mode: 'mixolydian', chords: [0, 3, 4, 0, 5, 3, 4, 4], swing: 0.18,
                pad: 'organ', arp: { inst: 'pluck', steps: [0, 2, 4, 6, 8, 10, 12, 14], oct: 12, pattern: [0, 2, 1, 2] },
                bass: { inst: 'bass', steps: [0, 6, 8, 14] }, lead: { inst: 'flute', oct: 24, density: 0.35 },
                perc: [['shaker', [2, 6, 10, 14]], ['tom', [0, 8]]] },
    tower:    { bpm: 60, root: 50, mode: 'phrygian', chords: [0, 1, 0, 6], pad: 'pad', arp: { inst: 'bell', steps: [0, 6, 12], oct: 24 },
                lead: { inst: 'flute', oct: 24, density: 0.25 } },
    cave:     { bpm: 54, root: 38, mode: 'aeolian', chords: [0, 5, 0, 6], pad: 'drone', arp: { inst: 'bell', steps: [0, 10], oct: 24 } },
    chapel:   { bpm: 50, root: 48, mode: 'ionian', chords: [0, 3, 5, 4, 0, 5, 3, 4], pad: 'organ',          // St Brendan's: a slow hymn on the organ
                bass: { inst: 'bass', steps: [0] }, lead: { inst: 'flute', oct: 24, density: 0.12 } },
    arcadia:  { bpm: 96, root: 45, mode: 'aeolian', chords: [0, 5, 2, 6], pad: 'pad',
                arp: { inst: 'arp', steps: [0, 2, 3, 5, 6, 8, 10, 11, 13, 14], oct: 24, pattern: [0, 1, 2, 3, 2, 1] },
                bass: { inst: 'sub', steps: [0, 2, 4, 6, 8, 10, 12, 14] }, lead: { inst: 'lead', oct: 24, density: 0.3 },
                perc: [['kick', [0, 8]], ['snare', [4, 12]], ['hat', [2, 6, 10, 14]]] },
    arcade:   { bpm: 128, root: 57, mode: 'ionian', chords: [0, 5, 3, 4], pad: null,
                arp: { inst: 'chip', steps: [0, 2, 4, 6, 8, 10, 12, 14], oct: 12, pattern: [0, 1, 2, 1] },
                bass: { inst: 'chip', steps: [0, 4, 8, 12], oct: -12 }, lead: { inst: 'chip', oct: 24, density: 0.6 },
                perc: [['chipdrum', [0, 8], 1], ['chipdrum', [2, 6, 10, 14], 0], ['chipdrum', [4, 12], 1]] },
    lofi:     { bpm: 74, root: 53, mode: 'dorian', chords: [0, 3, 6, 4], swing: 0.22, pad: null,
                arp: { inst: 'keys', steps: [0, 7, 10], oct: 12, chord: true }, bass: { inst: 'bass', steps: [0, 7, 10] },
                perc: [['kick', [0, 9]], ['snare', [4, 12]], ['hat', [0, 2, 4, 6, 8, 10, 12, 14]]] },
    enigma:   { bpm: 56, root: 43, mode: 'aeolian', chords: [0, 5, 0, 3], pad: 'drone', arp: { inst: 'bell', steps: [0], oct: 36, sparse: 0.5 },
                lead: { inst: 'keys', oct: 12, density: 0.18 } },
    singularity: { bpm: 48, root: 36, mode: 'phrygian', chords: [0, 1], pad: 'drone', arp: { inst: 'bell', steps: [0, 8], oct: 36, sparse: 0.6 } },
    hoarfell: { bpm: 70, root: 52, mode: 'lydian', chords: [0, 1, 5, 4, 0, 3, 1, 4], pad: 'warm',
                arp: { inst: 'bell', steps: [0, 3, 6, 10, 13], oct: 24, pattern: [0, 2, 1, 3] }, bass: { inst: 'bass', steps: [0, 8] },
                lead: { inst: 'flute', oct: 24, density: 0.3 }, perc: [['shaker', [4, 12]]] },
    summit:   { bpm: 54, root: 50, mode: 'lydian', chords: [0, 4, 1, 4], pad: 'pad', arp: { inst: 'bell', steps: [0, 8], oct: 36, sparse: 0.55 },
                lead: { inst: 'flute', oct: 24, density: 0.18 } },
    // Sylvara: a slow harp over a warm pad, flute answering, lydian and a little wistful
    sylvara:  { bpm: 66, root: 50, mode: 'lydian', chords: [0, 4, 5, 3, 0, 1, 5, 4], pad: 'warm',
                arp: { inst: 'pluck', steps: [0, 2, 4, 6, 8, 10, 12, 14], oct: 12, pattern: [0, 1, 2, 3, 2, 1] },
                bass: { inst: 'bass', steps: [0, 8] }, lead: { inst: 'flute', oct: 24, density: 0.32 } },
    verdance: { bpm: 92, root: 55, mode: 'ionian', chords: [0, 3, 4, 0, 5, 3, 1, 4], swing: 0.2, pad: 'warm',
                arp: { inst: 'pluck', steps: [0, 3, 6, 8, 11, 14], oct: 12, pattern: [0, 1, 2, 1] }, bass: { inst: 'bass', steps: [0, 6, 8] },
                lead: { inst: 'flute', oct: 24, density: 0.5 }, perc: [['shaker', [2, 6, 10, 14]]] },
    // Club Void: four to the floor all the way through (drive), an off-beat bass, a bright arp
    club:     { bpm: 124, root: 45, mode: 'aeolian', chords: [0, 5, 3, 6], pad: 'pad', drive: true,
                arp: { inst: 'arp', steps: [0, 2, 4, 6, 8, 10, 12, 14], oct: 24, pattern: [0, 2, 1, 3] },
                bass: { inst: 'sub', steps: [2, 6, 10, 14] }, lead: { inst: 'lead', oct: 24, density: 0.28 },
                perc: [['kick', [0, 4, 8, 12]], ['snare', [4, 12]], ['hat', [2, 6, 10, 14]]] },
    // the Neon Royale: smoky synth-jazz in the lounge — ii-V-I-vi, keys comping off the beat, the bass walking,
    // brushes and the ride, a sax taking the tune
    casino:   { bpm: 92, root: 50, mode: 'ionian', chords: [1, 4, 0, 5, 1, 4, 0, 0], swing: 0.2, pad: 'warm',
                arp: { inst: 'keys', steps: [3, 10], oct: 12, chord: true }, bass: { inst: 'upright', steps: [0, 4, 8, 12], walk: true },
                lead: { inst: 'sax', oct: 12, density: 0.38 }, perc: [['ride', [0, 4, 7, 8, 12, 15]], ['brush', [4, 12]]] },
    // Moonglow, the jazz bar on the Terraces: a slow minor ballad after midnight — brushes, the upright walking
    // under it, piano comping in the gaps, the sax taking its time (the Royale's is brighter and quicker)
    jazz:     { bpm: 68, root: 46, mode: 'dorian', chords: [0, 3, 6, 4, 0, 5, 3, 4], swing: 0.3, pad: 'warm',
                arp: { inst: 'keys', steps: [2, 7, 11], oct: 12, chord: true }, bass: { inst: 'upright', steps: [0, 4, 8, 12], walk: true },
                lead: { inst: 'sax', oct: 12, density: 0.26 }, perc: [['brush', [4, 12]], ['ride', [0, 6, 8, 14]]] },
    // the Mid-Levels' open decks: glass and cyan — the street's synthwave lifted, slower and airier, bells over a soft pulse
    midlevels: { bpm: 84, root: 50, mode: 'lydian', chords: [0, 4, 5, 3], pad: 'pad',
                arp: { inst: 'bell', steps: [0, 3, 6, 10, 13], oct: 24, pattern: [0, 2, 1, 3] },
                bass: { inst: 'sub', steps: [0, 6, 8] }, lead: { inst: 'keys', oct: 24, density: 0.22 },
                perc: [['kick', [0, 8]], ['hat', [4, 12]]] },
    // the Harvest Fair: a jig, the fiddle leading, guitar strummed on the off-beats, a tambourine
    fair:     { bpm: 116, root: 55, mode: 'ionian', chords: [0, 4, 0, 4, 3, 0, 4, 0], swing: 0.18, pad: 'squeeze',
                arp: { inst: 'pluck', steps: [4, 12], oct: 12, chord: true }, bass: { inst: 'bass', steps: [0, 8] },
                lead: { inst: 'fiddle', oct: 24, density: 0.72 }, perc: [['tom', [0, 8]], ['tamb', [4, 12]], ['shaker', [2, 6, 10, 14]]] },
    // Lantern Tide: a slow hymn with a lilt, bells like the harbour's, a flute for the ones the sea kept
    tide:     { bpm: 58, root: 50, mode: 'dorian', chords: [0, 5, 3, 4, 0, 5, 6, 0], swing: 0.24, pad: 'warm',
                arp: { inst: 'bell', steps: [0, 6, 12], oct: 24 }, bass: { inst: 'bass', steps: [0] },
                lead: { inst: 'flute', oct: 24, density: 0.3 } },
    // a tavern when you've sat down: the band strikes up — squeezebox, fiddle, a drum and a shaker
    band:     { bpm: 108, root: 52, mode: 'mixolydian', chords: [0, 6, 3, 0, 0, 6, 4, 0], swing: 0.2, pad: 'squeeze',
                arp: { inst: 'pluck', steps: [4, 12], oct: 12, chord: true }, bass: { inst: 'bass', steps: [0, 6, 8] },
                lead: { inst: 'fiddle', oct: 24, density: 0.62 }, perc: [['tom', [0, 8]], ['shaker', [2, 6, 10, 14]], ['tamb', [12]]] },
    ship:     { bpm: 66, root: 53, mode: 'lydian', chords: [0, 1, 5, 4], pad: 'warm',
                arp: { inst: 'box', steps: [0, 3, 6, 8, 11, 14], oct: 12 }, bass: { inst: 'bass', steps: [0], oct: -12 },
                lead: { inst: 'box', oct: 24, density: 0.25 } }
  };

  // ambience: which beds play under which places — and the weather's own over them outdoors (js/weather.js)
  function themeFor(id, w) {
    var t = themeOf(id, w);
    if (typeof BridgeWeather !== 'undefined' && BridgeWeather.amb && t.amb) t = { theme: t.theme, amb: BridgeWeather.amb(id, t.amb) };
    return t;
  }
  function themeOf(id, w) {
    id = id || '';
    var ts = (w && w.tileset) || '';
    var amb;
    if (/^(bridge|quarters|hangar|gameroom|office)$/.test(id)) return { theme: 'ship', amb: ['engine', 'creak'] };
    if (id === 'arcadia' || id === 'arcadia-lucky-7') return { theme: 'arcade', amb: ['crowd', 'bleeps'] };
    if (id === 'arcadia-club') return { theme: 'club', amb: ['crowd'] };
    if (id === 'arcadia-casino') return { theme: 'casino', amb: ['crowd', 'slots'] };            // the Neon Royale's floor
    if (id === 'arcadia-casino-cards') return { theme: 'casino', amb: ['murmur', 'chips'] };
    if (/^arcadia-casino-(dining|vip)$/.test(id)) return { theme: 'casino', amb: ['murmur'] };
    if (id === 'arcadia-jazz') return { theme: 'jazz', amb: ['murmur'] };                       // Moonglow
    if (id === 'arcadia-terraces') return { theme: 'midlevels', amb: ['rain', 'city', 'murmur'] };  // the Mid-Levels' decks
    if (id === 'arcadia-atrium') return { theme: 'midlevels', amb: ['murmur', 'crowd'] };
    if (/^arcadia-(street|skypad|alley|skywalk)$/.test(id)) return { theme: 'arcadia', amb: ['rain', 'city'] };
    if (/^(arcadia|cyber|chrome|junk|tech|null)/.test(id)) return { theme: 'lofi', amb: ['rainsoft', 'hum'] };
    if (/^enigma/.test(id)) return { theme: 'enigma', amb: ['hum', 'beeps'] };
    if (/^singularity/.test(id)) return { theme: 'singularity', amb: ['rumble'] };
    if (id === 'verdance-home') return { theme: 'verdance', amb: ['fire', 'birds'] };
    var winter = typeof BridgeSeasons !== 'undefined' && BridgeSeasons.quiet();
    if (/^verdance(-village)?$/.test(id) && typeof BridgeWeather !== 'undefined' && BridgeWeather.rainDay()) return { theme: 'verdance', amb: winter ? ['snowwind'] : ['rain', 'breeze'] };
    if (/^verdance(-village)?$/.test(id) && winter) return { theme: 'verdance', amb: ['breeze', 'chimes'] };
    if (id === 'verdance-village') return { theme: 'verdance', amb: ['birds', 'breeze', 'chimes'] };
    if (/^verdance/.test(id)) return { theme: 'verdance', amb: ['breeze', 'birds'] };
    if (id === 'hoarfell-summit' || id === 'hoarfell-ridge' || id === 'hoarfell-icestep') return { theme: 'summit', amb: ['gale'] };
    if (id === 'hoarfell-hollow') return { theme: 'summit', amb: ['drips', 'chimes'] };
    if (id === 'hoarfell-lodge') return { theme: 'hoarfell', amb: ['fire', 'murmur'] };
    if (id === 'hoarfell-skihire') return { theme: 'hoarfell', amb: ['fire', 'chimes'] };
    if (id === 'hoarfell-park') return { theme: 'arcade', amb: ['snowwind'] };
    if (/^hoarfell/.test(id)) return { theme: 'hoarfell', amb: ['snowwind', 'chimes'] };
    if (id === 'sylvara-hall') return { theme: 'sylvara', amb: ['murmur', 'chimes'] };
    if (/^sylvara/.test(id)) return { theme: 'sylvara', amb: ['breeze', 'birds', 'chimes'] };
    if (/cave/.test(id) || ts === 'cave') return { theme: 'cave', amb: ['drips', 'rumble'] };
    if (/tower/.test(id) || ts === 'tower') return { theme: 'tower', amb: ['wind'] };
    if (/lighthouse|lamproom/.test(id)) return { theme: 'lumar-in', amb: ['wind', 'searoom'] };
    if (id === 'lumar-passage') return { theme: 'lumar', amb: ['sea', 'wind', 'creak'] };          // under sail in the sloop
    if (id === 'lumar-crown-chapel') return { theme: 'chapel', amb: ['wind'] };
    if (id === 'lumar-crown-exchange') return { theme: 'lumar-in', amb: ['crowd', 'murmur'] };
    if (id === 'lumar-crown-office') return { theme: 'lumar-in', amb: ['murmur'] };
    if (id === 'lumar-holm-resort') return { theme: 'lumar-in', amb: ['sea', 'murmur'] };                // the Starling: the sea past the terrace
    if (/^lumar/.test(id)) {
      var inside = w && w.scene && !w.scene.backdrop && !/^lumar(-square|-crimson|-rose|-sapphire|-midnight)?$/.test(id);
      if (inside) return { theme: 'lumar-in', amb: id === 'lumar-home' || id === 'lumar-holm-home' || /^lumar-manor/.test(id) ? ['fire'] : ['fire', 'murmur'] };     // your own house is quiet
      return { theme: 'lumar', amb: id === 'lumar-square' ? ['wind', 'murmur'] : ['sea', 'wind'] };
    }
    return { theme: 'ship', amb: ['engine'] };
  }

  // ---- the band -----------------------------------------------------------------------------------
  var song = null, timer = 0;

  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function chordTones(th, deg) {
    var sc = MODES[th.mode], out = [];
    for (var i = 0; i < 4; i++) {
      var idx = deg + i * 2, oct = Math.floor(idx / 7);
      out.push(th.root + sc[idx % 7] + oct * 12);
    }
    return out;
  }
  function scaleNote(th, deg) {
    var sc = MODES[th.mode], oct = Math.floor(deg / 7), i = ((deg % 7) + 7) % 7;
    return th.root + sc[i] + oct * 12;
  }

  // a phrase: 2 bars of rhythm + scale steps, built from the chords under it
  function phrase(th, r, bars, density) {
    var notes = [], deg = th.chords[bars[0] % th.chords.length] + 7 + Math.floor(r() * 3) * 2;
    for (var b = 0; b < 2; b++) {
      for (var st = 0; st < 16; st += 2) {
        if (r() > density && st !== 0) continue;
        var len = r() < 0.3 ? 4 : 2;
        deg += [-2, -1, -1, 0, 1, 1, 2][Math.floor(r() * 7)];
        var chord = th.chords[bars[b] % th.chords.length];
        if (st === 0) {                                  // land on a chord tone at the bar line
          var opts = [chord + 7, chord + 9, chord + 11];
          deg = opts.reduce(function (a, c) { return Math.abs(c - deg) < Math.abs(a - deg) ? c : a; });
        }
        deg = Math.max(chord + 4, Math.min(chord + 14, deg));
        notes.push({ bar: b, step: st, deg: deg, len: len });
      }
    }
    return notes;
  }

  function start(themeName, amb) {
    if (!ac || ac.state !== 'running') { wanted = { theme: themeName, amb: amb }; if (ac) ac.resume(); return; }
    startAmbience(amb);
    if (song && song.name === themeName) return;
    stopSong();
    var th = THEMES[themeName];
    if (!th) return;
    var m = moodNow(themeName);
    th = moodTheme(th, m.mood);
    var bus = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = m.cutoff; lp.Q.value = 0.5;
    bus.gain.setValueAtTime(0.0001, ac.currentTime);
    bus.gain.linearRampToValueAtTime(1, ac.currentTime + 2.5);
    bus.connect(lp); lp.connect(musicBus);
    var seed = 1;
    for (var i = 0; i < themeName.length; i++) seed = (seed * 31 + themeName.charCodeAt(i)) % 2147483647;
    song = { name: themeName, th: th, bus: bus, lp: lp, mood: m.mood, step: 0, next: ac.currentTime + 0.15, r: rng(seed + Math.floor(Date.now() / 600000)),
             phrases: {}, spb: 60 / th.bpm / 4 };
    clearInterval(timer);
    timer = setInterval(schedule, 25);
  }

  function stopSong() {
    if (!song) return;
    var old = song.bus;
    old.gain.cancelScheduledValues(ac.currentTime);
    old.gain.setTargetAtTime(0.0001, ac.currentTime, 0.6);
    setTimeout(function () { old.disconnect(); }, 4000);
    song = null;
    clearInterval(timer);
  }

  function schedule() {
    if (!song || !ac) return;
    if (ac.currentTime - retuned > 4) { retuned = ac.currentTime; retune(); if (!song) return; }
    while (song.next < ac.currentTime + 0.12) {
      playStep(song, song.step, song.next);
      var swing = song.th.swing && song.step % 2 === 0 ? song.th.swing : (song.th.swing ? -song.th.swing : 0);
      song.next += song.spb * (1 + swing);
      song.step++;
    }
  }

  function playStep(s, n, t) {
    if (s.nextTh && n % 16 === 0) { s.th = s.nextTh; s.nextTh = null; s.spb = 60 / s.th.bpm / 4; s.phrases = {}; }   // a new mood at the bar line
    var th = s.th, st = n % 16, bar = Math.floor(n / 16), d = s.bus;
    var deg = th.chords[bar % th.chords.length], tones = chordTones(th, deg);
    var section = Math.floor(bar / 8) % 4;                  // 0 sparse, 1 full, 2 full, 3 thinner
    var full = section === 1 || section === 2;
    var barDur = s.spb * 16;
    if (st === 0 && th.pad) tones.slice(0, 3).forEach(function (m, i) { INST[th.pad](d, t, m + (i === 0 ? 0 : 12), barDur * 0.98, 1); });
    if (th.arp && th.arp.steps.indexOf(st) >= 0 && (!th.arp.sparse || s.r() > th.arp.sparse)) {
      var a = th.arp, pat = a.pattern || [0, 1, 2, 3, 2, 1];
      var k = a.steps.indexOf(st);
      if (a.chord) tones.slice(0, 3).forEach(function (m) { INST[a.inst](d, t, m + a.oct, s.spb * 3, 0.6); });
      else INST[a.inst](d, t, tones[pat[k % pat.length] % tones.length] + a.oct, s.spb * 2, section === 0 ? 0.7 : 1);
    }
    if (th.bass && th.bass.walk && th.bass.steps.indexOf(st) >= 0) {
      // a walking line: the root on the one, chord tones in between, a half step into the next bar's root
      var nextRoot = chordTones(th, th.chords[(bar + 1) % th.chords.length])[0], beat = th.bass.steps.indexOf(st);
      var wn = beat === 0 ? tones[0] : beat === 3 ? nextRoot + (s.r() < 0.5 ? -1 : 1) : tones[s.r() < 0.5 ? 1 : 2];
      while (wn - tones[0] > 7) wn -= 12;
      INST[th.bass.inst](d, t, wn - 12 + (th.bass.oct || 0), s.spb * 4, section === 0 ? 0.8 : 1);
    } else if (th.bass && th.bass.steps.indexOf(st) >= 0 && (full || st === 0 || section === 3 || th.drive)) {
      INST[th.bass.inst](d, t, tones[0] - 12 + (th.bass.oct || 0) + (st === 8 && s.r() < 0.3 ? 7 : 0), s.spb * 2, 1);
    }
    if (th.perc && (full || section === 3 || th.drive)) th.perc.forEach(function (p) {
      if (p[1].indexOf(st) >= 0) INST[p[0]](d, t, p[2] || 0, s.spb, section === 3 ? 0.7 : 1);
    });
    if (th.lead && full) {
      var pi = Math.floor(bar / 2);                        // phrases two bars long, in the form A A' B A
      var form = ['A', 'A2', 'B', 'A'][pi % 4] + Math.floor(pi / 4) % 3;
      if (!s.phrases[form]) {
        var base = form.charAt(0) === 'B' ? 'B' : 'A';
        var src = s.phrases[base + form.slice(-1)];
        if (form.indexOf('A2') === 0 && src) {
          var v = src.map(function (x) { return Object.assign({}, x); });
          if (v.length) v[v.length - 1].deg += s.r() < 0.5 ? 2 : -2;
          s.phrases[form] = v;
        } else s.phrases[form] = phrase(th, s.r, [bar, bar + 1], th.lead.density);
        if (form.charAt(0) === 'A' && form.indexOf('A2') !== 0) s.phrases['A' + form.slice(-1)] = s.phrases[form];
      }
      var b = bar % 2;
      s.phrases[form].forEach(function (x) {
        if (x.bar === b && x.step === st) INST[th.lead.inst](d, t, scaleNote(th, x.deg) + th.lead.oct - 12, s.spb * x.len, 0.9);
      });
    }
  }

  // ---- the moment: the hour, the weather, a festival, a seat in a tavern ---------------------------------
  // Outdoors the band follows the sky: hushed at dawn, itself by day, slower at dusk, sparse and low at night;
  // rain or snow softens it (a filter over the song), a storm darkens the key. A festival open where you are plays
  // its own tune (assets/festivals.json `music`), and sitting down in a tavern starts the band. Checked every few
  // seconds; a new mood comes in at the next bar line, a new tune crossfades.
  var MOODY = { lumar: 1, verdance: 1, hoarfell: 1, sylvara: 1, summit: 1 };
  var TAVERNS = /^(lumar-tavern|lumar-crown-pub|lumar-tern-inn|hoarfell-lodge)$/;
  var placeId = '', retuned = 0;
  function moodTheme(th, mood) {
    if (!mood || mood === 'day') return th;
    var o = Object.assign({}, th), k = { dawn: [0.9, 0.6], dusk: [0.92, 0.7], night: [0.84, 0.45], wet: [0.94, 0.7], storm: [1.04, 0.8] }[mood] || [1, 1];
    o.bpm = Math.round(th.bpm * k[0]);
    if (th.lead) o.lead = Object.assign({}, th.lead, { density: th.lead.density * k[1], oct: th.lead.oct - (mood === 'night' ? 12 : 0) });
    if (mood === 'night' || mood === 'dawn') { o.perc = null; if (th.arp) o.arp = Object.assign({}, th.arp, { sparse: Math.max(th.arp.sparse || 0, 0.35) }); }
    if (mood === 'dusk' && th.perc) o.perc = th.perc.filter(function (x) { return x[0] === 'shaker'; });
    if (mood === 'storm') {
      o.mode = th.mode === 'ionian' || th.mode === 'mixolydian' ? 'dorian' : th.mode === 'lydian' ? 'aeolian' : th.mode;
      o.perc = [['tom', [0, 6, 8, 14]]].concat(th.perc || []);
    }
    return o;
  }
  // { mood, cutoff } for a tune where you are now
  function moodNow(themeName) {
    var out = { mood: 'day', cutoff: 18000 };
    if (!MOODY[themeName] || !placeId) return out;
    var W = typeof BridgeWeather !== 'undefined' && BridgeWeather.here ? BridgeWeather.here(placeId) : null;
    var wet = !!(W && W.def && W.def.wet && W.k > 0.3), storm = !!(W && (W.kind === 'storm' || W.kind === 'blizzard') && W.k > 0.3);
    var k = typeof BridgeClock !== 'undefined' && BridgeClock.sky ? BridgeClock.sky(placeId) : null, part = k ? k.part : 'day';
    out.mood = storm ? 'storm' : part === 'night' ? 'night' : part === 'dawn' ? 'dawn' : part === 'dusk' ? 'dusk' : wet ? 'wet' : 'day';
    if (wet) out.cutoff = W.kind === 'snow' ? 2600 : 1500;
    return out;
  }
  // which tune this moment wants: a festival's, the tavern band, or the place's own
  function tuneNow() {
    if (!place) return null;
    var F = typeof BridgeFestivals !== 'undefined' && BridgeFestivals.on ? BridgeFestivals.on() : [];
    for (var i = 0; i < F.length; i++) if (F[i].world === placeId && F[i].music && BridgeFestivals.open(F[i])) return { theme: F[i].music, amb: place.amb.concat(['murmur']) };
    if (TAVERNS.test(placeId) && typeof BridgeCharacter !== 'undefined' && BridgeCharacter.isSeated && BridgeCharacter.isSeated()) return { theme: 'band', amb: place.amb };
    return place;
  }
  function retune() {
    var want = tuneNow();
    if (!want || !song) return;
    if (want.theme !== song.name) { start(want.theme, want.amb); return; }
    var m = moodNow(song.name);
    song.lp.frequency.setTargetAtTime(m.cutoff, ac.currentTime, 1.5);
    if (m.mood !== song.mood) { song.mood = m.mood; song.nextTh = moodTheme(THEMES[song.name], m.mood); }
  }

  // ---- ambience ---------------------------------------------------------------------------------------
  var ambNodes = [], ambKey = '', ambTimers = [];

  function loopNoise(filterType, freq, q, gain) {
    var src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    var f = ac.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q || 0.7;
    var g = ac.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g);
    src.start();
    return { src: src, f: f, g: g };
  }
  function lfo(param, rate, depth) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = rate; g.gain.value = depth;
    o.connect(g); g.connect(param); o.start();
    return o;
  }

  var BEDS = {
    sea: function (out) {
      var n = loopNoise('lowpass', 520, 0.6, 0.0);
      n.g.gain.value = 0.32;
      var l1 = lfo(n.g.gain, 0.09, 0.22), l2 = lfo(n.f.frequency, 0.07, 260);
      n.g.connect(out);
      var hiss = loopNoise('highpass', 3500, 0.5, 0.04); var l3 = lfo(hiss.g.gain, 0.09, 0.035); hiss.g.connect(out);
      return [n.src, hiss.src, l1, l2, l3];
    },
    searoom: function (out) { var n = loopNoise('lowpass', 280, 0.6, 0.18); var l = lfo(n.g.gain, 0.08, 0.12); n.g.connect(out); return [n.src, l]; },
    wind: function (out) {
      var n = loopNoise('bandpass', 420, 0.9, 0.1);
      var l = lfo(n.f.frequency, 0.05, 220), l2 = lfo(n.g.gain, 0.11, 0.07);
      n.g.connect(out);
      return [n.src, l, l2];
    },
    rain: function (out) {
      var n = loopNoise('highpass', 1400, 0.5, 0.14); n.g.connect(out);
      var m = loopNoise('lowpass', 900, 0.5, 0.06); m.g.connect(out);
      ambTimers.push(setInterval(function () {                 // drops on awnings
        if (!ac) return;
        for (var i = 0; i < 3; i++) noiseHit(out, ac.currentTime + Math.random() * 0.2, 0.02, { freq: 2500 + Math.random() * 3000, ftype: 'bandpass', q: 4, gain: 0.05 });
      }, 220));
      return [n.src, m.src];
    },
    rainsoft: function (out) { var n = loopNoise('bandpass', 1800, 0.4, 0.05); n.g.connect(out); return [n.src]; },
    city: function (out) { var n = loopNoise('lowpass', 160, 0.5, 0.25); var l = lfo(n.g.gain, 0.04, 0.08); n.g.connect(out); return [n.src, l]; },
    hum: function (out) {
      var o1 = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
      o1.frequency.value = 55; o2.frequency.value = 110.4; g.gain.value = 0.035;
      o1.connect(g); o2.connect(g); g.connect(out); o1.start(); o2.start();
      var n = loopNoise('lowpass', 300, 0.5, 0.06); n.g.connect(out);
      return [o1, o2, n.src];
    },
    engine: function (out) {
      var o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = 41; f.type = 'lowpass'; f.frequency.value = 140; g.gain.value = 0.05;
      o.connect(f); f.connect(g); g.connect(out); o.start();
      var l = lfo(g.gain, 0.15, 0.015);
      var n = loopNoise('lowpass', 220, 0.5, 0.05); n.g.connect(out);
      return [o, l, n.src];
    },
    creak: function (out) {
      ambTimers.push(setInterval(function () {
        if (!ac || Math.random() > 0.25) return;
        var t = ac.currentTime;
        voice(out, t, 0.6, { type: 'sawtooth', freq: 70 + Math.random() * 40, glide: 1.15, glideT: 0.6, gain: 0.025, a: 0.2, d: 0.4, s: 0.5, r: 0.3, cutoff: 380, q: 6 });
      }, 3000));
      return [];
    },
    fire: function (out) {
      var n = loopNoise('lowpass', 600, 0.5, 0.05); n.g.connect(out);
      ambTimers.push(setInterval(function () {
        if (!ac) return;
        var k = 1 + Math.floor(Math.random() * 3);
        for (var i = 0; i < k; i++) noiseHit(out, ac.currentTime + Math.random() * 0.3, 0.015 + Math.random() * 0.02, { freq: 1500 + Math.random() * 2500, ftype: 'bandpass', q: 2, gain: 0.07 });
      }, 260));
      return [n.src];
    },
    murmur: function (out) {
      var n = loopNoise('bandpass', 520, 1.4, 0.06);
      var l = lfo(n.g.gain, 4.3, 0.025), l2 = lfo(n.f.frequency, 2.7, 120);
      n.g.connect(out);
      return [n.src, l, l2];
    },
    crowd: function (out) {
      var n = loopNoise('bandpass', 650, 1.0, 0.07); var l = lfo(n.g.gain, 5.1, 0.03); n.g.connect(out);
      return [n.src, l];
    },
    bleeps: function (out) {
      ambTimers.push(setInterval(function () {
        if (!ac || Math.random() > 0.5) return;
        var t = ac.currentTime, base = 72 + Math.floor(Math.random() * 12);
        for (var i = 0; i < 3; i++) voice(out, t + i * 0.06, 0.05, { type: 'square', freq: hz(base + i * (Math.random() < 0.5 ? 4 : 7)), gain: 0.012, a: 0.002, d: 0.05, s: 0.3, r: 0.03, pan: Math.random() * 1.6 - 0.8 });
      }, 700));
      return [];
    },
    beeps: function (out) {
      ambTimers.push(setInterval(function () {
        if (!ac || Math.random() > 0.3) return;
        voice(out, ac.currentTime, 0.12, { type: 'sine', freq: hz(84 + (Math.random() < 0.5 ? 0 : 5)), gain: 0.02, a: 0.003, d: 0.1, s: 0.4, r: 0.1, rev: 0.6, dly: 0.4 });
      }, 2500));
      return [];
    },
    drips: function (out) {
      ambTimers.push(setInterval(function () {
        if (!ac || Math.random() > 0.4) return;
        voice(out, ac.currentTime, 0.03, { type: 'sine', freq: 900 + Math.random() * 700, glide: 1.6, glideT: 0.05, gain: 0.04, a: 0.001, d: 0.1, s: 0, r: 0.1, rev: 0.9 });
      }, 900));
      return [];
    },
    rumble: function (out) {
      var n = loopNoise('lowpass', 90, 0.8, 0.3); var l = lfo(n.g.gain, 0.06, 0.12); n.g.connect(out);
      return [n.src, l];
    },
    breeze: function (out) {                                    // warm wind in long grass
      var n = loopNoise('bandpass', 900, 0.6, 0.035); var l = lfo(n.g.gain, 0.07, 0.025), l2 = lfo(n.f.frequency, 0.05, 300); n.g.connect(out);
      return [n.src, l, l2];
    },
    snowwind: function (out) {                                  // soft wind over snow, a hiss of spindrift
      var n = loopNoise('bandpass', 700, 0.7, 0.05); var l = lfo(n.g.gain, 0.06, 0.035), l2 = lfo(n.f.frequency, 0.04, 250); n.g.connect(out);
      var h = loopNoise('highpass', 5000, 0.5, 0.012); var l3 = lfo(h.g.gain, 0.13, 0.01); h.g.connect(out);
      return [n.src, h.src, l, l2, l3];
    },
    gale: function (out) {                                      // the summit: wind that never stops, gusting
      var n = loopNoise('bandpass', 520, 1.1, 0.12); var l = lfo(n.g.gain, 0.09, 0.07), l2 = lfo(n.f.frequency, 0.07, 320); n.g.connect(out);
      var w = loopNoise('highpass', 2600, 0.6, 0.03); var l3 = lfo(w.g.gain, 0.17, 0.02); w.g.connect(out);
      return [n.src, w.src, l, l2, l3];
    },
    chimes: function (out) {                                    // the lift's bullwheel, a far-off bell on a chair
      ambTimers.push(setInterval(function () {
        if (!ac || Math.random() > 0.35) return;
        INST.bell(out, ac.currentTime, 84 + [0, 4, 7, 11][Math.floor(Math.random() * 4)], 0.06, 0.6);
      }, 2600));
      return [];
    },
    slots: function (out) {                                     // the slot floor: chimes, a payout jingle now and then, coins
      ambTimers.push(setInterval(function () {
        if (!ac) return;
        var t = ac.currentTime, r = Math.random(), pan = Math.random() * 1.6 - 0.8;
        if (r < 0.45) {                                         // a machine's little chime
          var base = 79 + [0, 2, 4, 7][Math.floor(Math.random() * 4)];
          [0, 4, 7].forEach(function (iv, i) { voice(out, t + i * 0.07, 0.05, { type: 'sine', freq: hz(base + iv), gain: 0.014, a: 0.002, d: 0.3, s: 0, r: 0.3, pan: pan, rev: 0.4 }); });
        } else if (r < 0.55) {                                  // somebody's won: a run up and a rattle of coins
          [0, 2, 4, 5, 7, 9, 11, 12].forEach(function (iv, i) { voice(out, t + i * 0.06, 0.05, { type: 'square', freq: hz(76 + iv), gain: 0.008, a: 0.002, d: 0.08, s: 0.2, r: 0.05, cutoff: 3000, pan: pan }); });
          for (var c = 0; c < 10; c++) noiseHit(out, t + 0.5 + c * 0.05 + Math.random() * 0.03, 0.03, { freq: 4500 + Math.random() * 2500, ftype: 'bandpass', q: 6, gain: 0.025 });
        } else if (r < 0.75) {                                  // reels clicking to a stop
          for (var k = 0; k < 3; k++) noiseHit(out, t + k * 0.18, 0.02, { freq: 2200, ftype: 'bandpass', q: 3, gain: 0.02 });
        }
      }, 700));
      var hum = loopNoise('bandpass', 1100, 2.0, 0.012); hum.g.connect(out);
      return [hum.src];
    },
    chips: function (out) {                                     // a card room: chips clacked in stacks, cards riffled
      ambTimers.push(setInterval(function () {
        if (!ac || Math.random() > 0.55) return;
        var t = ac.currentTime, n = 2 + Math.floor(Math.random() * 5);
        for (var c = 0; c < n; c++) noiseHit(out, t + c * (0.04 + Math.random() * 0.03), 0.015, { freq: 3000 + Math.random() * 1500, ftype: 'bandpass', q: 5, gain: 0.03 });
        if (Math.random() < 0.2) for (var r2 = 0; r2 < 14; r2++) noiseHit(out, t + 0.6 + r2 * 0.018, 0.01, { freq: 6000, ftype: 'highpass', gain: 0.012 });
      }, 1100));
      return [];
    },
    birds: function (out) {                                     // songbirds in the hedgerow, now and then a wood pigeon
      ambTimers.push(setInterval(function () {
        if (!ac) return;
        var t = ac.currentTime, r = Math.random(), pan = Math.random() * 1.6 - 0.8;
        if (r < 0.35) {
          var f0 = 2600 + Math.random() * 1400, n = 2 + Math.floor(Math.random() * 4);
          for (var i = 0; i < n; i++) voice(out, t + i * 0.11, 0.06, { type: 'sine', freq: f0 * (1 + (i % 2) * 0.18), glide: 1.25, glideT: 0.05, gain: 0.018, a: 0.004, d: 0.06, s: 0.2, r: 0.04, pan: pan, rev: 0.3 });
        } else if (r < 0.45) {
          [0, 0.45, 0.7].forEach(function (d, i) { voice(out, t + d, 0.22, { type: 'sine', freq: i === 1 ? 340 : 310, gain: 0.02, a: 0.06, d: 0.15, s: 0.5, r: 0.12, pan: pan, rev: 0.4 }); });
        }
      }, 1300));
      return [];
    }
  };

  function startAmbience(list) {
    var key = (list || []).join('+');
    if (key === ambKey) return;
    ambKey = key;
    var oldBus = ambNodes.bus, oldNodes = ambNodes.nodes || [];
    ambTimers.forEach(clearInterval); ambTimers = [];
    if (oldBus) {
      oldBus.gain.setTargetAtTime(0.0001, ac.currentTime, 0.5);
      setTimeout(function () { oldNodes.forEach(function (n) { try { n.stop(); } catch (e) { /* already */ } }); oldBus.disconnect(); }, 3000);
    }
    var bus = ac.createGain();
    bus.gain.setValueAtTime(0.0001, ac.currentTime);
    bus.gain.linearRampToValueAtTime(1, ac.currentTime + 2);
    bus.connect(ambBus);
    var nodes = [];
    (list || []).forEach(function (b) { if (BEDS[b]) nodes = nodes.concat(BEDS[b](bus)); });
    ambNodes = { bus: bus, nodes: nodes };
  }

  // ---- effects ------------------------------------------------------------------------------------
  var lastStep = 0;
  // a whoosh: noise through a band that slides from f0 to f1 (a blade through the air: high and quick; a maul: low
  // and slow), swelling and dying away
  function whoosh(t, dur, f0, f1, gain, q) {
    var src = ac.createBufferSource(); src.buffer = noiseBuf;
    var f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q || 1.4;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  }
  var SFX = {
    blip:    function (t) { voice(sfxBus, t, 0.04, { type: 'square', freq: hz(84), gain: 0.05, a: 0.002, d: 0.05, s: 0.2, r: 0.04, cutoff: 3000 }); },
    click:   function (t) { voice(sfxBus, t, 0.01, { type: 'square', freq: hz(91), gain: 0.04, a: 0.001, d: 0.02, s: 0, r: 0.02, cutoff: 4000 }); },
    open:    function (t) { [79, 86].forEach(function (m, i) { voice(sfxBus, t + i * 0.05, 0.08, { type: 'sine', freq: hz(m), gain: 0.07, a: 0.003, d: 0.2, s: 0.2, r: 0.2, rev: 0.3 }); }); },
    close:   function (t) { [86, 79].forEach(function (m, i) { voice(sfxBus, t + i * 0.05, 0.06, { type: 'sine', freq: hz(m), gain: 0.05, a: 0.003, d: 0.15, s: 0.1, r: 0.15 }); }); },
    door:    function (t) { noiseHit(sfxBus, t, 0.45, { freq: 700, ftype: 'bandpass', q: 0.8, gain: 0.12, rev: 0.3 }); voice(sfxBus, t, 0.1, { type: 'sine', freq: 90, glide: 1.4, gain: 0.08, a: 0.01, d: 0.2, s: 0, r: 0.2 }); },
    coin:    function (t) { voice(sfxBus, t, 0.05, { type: 'square', freq: hz(88), gain: 0.05, a: 0.001, d: 0.06, s: 0.3, r: 0.05, cutoff: 5000 }); voice(sfxBus, t + 0.07, 0.18, { type: 'square', freq: hz(95), gain: 0.05, a: 0.001, d: 0.2, s: 0.3, r: 0.2, cutoff: 5000, rev: 0.2 }); },
    clue:    function (t) { [72, 76, 79, 84].forEach(function (m, i) { INST.bell(sfxBus, t + i * 0.09, m, 0.3, 1.3); }); },
    // a quest's thing held up (js/keyitems.js): a bright rising run, then a held chord with bells over it
    itemget: function (t) {
      [62, 66, 69, 74, 78, 81].forEach(function (m, i) { INST.pluck(sfxBus, t + i * 0.065, m, 0.25, 0.9); });
      [74, 78, 81, 86].forEach(function (m) { INST.bell(sfxBus, t + 0.42, m, 0.35, 1.8); });
      INST.warm(sfxBus, t + 0.4, 50, 1.6, 2.2); INST.warm(sfxBus, t + 0.4, 57, 1.6, 2.2);
    },
    // a quest's thing handed over: a soft chime falling into place
    give:    function (t) { [86, 81, 78, 74].forEach(function (m, i) { INST.bell(sfxBus, t + i * 0.07, m, 0.25, 1.2); }); },
    quest:   function (t) { [60, 64, 67, 72, 76, 79, 84].forEach(function (m, i) { INST.bell(sfxBus, t + i * 0.08, m, 0.4, 1.2); }); INST.warm(sfxBus, t, 48, 1.4, 2); INST.warm(sfxBus, t, 55, 1.4, 2); },
    pickup:  function (t) { [76, 83, 88].forEach(function (m, i) { voice(sfxBus, t + i * 0.045, 0.05, { type: 'triangle', freq: hz(m), gain: 0.07, a: 0.002, d: 0.08, s: 0.2, r: 0.08 }); }); },
    step:    function (t) { noiseHit(sfxBus, t, 0.05, { freq: 420 + Math.random() * 200, ftype: 'bandpass', q: 1.2, gain: 0.035 }); },
    sit:     function (t) { noiseHit(sfxBus, t, 0.18, { freq: 300, ftype: 'lowpass', gain: 0.12 }); },
    sleep:   function (t) { [79, 76, 72, 67].forEach(function (m, i) { INST.box(sfxBus, t + i * 0.32, m - 12, 0.3, 1); }); },
    splash:  function (t) { noiseHit(sfxBus, t, 0.5, { freq: 1200, ftype: 'lowpass', gain: 0.18, rev: 0.3 }); },
    plop:    function (t) { voice(sfxBus, t, 0.05, { type: 'sine', freq: 300, glide: 2.4, glideT: 0.08, gain: 0.14, a: 0.002, d: 0.12, s: 0, r: 0.1, rev: 0.3 }); },
    catch:   function (t) { [67, 71, 74, 79].forEach(function (m, i) { INST.pluck(sfxBus, t + i * 0.07, m, 0.2, 1.4); }); },
    rarecatch: function (t) { [67, 71, 74, 79, 83, 86].forEach(function (m, i) { INST.bell(sfxBus, t + i * 0.07, m, 0.3, 1.1); }); INST.warm(sfxBus, t + 0.1, 55, 1.2, 1.6); },
    fanfare: function (t) {                              // a legend landed: brass-ish chords climbing, bells over the top
      [[55, 59, 62], [57, 60, 64], [59, 62, 67], [60, 64, 67, 72]].forEach(function (ch, i) {
        ch.forEach(function (m) { voice(sfxBus, t + i * 0.22, i === 3 ? 1.2 : 0.18, { type: 'sawtooth', freq: hz(m), gain: 0.03, a: 0.01, d: 0.3, s: 0.6, r: 0.5, cutoff: 2200, rev: 0.4 }); });
      });
      [79, 84, 88, 91, 96].forEach(function (m, i) { INST.bell(sfxBus, t + 0.7 + i * 0.09, m, 0.3, 1.0); });
    },
    ball:    function (t) { voice(sfxBus, t, 0.01, { type: 'triangle', freq: 2400 + Math.random() * 1200, gain: 0.015, a: 0.001, d: 0.015, s: 0, r: 0.01 }); },
    pocket:  function (t) { voice(sfxBus, t, 0.08, { type: 'square', freq: hz(81), gain: 0.04, a: 0.001, d: 0.1, s: 0.2, r: 0.08, cutoff: 4000 }); voice(sfxBus, t + 0.06, 0.1, { type: 'square', freq: hz(88), gain: 0.04, a: 0.001, d: 0.12, s: 0.2, r: 0.1, cutoff: 4000 }); },
    fever:   function (t) { for (var i = 0; i < 12; i++) voice(sfxBus, t + i * 0.07, 0.06, { type: 'square', freq: hz(72 + [0, 4, 7, 12][i % 4] + Math.floor(i / 4) * 2), gain: 0.04, a: 0.001, d: 0.06, s: 0.4, r: 0.04, cutoff: 5000, rev: 0.2 }); },
    success: function (t) { [72, 79, 84].forEach(function (m, i) { voice(sfxBus, t + i * 0.08, 0.1, { type: 'triangle', freq: hz(m), gain: 0.08, a: 0.002, d: 0.2, s: 0.3, r: 0.2, rev: 0.3 }); }); },
    fail:    function (t) { [64, 60, 55].forEach(function (m, i) { voice(sfxBus, t + i * 0.12, 0.12, { type: 'triangle', freq: hz(m), gain: 0.07, a: 0.004, d: 0.2, s: 0.3, r: 0.2 }); }); },
    warp:    function (t) {                                // the jump drive spooling: a rising hum, a swelling hiss
      voice(sfxBus, t, 1.3, { type: 'sawtooth', freq: 55, glide: 4, glideT: 1.3, gain: 0.05, a: 0.4, d: 0.6, s: 0.8, r: 0.2, cutoff: 900, rev: 0.4 });
      voice(sfxBus, t, 1.3, { type: 'sine', freq: hz(57), glide: 2, glideT: 1.3, gain: 0.06, a: 0.5, d: 0.5, s: 0.8, r: 0.2, rev: 0.5 });
      var src = ac.createBufferSource(); src.buffer = noiseBuf;
      var f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
      f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(5000, t + 1.3);
      var g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 1.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t); src.stop(t + 1.6);
    },
    leap:    function (t) {                                // the jump itself: a boom and a long rushing whoosh
      noiseHit(sfxBus, t, 0.6, { freq: 160, ftype: 'lowpass', gain: 0.35, rev: 0.6 });
      voice(sfxBus, t, 0.4, { type: 'sine', freq: 90, glide: 0.3, glideT: 0.5, gain: 0.2, a: 0.005, d: 0.5, s: 0, r: 0.3 });
      var src = ac.createBufferSource(); src.buffer = noiseBuf;
      var f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9;
      f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(600, t + 2.2);
      var g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.14, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
      src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t); src.stop(t + 2.4);
      [60, 67, 72, 79].forEach(function (m, i) { INST.bell(sfxBus, t + 0.25 + i * 0.12, m, 0.4, 0.5); });
    },
    dropout: function (t) {                                // out of the jump: a soft thump, the drive winding down
      noiseHit(sfxBus, t, 0.4, { freq: 220, ftype: 'lowpass', gain: 0.22, rev: 0.5 });
      voice(sfxBus, t, 0.9, { type: 'sawtooth', freq: 220, glide: 0.25, glideT: 0.9, gain: 0.04, a: 0.01, d: 0.6, s: 0.3, r: 0.3, cutoff: 700 });
      INST.bell(sfxBus, t + 0.15, 84, 0.6, 0.6); INST.bell(sfxBus, t + 0.3, 91, 0.6, 0.4);
    },
    lift:    function (t) {                                // the skiff's lift jets spooling up and away
      var src = ac.createBufferSource(); src.buffer = noiseBuf;
      var f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + 1.6);
      var g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
      src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t); src.stop(t + 2);
      voice(sfxBus, t, 1.4, { type: 'sawtooth', freq: 80, glide: 0.6, glideT: 1.2, gain: 0.04, a: 0.3, d: 0.5, s: 0.7, r: 0.5, cutoff: 500 });
    },
    land:    function (t) {                                // settling onto the pad
      var src = ac.createBufferSource(); src.buffer = noiseBuf;
      var f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(2000, t); f.frequency.exponentialRampToValueAtTime(260, t + 2.2);
      var g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.14, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t); src.stop(t + 2.7);
      noiseHit(sfxBus, t + 2.2, 0.3, { freq: 200, ftype: 'lowpass', gain: 0.18 });
    },
    till:    function (t) { noiseHit(sfxBus, t, 0.16, { freq: 380, ftype: 'lowpass', gain: 0.2 }); noiseHit(sfxBus, t + 0.05, 0.1, { freq: 1600, ftype: 'bandpass', q: 0.8, gain: 0.05 }); },
    water:   function (t) { noiseHit(sfxBus, t, 0.45, { freq: 2600, ftype: 'bandpass', q: 0.6, gain: 0.08 }); noiseHit(sfxBus, t + 0.1, 0.35, { freq: 900, ftype: 'lowpass', gain: 0.06 }); },
    sow:     function (t) { [0, 0.05, 0.1].forEach(function (d) { noiseHit(sfxBus, t + d, 0.03, { freq: 4000, ftype: 'highpass', gain: 0.04 }); }); voice(sfxBus, t + 0.12, 0.05, { type: 'triangle', freq: hz(79), gain: 0.04, a: 0.002, d: 0.08, s: 0, r: 0.05 }); },
    harvest: function (t) { noiseHit(sfxBus, t, 0.12, { freq: 700, ftype: 'bandpass', q: 1, gain: 0.12 }); [72, 76, 79].forEach(function (m, i) { INST.pluck(sfxBus, t + 0.06 + i * 0.06, m, 0.2, 1.2); }); },
    pick:    function (t) {                                // a pickaxe on rock: a ring of iron and a crack of stone
      voice(sfxBus, t, 0.03, { type: 'square', freq: 1800 + Math.random() * 500, glide: 0.7, glideT: 0.06, gain: 0.05, a: 0.001, d: 0.06, s: 0, r: 0.05, cutoff: 6000, rev: 0.25 });
      noiseHit(sfxBus, t, 0.09, { freq: 2600, ftype: 'bandpass', q: 1.5, gain: 0.09, rev: 0.25 });
    },
    swish:   function (t) { noiseHit(sfxBus, t, 0.12, { freq: 3200, ftype: 'highpass', gain: 0.06 }); },
    hit:     function (t) { noiseHit(sfxBus, t, 0.14, { freq: 900, ftype: 'bandpass', q: 1.2, gain: 0.16, rev: 0.2 }); voice(sfxBus, t, 0.05, { type: 'square', freq: 160, glide: 0.5, glideT: 0.08, gain: 0.06, a: 0.001, d: 0.08, s: 0, r: 0.05, cutoff: 1200 }); },
    hurt:    function (t) { voice(sfxBus, t, 0.12, { type: 'sawtooth', freq: 220, glide: 0.5, glideT: 0.15, gain: 0.07, a: 0.002, d: 0.15, s: 0, r: 0.1, cutoff: 1400 }); },
    thunder: function (t) {                                // far off, then rolling round the sky
      noiseHit(sfxBus, t, 1.8, { freq: 140, ftype: 'lowpass', gain: 0.32, rev: 0.6 });
      noiseHit(sfxBus, t + 0.12, 1.2, { freq: 80, ftype: 'lowpass', gain: 0.28, rev: 0.4 });
      noiseHit(sfxBus, t + 0.5, 1.6, { freq: 110, ftype: 'lowpass', gain: 0.18, rev: 0.6 });
    },
    dice:    function (t) {                                // dice rattled in a leather cup, then tipped out on wood
      for (var i = 0; i < 7; i++) noiseHit(sfxBus, t + i * 0.045 + Math.random() * 0.015, 0.03, { freq: 1800 + Math.random() * 1400, ftype: 'bandpass', q: 3, gain: 0.05 });
      for (var j = 0; j < 4; j++) noiseHit(sfxBus, t + 0.4 + j * 0.07, 0.04, { freq: 900 + Math.random() * 500, ftype: 'bandpass', q: 2.5, gain: 0.07, rev: 0.15 });
    },
    crumble: function (t) {                                // the rock giving way
      noiseHit(sfxBus, t, 0.4, { freq: 500, ftype: 'lowpass', gain: 0.2, rev: 0.35 });
      for (var i = 0; i < 4; i++) noiseHit(sfxBus, t + 0.05 + i * 0.06, 0.06, { freq: 900 + Math.random() * 700, ftype: 'bandpass', q: 2, gain: 0.06 });
    },
    luff:    function (t) {                                // a sail flogging: quick slaps of canvas
      for (var i = 0; i < 3; i++) noiseHit(sfxBus, t + i * 0.07 + Math.random() * 0.03, 0.06, { freq: 900 + Math.random() * 500, ftype: 'bandpass', q: 1.4, gain: 0.05 });
    },
    gybe:    function (t) {                                // the boom slamming across: a whoosh and a thump of wood
      noiseHit(sfxBus, t, 0.25, { freq: 2200, ftype: 'bandpass', q: 0.8, gain: 0.06 });
      noiseHit(sfxBus, t + 0.18, 0.2, { freq: 260, ftype: 'lowpass', gain: 0.22, rev: 0.3 });
      voice(sfxBus, t + 0.18, 0.08, { type: 'sine', freq: 110, glide: 0.6, glideT: 0.12, gain: 0.12, a: 0.002, d: 0.15, s: 0, r: 0.1 });
    },
    bell:    function (t) { INST.bell(sfxBus, t, 79, 0.25, 2.2); INST.bell(sfxBus, t + 0.02, 91, 0.08, 1.6); },   // a buoy's bell over the water
    slam:    function (t) {                                // stone fists on the ground
      noiseHit(sfxBus, t, 0.35, { freq: 160, ftype: 'lowpass', gain: 0.34, rev: 0.4 });
      voice(sfxBus, t, 0.1, { type: 'sine', freq: 70, glide: 0.5, glideT: 0.2, gain: 0.2, a: 0.002, d: 0.25, s: 0, r: 0.1 });
      for (var i = 0; i < 3; i++) noiseHit(sfxBus, t + 0.04 + i * 0.05, 0.05, { freq: 700 + Math.random() * 600, ftype: 'bandpass', q: 2, gain: 0.05 });
    },
    cannon:  function (t) {                                // a gun across the water: the crack, the boom, the echo
      noiseHit(sfxBus, t, 0.6, { freq: 220, ftype: 'lowpass', gain: 0.32, rev: 0.6 });
      voice(sfxBus, t, 0.08, { type: 'sine', freq: 58, glide: 0.55, glideT: 0.3, gain: 0.22, a: 0.002, d: 0.35, s: 0, r: 0.15 });
      noiseHit(sfxBus, t, 0.06, { freq: 2600, ftype: 'highpass', gain: 0.06 });
    },
    toll:    function (t) { INST.bell(sfxBus, t, 43, 0.5, 2.6); INST.bell(sfxBus, t + 0.01, 55, 0.22, 2.0); INST.bell(sfxBus, t + 0.02, 62, 0.08, 1.4); },   // the warden's bell
    zap:     function (t) { voice(sfxBus, t, 0.18, { type: 'triangle', freq: 1400, glide: 0.25, glideT: 0.18, gain: 0.07, a: 0.002, d: 0.18, s: 0, r: 0.06 }); noiseHit(sfxBus, t, 0.1, { freq: 5000, ftype: 'highpass', gain: 0.03 }); },
    burn:    function (t) { noiseHit(sfxBus, t, 0.3, { freq: 1200, ftype: 'bandpass', q: 0.7, gain: 0.08 }); },
    roar:    function (t) {                                // something vast under the boat: a growl through the water
      voice(sfxBus, t, 1.1, { type: 'sawtooth', freq: 48, glide: 1.35, glideT: 0.5, gain: 0.16, a: 0.12, d: 0.6, s: 0.4, r: 0.5, cutoff: 420, rev: 0.6 });
      voice(sfxBus, t + 0.05, 0.9, { type: 'sawtooth', freq: 71, glide: 0.8, glideT: 0.7, gain: 0.08, a: 0.1, d: 0.5, s: 0.3, r: 0.4, cutoff: 600, rev: 0.6 });
      noiseHit(sfxBus, t, 1.2, { freq: 260, ftype: 'lowpass', gain: 0.16, rev: 0.6 });
    },
    hiss:    function (t) {                                // the serpent rearing
      noiseHit(sfxBus, t, 0.7, { freq: 4200, ftype: 'highpass', gain: 0.07, rev: 0.3 });
      noiseHit(sfxBus, t + 0.1, 0.5, { freq: 2600, ftype: 'bandpass', q: 1.2, gain: 0.05, rev: 0.3 });
    },
    harpoon: function (t) {                                // thrown off the rail: a whoosh, the line paying out, a thunk
      noiseHit(sfxBus, t, 0.22, { freq: 1800, ftype: 'bandpass', q: 0.9, gain: 0.07 });
      noiseHit(sfxBus, t + 0.18, 0.08, { freq: 420, ftype: 'lowpass', gain: 0.14, rev: 0.2 });
    },
    frost:   function (t) { [0, 0.04, 0.09].forEach(function (d, i) { voice(sfxBus, t + d, 0.05, { type: 'sine', freq: 2400 + i * 520, gain: 0.04, a: 0.001, d: 0.12, s: 0, r: 0.1 }); }); },
    error:   function (t) { voice(sfxBus, t, 0.12, { type: 'square', freq: 140, gain: 0.04, a: 0.002, d: 0.1, s: 0.6, r: 0.05, cutoff: 900 }); },
    // fighting (js/arms.js): each kind of weapon its own swing and its own blow
    swing_blade: function (t) { whoosh(t, 0.09, 5200, 3000, 0.09, 1.6); },
    swing_sword: function (t) { whoosh(t, 0.17, 1600, 4200, 0.11, 1.2); noiseHit(sfxBus, t + 0.02, 0.05, { freq: 7000, ftype: 'highpass', gain: 0.02 }); },
    swing_chop:  function (t) { whoosh(t, 0.2, 700, 1900, 0.13, 1.0); },
    swing_pole:  function (t) { whoosh(t, 0.12, 2600, 5200, 0.1, 2.2); voice(sfxBus, t + 0.08, 0.03, { type: 'triangle', freq: 900, glide: 0.7, gain: 0.03, a: 0.001, d: 0.05, s: 0, r: 0.04 }); },
    swing_maul:  function (t) { whoosh(t, 0.32, 300, 900, 0.18, 0.8); },
    swing_cast:  function (t) { [84, 88, 91, 96].forEach(function (m, i) { voice(sfxBus, t + i * 0.03, 0.05, { type: 'sine', freq: hz(m), gain: 0.035, a: 0.002, d: 0.15, s: 0, r: 0.15, rev: 0.4 }); }); whoosh(t, 0.14, 2000, 6000, 0.05, 0.8); },
    swing_great: function (t) { whoosh(t, 0.26, 500, 2400, 0.15, 0.9); },
    swing_pick:  function (t) { whoosh(t, 0.12, 900, 2000, 0.1, 1.0); },
    impact_blade: function (t) {
      voice(sfxBus, t, 0.02, { type: 'square', freq: 2600, glide: 0.6, glideT: 0.04, gain: 0.04, a: 0.001, d: 0.04, s: 0, r: 0.03, cutoff: 7000 });
      noiseHit(sfxBus, t, 0.08, { freq: 1400, ftype: 'bandpass', q: 1.2, gain: 0.12 });
    },
    impact_sword: function (t) {
      voice(sfxBus, t, 0.04, { type: 'square', freq: 1500 + Math.random() * 300, glide: 0.8, glideT: 0.08, gain: 0.04, a: 0.001, d: 0.12, s: 0, r: 0.1, cutoff: 5000, rev: 0.25 });
      noiseHit(sfxBus, t, 0.12, { freq: 1000, ftype: 'bandpass', q: 1.1, gain: 0.15, rev: 0.15 });
    },
    impact_chop: function (t) {
      voice(sfxBus, t, 0.06, { type: 'sine', freq: 150, glide: 0.5, glideT: 0.1, gain: 0.16, a: 0.002, d: 0.14, s: 0, r: 0.08 });
      noiseHit(sfxBus, t, 0.16, { freq: 700, ftype: 'bandpass', q: 1.0, gain: 0.16 });
    },
    impact_pole: function (t) {
      noiseHit(sfxBus, t, 0.1, { freq: 600, ftype: 'bandpass', q: 1.4, gain: 0.16 });
      voice(sfxBus, t, 0.04, { type: 'sine', freq: 220, glide: 0.6, glideT: 0.06, gain: 0.1, a: 0.001, d: 0.08, s: 0, r: 0.05 });
    },
    impact_maul: function (t) {
      noiseHit(sfxBus, t, 0.5, { freq: 140, ftype: 'lowpass', gain: 0.38, rev: 0.45 });
      voice(sfxBus, t, 0.12, { type: 'sine', freq: 62, glide: 0.45, glideT: 0.25, gain: 0.26, a: 0.002, d: 0.3, s: 0, r: 0.15 });
      for (var i = 0; i < 4; i++) noiseHit(sfxBus, t + 0.05 + i * 0.05, 0.05, { freq: 600 + Math.random() * 700, ftype: 'bandpass', q: 2, gain: 0.05 });
    },
    impact_great: function (t) {
      voice(sfxBus, t, 0.05, { type: 'square', freq: 900 + Math.random() * 200, glide: 0.7, glideT: 0.1, gain: 0.04, a: 0.001, d: 0.16, s: 0, r: 0.12, cutoff: 4000, rev: 0.3 });
      noiseHit(sfxBus, t, 0.3, { freq: 260, ftype: 'lowpass', gain: 0.26, rev: 0.3 });
    },
    impact_cast: function (t) { voice(sfxBus, t, 0.06, { type: 'triangle', freq: 1800, glide: 0.4, glideT: 0.1, gain: 0.05, a: 0.001, d: 0.12, s: 0, r: 0.08, rev: 0.4 }); },
    impact_pick: function (t) {
      voice(sfxBus, t, 0.03, { type: 'square', freq: 700, glide: 0.6, glideT: 0.06, gain: 0.05, a: 0.001, d: 0.07, s: 0, r: 0.05, cutoff: 3000 });
      noiseHit(sfxBus, t, 0.1, { freq: 800, ftype: 'bandpass', q: 1.2, gain: 0.14 });
    },
    roll:    function (t) { whoosh(t, 0.26, 500, 1500, 0.09, 0.7); noiseHit(sfxBus, t + 0.3, 0.12, { freq: 260, ftype: 'lowpass', gain: 0.14 }); },
    dodge:   function (t) { whoosh(t, 0.14, 3000, 1200, 0.07, 1.2); },
    charge:  function (t) { voice(sfxBus, t, 0.18, { type: 'sine', freq: hz(79), glide: 0.5, glideT: 0.15, gain: 0.06, a: 0.01, d: 0.2, s: 0.2, r: 0.2, rev: 0.4 }); INST.bell(sfxBus, t + 0.12, 91, 0.2, 0.7); },
    charged: function (t) { whoosh(t, 0.28, 600, 3600, 0.16, 0.9); [60, 67, 72].forEach(function (m) { voice(sfxBus, t, 0.2, { type: 'sawtooth', freq: hz(m), gain: 0.025, a: 0.005, d: 0.25, s: 0.2, r: 0.2, cutoff: 1800, rev: 0.4 }); }); },
    // small happenings (js/events.js)
    fiddle:  function (t) {                                // a reel on the fiddle: two bars, bowed and bright
      [74, 78, 81, 78, 76, 79, 83, 79, 74, 78, 81, 86, 85, 81, 76, 81].forEach(function (m, i) {
        voice(sfxBus, t + i * 0.15, 0.13, { type: 'sawtooth', freq: hz(m), gain: 0.03, a: 0.012, d: 0.1, s: 0.7, r: 0.06, cutoff: 2400, q: 1.2, vib: [6, 8], rev: 0.25 });
      });
    },
    harp:    function (t) { [65, 69, 72, 76, 79, 83, 84, 79, 76, 72].forEach(function (m, i) { INST.lute(sfxBus, t + i * 0.24, m, 0.3, 0.8); }); },
    peal:    function (t) { [84, 83, 81, 79, 77, 76, 74, 72].forEach(function (m, i) { INST.bell(sfxBus, t + i * 0.24, m - 12, 0.3, 1.1); }); },
    chime:   function (t) { [88, 91, 95, 100].forEach(function (m, i) { INST.bell(sfxBus, t + i * 0.11, m - 12, 0.2, 0.7); }); },
    gavel:   function (t) { [0, 0.16].forEach(function (d) { noiseHit(sfxBus, t + d, 0.08, { freq: 500, ftype: 'lowpass', gain: 0.26, rev: 0.2 }); voice(sfxBus, t + d, 0.03, { type: 'sine', freq: 180, glide: 0.6, gain: 0.12, a: 0.001, d: 0.06, s: 0, r: 0.04 }); }); },
    flash:   function (t) { noiseHit(sfxBus, t, 0.03, { freq: 6000, ftype: 'highpass', gain: 0.06 }); voice(sfxBus, t + 0.02, 0.2, { type: 'sine', freq: 2600, glide: 0.6, glideT: 0.2, gain: 0.012, a: 0.01, d: 0.2, s: 0, r: 0.1 }); },
    drone:   function (t) { voice(sfxBus, t, 1.2, { type: 'sawtooth', freq: 190, gain: 0.02, a: 0.1, d: 0.3, s: 0.8, r: 0.3, cutoff: 1400, vib: [21, 40] }); },
    thud:    function (t) { noiseHit(sfxBus, t, 0.14, { freq: 380, ftype: 'lowpass', gain: 0.22 }); voice(sfxBus, t, 0.05, { type: 'sine', freq: 90, glide: 0.6, gain: 0.12, a: 0.001, d: 0.1, s: 0, r: 0.06 }); },
    powerdown: function (t) { voice(sfxBus, t, 0.7, { type: 'sine', freq: 420, glide: 0.15, glideT: 0.7, gain: 0.05, a: 0.005, d: 0.7, s: 0.3, r: 0.2 }); noiseHit(sfxBus, t, 0.05, { freq: 3000, ftype: 'bandpass', gain: 0.05 }); },
    glitch:  function (t) { for (var i = 0; i < 9; i++) voice(sfxBus, t + i * 0.055, 0.04, { type: 'square', freq: 200 + Math.random() * 1600, gain: 0.03, a: 0.001, d: 0.04, s: 0.3, r: 0.02, cutoff: 5000 }); },
    siren:   function (t) { for (var i = 0; i < 4; i++) voice(sfxBus, t + i * 0.42, 0.38, { type: 'square', freq: i % 2 ? 770 : 960, gain: 0.018, a: 0.02, d: 0.2, s: 0.8, r: 0.06, cutoff: 1800, rev: 0.3 }); },
    cluck:   function (t) { [0, 0.11, 0.2].forEach(function (d, i) { voice(sfxBus, t + d, 0.05, { type: 'triangle', freq: 700 - i * 60, glide: 0.65, glideT: 0.05, gain: 0.05, a: 0.002, d: 0.06, s: 0, r: 0.03, cutoff: 2500 }); }); },
    horn:    function (t) { [[67, 0, 0.3], [72, 0.34, 0.3], [79, 0.7, 0.6]].forEach(function (n) { voice(sfxBus, t + n[1], n[2], { type: 'sawtooth', freq: hz(n[0]), gain: 0.035, a: 0.03, d: 0.2, s: 0.8, r: 0.15, cutoff: 1600, rev: 0.35 }); }); },
    jingle:  function (t) { for (var i = 0; i < 8; i++) { noiseHit(sfxBus, t + i * 0.06 + Math.random() * 0.02, 0.06, { freq: 6500, ftype: 'bandpass', q: 6, gain: 0.05 }); voice(sfxBus, t + i * 0.06, 0.03, { type: 'sine', freq: 3000 + Math.random() * 1200, gain: 0.012, a: 0.001, d: 0.08, s: 0, r: 0.06 }); } },
    blast:   function (t) {                                // a charge on the far slope: the crack, then the boom rolling down the valley
      noiseHit(sfxBus, t, 0.08, { freq: 2200, ftype: 'highpass', gain: 0.05 });
      noiseHit(sfxBus, t + 0.05, 1.6, { freq: 120, ftype: 'lowpass', gain: 0.34, rev: 0.7 });
      voice(sfxBus, t + 0.05, 0.1, { type: 'sine', freq: 50, glide: 0.5, glideT: 0.4, gain: 0.2, a: 0.002, d: 0.4, s: 0, r: 0.2 });
      noiseHit(sfxBus, t + 0.9, 1.4, { freq: 90, ftype: 'lowpass', gain: 0.16, rev: 0.7 });
    },
    whistle: function (t) { [0, 0.32].forEach(function (d) { voice(sfxBus, t + d, 0.22, { type: 'sine', freq: 2300, gain: 0.03, a: 0.01, d: 0.2, s: 0.8, r: 0.05, vib: [28, 60] }); }); },
    splat:   function (t) { noiseHit(sfxBus, t, 0.12, { freq: 900, ftype: 'lowpass', gain: 0.18 }); },
    buzz:    function (t) { voice(sfxBus, t, 0.5, { type: 'square', freq: 60, gain: 0.03, a: 0.01, d: 0.3, s: 0.6, r: 0.1, cutoff: 700 }); noiseHit(sfxBus, t, 0.4, { freq: 3500, ftype: 'bandpass', q: 2, gain: 0.025 }); },
    crackle: function (t) {                                // static, and something like a voice under it
      for (var i = 0; i < 10; i++) noiseHit(sfxBus, t + Math.random() * 1.1, 0.03, { freq: 2000 + Math.random() * 3000, ftype: 'bandpass', q: 3, gain: 0.05 });
      voice(sfxBus, t + 0.2, 0.8, { type: 'sawtooth', freq: 160, glide: 1.3, glideT: 0.6, gain: 0.012, a: 0.05, d: 0.4, s: 0.6, r: 0.2, cutoff: 900, q: 6, vib: [7, 50] });
    }
  };

  function sfx(name) {
    if (!ac || ac.state !== 'running' || prefs.mode === 'off' || !SFX[name]) return;
    if (name === 'step') { var n = performance.now(); if (n - lastStep < 180) return; lastStep = n; }
    SFX[name](ac.currentTime + 0.005);
  }

  // ---- places ---------------------------------------------------------------------------------------
  var place = null;
  function setWorld(id, w) {
    placeId = id;
    place = themeFor(id, w);
    var t = tuneNow() || place;
    if (!ac) { wanted = t; return; }
    start(t.theme, t.amb);
  }

  // ---- the ♪ pill -------------------------------------------------------------------------------------
  var pill = null;
  var LABEL = { all: 'Sound on', sfx: 'Effects only', off: 'Sound off' };
  function cycle() {
    prefs.mode = prefs.mode === 'all' ? 'sfx' : prefs.mode === 'sfx' ? 'off' : 'all';
    savePrefs();
    unlock();
    applyLevels();
    paint();
    if (prefs.mode !== 'off') sfx('blip');
  }
  function paint() {
    if (!pill) return;
    pill.innerHTML = '<span class="ip-key">M</span><span class="sp-ico">' + (prefs.mode === 'all' ? '♫' : prefs.mode === 'sfx' ? '♪' : '×') + '</span>' + LABEL[prefs.mode];
    pill.classList.toggle('muted', prefs.mode === 'off');
  }
  function initPill() {
    pill = document.createElement('button');
    pill.id = 'sound-pill';
    pill.addEventListener('click', function (e) { e.stopPropagation(); cycle(); });
    document.body.appendChild(pill);
    paint();
    if (typeof BridgeState !== 'undefined' && BridgeState.onChange) {
      BridgeState.onChange(function (s) { pill.style.display = s === 'world' ? 'flex' : 'none'; });
      pill.style.display = BridgeState.getState && BridgeState.getState() === 'world' ? 'flex' : 'none';
    }
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'm' || e.key === 'M') && !/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) cycle();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPill); else initPill();

  // where the music is: the step it's on (16 to the bar, fractional), how long a step is, which song (js/dance.js keeps time by it)
  function clock() {
    if (!song || !ac || ac.state !== 'running') return null;
    return { name: song.name, step: song.step - (song.next - ac.currentTime) / song.spb, spb: song.spb,
             lat: (ac.outputLatency || 0) + (ac.baseLatency || 0), audible: prefs.mode === 'all' };
  }

  return { setWorld: setWorld, sfx: sfx, cycle: cycle, clock: clock, mode: function () { return prefs.mode; },
           _state: function () { return { ctx: ac && ac.state, song: song && song.name, mood: song && song.mood, bpm: song && Math.round(60 / song.spb / 4), cutoff: song && Math.round(song.lp.frequency.value), amb: ambKey, place: place }; },
           _level: function () {                    // peak and rms of what's playing (tests)
             if (!meter) return null;
             var a = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(a);
             var pk = 0, sq = 0; for (var i = 0; i < a.length; i++) { pk = Math.max(pk, Math.abs(a[i])); sq += a[i] * a[i]; }
             return { peak: pk, rms: Math.sqrt(sq / a.length) };
           } };
})();
