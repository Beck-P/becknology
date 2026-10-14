"""Model the pilot in Blender and render native-resolution sprite frames.

Run with Blender's Python module (pip install bpy==5.2.2 into a Python 3.13
venv), then post-process with sprites_post.py:

  BVENV/bin/python tools/bridge-art/pilot.py /tmp/pilot-frames
  python3 tools/bridge-art/sprites_post.py pilot /tmp/pilot-frames

The model is cel-shaded in the shader (N·L against a fixed key light, three
flat tone bands per material, no lamps), rendered with an orthographic camera
at the world's high-oblique angle, one sample per pixel and no filtering — so
every pixel is a flat palette colour. Three passes per frame:

  color_<suit>/<dir>_<frame>.png — the sprite in each suit colour
  id/<dir>_<frame>.png           — flat colour per body part
  depth/<dir>_<frame>.png        — 16-bit view depth

sprites_post.py uses id + depth to draw a line wherever one part overlaps
another (arm over torso, visor on helmet), then adds the outer outline.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

OUT = sys.argv[1]
W, H = 32, 48  # native frame size — keep in sync with character.js

# ---- Palettes (shadow, mid, light) -----------------------------------------
SUITS = {  # from character.js SUIT_COLORS (dark, base, light)
    'purple': ('#6048a0', '#a078dc', '#c0a8ee'),
    'cyan':   ('#388890', '#5cc8d0', '#8ce0e8'),
    'red':    ('#903838', '#d06060', '#e89090'),
    'green':  ('#387838', '#60b060', '#90d090'),
    'gold':   ('#887028', '#c8a840', '#e0c870'),
    'white':  ('#909090', '#d0d0d0', '#f0f0f0'),
}
FIXED = {
    'helmet': ('#8c8ca8', '#d4d4e4', '#f6f6ff'),
    'visor':  ('#1c5a70', '#3aa8c0', '#8ee4f0'),
    'boot':   ('#141420', '#262636', '#3a3a50'),
    'pack':   ('#2c2c3c', '#4a4a5e', '#6c6c84'),
    'brass':  ('#7a5a20', '#c8a040', '#f0d070'),
    'glint':  ('#ffffff', '#ffffff', '#ffffff'),
    'ledc':   ('#80f0ff', '#80f0ff', '#80f0ff'),
    'ledy':   ('#ffe080', '#ffe080', '#ffe080'),
    'ledoff': ('#3a3a48', '#3a3a48', '#3a3a48'),
}
LIGHT_DIR = Vector((-0.5, -0.35, 0.8)).normalized()  # high, from upper-left


def hexc(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def lin(c):
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)


def mix(a, b, t):
    ca, cb = hexc(a), hexc(b)
    return '#' + ''.join('%02x' % round(255 * (ca[i] * (1 - t) + cb[i] * t)) for i in range(3))


def suit_tones(name):
    dk, base, lt = SUITS[name]
    return {
        'suit': (dk, base, lt),
        'suitdk': (mix(dk, '#000000', 0.25), dk, mix(dk, base, 0.5)),
        'arm': (mix(dk, '#000000', 0.12), mix(base, dk, 0.3), mix(lt, base, 0.35)),
    }


# ---- Scene -------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def emission_material(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    emit = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return m, nt, emit


def cel_material(name, tones):
    m, nt, emit = emission_material(name)
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath')
    dot.operation = 'DOT_PRODUCT'
    dot.inputs[1].default_value = LIGHT_DIR
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = -1.0
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.0, lin(hexc(tones[0]))
    els[1].position, els[1].color = 0.56, lin(hexc(tones[1]))
    e = els.new(0.83)
    e.color = lin(hexc(tones[2]))
    nt.links.new(geo.outputs['Normal'], dot.inputs[0])
    nt.links.new(dot.outputs['Value'], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], emit.inputs['Color'])
    return m


def flat_material(name, rgb):
    m, nt, emit = emission_material(name)
    emit.inputs['Color'].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
    return m


def depth_material():
    m, nt, emit = emission_material('depth')
    cam = nt.nodes.new('ShaderNodeCameraData')
    div = nt.nodes.new('ShaderNodeMath')
    div.operation = 'DIVIDE'
    div.inputs[1].default_value = 200.0
    nt.links.new(cam.outputs['View Z Depth'], div.inputs[0])
    nt.links.new(div.outputs['Value'], emit.inputs['Color'])
    return m


DEPTH_MAT = depth_material()

# Every mesh records its tone key and its part id (for the line pass).
PARTS = []          # (object, tone_key, part_id)
PART_IDS = {}


def part_id(name):
    if name not in PART_IDS:
        PART_IDS[name] = len(PART_IDS) + 1
    return PART_IDS[name]


def pivot(name, loc, parent=None):
    e = bpy.data.objects.new(name, None)
    scene.collection.objects.link(e)
    e.location = loc
    if parent:
        e.parent = parent
    return e


def add(prim, name, loc, scale, tone, part, parent, bevel=0.0, rot=(0, 0, 0), **kw):
    getattr(bpy.ops.mesh, 'primitive_' + prim + '_add')(location=(0, 0, 0), **kw)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    o.location = loc
    if bevel:
        mod = o.modifiers.new('bev', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
    for p in o.data.polygons:
        p.use_smooth = True
    o.parent = parent
    o.data.materials.append(DEPTH_MAT)  # placeholder; swapped per pass
    PARTS.append((o, tone, part_id(part)))
    return o


# ---- Model (1 unit ≈ 0.7 px) — faces -Y (toward camera at yaw 0) -----------
root = pivot('root', (0, 0, 0))
body = pivot('body', (0, 0, 0), root)

hips = {}
for side, sx in (('L', -2.1), ('R', 2.1)):
    hip = pivot('hip' + side, (sx, 0, 9.2), body)
    hips[side] = hip
    add('cube', 'leg' + side, (0, 0, -3.2), (1.45, 1.6, 3.3), 'suit', 'leg' + side, hip, bevel=0.5)
    add('cube', 'knee' + side, (0, -1.5, -3.6), (1.2, 0.35, 0.9), 'suitdk', 'leg' + side, hip, bevel=0.2)
    add('cube', 'boot' + side, (0, -0.6, -7.4), (1.75, 2.5, 1.45), 'boot', 'boot' + side, hip, bevel=0.6)

add('cube', 'torso', (0, 0, 13.2), (4.3, 3.1, 4.3), 'suit', 'torso', body, bevel=1.4)
add('cube', 'belt', (0, 0, 9.7), (4.45, 3.25, 0.65), 'suitdk', 'torso', body, bevel=0.3)
add('cube', 'buckle', (0, -3.25, 9.7), (0.85, 0.3, 0.55), 'brass', 'torso', body)
add('cube', 'chest', (0, -3.05, 13.6), (2.1, 0.35, 1.5), 'suitdk', 'torso', body, bevel=0.2)
add('cube', 'ledC', (-0.8, -3.4, 13.9), (0.45, 0.2, 0.45), 'ledc', 'torso', body)
add('cube', 'ledY', (0.8, -3.4, 13.9), (0.45, 0.2, 0.45), 'ledy', 'torso', body)
add('cube', 'pack', (0, 3.5, 13.4), (3.4, 1.5, 3.7), 'pack', 'pack', body, bevel=0.7)
add('cylinder', 'tank', (2.2, 4.6, 13.6), (0.9, 0.9, 3.0), 'brass', 'pack', body, vertices=10)
add('cube', 'packLight', (-1.6, 4.9, 16.2), (0.5, 0.3, 0.5), 'ledc', 'pack', body)

shoulders = {}
for side, sx in (('L', -5.3), ('R', 5.3)):
    sh = pivot('sh' + side, (sx, 0, 16.0), body)
    shoulders[side] = sh
    add('uv_sphere', 'pad' + side, (0, 0, 0.2), (1.9, 1.9, 1.5), 'suitdk', 'arm' + side, sh, segments=12, ring_count=8)
    add('cube', 'arm' + side, (0, 0, -2.9), (1.25, 1.4, 3.1), 'arm', 'arm' + side, sh, bevel=0.5)
    add('cube', 'glove' + side, (0, 0, -6.3), (1.45, 1.6, 1.2), 'suitdk', 'arm' + side, sh, bevel=0.5)

head = pivot('head', (0, 0, 18.6), body)
add('torus', 'collar', (0, 0, 0.5), (1, 1, 1), 'suitdk', 'collar', head,
    major_radius=3.6, minor_radius=0.9, major_segments=20, minor_segments=8)
add('uv_sphere', 'helmet', (0, 0, 5.0), (5.8, 5.5, 5.3), 'helmet', 'helmet', head, segments=28, ring_count=14)
add('uv_sphere', 'visor', (0, -3.7, 4.6), (4.2, 3.1, 2.7), 'visor', 'visor', head, segments=24, ring_count=12)
add('cube', 'glint', (-1.9, -6.55, 5.7), (0.55, 0.2, 0.5), 'glint', 'visor', head)
add('cylinder', 'antenna', (3.0, 0.6, 10.6), (0.3, 0.3, 1.9), 'pack', 'helmet', head, vertices=8)
tip = add('uv_sphere', 'antennaTip', (3.0, 0.6, 12.6), (0.85, 0.85, 0.85), 'ledy', 'helmet', head,
          segments=8, ring_count=6)

# ---- Camera: orthographic at the world's high-oblique angle -----------------
ELEV = math.radians(30)
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
center = Vector((0, 0, 13.0))
cam.location = center + Vector((0, -math.cos(ELEV) * 100, math.sin(ELEV) * 100))
cam.rotation_euler = (math.pi / 2 - ELEV, 0, 0)
scene.camera = cam

scene.render.engine = 'CYCLES'
scene.cycles.samples = 1
scene.cycles.use_denoising = False
scene.cycles.filter_width = 0.01
scene.cycles.device = 'CPU'
scene.render.resolution_x = W
scene.render.resolution_y = H
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'Standard'
scene.render.dither_intensity = 0.0  # exact flat colours (ids must match exactly)
scene.world = bpy.data.worlds.new('w')

# Fit once (idle, facing down) so every frame shares one scale and the feet
# sit on the same baseline: 2px of floor margin, room above for the bob.
bpy.context.view_layer.update()
right = cam.matrix_world.to_3x3() @ Vector((1, 0, 0))
up = cam.matrix_world.to_3x3() @ Vector((0, 1, 0))
pts = [o.matrix_world @ Vector(c) for o, _, _ in PARTS for c in o.bound_box]
us = [p.dot(up) for p in pts]
rs = [p.dot(right) for p in pts]
PPU = (H - 5) / (max(us) - min(us))
cam_data.ortho_scale = max(W, H) / PPU
cam.location += up * ((min(us) - cam.location.dot(up)) - (-H / 2 + 2) / PPU)
cam.location += right * ((max(rs) + min(rs)) / 2 - cam.location.dot(right))

# ---- Poses -------------------------------------------------------------------
DIRS = {'down': 0, 'right': 90, 'up': 180, 'left': -90}
STRIDE = math.radians(34)
ARM = math.radians(30)
FRAMES = []
for i in range(4):                         # idle: breathe + antenna blink
    FRAMES.append(('idle', i, 0.0, [0, 0.4, 0.8, 0.4][i], i != 2))
for i in range(8):                         # walk: 8-frame cycle
    ph = 2 * math.pi * i / 8
    FRAMES.append(('walk', i, math.sin(ph), -0.9 * abs(math.sin(ph)) + 0.45, True))


def pose(swing, lift):
    hips['L'].rotation_euler = (STRIDE * swing, 0, 0)
    hips['R'].rotation_euler = (-STRIDE * swing, 0, 0)
    shoulders['L'].rotation_euler = (-ARM * swing, 0, 0)
    shoulders['R'].rotation_euler = (ARM * swing, 0, 0)
    body.location = (0, 0, lift)


def set_pass(kind, suit=None):
    tones = suit_tones(suit) if suit else None
    for o, tone, pid in PARTS:
        if kind == 'depth':
            m = DEPTH_MAT
        elif kind == 'id':
            m = ID_MATS[pid]
        else:
            m = COLOR_MATS[(suit, tone)]
        o.data.materials[0] = m


ID_MATS = {}
for name, pid in PART_IDS.items():
    # spread ids across hue so neighbours differ clearly
    ID_MATS[pid] = flat_material('id_' + name, (((pid * 37) % 256) / 255, ((pid * 91) % 256) / 255, ((pid * 53) % 256) / 255))
COLOR_MATS = {}
for suit in SUITS:
    tones = suit_tones(suit)
    for tone in set(t for _, t, _ in PARTS):
        COLOR_MATS[(suit, tone)] = cel_material(suit + '_' + tone, tones.get(tone) or FIXED[tone])
TIP_OFF = cel_material('tipoff', FIXED['ledoff'])


def render(path, sixteen=False):
    scene.render.image_settings.color_mode = 'BW' if sixteen else 'RGBA'
    scene.render.image_settings.color_depth = '16' if sixteen else '8'
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


for kind in ['id', 'depth'] + ['color_' + s for s in SUITS]:
    os.makedirs(os.path.join(OUT, kind), exist_ok=True)

for dname, yaw in DIRS.items():
    root.rotation_euler = (0, 0, math.radians(yaw))
    for anim, i, swing, lift, tip_on in FRAMES:
        pose(swing, lift)
        tag = f'{dname}_{anim}{i}.png'
        set_pass('id')
        render(os.path.join(OUT, 'id', tag))
        set_pass('depth')
        render(os.path.join(OUT, 'depth', tag), sixteen=True)
        for suit in SUITS:
            set_pass('color', suit)
            if not tip_on:
                tip.data.materials[0] = TIP_OFF
            render(os.path.join(OUT, 'color_' + suit, tag))
print('PPU', PPU, 'frames', len(FRAMES) * len(DIRS))
