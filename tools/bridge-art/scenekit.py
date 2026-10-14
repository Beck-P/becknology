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
import json
import math
import os
import random

import bpy
from mathutils import Vector

THETA = math.radians(45)
S = 1 / math.sin(THETA)
TS = 32
LIGHT_EXPOSURE = -2.0   # stops; keep in sync with scene_post.LIGHT_GAIN


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
        self.parts.append({'obj': o, 'albedo': albedo, 'emit': emit, 'pid': self.pid(part)})
        return o

    # ---- primitives in tile space ---------------------------------------
    def box(self, x0, r0, z0, x1, r1, z1, albedo, part, emit=None, bevel=0.0):
        bpy.ops.mesh.primitive_cube_add(size=1)
        o = bpy.context.active_object
        o.scale = (x1 - x0, (r1 - r0) * S, z1 - z0)
        bpy.ops.object.transform_apply(scale=True)
        o.location = ((x0 + x1) / 2, -(r0 + r1) / 2 * S, (z0 + z1) / 2)
        return self._finish(o, albedo, part, emit, bevel)

    def cyl(self, cx, cr, z0, z1, rx, albedo, part, emit=None, verts=16, ry=None, bevel=0.0):
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=1, depth=1)
        o = bpy.context.active_object
        o.scale = (rx, (ry if ry is not None else rx) * S, z1 - z0)
        bpy.ops.object.transform_apply(scale=True)
        o.location = (cx, -cr * S, (z0 + z1) / 2)
        return self._finish(o, albedo, part, emit, bevel, smooth=True)

    def cyl_y(self, cx, r0, r1, cz, rx, rz, albedo, part, emit=None, verts=16):
        """Cylinder lying along the rows axis (its round face toward the camera)."""
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=1, depth=1, rotation=(math.pi / 2, 0, 0))
        o = bpy.context.active_object
        bpy.ops.object.transform_apply(rotation=True)
        o.scale = (rx, (r1 - r0) * S, rz)
        bpy.ops.object.transform_apply(scale=True)
        o.location = (cx, -(r0 + r1) / 2 * S, cz)
        for p in o.data.polygons:
            p.use_smooth = abs(p.normal.y) < 0.5
        o.data.materials.append(bpy.data.materials.new('tmp'))
        self.parts.append({'obj': o, 'albedo': albedo, 'emit': emit, 'pid': self.pid(part)})
        return o

    def cyl_x(self, x0, x1, cr, cz, rr, rz, albedo, part, emit=None, verts=12):
        """Cylinder lying along the columns axis (logs, rolling pins)."""
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=1, depth=1, rotation=(0, math.pi / 2, 0))
        o = bpy.context.active_object
        bpy.ops.object.transform_apply(rotation=True)
        o.scale = (x1 - x0, rr * S, rz)
        bpy.ops.object.transform_apply(scale=True)
        o.location = ((x0 + x1) / 2, -cr * S, cz)
        for p in o.data.polygons:
            p.use_smooth = abs(p.normal.x) < 0.5
        o.data.materials.append(bpy.data.materials.new('tmp'))
        self.parts.append({'obj': o, 'albedo': albedo, 'emit': emit, 'pid': self.pid(part)})
        return o

    def sphere(self, cx, cr, cz, rx, rz, albedo, part, emit=None, ry=None, segs=16):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=max(6, segs // 2), radius=1)
        o = bpy.context.active_object
        o.scale = (rx, (ry if ry is not None else rx) * S, rz)
        bpy.ops.object.transform_apply(scale=True)
        o.location = (cx, -cr * S, cz)
        return self._finish(o, albedo, part, emit, smooth=True)

    def cone(self, cx, cr, z0, z1, r0, r1, albedo, part, emit=None, verts=12):
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=1, radius2=max(0.0001, r1 / r0), depth=1)
        o = bpy.context.active_object
        o.scale = (r0, r0 * S, z1 - z0)
        bpy.ops.object.transform_apply(scale=True)
        o.location = (cx, -cr * S, (z0 + z1) / 2)
        return self._finish(o, albedo, part, emit, smooth=True)

    def point_light(self, x, r, z, color, energy, radius=0.15, group='static'):
        ld = bpy.data.lights.new('L', 'POINT')
        ld.color = lin(hexc(color))[:3]
        ld.energy = energy
        ld.shadow_soft_size = radius
        o = bpy.data.objects.new('L', ld)
        self.scene.collection.objects.link(o)
        o.location = (x, -r * S, z)
        self.lights.append({'obj': o, 'energy': energy, 'group': group})
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
        self.lights.append({'obj': o, 'energy': energy, 'group': group})
        return o

    def solid(self, x0, r0, x1, r1):
        """Mark tiles [x0,x1) × [r0,r1) as blocked for the collision map."""
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

    def _assign(self, kind, light_state=None):
        cache = {}
        for p in self.parts:
            o = p['obj']
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
            L['obj'].hide_render = kind != 'light'
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

        meta = {
            'cols': self.cols, 'rows': self.rows,
            'width': self.resx, 'height': self.resy,
            'originX': self.origin[0], 'originY': self.origin[1],
            'theta': math.degrees(THETA),
            'camDot': self.cam_dot, 'zmin': self.zmin, 'zmax': self.zmax,
            'probeZ': probe_z,
            'lightStates': list(light_states),
            'blocked': sorted([list(b) for b in self.blocked]),
        }
        json.dump(meta, open(os.path.join(out, 'render.json'), 'w'), indent=1)
        return meta


def apply_world(path, kit, floor, doors=(), moves=None, actors=(), scene_id=None, extra_walkable=()):
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
    open(path, 'w').write(json.dumps(w, indent=2) + '\n')
    return w
