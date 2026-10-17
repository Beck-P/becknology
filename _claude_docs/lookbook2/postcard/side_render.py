"""Postcard step 2: reopen the saved farm and render it from a low side camera, as passes the page relights live.

  ~/BVENV/bin/python side_render.py <farm.blend> <out dir> preview <cams.json>
      albedo only, 480×270, one PNG per camera in cams.json ({name: cam}) — for choosing the framing quickly
  ~/BVENV/bin/python side_render.py <farm.blend> <out dir> still <cam.json> [--sizes 480,720] [--samples 24]
      every pass for the final side view (six suns, sky, lamps, the pond as a mirror) → <out>/side-<32|48>/, for pack.py
  ~/BVENV/bin/python side_render.py <farm.blend> <out dir> all <shot.json> [...]
      still then move in one run (shot.json: {still: cam, anchors: {name: [col, row, z]}, move: {start, end, sun}})
  ~/BVENV/bin/python side_render.py <farm.blend> <out dir> move <move.json> [--frames 28] [--sizes 480,720]
      the camera move from the game's 45° view down to the side view: per frame albedo, flags, the sky's light and one
      sun → <out>/move-<32|48>/f<NN>/ (move_bake.py bakes them into a strip). Every output is skipped if it's already
      there, so a restart only renders what's missing.

A cam is {pos: [col, row, z], target: [col, row, z], hfov: degrees} (perspective) or {ortho: width_in_tiles, ...}.
Positions are in the game's tile units (col, row, height); Blender's y is -row × 1/sin 45° (scenekit.S).
"""
import json
import math
import os
import random
import sys

REPO = '/home/user/becknology'
sys.path.insert(0, os.path.join(REPO, 'tools', 'bridge-art'))
import bpy  # noqa: E402
import scenekit  # noqa: E402
from mathutils import Vector  # noqa: E402

BLEND, OUT, MODE, SPEC = sys.argv[1], os.path.abspath(sys.argv[2]), sys.argv[3], sys.argv[4]
opts = {'sizes': [480, 720], 'samples': 24, 'frames': 28}
i = 5
while i < len(sys.argv):
    if sys.argv[i] == '--sizes':
        opts['sizes'] = [int(v) for v in sys.argv[i + 1].split(',')]; i += 2
    elif sys.argv[i] == '--samples':
        opts['samples'] = int(sys.argv[i + 1]); i += 2
    elif sys.argv[i] == '--frames':
        opts['frames'] = int(sys.argv[i + 1]); i += 2
    else:
        raise SystemExit('unknown option ' + sys.argv[i])

# the same suns as the top-down scenes (tools/lookkit.py): the sun crosses the north sky, so from a camera looking north
# it rises on the right, stands high at noon and sets on the left, and the shadows fall toward the camera
SUNS = [
    (6.9, (-0.93, 0.30, -0.20)),
    (9.2, (-0.66, 0.46, -0.58)),
    (12.4, (-0.10, 0.44, -0.89)),
    (15.4, (0.56, 0.48, -0.66)),
    (17.9, (0.86, 0.40, -0.31)),
    (19.3, (0.94, 0.30, -0.14)),
]
S = scenekit.S

# ---- reopen the farm and rebuild the kit around it ----------------------------------------------------------------
bpy.ops.wm.open_mainfile(filepath=BLEND)
sc = bpy.context.scene
kd = json.loads(sc['lk_kit'])
k = object.__new__(scenekit.Kit)
k.scene = sc
k.cols, k.rows, k.mt, k.mb, k.mx = kd['cols'], kd['rows'], kd['mt'], kd['mb'], kd['mx']
k.water_z = kd['water_z']
k.pid_names = kd['pid_names']
k.parts, k.lights, k.variants, k.later = [], [], [], []
k._var = k._active_var = None
k._fol, k._tree = None, 0
k.rng = random.Random(1)
k.blocked = set()
VAR = {'parts': [], 'lights': []}           # a stand-in for decor variants: their parts stay hidden
for o in sc.objects:
    if 'lk_part' in o:
        d = json.loads(o['lk_part'])
        d['obj'] = o
        d['var'] = VAR if d.pop('_var') else None
        if isinstance(d.get('albedo'), list):
            d['albedo'] = tuple(d['albedo'])
        if isinstance(d.get('emit'), list):
            d['emit'] = tuple(d['emit'])
        k.parts.append(d)
    elif 'lk_light' in o:
        d = json.loads(o['lk_light'])
        d['obj'] = o
        d['var'] = VAR if d.pop('_var') else None
        k.lights.append(d)
if sc.world is None:
    sc.world = bpy.data.worlds.new('w')
try:
    sc.world.use_nodes = True
except Exception:
    pass
k._world_default = ('#000000', 0.0)
sc.render.use_persistent_data = True       # the geometry stays put between passes and frames: no rebuild each time
print('reopened', len(k.parts), 'parts', len(k.lights), 'lights', flush=True)

sun_objs = []
for h, d in SUNS:
    k.sun(d, '#ffffff', 3.0, angle=2.0, group='_lk_sun')
    sun_objs.append(k.lights[-1])


def bl(col, row, z):
    return Vector((col, -row * S, z))


cam_obj = None


def set_camera(c, resx, resy):
    """c: {pos, target, hfov} (perspective) or {pos, target, ortho} — tile units."""
    global cam_obj
    if cam_obj is None:
        cd = bpy.data.cameras.new('lk_cam')
        cam_obj = bpy.data.objects.new('lk_cam', cd)
        sc.collection.objects.link(cam_obj)
    cd = cam_obj.data
    p, t = bl(*c['pos']), bl(*c['target'])
    cam_obj.location = p
    cam_obj.rotation_euler = (t - p).to_track_quat('-Z', 'Y').to_euler()
    if c.get('ortho'):
        cd.type = 'ORTHO'
        cd.ortho_scale = c['ortho']
    else:
        cd.type = 'PERSP'
        cd.sensor_fit = 'HORIZONTAL'
        cd.sensor_width = 36.0
        cd.lens = 18.0 / math.tan(math.radians(c['hfov']) / 2)
    cd.clip_start = 0.05
    cd.clip_end = 400
    sc.camera = cam_obj
    k.resx, k.resy = resx, resy
    sc.render.use_border = False
    k.zmin, k.zmax = 0.0, 140.0
    bpy.context.view_layer.update()
    # where the horizon (straight ahead at eye height, far away) lands on the screen, as a fraction from the top
    from bpy_extras.object_utils import world_to_camera_view
    fwd = (t - p); fwd.z = 0; fwd.normalize()
    far = p + fwd * 3000
    v = world_to_camera_view(sc, cam_obj, far)
    return 1 - v.y


def project(pts):
    from bpy_extras.object_utils import world_to_camera_view
    out = {}
    for name, (c, r, z) in (pts or {}).items():
        v = world_to_camera_view(sc, cam_obj, bl(c, r, z))
        v2 = world_to_camera_view(sc, cam_obj, bl(c + 1, r, z))
        out[name] = [round(v.x * k.resx, 2), round((1 - v.y) * k.resy, 2), round(abs(v2.x - v.x) * k.resx, 3)]
    return out


def _normal_mat():
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
    return k._emission_mat('lk_normal', fn)


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


def flat(kind, path, linear=False, **kw):
    k._sky({'_world': ('#000000', 0.0)})
    k._assign(kind)
    k._settings(1, raw=kw.pop('raw', False) or linear, **kw)
    if linear:
        sc.view_settings.exposure = 0.0
    k._render(path)


def normals(path):
    k._assign('albedo')
    nm = _normal_mat()
    for p in k.parts:
        if p['albedo'] != 'HOLDOUT':
            p['obj'].data.materials[0] = nm
    k._settings(1, raw=True)
    sc.view_settings.exposure = 0.0
    k._render(path)


GRASSY = ('meadow', 'tuft', 'flower', 'clover', 'reed')


def light(path, on, world, emit, samples):
    k._sky({'_world': world})
    k._assign('light', {'_emit': emit})
    for L in k.lights:
        L['obj'].hide_render = not any(L is x for x in on)
        L['obj'].data.energy = L['energy']
    for p in k.parts:
        n = (p.get('pname') or '').replace('ground_', '').replace('coast_', '')
        if n in scenekit.Kit.GRASS_PARTS or k._nature(p) == 'grass' or n.startswith(GRASSY):
            p['obj'].visible_shadow = False         # grass blades light up but cast no shadows (they read as streaks)
    k._settings(samples, raw=True, sixteen=True)
    k._render(path)


def water_parts():
    return [p for p in k.parts if (p.get('pname') or '').replace('ground_', '').replace('coast_', '') in scenekit.Kit.WATER_PARTS
            or k._nature(p) == 'water']


def mirror(path, glow_path=None):
    k._sky({'_world': ('#ff00ff', 1.0)})
    k._assign('albedo')
    mm = _mirror_mat()
    wp = water_parts()
    for p in wp:
        p['obj'].data.materials[0] = mm
    for L in k.lights:
        L['obj'].hide_render = True
    k._settings(16, raw=False)
    sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 2
    sc.cycles.glossy_bounces = 2
    k._render(path)
    if glow_path and any(p['emit'] for p in k.parts):
        k._sky({'_world': ('#000000', 0.0)})
        k._assign('emission')
        for p in wp:
            p['obj'].data.materials[0] = mm
        for L in k.lights:
            L['obj'].hide_render = True
        k._settings(16, raw=False)
        sc.cycles.use_denoising = False
        sc.cycles.max_bounces = 2
        sc.cycles.glossy_bounces = 2
        k._render(glow_path)


def ids():
    names = {}
    for name, pid in k.pid_names.items():
        names['%d,%d,%d' % ((pid * 37) % 251, (pid * 91) % 251, (pid * 53) % 251)] = name
    return names


def meta(path, ts, w, h, horizon, suns, extra=None):
    m = {'scene': 'verdance.py (side view)', 'ts': ts, 'crop': [0, 0, 0, 0], 'px': [0, 0, w, h], 'width': w, 'height': h,
         'theta': 0, 'zmin': k.zmin, 'zmax': k.zmax, 'waterZ': None, 'heightRange': scenekit.HEIGHT_RANGE, 'lightGain': 4.0,
         'suns': suns, 'lamps': True, 'refl': True, 'skyStrength': 1.0, 'sunStrength': 3.0, 'ids': ids(), 'horizon': horizon}
    if extra:
        m.update(extra)
    json.dump(m, open(path, 'w'), indent=1)


lamps = [L for L in k.lights if not L.get('sky')]
spec = json.load(open(SPEC))
os.makedirs(OUT, exist_ok=True)

if MODE == 'preview':
    for name, c in spec.items():
        hz = set_camera(c, 480, 270)
        flat('albedo', os.path.join(OUT, name + '.png'))
        print('preview', name, 'horizon', round(hz, 3), flush=True)

def _white():
    return k._white_diffuse()


def light_override(on, world, samples):
    """A light pass without touching any part's material: every surface white diffuse via the view layer's override
    (re-assigning 7,000 materials makes Cycles resync the whole farm, ~30 s a pass)."""
    k._sky({'_world': world})
    for L in k.lights:
        L['obj'].hide_render = not any(L is x for x in on)
        L['obj'].data.energy = L['energy']
    k._settings(samples, raw=True, sixteen=True)


def no_grass_shadows():
    for p in k.parts:
        n = (p.get('pname') or '').replace('ground_', '').replace('coast_', '')
        if n in scenekit.Kit.GRASS_PARTS or k._nature(p) == 'grass' or n.startswith(GRASSY):
            p['obj'].visible_shadow = False


def do_still(cam, anchors):
    """Pass by pass, both sizes in a row (the camera stays, only the resolution changes)."""
    jobs = []
    for w in opts['sizes']:
        h = w * 9 // 16
        ts = 32 if w <= 480 else 48
        d = os.path.join(OUT, 'side-%d' % ts)
        if os.path.exists(os.path.join(d, 'render.json')):
            print('still skip (done)', d, flush=True)
            continue
        os.makedirs(d, exist_ok=True)
        jobs.append((w, h, ts, d))
    if not jobs:
        return
    hzs = {}
    set_camera(cam, jobs[0][0], jobs[0][1])          # (the depth pass's range is set with the camera)

    def each(fn):
        for (w, h, ts, d) in jobs:
            hzs[ts] = set_camera(cam, w, h)
            fn(w, h, ts, d)

    vl = bpy.context.view_layer
    vl.material_override = None
    for kind, name, kw in (('albedo', 'albedo.png', {}), ('emission', 'emission.png', {}), ('id', 'id.png', {'linear': True}),
                           ('leaf', 'leaf.png', {}), ('depth', 'depth.png', {'raw': True, 'sixteen': True, 'bw': True}),
                           ('height', 'height.png', {'raw': True, 'sixteen': True, 'bw': True})):
        k._sky({'_world': ('#000000', 0.0)})
        k._assign(kind)
        def r(w, h, ts, d, kind=kind, name=name, kw=kw):
            kw2 = dict(kw); lin = kw2.pop('linear', False)
            k._settings(1, raw=kw2.pop('raw', False) or lin, **kw2)
            if lin:
                sc.view_settings.exposure = 0.0
            k._render(os.path.join(d, name))
        each(r)
        print('still pass', kind, flush=True)
    k._assign('albedo')
    nm = _normal_mat()
    for p in k.parts:
        if p['albedo'] != 'HOLDOUT':
            p['obj'].data.materials[0] = nm
    def rn(w, h, ts, d):
        k._settings(1, raw=True); sc.view_settings.exposure = 0.0; k._render(os.path.join(d, 'normal.png'))
    each(rn)
    # light passes: the sky, then each sun, under the white override
    k._assign('albedo')
    no_grass_shadows()
    vl.material_override = _white()
    for name, on, world in [('light_sky.png', [], ('#ffffff', 1.0))] + [('light_sun%d.png' % j, [L], ('#000000', 0.0)) for j, L in enumerate(sun_objs)]:
        def rl(w, h, ts, d, name=name, on=on, world=world):
            light_override(on, world, opts['samples']); k._render(os.path.join(d, name))
        each(rl)
        print('still pass', name, flush=True)
    vl.material_override = None
    # the lamps (their glass glowing): one material assignment
    k._sky({'_world': ('#000000', 0.0)})
    k._assign('light', {'_emit': 1.0})
    no_grass_shadows()
    for L in k.lights:
        L['obj'].hide_render = not any(L is x for x in lamps)
        L['obj'].data.energy = L['energy']
    def rlamp(w, h, ts, d):
        k._settings(opts['samples'], raw=True, sixteen=True); k._render(os.path.join(d, 'light_lamps.png'))
    each(rlamp)
    # the pond as a mirror, and the lit things alone in it
    def rm(w, h, ts, d):
        mirror(os.path.join(d, 'refl.png'), os.path.join(d, 'refl_glow.png'))
    each(rm)
    for (w, h, ts, d) in jobs:
        set_camera(cam, w, h)
        meta(os.path.join(d, 'render.json'), ts, w, h, hzs[ts], [{'hour': hh, 'dir': dd} for hh, dd in SUNS],
             {'cam': cam, 'anchors': project(anchors)})
        print('still done', d, flush=True)


def do_move(spec):
    """The camera move, pass by pass: each kind of pass renders every frame and size before the materials change."""
    n = opts['frames']
    a, b = spec['start'], spec['end']
    sun_i = spec.get('sun', 4)

    def ease(f):
        return f * f * f * (f * (f * 6 - 15) + 10)             # smootherstep: a slow start and a gentle landing

    def polar(c):
        p, t = bl(*c['pos']), bl(*c['target'])
        v = p - t
        dist = v.length
        elev = math.asin(v.z / dist)
        yaw = math.atan2(v.x, -v.y)
        width = c['ortho'] if c.get('ortho') else 2 * dist * math.tan(math.radians(c['hfov']) / 2)
        return t, elev, yaw, dist, width
    ta, ea, ya, da, wa = polar(a)
    tb, eb, yb, db, wb = polar(b)
    cams = []
    for fi in range(n):
        f = ease(fi / (n - 1))
        t = ta.lerp(tb, f)
        e = ea + (eb - ea) * f
        y = ya + (yb - ya) * f
        dist = math.exp(math.log(da) + (math.log(db) - math.log(da)) * f)
        width = wa + (wb - wa) * f
        hfov = math.degrees(2 * math.atan(width / 2 / dist))
        p = t + Vector((math.sin(y) * math.cos(e), -math.cos(y) * math.cos(e), math.sin(e))) * dist
        cams.append({'pos': [p.x, -p.y / S, p.z], 'target': [t.x, -t.y / S, t.z], 'hfov': hfov})
    jobs = []
    for w in opts['sizes']:
        h = w * 9 // 16
        ts = 32 if w <= 480 else 48
        base = os.path.join(OUT, 'move-%d' % ts)
        for fi, cam in enumerate(cams):
            d = os.path.join(base, 'f%02d' % fi)
            if not os.path.exists(os.path.join(d, 'render.json')):
                os.makedirs(d, exist_ok=True)
                jobs.append((w, h, ts, d, cam))
    hz = {}
    def each(fn):
        for (w, h, ts, d, cam) in jobs:
            hz[d] = set_camera(cam, w, h)
            fn(w, h, d)
    vl = bpy.context.view_layer
    if jobs:
        vl.material_override = None
        for kind in ('albedo', 'leaf'):
            k._sky({'_world': ('#000000', 0.0)})
            k._assign(kind)
            each(lambda w, h, d, kind=kind: (k._settings(1), k._render(os.path.join(d, kind + '.png'))))
            print('move pass', kind, len(jobs), flush=True)
        k._assign('albedo')
        no_grass_shadows()
        vl.material_override = _white()
        smp = max(8, opts['samples'] // 2)
        each(lambda w, h, d: (light_override([], ('#ffffff', 1.0), smp), k._render(os.path.join(d, 'light_sky.png'))))
        print('move pass sky', flush=True)
        each(lambda w, h, d: (light_override([sun_objs[sun_i]], ('#000000', 0.0), smp), k._render(os.path.join(d, 'light_sun0.png'))))
        print('move pass sun', flush=True)
        vl.material_override = None
        for (w, h, ts, d, cam) in jobs:
            meta(os.path.join(d, 'render.json'), ts, w, h, hz[d], [{'hour': SUNS[sun_i][0], 'dir': SUNS[sun_i][1]}], {'cam': cam, 'refl': False})
    for w in opts['sizes']:
        ts = 32 if w <= 480 else 48
        base = os.path.join(OUT, 'move-%d' % ts)
        frames = []
        for fi, cam in enumerate(cams):
            m = json.load(open(os.path.join(base, 'f%02d' % fi, 'render.json')))
            frames.append({'f': fi, 'horizon': m['horizon'], 'hfov': cam['hfov']})
        json.dump(frames, open(os.path.join(base, 'frames.json'), 'w'), indent=1)
        print('move done', base, flush=True)


if MODE == 'still':
    do_still(spec, spec.get('anchors'))
elif MODE == 'move':
    do_move(spec)
elif MODE == 'all':
    do_still(spec['still'], spec.get('anchors'))
    do_move(spec['move'])
print('SIDE done', MODE, flush=True)
