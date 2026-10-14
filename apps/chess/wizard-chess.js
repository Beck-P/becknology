/**
 * Wizard Chess 3D — Blender-Sculpted Battle Chess & Stockfish UCI Edition
 *
 * - Loads Blender-sculpted 3D warrior statues (`/chess/assets/wizard-pieces.glb`)
 *   with articulated `body`, `head`, `weapon`, `shield`, and `gem` sub-meshes.
 * - Piece-specific choreographed combat duels (Pawn Shield-Bash & Thrust,
 *   Knight Rearing Cavalry Leap, Rook Seismic Ground-Pound, Bishop Sky-Pillar
 *   Smite, Queen Telekinetic Levitation & Vortex Crush, King Execution Cleave).
 * - Real sub-mesh dismemberment (flying helmets, shields, swords) + rigid-body
 *   stone shatter physics.
 * - Real Stockfish UCI Web Worker engine with 6 ELO difficulty tiers, live
 *   evaluation bar, and full Post-Game / Mid-Game Review Mode with 3D Best-Move
 *   arrows, accuracy %, and move classifications.
 */
import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.0.0-beta.6/+esm";
import * as THREE from "https://esm.sh/three@0.160.0";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

const SQUARE_SIZE = 1.15;
const BOARD_OFFSET = (7 * SQUARE_SIZE) / 2;

export const DIFFICULTY_TIERS = {
  1: { name: "Novice", elo: 800, skill: 0, depth: 2, movetime: 180, noise: 95, reward: 50, capReward: 3 },
  2: { name: "Apprentice", elo: 1100, skill: 3, depth: 4, movetime: 280, noise: 40, reward: 150, capReward: 5 },
  3: { name: "Battlemage", elo: 1450, skill: 7, depth: 7, movetime: 420, noise: 12, reward: 400, capReward: 8 },
  4: { name: "Archmage", elo: 1800, skill: 12, depth: 10, movetime: 650, noise: 0, reward: 1000, capReward: 15 },
  5: { name: "Grandmaster", elo: 2200, skill: 16, depth: 13, movetime: 900, noise: 0, reward: 2500, capReward: 25 },
  6: { name: "Supreme Oracle", elo: 2600, skill: 20, depth: 16, movetime: 1250, noise: 0, reward: 5000, capReward: 50 }
};

// Piece values & piece-square positional tables (used for fast local eval & fallback)
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PST = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
  ],
  r: [
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  0,  0,  0
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
  ]
};

// ---------- Stockfish UCI Web Worker Wrapper ----------
class StockfishOracle {
  constructor(onStatusChange) {
    this.worker = null;
    this.ready = false;
    this.pendingResolve = null;
    this.lastEvalCp = 0; // from side-to-move's perspective
    this.lastMate = null;
    this.lastPv = "";
    this.onStatusChange = onStatusChange;
    this.initWorker();
  }

  initWorker() {
    try {
      const workerBootstrap = `
        var sfUrls = [
          "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js",
          "https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js"
        ];
        var loaded = false;
        for (var i = 0; i < sfUrls.length; i++) {
          try {
            importScripts(sfUrls[i]);
            loaded = true;
            break;
          } catch (e) {}
        }
      `;
      const blob = new Blob([workerBootstrap], { type: "application/javascript" });
      this.worker = new Worker(URL.createObjectURL(blob));

      this.worker.onmessage = (e) => {
        const line = typeof e.data === "string" ? e.data.trim() : "";
        if (!line) return;

        if (line === "uciok") {
          this.ready = true;
          this.worker.postMessage("isready");
          if (this.onStatusChange) this.onStatusChange(true);
        } else if (line.startsWith("info ") && line.includes(" score ")) {
          const cpMatch = line.match(/score cp (-?\d+)/);
          const mateMatch = line.match(/score mate (-?\d+)/);
          const pvMatch = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
          if (cpMatch) {
            this.lastEvalCp = parseInt(cpMatch[1], 10);
            this.lastMate = null;
          } else if (mateMatch) {
            this.lastMate = parseInt(mateMatch[1], 10);
            this.lastEvalCp = this.lastMate > 0 ? 9900 : -9900;
          }
          if (pvMatch) {
            this.lastPv = pvMatch[1];
          }
        } else if (line.startsWith("bestmove ")) {
          const parts = line.split(/\s+/);
          const bestUci = parts[1];
          if (this.pendingResolve) {
            const res = this.pendingResolve;
            this.pendingResolve = null;
            res({
              bestMoveUci: bestUci && bestUci !== "(none)" ? bestUci : null,
              scoreCp: this.lastEvalCp,
              mate: this.lastMate,
              pv: this.lastPv || bestUci
            });
          }
        }
      };

      this.worker.onerror = () => {
        this.ready = false;
        if (this.onStatusChange) this.onStatusChange(false);
      };

      this.worker.postMessage("uci");
    } catch {
      this.ready = false;
      if (this.onStatusChange) this.onStatusChange(false);
    }
  }

  queryPosition(fen, { skill = 20, depth = 12, movetime = 450 } = {}) {
    if (!this.ready || !this.worker) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      // Cancel any in-flight search
      if (this.pendingResolve) {
        this.worker.postMessage("stop");
        this.pendingResolve(null);
      }
      this.lastEvalCp = 0;
      this.lastMate = null;
      this.lastPv = "";

      const timeoutId = setTimeout(() => {
        if (this.pendingResolve) {
          this.pendingResolve = null;
          resolve(null);
        }
      }, movetime + 1800);

      this.pendingResolve = (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      };

      this.worker.postMessage(`setoption name Skill Level value ${skill}`);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth} movetime ${movetime}`);
    });
  }
}

// ---------- Procedural Web Audio Synthesizer ----------
class WizardAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  ensureCtx() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playSlide() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.28);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(140, now);
    filter.frequency.linearRampToValueAtTime(95, now + 0.28);
    filter.Q.value = 3.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  playClash() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Metallic sword/shield clang
    [820, 1340, 2120].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.72, now + 0.22);
      gain.gain.setValueAtTime(0.14 / (i + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
    });
  }

  playWarhorseCharge() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Deep hoof-beats + brazen horn swell
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(146.8, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.28);
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.44);
  }

  playSpellCharge() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.35);
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.39);
  }

  playShatter() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const subGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.35);
    subGain.gain.setValueAtTime(0.45, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(subGain);
    subGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.37);

    for (let c = 0; c < 6; c++) {
      const delay = c * 0.045 + Math.random() * 0.03;
      const dur = 0.09 + Math.random() * 0.08;
      const bufLen = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.8);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 500 + Math.random() * 1600;
      bp.Q.value = 2.0;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.24 * Math.pow(0.82, c), now + delay);
      g.gain.exponentialRampToValueAtTime(0.005, now + delay + dur);

      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      src.start(now + delay);
    }
  }

  playCheck() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      g.gain.setValueAtTime(0.14, now + idx * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.36);
    });
  }
}

// ---------- Procedural Stone Texture Generator ----------
function createStoneTextures() {
  const size = 256;
  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext("2d");

  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 3.5;
    const v = Math.floor(105 + (Math.random() - 0.5) * 90);
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.fillRect(x, y, r, r);
  }
  bctx.strokeStyle = "rgba(45,45,45,0.35)";
  bctx.lineWidth = 1.2;
  for (let c = 0; c < 18; c++) {
    bctx.beginPath();
    let cx = Math.random() * size;
    let cy = Math.random() * size;
    bctx.moveTo(cx, cy);
    for (let s = 0; s < 5; s++) {
      cx += (Math.random() - 0.5) * 28;
      cy += (Math.random() - 0.5) * 28;
      bctx.lineTo(cx, cy);
    }
    bctx.stroke();
  }

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(2, 2);

  // Procedural equirectangular environment reflection map (hearthfire + vaulted library skylight)
  const envCanvas = document.createElement("canvas");
  envCanvas.width = 256;
  envCanvas.height = 128;
  const ectx = envCanvas.getContext("2d");
  const grad = ectx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0.0, "#1c2c4c");
  grad.addColorStop(0.38, "#3a2418");
  grad.addColorStop(0.52, "#d88a3c");
  grad.addColorStop(0.75, "#26120b");
  grad.addColorStop(1.0, "#0b0504");
  ectx.fillStyle = grad;
  ectx.fillRect(0, 0, 256, 128);
  // Bright hearth specular hotspots for metallic armor & gold crowns
  [
    [48, 56, 26, "rgba(255, 220, 150, 0.85)"],
    [128, 42, 34, "rgba(255, 240, 200, 0.90)"],
    [208, 58, 28, "rgba(255, 180, 95, 0.80)"]
  ].forEach(([hx, hy, hr, col]) => {
    const rg = ectx.createRadialGradient(hx, hy, 1, hx, hy, hr);
    rg.addColorStop(0, col);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ectx.fillStyle = rg;
    ectx.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
  });
  const envTex = new THREE.CanvasTexture(envCanvas);
  envTex.mapping = THREE.EquirectangularReflectionMapping;

  return { bumpTex, envTex };
}

// ---------- Coordinate Helpers ----------
function squareToWorld(sq) {
  const file = sq.charCodeAt(0) - 97; // 0..7 (a..h)
  const rank = parseInt(sq[1], 10) - 1; // 0..7 (1..8)
  return {
    x: file * SQUARE_SIZE - BOARD_OFFSET,
    z: (7 - rank) * SQUARE_SIZE - BOARD_OFFSET,
    file,
    rank
  };
}

function coordsToSquare(file, rank) {
  return String.fromCharCode(97 + file) + (rank + 1);
}

// Convert centipawns to win probability (0..100) for CAPS-style accuracy calculation
function cpToWinPercent(cp) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

// ---------- Main WizardChess3D Controller ----------
export class WizardChess3D {
  constructor(containerEl, callbacks = {}) {
    this.container = containerEl;
    this.callbacks = callbacks;
    this.chess = new Chess();
    this.audio = new WizardAudio();

    this.mode = "ai"; // 'ai' | '2p'
    this.aiDifficulty = 3; // 1..6 (default 3 = Battlemage ~1450 ELO)
    this.playerColor = "w"; // 'w' | 'b'
    this.battleCamEnabled = true;

    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.animating = false;
    this.reviewMode = false;
    this.disposed = false;
    this.activeTab = true;

    this.pieceMeshes = new Map(); // square -> THREE.Group
    this.squareMeshes = new Map(); // square -> THREE.Mesh
    this.blenderTemplates = new Map(); // 'p'|'r'|'n'|'b'|'q'|'k' -> THREE.Object3D
    this.markerMeshes = [];
    this.reviewArrowMeshes = [];
    this.shards = []; // active rigid-body stone & armor fragments
    this.particles = []; // active spell/dust/shockwave particles
    this.braziers = [];
    this.capturedCounts = { w: [], b: [] };
    this.cameraShake = 0;
    this.savedCameraState = null;
    this.cameraTween = null;

    // Recorded timeline for Game Review (index 0 = initial position, 1..N = after each ply)
    this.timeline = [
      {
        ply: 0,
        fen: this.chess.fen(),
        san: "Start",
        uci: null,
        color: null,
        evalCpWhite: 20,
        bestMoveUci: null,
        classification: null
      }
    ];

    this.stockfish = new StockfishOracle((isReady) => {
      if (this.callbacks.onEngineStatus) {
        this.callbacks.onEngineStatus(isReady);
      }
    });

    this.initScene();
    this.buildBoard();
    this.syncPiecesFromBoard();
    this.loadBlenderPieces();
    this.bindEvents();
    this.animate();
  }

  initScene() {
    const w = this.container.clientWidth || 680;
    const h = this.container.clientHeight || 540;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x120906, 0.028);

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    this.camera.position.set(0, 8.6, 9.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.24;

    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 0.4, 0);
    this.controls.minDistance = 4.2;
    this.controls.maxDistance = 18.5;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.minPolarAngle = 0.15;

    const ambient = new THREE.AmbientLight(0x5c402e, 1.55);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffe6c2, 2.15);
    keyLight.position.set(5.5, 13.5, 6.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 28;
    const d = 6.8;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x78a4ff, 1.05);
    rimLight.position.set(-7, 8, -8);
    this.scene.add(rimLight);

    const { bumpTex, envTex } = createStoneTextures();
    this.scene.environment = envTex;

    this.materials = {
      whitePiece: new THREE.MeshStandardMaterial({
        color: 0xf3e8d2,
        roughness: 0.36,
        metalness: 0.1,
        bumpMap: bumpTex,
        bumpScale: 0.026
      }),
      whiteCloth: new THREE.MeshStandardMaterial({
        color: 0x1e4ea8,
        roughness: 0.58,
        metalness: 0.12,
        bumpMap: bumpTex,
        bumpScale: 0.015
      }),
      whiteAccent: new THREE.MeshStandardMaterial({
        color: 0xf0b848,
        roughness: 0.2,
        metalness: 0.88
      }),
      whiteMetal: new THREE.MeshStandardMaterial({
        color: 0xe6eef8,
        roughness: 0.16,
        metalness: 0.92
      }),
      whiteCore: new THREE.MeshStandardMaterial({
        color: 0x58e4ff,
        emissive: 0x18b8ff,
        emissiveIntensity: 2.0,
        roughness: 0.15
      }),
      blackPiece: new THREE.MeshStandardMaterial({
        color: 0x1d1822,
        roughness: 0.3,
        metalness: 0.28,
        bumpMap: bumpTex,
        bumpScale: 0.032
      }),
      blackCloth: new THREE.MeshStandardMaterial({
        color: 0x821628,
        roughness: 0.55,
        metalness: 0.15,
        bumpMap: bumpTex,
        bumpScale: 0.015
      }),
      blackAccent: new THREE.MeshStandardMaterial({
        color: 0xd47e42,
        roughness: 0.22,
        metalness: 0.85
      }),
      blackMetal: new THREE.MeshStandardMaterial({
        color: 0x4a4e5e,
        roughness: 0.19,
        metalness: 0.9
      }),
      blackCore: new THREE.MeshStandardMaterial({
        color: 0xff6838,
        emissive: 0xff3010,
        emissiveIntensity: 2.1,
        roughness: 0.15
      }),
      // Per-archetype signature emissive cores so classes are visually distinct at a glance
      cores: {
        w: {
          p: new THREE.MeshStandardMaterial({ color: 0x68e4ff, emissive: 0x20a8ff, emissiveIntensity: 1.9 }),
          r: new THREE.MeshStandardMaterial({ color: 0xffb848, emissive: 0xff7818, emissiveIntensity: 2.2 }),
          n: new THREE.MeshStandardMaterial({ color: 0x48f5a8, emissive: 0x14d478, emissiveIntensity: 2.0 }),
          b: new THREE.MeshStandardMaterial({ color: 0x70d8ff, emissive: 0x3898ff, emissiveIntensity: 2.3 }),
          q: new THREE.MeshStandardMaterial({ color: 0xffe878, emissive: 0xffb824, emissiveIntensity: 2.4 }),
          k: new THREE.MeshStandardMaterial({ color: 0xffdf68, emissive: 0xff9810, emissiveIntensity: 2.5 })
        },
        b: {
          p: new THREE.MeshStandardMaterial({ color: 0xff6840, emissive: 0xff2810, emissiveIntensity: 1.9 }),
          r: new THREE.MeshStandardMaterial({ color: 0xff5218, emissive: 0xe82000, emissiveIntensity: 2.3 }),
          n: new THREE.MeshStandardMaterial({ color: 0xc868ff, emissive: 0x9828ff, emissiveIntensity: 2.1 }),
          b: new THREE.MeshStandardMaterial({ color: 0xe068ff, emissive: 0xb424ff, emissiveIntensity: 2.3 }),
          q: new THREE.MeshStandardMaterial({ color: 0xff4888, emissive: 0xff1458, emissiveIntensity: 2.4 }),
          k: new THREE.MeshStandardMaterial({ color: 0xff3838, emissive: 0xff0818, emissiveIntensity: 2.5 })
        }
      },
      lightSquare: new THREE.MeshStandardMaterial({
        color: 0xc9a679,
        roughness: 0.55,
        metalness: 0.06,
        bumpMap: bumpTex,
        bumpScale: 0.02
      }),
      darkSquare: new THREE.MeshStandardMaterial({
        color: 0x3b261c,
        roughness: 0.48,
        metalness: 0.1,
        bumpMap: bumpTex,
        bumpScale: 0.025
      }),
      boardFrame: new THREE.MeshStandardMaterial({
        color: 0x22120b,
        roughness: 0.6,
        metalness: 0.15,
        bumpMap: bumpTex,
        bumpScale: 0.03
      }),
      brassTrim: new THREE.MeshStandardMaterial({
        color: 0xb87d38,
        roughness: 0.3,
        metalness: 0.8
      })
    };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  loadBlenderPieces() {
    const loader = new GLTFLoader();
    loader.load(
      "/chess/assets/wizard-pieces.glb",
      (gltf) => {
        const nameToType = {
          piece_pawn: "p",
          piece_rook: "r",
          piece_knight: "n",
          piece_bishop: "b",
          piece_queen: "q",
          piece_king: "k"
        };
        gltf.scene.traverse((obj) => {
          if (nameToType[obj.name]) {
            this.blenderTemplates.set(nameToType[obj.name], obj);
          }
        });
        if (this.blenderTemplates.size > 0 && !this.animating) {
          this.syncPiecesFromBoard();
        }
      },
      undefined,
      () => {
        // Fallback procedural sculpts remain active if GLB fails to load
      }
    );
  }

  buildBoard() {
    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);

    const totalSpan = SQUARE_SIZE * 8;
    const frameGeo = new THREE.BoxGeometry(totalSpan + 1.35, 0.55, totalSpan + 1.35);
    const frameMesh = new THREE.Mesh(frameGeo, this.materials.boardFrame);
    frameMesh.position.y = -0.32;
    frameMesh.receiveShadow = true;
    this.boardGroup.add(frameMesh);

    const bezelGeo = new THREE.BoxGeometry(totalSpan + 0.28, 0.42, totalSpan + 0.28);
    const bezelMesh = new THREE.Mesh(bezelGeo, this.materials.brassTrim);
    bezelMesh.position.y = -0.22;
    bezelMesh.receiveShadow = true;
    this.boardGroup.add(bezelMesh);

    const sqGeo = new THREE.BoxGeometry(SQUARE_SIZE * 0.985, 0.16, SQUARE_SIZE * 0.985);
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const isLight = (file + rank) % 2 === 1;
        const sqName = coordsToSquare(file, rank);
        const pos = squareToWorld(sqName);
        const mesh = new THREE.Mesh(
          sqGeo,
          isLight ? this.materials.lightSquare : this.materials.darkSquare
        );
        mesh.position.set(pos.x, -0.08, pos.z);
        mesh.receiveShadow = true;
        mesh.userData = { square: sqName, isSquare: true };
        this.boardGroup.add(mesh);
        this.squareMeshes.set(sqName, mesh);
      }
    }

    const cornerOffset = totalSpan / 2 + 0.45;
    const corners = [
      [-cornerOffset, -cornerOffset],
      [cornerOffset, -cornerOffset],
      [-cornerOffset, cornerOffset],
      [cornerOffset, cornerOffset]
    ];
    corners.forEach(([cx, cz], idx) => {
      const brazier = new THREE.Group();
      brazier.position.set(cx, 0, cz);

      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.32, 0.36, 8),
        this.materials.brassTrim
      );
      ped.position.y = 0.14;
      ped.castShadow = true;
      brazier.add(ped);

      const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.16, 0.2, 8),
        this.materials.boardFrame
      );
      bowl.position.y = 0.38;
      brazier.add(bowl);

      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xffaa44,
        transparent: true,
        opacity: 0.9
      });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 7), flameMat);
      flame.position.y = 0.6;
      brazier.add(flame);

      const light = new THREE.PointLight(0xff8c38, 1.35, 9.5, 1.6);
      light.position.set(0, 0.75, 0);
      brazier.add(light);

      this.boardGroup.add(brazier);
      this.braziers.push({ group: brazier, flame, light, phase: idx * 1.7 });
    });

    this.markerGroup = new THREE.Group();
    this.scene.add(this.markerGroup);

    this.reviewArrowGroup = new THREE.Group();
    this.scene.add(this.reviewArrowGroup);
  }

  // ---------- Build Piece from Blender GLB Archetype (or Procedural Fallback) ----------
  buildWizardPieceMesh(type, color) {
    const isWhite = color === "w";
    const stoneMat = isWhite ? this.materials.whitePiece : this.materials.blackPiece;
    const clothMat = isWhite ? this.materials.whiteCloth : this.materials.blackCloth;
    const accentMat = isWhite ? this.materials.whiteAccent : this.materials.blackAccent;
    const metalMat = isWhite ? this.materials.whiteMetal : this.materials.blackMetal;
    const eyeMat =
      (this.materials.cores &&
        this.materials.cores[color] &&
        this.materials.cores[color][type]) ||
      (isWhite ? this.materials.whiteCore : this.materials.blackCore);

    const template = this.blenderTemplates.get(type);
    if (template) {
      const root = new THREE.Group();
      const body = new THREE.Group();
      // Rotate inner orient group by Math.PI so Blender's +Y forward (glTF -Z) aligns with +Z forward
      const orient = new THREE.Group();
      orient.rotation.y = Math.PI;
      body.add(orient);
      root.add(body);

      let weaponPivot = null;
      let shieldPivot = null;
      let headPivot = null;
      let wingsMesh = null;
      let astrolabeMesh = null;

      const clone = template.clone(true);
      const children = [...clone.children];

      for (const child of children) {
        const n = child.name.toLowerCase();
        child.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            const matName = node.material ? node.material.name.toLowerCase() : "";
            const nodeName = node.name.toLowerCase();
            if (matName.includes("gem") || nodeName.includes("gem") || n.includes("bishop_shield") || n.includes("queen_shield")) {
              node.material = eyeMat;
            } else if (matName.includes("cloth") || nodeName.includes("cloth") || n === "bishop_body") {
              node.material = clothMat;
            } else if (
              matName.includes("metal") ||
              nodeName.includes("metal") ||
              nodeName.includes("weapon") ||
              n === "pawn_head" ||
              n === "knight_head"
            ) {
              node.material = metalMat;
            } else if (
              matName.includes("trim") ||
              nodeName.includes("trim") ||
              nodeName.includes("shield") ||
              nodeName.includes("wings") ||
              n === "rook_head" ||
              n === "queen_head" ||
              n === "king_head" ||
              n === "bishop_weapon" ||
              n === "queen_weapon"
            ) {
              node.material = accentMat;
            } else {
              node.material = stoneMat;
            }
          }
        });

        if (n.endsWith("_base") || n.endsWith("_base_trim")) {
          child.rotation.y += Math.PI;
          root.add(child);
        } else if (n.endsWith("_weapon")) {
          weaponPivot = new THREE.Group();
          weaponPivot.position.copy(child.position);
          child.position.set(0, 0, 0);
          weaponPivot.add(child);
          orient.add(weaponPivot);
        } else if (n.endsWith("_shield")) {
          shieldPivot = new THREE.Group();
          shieldPivot.position.copy(child.position);
          child.position.set(0, 0, 0);
          shieldPivot.add(child);
          orient.add(shieldPivot);
        } else if (n.endsWith("_head")) {
          headPivot = new THREE.Group();
          headPivot.position.copy(child.position);
          child.position.set(0, 0, 0);
          headPivot.add(child);
          orient.add(headPivot);
        } else if (n.endsWith("_wings")) {
          wingsMesh = child;
          orient.add(child);
        } else if (n === "bishop_trim") {
          astrolabeMesh = child;
          orient.add(child);
        } else {
          orient.add(child);
        }
      }

      // Add subtle class-specific glowing rune geometry at the base for instant visual recognition
      if (type !== "p") {
        const segMap = { r: 4, n: 3, b: 6, q: 8, k: 16 };
        const radMap = { r: 0.44, n: 0.41, b: 0.4, q: 0.45, k: 0.48 };
        const sigilGeo = new THREE.RingGeometry(
          (radMap[type] || 0.42) - 0.045,
          radMap[type] || 0.42,
          segMap[type] || 12
        );
        const sigilMesh = new THREE.Mesh(sigilGeo, eyeMat);
        sigilMesh.rotation.x = -Math.PI / 2;
        sigilMesh.position.y = 0.015;
        root.add(sigilMesh);
      }

      root.rotation.y = isWhite ? Math.PI : 0;
      root.userData = {
        type,
        color,
        body,
        weaponPivot,
        shieldPivot,
        headPivot,
        wingsMesh,
        astrolabeMesh,
        seed: Math.random() * Math.PI * 2
      };
      return root;
    }

    // Procedural fallback while GLB loads
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.14, 14), stoneMat);
    base1.position.y = 0.07;
    base1.castShadow = true;
    root.add(base1);
    const colMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.75, 12), stoneMat);
    colMesh.position.y = 0.5;
    colMesh.castShadow = true;
    body.add(colMesh);
    const weaponPivot = new THREE.Group();
    body.add(weaponPivot);
    root.rotation.y = isWhite ? Math.PI : 0;
    root.userData = {
      type,
      color,
      body,
      weaponPivot,
      shieldPivot: null,
      headPivot: null,
      seed: Math.random() * Math.PI * 2
    };
    return root;
  }

  syncPiecesFromBoard() {
    for (const [, mesh] of this.pieceMeshes) {
      this.scene.remove(mesh);
    }
    this.pieceMeshes.clear();

    const boardState = this.chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = boardState[r][f];
        if (!cell) continue;
        const mesh = this.buildWizardPieceMesh(cell.type, cell.color);
        const pos = squareToWorld(cell.square);
        mesh.position.set(pos.x, 0, pos.z);
        mesh.userData.square = cell.square;
        this.scene.add(mesh);
        this.pieceMeshes.set(cell.square, mesh);
      }
    }
  }

  // ---------- Selection & Legal Move Markers ----------
  clearMarkers() {
    for (const m of this.markerMeshes) {
      this.markerGroup.remove(m);
    }
    this.markerMeshes.length = 0;
  }

  clearReviewArrows() {
    for (const m of this.reviewArrowMeshes) {
      this.reviewArrowGroup.remove(m);
    }
    this.reviewArrowMeshes.length = 0;
  }

  showReviewArrows(playedUci, bestUci, classification) {
    this.clearReviewArrows();
    if (bestUci && bestUci.length >= 4 && bestUci !== playedUci) {
      const fromSq = bestUci.slice(0, 2);
      const toSq = bestUci.slice(2, 4);
      const arrow = this.createBoardArrow(fromSq, toSq, 0x38e878, 0.11);
      this.reviewArrowGroup.add(arrow);
      this.reviewArrowMeshes.push(arrow);
    }
    if (playedUci && playedUci.length >= 4) {
      const fromSq = playedUci.slice(0, 2);
      const toSq = playedUci.slice(2, 4);
      const colorMap = {
        brilliant: 0x26c6da,
        best: 0x66bb6a,
        good: 0x9ccc65,
        inaccuracy: 0xffca28,
        mistake: 0xff7043,
        blunder: 0xef5350
      };
      const col = colorMap[classification] || 0xb388ff;
      const arrow = this.createBoardArrow(fromSq, toSq, col, 0.06);
      this.reviewArrowGroup.add(arrow);
      this.reviewArrowMeshes.push(arrow);
    }
  }

  createBoardArrow(fromSq, toSq, hexColor, yHeight = 0.08) {
    const p0 = squareToWorld(fromSq);
    const p1 = squareToWorld(toSq);
    const group = new THREE.Group();

    const dx = p1.x - p0.x;
    const dz = p1.z - p0.z;
    const totalLen = Math.hypot(dx, dz) || 0.01;
    const headLen = Math.min(0.38, totalLen * 0.35);
    const shaftLen = Math.max(0.05, totalLen - headLen);

    const mat = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.86,
      side: THREE.DoubleSide
    });

    const shaftGeo = new THREE.BoxGeometry(0.14, 0.03, shaftLen);
    shaftGeo.translate(0, 0, shaftLen / 2);
    const shaft = new THREE.Mesh(shaftGeo, mat);

    const headGeo = new THREE.ConeGeometry(0.26, headLen, 4);
    headGeo.rotateY(Math.PI / 4);
    headGeo.rotateX(Math.PI / 2);
    headGeo.translate(0, 0, shaftLen + headLen / 2);
    const head = new THREE.Mesh(headGeo, mat);

    group.add(shaft);
    group.add(head);
    group.position.set(p0.x, yHeight, p0.z);
    group.rotation.y = Math.atan2(dx, dz);
    return group;
  }

  showMarkersForSquare(sq) {
    this.clearMarkers();
    if (!sq) return;

    const originPos = squareToWorld(sq);
    const selGeo = new THREE.RingGeometry(0.38, 0.48, 24);
    const selMat = new THREE.MeshBasicMaterial({
      color: 0xffd57a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88
    });
    const selRing = new THREE.Mesh(selGeo, selMat);
    selRing.rotation.x = -Math.PI / 2;
    selRing.position.set(originPos.x, 0.02, originPos.z);
    this.markerGroup.add(selRing);
    this.markerMeshes.push(selRing);

    for (const mv of this.legalMovesForSelected) {
      const targetPos = squareToWorld(mv.to);
      const isCapture = mv.flags.includes("c") || mv.flags.includes("e");

      if (isCapture) {
        const capGeo = new THREE.RingGeometry(0.39, 0.51, 6);
        const capMat = new THREE.MeshBasicMaterial({
          color: 0xff4d3d,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.92
        });
        const capRing = new THREE.Mesh(capGeo, capMat);
        capRing.rotation.x = -Math.PI / 2;
        capRing.position.set(targetPos.x, 0.025, targetPos.z);
        capRing.userData = { targetSquare: mv.to, isCaptureRing: true };
        this.markerGroup.add(capRing);
        this.markerMeshes.push(capRing);
      } else {
        const dotGeo = new THREE.CircleGeometry(0.18, 16);
        const dotMat = new THREE.MeshBasicMaterial({
          color: 0x88d47e,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.78
        });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(targetPos.x, 0.02, targetPos.z);
        dot.userData = { targetSquare: mv.to };
        this.markerGroup.add(dot);
        this.markerMeshes.push(dot);
      }
    }
  }

  // ---------- Input & Raycasting ----------
  bindEvents() {
    this.onPointerDown = (e) => {
      if (this.animating || !this.activeTab || this.reviewMode) return;
      if (this.chess.isGameOver()) return;
      if (this.mode === "ai" && this.chess.turn() !== this.playerColor) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      const squareObjs = Array.from(this.squareMeshes.values());
      const pieceObjs = Array.from(this.pieceMeshes.values());
      const hits = this.raycaster.intersectObjects([...pieceObjs, ...squareObjs], true);
      if (hits.length === 0) return;

      let clickedSquare = null;
      let node = hits[0].object;
      while (node) {
        if (node.userData && node.userData.square) {
          clickedSquare = node.userData.square;
          break;
        }
        node = node.parent;
      }
      if (!clickedSquare) return;

      this.handleSquareClick(clickedSquare);
    };

    this.onResize = () => {
      if (this.disposed || !this.container) return;
      const w = this.container.clientWidth || 680;
      const h = this.container.clientHeight || 540;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("resize", this.onResize);
  }

  handleSquareClick(sq) {
    if (this.selectedSquare) {
      const matchingMoves = this.legalMovesForSelected.filter((m) => m.to === sq);
      if (matchingMoves.length > 0) {
        if (this.callbacks.onBattleStart) this.callbacks.onBattleStart();
        const isPromotion = matchingMoves.some((m) => m.flags.includes("p"));
        if (isPromotion && this.callbacks.onPromotionPrompt) {
          this.callbacks.onPromotionPrompt((promoPiece) => {
            const chosen =
              matchingMoves.find((m) => m.promotion === promoPiece) || matchingMoves[0];
            this.executeMove(chosen);
          });
        } else {
          const chosen = matchingMoves.find((m) => m.promotion === "q") || matchingMoves[0];
          this.executeMove(chosen);
        }
        return;
      }
    }

    const pieceOnSq = this.chess.get(sq);
    if (pieceOnSq && pieceOnSq.color === this.chess.turn()) {
      if (this.callbacks.onBattleStart) this.callbacks.onBattleStart();
      this.selectedSquare = sq;
      this.legalMovesForSelected = this.chess.moves({ square: sq, verbose: true });
      this.showMarkersForSquare(sq);
    } else {
      this.selectedSquare = null;
      this.legalMovesForSelected = [];
      this.clearMarkers();
    }
  }

  // ---------- Choreographed Move + Piece-Specific Battle Chess Duels ----------
  async executeMove(moveObj) {
    this.animating = true;
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.clearMarkers();
    this.clearReviewArrows();

    const fromSq = moveObj.from;
    const toSq = moveObj.to;
    const attackerMesh = this.pieceMeshes.get(fromSq);

    const isEnPassant = moveObj.flags.includes("e");
    const victimSq = isEnPassant ? toSq[0] + fromSq[1] : toSq;
    const victimMesh = moveObj.captured ? this.pieceMeshes.get(victimSq) : null;

    const result = this.chess.move({
      from: fromSq,
      to: toSq,
      promotion: moveObj.promotion || "q"
    });

    if (!result) {
      this.animating = false;
      return;
    }

    if (victimMesh && attackerMesh) {
      await this.playBattleCaptureSequence(attackerMesh, victimMesh, fromSq, toSq, victimSq, result);
      this.capturedCounts[result.color].push(result.captured);
      if (
        typeof BridgeProgression !== "undefined" &&
        (this.mode === "2p" || result.color === this.playerColor)
      ) {
        const tier = DIFFICULTY_TIERS[this.aiDifficulty] || DIFFICULTY_TIERS[3];
        BridgeProgression.awardCoins(tier.capReward || 5, "wizard_chess_capture", {
          captured: result.captured,
          difficulty: this.aiDifficulty
        });
      }
    } else if (attackerMesh) {
      await this.playSlideOrLeap(attackerMesh, fromSq, toSq, result.piece === "n");
    }

    // Castling rook slide
    if (result.flags.includes("k") || result.flags.includes("q")) {
      const rankChar = result.color === "w" ? "1" : "8";
      const rookFrom = (result.flags.includes("k") ? "h" : "a") + rankChar;
      const rookTo = (result.flags.includes("k") ? "f" : "d") + rankChar;
      const rookMesh = this.pieceMeshes.get(rookFrom);
      if (rookMesh) {
        await this.playSlideOrLeap(rookMesh, rookFrom, rookTo, false);
        this.pieceMeshes.delete(rookFrom);
        rookMesh.userData.square = rookTo;
        this.pieceMeshes.set(rookTo, rookMesh);
      }
    }

    if (attackerMesh) {
      this.pieceMeshes.delete(fromSq);
      if (result.flags.includes("p")) {
        this.scene.remove(attackerMesh);
        const promotedMesh = this.buildWizardPieceMesh(result.promotion || "q", result.color);
        const toWorld = squareToWorld(toSq);
        promotedMesh.position.set(toWorld.x, 0, toWorld.z);
        promotedMesh.userData.square = toSq;
        this.scene.add(promotedMesh);
        this.pieceMeshes.set(toSq, promotedMesh);
        this.spawnSpellBurst(new THREE.Vector3(toWorld.x, 0.8, toWorld.z), 0xffd57a, 24);
      } else {
        attackerMesh.userData.square = toSq;
        this.pieceMeshes.set(toSq, attackerMesh);
      }
    }

    if (this.chess.inCheck()) {
      this.audio.playCheck();
    }

    // Record ply in timeline and update live evaluation bar
    const uci = result.from + result.to + (result.promotion || "");
    const staticWhiteCp = this.evaluateBoard();
    this.timeline.push({
      ply: this.timeline.length,
      fen: this.chess.fen(),
      san: result.san,
      uci,
      color: result.color,
      captured: result.captured || null,
      evalCpWhite: staticWhiteCp,
      bestMoveUci: null,
      classification: null
    });

    this.updateLiveEvalAsync(this.timeline.length - 1);
    this.notifyStateChange(result);

    if (this.chess.isGameOver()) {
      this.handleGameOver();
      this.animating = false;
      return;
    }

    if (this.mode === "ai" && this.chess.turn() !== this.playerColor) {
      setTimeout(() => this.playAIMove(), 240);
    } else {
      this.animating = false;
    }
  }

  async updateLiveEvalAsync(plyIndex) {
    const entry = this.timeline[plyIndex];
    if (!entry) return;
    if (this.callbacks.onEvalUpdate) {
      this.callbacks.onEvalUpdate(entry.evalCpWhite, null);
    }
    if (this.stockfish && this.stockfish.ready) {
      const fenTurn = entry.fen.split(" ")[1];
      const sf = await this.stockfish.queryPosition(entry.fen, {
        skill: 20,
        depth: 8,
        movetime: 180
      });
      if (sf) {
        const whiteCp = (fenTurn === "w" ? 1 : -1) * sf.scoreCp;
        entry.evalCpWhite = whiteCp;
        if (this.callbacks.onEvalUpdate && plyIndex === this.timeline.length - 1) {
          const whiteMate = sf.mate !== null ? (fenTurn === "w" ? sf.mate : -sf.mate) : null;
          this.callbacks.onEvalUpdate(whiteCp, whiteMate);
        }
      }
    }
  }

  playSlideOrLeap(mesh, fromSq, toSq, isJump) {
    return new Promise((resolve) => {
      const start = squareToWorld(fromSq);
      const end = squareToWorld(toSq);
      const duration = isJump ? 520 : 350;
      const t0 = performance.now();

      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const targetRotY = Math.atan2(dx, dz);
      const defaultRotY = mesh.userData.color === "w" ? Math.PI : 0;

      if (isJump) {
        this.audio.playWarhorseCharge();
      } else {
        this.audio.playSlide();
      }
      this.spawnDustTrail(new THREE.Vector3(start.x, 0.05, start.z));

      const step = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        mesh.position.x = start.x + dx * ease;
        mesh.position.z = start.z + dz * ease;
        mesh.position.y = isJump ? Math.sin(p * Math.PI) * 1.05 : 0;
        if (isJump && mesh.userData.body) {
          mesh.userData.body.rotation.x = Math.sin(p * Math.PI * 2) * -0.35;
        }
        mesh.rotation.y = targetRotY;

        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          mesh.position.set(end.x, 0, end.z);
          if (mesh.userData.body) mesh.userData.body.rotation.set(0, 0, 0);
          mesh.rotation.y = defaultRotY;
          this.spawnDustTrail(new THREE.Vector3(end.x, 0.05, end.z));
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  // ---------- 6 Piece-Specific Choreographed Duel Sequences ----------
  playBattleCaptureSequence(attacker, victim, fromSq, toSq, victimSq, moveResult) {
    return new Promise((resolve) => {
      const start = squareToWorld(fromSq);
      const end = squareToWorld(toSq);
      const victimPos = squareToWorld(victimSq);

      const dx = victimPos.x - start.x;
      const dz = victimPos.z - start.z;
      const dist = Math.hypot(dx, dz) || 1;
      const dirX = dx / dist;
      const dirZ = dz / dist;
      const attackAngle = Math.atan2(dx, dz);
      const defaultRotY = attacker.userData.color === "w" ? Math.PI : 0;
      const aType = attacker.userData.type;
      const isWhiteAttacker = attacker.userData.color === "w";
      const spellColor = isWhiteAttacker ? 0x58d4ff : 0xff5a36;

      const duelTitles = {
        p: "🛡️ VANGUARD SHIELD BASH & THRUST",
        n: "🐴 DESTRIER CAVALRY LANCE CHARGE",
        r: "🏰 COLOSSAL SEISMIC SIEGE SLAM",
        b: "🔮 CELESTIAL RUNE PILLAR SMITE",
        q: "👑 EMPRESS TELEKINETIC VORTEX CRUSH",
        k: "⚔️ SOVEREIGN GREATSWORD EXECUTION"
      };
      if (this.callbacks.onDuelBanner) {
        this.callbacks.onDuelBanner(duelTitles[aType] || "⚔️ ARCANE DUEL");
      }

      if (this.battleCamEnabled) {
        this.focusBattleCamera(
          new THREE.Vector3((start.x + victimPos.x) * 0.5, 0.65, (start.z + victimPos.z) * 0.5)
        );
      }

      attacker.rotation.y = attackAngle;
      victim.rotation.y = attackAngle + Math.PI;

      const isRanged = aType === "b" || aType === "q";
      const isKnight = aType === "n";
      const stopDist = isRanged
        ? Math.max(0, dist * 0.32)
        : isKnight
        ? Math.max(0, dist - 0.55)
        : Math.max(0, dist - 0.84);
      const strikeX = start.x + dirX * stopDist;
      const strikeZ = start.z + dirZ * stopDist;

      const approachMs = isKnight ? 460 : 350;
      const windupMs = 360;
      const strikeMs = 240;
      const settleMs = 340;
      const totalMs = approachMs + windupMs + strikeMs + settleMs;
      const t0 = performance.now();

      let fxMeshes = [];
      let clashed = false;
      let shattered = false;

      if (isKnight) {
        this.audio.playWarhorseCharge();
      } else {
        this.audio.playSlide();
      }
      if (isRanged) {
        setTimeout(() => this.audio.playSpellCharge(), approachMs * 0.5);
      }

      const tick = (now) => {
        const elapsed = now - t0;

        if (elapsed < approachMs) {
          // ===== PHASE 1: APPROACH / REARING LEAP =====
          const p = elapsed / approachMs;
          const ease = 1 - Math.pow(1 - p, 2);

          if (isKnight) {
            // First 35% of approach: horse rears up on its hind legs at start square!
            if (p < 0.35) {
              const rp = p / 0.35;
              attacker.userData.body.rotation.x = -rp * 0.58;
              attacker.userData.body.position.y = rp * 0.25;
            } else {
              // Vaults through the air in a high cavalry arc!
              const lp = (p - 0.35) / 0.65;
              attacker.position.x = start.x + (strikeX - start.x) * lp;
              attacker.position.z = start.z + (strikeZ - start.z) * lp;
              attacker.position.y = Math.sin(lp * Math.PI) * 1.45;
              attacker.userData.body.rotation.x = -0.58 + lp * 0.85;
              if (attacker.userData.weaponPivot) {
                attacker.userData.weaponPivot.rotation.x = lp * 0.45;
              }
            }
          } else {
            attacker.position.x = start.x + (strikeX - start.x) * ease;
            attacker.position.z = start.z + (strikeZ - start.z) * ease;
            if (aType === "r") {
              // Heavy lumbering golem stomp
              attacker.userData.body.rotation.z = Math.sin(p * Math.PI * 4) * 0.12;
              attacker.position.y = Math.abs(Math.sin(p * Math.PI * 4)) * 0.08;
            } else if (isRanged) {
              attacker.position.y = ease * 0.32;
            }
          }
        } else if (elapsed < approachMs + windupMs) {
          // ===== PHASE 2: DUEL CLASH / SPELL SUMMONING / TELEKINESIS =====
          const p = (elapsed - approachMs) / windupMs;

          if (aType === "p") {
            // Pawn Shield-Bash first, then cocks sword arm back!
            if (p < 0.5) {
              const sp = p * 2;
              if (attacker.userData.shieldPivot) {
                attacker.userData.shieldPivot.position.z = sp * 0.22;
              }
              if (!clashed && sp > 0.7) {
                clashed = true;
                this.audio.playClash();
                this.spawnSpellBurst(
                  new THREE.Vector3(victimPos.x - dirX * 0.3, 0.6, victimPos.z - dirZ * 0.3),
                  0xffd57a,
                  12
                );
              }
              victim.userData.body.rotation.x = -sp * 0.28;
            } else {
              const wp = (p - 0.5) * 2;
              if (attacker.userData.weaponPivot) {
                attacker.userData.weaponPivot.rotation.x = -wp * 1.25;
              }
              victim.userData.body.rotation.x = -0.28 * (1 - wp);
            }
          } else if (aType === "r") {
            // Rook raises both siege warhammer arms high overhead!
            if (attacker.userData.weaponPivot) {
              attacker.userData.weaponPivot.rotation.x = -p * 2.1;
            }
            if (attacker.userData.shieldPivot) {
              attacker.userData.shieldPivot.rotation.x = -p * 2.1;
            }
            attacker.userData.body.position.y = p * 0.18;
            victim.position.x = victimPos.x + (Math.random() - 0.5) * 0.06 * p;
          } else if (aType === "n") {
            // Knight lands from leap, couches lance for final impale
            attacker.position.y = (1 - p) * 0.2;
            attacker.userData.body.rotation.x = 0.25 * (1 - p);
            if (attacker.userData.weaponPivot) {
              attacker.userData.weaponPivot.rotation.x = -0.35 * p;
            }
          } else if (aType === "b") {
            // Bishop summons spinning celestial rune circle under victim!
            if (attacker.userData.weaponPivot) {
              attacker.userData.weaponPivot.rotation.x = -p * 0.85;
            }
            if (fxMeshes.length === 0) {
              const runeRing = this.createRuneCircle(victimPos.x, victimPos.z, spellColor);
              this.scene.add(runeRing);
              fxMeshes.push(runeRing);
            }
            fxMeshes[0].rotation.z += 0.14;
            fxMeshes[0].scale.setScalar(0.5 + p * 0.7);
            victim.position.x = victimPos.x + (Math.random() - 0.5) * 0.05 * p;
          } else if (aType === "q") {
            // Queen telekinetically levitates & spins the helpless victim in mid-air!
            if (attacker.userData.weaponPivot) {
              attacker.userData.weaponPivot.rotation.x = -p * 0.95;
            }
            if (fxMeshes.length === 0) {
              const vortex = this.createRuneCircle(victimPos.x, victimPos.z, spellColor);
              this.scene.add(vortex);
              fxMeshes.push(vortex);
            }
            fxMeshes[0].position.y = p * 0.75;
            fxMeshes[0].rotation.z += 0.22;
            victim.position.y = p * 0.92;
            victim.rotation.y += 0.28;
            victim.userData.body.rotation.z = Math.sin(p * Math.PI * 4) * 0.22;
          } else if (aType === "k") {
            // King clashes against defender's parry, then raises broadsword overhead!
            if (!clashed && p > 0.25) {
              clashed = true;
              this.audio.playClash();
              this.spawnSpellBurst(
                new THREE.Vector3(victimPos.x - dirX * 0.35, 0.75, victimPos.z - dirZ * 0.35),
                0xffdfb0,
                14
              );
            }
            if (attacker.userData.weaponPivot) {
              attacker.userData.weaponPivot.rotation.x = -p * 1.65;
            }
            if (victim.userData.weaponPivot) {
              victim.userData.weaponPivot.rotation.x = -Math.sin(p * Math.PI) * 0.85;
            }
          }
        } else if (elapsed < approachMs + windupMs + strikeMs) {
          // ===== PHASE 3: FINISHER IMPACT & DISMEMBERMENT SHATTER =====
          const p = (elapsed - approachMs - windupMs) / strikeMs;

          if (aType === "b") {
            // Sky-pillar of celestial light strikes from the heavens!
            if (fxMeshes.length === 1) {
              const pillar = this.createSkyPillar(victimPos.x, victimPos.z, spellColor);
              this.scene.add(pillar);
              fxMeshes.push(pillar);
            }
          } else if (aType === "q") {
            // Arcane beam + mid-air vortex implosion
            if (fxMeshes.length === 1) {
              const beam = this.createArcaneBeam(
                new THREE.Vector3(strikeX, 1.15, strikeZ),
                new THREE.Vector3(victimPos.x, 0.92, victimPos.z),
                spellColor
              );
              this.scene.add(beam);
              fxMeshes.push(beam);
            }
          } else if (aType === "r") {
            // Rook slams both siege hammers into the ground!
            if (attacker.userData.weaponPivot) {
              attacker.userData.weaponPivot.rotation.x = -2.1 + p * 3.1;
            }
            if (attacker.userData.shieldPivot) {
              attacker.userData.shieldPivot.rotation.x = -2.1 + p * 3.1;
            }
          } else if (attacker.userData.weaponPivot) {
            attacker.userData.weaponPivot.rotation.x = -1.25 + p * 2.55;
          }

          if (p >= 0.38 && !shattered) {
            shattered = true;
            const shatterHeight = aType === "q" ? 0.92 : 0;
            const upBoost = aType === "r" ? 1.15 : aType === "n" ? 0.65 : 0.38;
            if (aType === "r" || aType === "n" || aType === "k") {
              this.spawnShockwaveRing(new THREE.Vector3(victimPos.x, 0.04, victimPos.z), spellColor);
            }
            this.shatterVictimPiece(
              victim,
              new THREE.Vector3(victimPos.x, shatterHeight, victimPos.z),
              new THREE.Vector3(dirX, upBoost, dirZ),
              attacker.userData.color
            );
            this.pieceMeshes.delete(victimSq);
            this.scene.remove(victim);
            this.cameraShake = aType === "r" ? 0.38 : 0.28;
            this.audio.playShatter();
          }
        } else if (elapsed < totalMs) {
          // ===== PHASE 4: CLAIM CONQUERED SQUARE =====
          if (fxMeshes.length > 0) {
            for (const m of fxMeshes) this.scene.remove(m);
            fxMeshes = [];
          }
          const p = (elapsed - approachMs - windupMs - strikeMs) / settleMs;
          const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          attacker.position.x = strikeX + (end.x - strikeX) * ease;
          attacker.position.z = strikeZ + (end.z - strikeZ) * ease;
          attacker.position.y = isRanged ? (1 - ease) * 0.32 : 0;
          attacker.userData.body.position.y = (1 - ease) * 0.12;
          attacker.userData.body.rotation.set(0, 0, 0);
          if (attacker.userData.weaponPivot) {
            attacker.userData.weaponPivot.rotation.x = (1 - ease) * 1.1;
          }
          if (attacker.userData.shieldPivot) {
            attacker.userData.shieldPivot.rotation.x = (1 - ease) * 0.8;
            attacker.userData.shieldPivot.position.z = 0;
          }
        } else {
          for (const m of fxMeshes) this.scene.remove(m);
          attacker.position.set(end.x, 0, end.z);
          attacker.userData.body.position.set(0, 0, 0);
          attacker.userData.body.rotation.set(0, 0, 0);
          if (attacker.userData.weaponPivot) {
            attacker.userData.weaponPivot.rotation.set(0, 0, 0);
          }
          if (attacker.userData.shieldPivot) {
            attacker.userData.shieldPivot.rotation.set(0, 0, 0);
          }
          attacker.rotation.y = defaultRotY;
          if (this.callbacks.onDuelBanner) {
            this.callbacks.onDuelBanner(null);
          }
          if (this.battleCamEnabled) {
            this.restoreBattleCamera();
          }
          resolve();
          return;
        }

        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    });
  }

  createRuneCircle(x, z, hexColor) {
    const group = new THREE.Group();
    const outer = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.52, 6),
      new THREE.MeshBasicMaterial({
        color: hexColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      })
    );
    const inner = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.28, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      })
    );
    group.add(outer);
    group.add(inner);
    group.rotation.x = -Math.PI / 2;
    group.position.set(x, 0.04, z);
    return group;
  }

  createSkyPillar(x, z, hexColor) {
    const geo = new THREE.CylinderGeometry(0.28, 0.44, 6.5, 16);
    geo.translate(0, 3.25, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.85
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0, z);
    return mesh;
  }

  spawnShockwaveRing(pos, hexColor) {
    const geo = new THREE.RingGeometry(0.2, 0.36, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: hexColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos);
    this.scene.add(ring);
    this.particles.push({
      mesh: ring,
      vel: new THREE.Vector3(0, 0, 0),
      isShockwave: true,
      age: 0,
      maxAge: 0.48
    });
  }

  createArcaneBeam(fromVec, toVec, hexColor) {
    const dir = new THREE.Vector3().subVectors(toVec, fromVec);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(0.06, 0.12, len, 8);
    geo.translate(0, len / 2, 0);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.92
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(fromVec);
    mesh.lookAt(toVec);
    return mesh;
  }

  // ---------- Dismemberment + Rigid-Body Stone Shatter Physics ----------
  shatterVictimPiece(victimMesh, worldPos, impactDir, attackerColor) {
    const isWhiteVictim = victimMesh.userData.color === "w";
    const stoneMat = isWhiteVictim ? this.materials.whitePiece : this.materials.blackPiece;
    const coreMat = isWhiteVictim ? this.materials.whiteCore : this.materials.blackCore;

    // 1. Launch actual sculpted Blender sub-meshes (helmet/head, weapon, shield) as tumbling trophies!
    const subPivots = [
      victimMesh.userData.headPivot,
      victimMesh.userData.weaponPivot,
      victimMesh.userData.shieldPivot
    ];
    for (const piv of subPivots) {
      if (!piv) continue;
      const worldP = new THREE.Vector3();
      piv.getWorldPosition(worldP);
      const detached = piv.clone(true);
      detached.position.copy(worldP);
      this.scene.add(detached);
      const speed = 2.6 + Math.random() * 2.8;
      this.shards.push({
        mesh: detached,
        vel: new THREE.Vector3(
          impactDir.x * speed + (Math.random() - 0.5) * 2.8,
          2.8 + Math.random() * 3.2,
          impactDir.z * speed + (Math.random() - 0.5) * 2.8
        ),
        angVel: new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12
        ),
        halfH: 0.14,
        age: 0,
        maxAge: 4.2
      });
    }

    // 2. Spawn 30 Voronoi stone & glowing rune shards
    const shardCount = 30;
    for (let i = 0; i < shardCount; i++) {
      const size = 0.07 + Math.random() * 0.13;
      const geo =
        i % 3 === 0
          ? new THREE.DodecahedronGeometry(size, 0)
          : new THREE.BoxGeometry(
              size * (0.7 + Math.random() * 0.8),
              size * (0.6 + Math.random() * 0.9),
              size * (0.7 + Math.random() * 0.8)
            );
      const mat = i % 5 === 0 ? coreMat : stoneMat;
      const shard = new THREE.Mesh(geo, mat);

      const h = worldPos.y + 0.12 + Math.random() * 1.05;
      const spreadX = (Math.random() - 0.5) * 0.45;
      const spreadZ = (Math.random() - 0.5) * 0.45;
      shard.position.set(worldPos.x + spreadX, h, worldPos.z + spreadZ);
      shard.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      shard.castShadow = true;

      const speed = 2.2 + Math.random() * 3.8;
      const vel = new THREE.Vector3(
        impactDir.x * speed * 0.85 + (Math.random() - 0.5) * 3.4,
        (impactDir.y || 0.35) * 3.5 + 1.6 + Math.random() * 3.4,
        impactDir.z * speed * 0.85 + (Math.random() - 0.5) * 3.4
      );
      const angVel = new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14
      );

      this.scene.add(shard);
      this.shards.push({
        mesh: shard,
        vel,
        angVel,
        halfH: size * 0.5,
        age: 0,
        maxAge: 3.4 + Math.random() * 1.4
      });
    }

    this.spawnSpellBurst(
      new THREE.Vector3(worldPos.x, worldPos.y + 0.55, worldPos.z),
      attackerColor === "w" ? 0x58d4ff : 0xff5a36,
      28
    );
  }

  spawnDustTrail(pos) {
    for (let i = 0; i < 8; i++) {
      const pGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
      const pMat = new THREE.MeshBasicMaterial({
        color: 0xc9a87a,
        transparent: true,
        opacity: 0.55
      });
      const m = new THREE.Mesh(pGeo, pMat);
      m.position.set(
        pos.x + (Math.random() - 0.5) * 0.35,
        0.04 + Math.random() * 0.06,
        pos.z + (Math.random() - 0.5) * 0.35
      );
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.6,
          0.35 + Math.random() * 0.45,
          (Math.random() - 0.5) * 0.6
        ),
        age: 0,
        maxAge: 0.55 + Math.random() * 0.25
      });
    }
  }

  spawnSpellBurst(pos, hexColor, count = 20) {
    for (let i = 0; i < count; i++) {
      const pGeo = new THREE.OctahedronGeometry(0.055, 0);
      const pMat = new THREE.MeshBasicMaterial({
        color: hexColor,
        transparent: true,
        opacity: 0.95
      });
      const m = new THREE.Mesh(pGeo, pMat);
      m.position.copy(pos);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const spd = 1.4 + Math.random() * 3.2;
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vel: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * spd,
          Math.abs(Math.cos(phi)) * spd + 0.6,
          Math.sin(phi) * Math.sin(theta) * spd
        ),
        age: 0,
        maxAge: 0.65 + Math.random() * 0.35
      });
    }
  }

  // ---------- Dynamic Action Camera ----------
  focusBattleCamera(targetCenter) {
    this.savedCameraState = {
      pos: this.camera.position.clone(),
      target: this.controls.target.clone()
    };
    const sideSign = this.playerColor === "w" ? 1 : -1;
    const desiredPos = new THREE.Vector3(
      targetCenter.x + 2.2,
      4.1,
      targetCenter.z + sideSign * 4.3
    );
    this.cameraTween = {
      fromPos: this.camera.position.clone(),
      toPos: desiredPos,
      fromTarget: this.controls.target.clone(),
      toTarget: targetCenter.clone(),
      startTime: performance.now(),
      duration: 280
    };
  }

  restoreBattleCamera() {
    if (!this.savedCameraState) return;
    this.cameraTween = {
      fromPos: this.camera.position.clone(),
      toPos: this.savedCameraState.pos.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: this.savedCameraState.target.clone(),
      startTime: performance.now(),
      duration: 380
    };
    this.savedCameraState = null;
  }

  setCameraPreset(preset) {
    this.savedCameraState = null;
    const toTarget = new THREE.Vector3(0, 0.35, 0);
    let toPos = new THREE.Vector3(0, 8.6, 9.8);
    if (preset === "black") {
      toPos.set(0, 8.6, -9.8);
    } else if (preset === "top") {
      toPos.set(0, 13.8, 0.01);
    } else if (preset === "cinematic") {
      toPos.set(7.4, 6.2, 7.8);
    }
    this.cameraTween = {
      fromPos: this.camera.position.clone(),
      toPos,
      fromTarget: this.controls.target.clone(),
      toTarget,
      startTime: performance.now(),
      duration: 450
    };
  }

  // ---------- Stockfish + Fallback AI Move Selection ----------
  async playAIMove() {
    if (this.chess.isGameOver() || this.reviewMode) {
      this.animating = false;
      return;
    }
    const move = await this.chooseBestAIMove();
    if (!move) {
      this.animating = false;
      return;
    }
    this.executeMove(move);
  }

  async chooseBestAIMove() {
    const legal = this.chess.moves({ verbose: true });
    if (legal.length === 0) return null;

    const tier = DIFFICULTY_TIERS[this.aiDifficulty] || DIFFICULTY_TIERS[3];

    // 1. Try Stockfish UCI Worker first (for levels >= 2, or with noise on level 1)
    if (this.stockfish && this.stockfish.ready && (this.aiDifficulty >= 2 || Math.random() > 0.45)) {
      const sfRes = await this.stockfish.queryPosition(this.chess.fen(), {
        skill: tier.skill,
        depth: tier.depth,
        movetime: tier.movetime
      });
      if (sfRes && sfRes.bestMoveUci) {
        const from = sfRes.bestMoveUci.slice(0, 2);
        const to = sfRes.bestMoveUci.slice(2, 4);
        const promo = sfRes.bestMoveUci[4] || undefined;
        const matched = legal.find(
          (m) => m.from === from && m.to === to && (!promo || m.promotion === promo)
        );
        if (matched) return matched;
      }
    }

    // 2. Fallback local Alpha-Beta + PST search
    const searchDepth = this.aiDifficulty <= 2 ? 1 : this.aiDifficulty <= 4 ? 2 : 3;
    const aiColor = this.chess.turn();
    legal.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));

    let bestMove = legal[0];
    let bestVal = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const mv of legal) {
      this.chess.move(mv);
      const val = -this.negamax(searchDepth - 1, -beta, -alpha, aiColor === "w" ? -1 : 1);
      this.chess.undo();
      const jittered = val + (Math.random() - 0.5) * (tier.noise || 8);
      if (jittered > bestVal) {
        bestVal = jittered;
        bestMove = mv;
      }
      if (val > alpha) alpha = val;
    }
    return bestMove;
  }

  negamax(depth, alpha, beta, colorSign) {
    if (depth === 0 || this.chess.isGameOver()) {
      return colorSign * this.evaluateBoard();
    }
    const moves = this.chess.moves({ verbose: true });
    moves.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));

    let maxEval = -Infinity;
    for (const mv of moves) {
      this.chess.move(mv);
      const evaluation = -this.negamax(depth - 1, -beta, -alpha, -colorSign);
      this.chess.undo();
      if (evaluation > maxEval) maxEval = evaluation;
      if (evaluation > alpha) alpha = evaluation;
      if (alpha >= beta) break;
    }
    return maxEval;
  }

  evaluateBoard(chessInstance = this.chess) {
    if (chessInstance.isCheckmate()) {
      return chessInstance.turn() === "w" ? -9900 : 9900;
    }
    if (chessInstance.isDraw()) return 0;

    const board = chessInstance.board();
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        if (!piece) continue;
        const base = PIECE_VALUES[piece.type] || 0;
        const sqIdx = piece.color === "w" ? r * 8 + f : (7 - r) * 8 + f;
        const bonus = PST[piece.type] ? PST[piece.type][sqIdx] : 0;
        if (piece.color === "w") score += base + bonus;
        else score -= base + bonus;
      }
    }
    return score;
  }

  // ---------- Arcane Game Review Engine ----------
  async analyzeGameHistory(onProgress) {
    if (this.timeline.length <= 1) return null;

    const tempChess = new Chess();
    // Ensure every timeline node has a bestMove and evaluation
    for (let i = 0; i < this.timeline.length; i++) {
      const node = this.timeline[i];
      if (onProgress) onProgress(i, this.timeline.length);

      if (this.stockfish && this.stockfish.ready) {
        const fenTurn = node.fen.split(" ")[1];
        const sf = await this.stockfish.queryPosition(node.fen, {
          skill: 20,
          depth: 8,
          movetime: 110
        });
        if (sf) {
          node.evalCpWhite = (fenTurn === "w" ? 1 : -1) * sf.scoreCp;
          node.bestMoveUci = sf.bestMoveUci;
        }
      } else {
        tempChess.load(node.fen);
        node.evalCpWhite = this.evaluateBoard(tempChess);
        // Find 1-ply best move locally
        const moves = tempChess.moves({ verbose: true });
        let bestUci = null;
        let bestScore = -Infinity;
        const turnSign = tempChess.turn() === "w" ? 1 : -1;
        for (const m of moves) {
          tempChess.move(m);
          const sc = turnSign * this.evaluateBoard(tempChess);
          tempChess.undo();
          if (sc > bestScore) {
            bestScore = sc;
            bestUci = m.from + m.to + (m.promotion || "");
          }
        }
        node.bestMoveUci = bestUci;
      }
    }

    // Classify each move (ply 1..N) by comparing pre-move eval & bestMove vs post-move eval
    const counts = {
      brilliant: 0,
      best: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0
    };
    const accSums = { w: [], b: [] };

    for (let i = 1; i < this.timeline.length; i++) {
      const prev = this.timeline[i - 1];
      const curr = this.timeline[i];
      const mover = curr.color; // 'w' or 'b'
      const sign = mover === "w" ? 1 : -1;

      const evalBefore = prev.evalCpWhite * sign;
      const evalAfter = curr.evalCpWhite * sign;
      const cpLoss = Math.max(0, evalBefore - evalAfter);

      const winBefore = cpToWinPercent(evalBefore);
      const winAfter = cpToWinPercent(evalAfter);
      const winLoss = Math.max(0, winBefore - winAfter);
      const moveAcc = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * winLoss) - 3.1669));
      accSums[mover].push(moveAcc);

      curr.recommendedUci = prev.bestMoveUci;
      curr.recommendedSan = this.uciToSan(prev.fen, prev.bestMoveUci);

      if (curr.uci === prev.bestMoveUci && curr.captured && evalAfter > evalBefore + 120) {
        curr.classification = "brilliant";
        curr.badge = "!!";
      } else if (curr.uci === prev.bestMoveUci || cpLoss <= 22) {
        curr.classification = "best";
        curr.badge = "★";
      } else if (cpLoss <= 65) {
        curr.classification = "good";
        curr.badge = "✓";
      } else if (cpLoss <= 135) {
        curr.classification = "inaccuracy";
        curr.badge = "?!";
      } else if (cpLoss <= 260) {
        curr.classification = "mistake";
        curr.badge = "?";
      } else {
        curr.classification = "blunder";
        curr.badge = "??";
      }
      counts[curr.classification]++;
    }

    const avg = (arr) =>
      arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 100;

    return {
      whiteAccuracy: avg(accSums.w),
      blackAccuracy: avg(accSums.b),
      counts,
      timeline: this.timeline
    };
  }

  uciToSan(fen, uci) {
    if (!uci || uci.length < 4) return null;
    try {
      const tmp = new Chess(fen);
      const mv = tmp.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] || "q"
      });
      return mv ? mv.san : uci;
    } catch {
      return uci;
    }
  }

  viewReviewPly(plyIndex) {
    const idx = Math.max(0, Math.min(this.timeline.length - 1, plyIndex));
    const entry = this.timeline[idx];
    if (!entry) return null;

    this.reviewMode = true;
    this.selectedSquare = null;
    this.clearMarkers();

    const tempChess = new Chess(entry.fen);
    for (const [, mesh] of this.pieceMeshes) {
      this.scene.remove(mesh);
    }
    this.pieceMeshes.clear();

    const boardState = tempChess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = boardState[r][f];
        if (!cell) continue;
        const mesh = this.buildWizardPieceMesh(cell.type, cell.color);
        const pos = squareToWorld(cell.square);
        mesh.position.set(pos.x, 0, pos.z);
        mesh.userData.square = cell.square;
        this.scene.add(mesh);
        this.pieceMeshes.set(cell.square, mesh);
      }
    }

    if (idx > 0) {
      this.showReviewArrows(entry.uci, entry.recommendedUci, entry.classification);
    } else {
      this.clearReviewArrows();
    }

    if (this.callbacks.onEvalUpdate) {
      this.callbacks.onEvalUpdate(entry.evalCpWhite, null);
    }

    return entry;
  }

  exitReviewMode() {
    this.reviewMode = false;
    this.clearReviewArrows();
    this.syncPiecesFromBoard();
    const latest = this.timeline[this.timeline.length - 1];
    if (latest && this.callbacks.onEvalUpdate) {
      this.callbacks.onEvalUpdate(latest.evalCpWhite, null);
    }
  }

  // ---------- Game Controls & State Callbacks ----------
  newGame(options = {}) {
    if (options.mode) this.mode = options.mode;
    if (options.aiDifficulty) this.aiDifficulty = Number(options.aiDifficulty);
    if (options.playerColor) this.playerColor = options.playerColor;

    this.chess.reset();
    this.reviewMode = false;
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.capturedCounts = { w: [], b: [] };
    this.animating = false;
    this.clearMarkers();
    this.clearReviewArrows();

    this.timeline = [
      {
        ply: 0,
        fen: this.chess.fen(),
        san: "Start",
        uci: null,
        color: null,
        evalCpWhite: 20,
        bestMoveUci: null,
        classification: null
      }
    ];

    for (const s of this.shards) {
      this.scene.remove(s.mesh);
    }
    this.shards.length = 0;

    this.syncPiecesFromBoard();
    this.setCameraPreset(this.playerColor === "w" ? "white" : "black");
    if (this.callbacks.onEvalUpdate) this.callbacks.onEvalUpdate(20, null);
    this.notifyStateChange(null);

    if (this.mode === "ai" && this.playerColor === "b") {
      this.animating = true;
      setTimeout(() => this.playAIMove(), 450);
    }
  }

  undoLastRound() {
    if (this.animating) return;
    this.reviewMode = false;
    this.clearReviewArrows();

    if (this.mode === "ai") {
      if (this.chess.undo()) this.timeline.pop();
      if (this.chess.undo()) this.timeline.pop();
    } else {
      if (this.chess.undo()) this.timeline.pop();
    }
    this.selectedSquare = null;
    this.clearMarkers();
    this.syncPiecesFromBoard();
    const latest = this.timeline[this.timeline.length - 1];
    if (latest && this.callbacks.onEvalUpdate) {
      this.callbacks.onEvalUpdate(latest.evalCpWhite, null);
    }
    this.notifyStateChange(null);
  }

  notifyStateChange(lastMove) {
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange({
        fen: this.chess.fen(),
        turn: this.chess.turn(),
        inCheck: this.chess.inCheck(),
        isCheckmate: this.chess.isCheckmate(),
        isDraw: this.chess.isDraw(),
        isGameOver: this.chess.isGameOver(),
        history: this.chess.history({ verbose: true }),
        timeline: this.timeline,
        capturedCounts: this.capturedCounts,
        lastMove
      });
    }
  }

  handleGameOver() {
    if (this.chess.isCheckmate()) {
      const winner = this.chess.turn() === "w" ? "b" : "w";
      const playerWon = this.mode === "2p" || winner === this.playerColor;
      if (playerWon && typeof BridgeProgression !== "undefined") {
        const tier = DIFFICULTY_TIERS[this.aiDifficulty] || DIFFICULTY_TIERS[3];
        BridgeProgression.awardCoins(tier.reward, "wizard_chess_victory", {
          difficulty: this.aiDifficulty,
          mode: this.mode
        });
        BridgeProgression.recordAchievement("first_light", 100, { game: "chess" });
      }
    }
  }

  // ---------- Render Loop ----------
  animate() {
    if (this.disposed) return;
    requestAnimationFrame(() => this.animate());
    if (!this.activeTab) return;

    const now = performance.now();
    const dt = 0.016;

    // 1. Animate corner braziers (flickering hearthfire)
    for (const b of this.braziers) {
      const flicker =
        0.85 +
        Math.sin(now * 0.011 + b.phase) * 0.14 +
        Math.cos(now * 0.023 + b.phase * 2) * 0.08;
      b.light.intensity = 1.35 * flicker;
      b.flame.scale.set(1, 0.88 + flicker * 0.22, 1);
      b.flame.rotation.y += 0.04;
    }

    // 2. Class-specific idle animations on Blender-sculpted warriors
    for (const [, piece] of this.pieceMeshes) {
      if (!this.animating && piece.userData.body) {
        const s = piece.userData.seed || 0;
        const pType = piece.userData.type;
        const hoverAmp = pType === "b" || pType === "q" ? 0.032 : 0.015;
        piece.userData.body.position.y = Math.sin(now * 0.0028 + s) * hoverAmp;

        if (piece.userData.headPivot) {
          piece.userData.headPivot.rotation.y = Math.sin(now * 0.0016 + s) * 0.07;
          if (pType === "n") {
            // Warhorse proud head nod
            piece.userData.headPivot.rotation.x = Math.sin(now * 0.0032 + s) * 0.06;
          }
        }
        if (piece.userData.wingsMesh) {
          // Queen Valkyrie wings gently unfurl & breathe
          const ws = 1 + Math.sin(now * 0.0035 + s) * 0.055;
          piece.userData.wingsMesh.scale.set(ws, 1, 1);
        }
        if (piece.userData.astrolabeMesh) {
          // Bishop celestial astrolabe rings slowly precess
          piece.userData.astrolabeMesh.rotation.z = Math.sin(now * 0.002 + s) * 0.14;
        }
        if ((pType === "q" || pType === "b") && piece.userData.shieldPivot) {
          // Levitating spellbook / arcane orbs bob in left hand
          piece.userData.shieldPivot.position.y += Math.sin(now * 0.0045 + s) * 0.0012;
        }
      }
    }

    // 3. Pulse legal capture rings
    for (const m of this.markerMeshes) {
      if (m.userData && m.userData.isCaptureRing) {
        m.rotation.z += 0.025;
        const sc = 0.94 + Math.sin(now * 0.007) * 0.08;
        m.scale.set(sc, sc, 1);
      }
    }

    // 4. Update rigid-body stone shatter & severed armor fragments
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const sh = this.shards[i];
      sh.age += dt;
      if (sh.age >= sh.maxAge) {
        this.scene.remove(sh.mesh);
        this.shards.splice(i, 1);
        continue;
      }
      sh.vel.y -= 11.5 * dt;
      sh.mesh.position.addScaledVector(sh.vel, dt);
      sh.mesh.rotation.x += sh.angVel.x * dt;
      sh.mesh.rotation.y += sh.angVel.y * dt;
      sh.mesh.rotation.z += sh.angVel.z * dt;

      if (sh.mesh.position.y < sh.halfH) {
        sh.mesh.position.y = sh.halfH;
        sh.vel.y = Math.abs(sh.vel.y) * 0.36;
        sh.vel.x *= 0.72;
        sh.vel.z *= 0.72;
        sh.angVel.multiplyScalar(0.68);
      }

      if (sh.age > sh.maxAge - 0.75) {
        sh.mesh.position.y -= dt * 0.25;
      }
    }

    // 5. Update dust, spell, and shockwave particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.age += dt;
      if (pt.age >= pt.maxAge) {
        this.scene.remove(pt.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      if (pt.isShockwave) {
        const s = 1 + (pt.age / pt.maxAge) * 5.2;
        pt.mesh.scale.set(s, s, 1);
        pt.mesh.material.opacity = Math.max(0, 0.9 * (1 - pt.age / pt.maxAge));
      } else {
        pt.mesh.position.addScaledVector(pt.vel, dt);
        pt.mesh.material.opacity = Math.max(0, 1 - pt.age / pt.maxAge);
        pt.mesh.rotation.x += 0.08;
        pt.mesh.rotation.y += 0.08;
      }
    }

    // 6. Camera tweening & impact shake
    if (this.cameraTween) {
      const p = Math.min(1, (now - this.cameraTween.startTime) / this.cameraTween.duration);
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      this.camera.position.lerpVectors(this.cameraTween.fromPos, this.cameraTween.toPos, ease);
      this.controls.target.lerpVectors(
        this.cameraTween.fromTarget,
        this.cameraTween.toTarget,
        ease
      );
      if (p >= 1) this.cameraTween = null;
    }

    if (this.cameraShake > 0.005) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake *= 0.84;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
