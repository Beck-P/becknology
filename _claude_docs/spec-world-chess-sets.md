# Spec: World-Unlockable & Purchasable 3D Chess Sets (`apps/chess/` ↔ `apps/bridge/`)

**Status:** All 5 World Chess Sets (30 unique Blender-sculpted 3D models + 5 custom 3D board environments) are built and playable now in `/chess/`. Progression gating & Space Hub shop unlocking are planned for a future pass.

---

## 1. Vision & Core Loop
Each major destination in the Becknology Space Hub (`apps/bridge/`) has its own signature **3D Wizard Chess Set & Realm** — complete with bespoke 3D piece silhouettes, world-themed board architecture, animated corner monuments, and cohesive per-piece-class tonal palettes.

In the future progression update:
1. **Default Starter Set**: Players begin with **`classic` (Wizard's Tower — Gothic Hearthstone)** unlocked by default.
2. **World Discovery Unlock / Shop Availability**: Flying to a world in the Space Hub (`Lumar`, `Arcadia`, `Enigma Station`, `The Singularity`) and docking at its port unlocks that world's signature Chess Set for purchase (or grants a schematic blueprint).
3. **Coin Purchase / Crafting**: Players spend coins (`BridgeProgression`) earned from beating high-ELO Stockfish Oracles in Wizard Chess or completing games across the Becknology universe to purchase/unlock each world's Chess Set and board branding.

---

## 2. The 5 World Chess Sets (`apps/chess/assets/wizard-pieces.glb`)

All 30 models are generated procedurally via Blender (`tools/chess-art/build_wizard_pieces.py`) and exported into `apps/chess/assets/wizard-pieces.glb` under `piece_<world>_<class>`:

| World ID | Realm Name | Piece Sculpt Designs (Pawn / Rook / Knight / Bishop / Queen / King) | 3D Board & World Architecture (`rebuildWorldScenery`) | Planned Unlock Condition | Planned Coin Price |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `classic` | **Wizard's Tower** *(Gothic Hearthstone)* | Sallet Pikeman · 4-Turret Castle Golem · Rearing Destrier Warhorse · Mitred Cathedral Bishop · 18-Feather Seraph Queen · Imperial Cross-Crown King | Carved stone buttresses, inlaid brass sanctuary ring, 4 flickering hearthfire braziers | Default Starter Set | Free (Starter) |
| `lumar` | **Lumar** *(Abyssal Tides & Kraken)* | Conch-Helmet Diver · Kraken-Wrapped Lighthouse Rook · Hippocampus Sea-Stallion · Nautilus Tide-Priest · Manta-Fin Siren Empress · Leviathan Anchor-Blade King | Glowing emerald-teal sea water moat with gentle waves, bronze seawall rim, 4 striped coastal lighthouses with sweeping volumetric beacon cones | Visit **Lumar** in `/bridge/` + Purchase at Lumar Harbor | `1,500 🪙` |
| `arcadia` | **Arcadia** *(Neon Synth-Mech Grid)* | Cyber-Enforcer Droid · Tank-Tread Railgun Bastion · Light-Cycle Cyber-Steed · Netrunner Holo-Hacker · Laser-Wing Valkyrie-X · Overlord Prime Mecha-King | 3D neon synthwave laser grid, cyan perimeter light-rails, 4 hexagonal cyber-pylons with spinning holographic octahedron cores | Visit **Arcadia** in `/bridge/` + Purchase at Arcade Prize Vault | `2,500 🪙` |
| `enigma` | **Enigma Station** *(Deep-Space Outpost)* | EVA Security Construct · Solar-Wing Radar Relay Rook · Zero-G Thruster Strider · Gyro-Ring AI Conduit · Diamond Solar-Array Overseer · Sovereign Station Core King | Sub-board rotating reactor ring with glowing telemetry nodes, 4 corner deep-space comms masts with sweeping parabolic radar dishes | Dock at **Enigma Station** in `/bridge/` + Solve Station Cipher / Purchase | `4,000 🪙` |
| `singularity` | **The Singularity** *(Event Horizon)* | Void-Shard Obelisk Acolyte · Nested Tesseract Gravity Pillar · Astral Rift-Stallion · Armillary Astrolabe Oracle · Crescent Eclipse Nova Seraph · Accretion-Crown Architect King | Two colossal tilted precessing accretion disk rings encircling the board, 4 levitating obsidian void monoliths with orbiting gold tesseract rings | Reach **The Singularity** in `/bridge/` or defeat Supreme Oracle (Tier VI) | `7,500 🪙` |

---

## 3. Cohesive Per-Piece-Class Color Variations (`CLASS_TONE_SHIFTS`)
To ensure pieces are immediately distinguishable during fast tactical play without breaking the visual identity of a world theme with off-brand rainbow colors:
- Every theme defines a cohesive **Light Legion** and **Dark Legion** material palette (`wStone`, `wCloth`, `wTrim`, `wMetal`, `wGem` and `bStone`, `bCloth`, `bTrim`, `bMetal`, `bGem`).
- `CLASS_TONE_SHIFTS` in `apps/chess/wizard-chess.js` applies subtle, harmonious HSL shifts (`dh`, `ds`, `dl`) across the 6 piece classes (`p`, `r`, `n`, `b`, `q`, `k`), progressively enriching saturation and luminance from Pawn up to Queen and King while staying 100% within the world's signature color family.

---

## 4. Future Implementation Hook (`BridgeProgression`)
When ready to enable progression gating:
1. Add `unlockedChessSets: ["classic"]` and `discoveredWorlds: ["classic"]` to `BridgeProgression` state in `shared/progression.js`.
2. When a player visits Lumar (`/lumar/`), Arcadia (`/arcadia/`), Enigma Station, or The Singularity in `/bridge/`, record `BridgeProgression.discoverWorld(worldId)`.
3. In `/chess/`, render a lock/price badge next to locked themes in `#wc-theme` (or a visual "World Vault" modal) allowing players to spend coins via `BridgeProgression.spendCoins(cost, "unlock_chess_set_" + worldId)` to permanently unlock the set.
