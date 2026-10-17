"""Weapons in the pilot's hand: the models, and the packer for their frames.

Every weapon is modelled here in characters.py's tile units and cel shading (the same camera and key light as the
pilot), along -y from where the main hand grips it. characters.py renders them in the hand, frame by frame — each
attack pose of the weapon's class (attacks.py) and the idle/walk frames carrying it — with the pilot's body as a
holdout, so whatever of the weapon the body hides is already cut away:

  BVENV/bin/python tools/bridge-art/characters.py /tmp/w/a pilot-weapons-a        # every weapon, build A
  BVENV/bin/python tools/bridge-art/characters.py /tmp/w/b pilot-weapons-b        # and build B
  python3 tools/bridge-art/weapon_sprites.py pack /tmp/w                          # → apps/bridge/assets/characters/weapons/

The packer draws the line work (sprites_post.py's rules; where the body covers the weapon the weapon's own edge goes
dark instead of an outline on the body), crops every frame to what's in it and packs each weapon's frames for both
builds into one atlas, <id>.png, with <id>.json: for build a|b, direction, frame — [x, y, w, h, dx, dy] (dx, dy:
where the cropped frame's corner sits from the pilot's floor point) — plus anchors: where the hand and the tip are
in each frame (px from the floor point) and whether the hand is in front of the body.

Add a weapon: a WEAPONS entry (the attacks.CLASSES pose set it's swung with, its build, the tip), its tones in TONES
(TWIN: a pair, one in each hand), then render and pack (pilots.sh WEAPONS=only); js/arms.js gives it its class's
swings, by items.js `cls`.
"""
import glob
import json
import math
import os
import sys

# ---- tones (dark, mid, light); a glowing part has all three the same ------------------------------------------
TONES = {
    'w_steel':    ('#4a5262', '#9aa4b8', '#dce4f0'),
    'w_bright':   ('#6a7488', '#c0c8d8', '#f6f8ff'),
    'w_iron':     ('#24242c', '#44444e', '#6c6c78'),
    'w_brass':    ('#7a5a20', '#c8a040', '#f0d070'),
    'w_gold':     ('#8a6a10', '#d0a020', '#f8e070'),
    'w_leather':  ('#2e1c10', '#563620', '#7a5230'),
    'w_wood':     ('#3e2614', '#6e4626', '#9a6a3c'),
    'w_ash':      ('#6a4e2e', '#a8844e', '#d4b27a'),
    'w_blackwood': ('#120e16', '#28202e', '#463a50'),
    'w_star':     ('#22202e', '#3e3a54', '#686286'),
    'w_song':     ('#c090ff', '#c090ff', '#c090ff'),
    'w_glass':    ('#7a90c0', '#c4d6f6', '#f8fbff'),
    'w_moonhilt': ('#2a2040', '#463a6a', '#6a5a94'),
    'w_blackglass': ('#0e0c18', '#262238', '#4a4068'),
    'w_violet':   ('#b080ff', '#b080ff', '#b080ff'),
    'w_ember':    ('#ffa040', '#ffa040', '#ffa040'),
    'w_emberhot': ('#fff0a0', '#fff0a0', '#fff0a0'),
    'w_ice':      ('#4a7aa4', '#9cd0f8', '#e8f8ff'),
    'w_frost':    ('#e8f8ff', '#e8f8ff', '#e8f8ff'),
    'w_wisp':     ('#e4d0ff', '#e4d0ff', '#e4d0ff'),
    'w_moon':     ('#f4f6ff', '#f4f6ff', '#f4f6ff'),
    'w_silver':   ('#6a7080', '#b0b8c8', '#eef0f8'),
    'w_pickold':  ('#2e2e34', '#55555c', '#86868e'),
    'w_pickiron': ('#4a4a58', '#8a8a9a', '#d0d0e0'),
    'w_axeblue':  ('#1a4a8a', '#3a8ae0', '#8ac0ff'),
    'w_red':      ('#5a1410', '#9a2a20', '#c84a3a'),
    'w_tide':     ('#24485a', '#5a92aa', '#bce4f4'),
    'w_tooth':    ('#8aa4c0', '#d4e6f4', '#fafdff'),
    'w_hide':     ('#1e3046', '#3a5674', '#5e80a4'),
    'w_yew':      ('#4a2a14', '#8a5428', '#c08448'),
    'w_elfwood':  ('#3a2a1a', '#6e5232', '#a8865a'),
    'w_string':   ('#b8b0a0', '#e8e2d4', '#fffaf0'),
    'w_fletch':   ('#5a7a3a', '#8ab858', '#c8e890'),
    'w_moonleaf': ('#a8e0d8', '#a8e0d8', '#a8e0d8'),
}

Y = (math.pi / 2, 0, 0)      # turns a cone or cylinder (built along +z) to lie along -y


def _cyl(add, name, y0, y1, r, tone, part, parent, verts=10):
    """A round shaft from y0 to y1 (along the weapon)."""
    add('cylinder', name, (0, (y0 + y1) / 2, 0), (r, r, abs(y1 - y0) / 2), tone, part, parent, rot=Y, vertices=verts)


def _tip(add, name, y, length, half_w, half_t, tone, part, parent):
    """A blade's point: a flat pyramid from y toward -y."""
    add('cone', name, (0, y - length / 2, 0), (half_t, half_w, 1.0), tone, part, parent, rot=Y,
        vertices=4, radius1=1.0, radius2=0.0, depth=length)


def _curved(add, name, y0, length, segs, bend, half_w, half_t, tone, part, parent):
    """A curved blade: segments turning a little more each one (bend degrees each), the spine toward +z."""
    y, z, ang = y0, 0.0, 0.0
    seg = length / segs
    for i in range(segs):
        ang += math.radians(bend)
        cy, cz = y - math.cos(ang) * seg / 2, z + math.sin(ang) * seg / 2
        w = half_w * (1 - 0.18 * i / max(1, segs - 1))
        add('cube', name, (0, cy, cz), (half_t, seg / 2 + 0.15, w), tone, part, parent, rot=(-ang, 0, 0))
        y, z = y - math.cos(ang) * seg, z + math.sin(ang) * seg
    return y, z, ang


def _hilt(add, parent, grip='w_leather', guard='w_brass', pommel='w_brass', guard_w=1.9, pommel_r=0.7):
    add('cube', 'grip', (0, 0.25, 0), (0.5, 1.7, 0.5), grip, 'grip', parent)
    add('uv_sphere', 'pommel', (0, 2.3, 0), (pommel_r, pommel_r, pommel_r), pommel, 'pommel', parent, segments=8, ring_count=6)
    add('cube', 'guard', (0, -1.75, 0), (0.55, 0.32, guard_w), guard, 'guard', parent, bevel=0.1)


def iron_dagger(add, p):
    _hilt(add, p)
    add('cube', 'blade', (0, -4.4, 0), (0.28, 2.5, 0.8), 'w_steel', 'blade', p)
    _tip(add, 'tip', -6.9, 1.6, 0.8, 0.28, 'w_steel', 'blade', p)


def veilpiercer(add, p):
    _hilt(add, p, grip='w_blackglass', guard='w_violet', pommel='w_violet', guard_w=1.5, pommel_r=0.6)
    add('cube', 'blade', (0, -5.2, 0), (0.26, 3.3, 0.62), 'w_blackglass', 'blade', p)
    add('cube', 'edge', (0, -5.0, -0.62), (0.22, 3.0, 0.16), 'w_violet', 'edge', p)
    _tip(add, 'tip', -8.5, 2.0, 0.62, 0.26, 'w_blackglass', 'blade', p)


def cutlass(add, p):
    _hilt(add, p, guard_w=1.6)
    add('cube', 'bow', (0, 0.3, -1.65), (0.3, 1.9, 0.28), 'w_brass', 'guard', p)        # the knuckle bow under the fist
    y, z, a = _curved(add, 'blade', -1.9, 10.0, 4, 5, 1.0, 0.3, 'w_steel', 'blade', p)
    add('cone', 'tip', (0, y - 0.8 * math.cos(a), z + 0.8 * math.sin(a)), (0.3, 0.8, 1.0), 'w_steel', 'blade', p,
        rot=(math.pi / 2 - a, 0, 0), vertices=4, radius1=1.0, radius2=0.0, depth=1.6)


def star_blade(add, p):
    _hilt(add, p, guard='w_gold', pommel='w_song', guard_w=2.3, pommel_r=0.95)
    add('cube', 'blade', (0, -7.4, 0), (0.32, 5.6, 1.0), 'w_star', 'blade', p)
    add('cube', 'fuller', (0, -6.9, 0), (0.34, 4.6, 0.26), 'w_gold', 'fuller', p)
    _tip(add, 'tip', -13.0, 2.0, 1.0, 0.32, 'w_star', 'blade', p)


def moonglass_sabre(add, p):
    _hilt(add, p, grip='w_moonhilt', guard='w_gold', pommel='w_moonhilt', guard_w=1.5)
    y, z, a = _curved(add, 'blade', -1.9, 11.0, 4, 6, 0.95, 0.3, 'w_glass', 'blade', p)
    add('cone', 'tip', (0, y - 0.8 * math.cos(a), z + 0.8 * math.sin(a)), (0.3, 0.9, 1.0), 'w_glass', 'blade', p,
        rot=(math.pi / 2 - a, 0, 0), vertices=4, radius1=1.0, radius2=0.0, depth=1.6)


def emberbrand(add, p):
    _hilt(add, p, grip='w_iron', guard='w_iron', pommel='w_ember', guard_w=2.2, pommel_r=0.8)
    add('cube', 'blade', (0, -6.1, 0), (0.36, 4.3, 1.35), 'w_iron', 'blade', p)
    add('cube', 'core', (0, -5.8, 0), (0.38, 3.5, 0.34), 'w_ember', 'core', p)
    add('cube', 'heart', (0, -3.4, 0), (0.4, 0.6, 0.42), 'w_emberhot', 'core', p)
    _tip(add, 'tip', -10.4, 2.2, 1.35, 0.36, 'w_iron', 'blade', p)


def rime_hatchet(add, p):
    _cyl(add, 'haft', 2.4, -10.2, 0.55, 'w_wood', 'haft', p)
    add('cube', 'head', (0, -9.2, -1.1), (0.5, 1.3, 1.5), 'w_ice', 'head', p, bevel=0.15)
    add('cube', 'bit', (0, -9.2, -3.0), (0.42, 2.2, 0.65), 'w_ice', 'head', p, bevel=0.15)
    add('cube', 'edge', (0, -9.2, -3.7), (0.36, 2.3, 0.2), 'w_frost', 'edge', p)
    add('cube', 'poll', (0, -9.2, 1.1), (0.46, 0.8, 0.7), 'w_ice', 'head', p)


def boarding_pike(add, p):
    _cyl(add, 'shaft', 3.2, -24.6, 0.42, 'w_ash', 'shaft', p, verts=8)
    _cyl(add, 'socket', -24.0, -25.4, 0.6, 'w_iron', 'socket', p, verts=8)
    add('cone', 'head', (0, -27.6, 0), (0.36, 1.05, 1.0), 'w_steel', 'head', p, rot=Y, vertices=4, radius1=1.0,
        radius2=0.0, depth=4.4)
    _cyl(add, 'butt', 3.6, 2.8, 0.55, 'w_iron', 'socket', p, verts=8)


def war_maul(add, p):
    _cyl(add, 'haft', 2.6, -14.0, 0.56, 'w_wood', 'haft', p)
    _cyl(add, 'grip', 2.6, -1.4, 0.62, 'w_leather', 'grip', p)
    add('cube', 'head', (0, -15.6, 0), (1.9, 2.1, 3.4), 'w_iron', 'head', p, bevel=0.35)
    for z in (-2.6, 2.6):
        add('cube', 'band', (0, -15.6, z), (2.05, 2.25, 0.42), 'w_brass', 'band', p)


def wispcaller(add, p):
    _cyl(add, 'staff', 7.0, -15.0, 0.5, 'w_blackwood', 'staff', p, verts=8)
    for x, z in ((1.35, 0), (-1.35, 0)):
        add('cube', 'cage', (x, -16.9, z), (0.22, 2.0, 0.22), 'w_blackwood', 'cage', p)
    add('uv_sphere', 'wisp', (0, -16.9, 0), (1.35, 1.35, 1.35), 'w_wisp', 'wisp', p, segments=10, ring_count=6)
    add('cone', 'finial', (0, -19.3, 0), (0.5, 0.5, 1.0), 'w_blackwood', 'cage', p, rot=Y, vertices=6, radius1=1.0,
        radius2=0.0, depth=1.4)


def moon_wand(add, p):
    _cyl(add, 'wand', 1.8, -7.6, 0.42, 'w_blackwood', 'wand', p, verts=8)
    _cyl(add, 'ferrule', -7.3, -8.1, 0.56, 'w_silver', 'ferrule', p, verts=8)
    add('uv_sphere', 'stone', (0, -8.9, 0), (1.0, 1.0, 1.0), 'w_moon', 'stone', p, segments=8, ring_count=6)


def _pick(head, glint=None):
    def build(add, p):
        _cyl(add, 'haft', 1.8, -9.6, 0.46, 'w_wood', 'haft', p)
        add('cube', 'eye', (0, -10.2, 0), (0.6, 0.8, 0.8), head, 'head', p)
        add('cone', 'point', (0, -10.2, -2.2), (0.55, 0.6, 1.0), head, 'head', p, rot=(math.pi, 0, 0), vertices=6,
            radius1=1.0, radius2=0.0, depth=3.2)
        add('cone', 'back', (0, -10.2, 2.0), (0.5, 0.55, 1.0), head, 'head', p, vertices=6, radius1=1.0, radius2=0.0,
            depth=2.8)
        if glint:
            add('cube', 'glint', (0, -10.2, -0.9), (0.62, 0.3, 0.3), glint, 'glint', p)
    return build


def ice_axe(add, p):
    _cyl(add, 'shaft', 1.8, -9.4, 0.4, 'w_axeblue', 'shaft', p, verts=8)
    add('cube', 'eye', (0, -10.0, 0), (0.5, 0.7, 0.7), 'w_steel', 'head', p)
    add('cone', 'pick', (0, -10.0, -2.1), (0.45, 0.5, 1.0), 'w_steel', 'head', p, rot=(math.pi + 0.25, 0, 0), vertices=6,
        radius1=1.0, radius2=0.0, depth=3.0)
    add('cube', 'adze', (0, -10.0, 1.4), (0.36, 1.0, 0.8), 'w_steel', 'head', p)


def twin_fangs(add, p):
    # a pair of curved knives (the other one is built in the off hand: TWIN)
    _hilt(add, p, grip='w_red', guard='w_iron', pommel='w_iron', guard_w=1.3, pommel_r=0.55)
    y, z, a = _curved(add, 'blade', -1.9, 5.8, 3, 10, 0.8, 0.27, 'w_bright', 'blade', p)
    add('cone', 'tip', (0, y - 0.7 * math.cos(a), z + 0.7 * math.sin(a)), (0.27, 0.8, 1.0), 'w_bright', 'blade', p,
        rot=(math.pi / 2 - a, 0, 0), vertices=4, radius1=1.0, radius2=0.0, depth=1.4)


def tidebreaker(add, p):
    # a two-handed greatsword: the main hand at the pommel end of a long grip, the other hand near the guard
    add('cube', 'grip', (0, -2.6, 0), (0.55, 4.2, 0.55), 'w_leather', 'grip', p)
    add('uv_sphere', 'pommel', (0, 2.0, 0), (0.9, 0.9, 0.9), 'w_brass', 'pommel', p, segments=8, ring_count=6)
    add('cube', 'guard', (0, -7.1, 0), (0.62, 0.42, 2.9), 'w_brass', 'guard', p, bevel=0.1)
    add('cube', 'blade', (0, -14.4, 0), (0.38, 7.0, 1.45), 'w_tide', 'blade', p)
    add('cube', 'fuller', (0, -13.6, 0), (0.4, 5.6, 0.3), 'w_steel', 'fuller', p)
    _tip(add, 'tip', -21.4, 2.8, 1.45, 0.38, 'w_tide', 'blade', p)


def wyrmfang(add, p):
    # the glacier wyrm's tooth ground to a sabre: a long pale curve, bound at the root in its blue hide, a scale for a guard
    _hilt(add, p, grip='w_hide', guard='w_ice', pommel='w_ice', guard_w=1.7, pommel_r=0.75)
    y, z, a = _curved(add, 'blade', -1.9, 11.5, 5, 7, 1.1, 0.34, 'w_tooth', 'blade', p)
    add('cube', 'root', (0, -2.6, 0), (0.4, 0.8, 1.2), 'w_hide', 'grip', p)
    add('cone', 'tip', (0, y - 0.8 * math.cos(a), z + 0.8 * math.sin(a)), (0.34, 1.0, 1.1), 'w_tooth', 'blade', p,
        rot=(math.pi / 2 - a, 0, 0), vertices=4, radius1=1.0, radius2=0.0, depth=1.8)


def hoe(add, p):
    _cyl(add, 'haft', 2.4, -12.0, 0.42, 'w_wood', 'haft', p, verts=8)
    add('cube', 'blade', (0, -12.3, -1.5), (1.35, 0.24, 1.2), 'w_iron', 'head', p)


def _bow(wood, grip='w_leather', tip_cap='w_brass', inlay=None):
    """A bow, upright: the limbs bent along a parabola from the grip (the back toward the mark, -y) to the tips, which
    sit `curve` back toward the archer at ±half and flick forward a little (a recurve). The string and the nocked arrow
    aren't built here: attack_rig.rig() adds them and moves them every frame (BOWS: half, curve), so the string runs to
    the drawing hand."""
    def build(add, p):
        from mathutils import Vector
        half, curve = BOWS_BY_BUILD[build]['half'], BOWS_BY_BUILD[build]['curve']
        segs = 10
        pts = [Vector((0, curve * t * t, half * t)) for t in [-1 + 2 * i / segs for i in range(segs + 1)]]
        for i in range(segs):
            a, b = pts[i], pts[i + 1]
            d = b - a
            mid = abs((i + 0.5) / segs - 0.5)
            r = 0.62 - 0.5 * mid                                  # thick at the grip, slim at the tips
            add('cylinder', 'limb', tuple((a + b) / 2), (r, r * 0.7, d.length / 2 + 0.06), wood, 'limb', p,
                rot=d.normalized().to_track_quat('Z', 'Y').to_euler(), vertices=8)
        for sgn in (-1, 1):                                       # the recurved tips, capped
            a = pts[-1] if sgn > 0 else pts[0]
            b = a + Vector((0, -0.9, sgn * 0.9))
            add('cylinder', 'limb_tip', tuple((a + b) / 2), (0.22, 0.2, (b - a).length / 2), wood, 'limb', p,
                rot=(b - a).normalized().to_track_quat('Z', 'Y').to_euler(), vertices=6)
            add('uv_sphere', 'tip_cap', tuple(b), (0.3, 0.3, 0.3), tip_cap, 'cap', p, segments=6, ring_count=4)
        add('cylinder', 'grip', (0, 0.05, 0), (0.78, 0.7, 1.5), grip, 'grip', p, vertices=8)
        if inlay:                                                 # a leaf inlaid either side of the grip
            for sgn in (-1, 1):
                add('cube', 'inlay', (0, -0.2 + curve * 0.09, sgn * 2.6), (0.5, 0.3, 0.75), inlay, 'inlay', p)
    return build


# id: (class, build, tip in model units along the weapon, trail colour for the swing in the game)
WEAPONS = {
    'iron_dagger':     ('blade', iron_dagger, 8.5),
    'veilpiercer':     ('blade', veilpiercer, 10.5),
    'cutlass':         ('sword', cutlass, 12.5),
    'star_blade':      ('sword', star_blade, 15.0),
    'moonglass_sabre': ('sword', moonglass_sabre, 13.5),
    'emberbrand':      ('chop', emberbrand, 12.6),
    'rime_hatchet':    ('chop', rime_hatchet, 10.6),
    'boarding_pike':   ('pole', boarding_pike, 29.8),
    'war_maul':        ('maul', war_maul, 17.6),
    'wispcaller':      ('cast', wispcaller, 19.9),
    'moon_wand':       ('cast', moon_wand, 9.9),
    'old_pickaxe':     ('pick', _pick('w_pickold'), 10.2),
    'iron_pickaxe':    ('pick', _pick('w_pickiron'), 10.2),
    'star_pickaxe':    ('pick', _pick('w_star', 'w_gold'), 10.2),
    'ice_axe':         ('pick', ice_axe, 10.0),
    'hoe':             ('pick', hoe, 12.3),
    'twin_fangs':      ('blade', twin_fangs, 9.0),
    'tidebreaker':     ('maul', tidebreaker, 24.2),      # a greatsword, swung with the maul's poses (js/arms.js 'great')
    'wyrmfang':        ('sword', wyrmfang, 14.5),
}
# the bows (Sylvara): the tip is where the arrow leaves (just ahead of the grip); half, curve shape the limbs and the
# string (attack_rig.py moves the string and the nocked arrow to the drawing hand frame by frame)
BOWS = {
    'elven_bow':       dict(build=_bow('w_elfwood', grip='w_leather', tip_cap='w_gold', inlay='w_gold'), half=9.5, curve=2.6),
    'heartwood_bow':   dict(build=_bow('w_yew', grip='w_moonhilt', tip_cap='w_silver', inlay='w_moonleaf'), half=11.5, curve=3.0),
}
BOWS_BY_BUILD = {v['build']: v for v in BOWS.values()}
for _id, _b in BOWS.items():
    WEAPONS[_id] = ('bow', _b['build'], 1.2)
TWIN = {'twin_fangs'}             # a second one in the other hand


# ---- packing ----------------------------------------------------------------------------------------------------
BODY_ID = (255, 255, 255)        # the body in the id pass (characters.py renders it there in flat white)


def post(color_path, id_path, depth_path):
    """sprites_post.py's line work for a weapon layer: lines where one part of it sits in front of another, the
    outline round it — except against the body, where the weapon's own edge darkens instead."""
    import numpy as np
    from PIL import Image
    OUTLINE = np.array([11, 10, 24], np.float32)
    c = np.array(Image.open(color_path).convert('RGBA'))
    ids = np.array(Image.open(id_path).convert('RGBA')).astype(np.int32)
    body = (ids[..., 3] >= 128) & (ids[..., 0] == 255) & (ids[..., 1] == 255) & (ids[..., 2] == 255)
    idk = (ids[..., 0] << 16) | (ids[..., 1] << 8) | ids[..., 2]
    dep = np.array(Image.open(depth_path)).astype(np.int64)
    if dep.ndim == 3:
        dep = dep[..., 0]
    op = (c[..., 3] >= 128) & ~body
    h, w = op.shape
    out = np.zeros_like(c)
    out[op] = c[op]
    out[op, 3] = 255
    line = np.zeros((h, w), bool)
    ring = np.zeros((h, w), bool)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        ys0, ys1 = max(0, -dy), h - max(0, dy)
        xs0, xs1 = max(0, -dx), w - max(0, dx)
        p = (slice(ys0, ys1), slice(xs0, xs1))
        q = (slice(ys0 + dy, ys1 + dy), slice(xs0 + dx, xs1 + dx))
        line[p] |= op[p] & op[q] & (idk[p] != idk[q]) & (dep[q] < dep[p] - 40)
        line[p] |= op[p] & body[q]                          # tucked behind the hand, the arm, the body
        ring[q] |= op[p] & ~op[q] & ~body[q]
    rgb = out[..., :3].astype(np.float32)
    out[line, :3] = (rgb[line] * 0.5 + OUTLINE * 0.5).astype(np.uint8)
    out[ring, :3] = OUTLINE.astype(np.uint8)
    out[ring, 3] = 255
    return out


def pack(frames_root, outdir):
    """frames_root/<a|b>/<weapon>/{color,id,depth}/<dir>_<frame>.png + anchors.json → outdir/<weapon>.png/.json"""
    import numpy as np
    from PIL import Image
    os.makedirs(outdir, exist_ok=True)
    builds = sorted(b for b in os.listdir(frames_root) if b in ('a', 'b'))
    names = sorted({w for b in builds for w in os.listdir(os.path.join(frames_root, b)) if w in WEAPONS})
    for name in names:
        cells = []                                  # (build, dir, frame, image, dx, dy)
        anchors = {}
        for b in builds:
            base = os.path.join(frames_root, b, name)
            if not os.path.isdir(base):
                continue
            meta = json.load(open(os.path.join(base, 'anchors.json')))
            ox, oy = meta['origin']
            anchors[b] = meta['anchors']
            for path in sorted(glob.glob(os.path.join(base, 'color', '*.png'))):
                tag = os.path.basename(path)[:-4]
                d, f = tag.split('_', 1)
                img = post(path, os.path.join(base, 'id', tag + '.png'), os.path.join(base, 'depth', tag + '.png'))
                ys, xs = np.nonzero(img[..., 3])
                if not len(xs):
                    cells.append((b, d, f, None, 0, 0))
                    continue
                x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
                cells.append((b, d, f, img[y0:y1, x0:x1], int(x0 - ox), int(y0 - oy)))
        # shelf-pack, tallest first, into a sheet 512 wide
        order = sorted([c for c in cells if c[3] is not None], key=lambda c: -c[3].shape[0])
        W, x, y, shelf, place = 512, 0, 0, 0, {}
        for c in order:
            hgt, wid = c[3].shape[:2]
            if x + wid > W:
                x, y, shelf = 0, y + shelf + 1, 0
            place[id(c)] = (x, y)
            x += wid + 1
            shelf = max(shelf, hgt)
        H = y + shelf
        sheet = np.zeros((max(1, H), W, 4), np.uint8)
        frames = {}
        for c in cells:
            b, d, f, img, dx, dy = c
            slot = frames.setdefault(b, {}).setdefault(d, {})
            if img is None:
                slot[f] = None
                continue
            px, py = place[id(c)]
            hgt, wid = img.shape[:2]
            sheet[py:py + hgt, px:px + wid] = img
            slot[f] = [int(px), int(py), int(wid), int(hgt), dx, dy]
        Image.fromarray(sheet, 'RGBA').save(os.path.join(outdir, name + '.png'), optimize=True)
        cls, _, tip = WEAPONS[name]
        with open(os.path.join(outdir, name + '.json'), 'w') as fh:
            json.dump({'id': name, 'class': cls, 'frames': frames, 'anchors': anchors}, fh, separators=(',', ':'))
        print(name, W, 'x', H, sum(1 for c in cells if c[3] is not None), 'frames')


if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] == 'pack':
    here = os.path.dirname(os.path.abspath(__file__))
    pack(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else
         os.path.join(here, '..', '..', 'apps', 'bridge', 'assets', 'characters', 'weapons'))
