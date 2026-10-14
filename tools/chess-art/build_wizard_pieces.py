"""Sculpt 5 Complete World-Themed 3D Chess Sets (30 unique piece models) in Blender and export to GLB.

Run headlessly with Blender:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/chess-art/build_wizard_pieces.py -- apps/chess/assets/wizard-pieces.glb

Design Principles for Instant Piece Recognition (Staunton + Battle Chess Silhouette Hierarchy):
  - PAWN   (h ≈ 0.76): Compact frontline foot-soldier with large shield & short forward blade (no tall poles).
  - ROOK   (h ≈ 1.14): Broad, square/octagonal crenellated fortress bastion with 4 corner turrets & glowing core.
  - KNIGHT (h ≈ 1.34): Rearing quadruped steed with 35° heroic head/neck turn so the horse snout, ears & mane read in clear profile from the player's camera.
  - BISHOP (h ≈ 1.46): Slender cloth-robed mystic (narrow shoulders, no wings) with tall pointed mitre & diagonal staff.
  - QUEEN  (h ≈ 1.64): Sweeping wide-winged empress (wingspan 1.20) with flared hourglass gown, open coronet tiara & royal scepter.
  - KING   (h ≈ 1.92): Towering broad-shouldered sovereign with massive pauldrons, full royal mantle cape & giant Cross-Crown.
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


def make_mat(name, color, metallic=0.08, roughness=0.42, emissive=(0, 0, 0)):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emissive, 1.0)
            bsdf.inputs["Emission Strength"].default_value = 0.8 if any(emissive) else 0.0
    return m


MAT_STONE = make_mat("mat_stone", (0.93, 0.90, 0.85), metallic=0.06, roughness=0.38)
MAT_CLOTH = make_mat("mat_cloth", (0.85, 0.81, 0.75), metallic=0.08, roughness=0.46)
MAT_TRIM  = make_mat("mat_trim",  (0.80, 0.76, 0.68), metallic=0.35, roughness=0.30)
MAT_METAL = make_mat("mat_metal", (0.84, 0.86, 0.89), metallic=0.65, roughness=0.24)
MAT_GEM   = make_mat("mat_gem",   (0.95, 0.88, 0.72), metallic=0.10, roughness=0.20, emissive=(0.45, 0.38, 0.25))


def lathe_bm(bm, profile, segments=24, z_offset=0.0, scale_xy=(1.0, 1.0), flute_amp=0.0, flute_count=12, z_flute_range=(0.0, 10.0), twist=0.0):
    sx, sy = scale_xy
    z_min, z_max = z_flute_range
    rings = []
    for r, z in profile:
        ring = []
        in_flute = z_min <= z <= z_max and flute_amp != 0.0
        twist_ang = z * twist
        for i in range(segments):
            ang = (i / segments) * math.tau + twist_ang
            flute = (1.0 + flute_amp * math.cos((i / segments) * math.tau * flute_count)) if in_flute else 1.0
            rr = r * flute
            v = bm.verts.new((math.cos(ang) * rr * sx, math.sin(ang) * rr * sy, z + z_offset))
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
        bmesh.ops.bevel(bm, geom=edges, offset=bevel_amt, segments=1, profile=0.5)
    return verts


def add_cone(bm, r1, r2, depth, segments=14, center=(0, 0, 0), rot_euler=(0, 0, 0), scale=(1, 1, 1)):
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


def add_icosphere(bm, radius, subdivisions=1, center=(0, 0, 0), scale=(1, 1, 1)):
    res = bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=radius)
    cx, cy, cz = center
    sx, sy, sz = scale
    for v in res["verts"]:
        v.co.x = v.co.x * sx + cx
        v.co.y = v.co.y * sy + cy
        v.co.z = v.co.z * sz + cz
    return res["verts"]


def add_torus_ring(bm, major_r, minor_r, seg_major=20, seg_minor=6, center=(0, 0, 0), rot_euler=(0, 0, 0), scale=(1, 1, 1)):
    mat = Euler(rot_euler, 'XYZ').to_matrix().to_4x4()
    mat.translation = Vector(center)
    sx, sy, sz = scale
    rings = []
    for i in range(seg_major):
        theta = (i / seg_major) * math.tau
        ct, st = math.cos(theta), math.sin(theta)
        ring = []
        for j in range(seg_minor):
            phi = (j / seg_minor) * math.tau
            cp, sp = math.cos(phi), math.sin(phi)
            r = major_r + minor_r * cp
            pt = Vector((r * ct * sx, r * st * sy, minor_r * sp * sz))
            ring.append(bm.verts.new(mat @ pt))
        rings.append(ring)
    for i in range(seg_major):
        ni = (i + 1) % seg_major
        for j in range(seg_minor):
            nj = (j + 1) % seg_minor
            bm.faces.new((rings[i][j], rings[ni][j], rings[ni][nj], rings[i][nj]))


def rotate_bm_z(bm, angle_rad, pivot=(0.0, 0.0, 0.0)):
    """Rotate all vertices in a bmesh around Z axis so the piece silhouette reads in 3/4 profile."""
    mat = Euler((0.0, 0.0, angle_rad), 'XYZ').to_matrix()
    pv = Vector(pivot)
    for v in bm.verts:
        v.co = mat @ (v.co - pv) + pv


def finalize_mesh(name, bm, mat, parent, location=(0, 0, 0), smooth=True):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if smooth:
        sharp_edges = [
            e for e in bm.edges
            if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > math.radians(34.0)
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


def build_pedestal(parent, prefix, radius_scale=1.0, height_scale=1.0, segments=24, motif="fluted"):
    r = radius_scale
    h = height_scale
    bm_stone = bmesh.new()
    profile = [
        (0.435 * r, 0.000),
        (0.445 * r, 0.018 * h),
        (0.425 * r, 0.036 * h),
        (0.432 * r, 0.052 * h),
        (0.395 * r, 0.072 * h),
        (0.365 * r, 0.105 * h),
        (0.375 * r, 0.132 * h),
        (0.345 * r, 0.155 * h),
        (0.325 * r, 0.175 * h),
    ]
    lathe_bm(
        bm_stone,
        profile,
        segments=segments,
        flute_amp=0.025 if motif == "fluted" else (0.04 if motif == "wave" else 0.0),
        flute_count=12,
        z_flute_range=(0.06 * h, 0.14 * h),
        twist=3.0 if motif == "wave" else 0.0,
    )
    if motif in ("buttress", "cyber", "monolith"):
        cnt = 6 if motif == "cyber" else 8
        for i in range(cnt):
            ang = (i / cnt) * math.tau
            bx = math.cos(ang) * (0.38 * r)
            by = math.sin(ang) * (0.38 * r)
            add_box(bm_stone, (0.042 * r, 0.06 * r, 0.11 * h), center=(bx, by, 0.085 * h), rot_euler=(0, 0, ang), bevel_amt=0.005)
    finalize_mesh(f"{prefix}_base", bm_stone, MAT_STONE, parent, smooth=(motif not in ("cyber", "monolith")))

    bm_trim = bmesh.new()
    trim_profile = [
        (0.360 * r, 0.112 * h),
        (0.402 * r, 0.132 * h),
        (0.358 * r, 0.152 * h),
    ]
    lathe_bm(bm_trim, trim_profile, segments=segments)
    finalize_mesh(f"{prefix}_base_trim", bm_trim, MAT_TRIM, parent, smooth=(motif not in ("cyber", "monolith")))


# ==============================================================================
# SET 1: CLASSIC — WIZARD'S TOWER (Gothic Cathedral Knights & Monarchs)
# ==============================================================================
def build_classic_set(x_off=0.0):
    # --------------------------------------------------------------------------
    # 1. CLASSIC PAWN — Compact Gothic Foot-Soldier (h ≈ 0.76, Kite Shield + Short Gladius)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_classic_pawn", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "classic_pawn", radius_scale=0.72, height_scale=0.74, segments=24, motif="fluted")

    bm_body = bmesh.new()
    for sx in (-1, 1):
        add_cone(bm_body, 0.058, 0.048, 0.16, segments=10, center=(sx * 0.082, 0.0, 0.20))
        add_box(bm_body, (0.080, 0.125, 0.048), center=(sx * 0.082, 0.035, 0.145), bevel_amt=0.008)
    add_box(bm_body, (0.25, 0.19, 0.21), center=(0, 0.01, 0.37), rot_euler=(0.06, 0, 0), bevel_amt=0.022)
    finalize_mesh("classic_pawn_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.21, 0.21, 0.11), center=(0, 0.0, 0.28), bevel_amt=0.012)
    for sx in (-1, 1):
        add_box(bm_cloth, (0.105, 0.14, 0.05), center=(sx * 0.15, 0.01, 0.44), rot_euler=(0.06, sx * 0.35, 0), bevel_amt=0.008)
    finalize_mesh("classic_pawn_cloth", bm_cloth, MAT_CLOTH, root)

    bm_head = bmesh.new()
    lathe_bm(bm_head, [(0.095, 0.0), (0.16, 0.05), (0.152, 0.08), (0.13, 0.13), (0.085, 0.18), (0.02, 0.20)], segments=20)
    add_box(bm_head, (0.030, 0.13, 0.04), center=(0, -0.01, 0.19), bevel_amt=0.006)
    head_obj = finalize_mesh("classic_pawn_head", bm_head, MAT_METAL, root, location=(0, 0.01, 0.50))

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.125, 0.03, 0.022), center=(0, 0.135, 0.075))
    finalize_mesh("classic_pawn_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.10, 0.03, 0.03), center=(0, 0.05, 0.01), rot_euler=(-1.10, 0, 0), bevel_amt=0.004)
    add_cone(bm_weap, 0.040, 0.005, 0.38, segments=4, center=(0, 0.22, 0.11), rot_euler=(-1.10, 0, math.pi / 4), scale=(0.45, 1.0, 1.0))
    finalize_mesh("classic_pawn_weapon", bm_weap, MAT_METAL, root, location=(0.18, 0.06, 0.36))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.27, 0.045, 0.40), center=(0, 0.03, 0.0), rot_euler=(0.08, 0, 0.28), bevel_amt=0.014)
    add_box(bm_sh, (0.042, 0.028, 0.32), center=(-0.01, 0.058, 0.0), rot_euler=(0.08, 0, 0.28))
    add_box(bm_sh, (0.19, 0.028, 0.042), center=(-0.01, 0.058, 0.05), rot_euler=(0.08, 0, 0.28))
    finalize_mesh("classic_pawn_shield", bm_sh, MAT_TRIM, root, location=(-0.16, 0.15, 0.37))

    # --------------------------------------------------------------------------
    # 2. CLASSIC ROOK — Square Crenellated Castle Keep with 4 Corner Watch-Turrets (h ≈ 1.14)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_classic_rook", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "classic_rook", radius_scale=1.08, height_scale=1.00, segments=16, motif="buttress")

    bm_body = bmesh.new()
    add_box(bm_body, (0.56, 0.52, 0.22), center=(0, 0, 0.26), bevel_amt=0.018)
    add_box(bm_body, (0.50, 0.46, 0.56), center=(0, 0, 0.62), bevel_amt=0.02)
    for row in range(3):
        add_box(bm_body, (0.53, 0.49, 0.028), center=(0, 0, 0.44 + row * 0.16))
    for sx in (-1, 1):
        for sy in (-1, 1):
            tx, ty = sx * 0.26, sy * 0.24
            add_cone(bm_body, 0.115, 0.125, 0.74, segments=8, center=(tx, ty, 0.62))
            add_cone(bm_body, 0.138, 0.145, 0.08, segments=8, center=(tx, ty, 0.98))
    finalize_mesh("classic_rook_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    for sy in (-1, 1):
        add_box(bm_cloth, (0.28, 0.045, 0.42), center=(0, sy * 0.235, 0.60), bevel_amt=0.008)
    finalize_mesh("classic_rook_cloth", bm_cloth, MAT_CLOTH, root)

    bm_metal = bmesh.new()
    for gx in (-0.11, -0.04, 0.04, 0.11):
        add_box(bm_metal, (0.018, 0.035, 0.34), center=(gx, 0.25, 0.58))
    for gz in (0.48, 0.58, 0.68):
        add_box(bm_metal, (0.26, 0.035, 0.018), center=(0, 0.25, gz))
    finalize_mesh("classic_rook_metal", bm_metal, MAT_METAL, root)

    bm_head = bmesh.new()
    add_box(bm_head, (0.60, 0.56, 0.10), center=(0, 0, 0.04), bevel_amt=0.014)
    for ox in (-0.23, -0.08, 0.08, 0.23):
        add_box(bm_head, (0.095, 0.09, 0.14), center=(ox, 0.24, 0.15), bevel_amt=0.008)
        add_box(bm_head, (0.095, 0.09, 0.14), center=(ox, -0.24, 0.15), bevel_amt=0.008)
    for oy in (-0.10, 0.10):
        add_box(bm_head, (0.09, 0.095, 0.14), center=(0.26, oy, 0.15), bevel_amt=0.008)
        add_box(bm_head, (0.09, 0.095, 0.14), center=(-0.26, oy, 0.15), bevel_amt=0.008)
    head_obj = finalize_mesh("classic_rook_head", bm_head, MAT_TRIM, root, location=(0, 0, 0.94))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.11, subdivisions=2, center=(0, 0, 0.15))
    add_box(bm_gem, (0.08, 0.03, 0.03), center=(-0.07, 0.28, 0.05))
    add_box(bm_gem, (0.08, 0.03, 0.03), center=(0.07, 0.28, 0.05))
    finalize_mesh("classic_rook_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.16, 0.30, 0.16), center=(0.04, 0.14, 0.0), rot_euler=(-0.25, 0, 0), bevel_amt=0.014)
    finalize_mesh("classic_rook_weapon", bm_weap, MAT_METAL, root, location=(0.32, 0.04, 0.66))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.16, 0.30, 0.16), center=(-0.04, 0.14, 0.0), rot_euler=(-0.25, 0, 0), bevel_amt=0.014)
    finalize_mesh("classic_rook_shield", bm_sh, MAT_TRIM, root, location=(-0.32, 0.04, 0.66))

    # --------------------------------------------------------------------------
    # 3. CLASSIC KNIGHT — Heroic 35°-Turned Rearing Warhorse (h ≈ 1.34)
    #    (Upper body, neck & horse head turned 35° so the equine snout, mane & forelegs
    #     read as an unmistakable chess Knight profile from the camera!)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_classic_knight", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "classic_knight", radius_scale=0.94, height_scale=0.95, segments=24, motif="fluted")

    yaw = 0.58  # ~33° heroic turn so horse profile is clearly visible from front & back!

    bm_cloth = bmesh.new()
    lathe_bm(bm_cloth, [(0.31, 0.16), (0.29, 0.28), (0.23, 0.42), (0.18, 0.52)], segments=24, scale_xy=(0.82, 1.18), flute_amp=0.06, flute_count=10, z_flute_range=(0.16, 0.50))
    add_cone(bm_cloth, 0.09, 0.02, 0.42, segments=8, center=(0, -0.28, 0.40), rot_euler=(0.72, 0, 0))
    rotate_bm_z(bm_cloth, yaw * 0.6)
    finalize_mesh("classic_knight_cloth", bm_cloth, MAT_CLOTH, root)

    bm_body = bmesh.new()
    add_icosphere(bm_body, 0.21, subdivisions=2, center=(0, -0.05, 0.54), scale=(0.78, 1.15, 1.10))
    add_icosphere(bm_body, 0.19, subdivisions=2, center=(0, 0.06, 0.76), scale=(0.74, 1.05, 1.18))
    add_icosphere(bm_body, 0.15, subdivisions=2, center=(0, 0.12, 0.98), scale=(0.68, 0.92, 1.18))
    for sx, lift in ((-1, 0.06), (1, -0.02)):
        add_box(bm_body, (0.080, 0.28, 0.085), center=(sx * 0.13, 0.26, 0.74 + lift), rot_euler=(0.48, 0, 0), bevel_amt=0.012)
        add_box(bm_body, (0.072, 0.24, 0.075), center=(sx * 0.13, 0.42, 0.56 + lift), rot_euler=(-0.85, 0, 0), bevel_amt=0.01)
    rotate_bm_z(bm_body, yaw)
    finalize_mesh("classic_knight_body", bm_body, MAT_STONE, root)

    bm_trim = bmesh.new()
    for i in range(9):
        t = i / 8.0
        mz = 0.54 + t * 0.58
        my = -0.16 + t * 0.12 - math.sin(t * math.pi) * 0.07
        add_box(bm_trim, (0.11 - t * 0.025, 0.16, 0.075), center=(0, my, mz), rot_euler=(0.62, 0, 0), bevel_amt=0.008)
    add_box(bm_trim, (0.30, 0.14, 0.16), center=(0, 0.18, 0.72), rot_euler=(-0.32, 0, 0), bevel_amt=0.015)
    rotate_bm_z(bm_trim, yaw)
    finalize_mesh("classic_knight_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.145, subdivisions=2, center=(0, 0.02, 0.08), scale=(0.78, 1.12, 1.02))
    # Long, unmistakable Equine Muzzle / Snout jutting boldly out
    add_cone(bm_head, 0.125, 0.072, 0.44, segments=12, center=(0, 0.25, -0.02), rot_euler=(-1.22, 0, 0), scale=(0.76, 1.0, 1.0))
    add_cone(bm_head, 0.035, 0.004, 0.22, segments=6, center=(0, 0.28, 0.13), rot_euler=(-0.82, 0, 0))
    for sx in (-1, 1):
        add_cone(bm_head, 0.042, 0.006, 0.19, segments=6, center=(sx * 0.075, -0.05, 0.22), rot_euler=(-0.12, sx * 0.18, 0))
    rotate_bm_z(bm_head, yaw * 1.15)
    head_Loc = Euler((0, 0, yaw), 'XYZ').to_matrix() @ Vector((0, 0.10, 1.08))
    head_obj = finalize_mesh("classic_knight_head", bm_head, MAT_METAL, root, location=tuple(head_Loc))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.035, subdivisions=1, center=(-0.092, 0.10, 0.08))
    add_icosphere(bm_gem, 0.035, subdivisions=1, center=(0.092, 0.10, 0.08))
    rotate_bm_z(bm_gem, yaw * 1.15)
    finalize_mesh("classic_knight_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.035, 0.005, 0.68, segments=8, center=(0, 0.30, 0.02), rot_euler=(-1.48, 0, 0))
    rotate_bm_z(bm_weap, yaw)
    finalize_mesh("classic_knight_weapon", bm_weap, MAT_METAL, root, location=(0.20, 0.04, 0.64))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.04, 0.22, 0.26), center=(0, 0.02, 0), rot_euler=(0.15, -0.18, -0.16), bevel_amt=0.012)
    rotate_bm_z(bm_sh, yaw)
    finalize_mesh("classic_knight_shield", bm_sh, MAT_TRIM, root, location=(-0.20, 0.04, 0.64))

    # --------------------------------------------------------------------------
    # 4. CLASSIC BISHOP — Slender Cloaked Arch-Prelate with Tall Cleft Mitre (h ≈ 1.46)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_classic_bishop", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "classic_bishop", radius_scale=0.86, height_scale=0.94, segments=24, motif="fluted")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.27, 0.16), (0.23, 0.34), (0.17, 0.60), (0.135, 0.84), (0.155, 0.98), (0.095, 1.04)], segments=28, scale_xy=(0.90, 1.02), flute_amp=0.055, flute_count=12, z_flute_range=(0.18, 0.96))
    finalize_mesh("classic_bishop_body", bm_body, MAT_CLOTH, root)

    bm_trim = bmesh.new()
    for sy in (-1, 1):
        add_box(bm_trim, (0.078, 0.03, 0.74), center=(0, sy * 0.155, 0.56), rot_euler=(sy * -0.08, 0, 0), bevel_amt=0.005)
    add_cone(bm_trim, 0.175, 0.105, 0.14, segments=16, center=(0, 0, 0.99))
    finalize_mesh("classic_bishop_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.105, subdivisions=1, center=(0, 0, 0.05), scale=(0.88, 0.95, 1.0))
    add_cone(bm_head, 0.135, 0.010, 0.38, segments=14, center=(0, 0.038, 0.26), rot_euler=(0.10, 0, 0), scale=(0.92, 0.48, 1.0))
    add_cone(bm_head, 0.132, 0.010, 0.36, segments=14, center=(0, -0.042, 0.25), rot_euler=(-0.12, 0, 0), scale=(0.90, 0.46, 1.0))
    head_obj = finalize_mesh("classic_bishop_head", bm_head, MAT_STONE, root, location=(0, 0, 1.02))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.048, subdivisions=1, center=(0, 0, 0.45), scale=(0.8, 0.8, 1.25))
    add_box(bm_gem, (0.09, 0.028, 0.022), center=(0, 0.10, 0.06))
    finalize_mesh("classic_bishop_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.018, 1.18, segments=10, center=(0, 0, 0.18), rot_euler=(0.08, -0.24, 0))
    add_torus_ring(bm_weap, 0.095, 0.020, seg_major=18, seg_minor=6, center=(-0.18, -0.06, 0.76), rot_euler=(math.pi / 2, 0.24, 0))
    finalize_mesh("classic_bishop_weapon", bm_weap, MAT_METAL, root, location=(0.22, 0.12, 0.52))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.16, 0.20, 0.055), center=(0, 0.04, 0), rot_euler=(-0.42, 0.22, 0), bevel_amt=0.006)
    finalize_mesh("classic_bishop_shield", bm_sh, MAT_TRIM, root, location=(-0.20, 0.16, 0.74))

    # --------------------------------------------------------------------------
    # 5. CLASSIC QUEEN — High-Gothic Winged Seraph Empress (h ≈ 1.64, Wingspan 1.18!)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_classic_queen", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "classic_queen", radius_scale=1.02, height_scale=1.05, segments=28, motif="fluted")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.37, 0.17), (0.33, 0.36), (0.22, 0.62), (0.15, 0.84), (0.21, 1.04), (0.14, 1.18)], segments=32, scale_xy=(0.95, 1.08), flute_amp=0.06, flute_count=16, z_flute_range=(0.18, 0.80))
    finalize_mesh("classic_queen_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    for i in range(-2, 3):
        add_cone(bm_cloth, 0.07, 0.03, 0.86, segments=8, center=(i * 0.06, -0.18, 0.60), rot_euler=(0.22, i * 0.06, 0))
    finalize_mesh("classic_queen_cloth", bm_cloth, MAT_CLOTH, root)

    bm_wings = bmesh.new()
    for side in (-1, 1):
        add_box(bm_wings, (0.50, 0.035, 0.08), center=(side * 0.34, -0.10, 1.24), rot_euler=(0.12, side * -0.48, 0), bevel_amt=0.01)
        for f in range(9):
            t = f / 8.0
            wx = side * (0.14 + t * 0.44)
            wy = -0.10 - t * 0.04
            wz = 1.12 + math.sin(t * math.pi * 0.8) * 0.36 - t * 0.14
            add_cone(bm_wings, 0.044, 0.006, 0.54 - t * 0.05, segments=6, center=(wx, wy, wz), rot_euler=(-0.14, side * (0.32 + t * 0.68), 0), scale=(0.38, 1.2, 1.0))
    finalize_mesh("classic_queen_wings", bm_wings, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.12, subdivisions=1, center=(0, 0, 0.08), scale=(0.88, 0.96, 1.05))
    add_cone(bm_head, 0.125, 0.155, 0.09, segments=20, center=(0, 0, 0.20))
    for i in range(10):
        ang = (i / 10.0) * math.tau
        spire_h = 0.22 if (i % 2 == 0) else 0.13
        add_cone(bm_head, 0.024, 0.003, spire_h, segments=6, center=(math.cos(ang) * 0.148, math.sin(ang) * 0.148, 0.26 + spire_h * 0.38), rot_euler=(-math.sin(ang) * 0.28, math.cos(ang) * 0.28, 0))
    head_obj = finalize_mesh("classic_queen_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.18))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.068, subdivisions=1, center=(0, 0, 0.34), scale=(0.9, 0.9, 1.3))
    add_box(bm_gem, (0.105, 0.028, 0.020), center=(0, 0.108, 0.08))
    finalize_mesh("classic_queen_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.015, 1.14, segments=10, center=(0, 0, 0.20), rot_euler=(0.08, 0.22, 0))
    add_icosphere(bm_weap, 0.065, subdivisions=1, center=(0.14, -0.05, 0.80))
    finalize_mesh("classic_queen_weapon", bm_weap, MAT_METAL, root, location=(0.28, 0.13, 0.68))

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.075, subdivisions=1, center=(0, 0.04, 0.04))
    add_torus_ring(bm_sh, 0.082, 0.012, seg_major=16, seg_minor=6, center=(0, 0.04, 0.04))
    finalize_mesh("classic_queen_shield", bm_sh, MAT_TRIM, root, location=(-0.26, 0.17, 0.90))

    # --------------------------------------------------------------------------
    # 6. CLASSIC KING — Towering Sovereign Monarch with Full Royal Mantle & Cross-Crown (h ≈ 1.92)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_classic_king", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "classic_king", radius_scale=1.14, height_scale=1.20, segments=16, motif="buttress")

    bm_cloth = bmesh.new()
    # Solid, broad, sweeping Royal Mantle Cape cascading down the entire back of the King!
    add_box(bm_cloth, (0.54, 0.14, 1.04), center=(0, -0.18, 0.72), rot_euler=(0.15, 0, 0), bevel_amt=0.025)
    for i in range(-3, 4):
        ang = i * 0.22
        add_cone(bm_cloth, 0.095, 0.055, 1.08, segments=8, center=(math.sin(ang) * 0.28, -0.17 - math.cos(ang) * 0.06, 0.72), rot_euler=(0.15, -ang * 0.22, 0))
    finalize_mesh("classic_king_cloth", bm_cloth, MAT_CLOTH, root)

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.36, 0.21), (0.32, 0.52), (0.29, 0.84), (0.35, 1.14), (0.22, 1.28)], segments=24, flute_amp=0.035, flute_count=12, z_flute_range=(0.24, 0.88))
    add_box(bm_body, (0.44, 0.28, 0.38), center=(0, 0.05, 1.04), bevel_amt=0.022)
    finalize_mesh("classic_king_body", bm_body, MAT_STONE, root)

    bm_trim = bmesh.new()
    # Massive Broad Lion Shoulder Pauldrons + Royal Collar
    add_box(bm_trim, (0.70, 0.32, 0.17), center=(0, 0.0, 1.19), bevel_amt=0.025)
    for sx in (-1, 1):
        add_icosphere(bm_trim, 0.15, subdivisions=1, center=(sx * 0.34, 0.02, 1.21), scale=(1.2, 0.95, 0.82))
    finalize_mesh("classic_king_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_box(bm_head, (0.24, 0.24, 0.22), center=(0, 0, 0.10), bevel_amt=0.022)
    for i in range(-2, 3):
        add_cone(bm_head, 0.034, 0.008, 0.18 - abs(i) * 0.02, segments=6, center=(i * 0.032, 0.12, 0.01), rot_euler=(math.pi - 0.18, 0, 0))
    add_cone(bm_head, 0.16, 0.195, 0.14, segments=16, center=(0, 0, 0.26))
    add_torus_ring(bm_head, 0.165, 0.025, seg_major=18, seg_minor=6, center=(0, 0, 0.33), rot_euler=(math.pi / 2, 0, 0))
    add_torus_ring(bm_head, 0.165, 0.025, seg_major=18, seg_minor=6, center=(0, 0, 0.33), rot_euler=(math.pi / 2, 0, math.pi / 2))
    # Giant Imperial Cross on top of the Crown (tops at z ≈ 1.92)
    add_box(bm_head, (0.07, 0.07, 0.30), center=(0, 0, 0.58), bevel_amt=0.008)
    add_box(bm_head, (0.26, 0.07, 0.07), center=(0, 0, 0.60), bevel_amt=0.008)
    head_obj = finalize_mesh("classic_king_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.28))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.06, subdivisions=1, center=(0, 0, 0.60))
    add_box(bm_gem, (0.14, 0.032, 0.024), center=(0, 0.12, 0.12))
    finalize_mesh("classic_king_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.42, 0.06, 0.055), center=(0, 0, 0.08), bevel_amt=0.008)
    add_cone(bm_weap, 0.085, 0.008, 1.02, segments=4, center=(0, 0, 0.58), rot_euler=(0, 0, math.pi / 4), scale=(1.15, 0.38, 1.0))
    finalize_mesh("classic_king_weapon", bm_weap, MAT_METAL, root, location=(0.28, 0.22, 0.72))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.055, 0.30, 0.40), center=(0, 0.04, 0), rot_euler=(0.10, 0, -0.22), bevel_amt=0.014)
    finalize_mesh("classic_king_shield", bm_sh, MAT_TRIM, root, location=(-0.31, 0.16, 0.80))


# ==============================================================================
# SET 2: LUMAR — ABYSSAL TIDES & NAUTICAL HARBOR SET
# ==============================================================================
def build_lumar_set(x_off=3.0):
    # --------------------------------------------------------------------------
    # 1. LUMAR PAWN — Compact Deep-Sea Corsair Diver (h ≈ 0.76)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_lumar_pawn", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "lumar_pawn", radius_scale=0.72, height_scale=0.74, segments=24, motif="wave")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.23, 0.14), (0.19, 0.27), (0.21, 0.40), (0.125, 0.48)], segments=20, flute_amp=0.045, flute_count=10, z_flute_range=(0.15, 0.46), twist=2.2)
    finalize_mesh("lumar_pawn_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    for sx in (-1, 1):
        add_cone(bm_cloth, 0.10, 0.028, 0.15, segments=8, center=(sx * 0.145, 0, 0.43), rot_euler=(0.2, sx * 0.85, 0))
    finalize_mesh("lumar_pawn_cloth", bm_cloth, MAT_CLOTH, root)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.125, subdivisions=2, center=(0, 0, 0.075))
    for i in range(4):
        t = i / 3.0
        add_cone(bm_head, 0.022, 0.003, 0.12 - t * 0.03, segments=6, center=(0, -0.02 - t * 0.06, 0.16 - t * 0.03), rot_euler=(0.35 + t * 0.4, 0, 0))
    head_obj = finalize_mesh("lumar_pawn_head", bm_head, MAT_METAL, root, location=(0, 0.02, 0.48))

    bm_gem = bmesh.new()
    add_torus_ring(bm_gem, 0.060, 0.015, seg_major=16, seg_minor=6, center=(0, 0.115, 0.075), rot_euler=(math.pi / 2, 0, 0))
    add_icosphere(bm_gem, 0.050, subdivisions=1, center=(0, 0.11, 0.075), scale=(1.0, 0.4, 1.0))
    finalize_mesh("lumar_pawn_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.020, 0.014, 0.42, segments=8, center=(0, 0.15, 0.06), rot_euler=(-1.12, 0, 0))
    add_cone(bm_weap, 0.038, 0.004, 0.16, segments=6, center=(0, 0.31, 0.14), rot_euler=(-1.12, 0, 0))
    finalize_mesh("lumar_pawn_weapon", bm_weap, MAT_METAL, root, location=(0.18, 0.05, 0.35))

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.20, 0.055, 0.065, segments=18, center=(0, 0.04, 0), rot_euler=(math.pi / 2, 0, -0.35))
    add_torus_ring(bm_sh, 0.18, 0.020, seg_major=18, seg_minor=6, center=(0, 0.04, 0), rot_euler=(math.pi / 2, 0, -0.35))
    finalize_mesh("lumar_pawn_shield", bm_sh, MAT_TRIM, root, location=(-0.16, 0.15, 0.37))

    # --------------------------------------------------------------------------
    # 2. LUMAR ROOK — Broad Square Sea-Fortress Bastion & Kraken Keep (h ≈ 1.14)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_lumar_rook", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "lumar_rook", radius_scale=1.08, height_scale=1.00, segments=16, motif="wave")

    bm_body = bmesh.new()
    add_box(bm_body, (0.54, 0.50, 0.58), center=(0, 0, 0.56), bevel_amt=0.025)
    for sx in (-1, 1):
        for sy in (-1, 1):
            tx, ty = sx * 0.26, sy * 0.24
            add_cone(bm_body, 0.12, 0.13, 0.72, segments=10, center=(tx, ty, 0.60))
            add_cone(bm_body, 0.145, 0.15, 0.08, segments=10, center=(tx, ty, 0.96))
    finalize_mesh("lumar_rook_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    for t_idx in range(4):
        base_ang = (t_idx / 4.0) * math.tau + 0.4
        for seg in range(9):
            s = seg / 8.0
            ang = base_ang + s * 1.4
            rad = 0.36 - s * 0.05
            tz = 0.22 + s * 0.64
            add_icosphere(bm_cloth, 0.068 * (1.0 - s * 0.45), subdivisions=1, center=(math.cos(ang) * rad, math.sin(ang) * rad, tz))
    finalize_mesh("lumar_rook_cloth", bm_cloth, MAT_CLOTH, root)

    bm_head = bmesh.new()
    add_box(bm_head, (0.60, 0.56, 0.09), center=(0, 0, 0.02), bevel_amt=0.015)
    for ox in (-0.22, 0.0, 0.22):
        add_box(bm_head, (0.10, 0.09, 0.13), center=(ox, 0.24, 0.12), bevel_amt=0.008)
        add_box(bm_head, (0.10, 0.09, 0.13), center=(ox, -0.24, 0.12), bevel_amt=0.008)
    head_obj = finalize_mesh("lumar_rook_head", bm_head, MAT_TRIM, root, location=(0, 0, 0.92))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.125, subdivisions=2, center=(0, 0, 0.14))
    finalize_mesh("lumar_rook_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.08, 0.06, 0.44, segments=12, center=(0.04, 0.16, 0.04), rot_euler=(-1.30, 0, 0))
    finalize_mesh("lumar_rook_weapon", bm_weap, MAT_METAL, root, location=(0.32, 0.02, 0.66))

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.08, 0.06, 0.44, segments=12, center=(-0.04, 0.16, 0.04), rot_euler=(-1.30, 0, 0))
    finalize_mesh("lumar_rook_shield", bm_sh, MAT_TRIM, root, location=(-0.32, 0.02, 0.66))

    # --------------------------------------------------------------------------
    # 3. LUMAR KNIGHT — Heroic 35°-Turned Rearing Hippocampus Sea-Stallion (h ≈ 1.34)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_lumar_knight", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "lumar_knight", radius_scale=0.94, height_scale=0.95, segments=24, motif="wave")

    yaw = 0.58

    bm_cloth = bmesh.new()
    for i in range(14):
        t = i / 13.0
        ang = t * math.pi * 2.0
        rad = 0.24 * (1.0 - t * 0.35)
        tx = math.cos(ang) * rad * 0.65
        ty = -0.10 - t * 0.14 + math.sin(ang) * rad * 0.5
        tz = 0.20 + t * 0.38
        add_icosphere(bm_cloth, 0.14 * (1.0 - t * 0.45), subdivisions=1, center=(tx, ty, tz))
    rotate_bm_z(bm_cloth, yaw * 0.6)
    finalize_mesh("lumar_knight_cloth", bm_cloth, MAT_CLOTH, root)

    bm_body = bmesh.new()
    add_icosphere(bm_body, 0.20, subdivisions=2, center=(0, -0.04, 0.54), scale=(0.80, 1.12, 1.15))
    add_icosphere(bm_body, 0.18, subdivisions=2, center=(0, 0.07, 0.76), scale=(0.74, 1.02, 1.18))
    add_icosphere(bm_body, 0.14, subdivisions=2, center=(0, 0.13, 0.98), scale=(0.70, 0.90, 1.15))
    for sx, lift in ((-1, 0.05), (1, -0.02)):
        add_box(bm_body, (0.075, 0.26, 0.08), center=(sx * 0.13, 0.26, 0.74 + lift), rot_euler=(0.48, 0, 0), bevel_amt=0.01)
        add_cone(bm_body, 0.085, 0.01, 0.20, segments=6, center=(sx * 0.13, 0.42, 0.56 + lift), rot_euler=(-0.85, 0, 0), scale=(0.4, 1.3, 1.0))
    rotate_bm_z(bm_body, yaw)
    finalize_mesh("lumar_knight_body", bm_body, MAT_STONE, root)

    bm_trim = bmesh.new()
    for i in range(9):
        t = i / 8.0
        mz = 0.54 + t * 0.58
        my = -0.16 + t * 0.12
        add_cone(bm_trim, 0.045, 0.004, 0.26, segments=6, center=(0, my, mz), rot_euler=(0.95, 0, 0), scale=(0.35, 1.25, 1.0))
    rotate_bm_z(bm_trim, yaw)
    finalize_mesh("lumar_knight_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.14, subdivisions=2, center=(0, 0.02, 0.08), scale=(0.80, 1.10, 1.0))
    add_cone(bm_head, 0.105, 0.052, 0.44, segments=10, center=(0, 0.25, -0.02), rot_euler=(-1.25, 0, 0))
    for sx in (-1, 1):
        add_cone(bm_head, 0.072, 0.005, 0.26, segments=6, center=(sx * 0.095, -0.06, 0.15), rot_euler=(0.4, sx * 0.65, 0), scale=(0.35, 1.2, 1.0))
    rotate_bm_z(bm_head, yaw * 1.15)
    head_Loc = Euler((0, 0, yaw), 'XYZ').to_matrix() @ Vector((0, 0.10, 1.08))
    head_obj = finalize_mesh("lumar_knight_head", bm_head, MAT_METAL, root, location=tuple(head_Loc))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.035, subdivisions=1, center=(-0.088, 0.10, 0.08))
    add_icosphere(bm_gem, 0.035, subdivisions=1, center=(0.088, 0.10, 0.08))
    rotate_bm_z(bm_gem, yaw * 1.15)
    finalize_mesh("lumar_knight_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.038, 0.004, 0.68, segments=10, center=(0, 0.30, 0.02), rot_euler=(-1.48, 0, 0))
    rotate_bm_z(bm_weap, yaw)
    finalize_mesh("lumar_knight_weapon", bm_weap, MAT_METAL, root, location=(0.20, 0.04, 0.64))

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.16, 0.04, 0.06, segments=14, center=(0, 0.02, 0), rot_euler=(0.15, -1.2, 0))
    rotate_bm_z(bm_sh, yaw)
    finalize_mesh("lumar_knight_shield", bm_sh, MAT_TRIM, root, location=(-0.20, 0.04, 0.64))

    # --------------------------------------------------------------------------
    # 4. LUMAR BISHOP — Slender Abyssal Tide-Priest with Tall Nautilus Mitre (h ≈ 1.46)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_lumar_bishop", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "lumar_bishop", radius_scale=0.86, height_scale=0.94, segments=24, motif="wave")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.27, 0.16), (0.22, 0.36), (0.165, 0.62), (0.13, 0.86), (0.155, 0.98), (0.095, 1.04)], segments=28, flute_amp=0.06, flute_count=12, z_flute_range=(0.18, 0.96), twist=3.2)
    finalize_mesh("lumar_bishop_body", bm_body, MAT_CLOTH, root)

    bm_trim = bmesh.new()
    for sy in (-1, 1):
        add_box(bm_trim, (0.075, 0.03, 0.72), center=(0, sy * 0.15, 0.56), rot_euler=(sy * -0.08, 0, 0), bevel_amt=0.005)
    add_torus_ring(bm_trim, 0.19, 0.018, seg_major=20, seg_minor=6, center=(0, 0, 0.96), rot_euler=(0.35, 0, 0))
    finalize_mesh("lumar_bishop_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.105, subdivisions=1, center=(0, 0, 0.05))
    add_cone(bm_head, 0.13, 0.012, 0.38, segments=14, center=(0, 0.03, 0.26), rot_euler=(0.08, 0, 0), scale=(0.88, 0.52, 1.0))
    add_cone(bm_head, 0.125, 0.012, 0.36, segments=14, center=(0, -0.04, 0.25), rot_euler=(-0.10, 0, 0), scale=(0.85, 0.50, 1.0))
    head_obj = finalize_mesh("lumar_bishop_head", bm_head, MAT_STONE, root, location=(0, 0, 1.02))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.048, subdivisions=1, center=(0, 0, 0.45))
    add_icosphere(bm_gem, 0.035, subdivisions=1, center=(0, 0.105, 0.06))
    finalize_mesh("lumar_bishop_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.018, 1.14, segments=10, center=(0, 0, 0.18), rot_euler=(0.08, -0.22, 0))
    add_box(bm_weap, (0.24, 0.03, 0.035), center=(-0.12, -0.04, 0.72), rot_euler=(0.08, -0.22, 0), bevel_amt=0.005)
    for px in (-0.10, 0.0, 0.10):
        add_cone(bm_weap, 0.024, 0.003, 0.26 if px == 0 else 0.20, segments=6, center=(-0.14 + px, -0.05, 0.84), rot_euler=(0.08, -0.22, 0))
    finalize_mesh("lumar_bishop_weapon", bm_weap, MAT_METAL, root, location=(0.22, 0.11, 0.52))

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.075, subdivisions=2, center=(0, 0.05, 0.02))
    finalize_mesh("lumar_bishop_shield", bm_sh, MAT_TRIM, root, location=(-0.20, 0.16, 0.74))

    # --------------------------------------------------------------------------
    # 5. LUMAR QUEEN — Empress of the Maelstrom with Wide Scalloped Siren Fin-Wings (h ≈ 1.64)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_lumar_queen", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "lumar_queen", radius_scale=1.02, height_scale=1.05, segments=28, motif="wave")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.37, 0.17), (0.32, 0.38), (0.22, 0.64), (0.15, 0.84), (0.21, 1.04), (0.14, 1.18)], segments=32, flute_amp=0.065, flute_count=12, z_flute_range=(0.18, 0.82), twist=3.8)
    finalize_mesh("lumar_queen_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    for i in range(-2, 3):
        add_cone(bm_cloth, 0.07, 0.03, 0.84, segments=8, center=(i * 0.06, -0.18, 0.58), rot_euler=(0.22, i * 0.06, 0))
    finalize_mesh("lumar_queen_cloth", bm_cloth, MAT_CLOTH, root)

    bm_wings = bmesh.new()
    for side in (-1, 1):
        add_box(bm_wings, (0.50, 0.035, 0.075), center=(side * 0.34, -0.10, 1.24), rot_euler=(0.12, side * -0.46, 0), bevel_amt=0.01)
        for f in range(9):
            t = f / 8.0
            wx = side * (0.14 + t * 0.44)
            wy = -0.09 - math.sin(t * math.pi) * 0.07
            wz = 1.10 + math.sin(t * math.pi * 0.8) * 0.36 - t * 0.12
            add_cone(bm_wings, 0.048, 0.005, 0.54 - t * 0.05, segments=6, center=(wx, wy, wz), rot_euler=(-0.15, side * (0.35 + t * 0.65), 0), scale=(0.32, 1.35, 1.0))
    finalize_mesh("lumar_queen_wings", bm_wings, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.12, subdivisions=1, center=(0, 0, 0.08))
    add_cone(bm_head, 0.12, 0.15, 0.08, segments=18, center=(0, 0, 0.19))
    for i in range(-4, 5):
        ang = i * 0.24
        add_cone(bm_head, 0.024, 0.004, 0.24 - abs(i) * 0.015, segments=6, center=(math.sin(ang) * 0.145, -0.01, 0.25 + math.cos(ang) * 0.06), rot_euler=(0, ang, 0))
    head_obj = finalize_mesh("lumar_queen_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.18))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.065, subdivisions=2, center=(0, 0, 0.35))
    add_icosphere(bm_gem, 0.038, subdivisions=1, center=(0, 0.11, 0.10))
    finalize_mesh("lumar_queen_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.015, 1.14, segments=10, center=(0, 0, 0.20), rot_euler=(0.08, 0.22, 0))
    add_icosphere(bm_weap, 0.07, subdivisions=2, center=(0.14, -0.05, 0.80))
    finalize_mesh("lumar_queen_weapon", bm_weap, MAT_METAL, root, location=(0.28, 0.13, 0.68))

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.075, subdivisions=2, center=(0, 0.04, 0.04))
    finalize_mesh("lumar_queen_shield", bm_sh, MAT_TRIM, root, location=(-0.26, 0.17, 0.90))

    # --------------------------------------------------------------------------
    # 6. LUMAR KING — Towering Leviathan Sea-Monarch with Full Mantle & Trident Cross-Crown (h ≈ 1.92)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_lumar_king", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "lumar_king", radius_scale=1.14, height_scale=1.20, segments=20, motif="wave")

    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.54, 0.14, 1.04), center=(0, -0.18, 0.72), rot_euler=(0.15, 0, 0), bevel_amt=0.025)
    for i in range(-3, 4):
        ang = i * 0.22
        add_cone(bm_cloth, 0.095, 0.04, 1.08, segments=8, center=(math.sin(ang) * 0.28, -0.17, 0.72), rot_euler=(0.16, -ang * 0.24, 0))
    finalize_mesh("lumar_king_cloth", bm_cloth, MAT_CLOTH, root)

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.36, 0.21), (0.32, 0.54), (0.29, 0.86), (0.35, 1.14), (0.22, 1.28)], segments=24, flute_amp=0.045, flute_count=10, z_flute_range=(0.24, 0.92), twist=2.0)
    add_box(bm_body, (0.44, 0.28, 0.38), center=(0, 0.04, 1.04), bevel_amt=0.022)
    finalize_mesh("lumar_king_body", bm_body, MAT_STONE, root)

    bm_trim = bmesh.new()
    add_box(bm_trim, (0.70, 0.32, 0.17), center=(0, 0.0, 1.19), bevel_amt=0.025)
    for sx in (-1, 1):
        add_cone(bm_trim, 0.17, 0.03, 0.34, segments=8, center=(sx * 0.35, 0, 1.22), rot_euler=(0.1, sx * 0.95, 0))
    finalize_mesh("lumar_king_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_box(bm_head, (0.24, 0.24, 0.22), center=(0, 0, 0.10), bevel_amt=0.025)
    for i in range(-2, 3):
        add_cone(bm_head, 0.035, 0.006, 0.22, segments=6, center=(i * 0.032, 0.12, 0.0), rot_euler=(math.pi - 0.22, i * 0.08, 0))
    add_cone(bm_head, 0.16, 0.195, 0.14, segments=16, center=(0, 0, 0.26))
    add_torus_ring(bm_head, 0.165, 0.024, seg_major=18, seg_minor=6, center=(0, 0, 0.33), rot_euler=(math.pi / 2, 0, 0))
    add_box(bm_head, (0.068, 0.068, 0.30), center=(0, 0, 0.58), bevel_amt=0.006)
    add_box(bm_head, (0.26, 0.068, 0.068), center=(0, 0, 0.58), bevel_amt=0.006)
    for px in (-0.12, 0.12):
        add_cone(bm_head, 0.030, 0.004, 0.16, segments=6, center=(px, 0, 0.66))
    head_obj = finalize_mesh("lumar_king_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.28))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.06, subdivisions=1, center=(0, 0, 0.58))
    add_box(bm_gem, (0.14, 0.03, 0.022), center=(0, 0.12, 0.12))
    finalize_mesh("lumar_king_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.03, 0.024, 1.05, segments=10, center=(0, 0, 0.30))
    add_torus_ring(bm_weap, 0.20, 0.032, seg_major=16, seg_minor=6, center=(0, 0, 0.68), rot_euler=(math.pi / 2, 0, 0))
    add_cone(bm_weap, 0.075, 0.006, 0.48, segments=4, center=(0, 0, 0.84), rot_euler=(0, 0, math.pi / 4))
    finalize_mesh("lumar_king_weapon", bm_weap, MAT_METAL, root, location=(0.28, 0.22, 0.72))

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.24, 0.05, 0.07, segments=16, center=(0, 0.04, 0), rot_euler=(math.pi / 2, 0, -0.25))
    finalize_mesh("lumar_king_shield", bm_sh, MAT_TRIM, root, location=(-0.31, 0.16, 0.80))


# ==============================================================================
# SET 3: ARCADIA — NEON CYBER-ARCADE SYNTH MECH SET
# ==============================================================================
def build_arcadia_set(x_off=6.0):
    # --------------------------------------------------------------------------
    # 1. ARCADIA PAWN — Compact Cyber-Enforcer Droid (h ≈ 0.76)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_arcadia_pawn", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "arcadia_pawn", radius_scale=0.72, height_scale=0.74, segments=8, motif="cyber")

    bm_body = bmesh.new()
    for sx in (-1, 1):
        add_box(bm_body, (0.082, 0.115, 0.19), center=(sx * 0.082, 0, 0.21))
    add_box(bm_body, (0.25, 0.19, 0.21), center=(0, 0.02, 0.37), rot_euler=(0.08, 0, 0))
    finalize_mesh("arcadia_pawn_body", bm_body, MAT_STONE, root, smooth=False)

    bm_cloth = bmesh.new()
    for sx in (-1, 1):
        add_box(bm_cloth, (0.115, 0.15, 0.095), center=(sx * 0.16, 0.02, 0.44), rot_euler=(0, sx * -0.35, 0))
    finalize_mesh("arcadia_pawn_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    bm_head = bmesh.new()
    add_cone(bm_head, 0.12, 0.08, 0.17, segments=6, center=(0, 0.02, 0.075))
    add_box(bm_head, (0.028, 0.15, 0.075), center=(0, 0, 0.17), rot_euler=(-0.2, 0, 0))
    head_obj = finalize_mesh("arcadia_pawn_head", bm_head, MAT_METAL, root, location=(0, 0.02, 0.48), smooth=False)

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.16, 0.055, 0.042), center=(0, 0.10, 0.085))
    finalize_mesh("arcadia_pawn_gem", bm_gem, MAT_GEM, head_obj, smooth=False)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.030, 0.055, 0.42), center=(0, 0.16, 0.08), rot_euler=(-1.12, 0, 0))
    finalize_mesh("arcadia_pawn_weapon", bm_weap, MAT_METAL, root, location=(0.18, 0.05, 0.36), smooth=False)

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.23, 0.23, 0.045, segments=6, center=(0, 0.04, 0), rot_euler=(math.pi / 2, 0, 0.3))
    finalize_mesh("arcadia_pawn_shield", bm_sh, MAT_TRIM, root, location=(-0.16, 0.15, 0.37), smooth=False)

    # --------------------------------------------------------------------------
    # 2. ARCADIA ROOK — Broad Heavy Arcade Mecha-Bastion with 4 Corner Turrets (h ≈ 1.14)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_arcadia_rook", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "arcadia_rook", radius_scale=1.08, height_scale=1.00, segments=8, motif="cyber")

    bm_body = bmesh.new()
    for sx in (-1, 1):
        add_box(bm_body, (0.18, 0.36, 0.24), center=(sx * 0.18, 0, 0.26))
    add_box(bm_body, (0.54, 0.46, 0.54), center=(0, 0, 0.60))
    add_box(bm_body, (0.48, 0.16, 0.10), center=(0, 0.25, 0.48), rot_euler=(0.25, 0, 0))
    for sx in (-1, 1):
        for sy in (-1, 1):
            add_cone(bm_body, 0.11, 0.12, 0.72, segments=6, center=(sx * 0.26, sy * 0.22, 0.62))
    finalize_mesh("arcadia_rook_body", bm_body, MAT_STONE, root, smooth=False)

    bm_cloth = bmesh.new()
    for sx in (-1, 1):
        add_box(bm_cloth, (0.16, 0.34, 0.18), center=(sx * 0.25, -0.02, 0.94))
        add_cone(bm_cloth, 0.045, 0.045, 0.40, segments=6, center=(sx * 0.25, 0.24, 0.96), rot_euler=(-math.pi / 2, 0, 0))
    finalize_mesh("arcadia_rook_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    bm_head = bmesh.new()
    add_box(bm_head, (0.58, 0.52, 0.10), center=(0, 0, 0.02))
    for ox in (-0.22, 0.0, 0.22):
        add_box(bm_head, (0.10, 0.09, 0.14), center=(ox, 0.22, 0.13))
        add_box(bm_head, (0.10, 0.09, 0.14), center=(ox, -0.22, 0.13))
    head_obj = finalize_mesh("arcadia_rook_head", bm_head, MAT_TRIM, root, location=(0, 0, 0.92), smooth=False)

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.12, subdivisions=0, center=(0, 0, 0.15))
    add_box(bm_gem, (0.36, 0.05, 0.24), center=(0, 0.22, -0.22), rot_euler=(-0.18, 0, 0))
    finalize_mesh("arcadia_rook_gem", bm_gem, MAT_GEM, head_obj, smooth=False)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.16, 0.30, 0.18), center=(0.04, 0.15, 0.0), rot_euler=(-0.25, 0, 0))
    finalize_mesh("arcadia_rook_weapon", bm_weap, MAT_METAL, root, location=(0.32, 0.02, 0.66), smooth=False)

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.16, 0.30, 0.18), center=(-0.04, 0.15, 0.0), rot_euler=(-0.25, 0, 0))
    finalize_mesh("arcadia_rook_shield", bm_sh, MAT_TRIM, root, location=(-0.32, 0.02, 0.66), smooth=False)

    # --------------------------------------------------------------------------
    # 3. ARCADIA KNIGHT — Heroic 35°-Turned Rearing Cyber-Pegasus Steed (h ≈ 1.34)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_arcadia_knight", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "arcadia_knight", radius_scale=0.94, height_scale=0.95, segments=8, motif="cyber")

    yaw = 0.58

    bm_cloth = bmesh.new()
    for sx in (-1, 1):
        add_torus_ring(bm_cloth, 0.18, 0.042, seg_major=10, seg_minor=6, center=(sx * 0.16, -0.06, 0.36), rot_euler=(0, math.pi / 2, 0))
    add_box(bm_cloth, (0.10, 0.34, 0.08), center=(0, -0.26, 0.42), rot_euler=(0.60, 0, 0))
    rotate_bm_z(bm_cloth, yaw * 0.6)
    finalize_mesh("arcadia_knight_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    bm_body = bmesh.new()
    add_box(bm_body, (0.24, 0.38, 0.34), center=(0, -0.04, 0.54), rot_euler=(-0.45, 0, 0))
    add_box(bm_body, (0.20, 0.30, 0.36), center=(0, 0.08, 0.78), rot_euler=(-0.32, 0, 0))
    add_box(bm_body, (0.16, 0.24, 0.28), center=(0, 0.14, 0.98), rot_euler=(-0.20, 0, 0))
    for sx, lift in ((-1, 0.05), (1, -0.02)):
        add_box(bm_body, (0.075, 0.28, 0.08), center=(sx * 0.135, 0.26, 0.74 + lift), rot_euler=(0.45, 0, 0))
        add_box(bm_body, (0.065, 0.24, 0.07), center=(sx * 0.135, 0.42, 0.56 + lift), rot_euler=(-0.85, 0, 0))
    rotate_bm_z(bm_body, yaw)
    finalize_mesh("arcadia_knight_body", bm_body, MAT_STONE, root, smooth=False)

    bm_trim = bmesh.new()
    for i in range(8):
        t = i / 7.0
        add_box(bm_trim, (0.04, 0.24, 0.08), center=(0, -0.15 + t * 0.12, 0.54 + t * 0.54), rot_euler=(0.68, 0, 0))
    rotate_bm_z(bm_trim, yaw)
    finalize_mesh("arcadia_knight_trim", bm_trim, MAT_TRIM, root, smooth=False)

    bm_head = bmesh.new()
    add_cone(bm_head, 0.14, 0.05, 0.46, segments=6, center=(0, 0.22, 0.02), rot_euler=(-1.22, 0, 0))
    for sx in (-1, 1):
        add_box(bm_head, (0.032, 0.22, 0.095), center=(sx * 0.075, -0.06, 0.20), rot_euler=(0.45, sx * 0.22, 0))
    rotate_bm_z(bm_head, yaw * 1.15)
    head_Loc = Euler((0, 0, yaw), 'XYZ').to_matrix() @ Vector((0, 0.10, 1.08))
    head_obj = finalize_mesh("arcadia_knight_head", bm_head, MAT_METAL, root, location=tuple(head_Loc), smooth=False)

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.17, 0.12, 0.045), center=(0, 0.15, 0.07))
    rotate_bm_z(bm_gem, yaw * 1.15)
    finalize_mesh("arcadia_knight_gem", bm_gem, MAT_GEM, head_obj, smooth=False)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.05, 0.005, 0.68, segments=6, center=(0, 0.30, 0.02), rot_euler=(-1.48, 0, 0))
    rotate_bm_z(bm_weap, yaw)
    finalize_mesh("arcadia_knight_weapon", bm_weap, MAT_METAL, root, location=(0.20, 0.04, 0.64), smooth=False)

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.17, 0.17, 0.04, segments=6, center=(0, 0.02, 0), rot_euler=(0, math.pi / 2, 0))
    rotate_bm_z(bm_sh, yaw)
    finalize_mesh("arcadia_knight_shield", bm_sh, MAT_TRIM, root, location=(-0.20, 0.04, 0.64), smooth=False)

    # --------------------------------------------------------------------------
    # 4. ARCADIA BISHOP — Slender Netrunner Holo-Mystic with Tall Pointed Mitre (h ≈ 1.46)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_arcadia_bishop", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "arcadia_bishop", radius_scale=0.86, height_scale=0.94, segments=8, motif="cyber")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.26, 0.16), (0.20, 0.42), (0.145, 0.78), (0.155, 0.98), (0.095, 1.04)], segments=8)
    finalize_mesh("arcadia_bishop_body", bm_body, MAT_CLOTH, root, smooth=False)

    bm_trim = bmesh.new()
    for sy in (-1, 1):
        add_box(bm_trim, (0.075, 0.03, 0.72), center=(0, sy * 0.145, 0.56), rot_euler=(sy * -0.08, 0, 0))
    add_cone(bm_trim, 0.18, 0.105, 0.15, segments=6, center=(0, 0, 0.98))
    finalize_mesh("arcadia_bishop_trim", bm_trim, MAT_TRIM, root, smooth=False)

    bm_head = bmesh.new()
    add_cone(bm_head, 0.135, 0.012, 0.38, segments=6, center=(0, 0.03, 0.25), rot_euler=(0.08, 0, 0), scale=(0.9, 0.5, 1.0))
    add_cone(bm_head, 0.130, 0.012, 0.36, segments=6, center=(0, -0.04, 0.24), rot_euler=(-0.10, 0, 0), scale=(0.88, 0.48, 1.0))
    head_obj = finalize_mesh("arcadia_bishop_head", bm_head, MAT_STONE, root, location=(0, 0, 1.02), smooth=False)

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.052, subdivisions=0, center=(0, 0, 0.45))
    add_box(bm_gem, (0.14, 0.05, 0.04), center=(0, 0.10, 0.08))
    finalize_mesh("arcadia_bishop_gem", bm_gem, MAT_GEM, head_obj, smooth=False)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.018, 1.16, segments=6, center=(0, 0, 0.18), rot_euler=(0.08, -0.24, 0))
    add_icosphere(bm_weap, 0.09, subdivisions=0, center=(-0.16, -0.05, 0.76))
    finalize_mesh("arcadia_bishop_weapon", bm_weap, MAT_METAL, root, location=(0.22, 0.11, 0.52), smooth=False)

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.085, subdivisions=0, center=(0, 0.05, 0.04))
    finalize_mesh("arcadia_bishop_shield", bm_sh, MAT_TRIM, root, location=(-0.20, 0.16, 0.74), smooth=False)

    # --------------------------------------------------------------------------
    # 5. ARCADIA QUEEN — Valkyrie-X Cyber-Empress with Wide Laser-Jet Wings (h ≈ 1.64)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_arcadia_queen", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "arcadia_queen", radius_scale=1.02, height_scale=1.05, segments=8, motif="cyber")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.36, 0.17), (0.24, 0.56), (0.15, 0.84), (0.21, 1.04), (0.14, 1.18)], segments=8)
    finalize_mesh("arcadia_queen_body", bm_body, MAT_STONE, root, smooth=False)

    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.30, 0.12, 0.80), center=(0, -0.17, 0.58), rot_euler=(0.2, 0, 0))
    finalize_mesh("arcadia_queen_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    bm_wings = bmesh.new()
    for side in (-1, 1):
        for b in range(5):
            t = b / 4.0
            add_box(bm_wings, (0.58 - t * 0.07, 0.03, 0.075), center=(side * (0.33 + t * 0.06), -0.10, 1.24 - t * 0.12), rot_euler=(0.14, side * (-0.42 + t * 0.28), 0))
    finalize_mesh("arcadia_queen_wings", bm_wings, MAT_TRIM, root, smooth=False)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.12, subdivisions=1, center=(0, 0, 0.08))
    add_cone(bm_head, 0.12, 0.15, 0.08, segments=8, center=(0, 0, 0.19))
    for i in range(-3, 4):
        ang = i * 0.28
        add_box(bm_head, (0.026, 0.022, 0.24), center=(math.sin(ang) * 0.15, -0.01, 0.25 + math.cos(ang) * 0.08), rot_euler=(0, ang, 0))
    head_obj = finalize_mesh("arcadia_queen_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.18), smooth=False)

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.068, subdivisions=0, center=(0, 0, 0.35))
    add_box(bm_gem, (0.14, 0.04, 0.035), center=(0, 0.11, 0.08))
    finalize_mesh("arcadia_queen_gem", bm_gem, MAT_GEM, head_obj, smooth=False)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.018, 1.14, segments=6, center=(0, 0, 0.20), rot_euler=(0.08, 0.22, 0))
    add_icosphere(bm_weap, 0.085, subdivisions=0, center=(0.14, -0.05, 0.80))
    finalize_mesh("arcadia_queen_weapon", bm_weap, MAT_METAL, root, location=(0.28, 0.13, 0.68), smooth=False)

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.08, subdivisions=0, center=(0, 0.04, 0.04))
    finalize_mesh("arcadia_queen_shield", bm_sh, MAT_TRIM, root, location=(-0.26, 0.17, 0.90), smooth=False)

    # --------------------------------------------------------------------------
    # 6. ARCADIA KING — Towering Overlord Prime Mecha-Monarch (h ≈ 1.92)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_arcadia_king", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "arcadia_king", radius_scale=1.14, height_scale=1.20, segments=8, motif="cyber")

    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.56, 0.14, 1.06), center=(0, -0.18, 0.72), rot_euler=(0.14, 0, 0))
    finalize_mesh("arcadia_king_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.36, 0.21), (0.29, 0.72), (0.37, 1.14), (0.22, 1.28)], segments=8)
    add_box(bm_body, (0.44, 0.28, 0.38), center=(0, 0.04, 1.04))
    finalize_mesh("arcadia_king_body", bm_body, MAT_STONE, root, smooth=False)

    bm_trim = bmesh.new()
    add_box(bm_trim, (0.70, 0.30, 0.17), center=(0, 0.0, 1.19))
    for sx in (-1, 1):
        add_box(bm_trim, (0.18, 0.28, 0.40), center=(sx * 0.35, -0.02, 1.24), rot_euler=(0, sx * -0.22, 0))
    finalize_mesh("arcadia_king_trim", bm_trim, MAT_TRIM, root, smooth=False)

    bm_head = bmesh.new()
    add_box(bm_head, (0.24, 0.24, 0.22), center=(0, 0, 0.10))
    for sx in (-1, 1):
        add_box(bm_head, (0.24, 0.035, 0.045), center=(sx * 0.13, 0.08, 0.28), rot_euler=(0, sx * -0.45, 0))
    add_cone(bm_head, 0.165, 0.195, 0.13, segments=8, center=(0, 0, 0.26))
    add_box(bm_head, (0.07, 0.07, 0.30), center=(0, 0, 0.58))
    add_box(bm_head, (0.26, 0.07, 0.07), center=(0, 0, 0.60))
    head_obj = finalize_mesh("arcadia_king_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.28), smooth=False)

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.065, subdivisions=0, center=(0, 0, 0.60))
    add_box(bm_gem, (0.18, 0.05, 0.045), center=(0, 0.12, 0.12))
    finalize_mesh("arcadia_king_gem", bm_gem, MAT_GEM, head_obj, smooth=False)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.40, 0.06, 0.06), center=(0, 0, 0.08))
    add_box(bm_weap, (0.13, 0.038, 1.04), center=(0, 0, 0.58))
    finalize_mesh("arcadia_king_weapon", bm_weap, MAT_METAL, root, location=(0.28, 0.22, 0.72), smooth=False)

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.25, 0.25, 0.05, segments=6, center=(0, 0.04, 0), rot_euler=(0, math.pi / 2, 0))
    finalize_mesh("arcadia_king_shield", bm_sh, MAT_TRIM, root, location=(-0.31, 0.16, 0.80), smooth=False)


# ==============================================================================
# SET 4: ENIGMA STATION — DEEP-SPACE ORBITAL TELEMETRY SET
# ==============================================================================
def build_enigma_set(x_off=9.0):
    # --------------------------------------------------------------------------
    # 1. ENIGMA PAWN — Compact Orbital EVA Construct (h ≈ 0.76)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_enigma_pawn", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "enigma_pawn", radius_scale=0.72, height_scale=0.74, segments=16, motif="buttress")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.23, 0.14), (0.19, 0.27), (0.22, 0.40), (0.135, 0.48)], segments=16)
    finalize_mesh("enigma_pawn_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.21, 0.13, 0.19), center=(0, -0.10, 0.38), bevel_amt=0.015)
    finalize_mesh("enigma_pawn_cloth", bm_cloth, MAT_CLOTH, root)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.13, subdivisions=2, center=(0, 0, 0.075))
    head_obj = finalize_mesh("enigma_pawn_head", bm_head, MAT_METAL, root, location=(0, 0.02, 0.48))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.10, subdivisions=2, center=(0, 0.05, 0.075), scale=(0.95, 0.7, 0.85))
    finalize_mesh("enigma_pawn_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.042, 0.085, 0.40), center=(0, 0.16, 0.08), rot_euler=(-1.12, 0, 0), bevel_amt=0.006)
    finalize_mesh("enigma_pawn_weapon", bm_weap, MAT_METAL, root, location=(0.18, 0.05, 0.36))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.25, 0.048, 0.38), center=(0, 0.04, 0), rot_euler=(0.08, 0, 0.3), bevel_amt=0.018)
    finalize_mesh("enigma_pawn_shield", bm_sh, MAT_TRIM, root, location=(-0.16, 0.15, 0.37))

    # --------------------------------------------------------------------------
    # 2. ENIGMA ROOK — Broad Square/Hex Orbital Bunker & Radar Bastion (h ≈ 1.14)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_enigma_rook", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "enigma_rook", radius_scale=1.08, height_scale=1.00, segments=16, motif="buttress")

    bm_body = bmesh.new()
    add_box(bm_body, (0.54, 0.50, 0.56), center=(0, 0, 0.56), bevel_amt=0.025)
    for sx in (-1, 1):
        for sy in (-1, 1):
            add_cone(bm_body, 0.115, 0.125, 0.72, segments=8, center=(sx * 0.26, sy * 0.23, 0.60))
    finalize_mesh("enigma_rook_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    for sx in (-1, 1):
        add_box(bm_cloth, (0.30, 0.035, 0.44), center=(sx * 0.40, -0.02, 0.62), bevel_amt=0.006)
    finalize_mesh("enigma_rook_cloth", bm_cloth, MAT_CLOTH, root)

    bm_head = bmesh.new()
    add_box(bm_head, (0.58, 0.54, 0.09), center=(0, 0, 0.02), bevel_amt=0.014)
    for ox in (-0.22, 0.0, 0.22):
        add_box(bm_head, (0.10, 0.09, 0.13), center=(ox, 0.23, 0.12), bevel_amt=0.008)
        add_box(bm_head, (0.10, 0.09, 0.13), center=(ox, -0.23, 0.12), bevel_amt=0.008)
    add_cone(bm_head, 0.08, 0.26, 0.13, segments=16, center=(0, 0.02, 0.16), rot_euler=(-0.38, 0, 0))
    head_obj = finalize_mesh("enigma_rook_head", bm_head, MAT_TRIM, root, location=(0, 0, 0.92))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.115, subdivisions=1, center=(0, 0.06, 0.23))
    finalize_mesh("enigma_rook_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.06, 0.048, 0.46, segments=10, center=(0.04, 0.16, 0.04), rot_euler=(-1.25, 0, 0))
    finalize_mesh("enigma_rook_weapon", bm_weap, MAT_METAL, root, location=(0.32, 0.02, 0.66))

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.06, 0.048, 0.46, segments=10, center=(-0.04, 0.16, 0.04), rot_euler=(-1.25, 0, 0))
    finalize_mesh("enigma_rook_shield", bm_sh, MAT_TRIM, root, location=(-0.32, 0.02, 0.66))

    # --------------------------------------------------------------------------
    # 3. ENIGMA KNIGHT — Heroic 35°-Turned Rearing Zero-G Recon Mech-Steed (h ≈ 1.34)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_enigma_knight", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "enigma_knight", radius_scale=0.94, height_scale=0.95, segments=16, motif="buttress")

    yaw = 0.58

    bm_cloth = bmesh.new()
    for sx in (-1, 1):
        add_cone(bm_cloth, 0.095, 0.06, 0.48, segments=12, center=(sx * 0.20, -0.08, 0.56), rot_euler=(0.48, 0, 0))
    rotate_bm_z(bm_cloth, yaw * 0.6)
    finalize_mesh("enigma_knight_cloth", bm_cloth, MAT_CLOTH, root)

    bm_body = bmesh.new()
    add_box(bm_body, (0.24, 0.38, 0.34), center=(0, -0.04, 0.54), rot_euler=(-0.42, 0, 0), bevel_amt=0.025)
    add_box(bm_body, (0.19, 0.28, 0.36), center=(0, 0.08, 0.78), rot_euler=(-0.28, 0, 0), bevel_amt=0.02)
    add_box(bm_body, (0.15, 0.22, 0.28), center=(0, 0.14, 0.98), rot_euler=(-0.18, 0, 0), bevel_amt=0.015)
    for sx, lift in ((-1, 0.05), (1, -0.02)):
        add_box(bm_body, (0.075, 0.28, 0.08), center=(sx * 0.135, 0.26, 0.74 + lift), rot_euler=(0.45, 0, 0), bevel_amt=0.01)
        add_box(bm_body, (0.065, 0.24, 0.07), center=(sx * 0.135, 0.42, 0.56 + lift), rot_euler=(-0.85, 0, 0), bevel_amt=0.01)
    rotate_bm_z(bm_body, yaw)
    finalize_mesh("enigma_knight_body", bm_body, MAT_STONE, root)

    bm_trim = bmesh.new()
    for i in range(8):
        t = i / 7.0
        add_box(bm_trim, (0.042, 0.20, 0.075), center=(0, -0.15 + t * 0.12, 0.54 + t * 0.54), rot_euler=(0.64, 0, 0), bevel_amt=0.008)
    rotate_bm_z(bm_trim, yaw)
    finalize_mesh("enigma_knight_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_box(bm_head, (0.19, 0.44, 0.17), center=(0, 0.18, 0.04), rot_euler=(-0.38, 0, 0), bevel_amt=0.02)
    for sx in (-1, 1):
        add_cone(bm_head, 0.028, 0.004, 0.26, segments=6, center=(sx * 0.075, -0.06, 0.21), rot_euler=(-0.15, sx * 0.15, 0))
    rotate_bm_z(bm_head, yaw * 1.15)
    head_Loc = Euler((0, 0, yaw), 'XYZ').to_matrix() @ Vector((0, 0.10, 1.08))
    head_obj = finalize_mesh("enigma_knight_head", bm_head, MAT_METAL, root, location=tuple(head_Loc))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.065, subdivisions=1, center=(0, 0.34, 0.0))
    rotate_bm_z(bm_gem, yaw * 1.15)
    finalize_mesh("enigma_knight_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.036, 0.005, 0.68, segments=10, center=(0, 0.30, 0.02), rot_euler=(-1.48, 0, 0))
    rotate_bm_z(bm_weap, yaw)
    finalize_mesh("enigma_knight_weapon", bm_weap, MAT_METAL, root, location=(0.20, 0.04, 0.64))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.04, 0.22, 0.26), center=(0, 0.02, 0), rot_euler=(0.15, -0.18, -0.16), bevel_amt=0.015)
    rotate_bm_z(bm_sh, yaw)
    finalize_mesh("enigma_knight_shield", bm_sh, MAT_TRIM, root, location=(-0.20, 0.04, 0.64))

    # --------------------------------------------------------------------------
    # 4. ENIGMA BISHOP — Slender Cryptographer Conduit with Tall Split Spire Mitre (h ≈ 1.46)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_enigma_bishop", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "enigma_bishop", radius_scale=0.86, height_scale=0.94, segments=16, motif="buttress")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.26, 0.16), (0.20, 0.42), (0.14, 0.78), (0.155, 0.98), (0.095, 1.04)], segments=16)
    finalize_mesh("enigma_bishop_body", bm_body, MAT_CLOTH, root)

    bm_trim = bmesh.new()
    for sy in (-1, 1):
        add_box(bm_trim, (0.075, 0.03, 0.72), center=(0, sy * 0.145, 0.56), rot_euler=(sy * -0.08, 0, 0), bevel_amt=0.005)
    add_cone(bm_trim, 0.175, 0.105, 0.14, segments=16, center=(0, 0, 0.98))
    finalize_mesh("enigma_bishop_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_cone(bm_head, 0.13, 0.012, 0.38, segments=12, center=(0, 0.035, 0.25), rot_euler=(0.09, 0, 0), scale=(0.9, 0.48, 1.0))
    add_cone(bm_head, 0.125, 0.012, 0.36, segments=12, center=(0, -0.04, 0.24), rot_euler=(-0.11, 0, 0), scale=(0.88, 0.46, 1.0))
    head_obj = finalize_mesh("enigma_bishop_head", bm_head, MAT_STONE, root, location=(0, 0, 1.02))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.052, subdivisions=1, center=(0, 0, 0.45))
    add_icosphere(bm_gem, 0.04, subdivisions=1, center=(0, 0.10, 0.08))
    finalize_mesh("enigma_bishop_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.018, 1.16, segments=10, center=(0, 0, 0.18), rot_euler=(0.08, -0.24, 0))
    add_torus_ring(bm_weap, 0.095, 0.018, seg_major=16, seg_minor=6, center=(-0.16, -0.05, 0.76), rot_euler=(math.pi / 2, 0.24, 0))
    finalize_mesh("enigma_bishop_weapon", bm_weap, MAT_METAL, root, location=(0.22, 0.11, 0.52))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.16, 0.20, 0.045), center=(0, 0.05, 0), rot_euler=(-0.42, 0.22, 0), bevel_amt=0.008)
    finalize_mesh("enigma_bishop_shield", bm_sh, MAT_TRIM, root, location=(-0.20, 0.16, 0.74))

    # --------------------------------------------------------------------------
    # 5. ENIGMA QUEEN — Astra-Command Overseer with Wide Solar-Array V-Wings (h ≈ 1.64)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_enigma_queen", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "enigma_queen", radius_scale=1.02, height_scale=1.05, segments=20, motif="buttress")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.36, 0.17), (0.25, 0.54), (0.15, 0.84), (0.21, 1.04), (0.135, 1.18)], segments=20)
    finalize_mesh("enigma_queen_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.28, 0.14, 0.78), center=(0, -0.17, 0.58), rot_euler=(0.18, 0, 0), bevel_amt=0.015)
    finalize_mesh("enigma_queen_cloth", bm_cloth, MAT_CLOTH, root)

    bm_wings = bmesh.new()
    for side in (-1, 1):
        add_box(bm_wings, (0.56, 0.028, 0.18), center=(side * 0.37, -0.10, 1.24), rot_euler=(0.14, side * -0.46, 0), bevel_amt=0.006)
        add_box(bm_wings, (0.48, 0.028, 0.15), center=(side * 0.35, -0.10, 1.00), rot_euler=(0.14, side * -0.12, 0), bevel_amt=0.006)
        add_box(bm_wings, (0.38, 0.028, 0.12), center=(side * 0.29, -0.10, 0.78), rot_euler=(0.14, side * 0.28, 0), bevel_amt=0.006)
    finalize_mesh("enigma_queen_wings", bm_wings, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.12, subdivisions=2, center=(0, 0, 0.08))
    add_cone(bm_head, 0.12, 0.15, 0.08, segments=16, center=(0, 0, 0.19))
    for i in range(8):
        ang = (i / 8.0) * math.tau
        add_cone(bm_head, 0.020, 0.003, 0.20, segments=6, center=(math.cos(ang) * 0.145, math.sin(ang) * 0.145, 0.28), rot_euler=(-math.sin(ang) * 0.25, math.cos(ang) * 0.25, 0))
    head_obj = finalize_mesh("enigma_queen_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.18))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.068, subdivisions=1, center=(0, 0, 0.35))
    add_icosphere(bm_gem, 0.05, subdivisions=1, center=(0, 0.08, 0.08))
    finalize_mesh("enigma_queen_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.016, 1.14, segments=10, center=(0, 0, 0.20), rot_euler=(0.08, 0.22, 0))
    add_icosphere(bm_weap, 0.065, subdivisions=1, center=(0.14, -0.05, 0.80))
    finalize_mesh("enigma_queen_weapon", bm_weap, MAT_METAL, root, location=(0.28, 0.13, 0.68))

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.075, subdivisions=2, center=(0, 0.04, 0.04))
    finalize_mesh("enigma_queen_shield", bm_sh, MAT_TRIM, root, location=(-0.26, 0.17, 0.90))

    # --------------------------------------------------------------------------
    # 6. ENIGMA KING — Towering Station Prime Sovereign Core (h ≈ 1.92)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_enigma_king", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "enigma_king", radius_scale=1.14, height_scale=1.20, segments=16, motif="buttress")

    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.56, 0.14, 1.06), center=(0, -0.18, 0.72), rot_euler=(0.14, 0, 0), bevel_amt=0.02)
    finalize_mesh("enigma_king_cloth", bm_cloth, MAT_CLOTH, root)

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.36, 0.21), (0.31, 0.64), (0.36, 1.14), (0.22, 1.28)], segments=16)
    add_box(bm_body, (0.44, 0.28, 0.38), center=(0, 0.04, 1.04), bevel_amt=0.02)
    finalize_mesh("enigma_king_body", bm_body, MAT_STONE, root)

    bm_trim = bmesh.new()
    add_box(bm_trim, (0.70, 0.30, 0.17), center=(0, 0.0, 1.19), bevel_amt=0.025)
    for sx in (-1, 1):
        add_cone(bm_trim, 0.15, 0.08, 0.30, segments=12, center=(sx * 0.35, 0, 1.23), rot_euler=(0, sx * 0.35, 0))
    finalize_mesh("enigma_king_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_box(bm_head, (0.24, 0.24, 0.22), center=(0, 0, 0.10), bevel_amt=0.025)
    add_cone(bm_head, 0.16, 0.195, 0.13, segments=16, center=(0, 0, 0.26))
    add_torus_ring(bm_head, 0.165, 0.024, seg_major=18, seg_minor=6, center=(0, 0, 0.33), rot_euler=(math.pi / 2, 0, 0))
    add_torus_ring(bm_head, 0.165, 0.024, seg_major=18, seg_minor=6, center=(0, 0, 0.33), rot_euler=(math.pi / 2, 0, math.pi / 2))
    add_box(bm_head, (0.068, 0.068, 0.30), center=(0, 0, 0.58))
    add_box(bm_head, (0.26, 0.068, 0.068), center=(0, 0, 0.60))
    head_obj = finalize_mesh("enigma_king_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.28))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.062, subdivisions=1, center=(0, 0, 0.60))
    add_box(bm_gem, (0.16, 0.04, 0.04), center=(0, 0.12, 0.12))
    finalize_mesh("enigma_king_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.40, 0.055, 0.055), center=(0, 0, 0.08), bevel_amt=0.008)
    add_cone(bm_weap, 0.082, 0.008, 1.02, segments=4, center=(0, 0, 0.58), rot_euler=(0, 0, math.pi / 4), scale=(1.1, 0.38, 1.0))
    finalize_mesh("enigma_king_weapon", bm_weap, MAT_METAL, root, location=(0.28, 0.22, 0.72))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.05, 0.30, 0.38), center=(0, 0.04, 0), rot_euler=(0.10, 0, -0.22), bevel_amt=0.015)
    finalize_mesh("enigma_king_shield", bm_sh, MAT_TRIM, root, location=(-0.31, 0.16, 0.80))


# ==============================================================================
# SET 5: THE SINGULARITY — EVENT HORIZON COSMIC MONOLITH SET
# ==============================================================================
def build_singularity_set(x_off=12.0):
    # --------------------------------------------------------------------------
    # 1. SINGULARITY PAWN — Compact Void-Shard Acolyte (h ≈ 0.76)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_singularity_pawn", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "singularity_pawn", radius_scale=0.72, height_scale=0.74, segments=8, motif="monolith")

    bm_body = bmesh.new()
    add_cone(bm_body, 0.21, 0.105, 0.36, segments=4, center=(0, 0, 0.34), rot_euler=(0, 0, math.pi / 4))
    finalize_mesh("singularity_pawn_body", bm_body, MAT_STONE, root, smooth=False)

    bm_cloth = bmesh.new()
    for sx in (-1, 1):
        add_cone(bm_cloth, 0.085, 0.02, 0.20, segments=4, center=(sx * 0.15, 0, 0.42), rot_euler=(0, sx * 0.5, 0))
    finalize_mesh("singularity_pawn_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.115, subdivisions=1, center=(0, 0, 0.075))
    head_obj = finalize_mesh("singularity_pawn_head", bm_head, MAT_METAL, root, location=(0, 0.0, 0.50), smooth=False)

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.060, subdivisions=1, center=(0, 0.075, 0.075))
    finalize_mesh("singularity_pawn_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.042, 0.004, 0.40, segments=4, center=(0, 0.16, 0.08), rot_euler=(-1.12, 0, 0))
    finalize_mesh("singularity_pawn_weapon", bm_weap, MAT_METAL, root, location=(0.18, 0.05, 0.36), smooth=False)

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.21, 0.005, 0.36, segments=4, center=(0, 0.04, 0), rot_euler=(0.1, 0, 0.3), scale=(0.25, 1.0, 1.0))
    finalize_mesh("singularity_pawn_shield", bm_sh, MAT_TRIM, root, location=(-0.16, 0.15, 0.37), smooth=False)

    # --------------------------------------------------------------------------
    # 2. SINGULARITY ROOK — Broad Square 4-Obelisk Tesseract Citadel (h ≈ 1.14)
    #    (Clean crenellated monolith battlements + suspended core, zero coplanar z-fighting!)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_singularity_rook", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "singularity_rook", radius_scale=1.08, height_scale=1.00, segments=8, motif="monolith")

    bm_body = bmesh.new()
    add_box(bm_body, (0.52, 0.50, 0.56), center=(0, 0, 0.56), bevel_amt=0.02)
    for sx in (-1, 1):
        for sy in (-1, 1):
            add_cone(bm_body, 0.115, 0.125, 0.72, segments=6, center=(sx * 0.26, sy * 0.24, 0.60))
    finalize_mesh("singularity_rook_body", bm_body, MAT_STONE, root, smooth=False)

    bm_cloth = bmesh.new()
    for sy in (-1, 1):
        add_box(bm_cloth, (0.30, 0.04, 0.44), center=(0, sy * 0.255, 0.58))
    finalize_mesh("singularity_rook_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    bm_head = bmesh.new()
    add_box(bm_head, (0.58, 0.56, 0.09), center=(0, 0, 0.02))
    for ox in (-0.22, 0.0, 0.22):
        add_box(bm_head, (0.10, 0.09, 0.14), center=(ox, 0.23, 0.13))
        add_box(bm_head, (0.10, 0.09, 0.14), center=(ox, -0.23, 0.13))
    head_obj = finalize_mesh("singularity_rook_head", bm_head, MAT_TRIM, root, location=(0, 0, 0.92), smooth=False)

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.13, subdivisions=1, center=(0, 0, 0.17))
    finalize_mesh("singularity_rook_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.10, 0.01, 0.44, segments=4, center=(0.04, 0.18, 0.06), rot_euler=(-1.15, 0, 0))
    finalize_mesh("singularity_rook_weapon", bm_weap, MAT_METAL, root, location=(0.32, 0.02, 0.66), smooth=False)

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.10, 0.01, 0.44, segments=4, center=(-0.04, 0.18, 0.06), rot_euler=(-1.15, 0, 0))
    finalize_mesh("singularity_rook_shield", bm_sh, MAT_TRIM, root, location=(-0.32, 0.02, 0.66), smooth=False)

    # --------------------------------------------------------------------------
    # 3. SINGULARITY KNIGHT — Heroic 35°-Turned Rearing Astral Rift-Stallion (h ≈ 1.34)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_singularity_knight", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "singularity_knight", radius_scale=0.94, height_scale=0.95, segments=8, motif="monolith")

    yaw = 0.58

    bm_cloth = bmesh.new()
    add_cone(bm_cloth, 0.24, 0.14, 0.34, segments=6, center=(0, -0.06, 0.34))
    add_cone(bm_cloth, 0.09, 0.01, 0.42, segments=4, center=(0, -0.28, 0.42), rot_euler=(0.68, 0, 0))
    rotate_bm_z(bm_cloth, yaw * 0.6)
    finalize_mesh("singularity_knight_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    bm_body = bmesh.new()
    add_cone(bm_body, 0.23, 0.16, 0.46, segments=6, center=(0, -0.02, 0.54), rot_euler=(-0.38, 0, 0))
    add_cone(bm_body, 0.17, 0.11, 0.46, segments=6, center=(0, 0.10, 0.88), rot_euler=(-0.25, 0, 0))
    for sx, lift in ((-1, 0.05), (1, -0.02)):
        add_box(bm_body, (0.075, 0.28, 0.08), center=(sx * 0.135, 0.26, 0.74 + lift), rot_euler=(0.45, 0, 0))
        add_cone(bm_body, 0.065, 0.01, 0.24, segments=4, center=(sx * 0.135, 0.42, 0.56 + lift), rot_euler=(-0.85, 0, 0))
    rotate_bm_z(bm_body, yaw)
    finalize_mesh("singularity_knight_body", bm_body, MAT_STONE, root, smooth=False)

    bm_trim = bmesh.new()
    for i in range(8):
        t = i / 7.0
        add_cone(bm_trim, 0.048, 0.004, 0.28, segments=4, center=(0, -0.15 + t * 0.12, 0.54 + t * 0.56), rot_euler=(0.88, 0, 0), scale=(0.4, 1.2, 1.0))
    rotate_bm_z(bm_trim, yaw)
    finalize_mesh("singularity_knight_trim", bm_trim, MAT_TRIM, root, smooth=False)

    bm_head = bmesh.new()
    add_cone(bm_head, 0.14, 0.035, 0.46, segments=6, center=(0, 0.24, 0.01), rot_euler=(-1.22, 0, 0))
    for sx in (-1, 1):
        add_cone(bm_head, 0.04, 0.004, 0.24, segments=4, center=(sx * 0.075, -0.05, 0.21), rot_euler=(-0.15, sx * 0.2, 0))
    rotate_bm_z(bm_head, yaw * 1.15)
    head_Loc = Euler((0, 0, yaw), 'XYZ').to_matrix() @ Vector((0, 0.10, 1.08))
    head_obj = finalize_mesh("singularity_knight_head", bm_head, MAT_METAL, root, location=tuple(head_Loc), smooth=False)

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.055, subdivisions=1, center=(0, 0.10, 0.08))
    rotate_bm_z(bm_gem, yaw * 1.15)
    finalize_mesh("singularity_knight_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.042, 0.003, 0.68, segments=4, center=(0, 0.30, 0.02), rot_euler=(-1.48, 0, 0))
    rotate_bm_z(bm_weap, yaw)
    finalize_mesh("singularity_knight_weapon", bm_weap, MAT_METAL, root, location=(0.20, 0.04, 0.64), smooth=False)

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.16, 0.005, 0.26, segments=4, center=(0, 0.02, 0), rot_euler=(0.15, -0.2, 0), scale=(0.25, 1.0, 1.0))
    rotate_bm_z(bm_sh, yaw)
    finalize_mesh("singularity_knight_shield", bm_sh, MAT_TRIM, root, location=(-0.20, 0.04, 0.64), smooth=False)

    # --------------------------------------------------------------------------
    # 4. SINGULARITY BISHOP — Slender Chronos Oracle with Tall Crystal Mitre (h ≈ 1.46)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_singularity_bishop", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "singularity_bishop", radius_scale=0.86, height_scale=0.94, segments=8, motif="monolith")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.26, 0.16), (0.20, 0.44), (0.14, 0.80), (0.155, 0.98), (0.095, 1.04)], segments=8)
    finalize_mesh("singularity_bishop_body", bm_body, MAT_CLOTH, root, smooth=False)

    bm_trim = bmesh.new()
    for sy in (-1, 1):
        add_box(bm_trim, (0.075, 0.03, 0.72), center=(0, sy * 0.145, 0.56), rot_euler=(sy * -0.08, 0, 0))
    add_cone(bm_trim, 0.175, 0.10, 0.14, segments=8, center=(0, 0, 0.98))
    finalize_mesh("singularity_bishop_trim", bm_trim, MAT_TRIM, root, smooth=False)

    bm_head = bmesh.new()
    add_cone(bm_head, 0.13, 0.010, 0.38, segments=6, center=(0, 0.035, 0.25), rot_euler=(0.09, 0, 0), scale=(0.9, 0.5, 1.0))
    add_cone(bm_head, 0.125, 0.010, 0.36, segments=6, center=(0, -0.04, 0.24), rot_euler=(-0.11, 0, 0), scale=(0.88, 0.48, 1.0))
    head_obj = finalize_mesh("singularity_bishop_head", bm_head, MAT_STONE, root, location=(0, 0, 1.02), smooth=False)

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.055, subdivisions=1, center=(0, 0, 0.45))
    finalize_mesh("singularity_bishop_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.016, 1.16, segments=8, center=(0, 0, 0.18), rot_euler=(0.08, -0.24, 0))
    add_icosphere(bm_weap, 0.065, subdivisions=1, center=(-0.16, -0.05, 0.76))
    finalize_mesh("singularity_bishop_weapon", bm_weap, MAT_METAL, root, location=(0.22, 0.11, 0.52))

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.08, subdivisions=0, center=(0, 0.05, 0.04))
    finalize_mesh("singularity_bishop_shield", bm_sh, MAT_TRIM, root, location=(-0.20, 0.16, 0.74), smooth=False)

    # --------------------------------------------------------------------------
    # 5. SINGULARITY QUEEN — Nova Seraph of the Event Horizon with Symmetrical Star-Shard V-Wings (h ≈ 1.64)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_singularity_queen", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "singularity_queen", radius_scale=1.02, height_scale=1.05, segments=12, motif="monolith")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.36, 0.17), (0.23, 0.56), (0.145, 0.84), (0.205, 1.04), (0.13, 1.18)], segments=12)
    finalize_mesh("singularity_queen_body", bm_body, MAT_STONE, root, smooth=False)

    bm_cloth = bmesh.new()
    for i in range(-2, 3):
        add_cone(bm_cloth, 0.075, 0.02, 0.84, segments=6, center=(i * 0.065, -0.17, 0.58), rot_euler=(0.22, i * 0.06, 0))
    finalize_mesh("singularity_queen_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    # Symmetrical Outspread Star-Shard V-Wings (`singularity_queen_wings`, span = 1.20!)
    bm_wings = bmesh.new()
    for side in (-1, 1):
        add_box(bm_wings, (0.50, 0.032, 0.075), center=(side * 0.34, -0.10, 1.24), rot_euler=(0.12, side * -0.46, 0))
        for f in range(9):
            t = f / 8.0
            wx = side * (0.14 + t * 0.44)
            wy = -0.10 - t * 0.04
            wz = 1.12 + math.sin(t * math.pi * 0.8) * 0.36 - t * 0.12
            add_cone(bm_wings, 0.046, 0.005, 0.54 - t * 0.05, segments=6, center=(wx, wy, wz), rot_euler=(-0.14, side * (0.34 + t * 0.66), 0), scale=(0.36, 1.25, 1.0))
    finalize_mesh("singularity_queen_wings", bm_wings, MAT_TRIM, root, smooth=False)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.115, subdivisions=2, center=(0, 0, 0.08))
    add_cone(bm_head, 0.12, 0.15, 0.08, segments=12, center=(0, 0, 0.19))
    for i in range(10):
        ang = (i / 10.0) * math.tau
        spire_h = 0.22 if (i % 2 == 0) else 0.13
        add_cone(bm_head, 0.024, 0.003, spire_h, segments=6, center=(math.cos(ang) * 0.148, math.sin(ang) * 0.148, 0.26 + spire_h * 0.38), rot_euler=(-math.sin(ang) * 0.28, math.cos(ang) * 0.28, 0))
    head_obj = finalize_mesh("singularity_queen_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.18), smooth=False)

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.07, subdivisions=2, center=(0, 0, 0.36))
    finalize_mesh("singularity_queen_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.015, 1.14, segments=8, center=(0, 0, 0.20), rot_euler=(0.08, 0.22, 0))
    add_icosphere(bm_weap, 0.065, subdivisions=1, center=(0.14, -0.05, 0.80))
    finalize_mesh("singularity_queen_weapon", bm_weap, MAT_METAL, root, location=(0.28, 0.13, 0.68))

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.075, subdivisions=1, center=(0, 0.04, 0.04))
    finalize_mesh("singularity_queen_shield", bm_sh, MAT_TRIM, root, location=(-0.26, 0.17, 0.90))

    # --------------------------------------------------------------------------
    # 6. SINGULARITY KING — Towering Architect of the Singularity (h ≈ 1.92)
    # --------------------------------------------------------------------------
    root = bpy.data.objects.new("piece_singularity_king", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "singularity_king", radius_scale=1.14, height_scale=1.20, segments=8, motif="monolith")

    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.56, 0.14, 1.06), center=(0, -0.18, 0.72), rot_euler=(0.14, 0, 0))
    for i in range(-2, 3):
        add_cone(bm_cloth, 0.11, 0.03, 1.06, segments=6, center=(i * 0.12, -0.18, 0.72), rot_euler=(0.15, -i * 0.08, 0))
    finalize_mesh("singularity_king_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.36, 0.21), (0.30, 0.64), (0.36, 1.14), (0.21, 1.28)], segments=8)
    add_box(bm_body, (0.44, 0.28, 0.38), center=(0, 0.04, 1.04))
    finalize_mesh("singularity_king_body", bm_body, MAT_STONE, root, smooth=False)

    bm_trim = bmesh.new()
    add_box(bm_trim, (0.70, 0.30, 0.17), center=(0, 0.0, 1.19))
    for sx in (-1, 1):
        add_cone(bm_trim, 0.12, 0.015, 0.44, segments=6, center=(sx * 0.35, 0, 1.26), rot_euler=(0, sx * -0.25, 0))
    finalize_mesh("singularity_king_trim", bm_trim, MAT_TRIM, root, smooth=False)

    bm_head = bmesh.new()
    add_cone(bm_head, 0.15, 0.10, 0.24, segments=8, center=(0, 0, 0.12))
    add_cone(bm_head, 0.165, 0.195, 0.13, segments=8, center=(0, 0, 0.26))
    add_torus_ring(bm_head, 0.17, 0.024, seg_major=20, seg_minor=6, center=(0, 0, 0.34), rot_euler=(math.pi / 2, 0, 0))
    add_box(bm_head, (0.068, 0.068, 0.30), center=(0, 0, 0.58))
    add_box(bm_head, (0.26, 0.068, 0.068), center=(0, 0, 0.60))
    head_obj = finalize_mesh("singularity_king_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.28))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.075, subdivisions=2, center=(0, 0, 0.60))
    finalize_mesh("singularity_king_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.40, 0.055, 0.055), center=(0, 0, 0.08))
    add_cone(bm_weap, 0.088, 0.006, 1.04, segments=4, center=(0, 0, 0.60), rot_euler=(0, 0, math.pi / 4), scale=(1.1, 0.35, 1.0))
    finalize_mesh("singularity_king_weapon", bm_weap, MAT_METAL, root, location=(0.28, 0.22, 0.72), smooth=False)

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.22, 0.01, 0.38, segments=4, center=(0, 0.04, 0), rot_euler=(0.10, 0, -0.22), scale=(0.25, 1.0, 1.0))
    finalize_mesh("singularity_king_shield", bm_sh, MAT_TRIM, root, location=(-0.31, 0.16, 0.80), smooth=False)


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_world_dioramas import build_all_world_dioramas

build_classic_set(0.0)
build_lumar_set(0.0)
build_arcadia_set(0.0)
build_enigma_set(0.0)
build_singularity_set(0.0)

build_all_world_dioramas(
    scene,
    {
        "add_box": add_box,
        "add_cone": add_cone,
        "add_icosphere": add_icosphere,
        "add_torus_ring": add_torus_ring,
        "finalize_mesh": finalize_mesh,
    },
)

os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=os.path.abspath(out_path),
    export_format='GLB',
    export_yup=True,
    export_apply=True,
)
print(f"Exported 5 World Chess Sets (30 unique 3D models) + 5 Blender 3D World Dioramas to {out_path}")
