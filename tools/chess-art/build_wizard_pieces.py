"""Sculpt 6 highly distinct 3D Wizard Chess warrior archetypes in Blender and export to GLB.

Run headlessly with Blender:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/chess-art/build_wizard_pieces.py -- apps/chess/assets/wizard-pieces.glb

Each archetype has a radically distinct silhouette, height scale, posture, and
6-material separation (`mat_stone`, `mat_cloth`, `mat_trim`, `mat_metal`, `mat_wood`, `mat_gem`):
  1. PAWN   (~0.84m): Squat Phalanx Pikeman — steel kettle-sallet helm, oversized heraldic tower shield, angled halberd spear.
  2. ROOK   (~1.22m): Wide Square Castle-Keep Siege Golem — 4 corner watch-turrets with fire braziers, iron portcullis chest with furnace core, twin battering-ram fists.
  3. KNIGHT (~1.36m): Full Rearing Armored Warhorse — hind legs, pawing forelegs, draped cloth caparison, spiked steel chanfron, flowing plume, and bannered jousting lance.
  4. BISHOP (~1.46m): Slender Levitating Arch-Mage — billowing velvet robe, tall curved wizard-mitre hat, orbiting golden astrolabe rings, grimoire tome, and crescent runestone staff.
  5. QUEEN  (~1.62m): Winged Valkyrie Sorceress Empress — unfurled golden seraph wings, royal velvet train, 8-ray sunburst halo diadem, floating arcane orbs, and star scepter.
  6. KING   (~1.82m): Towering Sovereign War-Monarch — raised royal dais, broad lion-pauldron mantle, flowing cape, oversized arched imperial cross-crown, and giant runed greatsword.
"""
import math
import os
import sys
import bpy
import bmesh
from mathutils import Vector, Euler

argv = sys.argv
out_path = "apps/chess/assets/wizard-pieces.glb"
if "--" in argv:
    extra = argv[argv.index("--") + 1:]
    if extra:
        out_path = extra[0]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


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
            bsdf.inputs["Emission Strength"].default_value = 1.5 if any(emissive) else 0.0
    return m


MAT_STONE = make_mat("mat_stone", (0.90, 0.86, 0.78), metallic=0.08, roughness=0.40)
MAT_CLOTH = make_mat("mat_cloth", (0.16, 0.34, 0.64), metallic=0.05, roughness=0.65)
MAT_TRIM  = make_mat("mat_trim",  (0.90, 0.70, 0.24), metallic=0.88, roughness=0.22)
MAT_METAL = make_mat("mat_metal", (0.82, 0.86, 0.92), metallic=0.92, roughness=0.18)
MAT_WOOD  = make_mat("mat_wood",  (0.42, 0.25, 0.14), metallic=0.05, roughness=0.72)
MAT_GEM   = make_mat("mat_gem",   (0.25, 0.85, 1.00), metallic=0.10, roughness=0.12, emissive=(0.20, 0.78, 1.00))


def lathe_bm(bm, profile, segments=28, z_offset=0.0, scale_xy=(1.0, 1.0)):
    sx, sy = scale_xy
    rings = []
    for r, z in profile:
        ring = []
        for i in range(segments):
            ang = (i / segments) * math.tau
            v = bm.verts.new((math.cos(ang) * r * sx, math.sin(ang) * r * sy, z + z_offset))
            ring.append(v)
        rings.append(ring)
    for j in range(len(rings) - 1):
        r0, r1 = rings[j], rings[j + 1]
        for i in range(segments):
            ni = (i + 1) % segments
            bm.faces.new((r0[i], r0[ni], r1[ni], r1[i]))
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


def add_cone(bm, r1, r2, depth, segments=16, center=(0, 0, 0), rot_euler=(0, 0, 0), scale=(1, 1, 1)):
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
    sx, sy, sz = scale
    for v in res["verts"]:
        v.co.x *= sx
        v.co.y *= sy
        v.co.z *= sz
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


def add_torus_ring(bm, major_r, minor_r, seg_major=24, seg_minor=8, center=(0, 0, 0), rot_euler=(0, 0, 0)):
    mat = Euler(rot_euler, 'XYZ').to_matrix().to_4x4()
    mat.translation = Vector(center)
    rings = []
    for i in range(seg_major):
        theta = (i / seg_major) * math.tau
        ct, st = math.cos(theta), math.sin(theta)
        ring = []
        for j in range(seg_minor):
            phi = (j / seg_minor) * math.tau
            cp, sp = math.cos(phi), math.sin(phi)
            r = major_r + minor_r * cp
            pt = Vector((r * ct, r * st, minor_r * sp))
            ring.append(bm.verts.new(mat @ pt))
        rings.append(ring)
    for i in range(seg_major):
        ni = (i + 1) % seg_major
        for j in range(seg_minor):
            nj = (j + 1) % seg_minor
            bm.faces.new((rings[i][j], rings[ni][j], rings[ni][nj], rings[i][nj]))


def finalize_mesh(name, bm, mat, parent, location=(0, 0, 0), smooth=True):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if smooth:
        sharp_edges = [
            e for e in bm.edges
            if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > math.radians(36.0)
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


def build_pedestal(parent, prefix, radius_scale=1.0, height_scale=1.0, octagonal=False):
    r = radius_scale
    h = height_scale
    segs = 8 if octagonal else 28
    bm_stone = bmesh.new()
    profile = [
        (0.42 * r, 0.00),
        (0.44 * r, 0.03 * h),
        (0.40 * r, 0.07 * h),
        (0.35 * r, 0.11 * h),
        (0.32 * r, 0.16 * h),
    ]
    lathe_bm(bm_stone, profile, segments=segs)
    finalize_mesh(f"{prefix}_base", bm_stone, MAT_STONE, parent)

    bm_trim = bmesh.new()
    trim_profile = [
        (0.365 * r, 0.095 * h),
        (0.388 * r, 0.115 * h),
        (0.365 * r, 0.135 * h),
    ]
    lathe_bm(bm_trim, trim_profile, segments=segs)
    finalize_mesh(f"{prefix}_base_trim", bm_trim, MAT_TRIM, parent)


# ==============================================================================
# 1. PAWN — Compact Squat Phalanx Pikeman (Height ~0.84m, Tower Shield + Halberd)
# ==============================================================================
def build_pawn():
    root = bpy.data.objects.new("piece_pawn", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "pawn", radius_scale=0.82, height_scale=0.85)

    # Squat armored legs + brigandine tunic
    bm_body = bmesh.new()
    add_box(bm_body, (0.12, 0.13, 0.22), center=(-0.09, 0.0, 0.24), bevel_amt=0.015)
    add_box(bm_body, (0.12, 0.13, 0.22), center=(0.09, 0.0, 0.24), bevel_amt=0.015)
    add_box(bm_body, (0.30, 0.22, 0.26), center=(0, 0.02, 0.44), rot_euler=(0.12, 0, 0), bevel_amt=0.025)
    finalize_mesh("pawn_body", bm_body, MAT_STONE, root)

    # Cloth surcoat tabard over chest & waist
    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.24, 0.24, 0.26), center=(0, 0.03, 0.41), rot_euler=(0.12, 0, 0), bevel_amt=0.015)
    add_box(bm_cloth, (0.20, 0.05, 0.18), center=(0, 0.13, 0.28), rot_euler=(0.20, 0, 0), bevel_amt=0.008)
    finalize_mesh("pawn_cloth", bm_cloth, MAT_CLOTH, root)

    # Head: Wide-Brimmed Steel Kettle / Sallet Infantry Helmet (`mat_metal`!)
    bm_head = bmesh.new()
    # Skull dome + wide flared infantry brim
    helm_prof = [
        (0.11, 0.00),
        (0.14, 0.05),
        (0.22, 0.06),  # wide kettle brim!
        (0.21, 0.08),
        (0.14, 0.10),
        (0.13, 0.18),
        (0.08, 0.23),
        (0.02, 0.26),
    ]
    lathe_bm(bm_head, helm_prof, segments=22)
    head_obj = finalize_mesh("pawn_head", bm_head, MAT_METAL, root, location=(0, 0.03, 0.56))

    # Glowing Visor Eye Slit
    bm_gem = bmesh.new()
    add_box(bm_gem, (0.16, 0.04, 0.03), center=(0, 0.13, 0.04))
    finalize_mesh("pawn_gem", bm_gem, MAT_GEM, head_obj)

    # Weapon: Angled Infantry Halberd / Pike (`pawn_weapon`)
    bm_weap = bmesh.new()
    # Long spear shaft + halberd axe blade + top spike jutting forward & up
    add_cone(bm_weap, 0.024, 0.020, 0.92, segments=10, center=(0, 0.08, 0.18), rot_euler=(-0.55, 0, 0))
    # Halberd crescent axe head
    add_box(bm_weap, (0.025, 0.18, 0.22), center=(0, 0.34, 0.44), rot_euler=(-0.55, 0, 0), bevel_amt=0.006)
    add_cone(bm_weap, 0.035, 0.004, 0.24, segments=6, center=(0, 0.34, 0.62), rot_euler=(-0.55, 0, 0))
    finalize_mesh("pawn_weapon", bm_weap, MAT_METAL, root, location=(0.23, 0.06, 0.42))

    # Shield: Oversized Curved Phalanx Tower Shield covering front-left (`pawn_shield`)
    bm_sh = bmesh.new()
    add_box(bm_sh, (0.28, 0.06, 0.46), center=(0, 0.04, 0.0), rot_euler=(0.10, 0, 0.35), bevel_amt=0.018)
    add_icosphere(bm_sh, 0.065, subdivisions=1, center=(-0.03, 0.08, 0.02))
    finalize_mesh("pawn_shield", bm_sh, MAT_TRIM, root, location=(-0.18, 0.18, 0.42))


# ==============================================================================
# 2. ROOK — Colossal Square Castle-Keep Siege Golem (Height ~1.22m, Ultra-Wide)
# ==============================================================================
def build_rook():
    root = bpy.data.objects.new("piece_rook", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "rook", radius_scale=1.08, height_scale=1.0, octagonal=True)

    # Massive Square Fortress Keep Body + 4 Corner Watch-Turrets
    bm_body = bmesh.new()
    # Thick stomping stone pillar legs
    add_box(bm_body, (0.20, 0.22, 0.28), center=(-0.16, 0, 0.26), bevel_amt=0.02)
    add_box(bm_body, (0.20, 0.22, 0.28), center=(0.16, 0, 0.26), bevel_amt=0.02)
    # Central square castle keep torso
    add_box(bm_body, (0.50, 0.44, 0.56), center=(0, 0, 0.64), bevel_amt=0.03)
    # 4 distinct round corner castle turrets!
    for sx in (-1, 1):
        for sy in (-1, 1):
            tx, ty = sx * 0.25, sy * 0.22
            add_cone(bm_body, 0.11, 0.12, 0.68, segments=12, center=(tx, ty, 0.68))
    finalize_mesh("rook_body", bm_body, MAT_STONE, root)

    # Iron Portcullis Gate on Chest + Shoulder Chains (`mat_metal`)
    bm_metal = bmesh.new()
    for gx in (-0.12, -0.04, 0.04, 0.12):
        add_box(bm_metal, (0.022, 0.04, 0.34), center=(gx, 0.23, 0.62))
    for gz in (0.50, 0.62, 0.74):
        add_box(bm_metal, (0.30, 0.04, 0.022), center=(0, 0.23, gz))
    finalize_mesh("rook_metal", bm_metal, MAT_METAL, root)

    # Head: Crenellated Fortress Crown + Gargoyle Brow (`rook_head`)
    bm_head = bmesh.new()
    add_box(bm_head, (0.56, 0.50, 0.18), center=(0, 0, 0.08), bevel_amt=0.02)
    # Prominent castle merlons around all 4 sides
    for ox in (-0.22, 0.0, 0.22):
        add_box(bm_head, (0.10, 0.09, 0.14), center=(ox, 0.21, 0.22), bevel_amt=0.01)
        add_box(bm_head, (0.10, 0.09, 0.14), center=(ox, -0.21, 0.22), bevel_amt=0.01)
    for oy in (-0.18, 0.18):
        add_box(bm_head, (0.09, 0.10, 0.14), center=(-0.24, oy, 0.22), bevel_amt=0.01)
        add_box(bm_head, (0.09, 0.10, 0.14), center=(0.24, oy, 0.22), bevel_amt=0.01)
    head_obj = finalize_mesh("rook_head", bm_head, MAT_TRIM, root, location=(0, 0, 0.94))

    # Glowing Furnace Heart behind Portcullis + 4 Corner Turret Braziers (`rook_gem`)
    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.14, subdivisions=1, center=(0, 0.15, -0.32))
    add_box(bm_gem, (0.10, 0.05, 0.045), center=(-0.09, 0.26, 0.08))
    add_box(bm_gem, (0.10, 0.05, 0.045), center=(0.09, 0.26, 0.08))
    for sx in (-1, 1):
        for sy in (-1, 1):
            add_cone(bm_gem, 0.07, 0.01, 0.16, segments=8, center=(sx * 0.25, sy * 0.22, 0.18))
    finalize_mesh("rook_gem", bm_gem, MAT_GEM, head_obj)

    # Right Siege Warhammer Arm (`rook_weapon`)
    bm_weap = bmesh.new()
    add_box(bm_weap, (0.18, 0.20, 0.34), center=(0.08, 0.04, -0.08), rot_euler=(0.3, 0, 0), bevel_amt=0.02)
    add_cone(bm_weap, 0.036, 0.036, 0.72, segments=10, center=(0.08, 0.22, 0.14), rot_euler=(-0.35, 0, 0))
    add_box(bm_weap, (0.22, 0.40, 0.20), center=(0.08, 0.34, 0.44), rot_euler=(-0.35, 0, 0), bevel_amt=0.02)
    finalize_mesh("rook_weapon", bm_weap, MAT_METAL, root, location=(0.34, 0.02, 0.74))

    # Left Siege Battering-Ram Gauntlet (`rook_shield`)
    bm_sh = bmesh.new()
    add_box(bm_sh, (0.18, 0.20, 0.34), center=(-0.08, 0.04, -0.08), rot_euler=(0.3, 0, 0), bevel_amt=0.02)
    add_box(bm_sh, (0.22, 0.32, 0.26), center=(-0.08, 0.22, -0.18), rot_euler=(0.4, 0, 0), bevel_amt=0.025)
    finalize_mesh("rook_shield", bm_sh, MAT_TRIM, root, location=(-0.34, 0.02, 0.74))


# ==============================================================================
# 3. KNIGHT — Full Rearing Armored Warhorse (Height ~1.36m, Forelegs + Plume + Lance)
# ==============================================================================
def build_knight():
    root = bpy.data.objects.new("piece_knight", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "knight", radius_scale=0.96, height_scale=0.95)

    # Flowing Cloth Caparison Barding Skirt over Hindquarters (`mat_cloth`)
    bm_cloth = bmesh.new()
    add_cone(bm_cloth, 0.34, 0.24, 0.44, segments=18, center=(0, -0.04, 0.36), rot_euler=(-0.18, 0, 0), scale=(0.88, 1.15, 1.0))
    # Saddlecloth + Gold Trim Flank Guards
    add_box(bm_cloth, (0.34, 0.44, 0.22), center=(0, 0.0, 0.56), rot_euler=(-0.35, 0, 0), bevel_amt=0.025)
    finalize_mesh("knight_cloth", bm_cloth, MAT_CLOTH, root)

    # Sculpted Rearing Equine Body, Muscular Neck & Pawing Forelegs (`knight_body`)
    bm_body = bmesh.new()
    # Hind legs planted on pedestal
    add_box(bm_body, (0.11, 0.14, 0.34), center=(-0.12, -0.10, 0.30), rot_euler=(0.25, 0, 0), bevel_amt=0.015)
    add_box(bm_body, (0.11, 0.14, 0.34), center=(0.12, -0.10, 0.30), rot_euler=(0.25, 0, 0), bevel_amt=0.015)
    # Rearing horse chest & arched muscular neck
    add_box(bm_body, (0.28, 0.38, 0.34), center=(0, 0.05, 0.66), rot_euler=(-0.42, 0, 0), bevel_amt=0.035)
    add_box(bm_body, (0.22, 0.30, 0.34), center=(0, 0.12, 0.90), rot_euler=(-0.28, 0, 0), bevel_amt=0.03)
    # TWO REARING FORELEGS pawing the air in front (+Y)!
    # Left foreleg raised high, right foreleg bent
    add_box(bm_body, (0.085, 0.26, 0.09), center=(-0.13, 0.26, 0.72), rot_euler=(0.45, 0, 0), bevel_amt=0.012)
    add_box(bm_body, (0.075, 0.24, 0.08), center=(-0.13, 0.38, 0.58), rot_euler=(-0.65, 0, 0), bevel_amt=0.01)
    add_box(bm_body, (0.085, 0.26, 0.09), center=(0.13, 0.25, 0.66), rot_euler=(0.25, 0, 0), bevel_amt=0.012)
    add_box(bm_body, (0.075, 0.24, 0.08), center=(0.13, 0.36, 0.50), rot_euler=(-0.80, 0, 0), bevel_amt=0.01)
    finalize_mesh("knight_body", bm_body, MAT_STONE, root)

    # Golden Braided Mane + Breastplate Trim (`mat_trim`)
    bm_trim = bmesh.new()
    for i in range(7):
        t = i / 6.0
        mz = 0.62 + t * 0.48
        my = -0.12 + t * 0.08
        add_box(bm_trim, (0.055, 0.14, 0.085), center=(0, my, mz), rot_euler=(0.55, 0, 0), bevel_amt=0.01)
    add_box(bm_trim, (0.32, 0.12, 0.14), center=(0, 0.20, 0.72), rot_euler=(-0.3, 0, 0), bevel_amt=0.015)
    finalize_mesh("knight_trim", bm_trim, MAT_TRIM, root)

    # Head: Steel-Armored Warhorse Head + Spiked Chanfron + Sweeping Plume (`knight_head`)
    bm_head = bmesh.new()
    add_box(bm_head, (0.20, 0.26, 0.20), center=(0, 0.02, 0.06), rot_euler=(-0.25, 0, 0), bevel_amt=0.025)
    add_cone(bm_head, 0.12, 0.07, 0.38, segments=8, center=(0, 0.24, -0.03), rot_euler=(-1.25, 0, 0))
    # Unicorn/Chanfron forehead spike + ears
    add_cone(bm_head, 0.035, 0.004, 0.22, segments=6, center=(0, 0.24, 0.14), rot_euler=(-0.85, 0, 0))
    add_cone(bm_head, 0.04, 0.006, 0.16, segments=6, center=(-0.075, -0.04, 0.21), rot_euler=(-0.2, -0.15, 0))
    add_cone(bm_head, 0.04, 0.006, 0.16, segments=6, center=(0.075, -0.04, 0.21), rot_euler=(-0.2, 0.15, 0))
    # Dramatic sweeping crest plume arcing backward
    add_cone(bm_head, 0.06, 0.01, 0.34, segments=8, center=(0, -0.14, 0.22), rot_euler=(0.85, 0, 0))
    head_obj = finalize_mesh("knight_head", bm_head, MAT_METAL, root, location=(0, 0.10, 1.06))

    # Glowing Destrier Eyes (`knight_gem`)
    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.034, subdivisions=1, center=(-0.095, 0.10, 0.06))
    add_icosphere(bm_gem, 0.034, subdivisions=1, center=(0.095, 0.10, 0.06))
    finalize_mesh("knight_gem", bm_gem, MAT_GEM, head_obj)

    # Weapon: Spiral Jousting Lance (`knight_weapon`)
    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.12, 0.03, 0.20, segments=12, center=(0, 0.06, 0.02), rot_euler=(-1.32, 0, 0))
    add_cone(bm_weap, 0.045, 0.005, 1.05, segments=10, center=(0, 0.52, 0.14), rot_euler=(-1.32, 0, 0))
    finalize_mesh("knight_weapon", bm_weap, MAT_METAL, root, location=(0.24, 0.05, 0.72))

    # Shield: Flank Heraldic Heater Shield (`knight_shield`)
    bm_sh = bmesh.new()
    add_box(bm_sh, (0.05, 0.30, 0.36), center=(0, 0.02, 0), rot_euler=(0.15, -0.2, -0.18), bevel_amt=0.015)
    finalize_mesh("knight_shield", bm_sh, MAT_TRIM, root, location=(-0.24, 0.06, 0.72))


# ==============================================================================
# 4. BISHOP — Levitating Arch-Mage (Height ~1.46m, Wizard Mitre + Astrolabe Halo Rings)
# ==============================================================================
def build_bishop():
    root = bpy.data.objects.new("piece_bishop", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "bishop", radius_scale=0.92, height_scale=0.95)

    # Flowing Velvet Arch-Mage Robes (`mat_cloth` — floats slightly above pedestal!)
    bm_cloth = bmesh.new()
    robe_prof = [
        (0.28, 0.22),
        (0.24, 0.42),
        (0.18, 0.68),
        (0.15, 0.88),
        (0.21, 0.98),
        (0.12, 1.04),
    ]
    lathe_bm(bm_cloth, robe_prof, segments=26, scale_xy=(0.92, 1.08))
    # High dramatic arcane collar behind head
    add_cone(bm_cloth, 0.26, 0.12, 0.22, segments=16, center=(0, -0.04, 1.02), rot_euler=(-0.25, 0, 0))
    finalize_mesh("bishop_body", bm_cloth, MAT_CLOTH, root)

    # Orbiting Golden Astrolabe Halo Rings + Embroidered Stole (`mat_trim`)
    bm_trim = bmesh.new()
    add_box(bm_trim, (0.11, 0.04, 0.68), center=(0, 0.19, 0.58), rot_euler=(-0.10, 0, 0), bevel_amt=0.008)
    # Two intersecting celestial astrolabe rings floating around the Bishop!
    add_torus_ring(bm_trim, 0.34, 0.018, seg_major=28, seg_minor=8, center=(0, 0, 0.76), rot_euler=(0.55, 0.35, 0))
    add_torus_ring(bm_trim, 0.31, 0.015, seg_major=28, seg_minor=8, center=(0, 0, 0.76), rot_euler=(-0.55, -0.35, 0))
    finalize_mesh("bishop_trim", bm_trim, MAT_TRIM, root)

    # Head: Tall Curved Wizard-Mitre Hat (`bishop_head`)
    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.12, subdivisions=2, center=(0, 0, 0.06))
    # Wide wizard-mitre brim + tall swept-back pointed peak
    add_cone(bm_head, 0.24, 0.13, 0.06, segments=22, center=(0, 0, 0.13))
    add_cone(bm_head, 0.14, 0.03, 0.28, segments=18, center=(0, -0.02, 0.28), rot_euler=(-0.18, 0, 0))
    add_cone(bm_head, 0.05, 0.004, 0.18, segments=12, center=(0, -0.08, 0.44), rot_euler=(-0.48, 0, 0))
    head_obj = finalize_mesh("bishop_head", bm_head, MAT_STONE, root, location=(0, 0, 1.02))

    # Glowing Arch-Mage Eyes + Levitating Forehead Sigil (`bishop_gem`)
    bm_gem = bmesh.new()
    add_box(bm_gem, (0.12, 0.04, 0.028), center=(0, 0.11, 0.06))
    add_icosphere(bm_gem, 0.045, subdivisions=1, center=(0, 0.12, 0.22))
    finalize_mesh("bishop_gem", bm_gem, MAT_GEM, head_obj)

    # Weapon: Tall Crescent Moon Staff + Giant Levitating Runestone (`bishop_weapon`)
    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.026, 0.018, 1.18, segments=12, center=(0, 0, 0.22))
    add_torus_ring(bm_weap, 0.12, 0.022, seg_major=20, seg_minor=8, center=(0, 0, 0.86), rot_euler=(math.pi / 2, 0, 0))
    add_icosphere(bm_weap, 0.068, subdivisions=1, center=(0, 0, 0.86), scale=(0.8, 0.8, 1.4))
    finalize_mesh("bishop_weapon", bm_weap, MAT_TRIM, root, location=(0.26, 0.12, 0.56))

    # Shield: Open Levitating Spell Grimoire (`bishop_shield`)
    bm_sh = bmesh.new()
    add_box(bm_sh, (0.18, 0.22, 0.045), center=(0, 0.06, 0), rot_euler=(-0.45, 0.25, 0), bevel_amt=0.008)
    finalize_mesh("bishop_shield", bm_sh, MAT_GEM, root, location=(-0.24, 0.18, 0.74))


# ==============================================================================
# 5. QUEEN — Winged Valkyrie Sorceress Empress (Height ~1.62m, Unfurled Golden Wings!)
# ==============================================================================
def build_queen():
    root = bpy.data.objects.new("piece_queen", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "queen", radius_scale=1.02, height_scale=1.05)

    # Flared Royal Velvet Ballgown Train (`mat_cloth`)
    bm_cloth = bmesh.new()
    gown_prof = [
        (0.35, 0.18),
        (0.32, 0.36),
        (0.24, 0.58),
        (0.17, 0.78),
        (0.22, 0.96),
        (0.14, 1.08),
    ]
    lathe_bm(bm_cloth, gown_prof, segments=30, scale_xy=(0.94, 1.12))
    finalize_mesh("queen_cloth", bm_cloth, MAT_CLOTH, root)

    # Sculpted Marble/Obsidian Corset Cuirass + Unfurled Valkyrie Wings (`queen_body` + `queen_wings`)
    bm_body = bmesh.new()
    add_box(bm_body, (0.28, 0.22, 0.34), center=(0, 0.04, 0.86), bevel_amt=0.03)
    finalize_mesh("queen_body", bm_body, MAT_STONE, root)

    # UNFURLED GOLDEN SERAPH / VALKYRIE WINGS spanning wide from shoulders (`mat_trim`)
    bm_wings = bmesh.new()
    for side in (-1, 1):
        for f in range(6):
            t = f / 5.0
            wx = side * (0.18 + t * 0.28)
            wy = -0.10 - t * 0.06
            wz = 0.96 + (1.0 - abs(t - 0.35)) * 0.32 - t * 0.12
            length = 0.42 - t * 0.04
            rot_y = side * (0.45 + t * 0.55)
            add_cone(
                bm_wings,
                0.042,
                0.006,
                length,
                segments=6,
                center=(wx, wy, wz),
                rot_euler=(-0.22, rot_y, 0),
                scale=(0.45, 1.2, 1.0),
            )
    finalize_mesh("queen_wings", bm_wings, MAT_TRIM, root)

    # Head: Sculpted Empress Visage + Radiant 8-Ray Sunburst Halo Crown (`queen_head`)
    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.13, subdivisions=2, center=(0, 0, 0.08))
    # Sunburst Halo Diadem rising behind head
    for i in range(-4, 5):
        ang = i * 0.24
        rx = math.sin(ang) * 0.16
        rz = 0.18 + math.cos(ang) * 0.16
        add_cone(bm_head, 0.024, 0.003, 0.20, segments=6, center=(rx, -0.02, rz), rot_euler=(0, ang, 0))
    head_obj = finalize_mesh("queen_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.10))

    # Glowing Crown Star & Eyes (`queen_gem`)
    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.065, subdivisions=2, center=(0, 0, 0.32))
    add_box(bm_gem, (0.14, 0.04, 0.028), center=(0, 0.12, 0.08))
    finalize_mesh("queen_gem", bm_gem, MAT_GEM, head_obj)

    # Weapon: Royal Sun-Burst Scepter (`queen_weapon`)
    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.024, 0.016, 1.18, segments=12, center=(0, 0, 0.24))
    add_icosphere(bm_weap, 0.075, subdivisions=2, center=(0, 0, 0.86))
    for i in range(6):
        ang = (i / 6.0) * math.tau
        add_cone(bm_weap, 0.020, 0.003, 0.15, segments=5, center=(math.cos(ang) * 0.09, 0, 0.86 + math.sin(ang) * 0.09), rot_euler=(0, ang + math.pi / 2, 0))
    finalize_mesh("queen_weapon", bm_weap, MAT_TRIM, root, location=(0.27, 0.14, 0.66))

    # Shield: Trio of Orbiting Celestial Spheres (`queen_shield`)
    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.075, subdivisions=2, center=(0, 0.06, 0.06))
    add_icosphere(bm_sh, 0.045, subdivisions=1, center=(-0.08, 0.12, 0.18))
    add_icosphere(bm_sh, 0.045, subdivisions=1, center=(0.08, 0.02, 0.18))
    finalize_mesh("queen_shield", bm_sh, MAT_GEM, root, location=(-0.26, 0.18, 0.86))


# ==============================================================================
# 6. KING — Towering War-Monarch (Height ~1.82m, Lion Mantle + Imperial Cross-Crown + Giant Greatsword)
# ==============================================================================
def build_king():
    root = bpy.data.objects.new("piece_king", None)
    scene.collection.objects.link(root)
    # Double-tiered royal dais pedestal
    build_pedestal(root, "king", radius_scale=1.12, height_scale=1.25, octagonal=True)

    # Flowing Royal Sovereign Cloak (`mat_cloth`)
    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.50, 0.18, 0.96), center=(0, -0.18, 0.70), rot_euler=(0.14, 0, 0), bevel_amt=0.03)
    add_box(bm_cloth, (0.30, 0.06, 0.62), center=(0, 0.18, 0.56), bevel_amt=0.012)
    finalize_mesh("king_cloth", bm_cloth, MAT_CLOTH, root)

    # Heavy Armored Sovereign Torso (`king_body`)
    bm_body = bmesh.new()
    king_prof = [
        (0.36, 0.22),
        (0.32, 0.52),
        (0.30, 0.82),
        (0.35, 1.08),
        (0.20, 1.22),
    ]
    lathe_bm(bm_body, king_prof, segments=20)
    add_box(bm_body, (0.42, 0.28, 0.34), center=(0, 0.06, 0.98), bevel_amt=0.03)
    finalize_mesh("king_body", bm_body, MAT_STONE, root)

    # Broad Golden Lion-Pauldron Shoulder Mantle (`mat_trim`)
    bm_trim = bmesh.new()
    add_box(bm_trim, (0.64, 0.30, 0.18), center=(0, 0.02, 1.12), bevel_amt=0.035)
    add_icosphere(bm_trim, 0.14, subdivisions=1, center=(-0.30, 0.04, 1.14), scale=(1.1, 1.0, 0.85))
    add_icosphere(bm_trim, 0.14, subdivisions=1, center=(0.30, 0.04, 1.14), scale=(1.1, 1.0, 0.85))
    finalize_mesh("king_trim", bm_trim, MAT_TRIM, root)

    # Head: Bearded Monarch + Towering Imperial Arched Cross-Crown (`king_head`)
    bm_head = bmesh.new()
    add_box(bm_head, (0.24, 0.24, 0.24), center=(0, 0, 0.10), bevel_amt=0.025)
    # Sculpted stone beard
    add_cone(bm_head, 0.12, 0.03, 0.20, segments=8, center=(0, 0.13, 0.02), rot_euler=(math.pi - 0.2, 0, 0))
    # High Imperial Crown circlet + arches + giant Cross Finial at top!
    add_cone(bm_head, 0.16, 0.19, 0.14, segments=12, center=(0, 0, 0.25))
    add_torus_ring(bm_head, 0.14, 0.022, seg_major=16, seg_minor=6, center=(0, 0, 0.32), rot_euler=(math.pi / 2, 0, 0))
    add_torus_ring(bm_head, 0.14, 0.022, seg_major=16, seg_minor=6, center=(0, 0, 0.32), rot_euler=(math.pi / 2, 0, math.pi / 2))
    # Prominent Imperial Cross at z = 1.78m total height
    add_box(bm_head, (0.055, 0.055, 0.24), center=(0, 0, 0.52), bevel_amt=0.008)
    add_box(bm_head, (0.20, 0.055, 0.055), center=(0, 0, 0.54), bevel_amt=0.008)
    head_obj = finalize_mesh("king_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.22))

    # Glowing Crown Jewels & Sovereign Eyes (`king_gem`)
    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.055, subdivisions=1, center=(0, 0, 0.54))
    add_icosphere(bm_gem, 0.048, subdivisions=1, center=(0, 0.18, 0.25))
    add_box(bm_gem, (0.15, 0.04, 0.03), center=(0, 0.13, 0.12))
    finalize_mesh("king_gem", bm_gem, MAT_GEM, head_obj)

    # Weapon: Colossal Two-Handed Runed Broadsword (`king_weapon`)
    bm_weap = bmesh.new()
    add_icosphere(bm_weap, 0.05, subdivisions=1, center=(0, 0, -0.20))
    add_cone(bm_weap, 0.03, 0.025, 0.26, segments=10, center=(0, 0, -0.06))
    # Sweeping winged crossguard
    add_box(bm_weap, (0.40, 0.06, 0.055), center=(0, 0, 0.08), bevel_amt=0.012)
    # Massive diamond broadsword blade
    add_cone(bm_weap, 0.085, 0.010, 1.02, segments=4, center=(0, 0, 0.60), rot_euler=(0, 0, math.pi / 4))
    finalize_mesh("king_weapon", bm_weap, MAT_METAL, root, location=(0.26, 0.22, 0.72))

    # Shield: Royal Lion Signet Targe (`king_shield`)
    bm_sh = bmesh.new()
    add_box(bm_sh, (0.06, 0.30, 0.38), center=(0, 0.04, 0), rot_euler=(0.1, 0, -0.22), bevel_amt=0.018)
    finalize_mesh("king_shield", bm_sh, MAT_TRIM, root, location=(-0.30, 0.16, 0.78))


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
print(f"Exported diverse Wizard Chess GLB to {out_path}")
