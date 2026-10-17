"""Blender scene kit for the bridge: build rooms/areas in tile coordinates and
render them as pre-rendered, depth-tested backgrounds.

Coordinates: x = tile column, row = tile row (grows toward the camera), z =
height in tile units. The camera is orthographic at THETA elevation; the world
is stretched along rows by 1/sin(THETA) so each floor tile projects to a
square 32 × 32 px cell — the game's tile grid lines up with the render.

Passes per scene (see render()):
  albedo     flat surface colours (procedural textures allowed)
  light_*    white-diffuse lighting with cast shadows, once per light state
  emission   self-lit surfaces (fire, glass, lamps)
  id         flat colour per part — for outlines
  depth      view depth — for outlines and the engine's per-pixel depth test
  probe      light falling on characters, per tile
scene_post.py turns them into the toon-shaded art + packed depth + meta.

Run inside Blender's Python (bpy). Engine depth convention (also used by
world.js): depth = -row * cot(THETA) - z * sin(THETA); larger = farther.
"""
import contextlib
import json
import math
import os
import random

import bpy
import bmesh  # noqa: E402  (bpy must be imported first)
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Euler, Matrix, Vector

THETA = math.radians(45)
S = 1 / math.sin(THETA)
TS = 32
LIGHT_EXPOSURE = -2.0   # stops; keep in sync with scene_post.LIGHT_GAIN

# Live light (scene.json `lit`, js/litscene.js): a scene with a day renders the sun through the day as six white suns,
# each pass on its own, so the engine moves the shadows with the planet's clock. (u: how far through the day, sunrise 0
# to sunset 1; the direction the light travels — x east, row toward the viewer, z up. Shadows fall a little toward the
# viewer, swinging from the left in the morning to the right in the evening, as in the game's day scenes.)
LIT_SUNS = [
    (0.065, (-0.93, 0.30, -0.20)),
    (0.233, (-0.66, 0.46, -0.58)),
    (0.465, (-0.10, 0.44, -0.89)),
    (0.684, (0.56, 0.48, -0.66)),
    (0.865, (0.86, 0.40, -0.31)),
    (0.967, (0.94, 0.30, -0.14)),
]
LIT_SUN = 3.0          # the white suns' strength (js/litscene.js is tuned to it)
LIT_SKY = 1.0          # the white sky dome's
HEIGHT_RANGE = 3.0      # the height pass maps z in [-3, 3] tiles to 0..1
SOLID_COVER = 0.3       # Kit.solid: a footprint no longer than a tile blocks the cells it covers at least this much of


def _cells(a0, a1, feet=0.5):
    """The cells k.solid blocks along one axis of a footprint [a0, a1). feet: where in its cell a standing character's
    feet are along this axis (0.5 across, 0.9 down the rows) — a sliver too thin to cover any cell blocks the one whose
    feet would be on it (a rail on the line between two rows blocks the row above)."""
    full = range(int(math.floor(a0)), int(math.ceil(a1)))
    if a1 - a0 > 1.05:
        return list(full)
    keep = [c for c in full if min(a1, c + 1) - max(a0, c) >= SOLID_COVER - 1e-9]
    return keep or [int(math.floor((a0 + a1) / 2 - feet + 0.5))]


def _scale(x, y, z):
    return Matrix.Diagonal((x, y, z, 1.0))


def id_rgb(pid):
    """A part's colour in the id pass. Unique for any number of parts: the first 250 as they always were, then each block
    of 251 with its blue turned on (the red alone tells pids within a block apart)."""
    return ((pid * 37) % 251, (pid * 91) % 251, (pid * 53 + 101 * (pid // 251)) % 251)


def hexc(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def lin(c):
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)


def shade(h, f):
    """Scale a hex colour's brightness (f < 1 darker)."""
    c = hexc(h)
    return '#' + ''.join('%02x' % max(0, min(255, round(255 * v * f))) for v in c)


class Kit:
    def __init__(self, cols, rows, margin_top=1.5, margin_bottom=0.5, margin_x=0.0, seed=7):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.scene = bpy.context.scene
        self.cols, self.rows = cols, rows
        self.mt, self.mb, self.mx = margin_top, margin_bottom, margin_x
        self.parts = []      # dicts: obj, albedo, emit, pid
        self.lights = []     # dicts: obj, energy, group
        self.pid_names = {}
        self.rng = random.Random(seed)
        self.blocked = set()  # (col,row) cells marked solid by placed objects
        self.variants = []    # swappable decor: {slot, key, parts, lights}
        self._var = None      # variant being built (see variant())
        self._active_var = None
        self.water_z = None   # set (assets_coast) when the scene stands in the sea: renders the height pass
        self._fol = None      # foliage being built (see foliage()): 'leaf' or 'needle'
        self._tree = 0        # which tree it belongs to
        self.later = []       # built once everything else is placed, just before the render (the grass: see top())
        self.wet = None       # {word: strength}: parts with that word in their name are wet and mirror the scene (_wet_mirror)
        self.scene.world = bpy.data.worlds.new('w')

    # ---- ids / materials -------------------------------------------------
    def pid(self, name):
        if name not in self.pid_names:
            self.pid_names[name] = len(self.pid_names) + 1
        return self.pid_names[name]

    def _finish(self, o, albedo, part, emit=None, bevel=0.0, smooth=False):
        if bevel:
            m = o.modifiers.new('bev', 'BEVEL')
            m.width = bevel
            m.segments = 2
            m.limit_method = 'ANGLE'
        for p in o.data.polygons:
            # round sides smooth, flat caps/tops flat
            p.use_smooth = smooth and abs(p.normal.z) < 0.5
        o.data.materials.append(bpy.data.materials.new('tmp'))
        self._add_part({'obj': o, 'albedo': albedo, 'emit': emit, 'pid': self.pid(part), 'pname': part})
        return o

    def top(self, x, r):
        """Looking straight down at (x, r): the part name and height of whatever is on top there, or (None, None). For
        things laid over the finished scene (the grass grows only where the turf is still the top)."""
        if not hasattr(self, '_names'):
            bpy.context.view_layer.update()
            self._dg = bpy.context.evaluated_depsgraph_get()
            self._names = {p['obj'].name: p.get('pname') for p in self.parts}
        hit, loc, _n, _i, ob, _m = self.scene.ray_cast(self._dg, Vector((x, -r * S, 30.0)), Vector((0, 0, -1)))
        if not hit:
            return None, None
        return self._names.get(ob.name), loc.z

    def blades(self, items, albedo, part):
        """Many thin blades as one object, (x, r, z, h, w, lx, lr) each: a triangle w either side of (x, r, z) to a tip
        h up, leaning (lx, lr). A meadow's grass is a few of these."""
        bm = bmesh.new()
        for (x, r, z, h, w, lx, lr) in items:
            a = bm.verts.new((x - w, -r * S, z)); b = bm.verts.new((x + w, -r * S, z))
            t = bm.verts.new((x + lx, -(r + lr) * S, z + h))
            bm.faces.new((a, b, t))
        me = bpy.data.meshes.new('blades')
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new('blades', me)
        self.scene.collection.objects.link(o)
        return self._finish(o, albedo, part)

    # The leaf pass also marks the grass (turf, blades, meadow flowers) and still water (ponds, streams, fountain basins),
    # by part name (less a 'ground_' / 'coast_' prefix) or a part's own 'nature' — for the seasons on the ground and the
    # wind and ripples the engine draws (js/foliage.js, js/nature.js)
    GRASS_PARTS = ('grass', 'grass_dark', 'meadow', 'meadow_dark', 'meadow_flower', 'lip_grass', 'turf')
    WATER_PARTS = ('pond_water', 'pond_deep', 'stream_water', 'stream_deep', 'basin_water', 'well_water', 'trough_water')

    def _nature(self, p):
        if p.get('nature'):
            return p['nature']
        n = p.get('pname') or ''
        for pre in ('ground_', 'coast_'):
            if n.startswith(pre):
                n = n[len(pre):]
        return 'grass' if n in self.GRASS_PARTS else 'water' if n in self.WATER_PARTS else None

    def quads(self, items, albedo, part):
        """Many flat four-cornered pieces as one object, each ((x, r, z) × 4) — a roof's shingles, a wall's boards."""
        bm = bmesh.new()
        for q in items:
            vs = [bm.verts.new((p[0], -p[1] * S, p[2])) for p in q]
            bm.faces.new(vs)
        me = bpy.data.meshes.new('quads')
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new('quads', me)
        self.scene.collection.objects.link(o)
        return self._finish(o, albedo, part)

    def _add_part(self, d):
        d['var'] = self._var
        d['fol'] = self._fol
        d['tree'] = self._tree if self._fol else 0
        self.parts.append(d)
        if self._var is not None:
            self._var['parts'].append(d)

    def _add_light(self, d):
        d['var'] = self._var
        self.lights.append(d)
        if self._var is not None:
            self._var['lights'].append(d)

    @contextlib.contextmanager
    def foliage(self, kind='leaf'):
        """Parts built inside `with k.foliage(kind):` are one tree's leaves ('leaf', which turn with the seasons) or
        needles ('needle', evergreen): the leaf pass marks them (leaves.png: R leaf, B needle, G which tree), so the
        engine can colour each tree for the season (js/foliage.js)."""
        self._tree += 1
        self._fol = kind
        try:
            yield
        finally:
            self._fol = None

    @contextlib.contextmanager
    def variant(self, slot, key):
        """Parts and lights built inside `with k.variant(slot, key):` are
        swappable decor: left out of the base render, then rendered on their
        own in the room's light (room still casting shadows) so the engine
        can composite whichever variant the player owns."""
        self._var = {'slot': slot, 'key': key, 'parts': [], 'lights': []}
        try:
            yield
        finally:
            self.variants.append(self._var)
            self._var = None

    # ---- primitives in tile space ---------------------------------------
    # Meshes go straight into mesh data with bmesh: bpy.ops primitives get
    # slower with every object already in the scene, bmesh doesn't. Each is
    # a unit primitive transformed by M in unstretched tile space (rows run
    # along -y), then stretched along rows by S and placed at (x, row, z).
    def _make(self, kind, M, loc, verts=16, r1=1.0, r2=1.0, segs=16):
        bm = bmesh.new()
        if kind == 'cube':
            bmesh.ops.create_cube(bm, size=1.0)
        elif kind == 'sphere':
            bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=max(6, segs // 2), radius=1.0)
        else:
            bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts,
                                  radius1=r1, radius2=max(1e-4, r2), depth=1.0)
        bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
        for v in bm.verts:
            v.co.y *= S
        me = bpy.data.meshes.new(kind)
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(kind, me)
        self.scene.collection.objects.link(o)
        o.location = (loc[0], -loc[1] * S, loc[2])
        return o

    def box(self, x0, r0, z0, x1, r1, z1, albedo, part, emit=None, bevel=0.0):
        o = self._make('cube', _scale(x1 - x0, r1 - r0, z1 - z0), ((x0 + x1) / 2, (r0 + r1) / 2, (z0 + z1) / 2))
        return self._finish(o, albedo, part, emit, bevel)

    def boxes(self, rects, albedo, part, emit=None):
        """Many boxes as one object (x0, r0, z0, x1, r1, z1 each) — the lit
        windows of a tower, rivets, a field of tiles: one part, one material."""
        bm = bmesh.new()
        for (x0, r0, z0, x1, r1, z1) in rects:
            vs = [bm.verts.new((x, -r * S, z)) for z in (z0, z1) for r in (r0, r1) for x in (x0, x1)]
            for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
                bm.faces.new([vs[i] for i in f])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new('boxes')
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new('boxes', me)
        self.scene.collection.objects.link(o)
        return self._finish(o, albedo, part, emit)

    def cyl(self, cx, cr, z0, z1, rx, albedo, part, emit=None, verts=16, ry=None, bevel=0.0):
        o = self._make('cyl', _scale(rx, ry if ry is not None else rx, z1 - z0), (cx, cr, (z0 + z1) / 2), verts=verts)
        return self._finish(o, albedo, part, emit, bevel, smooth=True)

    def _finish_axis(self, o, albedo, part, emit, axis):
        for p in o.data.polygons:
            p.use_smooth = abs(p.normal[axis]) < 0.5
        o.data.materials.append(bpy.data.materials.new('tmp'))
        self._add_part({'obj': o, 'albedo': albedo, 'emit': emit, 'pid': self.pid(part), 'pname': part})
        return o

    def cyl_y(self, cx, r0, r1, cz, rx, rz, albedo, part, emit=None, verts=16):
        """Cylinder lying along the rows axis (its round face toward the camera)."""
        M = _scale(rx, r1 - r0, rz) @ Matrix.Rotation(math.pi / 2, 4, 'X')
        o = self._make('cyl', M, (cx, (r0 + r1) / 2, cz), verts=verts)
        return self._finish_axis(o, albedo, part, emit, 1)

    def cyl_x(self, x0, x1, cr, cz, rr, rz, albedo, part, emit=None, verts=12):
        """Cylinder lying along the columns axis (logs, rolling pins)."""
        M = _scale(x1 - x0, rr, rz) @ Matrix.Rotation(math.pi / 2, 4, 'Y')
        o = self._make('cyl', M, ((x0 + x1) / 2, cr, cz), verts=verts)
        return self._finish_axis(o, albedo, part, emit, 0)

    def bar(self, xa, ra, xb, rb, z0, z1, width, albedo, part, emit=None, bevel=0.0):
        """Box running along the floor from (xa, ra) to (xb, rb) at any angle,
        `width` thick — angled walls, rune strokes, planks."""
        dx, dr = xb - xa, rb - ra
        M = Matrix.Rotation(math.atan2(-dr, dx), 4, 'Z') @ _scale(math.hypot(dx, dr), width, z1 - z0)
        o = self._make('cube', M, ((xa + xb) / 2, (ra + rb) / 2, (z0 + z1) / 2))
        return self._finish(o, albedo, part, emit, bevel)

    def tube(self, a, b, ra, albedo, part, emit=None, rb=None, verts=12, smooth=True):
        """Cylinder (or cone, if rb is given) from point a to point b; points
        are (x, row, z)."""
        d = Vector((b[0] - a[0], -(b[1] - a[1]), b[2] - a[2]))
        R = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
        mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
        if rb is None:
            o = self._make('cyl', R @ _scale(ra, ra, d.length), mid, verts=verts)
        else:
            o = self._make('cone', R @ _scale(1, 1, d.length), mid, verts=verts, r1=ra, r2=rb)
        return self._finish(o, albedo, part, emit, smooth=smooth)

    def blob(self, cx, cr, cz, rx, ry, rz, albedo, part, emit=None, rot=(0, 0, 0), segs=16, smooth=True):
        """Ellipsoid with radii along x / rows / z, rotated by `rot` degrees
        (about x, rows, z) — heads, wings, boulders."""
        R = Euler(tuple(math.radians(v) for v in (rot[0], -rot[1], -rot[2])), 'XYZ').to_matrix().to_4x4()
        o = self._make('sphere', R @ _scale(rx, ry, rz), (cx, cr, cz), segs=segs)
        o = self._finish(o, albedo, part, emit, smooth=smooth)
        if smooth:
            for p in o.data.polygons:
                p.use_smooth = True
        return o

    def poly(self, pts, albedo, part, emit=None):
        """Flat surface through points (x, row, z), fanned from the first —
        wing membranes, sails, banners."""
        bm = bmesh.new()
        vs = [bm.verts.new((p[0], -p[1] * S, p[2])) for p in pts]
        for i in range(1, len(vs) - 1):
            bm.faces.new((vs[0], vs[i], vs[i + 1]))
        me = bpy.data.meshes.new('poly')
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new('poly', me)
        self.scene.collection.objects.link(o)
        return self._finish(o, albedo, part, emit)

    def loft(self, rings, albedo, part, emit=None, closed=False, smooth=True):
        """Skin through cross-sections: each ring is a list of (x, row, z)
        points, all rings the same length — hulls, curved roofs, sails.
        `closed` joins each ring's last point back to its first; an open
        ring gives an open shell (a hull you can see down into)."""
        bm = bmesh.new()
        vs = [[bm.verts.new((p[0], -p[1] * S, p[2])) for p in ring] for ring in rings]
        n = len(vs[0])
        for a, b in zip(vs, vs[1:]):
            for i in range(n if closed else n - 1):
                j = (i + 1) % n
                bm.faces.new((a[i], a[j], b[j], b[i]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new('loft')
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new('loft', me)
        self.scene.collection.objects.link(o)
        o = self._finish(o, albedo, part, emit)
        for p in o.data.polygons:
            p.use_smooth = smooth
        return o

    def rock(self, cx, cr, cz, rx, ry, rz, albedo, part='rock', seed=None, jitter=0.18, segs=10):
        """Faceted boulder: a low-poly ellipsoid with its vertices pushed
        around, flat shaded."""
        rng = self.rng if seed is None else random.Random(seed)
        o = self.blob(cx, cr, cz, rx, ry, rz, albedo, part, rot=(0, 0, rng.uniform(0, 360)), segs=segs, smooth=False)
        for v in o.data.vertices:
            f = 1 + rng.uniform(-jitter, jitter)
            v.co.x *= f
            v.co.y *= f
            v.co.z *= 1 + rng.uniform(-jitter, jitter)
        return o

    def sphere(self, cx, cr, cz, rx, rz, albedo, part, emit=None, ry=None, segs=16):
        o = self._make('sphere', _scale(rx, ry if ry is not None else rx, rz), (cx, cr, cz), segs=segs)
        return self._finish(o, albedo, part, emit, smooth=True)

    def cone(self, cx, cr, z0, z1, r0, r1, albedo, part, emit=None, verts=12):
        o = self._make('cone', _scale(r0, r0, z1 - z0), (cx, cr, (z0 + z1) / 2), verts=verts, r1=1.0, r2=r1 / r0)
        return self._finish(o, albedo, part, emit, smooth=True)

    def point_light(self, x, r, z, color, energy, radius=0.15, group='static'):
        ld = bpy.data.lights.new('L', 'POINT')
        ld.color = lin(hexc(color))[:3]
        ld.energy = energy
        ld.shadow_soft_size = radius
        o = bpy.data.objects.new('L', ld)
        self.scene.collection.objects.link(o)
        o.location = (x, -r * S, z)
        self._add_light({'obj': o, 'energy': energy, 'group': group})
        return o

    def area_light(self, x, r, z, color, energy, size, rot=(0, 0, 0), group='static'):
        ld = bpy.data.lights.new('A', 'AREA')
        ld.color = lin(hexc(color))[:3]
        ld.energy = energy
        ld.size = size
        o = bpy.data.objects.new('A', ld)
        self.scene.collection.objects.link(o)
        o.location = (x, -r * S, z)
        o.rotation_euler = rot
        self._add_light({'obj': o, 'energy': energy, 'group': group, 'sky': size >= 8})
        return o

    def sun(self, direction, color, strength, angle=4.0, group='static'):
        """Directional light (the day worlds): direction is (x, row, z) the light travels along."""
        ld = bpy.data.lights.new('sun', 'SUN')
        ld.color = lin(hexc(color))[:3]
        ld.energy = strength
        ld.angle = math.radians(angle)
        o = bpy.data.objects.new('sun', ld)
        self.scene.collection.objects.link(o)
        d = Vector((direction[0], -direction[1] * S, direction[2])).normalized()
        o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        self._add_light({'obj': o, 'energy': strength, 'group': group, 'sky': True})
        return o

    def solid(self, x0, r0, x1, r1):
        """Mark tiles [x0,x1) × [r0,r1) as blocked for the collision map
        (ignored inside a variant: decor doesn't change collisions).

        Along a side no longer than a tile (a post, a barrel, a tree's trunk, a bench's depth) only the cells the
        footprint really stands on are blocked — at least SOLID_COVER of the cell — so a lamp post on a tile line
        doesn't wall off both tiles and a crate that pokes a sliver over the line doesn't close the next tile; at
        least one cell (the one under its centre) always is. Longer sides (walls, counters, buildings) block every
        cell they touch."""
        if self._var is not None:
            return
        for c in _cells(x0, x1):
            for r in _cells(r0, r1, feet=0.9):
                self.blocked.add((c, r))

    def solid_post(self, cx, cr):
        """A thin post (a lamp, a flagpole) standing at (cx, cr): block the tiles where you'd stand on it — your feet
        are at (c + 0.5, r + 0.9) on tile (c, r) — and no others. A post on the line between two tiles is in neither:
        you walk past it on both sides."""
        if self._var is not None:
            return
        for c in range(int(math.floor(cx)) - 1, int(math.floor(cx)) + 2):
            for r in range(int(math.floor(cr)) - 2, int(math.floor(cr)) + 2):
                if abs(cx - (c + 0.5)) < 0.4 and abs(cr - (r + 0.9)) < 0.45:
                    self.blocked.add((c, r))

    # ---- materials per pass ---------------------------------------------
    def _emission_mat(self, name, color_fn):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        nt = m.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        em = nt.nodes.new('ShaderNodeEmission')
        nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
        color_fn(nt, em)
        return m

    def _flat_rgb(self, rgb, strength=1.0):
        def fn(nt, em):
            em.inputs['Color'].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
            em.inputs['Strength'].default_value = strength
        return self._emission_mat('flat', fn)

    def _flat_emission(self, hx, strength=1.0):
        c = lin(hexc(hx))
        return self._flat_rgb(c[:3], strength)

    def _white_diffuse(self):
        m = bpy.data.materials.get('white_diffuse')
        if m:
            return m
        m = bpy.data.materials.new('white_diffuse')
        m.use_nodes = True
        bsdf = m.node_tree.nodes.get('Principled BSDF')
        bsdf.inputs['Base Color'].default_value = (0.8, 0.8, 0.8, 1)
        bsdf.inputs['Roughness'].default_value = 1.0
        if 'Specular IOR Level' in bsdf.inputs:
            bsdf.inputs['Specular IOR Level'].default_value = 0.0
        return m

    # Ground that runs on for many tiles (an island's turf and paths, its banks and beaches) takes its grain in tile units:
    # over the object's own extent (the default, right for a crate or a wall) the noise stretches into wandering contour
    # lines across a whole island - squiggles, where the farm's meadow reads as a fine, even texture
    GROUND = ('ground', 'coast_lip', 'coast_bank', 'coast_wet', 'grass', 'path', 'sand', 'turf', 'snow')

    def _ground(self, p):
        n = p.get('pname') or ''
        if not n.startswith(self.GROUND) or n.startswith(('coast_shelf', 'coast_deep', 'coast_weed')):
            return False
        d = p['obj'].dimensions
        return max(d.x, d.y) > 2.5

    def _albedo_mat(self, spec, tiles=False):
        """spec: '#hex' or ('#hex', grain) — grain adds per-pixel noise. tiles: the grain in tile units (see GROUND)."""
        if isinstance(spec, str):
            spec = (spec, 0.0)
        hx, grain = spec[0], spec[1]
        if tiles:
            grain *= 0.7

        def fn(nt, em):
            if not grain:
                em.inputs['Color'].default_value = lin(hexc(hx))
                return
            noise = nt.nodes.new('ShaderNodeTexNoise')
            noise.inputs['Scale'].default_value = 3.2 if tiles else 9.0
            noise.inputs['Detail'].default_value = 2.0
            if tiles:
                tc = nt.nodes.new('ShaderNodeTexCoord')
                nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
            ramp = nt.nodes.new('ShaderNodeValToRGB')
            ramp.color_ramp.interpolation = 'CONSTANT'
            e = ramp.color_ramp.elements
            e[0].position, e[0].color = 0.0, lin(hexc(shade(hx, 1 - grain)))
            e[1].position, e[1].color = 0.62, lin(hexc(shade(hx, 1 + grain * 0.6)))
            mid = e.new(0.38)
            mid.color = lin(hexc(hx))
            nt.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
            nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
        return self._emission_mat('alb', fn)

    def _holdout(self):
        m = bpy.data.materials.get('holdout')
        if m:
            return m
        m = bpy.data.materials.new('holdout')
        m.use_nodes = True
        nt = m.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        h = nt.nodes.new('ShaderNodeHoldout')
        nt.links.new(h.outputs['Holdout'], out.inputs['Surface'])
        return m

    def _is_grass(self, p):
        """Grass for the live-light passes (no blade casts a shadow there: thousands of them read as combed streaks)."""
        n = (p.get('pname') or '').replace('ground_', '').replace('coast_', '')
        return self._nature(p) == 'grass' or n.startswith(('meadow', 'tuft', 'flower', 'clover', 'reed'))

    def _is_water(self, p):
        return self._nature(p) == 'water'

    def _normal_mat(self):
        m = bpy.data.materials.get('lit_normal')
        if m:
            return m

        def fn(nt, em):
            geo = nt.nodes.new('ShaderNodeNewGeometry')
            vm = nt.nodes.new('ShaderNodeVectorMath')
            vm.operation = 'MULTIPLY_ADD'
            vm.inputs[1].default_value = (0.5, 0.5, 0.5)
            vm.inputs[2].default_value = (0.5, 0.5, 0.5)
            nt.links.new(geo.outputs['Normal'], vm.inputs[0])
            nt.links.new(vm.outputs['Vector'], em.inputs['Color'])
        return self._emission_mat('lit_normal', fn)

    def _mirror_mat(self):
        m = bpy.data.materials.get('lit_mirror')
        if m:
            return m
        m = bpy.data.materials.new('lit_mirror')
        m.use_nodes = True
        nt = m.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        g = nt.nodes.new('ShaderNodeBsdfGlossy')
        g.inputs['Roughness'].default_value = 0.0
        g.inputs['Color'].default_value = (1, 1, 1, 1)
        nt.links.new(g.outputs['BSDF'], out.inputs['Surface'])
        return m

    def _assign(self, kind, light_state=None):
        cache = {}
        for p in self.parts:
            o = p['obj']
            o.hide_render = p['var'] is not None and p['var'] is not self._active_var
            if p['albedo'] == 'HOLDOUT':
                # a hole in the render (windows onto the engine's live sky)
                o.data.materials[0] = self._holdout()
                o.visible_shadow = False
                continue
            if kind == 'albedo':
                tiles = self._ground(p)
                key = ('a', str(p['albedo']), tiles)
                if key not in cache:
                    cache[key] = self._albedo_mat(p['albedo'], tiles)
                m = cache[key]
            elif kind == 'light':
                if p['emit'] and (light_state or {}).get('_emitdiffuse'):
                    m = self._white_diffuse()             # a live-light sky or sun pass: glass and lamps lit like anything else
                elif p['emit']:
                    em = (light_state or {}).get('_emit', 1.0)
                    key = ('le', p['emit'][0], (p['emit'][1] if len(p['emit']) > 1 else 1.0) * em)
                    if key not in cache:
                        cache[key] = self._flat_emission(p['emit'][0], (p['emit'][1] if len(p['emit']) > 1 else 1.0) * em)
                    m = cache[key]
                else:
                    m = self._white_diffuse()
            elif kind == 'emission':
                # the glow you see is the emission colour scaled by its strength
                # (capped at 1; stronger only means more light cast on the room)
                st = min(1.0, p['emit'][1] if p['emit'] and len(p['emit']) > 1 else 1.0)
                key = ('e', p['emit'][0] if p['emit'] else None, st)
                if key not in cache:
                    cache[key] = self._flat_emission(p['emit'][0] if p['emit'] else '#000000', st)
                m = cache[key]
            elif kind == 'leaf':
                f, t = p.get('fol'), p.get('tree', 0)
                nat = None if f else self._nature(p)
                key = ('lf', f, t % 15 if f else 0, nat)
                if key not in cache:
                    g = 8 + 16 * (t % 15) if f else 0
                    cache[key] = self._flat_emission('#%02x%02x%02x' % (255 if f == 'leaf' else 64 if nat == 'grass' else 0, g,
                                                                     255 if f == 'needle' else 64 if nat == 'water' else 0))
                m = cache[key]
            elif kind == 'id':
                pid = p['pid']
                key = ('i', pid)
                if key not in cache:
                    cache[key] = self._flat_rgb(tuple(v / 255 for v in id_rgb(pid)))
                m = cache[key]
            elif kind == 'depth':
                if 'depth' not in cache:
                    def fn(nt, em):
                        cam = nt.nodes.new('ShaderNodeCameraData')
                        mr = nt.nodes.new('ShaderNodeMapRange')
                        mr.inputs['From Min'].default_value = self.zmin
                        mr.inputs['From Max'].default_value = self.zmax
                        nt.links.new(cam.outputs['View Z Depth'], mr.inputs['Value'])
                        nt.links.new(mr.outputs['Result'], em.inputs['Color'])
                    cache['depth'] = self._emission_mat('depth', fn)
                m = cache['depth']
            elif kind == 'height':
                if 'height' not in cache:
                    def fn(nt, em):
                        geo = nt.nodes.new('ShaderNodeNewGeometry')
                        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
                        mr = nt.nodes.new('ShaderNodeMapRange')
                        mr.inputs['From Min'].default_value = -HEIGHT_RANGE
                        mr.inputs['From Max'].default_value = HEIGHT_RANGE
                        nt.links.new(geo.outputs['Position'], sep.inputs['Vector'])
                        nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
                        nt.links.new(mr.outputs['Result'], em.inputs['Color'])
                    cache['height'] = self._emission_mat('height', fn)
                m = cache['height']
            o.data.materials[0] = m
            # glowing parts (lamp glass, flames) must not block their own light — except from the sun and sky; and in the
            # live-light sun passes the grass casts no shadow (thousands of blades' shadows read as combed streaks)
            o.visible_shadow = not p['emit'] or bool((light_state or {}).get('_emitdiffuse'))
            if kind == 'light' and (light_state or {}).get('_nograss') and self._is_grass(p):
                o.visible_shadow = False
        for L in self.lights:
            L['obj'].hide_render = kind != 'light' or (L['var'] is not None and L['var'] is not self._active_var)
            if kind == 'light' and light_state is not None:
                m = light_state.get(L['group'], L.get('default', 1.0))
                if not L['group'].startswith('_'):
                    m *= light_state.get('_sky', 1.0) if L.get('sky') else light_state.get('_art', 1.0)
                L['obj'].data.energy = L['energy'] * m

    # ---- camera + render ---------------------------------------------------
    def _camera(self):
        sc = self.scene
        self.resx = int(round((self.cols + 2 * self.mx) * TS))
        self.resy = int(round((self.rows + self.mt + self.mb) * TS))
        ox, oy = self.mx * TS, self.mt * TS
        cam_col = (self.resx / 2 - ox) / TS
        cam_sy = (self.resy / 2 - oy) / TS
        f = Vector((0, math.cos(THETA), -math.sin(THETA)))
        T = Vector((cam_col, -cam_sy * S, 0))
        D = 60.0
        C = T - f * D
        cd = bpy.data.cameras.new('cam')
        cd.type = 'ORTHO'
        cd.ortho_scale = max(self.resx, self.resy) / TS
        cd.clip_start = 0.1
        cd.clip_end = 200
        cam = bpy.data.objects.new('cam', cd)
        sc.collection.objects.link(cam)
        cam.location = C
        cam.rotation_euler = (math.pi / 2 - THETA, 0, 0)
        sc.camera = cam
        if self.resy > self.resx:
            # ortho_scale follows the larger side; shift is not needed since
            # T already sits at the image centre.
            pass
        self.cam_dot = C.dot(f)          # engine depth = viewZ + cam_dot
        self.origin = (ox, oy)
        # Depth range: generous bounds around the scene
        self.zmin, self.zmax = D - 30, D + 40

    def _settings(self, samples, raw=False, sixteen=False, bw=False):
        sc = self.scene
        sc.render.engine = 'CYCLES'
        sc.cycles.device = 'CPU'
        # SCENE_PERSIST=1 keeps the scene's geometry (its BVH) from pass to pass: only the materials change between the
        # passes, so a scene of thousands of parts stops rebuilding it every time (off by default)
        sc.render.use_persistent_data = bool(os.environ.get('SCENE_PERSIST'))
        sc.cycles.samples = samples
        sc.cycles.use_denoising = samples > 1
        sc.cycles.filter_width = 0.01 if samples == 1 else 1.0
        sc.render.resolution_x = self.resx
        sc.render.resolution_y = self.resy
        sc.render.resolution_percentage = 100
        sc.render.film_transparent = True
        sc.render.dither_intensity = 0.0
        sc.render.image_settings.file_format = 'PNG'
        sc.render.image_settings.color_mode = 'BW' if bw else 'RGBA'
        sc.render.image_settings.color_depth = '16' if sixteen else '8'
        sc.view_settings.view_transform = 'Raw' if raw else 'Standard'
        # Light passes are written 4x dimmer so bright firelight never clips
        # (clipping one channel shifts the hue); scene_post scales back up.
        sc.view_settings.exposure = LIGHT_EXPOSURE if (raw and not bw) else 0.0

    def _render(self, path):
        self.scene.render.filepath = path
        bpy.ops.render.render(write_still=True)

    def _variant_bbox(self, v, margin=6):
        bpy.context.view_layer.update()
        cam = self.scene.camera
        xs, ys = [], []
        for p in v['parts']:
            o = p['obj']
            for c in o.bound_box:
                co = world_to_camera_view(self.scene, cam, o.matrix_world @ Vector(c))
                xs.append(co.x * self.resx)
                ys.append((1 - co.y) * self.resy)
        x0 = max(0, int(min(xs)) - margin)
        y0 = max(0, int(min(ys)) - margin)
        x1 = min(self.resx, int(math.ceil(max(xs))) + margin)
        y1 = min(self.resy, int(math.ceil(max(ys))) + margin)
        return [x0, y0, x1, y1]

    def _render_variants(self, out, light_states, light_samples):
        """Each variant alone, in the room's light: room parts stay in the
        scene (shadows, bounce) but are invisible to the camera, and only the
        variant's screen box is rendered."""
        done = []
        sc = self.scene
        for v in self.variants:
            bb = self._variant_bbox(v)
            d = os.path.join(out, 'variants', v['slot'] + '__' + v['key'])
            os.makedirs(d, exist_ok=True)
            self._active_var = v
            for p in self.parts:
                p['obj'].visible_camera = p['var'] is v
            sc.render.use_border = True
            sc.render.use_crop_to_border = False
            sc.render.border_min_x, sc.render.border_max_x = bb[0] / self.resx, bb[2] / self.resx
            sc.render.border_min_y, sc.render.border_max_y = 1 - bb[3] / self.resy, 1 - bb[1] / self.resy
            self._assign('albedo'); self._settings(1); self._render(os.path.join(d, 'albedo.png'))
            self._assign('emission'); self._settings(1); self._render(os.path.join(d, 'emission.png'))
            self._assign('id'); self._settings(1, raw=True); sc.view_settings.exposure = 0.0; self._render(os.path.join(d, 'id.png'))
            if any(p.get('fol') or self._nature(p) for p in v['parts']):
                self._assign('leaf'); self._settings(1); self._render(os.path.join(d, 'leaf.png'))
            self._assign('depth'); self._settings(1, raw=True, sixteen=True, bw=True); self._render(os.path.join(d, 'depth.png'))
            for name, state in light_states.items():
                self._sky(state)
                self._assign('light', state); self._settings(light_samples, raw=True, sixteen=True)
                self._render(os.path.join(d, 'light_' + name + '.png'))
            if getattr(self, '_lit', False):
                self._lit_passes(d, light_states, self._lit_samples)
            done.append({'slot': v['slot'], 'key': v['key'], 'dir': os.path.relpath(d, out), 'bbox': bb})
        self._active_var = None
        sc.render.use_border = False
        for p in self.parts:
            p['obj'].visible_camera = True
        return done

    # ---- day and night (js/clock.js): a scene lit for one time of day gets the others derived ----------------------
    def _sky(self, state):
        """The ambient sky for a light pass: the state's own `_world`, else the scene's."""
        col, st = (state or {}).get('_world', self._world_default)
        bg = self.scene.world.node_tree.nodes.get('Background')
        bg.inputs['Color'].default_value = lin(hexc(col))
        bg.inputs['Strength'].default_value = st

    def _nearest_along(self, at, n):
        """The least distance, along direction n from the point `at`, of any vertex of the scene (negative: behind)."""
        import numpy as np
        bpy.context.view_layer.update()
        best = math.inf
        nv = np.array(n[:])
        for p in self.parts:
            o = p['obj']
            if o.type != 'MESH' or not len(o.data.vertices):
                continue
            co = np.empty(len(o.data.vertices) * 3)
            o.data.vertices.foreach_get('co', co)
            co = co.reshape(-1, 3)
            m = np.array(o.matrix_world)
            w = co @ m[:3, :3].T + m[:3, 3]
            best = min(best, float(((w - np.array(at[:])) @ nv).min()))
        return best

    def _cycle_states(self, cycle, light_states, world_light):
        """cycle 'night' (lit by the moon and lamps, like Lumar) or 'day' (a sun, like Verdance), or a dict with
        `base` and any of: sun / dusk_sun / moon ((direction, colour, strength) — the moon's strength is a fraction of
        the usual), day_sky / dusk_sky / night_sky ((colour, strength)), lamps_day (how much lamps cast by day).
        The sky lights already in the scene (its suns, and area lights eight tiles or more across) and the lamps
        (everything else) are scaled per state by `_sky` and `_art`; the derived sun, dusk sun and moon are lights of
        their own (groups `_day`, `_dusk`, `_moon`, off unless a state turns them on). Returns (states, map)."""
        c = {'base': cycle} if isinstance(cycle, str) else dict(cycle)
        base = c.get('base', 'night')
        day_sky, dusk_sky, night_sky = c.get('day_sky', ('#a8c4e0', 0.85)), c.get('dusk_sky', ('#66708a', 0.55)), c.get('night_sky', ('#2a3450', 0.6))
        sun = c.get('sun', ((0.62, 0.42, -0.62), '#ffe2b0', 4.2))
        dsun = c.get('dusk_sun', ((0.92, 0.12, -0.24), '#ffa45e', 3.0))       # low and gold, the shadows cool
        states = dict(light_states)
        first = list(states)[0]
        if base == 'night':
            for v in states.values():
                v.setdefault('_world', world_light)
            self.sun(sun[0], sun[1], sun[2], group='_day'); self.lights[-1]['default'] = 0.0
            self.sun(dsun[0], dsun[1], dsun[2], group='_dusk'); self.lights[-1]['default'] = 0.0
            night = dict(states[first])
            states['day'] = {'_day': 1.0, '_sky': 0.0, '_art': c.get('lamps_day', 0.0), '_emit': 0.25, '_world': day_sky}
            dusk = {k: v for k, v in night.items() if not k.startswith('_')}
            dusk.update({'_dusk': 1.0, '_sky': 0.3, '_art': 0.85, '_emit': 0.85, '_world': dusk_sky})
            states['dusk'] = dusk
            return states, {'day': 'day', 'dusk': 'dusk', 'night': first}
        # lit by day: add a moon over the whole place, and the lamps come up at night. An area light lights only the
        # side of its plane it faces: on a long map (the pistes, the Park) the tilted plane passed under the far end,
        # and a straight-edged wedge of the place had no moon at all. So it stands back along its own direction until
        # everything built is in front of it, turned up to light the middle of the map as before.
        size = float(max(self.cols, self.rows))
        moon = c.get('moon', ((-0.35, 0.3, -0.9), '#8a98d0', 1.0))
        rot = (math.radians(-25), math.radians(10), 0)
        if 'moon' in c:                                    # its own way (a wall facing you wants it from the front, or
            d = Vector((moon[0][0], -moon[0][1] * S, moon[0][2])).normalized()     # it's in its own shadow all night)
            rot = tuple(d.to_track_quat('-Z', 'Y').to_euler())
        n = Euler(rot).to_matrix() @ Vector((0, 0, -1))
        at = Vector((self.cols / 2, -self.rows / 2 * S, 15.0))
        near = self._nearest_along(at, n)
        back = max(0.0, 2.0 - near)
        d0 = (Vector((self.cols / 2, -self.rows / 2 * S, 0.0)) - at).dot(n)

        def seen(h):                                       # how much of the light a point h below its middle sees
            a = size / 2 / h
            q = a / math.sqrt(1 + a * a)
            return 4 * q * math.atan(q) / math.pi
        at = at - n * back
        self.area_light(at.x, -at.y / S, at.z, moon[1], 1.6 * size * size * moon[2] * seen(d0) / seen(d0 + back), size,
                        rot=rot, group='_moon')
        if back:
            print('moon stood back %.1f tiles (nearest part %.1f in front of where it was)' % (back, near))
        self.lights[-1]['default'] = 0.0
        self.sun(dsun[0], dsun[1], dsun[2], group='_dusk'); self.lights[-1]['default'] = 0.0
        for v in states.values():
            v.setdefault('_world', world_light)
            v.setdefault('_art', c.get('lamps_day', 0.35))
            v.setdefault('_emit', 0.4)
        states['dusk'] = {'_dusk': 1.0, '_sky': 0.0, '_art': 0.8, '_emit': 0.8, '_world': dusk_sky}
        states['night'] = {'_moon': 1.0, '_sky': 0.0, '_art': 1.0, '_emit': 1.0, '_world': night_sky}
        return states, {'day': first, 'dusk': 'dusk', 'night': 'night'}

    # ---- live light (js/litscene.js) ------------------------------------------------------------------------------
    def _lit_on(self, cycle):
        """Whether to render the live-light passes: any scene with a day (cycle), or SCENE_LIT=1; SCENE_NOLIT=1 never."""
        if os.environ.get('SCENE_NOLIT'):
            return False
        return bool(cycle or os.environ.get('SCENE_CYCLE') or os.environ.get('SCENE_LIT'))

    def _lit_lights(self):
        """The six white suns of LIT_SUNS, off unless a lit pass turns one on (groups _lsun0 … _lsun5)."""
        self._lsuns = []
        for i, (u, d) in enumerate(LIT_SUNS):
            self.sun(d, '#ffffff', LIT_SUN, angle=2.0, group='_lsun%d' % i)
            self.lights[-1]['default'] = 0.0
            self._lsuns.append(self.lights[-1])

    def _lit_passes(self, d, light_states, samples):
        """Into d: normal.png (world normal × 0.5 + 0.5), lit_sky.png (a white sky dome alone), lit_sun<i>.png (each
        white sun alone, with its shadows), lit_lamps.png (the scene's own lamps and glowing parts, no sky). Everything
        white diffuse; in the sky and sun passes a glowing part is lit like any surface (else it's a black hole by day)
        and the grass casts no shadow."""
        sc = self.scene
        self._sky({'_world': ('#000000', 0.0)})
        self._assign('albedo')
        for p in self.parts:
            if p['albedo'] != 'HOLDOUT':
                p['obj'].data.materials[0] = self._normal_mat()
        self._settings(1, raw=True)
        sc.view_settings.exposure = 0.0
        self._render(os.path.join(d, 'normal.png'))
        off = {'_sky': 0.0, '_art': 0.0, '_emit': 0.0, '_emitdiffuse': True, '_nograss': True}
        # white light, so one channel says it all: 16-bit grey (an RGBA PNG reads back as 8 bits a channel), still
        # written 4x dimmer so a sunlit wall never clips
        def grey():
            self._settings(samples, raw=True, sixteen=True, bw=True)
            sc.view_settings.exposure = LIGHT_EXPOSURE
        self._sky({'_world': ('#ffffff', LIT_SKY)})
        self._assign('light', dict(off, _world=('#ffffff', LIT_SKY)))
        grey()
        self._render(os.path.join(d, 'lit_sky.png'))
        self._sky({'_world': ('#000000', 0.0)})
        for i in range(len(LIT_SUNS)):
            self._assign('light', dict(off, **{'_lsun%d' % i: 1.0, '_world': ('#000000', 0.0)}))
            grey()
            self._render(os.path.join(d, 'lit_sun%d.png' % i))
        # the lamps as the scene's first state has them (its flame groups and all), the sky and any sun off
        first = {k: v for k, v in list(light_states.values())[0].items() if not k.startswith('_')}
        self._assign('light', dict(first, _sky=0.0, _art=1.0, _emit=1.0, _world=('#000000', 0.0)))
        self._settings(samples, raw=True, sixteen=True)
        self._render(os.path.join(d, 'lit_lamps.png'))

    def _lit_mirror(self, out):
        """Still water (ponds, streams, basins) as a perfect mirror of the flat colours: what stands in or over it (posts,
        reeds, a jetty, the bank) seen upside down. The sky is keyed magenta (scene_post takes it out). Then the same
        with only what glows (refl_glow.png), for lit windows and lanterns streaking down the water after dark."""
        water = [p for p in self.parts if self._is_water(p) and p['var'] is None]
        if not water:
            return False
        sc = self.scene
        mm = self._mirror_mat()
        for name, kind, world in (('refl.png', 'albedo', ('#ff00ff', 1.0)), ('refl_glow.png', 'emission', ('#000000', 0.0))):
            if kind == 'emission' and not any(p['emit'] for p in self.parts):
                continue
            self._sky({'_world': world})
            self._assign(kind)
            for p in water:
                p['obj'].data.materials[0] = mm
            for L in self.lights:
                L['obj'].hide_render = True
            self._settings(16)
            sc.cycles.use_denoising = False
            sc.cycles.max_bounces = 2
            sc.cycles.glossy_bounces = 2
            self._render(os.path.join(out, name))
        sc.cycles.max_bounces = 12
        sc.cycles.glossy_bounces = 4
        return True

    def _wet_word(self, p):
        w = set((p.get('pname') or '').lower().split('_'))
        hits = [v for k_, v in self.wet.items() if k_ in w]
        return max(hits) if hits else 0.0

    def _wet_mirror(self, out):
        """A wet street (Arcadia after the rain; `k.wet = {word: strength}`): the parts named with one of those words —
        the road, the paving, puddles — as a perfect mirror, once of the flat colours (wet.png, the sky keyed magenta) and
        once of what glows alone (wet_glow.png). scene_post lays them over each light state, the neon smeared down the
        wet ground, as strong as each part's strength (render.json `wet`: {part name: strength})."""
        wet = [p for p in self.parts if p['var'] is None and self._wet_word(p) > 0]
        if not wet:
            return None
        sc = self.scene
        mm = self._mirror_mat()
        for name, kind, world in (('wet.png', 'albedo', ('#ff00ff', 1.0)), ('wet_glow.png', 'emission', ('#000000', 0.0))):
            self._sky({'_world': world})
            self._assign(kind)
            for p in wet:
                p['obj'].data.materials[0] = mm
            for L in self.lights:
                L['obj'].hide_render = True
            self._settings(16)
            sc.cycles.use_denoising = False
            sc.cycles.max_bounces = 2
            sc.cycles.glossy_bounces = 2
            self._render(os.path.join(out, name))
        sc.cycles.max_bounces = 12
        sc.cycles.glossy_bounces = 4
        return {p['pname']: self._wet_word(p) for p in wet}

    def _id_names(self):
        """The id pass's colour of each part name (as rendered: raw, so the values themselves)."""
        return {'%d,%d,%d' % id_rgb(pid): name for name, pid in self.pid_names.items()}

    def _merge(self):
        """SCENE_MERGE=1: before the passes, parts that render alike (the same albedo, glow, part, variant, foliage and
        tree, ground or not) are joined into one object each, their modifiers applied — the same pixels in every pass,
        but a district of twenty thousand parts syncs a few thousand objects a pass instead. Ground parts keep their
        own objects (their grain is in their own coordinates)."""
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        groups, order = {}, []
        for p in self.parts:
            if p['albedo'] == 'HOLDOUT' or self._ground(p):
                key = ('own', id(p))
            else:
                v = p.get('var')
                key = (str(p['albedo']), str(p.get('emit')), p['pid'], id(v) if v is not None else None, p.get('fol'),
                       p.get('tree', 0), p.get('nature'))
            if key not in groups:
                groups[key] = []
                order.append(key)
            groups[key].append(p)
        out, before, dead = [], len(self.parts), []
        for key in order:
            ps = groups[key]
            if len(ps) == 1:
                out.append(ps[0])
                continue
            bm = bmesh.new()
            for p in ps:
                eo = p['obj'].evaluated_get(dg)
                me = eo.to_mesh()
                me.transform(p['obj'].matrix_world)
                bm.from_mesh(me)
                eo.to_mesh_clear()
            me = bpy.data.meshes.new('merged')
            bm.to_mesh(me)
            bm.free()
            o = bpy.data.objects.new('merged', me)
            self.scene.collection.objects.link(o)
            o.data.materials.append(bpy.data.materials.new('tmp'))
            dead += [p['obj'] for p in ps]
            q = dict(ps[0])
            q['obj'] = o
            out.append(q)
            v = q.get('var')
            if v is not None:
                gone = set(map(id, ps))
                v['parts'] = [x for x in v['parts'] if id(x) not in gone] + [q]
        bpy.data.batch_remove(dead)                    # (one by one, twenty thousand removals take most of an hour)
        self.parts = out
        if hasattr(self, '_names'):
            del self._names
        print('scenekit: merged %d parts into %d objects' % (before, len(self.parts)), flush=True)

    def render(self, out, light_states=None, probe_z=0.9, light_samples=160, world_light=('#202838', 0.25), cycle=None):
        """light_states: {'name': {group: multiplier}} — one light pass each (keys starting `_` are the cycle's:
        `_sky`, `_art`, `_emit`, `_world`; see _cycle_states). cycle: derive the other times of day (js/clock.js).
        SCENE_NORENDER=1 skips the render: a script re-run then only rewrites its world JSON
        (collisions, interactions, actors) against the scene already in place."""
        for fn in self.later:                              # what grows over the finished layout (the grass)
            fn()
        self.later = []
        if os.environ.get('SCENE_MERGE'):
            self._merge()
        if os.environ.get('SCENE_NORENDER'):
            return
        os.makedirs(out, exist_ok=True)
        light_samples = int(os.environ.get('SCENE_SAMPLES', light_samples))     # a quick look: SCENE_SAMPLES=16
        light_states = light_states or {'full': {}}
        self._world_default = world_light
        cmap = None
        if cycle or os.environ.get('SCENE_CYCLE'):
            light_states, cmap = self._cycle_states(cycle or os.environ.get('SCENE_CYCLE'), light_states, world_light)
        lit = self._lit_on(cycle)
        if lit:
            self._lit_lights()
        self._lit_samples = min(light_samples, int(os.environ.get('SCENE_LIT_SAMPLES', 64)))
        print('scenekit: %d parts, %d lights' % (len(self.parts), len(self.lights)), flush=True)
        self._camera()
        sc = self.scene
        # Dim ambient sky so unlit corners aren't pure black
        sc.world.use_nodes = True
        self._sky(None)

        self._assign('albedo'); self._settings(1); self._render(os.path.join(out, 'albedo.png'))
        self._assign('emission'); self._settings(1); self._render(os.path.join(out, 'emission.png'))
        self._assign('id'); self._settings(1, raw=True); sc.view_settings.exposure = 0.0; self._render(os.path.join(out, 'id.png'))
        if any((p.get('fol') or self._nature(p)) and p['var'] is None for p in self.parts):
            self._assign('leaf'); self._settings(1); self._render(os.path.join(out, 'leaf.png'))
        self._assign('depth'); self._settings(1, raw=True, sixteen=True, bw=True); self._render(os.path.join(out, 'depth.png'))
        if self.water_z is not None:
            self._assign('height'); self._settings(1, raw=True, sixteen=True, bw=True); self._render(os.path.join(out, 'height.png'))
        for name, state in light_states.items():
            self._sky(state)
            self._assign('light', state); self._settings(light_samples, raw=True, sixteen=True)
            self._render(os.path.join(out, 'light_' + name + '.png'))

        # Probe: light at character height across the floor (scene objects
        # still cast shadows but are invisible to the camera).
        for p in self.parts:
            p['obj'].visible_camera = False
        bpy.ops.mesh.primitive_plane_add(size=1)
        pl = bpy.context.active_object
        pl.scale = (self.cols, self.rows * S, 1)
        bpy.ops.object.transform_apply(scale=True)
        pl.location = (self.cols / 2, -self.rows / 2 * S, probe_z)
        pl.data.materials.append(self._white_diffuse())
        for name, state in light_states.items():
            self._sky(state)
            self._assign('light', state)
            self._settings(64, raw=True, sixteen=True)
            self._render(os.path.join(out, 'probe_' + name + '.png'))
        bpy.data.objects.remove(pl)
        for p in self.parts:
            p['obj'].visible_camera = True

        wet = self._wet_mirror(out) if self.wet else None
        refl = False
        if lit:
            self._lit_passes(out, light_states, self._lit_samples)
            refl = self._lit_mirror(out)
        self._lit = lit
        variants = self._render_variants(out, light_states, light_samples)

        meta = {
            'cols': self.cols, 'rows': self.rows,
            'width': self.resx, 'height': self.resy,
            'originX': self.origin[0], 'originY': self.origin[1],
            'theta': math.degrees(THETA),
            'camDot': self.cam_dot, 'zmin': self.zmin, 'zmax': self.zmax,
            'probeZ': probe_z,
            'lightStates': list(light_states),
            'stateOpts': {n: {'emit': st.get('_emit', 1.0)} for n, st in light_states.items()},
            'cycle': cmap,
            'blocked': sorted([list(b) for b in self.blocked]),
            'variants': variants,
            'ids': self._id_names(),
        }
        if lit:
            meta['lit'] = {'suns': [{'u': u, 'dir': d} for u, d in LIT_SUNS], 'sun': LIT_SUN, 'sky': LIT_SKY,
                           'refl': refl, 'base': (cycle if isinstance(cycle, str) else (cycle or {}).get('base')) if cycle
                           else os.environ.get('SCENE_CYCLE')}
        if self.water_z is not None:
            meta['waterZ'] = self.water_z
            meta['heightRange'] = HEIGHT_RANGE
        if wet:
            meta['wet'] = wet
        json.dump(meta, open(os.path.join(out, 'render.json'), 'w'), indent=1)
        return meta


def apply_world(path, kit, floor, doors=(), moves=None, actors=(), scene_id=None, extra_walkable=(), scene_extra=None):
    """Rewrite a world JSON to match a built scene.

    floor: (c0, r0, c1, r1) inclusive tile range of the room floor; tiles in it
    are walkable unless an object marked them solid. doors / extra_walkable:
    tiles that stay walkable outside the floor. moves: {label: (x, y) or
    [(x, y), …]} — interactions keep their text and move onto their objects;
    repeated labels take positions in order. actors: NPC sprites.
    """
    w = json.load(open(path))
    # keep the hand-made tile layout the first time, so scripts that build
    # from it (islands, harbour) can be re-run on an already-converted world
    if 'designTiles' not in w and 'scene' not in w:
        w['designTiles'] = w.get('tiles')
        w['designTileNames'] = w.get('tileNames')
    cols, rows = w['width'], w['height']
    c0, r0, c1, r1 = floor
    walk_extra = set(map(tuple, doors)) | set(map(tuple, extra_walkable))
    coll, tiles = [], []
    for r in range(rows):
        crow, trow = [], []
        for c in range(cols):
            on_floor = c0 <= c <= c1 and r0 <= r <= r1
            if (c, r) in walk_extra:
                crow.append(0); trow.append(3)
            elif on_floor and (c, r) not in kit.blocked:
                crow.append(0); trow.append(2)
            elif on_floor:
                crow.append(1); trow.append(4)
            else:
                crow.append(1); trow.append(1)
        coll.append(crow)
        tiles.append(trow)
    w['collisions'] = coll
    w['tiles'] = tiles
    w['tileNames'] = {'0': 'void', '1': 'wall', '2': 'floor', '3': 'door', '4': 'furniture'}
    seen = {}
    for it in w.get('interactions', []):
        lab = it.get('label')
        if moves and lab in moves:
            dest = moves[lab]
            if isinstance(dest, list):
                i = seen.get(lab, 0)
                seen[lab] = i + 1
                dest = dest[min(i, len(dest) - 1)]
            it['x'], it['y'] = dest
    for key in ('lighting', 'tileGlow', 'ambientGlow'):
        w.pop(key, None)
    w['scene'] = {'id': scene_id, 'flicker': {'from': 'dim', 'to': 'full'}, 'actors': list(actors)}
    for key, val in (scene_extra or {}).items():
        if isinstance(val, dict) and isinstance(w['scene'].get(key), dict):
            w['scene'][key].update(val)
        else:
            w['scene'][key] = val
    open(path, 'w').write(json.dumps(w, indent=2) + '\n')
    return w
