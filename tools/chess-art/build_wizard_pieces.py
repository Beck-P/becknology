"""Sculpt 5 Complete World-Themed 3D Chess Sets (30 unique piece models) in Blender and export to GLB.

Run headlessly with Blender:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/chess-art/build_wizard_pieces.py -- apps/chess/assets/wizard-pieces.glb

Worlds & Piece Sets (6 classes per world = 30 sculpted models):
  1. `classic` (Wizard's Tower — Gothic Hearthstone Set):
     - Pawn: Sallet-helmed Gothic pikeman with cross-boss kite shield & poleaxe
     - Rook: Coursed ashlar castle keep golem with 4 corner watch-turrets, portcullis & siege mauls
     - Knight: Rearing armored destrier stallion with pleated barding, crinet neck plates & jousting lance
     - Bishop: Pleated cathedral arch-mage with cleft mitre, spiral crosier & clasped tome
     - Queen: High-Gothic empress with 18-feather seraph wings, 12-spire coronet, lotus scepter & orb
     - King: Bearded sovereign monarch with double-arched Imperial cross-crown, lion pauldrons & greatsword

  2. `lumar` (Lumar — Abyssal Tides & Nautical Kingdom Set):
     - Pawn: Deep-sea Corsair Diver with conch-fin helmet, anchor buckler shield & harpoon spear
     - Rook: Coastal Lighthouse Kraken Bastion with striped tower, lantern dome & curling kraken tentacles
     - Knight: Rearing Hippocampus Sea-Stallion with curled spiral tail, dorsal fin mane & coral trident
     - Bishop: Abyssal Tide-Priest with wave-fluted kelp robes, spiral nautilus mitre & Poseidon trident
     - Queen: Empress of the Maelstrom with wide scalloped Manta/Siren fin-wings, coral crown & pearl scepter
     - King: Leviathan Sea-Monarch with tentacle mantle, trident-spired crown & colossal great-anchor blade

  3. `arcadia` (Arcadia — Neon Cyber-Arcade Synth Set):
     - Pawn: Cyber-Enforcer Droid with angular synth-visor, hexagonal hard-light riot shield & plasma blade
     - Rook: Heavy Arcade Mecha-Bastion on tank treads with shoulder railguns & CRT marquee visor head
     - Knight: Sleek Cyber-Strider / Light-Cycle Steed with thruster pods, laser-fin mane & shock-lance
     - Bishop: Netrunner Holo-Hacker with high cyber-collar, orbiting data-octahedrons & helix antenna staff
     - Queen: Valkyrie-X Cyber-Empress with 6-blade angular laser-jet wings, holo-halo & twin-emitter glaive
     - King: Overlord Prime Mecha-Monarch with booster shoulder pylons, crown antenna array & neon greatsword

  4. `enigma` (Enigma Station — Deep-Space Orbital Telemetry Set):
     - Pawn: Orbital Security EVA Construct with domed visor helmet, ballistic blast-shield & pulse bayonet
     - Rook: Orbital Defense Relay Tower with deployed solar-panel wings, rotating radar dish & coil-cannons
     - Knight: Zero-G Recon Strider Mech-Hound with dual canted thruster nacelles, sensor head & rail-pike
     - Bishop: Cryptographer AI Conduit with gimballed gyroscopic data-rings, parabolic dish head & cipher staff
     - Queen: Astra-Command Overseer with 4-panel diamond solar-array wings, orbital halo & graviton rod
     - King: Station Prime Sovereign Core with shoulder comms dishes, multi-ring gyroscope crown & tactical blade

  5. `singularity` (The Singularity — Event Horizon Cosmic Monolith Set):
     - Pawn: Void-Shard Acolyte — faceted levitating obelisk body, crescent-ring head & crystal lance shard
     - Rook: Tesseract Gravity Pillar — nested hypercube monolith with floating corner shards & grav-gauntlets
     - Knight: Astral Rift-Steed — faceted star-constellation stallion with crescent neck arc & comet lance
     - Bishop: Chronos Astrolabe Oracle — floating void-weaver inside 3 concentric armillary rings & singularity staff
     - Queen: Nova Seraph of the Horizon — sweeping crescent eclipse wings + floating star-shards & quasar scepter
     - King: Architect of the Singularity — floating shoulder obelisks, accretion-disk black-hole crown & rift greatsword
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
        (0.360 * r, 0.118 * h),
        (0.390 * r, 0.132 * h),
        (0.358 * r, 0.148 * h),
    ]
    lathe_bm(bm_trim, trim_profile, segments=segments)
    finalize_mesh(f"{prefix}_base_trim", bm_trim, MAT_TRIM, parent, smooth=(motif not in ("cyber", "monolith")))


# ==============================================================================
# SET 1: CLASSIC — WIZARD'S TOWER (Gothic Cathedral Knights & Monarchs)
# ==============================================================================
def build_classic_set(x_off=0.0):
    # 1. CLASSIC PAWN
    root = bpy.data.objects.new("piece_classic_pawn", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "classic_pawn", radius_scale=0.84, height_scale=0.88, segments=24, motif="fluted")

    bm_body = bmesh.new()
    for sx in (-1, 1):
        add_cone(bm_body, 0.062, 0.052, 0.20, segments=10, center=(sx * 0.09, 0.0, 0.24))
        add_icosphere(bm_body, 0.055, subdivisions=1, center=(sx * 0.09, 0.045, 0.31), scale=(1.0, 0.8, 0.9))
        add_box(bm_body, (0.085, 0.14, 0.055), center=(sx * 0.09, 0.04, 0.17), bevel_amt=0.01)
    add_box(bm_body, (0.28, 0.21, 0.25), center=(0, 0.01, 0.46), rot_euler=(0.08, 0, 0), bevel_amt=0.025)
    add_cone(bm_body, 0.12, 0.04, 0.22, segments=4, center=(0, 0.11, 0.46), rot_euler=(0.08, 0, 0), scale=(1.1, 0.35, 1.0))
    finalize_mesh("classic_pawn_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    for row in range(3):
        z_lame = 0.33 + row * 0.042
        for sx in (-1, 1):
            add_box(bm_cloth, (0.11, 0.18, 0.038), center=(sx * 0.085, 0.02, z_lame), rot_euler=(0.12, sx * 0.12, 0), bevel_amt=0.005)
    for sx in (-1, 1):
        for l in range(2):
            add_box(bm_cloth, (0.11, 0.15, 0.05), center=(sx * (0.16 + l * 0.015), 0.01, 0.54 - l * 0.04), rot_euler=(0.08, sx * 0.4, 0), bevel_amt=0.008)
    finalize_mesh("classic_pawn_cloth", bm_cloth, MAT_CLOTH, root)

    bm_head = bmesh.new()
    lathe_bm(bm_head, [(0.105, 0.0), (0.175, 0.055), (0.168, 0.075), (0.132, 0.10), (0.128, 0.17), (0.095, 0.22), (0.03, 0.25)], segments=20)
    add_box(bm_head, (0.16, 0.10, 0.09), center=(0, 0.09, 0.09), rot_euler=(-0.12, 0, 0), bevel_amt=0.012)
    for i in range(5):
        ang = -0.5 + (i / 4.0) * 1.2
        add_box(bm_head, (0.026, 0.045, 0.045), center=(0, math.sin(ang) * 0.11, 0.13 + math.cos(ang) * 0.12), rot_euler=(-ang, 0, 0))
    head_obj = finalize_mesh("classic_pawn_head", bm_head, MAT_METAL, root, location=(0, 0.02, 0.58))

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.13, 0.03, 0.018), center=(0, 0.135, 0.11))
    finalize_mesh("classic_pawn_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.018, 0.90, segments=8, center=(0, 0.08, 0.18), rot_euler=(-0.48, 0, 0))
    add_box(bm_weap, (0.018, 0.16, 0.20), center=(0, 0.30, 0.44), rot_euler=(-0.48, 0, 0), bevel_amt=0.005)
    add_cone(bm_weap, 0.030, 0.003, 0.24, segments=4, center=(0, 0.30, 0.62), rot_euler=(-0.48, 0, math.pi / 4))
    finalize_mesh("classic_pawn_weapon", bm_weap, MAT_METAL, root, location=(0.22, 0.05, 0.42))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.26, 0.045, 0.44), center=(0, 0.03, 0.0), rot_euler=(0.08, 0, 0.32), bevel_amt=0.014)
    add_box(bm_sh, (0.042, 0.025, 0.36), center=(-0.01, 0.055, 0.0), rot_euler=(0.08, 0, 0.32))
    add_box(bm_sh, (0.20, 0.025, 0.042), center=(-0.01, 0.058, 0.05), rot_euler=(0.08, 0, 0.32))
    finalize_mesh("classic_pawn_shield", bm_sh, MAT_TRIM, root, location=(-0.18, 0.17, 0.43))

    # 2. CLASSIC ROOK
    root = bpy.data.objects.new("piece_classic_rook", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "classic_rook", radius_scale=1.08, height_scale=1.02, segments=16, motif="buttress")

    bm_body = bmesh.new()
    for sx in (-1, 1):
        add_box(bm_body, (0.19, 0.22, 0.28), center=(sx * 0.15, 0, 0.26), bevel_amt=0.016)
    add_box(bm_body, (0.48, 0.42, 0.54), center=(0, 0, 0.64), bevel_amt=0.02)
    for row in range(3):
        add_box(bm_body, (0.50, 0.44, 0.025), center=(0, 0, 0.46 + row * 0.15))
    for sx in (-1, 1):
        for sy in (-1, 1):
            tx, ty = sx * 0.25, sy * 0.21
            add_cone(bm_body, 0.105, 0.115, 0.66, segments=8, center=(tx, ty, 0.67))
            add_cone(bm_body, 0.125, 0.132, 0.05, segments=8, center=(tx, ty, 0.96))
    finalize_mesh("classic_rook_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.34, 0.06, 0.38), center=(0, 0.20, 0.62), bevel_amt=0.012)
    finalize_mesh("classic_rook_cloth", bm_cloth, MAT_CLOTH, root)

    bm_metal = bmesh.new()
    for gx in (-0.12, -0.04, 0.04, 0.12):
        add_box(bm_metal, (0.018, 0.035, 0.32), center=(gx, 0.225, 0.63))
    for gz in (0.52, 0.63, 0.74):
        add_box(bm_metal, (0.28, 0.035, 0.018), center=(0, 0.225, gz))
    finalize_mesh("classic_rook_metal", bm_metal, MAT_METAL, root)

    bm_head = bmesh.new()
    add_box(bm_head, (0.54, 0.48, 0.14), center=(0, 0, 0.06), bevel_amt=0.016)
    add_box(bm_head, (0.24, 0.14, 0.18), center=(0, 0.20, 0.08), bevel_amt=0.016)
    for ox in (-0.21, -0.07, 0.07, 0.21):
        add_box(bm_head, (0.085, 0.08, 0.12), center=(ox, 0.20, 0.19), bevel_amt=0.008)
        add_box(bm_head, (0.085, 0.08, 0.12), center=(ox, -0.20, 0.19), bevel_amt=0.008)
    head_obj = finalize_mesh("classic_rook_head", bm_head, MAT_TRIM, root, location=(0, 0, 0.94))

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.07, 0.03, 0.025), center=(-0.065, 0.265, 0.09))
    add_box(bm_gem, (0.07, 0.03, 0.025), center=(0.065, 0.265, 0.09))
    finalize_mesh("classic_rook_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.16, 0.18, 0.28), center=(0.06, 0.02, -0.06), rot_euler=(0.25, 0, 0), bevel_amt=0.016)
    add_cone(bm_weap, 0.032, 0.028, 0.70, segments=8, center=(0.06, 0.24, 0.12), rot_euler=(-0.38, 0, 0))
    add_box(bm_weap, (0.20, 0.36, 0.18), center=(0.06, 0.36, 0.42), rot_euler=(-0.38, 0, 0), bevel_amt=0.016)
    finalize_mesh("classic_rook_weapon", bm_weap, MAT_METAL, root, location=(0.34, 0.02, 0.74))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.16, 0.18, 0.28), center=(-0.06, 0.02, -0.06), rot_euler=(0.25, 0, 0), bevel_amt=0.016)
    add_box(bm_sh, (0.20, 0.28, 0.24), center=(-0.06, 0.20, -0.16), rot_euler=(0.38, 0, 0), bevel_amt=0.018)
    finalize_mesh("classic_rook_shield", bm_sh, MAT_TRIM, root, location=(-0.34, 0.02, 0.74))

    # 3. CLASSIC KNIGHT
    root = bpy.data.objects.new("piece_classic_knight", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "classic_knight", radius_scale=0.96, height_scale=0.96, segments=24, motif="fluted")

    bm_cloth = bmesh.new()
    lathe_bm(bm_cloth, [(0.33, 0.16), (0.31, 0.28), (0.26, 0.42), (0.22, 0.54)], segments=24, scale_xy=(0.86, 1.16), flute_amp=0.055, flute_count=10, z_flute_range=(0.16, 0.52))
    add_box(bm_cloth, (0.32, 0.42, 0.18), center=(0, -0.02, 0.56), rot_euler=(-0.32, 0, 0), bevel_amt=0.02)
    finalize_mesh("classic_knight_cloth", bm_cloth, MAT_CLOTH, root)

    bm_body = bmesh.new()
    for sx in (-1, 1):
        add_box(bm_body, (0.11, 0.16, 0.26), center=(sx * 0.12, -0.10, 0.34), rot_euler=(0.32, 0, 0), bevel_amt=0.015)
        add_box(bm_body, (0.085, 0.11, 0.20), center=(sx * 0.12, -0.14, 0.20), rot_euler=(-0.18, 0, 0), bevel_amt=0.01)
    add_icosphere(bm_body, 0.21, subdivisions=2, center=(0, 0.03, 0.64), scale=(0.82, 1.12, 1.15))
    add_icosphere(bm_body, 0.18, subdivisions=2, center=(0, 0.10, 0.82), scale=(0.76, 0.95, 1.15))
    add_icosphere(bm_body, 0.14, subdivisions=2, center=(0, 0.12, 0.98), scale=(0.72, 0.88, 1.10))
    for sx, lift in ((-1, 0.05), (1, -0.02)):
        add_box(bm_body, (0.082, 0.24, 0.088), center=(sx * 0.135, 0.23, 0.72 + lift), rot_euler=(0.42, 0, 0), bevel_amt=0.012)
        add_box(bm_body, (0.068, 0.22, 0.072), center=(sx * 0.135, 0.37, 0.55 + lift), rot_euler=(-0.78, 0, 0), bevel_amt=0.01)
    finalize_mesh("classic_knight_body", bm_body, MAT_STONE, root)

    bm_trim = bmesh.new()
    for i in range(7):
        t = i / 6.0
        mz = 0.60 + t * 0.46
        my = -0.13 + math.sin(t * math.pi * 0.85) * 0.11
        add_box(bm_trim, (0.14 - t * 0.03, 0.09, 0.065), center=(0, my, mz), rot_euler=(0.45, 0, 0), bevel_amt=0.008)
    add_box(bm_trim, (0.31, 0.12, 0.15), center=(0, 0.20, 0.72), rot_euler=(-0.28, 0, 0), bevel_amt=0.015)
    finalize_mesh("classic_knight_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.125, subdivisions=1, center=(0, 0.01, 0.06), scale=(0.82, 1.05, 0.95))
    add_cone(bm_head, 0.108, 0.062, 0.34, segments=10, center=(0, 0.19, -0.02), rot_euler=(-1.22, 0, 0), scale=(0.82, 1.0, 1.0))
    add_cone(bm_head, 0.028, 0.004, 0.18, segments=6, center=(0, 0.21, 0.13), rot_euler=(-0.82, 0, 0))
    for sx in (-1, 1):
        add_cone(bm_head, 0.034, 0.005, 0.15, segments=6, center=(sx * 0.068, -0.04, 0.19), rot_euler=(-0.18, sx * 0.16, 0))
    add_cone(bm_head, 0.05, 0.008, 0.30, segments=8, center=(0, -0.12, 0.20), rot_euler=(0.80, 0, 0))
    head_obj = finalize_mesh("classic_knight_head", bm_head, MAT_METAL, root, location=(0, 0.10, 1.07))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.028, subdivisions=1, center=(-0.088, 0.09, 0.06))
    add_icosphere(bm_gem, 0.028, subdivisions=1, center=(0.088, 0.09, 0.06))
    finalize_mesh("classic_knight_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.115, 0.032, 0.18, segments=12, center=(0, 0.05, 0.01), rot_euler=(-1.32, 0, 0))
    add_cone(bm_weap, 0.042, 0.006, 1.02, segments=10, center=(0, 0.50, 0.13), rot_euler=(-1.32, 0, 0))
    finalize_mesh("classic_knight_weapon", bm_weap, MAT_METAL, root, location=(0.23, 0.05, 0.72))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.045, 0.28, 0.34), center=(0, 0.02, 0), rot_euler=(0.15, -0.18, -0.16), bevel_amt=0.012)
    finalize_mesh("classic_knight_shield", bm_sh, MAT_TRIM, root, location=(-0.23, 0.06, 0.72))

    # 4. CLASSIC BISHOP
    root = bpy.data.objects.new("piece_classic_bishop", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "classic_bishop", radius_scale=0.92, height_scale=0.96, segments=24, motif="fluted")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.30, 0.17), (0.28, 0.30), (0.23, 0.52), (0.18, 0.74), (0.16, 0.90), (0.21, 1.00), (0.12, 1.06)], segments=32, scale_xy=(0.92, 1.06), flute_amp=0.065, flute_count=14, z_flute_range=(0.18, 0.96))
    add_cone(bm_body, 0.22, 0.12, 0.18, segments=16, center=(0, -0.04, 1.03), rot_euler=(-0.22, 0, 0))
    finalize_mesh("classic_bishop_body", bm_body, MAT_CLOTH, root)

    bm_trim = bmesh.new()
    add_box(bm_trim, (0.085, 0.035, 0.72), center=(0, 0.18, 0.58), rot_euler=(-0.09, 0, 0), bevel_amt=0.006)
    add_torus_ring(bm_trim, 0.28, 0.014, seg_major=22, seg_minor=6, center=(0, -0.06, 0.96), rot_euler=(math.pi / 2 - 0.25, 0, 0))
    finalize_mesh("classic_bishop_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.115, subdivisions=1, center=(0, 0, 0.06), scale=(0.88, 0.96, 1.05))
    add_cone(bm_head, 0.122, 0.012, 0.30, segments=14, center=(0, 0.028, 0.26), rot_euler=(0.08, 0, 0), scale=(0.95, 0.52, 1.0))
    add_cone(bm_head, 0.118, 0.012, 0.28, segments=14, center=(0, -0.038, 0.25), rot_euler=(-0.10, 0, 0), scale=(0.92, 0.50, 1.0))
    head_obj = finalize_mesh("classic_bishop_head", bm_head, MAT_STONE, root, location=(0, 0, 1.03))

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.10, 0.028, 0.020), center=(0, 0.105, 0.065))
    finalize_mesh("classic_bishop_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.024, 0.018, 1.14, segments=10, center=(0, 0, 0.20))
    for i in range(12):
        t = i / 11.0
        ang = t * math.pi * 1.65
        rad = 0.105 * (1.0 - t * 0.42)
        add_icosphere(bm_weap, 0.024 * (1.0 - t * 0.3), subdivisions=1, center=(math.sin(ang) * rad, 0, 0.86 + (1.0 - math.cos(ang)) * rad))
    finalize_mesh("classic_bishop_weapon", bm_weap, MAT_METAL, root, location=(0.25, 0.11, 0.56))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.17, 0.22, 0.052), center=(0, 0.05, 0), rot_euler=(-0.42, 0.22, 0), bevel_amt=0.006)
    finalize_mesh("classic_bishop_shield", bm_sh, MAT_TRIM, root, location=(-0.23, 0.17, 0.75))

    # 5. CLASSIC QUEEN
    root = bpy.data.objects.new("piece_classic_queen", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "classic_queen", radius_scale=1.02, height_scale=1.05, segments=28, motif="fluted")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.35, 0.17), (0.32, 0.34), (0.24, 0.56), (0.165, 0.76), (0.21, 0.94), (0.145, 1.08)], segments=32, scale_xy=(0.94, 1.10), flute_amp=0.058, flute_count=16, z_flute_range=(0.18, 0.74))
    add_box(bm_body, (0.26, 0.21, 0.28), center=(0, 0.03, 0.88), bevel_amt=0.022)
    finalize_mesh("classic_queen_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    for i in range(-2, 3):
        add_cone(bm_cloth, 0.065, 0.032, 0.78, segments=8, center=(i * 0.055, -0.17, 0.56), rot_euler=(0.22, i * 0.06, 0))
    finalize_mesh("classic_queen_cloth", bm_cloth, MAT_CLOTH, root)

    bm_wings = bmesh.new()
    for side in (-1, 1):
        for f in range(8):
            t = f / 7.0
            wx = side * (0.14 + t * 0.30)
            wy = -0.10 - t * 0.05
            wz = 0.98 + math.sin(t * math.pi * 0.75) * 0.24 - t * 0.16
            add_cone(bm_wings, 0.034, 0.005, 0.42 - t * 0.06, segments=6, center=(wx, wy, wz), rot_euler=(-0.18, side * (0.35 + t * 0.72), 0), scale=(0.38, 1.15, 1.0))
    finalize_mesh("classic_queen_wings", bm_wings, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.12, subdivisions=1, center=(0, 0, 0.07), scale=(0.88, 0.96, 1.05))
    add_cone(bm_head, 0.112, 0.128, 0.07, segments=20, center=(0, 0, 0.18))
    for i in range(10):
        ang = (i / 10.0) * math.tau
        spire_h = 0.15 if (i % 2 == 0) else 0.095
        add_cone(bm_head, 0.020, 0.003, spire_h, segments=6, center=(math.cos(ang) * 0.122, math.sin(ang) * 0.122, 0.23 + spire_h * 0.35), rot_euler=(-math.sin(ang) * 0.22, math.cos(ang) * 0.22, 0))
    head_obj = finalize_mesh("classic_queen_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.10))

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.105, 0.028, 0.020), center=(0, 0.108, 0.075))
    finalize_mesh("classic_queen_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.015, 1.16, segments=10, center=(0, 0, 0.22))
    add_icosphere(bm_weap, 0.058, subdivisions=1, center=(0, 0, 0.86))
    finalize_mesh("classic_queen_weapon", bm_weap, MAT_METAL, root, location=(0.26, 0.13, 0.66))

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.072, subdivisions=1, center=(0, 0.04, 0.04))
    add_torus_ring(bm_sh, 0.076, 0.010, seg_major=16, seg_minor=6, center=(0, 0.04, 0.04))
    finalize_mesh("classic_queen_shield", bm_sh, MAT_TRIM, root, location=(-0.25, 0.17, 0.86))

    # 6. CLASSIC KING
    root = bpy.data.objects.new("piece_classic_king", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "classic_king", radius_scale=1.12, height_scale=1.24, segments=16, motif="buttress")

    bm_cloth = bmesh.new()
    for i in range(-3, 4):
        ang = i * 0.22
        add_cone(bm_cloth, 0.07, 0.042, 0.96, segments=8, center=(math.sin(ang) * 0.25, -0.14 - math.cos(ang) * 0.08, 0.70), rot_euler=(0.14, -ang * 0.25, 0))
    finalize_mesh("classic_king_cloth", bm_cloth, MAT_CLOTH, root)

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.35, 0.22), (0.31, 0.50), (0.28, 0.78), (0.33, 1.06), (0.20, 1.22)], segments=24, flute_amp=0.035, flute_count=12, z_flute_range=(0.24, 0.82))
    add_box(bm_body, (0.38, 0.26, 0.34), center=(0, 0.05, 0.98), bevel_amt=0.022)
    finalize_mesh("classic_king_body", bm_body, MAT_STONE, root)

    bm_trim = bmesh.new()
    add_box(bm_trim, (0.58, 0.28, 0.15), center=(0, 0.01, 1.12), bevel_amt=0.025)
    for sx in (-1, 1):
        add_icosphere(bm_trim, 0.12, subdivisions=1, center=(sx * 0.28, 0.02, 1.14), scale=(1.15, 0.95, 0.75))
    finalize_mesh("classic_king_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_box(bm_head, (0.22, 0.22, 0.22), center=(0, 0, 0.10), bevel_amt=0.022)
    for i in range(-2, 3):
        add_cone(bm_head, 0.032, 0.008, 0.17 - abs(i) * 0.02, segments=6, center=(i * 0.03, 0.115, 0.01), rot_euler=(math.pi - 0.18, 0, 0))
    add_cone(bm_head, 0.145, 0.168, 0.11, segments=14, center=(0, 0, 0.25))
    add_torus_ring(bm_head, 0.145, 0.020, seg_major=18, seg_minor=6, center=(0, 0, 0.30), rot_euler=(math.pi / 2, 0, 0))
    add_torus_ring(bm_head, 0.145, 0.020, seg_major=18, seg_minor=6, center=(0, 0, 0.30), rot_euler=(math.pi / 2, 0, math.pi / 2))
    add_box(bm_head, (0.048, 0.048, 0.19), center=(0, 0, 0.56), bevel_amt=0.006)
    add_box(bm_head, (0.17, 0.048, 0.048), center=(0, 0, 0.57), bevel_amt=0.006)
    head_obj = finalize_mesh("classic_king_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.22))

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.13, 0.03, 0.022), center=(0, 0.118, 0.12))
    finalize_mesh("classic_king_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.026, 0.022, 0.26, segments=10, center=(0, 0, -0.06))
    add_box(bm_weap, (0.38, 0.052, 0.048), center=(0, 0, 0.08), bevel_amt=0.008)
    add_cone(bm_weap, 0.078, 0.008, 1.00, segments=4, center=(0, 0, 0.58), rot_euler=(0, 0, math.pi / 4), scale=(1.1, 0.38, 1.0))
    finalize_mesh("classic_king_weapon", bm_weap, MAT_METAL, root, location=(0.26, 0.21, 0.72))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.05, 0.28, 0.36), center=(0, 0.04, 0), rot_euler=(0.10, 0, -0.22), bevel_amt=0.014)
    finalize_mesh("classic_king_shield", bm_sh, MAT_TRIM, root, location=(-0.29, 0.16, 0.78))


# ==============================================================================
# SET 2: LUMAR — ABYSSAL TIDES & NAUTICAL HARBOR SET
#        (Lighthouse & Tentacle Rook, Hippocampus Sea-Stallion Knight,
#         Nautilus & Trident Bishop, Manta Fin-Winged Siren Queen, Poseidon King)
# ==============================================================================
def build_lumar_set(x_off=3.0):
    # 1. LUMAR PAWN — Deep-Sea Corsair Diver (Conch-Crest Helmet + Naval Buckler + Harpoon)
    root = bpy.data.objects.new("piece_lumar_pawn", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "lumar_pawn", radius_scale=0.84, height_scale=0.88, segments=24, motif="wave")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.26, 0.17), (0.22, 0.34), (0.24, 0.48), (0.14, 0.58)], segments=20, flute_amp=0.05, flute_count=10, z_flute_range=(0.18, 0.55), twist=2.5)
    finalize_mesh("lumar_pawn_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    # Scalloped barnacle/kelp shoulder guards
    for sx in (-1, 1):
        add_cone(bm_cloth, 0.11, 0.03, 0.18, segments=8, center=(sx * 0.16, 0, 0.52), rot_euler=(0.2, sx * 0.85, 0))
    finalize_mesh("lumar_pawn_cloth", bm_cloth, MAT_CLOTH, root)

    # Diving Bell / Conch-Fin Helmet
    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.135, subdivisions=2, center=(0, 0, 0.08))
    # Sweeping dorsal sea-fin crest atop helmet
    for i in range(5):
        t = i / 4.0
        add_cone(bm_head, 0.025, 0.003, 0.16 - t * 0.04, segments=6, center=(0, -0.02 - t * 0.08, 0.18 - t * 0.03), rot_euler=(0.35 + t * 0.4, 0, 0))
    head_obj = finalize_mesh("lumar_pawn_head", bm_head, MAT_METAL, root, location=(0, 0.02, 0.56))

    bm_gem = bmesh.new()
    # Round diving-bell porthole visor eye!
    add_torus_ring(bm_gem, 0.065, 0.016, seg_major=16, seg_minor=6, center=(0, 0.125, 0.08), rot_euler=(math.pi / 2, 0, 0))
    add_icosphere(bm_gem, 0.055, subdivisions=1, center=(0, 0.12, 0.08), scale=(1.0, 0.4, 1.0))
    finalize_mesh("lumar_pawn_gem", bm_gem, MAT_GEM, head_obj)

    # Barbed Whaler's Harpoon Spear
    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.016, 0.92, segments=8, center=(0, 0.08, 0.18), rot_euler=(-0.48, 0, 0))
    add_cone(bm_weap, 0.042, 0.003, 0.22, segments=6, center=(0, 0.30, 0.58), rot_euler=(-0.48, 0, 0))
    add_cone(bm_weap, 0.028, 0.003, 0.14, segments=6, center=(0, 0.24, 0.48), rot_euler=(2.1, 0, 0))
    finalize_mesh("lumar_pawn_weapon", bm_weap, MAT_METAL, root, location=(0.22, 0.05, 0.42))

    # Round Nautical Anchor / Ammonite Shell Buckler Shield
    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.21, 0.06, 0.07, segments=18, center=(0, 0.04, 0), rot_euler=(math.pi / 2, 0, -0.35))
    add_torus_ring(bm_sh, 0.19, 0.022, seg_major=18, seg_minor=6, center=(0, 0.04, 0), rot_euler=(math.pi / 2, 0, -0.35))
    finalize_mesh("lumar_pawn_shield", bm_sh, MAT_TRIM, root, location=(-0.19, 0.16, 0.44))

    # 2. LUMAR ROOK — Coastal Lighthouse Tower wrapped in Curling Kraken Tentacles!
    root = bpy.data.objects.new("piece_lumar_rook", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "lumar_rook", radius_scale=1.08, height_scale=1.02, segments=16, motif="wave")

    bm_body = bmesh.new()
    # Tapered Octagonal Lighthouse Tower with spiral fluted bands
    lighthouse_prof = [
        (0.34, 0.16),
        (0.31, 0.36),
        (0.27, 0.58),
        (0.24, 0.78),
        (0.29, 0.86),  # lighthouse gallery balcony overhang!
        (0.22, 0.92),
    ]
    lathe_bm(bm_body, lighthouse_prof, segments=16, flute_amp=0.03, flute_count=8, z_flute_range=(0.18, 0.78), twist=2.2)
    finalize_mesh("lumar_rook_body", bm_body, MAT_STONE, root)

    # Curling Kraken Tentacles wrapping the Lighthouse Base & Torso (`lumar_rook_cloth`)
    bm_cloth = bmesh.new()
    for t_idx in range(4):
        base_ang = (t_idx / 4.0) * math.tau + 0.4
        for seg in range(10):
            s = seg / 9.0
            ang = base_ang + s * 1.8
            rad = 0.33 - s * 0.08
            tz = 0.22 + s * 0.62
            add_icosphere(bm_cloth, 0.062 * (1.0 - s * 0.55), subdivisions=1, center=(math.cos(ang) * rad, math.sin(ang) * rad, tz))
    finalize_mesh("lumar_rook_cloth", bm_cloth, MAT_CLOTH, root)

    # Lighthouse Lantern Room & Domed Cupola Roof (`lumar_rook_head`)
    bm_head = bmesh.new()
    add_torus_ring(bm_head, 0.25, 0.022, seg_major=16, seg_minor=6, center=(0, 0, 0.02))
    # 8 lantern room window Mullion pillars
    for i in range(8):
        ang = (i / 8.0) * math.tau
        add_box(bm_head, (0.022, 0.022, 0.18), center=(math.cos(ang) * 0.19, math.sin(ang) * 0.19, 0.10))
    # Domed lighthouse roof + lightning rod finial
    add_cone(bm_head, 0.23, 0.02, 0.18, segments=16, center=(0, 0, 0.25))
    add_cone(bm_head, 0.025, 0.003, 0.14, segments=8, center=(0, 0, 0.38))
    head_obj = finalize_mesh("lumar_rook_head", bm_head, MAT_TRIM, root, location=(0, 0, 0.90))

    # Glowing Lighthouse Beacon Core inside the Lantern Cage (`lumar_rook_gem`)
    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.13, subdivisions=2, center=(0, 0, 0.10))
    finalize_mesh("lumar_rook_gem", bm_gem, MAT_GEM, head_obj)

    # Right Naval Cannon / Barnacle Anchor Ram (`lumar_rook_weapon`)
    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.085, 0.065, 0.48, segments=12, center=(0.04, 0.18, 0.06), rot_euler=(-1.25, 0, 0))
    add_torus_ring(bm_weap, 0.072, 0.016, seg_major=12, seg_minor=6, center=(0.04, 0.38, 0.14), rot_euler=(-1.25, 0, 0))
    finalize_mesh("lumar_rook_weapon", bm_weap, MAT_METAL, root, location=(0.28, 0.02, 0.66))

    # Left Coiled Kraken Tentacle Whip (`lumar_rook_shield`)
    bm_sh = bmesh.new()
    for i in range(9):
        t = i / 8.0
        add_icosphere(bm_sh, 0.068 * (1.0 - t * 0.6), subdivisions=1, center=(-0.04, t * 0.28, math.sin(t * math.pi) * 0.22))
    finalize_mesh("lumar_rook_shield", bm_sh, MAT_TRIM, root, location=(-0.28, 0.04, 0.66))

    # 3. LUMAR KNIGHT — Rearing Hippocampus Sea-Stallion (Curled Spiral Fish-Tail + Dorsal Fins)
    root = bpy.data.objects.new("piece_lumar_knight", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "lumar_knight", radius_scale=0.96, height_scale=0.96, segments=24, motif="wave")

    # Coiled Spiral Sea-Serpent / Hippocampus Tail & Wave Splash (`lumar_knight_cloth`)
    bm_cloth = bmesh.new()
    for i in range(14):
        t = i / 13.0
        ang = t * math.pi * 2.2
        rad = 0.22 * (1.0 - t * 0.35)
        tx = math.cos(ang) * rad * 0.7
        ty = -0.06 + math.sin(ang) * rad
        tz = 0.20 + t * 0.42
        add_icosphere(bm_cloth, 0.14 * (1.0 - t * 0.45), subdivisions=1, center=(tx, ty, tz))
    finalize_mesh("lumar_knight_cloth", bm_cloth, MAT_CLOTH, root)

    # Hippocampus Chest, Arched Seahorse Neck & Webbed Fore-Fins (`lumar_knight_body`)
    bm_body = bmesh.new()
    add_icosphere(bm_body, 0.20, subdivisions=2, center=(0, 0.04, 0.64), scale=(0.80, 1.10, 1.20))
    add_icosphere(bm_body, 0.17, subdivisions=2, center=(0, 0.11, 0.84), scale=(0.74, 0.95, 1.15))
    add_icosphere(bm_body, 0.13, subdivisions=2, center=(0, 0.12, 1.00), scale=(0.70, 0.88, 1.10))
    for sx, lift in ((-1, 0.04), (1, -0.02)):
        add_box(bm_body, (0.075, 0.24, 0.08), center=(sx * 0.13, 0.24, 0.72 + lift), rot_euler=(0.45, 0, 0), bevel_amt=0.01)
        # Webbed sea-hoof fin
        add_cone(bm_body, 0.08, 0.01, 0.18, segments=6, center=(sx * 0.13, 0.38, 0.54 + lift), rot_euler=(-0.85, 0, 0), scale=(0.4, 1.3, 1.0))
    finalize_mesh("lumar_knight_body", bm_body, MAT_STONE, root)

    # Spiny Seahorse Dorsal Fin Mane & Coral Chest Armor (`lumar_knight_trim`)
    bm_trim = bmesh.new()
    for i in range(9):
        t = i / 8.0
        mz = 0.56 + t * 0.50
        my = -0.14 + math.sin(t * math.pi * 0.8) * 0.08
        add_cone(bm_trim, 0.032, 0.003, 0.20, segments=6, center=(0, my, mz), rot_euler=(0.95, 0, 0), scale=(0.35, 1.2, 1.0))
    finalize_mesh("lumar_knight_trim", bm_trim, MAT_TRIM, root)

    # Seahorse / Sea-Dragon Head with Tubular Snout & Fin Ears (`lumar_knight_head`)
    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.12, subdivisions=2, center=(0, 0.01, 0.06), scale=(0.80, 1.05, 0.98))
    add_cone(bm_head, 0.09, 0.045, 0.38, segments=10, center=(0, 0.21, -0.02), rot_euler=(-1.28, 0, 0))
    # Flared gill-fins on either side of head
    for sx in (-1, 1):
        add_cone(bm_head, 0.06, 0.005, 0.22, segments=6, center=(sx * 0.09, -0.06, 0.12), rot_euler=(0.4, sx * 0.65, 0), scale=(0.35, 1.2, 1.0))
    head_obj = finalize_mesh("lumar_knight_head", bm_head, MAT_METAL, root, location=(0, 0.10, 1.07))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.03, subdivisions=1, center=(-0.085, 0.09, 0.06))
    add_icosphere(bm_gem, 0.03, subdivisions=1, center=(0.085, 0.09, 0.06))
    finalize_mesh("lumar_knight_gem", bm_gem, MAT_GEM, head_obj)

    # Spiral Narwhal / Coral Lance (`lumar_knight_weapon`)
    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.045, 0.004, 1.08, segments=10, center=(0, 0.48, 0.12), rot_euler=(-1.32, 0, 0))
    finalize_mesh("lumar_knight_weapon", bm_weap, MAT_METAL, root, location=(0.23, 0.05, 0.72))

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.18, 0.04, 0.06, segments=14, center=(0, 0.02, 0), rot_euler=(0.15, -1.2, 0))
    finalize_mesh("lumar_knight_shield", bm_sh, MAT_TRIM, root, location=(-0.23, 0.06, 0.72))

    # 4. LUMAR BISHOP — Abyssal Tide-Priest (Spiral Nautilus Mitre + Three-Pronged Trident)
    root = bpy.data.objects.new("piece_lumar_bishop", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "lumar_bishop", radius_scale=0.92, height_scale=0.96, segments=24, motif="wave")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.31, 0.17), (0.27, 0.36), (0.21, 0.62), (0.16, 0.88), (0.20, 1.02), (0.12, 1.06)], segments=28, flute_amp=0.07, flute_count=12, z_flute_range=(0.18, 0.98), twist=3.8)
    finalize_mesh("lumar_bishop_body", bm_body, MAT_CLOTH, root)

    bm_trim = bmesh.new()
    add_torus_ring(bm_trim, 0.26, 0.018, seg_major=20, seg_minor=6, center=(0, -0.04, 0.92), rot_euler=(0.8, 0.3, 0))
    finalize_mesh("lumar_bishop_trim", bm_trim, MAT_TRIM, root)

    # Spiral Nautilus Shell Crown Mitre (`lumar_bishop_head`)
    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.115, subdivisions=1, center=(0, 0, 0.06))
    for i in range(12):
        t = i / 11.0
        ang = t * math.pi * 1.8
        rad = 0.14 * (1.0 - t * 0.45)
        add_icosphere(bm_head, 0.065 * (1.0 - t * 0.4), subdivisions=1, center=(0, -math.cos(ang) * rad * 0.7, 0.22 + math.sin(ang) * rad), scale=(0.65, 1.0, 1.0))
    head_obj = finalize_mesh("lumar_bishop_head", bm_head, MAT_STONE, root, location=(0, 0, 1.03))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.035, subdivisions=1, center=(0, 0.11, 0.07))
    finalize_mesh("lumar_bishop_gem", bm_gem, MAT_GEM, head_obj)

    # Poseidon Three-Pronged Trident Staff (`lumar_bishop_weapon`)
    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.024, 0.018, 1.10, segments=10, center=(0, 0, 0.18))
    add_box(bm_weap, (0.24, 0.03, 0.035), center=(0, 0, 0.74), bevel_amt=0.005)
    for px in (-0.10, 0.0, 0.10):
        add_cone(bm_weap, 0.024, 0.003, 0.28 if px == 0 else 0.22, segments=6, center=(px, 0, 0.86))
    finalize_mesh("lumar_bishop_weapon", bm_weap, MAT_METAL, root, location=(0.25, 0.11, 0.56))

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.08, subdivisions=2, center=(0, 0.05, 0.02))
    finalize_mesh("lumar_bishop_shield", bm_sh, MAT_TRIM, root, location=(-0.23, 0.17, 0.75))

    # 5. LUMAR QUEEN — Empress of the Maelstrom (Scalloped Manta/Siren Fin-Wings + Coral Crown)
    root = bpy.data.objects.new("piece_lumar_queen", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "lumar_queen", radius_scale=1.02, height_scale=1.05, segments=28, motif="wave")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.36, 0.17), (0.31, 0.38), (0.22, 0.62), (0.16, 0.80), (0.21, 0.96), (0.14, 1.08)], segments=32, flute_amp=0.065, flute_count=12, z_flute_range=(0.18, 0.82), twist=4.2)
    finalize_mesh("lumar_queen_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    add_cone(bm_cloth, 0.24, 0.12, 0.22, segments=16, center=(0, -0.05, 1.04), rot_euler=(-0.3, 0, 0))
    finalize_mesh("lumar_queen_cloth", bm_cloth, MAT_CLOTH, root)

    # Sweeping Scalloped Sea-Siren Fin Wings (`lumar_queen_wings`)
    bm_wings = bmesh.new()
    for side in (-1, 1):
        for f in range(9):
            t = f / 8.0
            wx = side * (0.14 + t * 0.34)
            wy = -0.09 - math.sin(t * math.pi) * 0.08
            wz = 0.92 + math.cos(t * math.pi * 0.6) * 0.28
            add_cone(bm_wings, 0.045, 0.004, 0.46 - t * 0.05, segments=6, center=(wx, wy, wz), rot_euler=(-0.15, side * (0.45 + t * 0.65), 0), scale=(0.30, 1.35, 1.0))
    finalize_mesh("lumar_queen_wings", bm_wings, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.12, subdivisions=1, center=(0, 0, 0.07))
    # Crown of 9 Branching Coral Spires
    for i in range(-4, 5):
        ang = i * 0.24
        add_cone(bm_head, 0.022, 0.004, 0.22 - abs(i) * 0.015, segments=6, center=(math.sin(ang) * 0.14, -0.02, 0.20 + math.cos(ang) * 0.08), rot_euler=(0, ang, 0))
    head_obj = finalize_mesh("lumar_queen_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.10))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.04, subdivisions=1, center=(0, 0.11, 0.15))
    finalize_mesh("lumar_queen_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.015, 1.16, segments=10, center=(0, 0, 0.22))
    add_icosphere(bm_weap, 0.07, subdivisions=2, center=(0, 0, 0.86))
    finalize_mesh("lumar_queen_weapon", bm_weap, MAT_METAL, root, location=(0.26, 0.13, 0.66))

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.075, subdivisions=2, center=(0, 0.04, 0.04))
    finalize_mesh("lumar_queen_shield", bm_sh, MAT_TRIM, root, location=(-0.25, 0.17, 0.86))

    # 6. LUMAR KING — Poseidon / Leviathan Sea-Monarch (Trident Crown + Great Anchor-Blade)
    root = bpy.data.objects.new("piece_lumar_king", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "lumar_king", radius_scale=1.12, height_scale=1.24, segments=20, motif="wave")

    bm_cloth = bmesh.new()
    # Tentacle-hemmed royal sea-cloak
    for i in range(-3, 4):
        ang = i * 0.22
        add_cone(bm_cloth, 0.075, 0.025, 0.96, segments=8, center=(math.sin(ang) * 0.26, -0.15, 0.68), rot_euler=(0.18, -ang * 0.3, 0))
    finalize_mesh("lumar_king_cloth", bm_cloth, MAT_CLOTH, root)

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.35, 0.22), (0.31, 0.52), (0.28, 0.82), (0.34, 1.08), (0.20, 1.22)], segments=24, flute_amp=0.045, flute_count=10, z_flute_range=(0.24, 0.90), twist=2.0)
    finalize_mesh("lumar_king_body", bm_body, MAT_STONE, root)

    bm_trim = bmesh.new()
    for sx in (-1, 1):
        add_cone(bm_trim, 0.16, 0.03, 0.28, segments=8, center=(sx * 0.28, 0, 1.14), rot_euler=(0.1, sx * 0.95, 0))
    finalize_mesh("lumar_king_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_box(bm_head, (0.22, 0.22, 0.22), center=(0, 0, 0.10), bevel_amt=0.025)
    # Flowing tentacle/wave beard
    for i in range(-2, 3):
        add_cone(bm_head, 0.035, 0.006, 0.22, segments=6, center=(i * 0.032, 0.12, 0.0), rot_euler=(math.pi - 0.22, i * 0.08, 0))
    # Towering Trident-Spired Sea Crown
    add_cone(bm_head, 0.15, 0.18, 0.12, segments=14, center=(0, 0, 0.25))
    for px in (-0.11, 0.0, 0.11):
        add_cone(bm_head, 0.032, 0.004, 0.28 if px == 0 else 0.20, segments=6, center=(px, 0, 0.44))
    head_obj = finalize_mesh("lumar_king_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.22))

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.13, 0.03, 0.022), center=(0, 0.118, 0.12))
    finalize_mesh("lumar_king_gem", bm_gem, MAT_GEM, head_obj)

    # Colossal Great-Anchor / Leviathan Broad-Trident (`lumar_king_weapon`)
    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.03, 0.024, 1.15, segments=10, center=(0, 0, 0.35))
    # Heavy curved anchor flukes + central Leviathan spear-blade
    add_torus_ring(bm_weap, 0.20, 0.032, seg_major=16, seg_minor=6, center=(0, 0, 0.72), rot_euler=(math.pi / 2, 0, 0))
    add_cone(bm_weap, 0.065, 0.006, 0.45, segments=4, center=(0, 0, 0.88), rot_euler=(0, 0, math.pi / 4))
    finalize_mesh("lumar_king_weapon", bm_weap, MAT_METAL, root, location=(0.26, 0.21, 0.72))

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.22, 0.05, 0.07, segments=16, center=(0, 0.04, 0), rot_euler=(math.pi / 2, 0, -0.25))
    finalize_mesh("lumar_king_shield", bm_sh, MAT_TRIM, root, location=(-0.29, 0.16, 0.78))


# ==============================================================================
# SET 3: ARCADIA — NEON CYBER-ARCADE SYNTH MECH SET
#        (Faceted low-poly synth-mechs, Heavy Railgun Mecha-Rook,
#         Light-Cycle Cyber-Steed Knight, Laser-Winged Valkyrie-X Queen)
# ==============================================================================
def build_arcadia_set(x_off=6.0):
    # 1. ARCADIA PAWN — Cyber-Enforcer Droid
    root = bpy.data.objects.new("piece_arcadia_pawn", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "arcadia_pawn", radius_scale=0.84, height_scale=0.88, segments=8, motif="cyber")

    bm_body = bmesh.new()
    for sx in (-1, 1):
        add_box(bm_body, (0.09, 0.12, 0.24), center=(sx * 0.09, 0, 0.25))
    add_box(bm_body, (0.28, 0.22, 0.26), center=(0, 0.02, 0.46), rot_euler=(0.1, 0, 0))
    finalize_mesh("arcadia_pawn_body", bm_body, MAT_STONE, root, smooth=False)

    bm_cloth = bmesh.new()
    for sx in (-1, 1):
        add_box(bm_cloth, (0.12, 0.18, 0.12), center=(sx * 0.18, 0.02, 0.54), rot_euler=(0, sx * -0.35, 0))
    finalize_mesh("arcadia_pawn_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    bm_head = bmesh.new()
    add_cone(bm_head, 0.13, 0.09, 0.20, segments=6, center=(0, 0.02, 0.09))
    add_box(bm_head, (0.03, 0.18, 0.10), center=(0, 0, 0.20), rot_euler=(-0.2, 0, 0))
    head_obj = finalize_mesh("arcadia_pawn_head", bm_head, MAT_METAL, root, location=(0, 0.02, 0.58), smooth=False)

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.18, 0.06, 0.045), center=(0, 0.11, 0.10))
    finalize_mesh("arcadia_pawn_gem", bm_gem, MAT_GEM, head_obj, smooth=False)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.03, 0.05, 0.85), center=(0, 0.20, 0.35), rot_euler=(-0.5, 0, 0))
    finalize_mesh("arcadia_pawn_weapon", bm_weap, MAT_METAL, root, location=(0.22, 0.05, 0.42), smooth=False)

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.24, 0.24, 0.04, segments=6, center=(0, 0.04, 0), rot_euler=(math.pi / 2, 0, 0.3))
    finalize_mesh("arcadia_pawn_shield", bm_sh, MAT_TRIM, root, location=(-0.19, 0.17, 0.43), smooth=False)

    # 2. ARCADIA ROOK — Heavy Arcade Mecha-Bastion with Twin Shoulder Railguns!
    root = bpy.data.objects.new("piece_arcadia_rook", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "arcadia_rook", radius_scale=1.08, height_scale=1.02, segments=8, motif="cyber")

    bm_body = bmesh.new()
    # Heavy angular tank-tread / mech legs + wide armored chest block
    for sx in (-1, 1):
        add_box(bm_body, (0.18, 0.34, 0.24), center=(sx * 0.17, 0, 0.26))
    add_box(bm_body, (0.52, 0.42, 0.48), center=(0, 0, 0.62))
    finalize_mesh("arcadia_rook_body", bm_body, MAT_STONE, root, smooth=False)

    bm_cloth = bmesh.new()
    # Twin Shoulder-Mounted Railgun Pods!
    for sx in (-1, 1):
        add_box(bm_cloth, (0.16, 0.32, 0.18), center=(sx * 0.24, -0.02, 0.94))
        add_cone(bm_cloth, 0.04, 0.04, 0.38, segments=6, center=(sx * 0.24, 0.24, 0.96), rot_euler=(-math.pi / 2, 0, 0))
    finalize_mesh("arcadia_rook_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    bm_head = bmesh.new()
    add_box(bm_head, (0.32, 0.28, 0.18), center=(0, 0.04, 0.06))
    head_obj = finalize_mesh("arcadia_rook_head", bm_head, MAT_TRIM, root, location=(0, 0, 0.90), smooth=False)

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.26, 0.05, 0.08), center=(0, 0.17, 0.06))
    add_box(bm_gem, (0.24, 0.04, 0.18), center=(0, 0.21, -0.26))
    finalize_mesh("arcadia_rook_gem", bm_gem, MAT_GEM, head_obj, smooth=False)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.16, 0.22, 0.36), center=(0.06, 0.10, 0.0), rot_euler=(-0.3, 0, 0))
    add_box(bm_weap, (0.20, 0.38, 0.22), center=(0.06, 0.28, 0.28), rot_euler=(-0.3, 0, 0))
    finalize_mesh("arcadia_rook_weapon", bm_weap, MAT_METAL, root, location=(0.34, 0.02, 0.72), smooth=False)

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.16, 0.32, 0.34), center=(-0.06, 0.14, -0.08), rot_euler=(0.3, 0, 0))
    finalize_mesh("arcadia_rook_shield", bm_sh, MAT_TRIM, root, location=(-0.34, 0.02, 0.72), smooth=False)

    # 3. ARCADIA KNIGHT — Neon Light-Cycle / Cyber-Pegasus Mech-Steed
    root = bpy.data.objects.new("piece_arcadia_knight", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "arcadia_knight", radius_scale=0.96, height_scale=0.96, segments=8, motif="cyber")

    bm_cloth = bmesh.new()
    # Light-cycle wheel-hub thruster pods on flanks
    for sx in (-1, 1):
        add_torus_ring(bm_cloth, 0.18, 0.04, seg_major=12, seg_minor=6, center=(sx * 0.16, -0.04, 0.36), rot_euler=(0, math.pi / 2, 0))
    finalize_mesh("arcadia_knight_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    bm_body = bmesh.new()
    add_box(bm_body, (0.24, 0.38, 0.32), center=(0, 0.04, 0.62), rot_euler=(-0.45, 0, 0))
    add_box(bm_body, (0.18, 0.28, 0.36), center=(0, 0.12, 0.90), rot_euler=(-0.25, 0, 0))
    for sx in (-1, 1):
        add_box(bm_body, (0.07, 0.28, 0.08), center=(sx * 0.14, 0.28, 0.68), rot_euler=(0.35, 0, 0))
    finalize_mesh("arcadia_knight_body", bm_body, MAT_STONE, root, smooth=False)

    bm_trim = bmesh.new()
    # Angular laser-fin mane blades
    for i in range(6):
        t = i / 5.0
        add_box(bm_trim, (0.025, 0.18, 0.07), center=(0, -0.14 + t * 0.06, 0.62 + t * 0.44), rot_euler=(0.55, 0, 0))
    finalize_mesh("arcadia_knight_trim", bm_trim, MAT_TRIM, root, smooth=False)

    bm_head = bmesh.new()
    add_cone(bm_head, 0.12, 0.04, 0.42, segments=6, center=(0, 0.16, 0.02), rot_euler=(-1.25, 0, 0))
    for sx in (-1, 1):
        add_box(bm_head, (0.025, 0.18, 0.08), center=(sx * 0.07, -0.08, 0.18), rot_euler=(0.45, sx * 0.2, 0))
    head_obj = finalize_mesh("arcadia_knight_head", bm_head, MAT_METAL, root, location=(0, 0.10, 1.07), smooth=False)

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.16, 0.12, 0.04), center=(0, 0.14, 0.06))
    finalize_mesh("arcadia_knight_gem", bm_gem, MAT_GEM, head_obj, smooth=False)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.09, 0.005, 1.10, segments=6, center=(0, 0.48, 0.12), rot_euler=(-1.32, 0, 0))
    finalize_mesh("arcadia_knight_weapon", bm_weap, MAT_METAL, root, location=(0.23, 0.05, 0.72), smooth=False)

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.20, 0.20, 0.04, segments=6, center=(0, 0.02, 0), rot_euler=(0, math.pi / 2, 0))
    finalize_mesh("arcadia_knight_shield", bm_sh, MAT_TRIM, root, location=(-0.23, 0.06, 0.72), smooth=False)

    # 4. ARCADIA BISHOP — Netrunner Holo-Hacker
    root = bpy.data.objects.new("piece_arcadia_bishop", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "arcadia_bishop", radius_scale=0.92, height_scale=0.96, segments=8, motif="cyber")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.28, 0.18), (0.22, 0.52), (0.16, 0.88), (0.22, 1.02), (0.12, 1.06)], segments=8)
    add_cone(bm_body, 0.26, 0.14, 0.22, segments=6, center=(0, -0.04, 1.02), rot_euler=(-0.25, 0, 0))
    finalize_mesh("arcadia_bishop_body", bm_body, MAT_CLOTH, root, smooth=False)

    bm_trim = bmesh.new()
    # Floating geometric data-octahedrons + hexagonal holo-ring
    add_torus_ring(bm_trim, 0.32, 0.018, seg_major=6, seg_minor=4, center=(0, 0, 0.78), rot_euler=(0.45, 0.35, 0))
    finalize_mesh("arcadia_bishop_trim", bm_trim, MAT_TRIM, root, smooth=False)

    bm_head = bmesh.new()
    add_cone(bm_head, 0.14, 0.02, 0.34, segments=6, center=(0, 0, 0.18))
    head_obj = finalize_mesh("arcadia_bishop_head", bm_head, MAT_STONE, root, location=(0, 0, 1.03), smooth=False)

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.14, 0.05, 0.04), center=(0, 0.10, 0.08))
    finalize_mesh("arcadia_bishop_gem", bm_gem, MAT_GEM, head_obj, smooth=False)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.018, 1.16, segments=6, center=(0, 0, 0.22))
    add_icosphere(bm_weap, 0.09, subdivisions=0, center=(0, 0, 0.88))
    finalize_mesh("arcadia_bishop_weapon", bm_weap, MAT_METAL, root, location=(0.25, 0.11, 0.56), smooth=False)

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.09, subdivisions=0, center=(0, 0.05, 0.04))
    finalize_mesh("arcadia_bishop_shield", bm_sh, MAT_TRIM, root, location=(-0.23, 0.17, 0.75), smooth=False)

    # 5. ARCADIA QUEEN — Valkyrie-X Cyber-Empress (6-Blade Angular Laser-Jet Wings!)
    root = bpy.data.objects.new("piece_arcadia_queen", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "arcadia_queen", radius_scale=1.02, height_scale=1.05, segments=8, motif="cyber")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.34, 0.17), (0.24, 0.54), (0.15, 0.78), (0.22, 0.98), (0.14, 1.08)], segments=8)
    finalize_mesh("arcadia_queen_body", bm_body, MAT_STONE, root, smooth=False)

    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.30, 0.12, 0.72), center=(0, -0.16, 0.54), rot_euler=(0.2, 0, 0))
    finalize_mesh("arcadia_queen_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    # 6-Blade Angular Cyber-Jet Wings (`arcadia_queen_wings`)
    bm_wings = bmesh.new()
    for side in (-1, 1):
        for b in range(4):
            t = b / 3.0
            add_box(bm_wings, (0.48 - t * 0.08, 0.025, 0.065), center=(side * (0.28 + t * 0.06), -0.10, 1.06 - t * 0.12), rot_euler=(0.15, side * (-0.35 + t * 0.32), 0))
    finalize_mesh("arcadia_queen_wings", bm_wings, MAT_TRIM, root, smooth=False)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.12, subdivisions=1, center=(0, 0, 0.07))
    for i in range(-3, 4):
        ang = i * 0.28
        add_box(bm_head, (0.024, 0.02, 0.22), center=(math.sin(ang) * 0.15, -0.02, 0.22 + math.cos(ang) * 0.08), rot_euler=(0, ang, 0))
    head_obj = finalize_mesh("arcadia_queen_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.10), smooth=False)

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.14, 0.04, 0.035), center=(0, 0.11, 0.08))
    finalize_mesh("arcadia_queen_gem", bm_gem, MAT_GEM, head_obj, smooth=False)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.018, 1.18, segments=6, center=(0, 0, 0.24))
    add_icosphere(bm_weap, 0.085, subdivisions=0, center=(0, 0, 0.88))
    finalize_mesh("arcadia_queen_weapon", bm_weap, MAT_METAL, root, location=(0.26, 0.13, 0.66), smooth=False)

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.08, subdivisions=0, center=(0, 0.04, 0.04))
    finalize_mesh("arcadia_queen_shield", bm_sh, MAT_TRIM, root, location=(-0.25, 0.17, 0.86), smooth=False)

    # 6. ARCADIA KING — Overlord Prime Mecha-Monarch
    root = bpy.data.objects.new("piece_arcadia_king", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "arcadia_king", radius_scale=1.12, height_scale=1.24, segments=8, motif="cyber")

    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.46, 0.10, 0.92), center=(0, -0.18, 0.68), rot_euler=(0.14, 0, 0))
    finalize_mesh("arcadia_king_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.36, 0.22), (0.28, 0.68), (0.36, 1.08), (0.20, 1.22)], segments=8)
    finalize_mesh("arcadia_king_body", bm_body, MAT_STONE, root, smooth=False)

    bm_trim = bmesh.new()
    # Towering Shoulder Booster Pylons!
    for sx in (-1, 1):
        add_box(bm_trim, (0.16, 0.24, 0.34), center=(sx * 0.28, -0.02, 1.18), rot_euler=(0, sx * -0.2, 0))
    finalize_mesh("arcadia_king_trim", bm_trim, MAT_TRIM, root, smooth=False)

    bm_head = bmesh.new()
    add_box(bm_head, (0.22, 0.22, 0.22), center=(0, 0, 0.10))
    # Mecha V-Fin Antenna Crown + Cyber Cross
    for sx in (-1, 1):
        add_box(bm_head, (0.22, 0.03, 0.04), center=(sx * 0.12, 0.08, 0.28), rot_euler=(0, sx * -0.45, 0))
    add_box(bm_head, (0.05, 0.05, 0.26), center=(0, 0, 0.48))
    add_box(bm_head, (0.18, 0.05, 0.05), center=(0, 0, 0.50))
    head_obj = finalize_mesh("arcadia_king_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.22), smooth=False)

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.18, 0.05, 0.045), center=(0, 0.11, 0.12))
    finalize_mesh("arcadia_king_gem", bm_gem, MAT_GEM, head_obj, smooth=False)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.36, 0.06, 0.06), center=(0, 0, 0.08))
    add_box(bm_weap, (0.12, 0.035, 1.02), center=(0, 0, 0.58))
    finalize_mesh("arcadia_king_weapon", bm_weap, MAT_METAL, root, location=(0.26, 0.21, 0.72), smooth=False)

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.24, 0.24, 0.05, segments=6, center=(0, 0.04, 0), rot_euler=(0, math.pi / 2, 0))
    finalize_mesh("arcadia_king_shield", bm_sh, MAT_TRIM, root, location=(-0.29, 0.16, 0.78), smooth=False)


# ==============================================================================
# SET 4: ENIGMA STATION — DEEP-SPACE ORBITAL TELEMETRY SET
#        (EVA Security Pawn, Solar-Array & Radar Dish Rook, Thruster Mech-Hound
#         Knight, Gyroscopic Dish Bishop, Diamond Solar-Wing Queen, Sovereign Core King)
# ==============================================================================
def build_enigma_set(x_off=9.0):
    # 1. ENIGMA PAWN — Orbital EVA Security Construct
    root = bpy.data.objects.new("piece_enigma_pawn", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "enigma_pawn", radius_scale=0.84, height_scale=0.88, segments=16, motif="buttress")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.25, 0.17), (0.21, 0.36), (0.24, 0.52), (0.15, 0.60)], segments=16)
    finalize_mesh("enigma_pawn_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.22, 0.14, 0.24), center=(0, -0.10, 0.48), bevel_amt=0.015)  # EVA life-support backpack
    finalize_mesh("enigma_pawn_cloth", bm_cloth, MAT_CLOTH, root)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.14, subdivisions=2, center=(0, 0, 0.09))
    add_cone(bm_head, 0.015, 0.004, 0.18, segments=8, center=(-0.09, -0.04, 0.22))  # comms antenna
    head_obj = finalize_mesh("enigma_pawn_head", bm_head, MAT_METAL, root, location=(0, 0.02, 0.56))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.11, subdivisions=2, center=(0, 0.05, 0.09), scale=(0.95, 0.7, 0.85))
    finalize_mesh("enigma_pawn_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.04, 0.10, 0.78), center=(0, 0.18, 0.28), rot_euler=(-0.5, 0, 0), bevel_amt=0.006)
    finalize_mesh("enigma_pawn_weapon", bm_weap, MAT_METAL, root, location=(0.22, 0.05, 0.42))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.26, 0.05, 0.42), center=(0, 0.04, 0), rot_euler=(0.08, 0, 0.3), bevel_amt=0.018)
    finalize_mesh("enigma_pawn_shield", bm_sh, MAT_TRIM, root, location=(-0.19, 0.17, 0.43))

    # 2. ENIGMA ROOK — Orbital Defense Relay & Radar Dish Tower
    root = bpy.data.objects.new("piece_enigma_rook", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "enigma_rook", radius_scale=1.08, height_scale=1.02, segments=16, motif="buttress")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.34, 0.17), (0.30, 0.44), (0.32, 0.72), (0.26, 0.92)], segments=12, flute_amp=0.04, flute_count=6, z_flute_range=(0.20, 0.88))
    finalize_mesh("enigma_rook_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    # Deployed Solar-Array Panel Fins on sides of the Relay Tower
    for sx in (-1, 1):
        add_box(bm_cloth, (0.34, 0.03, 0.46), center=(sx * 0.42, -0.04, 0.64), bevel_amt=0.006)
    finalize_mesh("enigma_rook_cloth", bm_cloth, MAT_CLOTH, root)

    # Parabolic Radar Dish Crown (`enigma_rook_head`)
    bm_head = bmesh.new()
    add_cone(bm_head, 0.08, 0.28, 0.14, segments=16, center=(0, 0.04, 0.10), rot_euler=(-0.45, 0, 0))
    add_cone(bm_head, 0.02, 0.004, 0.22, segments=8, center=(0, 0.12, 0.22), rot_euler=(-0.45, 0, 0))
    head_obj = finalize_mesh("enigma_rook_head", bm_head, MAT_TRIM, root, location=(0, 0, 0.92))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.06, subdivisions=1, center=(0, 0.16, 0.26))
    finalize_mesh("enigma_rook_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.06, 0.05, 0.62, segments=10, center=(0.04, 0.22, 0.08), rot_euler=(-1.15, 0, 0))
    finalize_mesh("enigma_rook_weapon", bm_weap, MAT_METAL, root, location=(0.30, 0.02, 0.70))

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.06, 0.05, 0.62, segments=10, center=(-0.04, 0.22, 0.08), rot_euler=(-1.15, 0, 0))
    finalize_mesh("enigma_rook_shield", bm_sh, MAT_TRIM, root, location=(-0.30, 0.02, 0.70))

    # 3. ENIGMA KNIGHT — Zero-G Thruster Recon Strider
    root = bpy.data.objects.new("piece_enigma_knight", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "enigma_knight", radius_scale=0.96, height_scale=0.96, segments=16, motif="buttress")

    bm_cloth = bmesh.new()
    # Dual Canted Orbital Thruster Nacelles on Flanks!
    for sx in (-1, 1):
        add_cone(bm_cloth, 0.09, 0.06, 0.48, segments=12, center=(sx * 0.20, -0.06, 0.62), rot_euler=(0.45, 0, 0))
    finalize_mesh("enigma_knight_cloth", bm_cloth, MAT_CLOTH, root)

    bm_body = bmesh.new()
    add_box(bm_body, (0.24, 0.36, 0.34), center=(0, 0.04, 0.62), rot_euler=(-0.38, 0, 0), bevel_amt=0.025)
    add_box(bm_body, (0.18, 0.26, 0.34), center=(0, 0.12, 0.90), rot_euler=(-0.22, 0, 0), bevel_amt=0.02)
    for sx in (-1, 1):
        add_box(bm_body, (0.07, 0.26, 0.075), center=(sx * 0.13, 0.26, 0.68), rot_euler=(0.4, 0, 0), bevel_amt=0.01)
    finalize_mesh("enigma_knight_body", bm_body, MAT_STONE, root)

    bm_trim = bmesh.new()
    add_torus_ring(bm_trim, 0.22, 0.018, seg_major=16, seg_minor=6, center=(0, 0.04, 0.76), rot_euler=(0.4, 0, 0))
    finalize_mesh("enigma_knight_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_box(bm_head, (0.18, 0.34, 0.16), center=(0, 0.12, 0.04), rot_euler=(-0.35, 0, 0), bevel_amt=0.02)
    for sx in (-1, 1):
        add_cone(bm_head, 0.018, 0.004, 0.22, segments=6, center=(sx * 0.07, -0.06, 0.20), rot_euler=(-0.2, 0, 0))
    head_obj = finalize_mesh("enigma_knight_head", bm_head, MAT_METAL, root, location=(0, 0.10, 1.07))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.055, subdivisions=1, center=(0, 0.26, 0.01))
    finalize_mesh("enigma_knight_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.04, 0.006, 1.06, segments=10, center=(0, 0.48, 0.12), rot_euler=(-1.32, 0, 0))
    finalize_mesh("enigma_knight_weapon", bm_weap, MAT_METAL, root, location=(0.23, 0.05, 0.72))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.045, 0.28, 0.32), center=(0, 0.02, 0), rot_euler=(0.15, -0.18, -0.16), bevel_amt=0.015)
    finalize_mesh("enigma_knight_shield", bm_sh, MAT_TRIM, root, location=(-0.23, 0.06, 0.72))

    # 4. ENIGMA BISHOP — Cryptographer AI Conduit
    root = bpy.data.objects.new("piece_enigma_bishop", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "enigma_bishop", radius_scale=0.92, height_scale=0.96, segments=16, motif="buttress")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.28, 0.17), (0.22, 0.48), (0.16, 0.84), (0.20, 1.00), (0.11, 1.06)], segments=16)
    finalize_mesh("enigma_bishop_body", bm_body, MAT_CLOTH, root)

    bm_trim = bmesh.new()
    add_torus_ring(bm_trim, 0.32, 0.018, seg_major=20, seg_minor=6, center=(0, 0, 0.76), rot_euler=(0.6, 0.4, 0))
    add_torus_ring(bm_trim, 0.28, 0.015, seg_major=20, seg_minor=6, center=(0, 0, 0.76), rot_euler=(-0.6, -0.4, 0))
    finalize_mesh("enigma_bishop_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_cone(bm_head, 0.05, 0.18, 0.16, segments=16, center=(0, 0.04, 0.14), rot_euler=(-0.55, 0, 0))
    head_obj = finalize_mesh("enigma_bishop_head", bm_head, MAT_STONE, root, location=(0, 0, 1.03))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.055, subdivisions=1, center=(0, 0.10, 0.20))
    finalize_mesh("enigma_bishop_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.018, 1.16, segments=10, center=(0, 0, 0.22))
    add_torus_ring(bm_weap, 0.10, 0.018, seg_major=16, seg_minor=6, center=(0, 0, 0.86), rot_euler=(math.pi / 2, 0, 0))
    finalize_mesh("enigma_bishop_weapon", bm_weap, MAT_METAL, root, location=(0.25, 0.11, 0.56))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.18, 0.22, 0.04), center=(0, 0.05, 0), rot_euler=(-0.42, 0.22, 0), bevel_amt=0.008)
    finalize_mesh("enigma_bishop_shield", bm_sh, MAT_TRIM, root, location=(-0.23, 0.17, 0.75))

    # 5. ENIGMA QUEEN — Astra-Command Overseer (4-Panel Diamond Solar-Array Wings!)
    root = bpy.data.objects.new("piece_enigma_queen", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "enigma_queen", radius_scale=1.02, height_scale=1.05, segments=20, motif="buttress")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.34, 0.17), (0.26, 0.48), (0.16, 0.78), (0.22, 0.98), (0.13, 1.08)], segments=20)
    finalize_mesh("enigma_queen_body", bm_body, MAT_STONE, root)

    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.26, 0.14, 0.68), center=(0, -0.15, 0.54), rot_euler=(0.18, 0, 0), bevel_amt=0.015)
    finalize_mesh("enigma_queen_cloth", bm_cloth, MAT_CLOTH, root)

    # 4-Panel Diamond Solar-Array Wings (`enigma_queen_wings`)
    bm_wings = bmesh.new()
    for side in (-1, 1):
        add_box(bm_wings, (0.42, 0.025, 0.22), center=(side * 0.32, -0.10, 1.06), rot_euler=(0.15, side * -0.42, 0), bevel_amt=0.006)
        add_box(bm_wings, (0.34, 0.025, 0.16), center=(side * 0.28, -0.10, 0.80), rot_euler=(0.15, side * 0.35, 0), bevel_amt=0.006)
    finalize_mesh("enigma_queen_wings", bm_wings, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.12, subdivisions=2, center=(0, 0, 0.07))
    add_torus_ring(bm_head, 0.18, 0.016, seg_major=20, seg_minor=6, center=(0, -0.02, 0.18), rot_euler=(math.pi / 2 - 0.3, 0, 0))
    head_obj = finalize_mesh("enigma_queen_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.10))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.08, subdivisions=1, center=(0, 0.06, 0.08))
    finalize_mesh("enigma_queen_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.016, 1.16, segments=10, center=(0, 0, 0.22))
    add_torus_ring(bm_weap, 0.08, 0.015, seg_major=16, seg_minor=6, center=(0, 0, 0.86))
    finalize_mesh("enigma_queen_weapon", bm_weap, MAT_METAL, root, location=(0.26, 0.13, 0.66))

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.075, subdivisions=2, center=(0, 0.04, 0.04))
    finalize_mesh("enigma_queen_shield", bm_sh, MAT_TRIM, root, location=(-0.25, 0.17, 0.86))

    # 6. ENIGMA KING — Station Prime Sovereign Core
    root = bpy.data.objects.new("piece_enigma_king", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "enigma_king", radius_scale=1.12, height_scale=1.24, segments=16, motif="buttress")

    bm_cloth = bmesh.new()
    add_box(bm_cloth, (0.44, 0.12, 0.88), center=(0, -0.17, 0.68), rot_euler=(0.14, 0, 0), bevel_amt=0.02)
    finalize_mesh("enigma_king_cloth", bm_cloth, MAT_CLOTH, root)

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.35, 0.22), (0.30, 0.60), (0.34, 1.06), (0.20, 1.22)], segments=16)
    finalize_mesh("enigma_king_body", bm_body, MAT_STONE, root)

    bm_trim = bmesh.new()
    add_box(bm_trim, (0.58, 0.26, 0.16), center=(0, 0.01, 1.12), bevel_amt=0.025)
    finalize_mesh("enigma_king_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_box(bm_head, (0.22, 0.22, 0.22), center=(0, 0, 0.10), bevel_amt=0.025)
    add_torus_ring(bm_head, 0.16, 0.020, seg_major=18, seg_minor=6, center=(0, 0, 0.30), rot_euler=(math.pi / 2, 0, 0))
    add_torus_ring(bm_head, 0.16, 0.020, seg_major=18, seg_minor=6, center=(0, 0, 0.30), rot_euler=(math.pi / 2, 0, math.pi / 2))
    add_box(bm_head, (0.045, 0.045, 0.22), center=(0, 0, 0.52))
    add_box(bm_head, (0.16, 0.045, 0.045), center=(0, 0, 0.54))
    head_obj = finalize_mesh("enigma_king_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.22))

    bm_gem = bmesh.new()
    add_box(bm_gem, (0.15, 0.04, 0.04), center=(0, 0.11, 0.12))
    finalize_mesh("enigma_king_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.36, 0.05, 0.05), center=(0, 0, 0.08), bevel_amt=0.008)
    add_cone(bm_weap, 0.075, 0.008, 1.00, segments=4, center=(0, 0, 0.58), rot_euler=(0, 0, math.pi / 4), scale=(1.1, 0.38, 1.0))
    finalize_mesh("enigma_king_weapon", bm_weap, MAT_METAL, root, location=(0.26, 0.21, 0.72))

    bm_sh = bmesh.new()
    add_box(bm_sh, (0.05, 0.28, 0.36), center=(0, 0.04, 0), rot_euler=(0.10, 0, -0.22), bevel_amt=0.015)
    finalize_mesh("enigma_king_shield", bm_sh, MAT_TRIM, root, location=(-0.29, 0.16, 0.78))


# ==============================================================================
# SET 5: THE SINGULARITY — EVENT HORIZON COSMIC MONOLITH SET
#        (Levitating Obelisks, Nested Tesseract Rook, Constellation Steed Knight,
#         3-Ring Armillary Bishop, Eclipse Halo Queen, Black-Hole Crown King)
# ==============================================================================
def build_singularity_set(x_off=12.0):
    # 1. SINGULARITY PAWN — Void-Shard Obelisk Acolyte
    root = bpy.data.objects.new("piece_singularity_pawn", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "singularity_pawn", radius_scale=0.84, height_scale=0.88, segments=8, motif="monolith")

    bm_body = bmesh.new()
    # Floating tapered diamond monolith body
    add_cone(bm_body, 0.22, 0.10, 0.44, segments=4, center=(0, 0, 0.44), rot_euler=(0, 0, math.pi / 4))
    finalize_mesh("singularity_pawn_body", bm_body, MAT_STONE, root, smooth=False)

    bm_cloth = bmesh.new()
    add_torus_ring(bm_cloth, 0.22, 0.018, seg_major=16, seg_minor=6, center=(0, 0, 0.46), rot_euler=(0.35, 0, 0))
    finalize_mesh("singularity_pawn_cloth", bm_cloth, MAT_CLOTH, root)

    bm_head = bmesh.new()
    add_torus_ring(bm_head, 0.11, 0.022, seg_major=18, seg_minor=6, center=(0, 0, 0.10), rot_euler=(math.pi / 2, 0, 0))
    head_obj = finalize_mesh("singularity_pawn_head", bm_head, MAT_METAL, root, location=(0, 0.0, 0.62))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.055, subdivisions=1, center=(0, 0, 0.10))
    finalize_mesh("singularity_pawn_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.04, 0.003, 0.85, segments=4, center=(0, 0.18, 0.32), rot_euler=(-0.48, 0, math.pi / 4))
    finalize_mesh("singularity_pawn_weapon", bm_weap, MAT_METAL, root, location=(0.22, 0.05, 0.42), smooth=False)

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.20, 0.005, 0.38, segments=4, center=(0, 0.04, 0), rot_euler=(0.1, 0, 0.3), scale=(0.25, 1.0, 1.0))
    finalize_mesh("singularity_pawn_shield", bm_sh, MAT_TRIM, root, location=(-0.19, 0.16, 0.44), smooth=False)

    # 2. SINGULARITY ROOK — Nested Tesseract Monolith & Floating Obelisk Turrets
    root = bpy.data.objects.new("piece_singularity_rook", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "singularity_rook", radius_scale=1.08, height_scale=1.02, segments=8, motif="monolith")

    bm_body = bmesh.new()
    add_box(bm_body, (0.42, 0.42, 0.62), center=(0, 0, 0.60), bevel_amt=0.02)
    # 4 Levitating Corner Crystal Obelisk Turrets!
    for sx in (-1, 1):
        for sy in (-1, 1):
            add_cone(bm_body, 0.08, 0.01, 0.56, segments=4, center=(sx * 0.27, sy * 0.27, 0.72), rot_euler=(0, 0, math.pi / 4))
    finalize_mesh("singularity_rook_body", bm_body, MAT_STONE, root, smooth=False)

    bm_cloth = bmesh.new()
    add_torus_ring(bm_cloth, 0.38, 0.022, seg_major=8, seg_minor=4, center=(0, 0, 0.64), rot_euler=(0.25, 0.25, 0))
    finalize_mesh("singularity_rook_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    bm_head = bmesh.new()
    # Rotated Hypercube Crown
    add_box(bm_head, (0.32, 0.32, 0.24), center=(0, 0, 0.12), rot_euler=(0.45, 0.45, 0.45))
    head_obj = finalize_mesh("singularity_rook_head", bm_head, MAT_TRIM, root, location=(0, 0, 0.94), smooth=False)

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.11, subdivisions=1, center=(0, 0, 0.12))
    finalize_mesh("singularity_rook_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.12, 0.01, 0.56, segments=4, center=(0.04, 0.22, 0.16), rot_euler=(-0.6, 0, math.pi / 4))
    finalize_mesh("singularity_rook_weapon", bm_weap, MAT_METAL, root, location=(0.32, 0.02, 0.70), smooth=False)

    bm_sh = bmesh.new()
    add_cone(bm_sh, 0.12, 0.01, 0.56, segments=4, center=(-0.04, 0.22, 0.16), rot_euler=(-0.6, 0, math.pi / 4))
    finalize_mesh("singularity_rook_shield", bm_sh, MAT_TRIM, root, location=(-0.32, 0.02, 0.70), smooth=False)

    # 3. SINGULARITY KNIGHT — Astral Rift-Stallion (Faceted Star-Steed + Crescent Arc)
    root = bpy.data.objects.new("piece_singularity_knight", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "singularity_knight", radius_scale=0.96, height_scale=0.96, segments=8, motif="monolith")

    bm_cloth = bmesh.new()
    add_torus_ring(bm_cloth, 0.30, 0.020, seg_major=18, seg_minor=6, center=(0, 0, 0.52), rot_euler=(0.5, 0, 0))
    finalize_mesh("singularity_knight_cloth", bm_cloth, MAT_CLOTH, root)

    bm_body = bmesh.new()
    add_cone(bm_body, 0.26, 0.14, 0.62, segments=6, center=(0, 0.02, 0.54), rot_euler=(-0.35, 0, 0))
    add_cone(bm_body, 0.16, 0.08, 0.44, segments=6, center=(0, 0.12, 0.90), rot_euler=(-0.22, 0, 0))
    finalize_mesh("singularity_knight_body", bm_body, MAT_STONE, root, smooth=False)

    bm_trim = bmesh.new()
    # Sweeping Crescent-Moon Blade Mane
    for i in range(7):
        t = i / 6.0
        add_cone(bm_trim, 0.04, 0.004, 0.24, segments=4, center=(0, -0.14 + t * 0.06, 0.58 + t * 0.48), rot_euler=(0.85, 0, math.pi / 4))
    finalize_mesh("singularity_knight_trim", bm_trim, MAT_TRIM, root, smooth=False)

    bm_head = bmesh.new()
    add_cone(bm_head, 0.12, 0.02, 0.42, segments=4, center=(0, 0.18, 0.02), rot_euler=(-1.25, 0, math.pi / 4))
    head_obj = finalize_mesh("singularity_knight_head", bm_head, MAT_METAL, root, location=(0, 0.10, 1.07), smooth=False)

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.055, subdivisions=1, center=(0, 0.08, 0.08))
    finalize_mesh("singularity_knight_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.05, 0.003, 1.10, segments=4, center=(0, 0.48, 0.12), rot_euler=(-1.32, 0, math.pi / 4))
    finalize_mesh("singularity_knight_weapon", bm_weap, MAT_METAL, root, location=(0.23, 0.05, 0.72), smooth=False)

    bm_sh = bmesh.new()
    add_torus_ring(bm_sh, 0.16, 0.02, seg_major=16, seg_minor=6, center=(0, 0.02, 0), rot_euler=(0, math.pi / 2, 0))
    finalize_mesh("singularity_knight_shield", bm_sh, MAT_TRIM, root, location=(-0.23, 0.06, 0.72))

    # 4. SINGULARITY BISHOP — Chronos Astrolabe Oracle (3 Concentric Armillary Rings)
    root = bpy.data.objects.new("piece_singularity_bishop", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "singularity_bishop", radius_scale=0.92, height_scale=0.96, segments=8, motif="monolith")

    bm_body = bmesh.new()
    add_cone(bm_body, 0.28, 0.08, 0.88, segments=6, center=(0, 0, 0.62))
    finalize_mesh("singularity_bishop_body", bm_body, MAT_CLOTH, root, smooth=False)

    bm_trim = bmesh.new()
    # 3 Concentric Armillary Sphere Rings!
    add_torus_ring(bm_trim, 0.34, 0.018, seg_major=24, seg_minor=6, center=(0, 0, 0.78), rot_euler=(0.55, 0.35, 0))
    add_torus_ring(bm_trim, 0.30, 0.016, seg_major=24, seg_minor=6, center=(0, 0, 0.78), rot_euler=(-0.55, -0.35, 0))
    add_torus_ring(bm_trim, 0.26, 0.014, seg_major=24, seg_minor=6, center=(0, 0, 0.78), rot_euler=(math.pi / 2, 0, 0))
    finalize_mesh("singularity_bishop_trim", bm_trim, MAT_TRIM, root)

    bm_head = bmesh.new()
    add_cone(bm_head, 0.12, 0.01, 0.36, segments=4, center=(0, 0, 0.18), rot_euler=(0, 0, math.pi / 4))
    head_obj = finalize_mesh("singularity_bishop_head", bm_head, MAT_STONE, root, location=(0, 0, 1.03), smooth=False)

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.06, subdivisions=1, center=(0, 0, 0.12))
    finalize_mesh("singularity_bishop_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.016, 1.16, segments=8, center=(0, 0, 0.22))
    add_torus_ring(bm_weap, 0.11, 0.018, seg_major=18, seg_minor=6, center=(0, 0, 0.86), rot_euler=(math.pi / 2, 0, 0))
    add_icosphere(bm_weap, 0.055, subdivisions=1, center=(0, 0, 0.86))
    finalize_mesh("singularity_bishop_weapon", bm_weap, MAT_METAL, root, location=(0.25, 0.11, 0.56))

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.08, subdivisions=0, center=(0, 0.05, 0.04))
    finalize_mesh("singularity_bishop_shield", bm_sh, MAT_TRIM, root, location=(-0.23, 0.17, 0.75), smooth=False)

    # 5. SINGULARITY QUEEN — Nova Seraph of the Event Horizon (Crescent Eclipse Wings + Floating Shards)
    root = bpy.data.objects.new("piece_singularity_queen", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "singularity_queen", radius_scale=1.02, height_scale=1.05, segments=12, motif="monolith")

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.34, 0.18), (0.22, 0.56), (0.14, 0.82), (0.20, 1.00), (0.12, 1.08)], segments=12)
    finalize_mesh("singularity_queen_body", bm_body, MAT_STONE, root, smooth=False)

    bm_cloth = bmesh.new()
    add_torus_ring(bm_cloth, 0.28, 0.018, seg_major=20, seg_minor=6, center=(0, 0, 0.68), rot_euler=(0.35, 0, 0))
    finalize_mesh("singularity_queen_cloth", bm_cloth, MAT_CLOTH, root)

    # Sweeping Crescent Eclipse Halo + Floating Star-Shard Wings (`singularity_queen_wings`)
    bm_wings = bmesh.new()
    add_torus_ring(bm_wings, 0.38, 0.024, seg_major=24, seg_minor=6, center=(0, -0.10, 1.02), rot_euler=(math.pi / 2, 0, 0))
    for i in range(-4, 5):
        if i == 0:
            continue
        ang = i * 0.30
        wx = math.sin(ang) * 0.46
        wz = 1.02 + math.cos(ang) * 0.32
        add_cone(bm_wings, 0.035, 0.004, 0.32, segments=4, center=(wx, -0.10, wz), rot_euler=(0, ang, math.pi / 4))
    finalize_mesh("singularity_queen_wings", bm_wings, MAT_TRIM, root, smooth=False)

    bm_head = bmesh.new()
    add_icosphere(bm_head, 0.11, subdivisions=2, center=(0, 0, 0.08))
    add_torus_ring(bm_head, 0.16, 0.016, seg_major=20, seg_minor=6, center=(0, 0, 0.22), rot_euler=(math.pi / 2, 0, 0))
    head_obj = finalize_mesh("singularity_queen_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.10))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.065, subdivisions=2, center=(0, 0, 0.22))
    finalize_mesh("singularity_queen_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_cone(bm_weap, 0.022, 0.015, 1.16, segments=8, center=(0, 0, 0.22))
    add_torus_ring(bm_weap, 0.09, 0.015, seg_major=16, seg_minor=6, center=(0, 0, 0.86), rot_euler=(0.6, 0, 0))
    add_icosphere(bm_weap, 0.055, subdivisions=1, center=(0, 0, 0.86))
    finalize_mesh("singularity_queen_weapon", bm_weap, MAT_METAL, root, location=(0.26, 0.13, 0.66))

    bm_sh = bmesh.new()
    add_icosphere(bm_sh, 0.075, subdivisions=1, center=(0, 0.04, 0.04))
    add_torus_ring(bm_sh, 0.11, 0.012, seg_major=16, seg_minor=6, center=(0, 0.04, 0.04), rot_euler=(0.5, 0.4, 0))
    finalize_mesh("singularity_queen_shield", bm_sh, MAT_TRIM, root, location=(-0.25, 0.17, 0.86))

    # 6. SINGULARITY KING — Architect of the Singularity (Accretion-Disk Black-Hole Crown!)
    root = bpy.data.objects.new("piece_singularity_king", None)
    root.location = (x_off, 0, 0)
    scene.collection.objects.link(root)
    build_pedestal(root, "singularity_king", radius_scale=1.12, height_scale=1.24, segments=8, motif="monolith")

    bm_cloth = bmesh.new()
    for i in (-1, 0, 1):
        add_cone(bm_cloth, 0.12, 0.02, 0.92, segments=4, center=(i * 0.18, -0.16, 0.68), rot_euler=(0.16, 0, math.pi / 4))
    finalize_mesh("singularity_king_cloth", bm_cloth, MAT_CLOTH, root, smooth=False)

    bm_body = bmesh.new()
    lathe_bm(bm_body, [(0.35, 0.22), (0.28, 0.62), (0.34, 1.06), (0.18, 1.22)], segments=8)
    finalize_mesh("singularity_king_body", bm_body, MAT_STONE, root, smooth=False)

    bm_trim = bmesh.new()
    # Levitating Shoulder Obelisks + Accretion Torso Ring
    for sx in (-1, 1):
        add_cone(bm_trim, 0.09, 0.01, 0.38, segments=4, center=(sx * 0.32, 0, 1.18), rot_euler=(0, sx * -0.25, math.pi / 4))
    add_torus_ring(bm_trim, 0.34, 0.020, seg_major=20, seg_minor=6, center=(0, 0, 0.96), rot_euler=(0.35, 0, 0))
    finalize_mesh("singularity_king_trim", bm_trim, MAT_TRIM, root, smooth=False)

    bm_head = bmesh.new()
    add_cone(bm_head, 0.14, 0.08, 0.24, segments=6, center=(0, 0, 0.12))
    # Accretion Disk Halo Crown + Cross Finial
    add_torus_ring(bm_head, 0.18, 0.022, seg_major=20, seg_minor=6, center=(0, 0, 0.34), rot_euler=(0.45, 0, 0))
    add_torus_ring(bm_head, 0.18, 0.018, seg_major=20, seg_minor=6, center=(0, 0, 0.34), rot_euler=(math.pi / 2, 0, 0))
    add_box(bm_head, (0.045, 0.045, 0.20), center=(0, 0, 0.54))
    add_box(bm_head, (0.16, 0.045, 0.045), center=(0, 0, 0.56))
    head_obj = finalize_mesh("singularity_king_head", bm_head, MAT_TRIM, root, location=(0, 0, 1.22))

    bm_gem = bmesh.new()
    add_icosphere(bm_gem, 0.085, subdivisions=2, center=(0, 0, 0.34))
    finalize_mesh("singularity_king_gem", bm_gem, MAT_GEM, head_obj)

    bm_weap = bmesh.new()
    add_box(bm_weap, (0.36, 0.05, 0.05), center=(0, 0, 0.08))
    add_cone(bm_weap, 0.085, 0.006, 1.04, segments=4, center=(0, 0, 0.60), rot_euler=(0, 0, math.pi / 4), scale=(1.1, 0.35, 1.0))
    finalize_mesh("singularity_king_weapon", bm_weap, MAT_METAL, root, location=(0.26, 0.21, 0.72), smooth=False)

    bm_sh = bmesh.new()
    add_torus_ring(bm_sh, 0.18, 0.022, seg_major=8, seg_minor=4, center=(0, 0.04, 0), rot_euler=(0, math.pi / 2, 0))
    finalize_mesh("singularity_king_shield", bm_sh, MAT_TRIM, root, location=(-0.29, 0.16, 0.78), smooth=False)


build_classic_set(0.0)
build_lumar_set(0.0)
build_arcadia_set(0.0)
build_enigma_set(0.0)
build_singularity_set(0.0)

os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=os.path.abspath(out_path),
    export_format='GLB',
    export_yup=True,
    export_apply=True,
)
print(f"Exported 5 World Chess Sets (30 unique 3D models) to {out_path}")
