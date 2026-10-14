"""Sculpt 3D Wizard Chess pieces in Blender and export to GLB for Three.js.

Run headlessly with Blender:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/chess-art/build_wizard_pieces.py -- apps/chess/assets/wizard-pieces.glb

Exports 6 root nodes (`piece_pawn`, `piece_rook`, `piece_knight`, `piece_bishop`,
`piece_queen`, `piece_king`), each with articulated child meshes:
  - `base`:   fluted stone pedestal + rune ring
  - `body`:   sculpted armor / robes / horse torso / battlement tower
  - `head`:   barbute helm / gargoyle crown / warhorse head / mitre / diadem / king crown
  - `weapon`: sword / siege hammer / couched lance / crosier staff / sun scepter / greatsword
  - `shield`: heater shield / left gauntlet / buckler / spell tome / arcane orb
  - `gem`:    emissive rune core / visor slit / focus crystal / crown jewel

Coordinate convention:
  Blender +Z is Up (exports to Three.js +Y).
  Blender +Y is Forward (exports to Three.js -Z, matching White facing Black).
"""
import math
import os
import sys
import bpy
import bmesh
from mathutils import Vector, Matrix, Euler

argv = sys.argv
out_path = "apps/chess/assets/wizard-pieces.glb"
if "--" in argv:
    extra = argv[argv.index("--") + 1:]
    if extra:
        out_path = extra[0]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# Create placeholder materials so Three.js can identify material roles by name
def make_mat(name, color, metallic=0.1, roughness=0.5, emissive=(0, 0, 0)):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emissive, 1.0)
            bsdf.inputs["Emission Strength"].default_value = 1.0 if any(emissive) else 0.0
    return m

MAT_STONE = make_mat("mat_stone", (0.88, 0.85, 0.78), metallic=0.08, roughness=0.42)
MAT_TRIM  = make_mat("mat_trim",  (0.83, 0.66, 0.26), metallic=0.82, roughness=0.28)
MAT_METAL = make_mat("mat_metal", (0.76, 0.79, 0.84), metallic=0.88, roughness=0.22)
MAT_GEM   = make_mat("mat_gem",   (0.22, 0.74, 0.97), metallic=0.10, roughness=0.15, emissive=(0.22, 0.74, 0.97))


def lathe_bm(bm, profile, segments=28, z_offset=0.0):
    """Revolve a 2D [(r, z), ...] profile around the Z axis into a bmesh."""
    rings = []
    for r, z in profile:
        ring = []
        for i in range(segments):
            ang = (i / segments) * math.tau
            v = bm.verts.new((math.cos(ang) * r, math.sin(ang) * r, z + z_offset))
            ring.append(v)
        rings.append(ring)
    for j in range(len(rings) - 1):
        r0, r1 = rings[j], rings[j + 1]
        for i in range(segments):
            ni = (i + 1) % segments
            bm.faces.new((r0[i], r0[ni], r1[ni], r1[i]))
    # Cap bottom & top
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])


def add_box(bm, size, center=(0, 0, 0), rot_euler=(0, 0, 0), bevel_amt=0.0):
    sx, sy, sz = size
    mat = Euler(rot_euler, 'XYZ').to_matrix().to_4x4()
    mat.translation = Vector(center)
    res = bmesh.ops.create_cube(bm, size=1.0)
    verts = res["verts"]
    for v in verts:
        v.co.x *= sx
        v.co.y *= sy
        v.co.z *= sz
        v.co = mat @ v.co
    if bevel_amt > 0:
        edges = list({e for v in verts for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=edges, offset=bevel_amt, segments=2, profile=0.5)
    return verts


def add_cone(bm, r1, r2, depth, segments=16, center=(0, 0, 0), rot_euler=(0, 0, 0)):
    mat = Euler(rot_euler, 'XYZ').to_matrix().to_4x4()
    mat.translation = Vector(center)
    res = bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segments,
        radius1=r1,
        radius2=r2,
        depth=depth,
    )
    for v in res["verts"]:
        v.co = mat @ v.co
    return res["verts"]


def add_icosphere(bm, radius, subdivisions=2, center=(0, 0, 0), scale=(1, 1, 1)):
    res = bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=radius)
    cx, cy, cz = center
    sx, sy, sz = scale
    for v in res["verts"]:
        v.co.x = v.co.x * sx + cx
        v.co.y = v.co.y * sy + cy
        v.co.z = v.co.z * sz + cz
    return res["verts"]


def finalize_mesh(name, bm, mat, parent, location=(0, 0, 0), smooth=True):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if smooth:
        sharp_edges = [
            e for e in bm.edges
            if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > math.radians(38.0)
        ]
        if sharp_edges:
            bmesh.ops.split_edges(bm, edges=sharp_edges)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    if smooth:
        for p in mesh.polygons:
            p.use_smooth = True
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    scene.collection.objects.link(obj)
    obj.parent = parent
    return obj


def build_pedestal(parent, prefix, radius_scale=1.0):
    """Build a carved gothic stone pedestal (`base`) + metallic rune collar (`base_trim`)."""
    r = radius_scale
    bm_stone = bmesh.new()
    profile = [
        (0.42 * r, 0.00),
        (0.44 * r, 0.03),
        (0.41 * r, 0.07),
        (0.35 * r, 0.10),
        (0.36 * r, 0.14),
        (0.30 * r, 0.18),
        (0.28 * r, 0.21),
    ]
    lathe_bm(bm_stone, profile, segments=28)
    # Add 8 carved gothic buttress ribs around the pedestal
    for i in range(8):
        ang = (i / 8.0) * math.tau
        bx = math.cos(ang) * 0.34 * r
        by = math.sin(ang) * 0.34 * r
        add_box(bm_stone, (0.045 * r, 0.07 * r, 0.13), center=(bx, by, 0.095), rot_euler=(0, 0, ang), bevel_amt=0.008)
    finalize_mesh(f"{prefix}_base", bm_stone, MAT_STONE, parent)

    bm_trim = bmesh.new()
    trim_profile = [
        (0.365 * r, 0.115),
        (0.382 * r, 0.130),
        (0.365 * r, 0.145),
    ]
    lathe_bm(bm_trim, trim_profile, segments=28)
    finalize_mesh(f"{prefix}_base_trim", bm_trim, MAT_TRIM, parent)


# ==============================================================================
# 1. PAWN — Armored Vanguard Sentinel (Sword & Heater Shield)
# ==============================================================================
def build_pawn():
    root = bpy.data.objects.new("piece_pawn", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "pawn", radius_scale=0.88)

    # Body: Carved plate cuirass, pleated tassets, and pauldrons
    bm_body = bmesh.new()
    torso_prof = [
        (0.24, 0.20),
        (0.26, 0.26),
        (0.21, 0.35),
        (0.18, 0.44),
        (0.23, 0.56),
        (0.25, 0.66),
        (0.19, 0.74),
        (0.12, 0.78),
    ]
    lathe_bm(bm_body, torso_prof, segments=24)
    # Breastplate ridge + layered pauldrons
    add_box(bm_body, (0.28, 0.22, 0.22), center=(0, 0.05, 0.60), bevel_amt=0.025)
    add_box(bm_body, (0.16, 0.18, 0.14), center=(-0.21, 0.0, 0.67), rot_euler=(0, -0.35, 0), bevel_amt=0.02)
    add_box(bm_body, (0.16, 0.18, 0.14), center=(0.21, 0.0, 0.67), rot_euler=(0, 0.35, 0), bevel_amt=0.02)
    # Tasset plates around waist
    for i in range(6):
        ang = (i / 6.0) * math.tau
        add_box(bm_body, (0.11, 0.04, 0.15), center=(math.cos(ang) * 0.21, math.sin(ang) * 0.21, 0.34), rot_euler=(-0.18, 0, ang), bevel_amt=0.008)
    finalize_mesh("pawn_body", bm_body, MAT_STONE, root)

    # Head: Barbute Knight Helm with crest & glowing visor
    bm_head = bmesh.new()
    helm_prof = [
        (0.13, -0.02),
        (0.16, 0.04),
        (0.165, 0.14),
        (0.14, 0.23),
        (0.06, 0.28),
    ]
    lathe_bm(bm_head, helm_prof, segments=20)
    # Swept helm crest
    add_box(bm_head, (0.035, 0.26, 0.09), center=(0, -0.01, 0.24), rot_euler=(-0.15, 0, 0), bevel_amt=0.008)
    # Cheek guards
    add_box(bm_head, (0.05, 0.14, 0.14), center=(-0.12, 0.06, 0.09), rot_euler=(0, 0, 0.2), bevel_amt=0.008)
    add_box(bm_head, (0.05, 0.14, 0.14), center=(0.12, 0.06, 0.09), rot_euler=(0, 0, -0.2), bevel_amt=0.008)
    head_obj = finalize_mesh("pawn_head", bm_head, MAT_STONE, root, location=(0, 0, 0.77))

    # Glowing visor slit + chest rune (parented to head)
    bm_gem = bmesh.new()
    add_box(bm_gem, (0.18, 0.05, 0.032), center=(0, 0.145, 0.12), bevel_amt=0.004)
    add_icosphere(bm_gem, 0.045, subdivisions=1, center=(0, 0.15, -0.16))
    finalize_mesh("pawn_gem", bm_gem, MAT_GEM, head_obj)

    # Weapon (Right hand): Broad Arming Sword + Gold Crossguard
    bm_weap = bmesh.new()
    # Gauntlet + hilt
    add_box(bm_weap, (0.09, 0.11, 0.09), center=(0, 0, 0), bevel_amt=0.012)
    add_cone(bm_weap, 0.03, 0.025, 0.22, segments=10, center=(0, 0.02, -0.02))
    # Crossguard
    add_box(bm_weap, (0.24, 0.045, 0.04), center=(0, 0.02, 0.09), bevel_amt=0.008)
    # Tapered diamond blade
    add_cone(bm_weap, 0.055, 0.006, 0.62, segments=4, center=(0, 0.02, 0.41), rot_euler=(0, 0, math.pi / 4))
    finalize_mesh("pawn_weapon", bm_weap, MAT_METAL, root, location=(0.26, 0.14, 0.56))

    # Shield (Left hand): Gothic Heater Shield with Trim Boss
    bm_sh = bmesh.new()
    add_box(bm_sh, (0.06, 0.30, 0.40), center=(0, 0.04, 0.02), rot_euler=(0.08, 0, -0.22), bevel_amt=0.018)
    add_cone(bm_sh, 0.14, 0.02, 0.18, segments=4, center=(0, 0.04, -0.22), rot_euler=(math.pi, 0, 0.22))
    add_icosphere(bm_sh, 0.06, subdivisions=1, center=(-0.03, 0.07, 0.04))
    finalize_mesh("pawn_shield", bm_sh, MAT_TRIM, root, location=(-0.25, 0.15, 0.54))


# ==============================================================================
# 2. ROOK — Colossal Battlement Golem
# ==============================================================================
def build_rook():
    root = bpy.data.objects.new("piece_rook", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "rook", radius_scale=1.02)

    bm_body = bmesh.new()
    # Heavy fortress torso with buttresses
    tower_prof = [
        (0.33, 0.20),
        (0.35, 0.28),
        (0.30, 0.48),
        (0.28, 0.68),
        (0.34, 0.82),
        (0.36, 0.94),
        (0.26, 0.96),
    ]
    lathe_bm(bm_body, tower_prof, segments=16)
    # 4 heavy corner bastion pillars
    for sx in (-1, 1):
        for sy in (-1, 1):
            add_box(bm_body, (0.14, 0.14, 0.66), center=(sx * 0.21, sy * 0.21, 0.56), bevel_amt=0.018)
    # Chest fortress gate grate
    add_box(bm_body, (0.24, 0.08, 0.28), center=(0, 0.27, 0.58), bevel_amt=0.012)
    finalize_mesh("rook_body", bm_body, MAT_STONE, root)

    # Head: Crowned Gargoyle Warden Head + Crenellations
    bm_head = bmesh.new()
    add_box(bm_head, (0.34, 0.34, 0.24), center=(0, 0, 0.10), bevel_amt=0.025)
    # 8 Battlement Merlons around crown
    for i in range(8):
        ang = (i / 8.0) * math.tau
        mx = math.cos(ang) * 0.28
        my = math.sin(ang) * 0.28
        add_box(bm_head, (0.09, 0.09, 0.14), center=(mx, my, 0.24), rot_euler=(0, 0, ang), bevel_amt=0.01)
    # Brow ridge
    add_box(bm_head, (0.28, 0.08, 0.06), center=(0, 0.17, 0.16), rot_euler=(0.2, 0, 0), bevel_amt=0.01)
    head_obj = finalize_mesh("rook_head", bm_head, MAT_STONE, root, location=(0, 0, 0.92))

    # Glowing furnace eyes + heart core
    bm_gem = bmesh.new()
    add_box(bm_gem, (0.08, 0.05, 0.04), center=(-0.07, 0.17, 0.11))
    add_box(bm_gem, (0.08, 0.05, 0.04), center=(0.07, 0.17, 0.11))
    add_icosphere(bm_gem, 0.075, subdivisions=1, center=(0, 0.29, -0.32))
    finalize_mesh("rook_gem", bm_gem, MAT_GEM, head_obj)

    # Right Arm + Siege Warhammer (`weapon`)
    bm_weap = bmesh.new()
    add_box(bm_weap, (0.18, 0.20, 0.22), center=(0.04, 0, 0.12), bevel_amt=0.02)
    add_box(bm_weap, (0.15, 0.22, 0.28), center=(0.05, 0.10, -0.10), rot_euler=(0.35, 0, 0), bevel_amt=0.02)
    # Warhammer shaft & colossal head
    add_cone(bm_weap, 0.032, 0.032, 0.65, segments=10, center=(0.05, 0.20, 0.12), rot_euler=(-0.25, 0, 0))
    add_box(bm_weap, (0.18, 0.34, 0.16), center=(0.05, 0.28, 0.42), rot_euler=(-0.25, 0, 0), bevel_amt=0.018)
    finalize_mesh("rook_weapon", bm_weap, MAT_METAL, root, location=(0.34, 0.04, 0.72))

    # Left Arm + Siege Shield Gauntlet (`shield`)
    bm_sh = bmesh.new()
    add_box(bm_sh, (0.18, 0.20, 0.22), center=(-0.04, 0, 0.12), bevel_amt=0.02)
    add_box(bm_sh, (0.16, 0.26, 0.34), center=(-0.06, 0.12, -0.08), rot_euler=(0.4, 0, 0), bevel_amt=0.02)
    finalize_mesh("rook_shield", bm_sh, MAT_TRIM, root, location=(-0.34, 0.04, 0.72))


# ==============================================================================
# 3. KNIGHT — Armored Destrier Warhorse & Cavalier
# ==============================================================================
def build_knight():
    root = bpy.data.objects.new("piece_knight", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "knight", radius_scale=0.98)

    # Body: Muscular Armored Warhorse Chest, Haunches & Sweeping Neck
    bm_body = bmesh.new()
    # Lower barding skirt & equine chest
    base_prof = [
        (0.31, 0.20),
        (0.33, 0.28),
        (0.27, 0.42),
        (0.24, 0.56),
    ]
    lathe_bm(bm_body, base_prof, segments=22)
    # Sculpted arched horse neck + chest blocks
    neck_pts = [
        ((0, 0.04, 0.56), (0.30, 0.40, 0.26), (0.20, 0, 0)),
        ((0, 0.08, 0.74), (0.25, 0.32, 0.26), (0.35, 0, 0)),
        ((0, 0.10, 0.92), (0.21, 0.26, 0.24), (0.48, 0, 0)),
    ]
    for center, sz, rot in neck_pts:
        add_box(bm_body, sz, center=center, rot_euler=rot, bevel_amt=0.03)
    # Braided stone mane plates running up the spine (-Y side)
    for i in range(6):
        t = i / 5.0
        mz = 0.54 + t * 0.48
        my = -0.13 + t * 0.05
        add_box(bm_body, (0.06, 0.12, 0.09), center=(0, my, mz), rot_euler=(0.45, 0, 0), bevel_amt=0.01)
    finalize_mesh("knight_body", bm_body, MAT_STONE, root)

    # Head: Armored Destrier Head with Chanfron Faceplate & Ears
    bm_head = bmesh.new()
    # Cranium + tapered muzzle pointing forward (+Y) and slightly down
    add_box(bm_head, (0.21, 0.26, 0.20), center=(0, 0.02, 0.06), rot_euler=(-0.25, 0, 0), bevel_amt=0.025)
    add_cone(bm_head, 0.12, 0.075, 0.34, segments=8, center=(0, 0.22, -0.02), rot_euler=(-1.22, 0, 0))
    # Armored chanfron crest on forehead
    add_box(bm_head, (0.08, 0.30, 0.04), center=(0, 0.16, 0.08), rot_euler=(-0.38, 0, 0), bevel_amt=0.008)
    # Twin alertness ears
    add_cone(bm_head, 0.04, 0.008, 0.15, segments=6, center=(-0.07, -0.04, 0.20), rot_euler=(-0.2, -0.15, 0))
    add_cone(bm_head, 0.04, 0.008, 0.15, segments=6, center=(0.07, -0.04, 0.20), rot_euler=(-0.2, 0.15, 0))
    head_obj = finalize_mesh("knight_head", bm_head, MAT_STONE, root, location=(0, 0.08, 1.02))

    # Glowing warhorse eyes + forehead gem
    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.032, subdivisions=1, center=(-0.095, 0.10, 0.06))
    add_icosphere(bm_gem, 0.032, subdivisions=1, center=(0.095, 0.10, 0.06))
    add_icosphere(bm_gem, 0.04, subdivisions=1, center=(0, 0.16, 0.11))
    finalize_mesh("knight_gem", bm_gem, MAT_GEM, head_obj)

    # Weapon: Couched Jousting Lance with Vamplate Guard
    bm_weap = bmesh.new()
    # Vamplate hand-cone + long fluted lance pointing forward (+Y) and slightly up
    add_cone(bm_weap, 0.11, 0.03, 0.18, segments=12, center=(0, 0.05, 0.02), rot_euler=(-1.35, 0, 0))
    add_cone(bm_weap, 0.042, 0.006, 0.92, segments=10, center=(0, 0.46, 0.12), rot_euler=(-1.35, 0, 0))
    add_cone(bm_weap, 0.025, 0.035, 0.24, segments=8, center=(0, -0.12, -0.03), rot_euler=(-1.35, 0, 0))
    finalize_mesh("knight_weapon", bm_weap, MAT_METAL, root, location=(0.24, 0.05, 0.68))

    # Shield: Flank HeraldicTarge Shield
    bm_sh = bmesh.new()
    add_box(bm_sh, (0.05, 0.28, 0.34), center=(0, 0.02, 0), rot_euler=(0.15, -0.2, -0.15), bevel_amt=0.015)
    finalize_mesh("knight_shield", bm_sh, MAT_TRIM, root, location=(-0.24, 0.08, 0.68))


# ==============================================================================
# 4. BISHOP — High Arcane Prelate & Crosier Staff
# ==============================================================================
def build_bishop():
    root = bpy.data.objects.new("piece_bishop", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "bishop", radius_scale=0.95)

    # Body: Flowing Pleated Vestments & Arcane Mantle
    bm_body = bmesh.new()
    robe_prof = [
        (0.30, 0.20),
        (0.31, 0.26),
        (0.25, 0.45),
        (0.21, 0.65),
        (0.18, 0.82),
        (0.22, 0.92),
        (0.14, 0.98),
    ]
    lathe_bm(bm_body, robe_prof, segments=28)
    # Vertical stole & pleated drapery ribs
    for i in range(8):
        ang = (i / 8.0) * math.tau
        rx = math.cos(ang) * 0.22
        ry = math.sin(ang) * 0.22
        add_box(bm_body, (0.04, 0.06, 0.58), center=(rx, ry, 0.52), rot_euler=(0, 0, ang), bevel_amt=0.008)
    # High arcane shoulder collar
    add_cone(bm_body, 0.24, 0.15, 0.14, segments=20, center=(0, 0, 0.93))
    finalize_mesh("bishop_body", bm_body, MAT_STONE, root)

    # Head: Tall Cleft Mitre Crown with Inscribed Cross
    bm_head = bmesh.new()
    mitre_prof = [
        (0.12, 0.00),
        (0.14, 0.06),
        (0.15, 0.16),
        (0.11, 0.28),
        (0.03, 0.36),
    ]
    lathe_bm(bm_head, mitre_prof, segments=22)
    # Front/back mitre peaks
    add_cone(bm_head, 0.11, 0.015, 0.18, segments=4, center=(0, 0.04, 0.29), rot_euler=(0.15, 0, math.pi / 4))
    add_cone(bm_head, 0.10, 0.015, 0.16, segments=4, center=(0, -0.05, 0.27), rot_euler=(-0.15, 0, math.pi / 4))
    head_obj = finalize_mesh("bishop_head", bm_head, MAT_STONE, root, location=(0, 0, 0.98))

    # Glowing Mitre Rune + Levitating Focus Crystal (`gem`)
    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.05, subdivisions=1, center=(0, 0.13, 0.16))
    add_box(bm_gem, (0.03, 0.03, 0.14), center=(0, 0.14, 0.16))
    add_box(bm_gem, (0.10, 0.03, 0.03), center=(0, 0.14, 0.18))
    finalize_mesh("bishop_gem", bm_gem, MAT_GEM, head_obj)

    # Weapon: Ornate Spiral Crosier Staff + Floating Crystal Head
    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.026, 0.020, 1.05, segments=12, center=(0, 0, 0.18))
    # Crosier halo ring at top of staff
    for i in range(12):
        ang = (i / 12.0) * math.tau
        add_box(bm_weap, (0.025, 0.025, 0.045), center=(math.cos(ang) * 0.09, 0, 0.74 + math.sin(ang) * 0.09), rot_euler=(0, ang, 0))
    add_icosphere(bm_weap, 0.055, subdivisions=1, center=(0, 0, 0.74))
    finalize_mesh("bishop_weapon", bm_weap, MAT_TRIM, root, location=(0.24, 0.12, 0.56))

    # Shield: Open Arcane Grimoire Tome in Left Hand
    bm_sh = bmesh.new()
    add_box(bm_sh, (0.16, 0.20, 0.045), center=(0, 0.06, 0), rot_euler=(-0.45, 0.25, 0), bevel_amt=0.008)
    finalize_mesh("bishop_shield", bm_sh, MAT_TRIM, root, location=(-0.21, 0.16, 0.70))


# ==============================================================================
# 5. QUEEN — Sorceress Empress
# ==============================================================================
def build_queen():
    root = bpy.data.objects.new("piece_queen", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "queen", radius_scale=1.02)

    # Body: Sweeping Hourglass Corset Gown & High Royal Collar
    bm_body = bmesh.new()
    queen_prof = [
        (0.33, 0.20),
        (0.34, 0.28),
        (0.28, 0.45),
        (0.21, 0.66),
        (0.17, 0.80),
        (0.23, 0.94),
        (0.18, 1.04),
        (0.12, 1.08),
    ]
    lathe_bm(bm_body, queen_prof, segments=32)
    # Fluted gown folds
    for i in range(10):
        ang = (i / 10.0) * math.tau
        gx = math.cos(ang) * 0.25
        gy = math.sin(ang) * 0.25
        add_box(bm_body, (0.035, 0.055, 0.56), center=(gx, gy, 0.48), rot_euler=(0, 0, ang), bevel_amt=0.008)
    # High fanned sorceress collar behind shoulders
    for i in range(-3, 4):
        ang = i * 0.22
        cx = math.sin(ang) * 0.18
        cy = -0.10 - math.cos(ang) * 0.06
        add_cone(bm_body, 0.04, 0.008, 0.24, segments=6, center=(cx, cy, 1.10), rot_euler=(-0.35, ang * 0.7, 0))
    finalize_mesh("queen_body", bm_body, MAT_STONE, root)

    # Head: Sculpted Empress Head + 8-Spiked Celestial Coronet
    bm_head = bmesh.new()
    head_prof = [
        (0.11, 0.00),
        (0.13, 0.08),
        (0.135, 0.17),
        (0.145, 0.22),
        (0.09, 0.26),
    ]
    lathe_bm(bm_head, head_prof, segments=24)
    # 8 Crown Spikes
    for i in range(8):
        ang = (i / 8.0) * math.tau
        sx = math.cos(ang) * 0.135
        sy = math.sin(ang) * 0.135
        add_cone(bm_head, 0.026, 0.004, 0.13, segments=6, center=(sx, sy, 0.26), rot_euler=(math.sin(ang) * 0.18, -math.cos(ang) * 0.18, 0))
    head_obj = finalize_mesh("queen_head", bm_head, MAT_STONE, root, location=(0, 0, 1.07))

    # Crown Jewel & Levitating Empress Heart (`gem`)
    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.058, subdivisions=2, center=(0, 0, 0.31))
    add_icosphere(bm_gem, 0.042, subdivisions=1, center=(0, 0.14, 0.12))
    finalize_mesh("queen_gem", bm_gem, MAT_GEM, head_obj)

    # Weapon: Royal Sun-Burst Scepter
    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.024, 0.016, 1.08, segments=12, center=(0, 0, 0.22))
    add_icosphere(bm_weap, 0.065, subdivisions=2, center=(0, 0, 0.78))
    for i in range(6):
        ang = (i / 6.0) * math.tau
        add_cone(bm_weap, 0.018, 0.003, 0.12, segments=5, center=(math.cos(ang) * 0.08, 0, 0.78 + math.sin(ang) * 0.08), rot_euler=(0, ang + math.pi / 2, 0))
    finalize_mesh("queen_weapon", bm_weap, MAT_TRIM, root, location=(0.25, 0.12, 0.64))

    # Shield: Levitating Arcane Orb in Left Hand
    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.075, subdivisions=2, center=(0, 0.06, 0.06))
    finalize_mesh("queen_shield", bm_sh, MAT_GEM, root, location=(-0.24, 0.16, 0.82))


# ==============================================================================
# 6. KING — High Sovereign Monarch
# ==============================================================================
def build_king():
    root = bpy.data.objects.new("piece_king", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "king", radius_scale=1.08)

    # Body: Broad Sovereign Mantle, Plate Armor & Royal Cloak
    bm_body = bmesh.new()
    king_prof = [
        (0.35, 0.20),
        (0.36, 0.30),
        (0.31, 0.52),
        (0.28, 0.76),
        (0.33, 0.98),
        (0.28, 1.10),
        (0.16, 1.15),
    ]
    lathe_bm(bm_body, king_prof, segments=28)
    # Heavy royal pauldrons & breastplate
    add_box(bm_body, (0.38, 0.26, 0.28), center=(0, 0.05, 0.92), bevel_amt=0.03)
    add_box(bm_body, (0.20, 0.24, 0.18), center=(-0.27, 0.0, 1.00), rot_euler=(0, -0.3, 0), bevel_amt=0.025)
    add_box(bm_body, (0.20, 0.24, 0.18), center=(0.27, 0.0, 1.00), rot_euler=(0, 0.3, 0), bevel_amt=0.025)
    # Flowing back cloak folds
    add_box(bm_body, (0.44, 0.12, 0.82), center=(0, -0.22, 0.62), rot_euler=(0.10, 0, 0), bevel_amt=0.025)
    finalize_mesh("king_body", bm_body, MAT_STONE, root)

    # Head: Bearded Sovereign Visage + Imperial Arched Crown + Cross Finial
    bm_head = bmesh.new()
    head_prof = [
        (0.13, 0.00),
        (0.15, 0.08),
        (0.155, 0.18),
        (0.17, 0.25),
        (0.13, 0.31),
    ]
    lathe_bm(bm_head, head_prof, segments=24)
    # Sculpted stone beard on front (+Y)
    add_cone(bm_head, 0.11, 0.03, 0.18, segments=8, center=(0, 0.12, 0.02), rot_euler=(math.pi - 0.2, 0, 0))
    # Imperial Cross Finial on top of crown
    add_box(bm_head, (0.045, 0.045, 0.20), center=(0, 0, 0.40), bevel_amt=0.006)
    add_box(bm_head, (0.15, 0.045, 0.045), center=(0, 0, 0.42), bevel_amt=0.006)
    head_obj = finalize_mesh("king_head", bm_head, MAT_STONE, root, location=(0, 0, 1.14))

    # Glowing Crown Jewels & Eyes (`gem`)
    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.048, subdivisions=1, center=(0, 0.16, 0.24))
    add_icosphere(bm_gem, 0.042, subdivisions=1, center=(0, 0, 0.42))
    add_box(bm_gem, (0.14, 0.04, 0.028), center=(0, 0.145, 0.14))
    finalize_mesh("king_gem", bm_gem, MAT_GEM, head_obj)

    # Weapon: Sovereign Two-Handed Greatsword (`weapon`)
    bm_weap = bmesh.new()
    # Pommel + grip + sweeping winged crossguard + broad fuller blade
    add_icosphere(bm_weap, 0.045, subdivisions=1, center=(0, 0, -0.18))
    add_cone(bm_weap, 0.028, 0.024, 0.24, segments=10, center=(0, 0, -0.05))
    add_box(bm_weap, (0.34, 0.055, 0.048), center=(0, 0, 0.08), bevel_amt=0.01)
    add_cone(bm_weap, 0.072, 0.008, 0.88, segments=4, center=(0, 0, 0.52), rot_euler=(0, 0, math.pi / 4))
    finalize_mesh("king_weapon", bm_weap, MAT_METAL, root, location=(0.24, 0.20, 0.66))

    # Shield: Royal Pauldron Signet Shield (`shield`)
    bm_sh = bmesh.new()
    add_box(bm_sh, (0.06, 0.26, 0.34), center=(0, 0.04, 0), rot_euler=(0.1, 0, -0.2), bevel_amt=0.015)
    finalize_mesh("king_shield", bm_sh, MAT_TRIM, root, location=(-0.28, 0.14, 0.72))


build_pawn()
build_rook()
build_knight()
build_bishop()
build_queen()
build_king()

os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=os.path.abspath(out_path),
    export_format='GLB',
    export_yup=True,
    export_apply=True,
)
print(f"Exported Wizard Chess GLB to {out_path}")
