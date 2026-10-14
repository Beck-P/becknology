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


def _scale(x, y, z):
    return Matrix.Diagonal((x, y, z, 1.0))


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
        self._add_part({'obj': o, 'albedo': albedo, 'emit': emit, 'pid': self.pid(part)})
        return o

    def _add_part(self, d):
        d['var'] = self._var
        self.parts.append(d)
        if self._var is not None:
            self._var['parts'].append(d)

    def _add_light(self, d):
        d['var'] = self._var
        self.lights.append(d)
        if self._var is not None:
            self._var['lights'].append(d)

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

    def cyl(self, cx, cr, z0, z1, rx, albedo, part, emit=None, verts=16, ry=None, bevel=0.0):
        o = self._make('cyl', _scale(rx, ry if ry is not None else rx, z1 - z0), (cx, cr, (z0 + z1) / 2), verts=verts)
        return self._finish(o, albedo, part, emit, bevel, smooth=True)

    def _finish_axis(self, o, albedo, part, emit, axis):
        for p in o.data.polygons:
            p.use_smooth = abs(p.normal[axis]) < 0.5
        o.data.materials.append(bpy.data.materials.new('tmp'))
        self._add_part({'obj': o, 'albedo': albedo, 'emit': emit, 'pid': self.pid(part)})
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
        self._add_light({'obj': o, 'energy': energy, 'group': group})
        return o

    def solid(self, x0, r0, x1, r1):
        """Mark tiles [x0,x1) × [r0,r1) as blocked for the collision map
        (ignored inside a variant: decor doesn't change collisions)."""
        if self._var is not None:
            return
        for c in range(int(x0), int(math.ceil(x1))):
            for r in range(int(r0), int(math.ceil(r1))):
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

    def _albedo_mat(self, spec):
        """spec: '#hex' or ('#hex', grain) — grain adds per-pixel noise."""
        if isinstance(spec, str):
            spec = (spec, 0.0)
        hx, grain = spec[0], spec[1]

        def fn(nt, em):
            if not grain:
                em.inputs['Color'].default_value = lin(hexc(hx))
                return
            noise = nt.nodes.new('ShaderNodeTexNoise')
            noise.inputs['Scale'].default_value = 9.0
            noise.inputs['Detail'].default_value = 2.0
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
                key = ('a', str(p['albedo']))
                if key not in cache:
                    cache[key] = self._albedo_mat(p['albedo'])
                m = cache[key]
            elif kind == 'light':
                if p['emit']:
                    key = ('le', p['emit'][0])
                    if key not in cache:
                        cache[key] = self._flat_emission(p['emit'][0], p['emit'][1] if len(p['emit']) > 1 else 1.0)
                    m = cache[key]
                else:
                    m = self._white_diffuse()
            elif kind == 'emission':
                key = ('e', p['emit'][0] if p['emit'] else None)
                if key not in cache:
                    cache[key] = self._flat_emission(p['emit'][0] if p['emit'] else '#000000')
                m = cache[key]
            elif kind == 'id':
                pid = p['pid']
                key = ('i', pid)
                if key not in cache:
                    cache[key] = self._flat_rgb((((pid * 37) % 251) / 255, ((pid * 91) % 251) / 255, ((pid * 53) % 251) / 255))
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
            o.data.materials[0] = m
            # glowing parts (lamp glass, flames) must not block their own light
            o.visible_shadow = not p['emit']
        for L in self.lights:
            L['obj'].hide_render = kind != 'light' or (L['var'] is not None and L['var'] is not self._active_var)
            if kind == 'light' and light_state:
                L['obj'].data.energy = L['energy'] * light_state.get(L['group'], 1.0)

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
            self._assign('id'); self._settings(1); self._render(os.path.join(d, 'id.png'))
            self._assign('depth'); self._settings(1, raw=True, sixteen=True, bw=True); self._render(os.path.join(d, 'depth.png'))
            for name, state in light_states.items():
                self._assign('light', state); self._settings(light_samples, raw=True, sixteen=True)
                self._render(os.path.join(d, 'light_' + name + '.png'))
            done.append({'slot': v['slot'], 'key': v['key'], 'dir': os.path.relpath(d, out), 'bbox': bb})
        self._active_var = None
        sc.render.use_border = False
        for p in self.parts:
            p['obj'].visible_camera = True
        return done

    def render(self, out, light_states=None, probe_z=0.9, light_samples=160, world_light=('#202838', 0.25)):
        """light_states: {'name': {group: multiplier}} — one light pass each."""
        os.makedirs(out, exist_ok=True)
        light_states = light_states or {'full': {}}
        self._camera()
        sc = self.scene
        # Dim ambient sky so unlit corners aren't pure black
        sc.world.use_nodes = True
        bg = sc.world.node_tree.nodes.get('Background')
        bg.inputs['Color'].default_value = lin(hexc(world_light[0]))
        bg.inputs['Strength'].default_value = world_light[1]

        self._assign('albedo'); self._settings(1); self._render(os.path.join(out, 'albedo.png'))
        self._assign('emission'); self._settings(1); self._render(os.path.join(out, 'emission.png'))
        self._assign('id'); self._settings(1); self._render(os.path.join(out, 'id.png'))
        self._assign('depth'); self._settings(1, raw=True, sixteen=True, bw=True); self._render(os.path.join(out, 'depth.png'))
        for name, state in light_states.items():
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
            self._assign('light', state)
            self._settings(64, raw=True, sixteen=True)
            self._render(os.path.join(out, 'probe_' + name + '.png'))
        bpy.data.objects.remove(pl)
        for p in self.parts:
            p['obj'].visible_camera = True

        variants = self._render_variants(out, light_states, light_samples)

        meta = {
            'cols': self.cols, 'rows': self.rows,
            'width': self.resx, 'height': self.resy,
            'originX': self.origin[0], 'originY': self.origin[1],
            'theta': math.degrees(THETA),
            'camDot': self.cam_dot, 'zmin': self.zmin, 'zmax': self.zmax,
            'probeZ': probe_z,
            'lightStates': list(light_states),
            'blocked': sorted([list(b) for b in self.blocked]),
            'variants': variants,
        }
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
