"""A horse to ride and a buggy to drive on Verdance (js/countryside.js), modelled and rendered like the characters.

  BVENV/bin/python tools/bridge-art/horse_sprites.py OUTDIR horse     # the horse, saddled, every coat
  BVENV/bin/python tools/bridge-art/horse_sprites.py OUTDIR buggy     # the horse in the shafts of a two-wheeled gig
  python3 tools/bridge-art/sprites_post.py horse OUTDIR/horse        # → assets/characters/horse-<coat>[-front].png
  python3 tools/bridge-art/sprites_post.py buggy OUTDIR/buggy

The same 45° orthographic camera, tile units and cel shading as characters.py (N·L against the fixed key light, three
flat tone bands, one sample, no filtering), so a horse stands in the scenes at its true size beside the people. Frames
are 64 × 64 (the buggy 128 × 112) with the floor point under the horse's middle (the buggy's: under its seat) at pixel
(32, 52) / (64, 64), packed by sprites_post.py like a character: rows down / right / up / left, columns idle 0-3 (the
horse breathing, an ear turning, its tail flicking), walk 0-7 (a walk: diagonal pairs of legs, the head nodding).

Each coat is rendered twice: whole (`<coat>`), and only what stands in front of a rider (`<coat>_front`: the neck and
head riding toward you, the quarters riding away, the near flank side on; for the buggy the dash, the shafts and the
horse ahead of you, or the seat back from behind) — the game draws horse, rider, then the front over them.
seat.json: where the rider sits in each frame (px from the floor point), so js/countryside.js can put them there.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

OUT, WHAT = sys.argv[1], sys.argv[2]
BUGGY = WHAT == 'buggy'
W, H = (128, 112) if BUGGY else (64, 64)
ORIGIN_PX = (64, 64) if BUGGY else (32, 52)
ELEV = math.radians(45)
LIGHT_DIR = Vector((-0.5, -0.35, 0.8)).normalized()
COATS = {
    'bay':      {'coat': ('#5a2e18', '#8a4a26', '#b06a3a'), 'mane': ('#1a1210', '#2a201a', '#3e3028'), 'leg': ('#1a1210', '#2a201a', '#3e3028')},
    'chestnut': {'coat': ('#7a3a14', '#b05a24', '#d07a3a'), 'mane': ('#6a3010', '#9a4a1c', '#c06a2e'), 'leg': ('#7a3a14', '#b05a24', '#d07a3a')},
    'grey':     {'coat': ('#8a8a90', '#c4c4c8', '#e8e8ec'), 'mane': ('#5a5a62', '#8a8a92', '#b0b0b8'), 'leg': ('#6a6a72', '#9a9aa2', '#c4c4cc')},
    'black':    {'coat': ('#16141a', '#2a2630', '#443e4c'), 'mane': ('#0e0c10', '#1a181e', '#2a262e'), 'leg': ('#16141a', '#2a2630', '#443e4c')},
}
FIXED = {
    'hoof':    ('#1a1614', '#2e2824', '#463c34'),
    'muzzle':  ('#2a2420', '#4a3e36', '#6a5a4e'),
    'blaze':   ('#c8c4bc', '#ecead8', '#fffff4'),
    'eye':     ('#0a0808', '#141010', '#201a18'),
    'saddle':  ('#3a2010', '#5e3618', '#84522a'),
    'cloth':   ('#1e4a32', '#2e6a4a', '#4a8a64'),
    'tack':    ('#1e1410', '#2e2018', '#463224'),
    'brass':   ('#8a6a20', '#c8a040', '#f0d070'),
    'gig':     ('#1e3a2a', '#2e5a40', '#4a7a58'),
    'giglite': ('#7a5a1e', '#c89a3a', '#e8c060'),
    'wheel':   ('#3a2410', '#6a4420', '#8a5e30'),
    'tyre':    ('#18181a', '#26262a', '#3a3a3e'),
    'cushion': ('#6a1e1e', '#9a2e2e', '#c04a44'),
    'lamp':    ('#8a6a20', '#c8a040', '#f0d070'),
}


def hexc(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def lin(c):
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.world = bpy.data.worlds.new('w')


def emission_mat(name, setup):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    setup(nt, em)
    return m


def cel_mat(name, tones):
    def setup(nt, em):
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        dot = nt.nodes.new('ShaderNodeVectorMath')
        dot.operation = 'DOT_PRODUCT'
        dot.inputs[1].default_value = LIGHT_DIR
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.inputs['From Min'].default_value = -1.0
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.interpolation = 'CONSTANT'
        e = ramp.color_ramp.elements
        e[0].position, e[0].color = 0.0, lin(hexc(tones[0]))
        e[1].position, e[1].color = 0.56, lin(hexc(tones[1]))
        e3 = e.new(0.83)
        e3.color = lin(hexc(tones[2]))
        nt.links.new(geo.outputs['Normal'], dot.inputs[0])
        nt.links.new(dot.outputs['Value'], mr.inputs['Value'])
        nt.links.new(mr.outputs['Result'], ramp.inputs['Fac'])
        nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    return emission_mat(name, setup)


def flat_mat(name, rgb):
    def setup(nt, em):
        em.inputs['Color'].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
    return emission_mat(name, setup)


def depth_mat():
    def setup(nt, em):
        cam = nt.nodes.new('ShaderNodeCameraData')
        div = nt.nodes.new('ShaderNodeMath')
        div.operation = 'DIVIDE'
        div.inputs[1].default_value = 200.0
        nt.links.new(cam.outputs['View Z Depth'], div.inputs[0])
        nt.links.new(div.outputs['Value'], em.inputs['Color'])
    return emission_mat('depth', setup)


DEPTH = depth_mat()
PARTS = []          # (obj, tone key, part id, group)
PIDS = {}
CLEAR = flat_mat('clear', (0, 0, 0))


def pid(name):
    if name not in PIDS:
        PIDS[name] = len(PIDS) + 1
    return PIDS[name]


def id_rgb(p):
    return ((p * 53) % 251 / 255.0, (p * 97) % 241 / 255.0, (p * 31 + 80) % 239 / 255.0)


def pivot(name, loc, parent=None):
    e = bpy.data.objects.new(name, None)
    scene.collection.objects.link(e)
    e.location = loc
    if parent:
        e.parent = parent
    return e


def add(prim, name, loc, scale, tone, part, parent, group, rot=(0, 0, 0), **kw):
    """A primitive in tile units, parented; group: which of the horse it is ('head', 'neck', 'fore', 'hind', 'body',
    'tail', 'gig', 'dash', 'seatback', 'wheelL', 'wheelR', 'shaft') — what's in front of a rider is picked by group."""
    getattr(bpy.ops.mesh, 'primitive_' + prim + '_add')(location=(0, 0, 0), **kw)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    o.location = loc
    for p in o.data.polygons:
        p.use_smooth = True
    o.parent = parent
    o.data.materials.append(DEPTH)
    PARTS.append((o, tone, pid(part), group))
    return o


def ball(name, loc, r, tone, part, parent, group, rot=(0, 0, 0)):
    return add('uv_sphere', name, loc, r, tone, part, parent, group, rot=rot, segments=14, ring_count=10)


def rod(name, a, b, r, tone, part, parent, group, verts=8):
    a, b = Vector(a), Vector(b)
    d = b - a
    o = add('cylinder', name, (0, 0, 0), (r, r, d.length / 2), tone, part, parent, group, vertices=verts)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.location = (a + b) / 2
    return o


# ---- the horse: built facing -y (toward the camera at yaw 0), its middle over the origin ----------------------------------
root = pivot('root', (0, 0, 0))
HY = -1.0 if BUGGY else 0.0                      # in the shafts the horse stands ahead of the gig (the gig's seat at the origin)
horse = pivot('horse', (0, HY, 0), root)
body = pivot('body', (0, 0, 0), horse)
ball('barrel', (0, 0.0, 0.66), (0.23, 0.42, 0.24), 'coat', 'body', body, 'body')
ball('chest', (0, -0.36, 0.7), (0.21, 0.2, 0.23), 'coat', 'body', body, 'fore')
ball('rump', (0, 0.38, 0.72), (0.22, 0.22, 0.23), 'coat', 'rump', body, 'hind')
neck = pivot('neckp', (0, -0.42, 0.82), body)
rod('neck', (0, 0, 0), (0, -0.2, 0.34), 0.12, 'coat', 'neck', neck, 'neck', verts=10)
for i in range(6):                                                    # the mane, down the crest
    t = i / 5
    ball('mane%d' % i, (0, 0.05 - 0.2 * t, 0.06 + 0.32 * t + 0.03), (0.05, 0.06, 0.06), 'mane', 'mane', neck, 'neck')
head = pivot('headp', (0, -0.22, 0.36), neck)
ball('skull', (0, -0.05, 0.03), (0.125, 0.17, 0.135), 'coat', 'head', head, 'head', rot=(math.radians(-30), 0, 0))
ball('nose', (0, -0.23, -0.07), (0.095, 0.11, 0.085), 'muzzle', 'muzzle', head, 'head', rot=(math.radians(-30), 0, 0))
ball('blaze', (0, -0.13, 0.05), (0.035, 0.09, 0.03), 'blaze', 'blaze', head, 'head', rot=(math.radians(-50), 0, 0))
for s in (-1, 1):
    add('cone', 'ear%d' % s, (s * 0.065, 0.05, 0.16), (0.04, 0.03, 0.08), 'coat', 'ear', head, 'head', vertices=6)
    ball('eye%d' % s, (s * 0.105, -0.08, 0.05), (0.024, 0.026, 0.026), 'eye', 'eye', head, 'head')
    rod('cheek%d' % s, (s * 0.1, -0.02, 0.0), (s * 0.08, -0.2, -0.06), 0.012, 'tack', 'bridle', head, 'head', verts=5)
ball('forelock', (0, 0.0, 0.12), (0.04, 0.05, 0.04), 'mane', 'mane', head, 'head')
legs = {}
for key, (lx, ly, grp) in {'FL': (-0.12, -0.36, 'fore'), 'FR': (0.12, -0.36, 'fore'), 'HL': (-0.12, 0.38, 'hind'), 'HR': (0.12, 0.38, 'hind')}.items():
    top = pivot('leg' + key, (lx, ly, 0.58), body)
    rod('up' + key, (0, 0, 0.02), (0, 0, -0.3), 0.06, 'coat', 'leg' + key, top, grp)
    knee = pivot('knee' + key, (0, 0, -0.3), top)
    rod('low' + key, (0, 0, 0), (0, 0, -0.22), 0.04, 'leg', 'shin' + key, knee, grp)
    add('cylinder', 'hoof' + key, (0, -0.01, -0.25), (0.05, 0.055, 0.035), 'hoof', 'hoof' + key, knee, grp, vertices=10)
    legs[key] = (top, knee)
tail = pivot('tailp', (0, 0.56, 0.8), body)
rod('dock', (0, 0, 0), (0, 0.1, -0.08), 0.05, 'mane', 'tail', tail, 'tail')
ball('tail', (0, 0.13, -0.26), (0.06, 0.06, 0.22), 'mane', 'tail', tail, 'tail', rot=(math.radians(-12), 0, 0))
if not BUGGY:                                                         # saddled
    ball('cloth', (0, -0.04, 0.86), (0.25, 0.2, 0.05), 'cloth', 'cloth', body, 'body')
    ball('saddle', (0, -0.04, 0.9), (0.15, 0.17, 0.05), 'saddle', 'saddle', body, 'body')
    add('cylinder', 'pommel', (0, -0.18, 0.93), (0.05, 0.04, 0.04), 'saddle', 'saddle', body, 'body', vertices=8)
    for s in (-1, 1):
        rod('leather%d' % s, (s * 0.2, -0.04, 0.84), (s * 0.24, -0.04, 0.52), 0.012, 'tack', 'tack', body, 'body', verts=5)
        add('torus', 'iron%d' % s, (s * 0.24, -0.04, 0.5), (0.04, 0.04, 0.04), 'brass', 'iron', body, 'body',
            rot=(0, math.pi / 2, 0), major_segments=8, minor_segments=4, major_radius=1.0, minor_radius=0.3)
    rod('girth', (-0.22, -0.18, 0.62), (0.22, -0.18, 0.62), 0.02, 'tack', 'tack', body, 'body', verts=5)
    rod('reins', (0, -0.18, 0.95), (0, -0.62, 1.1), 0.01, 'tack', 'reins', body, 'neck', verts=4)
    SEAT = Vector((0, -0.04, 0.92))
else:                                                                 # harness: a collar, traces, the breeching
    add('torus', 'collar', (0, -0.42, 0.86), (0.2, 0.2, 0.2), 'tack', 'collar', body, 'fore', rot=(math.radians(70), 0, 0),
        major_segments=14, minor_segments=6, major_radius=1.0, minor_radius=0.28)
    rod('backband', (-0.24, -0.05, 0.7), (0.24, -0.05, 0.7), 0.025, 'tack', 'tack', body, 'body', verts=5)
    ball('pad', (0, -0.05, 0.9), (0.1, 0.08, 0.04), 'tack', 'tack', body, 'body')
    for s in (-1, 1):
        rod('trace%d' % s, (s * 0.2, -0.38, 0.72), (s * 0.24, 0.5, 0.6), 0.015, 'tack', 'tack', body, 'body', verts=4)
    # the gig: two big wheels, a seat for two on a box body, shafts forward to the horse, a lamp each side
    gig = pivot('gig', (0, 0, 0), root)
    WHEELS = []
    for s, grp in ((-1, 'wheelL'), (1, 'wheelR')):
        wp = pivot('wheelp%d' % s, (s * 0.5, 0.05, 0.42), gig)
        WHEELS.append(wp)
        add('torus', 'wheel%d' % s, (0, 0, 0), (0.42, 0.42, 0.42), 'tyre', 'tyre', wp, grp, rot=(0, math.pi / 2, 0),
            major_segments=24, minor_segments=5, major_radius=1.0, minor_radius=0.06)
        for k in range(6):
            a = k * math.pi / 3
            rod('spoke%d%d' % (s, k), (0, 0, 0), (0, math.cos(a) * 0.4, math.sin(a) * 0.4), 0.014, 'wheel', 'spoke', wp, grp, verts=4)
        add('cylinder', 'hub%d' % s, (0, 0, 0), (0.05, 0.05, 0.06), 'giglite', 'hub', wp, grp, rot=(0, math.pi / 2, 0), vertices=10)
    rod('axle', (-0.5, 0.05, 0.42), (0.5, 0.05, 0.42), 0.025, 'tyre', 'axle', gig, 'gig', verts=6)
    add('cube', 'box', (0, 0.05, 0.6), (0.36, 0.3, 0.16), 'gig', 'gigbody', gig, 'gig')
    add('cube', 'boxtrim', (0, 0.05, 0.75), (0.38, 0.32, 0.015), 'giglite', 'gigtrim', gig, 'gig')
    add('cube', 'seat', (0, 0.12, 0.8), (0.32, 0.18, 0.05), 'cushion', 'seat', gig, 'gig')
    add('cube', 'seatback', (0, 0.3, 0.98), (0.34, 0.03, 0.16), 'gig', 'seatback', gig, 'seatback')
    add('cube', 'seatbacktrim', (0, 0.3, 1.14), (0.35, 0.04, 0.015), 'giglite', 'gigtrim', gig, 'seatback')
    add('cube', 'dash', (0, -0.3, 0.86), (0.34, 0.02, 0.12), 'gig', 'dash', gig, 'dash', rot=(math.radians(-15), 0, 0))
    for s in (-1, 1):
        rod('shaft%d' % s, (s * 0.26, -0.2, 0.62), (s * 0.24, -1.36, 0.74), 0.022, 'wheel', 'shaft', gig, 'shaft', verts=6)
        add('cube', 'lamp%d' % s, (s * 0.37, -0.28, 0.98), (0.04, 0.04, 0.06), 'lamp', 'lamp', gig, 'dash')
    SEAT = Vector((0, 0.1, 0.84))

# ---- camera: the scene's, the origin pinned to ORIGIN_PX ---------------------------------------------------------------
cd = bpy.data.cameras.new('cam')
cd.type = 'ORTHO'
cd.ortho_scale = max(W, H) / 32
cam = bpy.data.objects.new('cam', cd)
scene.collection.objects.link(cam)
f = Vector((0, math.cos(ELEV), -math.sin(ELEV)))
up = Vector((0, math.sin(ELEV), math.cos(ELEV)))
cam.location = Vector(((W / 2 - ORIGIN_PX[0]) / 32, 0, 0)) + up * ((ORIGIN_PX[1] - H / 2) / 32) - f * 50
cam.rotation_euler = (math.pi / 2 - ELEV, 0, 0)
scene.camera = cam
scene.render.engine = 'CYCLES'
scene.cycles.samples = 1
scene.cycles.use_denoising = False
scene.cycles.filter_width = 0.01
scene.cycles.device = 'CPU'
scene.render.resolution_x = W
scene.render.resolution_y = H
scene.render.film_transparent = True
scene.render.dither_intensity = 0.0
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'Standard'

ID_MATS = {p: flat_mat('id%d' % p, id_rgb(p)) for p in PIDS.values()}
COLOR = {}
for cname, tones in COATS.items():
    for _, tone, _, _ in PARTS:
        if (cname, tone) not in COLOR:
            COLOR[(cname, tone)] = cel_mat(cname + tone, tones.get(tone) or FIXED[tone])
# what stands in front of the rider, by which way the horse faces
FRONT = {'down': {'neck', 'head', 'fore', 'shaft', 'dash'}, 'up': {'hind', 'tail', 'seatback'},
         'right': {'body', 'fore', 'hind', 'neck', 'wheelL'}, 'left': {'body', 'fore', 'hind', 'neck', 'wheelR'}}
if not BUGGY:
    FRONT['right'] = FRONT['left'] = {'fore', 'hind'}           # astride: the legs cover the rider's feet, the barrel doesn't
else:
    FRONT['down'] = {'shaft', 'dash', 'neck', 'head', 'fore', 'body', 'hind', 'tail'}   # the whole horse is ahead of you
    FRONT['up'] = {'seatback'}
    FRONT['right'] = {'wheelL'}
    FRONT['left'] = {'wheelR'}


def set_pass(kind, coat=None, front=None):
    for o, tone, p, grp in PARTS:
        if kind == 'depth':
            o.data.materials[0] = DEPTH
        elif kind == 'id':
            o.data.materials[0] = ID_MATS[p]
        else:
            o.data.materials[0] = COLOR[(coat, tone)]
        o.hide_render = front is not None and grp not in front


def render(path, sixteen=False):
    scene.render.image_settings.color_mode = 'BW' if sixteen else 'RGBA'
    scene.render.image_settings.color_depth = '16' if sixteen else '8'
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


# ---- poses: idle (breathing, an ear, the tail) and a four-beat walk ------------------------------------------------------
def rest():
    for wp in (WHEELS if BUGGY else []):
        wp.rotation_euler = (0, 0, 0)
    for top, knee in legs.values():
        top.rotation_euler = (0, 0, 0)
        knee.rotation_euler = (0, 0, 0)
    neck.rotation_euler = (0, 0, 0)
    head.rotation_euler = (0, 0, 0)
    tail.rotation_euler = (0, 0, 0)
    body.location = (0, 0, 0)


def pose(anim, i):
    rest()
    if anim == 'idle':
        body.location = (0, 0, [0, 0.008, 0.016, 0.008][i])
        neck.rotation_euler = (math.radians([0, 2, 4, 2][i]), 0, 0)
        tail.rotation_euler = (0, math.radians([0, 10, 0, -10][i]), 0)
        return
    ph = 2 * math.pi * i / 8
    sw = math.radians(24)
    for key, off in (('FL', 0), ('HR', 0), ('FR', math.pi), ('HL', math.pi)):     # diagonal pairs together
        a = math.sin(ph + off)
        top, knee = legs[key]
        top.rotation_euler = (sw * a, 0, 0)
        lift = max(0.0, math.cos(ph + off))                                       # the leg coming forward folds
        knee.rotation_euler = ((-1 if key[0] == 'F' else 1) * math.radians(40) * lift, 0, 0)
    body.location = (0, 0, 0.02 * abs(math.sin(2 * ph)))
    if BUGGY:
        for wp in WHEELS:
            wp.rotation_euler = (-i * math.pi / 12, 0, 0)            # the wheels turning (six spokes: a sixth of a turn repeats)
    neck.rotation_euler = (math.radians(4 * math.sin(2 * ph)), 0, 0)
    tail.rotation_euler = (math.radians(6 * math.sin(ph)), 0, 0)


DIRS = {'down': 0, 'right': 90, 'up': 180, 'left': -90}
FRAMES = [('idle', i) for i in range(4)] + [('walk', i) for i in range(8)]
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402

for kind in ['id', 'depth'] + ['color_' + c for c in COATS] + ['color_' + c + '_front' for c in COATS]:
    os.makedirs(os.path.join(OUT, kind), exist_ok=True)
seats = {}
for dname, yaw in DIRS.items():
    root.rotation_euler = (0, 0, math.radians(yaw))
    for anim, i in FRAMES:
        pose(anim, i)
        bpy.context.view_layer.update()
        tag = '%s_%s%d.png' % (dname, anim, i)
        sp = (body.matrix_world @ SEAT) if not BUGGY else (root.matrix_world @ SEAT)
        co = world_to_camera_view(scene, cam, sp)
        seats[tag] = [round(co.x * W - ORIGIN_PX[0], 1), round((1 - co.y) * H - ORIGIN_PX[1], 1)]
        set_pass('id'); render(os.path.join(OUT, 'id', tag))
        set_pass('depth'); render(os.path.join(OUT, 'depth', tag), sixteen=True)
        for c in COATS:
            set_pass('color', c); render(os.path.join(OUT, 'color_' + c, tag))
            set_pass('color', c, FRONT[dname]); render(os.path.join(OUT, 'color_' + c + '_front', tag))
json.dump({'w': W, 'h': H, 'origin': ORIGIN_PX, 'seat': seats}, open(os.path.join(OUT, 'seat.json'), 'w'), indent=0)
print('rendered', WHAT)
