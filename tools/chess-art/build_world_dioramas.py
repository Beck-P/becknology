"""Build clean, subtle 3D World Dioramas for all 5 Becknology Worlds in Blender.

Reuses the Bridge scene asset builders in `tools/bridge-art/` (`assets_magic.py`,
`assets_lumar.py`, `assets_cave.py`) via a `ChessKit` bmesh adapter, plus matching
low-profile architectural builders for Arcadia, Enigma Station, and The Singularity.

Each diorama is parented to an Empty named `diorama_<world>` at the origin so
`apps/chess/wizard-chess.js` can swap the entire surrounding world scene per theme.
"""

import bpy
import bmesh
import math
import os
import random
import sys
from mathutils import Euler, Matrix, Vector

BRIDGE_ART_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "bridge-art"))
if BRIDGE_ART_DIR not in sys.path:
    sys.path.insert(0, BRIDGE_ART_DIR)

from scenekit import hexc, lin, shade  # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_magic as M               # noqa: E402
import assets_cave as V                # noqa: E402


def _scale(x, y, z):
    return Matrix.Diagonal((x, y, z, 1.0))


def _quantize_hex(hx, step=10):
    """Quantize hex color slightly so random shade() variations bucket cleanly into ~5 tones."""
    h = hx.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    r = max(0, min(255, round(r / step) * step))
    g = max(0, min(255, round(g / step) * step))
    b = max(0, min(255, round(b / step) * step))
    return f"#{r:02x}{g:02x}{b:02x}"


class ChessKit:
    """Implements the `tools/bridge-art/scenekit.Kit` API in 1:1 3D chess coordinates.

    Coordinates:
      - `x`: West (-X) to East (+X). Chessboard spans [-4.6, +4.6].
      - `r`: North (-r -> +Y in Blender / -Z in Three.js) to South (+r -> -Y in Blender / +Z in Three.js).
      - `z`: Height above the room floor (`z=0` maps to `z_offset=-0.38` in Blender, flush with the
             bottom of the chessboard plinth so the chessboard sits like a grand dais in the center).
    """

    def __init__(self, world_key, root_empty, seed=42, z_offset=-0.38):
        self.world_key = world_key
        self.root = root_empty
        self.rng = random.Random(seed)
        self.z_offset = z_offset
        self.blocked = set()
        self.buckets = {}   # key -> bmesh
        self.mat_order = {} # key -> material

    def _get_mat(self, hx, emit_hx=None, emit_str=0.0, rough=0.55, metal=0.12):
        mname = f"dio_{self.world_key}_{hx.lstrip('#')}"
        if emit_hx:
            mname += f"_em_{emit_hx.lstrip('#')}"
        mat = bpy.data.materials.get(mname)
        if mat is None:
            mat = bpy.data.materials.new(name=mname)
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Base Color"].default_value = lin(hexc(hx))
                bsdf.inputs["Roughness"].default_value = rough
                bsdf.inputs["Metallic"].default_value = metal
                if emit_hx and emit_str > 0:
                    if "Emission Color" in bsdf.inputs:
                        bsdf.inputs["Emission Color"].default_value = lin(hexc(emit_hx))
                    if "Emission Strength" in bsdf.inputs:
                        bsdf.inputs["Emission Strength"].default_value = min(1.35, emit_str * 0.55)
        return mat

    def _bucket_for(self, albedo, part, emit):
        if isinstance(albedo, (tuple, list)):
            hx = albedo[0]
            grain = albedo[1] if len(albedo) > 1 else 0.1
        else:
            hx = albedo
            grain = 0.1
        q_hx = _quantize_hex(hx, step=8)
        emit_hx = emit[0] if emit else None
        emit_str = (emit[1] if len(emit) > 1 else 1.0) if emit else 0.0
        if emit_hx:
            emit_hx = _quantize_hex(emit_hx, step=12)

        anim_tag = ""
        if part in ("crystal", "crystal_glint", "mote", "cat", "cat_glow", "floating_candle"):
            anim_tag = "_bob"
        elif part and part.endswith("_bob"):
            anim_tag = "_bob"
        elif part and part.endswith("_spin_slow"):
            anim_tag = "_spin_slow"
        elif part and part.endswith("_spin_rev"):
            anim_tag = "_spin_rev"

        rough = 0.25 if emit_hx else max(0.3, min(0.85, 0.5 + grain * 1.5))
        metal = 0.65 if part in (
            "altar_claw", "candelabra", "tap_tower", "tap", "frame", "bell",
            "shield_rim", "shield_boss", "scale", "scale_pan", "telescope",
            "telescope_ring", "burner", "metal"
        ) else 0.12
        bkey = (q_hx, emit_hx, anim_tag)
        if bkey not in self.buckets:
            self.buckets[bkey] = bmesh.new()
            self.mat_order[bkey] = self._get_mat(q_hx, emit_hx, emit_str, rough=rough, metal=metal)
        return self.buckets[bkey]

    def _add_prim(self, kind, M_mat, loc, albedo, part, emit=None, verts=16, r1=1.0, r2=1.0, segs=16):
        # Skip floor slabs completely hidden underneath the 8x8 chessboard footprint
        if part in ("floor", "rug", "rug_trim", "fringe") and abs(loc[0]) < 4.15 and abs(loc[1]) < 4.15:
            return None

        bm = self._bucket_for(albedo, part, emit)
        tmp = bmesh.new()
        if kind == "cube":
            bmesh.ops.create_cube(tmp, size=1.0)
        elif kind == "sphere":
            bmesh.ops.create_uvsphere(tmp, u_segments=segs, v_segments=max(6, segs // 2), radius=1.0)
        else:
            bmesh.ops.create_cone(
                tmp,
                cap_ends=True,
                cap_tris=False,
                segments=verts,
                radius1=max(1e-4, r1),
                radius2=max(1e-4, r2),
                depth=1.0,
            )
        bmesh.ops.transform(tmp, matrix=M_mat, verts=tmp.verts)
        ox, oy, oz = loc[0], -loc[1], loc[2] + self.z_offset
        for v in tmp.verts:
            v.co.x += ox
            v.co.y += oy
            v.co.z += oz

        vert_map = {v: bm.verts.new(v.co) for v in tmp.verts}
        for f in tmp.faces:
            try:
                bm.faces.new([vert_map[v] for v in f.verts])
            except ValueError:
                pass
        tmp.free()
        return None

    def box(self, x0, r0, z0, x1, r1, z1, albedo, part, emit=None, bevel=0.0):
        return self._add_prim(
            "cube",
            _scale(x1 - x0, r1 - r0, z1 - z0),
            ((x0 + x1) / 2, (r0 + r1) / 2, (z0 + z1) / 2),
            albedo,
            part,
            emit,
        )

    def cyl(self, cx, cr, z0, z1, rx, albedo, part, emit=None, verts=16, ry=None, bevel=0.0):
        return self._add_prim(
            "cyl",
            _scale(rx, ry if ry is not None else rx, z1 - z0),
            (cx, cr, (z0 + z1) / 2),
            albedo,
            part,
            emit,
            verts=verts,
        )

    def cyl_y(self, cx, r0, r1, cz, rx, rz, albedo, part, emit=None, verts=16):
        M_mat = _scale(rx, r1 - r0, rz) @ Matrix.Rotation(math.pi / 2, 4, "X")
        return self._add_prim("cyl", M_mat, (cx, (r0 + r1) / 2, cz), albedo, part, emit, verts=verts)

    def cyl_x(self, x0, x1, cr, cz, rr, rz, albedo, part, emit=None, verts=12):
        M_mat = _scale(x1 - x0, rr, rz) @ Matrix.Rotation(math.pi / 2, 4, "Y")
        return self._add_prim("cyl", M_mat, ((x0 + x1) / 2, cr, cz), albedo, part, emit, verts=verts)

    def bar(self, xa, ra, xb, rb, z0, z1, width, albedo, part, emit=None, bevel=0.0):
        dx, dr = xb - xa, rb - ra
        length = math.hypot(dx, dr)
        if length < 1e-5:
            return None
        M_mat = Matrix.Rotation(math.atan2(-dr, dx), 4, "Z") @ _scale(length, width, z1 - z0)
        return self._add_prim(
            "cube",
            M_mat,
            ((xa + xb) / 2, (ra + rb) / 2, (z0 + z1) / 2),
            albedo,
            part,
            emit,
        )

    def tube(self, a, b, ra, albedo, part, emit=None, rb=None, verts=10, smooth=True):
        d = Vector((b[0] - a[0], -(b[1] - a[1]), b[2] - a[2]))
        if d.length < 1e-5:
            return None
        R = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
        mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
        if rb is None:
            return self._add_prim("cyl", R @ _scale(ra, ra, d.length), mid, albedo, part, emit, verts=verts)
        return self._add_prim(
            "cone",
            R @ _scale(1.0, 1.0, d.length),
            mid,
            albedo,
            part,
            emit,
            verts=verts,
            r1=ra,
            r2=rb,
        )

    def blob(self, cx, cr, cz, rx, ry, rz, albedo, part, emit=None, rot=(0, 0, 0), segs=12, smooth=True):
        R = Euler(tuple(math.radians(v) for v in (rot[0], -rot[1], -rot[2])), "XYZ").to_matrix().to_4x4()
        return self._add_prim("sphere", R @ _scale(rx, ry, rz), (cx, cr, cz), albedo, part, emit, segs=segs)

    def poly(self, pts, albedo, part, emit=None):
        bm = self._bucket_for(albedo, part, emit)
        vs = [bm.verts.new((p[0], -p[1], p[2] + self.z_offset)) for p in pts]
        for i in range(1, len(vs) - 1):
            try:
                bm.faces.new((vs[0], vs[i], vs[i + 1]))
            except ValueError:
                pass
        return None

    def rock(self, cx, cr, cz, rx, ry, rz, albedo, part="rock", seed=None, jitter=0.16, segs=8):
        if part == "floor" and abs(cx) < 4.25 and abs(cr) < 4.25:
            return None
        rng = self.rng if seed is None else random.Random(seed)
        bm = self._bucket_for(albedo, part, None)
        tmp = bmesh.new()
        bmesh.ops.create_uvsphere(tmp, u_segments=segs, v_segments=max(5, segs // 2), radius=1.0)
        R = Euler((0, 0, math.radians(rng.uniform(0, 360))), "XYZ").to_matrix().to_4x4()
        bmesh.ops.transform(tmp, matrix=R @ _scale(rx, ry, rz), verts=tmp.verts)
        ox, oy, oz = cx, -cr, cz + self.z_offset
        for v in tmp.verts:
            f = 1.0 + rng.uniform(-jitter, jitter)
            v.co.x = v.co.x * f + ox
            v.co.y = v.co.y * f + oy
            v.co.z = v.co.z * (1.0 + rng.uniform(-jitter, jitter)) + oz
        vert_map = {v: bm.verts.new(v.co) for v in tmp.verts}
        for f in tmp.faces:
            try:
                bm.faces.new([vert_map[v] for v in f.verts])
            except ValueError:
                pass
        tmp.free()
        return None

    def sphere(self, cx, cr, cz, rx, rz, albedo, part, emit=None, ry=None, segs=12):
        return self._add_prim(
            "sphere",
            _scale(rx, ry if ry is not None else rx, rz),
            (cx, cr, cz),
            albedo,
            part,
            emit,
            segs=segs,
        )

    def cone(self, cx, cr, z0, z1, r0, r1, albedo, part, emit=None, verts=12):
        return self._add_prim(
            "cone",
            _scale(1.0, 1.0, z1 - z0),
            (cx, cr, (z0 + z1) / 2),
            albedo,
            part,
            emit,
            verts=verts,
            r1=r0,
            r2=r1,
        )

    def point_light(self, *args, **kwargs):
        return None

    def area_light(self, *args, **kwargs):
        return None

    def solid(self, x0, r0, x1, r1):
        return None

    def add_board_dais_curb(self, stone_col, trim_col):
        """Low stepped stone/wood curb right around the 8x8 chessboard frame [-4.65, +4.65]."""
        w = 0.32
        s = 4.64
        self.box(-s - w, -s - w, 0.0, s + w, -s, 0.14, stone_col, "dais_step")
        self.box(-s - w, s, 0.0, s + w, s + w, 0.14, stone_col, "dais_step")
        self.box(-s - w, -s, 0.0, -s, s, 0.14, stone_col, "dais_step")
        self.box(s, -s, 0.0, s + w, s, 0.14, stone_col, "dais_step")
        t = 0.06
        self.box(-s - t, -s - t, 0.14, s + t, -s, 0.24, trim_col, "dais_trim")
        self.box(-s - t, s, 0.14, s + t, s + t, 0.24, trim_col, "dais_trim")
        self.box(-s - t, -s, 0.14, -s, s, 0.24, trim_col, "dais_trim")
        self.box(s, -s, 0.14, s + t, s, 0.24, trim_col, "dais_trim")

    def finalize(self):
        idx = 0
        for (q_hx, emit_hx, anim_tag), bm in self.buckets.items():
            if len(bm.verts) == 0:
                bm.free()
                continue
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            idx += 1
            obj_name = f"{self.world_key}_diorama_{idx:02d}{anim_tag}"
            mesh = bpy.data.meshes.new(obj_name)
            bm.to_mesh(mesh)
            bm.free()
            for poly in mesh.polygons:
                poly.use_smooth = False
            obj = bpy.data.objects.new(obj_name, mesh)
            bpy.context.collection.objects.link(obj)
            obj.data.materials.append(self.mat_order[(q_hx, emit_hx, anim_tag)])
            obj.parent = self.root


# ==============================================================================
# 1. WIZARD'S TOWER / SORCERESS'S SANCTUM (`diorama_classic`)
#    Directly reuses `tools/bridge-art/assets_magic.py` & `assets_lumar.py`
#    from `tools/bridge-art/scenes/lumar_midnight_tower.py`!
# ==============================================================================
def build_diorama_classic():
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = "diorama_classic"

    k = ChessKit("classic", root, seed=61, z_offset=-0.38)

    # Octagonal stone floor & walls with generous apron so Black's back-rank
    # pieces sit against open flagstones without overlapping the bookshelves
    x0, r0, x1, r1, cut = -7.6, -7.8, 7.6, 5.8, 2.3
    wall_h = 1.95
    low_side = 0.55
    low_front = 0.24
    centre = (0.0, (r0 + r1) / 2)
    P = [
        (x0 + cut, r0), (x1 - cut, r0), (x1, r0 + cut), (x1, r1 - cut),
        (x1 - cut, r1), (x0 + cut, r1), (x0, r1 - cut), (x0, r0 + cut),
    ]
    k.box(x0 - 0.5, r0 - 0.5, -0.14, x1 + 0.5, r1 + 0.5, -0.04, "#16121c", "subfloor")

    def span(r_val):
        d = max(0.0, (r0 + cut) - r_val, r_val - (r1 - cut))
        return x0 + d, x1 - d

    r_cur = r0
    while r_cur < r1 - 1e-6:
        h = min(r1 - r_cur, k.rng.choice([0.5, 0.75]))
        a0, a1 = span(r_cur)
        b0, b1 = span(r_cur + h)
        xa, xb = min(a0, b0), max(a1, b1)
        x_cur = xa
        while x_cur < xb - 1e-6:
            w = min(xb - x_cur, k.rng.choice([0.5, 0.75, 1.0]))
            k.box(
                x_cur + 0.03, r_cur + 0.03, -0.04, x_cur + w - 0.03, r_cur + h - 0.03, 0.0,
                (shade("#4a4458", k.rng.uniform(0.86, 1.12)), 0.14), "floor",
            )
            x_cur += w
        r_cur += h

    # Back 3 walls full height (`wall_h`); side walls cutaway (`low_side`) so light never shadows the right floor
    for i, j in ((7, 0), (0, 1), (1, 2)):
        M.masonry_wall(k, P[i], P[j], wall_h, centre, stone=M.STONE_P, blocks=True)
    for i, j in ((2, 3), (6, 7)):
        M.masonry_wall(k, P[i], P[j], low_side, centre, stone=M.STONE_P, blocks=False)
    for i, j in ((3, 4), (5, 6)):
        M.masonry_wall(k, P[i], P[j], low_front, centre, stone=M.STONE_P, blocks=False)
    for a, b in ((P[4][0], 1.2), (-1.2, P[5][0])):
        M.masonry_wall(k, (a, r1), (b, r1), low_front, centre, stone=M.STONE_P, blocks=False)
    k.box(-1.2, r1, -0.01, 1.2, r1 + 0.50, 0.02, (A.WOOD_D, 0.1), "threshold")

    k.add_board_dais_curb(M.STONE_PD, A.BRASS)

    # Back wall: bookshelves either side of the stained-glass Rose Window
    A.bookshelf(k, -3.2, -1.15, r0, top=1.82, levels=(0.14, 0.55, 0.96, 1.38))
    A.bookshelf(k, 1.15, 3.2, r0, top=1.82, levels=(0.14, 0.55, 0.96, 1.38))
    M.rose_window(k, 0.0, r0, 1.28, 0.42)

    # Angled back walls: moonlit arched windows with night sky & stars
    M.angled_window(k, P[7], P[0], centre, 0.25, 0.72, 0.65, 1.68, moon=True)
    M.angled_window(k, P[1], P[2], centre, 0.28, 0.75, 0.65, 1.68)

    # Back alcoves (pushed wide of Black's Rooks so they never overlap pieces): cauldron & scroll desk
    A.cauldron(k, -5.4, -5.8, brew="#a060e0")
    M.scroll_desk(k, 5.4, -5.8)

    # Subtle glowing spell circle inscribed on the flagstones framing the board
    M.spell_circle(k, 0.0, 0.0, 5.25, glyphs=16)

    # Left & Right perimeter walkways (kept within [-6.4, +6.4] so they frame inside the viewport)
    M.alchemy_table(k, -6.4, -5.1, 1.2)
    M.familiar(k, -5.6, -2.2, z=0.38)
    M.telescope(k, 5.7, 1.4, aim=(-0.9, -0.55, 0.75))
    A.trunk(k, 5.4, -2.2, w=0.8, d=0.5, tone="#3a2a4a")

    # Four wrought-iron candelabras & small floor crystal cluster
    for (cx, cr) in ((-5.7, -3.8), (5.7, -3.8), (-5.7, 3.2), (5.7, 3.2)):
        M.candelabra(k, cx, cr)
    for (cx, cr, h, rad) in ((-6.3, -0.6, 0.45, 0.08), (-6.1, -0.35, 0.32, 0.06), (-6.35, -0.15, 0.24, 0.05)):
        k.cone(cx, cr, 0, h, rad, 0.004, "#4a2a80", "crystal", emit=("#8a5ae8", 0.8), verts=6)

    k.finalize()
    return root


# ==============================================================================
# 2. LUMAR HARBOR TAVERN & HEARTH (`diorama_lumar`)
#    Directly reuses `tools/bridge-art/assets_lumar.py` from
#    `lumar_tavern.py` and `lumar_inn.py`!
# ==============================================================================
def build_diorama_lumar():
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = "diorama_lumar"

    k = ChessKit("lumar", root, seed=19, z_offset=-0.38)

    r0, r1 = -7.8, 5.8
    wall_h = 1.92
    # Staggered warm oak plank floor & timber-framed plaster back wall
    A.floor_planks(k, -7.4, r0, 7.4, r1, tone=A.WOOD)
    A.back_wall(k, -7.8, 7.8, r0, wall_h, wainscot=0.78, beams_every=2.5)
    # Cutaway side walls (`height=0.55`) so warm light reaches the entire oak floor without harsh wall shadows
    A.side_wall(k, -7.8, -7.4, r0 - 0.4, r1, 0.55)
    A.side_wall(k, 7.4, 7.8, r0 - 0.4, r1, 0.55)
    A.front_wall(k, -7.8, 7.8, r1, height=0.24, gaps=[(-1.2, 1.2)])
    A.door_frame(k, -1.2, 1.2, r1)
    k.add_board_dais_curb(A.WOOD_D, A.BRASS)

    # Back-left: Tavern bar counter, brass beer tap, bottle shelves & keg rack (set back at r=-6.5)
    A.bar_counter(k, -6.5, -1.6, -6.65, -6.10, height=0.90)
    A.beer_tap(k, -4.0, -6.38, 0.90)
    A.wall_shelf(k, -6.3, -1.9, r0, 1.14)
    A.wall_shelf(k, -6.3, -1.9, r0, 1.54)
    A.keg_rack(k, -3.3, -1.7, -7.25)
    A.mug(k, -5.3, -6.38, 0.90)
    A.mug(k, -2.6, -6.38, 0.90)

    # Back-right: Grandfather clock, crackling stone fireplace, E.B.'s ship painting, night window & dartboard
    A.grandfather_clock(k, -0.2, r0)
    A.fireplace(k, 2.4, r0, wall_h, width=1.75, height=1.15)
    A.painting(k, 2.4, r0 + 0.22, 1.28, w=0.92, h=0.52)
    A.window(k, 4.9, r0, z0=0.92, w=0.82, h=0.78)
    A.dart_board(k, 6.3, r0, z=1.28)

    # Entrance woven rug
    A.rug(k, -1.5, 4.75, 1.5, 5.72, col=A.CLOTH_R, pattern=True)

    # Left & Right walkways: round tavern tables, stools, candles, mugs, barrels, crates, coat rack
    A.round_table(k, -5.85, -0.6, top=0.74, radius=0.40)
    A.stool(k, -5.85, -1.32, seat=0.45, radius=0.18)
    A.stool(k, -5.85, 0.12, seat=0.45, radius=0.18)
    A.candle(k, -5.90, -0.65, 0.74, light=False)
    A.mug(k, -5.70, -0.52, 0.74)

    A.barrel(k, -6.1, 2.2, h=0.80, radius=0.30)
    A.crate(k, -6.2, 3.1, s=0.54, contents="apples")
    A.potted_plant(k, -6.1, -3.8)

    A.round_table(k, 5.85, -0.6, top=0.74, radius=0.40)
    A.stool(k, 5.85, -1.32, seat=0.45, radius=0.18)
    A.stool(k, 5.85, 0.12, seat=0.45, radius=0.18)
    A.candle(k, 5.80, -0.65, 0.74, light=False)
    A.mug(k, 6.00, -0.52, 0.74)

    A.barrel(k, 6.1, 1.8, h=0.80, radius=0.30)
    A.barrel(k, 6.1, 2.7, h=0.80, radius=0.30)
    A.coat_rack(k, 6.0, 3.8)

    k.finalize()
    return root


# ==============================================================================
# 3. ARCADIA NEON ARCADE HALL (`diorama_arcadia`)
#    Built with `ChessKit` matching `apps/bridge/js/worlds/arcadia.js` &
#    `docs/superpowers/specs/2026-04-05-arcadia-procedural-art-design.md`!
# ==============================================================================
def _arcadia_cabinet(k, cx, cr, screen_col="#3855a0", body_col="#252040"):
    """Sleek 3/4-view arcade cabinet matching `drawCabinet` in `arcadia.js`."""
    w, d, h = 0.72, 0.60, 1.38
    k.box(cx - w / 2, cr - d / 2, 0.0, cx + w / 2, cr + d / 2, h * 0.55, (body_col, 0.1), "cab_body")
    k.box(cx - w / 2, cr - d / 2, h * 0.55, cx + w / 2, cr + d * 0.32, h * 0.92, (body_col, 0.1), "cab_upper")
    k.box(cx - w / 2 - 0.02, cr - d / 2, h * 0.90, cx + w / 2 + 0.02, cr + d * 0.48, h, shade(body_col, 0.8), "cab_top")
    k.box(cx - w * 0.42, cr + d * 0.46, h * 0.91, cx + w * 0.42, cr + d * 0.50, h * 0.98, screen_col, "cab_marquee", emit=(screen_col, 1.1))
    k.box(cx - w * 0.38, cr + d * 0.28, h * 0.58, cx + w * 0.38, cr + d * 0.34, h * 0.86, screen_col, "cab_screen", emit=(screen_col, 0.95))
    k.box(cx - w * 0.28, cr + d * 0.34, h * 0.78, cx - w * 0.16, cr + d * 0.35, h * 0.83, "#e8f8ff", "cab_glint", emit=("#ffffff", 1.2))
    k.box(cx - w * 0.46, cr + d * 0.25, h * 0.48, cx + w * 0.46, cr + d * 0.56, h * 0.55, "#1a1530", "cab_deck")
    k.cyl(cx - 0.14, cr + d * 0.42, h * 0.55, h * 0.63, 0.016, "#9098a8", "cab_stick", verts=6)
    k.sphere(cx - 0.14, cr + d * 0.42, h * 0.64, 0.028, 0.028, "#e870c0", "cab_ball", emit=("#e870c0", 0.9), segs=8)
    for bx, bcol in ((0.06, "#5cc8d0"), (0.15, "#f0c850")):
        k.cyl(cx + bx, cr + d * 0.42, h * 0.55, h * 0.57, 0.024, bcol, "cab_btn", emit=(bcol, 0.8), verts=6)


def build_diorama_arcadia():
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = "diorama_arcadia"

    k = ChessKit("arcadia", root, seed=84, z_offset=-0.38)
    r0, r1 = -7.8, 5.8
    wall_h = 1.90

    # Checker floor (`drawFloor`: #2a2240 / #2e2648)
    k.box(-7.6, r0 - 0.2, -0.12, 7.6, r1 + 0.2, -0.02, "#140e24", "subfloor")
    r_cur = r0
    row_i = 0
    while r_cur < r1 - 1e-6:
        x_cur = -7.2
        col_i = 0
        while x_cur < 7.2 - 1e-6:
            c = "#2a2240" if (row_i + col_i) % 2 == 0 else "#2e2648"
            k.box(x_cur + 0.02, r_cur + 0.02, -0.04, x_cur + 0.78, r_cur + 0.78, 0.0, (c, 0.08), "floor")
            x_cur += 0.8
            col_i += 1
        r_cur += 0.8
        row_i += 1

    # Coursed purple-brick back wall (`drawWall`: #2a2245 body, #1e1835 cap & brick lines)
    k.box(-7.8, r0 - 0.45, 0.0, 7.8, r0, wall_h, ("#1e1835", 0.08), "wall")
    z, i = 0.0, 0
    while z < wall_h - 0.08:
        x_cur = -7.6 + (0.0 if i % 2 == 0 else 0.38)
        while x_cur < 7.6:
            k.box(
                x_cur, r0 - 0.02, z + 0.02, min(x_cur + 0.72, 7.6), r0 + 0.02, z + 0.28,
                (shade("#2a2245", k.rng.uniform(0.92, 1.08)), 0.1), "wall_brick",
            )
            x_cur += 0.76
        z += 0.30
        i += 1
    k.box(-7.8, r0 - 0.48, wall_h, 7.8, r0 + 0.04, wall_h + 0.06, "#151028", "wall_cap")

    # Cutaway side walls (`height=0.52`) & front wall so neon lighting reaches both sides evenly
    k.box(-7.8, r0, 0.0, -7.4, r1, 0.52, ("#241c3c", 0.1), "side_wall")
    k.box(-7.82, r0, 0.52, -7.38, r1, 0.57, "#151028", "wall_cap")
    k.box(7.4, r0, 0.0, 7.8, r1, 0.52, ("#241c3c", 0.1), "side_wall")
    k.box(7.38, r0, 0.52, 7.82, r1, 0.57, "#151028", "wall_cap")
    A.front_wall(k, -7.8, 7.8, r1, height=0.24, gaps=[(-1.3, 1.3)])
    k.box(-1.3, r1 - 0.05, 0.0, 1.3, r1 + 0.30, 0.02, "#3a3260", "threshold")
    k.box(-1.1, r1 + 0.05, 0.02, 1.1, r1 + 0.15, 0.03, "#5cc8d0", "threshold_glow", emit=("#5cc8d0", 0.9))

    k.add_board_dais_curb("#1e1835", "#5cc8d0")

    # Back wall center: High-Score Board (`drawHighScoreBoard`) + subtle Neon Strip Sign (`drawNeonSign`)
    k.box(-1.55, r0 + 0.02, 0.68, 1.55, r0 + 0.10, 1.50, "#120e22", "scoreboard_panel")
    k.box(-1.42, r0 + 0.10, 0.76, 1.42, r0 + 0.13, 1.42, "#0c1e18", "scoreboard_screen")
    for idx_line, zz in enumerate((1.28, 1.14, 1.00, 0.86)):
        lw = 2.1 - idx_line * 0.25
        k.box(-1.25, r0 + 0.13, zz, -1.25 + lw, r0 + 0.15, zz + 0.04, "#40b060", "score_line", emit=("#40b060", 0.9))
    k.box(-1.2, r0 + 0.02, 1.60, 1.2, r0 + 0.10, 1.75, "#18122b", "neon_mount")
    k.box(-1.05, r0 + 0.10, 1.65, 1.05, r0 + 0.14, 1.70, "#e870c0", "neon_bar", emit=("#e870c0", 1.2))

    # Row of 6 classic 3/4-view Arcade Cabinets at r=-7.25 (well clear of Black's Rooks!)
    cab_screens = ("#3855a0", "#d06090", "#5cc8d0", "#5cc8d0", "#d06090", "#3855a0")
    cab_xs = (-6.0, -4.85, -3.7, 3.7, 4.85, 6.0)
    for cx, scol in zip(cab_xs, cab_screens):
        _arcadia_cabinet(k, cx, r0 + 0.52, screen_col=scol)

    # Left walkway: Cyber Noodle Bar Counter with ramen bowls, neon trim & 3 stools
    k.box(-6.5, -2.0, 0.0, -5.75, 1.2, 0.84, ("#252040", 0.1), "counter")
    k.box(-6.55, -2.05, 0.84, -5.70, 1.25, 0.90, "#3a3260", "counter_top")
    k.box(-5.72, -1.95, 0.80, -5.68, 1.15, 0.84, "#5cc8d0", "counter_neon", emit=("#5cc8d0", 0.95))
    for br in (-1.2, 0.2):
        k.cyl(-6.05, br, 0.90, 0.98, 0.12, "#e870c0", "ramen_bowl", verts=10)
        k.cyl(-6.05, br, 0.97, 0.985, 0.10, "#f5e6c8", "ramen_broth", verts=10)
    for sr in (-1.3, -0.4, 0.5):
        k.cyl(-5.30, sr, 0.0, 0.44, 0.03, "#1a1530", "stool_leg", verts=6)
        k.cyl(-5.30, sr, 0.44, 0.50, 0.17, "#3a3260", "stool_seat", verts=12)
        k.cyl(-5.30, sr, 0.48, 0.505, 0.175, "#e870c0", "stool_rim", emit=("#e870c0", 0.7), verts=12)
    A.potted_plant(k, -6.2, 3.1, tone="#2a7a78")

    # Right walkway: Arcade Lounge Round Tables with stools & Token Dispenser
    k.box(5.75, -2.6, 0.0, 6.5, -1.6, 1.32, ("#252040", 0.1), "vending")
    k.box(5.72, -2.48, 0.25, 5.76, -1.72, 1.20, "#3855a0", "vending_glass", emit=("#5cc8d0", 0.85))
    k.box(5.71, -2.42, 0.95, 5.77, -1.78, 1.12, "#e870c0", "vending_header", emit=("#e870c0", 0.9))

    A.round_table(k, 5.85, 0.8, top=0.72, radius=0.40, tone="#3a3260")
    A.stool(k, 5.85, 0.08, seat=0.45, radius=0.18)
    A.stool(k, 5.85, 1.52, seat=0.45, radius=0.18)
    A.potted_plant(k, 6.1, 3.1, tone="#2a7a78")

    k.finalize()
    return root


# ==============================================================================
# 4. ENIGMA STATION COMMAND DECK (`diorama_enigma`)
#    Built with `ChessKit` matching `apps/bridge/js/worlds/enigma.js`:
#    `drawMetalFloor`, `drawCorridorFloor`, `drawMetalWall`, `drawViewport`,
#    `drawServerRack`, `drawTerminal`, and `drawBlastDoor`!
# ==============================================================================
def _enigma_server_rack(k, cx, cr):
    """Server rack matching `drawServerRack` in `enigma.js`."""
    w, d, h = 0.80, 0.56, 1.50
    k.box(cx - w / 2, cr - d / 2, 0.0, cx + w / 2, cr + d / 2, h, ("#0e1820", 0.08), "rack_body")
    k.box(cx - w * 0.42, cr + d * 0.46, 0.12, cx + w * 0.42, cr + d * 0.51, h - 0.10, "#1a2830", "rack_face")
    led_cols = ("#40e080", "#40c080", "#e06040", "#40a8e0", "#e0c040")
    for r_i in range(3):
        zz = h - 0.28 - r_i * 0.26
        for c_i in range(4):
            lx = cx - 0.24 + c_i * 0.16
            col = led_cols[(r_i + c_i + int(abs(cx * 3))) % len(led_cols)]
            k.box(lx - 0.03, cr + d * 0.50, zz, lx + 0.03, cr + d * 0.53, zz + 0.05, col, "rack_led", emit=(col, 1.1))
    k.box(cx - 0.26, cr + d * 0.50, 0.34, cx + 0.18, cr + d * 0.53, 0.38, "#40c8d8", "rack_bar", emit=("#40c8d8", 0.9))


def _enigma_workstation(k, cx, cr, facing_x=1):
    """Detailed command desk & terminal matching `captain-workstation.png` & `drawTerminal`."""
    # Desk base & angled control console
    k.box(cx - 0.40, cr - 1.05, 0.0, cx + 0.40, cr + 1.05, 0.72, ("#14202a", 0.08), "desk_base")
    k.box(cx - 0.44, cr - 1.10, 0.72, cx + 0.44, cr + 1.10, 0.78, "#1e2e3c", "desk_top")
    # Dual raised monitor bezels along the outer edge facing the board
    mx = cx - facing_x * 0.22
    for dr in (-0.52, 0.52):
        k.box(mx - 0.06, cr + dr - 0.38, 0.78, mx + 0.06, cr + dr + 0.38, 1.22, "#0a1218", "mon_bezel")
        sx = mx + facing_x * 0.065
        k.box(sx - 0.01, cr + dr - 0.33, 0.83, sx + 0.01, cr + dr + 0.33, 1.17, "#082030", "mon_screen", emit=("#184860", 0.7))
        # Tiny cyan code lines on screen (`drawTerminal`)
        for li, lz in enumerate((1.10, 1.02, 0.94, 0.86)):
            lw = 0.48 - (li % 3) * 0.12
            k.box(sx + facing_x * 0.008, cr + dr - 0.28, lz, sx + facing_x * 0.015, cr + dr - 0.28 + lw, lz + 0.025, "#40c8d8", "code_line", emit=("#40c8d8", 1.0))
    # Operator swivel chair (`captain-chair.png`)
    ch_x = cx + facing_x * 0.58
    k.cyl(ch_x, cr, 0.0, 0.05, 0.20, "#0e1820", "chair_base", verts=10)
    k.cyl(ch_x, cr, 0.05, 0.42, 0.04, "#1e2e3c", "chair_stem", verts=8)
    k.box(ch_x - 0.22, cr - 0.22, 0.42, ch_x + 0.22, cr + 0.22, 0.48, "#1a2834", "chair_seat")


def build_diorama_enigma():
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = "diorama_enigma"

    k = ChessKit("enigma", root, seed=47, z_offset=-0.38)
    r0, r1 = -7.8, 5.8
    wall_h = 1.90

    # Beveled steel deck plates (`drawMetalFloor`: #182028 base, #1e2830 plate, #0a1218 grooves)
    k.box(-7.6, r0 - 0.2, -0.12, 7.6, r1 + 0.2, -0.02, "#0a1218", "subfloor")
    r_cur = r0
    while r_cur < r1 - 1e-6:
        x_cur = -7.2
        while x_cur < 7.2 - 1e-6:
            k.box(
                x_cur + 0.03, r_cur + 0.03, -0.04, x_cur + 0.97, r_cur + 0.97, 0.0,
                (shade("#1e2830", k.rng.uniform(0.94, 1.06)), 0.06), "floor",
            )
            x_cur += 1.0
        r_cur += 1.0

    # Subtle cyan corridor chevron strips (`drawCorridorFloor`)
    for cr_pos in (4.95, 5.45):
        k.box(-0.45, cr_pos, 0.0, 0.45, cr_pos + 0.08, 0.012, "#40a8e0", "corridor_chevron", emit=("#40a8e0", 0.8))

    # Riveted metal back wall (`drawMetalWall`: #1a2530 panels, #0e1820 cap, #2a3a48 highlight)
    k.box(-7.8, r0 - 0.45, 0.0, 7.8, r0, wall_h, ("#1a2530", 0.08), "wall")
    x_cur = -7.2
    while x_cur < 7.2 - 0.1:
        k.box(x_cur + 0.04, r0 - 0.02, 0.06, x_cur + 1.16, r0 + 0.03, wall_h - 0.12, ("#1e2a36", 0.06), "wall_panel")
        x_cur += 1.2
    k.box(-7.8, r0 - 0.48, wall_h - 0.08, 7.8, r0 + 0.04, wall_h + 0.04, "#0e1820", "wall_cap")
    k.box(-7.8, r0, wall_h + 0.04, 7.8, r0 + 0.05, wall_h + 0.07, "#2a3a48", "wall_cap_hi")

    # Cutaway side bulkheads (`height=0.52`) & front wall
    k.box(-7.8, r0, 0.0, -7.4, r1, 0.52, ("#1a2530", 0.08), "side_wall")
    k.box(-7.82, r0, 0.48, -7.38, r1, 0.55, "#0e1820", "wall_cap")
    k.box(7.4, r0, 0.0, 7.8, r1, 0.52, ("#1a2530", 0.08), "side_wall")
    k.box(7.38, r0, 0.48, 7.82, r1, 0.55, "#0e1820", "wall_cap")

    A.front_wall(k, -7.8, 7.8, r1, height=0.24, gaps=[(-1.3, 1.3)])
    k.box(-1.3, r1 - 0.05, 0.0, 1.3, r1 + 0.30, 0.02, "#0e1820", "threshold")
    for i in range(8):
        col = "#e8b830" if i % 2 == 0 else "#0a0e15"
        k.box(-1.2 + i * 0.30, r1 + 0.02, 0.02, -1.2 + (i + 1) * 0.30, r1 + 0.18, 0.03, col, "hazard_stripe")

    k.add_board_dais_curb("#0e1820", "#40a8e0")

    # Back wall center: Deep-Space Cracked Viewport (`drawViewport`)
    k.box(-2.1, r0 + 0.01, 0.48, 2.1, r0 + 0.10, 1.62, "#050a10", "viewport_bezel")
    k.box(-1.95, r0 + 0.10, 0.58, 1.95, r0 + 0.13, 1.52, "#06101c", "viewport_glass", emit=("#0a1c30", 0.6))
    k.sphere(1.05, r0 + 0.14, 1.22, 0.15, 0.15, "#a0c0e0", "viewport_planet", emit=("#6090b8", 0.7), ry=0.02, segs=12)
    for (sx, sz) in ((-1.4, 1.30), (-0.8, 0.90), (-0.2, 1.36), (0.3, 0.80), (1.5, 1.00)):
        k.box(sx, r0 + 0.14, sz, sx + 0.035, r0 + 0.15, sz + 0.035, "#e8f4ff", "viewport_star", emit=("#ffffff", 1.2))
    # Crisp hairline glass crack (`tube`, not `bar`!)
    k.tube((-0.85, r0 + 0.145, 1.42), (-0.52, r0 + 0.145, 1.05), 0.010, "#8cb4d2", "viewport_crack", verts=5)
    k.tube((-0.52, r0 + 0.145, 1.05), (-0.22, r0 + 0.145, 0.78), 0.008, "#8cb4d2", "viewport_crack", verts=5)
    k.tube((-0.52, r0 + 0.145, 1.05), (-0.18, r0 + 0.145, 1.15), 0.008, "#8cb4d2", "viewport_crack", verts=5)

    # 6 Blinking Server Racks (`drawServerRack`) at r=-7.25 (clear of Black's Rooks!)
    for rx in (-6.0, -4.9, -3.8, 3.8, 4.9, 6.0):
        _enigma_server_rack(k, rx, r0 + 0.52)

    # Left & Right walkways: detailed Command Workstations with monitors, code lines & swivel chairs
    _enigma_workstation(k, -6.0, -0.4, facing_x=1)
    _enigma_workstation(k, 6.0, -0.4, facing_x=-1)

    k.finalize()
    return root


# ==============================================================================
# 5. THE SINGULARITY FLOATING PLATFORM (`diorama_singularity`)
#    Built with `ChessKit` matching `apps/bridge/js/worlds/singularity.js`:
#    "A tiny floating platform over a swirling void. Minimal, abstract, eerie."
# ==============================================================================
def _singularity_crystal_cluster(k, cx, cr, scale=1.0):
    """Angular faceted purple crystal cluster matching `drawCrystal` in `singularity.js`."""
    k.cone(cx, cr, 0.0, 0.62 * scale, 0.13 * scale, 0.005, "#503090", "crystal", emit=("#8060c0", 0.75), verts=5)
    k.cone(cx + 0.13 * scale, cr + 0.07 * scale, 0.0, 0.38 * scale, 0.08 * scale, 0.004, "#8060c0", "crystal", emit=("#a080e0", 0.85), verts=5)
    k.cone(cx - 0.11 * scale, cr - 0.05 * scale, 0.0, 0.32 * scale, 0.07 * scale, 0.004, "#a080e0", "crystal", emit=("#e0c0f8", 0.9), verts=5)


def build_diorama_singularity():
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = "diorama_singularity"

    k = ChessKit("singularity", root, seed=93, z_offset=-0.38)

    # Tapered dark under-monolith (`#0e0820`)
    k.cone(0.0, -0.4, -2.1, -0.08, 3.0, 6.6, ("#0e0820", 0.12), "under_spire", verts=8)

    # Irregular fractured stone platform tiles (`drawPlatform` #2a2040 / #1c1432)
    r_cur = -6.2
    while r_cur < 5.2 - 1e-6:
        x_cur = -6.0
        while x_cur < 6.0 - 1e-6:
            if abs(x_cur) + abs(r_cur) < 10.0:
                tone = "#2a2040" if k.rng.random() < 0.65 else "#1c1432"
                k.box(
                    x_cur + 0.03,
                    r_cur + 0.03,
                    -0.08,
                    x_cur + 0.97,
                    r_cur + 0.97,
                    0.0,
                    (shade(tone, k.rng.uniform(0.90, 1.10)), 0.12),
                    "floor",
                )
            x_cur += 1.0
        r_cur += 1.0

    # Chunky crumbling outer rim (`drawPlatformEdge` #0e0820 / #1a1430)
    for i in range(28):
        ang = (i / 28.0) * math.pi * 2
        dist = 6.35 + k.rng.uniform(-0.25, 0.35)
        rx, rr = math.cos(ang) * dist, math.sin(ang) * dist * 0.92 - 0.3
        k.rock(rx, rr, -0.06, 0.40, 0.34, 0.12, ("#1a1430", 0.15), part="edge_rock", segs=7)

    # Small drifting stone fragments pulled outward into the void (`_bob`)
    for i in range(14):
        ang = (i / 14.0) * math.pi * 2 + 0.2
        dist = 7.3 + (i % 3) * 0.55
        fx, fr = math.cos(ang) * dist, math.sin(ang) * dist * 0.9 - 0.3
        fz = -0.12 + (i % 3) * 0.08
        k.rock(fx, fr, fz, 0.24, 0.20, 0.08, ("#221838", 0.15), part="void_frag_bob", segs=6)

    k.add_board_dais_curb("#1a1430", "#a080e0")

    # Subtle glowing violet hairline cracks on the platform apron (`drawPlatformCracks`)
    for (xa, ra, xb, rb) in (
        (-5.4, -2.5, -4.8, -1.2),
        (4.8, -2.8, 5.5, -1.4),
        (-5.2, 2.2, -4.7, 3.4),
        (4.7, 1.8, 5.4, 3.1),
        (-2.2, -5.6, -0.8, -5.0),
        (1.2, -5.5, 2.6, -4.9),
    ):
        k.bar(xa, ra, xb, rb, -0.01, 0.012, 0.035, "#503090", "crack", emit=("#a080e0", 0.85))

    # Low, tasteful Void Crystal clusters along the outer platform rim (`drawCrystal`)
    for (cx, cr, sc) in (
        (-5.5, -4.2, 0.90),
        (5.5, -4.2, 0.85),
        (-5.7, 0.4, 0.75),
        (5.7, 0.6, 0.78),
        (-5.3, 3.6, 0.68),
        (5.3, 3.6, 0.72),
    ):
        _singularity_crystal_cluster(k, cx, cr, scale=sc)

    # Flat, eerie Singularity Core off the North-East rim (`x=5.6, r=-6.9`, matching `singularity.js`!)
    # Built as flat concentric glowing discs (no bowling-ball sphere, never behind Black's King/Queen)
    sx, sr, sz = 5.6, -6.9, 0.04
    k.cyl(sx, sr, sz - 0.03, sz - 0.01, 1.15, "#503090", "core_ring_spin_rev", emit=("#8050d0", 0.75), verts=28)
    k.cyl(sx, sr, sz - 0.01, sz + 0.01, 0.72, "#a080e0", "core_disc_spin_slow", emit=("#a080e0", 0.95), verts=24)
    k.cyl(sx, sr, sz + 0.01, sz + 0.03, 0.42, "#e0d0ff", "core_disc_spin_slow", emit=("#e0d0ff", 1.15), verts=20)
    k.cyl(sx, sr, sz + 0.03, sz + 0.05, 0.18, "#ffffff", "core_hot", emit=("#ffffff", 1.35), verts=16)

    k.finalize()
    return root


def build_all_world_dioramas(*args, **kwargs):
    return {
        "classic": build_diorama_classic(),
        "lumar": build_diorama_lumar(),
        "arcadia": build_diorama_arcadia(),
        "enigma": build_diorama_enigma(),
        "singularity": build_diorama_singularity(),
    }
