#!/usr/bin/env python3
"""Face portraits for the talk card, Stardew-style: each character's head and shoulders, drawn.

  python3 tools/bridge-art/portraits.py npc-baker [npc-…]      one NPC or a few (any NPCS name in characters.py)
  python3 tools/bridge-art/portraits.py npcs | crowd | pilots  every NPC / every crowd body / every pilot head
  python3 tools/bridge-art/portraits.py all                    the lot (358 files, a minute or so)
      [--look FILE]  a ×4 contact sheet of what was made — look at it before it goes in

Drawn the way a pixel artist would draw a portrait (Beck, October 2026: the Blender ones — the toy models seen from the
front — were "too just blob like"; he picked the Stardew proportions with the slightly bigger eyes of the in-between
round): a face with cheekbones, a jaw and a chin, ears, a neck, sloped shoulders and sleeves; hair in locks with
strands and a band of shine; eyes with whites, a nose, lips; light from the upper left in a few flat bands, a cast
shadow under a fringe, a brim and the chin, a dark line round the figure and a softer one wherever one thing lies over
another. No Blender: everything about a person comes from their entry in characters.py — NPCS (skin, hair, clothes,
hats, beards: the flags the models are built from), EXTRAS (the crowd's bodies) and the pilot's suits and heads.

The shapes are signed-distance shapes in a 64-unit frame, lit by how they'd bulge (a rounded rim, flat inside);
clothes take the light of the body under them, so a vest is a panel on a chest, not a cushion. The face's features are
pixel templates (FACES) stamped only on the face's own pixels, so a fringe, a hat, shades or a mask cover what they
cover. Who smiles, who frowns, who blushes: MOODS, ROSY and face_of().

Each file is a strip of SIZE × SIZE frames, one per expression (EXPRESSIONS: neutral, happy, surprised, sad, blink):
  apps/bridge/assets/portraits/<sheet>.png                       an NPC (npc-baker …), in its own colours
  apps/bridge/assets/portraits/crowd/<body>.png                  a crowd body (characters.py EXTRAS) in the crowd's key
                                                                 colours (XKEYS), swapped by js/crowd.js like its sheets
  apps/bridge/assets/portraits/pilots/[<style>-]<a|b>-<head>.png a pilot's suit, build and head in the pilot's key
                                                                 colours (KEYS), swapped by js/look.js (hired people)
Key-coloured portraits use nothing but each key's three tones and their line-work copies (lineOf: half the colour, half
OUTLINE, as the game's), plus two keys of their own, the iris (IRIS_KEY, a colour per person) and the blush
(BLUSH_KEY, mixed from their skin) — keep them in step with js/look.js — and colours that are never swapped (the eyes'
whites and lids, the mouth, brass, steel, glass).
"""
import ast
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CHARS = os.path.join(HERE, 'characters.py')
OUTDIR = os.environ.get('PORTRAITS_OUT') or os.path.join(ROOT, 'apps', 'bridge', 'assets', 'portraits')

SIZE = 64                 # a portrait frame (the talk card shows it ×2 on a desktop, ×1 on a phone)
EXPRESSIONS = ['neutral', 'happy', 'surprised', 'sad', 'blink']
OUTLINE = (11, 10, 24)    # sprites_post.py OUTLINE: a key colour's line-work copy is half this, half the colour
INK = (34, 20, 30)        # the line round an NPC's figure: a warm near-black
STYLES = ['flight', 'coat', 'plate', 'thermal', 'runner', 'mystic', 'ranger']

# the extra key colours painted into key-coloured portraits (js/look.js and js/crowd.js swap them)
IRIS_KEY = ('#00284c', '#003c70', '#0058a0')
BLUSH_KEY = '#f05878'

# the light: upper left, a little in front; three bands (dark, mid, light) between these cuts of N·L
LIGHT = (-0.62, -0.7, 0.52)
BANDS = (0.12, 0.62)

# where things are, in frame units (64 across): Stardew's proportions — a head a little under half the frame
P = dict(top=11.0, rx=13.4, ry=14.0, cy=26.5, cheek_y=32.5, jaw_w=11.3, jaw_y=41.0, chin_w=5.0, chin_y=48.5,
         eye_y=33.0, eye_dx=6.0, brow_y=29.0, nose_y=38.5, mouth_y=43.5, ear_y=34.0, neck_w=5.6, sh_y=52.5, sh_w=29.0,
         hairline=23.0, R_face=4.5)
SIL, INNER = 0.72, 0.25   # how far toward INK an NPC's lines go: round the figure, and where one thing lies over another

NP = None                 # numpy, imported in main


# =====================================================================================================================
#  The characters (characters.py's tables, read without Blender)
# =====================================================================================================================
def tables():
    src = open(CHARS).read()
    env = {'dict': dict}
    for n in ast.parse(src).body:
        if isinstance(n, ast.Assign) and len(n.targets) == 1:        # the tables are plain data: evaluate them in order
            t = n.targets[0]
            try:
                v = eval(compile(ast.Expression(n.value), CHARS, 'eval'), env)
            except Exception:
                continue
            if isinstance(t, ast.Name):
                env[t.id] = v
            elif isinstance(t, ast.Subscript) and isinstance(t.value, ast.Name) and t.value.id in env:
                env[t.value.id][eval(compile(ast.Expression(t.slice), CHARS, 'eval'), env)] = v
    return env


# =====================================================================================================================
#  Colour
# =====================================================================================================================
def rgb(c):
    if isinstance(c, str):
        c = c.lstrip('#')
        return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))
    return tuple(int(v) for v in c)


def mix(a, b, t):
    a, b = rgb(a), rgb(b)
    return tuple(int(round(a[i] * (1 - t) + b[i] * t)) for i in range(3))


def line_of(c):
    c = rgb(c)
    return tuple((c[i] + OUTLINE[i]) >> 1 for i in range(3))


class Ctx:
    """What's being drawn: an NPC in its own colours (keyed = False) or a key-coloured one (crowd, pilot)."""
    keyed = False
    fixed = {}


C = Ctx()


def ramp(tones, kind='cloth'):
    """A material's five tones, darkest first: [deep, dark, mid, light, high] from its three (dark, mid, light).
    Shadows lean cool (skin: warm, toward red), the high light warm. Key-coloured: the key's own three only."""
    d, m, l = (rgb(t) for t in tones)
    if C.keyed:
        return [d, d, m, l, l]
    if kind == 'skin':
        return [mix(mix(d, (120, 40, 50), 0.35), (0, 0, 0), 0.18), mix(d, (176, 82, 80), 0.18), m, l,
                mix(l, (255, 240, 220), 0.4)]
    if kind == 'hair':
        return [mix(d, (24, 14, 30), 0.45), d, m, l, mix(l, (255, 250, 236), 0.45)]
    return [mix(d, (28, 18, 44), 0.42), d, m, l, mix(l, (255, 250, 236), 0.35)]


def tone(name):
    """A fixed material's tones (characters.py FIXED: brass, steel, fur …)."""
    return C.fixed[name]


# =====================================================================================================================
#  Shapes: signed distance in frame units (negative inside)
# =====================================================================================================================
class Grid:
    def __init__(self, n):
        self.n, self.s = n, 64.0 / n
        ys, xs = NP.mgrid[0:n, 0:n]
        self.X, self.Y = (xs + 0.5) * self.s, (ys + 0.5) * self.s


def catmull(pts, k=8):
    P_ = [NP.array(p, float) for p in pts]
    n = len(P_)
    out = []
    for i in range(n):
        p0, p1, p2, p3 = P_[(i - 1) % n], P_[i], P_[(i + 1) % n], P_[(i + 2) % n]
        for j in range(k):
            t = j / k
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t))
    return out


def poly(g, pts, smooth=True):
    Q = NP.array(catmull(pts) if smooth else pts, float)
    X, Y = g.X, g.Y
    d = NP.full(X.shape, NP.inf)
    inside = NP.zeros(X.shape, bool)
    n = len(Q)
    for i in range(n):
        ax, ay = Q[i]
        bx, by = Q[(i + 1) % n]
        ex, ey = bx - ax, by - ay
        wx, wy = X - ax, Y - ay
        t = NP.clip((wx * ex + wy * ey) / (ex * ex + ey * ey + 1e-9), 0, 1)
        dx, dy = wx - ex * t, wy - ey * t
        d = NP.minimum(d, dx * dx + dy * dy)
        c1, c2, c3 = Y >= ay, Y < by, ex * wy > ey * wx
        inside ^= (c1 & c2 & c3) | (~c1 & ~c2 & ~c3)
    return NP.where(inside, -1.0, 1.0) * NP.sqrt(d)


def ell(g, cx, cy, rx, ry):
    return (NP.hypot((g.X - cx) / rx, (g.Y - cy) / ry) - 1) * min(rx, ry)


def box(g, x0, y0, x1, y1, r=0.0):
    cx, cy, hx, hy = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 - r, (y1 - y0) / 2 - r
    qx, qy = NP.abs(g.X - cx) - hx, NP.abs(g.Y - cy) - hy
    return NP.hypot(NP.maximum(qx, 0), NP.maximum(qy, 0)) + NP.minimum(NP.maximum(qx, qy), 0) - r


def capsule(g, ax, ay, bx, by, r):
    ex, ey = bx - ax, by - ay
    wx, wy = g.X - ax, g.Y - ay
    t = NP.clip((wx * ex + wy * ey) / (ex * ex + ey * ey + 1e-9), 0, 1)
    return NP.hypot(wx - ex * t, wy - ey * t) - r


def U(*a):
    return NP.minimum.reduce(a)


def I(*a):
    return NP.maximum.reduce(a)


def S(a, b):
    return NP.maximum(a, -b)


def mirror_pts(pts, cx=32.0):
    """Points down one side (x ≤ cx, top to bottom) → a closed outline mirrored across the centre line."""
    return list(pts) + [(2 * cx - x, y) for x, y in reversed(pts)]


def shift(mask, dx, dy, fill=False):
    out = NP.full_like(mask, fill)
    h, w = mask.shape
    out[max(0, dy):h + min(0, dy), max(0, dx):w + min(0, dx)] = mask[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)]
    return out


# =====================================================================================================================
#  Layers and the painter
# =====================================================================================================================
class Layer:
    """A shape with a material. R: how round its rim is (the light's falloff); form: light it as this shape instead
    (clothes as the body); casts: (dx, dy, groups) — a shadow down and right onto those groups behind it; tex: tones
    reworked (strands, ribs, weave); flat: one tone; bias: lighter (+) or darker (−) overall."""
    def __init__(self, name, sdf, tones, kind='cloth', R=6.0, casts=None, group=None, line=True, tex=None, flat=None,
                 bias=0.0, form=None):
        self.name, self.sdf, self.kind = name, sdf, kind
        self.ramp = ramp(tones, kind)
        self.R, self.casts, self.group = R, casts, group or kind
        self.line, self.tex, self.flat, self.bias, self.form = line, tex, flat, bias, form


def shade(g, sdf, R):
    d = NP.clip(-sdf, 0, None)
    u = NP.minimum(d / R, 1.0)
    h = R * NP.sqrt(NP.clip(1 - (1 - u) ** 2, 0, 1))
    gy, gx = NP.gradient(h, g.s)
    nz = 1 / NP.sqrt(1 + gx * gx + gy * gy)
    L = NP.array(LIGHT) / NP.linalg.norm(LIGHT)
    return -gx * nz * L[0] - gy * nz * L[1] + nz * L[2]


def paint(g, layers):
    """Layers back to front → (rgb image, which layer is on top at each pixel)."""
    n = g.n
    top = NP.full((n, n), -1, int)
    masks = [L.sdf < 0 for L in layers]
    for i, m in enumerate(masks):
        top[m] = i
    tones = NP.zeros((n, n), int)
    for i, L in enumerate(layers):
        own = top == i
        if not own.any():
            continue
        if L.flat is not None:
            t = NP.full((n, n), L.flat)
        else:
            diff = shade(g, L.sdf if L.form is None else L.form, L.R) + L.bias
            t = NP.ones((n, n), int)
            t[diff > BANDS[0]] = 2
            t[diff > BANDS[1]] = 3
        if L.tex is not None:
            t = L.tex(g, t, own)
        tones[own] = t[own]
    # cast shadows: a caster shifted down and right darkens what's behind it by a band
    for i, L in enumerate(layers):
        if not L.casts:
            continue
        dx, dy, onto = L.casts
        sh = shift(masks[i], dx, dy) & ~masks[i]
        for j in range(i):
            if layers[j].group in onto or layers[j].name in onto:
                hit = sh & (top == j)
                tones[hit] = NP.maximum(0, tones[hit] - 1)
    img = NP.zeros((n, n, 4), NP.uint8)
    for i, L in enumerate(layers):
        own = top == i
        if own.any():
            img[own, :3] = NP.array(L.ramp, NP.uint8)[NP.clip(tones[own], 0, 4)]
            img[own, 3] = 255
    # line work: the figure's edge darkest; where a layer lies over another, its own edge a little darker
    line = NP.zeros((n, n), NP.uint8)              # 0 none, 1 inner, 2 the figure's edge
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        nb = NP.full((n, n), -1, int)
        nb[max(0, -dy):n - max(0, dy), max(0, -dx):n - max(0, dx)] = top[max(0, dy):n + min(0, dy), max(0, dx):n + min(0, dx)]
        frame = NP.zeros((n, n), bool)            # the frame's bottom and sides cut the figure: no line there
        if dy == 1:
            frame[n - 1, :] = True
        if dx == 1:
            frame[:, n - 1] = True
        if dx == -1:
            frame[:, 0] = True
        line[(top >= 0) & (nb < 0) & ~frame] = 2
        line[(top >= 0) & (nb >= 0) & (nb < top) & (line == 0)] = 1
    for i, L in enumerate(layers):
        if not L.line:
            continue
        own = top == i
        if C.keyed:
            sil, inner = line_of(L.ramp[1]), L.ramp[1]
        else:
            sil, inner = mix(L.ramp[0], INK, SIL), mix(L.ramp[0], INK, INNER)
        img[own & (line == 2), :3] = sil
        img[own & (line == 1), :3] = inner
    return img, top


# =====================================================================================================================
#  Textures
# =====================================================================================================================
def hair_tex(px_, py_, down=False, sheen=None, centre_part=False):
    """Strands and a sheen on hair: a few long lines running out from the parting (or the crown), not evenly — each
    its own length, some left out — and a band of light in short strokes round the head on the side toward the light.
    A centre part is a line down the middle."""
    def tex(g, t, own):
        t = t.copy()
        X, Y = g.X, g.Y
        ang = NP.arctan2(Y - py_, X - px_)
        r = NP.hypot(X - px_, Y - py_)
        ph = ang * 13.0 / (2 * math.pi) + 0.08 * NP.sin(r * 0.3)
        idx = NP.floor(ph + 0.5).astype(int)
        h = (idx * 2654435761) % 997 / 997.0
        strand = (NP.abs(ph - idx) < 0.11) & (h > 0.3) & (r > 4 + 6 * h)
        if centre_part:
            strand |= (NP.abs(X - px_) < 0.51) & (Y < py_ - 2)
        t[strand & (t >= 2)] -= 1
        if sheen is not None and not down:
            sx, sy, sr = sheen
            a = NP.degrees(NP.arctan2(Y - sy, X - sx))
            band = (NP.abs(NP.hypot(X - sx, Y - sy) - sr) < 0.9) & (a > -165) & (a < -60) & (t >= 2) & ~strand
            t[band] = NP.maximum(t[band], 3)
        return t
    return tex


def curl_tex():
    def tex(g, t, own):
        t = t.copy()
        c = (NP.sin(g.X * 1.25 + NP.sin(g.Y * 0.9) * 1.6) * NP.sin(g.Y * 1.25 + NP.sin(g.X * 0.7))) > 0.78
        t[c & (t >= 2)] -= 1
        return t
    return tex


def fur_tex():
    def tex(g, t, own):
        t = t.copy()
        f = (NP.sin(g.X * 2.1 + NP.sin(g.Y * 1.3) * 2) * NP.sin(g.Y * 1.7)) > 0.55
        t[f & (t >= 2)] -= 1
        return t
    return tex


def rib_tex(cx, step):
    def tex(g, t, own):
        t = t.copy()
        t[((NP.floor((g.X - cx) / step) % 2) == 0) & (t >= 2)] -= 1
        return t
    return tex


def straw_tex():
    def tex(g, t, own):
        t = t.copy()
        w = ((NP.floor(g.X / 2) + NP.floor(g.Y / 2)) % 2 == 0) & (NP.floor(g.Y) % 2 == 0)
        t[w & (t >= 2)] -= 1
        return t
    return tex


def quilt_tex(y0, step):
    def tex(g, t, own):
        t = t.copy()
        t[(NP.abs(((g.Y - y0) % step) - step / 2) > step / 2 - 0.6) & (t >= 2)] -= 1
        return t
    return tex


def panel_tex(side):
    """A vest's or a coat's panel: flat cloth, a lit edge down the opening on the side toward the light, the other
    panel darker."""
    def tex(g, t, own):
        t = NP.full_like(t, 2 if side < 0 else 1)
        if side < 0:
            t[own & ~shift(own, 1, 0)] = 3
        else:
            t[own & ~shift(own, -1, 0)] = 2
        return t
    return tex


# =====================================================================================================================
#  A person
# =====================================================================================================================
MOODS = {    # a face's temperament: its resting mouth and brows. Most of the cast smile at rest; these don't.
    'stern':  ['npc-watcher', 'npc-doorman', 'npc-pitboss', 'npc-samurai', 'npc-hm-garro', 'npc-boxman', 'npc-stickman',
               'npc-elf-warden', 'npc-registrar', 'npc-dealer-b', 'npc-vex', 'npc-sev'],
    'flat':   ['npc-ferryman', 'npc-quiet', 'npc-stranger', 'npc-traveler', 'npc-keeper', 'npc-miner', 'npc-scholar',
               'npc-croupier', 'npc-dealer', 'npc-dealer-c', 'npc-clerk', 'npc-courier', 'npc-technician', 'npc-waiting',
               'npc-gambler-b', 'npc-queen', 'npc-duchess', 'npc-sorceress', 'npc-steward', 'npc-broker'],
    'smirk':  ['npc-pawnbroker', 'npc-highroller', 'npc-dj', 'npc-mixer', 'npc-gambler-a', 'npc-peddler', 'npc-hm-mira',
               'npc-beckolas', 'npc-singer', 'npc-runouts-host'],
}
MOOD = {name: mood for mood, names in MOODS.items() for name in names}
YOUNG = {'npc-elf-child'}                                          # children who aren't built `young`
ROSY = {'npc-baker', 'npc-innkeeper', 'npc-fisher-gran', 'npc-hetty', 'npc-bartender', 'npc-vbaker'}   # ruddy cheeks
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


def person(who, spec):
    """Their look and their face's temperament, from their spec. Lashes (and a blush, if they smile) on a skirt, a
    gown, a bun or a braid, or long hair without a tunic; never with a beard. Grey or white hair is older."""
    sk = spec.get('skin', 'skin')
    skin = C.fixed.get(sk) if isinstance(sk, str) else sk
    hair = spec.get('hair') or ('#2a1a10', '#4a2e1a', '#6a4428')
    beard, mustache = bool(spec.get('beard')), bool(spec.get('mustache'))
    if who.startswith('pilot'):
        femme = spec.get('build') == 'b' and not beard
    else:
        femme = not (beard or mustache) and (any(spec.get(k) for k in ('skirt', 'gown', 'bun', 'braid', 'braid_crown', 'stole', 'sequin'))
                                             or (bool(spec.get('long_hair')) and 'tunic' not in spec))
    mid = rgb(hair[1])
    grey = max(mid) - min(mid) < 14 and mid[0] > 140 and not C.keyed
    young = bool(spec.get('young')) or who in YOUNG
    style = ('mohawk' if spec.get('mohawk') else 'bald' if spec.get('bald') else 'bun' if spec.get('bun') else
             'braid' if spec.get('braid') else 'ponytail' if spec.get('ponytail') else
             'flowing' if spec.get('long_hair') == 'flowing' else 'long' if spec.get('long_hair') else
             'curly' if spec.get('curly') else 'short')
    mood = 'smile' if C.keyed else MOOD.get(who, 'smile')
    if spec.get('smile') is False and mood == 'smile':
        mood = 'flat'
    if C.keyed:
        iris = IRIS_KEY
    elif isinstance(spec.get('eye'), (list, tuple)):
        iris = tuple(spec['eye'])
    else:
        iris = IRISES[IRIS_ORDER[name_hash(who) % len(IRIS_ORDER)]]
    blush = young or (femme and mood in ('smile', 'smirk')) or who in ROSY or bool(spec.get('blush'))
    return dict(who=who, spec=spec, skin=skin, hair=hair, beard=beard, mustache=mustache, femme=femme, young=young,
                old=grey and not young, style=style, mood=mood, iris=iris, blush=blush)


# =====================================================================================================================
#  Building the picture
# =====================================================================================================================
def build(g, me):
    """The layers for a person, back to front; the face's anchors; and what's done after the face (a visor's glass)."""
    sp = me['spec']
    cx = 32.0
    skin, hair = me['skin'], me['hair']
    brawny = bool(sp.get('brawny'))
    young = me['young']
    L, post = [], []
    top, rx, cy = P['top'], P['rx'], P['cy']
    cheek_y, jaw_y, chin_y = P['cheek_y'], P['jaw_y'], P['chin_y']
    jaw_w, chin_w = P['jaw_w'], P['chin_w']
    if me['femme']:
        jaw_w -= 0.8
        chin_w -= 0.6
        chin_y -= 0.6
    if young:                                            # a child's face: rounder, a soft little chin
        jaw_w += 0.4
        chin_w += 1.0
        chin_y -= 1.6
    if brawny or me['beard']:
        jaw_w += 0.8
        chin_w += 0.8
    hstyle = me['style']
    hl = P['hairline']
    ear_y = P['ear_y']
    helmet = bool(sp.get('helmet'))
    hood = sp.get('hood') or sp.get('leaf_hood')
    elf = bool(sp.get('elf_ears'))

    # ---- behind: a veil, long hair down the back, a hood's back, a bun, a ponytail -----------------------------------
    sh_y = P['sh_y']
    sh_w = P['sh_w'] * (0.8 if young else 0.88 if sp.get('build') == 'b' else 1.0) + (3 if brawny else 0)
    nw = P['neck_w'] + (1.4 if brawny else 0) - (0.6 if me['femme'] else 0) - (0.8 if young else 0)
    if sp.get('veil'):
        y0 = top + 4 if sp.get('flower_crown') else sh_y - 6
        veil = poly(g, [(cx - rx - 1, y0), (cx - sh_w - 4, 70), (cx + sh_w + 4, 70), (cx + rx + 1, y0)], smooth=False)
        L.append(Layer('veil', veil, sp['veil'], R=10, group='veil', bias=0.15))
    if hood and not helmet:
        back = ell(g, cx, cy + 4, rx + 6.5, P['ry'] + 8.5)
        if sp.get('leaf_hood'):
            back = U(back, poly(g, [(cx - 7, top - 3), (cx + 1, top - 12), (cx + 7, top - 3)], smooth=False))
        L.append(Layer('hood_back', back, hood, R=8, group='hood'))
    if hstyle in ('long', 'flowing') and not hood and not helmet:
        long_y = 64 if hstyle == 'flowing' else 60
        back = poly(g, mirror_pts([(cx - 1, top - 1.5), (cx - rx + 0.5, top + 4), (cx - rx - 3.5, cy + 2),
                                   (cx - rx - 4.0, cheek_y + 10), (cx - rx - 5.5, long_y - 4), (cx - rx - 2.5, long_y + 2),
                                   (cx - 8, long_y + 2)]))
        L.append(Layer('hair_back', back, hair, kind='hair', R=6, group='hair', tex=hair_tex(cx, top - 4, down=True)))
    if hstyle == 'ponytail' and not helmet:
        L.append(Layer('hair_back', capsule(g, cx + rx - 1, cy + 2, cx + rx + 2.5, cheek_y + 17, 3.4), hair, kind='hair', R=3,
                       group='hair', tex=hair_tex(cx + rx, cy, down=True)))
    if hstyle == 'bun' and not helmet:
        L.append(Layer('bun', ell(g, cx, top + 0.5, 6.6, 5.6), hair, kind='hair', R=5, group='hair', tex=hair_tex(cx, top - 2.5)))

    # ---- the body: shoulders, the shirt and what's over it -----------------------------------------------------------
    shirt = sp.get('tunic') or sp.get('shirt') or ('#3e444c', '#5e6872', '#828e9a')
    outline = [(cx - nw - 1, sh_y - 2.5), (cx - sh_w * 0.55, sh_y + 0.5), (cx - sh_w * 0.88, sh_y + 4),
               (cx - sh_w, sh_y + 10)]
    torso = poly(g, outline + [(cx - sh_w - 1, 70), (cx + sh_w + 1, 70)] + [(2 * cx - x, y) for x, y in reversed(outline)])
    body = poly(g, outline + [(cx - sh_w - 2, 96), (cx + sh_w + 2, 96)] + [(2 * cx - x, y) for x, y in reversed(outline)])
    A = dict(cx=cx, nw=nw, sh_y=sh_y, sh_w=sh_w)

    def cloth(name, sdf, tones, kind='cloth', **kw):          # something worn: on the torso, lit as the body
        kw.setdefault('R', 12)
        kw.setdefault('form', body)
        L.append(Layer(name, I(sdf, torso), tones, kind=kind, group=kw.pop('group', name), **kw))

    def arm_of(s, grow=0.0):        # the upper arm on side s: the shoulder's round to the frame's bottom
        return poly(g, [(cx + s * (sh_w * 0.6 - grow), sh_y + 0.6), (cx + s * (sh_w * 0.86), sh_y + 3.4),
                        (cx + s * (sh_w + 3), sh_y + 11), (cx + s * (sh_w + 3), 70),
                        (cx + s * (sh_w * 0.72 - grow), 70), (cx + s * (sh_w * 0.68 - grow), sh_y + 9)])

    def strap(x0, y0, x1, y1, tones, w=1.3):
        cloth('strap', capsule(g, x0, y0, x1, y1, w), tones, R=2, form=None)

    L.append(Layer('torso', torso, shirt, R=12, group='cloth', form=body))
    if sp.get('pilot'):
        pilot_body(g, L, sp, cloth, arm_of, cx, nw, sh_y, sh_w)
    else:
        npc_body(g, L, sp, me, cloth, arm_of, strap, cx, nw, sh_y, sh_w, body)

    if (sp.get('pilot') in ('mystic', 'ranger') or sp.get('cowl')) and not helmet:   # a hood fallen back, round the neck
        t_ = sp.get('cowl') or (sp['suitdk'] if sp['pilot'] == 'mystic' else sp['suit'])
        roll = S(ell(g, cx, sh_y + 0.5, nw + 10.5, 6.2), ell(g, cx, sh_y - 2.8, nw + 1.2, 4.2))
        L.append(Layer('cowl', I(roll, box(g, 0, sh_y - 5, 64, 70)), t_, R=4, group='cowl', tex=rib_tex(cx + 1, 3.5)))

    # ---- the neck, the ears, the head ----------------------------------------------------------------------------------
    if hstyle in ('bald', 'mohawk') and not young and not helmet:     # a fringe of hair round the back, above the ears
        for s in (-1, 1):
            L.append(Layer('tuft', ell(g, cx + s * (rx - 0.6), ear_y - 4.2, 2.0, 4.2), hair, kind='hair', R=2, group='hair',
                           tex=hair_tex(cx, ear_y - 12, down=True)))
    L.append(Layer('neck', box(g, cx - nw, cheek_y, cx + nw, sh_y + 1.5, 1.5), skin, kind='skin', R=4, group='skin',
                   bias=-0.22))
    if sp.get('pilot') and sp['pilot'] in ('flight', 'coat', 'plate', 'mystic', 'ranger') or helmet:
        col = sp.get('collar') or sp.get('suitdk')
        ring = S(ell(g, cx, sh_y - 1.5, nw + 3.4, 3.2), ell(g, cx, sh_y - 3.0, nw - 0.2, 1.6))
        L.append(Layer('collar', ring, col, R=2.5, group='collarring', bias=0.1))
    if sp.get('pilot') == 'runner':
        hc = S(box(g, cx - nw - 2.4, sh_y - 6.5, cx + nw + 2.4, sh_y + 1.5, 2.2), box(g, cx - nw + 0.6, sh_y - 9, cx + nw - 0.6, sh_y - 0.5, 1.2))
        L.append(Layer('collar', hc, sp['suitdk'], R=3, group='collarring'))
    if sp.get('pilot') == 'thermal':
        ruff = S(ell(g, cx, sh_y - 1.0, nw + 8.0, 5.0), ell(g, cx, sh_y - 3.5, nw - 0.4, 2.2))
        L.append(Layer('ruff', ruff, tone('fur'), R=4, group='ruff', tex=fur_tex()))
    ears = []
    for s in (-1, 1):
        if elf:
            ear = poly(g, [(cx + s * (rx - 1.5), ear_y - 2), (cx + s * (rx + 3), ear_y - 5), (cx + s * (rx + 9.5), ear_y - 10.5),
                           (cx + s * (rx + 4.5), ear_y + 1), (cx + s * (rx + 1), ear_y + 4), (cx + s * (rx - 1.5), ear_y + 3)])
        else:
            ear = ell(g, cx + s * (rx - 0.2), ear_y, 2.6, 3.6)
        ears.append(Layer('ear', ear, skin, kind='skin', R=2, group='skin', bias=-0.1))
    if not helmet:
        L.extend(ears)
    dome = top + (1.6 if hstyle in ('bald', 'mohawk') else 0)       # a bald head rounder and lower: a dome, not a bullet
    face_pts = [(cx, dome), (cx - rx * 0.56, dome + 1.1), (cx - rx * 0.9, dome + 5.0), (cx - rx, cy + 1),
                (cx - rx + 0.3, cheek_y + 0.5), (cx - jaw_w, jaw_y), (cx - chin_w, chin_y - 1.6), (cx - chin_w * 0.4, chin_y),
                (cx + chin_w * 0.4, chin_y), (cx + chin_w, chin_y - 1.6), (cx + jaw_w, jaw_y), (cx + rx - 0.3, cheek_y + 0.5),
                (cx + rx, cy + 1), (cx + rx * 0.9, dome + 5.0), (cx + rx * 0.56, dome + 1.1)]
    L.append(Layer('face', poly(g, face_pts), skin, kind='skin', R=P['R_face'], group='face',
                   casts=(1, 3, ('skin', 'cloth', 'collar', 'collarring', 'ruff'))))
    A.update(eye_y=P['eye_y'], eye_dx=P['eye_dx'], brow_y=P['brow_y'], nose_y=P['nose_y'], mouth_y=P['mouth_y'],
             cheek=(P['eye_dx'] + 2.5, P['eye_y'] + 4.5))

    # ---- a beard, a mustache --------------------------------------------------------------------------------------------
    my = P['mouth_y']
    if me['beard']:
        bpts = [(cx - rx + 0.6, ear_y - 1.5), (cx - rx + 2.2, ear_y + 3.5), (cx - jaw_w - 0.6, jaw_y + 1),
                (cx - chin_w - 1.5, chin_y + 2.5), (cx, chin_y + 4.5), (cx + chin_w + 1.5, chin_y + 2.5),
                (cx + jaw_w + 0.6, jaw_y + 1), (cx + rx - 2.2, ear_y + 3.5), (cx + rx - 0.6, ear_y - 1.5),
                (cx + rx - 2.6, ear_y + 1.5), (cx + 5.5, my - 2.6), (cx, my - 2.2), (cx - 5.5, my - 2.6), (cx - rx + 2.6, ear_y + 1.5)]
        L.append(Layer('beard', S(poly(g, bpts), ell(g, cx, my + 0.6, 3.2, 1.7)), hair, kind='hair', R=4, group='beard',
                       tex=hair_tex(cx, my - 6, down=True),
                       casts=(1, 2, ('skin', 'cloth', 'collar', 'collarring', 'vest', 'apron', 'sleeve', 'bib'))))
    if me['mustache']:
        mus = poly(g, [(cx, my - 3.2), (cx - 3.2, my - 2.8), (cx - 5.6, my - 0.6), (cx - 5.0, my + 0.6),
                       (cx - 2.6, my - 1.0), (cx, my - 1.4), (cx + 2.6, my - 1.0), (cx + 5.0, my + 0.6),
                       (cx + 5.6, my - 0.6), (cx + 3.2, my - 2.8)])
        L.append(Layer('mustache', mus, hair, kind='hair', R=2, group='beard', bias=0.1))

    neckwear(g, L, sp, cx, sh_y)

    # ---- hair on the head -----------------------------------------------------------------------------------------------
    if helmet:
        helmet_on(g, L, post, cx, rx, cy, top)
        return L, A, post
    if hstyle == 'curly':
        curls(g, L, hair, cx, rx, cy, hl)
    elif hstyle not in ('bald',):
        cap = ell(g, cx, cy - 1.0, rx + 1.6, P['ry'] + 2.0)
        if hstyle == 'mohawk':
            cap = U(I(cap, box(g, cx - 3.2, 0, cx + 3.2, 64, 1.0)),
                    poly(g, [(cx - 3, top - 1), (cx - 1.5, top - 6.5), (cx + 1, top - 7.5), (cx + 3, top - 2), (cx + 2.6, hl - 1),
                             (cx - 2.6, hl - 1)]))
        crown = S(cap, hairline_sdf(g, cx, hl, rx, hstyle))
        if hstyle in ('long', 'flowing', 'braid', 'short', 'ponytail'):
            crown = U(crown, fringe_sdf(g, cx, hl, rx, hstyle))
        part = {'short': (cx + 4.5, top + 1.5), 'mohawk': (cx, top - 4)}.get(hstyle, (cx + 1.5, top + 1.0))
        if hstyle in ('bun', 'ponytail'):
            part = (cx, hl + 7.0)                    # pulled back: the strands fan up from the forehead
        L.append(Layer('hair', crown, hair, kind='hair', R=5, group='hair',
                       tex=hair_tex(*part, sheen=(cx, cy + 1.5, P['ry'] * 0.8),
                                    centre_part=hstyle in ('bun', 'ponytail', 'flowing')),
                       casts=(1, 2, ('face', 'skin'))))
    braids(g, L, sp, hair, cx, rx, hl)

    # ---- hats and things on the head -----------------------------------------------------------------------------------
    hats(g, L, sp, cx, rx, cy, top, hl)
    if hood and elf:                                 # an elf's ears come out through the hood
        face_sdf = [l for l in L if l.name == 'face'][0].sdf
        for e in ears:
            e.sdf = S(e.sdf, face_sdf)
            L.append(e)
    return L, A, post


def hairline_sdf(g, cx, hl, rx, hstyle):
    """The part of the head the hair leaves bare (the forehead and the face below it): a hairline that dips at the
    temples and runs down in front of the ears — higher for hair pulled back into a bun or a tail."""
    ey = P['ear_y']
    if hstyle in ('bun', 'ponytail'):
        pts = [(cx - rx - 3, ey + 2), (cx - rx + 0.6, ey - 1.5), (cx - rx + 1.6, hl + 4.6), (cx - 6.5, hl - 0.2),
               (cx, hl + 0.6), (cx + 6.5, hl - 0.2), (cx + rx - 1.6, hl + 4.6), (cx + rx - 0.6, ey - 1.5),
               (cx + rx + 3, ey + 2), (cx, 70)]
    else:
        pts = [(cx - rx - 3, ey + 1), (cx - rx + 0.8, ey - 1.0), (cx - rx + 1.8, hl + 4.5), (cx - 6.5, hl + 0.4),
               (cx, hl - 0.4), (cx + 6.5, hl + 0.4), (cx + rx - 1.8, hl + 4.5), (cx + rx - 0.8, ey - 1.0),
               (cx + rx + 3, ey + 1), (cx, 70)]
    return poly(g, pts)


def fringe_sdf(g, cx, hl, rx, hstyle):
    """Locks of hair over the forehead: a fringe swept to one side in pointed locks (short hair), or a part with locks
    falling down the sides of the face (long hair)."""
    if hstyle in ('long', 'flowing', 'braid'):
        return U(*[poly(g, [(cx + s * 0.5, hl - 2.5), (cx + s * 6, hl - 0.8), (cx + s * (rx - 0.6), hl + 4.5),
                            (cx + s * (rx + 0.8), P['cheek_y'] + 6), (cx + s * (rx - 0.6), P['jaw_y'] + 4.5),
                            (cx + s * (rx - 2.4), P['cheek_y'] + 2), (cx + s * (rx - 3.6), hl + 5.5), (cx + s * 3.5, hl + 1.6)])
                   for s in (-1, 1)])
    if hstyle == 'ponytail':
        return poly(g, [(cx - 8, hl - 2), (cx + 8, hl - 2), (cx + 7, hl + 0.6), (cx - 7, hl + 0.6)], smooth=False)
    return poly(g, [(cx + 4.5, hl - 3.5), (cx - 4, hl - 2.5), (cx - rx + 0.8, hl + 1.0), (cx - rx + 1.2, hl + 5.2),
                    (cx - 7.2, hl + 2.4), (cx - 5.4, hl + 4.4), (cx - 2.8, hl + 1.8), (cx - 0.6, hl + 3.6),
                    (cx + 1.6, hl + 1.0), (cx + 4.2, hl + 2.2), (cx + 6.2, hl - 0.6)])


def curls(g, L, hair, cx, rx, cy, hl):
    """A cloud of curls: a round mass, and curls each its own round, along its edge and over the forehead."""
    mass = S(ell(g, cx, cy - 2.5, rx + 3.6, P['ry'] + 3.2), hairline_sdf(g, cx, hl + 1.5, rx + 0.5, 'short'))
    L.append(Layer('hair', mass, hair, kind='hair', R=6, group='hair', tex=curl_tex(), casts=(1, 2, ('face', 'skin'))))
    k = 0
    for a in range(-200, 25, 22):
        t = math.radians(a)
        x, y = cx + math.cos(t) * (rx + 2.6), cy - 2.5 + math.sin(t) * (P['ry'] + 2.4)
        if y > P['ear_y'] - 1:
            continue
        L.append(Layer('curl', ell(g, x, y, 3.0, 2.7), hair, kind='hair', R=2.5, group='hair', tex=curl_tex()))
        k += 1
    for i, x in enumerate(range(-9, 12, 4)):
        L.append(Layer('curl', ell(g, cx + x, hl + 1.2 + (i % 2) * 1.0, 2.7, 2.4), hair, kind='hair', R=2.2, group='hair',
                       casts=(1, 2, ('face',))))


def braids(g, L, sp, hair, cx, rx, hl):
    """Braids that show from the front: over a shoulder ('side'), one over each ('twin'), round the crown, at the
    temples (a gold bead at the end)."""
    b = sp.get('braid')
    sides = [1] if b == 'side' else [-1, 1] if b == 'twin' else []
    tie = sp.get('braid_tie')
    for side in sides:
        bx0 = cx + side * (rx - 1)
        for k in range(5):
            L.append(Layer('braid', ell(g, bx0 + side * (2 + k * 0.6), P['cheek_y'] + 2 + k * 4.2, 3.0, 2.6), hair, kind='hair',
                           R=2.5, group='braid'))
        if tie:
            L.append(Layer('tie', ell(g, bx0 + side * 5.2, P['cheek_y'] + 22.5, 2.2, 1.3), tie, R=1, group='tie'))
    if sp.get('braid_crown'):
        for k in range(7):
            x = cx - 12 + k * 4
            L.append(Layer('braid', ell(g, x, hl - 2.0 - 1.6 * math.cos((x - cx) / 13), 2.6, 2.0), hair, kind='hair', R=2,
                           group='braid'))
    if sp.get('temple_braids'):
        bead = sp.get('trim') or tone('brass')
        for s in (-1, 1):
            for k in range(4):
                L.append(Layer('braid', ell(g, cx + s * (rx - 1.6), hl + 6 + k * 2.6, 1.3, 1.4), hair, kind='hair', R=1.2,
                               group='braid'))
            L.append(Layer('bead', ell(g, cx + s * (rx - 1.6), hl + 17, 1.3, 1.2), bead, R=1, group='bead', bias=0.3))


def npc_body(g, L, sp, me, cloth, arm_of, strap, cx, nw, sh_y, sh_w, body):
    """What an NPC (or a crowd body) wears, as far down as the frame shows."""
    skin = me['skin']
    shirt = sp.get('tunic') or sp.get('shirt') or ('#3e444c', '#5e6872', '#828e9a')
    sleeve = sp.get('sleeve')
    if isinstance(sleeve, str) and sleeve.startswith(('skin', 'xskin')):
        arm_tones, arm_kind = (skin if sleeve == 'skin' else C.fixed[sleeve]), 'skin'
    else:
        arm_tones, arm_kind = (sleeve if isinstance(sleeve, (tuple, list)) else shirt), 'cloth'
    dress = bool(sp.get('gown') or sp.get('skirt')) and me['femme']
    vest = sp.get('vest') or sp.get('waistcoat') or sp.get('coat')
    if sp.get('tunic') and sp.get('shirt'):               # an elf's tunic: a V at the neck, the shirt under it
        cloth('under', poly(g, [(cx - nw - 1, sh_y - 3), (cx + nw + 1, sh_y - 3), (cx, sh_y + 9)], smooth=False), sp['shirt'])
        for s in (-1, 1):
            cloth('tunic', poly(g, [(cx + s * (nw + 1), sh_y - 3), (cx + s * (sh_w + 4), sh_y - 4), (cx + s * (sh_w + 4), 70),
                                    (cx, 70), (cx + s * 0.4, sh_y + 9)], smooth=False), sp['tunic'], tex=panel_tex(s))
    if dress:                                            # a scoop neckline: the collarbones show
        neck_open = ell(g, cx, sh_y - 1.5, nw + 6.0, 6.0)
        cloth('chest', neck_open, skin, kind='skin', group='skin', bias=-0.05)
        if sp.get('trim'):
            cloth('trim', S(ell(g, cx, sh_y - 1.5, nw + 7.4, 7.4), neck_open), sp['trim'], bias=0.1)
    if sp.get('chrome_arm'):                              # the left arm in steel: on the right as you look at them
        arm_l = (tone('steel'), 'cloth')
    if vest:
        for s in (-1, 1):
            if sp.get('coat'):                            # a greatcoat closed to the throat, two rows of buttons
                pts = [(cx + s * (nw + 0.5), sh_y - 2.5), (cx + s * (sh_w + 4), sh_y - 4), (cx + s * (sh_w + 4), 70),
                       (cx - s * 1.5, 70), (cx - s * 1.5, sh_y + 2)]
            elif sp.get('waistcoat'):                     # closed, a small V at the collar
                pts = [(cx + s * (nw + 0.5), sh_y - 2.5), (cx + s * (sh_w * 0.62), sh_y - 1.0), (cx + s * (sh_w * 0.66), sh_y + 6),
                       (cx + s * (sh_w * 0.6), 70), (cx, 70), (cx, sh_y + 6.5)]
            else:
                pts = [(cx + s * (nw + 0.5), sh_y - 2.5), (cx + s * (sh_w * 0.62), sh_y - 1.0), (cx + s * (sh_w * 0.66), sh_y + 6),
                       (cx + s * (sh_w * 0.6), 70), (cx + s * 3.0, 70), (cx + s * 1.6, sh_y + 7)]
            cloth('vest', poly(g, pts, smooth=False), vest, tex=panel_tex(s))
        if not sp.get('coat'):
            for s in (-1, 1):                             # the shirt's sleeves out of the vest's armholes
                tones_, kind_ = (arm_l if s > 0 and sp.get('chrome_arm') else (arm_tones, arm_kind))
                cloth('sleeve', arm_of(s, 0.8), tones_, kind=kind_, group='sleeve')
        if sp.get('waistcoat') or sp.get('coat'):
            for k in range(3):
                for bx in ((-2.6, 2.6) if sp.get('coat') else (0.0,)):
                    L.append(Layer('button', ell(g, cx + bx, sh_y + 8 + k * 4.0, 0.9, 0.9), tone('brass'), R=1, group='button',
                                   bias=0.3))
        if sp.get('coat'):
            for s in (-1, 1):                             # gold epaulettes
                L.append(Layer('epaulette', I(ell(g, cx + s * sh_w * 0.72, sh_y + 2.2, 5.0, 2.2), box(g, 0, 0, 64, 70)),
                               tone('brass'), R=2, group='epaulette', bias=0.15))
    else:
        for s in (-1, 1):
            tones_, kind_ = (arm_l if s > 0 and sp.get('chrome_arm') else (arm_tones, arm_kind))
            cloth('sleeve', arm_of(s), tones_, kind=kind_, group='sleeve')
    collar = not dress and not sp.get('tunic') and not sp.get('coat') and not (sp.get('vest') and not sp.get('waistcoat'))
    if sp.get('bib'):                                     # a dinner suit: a shirt front between the jacket's lapels
        bib = sp['bib'] if isinstance(sp['bib'], (tuple, list)) else tone('bib')
        cloth('bib', poly(g, [(cx - nw - 1.5, sh_y - 3), (cx + nw + 1.5, sh_y - 3), (cx + 2.5, 70), (cx - 2.5, 70)], smooth=False),
              bib, bias=0.1)
        for s in (-1, 1):
            cloth('lapel', poly(g, [(cx + s * (nw + 1.5), sh_y - 3), (cx + s * (nw + 3.5), sh_y - 1.5), (cx + s * 3.0, 70),
                                    (cx + s * 2.0, 70)], smooth=False), shirt, bias=-0.2)
        collar = True
    if collar:
        for s in (-1, 1):
            col = poly(g, [(cx + s * (nw + 1.5), sh_y - 3.0), (cx + s * 0.5, sh_y + 2.5), (cx + s * (nw + 2.5), sh_y + 3.0)],
                       smooth=False)
            white = tone('white') if (sp.get('waistcoat') or sp.get('bib')) and not C.keyed else (tone('bib') if sp.get('bib') else shirt)
            if sp.get('waistcoat'):
                white = shirt
            cloth('collar', col, white, bias=0.2, group='collar')
    if sp.get('neckline'):                                # a gold V down the bodice to a pendant
        gold = sp.get('trim') or tone('brass')
        for s in (-1, 1):
            cloth('neckline', capsule(g, cx + s * (nw + 5.5), sh_y - 1.5, cx, sh_y + 9.5, 0.8), gold, R=2, form=None, bias=0.2)
        if sp.get('gem'):
            L.append(Layer('pendant', ell(g, cx, sh_y + 10.2, 1.6, 1.9), sp['gem'], R=1.5, group='gem', bias=0.3))
    if sp.get('sequin'):                                  # glints scattered over the dress
        h = ((NP.floor(g.X).astype(int) * 73856093) ^ (NP.floor(g.Y).astype(int) * 19349663) ^ name_hash(me['who'])) % 17
        glint = (h == 0) & (g.Y > sh_y + 2) & (NP.abs(g.X - cx) < sh_w * 0.75)
        cloth('sequins', NP.where(glint, -1.0, 1.0), tone('sequin'), flat=3, line=False)
    apron = sp.get('apron')
    if apron:
        cloth('apron', U(box(g, cx - 8.5, sh_y + 4.5, cx + 8.5, 70, 1.0), capsule(g, cx - 7.5, sh_y + 5, cx - nw - 2.2, sh_y - 2.6, 1.1),
                         capsule(g, cx + 7.5, sh_y + 5, cx + nw + 2.2, sh_y - 2.6, 1.1)), apron)
    if sp.get('cuirass'):                                 # a breastplate of leaf scales, a gold leaf on it
        cloth('cuirass', box(g, cx - 12, sh_y + 3, cx + 12, 70, 4), sp['cuirass'], tex=scale_tex())
        gold = sp.get('trim') or tone('brass')
        L.append(Layer('leaf', poly(g, [(cx, sh_y + 4.5), (cx - 3.2, sh_y + 8.5), (cx, sh_y + 12.5), (cx + 3.2, sh_y + 8.5)]),
                       gold, R=2, group='leaf', bias=0.2))
    if sp.get('stole'):
        L.append(Layer('stole', I(body, S(ell(g, cx, sh_y + 4, sh_w + 2, 9.0), ell(g, cx, sh_y + 1, nw + 3.5, 5.5))),
                       sp['stole'], R=5, group='stole', tex=fur_tex()))
    if sp.get('shawl'):                                   # a shawl over the shoulders, cut into leaves at its edge
        sh = S(ell(g, cx, sh_y + 2.5, sh_w * 0.95, 11.0), ell(g, cx, sh_y - 1, nw + 3.0, 4.5))
        sh = S(sh, U(*[ell(g, cx + x, sh_y + 13.5, 2.6, 3.4) for x in range(-24, 26, 6)]))
        L.append(Layer('shawl', I(sh, body), sp['shawl'], R=5, group='shawl'))
    if sp.get('cloak') or sp.get('leaf_cloak'):          # a mantle over the shoulders, its hem cut into leaves, a clasp
        c = sp.get('cloak') or shirt
        m = S(ell(g, cx, sh_y + 1.5, sh_w + 1.5, 9.5), ell(g, cx, sh_y - 1.5, nw + 2.5, 4.0))
        m = S(m, U(*[ell(g, cx + x, sh_y + 11.8, 2.4, 3.2) for x in range(-30, 32, 5)]))
        L.append(Layer('mantle', I(m, body), c, R=6, group='mantle', tex=leaf_tex(sp.get('leaf_light'))))
        L.append(Layer('clasp', ell(g, cx, sh_y + 2.0, 1.6, 1.6), sp.get('trim') or tone('brass'), R=1, group='clasp', bias=0.3))
    if sp.get('armour'):                                  # pauldrons of leaf plates
        for s in (-1, 1):
            for k in range(3):
                L.append(Layer('pauldron', ell(g, cx + s * (sh_w * 0.66 + k * 2.4), sh_y + 1.5 + k * 3.0, 6.0 - k * 0.6, 3.0),
                               (sp.get('leaf_light') if k % 2 else None) or sp['armour'], R=2.5, group='pauldron%d' % k))
    if sp.get('quiver') or sp.get('satchel') or sp.get('bow') is True:
        strap(cx - sh_w * 0.55, sh_y + 0.5, cx + sh_w * 0.4, 70, tone('leather'))



def neckwear(g, L, sp, cx, sh_y):
    """What sits on the collar, over the neck: a bow tie."""
    if sp.get('bowtie'):          # a bow tie on the collar, its knot in the middle
        y = sh_y - 0.6
        if not sp.get('bib') and not sp.get('waistcoat'):
            for s in (-1, 1):
                L.append(Layer('collar', poly(g, [(cx + s * 1.0, y - 3.4), (cx + s * 5.0, y - 1.6), (cx + s * 1.6, y + 1.2)],
                                              smooth=False), tone('white'), R=2, group='collarpt', bias=0.2))
        bt = U(poly(g, [(cx, y), (cx - 5.2, y - 2.6), (cx - 5.6, y + 2.4)], smooth=False),
               poly(g, [(cx, y), (cx + 5.2, y - 2.6), (cx + 5.6, y + 2.4)], smooth=False))
        L.append(Layer('bowtie', bt, sp['bowtie'], R=2, group='bowtie', bias=0.15))
        L.append(Layer('knot', ell(g, cx, y, 1.5, 1.6), sp['bowtie'], R=1.5, group='knot', bias=0.3))


def scale_tex():
    def tex(g, t, own):
        t = t.copy()
        row = NP.floor((g.Y - 50) / 3.0)
        col = NP.floor((g.X + (row % 2) * 2.0) / 4.0)
        edge = (((g.Y - 50) % 3.0) < 0.9) | (((g.X + (row % 2) * 2.0) % 4.0) < 0.9)
        t[edge & (t >= 2)] -= 1
        return t
    return tex


def leaf_tex(light):
    def tex(g, t, own):
        t = t.copy()
        v = (NP.floor(g.X / 5.0) + NP.floor((g.Y - 50) / 4.0)) % 2 == 0
        t[v & (t >= 2) & (t < 3)] += 1 if light is not None else 0
        return t
    return tex


def pilot_body(g, L, sp, cloth, arm_of, cx, nw, sh_y, sh_w):
    """A pilot's suit (characters.py build_<style>), as far down as the frame shows, in the pilot's key colours."""
    st = sp['pilot']
    suit, dk, arm = sp['suit'], sp['suitdk'], sp['arm']
    if st == 'flight':
        for s in (-1, 1):
            cloth('sleeve', arm_of(s), arm, group='sleeve')
            L.append(Layer('pad', I(ell(g, cx + s * sh_w * 0.74, sh_y + 3.2, 6.2, 4.2), box(g, 0, 0, 64, 70)), dk, R=3,
                           group='pad%d' % s))
        cloth('panel', box(g, cx - 8, sh_y + 6.5, cx + 8, sh_y + 13, 1.5), dk, bias=0.05)
        L.append(Layer('led', box(g, cx - 4.6, sh_y + 8.6, cx - 2.4, sh_y + 10.6, 0.4), tone('ledc'), R=1, group='led', flat=2))
        L.append(Layer('led', box(g, cx + 2.4, sh_y + 8.6, cx + 4.6, sh_y + 10.6, 0.4), tone('ledy'), R=1, group='led2', flat=2))
    elif st == 'coat':
        for s in (-1, 1):
            cloth('sleeve', arm_of(s), suit, group='sleeve')
            cloth('lapel', poly(g, [(cx + s * (nw + 1.0), sh_y - 2.8), (cx + s * (nw + 4.5), sh_y - 1.6), (cx + s * 1.2, sh_y + 12),
                                    (cx, sh_y + 12)], smooth=False), dk, tex=panel_tex(s))
            L.append(Layer('epaulette', I(ell(g, cx + s * sh_w * 0.72, sh_y + 2.2, 5.0, 2.2), box(g, 0, 0, 64, 70)),
                           tone('brass'), R=2, group='epaulette%d' % s, bias=0.15))
        for y in (sh_y + 8.5, ):
            for bx in (-2.8, 2.8):
                L.append(Layer('button', ell(g, cx + bx, y + 3, 0.9, 0.9), tone('brass'), R=1, group='button', bias=0.3))
    elif st == 'plate':
        for s in (-1, 1):
            cloth('sleeve', arm_of(s), suit, group='sleeve')
        cloth('cuirass', box(g, cx - 14, sh_y + 2.5, cx + 14, 70, 5), tone('steel'))
        cloth('tabard', box(g, cx - 3.2, sh_y + 6, cx + 3.2, 70, 0.8), suit, bias=0.05)
        for s in (-1, 1):
            L.append(Layer('pauldron', I(ell(g, cx + s * sh_w * 0.72, sh_y + 3.6, 7.6, 5.4), box(g, 0, 0, 64, 70)), tone('steel'),
                           R=4, group='pauldron%d' % s))
    elif st == 'thermal':
        for s in (-1, 1):
            cloth('sleeve', arm_of(s, 1.5), suit, group='sleeve', tex=quilt_tex(sh_y, 5.0))
        L[[i for i, l in enumerate(L) if l.name == 'torso'][0]].tex = quilt_tex(sh_y + 2, 5.5)
    elif st == 'runner':
        cloth('tee', box(g, cx - 4.8, sh_y - 2, cx + 4.8, 70), tone('pants'))
        for s in (-1, 1):
            cloth('sleeve', arm_of(s), suit, group='sleeve')
            L.append(Layer('piping', box(g, cx + s * 5.4 - 0.55, sh_y + 1, cx + s * 5.4 + 0.55, 70), tone('ledc'), R=1,
                           group='piping', flat=2))
            L.append(Layer('piping', capsule(g, cx + s * sh_w * 0.78, sh_y + 7, cx + s * (sh_w * 0.86), 70, 0.5), tone('ledc'), R=1,
                           group='piping', flat=2))
    elif st == 'mystic':
        for s in (-1, 1):
            cloth('sleeve', arm_of(s), suit, group='sleeve')
            cloth('trimv', capsule(g, cx + s * (nw + 1.5), sh_y - 2.5, cx, sh_y + 9, 0.7), tone('brass'), R=2, form=None, bias=0.2)
        L.append(Layer('star', poly(g, star_pts(cx, sh_y + 13.5, 2.6, 1.1), smooth=False), tone('brass'), R=1.5, group='star',
                       bias=0.3))
    elif st == 'ranger':
        L[[i for i, l in enumerate(L) if l.name == 'torso'][0]].ramp = ramp(tone('leather'))
        for s in (-1, 1):
            cloth('sleeve', arm_of(s), suit, group='sleeve')
        cloth('lace', box(g, cx - 0.7, sh_y + 4, cx + 0.7, 70), tone('pants'))
        m = S(ell(g, cx, sh_y + 1.5, sh_w + 1.5, 9.5), ell(g, cx, sh_y - 1.5, nw + 2.5, 4.0))
        L.append(Layer('mantle', I(m, box(g, 0, 0, 64, 70)), suit, R=6, group='mantle'))
        L.append(Layer('clasp', ell(g, cx, sh_y + 2.0, 1.6, 1.6), tone('brass'), R=1, group='clasp', bias=0.3))


def star_pts(cx, cy, r, r2):
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        rr = r if k % 2 == 0 else r2
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    return pts


def helmet_on(g, L, post, cx, rx, cy, top):
    """The pilot's helmet: a round shell, an antenna with a lamp, and a visor of glass — the face shows through it,
    a pale rim inside its edge and a streak of light across it."""
    shell = ell(g, cx, cy - 0.5, rx + 4.2, P['ry'] + 4.6)
    vis = ell(g, cx, P['eye_y'] + 2.2, rx - 0.6, 9.6)
    L.append(Layer('antenna', capsule(g, cx + 8.2, top - 1, cx + 9.4, top - 7.5, 0.6), tone('pack'), R=1, group='antenna'))
    L.append(Layer('antennatip', ell(g, cx + 9.5, top - 8.2, 1.7, 1.7), tone('ledy'), R=1.5, group='tip', bias=0.3))
    L.append(Layer('helmet', S(shell, vis), tone('helmet'), R=8, group='helmet', casts=(1, 2, ('face',))))
    rim_t = rgb(tone('visor')[2])

    def glass(img):
        m = vis < 0
        edge = m & ~(shift(m, 1, 0) & shift(m, -1, 0) & shift(m, 0, 1) & shift(m, 0, -1))
        out = img.copy()
        out[edge, :3] = rim_t
        ys = NP.nonzero(m.any(axis=1))[0]
        y0 = ys.min()
        for dy, dx in ((2, 4), (2, 5), (3, 3), (3, 4), (4, 3)):
            row = NP.nonzero(m[y0 + dy])[0]
            if len(row):
                out[y0 + dy, row.min() + dx, :3] = (255, 255, 255)
        return out
    post.append(glass)


def hats(g, L, sp, cx, rx, cy, top, hl):
    brow = P['brow_y']
    shadow = (1, 2, ('face', 'hair', 'skin'))
    if sp.get('chef'):
        white = sp['chef'] if isinstance(sp.get('chef'), (tuple, list)) else tone('white')
        L.append(Layer('hat', U(ell(g, cx - 7.0, hl - 10.5, 8.6, 7.0), ell(g, cx + 7.0, hl - 10.5, 8.6, 7.0), ell(g, cx, hl - 14.5, 9.5, 8.0)),
                       white, R=6, group='hat'))
        L.append(Layer('hat', box(g, cx - rx - 1.4, hl - 6.5, cx + rx + 1.4, hl + 1.0, 1.5), white, R=2.5, group='hat', bias=-0.1,
                       casts=shadow))
    if sp.get('cap') or sp.get('visor_cap'):
        tones = sp.get('cap') or ('#1e3a2a', '#2e5a40', '#4a8060')
        if sp.get('cap'):
            L.append(Layer('hat', I(ell(g, cx, cy - 1.5, rx + 1.8, P['ry'] + 1.0), box(g, 0, 0, 64, hl + 1.5)), tones, R=7, group='hat'))
        else:                                        # a visor cap: a band round the head, the brim, no crown
            L.append(Layer('hat', I(box(g, 0, hl - 2.6, 64, hl + 1.2), ell(g, cx, cy, rx + 1.9, P['ry'] + 3)), tones, R=1.5, group='hat'))
        brim = poly(g, [(cx - rx - 1.5, hl + 2.6), (cx - rx + 2, hl - 0.2), (cx, hl - 0.8), (cx + rx - 2, hl - 0.2),
                        (cx + rx + 1.5, hl + 2.6), (cx + rx - 1, hl + 4.0), (cx, hl + 5.0), (cx - rx + 1, hl + 4.0)])
        L.append(Layer('brim', brim, tones, R=2, group='brim', bias=-0.05, casts=shadow))
    if sp.get('beanie'):
        tones = sp['beanie']
        L.append(Layer('hat', I(ell(g, cx, cy - 1.0, rx + 2.0, P['ry'] + 1.6), box(g, 0, 0, 64, hl + 0.5)), tones, R=7, group='hat',
                       tex=rib_tex(cx, 3.0)))
        L.append(Layer('hat', box(g, cx - rx - 2.4, hl - 4.5, cx + rx + 2.4, hl + 1.2, 1.6), tones, R=2.5, group='hat',
                       tex=rib_tex(cx, 1.5), casts=shadow))
    if sp.get('straw_hat') or sp.get('witch_hat'):
        tones = sp.get('straw_hat') or sp.get('witch_hat')
        witch = bool(sp.get('witch_hat'))
        by = hl - 1.0
        if witch:
            crown = poly(g, [(cx - rx + 1, by), (cx - rx + 3.5, by - 7), (cx - 3, top - 7), (cx + 2, top - 12),
                             (cx + 9, top - 13), (cx + 5, top - 10), (cx + 4, top - 5), (cx + rx - 1.5, by - 5), (cx + rx - 1, by)])
        else:
            crown = poly(g, [(cx - rx + 1.5, by + 0.5), (cx - rx + 1.0, by - 5), (cx - rx + 3.0, top - 4.5), (cx - 4, top - 6.5),
                             (cx, top - 5.2), (cx + 4, top - 6.5), (cx + rx - 3.0, top - 4.5), (cx + rx - 1.0, by - 5),
                             (cx + rx - 1.5, by + 0.5)])
        L.append(Layer('brim', ell(g, cx, by, rx + (11 if witch else 10), 4.4), tones, R=3, group='brim', bias=-0.2,
                       casts=(1, 3, ('face', 'hair', 'skin', 'ear'))))
        L.append(Layer('hat', crown, tones, R=6, group='hat', tex=None if witch else straw_tex()))
        band = ('#5a1a1a', '#8a2a2a', '#b04a3a') if not witch else tone('brass')
        if C.keyed:
            band = tones
        L.append(Layer('band', I(crown, box(g, 0, by - 3.6, 64, by - 0.4)), band, R=1.5, group='band', bias=-0.25 if C.keyed else 0))
    if sp.get('hood') or sp.get('leaf_hood'):
        tones = sp.get('hood') or sp.get('leaf_hood')
        rim = S(ell(g, cx, cy + 3.5, rx + 5.0, P['ry'] + 7.0), ell(g, cx, cy + 6.0, rx + 0.2, P['ry'] + 3.2))
        if sp.get('leaf_hood'):
            rim = U(rim, I(poly(g, [(cx - 6, top - 2), (cx + 1, top - 12), (cx + 6, top - 2)], smooth=False), box(g, 0, 0, 64, top + 2)))
        L.append(Layer('hood', I(rim, box(g, 0, 0, 64, P['jaw_y'] + 4)), tones, R=4, group='hat', casts=shadow))
    if sp.get('circlet') or sp.get('crown'):
        tones = sp.get('circlet') or sp.get('crown')
        y = hl - 0.5
        band = I(capsule(g, cx - rx - 2, y + 1.5, cx + rx + 2, y + 1.5, 0.9), ell(g, cx, cy, rx + 1.9, P['ry'] + 3))
        band = U(band, I(ell(g, cx, y + 2.8, rx + 1.9, 2.4), S(ell(g, cx, y + 2.8, rx + 1.9, 3.6), ell(g, cx, y + 1.6, rx + 0.5, 2.6))))
        if sp.get('crown'):
            pts = [poly(g, [(cx - 10 + k * 5 - 2.4, y + 1), (cx - 10 + k * 5, y - 9.5 - (3 if k == 2 else 0)), (cx - 10 + k * 5 + 2.4, y + 1)],
                        smooth=False) for k in range(5)]
            band = U(band, *pts, box(g, cx - rx, y - 1.5, cx + rx, y + 2.4, 0.6))
        L.append(Layer('circlet', band, tones, R=1.5, group='gold', bias=0.2))
        if sp.get('gem'):
            L.append(Layer('gem', ell(g, cx, y + 2.0, 1.7, 1.9), sp['gem'], R=1.5, group='gem', bias=0.3))
    if sp.get('goggles'):
        y = hl - 2.0
        L.append(Layer('strap', I(box(g, 0, y - 1.4, 64, y + 1.4), ell(g, cx, cy, rx + 1.9, P['ry'] + 3)), tone('bowtie'), R=1.2,
                       group='strap'))
        for s in (-1, 1):
            L.append(Layer('goggle', ell(g, cx + s * 5.2, y, 3.9, 3.4), tone('brass'), R=2, group='goggle', bias=0.2))
            L.append(Layer('lens', ell(g, cx + s * 5.2, y, 2.5, 2.1), tone('visor'), R=2.5, group='lens', bias=0.35))
    if sp.get('bard_cap'):
        L.append(Layer('hat', poly(g, [(cx - rx - 2.5, hl - 0.5), (cx - rx - 1.0, top + 0.5), (cx - 4, top - 3.5), (cx + 6, top - 3.0),
                                       (cx + rx + 4.5, top + 1.5), (cx + rx + 3.5, hl - 2.5), (cx + rx, hl + 0.8), (cx, hl + 0.8)]),
                       sp['bard_cap'], R=5, group='hat', casts=shadow))
        L.append(Layer('feather', capsule(g, cx + rx - 1, top + 2, cx + rx + 9, top - 9, 1.3), sp.get('feather') or tone('feather'),
                       R=1.2, group='feather'))
    if sp.get('flower_crown'):
        y = hl + 0.5
        for k in range(9):
            a = math.pi * (0.06 + 0.88 * k / 8)
            x = cx - math.cos(a) * (rx + 1.2)
            t_ = sp['flower_crown'] if k % 2 else (sp.get('flower') if k % 4 == 0 else sp.get('flower2') or sp.get('flower'))
            L.append(Layer('flower', ell(g, x, y - math.sin(a) * 3.2 + 1.2, 2.3, 2.0), t_ or sp['flower_crown'], R=1.5,
                           group='flower%d' % k, bias=0.15))
    if sp.get('earpiece'):
        L.append(Layer('earpiece', ell(g, cx + rx - 0.2, P['ear_y'], 1.6, 1.9), tone('shades'), R=1, group='earpiece'))
        L.append(Layer('mic', capsule(g, cx + rx - 0.8, P['ear_y'] + 1.5, cx + rx - 4.0, P['mouth_y'] - 1.5, 0.45), tone('shades'),
                       R=1, group='mic', line=False))
    if sp.get('shades'):
        ey = P['eye_y']
        for s in (-1, 1):
            L.append(Layer('shades', box(g, cx + s * P['eye_dx'] - 3.6, ey - 2.4, cx + s * P['eye_dx'] + 3.6, ey + 2.2, 1.2),
                           tone('shades'), R=1.5, group='shades', bias=0.3))
        L.append(Layer('shades', box(g, cx - 2.2, ey - 1.8, cx + 2.2, ey - 0.8), tone('shades'), R=1, group='shades'))
    if sp.get('mask'):
        m = poly(g, [(cx - rx + 1, P['nose_y'] - 2.5), (cx, P['nose_y'] - 3.5), (cx + rx - 1, P['nose_y'] - 2.5),
                     (cx + P['jaw_w'], P['jaw_y'] + 0.5), (cx, P['chin_y'] + 0.5), (cx - P['jaw_w'], P['jaw_y'] + 0.5)])
        L.append(Layer('mask', m, ('#8a9aa0', '#d4e4ea', '#f4fcff'), R=4, group='mask', casts=(1, 2, ('skin', 'cloth'))))
    if sp.get('visor_band'):
        ey = P['eye_y']
        L.append(Layer('visor', box(g, cx - rx - 0.5, ey - 2.8, cx + rx + 0.5, ey + 2.2, 1.6), ('#0a3a48', '#2ab0c8', '#90f0ff'),
                       R=1.5, group='visor', bias=0.4))


# =====================================================================================================================
#  The face, in pixels: templates for the viewer's right eye (mirrored for the left), brows, nose, mouth, cheeks
# =====================================================================================================================
#   K lid line   E lash   W white   D iris dark   I iris   L iris light   P pupil   C catch-light   S skin shadow (a crease)
#   B brow   M mouth line   T inside of the mouth   R lip (skin shadow)   H blush   N nose shadow   n nostril
FACES = dict(
    eye={
        'open':   (['.KKKK.',
                    'KDCDWK',
                    'KIDIW.',
                    '..SS..'], (-3, -2)),
        'lashes': (['.....E',
                    '.KKKKK',
                    'KDCDWK',
                    'KIDIW.',
                    '..SS..'], (-3, -3)),
        'wide':   (['.KKKK.',
                    'KDCDWK',
                    'WIDIWW',
                    '.WWWW.'], (-3, -2)),
        'happy':  (['......',
                    '.KKKK.',
                    'K....K',
                    '......'], (-3, -2)),
        'sad':    (['.SS...',
                    '..KKKK',
                    'KDCDWK',
                    '.IDIW.'], (-3, -2)),
        'shut':   (['......',
                    '......',
                    'KKKKKK',
                    '.SSSS.'], (-3, -2)),
        'old':    (['......',
                    '......',
                    '......',
                    '......',
                    '.SSSS.'], (-3, -2)),
    },
    brow={
        'soft':   (['.BBBB.', 'B....B'], (-3, 0)),
        'raised': (['.BBBB.', 'B....B'], (-3, -1)),
        'high':   (['.BBBB.', 'B....B'], (-3, -2)),
        'sad':    (['BB....', '..BBB.', '.....B'], (-3, 0)),
        'stern':  (['....BB', '.BBB..', 'B.....'], (-3, 0)),
        'heavy':  (['BBBBBB', 'B....B'], (-3, 0)),
    },
    mouth={
        'smile':  ['R....R', '.MMMM.'],
        'flat':   ['.MMMM.', '..RR..'],
        'stern':  ['MMMMMM', '.RRRR.'],
        'smirk':  ['.....R', '.MMMM.'],
        'open':   ['MMMMMM', 'MTTTTM', '.MMMM.'],
        'o':      ['.MM.', 'MTTM', '.MM.'],
        'frown':  ['.MMMM.', 'M....M'],
        'beard':  ['.MMMM.', '..RR..'],
    },
    mouth_dy={'smile': -1, 'open': -1, 'o': -1, 'smirk': -1},
    nose=(['.N', 'Nn'], (0, -1)),
    cheek=(['HH'], (-1, 0)),
)


def paint_face(img, top, layers, A, me, expr):
    n = img.shape[0]
    out = img.copy()
    on_face = NP.isin(top, [i for i, L in enumerate(layers) if L.name == 'face'])
    on_beard = NP.isin(top, [i for i, L in enumerate(layers) if L.name == 'beard'])
    sp = me['spec']
    skin_r = ramp(me['skin'], 'skin')
    hair = me['hair']
    iris = me['iris']
    if C.keyed:
        brow = rgb(hair[0])                           # a key tone: the game swaps it for their hair's dark
        blush, nostril = rgb(BLUSH_KEY), line_of(skin_r[1])
    else:
        brow = rgb(sp['brows'][0]) if isinstance(sp.get('brows'), (tuple, list)) else \
            (mix(hair[0], (20, 10, 14), 0.25) if sum(rgb(hair[0])) > 330 else rgb(hair[0]))
        blush, nostril = mix(skin_r[2], '#ff5a6e', 0.38), mix(skin_r[0], (60, 20, 24), 0.2)
    cols = {
        'K': (40, 22, 26), 'E': (40, 22, 26), 'P': (16, 10, 14), 'W': (246, 240, 230), 'C': (255, 255, 255),
        'D': rgb(iris[0]), 'I': rgb(iris[1]), 'L': rgb(iris[2]),
        'S': skin_r[1], 'B': brow, 'M': (96, 36, 40), 'T': (190, 80, 86), 'R': skin_r[1],
        'H': blush, 'N': skin_r[1], 'n': nostril,
    }
    cxb = int(round(2 * A['cx']))                    # twice the centre line in px: mirror x → cxb - 1 - x

    def stamp(rows, ax, ay, ox, oy, allow, mirror=False, centred=False):
        x0 = (cxb - len(rows[0])) // 2 if centred else int(math.floor(ax)) + ox
        y0 = int(math.floor(ay)) + oy
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch == '.':
                    continue
                x = cxb - 1 - (x0 + i) if mirror else x0 + i
                y = y0 + j
                if 0 <= x < n and 0 <= y < n and allow[y, x]:
                    out[y, x, :3] = cols[ch]

    mood = me['mood']
    lash = me['femme']
    if expr == 'neutral':
        eye = 'lashes' if lash else 'open'
        brow_t = {'stern': 'stern'}.get(mood, 'soft')
        mouth = {'stern': 'stern', 'flat': 'flat', 'smirk': 'smirk'}.get(mood, 'smile')
    elif expr == 'happy':
        eye, brow_t, mouth = 'happy', 'raised', 'open'
    elif expr == 'surprised':
        eye, brow_t, mouth = 'wide', 'high', 'o'
    elif expr == 'sad':
        eye, brow_t, mouth = 'sad', 'sad', 'frown'
    else:
        eye = 'shut'
        brow_t = {'stern': 'stern'}.get(mood, 'soft')
        mouth = {'stern': 'stern', 'flat': 'flat', 'smirk': 'smirk'}.get(mood, 'smile')
    if (me['beard'] or me['mustache']) and brow_t == 'soft':
        brow_t = 'heavy'
    hide_eyes = sp.get('shades') or sp.get('visor_band')
    ex = A['cx'] + A['eye_dx']
    for mirror in (False, True):
        if not hide_eyes:
            rows, (ox, oy) = FACES['eye'][eye]
            stamp(rows, ex, A['eye_y'], ox, oy, on_face, mirror)
            if me['old'] and eye in ('open', 'lashes'):
                rows, (ox, oy) = FACES['eye']['old']
                stamp(rows, ex, A['eye_y'], ox, oy, on_face, mirror)
        rows, (ox, oy) = FACES['brow'][brow_t]
        stamp(rows, ex, A['brow_y'], ox, oy, on_face, mirror)
        if me['blush'] and expr != 'sad':
            rows, (ox, oy) = FACES['cheek']
            stamp(rows, A['cx'] + A['cheek'][0], A['cheek'][1], ox, oy, on_face, mirror)
    rows, (ox, oy) = FACES['nose']
    stamp(rows, A['cx'], A['nose_y'], ox, oy, on_face)
    if not sp.get('mask'):
        mrows = FACES['mouth'][mouth]
        if me['beard'] and mouth in ('smile', 'flat', 'smirk', 'stern', 'frown'):
            mrows = FACES['mouth']['beard']
        stamp(mrows, A['cx'], A['mouth_y'], 0, FACES['mouth_dy'].get(mouth, 0), on_face | on_beard, centred=True)
    return out


# =====================================================================================================================
#  Who's drawn: NPCs, the crowd's bodies, the pilot's suits and heads
# =====================================================================================================================
def portrait(who, spec, keyed=False):
    """The strip of expressions for one person (spec: their characters.py entry, or a pilot's made-up one)."""
    C.keyed = keyed
    g = Grid(SIZE)
    me = person(who, spec)
    layers, A, post = build(g, me)
    img, top = paint(g, layers)
    frames = []
    for e in EXPRESSIONS:
        f = paint_face(img, top, layers, A, me, e)
        for fn in post:
            f = fn(f)
        frames.append(f)
    return NP.concatenate(frames, axis=1)


def pilot_spec(T, style, build, head):
    K = T['KEYS']
    hairstyle, beard = (head[:-6], True) if head.endswith('-beard') else (head, False)
    sp = dict(skin=K['skin'], hair=K['hair'], suit=K['suit'], suitdk=K['suitdk'], arm=K['arm'], shirt=K['suit'],
              pilot=style, build=build)
    if style == 'plate':
        sp['collar'] = C.fixed['steeldk']
    if hairstyle == 'helmet':
        sp['helmet'] = True
    else:
        sp.update({'short': {}, 'bald': {'bald': True}, 'long': {'long_hair': True}, 'bun': {'bun': True},
                   'ponytail': {'ponytail': True}, 'curly': {'curly': True}, 'mohawk': {'mohawk': True}}[hairstyle])
    if beard:
        sp.update(beard=True, mustache=True)
    return sp


def names_in(var):
    """The keys of a dict literal assigned to `var` at the top of characters.py."""
    for n in ast.parse(open(CHARS).read()).body:
        if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == var for t in n.targets) and isinstance(n.value, ast.Dict):
            return [k.value for k in n.value.keys if isinstance(k, ast.Constant)]
    return []


def jobs_for(targets, T):
    """(out path, who, spec, keyed) for everything asked for."""
    jobs = []
    for t in targets:
        if t == 'all':
            jobs += jobs_for(['npcs', 'crowd', 'pilots'], T)
        elif t == 'npcs':
            jobs += jobs_for([n for n in names_in('NPCS') if n.startswith('npc-')], T)
        elif t == 'crowd':
            jobs += jobs_for(['extra-' + n for n in T['EXTRAS']], T)
        elif t == 'pilots':
            heads = ['helmet'] + [h + b for h in T['HAIRSTYLES'] for b in ('', '-beard')]
            for st in STYLES:
                for b in 'ab':
                    for h in heads:
                        path = os.path.join(OUTDIR, 'pilots', ('' if st == 'flight' else st + '-') + b + '-' + h + '.png')
                        jobs.append((path, 'pilot-%s-%s-%s' % (st, b, h), pilot_spec(T, st, b, h), True))
        elif t.startswith('npc-'):
            if t not in T['NPCS']:
                sys.exit('portraits.py: no %s in characters.py NPCS' % t)
            jobs.append((os.path.join(OUTDIR, t + '.png'), t, T['NPCS'][t], False))
        elif t.startswith('extra-') or t in T['EXTRAS']:
            body = t[len('extra-'):] if t.startswith('extra-') else t
            jobs.append((os.path.join(OUTDIR, 'crowd', body + '.png'), 'extra-' + body, T['EXTRAS'][body], True))
        else:
            sys.exit('portraits.py: what is %r? (an NPCS name like npc-baker, a crowd body, or npcs / crowd / pilots / all)' % t)
    return jobs


def allowed(T, who):
    """The colours a key-coloured portrait may hold: its keys and their line-work copies (the game swaps them), the
    iris and blush keys, and colours nobody swaps (FIXED's and the face's own). Anything else would stay as painted
    on everyone — a colour that slipped through a mix."""
    ok = set()
    for v in (T['KEYS'] if who.startswith('pilot') else T['XKEYS']).values():
        for h in v:
            ok.update((rgb(h), line_of(h)))
    for h in IRIS_KEY + (BLUSH_KEY,):
        ok.add(rgb(h))
    for v in T['FIXED'].values():
        for h in v:
            ok.update((rgb(h), line_of(h)))
    ok.update(((40, 22, 26), (16, 10, 14), (246, 240, 230), (255, 255, 255), (96, 36, 40), (190, 80, 86)))
    return ok


def main(argv):
    global NP
    import numpy
    from PIL import Image
    NP = numpy
    args, look = [], None
    i = 0
    while i < len(argv):
        if argv[i] == '--look':
            look = argv[i + 1]
            i += 2
        else:
            args.append(argv[i])
            i += 1
    if not args:
        print(__doc__)
        sys.exit(1)
    T = tables()
    C.fixed = T['FIXED']
    made = []
    for path, who, spec, keyed in jobs_for(args, T):
        strip = portrait(who, spec, keyed)
        if keyed:
            stray = set(map(tuple, strip[strip[..., 3] > 0][:, :3].tolist())) - allowed(T, who)
            if stray:
                print('portraits.py: %s has colours the game won\'t swap: %s' % (who, sorted(stray)[:6]))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        Image.fromarray(strip, 'RGBA').save(path, optimize=True)
        made.append(path)
    print('portraits:', len(made), 'written under', os.path.relpath(OUTDIR, ROOT))
    if look:
        contact(made, look)


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
    main(sys.argv[1:])
