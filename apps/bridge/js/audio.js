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
 * the rain), its arcades (chiptune), its back rooms (lo-fi), Enigma (drones
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
    chipdrum: function (d, t, m, dur, v) { noiseHit(d, t, m ? 0.09 : 0.03, { freq: m ? 2500 : 9000, ftype: m ? 'bandpass' : 'highpass', gain: 0.05 * v }); }
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
    verdance: { bpm: 92, root: 55, mode: 'ionian', chords: [0, 3, 4, 0, 5, 3, 1, 4], swing: 0.2, pad: 'warm',
                arp: { inst: 'pluck', steps: [0, 3, 6, 8, 11, 14], oct: 12, pattern: [0, 1, 2, 1] }, bass: { inst: 'bass', steps: [0, 6, 8] },
                lead: { inst: 'flute', oct: 24, density: 0.5 }, perc: [['shaker', [2, 6, 10, 14]]] },
    // Club Void: four to the floor all the way through (drive), an off-beat bass, a bright arp
    club:     { bpm: 124, root: 45, mode: 'aeolian', chords: [0, 5, 3, 6], pad: 'pad', drive: true,
                arp: { inst: 'arp', steps: [0, 2, 4, 6, 8, 10, 12, 14], oct: 24, pattern: [0, 2, 1, 3] },
                bass: { inst: 'sub', steps: [2, 6, 10, 14] }, lead: { inst: 'lead', oct: 24, density: 0.28 },
                perc: [['kick', [0, 4, 8, 12]], ['snare', [4, 12]], ['hat', [2, 6, 10, 14]]] },
    ship:     { bpm: 66, root: 53, mode: 'lydian', chords: [0, 1, 5, 4], pad: 'warm',
                arp: { inst: 'box', steps: [0, 3, 6, 8, 11, 14], oct: 12 }, bass: { inst: 'bass', steps: [0], oct: -12 },
                lead: { inst: 'box', oct: 24, density: 0.25 } }
  };

  // ambience: which beds play under which places
  function themeFor(id, w) {
    id = id || '';
    var ts = (w && w.tileset) || '';
    var amb;
    if (/^(bridge|quarters|hangar|gameroom)$/.test(id)) return { theme: 'ship', amb: ['engine', 'creak'] };
    if (id === 'arcadia' || id === 'arcadia-lucky-7') return { theme: 'arcade', amb: ['crowd', 'bleeps'] };
    if (id === 'arcadia-club') return { theme: 'club', amb: ['crowd'] };
    if (/^arcadia-(street|skypad|alley)$/.test(id)) return { theme: 'arcadia', amb: ['rain', 'city'] };
    if (/^(arcadia|cyber|chrome|junk|tech|null)/.test(id)) return { theme: 'lofi', amb: ['rainsoft', 'hum'] };
    if (/^enigma/.test(id)) return { theme: 'enigma', amb: ['hum', 'beeps'] };
    if (/^singularity/.test(id)) return { theme: 'singularity', amb: ['rumble'] };
    if (id === 'verdance-home') return { theme: 'verdance', amb: ['fire', 'birds'] };
    if (/^verdance/.test(id)) return { theme: 'verdance', amb: ['breeze', 'birds'] };
    if (id === 'hoarfell-summit' || id === 'hoarfell-ridge' || id === 'hoarfell-icestep') return { theme: 'summit', amb: ['gale'] };
    if (id === 'hoarfell-hollow') return { theme: 'summit', amb: ['drips', 'chimes'] };
    if (id === 'hoarfell-park') return { theme: 'arcade', amb: ['snowwind'] };
    if (/^hoarfell/.test(id)) return { theme: 'hoarfell', amb: ['snowwind', 'chimes'] };
    if (/cave/.test(id) || ts === 'cave') return { theme: 'cave', amb: ['drips', 'rumble'] };
    if (/tower/.test(id) || ts === 'tower') return { theme: 'tower', amb: ['wind'] };
    if (/lighthouse|lamproom/.test(id)) return { theme: 'lumar-in', amb: ['wind', 'searoom'] };
    if (id === 'lumar-passage') return { theme: 'lumar', amb: ['sea', 'wind', 'creak'] };          // under sail in the sloop
    if (/^lumar/.test(id)) {
      var inside = w && w.scene && !w.scene.backdrop && !/^lumar(-square|-crimson|-rose|-sapphire|-midnight)?$/.test(id);
      if (inside) return { theme: 'lumar-in', amb: id === 'lumar-home' ? ['fire'] : ['fire', 'murmur'] };     // your own house is quiet
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
    var bus = ac.createGain();
    bus.gain.setValueAtTime(0.0001, ac.currentTime);
    bus.gain.linearRampToValueAtTime(1, ac.currentTime + 2.5);
    bus.connect(musicBus);
    var seed = 1;
    for (var i = 0; i < themeName.length; i++) seed = (seed * 31 + themeName.charCodeAt(i)) % 2147483647;
    song = { name: themeName, th: th, bus: bus, step: 0, next: ac.currentTime + 0.15, r: rng(seed + Math.floor(Date.now() / 600000)),
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
    while (song.next < ac.currentTime + 0.12) {
      playStep(song, song.step, song.next);
      var swing = song.th.swing && song.step % 2 === 0 ? song.th.swing : (song.th.swing ? -song.th.swing : 0);
      song.next += song.spb * (1 + swing);
      song.step++;
    }
  }

  function playStep(s, n, t) {
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
    if (th.bass && th.bass.steps.indexOf(st) >= 0 && (full || st === 0 || section === 3 || th.drive)) {
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
  var SFX = {
    blip:    function (t) { voice(sfxBus, t, 0.04, { type: 'square', freq: hz(84), gain: 0.05, a: 0.002, d: 0.05, s: 0.2, r: 0.04, cutoff: 3000 }); },
    click:   function (t) { voice(sfxBus, t, 0.01, { type: 'square', freq: hz(91), gain: 0.04, a: 0.001, d: 0.02, s: 0, r: 0.02, cutoff: 4000 }); },
    open:    function (t) { [79, 86].forEach(function (m, i) { voice(sfxBus, t + i * 0.05, 0.08, { type: 'sine', freq: hz(m), gain: 0.07, a: 0.003, d: 0.2, s: 0.2, r: 0.2, rev: 0.3 }); }); },
    close:   function (t) { [86, 79].forEach(function (m, i) { voice(sfxBus, t + i * 0.05, 0.06, { type: 'sine', freq: hz(m), gain: 0.05, a: 0.003, d: 0.15, s: 0.1, r: 0.15 }); }); },
    door:    function (t) { noiseHit(sfxBus, t, 0.45, { freq: 700, ftype: 'bandpass', q: 0.8, gain: 0.12, rev: 0.3 }); voice(sfxBus, t, 0.1, { type: 'sine', freq: 90, glide: 1.4, gain: 0.08, a: 0.01, d: 0.2, s: 0, r: 0.2 }); },
    coin:    function (t) { voice(sfxBus, t, 0.05, { type: 'square', freq: hz(88), gain: 0.05, a: 0.001, d: 0.06, s: 0.3, r: 0.05, cutoff: 5000 }); voice(sfxBus, t + 0.07, 0.18, { type: 'square', freq: hz(95), gain: 0.05, a: 0.001, d: 0.2, s: 0.3, r: 0.2, cutoff: 5000, rev: 0.2 }); },
    clue:    function (t) { [72, 76, 79, 84].forEach(function (m, i) { INST.bell(sfxBus, t + i * 0.09, m, 0.3, 1.3); }); },
    quest:   function (t) { [60, 64, 67, 72, 76, 79, 84].forEach(function (m, i) { INST.bell(sfxBus, t + i * 0.08, m, 0.4, 1.2); }); INST.warm(sfxBus, t, 48, 1.4, 2); INST.warm(sfxBus, t, 55, 1.4, 2); },
    pickup:  function (t) { [76, 83, 88].forEach(function (m, i) { voice(sfxBus, t + i * 0.045, 0.05, { type: 'triangle', freq: hz(m), gain: 0.07, a: 0.002, d: 0.08, s: 0.2, r: 0.08 }); }); },
    step:    function (t) { noiseHit(sfxBus, t, 0.05, { freq: 420 + Math.random() * 200, ftype: 'bandpass', q: 1.2, gain: 0.035 }); },
    sit:     function (t) { noiseHit(sfxBus, t, 0.18, { freq: 300, ftype: 'lowpass', gain: 0.12 }); },
    sleep:   function (t) { [79, 76, 72, 67].forEach(function (m, i) { INST.box(sfxBus, t + i * 0.32, m - 12, 0.3, 1); }); },
    splash:  function (t) { noiseHit(sfxBus, t, 0.5, { freq: 1200, ftype: 'lowpass', gain: 0.18, rev: 0.3 }); },
    plop:    function (t) { voice(sfxBus, t, 0.05, { type: 'sine', freq: 300, glide: 2.4, glideT: 0.08, gain: 0.14, a: 0.002, d: 0.12, s: 0, r: 0.1, rev: 0.3 }); },
    catch:   function (t) { [67, 71, 74, 79].forEach(function (m, i) { INST.pluck(sfxBus, t + i * 0.07, m, 0.2, 1.4); }); },
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
    error:   function (t) { voice(sfxBus, t, 0.12, { type: 'square', freq: 140, gain: 0.04, a: 0.002, d: 0.1, s: 0.6, r: 0.05, cutoff: 900 }); }
  };

  function sfx(name) {
    if (!ac || ac.state !== 'running' || prefs.mode === 'off' || !SFX[name]) return;
    if (name === 'step') { var n = performance.now(); if (n - lastStep < 180) return; lastStep = n; }
    SFX[name](ac.currentTime + 0.005);
  }

  // ---- places ---------------------------------------------------------------------------------------
  var place = null;
  function setWorld(id, w) {
    place = themeFor(id, w);
    if (!ac) { wanted = place; return; }
    start(place.theme, place.amb);
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
           _state: function () { return { ctx: ac && ac.state, song: song && song.name, amb: ambKey, place: place }; },
           _level: function () {                    // peak and rms of what's playing (tests)
             if (!meter) return null;
             var a = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(a);
             var pk = 0, sq = 0; for (var i = 0; i < a.length; i++) { pk = Math.max(pk, Math.abs(a[i])); sq += a[i] * a[i]; }
             return { peak: pk, rms: Math.sqrt(sq / a.length) };
           } };
})();
