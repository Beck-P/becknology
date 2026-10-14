"""Sculpt 6 high-detail Gothic/Cathedral 3D Wizard Chess statues in Blender and export to GLB.

Run headlessly with Blender:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/chess-art/build_wizard_pieces.py -- apps/chess/assets/wizard-pieces.glb

Design Philosophy:
  - Cohesive, classic monochromatic White vs. Black sculptural aesthetic:
    Instead of relying on loud colors, each piece class stands out through
    intricate carved 3D relief, fluted drapery, layered plate armor, ashlar
    masonry, articulated feathers, and distinctive Gothic silhouettes.
  - 4 cohesive material slots mapped per side by Three.js themes:
    1. `mat_stone`: Primary carved stone / marble / ivory / obsidian body
    2. `mat_cloth`: Secondary carved relief stone / drapery / barding / masonry trim
    3. `mat_trim`:  Crown / royal relief / shield border accent (subtle tonal contrast)
    4. `mat_metal`: Forged weapon blades, portcullis, and armor highlights
    5. `mat_gem`:   Subtle recessed visor/eye glints

Archetypes & Heights:
  1. PAWN   (~0.86m): Gothic Vanguard Footman — fluted pedestal, articulated tassets & breastplate,
                      visored sallet/barbute helm with crest comb, riveted cross-boss kite shield, and halberd.
  2. ROOK   (~1.24m): Carved Gothic Keep Siege Automaton — octagonal buttressed plinth, coursed ashlar
                      masonry keep, 4 octagonal corner watch-turrets with lancet windows & crenellations,
                      iron portcullis chest, gargoyle siege crown, and twin fluted siege mauls.
  3. KNIGHT (~1.38m): Master-Sculpted Rearing Destrier Warhorse — Gothic arch plinth, 8-pleat draped
                      caparison barding, 7-plate articulated neck crinet + flowing mane locks, rearing
                      jointed forelegs, fluted chanfron horse head with ears/nostrils/plume, and vamplate lance.
  4. BISHOP (~1.48m): Cathedral High-Prelate / Arch-Mage — quatrefoil tracery plinth, 14-flute carved
                      cathedral robe drapery, scalloped capelet, cleft Gothic mitre with rose medallion &
                      rear lappets, spiral-volute crosier staff with lantern knop, and clasped ribbed tome.
  5. QUEEN  (~1.64m): High-Gothic Winged Empress — 12-flute rosette plinth, 16-pleat flared royal gown,
                      sculpted corset & Medici collar ruff, two-tier 18-feather carved seraph wings,
                      12-spire fleur-de-lis coronet, spiral royal scepter, and sovereign orb.
  6. KING   (~1.84m): Sovereign Gothic Monarch — double-tiered octagonal dais, 10-flute royal mantle cloak,
                      relief-cross plate cuirass, layered lion pauldrons, bearded visage with double-arched
                      Imperial Crown & globus cruciger cross, and planted two-handed fuller greatsword.
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


# Default neutral alabaster/stone preview materials (overridden per-side & per-theme in Three.js)
MAT_STONE = make_mat("mat_stone", (0.93, 0.90, 0.85), metallic=0.06, roughness=0.38)
MAT_CLOTH = make_mat("mat_cloth", (0.85, 0.81, 0.75), metallic=0.08, roughness=0.46)
MAT_TRIM  = make_mat("mat_trim",  (0.80, 0.76, 0.68), metallic=0.35, roughness=0.30)
MAT_METAL = make_mat("mat_metal", (0.84, 0.86, 0.89), metallic=0.65, roughness=0.24)
MAT_GEM   = make_mat("mat_gem",   (0.95, 0.88, 0.72), metallic=0.10, roughness=0.20, emissive=(0.45, 0.38, 0.25))


def lathe_bm(bm, profile, segments=32, z_offset=0.0, scale_xy=(1.0, 1.0), flute_amp=0.0, flute_count=12, z_flute_range=(0.0, 10.0)):
    """Revolve a (r, z) profile around Z, with optional sinusoidal vertical fluting."""
    sx, sy = scale_xy
    z_min, z_max = z_flute_range
    rings = []
    for r, z in profile:
        ring = []
        in_flute = z_min <= z <= z_max and flute_amp != 0.0
        for i in range(segments):
            ang = (i / segments) * math.tau
            flute = (1.0 + flute_amp * math.cos(ang * flute_count)) if in_flute else 1.0
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
        bmesh.ops.bevel(bm, geom=edges, offset=bevel_amt, segments=2, profile=0.5)
    return verts


def add_cone(bm, r1, r2, depth, segments=18, center=(0, 0, 0), rot_euler=(0, 0, 0), scale=(1, 1, 1)):
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


def add_torus_ring(bm, major_r, minor_r, seg_major=28, seg_minor=10, center=(0, 0, 0), rot_euler=(0, 0, 0), scale=(1, 1, 1)):
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


def build_pedestal(parent, prefix, radius_scale=1.0, height_scale=1.0, octagonal=False, motif="fluted"):
    """Sculpt a richly molded Gothic-Staunton pedestal with carved architectural relief."""
    r = radius_scale
    h = height_scale
    segs = 16 if octagonal else 36
    bm_stone = bmesh.new()
    profile = [
        (0.435 * r, 0.000),
        (0.445 * r, 0.018 * h),
        (0.425 * r, 0.036 * h),
        (0.432 * r, 0.052 * h),  # lower torus molding
        (0.395 * r, 0.072 * h),  # scotia recess
        (0.365 * r, 0.105 * h),  # fluted drum waist
        (0.375 * r, 0.132 * h),
        (0.345 * r, 0.155 * h),
        (0.325 * r, 0.175 * h),  # upper plinth platform
    ]
    lathe_bm(
        bm_stone,
        profile,
        segments=segs,
        flute_amp=0.025 if motif == "fluted" else 0.0,
        flute_count=16,
        z_flute_range=(0.06 * h, 0.14 * h),
    )

    # Add class-specific carved architectural buttresses / ribs around the pedestal
    buttress_count = 8 if octagonal else 12
    for i in range(buttress_count):
        ang = (i / buttress_count) * math.tau
        bx = math.cos(ang) * (0.375 * r)
        by = math.sin(ang) * (0.375 * r)
        if motif == "buttress":
            add_box(bm_stone, (0.045 * r, 0.065 * r, 0.11 * h), center=(bx, by, 0.085 * h), rot_euler=(0, 0, ang), bevel_amt=0.006)
        elif motif == "arches":
            add_cone(bm_stone, 0.028 * r, 0.018 * r, 0.10 * h, segments=8, center=(bx, by, 0.09 * h))
        elif motif == "rosette":
            add_icosphere(bm_stone, 0.026 * r, subdivisions=1, center=(bx, by, 0.095 * h))

    finalize_mesh(f"{prefix}_base", bm_stone, MAT_STONE, parent)

    # Carved collar ring & relief molding
    bm_trim = bmesh.new()
    trim_profile = [
        (0.360 * r, 0.118 * h),
        (0.388 * r, 0.132 * h),
        (0.358 * r, 0.148 * h),
    ]
    lathe_bm(bm_trim, trim_profile, segments=segs)
    finalize_mesh(f"{prefix}_base_trim", bm_trim, MAT_TRIM, parent)


# ==============================================================================
# 1. PAWN — Gothic Vanguard Footman (~0.86m)
#    Detailed articulated tassets, flanged breastplate, visored sallet/barbute
#    helm with riveted comb, cross-relief kite shield, and halberd poleaxe.
# ==============================================================================
def build_pawn():
    root = bpy.data.objects.new("piece_pawn", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "pawn", radius_scale=0.84, height_scale=0.88, motif="rosette")

    # Sculpted greaves, knee poleyns, and Gothic fluted breastplate (`pawn_body`)
    bm_body = bmesh.new()
    for sx in (-1, 1):
        # Greave + knee poleyn + sabaton foot
        add_cone(bm_body, 0.062, 0.052, 0.20, segments=12, center=(sx * 0.09, 0.0, 0.24))
        add_icosphere(bm_body, 0.055, subdivisions=1, center=(sx * 0.09, 0.045, 0.31), scale=(1.0, 0.8, 0.9))
        add_box(bm_body, (0.085, 0.14, 0.055), center=(sx * 0.09, 0.04, 0.17), bevel_amt=0.012)

    # Armored waist & Gothic breastplate with central median ridge
    add_box(bm_body, (0.28, 0.21, 0.25), center=(0, 0.01, 0.46), rot_euler=(0.08, 0, 0), bevel_amt=0.028)
    # Central breastplate V-plackart relief
    add_cone(bm_body, 0.12, 0.04, 0.22, segments=4, center=(0, 0.11, 0.46), rot_euler=(0.08, 0, 0), scale=(1.1, 0.35, 1.0))
    # Gorget neck-guard
    add_cone(bm_body, 0.12, 0.10, 0.07, segments=16, center=(0, 0.01, 0.58))
    finalize_mesh("pawn_body", bm_body, MAT_STONE, root)

    # Articulated 4-Lame Tasset Skirt & Layered Pauldrons (`pawn_cloth`)
    bm_cloth = bmesh.new()
    # 4 overlapping tasset plates over hips & front/back pleated surcoat
    for row in range(3):
        z_lame = 0.33 + row * 0.042
        for sx in (-1, 1):
            add_box(bm_cloth, (0.11, 0.18, 0.038), center=(sx * 0.085, 0.02, z_lame), rot_euler=(0.12, sx * 0.12, 0), bevel_amt=0.006)
    # Pleated front & back tabard folds
    for fx in (-0.05, 0.0, 0.05):
        add_box(bm_cloth, (0.038, 0.045, 0.19), center=(fx, 0.11, 0.31), rot_euler=(0.14, 0, 0), bevel_amt=0.006)
    # 3-layer articulated shoulder pauldrons
    for sx in (-1, 1):
        for l in range(3):
            add_box(
                bm_cloth,
                (0.11, 0.16 - l * 0.015, 0.05),
                center=(sx * (0.16 + l * 0.015), 0.01, 0.54 - l * 0.035),
                rot_euler=(0.08, sx * (0.35 + l * 0.15), 0),
                bevel_amt=0.01,
            )
    finalize_mesh("pawn_cloth", bm_cloth, MAT_CLOTH, root)

    # Head: Detailed Gothic Sallet / Barbute Helm with Riveted Comb & Visor (`pawn_head`)
    bm_head = bmesh.new()
    helm_prof = [
        (0.105, 0.00),
        (0.128, 0.04),
        (0.175, 0.055),  # flared sallet neck-guard & brim
        (0.168, 0.075),
        (0.132, 0.10),
        (0.128, 0.17),
        (0.095, 0.22),
        (0.035, 0.25),
    ]
    lathe_bm(bm_head, helm_prof, segments=28)
    # Articulated face-visor plate with breathing slits
    add_box(bm_head, (0.16, 0.10, 0.09), center=(0, 0.09, 0.09), rot_euler=(-0.12, 0, 0), bevel_amt=0.015)
    # Raised Gothic medial comb ridge curving over the skull
    for i in range(7):
        t = i / 6.0
        ang = -0.6 + t * 1.4
        cy = math.sin(ang) * 0.11
        cz = 0.13 + math.cos(ang) * 0.12
        add_box(bm_head, (0.026, 0.045, 0.045), center=(0, cy, cz), rot_euler=(-ang, 0, 0), bevel_amt=0.005)
    head_obj = finalize_mesh("pawn_head", bm_head, MAT_METAL, root, location=(0, 0.02, 0.58))

    # Subtle Recessed Visor Eye-Slit (`pawn_gem`)
    bm_gem = bmesh.new()
    add_box(bm_gem, (0.13, 0.03, 0.018), center=(0, 0.135, 0.11))
    finalize_mesh("pawn_gem", bm_gem, MAT_GEM, head_obj)

    # Weapon: Detailed Gothic Poleaxe / Halberd (`pawn_weapon`)
    bm_weap = bmesh.new()
    # Octagonal ash/iron shaft with grip rings
    add_cone(bm_weap, 0.022, 0.018, 0.90, segments=8, center=(0, 0.08, 0.18), rot_euler=(-0.48, 0, 0))
    for rz in (0.0, 0.22, 0.42):
        add_torus_ring(bm_weap, 0.026, 0.006, seg_major=12, seg_minor=6, center=(0, 0.08 + rz * 0.46, 0.18 + rz * 0.88), rot_euler=(-0.48, 0, 0))
    # Crescent halberd axe-blade + rear beak fluke + diamond top spike
    add_box(bm_weap, (0.018, 0.16, 0.20), center=(0, 0.30, 0.44), rot_euler=(-0.48, 0, 0), bevel_amt=0.005)
    add_cone(bm_weap, 0.028, 0.004, 0.12, segments=6, center=(0, 0.17, 0.38), rot_euler=(1.08, 0, 0))
    add_cone(bm_weap, 0.030, 0.003, 0.24, segments=4, center=(0, 0.30, 0.62), rot_euler=(-0.48, 0, math.pi / 4))
    finalize_mesh("pawn_weapon", bm_weap, MAT_METAL, root, location=(0.22, 0.05, 0.42))

    # Shield: Carved Gothic Kite/Pavise Shield with Raised Cross & Rivets (`pawn_shield`)
    bm_sh = bmesh.new()
    # Main shield body
    add_box(bm_sh, (0.26, 0.045, 0.44), center=(0, 0.03, 0.0), rot_euler=(0.08, 0, 0.32), bevel_amt=0.016)
    # Raised heraldic cross relief on shield face
    add_box(bm_sh, (0.042, 0.025, 0.36), center=(-0.01, 0.055, 0.0), rot_euler=(0.08, 0, 0.32), bevel_amt=0.005)
    add_box(bm_sh, (0.20, 0.025, 0.042), center=(-0.01, 0.058, 0.05), rot_euler=(0.08, 0, 0.32), bevel_amt=0.005)
    # Central shield boss umbo
    add_icosphere(bm_sh, 0.048, subdivisions=2, center=(-0.015, 0.068, 0.05), scale=(1.0, 0.6, 1.0))
    finalize_mesh("pawn_shield", bm_sh, MAT_TRIM, root, location=(-0.18, 0.17, 0.43))


# ==============================================================================
# 2. ROOK — Carved Gothic Keep & Siege Automaton (~1.24m)
#    Octagonal buttressed plinth, coursed ashlar stone masonry, 4 octagonal
#    corner watch-turrets with recessed lancet windows & individual merlons,
#    spiked portcullis gate, gargoyle siege helm, and twin fluted siege mauls.
# ==============================================================================
def build_rook():
    root = bpy.data.objects.new("piece_rook", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "rook", radius_scale=1.08, height_scale=1.02, octagonal=True, motif="buttress")

    # Massive Keep Body + 4 Octagonal Corner Watch-Turrets (`rook_body`)
    bm_body = bmesh.new()
    # Heavy pillar legs with carved Greave-Buttresses
    for sx in (-1, 1):
        add_box(bm_body, (0.19, 0.22, 0.28), center=(sx * 0.15, 0, 0.26), bevel_amt=0.018)
        add_box(bm_body, (0.22, 0.25, 0.06), center=(sx * 0.15, 0, 0.36), bevel_amt=0.01)

    # Central Keep Torso with coursed ashlar stone blocks
    add_box(bm_body, (0.48, 0.42, 0.54), center=(0, 0, 0.64), bevel_amt=0.022)
    for row in range(4):
        rz = 0.44 + row * 0.12
        add_box(bm_body, (0.50, 0.44, 0.025), center=(0, 0, rz), bevel_amt=0.005)

    # 4 Octagonal Corner Watch-Turrets with corbel rings & crenellated merlons!
    for sx in (-1, 1):
        for sy in (-1, 1):
            tx, ty = sx * 0.25, sy * 0.21
            add_cone(bm_body, 0.105, 0.115, 0.66, segments=8, center=(tx, ty, 0.67))
            # Corbel ring under turret parapet
            add_cone(bm_body, 0.125, 0.132, 0.05, segments=8, center=(tx, ty, 0.96))
            # 4 mini merlons atop each corner turret
            for m_ang in (0, math.pi / 2, math.pi, 3 * math.pi / 2):
                mx = tx + math.cos(m_ang) * 0.095
                my = ty + math.sin(m_ang) * 0.095
                add_box(bm_body, (0.045, 0.045, 0.07), center=(mx, my, 1.02), rot_euler=(0, 0, m_ang), bevel_amt=0.005)
    finalize_mesh("rook_body", bm_body, MAT_STONE, root)

    # Architectural Relief Banding & Machicolation Brackets (`rook_cloth`)
    bm_cloth = bmesh.new()
    # Gothic pointed arch frame around chest portcullis
    add_box(bm_cloth, (0.34, 0.06, 0.38), center=(0, 0.20, 0.62), bevel_amt=0.015)
    # Back fortress buttress spine
    for bz in (0.48, 0.64, 0.80):
        add_box(bm_cloth, (0.16, 0.08, 0.10), center=(0, -0.22, bz), bevel_amt=0.012)
    finalize_mesh("rook_cloth", bm_cloth, MAT_CLOTH, root)

    # Iron Portcullis Gate with Spikes & Rivets (`rook_metal`)
    bm_metal = bmesh.new()
    for gx in (-0.12, -0.06, 0.0, 0.06, 0.12):
        add_box(bm_metal, (0.018, 0.035, 0.32), center=(gx, 0.225, 0.63))
        add_cone(bm_metal, 0.014, 0.002, 0.05, segments=4, center=(gx, 0.225, 0.45), rot_euler=(math.pi, 0, 0))
    for gz in (0.51, 0.59, 0.67, 0.75):
        add_box(bm_metal, (0.28, 0.035, 0.018), center=(0, 0.225, gz))
    finalize_mesh("rook_metal", bm_metal, MAT_METAL, root)

    # Head: Crenellated Fortress Crown + Sculpted Gargoyle Siege Helm (`rook_head`)
    bm_head = bmesh.new()
    # Main upper battlement gallery with machicolation corbels
    add_box(bm_head, (0.54, 0.48, 0.14), center=(0, 0, 0.06), bevel_amt=0.018)
    # Sculpted stone siege-helm visage on front face
    add_box(bm_head, (0.24, 0.14, 0.18), center=(0, 0.20, 0.08), bevel_amt=0.02)
    add_box(bm_head, (0.05, 0.06, 0.14), center=(0, 0.26, 0.07), bevel_amt=0.008)  # nasal bar
    # 12 Battlement Merlons around the crown perimeter
    for ox in (-0.21, -0.07, 0.07, 0.21):
        add_box(bm_head, (0.085, 0.08, 0.12), center=(ox, 0.20, 0.19), bevel_amt=0.01)
        add_box(bm_head, (0.085, 0.08, 0.12), center=(ox, -0.20, 0.19), bevel_amt=0.01)
    for oy in (-0.12, 0.12):
        add_box(bm_head, (0.08, 0.085, 0.12), center=(-0.23, oy, 0.19), bevel_amt=0.01)
        add_box(bm_head, (0.08, 0.085, 0.12), center=(0.23, oy, 0.19), bevel_amt=0.01)
    head_obj = finalize_mesh("rook_head", bm_head, MAT_TRIM, root, location=(0, 0, 0.94))

    # Subtle Recessed Eye Slits (`rook_gem`)
    bm_gem = bmesh.new()
    add_box(bm_gem, (0.07, 0.03, 0.025), center=(-0.065, 0.265, 0.09))
    add_box(bm_gem, (0.07, 0.03, 0.025), center=(0.065, 0.265, 0.09))
    finalize_mesh("rook_gem", bm_gem, MAT_GEM, head_obj)

    # Right Articulated Siege Warhammer Arm (`rook_weapon`)
    bm_weap = bmesh.new()
    # Layered stone shoulder & forearm vambrace
    add_box(bm_weap, (0.16, 0.18, 0.28), center=(0.06, 0.02, -0.06), rot_euler=(0.25, 0, 0), bevel_amt=0.02)
    add_box(bm_weap, (0.14, 0.16, 0.22), center=(0.06, 0.12, -0.22), rot_euler=(0.55, 0, 0), bevel_amt=0.015)
    # Fluted warhammer shaft + heavy spiked siege maul head
    add_cone(bm_weap, 0.032, 0.028, 0.70, segments=8, center=(0.06, 0.24, 0.12), rot_euler=(-0.38, 0, 0))
    add_box(bm_weap, (0.20, 0.36, 0.18), center=(0.06, 0.36, 0.42), rot_euler=(-0.38, 0, 0), bevel_amt=0.02)
    add_cone(bm_weap, 0.055, 0.005, 0.14, segments=4, center=(0.06, 0.54, 0.48), rot_euler=(-1.95, 0, math.pi / 4))
    finalize_mesh("rook_weapon", bm_weap, MAT_METAL, root, location=(0.34, 0.02, 0.74))

    # Left Siege Battering-Ram Gauntlet & Tower Buckler (`rook_shield`)
    bm_sh = bmesh.new()
    add_box(bm_sh, (0.16, 0.18, 0.28), center=(-0.06, 0.02, -0.06), rot_euler=(0.25, 0, 0), bevel_amt=0.02)
    add_box(bm_sh, (0.20, 0.28, 0.24), center=(-0.06, 0.20, -0.16), rot_euler=(0.38, 0, 0), bevel_amt=0.022)
    # Crenellated knuckle spikes
    for kz in (-0.22, -0.15, -0.08):
        add_cone(bm_sh, 0.032, 0.004, 0.08, segments=4, center=(-0.06, 0.35, kz), rot_euler=(-1.2, 0, 0))
    finalize_mesh("rook_shield", bm_sh, MAT_TRIM, root, location=(-0.34, 0.02, 0.74))


# ==============================================================================
# 3. KNIGHT — Master-Sculpted Rearing Warhorse / Destrier (~1.38m)
#    Anatomically articulated rearing stallion, 8-pleat carved caparison barding,
#    7-lame crinet neck armor, flowing sculpted mane locks, jointed rearing
#    forelegs with hooves, fluted Gothic chanfron horse head, and vamplate lance.
# ==============================================================================
def build_knight():
    root = bpy.data.objects.new("piece_knight", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "knight", radius_scale=0.96, height_scale=0.96, motif="arches")

    # 8-Pleat Carved Caparison Barding Skirt & High Cantle Saddle (`knight_cloth`)
    bm_cloth = bmesh.new()
    lathe_bm(
        bm_cloth,
        [
            (0.33, 0.16),
            (0.31, 0.28),
            (0.26, 0.42),
            (0.22, 0.54),
        ],
        segments=32,
        scale_xy=(0.86, 1.16),
        flute_amp=0.055,
        flute_count=10,
        z_flute_range=(0.16, 0.52),
    )
    # Armored saddle pommel & high cantle with flank culet plates
    add_box(bm_cloth, (0.32, 0.42, 0.18), center=(0, -0.02, 0.56), rot_euler=(-0.32, 0, 0), bevel_amt=0.025)
    add_box(bm_cloth, (0.28, 0.08, 0.16), center=(0, -0.18, 0.66), rot_euler=(-0.20, 0, 0), bevel_amt=0.015)
    finalize_mesh("knight_cloth", bm_cloth, MAT_CLOTH, root)

    # Sculpted Rearing Stallion Body, Muscular Arched Neck & Jointed Forelegs (`knight_body`)
    bm_body = bmesh.new()
    # Hind legs (thigh, hock, cannon, hoof)
    for sx in (-1, 1):
        add_box(bm_body, (0.11, 0.16, 0.26), center=(sx * 0.12, -0.10, 0.34), rot_euler=(0.32, 0, 0), bevel_amt=0.02)
        add_box(bm_body, (0.085, 0.11, 0.20), center=(sx * 0.12, -0.14, 0.20), rot_euler=(-0.18, 0, 0), bevel_amt=0.012)
        add_cone(bm_body, 0.065, 0.052, 0.07, segments=10, center=(sx * 0.12, -0.11, 0.17))

    # Muscular barrel chest & rearing arched neck (multi-segment organic sculpt)
    add_icosphere(bm_body, 0.21, subdivisions=2, center=(0, 0.03, 0.64), scale=(0.82, 1.12, 1.15))
    add_icosphere(bm_body, 0.18, subdivisions=2, center=(0, 0.10, 0.82), scale=(0.76, 0.95, 1.15))
    add_icosphere(bm_body, 0.14, subdivisions=2, center=(0, 0.12, 0.98), scale=(0.72, 0.88, 1.10))

    # TWO JOINTED REARING FORELEGS (Shoulder -> Forearm -> Knee -> Cannon -> Hoof)
    for sx, lift in ((-1, 0.05), (1, -0.02)):
        # Upper forearm reaching forward & up
        add_box(bm_body, (0.082, 0.24, 0.088), center=(sx * 0.135, 0.23, 0.72 + lift), rot_euler=(0.42, 0, 0), bevel_amt=0.015)
        # Sculpted knee joint
        add_icosphere(bm_body, 0.048, subdivisions=1, center=(sx * 0.135, 0.33, 0.67 + lift))
        # Lower cannon bone tucked back dynamically
        add_box(bm_body, (0.068, 0.22, 0.072), center=(sx * 0.135, 0.37, 0.55 + lift), rot_euler=(-0.78, 0, 0), bevel_amt=0.012)
        # Carved equine hoof
        add_cone(bm_body, 0.052, 0.038, 0.065, segments=8, center=(sx * 0.135, 0.42, 0.44 + lift), rot_euler=(0.65, 0, 0))

    finalize_mesh("knight_body", bm_body, MAT_STONE, root)

    # 7-Plate Articulated Neck Crinet, Flowing Mane Locks & Peytral Breastplate (`knight_trim`)
    bm_trim = bmesh.new()
    for i in range(8):
        t = i / 7.0
        mz = 0.60 + t * 0.46
        my = -0.13 + math.sin(t * math.pi * 0.85) * 0.11
        # Overlapping articulated crinet armor lame
        add_box(bm_trim, (0.14 - t * 0.03, 0.09, 0.065), center=(0, my, mz), rot_euler=(0.45, 0, 0), bevel_amt=0.01)
        # Sculpted flowing mane locks sweeping to either side
        side_sign = 1 if i % 2 == 0 else -1
        add_cone(
            bm_trim,
            0.038,
            0.006,
            0.16,
            segments=6,
            center=(side_sign * 0.055, my - 0.04, mz),
            rot_euler=(0.75, side_sign * 0.35, 0),
        )
    # Fluted Peytral Chest-Plate across the horse's breast
    add_box(bm_trim, (0.31, 0.12, 0.15), center=(0, 0.20, 0.72), rot_euler=(-0.28, 0, 0), bevel_amt=0.018)
    finalize_mesh("knight_trim", bm_trim, MAT_TRIM, root)

    # Head: Sculpted Equine Head + Fluted Gothic Chanfron Armor (`knight_head`)
    bm_head = bmesh.new()
    # Cranium & cheek jowls
    add_icosphere(bm_head, 0.125, subdivisions=2, center=(0, 0.01, 0.06), scale=(0.82, 1.05, 0.95))
    # Tapering equine bridge of nose & muzzle
    add_cone(bm_head, 0.108, 0.062, 0.34, segments=12, center=(0, 0.19, -0.02), rot_euler=(-1.22, 0, 0), scale=(0.82, 1.0, 1.0))
    # Lower jaw & chin
    add_box(bm_head, (0.095, 0.22, 0.065), center=(0, 0.15, -0.06), rot_euler=(-0.38, 0, 0), bevel_amt=0.012)
    # Flared sculpted nostrils
    for sx in (-1, 1):
        add_icosphere(bm_head, 0.028, subdivisions=1, center=(sx * 0.042, 0.33, -0.05))
    # Fluted Gothic Chanfron armor plate over forehead & nose bridge + central spike
    add_box(bm_head, (0.11, 0.28, 0.035), center=(0, 0.17, 0.055), rot_euler=(-0.36, 0, 0), bevel_amt=0.008)
    add_cone(bm_head, 0.028, 0.004, 0.18, segments=6, center=(0, 0.21, 0.13), rot_euler=(-0.82, 0, 0))
    # Pricked equine ears
    for sx in (-1, 1):
        add_cone(bm_head, 0.034, 0.005, 0.15, segments=8, center=(sx * 0.068, -0.04, 0.19), rot_euler=(-0.18, sx * 0.16, 0))
    # Layered sweeping crest plume
    for p in range(3):
        add_cone(
            bm_head,
            0.045 - p * 0.006,
            0.006,
            0.28,
            segments=8,
            center=(0, -0.10 - p * 0.03, 0.20 - p * 0.02),
            rot_euler=(0.75 + p * 0.15, 0, 0),
        )
    head_obj = finalize_mesh("knight_head", bm_head, MAT_METAL, root, location=(0, 0.10, 1.07))

    # Destrier Eyes (`knight_gem`)
    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.028, subdivisions=1, center=(-0.088, 0.09, 0.06))
    add_icosphere(bm_gem, 0.028, subdivisions=1, center=(0.088, 0.09, 0.06))
    finalize_mesh("knight_gem", bm_gem, MAT_GEM, head_obj)

    # Weapon: Fluted Tournament Jousting Lance with Vamplate (`knight_weapon`)
    bm_weap = bmesh.new()
    # Conical steel vamplate hand-guard
    add_cone(bm_weap, 0.115, 0.032, 0.18, segments=14, center=(0, 0.05, 0.01), rot_euler=(-1.32, 0, 0))
    # Long fluted lance shaft + butt counter-weight
    add_cone(bm_weap, 0.042, 0.006, 1.02, segments=10, center=(0, 0.50, 0.13), rot_euler=(-1.32, 0, 0))
    add_cone(bm_weap, 0.032, 0.048, 0.24, segments=10, center=(0, -0.12, -0.03), rot_euler=(-1.32, 0, 0))
    finalize_mesh("knight_weapon", bm_weap, MAT_METAL, root, location=(0.23, 0.05, 0.72))

    # Shield: Carved Gothic Heater Shield (`knight_shield`)
    bm_sh = bmesh.new()
    add_box(bm_sh, (0.045, 0.28, 0.34), center=(0, 0.02, 0), rot_euler=(0.15, -0.18, -0.16), bevel_amt=0.014)
    add_box(bm_sh, (0.025, 0.18, 0.04), center=(-0.02, 0.02, 0.03), rot_euler=(0.45, -0.18, -0.16), bevel_amt=0.005)
    finalize_mesh("knight_shield", bm_sh, MAT_TRIM, root, location=(-0.23, 0.06, 0.72))


# ==============================================================================
# 4. BISHOP — Carved Gothic High-Prelate / Arch-Mage (~1.48m)
#    14-flute deeply pleated cathedral robes, scalloped pellegrina capelet,
#    embroidered Y-orphrey stole, cleft Gothic mitre with rose medallion &
#    lappets, spiral-volute pastoral crosier staff, and clasped ribbed tome.
# ==============================================================================
def build_bishop():
    root = bpy.data.objects.new("piece_bishop", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "bishop", radius_scale=0.92, height_scale=0.96, motif="fluted")

    # Deeply Pleated 14-Flute Cathedral Robes (`bishop_body`)
    bm_body = bmesh.new()
    robe_prof = [
        (0.30, 0.17),
        (0.28, 0.30),
        (0.23, 0.52),
        (0.18, 0.74),
        (0.16, 0.90),
        (0.21, 1.00),
        (0.12, 1.06),
    ]
    lathe_bm(
        bm_body,
        robe_prof,
        segments=42,
        scale_xy=(0.92, 1.06),
        flute_amp=0.065,
        flute_count=14,
        z_flute_range=(0.18, 0.96),
    )
    # Layered scalloped shoulder pellegrina capelet & high collar
    lathe_bm(
        bm_body,
        [
            (0.25, 0.84),
            (0.23, 0.94),
            (0.15, 1.04),
        ],
        segments=28,
        flute_amp=0.04,
        flute_count=10,
        z_flute_range=(0.84, 1.02),
    )
    add_cone(bm_body, 0.22, 0.12, 0.18, segments=18, center=(0, -0.04, 1.03), rot_euler=(-0.22, 0, 0))
    finalize_mesh("bishop_body", bm_body, MAT_STONE, root)

    # Carved Y-Orphrey Chasuble Stole & Astrolabe Collar Relief (`bishop_trim`)
    bm_trim = bmesh.new()
    # Vertical central stole band with carved cross reliefs
    add_box(bm_trim, (0.085, 0.035, 0.72), center=(0, 0.18, 0.58), rot_euler=(-0.09, 0, 0), bevel_amt=0.008)
    # Y-shaped pallium collar bands over chest
    for sx in (-1, 1):
        add_box(bm_trim, (0.06, 0.035, 0.22), center=(sx * 0.07, 0.17, 0.94), rot_euler=(-0.15, sx * 0.48, 0), bevel_amt=0.006)
    # Sculpted waist cincture belt + hanging stole fringe
    add_torus_ring(bm_trim, 0.185, 0.022, seg_major=24, seg_minor=8, center=(0, 0.01, 0.74), scale=(0.92, 1.06, 1.0))
    # Subtle celestial ring halo behind shoulders
    add_torus_ring(bm_trim, 0.28, 0.014, seg_major=28, seg_minor=8, center=(0, -0.06, 0.96), rot_euler=(math.pi / 2 - 0.25, 0, 0))
    finalize_mesh("bishop_trim", bm_trim, MAT_TRIM, root)

    # Head: Sculpted Visage + Tall Cleft Gothic Mitre with Rose Medallion (`bishop_head`)
    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.115, subdivisions=2, center=(0, 0, 0.06), scale=(0.88, 0.96, 1.05))
    # Mitre headband circlet
    add_torus_ring(bm_head, 0.118, 0.018, seg_major=24, seg_minor=8, center=(0, 0, 0.12))
    # Front and rear pointed Gothic mitre peaks (creating the classic Bishop cleft!)
    add_cone(bm_head, 0.122, 0.012, 0.30, segments=16, center=(0, 0.028, 0.26), rot_euler=(0.08, 0, 0), scale=(0.95, 0.52, 1.0))
    add_cone(bm_head, 0.118, 0.012, 0.28, segments=16, center=(0, -0.038, 0.25), rot_euler=(-0.10, 0, 0), scale=(0.92, 0.50, 1.0))
    # Carved cross finial & rose-window medallion on front mitre peak
    add_torus_ring(bm_head, 0.048, 0.010, seg_major=16, seg_minor=6, center=(0, 0.075, 0.23), rot_euler=(math.pi / 2 - 0.15, 0, 0))
    add_box(bm_head, (0.022, 0.022, 0.08), center=(0, 0.04, 0.42), bevel_amt=0.004)
    add_box(bm_head, (0.065, 0.022, 0.022), center=(0, 0.04, 0.43), bevel_amt=0.004)
    # Two hanging mitre lappets (infulae) down the back
    for sx in (-1, 1):
        add_box(bm_head, (0.038, 0.018, 0.20), center=(sx * 0.045, -0.11, 0.02), rot_euler=(0.18, sx * 0.08, 0), bevel_amt=0.004)
    head_obj = finalize_mesh("bishop_head", bm_head, MAT_STONE, root, location=(0, 0, 1.03))

    # Subtle Recessed Eyes & Mitre Jewel (`bishop_gem`)
    bm_gem = bmesh.new()
    add_box(bm_gem, (0.10, 0.028, 0.020), center=(0, 0.105, 0.065))
    add_icosphere(bm_gem, 0.024, subdivisions=1, center=(0, 0.082, 0.23))
    finalize_mesh("bishop_gem", bm_gem, MAT_GEM, head_obj)

    # Weapon: Ornate Pastoral Crosier Staff with Spiral Crook Volute (`bishop_weapon`)
    bm_weap = bmesh.new()
    # Fluted staff shaft + architectural lantern knop node
    add_cone(bm_weap, 0.024, 0.018, 1.14, segments=12, center=(0, 0, 0.20))
    add_icosphere(bm_weap, 0.048, subdivisions=1, center=(0, 0, 0.72), scale=(1.0, 1.0, 1.3))
    # Spiral Shepherd's Crook volute curving over the top
    for i in range(14):
        t = i / 13.0
        ang = t * math.pi * 1.65
        rad = 0.105 * (1.0 - t * 0.42)
        vx = math.sin(ang) * rad
        vz = 0.86 + (1.0 - math.cos(ang)) * rad
        add_icosphere(bm_weap, 0.024 * (1.0 - t * 0.3), subdivisions=1, center=(vx, 0, vz))
    finalize_mesh("bishop_weapon", bm_weap, MAT_METAL, root, location=(0.25, 0.11, 0.56))

    # Shield: Clasped Ribbed Cathedral Tome (`bishop_shield`)
    bm_sh = bmesh.new()
    # Covers, recessed pages, and 4 raised spine ribs
    add_box(bm_sh, (0.17, 0.22, 0.052), center=(0, 0.05, 0), rot_euler=(-0.42, 0.22, 0), bevel_amt=0.008)
    for ry in (-0.06, -0.02, 0.02, 0.06):
        add_box(bm_sh, (0.18, 0.016, 0.058), center=(0, 0.05 + ry, 0), rot_euler=(-0.42, 0.22, 0), bevel_amt=0.003)
    finalize_mesh("bishop_shield", bm_sh, MAT_TRIM, root, location=(-0.23, 0.17, 0.75))


# ==============================================================================
# 5. QUEEN — High-Gothic Winged Empress (~1.64m)
#    16-pleat carved royal gown, sculpted corset & Medici collar ruff,
#    multi-layered 18-feather carved stone/ivory seraph wings, 12-spire
#    fleur-de-lis coronet crown, spiral royal scepter, and sovereign orb.
# ==============================================================================
def build_queen():
    root = bpy.data.objects.new("piece_queen", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "queen", radius_scale=1.02, height_scale=1.05, motif="rosette")

    # 16-Pleat Carved Royal Gown & Bodice (`queen_body`)
    bm_body = bmesh.new()
    gown_prof = [
        (0.35, 0.17),
        (0.32, 0.34),
        (0.24, 0.56),
        (0.165, 0.76),  # cinched Gothic corset waist
        (0.21, 0.94),
        (0.145, 1.08),
    ]
    lathe_bm(
        bm_body,
        gown_prof,
        segments=48,
        scale_xy=(0.94, 1.10),
        flute_amp=0.058,
        flute_count=16,
        z_flute_range=(0.18, 0.74),
    )
    # Sculpted bodice cuirass & articulated pauldrons
    add_box(bm_body, (0.26, 0.21, 0.28), center=(0, 0.03, 0.88), bevel_amt=0.028)
    for sx in (-1, 1):
        add_icosphere(bm_body, 0.075, subdivisions=2, center=(sx * 0.15, 0.01, 0.99), scale=(1.1, 0.9, 0.8))
    finalize_mesh("queen_body", bm_body, MAT_STONE, root)

    # Carved Royal Over-Mantle Train & High Medici Fan Collar (`queen_cloth`)
    bm_cloth = bmesh.new()
    # Sweeping pleated royal train down the back
    for i in range(-2, 3):
        tx = i * 0.055
        add_cone(
            bm_cloth,
            0.065,
            0.032,
            0.78,
            segments=10,
            center=(tx, -0.17, 0.56),
            rot_euler=(0.22, i * 0.06, 0),
        )
    # High pleated Medici fan-collar behind neck
    for i in range(-4, 5):
        ang = i * 0.18
        cx = math.sin(ang) * 0.13
        cy = -0.05 - math.cos(ang) * 0.04
        add_box(bm_cloth, (0.028, 0.045, 0.15), center=(cx, cy, 1.07), rot_euler=(-0.32, ang * 0.7, 0), bevel_amt=0.005)
    finalize_mesh("queen_cloth", bm_cloth, MAT_CLOTH, root)

    # Multi-Layered 18-Feather Carved Cathedral Seraph Wings (`queen_wings`)
    bm_wings = bmesh.new()
    for side in (-1, 1):
        # Upper wing arch bone (carpal ridge)
        add_box(
            bm_wings,
            (0.28, 0.045, 0.055),
            center=(side * 0.22, -0.09, 1.08),
            rot_euler=(0.15, side * -0.42, 0),
            bevel_amt=0.012,
        )
        # Primary flight pinions (9 long carved feathers per wing)
        for f in range(9):
            t = f / 8.0
            wx = side * (0.14 + t * 0.30)
            wy = -0.10 - t * 0.05
            wz = 0.98 + math.sin(t * math.pi * 0.75) * 0.24 - t * 0.16
            flen = 0.42 - t * 0.06
            rot_y = side * (0.35 + t * 0.72)
            add_cone(
                bm_wings,
                0.034,
                0.005,
                flen,
                segments=8,
                center=(wx, wy, wz),
                rot_euler=(-0.18, rot_y, 0),
                scale=(0.38, 1.15, 1.0),
            )
        # Secondary covert feathers (inner layered relief row)
        for f in range(6):
            t = f / 5.0
            wx = side * (0.13 + t * 0.20)
            wy = -0.08 - t * 0.03
            wz = 1.00 + math.sin(t * math.pi * 0.75) * 0.16 - t * 0.10
            add_cone(
                bm_wings,
                0.030,
                0.006,
                0.24,
                segments=6,
                center=(wx, wy, wz),
                rot_euler=(-0.15, side * (0.30 + t * 0.55), 0),
                scale=(0.42, 1.1, 1.0),
            )
    finalize_mesh("queen_wings", bm_wings, MAT_TRIM, root)

    # Head: Sculpted Empress Visage + 12-Spire Fleur-de-Lis Gothic Coronet (`queen_head`)
    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.12, subdivisions=2, center=(0, 0, 0.07), scale=(0.88, 0.96, 1.05))
    # Braided chignon hair bun at back of head
    add_icosphere(bm_head, 0.068, subdivisions=2, center=(0, -0.095, 0.06))
    # Fluted coronet base circlet
    add_torus_ring(bm_head, 0.112, 0.018, seg_major=28, seg_minor=8, center=(0, 0, 0.15))
    add_cone(bm_head, 0.112, 0.128, 0.07, segments=24, center=(0, 0, 0.18))
    # 12 alternating tall fleur-de-lis spires & pearl-tipped rays around the crown!
    for i in range(12):
        ang = (i / 12.0) * math.tau
        is_tall = (i % 2 == 0)
        spire_h = 0.15 if is_tall else 0.095
        cx = math.cos(ang) * 0.122
        cy = math.sin(ang) * 0.122
        add_cone(
            bm_head,
            0.022 if is_tall else 0.015,
            0.003,
            spire_h,
            segments=6,
            center=(cx, cy, 0.23 + spire_h * 0.35),
            rot_euler=(-math.sin(ang) * 0.22, math.cos(ang) * 0.22, 0),
        )
        if is_tall:
            add_icosphere(bm_head, 0.012, subdivisions=1, center=(cx * 1.08, cy * 1.08, 0.23 + spire_h * 0.85))
    head_obj = finalize_mesh("queen_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.10))

    # Subtle Recessed Eyes & Forehead Crown Jewel (`queen_gem`)
    bm_gem = bmesh.new()
    add_box(bm_gem, (0.105, 0.028, 0.020), center=(0, 0.108, 0.075))
    add_icosphere(bm_gem, 0.022, subdivisions=1, center=(0, 0.128, 0.18))
    finalize_mesh("queen_gem", bm_gem, MAT_GEM, head_obj)

    # Weapon: Fluted Royal Scepter with Lotus Finial (`queen_weapon`)
    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.015, 1.16, segments=12, center=(0, 0, 0.22))
    for rz in (0.10, 0.45, 0.72):
        add_torus_ring(bm_weap, 0.028, 0.007, seg_major=16, seg_minor=6, center=(0, 0, rz))
    # Fluted lotus calyx & royal orb atop scepter
    add_cone(bm_weap, 0.024, 0.062, 0.07, segments=12, center=(0, 0, 0.79))
    add_icosphere(bm_weap, 0.058, subdivisions=2, center=(0, 0, 0.86))
    add_cone(bm_weap, 0.018, 0.003, 0.09, segments=6, center=(0, 0, 0.94))
    finalize_mesh("queen_weapon", bm_weap, MAT_METAL, root, location=(0.26, 0.13, 0.66))

    # Shield: Sovereign Globus Cruciger Orb in Left Hand (`queen_shield`)
    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.072, subdivisions=2, center=(0, 0.04, 0.04))
    add_torus_ring(bm_sh, 0.076, 0.010, seg_major=20, seg_minor=6, center=(0, 0.04, 0.04))
    add_torus_ring(bm_sh, 0.076, 0.010, seg_major=20, seg_minor=6, center=(0, 0.04, 0.04), rot_euler=(math.pi / 2, 0, 0))
    add_box(bm_sh, (0.018, 0.018, 0.075), center=(0, 0.04, 0.14), bevel_amt=0.003)
    add_box(bm_sh, (0.055, 0.018, 0.018), center=(0, 0.04, 0.15), bevel_amt=0.003)
    finalize_mesh("queen_shield", bm_sh, MAT_TRIM, root, location=(-0.25, 0.17, 0.86))


# ==============================================================================
# 6. KING — Towering Sovereign Gothic Monarch (~1.84m)
#    Double-tiered octagonal dais, 10-flute carved royal mantle cloak,
#    Gothic plate cuirass with relief cross, layered lion pauldrons,
#    sculpted bearded visage, double-arched Imperial Crown with globus cruciger,
#    and planted two-handed fuller greatsword.
# ==============================================================================
def build_king():
    root = bpy.data.objects.new("piece_king", None)
    scene.collection.objects.link(root)
    build_pedestal(root, "king", radius_scale=1.12, height_scale=1.24, octagonal=True, motif="buttress")

    # 10-Flute Carved Royal Sovereign Mantle Cloak (`king_cloth`)
    bm_cloth = bmesh.new()
    # Sweeping pleated cloak draping down the back & flanks
    for i in range(-4, 5):
        ang = i * 0.19
        cx = math.sin(ang) * 0.25
        cy = -0.14 - math.cos(ang) * 0.08
        add_cone(
            bm_cloth,
            0.068,
            0.042,
            0.96,
            segments=10,
            center=(cx, cy, 0.70),
            rot_euler=(0.14, -ang * 0.25, 0),
        )
    # Front pleated surcoat apron with carved border
    for fx in (-0.09, -0.03, 0.03, 0.09):
        add_box(bm_cloth, (0.048, 0.05, 0.56), center=(fx, 0.16, 0.54), bevel_amt=0.008)
    finalize_mesh("king_cloth", bm_cloth, MAT_CLOTH, root)

    # Heavy Fluted Gothic Plate Torso & Cuirass (`king_body`)
    bm_body = bmesh.new()
    king_prof = [
        (0.35, 0.22),
        (0.31, 0.50),
        (0.28, 0.78),
        (0.33, 1.06),
        (0.20, 1.22),
    ]
    lathe_bm(
        bm_body,
        king_prof,
        segments=32,
        flute_amp=0.035,
        flute_count=12,
        z_flute_range=(0.24, 0.82),
    )
    # Armored breastplate with raised Gothic cross relief on chest
    add_box(bm_body, (0.38, 0.26, 0.34), center=(0, 0.05, 0.98), bevel_amt=0.028)
    add_box(bm_body, (0.045, 0.035, 0.24), center=(0, 0.185, 0.98), bevel_amt=0.006)
    add_box(bm_body, (0.18, 0.035, 0.045), center=(0, 0.185, 1.02), bevel_amt=0.006)
    finalize_mesh("king_body", bm_body, MAT_STONE, root)

    # Layered Lion-Pauldron Shoulder Mantle & Royal Chain of Office (`king_trim`)
    bm_trim = bmesh.new()
    add_box(bm_trim, (0.58, 0.28, 0.15), center=(0, 0.01, 1.12), bevel_amt=0.03)
    for sx in (-1, 1):
        # 3-tier articulated pauldron lames on each shoulder
        for l in range(3):
            add_icosphere(
                bm_trim,
                0.12 - l * 0.015,
                subdivisions=2,
                center=(sx * (0.26 + l * 0.035), 0.02, 1.14 - l * 0.045),
                scale=(1.15, 0.95, 0.75),
            )
    # Sculpted Collar of State (chain of office) across the chest
    add_torus_ring(bm_trim, 0.19, 0.022, seg_major=20, seg_minor=8, center=(0, 0.08, 1.10), rot_euler=(0.55, 0, 0))
    finalize_mesh("king_trim", bm_trim, MAT_TRIM, root)

    # Head: Sculpted Bearded Monarch + Double-Arched Imperial Crown (`king_head`)
    bm_head = bmesh.new()
    # Cranium, brow ridge, and cheekbones
    add_box(bm_head, (0.22, 0.22, 0.22), center=(0, 0, 0.10), bevel_amt=0.028)
    # 7-Lock Sculpted Flowing Sovereign Beard & Mustache
    for i in range(-3, 4):
        bx = i * 0.026
        by = 0.115 - abs(i) * 0.012
        b_len = 0.18 - abs(i) * 0.018
        add_cone(bm_head, 0.032, 0.008, b_len, segments=8, center=(bx, by, 0.01), rot_euler=(math.pi - 0.18, i * 0.06, 0))
    # Mustache sweeps
    for sx in (-1, 1):
        add_cone(bm_head, 0.026, 0.008, 0.09, segments=6, center=(sx * 0.045, 0.125, 0.065), rot_euler=(0.2, sx * 1.15, 0))

    # Imperial Crown Circlet + 8 Fleuron Spires
    add_torus_ring(bm_head, 0.145, 0.022, seg_major=28, seg_minor=8, center=(0, 0, 0.20))
    add_cone(bm_head, 0.145, 0.168, 0.11, segments=16, center=(0, 0, 0.25))
    for i in range(8):
        ang = (i / 8.0) * math.tau
        fx = math.cos(ang) * 0.162
        fy = math.sin(ang) * 0.162
        add_cone(bm_head, 0.028, 0.005, 0.09, segments=6, center=(fx, fy, 0.32))

    # Double Intersecting Imperial Crown Arches + Globus Cruciger & Cross Pattée Finial!
    add_torus_ring(bm_head, 0.145, 0.020, seg_major=24, seg_minor=8, center=(0, 0, 0.30), rot_euler=(math.pi / 2, 0, 0))
    add_torus_ring(bm_head, 0.145, 0.020, seg_major=24, seg_minor=8, center=(0, 0, 0.30), rot_euler=(math.pi / 2, 0, math.pi / 2))
    # Sovereign Orb (Globus) at apex of arches
    add_icosphere(bm_head, 0.048, subdivisions=2, center=(0, 0, 0.45))
    # Prominent Cross Pattée rising to ~1.84m total height
    add_box(bm_head, (0.048, 0.048, 0.19), center=(0, 0, 0.56), bevel_amt=0.007)
    add_box(bm_head, (0.17, 0.048, 0.048), center=(0, 0, 0.57), bevel_amt=0.007)
    head_obj = finalize_mesh("king_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.22))

    # Subtle Recessed Sovereign Eyes & Crown Jewel (`king_gem`)
    bm_gem = bmesh.new()
    add_box(bm_gem, (0.13, 0.03, 0.022), center=(0, 0.118, 0.12))
    add_icosphere(bm_gem, 0.028, subdivisions=1, center=(0, 0.168, 0.25))
    finalize_mesh("king_gem", bm_gem, MAT_GEM, head_obj)

    # Weapon: Colossal Two-Handed Sovereign Greatsword with Fuller (`king_weapon`)
    bm_weap = bmesh.new()
    # Faceted scent-stopper pommel + wire-bound two-handed grip
    add_cone(bm_weap, 0.045, 0.025, 0.08, segments=8, center=(0, 0, -0.22))
    add_cone(bm_weap, 0.026, 0.022, 0.26, segments=12, center=(0, 0, -0.06))
    # Sweeping quillons crossguard with central écusson block & side rings
    add_box(bm_weap, (0.38, 0.052, 0.048), center=(0, 0, 0.08), bevel_amt=0.01)
    add_box(bm_weap, (0.075, 0.068, 0.075), center=(0, 0, 0.08), bevel_amt=0.012)
    # Broad diamond-section blade + central fuller ridge
    add_cone(bm_weap, 0.078, 0.008, 1.00, segments=4, center=(0, 0, 0.58), rot_euler=(0, 0, math.pi / 4), scale=(1.1, 0.38, 1.0))
    add_box(bm_weap, (0.022, 0.038, 0.62), center=(0, 0, 0.42), bevel_amt=0.004)
    finalize_mesh("king_weapon", bm_weap, MAT_METAL, root, location=(0.26, 0.21, 0.72))

    # Shield: Carved Royal Escutcheon Targe (`king_shield`)
    bm_sh = bmesh.new()
    add_box(bm_sh, (0.05, 0.28, 0.36), center=(0, 0.04, 0), rot_euler=(0.10, 0, -0.22), bevel_amt=0.016)
    add_box(bm_sh, (0.028, 0.04, 0.26), center=(-0.025, 0.04, 0), rot_euler=(0.10, 0, -0.22), bevel_amt=0.005)
    add_box(bm_sh, (0.028, 0.20, 0.04), center=(-0.025, 0.04, 0.03), rot_euler=(0.10, 0, -0.22), bevel_amt=0.005)
    finalize_mesh("king_shield", bm_sh, MAT_TRIM, root, location=(-0.29, 0.16, 0.78))


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
print(f"Exported high-detail Gothic Wizard Chess GLB to {out_path}")
