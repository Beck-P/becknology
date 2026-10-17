"""Look Book 2: render one framed crop of a real Bridge scene as a G-buffer the page relights live.

  ~/BVENV/bin/python lookkit.py <scene script> <out dir> --ts 32,48 --crop <name> c0 r0 c1 r1 [--crop ...] [--samples 32]
  → <out dir>/<name>-<ts>/

Runs the repo's scene script unchanged (tools/bridge-art/scenes/*.py), but swaps Kit.render for a render of just the
crop (in tiles, fractional ok) at --ts px a tile, and stops the script right after, so nothing in the repo is written
(the scripts rewrite their world JSON after rendering). Passes written to <out>:

  albedo.png  emission.png  id.png  leaf.png  normal.png   flat, 1 sample
  depth.png  height.png                                     16-bit
  light_sky.png      white sky dome only (ambient + occlusion)
  light_sun<i>.png   one white sun at each of SUNS (cast shadows), the scene's own lights off
  light_lamps.png    the scene's own lamps (not its suns/sky), emissive parts glowing
  refl.png           water and anything below the waterline as a perfect mirror of the flat colours (if the scene has water)
  render.json        sizes, the crop, the suns, the part names by id colour
Then pack.py turns these into the page's assets.
"""
import json
import math
import os
import runpy
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.environ.get('BRIDGE_REPO', '/home/user/becknology')
sys.path.insert(0, os.path.join(REPO, 'tools', 'bridge-art'))

import bpy  # noqa: E402
import scenekit  # noqa: E402
from mathutils import Vector  # noqa: E402

# The sun through the day: (hour, direction the light travels (x east, row toward the viewer, z up)). Shadows always
# fall a little toward the viewer (the sun is on the far side, as in the game's day scenes), swinging from left in the
# morning to right in the evening.
SUNS = [
    (6.9, (-0.93, 0.30, -0.20)),
    (9.2, (-0.66, 0.46, -0.58)),
    (12.4, (-0.10, 0.44, -0.89)),
    (15.4, (0.56, 0.48, -0.66)),
    (17.9, (0.86, 0.40, -0.31)),
    (19.3, (0.94, 0.30, -0.14)),
]


def args():
    a = sys.argv[1:]
    scene, out = a[0], a[1]
    o = {'ts': [48], 'crops': [], 'samples': 48, 'sun_strength': 3.0, 'sky_strength': 1.0, 'refl': 'auto', 'margin': 0, 'mirror': []}
    i = 2
    while i < len(a):
        if a[i] == '--ts':
            o['ts'] = [int(v) for v in a[i + 1].split(',')]; i += 2
        elif a[i] == '--crop':
            o['crops'].append((a[i + 1], [float(v) for v in a[i + 2:i + 6]])); i += 6
        elif a[i] == '--samples':
            o['samples'] = int(a[i + 1]); i += 2
        elif a[i] == '--no-refl':
            o['refl'] = False; i += 1
        elif a[i] == '--refl':
            o['refl'] = True; i += 1
        elif a[i] == '--mirror':
            o['mirror'] = a[i + 1].split(','); i += 2
        elif a[i] == '--sun':
            o['sun_strength'] = float(a[i + 1]); i += 2
        else:
            raise SystemExit('unknown option ' + a[i])
    return scene, os.path.abspath(out), o


SCENE, OUT, OPT = args()
scenekit.TS = OPT['ts'][0]
scenekit.apply_world = lambda *a, **k: None        # belt and braces: the scripts must not touch the repo


def _normal_mat(self):
    m = bpy.data.materials.get('lk_normal')
    if m:
        return m

    def fn(nt, em):
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        vm = nt.nodes.new('ShaderNodeVectorMath'); vm.operation = 'MULTIPLY_ADD'
        vm.inputs[1].default_value = (0.5, 0.5, 0.5)
        vm.inputs[2].default_value = (0.5, 0.5, 0.5)
        nt.links.new(geo.outputs['Normal'], vm.inputs[0])
        nt.links.new(vm.outputs['Vector'], em.inputs['Color'])
    m = self._emission_mat('lk_normal', fn)
    return m


def _mirror_mat():
    m = bpy.data.materials.get('lk_mirror')
    if m:
        return m
    m = bpy.data.materials.new('lk_mirror')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    g = nt.nodes.new('ShaderNodeBsdfGlossy')
    g.inputs['Roughness'].default_value = 0.0
    g.inputs['Color'].default_value = (1, 1, 1, 1)
    nt.links.new(g.outputs['BSDF'], out.inputs['Surface'])
    return m


def lk_render(self, out, light_states=None, probe_z=0.9, light_samples=160, world_light=('#202838', 0.25), cycle=None):
    for fn in self.later:
        fn()
    self.later = []
    self._lk_suns = []
    for h, d in SUNS:
        self.sun(d, '#ffffff', OPT['sun_strength'], angle=2.0, group='_lk_sun')
        self._lk_suns.append(self.lights[-1])
    self._world_default = ('#000000', 0.0)
    global OUT, CROP
    base = OUT
    for name, crop in (OPT['crops'] or [('all', None)]):
        for ts in OPT['ts']:
            scenekit.TS = ts
            CROP = crop
            OUT = os.path.join(base, name + '-' + str(ts))
            if os.path.exists(os.path.join(OUT, 'render.json')):
                print('LOOKKIT skip (done)', OUT, flush=True)       # resumable: a finished crop isn't rendered again
                continue
            _render_one(self)
    raise SystemExit(0)


def _render_one(self):
    os.makedirs(OUT, exist_ok=True)
    TS = scenekit.TS
    self._camera()
    sc = self.scene
    sc.world.use_nodes = True
    ox, oy = self.origin
    c0, r0, c1, r1 = CROP or [0, -self.mt, self.cols, self.rows + self.mb]
    x0 = max(0, int(round(ox + c0 * TS))); x1 = min(self.resx, int(round(ox + c1 * TS)))
    y0 = max(0, int(round(oy + r0 * TS))); y1 = min(self.resy, int(round(oy + r1 * TS)))
    sc.render.use_border = True
    sc.render.use_crop_to_border = True
    sc.render.border_min_x, sc.render.border_max_x = x0 / self.resx, x1 / self.resx
    sc.render.border_min_y, sc.render.border_max_y = 1 - y1 / self.resy, 1 - y0 / self.resy

    def flat(kind, name, linear=False, **kw):
        self._sky({'_world': ('#000000', 0.0)})
        self._assign(kind)
        self._settings(1, raw=kw.pop('raw', False) or linear, **kw)
        if linear:
            sc.view_settings.exposure = 0.0      # ids and normals: the values themselves, no light-pass exposure
        self._render(os.path.join(OUT, name))

    flat('albedo', 'albedo.png')
    flat('emission', 'emission.png')
    flat('id', 'id.png', linear=True)
    flat('leaf', 'leaf.png')
    flat('depth', 'depth.png', raw=True, sixteen=True, bw=True)
    flat('height', 'height.png', raw=True, sixteen=True, bw=True)
    # normals (world space, flat-shaded faces stay flat)
    self._assign('albedo')
    for p in self.parts:
        if p['albedo'] != 'HOLDOUT':
            p['obj'].data.materials[0] = _normal_mat(self)
    self._settings(1, raw=True)
    sc.view_settings.exposure = 0.0
    self._render(os.path.join(OUT, 'normal.png'))

    # light passes: white diffuse everywhere; choose which lights are on
    lamps = [L for L in self.lights if not L.get('sky')]
    suns = self._lk_suns

    def light(name, on, world, emit):
        self._sky({'_world': world})
        self._assign('light', {'_emit': emit})
        for L in self.lights:
            L['obj'].hide_render = not any(L is x for x in on)
            L['obj'].data.energy = L['energy']
        for p in self.parts:
            n = (p.get('pname') or '').replace('ground_', '').replace('coast_', '')
            if n in scenekit.Kit.GRASS_PARTS or self._nature(p) == 'grass' or n.startswith(('meadow', 'tuft', 'flower', 'clover', 'reed')):
                p['obj'].visible_shadow = False
            # in the sky and sun passes a glowing part (glass, sea glass, trail stones) is lit like any surface; it only
            # glows in the lamps pass — otherwise it's a black hole by day
            if not emit and p['emit'] and p['albedo'] != 'HOLDOUT':
                p['obj'].data.materials[0] = self._white_diffuse()
                p['obj'].visible_shadow = True
        self._settings(OPT['samples'], raw=True, sixteen=True)
        self._render(os.path.join(OUT, name))

    light('light_sky.png', [], ('#ffffff', OPT['sky_strength']), 0.0)
    for i, L in enumerate(suns):
        light('light_sun%d.png' % i, [L], ('#000000', 0.0), 0.0)
    has_lamps = bool(lamps) or any(p['emit'] for p in self.parts)
    if has_lamps:
        light('light_lamps.png', lamps, ('#000000', 0.0), 1.0)

    # water as a mirror of the flat colours (the page ripples it and tints it by the sky and the hour)
    water_parts = [p for p in self.parts if (p.get('pname') or '').replace('ground_', '').replace('coast_', '') in scenekit.Kit.WATER_PARTS
                   or self._nature(p) == 'water' or any(m in (p.get('pname') or '') for m in OPT['mirror'])]
    refl = OPT['refl'] if OPT['refl'] != 'auto' else bool(water_parts or self.water_z is not None)
    if refl:
        plane = None
        self._sky({'_world': ('#ff00ff', 1.0)})
        self._assign('albedo')
        mm = _mirror_mat()
        for p in water_parts:
            p['obj'].data.materials[0] = mm
        if self.water_z is not None:
            bpy.ops.mesh.primitive_plane_add(size=1)
            plane = bpy.context.active_object
            plane.scale = (self.cols + 20, (self.rows + 20) * scenekit.S, 1)
            plane.location = (self.cols / 2, -self.rows / 2 * scenekit.S, self.water_z)
            plane.data.materials.append(mm)
        for L in self.lights:
            L['obj'].hide_render = True
        self._settings(16, raw=False)
        sc.cycles.use_denoising = False
        sc.cycles.max_bounces = 2
        sc.cycles.glossy_bounces = 2
        self._render(os.path.join(OUT, 'refl.png'))
        # the lit things alone in the mirror (windows, lanterns, neon): the page streaks them across the water at night
        if any(p['emit'] for p in self.parts):
            self._sky({'_world': ('#000000', 0.0)})
            self._assign('emission')
            for p in water_parts:
                p['obj'].data.materials[0] = mm
            if plane:
                plane.data.materials[0] = mm
            for L in self.lights:
                L['obj'].hide_render = True
            self._settings(16, raw=False)
            sc.cycles.use_denoising = False
            sc.cycles.max_bounces = 2
            sc.cycles.glossy_bounces = 2
            self._render(os.path.join(OUT, 'refl_glow.png'))
        if plane:
            bpy.data.objects.remove(plane)

    names = {}
    for name, pid in self.pid_names.items():
        names['%d,%d,%d' % (round(((pid * 37) % 251) / 255 * 255), round(((pid * 91) % 251) / 255 * 255), round(((pid * 53) % 251) / 255 * 255))] = name
    meta = {
        'scene': os.path.basename(SCENE), 'ts': TS, 'crop': [c0, r0, c1, r1], 'px': [x0, y0, x1, y1],
        'width': x1 - x0, 'height': y1 - y0, 'theta': 45, 'zmin': self.zmin, 'zmax': self.zmax,
        'waterZ': self.water_z, 'heightRange': scenekit.HEIGHT_RANGE, 'lightGain': 4.0,
        'suns': [{'hour': h, 'dir': d} for h, d in SUNS], 'lamps': has_lamps, 'refl': bool(refl),
        'skyStrength': OPT['sky_strength'], 'sunStrength': OPT['sun_strength'], 'ids': names,
    }
    json.dump(meta, open(os.path.join(OUT, 'render.json'), 'w'), indent=1)
    print('LOOKKIT done', OUT, meta['width'], 'x', meta['height'], flush=True)


scenekit.Kit.render = lk_render
sys.argv = [SCENE, os.path.join(OUT, '_unused')]
runpy.run_path(SCENE, run_name='__main__')
print('LOOKKIT: the script finished without calling render()')
