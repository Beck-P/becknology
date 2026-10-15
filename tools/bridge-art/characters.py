"""Model characters in Blender and render native sprite frames.

  BVENV/bin/python tools/bridge-art/characters.py OUTDIR pilot
  BVENV/bin/python tools/bridge-art/characters.py OUTDIR npc-bartender
  BVENV/bin/python tools/bridge-art/characters.py OUTDIR pilot-coat      # a suit style (coat, plate,
  BVENV/bin/python tools/bridge-art/characters.py OUTDIR pilot-sit-coat  # thermal, runner), standing / seated
  python3 tools/bridge-art/sprites_post.py pilot OUTDIR/pilot             # -> pilot-<colour>.png
  python3 tools/bridge-art/sprites_post.py pilot-coat OUTDIR              # -> pilot-coat-<colour>.png
  python3 tools/bridge-art/sprites_post.py npc OUTDIR/npc-bartender

Characters use the scene camera (45° orthographic, 32 px per tile) and tile
units, so they sit at true stool height and match the pre-rendered rooms.
Frames are 32 × 48; the floor point under the character (its feet, or the
seat centre for sitting poses) lands on pixel (16, 45).

Shading is done in the shader: N·L against a fixed key light (high,
upper-left), three flat tone bands per material, no lamps, one sample, no
filtering or dithering. Passes: color_<variant>/, id/, depth/ — see
sprites_post.py for line work and packing.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

OUT, WHO = sys.argv[1], sys.argv[2]
W, H = 32, 48
ORIGIN_PX = (16, 45)
ELEV = math.radians(45)
UNIT = 0.055        # model units → tiles (the pilot is ~31 units ≈ 1.7 tiles)

SUITS = {
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
    'skin':   ('#9a6a4e', '#d8a07a', '#f0c49c'),
    'skin2':  ('#7a4e36', '#b0784e', '#cc9468'),
    'skin3':  ('#3e2418', '#6a3e28', '#8a563a'),
    'eye':    ('#120c0a', '#120c0a', '#2a1a14'),
    'white':  ('#9a968c', '#e4e0d4', '#fbf8f0'),
    'leather': ('#3a2416', '#5e3a22', '#7e5232'),
    'pants':  ('#24202a', '#3e3646', '#5a5064'),
    'steel':  ('#4a5060', '#8a94a8', '#c8d0e0'),
    'steeldk': ('#22262e', '#3a404c', '#5a6272'),
    'fur':    ('#a89a88', '#e2d8c8', '#fbf6ec'),
    'sneaker': ('#8a8a96', '#dcdce6', '#ffffff'),
    'ledp':   ('#f078c8', '#f078c8', '#f078c8'),
}
NPCS = {
    # tone keys: shirt, sleeve, pants, hair, apron?, hat?
    'npc-bartender': dict(skin='skin', shirt=('#8a8478', '#d8d2c4', '#f2ede2'), apron=('#4a2e1a', '#7a5032', '#9a6a44'),
                          hair=('#2a1a10', '#4a2e1a', '#6a4428'), bald=True, mustache=True, pose='stand'),
    'npc-regular':   dict(skin='skin2', shirt=('#1e4a5a', '#2e7088', '#4a94ac'), hair=('#2a1a10', '#4a2e1a', '#6a4428'),
                          beanie=('#6a1e1e', '#a83232', '#c85050'), beard=True, pose='sit'),
    'npc-merchant':  dict(skin='skin', shirt=('#2e4a2e', '#4a7244', '#6a9460'), vest=('#3a2416', '#5e3a22', '#7e5232'),
                          hair=('#6a6a70', '#a0a0a8', '#c8c8d0'), cap=('#3a2a1a', '#5e4228', '#7e5a38'), beard=True, pose='sit'),
    'npc-innkeeper': dict(skin='skin', shirt=('#8a7a62', '#d0c0a0', '#ece0c4'), skirt=('#2a4a3a', '#3e6a52', '#5a8a6c'),
                          apron=('#9a968c', '#e4e0d4', '#fbf8f0'), hair=('#6a2a14', '#9a4422', '#c06030'), bun=True, pose='stand'),
    'npc-traveler':  dict(skin='skin2', shirt=('#3e444c', '#5e6872', '#828e9a'), hair=('#2a1a10', '#4a2e1a', '#6a4428'),
                          hood=('#3e444c', '#5e6872', '#828e9a'), pose='sit'),
    'npc-quiet':     dict(skin='skin', shirt=('#2e1e34', '#4a3050', '#664670'), hair=('#1a1418', '#2e2430', '#443a48'),
                          hood=('#2e1e34', '#4a3050', '#664670'), pose='sit'),
    'npc-baker':     dict(skin='skin', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), apron=('#9a968c', '#e4e0d4', '#fbf8f0'),
                          hair=('#5a3a1a', '#8a5a2a', '#aa7a42'), chef=True, mustache=True, pose='stand'),
    'npc-smith':     dict(skin='skin2', shirt=('#2a2a30', '#44444c', '#5e5e68'), sleeve='skin', apron=('#3a2416', '#5e3a22', '#7e5232'),
                          hair=('#1a1410', '#2e2218', '#44342a'), bald=True, beard=True, brawny=True, pose='stand'),
    'npc-apothecary': dict(skin='skin', shirt=('#3a2450', '#5a3a78', '#7a5a9a'), skirt=('#3a2450', '#5a3a78', '#7a5a9a'),
                           hair=('#8a8a98', '#c0c0cc', '#e2e2ec'), long_hair=True, pose='stand'),
    # Lumar outdoors
    'npc-fishmonger': dict(skin='skin2', shirt=('#3a4a5a', '#5a6a7a', '#7a8a9a'), apron=('#8a7a5a', '#b8a880', '#d8c8a0'),
                           hair=('#5a3a1a', '#8a5a2a', '#aa7a42'), cap=('#2a3a4a', '#3a5068', '#5a7088'), beard=True, pose='stand'),
    'npc-passerby':  dict(skin='skin', shirt=('#4a2a1a', '#7a4a2a', '#9a6a40'), hair=('#2a1a10', '#4a2e1a', '#6a4428'),
                          hood=('#3e444c', '#5e6872', '#828e9a'), pose='stand'),
    'npc-townsman':  dict(skin='skin', shirt=('#2e4a2e', '#4a7244', '#6a9460'), vest=('#3a2416', '#5e3a22', '#7e5232'),
                          hair=('#6a6a70', '#a0a0a8', '#c8c8d0'), cap=('#3a2a1a', '#5e4228', '#7e5a38'), beard=True, pose='stand'),
    'npc-watcher':   dict(skin='skin2', shirt=('#3a1418', '#6a2028', '#8a3038'), hair=('#1a1414', '#2e2224', '#443034'),
                          hood=('#3a1418', '#6a2028', '#8a3038'), beard=True, pose='stand'),
    'npc-harvester': dict(skin='skin', shirt=('#6a3a4a', '#9a5a6a', '#c07a8a'), apron=('#5a4a3a', '#8a7458', '#a89070'),
                          hair=('#c06080', '#e080a0', '#f0a8c0'), bun=True, pose='stand'),
    'npc-trader':    dict(skin='skin2', shirt=('#1a3a6a', '#2a5a9a', '#4a7ac0'), vest=('#c8b890', '#e0d4b0', '#f0e8d0'),
                          hair=('#1a1410', '#2e2218', '#44342a'), cap=('#1a3a6a', '#2a5a9a', '#4a7ac0'), pose='stand'),
    'npc-potter':    dict(skin='skin', shirt=('#8a6a4a', '#b08a60', '#d0aa80'), apron=('#6a3a2a', '#9a5a40', '#b87a5a'),
                          hair=('#8a8a90', '#b8b8c0', '#dcdce4'), bald=True, mustache=True, pose='stand'),
    'npc-fisher-gran': dict(skin='skin', shirt=('#2a3a2e', '#3e5a44', '#5a7a60'), skirt=('#3a2a22', '#5a4032', '#7a5a46'),
                            hair=('#8a8a90', '#c0c0c8', '#e2e2ea'), bun=True, pose='sit'),
    'npc-miner':     dict(skin='skin2', shirt=('#4a3a2a', '#6a5640', '#8a7458'), vest=('#2a2a30', '#44444c', '#5e5e68'),
                          hair=('#8a8a90', '#b8b8c0', '#dcdce4'), beard=True, cap=('#7a6a2a', '#a8943a', '#c8b45a'),
                          pose='sit'),
    'npc-keeper':    dict(skin='skin', shirt=('#18223a', '#26365a', '#3a5080'), vest=('#9a7418', '#d0a028', '#e8c050'),
                          hair=('#8a8a90', '#b8b8c0', '#dcdce4'), bun=True, pose='sit'),
    'npc-scholar':   dict(skin='skin2', shirt=('#3a2a1e', '#5e4430', '#7e6046'), vest=('#1e2a3a', '#2e4058', '#465c78'),
                          hair=('#c8c8d0', '#e0e0e8', '#f4f4fa'), long_hair=True, beard=True, pose='stand'),
    # Arcadia (neon city)
    'npc-stranger':  dict(skin='skin2', shirt=('#1e1430', '#32224e', '#4a3670'), hair=('#1a1418', '#2e2430', '#443a48'),
                          hood=('#1e1430', '#32224e', '#4a3670'), visor_band=True, pose='stand'),
    'npc-cashier':   dict(skin='skin', shirt=('#1a4a50', '#2a7a80', '#4aa8ae'), vest=('#3a1840', '#5a2a60', '#7a4080'),
                          hair=('#5a1a4a', '#8a2a70', '#b04a90'), cap=('#e870c0', '#f078a8', '#f8a8c8'), pose='stand'),
    'npc-shopper':   dict(skin='skin2', shirt=('#4a3a10', '#7a6020', '#a88a3a'), hair=('#1a1410', '#2e2218', '#44342a'),
                          beanie=('#1a3a50', '#2a5a7a', '#4a80a0'), pose='stand'),
    'npc-noodle-chef': dict(skin='skin', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), apron=('#4a1418', '#7a2028', '#a03038'),
                            hair=('#1a1418', '#2e2430', '#443a48'), chef=True, pose='stand'),
    'npc-patron-a':  dict(skin='skin', shirt=('#3a1840', '#5a2a60', '#7a4080'), hair=('#2a6a70', '#40a0a8', '#70d0d8'),
                          long_hair=True, pose='sit'),
    'npc-patron-b':  dict(skin='skin2', shirt=('#2a2a30', '#44444c', '#5e5e68'), vest=('#4a1a14', '#7a2a20', '#a04030'),
                          hair=('#1a1410', '#2e2218', '#44342a'), mohawk=True, bald=True, pose='sit'),
    'npc-doctor':    dict(skin='skin', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), skirt=('#9a968c', '#e4e0d4', '#fbf8f0'),
                          hair=('#1a1418', '#2e2430', '#443a48'), bun=True, mask=True, pose='stand'),
    'npc-pawnbroker': dict(skin='skin2', shirt=('#3a3420', '#5a5030', '#7a7048'), vest=('#2a1a10', '#3e2a1a', '#5a4028'),
                           hair=('#6a6a70', '#a0a0a8', '#c8c8d0'), bald=True, visor_cap=True, beard=True, pose='stand'),
    'npc-pawn-customer': dict(skin='skin', shirt=('#1a3a2a', '#2a5a40', '#4a8060'), hair=('#7a5a1a', '#b08a2a', '#d0b050'),
                              hood=('#1a3a2a', '#2a5a40', '#4a8060'), pose='stand'),
    'npc-technician': dict(skin='skin', shirt=('#3a4a5a', '#5a6a7a', '#7a8a9a'), apron=('#3a3a40', '#5a5a62', '#7a7a84'),
                           hair=('#c05020', '#e07030', '#f0a050'), goggles=True, bun=True, pose='stand'),
    'npc-waiting':   dict(skin='skin2', shirt=('#4a2a50', '#6a4070', '#8a6090'), hair=('#1a1410', '#2e2218', '#44342a'),
                          cap=('#2a2a30', '#44444c', '#5e5e68'), pose='sit'),
    'npc-okafor':    dict(skin='skin3', shirt=('#2e4a52', '#46707a', '#6a98a2'), vest=('#8a4a1a', '#c87830', '#e8a050'),
                          hair=('#141010', '#241c1a', '#362a26'), goggles=True, pose='stand'),
    # The Backs, behind the District (arcadia-alley, null-den)
    'npc-hollin':    dict(skin='skin', shirt=('#a89878', '#d0c4a4', '#ece2c8'), apron=('#2e5a2e', '#3e7a3e', '#5a9a50'),
                          hair=('#5a3a20', '#7a5230', '#9a6a40'), beard=True, straw_hat=('#a8843a', '#d8b058', '#f0d080'), pose='stand'),
    'npc-marlo':     dict(skin='skin2', shirt=('#6a2a22', '#9a3a2e', '#c05a40'), vest=('#3a3a22', '#5a5a34', '#7a7a48'),
                          hair=('#1a1410', '#2e2418', '#443624'), mustache=True, cap=('#2a4a6a', '#3a6a9a', '#5a8ac0'), pose='stand'),
    'npc-sev':       dict(skin='skin2', shirt=('#7a5010', '#b88020', '#e0b040'), hair=('#8a8a90', '#b8b8c0', '#dcdce4'),
                          bun=True, visor_cap=True, pose='stand'),
    'npc-vex':       dict(skin='skin', shirt=('#141018', '#241c2c', '#3a2e44'), vest=('#5a1040', '#a01870', '#d83098'),
                          hair=('#1a6a70', '#30b0b8', '#60e0e8'), mohawk=True, bald=True, visor_band=True, pose='sit'),
    'npc-cook':      dict(skin='skin2', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), apron=('#5a5040', '#8a7a60', '#a89878'),
                          hair=('#1a1410', '#2e2218', '#44342a'), beanie=('#2a2a30', '#44444c', '#5e5e68'), pose='sit'),
    'npc-sorceress': dict(skin='skin', shirt=('#1e1e48', '#2e3070', '#4a4c9a'), skirt=('#1e1e48', '#2e3070', '#4a4c9a'),
                          hair=('#8a8a98', '#c8c8d4', '#ececf4'), long_hair=True,
                          witch_hat=('#24163a', '#3e2a5e', '#5a4282'), pose='stand'),
}
LIGHT_DIR = Vector((-0.5, -0.35, 0.8)).normalized()


def hexc(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def lin(c):
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)


def mix(a, b, t):
    ca, cb = hexc(a), hexc(b)
    return '#' + ''.join('%02x' % round(255 * (ca[i] * (1 - t) + cb[i] * t)) for i in range(3))


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
PARTS = []          # (obj, tone_key, part_id)
PIDS = {}


def pid(name):
    if name not in PIDS:
        PIDS[name] = len(PIDS) + 1
    return PIDS[name]


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
        m = o.modifiers.new('bev', 'BEVEL')
        m.width = bevel
        m.segments = 3
    for p in o.data.polygons:
        p.use_smooth = True
    o.parent = parent
    o.data.materials.append(DEPTH)
    PARTS.append((o, tone, pid(part)))
    return o


# ---- skeleton (model units; root scaled to tiles) ---------------------------
root = pivot('root', (0, 0, 0))
root.scale = (UNIT, UNIT, UNIT)
body = pivot('body', (0, 0, 0), root)
hips, knees, shoulders = {}, {}, {}


def legs(tone_leg, tone_boot, thigh_tone=None):
    for side, sx in (('L', -2.1), ('R', 2.1)):
        hip = pivot('hip' + side, (sx, 0, 9.2), body)
        hips[side] = hip
        add('cube', 'thigh' + side, (0, 0, -2.0), (1.45, 1.6, 2.2), thigh_tone or tone_leg, 'leg' + side, hip, bevel=0.5)
        knee = pivot('knee' + side, (0, 0, -4.2), hip)
        knees[side] = knee
        add('cube', 'shin' + side, (0, 0, -1.6), (1.35, 1.5, 1.8), tone_leg, 'leg' + side, knee, bevel=0.5)
        add('cube', 'boot' + side, (0, -0.6, -3.2), (1.75, 2.5, 1.45), tone_boot, 'boot' + side, knee, bevel=0.6)


def arms(tone_arm, tone_hand):
    for side, sx in (('L', -5.3), ('R', 5.3)):
        sh = pivot('sh' + side, (sx, 0, 16.0), body)
        shoulders[side] = sh
        add('cube', 'arm' + side, (0, 0, -2.9), (1.25, 1.4, 3.1), tone_arm, 'arm' + side, sh, bevel=0.5)
        add('cube', 'hand' + side, (0, 0, -6.3), (1.3, 1.45, 1.15), tone_hand, 'arm' + side, sh, bevel=0.5)


head = None
tip = None


def build_pilot():
    global head, tip
    legs('suit', 'boot')
    for side in 'LR':
        add('cube', 'knee' + side, (0, -1.5, 0.2), (1.2, 0.35, 0.9), 'suitdk', 'leg' + side, knees[side], bevel=0.2)
    add('cube', 'torso', (0, 0, 13.2), (4.3, 3.1, 4.3), 'suit', 'torso', body, bevel=1.4)
    add('cube', 'belt', (0, 0, 9.7), (4.45, 3.25, 0.65), 'suitdk', 'torso', body, bevel=0.3)
    add('cube', 'buckle', (0, -3.25, 9.7), (0.85, 0.3, 0.55), 'brass', 'torso', body)
    add('cube', 'chest', (0, -3.05, 13.6), (2.1, 0.35, 1.5), 'suitdk', 'torso', body, bevel=0.2)
    add('cube', 'ledC', (-0.8, -3.4, 13.9), (0.45, 0.2, 0.45), 'ledc', 'torso', body)
    add('cube', 'ledY', (0.8, -3.4, 13.9), (0.45, 0.2, 0.45), 'ledy', 'torso', body)
    add('cube', 'pack', (0, 3.5, 13.4), (3.4, 1.5, 3.7), 'pack', 'pack', body, bevel=0.7)
    add('cylinder', 'tank', (2.2, 4.6, 13.6), (0.9, 0.9, 3.0), 'brass', 'pack', body, vertices=10)
    add('cube', 'packLight', (-1.6, 4.9, 16.2), (0.5, 0.3, 0.5), 'ledc', 'pack', body)
    arms('arm', 'suitdk')
    for side in 'LR':
        add('uv_sphere', 'pad' + side, (0, 0, 0.2), (1.9, 1.9, 1.5), 'suitdk', 'arm' + side, shoulders[side], segments=12, ring_count=8)
    helmet()


def helmet(collar='suitdk', ruff=False):
    global head, tip
    head = pivot('head', (0, 0, 18.6), body)
    if ruff:
        add('torus', 'ruff', (0, 0, 0.7), (1, 1, 1), 'fur', 'collar', head,
            major_radius=3.9, minor_radius=1.5, major_segments=20, minor_segments=8)
    else:
        add('torus', 'collar', (0, 0, 0.5), (1, 1, 1), collar, 'collar', head,
            major_radius=3.6, minor_radius=0.9, major_segments=20, minor_segments=8)
    add('uv_sphere', 'helmet', (0, 0, 5.0), (5.8, 5.5, 5.3), 'helmet', 'helmet', head, segments=28, ring_count=14)
    add('uv_sphere', 'visor', (0, -3.7, 4.6), (4.2, 3.1, 2.7), 'visor', 'visor', head, segments=24, ring_count=12)
    add('cube', 'glint', (-1.9, -6.55, 5.7), (0.55, 0.2, 0.5), 'glint', 'visor', head)
    add('cylinder', 'antenna', (3.0, 0.6, 10.6), (0.3, 0.3, 1.9), 'pack', 'helmet', head, vertices=8)
    tip = add('uv_sphere', 'antennaTip', (3.0, 0.6, 12.6), (0.85, 0.85, 0.85), 'ledy', 'helmet', head, segments=8, ring_count=6)


def build_coat():
    # the Voyager's Coat: a captain's long coat over the flight suit, gold epaulettes, a satchel on a strap
    legs('pants', 'leather')
    add('cube', 'torso', (0, 0, 13.2), (4.4, 3.2, 4.3), 'suit', 'torso', body, bevel=1.4)
    add('cone', 'tails', (0, 0.25, 7.5), (1, 0.9, 1), 'suit', 'tails', body, vertices=18, radius1=5.0, radius2=4.45, depth=4.8)
    add('cube', 'split', (0, -4.15, 7.3), (0.9, 0.45, 2.4), 'pants', 'split', body)        # the coat open below the belt
    for sx, rz in ((-1.55, 0.32), (1.55, -0.32)):
        add('cube', 'lapel', (sx, -3.28, 14.4), (0.95, 0.3, 2.7), 'suitdk', 'torso', body, rot=(0, rz, 0), bevel=0.2)
    for z in (12.4, 10.9):
        for sx in (-1.15, 1.15):
            add('cube', 'button', (sx, -3.35, z), (0.4, 0.25, 0.4), 'brass', 'torso', body)
    add('cube', 'belt', (0, 0, 9.7), (4.55, 3.35, 0.6), 'leather', 'torso', body, bevel=0.3)
    add('cube', 'buckle', (0, -3.4, 9.7), (0.85, 0.3, 0.55), 'brass', 'torso', body)
    add('cube', 'satchel', (4.2, -0.4, 8.6), (1.0, 2.1, 1.7), 'leather', 'satchel', body, bevel=0.4)
    add('cube', 'pack', (0, 3.6, 13.6), (3.2, 1.4, 3.4), 'leather', 'pack', body, bevel=0.8)
    add('cube', 'packflap', (0, 3.9, 16.4), (3.3, 1.5, 0.7), 'suitdk', 'pack', body, bevel=0.3)
    arms('suit', 'leather')
    for side in 'LR':
        add('cube', 'cuff' + side, (0, 0, -5.1), (1.45, 1.6, 0.55), 'suitdk', 'arm' + side, shoulders[side], bevel=0.2)
        add('cube', 'epaulette' + side, (0, 0, 0.8), (1.9, 1.75, 0.5), 'brass', 'arm' + side, shoulders[side], bevel=0.3)
    helmet()


def build_plate():
    # the Plated Suit: steel cuirass and pauldrons over the suit's colour, greaves, gauntlets, a heavy pack
    legs('steel', 'steeldk', thigh_tone='suit')
    for side in 'LR':
        add('uv_sphere', 'kneeguard' + side, (0, -1.5, 0.1), (1.5, 0.9, 1.4), 'steel', 'leg' + side, knees[side], segments=12, ring_count=8)
    add('cube', 'torso', (0, 0, 13.2), (4.3, 3.1, 4.3), 'suit', 'torso', body, bevel=1.4)
    add('cube', 'cuirass', (0, -0.15, 13.7), (4.6, 3.4, 3.4), 'steel', 'plate', body, bevel=1.3)
    add('cube', 'tabard', (0, -3.6, 11.4), (1.3, 0.3, 3.4), 'suit', 'tabard', body, bevel=0.2)
    add('cube', 'fauld', (0, 0, 9.4), (4.7, 3.5, 1.1), 'steeldk', 'torso', body, bevel=0.4)
    add('cube', 'pack', (0, 3.8, 13.6), (3.8, 1.8, 4.2), 'steeldk', 'pack', body, bevel=0.8)
    add('cylinder', 'tank', (2.5, 5.1, 13.8), (1.0, 1.0, 3.4), 'brass', 'pack', body, vertices=10)
    add('cube', 'packLight', (-1.8, 5.5, 16.6), (0.5, 0.3, 0.5), 'ledc', 'pack', body)
    arms('suit', 'steel')
    for side in 'LR':
        add('uv_sphere', 'pauldron' + side, (0, 0, 0.5), (2.5, 2.4, 1.9), 'steel', 'pauldron' + side, shoulders[side], segments=14, ring_count=8)
        add('cube', 'bracer' + side, (0, 0, -4.6), (1.5, 1.65, 1.0), 'steeldk', 'arm' + side, shoulders[side], bevel=0.3)
    helmet(collar='steeldk')


def build_thermal():
    # the Thermal Suit: quilted and puffed, a fur ruff, fur-topped snow boots, a sleeping roll on the pack
    legs('suit', 'boot')
    for side in 'LR':
        add('torus', 'bootfur' + side, (0, -0.4, -2.0), (1, 1.15, 1), 'fur', 'boot' + side, knees[side],
            major_radius=1.8, minor_radius=0.65, major_segments=14, minor_segments=6)
        add('uv_sphere', 'puffleg' + side, (0, 0, -1.9), (1.8, 1.95, 2.4), 'suit', 'leg' + side, hips[side], segments=12, ring_count=8)
    add('cube', 'torso', (0, 0, 13.0), (4.7, 3.5, 4.6), 'suit', 'torso', body, bevel=2.0)
    for z in (10.6, 13.0, 15.4):
        add('torus', 'quilt', (0, 0, z), (1, 0.76, 1), 'suitdk', 'torso', body,
            major_radius=4.75, minor_radius=0.55, major_segments=24, minor_segments=6)
    add('cube', 'pack', (0, 3.9, 13.4), (3.4, 1.5, 3.7), 'pack', 'pack', body, bevel=0.7)
    add('cylinder', 'bedroll', (0, 4.0, 17.9), (1.2, 1.2, 3.5), 'suitdk', 'pack', body, rot=(0, math.pi / 2, 0), vertices=12)
    add('cube', 'packLight', (-1.6, 5.3, 15.8), (0.5, 0.3, 0.5), 'ledy', 'pack', body)
    arms('suit', 'suitdk')
    for side in 'LR':
        add('uv_sphere', 'puffarm' + side, (0, 0, -2.3), (1.75, 1.85, 2.7), 'suit', 'arm' + side, shoulders[side], segments=12, ring_count=8)
        add('torus', 'mittfur' + side, (0, 0, -5.3), (1, 1, 1), 'fur', 'arm' + side, shoulders[side],
            major_radius=1.45, minor_radius=0.5, major_segments=12, minor_segments=6)
    helmet(ruff=True)


def build_runner():
    # the Neon Runner: an Arcadian street jacket open over a black tee, LED piping, a high collar, white kicks
    legs('pants', 'sneaker')
    for side, sx in (('L', -1.45), ('R', 1.45)):
        add('cube', 'ledthigh' + side, (sx, 0, -2.0), (0.22, 0.4, 2.0), 'ledp', 'led', hips[side])
        add('cube', 'ledshin' + side, (sx, 0, -1.4), (0.22, 0.4, 1.6), 'ledp', 'led', knees[side])
    add('cube', 'torso', (0, 0, 13.2), (4.1, 3.0, 4.3), 'suit', 'torso', body, bevel=1.3)
    add('cube', 'tee', (0, -2.95, 13.0), (1.15, 0.25, 3.9), 'pants', 'tee', body)
    for sx in (-1.3, 1.3):
        add('cube', 'piping', (sx, -3.1, 13.0), (0.22, 0.25, 3.9), 'ledc', 'led', body)
    add('cube', 'hem', (0, 0, 9.3), (4.2, 3.1, 0.55), 'suitdk', 'torso', body, bevel=0.2)
    add('cube', 'pack', (0, 3.25, 13.8), (2.5, 1.0, 3.0), 'pack', 'pack', body, bevel=0.6)
    add('cube', 'packLight', (0, 4.3, 14.6), (1.6, 0.25, 0.3), 'ledp', 'pack', body)
    arms('suit', 'pants')
    for side, sx in (('L', -1.3), ('R', 1.3)):
        add('cube', 'ledarm' + side, (sx, 0, -2.9), (0.2, 0.42, 2.7), 'ledc', 'led', shoulders[side])
    helmet()
    add('cylinder', 'highcollar', (0, 0, 1.2), (3.6, 3.4, 1.5), 'suitdk', 'collar', head, vertices=18)


def build_human(spec):
    global head
    legs('pants', 'leather')
    wide = 1.12 if spec.get('brawny') else 1.0
    add('cube', 'torso', (0, 0, 13.0), (4.0 * wide, 2.9 * wide, 4.2), 'shirt', 'torso', body, bevel=1.3)
    add('cube', 'belt', (0, 0, 9.6), (4.1 * wide, 3.0 * wide, 0.6), 'leather', 'torso', body, bevel=0.3)
    if 'skirt' in spec:
        add('cone', 'skirt', (0, 0, 5.2), (1, 0.9, 1), 'skirt', 'skirt', body,
            vertices=16, radius1=4.9, radius2=3.6, depth=8.6)
    if 'apron' in spec:
        add('cube', 'apron', (0, -2.95, 9.6), (3.4, 0.35, 4.2), 'apron', 'torso', body, bevel=0.2)
    if 'vest' in spec:
        add('cube', 'vestL', (-2.4, -2.1, 13.4), (1.5, 1.0, 3.8), 'vest', 'torso', body, bevel=0.3)
        add('cube', 'vestR', (2.4, -2.1, 13.4), (1.5, 1.0, 3.8), 'vest', 'torso', body, bevel=0.3)
    arms('sleeve' if 'sleeve' in spec else 'shirt', 'skin')
    head = pivot('head', (0, 0, 17.4), body)
    add('cylinder', 'neck', (0, 0, 0.6), (1.6, 1.6, 1.2), 'skin', 'neck', head, vertices=10)
    add('uv_sphere', 'face', (0, 0, 5.2), (5.0, 4.8, 5.0), 'skin', 'head', head, segments=24, ring_count=12)
    for sx in (-1.8, 1.8):
        add('cube', 'eye', (sx, -4.6, 5.9), (0.7, 0.7, 1.0), 'eye', 'eyes', head)
    add('cube', 'nose', (0, -4.9, 4.4), (0.55, 0.6, 0.6), 'skin', 'head', head, bevel=0.2)
    if not spec.get('bald'):
        add('uv_sphere', 'hair', (0, 0.5, 6.4), (5.3, 5.0, 4.3), 'hair', 'hair', head, segments=20, ring_count=10)
    else:
        for sx in (-4.6, 4.6):
            add('uv_sphere', 'hairside', (sx, 0.6, 4.6), (1.0, 2.6, 1.8), 'hair', 'hair', head, segments=10, ring_count=6)
    if spec.get('mustache'):
        add('cube', 'mustache', (0, -4.75, 3.4), (2.2, 0.5, 0.5), 'hair', 'beard', head, bevel=0.2)
    if spec.get('beard'):
        add('uv_sphere', 'beard', (0, -3.4, 2.4), (3.6, 2.0, 2.5), 'hair', 'beard', head, segments=14, ring_count=8)
    if 'beanie' in spec:
        add('uv_sphere', 'beanie', (0, 0.3, 7.6), (5.3, 5.1, 3.6), 'beanie', 'hat', head, segments=20, ring_count=10)
        add('torus', 'beanie_rim', (0, 0.2, 6.9), (1, 1, 0.7), 'beanie', 'hat', head,
            major_radius=4.9, minor_radius=0.8, major_segments=20, minor_segments=6)
    if spec.get('bun'):
        add('uv_sphere', 'bun', (0, 3.6, 8.4), (2.2, 2.0, 2.0), 'hair', 'hair', head, segments=12, ring_count=8)
    if spec.get('long_hair'):
        add('cube', 'hair_back', (0, 3.2, 2.6), (4.2, 1.6, 4.2), 'hair', 'hair', head, bevel=1.0)
    if 'hood' in spec:
        add('uv_sphere', 'hood', (0, 1.2, 5.8), (5.7, 5.4, 5.6), 'hood', 'hood', head, segments=20, ring_count=10)
        add('cone', 'hood_drape', (0, 1.6, 0.4), (1, 1, 1), 'hood', 'hood', head, vertices=14, radius1=5.0, radius2=3.2, depth=3.0)
    if spec.get('chef'):
        add('cylinder', 'chef_band', (0, 0.2, 9.0), (4.6, 4.4, 1.0), 'white', 'hat', head, vertices=18)
        add('uv_sphere', 'chef_puff', (0, 0.2, 11.2), (5.0, 4.8, 2.6), 'white', 'hat', head, segments=16, ring_count=8)
    if 'cap' in spec:
        add('cylinder', 'cap', (0, 0.3, 9.0), (5.4, 5.2, 1.4), 'cap', 'hat', head, vertices=20)
        add('cube', 'brim', (0, -4.6, 8.1), (3.4, 2.2, 0.35), 'cap', 'hat', head, bevel=0.3)
    if spec.get('visor_band'):   # glowing cyber visor across the eyes
        add('cube', 'visor_band', (0, -4.4, 5.9), (4.9, 0.9, 1.1), 'ledc', 'visor', head, bevel=0.3)
    if spec.get('visor_cap'):    # green eyeshade
        add('cube', 'eyeshade', (0, -3.8, 8.0), (4.8, 2.6, 0.35), 'visor', 'hat', head, rot=(0.25, 0, 0), bevel=0.2)
        add('torus', 'eyeshade_band', (0, 0.0, 8.2), (1, 1, 0.5), 'visor', 'hat', head,
            major_radius=4.8, minor_radius=0.5, major_segments=18, minor_segments=5)
    if spec.get('goggles'):      # pushed up on the forehead
        for sx in (-1.9, 1.9):
            add('cylinder', 'goggle', (sx, -3.9, 8.3), (1.4, 1.4, 0.9), 'brass', 'goggles', head, rot=(1.2, 0, 0), vertices=12)
            add('cylinder', 'goggle_lens', (sx, -4.5, 8.5), (1.0, 1.0, 0.3), 'ledc', 'goggle_lens', head, rot=(1.2, 0, 0), vertices=12)
        add('torus', 'goggle_strap', (0, 0.0, 8.0), (1, 1, 0.6), 'leather', 'goggles', head,
            major_radius=5.0, minor_radius=0.45, major_segments=18, minor_segments=5)
    if spec.get('mask'):         # surgical mask
        add('cube', 'mask', (0, -4.3, 3.4), (3.6, 1.0, 1.9), 'white', 'mask', head, bevel=0.5)
    if spec.get('mohawk'):
        add('cube', 'mohawk', (0, 0.6, 10.0), (0.9, 4.4, 2.2), 'hair', 'hair', head, bevel=0.4)
    if 'straw_hat' in spec:      # a wide-brimmed straw hat with a band (Verdance)
        add('cylinder', 'straw_brim', (0, 0.4, 8.7), (7.2, 6.9, 0.35), 'straw_hat', 'hat', head, vertices=24)
        add('cylinder', 'straw_crown', (0, 0.4, 9.9), (4.5, 4.3, 1.5), 'straw_hat', 'hat', head, vertices=18)
        add('cylinder', 'straw_band', (0, 0.4, 9.3), (4.6, 4.4, 0.45), 'leather', 'hat_band', head, vertices=18)
    if 'witch_hat' in spec:
        add('cylinder', 'hat_brim', (0, 0.8, 9.2), (6.4, 6.0, 0.4), 'witch_hat', 'hat', head, rot=(-0.3, 0, 0), vertices=24)
        add('cylinder', 'hat_band', (0, 1.0, 9.9), (4.4, 4.2, 0.8), 'leather', 'hat_band', head, rot=(-0.3, 0, 0), vertices=18)
        add('cone', 'hat_cone', (0, 2.4, 13.4), (1, 1, 1), 'witch_hat', 'hat', head,
            rot=(-0.4, 0, 0), vertices=16, radius1=4.3, radius2=0.5, depth=8.0)


if WHO.startswith('pilot'):          # pilot[-sit][-<style>]: the suits, standing or seated (chairs, benches, stools)
    STYLE = WHO.split('-')[-1] if WHO not in ('pilot', 'pilot-sit') else 'flight'
    {'flight': build_pilot, 'coat': build_coat, 'plate': build_plate, 'thermal': build_thermal, 'runner': build_runner}[STYLE]()
    VARIANTS = {s: {'suit': SUITS[s], 'suitdk': (mix(SUITS[s][0], '#000000', 0.25), SUITS[s][0], mix(SUITS[s][0], SUITS[s][1], 0.5)),
                    'arm': (mix(SUITS[s][0], '#000000', 0.12), mix(SUITS[s][1], SUITS[s][0], 0.3), mix(SUITS[s][2], SUITS[s][1], 0.35))}
                for s in SUITS}
    POSE = 'sit' if WHO.startswith('pilot-sit') else 'stand'
else:
    spec = NPCS[WHO]
    build_human(spec)
    tones = {'shirt': spec['shirt'], 'pants': FIXED['pants'], 'hair': spec['hair'], 'skin': FIXED[spec['skin']]}
    if 'sleeve' in spec:
        tones['sleeve'] = FIXED[spec['sleeve']] if spec['sleeve'] in FIXED else FIXED[spec['skin']]
    for key in ('apron', 'vest', 'beanie', 'cap', 'skirt', 'hood', 'witch_hat', 'straw_hat'):
        if key in spec:
            tones[key] = spec[key]
    VARIANTS = {WHO.replace('npc-', ''): tones}
    POSE = spec['pose']

# ---- camera: scene angle, origin pinned to ORIGIN_PX ----------------------------
cd = bpy.data.cameras.new('cam')
cd.type = 'ORTHO'
cd.ortho_scale = max(W, H) / 32
cam = bpy.data.objects.new('cam', cd)
scene.collection.objects.link(cam)
f = Vector((0, math.cos(ELEV), -math.sin(ELEV)))
up = Vector((0, math.sin(ELEV), math.cos(ELEV)))
# frame centre is (W/2, H/2); origin pixel sits below/left of it
dx = (W / 2 - ORIGIN_PX[0]) / 32
dy = (ORIGIN_PX[1] - H / 2) / 32          # tiles the centre is above the origin
center = Vector((dx, 0, 0)) + up * dy
cam.location = center - f * 50
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

# ---- poses -------------------------------------------------------------------------
DIRS = {'down': 0, 'right': 90, 'up': 180, 'left': -90}
STRIDE, ARM = math.radians(34), math.radians(30)
SEAT = 0.48 / UNIT          # stool height in model units
FRAMES = []
for i in range(4):
    FRAMES.append(('idle', i, 0.0, [0, 0.4, 0.8, 0.4][i], i != 2))
for i in range(8):
    ph = 2 * math.pi * i / 8
    FRAMES.append(('walk', i, math.sin(ph), -0.9 * abs(math.sin(ph)) + 0.45, True))


def pose(swing, lift, frame):
    if POSE == 'sit':
        # thighs forward onto the seat, shins down; small breathing + sway
        for side in 'LR':
            hips[side].rotation_euler = (math.radians(-88), 0, 0)
            knees[side].rotation_euler = (math.radians(92), 0, 0)
        shoulders['L'].rotation_euler = (math.radians(-28), 0, math.radians(-8))
        shoulders['R'].rotation_euler = (math.radians(-20 - 6 * (frame % 2)), 0, math.radians(8))
        body.location = (0, 0, SEAT - 9.2 + lift * 0.6)
        if head:
            head.rotation_euler = (0, 0, math.radians([0, 4, 0, -4][frame % 4]))
        return
    hips['L'].rotation_euler = (STRIDE * swing, 0, 0)
    hips['R'].rotation_euler = (-STRIDE * swing, 0, 0)
    for side in 'LR':
        knees[side].rotation_euler = (max(0.0, -STRIDE * swing * (1 if side == 'L' else -1)) * 0.6, 0, 0)
    shoulders['L'].rotation_euler = (-ARM * swing, 0, 0)
    shoulders['R'].rotation_euler = (ARM * swing, 0, 0)
    body.location = (0, 0, lift)


ID_MATS = {p: flat_mat('id%d' % p, (((p * 37) % 251) / 255, ((p * 91) % 251) / 255, ((p * 53) % 251) / 255)) for p in PIDS.values()}
COLOR = {}
for v, tones in VARIANTS.items():
    for _, tone, _ in PARTS:
        if (v, tone) not in COLOR:
            COLOR[(v, tone)] = cel_mat(v + tone, tones.get(tone) or FIXED[tone])
TIP_OFF = cel_mat('tipoff', FIXED['ledoff'])


def set_pass(kind, variant=None):
    for o, tone, p in PARTS:
        o.data.materials[0] = DEPTH if kind == 'depth' else ID_MATS[p] if kind == 'id' else COLOR[(variant, tone)]


def render(path, sixteen=False):
    scene.render.image_settings.color_mode = 'BW' if sixteen else 'RGBA'
    scene.render.image_settings.color_depth = '16' if sixteen else '8'
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


for kind in ['id', 'depth'] + ['color_' + v for v in VARIANTS]:
    os.makedirs(os.path.join(OUT, kind), exist_ok=True)
for dname, yaw in DIRS.items():
    root.rotation_euler = (0, 0, math.radians(yaw))
    for anim, i, swing, lift, tip_on in FRAMES:
        pose(swing, lift, i)
        tag = f'{dname}_{anim}{i}.png'
        set_pass('id'); render(os.path.join(OUT, 'id', tag))
        set_pass('depth'); render(os.path.join(OUT, 'depth', tag), sixteen=True)
        for v in VARIANTS:
            set_pass('color', v)
            if tip is not None and not tip_on:
                tip.data.materials[0] = TIP_OFF
            render(os.path.join(OUT, 'color_' + v, tag))
print('rendered', WHO, len(FRAMES) * len(DIRS), 'frames x', len(VARIANTS))
