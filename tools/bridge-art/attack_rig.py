"""The pilot rigged for fighting (characters.py pilot-attack-* and pilot-weapons-*; see attacks.py for the poses
and weapon_sprites.py for the weapons).

rig(ns) adds what the walk sheets don't need — a waist pivot so the shoulders can turn and lean over planted feet,
and a grip at the weapon hand — and, for pilot-weapons-*, builds every weapon in the grip. pose(ns, spec) puts the
pilot in one of attacks.py's poses, turning the wrist so the weapon points where the pose aims it and bringing the
other hand to the haft. render_sheet() renders the attack sheet's frames (packed by sprites_post.py with the column
list it writes); render_weapons() renders each weapon on its own, body held out, plus its anchors.
"""
import json
import math
import os

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Quaternion, Vector

import attacks
import weapon_sprites

W_SIDE, O_SIDE = 'L', 'R'        # characters.py's shoulders['L'] (model -x) is the pilot's right hand
R = math.radians


class Rig:
    pass


def rig(ns, weapons=None):
    """Called by characters.py right after the suit is built (and made build B). weapons: ids to build in the grip
    (each under its own pivot, shown one at a time)."""
    J = Rig()
    J.ns = ns
    J.root, J.body, J.hips, J.knees, J.shoulders = ns['root'], ns['body'], ns['hips'], ns['knees'], ns['shoulders']
    J.chest = ns['pivot']('chest', (0, 0, 9.2), J.body)
    for o in list(J.body.children):
        if o is J.chest or o in J.hips.values():
            continue
        o.parent = J.chest
        o.location.z -= 9.2
    J.head = ns['head']
    J.grip = ns['pivot']('grip', (0, 0, -6.3), J.shoulders[W_SIDE])
    J.grip2 = ns['pivot']('grip2', (0, 0, -6.3), J.shoulders[O_SIDE])      # the other hand (a pair of knives)
    J.weapons = {}
    ns['FIXED'].update(weapon_sprites.TONES)
    first = len(ns['PARTS'])
    for wid in weapons or []:
        cls, build, tip = weapon_sprites.WEAPONS[wid]
        piv = ns['pivot']('w_' + wid, (0, 0, 0), J.grip)
        start = len(ns['PARTS'])
        build(ns['add'], piv)
        if wid in weapon_sprites.TWIN:
            build(ns['add'], ns['pivot']('w2_' + wid, (0, 0, 0), J.grip2))
        J.weapons[wid] = dict(cls=cls, pivot=piv, tip=tip, parts=[o for o, _, _ in ns['PARTS'][start:]])
        if cls == 'bow':
            J.weapons[wid]['bow'] = _bow_parts(ns, piv, weapon_sprites.BOWS[wid])
            J.weapons[wid]['parts'] = [o for o, _, _ in ns['PARTS'][start:]]
    J.weapon_parts = set(o for o, _, _ in ns['PARTS'][first:])
    return J


def _unit_rod(ns, name, r, tone, part, parent):
    """A rod one unit long along its own +z, its foot at the origin: moved and stretched every frame (_place)."""
    o = ns['add']('cylinder', name, (0, 0, 0), (r, r, 0.5), tone, part, parent, vertices=5)
    for v in o.data.vertices:
        v.co.z += 0.5
    o.rotation_mode = 'QUATERNION'
    return o


def _bow_parts(ns, piv, spec):
    """A bow's string (two lengths, tip to nock to tip) and a nocked arrow (shaft, head, fletching on a pivot)."""
    a = _unit_rod(ns, 'bowstring', 0.2, 'w_string', 'string', piv)
    b = _unit_rod(ns, 'bowstring', 0.2, 'w_string', 'string', piv)
    arrow = ns['pivot']('arrow', (0, 0, 0), piv)
    arrow.rotation_mode = 'QUATERNION'
    L = spec['half'] * 1.25
    ns['add']('cylinder', 'arrow_shaft', (0, -L / 2, 0), (0.2, 0.2, L / 2), 'w_wood', 'arrow', arrow, rot=(math.pi / 2, 0, 0), vertices=5)
    ns['add']('cone', 'arrow_head', (0, -L - 0.7, 0), (0.42, 0.42, 1.0), 'w_steel', 'arrowhead', arrow, rot=(math.pi / 2, 0, 0),
              vertices=4, radius1=1.0, radius2=0.0, depth=1.4)
    for zz, xx in ((0.45, 0), (-0.25, 0.4), (-0.25, -0.4)):
        ns['add']('cube', 'fletching', (xx, -0.9, zz), (0.08, 0.9, 0.3), 'w_fletch', 'fletch', arrow)
    return dict(a=a, b=b, arrow=arrow, half=spec['half'], curve=spec['curve'], L=L)


def _place(o, p, q):
    """Stretch a unit rod from p to q (in its parent's space)."""
    d = q - p
    o.location = p
    o.rotation_quaternion = d.normalized().to_track_quat('Z', 'Y') if d.length > 1e-6 else Quaternion()
    o.scale = (1, 1, max(1e-3, d.length))


def bow_update(J, w, spec):
    """Frame by frame: the string from tip to tip, or — drawing (spec draw) — pulled to the other hand; the arrow on it
    (spec arrow), pointing from the nock through the grip."""
    B = w.get('bow')
    if not B:
        return
    bpy.context.view_layer.update()
    top, bot = Vector((0, B['curve'], B['half'])), Vector((0, B['curve'], -B['half']))
    nock = Vector((0, B['curve'], 0))
    if spec and spec.get('draw'):
        hand = w['pivot'].matrix_world.inverted() @ J.grip2.matrix_world.translation
        nock = Vector((0, max(B['curve'], hand.y), max(-1.5, min(1.5, hand.z))))      # in the bow's plane, behind it
    _place(B['a'], top, nock)
    _place(B['b'], nock, bot)
    show = bool(spec and spec.get('arrow'))
    for o in [B['arrow']] + list(B['arrow'].children_recursive):
        o.hide_render = not show
    if show:
        B['arrow'].location = nock
        d = (Vector((0, 0, 0)) - nock)
        B['arrow'].rotation_quaternion = d.normalized().to_track_quat('-Y', 'Z')


def _reset(J):
    for side in 'LR':
        for o in (J.hips[side], J.knees[side], J.shoulders[side]):
            o.rotation_mode = 'XYZ'
            o.rotation_euler = (0, 0, 0)
    J.body.location = (0, 0, 0)
    J.body.rotation_euler = (0, 0, 0)
    J.chest.rotation_euler = (0, 0, 0)
    if J.head:
        J.head.rotation_euler = (0, 0, 0)
    for g in (J.grip, J.grip2):
        g.rotation_mode = 'QUATERNION'
        g.rotation_quaternion = (1, 0, 0, 0)


def aim_dir(J, az, el):
    """The world direction for an aim (azimuth, elevation) in the pilot's own frame."""
    d = Vector((-math.sin(R(az)) * math.cos(R(el)), -math.cos(R(az)) * math.cos(R(el)), math.sin(R(el))))
    return (J.root.matrix_world.to_quaternion() @ d).normalized()


def aim(J, az, el, roll=0.0, off=None):
    """Turn the wrist so the weapon (built along -y) points along (az, el), turned roll about itself; with off, the
    other hand reaches for the haft that far along it."""
    bpy.context.view_layer.update()
    d = aim_dir(J, az, el)
    q = d.to_track_quat('-Y', 'Z')
    if roll:
        q = Quaternion(d, R(roll)) @ q
    parent = J.shoulders[W_SIDE].matrix_world.to_quaternion()
    J.grip.rotation_quaternion = parent.inverted() @ q
    # the other hand's knife (a pair) points the same way, a little lower
    q2 = aim_dir(J, az, el - 20).to_track_quat('-Y', 'Z')
    J.grip2.rotation_quaternion = J.shoulders[O_SIDE].matrix_world.to_quaternion().inverted() @ q2
    if off is not None:
        bpy.context.view_layer.update()
        unit = J.root.matrix_world.to_scale()[0]
        target = J.grip.matrix_world.translation + d * off * unit
        sh = J.shoulders[O_SIDE]
        to = (target - sh.matrix_world.translation).normalized()
        qa = to.to_track_quat('-Z', 'Y')
        sh.rotation_mode = 'QUATERNION'
        sh.rotation_quaternion = J.chest.matrix_world.to_quaternion().inverted() @ qa


def pose(J, spec, yaw):
    """Put the pilot in an attacks.py pose, facing yaw."""
    _reset(J)
    J.root.rotation_euler = (0, 0, R(yaw + spec['yaw']))
    J.chest.rotation_euler = tuple(R(a) for a in spec['chest'])
    for side, key in ((W_SIDE, 'W'), (O_SIDE, 'O')):
        h = spec['hip' + key]
        J.hips[side].rotation_euler = (R(h[0]), R(h[1]), 0)
        J.knees[side].rotation_euler = (R(spec['knee' + key]), 0, 0)
        J.shoulders[side].rotation_euler = tuple(R(a) for a in spec['arm' + key])
    if J.head:
        J.head.rotation_euler = tuple(R(a) for a in spec['head'])
    z = -attacks.leg_drop(spec) + spec['lift']
    y = spec['fwd']
    t = R(spec['tumble'])
    if t:                                   # balled up, head over heels round the middle of the ball, rolling on the ground
        cy, cz, ball = -2.0, 10.5, 6.0      # the ball's middle (body units, just ahead of the hips) and how high it rides
        J.body.rotation_euler = (t, 0, 0)
        y += cy - (cy * math.cos(t) - cz * math.sin(t))
        z = ball - (cy * math.sin(t) + cz * math.cos(t))
    J.body.location = (0, y, z)
    a = spec['aim']
    aim(J, a[0], a[1], a[2] if len(a) > 2 else 0.0, spec['off'])


def carry(J, cls, swing, lift, frame):
    """A walk-sheet frame (characters.py pose()) with the weapon carried the class's way."""
    _reset(J)
    J.ns['pose'](swing, lift, frame)
    c = attacks.CARRY[cls]
    aim(J, c['aim'][0], c['aim'][1], c['aim'][2], c.get('off'))


# ---- the pilot's attack sheet ------------------------------------------------------------------------------------
def render_sheet(J, base, variants, cols=None):
    """Every column of the attack sheet (or cols: the bow's, attacks.BOW_COLS) in every direction into
    base/{id,depth,color_<v>}/<dir>_<col>.png."""
    ns = J.ns
    cols = cols or attacks.COLS
    for kind in ['id', 'depth'] + ['color_' + v for v in variants]:
        os.makedirs(os.path.join(base, kind), exist_ok=True)
    with open(os.path.join(base, 'cols.json'), 'w') as f:
        json.dump([n for n, _ in cols], f)
    for dname, yaw in attacks.DIRS:
        for name, spec in cols:
            pose(J, spec, yaw)
            tag = '%s_%s.png' % (dname, name)
            ns['face_record'](tag)              # where the painted face goes (characters.py writes anchors.json after)
            ns['set_pass']('id'); ns['render'](os.path.join(base, 'id', tag))
            ns['set_pass']('depth'); ns['render'](os.path.join(base, 'depth', tag), sixteen=True)
            for v in variants:
                ns['set_pass']('color', v)
                ns['render'](os.path.join(base, 'color_' + v, tag))


# ---- each weapon in the hand -------------------------------------------------------------------------------------
def _project(ns, co):
    scene, cam = bpy.context.scene, ns['cam']
    p = world_to_camera_view(scene, cam, co)
    W, H = ns['W'], ns['H']
    ox, oy = ns['ORIGIN_PX']
    return [round(p.x * W - ox, 1), round((1 - p.y) * H - oy, 1)], p.z


def render_weapons(J, outroot):
    """For every weapon: its class's attack frames and the idle/walk frames carrying it, the body held out, into
    outroot/<weapon>/{color,id,depth}/<dir>_<frame>.png, with anchors.json."""
    ns = J.ns
    body_parts = [o for o, _, _ in ns['PARTS'] if o not in J.weapon_parts]
    hold = bpy.data.materials.new('holdout')
    hold.use_nodes = True
    nt = hold.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(nt.nodes.new('ShaderNodeHoldout').outputs[0], out.inputs['Surface'])
    white = ns['flat_mat']('bodyid', (1.0, 1.0, 1.0))
    chest_o = J.chest

    def passes(base, tag):
        # id: the weapon's parts in their ids, the body flat white (so the packer knows where it covers the weapon)
        ns['set_pass']('id')
        for o in body_parts:
            o.data.materials[0] = white
        ns['render'](os.path.join(base, 'id', tag))
        ns['set_pass']('depth')
        for o in body_parts:
            o.data.materials[0] = hold
        ns['render'](os.path.join(base, 'depth', tag), sixteen=True)
        ns['set_pass']('color', 'key')
        for o in body_parts:
            o.data.materials[0] = hold
        ns['render'](os.path.join(base, 'color', tag))

    only = [x for x in os.environ.get('WEAPON_IDS', '').split(',') if x]      # just these (a new weapon), the rest untouched
    for wid, w in J.weapons.items():
        if only and wid not in only:
            continue
        for other in J.weapons.values():
            for o in other['parts']:
                o.hide_render = other is not w
        base = os.path.join(outroot, wid)
        for kind in ('id', 'depth', 'color'):
            os.makedirs(os.path.join(base, kind), exist_ok=True)
        anchors = {}
        cls = w['cls']
        frames = attacks.BOW_COLS if cls == 'bow' else [(cls + '-' + n, s) for c, fl in attacks.CLASSES if c == cls for n, s in fl]
        for dname, yaw in attacks.DIRS:
            row = anchors.setdefault(dname, {})
            todo = [(n, 'attack', s) for n, s in frames]
            todo += [(f'{anim}{i}', 'carry', (swing, lift, i)) for anim, i, swing, lift, _ in ns['FRAMES']]
            for name, kind, spec in todo:
                if kind == 'attack':
                    pose(J, spec, yaw)
                else:
                    J.root.rotation_euler = (0, 0, R(yaw))
                    carry(J, cls, *spec)
                bow_update(J, w, spec if kind == 'attack' else None)
                bpy.context.view_layer.update()
                g, gz = _project(ns, J.grip.matrix_world.translation)
                tip = J.grip.matrix_world @ (w['pivot'].matrix_local @ Vector((0, -w['tip'], 0)))
                t, _ = _project(ns, tip)
                c, cz = _project(ns, chest_o.matrix_world @ Vector((0, 0, 4.0)))
                row[name] = {'hand': g, 'tip': t, 'front': gz < cz}
                passes(base, '%s_%s.png' % (dname, name))
        with open(os.path.join(base, 'anchors.json'), 'w') as f:
            json.dump({'origin': list(ns['ORIGIN_PX']), 'frame': [ns['W'], ns['H']], 'class': cls, 'anchors': anchors}, f)
        print('weapon', wid, cls, flush=True)
