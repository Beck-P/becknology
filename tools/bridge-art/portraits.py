#!/usr/bin/env python3
"""Face portraits for the talk card, Stardew-style: each character seen from the front, head and shoulders.

  python3 tools/bridge-art/portraits.py npc-baker [npc-…]      one NPC or a few (any NPCS name in characters.py)
  python3 tools/bridge-art/portraits.py npcs | crowd | pilots  every NPC / every crowd body / every pilot head
  python3 tools/bridge-art/portraits.py all                    the lot (a few minutes)
      [--jobs 2]  Blender runs at once (each takes a share of the list)      [--look FILE]  a ×4 contact sheet of what was made

The talk card used to crop the head and shoulders out of the walking sheet, which is drawn from 45° above: you saw
the top of a head, or a hat. Here the same Blender models (characters.py, built by running it without its render
calls — never edited from here) are rendered again by a camera in front of them, 10° up, so the face is seen straight
on and a hat's brim sits above the eyes. Same cel shading as the sheets (three flat tone bands, one sample, no
filtering), the same line work and outline as sprites_post.py. For the portrait the modelled eye blocks, nose and
mustache are hidden and the hair cap sits back a touch (a cleaner hairline); the face is then painted on in pixels
from points the Blender pass projects (eyes, brows, mouth, nose, cheeks): big eyes with an iris and a catch-light,
lids and lashes, brows, a mouth, a little nose shadow, blush — only on the face's own pixels (a semantic pass), so a
fringe, a hat, shades or a beard still cover what they cover. Who smiles, who frowns, who blushes: MOODS and face_of().

Each file is a strip of SIZE × SIZE frames, one per expression (EXPRESSIONS: neutral, happy, surprised, sad, blink):
  apps/bridge/assets/portraits/<sheet>.png                       an NPC (npc-baker …), in its own colours
  apps/bridge/assets/portraits/crowd/<body>.png                  a crowd body (characters.py EXTRAS) in the crowd's key
                                                                 colours (XKEYS), swapped by js/crowd.js like its sheets
  apps/bridge/assets/portraits/pilots/[<style>-]<a|b>-<head>.png a pilot head (flight suit unprefixed) in the pilot key
                                                                 colours (KEYS), swapped by js/look.js (hired people)
Key-coloured portraits paint two more keys the game swaps: the iris (IRIS_KEY, a colour per person) and the blush
(BLUSH_KEY, mixed from their skin) — keep them in step with js/look.js and js/crowd.js.

Rendering runs in the Blender venv (bpy); painting runs in python3 (numpy + Pillow). Run with python3 this file does
both: it starts Blender on itself (BPY, else BVENV/bin/python up the tree, else /home/user/BVENV/bin/python) for the
passes, then paints and packs.
"""
import ast
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CHARS = os.path.join(HERE, 'characters.py')
OUTDIR = os.environ.get('PORTRAITS_OUT') or os.path.join(ROOT, 'apps', 'bridge', 'assets', 'portraits')

SIZE = 64                 # a portrait frame (the talk card shows it ×2 on a desktop, ×1 on a phone)
TALL = 104                # rendered taller than a frame, so a tall hat can be framed in (see frame_top)
FACE_Y = 27               # the face sphere's centre in a frame (px from the top), with nothing tall on the head
FACE_Y_MAX = 33           # and at most this low, to fit in more of a tall hat or a crown
PX_PER_UNIT = 3.5         # px per model unit at the head (the face sphere, 10 units across, is 35 px)
ELEV = math.radians(10)   # the camera: in front, a little above
LIGHT = (-0.5, -0.62, 0.6)        # the key light for portraits: upper left and in front (the sheets' is high overhead)
SKIN_LIGHT = (-0.35, -0.85, 0.4)  # skin a little more frontal, so a face is mostly lit, its shadow down the right
HAIR_BACK = (0.0, 0.32, 0.38)     # the hair cap nudged back and up: the face and the cap nearly touch from the front
CURLS_BACK = (0.0, 0.9, 0.5)      # a cloud of curls, more so (from the front it hid the eyes)
BEARD_DOWN = (0.0, 0.3, -0.5)     # a beard a little lower and further in, so the cheeks show under the eyes
STYLES = ['flight', 'coat', 'plate', 'thermal', 'runner', 'mystic', 'ranger']
EXPRESSIONS = ['neutral', 'happy', 'surprised', 'sad', 'blink']
OUTLINE = (11, 10, 24)    # sprites_post.py OUTLINE: line work is half this, half the colour
DEPTH_EPS = 220           # depth counts (≈0.37 model units at this pass's scale) — nearer than this isn't "in front"

# the extra key colours painted into key-coloured portraits (js/look.js and js/crowd.js swap them)
IRIS_KEY = ('#00284c', '#003c70', '#0058a0')
BLUSH_KEY = '#f05878'


# =====================================================================================================================
#  Blender: build each character with characters.py and render the portrait passes
# =====================================================================================================================
def characters_code():
    """characters.py, minus the statements at the end that render its sheets: running it builds the model."""
    src = open(CHARS).read()
    tree = ast.parse(src)
    tree.body = [n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.ClassDef, ast.Import, ast.ImportFrom))
                 or not re.search(r'\brender_all\(|\brender_weapons\(', ast.get_source_segment(src, n) or '')]
    return compile(tree, CHARS, 'exec')


def blender_render(out, whos):
    import bpy
    from mathutils import Vector
    from bpy_extras.object_utils import world_to_camera_view
    sys.path.insert(0, HERE)
    code = characters_code()
    for who in whos:
        sys.argv = [CHARS, os.path.join(out, '_unused'), who]
        ns = {'__name__': '__characters__', '__file__': CHARS}
        exec(code, ns)
        scene, cam, head, PARTS = ns['scene'], ns['cam'], ns['head'], ns['PARTS']
        ns['rest_pose']()
        ns['root'].rotation_euler = (0, 0, 0)
        for o in ns.get('EARS', {}).values():          # from the front both of an elf's ears show
            o.hide_render = False
        skin_tones = set(k for k in ('skin', 'xskin', 'skin0', 'skin2', 'skin3') if k in ns['FIXED'])

        # the portrait's light (skin a touch more frontal), and a depth pass fine enough for line work at this scale
        skin_mats = set()
        for (v, tone), m in ns['COLOR'].items():
            if tone == 'skin' or tone in skin_tones:
                skin_mats.add(m.name)
        for m in bpy.data.materials:
            if not m.node_tree:
                continue
            for nd in m.node_tree.nodes:
                if nd.bl_idname == 'ShaderNodeVectorMath' and nd.operation == 'DOT_PRODUCT':
                    nd.inputs[1].default_value = Vector(SKIN_LIGHT if m.name in skin_mats else LIGHT).normalized()
                if m.name == 'depth' and nd.bl_idname == 'ShaderNodeMath' and nd.operation == 'DIVIDE':
                    nd.inputs[1].default_value = 6.0
        # the painted face replaces the modelled eye blocks, nose and mustache; the hair cap sits back a touch
        painted = [o for o, _, _ in PARTS if o.parent is head and re.match(r'^(eye|nose|mustache|glint)(\.\d+)?$', o.name)]
        for o, tone, _ in PARTS:
            if o.parent is not head:
                continue
            nm = re.sub(r'\.\d+$', '', o.name)
            d = (HAIR_BACK if nm == 'hair' else CURLS_BACK if nm in ('curls', 'curl') else BEARD_DOWN if nm == 'beard' else None)
            if d:
                o.location = (o.location[0] + d[0], o.location[1] + d[1], o.location[2] + d[2])

        # the semantic pass: what each pixel is, for the painter (face skin, other skin, beard, hair, a visor, the rest)
        SEM = {k: ns['flat_mat']('sem_' + k, rgb) for k, rgb in
               (('face', (1, 0, 0)), ('skin', (1, 1, 0)), ('beard', (0, 1, 0)), ('hair', (0, 0, 1)),
                ('visor', (0, 1, 1)), ('other', (0, 0, 0)))}
        pname = {v: k for k, v in ns['PIDS'].items()}

        def sem_of(o, tone, p):
            part = pname.get(p, '')
            if part == 'head':
                return 'face'
            if part in ('ears', 'neck') or (tone in skin_tones and part.startswith('arm')):
                return 'skin'
            if part == 'beard':
                return 'beard'
            if part == 'visor' and re.match(r'^visor(\.\d+)?$', o.name):
                return 'visor'
            if tone == 'hair':
                return 'hair'
            return 'other'

        variant = next(iter(ns['VARIANTS']))
        tones = ns['VARIANTS'][variant]
        spec = ns.get('spec') if not who.startswith('pilot') else None

        def frame_to(base, groups=None):
            """Render the passes for the head as it's shown now into base/."""
            os.makedirs(base, exist_ok=True)
            for o in painted:
                o.hide_render = True
            bpy.context.view_layer.update()
            mw = head.matrix_world
            k = PX_PER_UNIT / mw.to_scale().x         # px per world unit (a child's head is scaled: same size here)
            C = mw @ Vector((0, 0, 5.2))              # the face sphere's centre
            f = Vector((0, math.cos(ELEV), -math.sin(ELEV)))
            up = Vector((0, math.sin(ELEV), math.cos(ELEV)))
            yc = TALL - SIZE + FACE_Y                 # where the face centre lands in the tall render
            cam.data.ortho_scale = max(SIZE, TALL) / k
            cam.data.clip_start, cam.data.clip_end = 0.05, 12.0
            cam.location = C + up * ((yc - TALL / 2) / k) - f * 3.0
            cam.rotation_euler = (math.pi / 2 - ELEV, 0, 0)
            scene.render.resolution_x, scene.render.resolution_y = SIZE, TALL
            bpy.context.view_layer.update()
            ns['set_pass']('id'); ns['render'](os.path.join(base, 'id.png'))
            ns['set_pass']('depth'); ns['render'](os.path.join(base, 'depth.png'), sixteen=True)
            ns['set_pass']('color', variant); ns['render'](os.path.join(base, 'color.png'))
            for o, tone, p in PARTS:
                o.data.materials[0] = SEM[sem_of(o, tone, p)]
            ns['render'](os.path.join(base, 'sem.png'))

            def px(local):
                co = world_to_camera_view(scene, cam, mw @ Vector(local))
                return [round(co.x * SIZE, 2), round((1 - co.y) * TALL, 2)]

            def on_face(x, z):                        # a point on the face sphere (centre (0, 0, 5.2), radii 5, 4.8, 5)
                u = 1 - (x / 5.0) ** 2 - ((z - 5.2) / 5.0) ** 2
                return (x, -4.8 * math.sqrt(max(0.0, u)), z)
            cx, cy = px((0, 0, 5.2))
            anchors = {'centre': [cx, cy], 'r': round(px((5.0, 0, 5.2))[0] - cx, 2)}
            for name, x, z in (('eye', 2.05, 4.75), ('brow', 2.1, 6.55), ('mouth', 0.0, 2.75), ('nose', 0.0, 3.85),
                               ('cheek', 3.15, 3.55), ('chin', 0.0, 1.0)):
                anchors[name] = px(on_face(x, z))
            meta = {'who': who, 'variant': variant, 'anchors': anchors, 'size': SIZE, 'tall': TALL,
                    'tones': {k_: list(v) for k_, v in tones.items() if isinstance(v, (tuple, list))},
                    'fixed': {k_: list(ns['FIXED'][k_]) for k_ in sorted(skin_tones | {'eye'})},
                    'groups': groups}
            if spec is not None:
                meta['spec'] = {k_: (list(v) if isinstance(v, tuple) else v) for k_, v in spec.items()
                                if isinstance(v, (bool, str, int, float, tuple))}
            json.dump(meta, open(os.path.join(base, 'meta.json'), 'w'))

        if who.startswith('pilot'):
            only = os.environ.get('PORTRAIT_HEADS', '').split(',') if os.environ.get('PORTRAIT_HEADS') else None
            for name, groups in ns['HEADS']:
                if only and name not in only:
                    continue
                ns['set_head'](groups)
                frame_to(os.path.join(out, who, name), groups)
                if name == 'helmet':                  # the face behind the visor: the helmet off, no hair (it's under it)
                    ns['set_head'](['face'])
                    frame_to(os.path.join(out, who, name, 'inner'), ['face'])
        else:
            frame_to(os.path.join(out, who))
        print('portrait passes', who, flush=True)


# =====================================================================================================================
#  Painting (python3: numpy + Pillow): line work, the face, the expressions, the strip
# =====================================================================================================================
def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mixc(a, b, t):
    a, b = (hexrgb(a) if isinstance(a, str) else a), (hexrgb(b) if isinstance(b, str) else b)
    return tuple(int(a[i] * (1 - t) + b[i] * t + 0.5) for i in range(3))


def load(base):
    import numpy as np
    from PIL import Image
    c = np.array(Image.open(os.path.join(base, 'color.png')).convert('RGBA'))
    ids = np.array(Image.open(os.path.join(base, 'id.png')).convert('RGB')).astype(np.int64)
    dep = np.array(Image.open(os.path.join(base, 'depth.png'))).astype(np.int64)
    if dep.ndim == 3:
        dep = dep[..., 0]
    sem = np.array(Image.open(os.path.join(base, 'sem.png')).convert('RGBA'))
    meta = json.load(open(os.path.join(base, 'meta.json')))
    return c, ids, dep, sem, meta


def linework(c, ids, dep):
    """sprites_post.py's line work and outline: a part's edge goes dark where another part is in front of it; a 1 px
    dark ring round the silhouette. Returns the image and the line mask."""
    import numpy as np
    idk = (ids[..., 0] << 16) | (ids[..., 1] << 8) | ids[..., 2]
    op = c[..., 3] >= 128
    h, w = op.shape
    out = np.zeros_like(c)
    out[op] = c[op]
    out[op, 3] = 255
    line = np.zeros((h, w), bool)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        ys0, ys1 = max(0, -dy), h - max(0, dy)
        xs0, xs1 = max(0, -dx), w - max(0, dx)
        p = (slice(ys0, ys1), slice(xs0, xs1))
        q = (slice(ys0 + dy, ys1 + dy), slice(xs0 + dx, xs1 + dx))
        line[p] |= op[p] & op[q] & (idk[p] != idk[q]) & (dep[q] < dep[p] - DEPTH_EPS)
    rgb = out[..., :3].astype(np.int32)
    o = np.array(OUTLINE, np.int32)
    out[line, :3] = ((rgb + o) >> 1)[line].astype(np.uint8)     # (c + OUTLINE) >> 1, exactly as the game's lineOf()
    ring = np.zeros((h, w), bool)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        sh = np.zeros((h, w), bool)
        sh[max(0, dy):h + min(0, dy), max(0, dx):w + min(0, dx)] = op[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)]
        ring |= sh
    ring &= ~op
    out[ring, :3] = OUTLINE
    out[ring, 3] = 255
    return out, line


# ---- who looks how --------------------------------------------------------------------------------------------------
# A face's temperament: its resting mouth and brows. Most of the cast are friendly (a smile at rest); these aren't.
MOODS = {
    'stern':  ['npc-watcher', 'npc-doorman', 'npc-pitboss', 'npc-samurai', 'npc-hm-garro', 'npc-boxman', 'npc-stickman',
               'npc-elf-warden', 'npc-registrar', 'npc-dealer-b', 'npc-vex', 'npc-sev', 'npc-aubert'],
    'flat':   ['npc-ferryman', 'npc-quiet', 'npc-stranger', 'npc-traveler', 'npc-keeper', 'npc-miner', 'npc-scholar',
               'npc-croupier', 'npc-dealer', 'npc-dealer-c', 'npc-clerk', 'npc-courier', 'npc-technician', 'npc-waiting',
               'npc-gambler-b', 'npc-queen', 'npc-duchess', 'npc-sorceress', 'npc-steward', 'npc-broker'],
    'smirk':  ['npc-pawnbroker', 'npc-highroller', 'npc-dj', 'npc-mixer', 'npc-gambler-a', 'npc-peddler', 'npc-hm-mira',
               'npc-beckolas', 'npc-singer', 'npc-runouts-host'],
}
MOOD = {name: mood for mood, names in MOODS.items() for name in names}
YOUNG = {'npc-elf-child'}                                          # children who aren't built `young`
ROSY = {'npc-baker', 'npc-innkeeper', 'npc-fisher-gran', 'npc-hetty', 'npc-bartender', 'npc-vbaker', 'npc-hut-bram', 'npc-kaspar', 'npc-anouk'}   # ruddy cheeks
IRISES = {   # natural eye colours (dark, mid, light); an NPC gets one from its name unless it has its own `eye`
    'brown': ('#2e1a10', '#5a3420', '#8a5a34'), 'hazel': ('#3a2a12', '#6a5226', '#9a8040'),
    'green': ('#1a3a24', '#2e6a3e', '#5a9a5a'), 'blue': ('#1a2e5a', '#2e5aa0', '#5a8ad0'),
    'grey': ('#2e3440', '#5a6474', '#8a96a6'), 'dark': ('#1a1210', '#33221a', '#523828'),
}
IRIS_ORDER = ['brown', 'dark', 'hazel', 'blue', 'green', 'brown', 'grey', 'dark', 'blue']


def name_hash(t):
    h = 2166136261
    for ch in t:
        h = ((h ^ ord(ch)) * 16777619) & 0xffffffff
    return h


def face_of(meta):
    """What this face is like, from the character's spec: its mood, lashes, blush, age, iris. Lashes (and a blush, if
    they smile) on a skirt, a gown, a bun or a braid, or long hair without a tunic (an elf in a tunic is one of the
    men); never with a beard. A pilot's head (anyone hired) has them on build B. Grey or white hair is older: a line
    under the eyes."""
    who, spec = meta['who'], meta.get('spec') or {}
    groups = meta.get('groups') or []
    beard = bool(spec.get('beard')) or 'beard' in groups
    mustache = bool(spec.get('mustache')) or 'beard' in groups
    if who.startswith('pilot'):
        femme = who.endswith('-b') and not beard
    else:
        femme = not (beard or mustache) and (any(spec.get(k) for k in ('skirt', 'gown', 'bun', 'braid', 'braid_crown', 'stole', 'sequin'))
                                             or (bool(spec.get('long_hair')) and 'tunic' not in spec))
    hair = spec.get('hair') or meta['tones'].get('hair') or ['#2a1a10']
    mid = hexrgb(hair[1])
    grey = max(mid) - min(mid) < 14 and mid[0] > 140 and not who.startswith(('pilot', 'extra-'))
    young = bool(spec.get('young')) or who in YOUNG
    key = who.startswith(('pilot', 'extra-'))
    mood = 'smile' if key else MOOD.get(who, 'smile')
    age = 'old' if who == 'extra-elder' or (grey and not young) else 'young' if young else 'adult'
    if key:
        iris = IRIS_KEY
    elif isinstance(spec.get('eye'), list):
        iris = tuple(spec['eye'])
    else:
        iris = IRISES[IRIS_ORDER[name_hash(who) % len(IRIS_ORDER)]]
    blush = young or (femme and mood in ('smile', 'smirk')) or who in ROSY
    return {'mood': mood, 'lashes': femme, 'blush': blush, 'age': age, 'iris': iris, 'young': young,
            'beard': beard, 'mustache': mustache, 'key': key}


# ---- the face, in pixels ----------------------------------------------------------------------------------------------
# Templates are drawn for the eye, brow and cheek on the viewer's right (the character's left), placed from the
# anchor's pixel by an offset, and mirrored across the face's centre line for the other side ('.' is left as it is).
# Mouth and mustache sit on the centre line (an even width, centred on it). Legend:
#   K lid and lashes   P pupil   D/I/L iris dark/mid/light   W white of the eye   C catch-light
#   S skin shadow (a crease, a lower lid)   B brow   M mouth   T inside of the mouth   U lip (skin)   H blush   N nose shadow
#   X/Y/Z mustache dark/mid/light
EYES = {
    'open': ['.KKKK.',
             'KDDDDK',
             'KDCPDW',
             'KIPPIW',
             'KIIIIW',
             '.LLLL.'],
    'lashes': ['......K',
               '.KKKKK.',
               'KDDDDK.',
               'KDCPDW.',
               'KIPPIW.',
               'KIIIIW.',
               '.LLLL..'],
    'wide': ['.KKKK.',
             'KWDDWK',
             'WDCPDW',
             'WIPPIW',
             'WIIIIW',
             'WILLIW',
             '.WWWW.'],
    'sad': ['......',
            '.SSSS.',
            'KKKKKK',
            'KDCPDW',
            'KIIIIW',
            '.LLLL.'],
    'happy': ['......',
              '.KKKK.',
              'K....K',
              '......',
              '......',
              '......'],
    'shut': ['......',
             '......',
             '......',
             'K....K',
             '.KKKK.',
             '......'],
    'old': ['......',
            '......',
            '......',
            '......',
            '......',
            '......',
            '.SSSS.'],
}
EYE_AT = (-3, -3)          # the eye template's top-left from the eye anchor's pixel
BROWS = {
    'soft':    (['.BBBB.', 'B....B'], (-3, -1)),
    'raised':  (['.BBBB.', 'B....B', '......'], (-3, -2)),
    'high':    (['.BBBB.', 'B....B', '......', '......'], (-3, -3)),
    'sad':     (['BB....', '..BBB.', '.....B'], (-3, -1)),    # inner end (toward the centre) up
    'stern':   (['....BB', '.BBB..', 'B.....'], (-3, -1)),    # inner end down
    'heavy':   (['BBBBBB', 'B....B'], (-3, -1)),
    'heavy_stern': (['...BBB', 'BBBB..', 'B.....'], (-3, -1)),
}
MOUTHS = {   # even widths, centred on the face's centre line; rows from the mouth anchor's row
    'smile': (['M....M', '.MMMM.'], -1),
    'flat':  (['.MMMM.'], 0),
    'stern': (['MMMMMM', 'M....M'], 0),
    'smirk': (['.....M', 'MMMMM.'], -1),
    'open':  (['MMMMMM', 'MTTTTM', '.MMMM.'], -1),    # a happy open smile
    'o':     (['.MM.', 'M..M', '.MM.'], -1),           # surprised (the middle is the face's own colour)
    'frown': (['.MMMM.', 'M....M'], 0),
    'beard': (['.MMMM.', '..UU..'], 0),                # a mouth in a beard: a dark slit over a lower lip
}
NOSE = (['N.', '.N'], (0, -1))       # a little shadow under and right of the centre (the light's from the upper left)
CHEEK = (['HHH', '.H.'], (-1, 0))
CHEEK_YOUNG = (['HHHH', 'HHHH'], (-2, 0))
MUSTACHE = (['.XYYYYYYX.', 'XYZZZZZZYX', 'X.XXXXXX.X'], (-5, -2))


def paint_face(img, sem, line, meta, face, expr):
    """The face for one expression, painted onto a copy of img (the tall render, after line work)."""
    out = img.copy()
    h, w = out.shape[:2]
    A = meta['anchors']
    cxb = int(round(2 * A['centre'][0]))           # twice the centre line (a pixel boundary): mirror x → cxb - 1 - x
    is_face = (sem[..., 0] > 128) & (sem[..., 1] < 128) & (sem[..., 2] < 128) & (sem[..., 3] > 128) & ~line
    is_beard = (sem[..., 0] < 128) & (sem[..., 1] > 128) & (sem[..., 2] < 128) & (sem[..., 3] > 128)
    t = meta['tones']
    skin = t.get('skin') or meta['fixed'].get('skin')
    hair = t.get('hair') or skin
    iris = face['iris']
    if face['key']:
        blush = hexrgb(BLUSH_KEY)
    else:
        blush = mixc(skin[1], '#ff5a6e', 0.42)
    brow = mixc(hair[0], '#000000', 0.25) if sum(hexrgb(hair[0])) > 330 else hexrgb(hair[0])
    if face['key']:
        brow = hexrgb(hair[0])                      # a key tone: the game swaps it for their hair's dark
    cols = {
        'K': (36, 22, 26), 'P': (16, 10, 14), 'W': (246, 242, 234), 'C': (255, 255, 255),
        'D': hexrgb(iris[0]), 'I': hexrgb(iris[1]), 'L': hexrgb(iris[2]),
        'S': hexrgb(skin[0]), 'U': hexrgb(skin[1]), 'B': brow, 'M': (74, 30, 34), 'T': (196, 84, 92), 'H': blush,
        'N': hexrgb(skin[0]), 'X': hexrgb(hair[0]), 'Y': hexrgb(hair[1]), 'Z': hexrgb(hair[2]),
    }

    def stamp(rows, ax, ay, ox, oy, allow, mirror=False, centred=False):
        x0, y0 = int(math.floor(ax)) + ox, int(math.floor(ay)) + oy
        if centred:                                   # centred on the centre line: an even width
            x0 = (cxb - len(rows[0])) // 2
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch == '.':
                    continue
                x = x0 + i
                if mirror:
                    x = cxb - 1 - x
                y = y0 + j
                if 0 <= x < w and 0 <= y < h and allow[y, x]:
                    out[y, x, :3] = cols[ch]

    ex, ey = A['eye']
    bx, by = A['brow']
    mood = face['mood']
    # which eyes, brows and mouth for this expression
    lash = face['lashes']
    if expr == 'neutral':
        eye = 'lashes' if lash else 'open'
        brow_t = {'stern': 'stern', 'flat': 'soft', 'smirk': 'soft'}.get(mood, 'soft')
        mouth = {'stern': 'stern', 'flat': 'flat', 'smirk': 'smirk'}.get(mood, 'smile')
    elif expr == 'happy':
        eye, brow_t, mouth = 'happy', 'raised', 'open'
    elif expr == 'surprised':
        eye, brow_t, mouth = 'wide', 'high', 'o'
    elif expr == 'sad':
        eye, brow_t, mouth = 'sad', 'sad', 'frown'
    else:   # blink
        eye = 'shut'
        brow_t = {'stern': 'stern'}.get(mood, 'soft')
        mouth = {'stern': 'stern', 'flat': 'flat', 'smirk': 'smirk'}.get(mood, 'smile')
    if (face['beard'] or face['mustache']) and brow_t in ('soft', 'stern'):
        brow_t = 'heavy' if brow_t == 'soft' else 'heavy_stern'
    tmpl = EYES[eye]
    for mirror in (False, True):
        stamp(tmpl, ex, ey, EYE_AT[0], EYE_AT[1] - (len(tmpl) - 6), is_face, mirror)
        if face['age'] == 'old' and eye in ('open', 'lashes'):
            stamp(EYES['old'], ex, ey, EYE_AT[0], EYE_AT[1], is_face, mirror)
        rows, (ox, oy) = BROWS[brow_t]
        stamp(rows, bx, by, ox, oy, is_face, mirror)
        if face['blush'] and expr != 'sad':
            rows, (ox, oy) = CHEEK_YOUNG if face['young'] else CHEEK
            stamp(rows, A['cheek'][0], A['cheek'][1], ox, oy, is_face, mirror)
    stamp(NOSE[0], cxb / 2, A['nose'][1], NOSE[1][0], NOSE[1][1], is_face)
    mx, my = A['mouth']
    mrows, moy = MOUTHS[mouth]
    in_beard = face['beard'] and is_beard[int(my), int(mx)]
    if in_beard and mouth in ('smile', 'flat', 'smirk', 'stern', 'frown'):
        mrows, moy = MOUTHS['beard']
    stamp(mrows, mx, my, 0, moy, is_face | is_beard, centred=True)
    if face['mustache']:
        rows, (ox, oy) = MUSTACHE
        stamp(rows, mx, my, ox, oy, is_face | is_beard, centred=True)
    return out


def visor_glass(img, inner, sem):
    """The helmet's visor as glass: the painted face behind it shows through, a pale rim inside its edge, a glint."""
    import numpy as np
    out = img.copy()
    vis = (sem[..., 0] < 128) & (sem[..., 1] > 128) & (sem[..., 2] > 128) & (sem[..., 3] > 128)
    has = inner[..., 3] > 0
    take = vis & has
    out[take] = inner[take]
    h, w = vis.shape
    edge = np.zeros_like(vis)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        sh = np.zeros_like(vis)
        sh[max(0, dy):h + min(0, dy), max(0, dx):w + min(0, dx)] = vis[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)]
        edge |= vis & ~sh
    rim = (142, 228, 240)
    out[edge & vis, :3] = rim
    ys = np.nonzero(vis.any(axis=1))[0]
    if len(ys) > 4:                               # a streak of light across the glass's upper left, above the eyes
        y0 = ys.min()
        for dy, dx in ((1, 3), (1, 4), (2, 2), (2, 3), (3, 2)):
            y = y0 + dy
            row = np.nonzero(vis[y])[0]
            if len(row):
                x = row.min() + dx
                if vis[y, x] and not edge[y, x]:
                    out[y, x, :3] = (255, 255, 255)
    return out


def frame_top(img):
    """Where the frame starts in the tall render: the face centre at FACE_Y, lowered (up to FACE_Y_MAX) to take in
    something tall on the head."""
    import numpy as np
    base = TALL - SIZE
    rows = np.nonzero(img[..., 3].any(axis=1))[0]
    top = rows.min() if len(rows) else base
    need = base - top + 1                     # px of it above the frame
    return base - max(0, min(FACE_Y_MAX - FACE_Y, need))


def portrait(base):
    """The strip of expressions for one render dir."""
    import numpy as np
    c, ids, dep, sem, meta = load(base)
    img, line = linework(c, ids, dep)
    face = face_of(meta)
    inner = None
    if os.path.isdir(os.path.join(base, 'inner')):          # a helmet: the face behind the visor
        ci, ii, di, si, mi = load(os.path.join(base, 'inner'))
        inner_img, inner_line = linework(ci, ii, di)
        inner = (inner_img, si, inner_line, mi)
    top = frame_top(img)
    frames = []
    for expr in EXPRESSIONS:
        if inner:
            f = visor_glass(img, paint_face(inner[0], inner[1], inner[2], inner[3], face, expr), sem)
        else:
            f = paint_face(img, sem, line, meta, face, expr)
        frames.append(f[top:top + SIZE])
    return np.concatenate(frames, axis=1), meta


# =====================================================================================================================
#  Orchestration
# =====================================================================================================================
def names_in(var):
    """The keys of a dict literal assigned to `var` at the top of characters.py."""
    tree = ast.parse(open(CHARS).read())
    for n in tree.body:
        if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == var for t in n.targets) and isinstance(n.value, ast.Dict):
            return [k.value for k in n.value.keys if isinstance(k, ast.Constant)]
    return []


def jobs_for(targets):
    """Blender runs (characters.py WHO names) for the targets asked for."""
    whos = []
    for t in targets:
        if t == 'all':
            whos += jobs_for(['npcs', 'crowd', 'pilots'])
        elif t == 'npcs':
            whos += [n for n in names_in('NPCS') if n.startswith('npc-')]
        elif t == 'crowd':
            whos += ['extra-' + n for n in names_in('EXTRAS')]
        elif t == 'pilots':
            whos += ['pilot-' + ('' if s == 'flight' else s + '-') + b for s in STYLES for b in 'ab']
        elif t.startswith(('npc-', 'extra-', 'pilot-')):
            whos.append(t)
        elif t in names_in('EXTRAS'):
            whos.append('extra-' + t)
        else:
            sys.exit('portraits.py: what is %r? (an NPCS name like npc-baker, a crowd body, a pilot-<style>-<a|b>, or '
                     'npcs / crowd / pilots / all)' % t)
    seen = set()
    return [w for w in whos if not (w in seen or seen.add(w))]


def blender_python():
    if os.environ.get('BPY'):
        return os.environ['BPY']
    d = ROOT
    for _ in range(6):
        p = os.path.join(d, 'BVENV', 'bin', 'python')
        if os.path.exists(p):
            return p
        d = os.path.dirname(d)
    return '/home/user/BVENV/bin/python'


def out_path(who, head=None):
    if who.startswith('extra-'):
        return os.path.join(OUTDIR, 'crowd', who[len('extra-'):] + '.png')
    if who.startswith('pilot'):
        rest = who[len('pilot-'):]                  # [<style>-]<a|b>
        return os.path.join(OUTDIR, 'pilots', rest + '-' + head + '.png')
    return os.path.join(OUTDIR, who + '.png')


def main(argv):
    from PIL import Image
    args, jobs, look = [], 2, None
    i = 0
    while i < len(argv):
        if argv[i] == '--jobs':
            jobs = int(argv[i + 1]); i += 2
        elif argv[i] == '--look':
            look = argv[i + 1]; i += 2
        else:
            args.append(argv[i]); i += 1
    if not args:
        print(__doc__)
        sys.exit(1)
    whos = jobs_for(args)
    tmp = tempfile.mkdtemp(prefix='portraits-')
    try:
        n = max(1, min(jobs, len(whos)))
        chunks = [whos[k::n] for k in range(n)]
        procs = [subprocess.Popen(['nice', '-n', '10', blender_python(), os.path.abspath(__file__), '--render', tmp] + ch,
                                  stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True) for ch in chunks if ch]
        failed = False
        for p in procs:
            log = p.communicate()[0]
            if p.returncode:
                failed = True
                print(log[-3000:])
        if failed:
            sys.exit('portraits.py: a Blender run failed (above)')
        made = []
        for who in whos:
            heads = sorted(d for d in os.listdir(os.path.join(tmp, who))) if who.startswith('pilot') else [None]
            for hd in heads:
                base = os.path.join(tmp, who, hd) if hd else os.path.join(tmp, who)
                strip, _ = portrait(base)
                path = out_path(who, hd)
                os.makedirs(os.path.dirname(path), exist_ok=True)
                Image.fromarray(strip, 'RGBA').save(path, optimize=True)
                made.append(path)
        print('portraits:', len(made), 'written under', os.path.relpath(OUTDIR, ROOT))
        if look:
            contact(made, look)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def contact(paths, out, scale=4, per_row=4):
    """Every strip made, ×scale, on a neutral ground — to look at before it goes in."""
    from PIL import Image
    ims = [Image.open(p).convert('RGBA') for p in paths]
    w, h = SIZE * len(EXPRESSIONS) + 6, SIZE + 4
    rows = (len(ims) + per_row - 1) // per_row
    sheet = Image.new('RGBA', (per_row * w, rows * h), (96, 104, 112, 255))
    for k, im in enumerate(ims):
        sheet.alpha_composite(im, ((k % per_row) * w + 2, (k // per_row) * h + 2))
    sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST).save(out)
    print('look:', out)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--render':
        blender_render(sys.argv[2], sys.argv[3:])
    else:
        main(sys.argv[1:])
