/**
 * Wizard Chess 3D — Battle Chess / Arcane Stone & Hearthfire Edition
 *
 * Procedurally sculpted & articulated 3D stone/obsidian chess statues,
 * choreographed melee & spell capture animations, rigid-body stone shatter
 * physics, dynamic hearthfire braziers, procedural Web Audio SFX, and a
 * minimax + alpha-beta + quiescence AI engine.
 */
import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.0.0-beta.6/+esm";
import * as THREE from "https://esm.sh/three@0.160.0";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const SQUARE_SIZE = 1.15;
const BOARD_OFFSET = (7 * SQUARE_SIZE) / 2;

// Piece values & piece-square positional tables (from White's perspective, rank 8 -> rank 1)
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

// ---------- Procedural Web Audio Synthesizer ----------
class WizardAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (this.muted) return null;
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
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Filtered noise burst simulating heavy carved stone sliding on marble
    const bufferSize = Math.floor(ctx.sampleRate * 0.34);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(160, now);
    filter.frequency.linearRampToValueAtTime(110, now + 0.32);
    filter.Q.value = 2.4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.34);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    // Subtle low thud at arrival
    const osc = ctx.createOscillator();
    const tGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.42);
    tGain.gain.setValueAtTime(0.001, now);
    tGain.gain.setValueAtTime(0.22, now + 0.25);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.43);
    osc.connect(tGain);
    tGain.connect(ctx.destination);
    osc.start(now + 0.25);
    osc.stop(now + 0.44);
  }

  playSpellCharge() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc2.type = "triangle";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.42);
    osc2.frequency.setValueAtTime(330, now);
    osc2.frequency.exponentialRampToValueAtTime(990, now + 0.42);
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.47);
    osc2.stop(now + 0.47);
  }

  playShatter() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Heavy stone impact boom
    const osc = ctx.createOscillator();
    const boomGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);
    boomGain.gain.setValueAtTime(0.42, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc.connect(boomGain);
    boomGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);

    // 2. Crisp clattering stone shards (multiple staggered bursts)
    for (let k = 0; k < 6; k++) {
      const delay = k * 0.045 + Math.random() * 0.03;
      const len = 0.09 + Math.random() * 0.08;
      const bufSize = Math.floor(ctx.sampleRate * len);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 1.6);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 500 + k * 240 + Math.random() * 300;
      bp.Q.value = 3.0;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.22 * Math.pow(0.78, k), now + delay);
      g.gain.exponentialRampToValueAtTime(0.005, now + delay + len);

      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      src.start(now + delay);
    }
  }

  playCheck() {
    const ctx = this.ensure();
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

  // Subtle carved stone grain + pitting + micro-fissures
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
  return { bumpTex };
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

// ---------- Main WizardChess3D Controller ----------
export class WizardChess3D {
  constructor(containerEl, callbacks = {}) {
    this.container = containerEl;
    this.callbacks = callbacks;
    this.chess = new Chess();
    this.audio = new WizardAudio();

    this.mode = "ai"; // 'ai' | '2p'
    this.aiDifficulty = 2; // 1 = Apprentice, 2 = Archmage, 3 = Oracle
    this.playerColor = "w"; // 'w' | 'b'
    this.battleCamEnabled = true;

    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.animating = false;
    this.disposed = false;
    this.activeTab = true;

    this.pieceMeshes = new Map(); // square -> THREE.Group
    this.squareMeshes = new Map(); // square -> THREE.Mesh
    this.markerMeshes = [];
    this.shards = []; // active rigid-body stone fragments
    this.particles = []; // active spell/dust particles
    this.braziers = [];
    this.capturedCounts = { w: [], b: [] };
    this.cameraShake = 0;
    this.savedCameraState = null;
    this.cameraTween = null;

    this.initScene();
    this.buildBoard();
    this.syncPiecesFromBoard();
    this.bindEvents();
    this.animate();
  }

  initScene() {
    const w = this.container.clientWidth || 680;
    const h = this.container.clientHeight || 540;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x120906, 0.032);

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    this.camera.position.set(0, 8.6, 9.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 0.4, 0);
    this.controls.minDistance = 4.8;
    this.controls.maxDistance = 18.5;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.minPolarAngle = 0.15;

    // Warm library ambient + cool moon rim light + overhead key light
    const ambient = new THREE.AmbientLight(0x4a3222, 1.35);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffdfb0, 1.85);
    keyLight.position.set(5, 13, 6);
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

    const rimLight = new THREE.DirectionalLight(0x6890d8, 0.75);
    rimLight.position.set(-7, 8, -8);
    this.scene.add(rimLight);

    // Shared materials
    const { bumpTex } = createStoneTextures();
    this.materials = {
      whitePiece: new THREE.MeshStandardMaterial({
        color: 0xe8d8bc,
        roughness: 0.46,
        metalness: 0.08,
        bumpMap: bumpTex,
        bumpScale: 0.035
      }),
      whiteAccent: new THREE.MeshStandardMaterial({
        color: 0xd49b4b,
        roughness: 0.28,
        metalness: 0.72
      }),
      whiteCore: new THREE.MeshStandardMaterial({
        color: 0xffb85c,
        emissive: 0xff8c24,
        emissiveIntensity: 1.5,
        roughness: 0.2
      }),
      blackPiece: new THREE.MeshStandardMaterial({
        color: 0x262024,
        roughness: 0.36,
        metalness: 0.22,
        bumpMap: bumpTex,
        bumpScale: 0.04
      }),
      blackAccent: new THREE.MeshStandardMaterial({
        color: 0x9b64c8,
        roughness: 0.3,
        metalness: 0.68
      }),
      blackCore: new THREE.MeshStandardMaterial({
        color: 0xc864ff,
        emissive: 0x9832e8,
        emissiveIntensity: 1.6,
        roughness: 0.2
      }),
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

  buildBoard() {
    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);

    // Heavy carved stone pedestal / table slab
    const totalSpan = SQUARE_SIZE * 8;
    const frameGeo = new THREE.BoxGeometry(totalSpan + 1.35, 0.55, totalSpan + 1.35);
    const frameMesh = new THREE.Mesh(frameGeo, this.materials.boardFrame);
    frameMesh.position.y = -0.32;
    frameMesh.receiveShadow = true;
    this.boardGroup.add(frameMesh);

    // Brass inner bezel
    const bezelGeo = new THREE.BoxGeometry(totalSpan + 0.28, 0.42, totalSpan + 0.28);
    const bezelMesh = new THREE.Mesh(bezelGeo, this.materials.brassTrim);
    bezelMesh.position.y = -0.22;
    bezelMesh.receiveShadow = true;
    this.boardGroup.add(bezelMesh);

    // 64 beveled stone squares
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

    // 4 Corner Hearthfire Braziers with flickering PointLights
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

      // Flame core cone
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

    // Selection & legal-move highlight group
    this.markerGroup = new THREE.Group();
    this.scene.add(this.markerGroup);
  }

  // ---------- Procedurally Sculpted & Articulated 3D Wizard Pieces ----------
  buildWizardPieceMesh(type, color) {
    const isWhite = color === "w";
    const stoneMat = isWhite ? this.materials.whitePiece : this.materials.blackPiece;
    const accentMat = isWhite ? this.materials.whiteAccent : this.materials.blackAccent;
    const eyeMat = isWhite ? this.materials.whiteCore : this.materials.blackCore;

    const root = new THREE.Group();
    const body = new THREE.Group(); // animated for bobbing/lunging/levitating
    root.add(body);

    // Common tiered carved stone pedestal base
    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.12, 12), stoneMat);
    base1.position.y = 0.06;
    base1.castShadow = true;
    base1.receiveShadow = true;
    root.add(base1);

    const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.42, 0.06, 12), accentMat);
    baseRing.position.y = 0.15;
    baseRing.castShadow = true;
    root.add(baseRing);

    let weaponPivot = null;

    if (type === "p") {
      // PAWN: Armored Foot Sentinel with Shield & Sword
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.30, 0.48, 8), stoneMat);
      torso.position.y = 0.42;
      torso.castShadow = true;
      body.add(torso);

      const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 0.32), accentMat);
      pauldron.position.y = 0.62;
      pauldron.castShadow = true;
      body.add(pauldron);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.20, 10, 10), stoneMat);
      head.position.y = 0.84;
      head.castShadow = true;
      body.add(head);

      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.30), accentMat);
      crest.position.set(0, 1.0, 0);
      body.add(crest);

      // Glowing visor eyes
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.06), eyeMat);
      visor.position.set(0, 0.85, 0.18);
      body.add(visor);

      // Left shield
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.06, 6), accentMat);
      shield.rotation.x = Math.PI / 2;
      shield.rotation.z = 0.25;
      shield.position.set(-0.26, 0.48, 0.16);
      shield.castShadow = true;
      body.add(shield);

      // Right articulated sword arm
      weaponPivot = new THREE.Group();
      weaponPivot.position.set(0.28, 0.58, 0.05);
      const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.06), accentMat);
      hilt.position.set(0, 0.06, 0.12);
      weaponPivot.add(hilt);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46, 0.09), stoneMat);
      blade.position.set(0, 0.28, 0.12);
      blade.rotation.x = 0.35;
      blade.castShadow = true;
      weaponPivot.add(blade);
      body.add(weaponPivot);

    } else if (type === "r") {
      // ROOK: Hulking Crenellated Battlement Golem
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.46), stoneMat);
      legs.position.y = 0.38;
      legs.castShadow = true;
      body.add(legs);

      const chest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.52, 0.54), stoneMat);
      chest.position.y = 0.82;
      chest.castShadow = true;
      body.add(chest);

      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.50), accentMat);
      belt.position.y = 0.58;
      body.add(belt);

      // Fortress crown battlements + glowing furnace eyes
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.30, 0.32, 8), stoneMat);
      head.position.y = 1.22;
      head.castShadow = true;
      body.add(head);

      for (let i = 0; i < 4; i++) {
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), accentMat);
        const ang = (i * Math.PI) / 2 + Math.PI / 4;
        merlon.position.set(Math.cos(ang) * 0.22, 1.42, Math.sin(ang) * 0.22);
        body.add(merlon);
      }

      const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.06, 0.08), eyeMat);
      eyes.position.set(0, 1.22, 0.28);
      body.add(eyes);

      // Articulated siege-ram fists
      weaponPivot = new THREE.Group();
      weaponPivot.position.set(0, 0.95, 0);
      [-0.44, 0.44].forEach((ox) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.52, 0.24), stoneMat);
        arm.position.set(ox, -0.18, 0.12);
        arm.castShadow = true;
        const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.28), accentMat);
        knuckle.position.set(ox, -0.42, 0.16);
        weaponPivot.add(arm);
        weaponPivot.add(knuckle);
      });
      body.add(weaponPivot);

    } else if (type === "n") {
      // KNIGHT: Armored Warhorse & Lancer
      const mountBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.55, 8), stoneMat);
      mountBase.position.y = 0.44;
      mountBase.castShadow = true;
      body.add(mountBase);

      // Sculpted horse neck + snout + mane
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.62, 0.36), stoneMat);
      neck.position.set(0, 0.88, 0.06);
      neck.rotation.x = -0.28;
      neck.castShadow = true;
      body.add(neck);

      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.42), stoneMat);
      snout.position.set(0, 1.12, 0.26);
      snout.rotation.x = 0.35;
      snout.castShadow = true;
      body.add(snout);

      const chamfron = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.38), accentMat);
      chamfron.position.set(0, 1.19, 0.25);
      chamfron.rotation.x = 0.35;
      body.add(chamfron);

      // Glowing steed eyes
      [-0.11, 0.11].forEach((ex) => {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.08), eyeMat);
        eye.position.set(ex, 1.16, 0.18);
        body.add(eye);
      });

      // Couched Lance weapon pivot
      weaponPivot = new THREE.Group();
      weaponPivot.position.set(0.26, 0.72, 0);
      const lance = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.92, 6), accentMat);
      lance.rotation.x = Math.PI / 2 - 0.25;
      lance.position.set(0, 0.08, 0.32);
      lance.castShadow = true;
      weaponPivot.add(lance);
      body.add(weaponPivot);

    } else if (type === "b") {
      // BISHOP: Arcane High Cleric with Mitre & Crystal Staff
      const robe = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.92, 10), stoneMat);
      robe.position.y = 0.62;
      robe.castShadow = true;
      body.add(robe);

      const stole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.76, 0.42), accentMat);
      stole.position.set(0, 0.58, 0.04);
      body.add(stole);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 10), stoneMat);
      head.position.y = 1.14;
      head.castShadow = true;
      body.add(head);

      const mitre = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.38, 6), accentMat);
      mitre.position.y = 1.40;
      mitre.castShadow = true;
      body.add(mitre);

      const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.06), eyeMat);
      eyes.position.set(0, 1.14, 0.17);
      body.add(eyes);

      // Arcane Crozier Staff
      weaponPivot = new THREE.Group();
      weaponPivot.position.set(0.28, 0.72, 0.12);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.15, 6), accentMat);
      shaft.position.y = 0.15;
      shaft.castShadow = true;
      weaponPivot.add(shaft);

      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), eyeMat);
      orb.position.y = 0.78;
      weaponPivot.add(orb);
      body.add(weaponPivot);

    } else if (type === "q") {
      // QUEEN: Sorceress Empress with Crown, Winged Mantle & Arcane Scepter
      const gown = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.39, 0.96, 12), stoneMat);
      gown.position.y = 0.64;
      gown.castShadow = true;
      body.add(gown);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.22, 0.22, 10), accentMat);
      collar.position.y = 1.06;
      collar.castShadow = true;
      body.add(collar);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.20, 12, 12), stoneMat);
      head.position.y = 1.28;
      head.castShadow = true;
      body.add(head);

      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.18, 8), accentMat);
      crown.position.y = 1.46;
      body.add(crown);

      const crownGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), eyeMat);
      crownGem.position.set(0, 1.58, 0);
      body.add(crownGem);

      const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.06), eyeMat);
      eyes.position.set(0, 1.28, 0.18);
      body.add(eyes);

      // Royal Scepter
      weaponPivot = new THREE.Group();
      weaponPivot.position.set(0.30, 0.85, 0.14);
      const scepter = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), accentMat);
      scepter.position.y = 0.12;
      weaponPivot.add(scepter);
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), eyeMat);
      star.position.y = 0.72;
      weaponPivot.add(star);
      body.add(weaponPivot);

    } else if (type === "k") {
      // KING: High Sovereign with Great Mantle, Crown & Two-Handed Broadsword
      const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.41, 1.05, 10), stoneMat);
      robe.position.y = 0.68;
      robe.castShadow = true;
      body.add(robe);

      const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.22, 0.44), accentMat);
      shoulders.position.y = 1.12;
      shoulders.castShadow = true;
      body.add(shoulders);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), stoneMat);
      head.position.y = 1.38;
      head.castShadow = true;
      body.add(head);

      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.18, 8), accentMat);
      crown.position.y = 1.62;
      body.add(crown);

      // Royal Cross atop crown
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.07), accentMat);
      crossV.position.y = 1.78;
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.07), accentMat);
      crossH.position.y = 1.80;
      body.add(crossV);
      body.add(crossH);

      const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.06), eyeMat);
      eyes.position.set(0, 1.40, 0.15);
      body.add(eyes);

      // Broadsword held at the ready
      weaponPivot = new THREE.Group();
      weaponPivot.position.set(0, 1.02, 0.28);
      const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.08), accentMat);
      weaponPivot.add(crossguard);
      const greatsword = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.78, 0.04), stoneMat);
      greatsword.position.y = -0.40;
      greatsword.castShadow = true;
      weaponPivot.add(greatsword);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), eyeMat);
      gem.position.z = 0.04;
      weaponPivot.add(gem);
      body.add(weaponPivot);
    }

    // Face White pieces toward -Z (rank 8) and Black pieces toward +Z (rank 1)
    root.rotation.y = isWhite ? Math.PI : 0;
    root.userData = {
      type,
      color,
      body,
      weaponPivot,
      seed: Math.random() * Math.PI * 2
    };

    return root;
  }

  syncPiecesFromBoard() {
    // Clear existing piece meshes
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

  showMarkersForSquare(sq) {
    this.clearMarkers();
    if (!sq) return;

    const originPos = squareToWorld(sq);
    // Selection ring under active piece
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
        // Crimson battle target ring around enemy piece
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
        // Glowing arcane rune disc on legal empty square
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
      if (this.animating || !this.activeTab) return;
      if (this.chess.isGameOver()) return;
      if (this.mode === "ai" && this.chess.turn() !== this.playerColor) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Check squares and pieces
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
    // 1. If a square is already selected and `sq` is one of its legal destinations, execute move
    if (this.selectedSquare) {
      const matchingMoves = this.legalMovesForSelected.filter((m) => m.to === sq);
      if (matchingMoves.length > 0) {
        // Check if promotion move
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

    // 2. Otherwise, check if the clicked square contains a friendly piece
    const pieceOnSq = this.chess.get(sq);
    if (pieceOnSq && pieceOnSq.color === this.chess.turn()) {
      this.selectedSquare = sq;
      this.legalMovesForSelected = this.chess.moves({ square: sq, verbose: true });
      this.showMarkersForSquare(sq);
    } else {
      this.selectedSquare = null;
      this.legalMovesForSelected = [];
      this.clearMarkers();
    }
  }

  // ---------- Choreographed Move + Battle Chess Capture Sequence ----------
  async executeMove(moveObj) {
    this.animating = true;
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.clearMarkers();

    const fromSq = moveObj.from;
    const toSq = moveObj.to;
    const attackerMesh = this.pieceMeshes.get(fromSq);

    // Determine captured square (handles en-passant where victim is on [toFile, fromRank])
    const isEnPassant = moveObj.flags.includes("e");
    const victimSq = isEnPassant ? toSq[0] + fromSq[1] : toSq;
    const victimMesh = moveObj.captured ? this.pieceMeshes.get(victimSq) : null;

    // Commit move to chess.js state
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
      if (typeof BridgeProgression !== "undefined") {
        BridgeProgression.awardCoins(2, "wizard_chess_capture", {
          captured: result.captured
        });
      }
    } else if (attackerMesh) {
      await this.playSlideOrLeap(attackerMesh, fromSq, toSq, result.piece === "n");
    }

    // Handle castling rook slide
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

    // Update attacker mesh map & handle promotion sculpt swap
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

    this.notifyStateChange(result);

    if (this.chess.isGameOver()) {
      this.handleGameOver();
      this.animating = false;
      return;
    }

    // Trigger AI reply if in AI mode and it's now AI's turn
    if (this.mode === "ai" && this.chess.turn() !== this.playerColor) {
      setTimeout(() => this.playAIMove(), 260);
    } else {
      this.animating = false;
    }
  }

  playSlideOrLeap(mesh, fromSq, toSq, isJump) {
    return new Promise((resolve) => {
      const start = squareToWorld(fromSq);
      const end = squareToWorld(toSq);
      const duration = isJump ? 460 : 350;
      const t0 = performance.now();

      // Orient piece toward movement direction
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const targetRotY = Math.atan2(dx, dz);
      const defaultRotY = mesh.userData.color === "w" ? Math.PI : 0;

      this.audio.playSlide();
      this.spawnDustTrail(new THREE.Vector3(start.x, 0.05, start.z));

      const step = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        mesh.position.x = start.x + dx * ease;
        mesh.position.z = start.z + dz * ease;
        mesh.position.y = isJump ? Math.sin(p * Math.PI) * 0.95 : 0;
        mesh.rotation.y = targetRotY;

        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          mesh.position.set(end.x, 0, end.z);
          mesh.rotation.y = defaultRotY;
          this.spawnDustTrail(new THREE.Vector3(end.x, 0.05, end.z));
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

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

      const isRangedCaster =
        attacker.userData.type === "b" || attacker.userData.type === "q";

      // Optional dynamic Battle Cam zoom toward the duel
      if (this.battleCamEnabled) {
        this.focusBattleCamera(
          new THREE.Vector3((start.x + victimPos.x) * 0.5, 0.6, (start.z + victimPos.z) * 0.5)
        );
      }

      attacker.rotation.y = attackAngle;
      victim.rotation.y = attackAngle + Math.PI;

      // Stop 0.85 units short of victim for melee strike, or cast from mid-stride for casters
      const stopDist = isRangedCaster ? Math.max(0, dist * 0.35) : Math.max(0, dist - 0.82);
      const strikeX = start.x + dirX * stopDist;
      const strikeZ = start.z + dirZ * stopDist;

      const approachMs = 340;
      const windupMs = 260;
      const strikeMs = 180;
      const settleMs = 340;
      const totalMs = approachMs + windupMs + strikeMs + settleMs;
      const t0 = performance.now();

      let beamMesh = null;
      let shattered = false;

      this.audio.playSlide();
      if (isRangedCaster) {
        setTimeout(() => this.audio.playSpellCharge(), approachMs * 0.6);
      }

      const tick = (now) => {
        const elapsed = now - t0;

        if (elapsed < approachMs) {
          // Phase 1: Advance to strike position
          const p = elapsed / approachMs;
          const ease = 1 - Math.pow(1 - p, 2);
          attacker.position.x = start.x + (strikeX - start.x) * ease;
          attacker.position.z = start.z + (strikeZ - start.z) * ease;
          if (attacker.userData.type === "n") {
            attacker.position.y = Math.sin(p * Math.PI) * 0.65;
          } else if (isRangedCaster) {
            attacker.position.y = ease * 0.28;
          }
        } else if (elapsed < approachMs + windupMs) {
          // Phase 2: Wind up weapon or charge spell staff
          const p = (elapsed - approachMs) / windupMs;
          if (attacker.userData.weaponPivot) {
            attacker.userData.weaponPivot.rotation.x = -p * 1.15;
          }
          attacker.userData.body.position.y = p * 0.12;
          // Victim trembles under imminent strike
          victim.position.x = victimPos.x + (Math.random() - 0.5) * 0.04 * p;
          victim.position.z = victimPos.z + (Math.random() - 0.5) * 0.04 * p;
        } else if (elapsed < approachMs + windupMs + strikeMs) {
          // Phase 3: Cleave / Lunge / Arcane Beam Impact!
          const p = (elapsed - approachMs - windupMs) / strikeMs;

          if (isRangedCaster) {
            if (!beamMesh) {
              beamMesh = this.createArcaneBeam(
                new THREE.Vector3(strikeX, 1.1, strikeZ),
                new THREE.Vector3(victimPos.x, 0.65, victimPos.z),
                attacker.userData.color === "w" ? 0xffb84d : 0xc864ff
              );
              this.scene.add(beamMesh);
            }
          } else if (attacker.userData.weaponPivot) {
            attacker.userData.weaponPivot.rotation.x = -1.15 + p * 2.35;
          }

          if (p >= 0.45 && !shattered) {
            shattered = true;
            this.shatterVictimPiece(
              victim,
              new THREE.Vector3(victimPos.x, 0, victimPos.z),
              new THREE.Vector3(dirX, 0.35, dirZ),
              attacker.userData.color
            );
            this.pieceMeshes.delete(victimSq);
            this.scene.remove(victim);
            this.cameraShake = 0.26;
            this.audio.playShatter();
          }
        } else if (elapsed < totalMs) {
          // Phase 4: Claim the conquered square
          if (beamMesh) {
            this.scene.remove(beamMesh);
            beamMesh = null;
          }
          const p = (elapsed - approachMs - windupMs - strikeMs) / settleMs;
          const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          attacker.position.x = strikeX + (end.x - strikeX) * ease;
          attacker.position.z = strikeZ + (end.z - strikeZ) * ease;
          attacker.position.y = isRangedCaster ? (1 - ease) * 0.28 : 0;
          attacker.userData.body.position.y = (1 - ease) * 0.12;
          if (attacker.userData.weaponPivot) {
            attacker.userData.weaponPivot.rotation.x = (1 - ease) * 1.2;
          }
        } else {
          if (beamMesh) this.scene.remove(beamMesh);
          attacker.position.set(end.x, 0, end.z);
          attacker.userData.body.position.y = 0;
          if (attacker.userData.weaponPivot) {
            attacker.userData.weaponPivot.rotation.set(0, 0, 0);
          }
          attacker.rotation.y = defaultRotY;
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

  createArcaneBeam(fromVec, toVec, hexColor) {
    const dir = new THREE.Vector3().subVectors(toVec, fromVec);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(0.06, 0.11, len, 8);
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

  // ---------- Rigid-Body Voronoi / Chunk Stone Shatter Physics ----------
  shatterVictimPiece(victimMesh, worldPos, impactDir, attackerColor) {
    const isWhiteVictim = victimMesh.userData.color === "w";
    const stoneMat = isWhiteVictim ? this.materials.whitePiece : this.materials.blackPiece;
    const coreMat = isWhiteVictim ? this.materials.whiteCore : this.materials.blackCore;

    const shardCount = 34;
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
      const mat = i % 6 === 0 ? coreMat : stoneMat;
      const shard = new THREE.Mesh(geo, mat);

      const h = 0.12 + Math.random() * 1.1;
      const spreadX = (Math.random() - 0.5) * 0.45;
      const spreadZ = (Math.random() - 0.5) * 0.45;
      shard.position.set(worldPos.x + spreadX, h, worldPos.z + spreadZ);
      shard.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      shard.castShadow = true;

      const speed = 2.2 + Math.random() * 3.8;
      const vel = new THREE.Vector3(
        impactDir.x * speed * 0.85 + (Math.random() - 0.5) * 3.4,
        2.0 + Math.random() * 3.8,
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

    // Impact spell/ember burst
    this.spawnSpellBurst(
      new THREE.Vector3(worldPos.x, 0.55, worldPos.z),
      attackerColor === "w" ? 0xffb347 : 0xc864ff,
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
      4.2,
      targetCenter.z + sideSign * 4.4
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

  // ---------- Chess AI Engine (Minimax + Alpha-Beta + PST) ----------
  playAIMove() {
    if (this.chess.isGameOver()) {
      this.animating = false;
      return;
    }
    const move = this.chooseBestAIMove();
    if (!move) {
      this.animating = false;
      return;
    }
    this.executeMove(move);
  }

  chooseBestAIMove() {
    const legal = this.chess.moves({ verbose: true });
    if (legal.length === 0) return null;

    // Difficulty 1 (Apprentice): Depth 1 + tactical noise
    if (this.aiDifficulty === 1) {
      let best = legal[0];
      let bestScore = -Infinity;
      const aiTurn = this.chess.turn();
      for (const mv of legal) {
        this.chess.move(mv);
        const s =
          (aiTurn === "w" ? 1 : -1) * this.evaluateBoard() + (Math.random() - 0.5) * 110;
        this.chess.undo();
        if (s > bestScore) {
          bestScore = s;
          best = mv;
        }
      }
      return best;
    }

    // Difficulty 2 (Archmage: depth 2) & Difficulty 3 (Oracle: depth 3 + capture ordering)
    const depth = this.aiDifficulty === 3 ? 3 : 2;
    const aiColor = this.chess.turn();

    // Order captures and promotions first for faster alpha-beta pruning
    legal.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));

    let bestMove = legal[0];
    let bestVal = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const mv of legal) {
      this.chess.move(mv);
      const val = -this.negamax(depth - 1, -beta, -alpha, aiColor === "w" ? -1 : 1);
      this.chess.undo();
      // Slight tie-breaker jitter so AI varies openings
      const jittered = val + (Math.random() - 0.5) * 6;
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

  evaluateBoard() {
    if (this.chess.isCheckmate()) {
      return this.chess.turn() === "w" ? -99999 : 99999;
    }
    if (this.chess.isDraw()) return 0;

    const board = this.chess.board();
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

  // ---------- Game Controls & State Callbacks ----------
  newGame(options = {}) {
    if (options.mode) this.mode = options.mode;
    if (options.aiDifficulty) this.aiDifficulty = Number(options.aiDifficulty);
    if (options.playerColor) this.playerColor = options.playerColor;

    this.chess.reset();
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.capturedCounts = { w: [], b: [] };
    this.animating = false;
    this.clearMarkers();

    // Clear leftover shards
    for (const s of this.shards) {
      this.scene.remove(s.mesh);
    }
    this.shards.length = 0;

    this.syncPiecesFromBoard();
    this.setCameraPreset(this.playerColor === "w" ? "white" : "black");
    this.notifyStateChange(null);

    if (this.mode === "ai" && this.playerColor === "b") {
      this.animating = true;
      setTimeout(() => this.playAIMove(), 450);
    }
  }

  undoLastRound() {
    if (this.animating) return;
    if (this.mode === "ai") {
      this.chess.undo();
      this.chess.undo();
    } else {
      this.chess.undo();
    }
    this.selectedSquare = null;
    this.clearMarkers();
    this.syncPiecesFromBoard();
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
        const reward =
          this.aiDifficulty === 3 ? 100 : this.aiDifficulty === 2 ? 60 : 35;
        BridgeProgression.awardCoins(reward, "wizard_chess_victory", {
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

    // 2. Subtle breathing idle animation on living stone statues
    for (const [, piece] of this.pieceMeshes) {
      if (!this.animating && piece.userData.body) {
        const s = piece.userData.seed || 0;
        piece.userData.body.position.y = Math.sin(now * 0.0028 + s) * 0.018;
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

    // 4. Update rigid-body stone shatter fragments
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const sh = this.shards[i];
      sh.age += dt;
      if (sh.age >= sh.maxAge) {
        this.scene.remove(sh.mesh);
        this.shards.splice(i, 1);
        continue;
      }
      // Gravity
      sh.vel.y -= 11.5 * dt;
      sh.mesh.position.addScaledVector(sh.vel, dt);
      sh.mesh.rotation.x += sh.angVel.x * dt;
      sh.mesh.rotation.y += sh.angVel.y * dt;
      sh.mesh.rotation.z += sh.angVel.z * dt;

      // Floor collision bounce on the marble board
      if (sh.mesh.position.y < sh.halfH) {
        sh.mesh.position.y = sh.halfH;
        sh.vel.y = Math.abs(sh.vel.y) * 0.36;
        sh.vel.x *= 0.72;
        sh.vel.z *= 0.72;
        sh.angVel.multiplyScalar(0.68);
      }

      // Sink gently into stone at end of life
      if (sh.age > sh.maxAge - 0.75) {
        sh.mesh.position.y -= dt * 0.25;
      }
    }

    // 5. Update dust & spell particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.age += dt;
      if (pt.age >= pt.maxAge) {
        this.scene.remove(pt.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      pt.mesh.position.addScaledVector(pt.vel, dt);
      pt.mesh.material.opacity = Math.max(0, 1 - pt.age / pt.maxAge);
      pt.mesh.rotation.x += 0.08;
      pt.mesh.rotation.y += 0.08;
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
