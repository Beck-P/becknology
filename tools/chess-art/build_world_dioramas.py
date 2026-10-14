"""Build 5 Complete Blender 3D World Dioramas & Board Landscapes for Wizard Chess 3D.

Each diorama (`diorama_classic`, `diorama_lumar`, `diorama_arcadia`, `diorama_enigma`, `diorama_singularity`)
is authored in Blender using the exact world palettes, landmarks, buildings, and props from `apps/bridge/CLAUDE.md`
and `apps/bridge/PNG-PROMPTS.md`:

  1. `diorama_classic` (Wizard's Tower / Sorceress's Sanctum):
     - Gothic stone bridge & sanctuary plinth with arched under-vaults and staircases
     - 5-Story Circular Sorceress's Tower (`sorceress-tower.png`) with purple conical roof, iron balconies & glowing windows
     - 4-Story Stone Bell Tower (`bell-tower.png`) with hanging bronze bell & pyramidal slate roof
     - Sleeping Red Dragon curled around a gold & ruby hoard on a cavern ledge (`dragon.png`)
     - 4 Levitating Crystal Altars (`tower.js` `drawCrystalAltar`) with floating faceted purple crystals & wax candles

  2. `diorama_lumar` (Lumar Port & The Shimmering Emerald Spore Sea — `lumar.js`):
     - Saltstone quay & heavy warm-wood harbor pier rising from the 3D Emerald Spore Sea (`#1a4030` / `#2a7050` / `#90e0a8`)
     - Full 3-Masted Wooden Sailing Galleon (`ship-dock.png`) moored along the east pier with glowing portholes, 3 masts, furled sails, ship's wheel, captain's cabin & gangway
     - Lumar Cliffside Harbor Village on the west & north quays: Seaside Tavern (`tavern.png`), Inn (`inn.png`), Half-Timbered Bakery (`bakery.png`), Leaning Witchy Apothecary (`apothecary.png`) & Fishmonger's Stall (`fishmonger-stall.png`)
     - Tall Lumar Coastal Lighthouse (`lighthouse.png`) on a rocky headland with sweeping volumetric beacon cones
     - Breaching Kraken Tentacles & moored harbor rowboat in the emerald spore waves

  3. `diorama_arcadia` (Arcadia Neon Cyberpunk Street & Arcade Plaza — `arcadia.js`):
     - Dark-metal & purple-slate cyberpunk street plaza with hot-pink (`#e870c0`) & electric-cyan (`#5cc8d0`) neon curb tubes and subterranean synthwave laser grid
     - Flagship "ARCADIA" Video Arcade Building (`arcade.png`) at North Center with curved hot-pink/cyan neon marquee, glowing yellow display windows, recessed entrance arch & roof HVAC units
     - Cyber Noodle Bar (`cyber-noodle-bar.png`) & Neon Ramen Stand (`neon-ramen-stand.png`) with cyan canopy, red lantern, stools & row of 5 Upright 3D Retro Arcade Cabinets
     - Chrome Clinic (`chrome-clinic.png`), Tech Repair Shop (`tech-repair-shop.png`), Parked Hover-Bike in Charging Dock (`hover-bike-dock.png`), Holo-Billboard Kiosk & Token Kiosk

  4. `diorama_enigma` (Enigma Station Deep-Space Intelligence Outpost — `enigma.js` & `bridge.js`):
     - Octagonal orbital steel command deck with glowing cyan chevron corridor walkways (`drawCorridorFloor`) & sub-deck rotating cryo-reactor ring
     - 8 Blinking Mainframe Server Racks (`drawServerRack`) with emerald (`#40e080`), coral-red (`#e06040`), amber (`#e8c040`) & cyan (`#40a8e0`) LED banks
     - Signal Relay Comms Consoles, Cipher Room Airlock Blast Door & Holographic Star-Map Projector
     - Deep-space hex-truss booms with 8 Giant Multi-Panel Solar Array Wings, 4 Sweeping Parabolic Radar Towers & 2 Orbiting Recon Drones

  5. `diorama_singularity` (The Singularity Cosmic Anomaly & Shattered Void — `singularity.js`):
     - Fractured obsidian-violet floating stone platform (`#2a2040` / `#1a1430`) with glowing violet fissure cracks (`#a080e0`) & inverted under-spire
     - Colossal Black Hole Event Horizon Core (`#050510`) with blinding white-lavender photon ring (`#d0c0ff`) & tilted swirling accretion disks
     - 3 Giant Precessing Gravitational Lensing Rings encircling the entire scene
     - Archipelago of 10 Levitating Shattered Void Islands sprouting clusters of glowing purple/lavender Void Crystals (`#503090` / `#8060c0` / `#c0a0f0`) & ruined astral portal arches
"""
import math
import bpy
import bmesh
from mathutils import Vector, Euler


def srgb_to_linear(c):
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def hex_rgb(hex_str):
    h = hex_str.lstrip("#")
    r = int(h[0:2], 16) / 255.0
    g = int(h[2:4], 16) / 255.0
    b = int(h[4:6], 16) / 255.0
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b))


_MAT_CACHE = {}


def world_mat(name, hex_color, metallic=0.1, roughness=0.55, emit_hex=None, emit_strength=0.0):
    if name in _MAT_CACHE:
        return _MAT_CACHE[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        rgb = hex_rgb(hex_color)
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if emit_hex and "Emission Color" in bsdf.inputs:
            ergb = hex_rgb(emit_hex)
            bsdf.inputs["Emission Color"].default_value = (*ergb, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emit_strength
    _MAT_CACHE[name] = m
    return m


# ==============================================================================
# DIORAMA 1: WIZARD'S TOWER / SORCERESS'S SANCTUM (`diorama_classic`)
# ==============================================================================
def build_diorama_classic(scene, helpers):
    add_box = helpers["add_box"]
    add_cone = helpers["add_cone"]
    add_icosphere = helpers["add_icosphere"]
    add_torus_ring = helpers["add_torus_ring"]
    finalize_mesh = helpers["finalize_mesh"]

    root = bpy.data.objects.new("diorama_classic", None)
    root.location = (0, 0, 0)
    scene.collection.objects.link(root)

    # Exact Tower & Dragon palette from tower.js, assets_lumar.py & PNG-PROMPTS.md
    m_stone_dk = world_mat("classic_stone_dk", "#1a1430", metallic=0.08, roughness=0.68)
    m_stone_md = world_mat("classic_stone_md", "#2a2040", metallic=0.08, roughness=0.62)
    m_stone_hi = world_mat("classic_stone_hi", "#3a3450", metallic=0.10, roughness=0.55)
    m_slate_purple = world_mat("classic_roof_purple", "#3a1860", metallic=0.12, roughness=0.48)
    m_slate_blue = world_mat("classic_roof_slate", "#2a3548", metallic=0.12, roughness=0.50)
    m_wood = world_mat("classic_wood", "#5a3a1a", metallic=0.06, roughness=0.65)
    m_iron = world_mat("classic_iron", "#1e1e26", metallic=0.72, roughness=0.35)
    m_brass = world_mat("classic_brass", "#d0a048", metallic=0.78, roughness=0.26)
    m_gold = world_mat("classic_gold", "#f0c850", metallic=0.88, roughness=0.20, emit_hex="#c08820", emit_strength=0.25)
    m_win_purple = world_mat("classic_win_purple", "#a064f0", metallic=0.05, roughness=0.2, emit_hex="#a064f0", emit_strength=2.2)
    m_win_warm = world_mat("classic_win_warm", "#ffe080", metallic=0.05, roughness=0.2, emit_hex="#ffb040", emit_strength=2.4)
    m_crystal = world_mat("classic_crystal", "#9870e8", metallic=0.15, roughness=0.18, emit_hex="#8050d8", emit_strength=1.8)
    m_dragon = world_mat("classic_dragon_red", "#9e2020", metallic=0.18, roughness=0.42)
    m_horn = world_mat("classic_dragon_horn", "#e8dcc0", metallic=0.10, roughness=0.38)
    m_fire = world_mat("classic_fire", "#ffb040", metallic=0.0, roughness=0.1, emit_hex="#ff9a20", emit_strength=3.2)

    bm_stone_dk = bmesh.new()
    bm_stone_md = bmesh.new()
    bm_stone_hi = bmesh.new()
    bm_roof_p = bmesh.new()
    bm_roof_s = bmesh.new()
    bm_wood = bmesh.new()
    bm_iron = bmesh.new()
    bm_brass = bmesh.new()
    bm_gold = bmesh.new()
    bm_win_p = bmesh.new()
    bm_win_w = bmesh.new()
    bm_dragon = bmesh.new()
    bm_horn = bmesh.new()

    # 1. Custom Stepped Gothic Sanctuary Plinth & Under-Bridge Vaults around the 8x8 board
    add_box(bm_stone_dk, (10.4, 10.4, 0.45), center=(0, 0, -0.58), bevel_amt=0.06)
    add_box(bm_stone_md, (9.6, 9.6, 0.34), center=(0, 0, -0.36), bevel_amt=0.04)
    add_cone(bm_stone_dk, 6.2, 2.4, 2.2, segments=8, center=(0, 0, -1.85))
    # Brass runic border inlay around the board
    for side in (-1, 1):
        add_box(bm_brass, (9.1, 0.14, 0.12), center=(0, side * 4.52, -0.16))
        add_box(bm_brass, (0.14, 9.1, 0.12), center=(side * 4.52, 0, -0.16))
    # Grand stone staircases on North (+Y) and South (-Y)
    for sy in (-1, 1):
        for step in range(5):
            sw = 2.8 + step * 0.22
            sy_pos = sy * (4.95 + step * 0.38)
            sz_pos = -0.26 - step * 0.14
            add_box(bm_stone_hi, (sw, 0.40, 0.18), center=(0, sy_pos, sz_pos), bevel_amt=0.02)
        for sx in (-1, 1):
            add_box(bm_stone_md, (0.36, 2.1, 0.55), center=(sx * 1.65, sy * 5.7, -0.45), rot_euler=(sy * -0.25, 0, 0))

    # 2. North-West Landmark: The 5-Story Circular Sorceress's Tower (`sorceress-tower.png`)
    tx, ty = -6.5, 6.2
    add_cone(bm_stone_dk, 1.75, 1.55, 0.8, segments=16, center=(tx, ty, -0.4))
    add_cone(bm_stone_md, 1.42, 1.18, 4.4, segments=16, center=(tx, ty, 2.1))
    # Twisting black-iron balconies on each story
    for floor_i in range(4):
        fz = 0.8 + floor_i * 1.05
        r_fl = 1.40 - floor_i * 0.05
        add_torus_ring(bm_iron, r_fl, 0.06, seg_major=16, seg_minor=6, center=(tx, ty, fz))
        # Glowing flat-purple arched windows (`sorceress-tower.png`)
        ang = -0.65 + floor_i * 0.25
        wx = tx + math.sin(ang) * (r_fl - 0.05)
        wy = ty - math.cos(ang) * (r_fl - 0.05)
        add_box(bm_win_p, (0.28, 0.12, 0.52), center=(wx, wy, fz + 0.38), rot_euler=(0, 0, ang))
    # Conical purple-tiled roof + iron star spire
    add_cone(bm_roof_p, 1.58, 0.04, 1.95, segments=16, center=(tx, ty, 5.25))
    add_cone(bm_iron, 0.05, 0.01, 0.75, segments=6, center=(tx, ty, 6.55))
    add_icosphere(bm_win_p, 0.14, subdivisions=1, center=(tx, ty, 6.95))
    # Ornate iron-banded oak door at tower base
    add_box(bm_wood, (0.55, 0.18, 0.82), center=(tx + 0.85, ty - 0.95, 0.35), rot_euler=(0, 0, 0.7))
    add_box(bm_iron, (0.58, 0.20, 0.06), center=(tx + 0.85, ty - 0.95, 0.50), rot_euler=(0, 0, 0.7))

    # 3. North-East Landmark: The 4-Story Stone Bell Tower (`bell-tower.png`)
    bx, by = 6.5, 6.2
    add_box(bm_stone_dk, (2.5, 2.5, 0.9), center=(bx, by, -0.35), bevel_amt=0.05)
    add_box(bm_stone_md, (2.1, 2.1, 3.6), center=(bx, by, 1.85), bevel_amt=0.04)
    # Corner stone pilasters & belfry pillars
    for cx_s in (-0.88, 0.88):
        for cy_s in (-0.88, 0.88):
            add_box(bm_stone_hi, (0.36, 0.36, 1.15), center=(bx + cx_s, by + cy_s, 4.15))
    # Large hanging Bronze Bell inside the top belfry (`bell-tower.png`)
    add_box(bm_wood, (1.8, 0.22, 0.22), center=(bx, by, 4.55))
    add_cone(bm_brass, 0.52, 0.22, 0.68, segments=14, center=(bx, by, 4.12))
    add_icosphere(bm_gold, 0.14, subdivisions=1, center=(bx, by, 3.75))
    # Narrow vertical warm-yellow window slits on lower floors
    for fz in (1.1, 2.1, 3.0):
        add_box(bm_win_w, (0.18, 0.12, 0.52), center=(bx, by - 1.04, fz))
        add_box(bm_win_w, (0.12, 0.18, 0.52), center=(bx - 1.04, by, fz))
    # Pyramidal dark-slate roof + iron spire
    add_cone(bm_roof_s, 1.85, 0.04, 1.65, segments=4, center=(bx, by, 5.52), rot_euler=(0, 0, math.pi / 4))
    add_cone(bm_iron, 0.05, 0.01, 0.65, segments=6, center=(bx, by, 6.60))

    # 4. North Center: Gothic Cloister Bridge & Arcane Rose Window connecting the towers
    add_box(bm_stone_dk, (9.6, 1.1, 1.8), center=(0, 6.4, 0.45), bevel_amt=0.04)
    for col_x in (-3.6, -1.8, 0.0, 1.8, 3.6):
        add_box(bm_stone_hi, (0.42, 1.25, 2.45), center=(col_x, 6.4, 0.85), bevel_amt=0.02)
    # Central Gothic gable & Rose Window
    add_cone(bm_stone_md, 1.9, 0.1, 1.8, segments=4, center=(0, 6.4, 2.65), rot_euler=(0, 0, math.pi / 4), scale=(1.2, 0.45, 1.0))
    add_torus_ring(bm_brass, 0.72, 0.07, seg_major=16, seg_minor=6, center=(0, 5.82, 2.15), rot_euler=(math.pi / 2, 0, 0))
    add_cone(bm_win_p, 0.68, 0.68, 0.08, segments=16, center=(0, 5.84, 2.15), rot_euler=(math.pi / 2, 0, 0))

    # 5. East Ledge (`x=+6.8, y=-0.4`): The Sleeping Red Dragon & Gold Hoard (`dragon.png`)!
    dx, dy = 6.7, -0.4
    add_cone(bm_stone_dk, 2.3, 1.8, 0.75, segments=10, center=(dx, dy, -0.35), scale=(1.0, 1.35, 1.0))
    # Mound of gold coins & treasure hoard
    for gx, gy, gz, gr in ((0.0, 0.0, 0.15, 0.95), (-0.4, 0.45, 0.12, 0.68), (0.35, -0.5, 0.12, 0.72), (-0.2, -0.3, 0.28, 0.58)):
        add_icosphere(bm_gold, gr, subdivisions=1, center=(dx + gx, dy + gy, gz), scale=(1.1, 1.2, 0.42))
    # Treasure chest in the hoard
    add_box(bm_wood, (0.62, 0.42, 0.36), center=(dx - 0.55, dy - 0.65, 0.28), rot_euler=(0, 0, 0.4))
    add_box(bm_brass, (0.66, 0.45, 0.08), center=(dx - 0.55, dy - 0.65, 0.42), rot_euler=(0, 0, 0.4))
    # Sleeping Crimson Dragon curled around the hoard (`dragon.png`)
    for seg_i in range(9):
        t = seg_i / 8.0
        ang = -0.8 + t * 3.6
        rad = 0.95 - t * 0.25
        sx_d = dx + math.cos(ang) * rad * 0.85
        sy_d = dy + math.sin(ang) * rad * 1.15
        sz_d = 0.38 + math.sin(t * math.pi) * 0.18
        r_body = 0.38 * (1.0 - t * 0.55)
        add_icosphere(bm_dragon, r_body, subdivisions=1, center=(sx_d, sy_d, sz_d), scale=(1.1, 1.1, 0.82))
        # Dorsal spine spikes
        add_cone(bm_horn, r_body * 0.28, 0.01, r_body * 0.75, segments=5, center=(sx_d, sy_d, sz_d + r_body * 0.75))
    # Dragon head resting on front of hoard + curved bone horns + folded wings
    hx, hy, hz = dx - 0.62, dy - 0.05, 0.48
    add_box(bm_dragon, (0.58, 0.36, 0.28), center=(hx, hy, hz), rot_euler=(0.1, -0.15, -0.35), bevel_amt=0.04)
    for hs in (-1, 1):
        add_cone(bm_horn, 0.06, 0.01, 0.52, segments=6, center=(hx + 0.18, hy + hs * 0.16, hz + 0.22), rot_euler=(hs * 0.25, 0.95, 0))
    # Folded dragon wings
    for ws in (-1, 1):
        add_cone(bm_dragon, 0.55, 0.08, 1.25, segments=5, center=(dx + 0.25, dy + ws * 0.42, 0.72), rot_euler=(ws * 0.4, 0.85, 0), scale=(0.35, 1.2, 1.0))

    # 6. West Arcane Terrace (`x=-6.7, y=-0.4`): Stone Library Ruins & Crystal Altar Sanctum
    wx_t, wy_t = -6.7, -0.4
    add_cone(bm_stone_dk, 2.2, 1.7, 0.75, segments=8, center=(wx_t, wy_t, -0.35), scale=(1.0, 1.35, 1.0))
    for arch_i in (-1, 0, 1):
        ay = wy_t + arch_i * 1.15
        add_box(bm_stone_hi, (0.38, 0.38, 1.85), center=(wx_t - 0.65, ay, 0.85))
    add_box(bm_stone_md, (0.48, 2.75, 0.32), center=(wx_t - 0.65, wy_t, 1.88))
    # Wax candles & spellbooks on the West altar table
    add_box(bm_stone_hi, (0.95, 1.45, 0.52), center=(wx_t + 0.25, wy_t, 0.22), bevel_amt=0.03)
    for cy_c in (-0.45, 0.45):
        add_cone(bm_horn, 0.06, 0.05, 0.28, segments=8, center=(wx_t + 0.25, wy_t + cy_c, 0.58))
        add_icosphere(bm_win_w, 0.05, subdivisions=1, center=(wx_t + 0.25, wy_t + cy_c, 0.76))

    # 7. Four Corner Hearth Braziers & Stepped Crystal Altars (`drawCrystalAltar` in `tower.js`)
    bm_crystals_bob = bmesh.new()
    bm_flames_bob = bmesh.new()
    for cx, cy in ((-4.85, -4.85), (4.85, -4.85), (-4.85, 4.85), (4.85, 4.85)):
        add_cone(bm_brass, 0.36, 0.26, 0.42, segments=8, center=(cx, cy, 0.16))
        add_cone(bm_stone_dk, 0.20, 0.38, 0.24, segments=8, center=(cx, cy, 0.44))
        add_cone(bm_flames_bob, 0.22, 0.02, 0.48, segments=7, center=(cx, cy, 0.72))

    # Levitating stepped diamond Mana Crystals above the West & South-East/South-West altars
    for ax, ay, az in ((wx_t + 0.25, wy_t, 1.25), (-6.2, -4.2, 0.95), (6.2, -4.2, 0.95)):
        add_box(bm_stone_md, (0.85, 0.85, 0.38), center=(ax, ay, 0.05), bevel_amt=0.03)
        add_cone(bm_crystals_bob, 0.32, 0.02, 0.52, segments=6, center=(ax, ay, az + 0.26))
        add_cone(bm_crystals_bob, 0.32, 0.02, 0.42, segments=6, center=(ax, ay, az - 0.21), rot_euler=(math.pi, 0, 0))

    finalize_mesh("classic_diorama_stone_dk", bm_stone_dk, m_stone_dk, root, smooth=False)
    finalize_mesh("classic_diorama_stone_md", bm_stone_md, m_stone_md, root, smooth=False)
    finalize_mesh("classic_diorama_stone_hi", bm_stone_hi, m_stone_hi, root, smooth=False)
    finalize_mesh("classic_diorama_roof_p", bm_roof_p, m_slate_purple, root, smooth=False)
    finalize_mesh("classic_diorama_roof_s", bm_roof_s, m_slate_blue, root, smooth=False)
    finalize_mesh("classic_diorama_wood", bm_wood, m_wood, root, smooth=False)
    finalize_mesh("classic_diorama_iron", bm_iron, m_iron, root, smooth=False)
    finalize_mesh("classic_diorama_brass", bm_brass, m_brass, root)
    finalize_mesh("classic_diorama_gold", bm_gold, m_gold, root)
    finalize_mesh("classic_diorama_win_p", bm_win_p, m_win_purple, root, smooth=False)
    finalize_mesh("classic_diorama_win_w", bm_win_w, m_win_warm, root, smooth=False)
    finalize_mesh("classic_diorama_dragon", bm_dragon, m_dragon, root)
    finalize_mesh("classic_diorama_horn", bm_horn, m_horn, root)
    finalize_mesh("classic_diorama_crystals_bob", bm_crystals_bob, m_crystal, root, smooth=False)
    finalize_mesh("classic_diorama_flames_bob", bm_flames_bob, m_fire, root, smooth=False)


# ==============================================================================
# DIORAMA 2: LUMAR PORT & THE EMERALD SPORE SEA (`diorama_lumar`)
# ==============================================================================
def build_diorama_lumar(scene, helpers):
    add_box = helpers["add_box"]
    add_cone = helpers["add_cone"]
    add_icosphere = helpers["add_icosphere"]
    add_torus_ring = helpers["add_torus_ring"]
    finalize_mesh = helpers["finalize_mesh"]

    root = bpy.data.objects.new("diorama_lumar", None)
    root.location = (0, 0, 0)
    scene.collection.objects.link(root)

    # Exact Lumar palette from apps/bridge/CLAUDE.md & prompt-codex-lumar-port.md
    m_sea_deep = world_mat("lumar_sea_deep", "#123226", metallic=0.25, roughness=0.18, emit_hex="#0c281e", emit_strength=0.45)
    m_sea_crest = world_mat("lumar_sea_crest", "#2a7050", metallic=0.20, roughness=0.22, emit_hex="#1e583e", emit_strength=0.65)
    m_seafoam = world_mat("lumar_seafoam", "#90e0a8", metallic=0.05, roughness=0.30, emit_hex="#70c888", emit_strength=1.1)
    m_salt_dk = world_mat("lumar_salt_dk", "#1a1e20", metallic=0.08, roughness=0.68)
    m_salt_md = world_mat("lumar_salt_md", "#252a28", metallic=0.08, roughness=0.62)
    m_salt_hi = world_mat("lumar_salt_hi", "#3a4848", metallic=0.10, roughness=0.55)
    m_wood_dk = world_mat("lumar_wood_dk", "#3a2410", metallic=0.05, roughness=0.68)
    m_wood_md = world_mat("lumar_wood_md", "#5a3a1a", metallic=0.06, roughness=0.62)
    m_wood_lt = world_mat("lumar_wood_lt", "#7a4e22", metallic=0.06, roughness=0.58)
    m_plaster = world_mat("lumar_plaster", "#c9b48e", metallic=0.04, roughness=0.70)
    m_roof_grn = world_mat("lumar_roof_grn", "#2a4828", metallic=0.10, roughness=0.52)
    m_roof_slt = world_mat("lumar_roof_slt", "#2a3548", metallic=0.10, roughness=0.52)
    m_roof_red = world_mat("lumar_roof_red", "#8c3228", metallic=0.10, roughness=0.52)
    m_sail = world_mat("lumar_sail_cream", "#d8ccb0", metallic=0.04, roughness=0.65)
    m_brass = world_mat("lumar_brass", "#e0c060", metallic=0.78, roughness=0.25)
    m_win_glow = world_mat("lumar_win_glow", "#ffe080", metallic=0.05, roughness=0.15, emit_hex="#ffc850", emit_strength=2.6)
    m_beacon = world_mat("lumar_beacon_beam", "#ffe898", metallic=0.0, roughness=0.1, emit_hex="#ffe080", emit_strength=2.2)
    m_kraken = world_mat("lumar_kraken", "#1d5848", metallic=0.15, roughness=0.35, emit_hex="#10382e", emit_strength=0.35)

    bm_sea_deep = bmesh.new()
    bm_sea_wave = bmesh.new()
    bm_foam = bmesh.new()
    bm_salt_dk = bmesh.new()
    bm_salt_md = bmesh.new()
    bm_salt_hi = bmesh.new()
    bm_wood_dk = bmesh.new()
    bm_wood_md = bmesh.new()
    bm_wood_lt = bmesh.new()
    bm_plaster = bmesh.new()
    bm_roof_g = bmesh.new()
    bm_roof_s = bmesh.new()
    bm_roof_r = bmesh.new()
    bm_sail = bmesh.new()
    bm_brass = bmesh.new()
    bm_glow = bmesh.new()
    bm_kraken = bmesh.new()

    # 1. Custom Saltstone Harbor Quay & Heavy Timber Pier framing the 8x8 Chessboard
    add_box(bm_salt_dk, (9.8, 9.8, 0.65), center=(0, 0, -0.58), bevel_amt=0.05)
    add_box(bm_salt_md, (9.2, 9.2, 0.32), center=(0, 0, -0.28), bevel_amt=0.03)
    # Heavy timber wharf beams & dock pilings around the board perimeter
    for side in (-1, 1):
        add_box(bm_wood_md, (9.5, 0.26, 0.22), center=(0, side * 4.65, -0.14))
        add_box(bm_wood_md, (0.26, 9.5, 0.22), center=(side * 4.65, 0, -0.14))
    for i in range(-4, 5, 2):
        for s in (-1, 1):
            add_cone(bm_wood_dk, 0.18, 0.16, 1.35, segments=8, center=(i * 1.1, s * 4.82, -0.45))
            add_cone(bm_wood_dk, 0.18, 0.16, 1.35, segments=8, center=(s * 4.82, i * 1.1, -0.45))
    # South Harbor Boardwalk Pier (`y = -4.8` to `-8.2`) with wooden barrels & iron dock lanterns
    add_box(bm_wood_md, (2.6, 3.4, 0.16), center=(0, -6.4, -0.22))
    for py in (-5.2, -6.4, -7.6):
        for sx in (-1.2, 1.2):
            add_cone(bm_wood_dk, 0.14, 0.13, 1.2, segments=8, center=(sx, py, -0.55))
    for sx in (-1.15, 1.15):
        add_cone(bm_wood_dk, 0.06, 0.05, 0.95, segments=6, center=(sx, -5.2, 0.28))
        add_icosphere(bm_glow, 0.11, subdivisions=1, center=(sx, -5.2, 0.78))

    # 2. Shimmering 3D Emerald Spore Sea (`#1a4030` / `#2a7050` / `#90e0a8`) surrounding the harbor
    add_cone(bm_sea_deep, 14.8, 14.8, 0.18, segments=48, center=(0, 0, -0.78))
    for r_ring in (6.2, 8.4, 10.8, 13.0):
        add_torus_ring(bm_sea_wave, r_ring, 0.24, seg_major=40, seg_minor=6, center=(0, 0, -0.68), scale=(1.0, 1.0, 0.35))
        add_torus_ring(bm_foam, r_ring - 0.25, 0.05, seg_major=40, seg_minor=4, center=(0, 0, -0.60))

    # 3. East Dockside (`x=+6.4, y=+0.5`): The 3-Masted Wooden Sailing Galleon (`ship-dock.png`)!
    gx, gy, gz = 6.55, 0.6, -0.35
    # Sculpted galleon hull (widest at midship, tapered bow at -Y and stern castle at +Y)
    add_cone(bm_wood_dk, 1.25, 1.55, 0.85, segments=14, center=(gx, gy, gz + 0.35), scale=(0.88, 2.55, 1.0))
    add_box(bm_wood_md, (1.95, 5.2, 0.18), center=(gx, gy, gz + 0.82), bevel_amt=0.04)  # main deck planks
    # Raised Quarterdeck & Captain's Cabin at the stern (`+Y`) with glowing warm-yellow window
    add_box(bm_wood_dk, (1.82, 1.65, 0.85), center=(gx, gy + 1.95, gz + 1.25), bevel_amt=0.03)
    add_box(bm_wood_lt, (1.92, 1.75, 0.12), center=(gx, gy + 1.95, gz + 1.70))
    add_box(bm_glow, (0.42, 0.12, 0.32), center=(gx - 0.90, gy + 1.95, gz + 1.32))  # stern cabin window
    add_box(bm_glow, (0.55, 0.12, 0.32), center=(gx, gy + 2.76, gz + 1.32))
    # Ship's wheel & capstan on deck
    add_torus_ring(bm_brass, 0.22, 0.03, seg_major=12, seg_minor=4, center=(gx, gy + 0.85, gz + 1.15), rot_euler=(math.pi / 2, 0, 0))
    # Row of 5 glowing brass-rimmed portholes facing the chessboard!
    for py_i in range(-2, 3):
        py_p = gy + py_i * 0.82
        add_torus_ring(bm_brass, 0.13, 0.025, seg_major=10, seg_minor=4, center=(gx - 1.02, py_p, gz + 0.52), rot_euler=(0, math.pi / 2, 0))
        add_icosphere(bm_glow, 0.10, subdivisions=1, center=(gx - 1.01, py_p, gz + 0.52))
    # Bowsprit & golden figurehead at bow (`-Y`)
    add_cone(bm_wood_lt, 0.10, 0.03, 1.85, segments=8, center=(gx, gy - 3.35, gz + 1.05), rot_euler=(1.15, 0, 0))
    add_icosphere(bm_brass, 0.18, subdivisions=1, center=(gx, gy - 2.65, gz + 0.72), scale=(0.6, 1.3, 0.8))
    # Three vertical wooden masts + horizontal yardarms + furled cream/emerald sails + pennant
    for my, mh, yw in ((gy - 1.45, 3.4, 1.65), (gy + 0.15, 4.1, 2.05), (gy + 1.75, 3.2, 1.45)):
        add_cone(bm_wood_lt, 0.11, 0.06, mh, segments=8, center=(gx, my, gz + 0.85 + mh / 2))
        for yz in (gz + 1.9, gz + 2.85):
            add_cone(bm_wood_dk, 0.05, 0.04, yw, segments=6, center=(gx, my, yz), rot_euler=(0, math.pi / 2, 0))
            add_cone(bm_sail, 0.14, 0.12, yw * 0.88, segments=8, center=(gx, my - 0.08, yz - 0.08), rot_euler=(0, math.pi / 2, 0))
    # Topmast emerald pennant
    add_cone(bm_roof_g, 0.18, 0.01, 0.75, segments=4, center=(gx, gy + 0.55, gz + 4.85), rot_euler=(-1.35, 0, 0))
    # Wooden Gangway plank connecting the Galleon to the Chessboard Pier!
    add_box(bm_wood_lt, (1.55, 0.68, 0.10), center=(5.25, gy - 0.35, -0.02), rot_euler=(0, -0.18, 0))

    # 4. West & North-West Saltstone Quay & Lumar Harbor Buildings (`tavern.png`, `inn.png`, `bakery.png`, `apothecary.png`, `fishmonger-stall.png`)
    # Black basalt cliff & saltstone quay terrace along West (`x = -6.8`) and North (`y = +6.5`)
    add_box(bm_salt_dk, (3.2, 11.5, 0.85), center=(-6.8, 1.2, -0.35), bevel_amt=0.06)
    add_box(bm_salt_md, (10.5, 3.0, 0.95), center=(-1.2, 6.6, -0.30), bevel_amt=0.06)

    # 4a. The Lumar Seaside Tavern (`tavern.png`) at North-West (`x=-6.4, y=+5.2`)
    tx, ty = -6.4, 5.2
    add_box(bm_salt_hi, (2.4, 2.8, 0.55), center=(tx, ty, 0.32))
    add_box(bm_wood_md, (2.3, 2.7, 1.45), center=(tx, ty, 1.25))
    add_cone(bm_roof_g, 1.95, 0.12, 1.35, segments=4, center=(tx, ty, 2.55), rot_euler=(0, 0, math.pi / 4), scale=(1.0, 1.15, 1.0))
    add_box(bm_salt_md, (0.42, 0.42, 1.15), center=(tx - 0.65, ty + 0.75, 2.75))  # tavern stone chimney
    for wy_off in (-0.65, 0.65):
        add_box(bm_glow, (0.12, 0.48, 0.42), center=(tx + 1.14, ty + wy_off, 1.25))
    add_box(bm_wood_dk, (0.14, 0.48, 0.72), center=(tx + 1.14, ty, 0.82))

    # 4b. The Half-Timbered Cottage Bakery (`bakery.png`) at West (`x=-6.6, y=+1.4`)
    bkx, bky = -6.6, 1.4
    add_box(bm_plaster, (2.0, 2.2, 1.55), center=(bkx, bky, 0.85))
    add_box(bm_wood_dk, (2.06, 2.26, 0.12), center=(bkx, bky, 1.15))  # Tudor timber belt
    add_cone(bm_roof_r, 1.65, 0.10, 1.20, segments=4, center=(bkx, bky, 2.15), rot_euler=(0, 0, math.pi / 4), scale=(1.0, 1.1, 1.0))
    add_box(bm_glow, (0.12, 0.68, 0.46), center=(bkx + 1.0, bky + 0.32, 0.88))  # bakery display window

    # 4c. The Fishmonger's Open-Front Awning Stall (`fishmonger-stall.png`) at South-West Pier (`x=-6.2, y=-1.8`)
    fx, fy = -6.2, -1.8
    add_box(bm_wood_md, (1.2, 1.8, 0.52), center=(fx + 0.35, fy, 0.32))  # counter
    add_box(bm_roof_g, (1.65, 2.1, 0.14), center=(fx, fy, 1.38), rot_euler=(0, 0.22, 0))  # tilted green canvas awning
    for sy_p in (-0.85, 0.85):
        add_cone(bm_wood_dk, 0.06, 0.06, 1.35, segments=6, center=(fx + 0.55, fy + sy_p, 0.72))
        add_cone(bm_wood_lt, 0.22, 0.18, 0.45, segments=10, center=(fx + 0.65, fy + sy_p * 1.25, 0.28))  # fish barrels

    # 4d. The Leaning Witchy Apothecary (`apothecary.png`) & Harbor Inn (`inn.png`) along North Quay (`y=+6.5`)
    ax, ay = -2.6, 6.5
    add_box(bm_wood_dk, (1.65, 1.75, 2.15), center=(ax, ay, 1.15), rot_euler=(0, 0.07, 0))  # slight fairy-tale lean!
    add_cone(bm_roof_s, 1.38, 0.06, 1.35, segments=4, center=(ax + 0.08, ay, 2.82), rot_euler=(0, 0.07, math.pi / 4))
    add_box(bm_glow, (0.48, 0.12, 0.62), center=(ax, ay - 0.86, 1.15))

    ix, iy = 0.8, 6.5
    add_box(bm_salt_hi, (2.8, 2.2, 1.85), center=(ix, iy, 1.02))
    add_cone(bm_roof_s, 2.05, 0.12, 1.35, segments=4, center=(ix, iy, 2.55), rot_euler=(0, 0, math.pi / 4), scale=(1.25, 1.0, 1.0))
    for wx_i in (-0.75, 0.75):
        add_box(bm_glow, (0.48, 0.12, 0.45), center=(ix + wx_i, iy - 1.08, 1.25))
        add_box(bm_glow, (0.48, 0.12, 0.42), center=(ix + wx_i, iy - 1.08, 0.55))

    # 5. North-East Rocky Headland (`x=+5.8, y=+6.4`): The Tall Lumar Coastal Lighthouse (`lighthouse.png`)!
    lx, ly = 5.8, 6.4
    add_icosphere(bm_salt_dk, 1.65, subdivisions=1, center=(lx, ly, -0.15), scale=(1.15, 1.15, 0.55))
    add_cone(bm_plaster, 0.92, 0.62, 3.65, segments=16, center=(lx, ly, 2.05))
    add_cone(bm_roof_r, 0.84, 0.74, 0.85, segments=16, center=(lx, ly, 2.15))  # lighthouse red/brass band
    add_torus_ring(bm_brass, 0.72, 0.07, seg_major=16, seg_minor=6, center=(lx, ly, 3.92))
    add_cone(bm_glow, 0.52, 0.52, 0.68, segments=12, center=(lx, ly, 4.30))  # lantern room
    add_cone(bm_roof_s, 0.74, 0.04, 0.78, segments=16, center=(lx, ly, 4.98))

    # Sweeping volumetric lighthouse beacon cone (`_beacon_sweep`)
    bm_beacon = bmesh.new()
    add_cone(bm_beacon, 0.65, 0.06, 3.8, segments=12, center=(0, -1.9, 0), rot_euler=(-math.pi / 2, 0, 0))
    add_cone(bm_beacon, 0.65, 0.06, 3.8, segments=12, center=(0, 1.9, 0), rot_euler=(math.pi / 2, 0, 0))
    finalize_mesh("lumar_diorama_beacon_sweep", bm_beacon, m_beacon, root, location=(lx, ly, 4.30))

    # 6. Breaching Kraken Tentacles & Floating Spore Clusters (`_bob`) in the Emerald Sea!
    for kx, ky, rot_z in ((-6.8, -5.2, 0.5), (5.8, -5.6, -0.7), (-8.5, -2.2, 1.1), (8.6, 4.2, -1.2)):
        add_torus_ring(bm_foam, 0.68, 0.06, seg_major=16, seg_minor=4, center=(kx, ky, -0.58))
        for seg in range(7):
            t = seg / 6.0
            tz = -0.50 + t * 1.65
            tx_k = kx + math.sin(t * 2.4 + rot_z) * 0.35
            ty_k = ky + math.cos(t * 2.4 + rot_z) * 0.35
            add_icosphere(bm_kraken, 0.24 * (1.0 - t * 0.72), subdivisions=1, center=(tx_k, ty_k, tz))

    finalize_mesh("lumar_diorama_sea_deep", bm_sea_deep, m_sea_deep, root)
    finalize_mesh("lumar_diorama_water_wave", bm_sea_wave, m_sea_crest, root)
    finalize_mesh("lumar_diorama_foam", bm_foam, m_seafoam, root)
    finalize_mesh("lumar_diorama_salt_dk", bm_salt_dk, m_salt_dk, root, smooth=False)
    finalize_mesh("lumar_diorama_salt_md", bm_salt_md, m_salt_md, root, smooth=False)
    finalize_mesh("lumar_diorama_salt_hi", bm_salt_hi, m_salt_hi, root, smooth=False)
    finalize_mesh("lumar_diorama_wood_dk", bm_wood_dk, m_wood_dk, root, smooth=False)
    finalize_mesh("lumar_diorama_wood_md", bm_wood_md, m_wood_md, root, smooth=False)
    finalize_mesh("lumar_diorama_wood_lt", bm_wood_lt, m_wood_lt, root, smooth=False)
    finalize_mesh("lumar_diorama_plaster", bm_plaster, m_plaster, root, smooth=False)
    finalize_mesh("lumar_diorama_roof_g", bm_roof_g, m_roof_grn, root, smooth=False)
    finalize_mesh("lumar_diorama_roof_s", bm_roof_s, m_roof_slt, root, smooth=False)
    finalize_mesh("lumar_diorama_roof_r", bm_roof_r, m_roof_red, root, smooth=False)
    finalize_mesh("lumar_diorama_sail", bm_sail, m_sail, root)
    finalize_mesh("lumar_diorama_brass", bm_brass, m_brass, root)
    finalize_mesh("lumar_diorama_glow", bm_glow, m_win_glow, root, smooth=False)
    finalize_mesh("lumar_diorama_kraken_bob", bm_kraken, m_kraken, root)


# ==============================================================================
# DIORAMA 3: ARCADIA NEON CYBERPUNK STREET & ARCADE PLAZA (`diorama_arcadia`)
# ==============================================================================
def build_diorama_arcadia(scene, helpers):
    add_box = helpers["add_box"]
    add_cone = helpers["add_cone"]
    add_icosphere = helpers["add_icosphere"]
    add_torus_ring = helpers["add_torus_ring"]
    finalize_mesh = helpers["finalize_mesh"]

    root = bpy.data.objects.new("diorama_arcadia", None)
    root.location = (0, 0, 0)
    scene.collection.objects.link(root)

    # Exact Arcadia palette from apps/bridge/CLAUDE.md & PNG-PROMPTS.md
    m_metal_dk = world_mat("arcadia_metal_dk", "#0e0820", metallic=0.55, roughness=0.42)
    m_metal_md = world_mat("arcadia_metal_md", "#1a1530", metallic=0.48, roughness=0.38)
    m_street = world_mat("arcadia_street", "#2a2240", metallic=0.30, roughness=0.32)
    m_teal_wall = world_mat("arcadia_teal_wall", "#1a3540", metallic=0.35, roughness=0.40)
    m_neon_pink = world_mat("arcadia_neon_pink", "#e870c0", metallic=0.05, roughness=0.15, emit_hex="#ff38b8", emit_strength=3.0)
    m_neon_cyan = world_mat("arcadia_neon_cyan", "#5cc8d0", metallic=0.05, roughness=0.15, emit_hex="#00f0ff", emit_strength=2.8)
    m_neon_purple = world_mat("arcadia_neon_purple", "#7080e8", metallic=0.10, roughness=0.20, emit_hex="#6858ff", emit_strength=2.0)
    m_win_yellow = world_mat("arcadia_win_yellow", "#ffe080", metallic=0.05, roughness=0.15, emit_hex="#ffd050", emit_strength=2.5)
    m_glass_dark = world_mat("arcadia_glass_dark", "#181a40", metallic=0.75, roughness=0.12)

    bm_metal_dk = bmesh.new()
    bm_metal_md = bmesh.new()
    bm_street = bmesh.new()
    bm_teal = bmesh.new()
    bm_pink = bmesh.new()
    bm_cyan = bmesh.new()
    bm_purple = bmesh.new()
    bm_yellow = bmesh.new()
    bm_glass = bmesh.new()

    # 1. Custom Cyberpunk Street Plaza & Neon Tube Curbs around the 8x8 Chessboard
    add_box(bm_metal_dk, (10.2, 10.2, 0.55), center=(0, 0, -0.52), bevel_amt=0.04)
    add_box(bm_street, (9.3, 9.3, 0.28), center=(0, 0, -0.24), bevel_amt=0.02)
    # Hot-pink & electric-cyan neon tube curbs framing the board
    for s in (-1, 1):
        add_box(bm_cyan, (9.4, 0.10, 0.10), center=(0, s * 4.66, -0.08))
        add_box(bm_cyan, (0.10, 9.4, 0.10), center=(s * 4.66, 0, -0.08))
        add_box(bm_pink, (10.25, 0.08, 0.08), center=(0, s * 5.12, -0.26))
        add_box(bm_pink, (0.08, 10.25, 0.08), center=(s * 5.12, 0, -0.26))

    # Subterranean Synthwave Laser Grid extending out to R=13.5
    add_box(bm_metal_dk, (27.0, 27.0, 0.12), center=(0, 0, -0.78))
    for i in range(-9, 10):
        pos = i * 1.4
        if abs(pos) > 4.6:
            add_box(bm_purple, (26.0, 0.045, 0.03), center=(0, pos, -0.70))
            add_box(bm_purple, (0.045, 26.0, 0.03), center=(pos, 0, -0.70))

    # 2. North Street Centerpiece (`x=0, y=+6.8`): The Flagship "ARCADIA" Video Arcade Building (`arcade.png`)!
    add_box(bm_street, (20.0, 4.2, 0.35), center=(0, 6.8, -0.52))  # North street sidewalk
    add_box(bm_metal_md, (7.6, 2.4, 3.4), center=(0, 7.0, 1.35), bevel_amt=0.04)
    # Massive curved Hot-Pink & Electric-Cyan Neon "ARCADIA" Marquee (`arcade.png`)
    add_box(bm_metal_dk, (6.2, 0.45, 1.05), center=(0, 5.72, 2.75), bevel_amt=0.03)
    add_box(bm_pink, (6.35, 0.12, 0.12), center=(0, 5.52, 3.22))
    add_box(bm_pink, (6.35, 0.12, 0.12), center=(0, 5.52, 2.28))
    add_box(bm_cyan, (6.10, 0.10, 0.08), center=(0, 5.50, 2.75))
    # 7 Stylized 3D Geometric Neon Tube Letters spelling "A R C A D I A" on the marquee!
    for li in range(-3, 4):
        lx = li * 0.76
        add_box(bm_pink, (0.48, 0.12, 0.56), center=(lx, 5.48, 2.75))
        add_box(bm_cyan, (0.24, 0.14, 0.28), center=(lx, 5.46, 2.75))
    # Recessed double-door entrance archway + tall warm-yellow display windows (`arcade.png`)
    add_box(bm_glass, (1.65, 0.22, 1.45), center=(0, 5.82, 0.72))
    add_box(bm_pink, (1.78, 0.14, 1.55), center=(0, 5.78, 0.75))
    for wx in (-2.45, -1.45, 1.45, 2.45):
        add_box(bm_yellow, (0.68, 0.12, 1.25), center=(wx, 5.78, 0.95))
    # Rooftop HVAC units & antennas (`arcade.png`)
    for hx in (-2.2, 1.8):
        add_box(bm_metal_dk, (1.1, 1.1, 0.55), center=(hx, 7.1, 3.32))
    add_cone(bm_metal_dk, 0.05, 0.01, 1.45, segments=6, center=(2.8, 6.6, 3.75))
    add_icosphere(bm_cyan, 0.10, subdivisions=1, center=(2.8, 6.6, 4.48))

    # 3. West Street Block (`x=-6.8`): Cyber Noodle Bar (`cyber-noodle-bar.png`), Neon Ramen Stand (`neon-ramen-stand.png`) & 5 Upright Arcade Cabinets!
    add_box(bm_street, (3.8, 14.0, 0.35), center=(-6.8, 0.5, -0.52))
    # 2-Story Cyber Noodle Bar (`cyber-noodle-bar.png`) at `(x=-7.0, y=+2.6)`
    nx, ny = -7.0, 2.6
    add_box(bm_teal, (2.4, 3.2, 2.85), center=(nx, ny, 1.10), bevel_amt=0.03)
    add_box(bm_metal_dk, (2.65, 3.45, 0.18), center=(nx + 0.15, ny, 1.35))  # canopy overhang
    add_box(bm_cyan, (0.10, 3.50, 0.08), center=(nx + 1.46, ny, 1.35))  # cyan tube-light canopy edge
    add_box(bm_pink, (0.10, 3.20, 0.08), center=(nx + 1.22, ny, -0.15))  # hot-pink counter underglow
    add_box(bm_yellow, (0.12, 1.35, 0.68), center=(nx + 1.20, ny - 0.35, 0.65))  # noodle bar service window
    for wy_u in (-0.75, 0.75):
        add_box(bm_yellow, (0.12, 0.55, 0.65), center=(nx + 1.20, ny + wy_u, 2.05))  # upper apartment windows
    # Neon Noodle Bowl Sign on roof corner
    add_cone(bm_pink, 0.42, 0.22, 0.32, segments=12, center=(nx + 1.15, ny, 2.85), rot_euler=(math.pi, 0, 0))
    add_box(bm_cyan, (0.06, 0.75, 0.06), center=(nx + 1.15, ny + 0.15, 3.12), rot_euler=(0.35, 0, 0))

    # Row of 5 Classic Upright 3D Arcade Cabinets along West Plaza Edge (`x=-5.6, y=-3.2` to `-0.2`)!
    for cab_i in range(5):
        cy = -3.4 + cab_i * 0.82
        cx = -5.65
        add_box(bm_metal_md, (0.62, 0.58, 1.15), center=(cx, cy, 0.32), bevel_amt=0.02)
        add_box(bm_metal_dk, (0.66, 0.60, 0.26), center=(cx + 0.06, cy, 0.98))  # top marquee hood
        # Alternating cyan, pink & yellow glowing CRT screens and marquee headers!
        scr_bm = bm_cyan if cab_i % 2 == 0 else bm_pink
        mrq_bm = bm_pink if cab_i % 2 == 0 else bm_yellow
        add_box(scr_bm, (0.08, 0.44, 0.38), center=(cx + 0.28, cy, 0.62), rot_euler=(0, -0.25, 0))
        add_box(mrq_bm, (0.08, 0.48, 0.18), center=(cx + 0.36, cy, 0.98))

    # 4. East Street Block (`x=+6.8`): Chrome Clinic (`chrome-clinic.png`), Tech Repair Shop & Parked Hover-Bike Dock (`hover-bike-dock.png`)!
    add_box(bm_street, (3.8, 14.0, 0.35), center=(6.8, 0.5, -0.52))
    # Chrome Clinic (`chrome-clinic.png`) at `(x=+7.0, y=+2.4)`
    ccx, ccy = 7.0, 2.4
    add_box(bm_metal_md, (2.4, 3.4, 2.45), center=(ccx, ccy, 0.90), bevel_amt=0.03)
    for wy_c in (-0.85, 0.85):
        add_box(bm_cyan, (0.12, 0.88, 0.72), center=(ccx - 1.20, ccy + wy_c, 0.75))  # warm-cyan clinic windows
    # Neon Cross Sign on front wall (`chrome-clinic.png`)
    add_box(bm_cyan, (0.12, 0.56, 0.16), center=(ccx - 1.22, ccy, 1.65))
    add_box(bm_cyan, (0.12, 0.16, 0.56), center=(ccx - 1.22, ccy, 1.65))

    # Parked Cyberpunk Hover-Bike in Charging Dock (`hover-bike-dock.png`) at `(x=+6.0, y=-2.4)`!
    hbx, hby = 6.0, -2.4
    add_box(bm_metal_dk, (1.45, 2.15, 0.14), center=(hbx, hby, -0.26))  # charging dock pad
    add_box(bm_purple, (1.25, 1.85, 0.06), center=(hbx, hby, -0.18))  # purple magnetic lift rails
    # Sleek Hover-Bike chassis, cyan canopy & twin hot-pink engine pods
    add_cone(bm_metal_md, 0.28, 0.12, 1.45, segments=8, center=(hbx, hby, 0.18), rot_euler=(math.pi / 2, 0, 0), scale=(0.85, 0.65, 1.0))
    add_icosphere(bm_cyan, 0.24, subdivisions=1, center=(hbx, hby - 0.15, 0.30), scale=(0.75, 1.6, 0.65))
    for sx_pod in (-0.34, 0.34):
        add_cone(bm_pink, 0.12, 0.08, 0.68, segments=8, center=(hbx + sx_pod, hby + 0.32, 0.16), rot_euler=(math.pi / 2, 0, 0))

    # 5. Four Corner Holo-Billboard Pylons with Spinning Holographic Octahedrons (`_spin_slow`)
    bm_holo_spin = bmesh.new()
    for cx, cy in ((-4.85, -4.85), (4.85, -4.85), (-4.85, 4.85), (4.85, 4.85)):
        add_cone(bm_metal_md, 0.38, 0.28, 0.55, segments=6, center=(cx, cy, 0.20))
        add_torus_ring(bm_cyan, 0.32, 0.035, seg_major=6, seg_minor=4, center=(cx, cy, 0.48))
        add_icosphere(bm_holo_spin, 0.28, subdivisions=0, center=(cx, cy, 0.92))
        add_torus_ring(bm_holo_spin, 0.40, 0.025, seg_major=6, seg_minor=4, center=(cx, cy, 0.92), rot_euler=(0.6, 0.4, 0))

    finalize_mesh("arcadia_diorama_metal_dk", bm_metal_dk, m_metal_dk, root, smooth=False)
    finalize_mesh("arcadia_diorama_metal_md", bm_metal_md, m_metal_md, root, smooth=False)
    finalize_mesh("arcadia_diorama_street", bm_street, m_street, root, smooth=False)
    finalize_mesh("arcadia_diorama_teal", bm_teal, m_teal_wall, root, smooth=False)
    finalize_mesh("arcadia_diorama_pink", bm_pink, m_neon_pink, root, smooth=False)
    finalize_mesh("arcadia_diorama_cyan", bm_cyan, m_neon_cyan, root, smooth=False)
    finalize_mesh("arcadia_diorama_purple", bm_purple, m_neon_purple, root, smooth=False)
    finalize_mesh("arcadia_diorama_yellow", bm_yellow, m_win_yellow, root, smooth=False)
    finalize_mesh("arcadia_diorama_glass", bm_glass, m_glass_dark, root, smooth=False)
    finalize_mesh("arcadia_diorama_holo_spin_slow", bm_holo_spin, m_neon_pink, root, smooth=False)


# ==============================================================================
# DIORAMA 4: ENIGMA STATION DEEP-SPACE OUTPOST (`diorama_enigma`)
# ==============================================================================
def build_diorama_enigma(scene, helpers):
    add_box = helpers["add_box"]
    add_cone = helpers["add_cone"]
    add_icosphere = helpers["add_icosphere"]
    add_torus_ring = helpers["add_torus_ring"]
    finalize_mesh = helpers["finalize_mesh"]

    root = bpy.data.objects.new("diorama_enigma", None)
    root.location = (0, 0, 0)
    scene.collection.objects.link(root)

    # Exact Enigma Station palette from apps/bridge/CLAUDE.md & enigma.js
    m_hull_dk = world_mat("enigma_hull_dk", "#0e1820", metallic=0.68, roughness=0.38)
    m_hull_md = world_mat("enigma_hull_md", "#1a2530", metallic=0.62, roughness=0.34)
    m_hull_hi = world_mat("enigma_hull_hi", "#253540", metallic=0.58, roughness=0.30)
    m_solar = world_mat("enigma_solar", "#122a42", metallic=0.75, roughness=0.18, emit_hex="#184868", emit_strength=0.45)
    m_cyan = world_mat("enigma_cyan", "#40c8d8", metallic=0.10, roughness=0.15, emit_hex="#40c8d8", emit_strength=2.6)
    m_led_grn = world_mat("enigma_led_grn", "#40e080", metallic=0.05, roughness=0.15, emit_hex="#40e080", emit_strength=2.8)
    m_led_red = world_mat("enigma_led_red", "#e84040", metallic=0.05, roughness=0.15, emit_hex="#e84040", emit_strength=2.8)
    m_led_amb = world_mat("enigma_led_amb", "#e8c040", metallic=0.05, roughness=0.15, emit_hex="#e8c040", emit_strength=2.5)

    bm_hull_dk = bmesh.new()
    bm_hull_md = bmesh.new()
    bm_hull_hi = bmesh.new()
    bm_solar = bmesh.new()
    bm_cyan = bmesh.new()
    bm_grn = bmesh.new()
    bm_red = bmesh.new()
    bm_amb = bmesh.new()

    # 1. Octagonal Orbital Command Deck & Corridor Chevron Walkways (`drawCorridorFloor` in `enigma.js`)
    add_cone(bm_hull_dk, 6.8, 5.2, 0.75, segments=8, center=(0, 0, -0.58), rot_euler=(0, 0, math.pi / 8))
    add_Box_or_Oct = add_cone(bm_hull_md, 6.2, 6.0, 0.28, segments=8, center=(0, 0, -0.24), rot_euler=(0, 0, math.pi / 8))
    # 4 Corridor Walkways with glowing Cyan Chevrons leading onto the board
    for side in (-1, 1):
        add_box(bm_hull_hi, (2.2, 2.8, 0.18), center=(0, side * 5.6, -0.18))
        add_box(bm_hull_hi, (2.8, 2.2, 0.18), center=(side * 5.6, 0, -0.18))
        for ch_i in range(3):
            d_pos = 4.65 + ch_i * 0.65
            add_box(bm_cyan, (0.85, 0.12, 0.04), center=(0, side * d_pos, -0.08))
            add_box(bm_cyan, (0.12, 0.85, 0.04), center=(side * d_pos, 0, -0.08))

    # Sub-Deck Rotating Cryo-Reactor Core & Telemetry Ring (`_spin_slow`)
    bm_reactor_spin = bmesh.new()
    add_torus_ring(bm_reactor_spin, 5.75, 0.12, seg_major=32, seg_minor=6, center=(0, 0, -0.42))
    for i in range(12):
        ang = (i / 12.0) * math.tau
        rx, ry = math.cos(ang) * 5.75, math.sin(ang) * 5.75
        add_box(bm_reactor_spin, (0.28, 0.28, 0.22), center=(rx, ry, -0.42), rot_euler=(0, 0, ang))
    finalize_mesh("enigma_diorama_reactor_spin_slow", bm_reactor_spin, m_cyan, root, smooth=False)

    # 2. North Station Bulkhead (`y=+6.4`): Cipher Room Airlock, Signal Relay Consoles & 8 Blinking Mainframe Server Racks (`drawServerRack`)!
    add_box(bm_hull_dk, (11.5, 1.8, 0.35), center=(0, 6.4, -0.25))
    # Central Cipher Room Airlock Blast Door (`enigma.js`)
    add_box(bm_hull_md, (2.4, 0.55, 2.55), center=(0, 6.65, 1.05), bevel_amt=0.04)
    add_box(bm_hull_dk, (1.65, 0.42, 2.05), center=(0, 6.55, 0.85))
    add_box(bm_red, (0.22, 0.12, 0.28), center=(1.02, 6.36, 0.95))  # locked keypad
    add_box(bm_amb, (1.85, 0.12, 0.12), center=(0, 6.36, 2.08))  # hazard header bar

    # 8 Blinking Mainframe Server Racks (`drawServerRack` in `enigma.js`: 4 on left, 4 on right)
    led_bms = (bm_grn, bm_cyan, bm_amb, bm_red)
    for sx in (-1, 1):
        for r_idx in range(4):
            rx = sx * (1.85 + r_idx * 0.95)
            ry = 6.45 - abs(r_idx - 1.5) * 0.15
            add_box(bm_hull_dk, (0.78, 0.72, 2.25), center=(rx, ry, 0.92), bevel_amt=0.02)
            add_box(bm_hull_md, (0.68, 0.12, 2.05), center=(rx, ry - 0.32, 0.92))
            # 3x4 Grid of Glowing Server LEDs!
            for row_l in range(4):
                for col_l in range(3):
                    lx = rx + (col_l - 1) * 0.18
                    lz = 0.32 + row_l * 0.42
                    target_led = led_bms[(r_idx + row_l + col_l) % 4]
                    add_box(target_led, (0.09, 0.06, 0.07), center=(lx, ry - 0.38, lz))

    # Signal Relay Comms Consoles ("DECODE INCOMING TRANSMISSIONS") flanking the North walkway
    for sx in (-1, 1):
        cx = sx * 2.2
        add_box(bm_hull_hi, (1.15, 0.65, 0.75), center=(cx, 5.25, 0.22), rot_euler=(0.3, 0, sx * -0.25))
        add_box(bm_cyan, (0.95, 0.42, 0.08), center=(cx, 5.20, 0.62), rot_euler=(0.55, 0, sx * -0.25))

    # 3. East & West Deep-Space Orbital Trusses & 8 Giant Solar Array Wings!
    for sx in (-1, 1):
        # Central hex-truss boom extending from station deck out to X = +/- 12.5
        add_cone(bm_hull_hi, 0.26, 0.22, 6.2, segments=6, center=(sx * 9.2, 0, -0.22), rot_euler=(0, math.pi / 2, 0))
        # Spherical Cryo-Fuel Tanks near the hull root
        for ty in (-1.4, 1.4):
            add_icosphere(bm_hull_md, 0.68, subdivisions=2, center=(sx * 6.4, ty, 0.05))
            add_torus_ring(bm_cyan, 0.70, 0.04, seg_major=16, seg_minor=4, center=(sx * 6.4, ty, 0.05))
        # 4 Giant Solar Array Panels per wing (front & back of boom)
        for p_idx in range(2):
            px = sx * (8.2 + p_idx * 2.4)
            for py_dir in (-1, 1):
                py = py_dir * 2.35
                add_box(bm_hull_dk, (1.95, 3.6, 0.06), center=(px, py, -0.22))
                add_box(bm_solar, (1.82, 3.45, 0.08), center=(px, py, -0.21))
                add_box(bm_cyan, (0.06, 3.45, 0.09), center=(px, py, -0.20))

    # 4. Four Corner Telemetry Masts with Sweeping Parabolic Radar Dishes (`_radar_dish`) + Orbiting Drones (`_bob`)
    bm_dishes = bmesh.new()
    for cx, cy in ((-4.85, -4.85), (4.85, -4.85), (-4.85, 4.85), (4.85, 4.85)):
        add_cone(bm_hull_md, 0.34, 0.18, 0.85, segments=8, center=(cx, cy, 0.32))
        add_cone(bm_dishes, 0.10, 0.42, 0.22, segments=16, center=(cx, cy, 0.92), rot_euler=(-0.55, 0, 0))
        add_icosphere(bm_cyan, 0.09, subdivisions=1, center=(cx, cy, 1.12))

    bm_drones = bmesh.new()
    for dx, dy, dz in ((-5.8, -3.2, 1.45), (5.8, -3.2, 1.65)):
        add_icosphere(bm_drones, 0.28, subdivisions=1, center=(dx, dy, dz))
        add_torus_ring(bm_drones, 0.42, 0.04, seg_major=12, seg_minor=4, center=(dx, dy, dz), rot_euler=(0.3, 0.2, 0))

    finalize_mesh("enigma_diorama_hull_dk", bm_hull_dk, m_hull_dk, root, smooth=False)
    finalize_mesh("enigma_diorama_hull_md", bm_hull_md, m_hull_md, root, smooth=False)
    finalize_mesh("enigma_diorama_hull_hi", bm_hull_hi, m_hull_hi, root, smooth=False)
    finalize_mesh("enigma_diorama_solar", bm_solar, m_solar, root, smooth=False)
    finalize_mesh("enigma_diorama_cyan", bm_cyan, m_cyan, root, smooth=False)
    finalize_mesh("enigma_diorama_grn", bm_grn, m_led_grn, root, smooth=False)
    finalize_mesh("enigma_diorama_red", bm_red, m_led_red, root, smooth=False)
    finalize_mesh("enigma_diorama_amb", bm_amb, m_led_amb, root, smooth=False)
    finalize_mesh("enigma_diorama_radar_dish", bm_dishes, m_hull_hi, root)
    finalize_mesh("enigma_diorama_drones_bob", bm_drones, m_cyan, root)


# ==============================================================================
# DIORAMA 5: THE SINGULARITY COSMIC ANOMALY & SHATTERED VOID (`diorama_singularity`)
# ==============================================================================
def build_diorama_singularity(scene, helpers):
    add_box = helpers["add_box"]
    add_cone = helpers["add_cone"]
    add_icosphere = helpers["add_icosphere"]
    add_torus_ring = helpers["add_torus_ring"]
    finalize_mesh = helpers["finalize_mesh"]

    root = bpy.data.objects.new("diorama_singularity", None)
    root.location = (0, 0, 0)
    scene.collection.objects.link(root)

    # Exact Singularity palette from apps/bridge/CLAUDE.md & singularity.js
    m_void_core = world_mat("singularity_void_core", "#050510", metallic=0.0, roughness=0.05)
    m_plat_md = world_mat("singularity_plat_md", "#2a2040", metallic=0.18, roughness=0.52)
    m_plat_dk = world_mat("singularity_plat_dk", "#1a1430", metallic=0.22, roughness=0.58)
    m_crys_dk = world_mat("singularity_crys_dk", "#503090", metallic=0.25, roughness=0.22, emit_hex="#503090", emit_strength=1.2)
    m_crys_hi = world_mat("singularity_crys_hi", "#a080e0", metallic=0.15, roughness=0.15, emit_hex="#a080e0", emit_strength=2.4)
    m_photon = world_mat("singularity_photon", "#e8dcff", metallic=0.05, roughness=0.10, emit_hex="#d0c0ff", emit_strength=3.4)
    m_gold_ring = world_mat("singularity_gold_ring", "#e8c068", metallic=0.85, roughness=0.18, emit_hex="#c09038", emit_strength=0.8)

    bm_void = bmesh.new()
    bm_plat_md = bmesh.new()
    bm_plat_dk = bmesh.new()
    bm_crys_dk = bmesh.new()
    bm_crys_hi = bmesh.new()
    bm_photon = bmesh.new()
    bm_gold = bmesh.new()

    # 1. Fractured Floating Void Platform & Inverted Stepped Under-Spire (`singularity.js`)
    add_cone(bm_plat_md, 6.3, 5.6, 0.42, segments=12, center=(0, 0, -0.32))
    add_cone(bm_plat_dk, 5.5, 0.35, 3.4, segments=8, center=(0, 0, -2.15), rot_euler=(math.pi, 0, 0))
    # Glowing violet gravitational fissure cracks around the platform rim (`drawPlatformCracks`)
    for i in range(16):
        ang = (i / 16.0) * math.tau
        cr_x = math.cos(ang) * 4.75
        cr_y = math.sin(ang) * 4.75
        add_box(bm_crys_hi, (0.65, 0.07, 0.08), center=(cr_x, cr_y, -0.10), rot_euler=(0, 0, ang + 0.3))

    # 2. The Singularity Black Hole Event Horizon & Photon Sphere (`x=0, y=+8.4, z=+2.2`)!
    bh_x, bh_y, bh_z = 0.0, 8.4, 2.2
    add_icosphere(bm_void, 1.55, subdivisions=3, center=(bh_x, bh_y, bh_z))
    add_torus_ring(bm_photon, 1.68, 0.09, seg_major=36, seg_minor=8, center=(bh_x, bh_y, bh_z), rot_euler=(1.25, 0, 0))
    add_torus_ring(bm_crys_hi, 2.35, 0.18, seg_major=36, seg_minor=6, center=(bh_x, bh_y, bh_z), rot_euler=(0.35, 0.15, 0), scale=(1.0, 1.0, 0.25))
    add_torus_ring(bm_photon, 1.95, 0.08, seg_major=36, seg_minor=6, center=(bh_x, bh_y, bh_z), rot_euler=(0.35, 0.15, 0))

    # 3. Three Colossal Nested Precessing Gravitational Lensing Rings encircling the entire board (`_spin_slow`, `_spin_rev`)
    bm_ring_spin1 = bmesh.new()
    add_torus_ring(bm_ring_spin1, 6.85, 0.065, seg_major=48, seg_minor=6, center=(0, 0, 0.0), rot_euler=(0.32, 0.18, 0))
    add_torus_ring(bm_ring_spin1, 8.65, 0.055, seg_major=48, seg_minor=6, center=(0, 0, 0.15), rot_euler=(-0.28, 0.22, 0))
    finalize_mesh("singularity_diorama_rings_spin_slow", bm_ring_spin1, m_gold_ring, root)

    bm_ring_spin2 = bmesh.new()
    add_torus_ring(bm_ring_spin2, 7.75, 0.05, seg_major=48, seg_minor=6, center=(0, 0, 0.05), rot_euler=(0.42, -0.25, 0))
    finalize_mesh("singularity_diorama_rings_spin_rev", bm_ring_spin2, m_crys_hi, root)

    # 4. Archipelago of 10 Levitating Shattered Void Islands (`_bob`) with Giant Faceted Void Crystals (`#503090` / `#8060c0` / `#c0a0f0`)
    bm_islands_bob = bmesh.new()
    bm_island_crys_bob = bmesh.new()
    island_specs = [
        (-6.8, -3.5, 0.15, 1.25),
        (-7.4, 1.2, 0.65, 1.55),
        (-5.8, 5.5, 1.10, 1.45),
        (5.8, 5.5, 1.05, 1.45),
        (7.4, 1.2, 0.55, 1.55),
        (6.8, -3.5, 0.20, 1.25),
        (-3.6, -6.4, -0.35, 0.95),
        (3.6, -6.4, -0.35, 0.95),
        (-9.2, -1.2, 1.35, 1.15),
        (9.2, -1.2, 1.35, 1.15),
    ]
    for ix, iy, iz, ir in island_specs:
        # Flat-topped, cone-bottomed floating rock shard
        add_cone(bm_islands_bob, ir, ir * 0.85, 0.28, segments=7, center=(ix, iy, iz))
        add_cone(bm_islands_bob, ir * 0.85, 0.08, ir * 1.15, segments=7, center=(ix, iy, iz - ir * 0.65), rot_euler=(math.pi, 0, 0))
        # Cluster of tall faceted Void Crystals sprouting from each island!
        add_cone(bm_island_crys_bob, ir * 0.22, 0.01, ir * 1.25, segments=5, center=(ix, iy, iz + ir * 0.60), rot_euler=(0.05, 0.08, 0))
        for c_off_x, c_off_y, c_h, c_tilt in ((-ir * 0.35, ir * 0.2, ir * 0.88, -0.28), (ir * 0.32, -ir * 0.22, ir * 0.82, 0.32)):
            add_cone(bm_crys_dk, ir * 0.20, 0.01, c_h, segments=5, center=(ix + c_off_x, iy + c_off_y, iz + c_h * 0.48), rot_euler=(c_tilt * 0.6, c_tilt, 0))

    # 5. Four Corner Levitating Void Obelisks & Orbiting Tesseract Rings
    for cx, cy in ((-4.85, -4.85), (4.85, -4.85), (-4.85, 4.85), (4.85, 4.85)):
        add_cone(bm_gold, 0.34, 0.26, 0.22, segments=4, center=(cx, cy, 0.08), rot_euler=(0, 0, math.pi / 4))
        add_cone(bm_island_crys_bob, 0.24, 0.01, 0.65, segments=4, center=(cx, cy, 0.85), rot_euler=(0, 0, math.pi / 4))
        add_cone(bm_crys_dk, 0.24, 0.01, 0.45, segments=4, center=(cx, cy, 0.32), rot_euler=(math.pi, 0, math.pi / 4))
        add_torus_ring(bm_gold, 0.38, 0.025, seg_major=16, seg_minor=4, center=(cx, cy, 0.65), rot_euler=(0.5, 0.4, 0))

    finalize_mesh("singularity_diorama_void", bm_void, m_void_core, root)
    finalize_mesh("singularity_diorama_plat_md", bm_plat_md, m_plat_md, root, smooth=False)
    finalize_mesh("singularity_diorama_plat_dk", bm_plat_dk, m_plat_dk, root, smooth=False)
    finalize_mesh("singularity_diorama_crys_dk", bm_crys_dk, m_crys_dk, root, smooth=False)
    finalize_mesh("singularity_diorama_crys_hi", bm_crys_hi, m_crys_hi, root, smooth=False)
    finalize_mesh("singularity_diorama_photon", bm_photon, m_photon, root)
    finalize_mesh("singularity_diorama_gold", bm_gold, m_gold_ring, root, smooth=False)
    finalize_mesh("singularity_diorama_islands_bob", bm_islands_bob, m_plat_md, root, smooth=False)
    finalize_mesh("singularity_diorama_crystals_bob", bm_island_crys_bob, m_crys_hi, root, smooth=False)


def build_all_world_dioramas(scene, helpers):
    build_diorama_classic(scene, helpers)
    build_diorama_lumar(scene, helpers)
    build_diorama_arcadia(scene, helpers)
    build_diorama_enigma(scene, helpers)
    build_diorama_singularity(scene, helpers)
