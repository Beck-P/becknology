#!/usr/bin/env python3
"""Drawn portraits for the talk card — a Stardew-style head and shoulders, painted in 2D from each character's spec.

  python3 tools/bridge-art/portraits_drawn.py --style stardew --look OUT.png npc-baker npc-innkeeper …

The Blender portraits (portraits.py) are the toy models seen from the front: a round head on a box, a face dotted on.
These are drawn instead, the way a pixel artist would: a face with cheekbones, a jaw and a chin, ears, a neck, sloped
shoulders; hair in locks with a sheen; eyes with whites, a nose, lips; light from the upper left in a few flat bands,
a cast shadow under the fringe and the chin, a dark line round the figure and softer ones where one thing lies over
another. The shapes are signed-distance shapes in a 64-unit frame (so a style can be drawn at 64 or 128 px); the face's
features are pixel templates, per style. Everything about a person comes from their NPCS entry in characters.py (no
Blender needed): skin, hair, clothes, hats, beards — the same flags the models are built from.

Prototype: styles STYLES (stardew, storybook, painted); each writes the same strip as portraits.py (EXPRESSIONS).
"""
import ast
import math
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CHARS = os.path.join(HERE, 'characters.py')

EXPRESSIONS = ['neutral', 'happy', 'surprised', 'sad', 'blink']
OUTLINE = (34, 20, 30)                     # the line round the figure: a warm near-black
LIGHT = np.array([-0.62, -0.7, 0.52])      # upper left, a little in front
LIGHT = LIGHT / np.linalg.norm(LIGHT)


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


def ramp(tones, kind='cloth'):
    """A material's ramp, darkest first: [deep, dark, mid, light, high] from its three tones (dark, mid, light).
    Shadows lean cool (skin: warm, toward red), the high light warm."""
    d, m, l = (rgb(t) for t in tones)
    if kind == 'skin':
        deep = mix(mix(d, (120, 40, 50), 0.35), (0, 0, 0), 0.18)
        dark = mix(d, (176, 82, 80), 0.18)
        high = mix(l, (255, 240, 220), 0.4)
    elif kind == 'hair':
        deep = mix(d, (24, 14, 30), 0.45)
        dark = d
        high = mix(l, (255, 250, 236), 0.45)
    else:
        deep = mix(d, (28, 18, 44), 0.42)
        dark = d
        high = mix(l, (255, 250, 236), 0.35)
    return [deep, dark, m, l, high]


# =====================================================================================================================
#  Shapes: signed distance in frame units (negative inside)
# =====================================================================================================================
class Grid:
    def __init__(self, n):
        self.n, self.s = n, 64.0 / n
        ys, xs = np.mgrid[0:n, 0:n]
        self.X, self.Y = (xs + 0.5) * self.s, (ys + 0.5) * self.s


def catmull(pts, closed=True, k=8):
    P = [np.array(p, float) for p in pts]
    n = len(P)
    out = []
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = P[(i - 1) % n] if closed or i > 0 else P[0]
        p1, p2 = P[i], P[(i + 1) % n]
        p3 = P[(i + 2) % n] if closed or i + 2 < n else P[-1]
        for j in range(k):
            t = j / k
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    if not closed:
        out.append(P[-1])
    return out


def poly(g, pts, smooth=True):
    P = np.array(catmull(pts) if smooth else pts, float)
    X, Y = g.X, g.Y
    d = np.full(X.shape, np.inf)
    inside = np.zeros(X.shape, bool)
    n = len(P)
    for i in range(n):
        ax, ay = P[i]
        bx, by = P[(i + 1) % n]
        ex, ey = bx - ax, by - ay
        wx, wy = X - ax, Y - ay
        t = np.clip((wx * ex + wy * ey) / (ex * ex + ey * ey + 1e-9), 0, 1)
        dx, dy = wx - ex * t, wy - ey * t
        d = np.minimum(d, dx * dx + dy * dy)
        c1, c2, c3 = Y >= ay, Y < by, ex * wy > ey * wx
        inside ^= (c1 & c2 & c3) | (~c1 & ~c2 & ~c3)
    return np.where(inside, -1.0, 1.0) * np.sqrt(d)


def ell(g, cx, cy, rx, ry):
    q = np.hypot((g.X - cx) / rx, (g.Y - cy) / ry)
    return (q - 1) * min(rx, ry)


def box(g, x0, y0, x1, y1, r=0.0):
    cx, cy, hx, hy = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 - r, (y1 - y0) / 2 - r
    qx, qy = np.abs(g.X - cx) - hx, np.abs(g.Y - cy) - hy
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r


def capsule(g, ax, ay, bx, by, r):
    ex, ey = bx - ax, by - ay
    wx, wy = g.X - ax, g.Y - ay
    t = np.clip((wx * ex + wy * ey) / (ex * ex + ey * ey + 1e-9), 0, 1)
    return np.hypot(wx - ex * t, wy - ey * t) - r


def U(*a):
    return np.minimum.reduce(a)


def I(*a):
    return np.maximum.reduce(a)


def S(a, b):
    return np.maximum(a, -b)


def mirror_pts(pts, cx=32.0):
    """Points down one side (x ≤ cx, top to bottom) → a closed outline mirrored across the centre line."""
    right = [(2 * cx - x, y) for x, y in reversed(pts)]
    return list(pts) + right


# =====================================================================================================================
#  Layers and the painter
# =====================================================================================================================
class Layer:
    def __init__(self, name, sdf, tones, kind='cloth', R=6.0, casts=None, group=None, line=True, tex=None, flat=None,
                 bias=0.0, form=None):
        self.name, self.sdf, self.ramp = name, sdf, (tones if len(tones) == 5 else ramp(tones, kind))
        self.form = form          # light it as this shape (clothes as the body), else as its own
        self.kind, self.R, self.casts, self.group = kind, R, casts, group or kind
        self.line, self.tex, self.flat, self.bias = line, tex, flat, bias


def shade(g, L, sdf, R):
    d = np.clip(-sdf, 0, None)
    u = np.minimum(d / R, 1.0)
    h = R * np.sqrt(np.clip(1 - (1 - u) ** 2, 0, 1))
    gy, gx = np.gradient(h, g.s)
    nz = 1 / np.sqrt(1 + gx * gx + gy * gy)
    nx, ny = -gx * nz, -gy * nz
    return nx * L[0] + ny * L[1] + nz * L[2]


def shift(mask, dx, dy):
    out = np.zeros_like(mask)
    h, w = mask.shape
    ys0, ys1 = max(0, dy), h + min(0, dy)
    xs0, xs1 = max(0, dx), w + min(0, dx)
    out[ys0:ys1, xs0:xs1] = mask[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


def paint(g, layers, st):
    """Layers back to front → (rgb image, top index per pixel, tone index per pixel)."""
    n = g.n
    top = np.full((n, n), -1, int)
    masks = [L.sdf < 0 for L in layers]
    for i, m in enumerate(masks):
        top[m] = i
    tone = np.zeros((n, n), int)
    cuts = st['bands']
    for i, L in enumerate(layers):
        own = top == i
        if not own.any():
            continue
        if L.flat is not None:
            t = np.full((n, n), L.flat)
        else:
            diff = shade(g, LIGHT, L.sdf if L.form is None else L.form, L.R) + L.bias
            t = np.ones((n, n), int)                      # dark
            for k, c in enumerate(cuts):
                t[diff > c] = 2 + k                       # mid, light, (high)
            t = np.minimum(t, 4 if len(cuts) >= 3 else 3)
        if L.tex is not None:
            t = L.tex(g, t, own)
        tone[own] = t[own]
    # cast shadows: a caster shifted down and right darkens what's behind it by a band
    px = max(1, int(round(1 / g.s)))
    for i, L in enumerate(layers):
        if not L.casts:
            continue
        dx, dy, onto = L.casts
        sh = shift(masks[i], int(round(dx * px)), int(round(dy * px))) & ~masks[i]
        for j in range(i):
            if layers[j].group in onto or layers[j].name in onto:
                hit = sh & (top == j)
                tone[hit] = np.maximum(0, tone[hit] - 1)
    img = np.zeros((n, n, 4), np.uint8)
    for i, L in enumerate(layers):
        own = top == i
        if not own.any():
            continue
        R = np.array(L.ramp, np.uint8)
        img[own, :3] = R[np.clip(tone[own], 0, 4)]
        img[own, 3] = 255
    # line work: the figure's edge in the outline colour; where a layer lies over another, its edge in its own deep tone
    line = np.zeros((n, n), np.uint8)              # 0 none, 1 inner, 2 silhouette
    order = np.arange(len(layers))
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        nb = shift(top, -dx, -dy) if True else None
        nb = np.full((n, n), -1, int)
        ys0, ys1 = max(0, -dy), n - max(0, dy)
        xs0, xs1 = max(0, -dx), n - max(0, dx)
        nb[ys0:ys1, xs0:xs1] = top[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx]
        edge_frame = np.zeros((n, n), bool)       # beyond the frame's bottom and sides: no line (it runs on)
        if dy == 1:
            edge_frame[n - 1, :] = True
        if dx == 1:
            edge_frame[:, n - 1] = True
        if dx == -1:
            edge_frame[:, 0] = True
        sil = (top >= 0) & (nb < 0) & ~edge_frame
        line[sil] = 2
        inner = (top >= 0) & (nb >= 0) & (nb < top)
        line[inner & (line == 0)] = 1
    for i, L in enumerate(layers):
        own = top == i
        if not L.line:
            continue
        deep = np.array(L.ramp[0], float)
        sil = own & (line == 2)
        img[sil, :3] = np.array(mix(deep, OUTLINE, st['sil']), np.uint8)
        inn = own & (line == 1)
        img[inn, :3] = np.array(mix(deep, OUTLINE, st['inner']), np.uint8)
    return img, top, tone


# =====================================================================================================================
#  Styles: proportions (frame units) and the face's templates
# =====================================================================================================================
STYLES = {
    # natural proportions, as Stardew's portraits: a head a little under half the frame, a neck, shoulders filling it
    'stardew': dict(N=64, top=11.0, rx=13.4, ry=14.0, cy=26.5, cheek_y=32.5, jaw_w=11.3, jaw_y=41.0, chin_w=5.0,
                    chin_y=48.5, eye_y=33.0, eye_dx=6.0, brow_y=29.0, nose_y=38.5, mouth_y=43.5, ear_y=34.0,
                    neck_w=5.6, neck_y=52.0, sh_y=52.5, sh_w=29.0, hairline=23.0, bands=[0.12, 0.62], sil=0.72,
                    inner=0.25, R_face=4.5),
    # the game's chibi people, drawn: a bigger, rounder head, big eyes, a little chin, small shoulders
    'storybook': dict(N=64, top=7.5, rx=15.0, ry=16.5, cy=26.0, cheek_y=32.0, jaw_w=13.4, jaw_y=40.5, chin_w=7.0,
                      chin_y=47.0, eye_y=34.0, eye_dx=6.5, brow_y=29.0, nose_y=38.5, mouth_y=42.5, ear_y=34.0,
                      neck_w=4.4, neck_y=53.0, sh_y=52.5, sh_w=25.0, hairline=22.0, bands=[0.12, 0.62], sil=0.72,
                      inner=0.25, R_face=11.0),
    # stardew's proportions at twice the pixels: finer features, more tones
    'painted': dict(N=128, top=11.0, rx=13.4, ry=14.0, cy=26.5, cheek_y=32.5, jaw_w=11.3, jaw_y=41.0, chin_w=5.0,
                    chin_y=48.5, eye_y=33.0, eye_dx=6.0, brow_y=29.0, nose_y=38.5, mouth_y=43.5, ear_y=34.0,
                    neck_w=5.6, neck_y=52.0, sh_y=52.5, sh_w=29.0, hairline=23.0, bands=[-0.1, 0.38, 0.8], sil=0.7,
                    inner=0.3, R_face=4.5),
}


# =====================================================================================================================
#  A person
# =====================================================================================================================
def person(spec, T, who):
    """Their look, from their NPCS spec: the flags the painter needs."""
    sk = spec.get('skin', 'skin')
    skin = T['FIXED'].get(sk) if isinstance(sk, str) else sk
    hair = spec.get('hair') or ('#2a1a10', '#4a2e1a', '#6a4428')
    beard = bool(spec.get('beard'))
    mustache = bool(spec.get('mustache'))
    femme = not (beard or mustache) and (any(spec.get(k) for k in ('skirt', 'gown', 'bun', 'braid', 'braid_crown', 'stole', 'sequin'))
                                         or (bool(spec.get('long_hair')) and 'tunic' not in spec))
    mid = rgb(hair[1])
    grey = max(mid) - min(mid) < 14 and mid[0] > 140
    young = bool(spec.get('young'))
    style = ('bald' if spec.get('bald') and not spec.get('mohawk') else 'mohawk' if spec.get('mohawk') else
             'bun' if spec.get('bun') else 'braid' if spec.get('braid') else 'ponytail' if spec.get('ponytail') else
             'flowing' if spec.get('long_hair') == 'flowing' else 'long' if spec.get('long_hair') else
             'curly' if spec.get('curly') else 'short')
    return dict(who=who, spec=spec, skin=skin, hair=hair, beard=beard, mustache=mustache, femme=femme, grey=grey,
                young=young, old=grey and not young, style=style)


def build(g, P, me):
    """The layers for a person, back to front, and the face's anchors."""
    sp = me['spec']
    cx = 32.0
    skin, hair = me['skin'], me['hair']
    brawny = bool(sp.get('brawny'))
    L = []
    A = {}
    top, rx, cy = P['top'], P['rx'], P['cy']
    cheek_y, jaw_y, chin_y = P['cheek_y'], P['jaw_y'], P['chin_y']
    jaw_w, chin_w = P['jaw_w'], P['chin_w']
    if me['femme'] or me['young']:
        jaw_w -= 0.8
        chin_w -= 0.6
        chin_y -= 0.6
    if brawny or me['beard']:
        jaw_w += 0.8
        chin_w += 0.8
    # ---- back: long hair behind the shoulders, a hood's back, a bun --------------------------------------------------
    hood = sp.get('hood') or sp.get('cowl') or sp.get('leaf_hood')
    hat_any = any(sp.get(k) for k in ('chef', 'cap', 'beanie', 'straw_hat', 'witch_hat', 'hood', 'cowl', 'leaf_hood', 'bard_cap'))
    hstyle = me['style']
    if hood:
        L.append(Layer('hood_back', ell(g, cx, cy + 4, rx + 6.5, P['ry'] + 8.5), hood, R=8, group='hood'))
    if hstyle in ('long', 'flowing') and not hood:
        long_y = 64 if hstyle == 'flowing' else 60
        back = poly(g, mirror_pts([(cx - 1, top - 1.5), (cx - rx + 0.5, top + 4), (cx - rx - 3.5, cy + 2),
                                   (cx - rx - 4.0, cheek_y + 10), (cx - rx - 5.5, long_y - 4), (cx - rx - 2.5, long_y + 2),
                                   (cx - 8, long_y + 2)]))
        L.append(Layer('hair_back', back, hair, kind='hair', R=6, group='hair', tex=hair_tex(cx, top - 4, down=True)))
    if hstyle == 'ponytail':
        L.append(Layer('hair_back', capsule(g, cx + rx - 1, cy + 2, cx + rx + 2, cheek_y + 18, 3.6), hair, kind='hair', R=3,
                       group='hair', tex=hair_tex(cx, top + 6)))
    if hstyle == 'bun':
        by = top + 0.5
        L.append(Layer('bun', ell(g, cx, by, 6.6, 5.6), hair, kind='hair', R=5, group='hair', tex=hair_tex(cx, by - 3)))
    # ---- body: shoulders, the shirt and what's over it ---------------------------------------------------------------
    shirt = sp.get('shirt') or ('#3e444c', '#5e6872', '#828e9a')
    sh_y, sh_w = P['sh_y'], P['sh_w'] + (3 if brawny else 0)
    nw = P['neck_w'] + (1.4 if brawny else 0) - (0.6 if me['femme'] else 0)
    torso = poly(g, [(cx - nw - 1, sh_y - 2.5), (cx - sh_w * 0.55, sh_y + 0.5), (cx - sh_w * 0.88, sh_y + 4),
                     (cx - sh_w, sh_y + 10), (cx - sh_w - 1, 70), (cx + sh_w + 1, 70), (cx + sh_w, sh_y + 10),
                     (cx + sh_w * 0.88, sh_y + 4), (cx + sh_w * 0.55, sh_y + 0.5), (cx + nw + 1, sh_y - 2.5)])
    body = poly(g, [(cx - nw - 1, sh_y - 2.5), (cx - sh_w * 0.55, sh_y + 0.5), (cx - sh_w * 0.88, sh_y + 4),
                    (cx - sh_w, sh_y + 10), (cx - sh_w - 2, 96), (cx + sh_w + 2, 96), (cx + sh_w, sh_y + 10),
                    (cx + sh_w * 0.88, sh_y + 4), (cx + sh_w * 0.55, sh_y + 0.5), (cx + nw + 1, sh_y - 2.5)])
    L.append(Layer('torso', torso, shirt, R=12, group='cloth', form=body))

    def arm_of(s, grow=0.0):        # the upper arm on side s: the shoulder's round to the frame's bottom
        return I(torso, poly(g, [(cx + s * (sh_w * 0.6 - grow), sh_y + 0.6), (cx + s * (sh_w * 0.86), sh_y + 3.4),
                                 (cx + s * (sh_w + 3), sh_y + 11), (cx + s * (sh_w + 3), 70),
                                 (cx + s * (sh_w * 0.72 - grow), 70), (cx + s * (sh_w * 0.68 - grow), sh_y + 9)]))
    sleeve = sp.get('sleeve')
    if isinstance(sleeve, str) and sleeve.startswith('skin'):
        arm_tones, arm_kind = (me['skin'] if sleeve == 'skin' else T_FIXED[sleeve]), 'skin'
    else:
        arm_tones, arm_kind = (sleeve if isinstance(sleeve, tuple) else shirt), 'cloth'
    dress = any(sp.get(k) for k in ('gown', 'skirt')) and me['femme']
    if dress:          # a scoop neckline: the collarbones show
        neck_open = ell(g, cx, sh_y - 1.5, nw + 6.0, 6.0)
        L.append(Layer('chest', I(neck_open, torso), skin, kind='skin', R=9, group='skin', bias=-0.05, form=body))
        if sp.get('trim'):
            rim = I(torso, S(ell(g, cx, sh_y - 1.5, nw + 7.4, 7.4), neck_open))
            L.append(Layer('trim', rim, sp['trim'], R=9, group='trim', bias=0.1, form=body))
    vest = sp.get('vest') or sp.get('waistcoat')
    if vest:
        for s in (-1, 1):
            panel = I(torso, poly(g, [(cx + s * (nw + 0.5), sh_y - 2.5), (cx + s * (sh_w * 0.62), sh_y - 1.0),
                                      (cx + s * (sh_w * 0.66), sh_y + 6), (cx + s * (sh_w * 0.6), 70),
                                      (cx + s * 3.0, 70), (cx + s * 1.6, sh_y + 7)], smooth=False))
            L.append(Layer('vest', panel, vest, R=12, group='vest', form=body, tex=vest_tex(cx, s)))
        if not isinstance(sleeve, str) or not sleeve.startswith('skin'):
            for s in (-1, 1):         # the shirt's sleeves out of the vest's armholes
                L.append(Layer('sleeve', arm_of(s, 0.8), arm_tones, kind=arm_kind, R=12, group='sleeve', form=body))
    else:
        for s in (-1, 1):
            L.append(Layer('sleeve', arm_of(s), arm_tones, kind=arm_kind, R=12, group='sleeve', form=body))
        if not dress:   # a collar
            for s in (-1, 1):
                col = poly(g, [(cx + s * (nw + 1.5), sh_y - 3.0), (cx + s * 0.5, sh_y + 2.5), (cx + s * (nw + 2.5), sh_y + 3.0)],
                           smooth=False)
                L.append(Layer('collar', col, shirt, R=9, group='collar', bias=0.2, form=body))
    if isinstance(sleeve, str) and sleeve.startswith('skin') and vest:
        for s in (-1, 1):
            L.append(Layer('arm', arm_of(s), arm_tones, kind='skin', R=9, group='skin', form=body))
    apron = sp.get('apron')
    if apron:
        bib = U(box(g, cx - 8.5, sh_y + 4.5, cx + 8.5, 70, 1.0),
                capsule(g, cx - 7.5, sh_y + 5, cx - nw - 2.2, sh_y - 2.6, 1.1),
                capsule(g, cx + 7.5, sh_y + 5, cx + nw + 2.2, sh_y - 2.6, 1.1))
        L.append(Layer('apron', I(bib, torso), apron, R=12, group='apron', form=body))
    if sp.get('stole'):
        stole = I(torso, S(ell(g, cx, sh_y + 4, sh_w + 2, 9.0), ell(g, cx, sh_y + 1, nw + 3.5, 5.5)))
        L.append(Layer('stole', stole, sp['stole'], R=5, group='stole', tex=fur_tex()))
    # ---- neck, ears, the head ------------------------------------------------------------------------------------------
    if hstyle == 'bald' and not me['young']:     # a fringe of hair round the back of the head, showing above the ears
        for s in (-1, 1):
            tuft = ell(g, cx + s * (rx - 0.6), P['ear_y'] - 4.2, 2.0, 4.2)
            L.append(Layer('tuft', tuft, hair, kind='hair', R=2, group='hair', tex=hair_tex(cx, P['ear_y'] - 12, down=True)))
    neck = box(g, cx - nw, cheek_y, cx + nw, sh_y + 1.5, 1.5)
    L.append(Layer('neck', neck, skin, kind='skin', R=4, group='skin', bias=-0.22))
    ear_y = P['ear_y']
    elf = bool(sp.get('elf_ears'))
    for s in (-1, 1):
        if elf:
            ear = poly(g, [(cx + s * (rx - 1.5), ear_y - 2), (cx + s * (rx + 3), ear_y - 5), (cx + s * (rx + 9.5), ear_y - 10.5),
                           (cx + s * (rx + 4.5), ear_y + 1), (cx + s * (rx + 1), ear_y + 4), (cx + s * (rx - 1.5), ear_y + 3)])
        else:
            ear = ell(g, cx + s * (rx - 0.2), ear_y, 2.6, 3.6)
        L.append(Layer('ear', ear, skin, kind='skin', R=2, group='skin', bias=-0.1))
    face_pts = [(cx, top), (cx - rx * 0.8, top + 2.4), (cx - rx, cy + 1), (cx - rx + 0.3, cheek_y + 0.5),
                (cx - jaw_w, jaw_y), (cx - chin_w, chin_y - 1.6), (cx - chin_w * 0.4, chin_y),
                (cx + chin_w * 0.4, chin_y), (cx + chin_w, chin_y - 1.6), (cx + jaw_w, jaw_y),
                (cx + rx - 0.3, cheek_y + 0.5), (cx + rx, cy + 1), (cx + rx * 0.8, top + 2.4)]
    face = poly(g, face_pts)
    L.append(Layer('face', face, skin, kind='skin', R=P['R_face'], group='face', casts=(1, 3, ('skin', 'cloth', 'collar'))))
    A.update(cx=cx, eye_y=P['eye_y'], eye_dx=P['eye_dx'], brow_y=P['brow_y'], nose_y=P['nose_y'], mouth_y=P['mouth_y'],
             cheek=(P['eye_dx'] + 2.5, P['eye_y'] + 4.5), chin_y=chin_y)
    # ---- beard -----------------------------------------------------------------------------------------------------------
    if me['beard']:
        my = P['mouth_y']
        bpts = [(cx - rx + 0.6, ear_y - 1.5), (cx - rx + 2.2, ear_y + 3.5), (cx - jaw_w - 0.6, jaw_y + 1),
                (cx - chin_w - 1.5, chin_y + 2.5), (cx, chin_y + 4.5), (cx + chin_w + 1.5, chin_y + 2.5),
                (cx + jaw_w + 0.6, jaw_y + 1), (cx + rx - 2.2, ear_y + 3.5), (cx + rx - 0.6, ear_y - 1.5),
                (cx + rx - 2.6, ear_y + 1.5), (cx + 5.5, my - 2.6), (cx, my - 2.2), (cx - 5.5, my - 2.6), (cx - rx + 2.6, ear_y + 1.5)]
        beard = S(poly(g, bpts), ell(g, cx, my + 0.6, 3.2, 1.7))
        L.append(Layer('beard', beard, hair, kind='hair', R=4, group='beard', tex=hair_tex(cx, my - 6, down=True),
                       casts=(1, 2, ('skin', 'cloth', 'collar', 'vest', 'apron', 'sleeve'))))
    if me['mustache']:
        my = P['mouth_y']
        mus = poly(g, [(cx, my - 3.2), (cx - 3.2, my - 2.8), (cx - 5.6, my - 0.6), (cx - 5.0, my + 0.6),
                       (cx - 2.6, my - 1.0), (cx, my - 1.4), (cx + 2.6, my - 1.0), (cx + 5.0, my + 0.6),
                       (cx + 5.6, my - 0.6), (cx + 3.2, my - 2.8)])
        L.append(Layer('mustache', mus, hair, kind='hair', R=2, group='beard', bias=0.1))
    # ---- hair on the head ------------------------------------------------------------------------------------------------
    hl = P['hairline']
    if hstyle != 'bald':
        cap_r = rx + 1.6 + (1.8 if hstyle == 'curly' else 0)
        cap = ell(g, cx, cy - 1.0, cap_r, P['ry'] + 2.0)
        if hstyle == 'mohawk':
            cap = I(cap, box(g, cx - 3.2, 0, cx + 3.2, 64, 1.0))
            cap = U(cap, poly(g, [(cx - 3, top - 2), (cx, top - 6.5), (cx + 3, top - 2), (cx + 2.6, hl - 1), (cx - 2.6, hl - 1)]))
        crown = S(cap, hairline_sdf(g, cx, hl, rx, hstyle, me, P))
        if hstyle in ('long', 'flowing', 'braid', 'short', 'curly', 'ponytail'):
            crown = U(crown, fringe_sdf(g, cx, hl, rx, P, me, hstyle))
        part = {'short': (cx + 4.5, top + 1.5), 'curly': (cx + 4.5, top + 1.5), 'bun': (cx, top - 3.5),
                'ponytail': (cx, top - 2), 'mohawk': (cx, top - 2)}.get(hstyle, (cx + 1.5, top + 1.0))
        if hstyle in ('bun', 'ponytail'):
            part = (cx, hl + 7.0)                    # pulled back: the strands fan up from the forehead
        sheen = (cx, cy + 1.5, P['ry'] * 0.8)
        L.append(Layer('hair', crown, hair, kind='hair', R=5, group='hair', tex=hair_tex(*part, sheen=sheen,
                       centre_part=hstyle in ('bun', 'ponytail', 'flowing')), casts=(1, 2, ('face', 'skin'))))
    if hstyle == 'braid':
        side = 1 if sp.get('braid') != 'left' else -1
        bx0 = cx + side * (rx - 1)
        for k in range(5):
            yy = cheek_y + 2 + k * 4.2
            L.append(Layer('braid', ell(g, bx0 + side * (2 + k * 0.6), yy, 3.0, 2.6), hair, kind='hair', R=2.5, group='braid'))
        if sp.get('braid_tie'):
            L.append(Layer('tie', ell(g, bx0 + side * 5.2, cheek_y + 22.5, 2.2, 1.3), sp['braid_tie'], R=1, group='tie'))
    # ---- hats and things on the head -----------------------------------------------------------------------------------
    hats(g, L, sp, P, cx, rx, cy, top, hl, me)
    return L, A


T_FIXED = {}


def hairline_sdf(g, cx, hl, rx, hstyle, me, P):
    """The part of the head the hair leaves bare (the forehead and the face below it): a hairline that dips at the
    temples and runs down in front of the ears — swept higher for hair pulled back into a bun."""
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


def fringe_sdf(g, cx, hl, rx, P, me, hstyle):
    """Locks of hair falling over the forehead: a fringe swept to one side in pointed locks (short hair), or a part with
    locks falling down the sides of the face (long hair)."""
    parts = []
    if hstyle in ('long', 'flowing', 'braid'):
        for s in (-1, 1):
            parts.append(poly(g, [(cx + s * 0.5, hl - 2.5), (cx + s * 6, hl - 0.8), (cx + s * (rx - 0.6), hl + 4.5),
                                  (cx + s * (rx + 0.8), P['cheek_y'] + 6), (cx + s * (rx - 0.6), P['jaw_y'] + 4.5),
                                  (cx + s * (rx - 2.4), P['cheek_y'] + 2), (cx + s * (rx - 3.6), hl + 5.5), (cx + s * 3.5, hl + 1.6)]))
    else:
        # a fringe swept to the viewer's left from a part on the right: locks that end in points
        parts.append(poly(g, [(cx + 4.5, hl - 3.5), (cx - 4, hl - 2.5), (cx - rx + 0.8, hl + 1.0), (cx - rx + 1.2, hl + 5.2),
                              (cx - 7.2, hl + 2.4), (cx - 5.4, hl + 4.4), (cx - 2.8, hl + 1.8), (cx - 0.6, hl + 3.6),
                              (cx + 1.6, hl + 1.0), (cx + 4.2, hl + 2.2), (cx + 6.2, hl - 0.6)], smooth=True))
    return U(*parts)


def hair_tex(px_, py_, down=False, k=None, sheen=None, centre_part=False):
    """Strands and a sheen on hair: a few long lines running out from the parting (or the crown), not evenly — each
    its own length, some left out — and a band of light in short strokes round the head on the side toward the light.
    A centre part is a line down the middle."""
    def tex(g, t, own):
        t = t.copy()
        X, Y = g.X, g.Y
        ang = np.arctan2(Y - py_, X - px_)
        r = np.hypot(X - px_, Y - py_)
        kk = k or (13.0 if g.n <= 64 else 20.0)
        ph = ang * kk / (2 * math.pi) + 0.08 * np.sin(r * 0.3)
        idx = np.floor(ph + 0.5).astype(int)
        frac = np.abs(ph - idx)
        h = (idx * 2654435761) % 997 / 997.0
        width = (0.11 if g.n <= 64 else 0.08)
        strand = (frac < width) & (h > 0.3) & (r > 4 + 6 * h)
        if centre_part:
            strand |= (np.abs(X - px_) < 0.5 * g.s + 0.01) & (Y < py_ - 2)
        t[strand & (t >= 2)] -= 1
        if sheen is not None and not down:
            sx, sy, sr = sheen
            a = np.degrees(np.arctan2(Y - sy, X - sx))
            rr = np.hypot(X - sx, Y - sy)
            band = (np.abs(rr - sr) < (0.9 if g.n <= 64 else 0.75)) & (a > -165) & (a < -60) & (t >= 2) & ~strand
            t[band] = np.maximum(t[band], 3) + (1 if g.n > 64 else 0)
        return t
    return tex


def vest_tex(cx, side):
    """A vest's panel: flat cloth, a lit edge down the opening on the side toward the light, the other panel darker."""
    def tex(g, t, own):
        t = np.full_like(t, 2 if side < 0 else 1)
        if side < 0:
            near = own & ~shift(own, 1, 0)                     # the panel's right-hand edge: the opening
            t[near] = 3
        else:
            t[own & ~shift(own, -1, 0)] = 2
        return t
    return tex


def fur_tex():
    def tex(g, t, own):
        t = t.copy()
        n = (np.sin(g.X * 2.1 + np.sin(g.Y * 1.3) * 2) * np.sin(g.Y * 1.7)) > 0.55
        t[n & (t >= 2)] -= 1
        return t
    return tex


def hats(g, L, sp, P, cx, rx, cy, top, hl, me):
    brow = P['brow_y']
    if sp.get('chef'):
        white = sp.get('chef') if isinstance(sp.get('chef'), tuple) else ('#9a968c', '#e4e0d4', '#fbf8f0')
        puff = U(ell(g, cx - 7.0, hl - 10.5, 8.6, 7.0), ell(g, cx + 7.0, hl - 10.5, 8.6, 7.0), ell(g, cx, hl - 14.5, 9.5, 8.0))
        L.append(Layer('hat', puff, white, R=6, group='hat'))
        band = box(g, cx - rx - 1.4, hl - 6.5, cx + rx + 1.4, hl + 1.0, 1.5)
        L.append(Layer('hat', band, white, R=2.5, group='hat', bias=-0.1, casts=(1, 2, ('face', 'hair', 'skin'))))
    if sp.get('cap') or sp.get('visor_cap'):
        tones = sp.get('cap') or ('#1e3a2a', '#2e5a40', '#4a8060')
        if sp.get('cap'):
            dome = I(ell(g, cx, cy - 1.5, rx + 1.8, P['ry'] + 1.0), box(g, 0, 0, 64, hl + 1.5))
            L.append(Layer('hat', dome, tones, R=7, group='hat'))
        brim = poly(g, [(cx - rx - 1.5, hl + 2.6), (cx - rx + 2, hl - 0.2), (cx, hl - 0.8), (cx + rx - 2, hl - 0.2),
                        (cx + rx + 1.5, hl + 2.6), (cx + rx - 1, hl + 4.0), (cx, hl + 5.0), (cx - rx + 1, hl + 4.0)])
        L.append(Layer('brim', brim, tones, R=2, group='brim', bias=-0.05, casts=(1, 2, ('face', 'hair', 'skin'))))
    if sp.get('beanie'):
        tones = sp['beanie']
        dome = I(ell(g, cx, cy - 1.0, rx + 2.0, P['ry'] + 1.6), box(g, 0, 0, 64, hl + 0.5))
        L.append(Layer('hat', dome, tones, R=7, group='hat', tex=rib_tex(cx, 3.0)))
        cuff = box(g, cx - rx - 2.4, hl - 4.5, cx + rx + 2.4, hl + 1.2, 1.6)
        L.append(Layer('hat', cuff, tones, R=2.5, group='hat', tex=rib_tex(cx, 1.5),
                       casts=(1, 2, ('face', 'hair', 'skin'))))
    if sp.get('straw_hat') or sp.get('witch_hat'):
        tones = sp.get('straw_hat') or sp.get('witch_hat')
        witch = bool(sp.get('witch_hat'))
        by = hl - 1.0
        brim = ell(g, cx, by, rx + (11 if witch else 10), 4.4)
        if witch:
            crown = poly(g, [(cx - rx + 1, by), (cx - rx + 3.5, by - 7), (cx - 3, top - 7), (cx + 2, top - 12),
                             (cx + 9, top - 13), (cx + 5, top - 10), (cx + 4, top - 5), (cx + rx - 1.5, by - 5),
                             (cx + rx - 1, by)], smooth=True)
        else:
            crown = poly(g, [(cx - rx + 1.5, by + 0.5), (cx - rx + 1.0, by - 5), (cx - rx + 3.0, top - 4.5), (cx - 4, top - 6.5),
                             (cx, top - 5.2), (cx + 4, top - 6.5), (cx + rx - 3.0, top - 4.5), (cx + rx - 1.0, by - 5),
                             (cx + rx - 1.5, by + 0.5)])
        L.append(Layer('hat', brim, tones, R=3, group='hat', bias=-0.2, casts=(1, 3, ('face', 'hair', 'skin', 'ear'))))
        L.append(Layer('hat', crown, tones, R=6, group='hat', tex=None if witch else straw_tex()))
        band_tones = ('#5a1a1a', '#8a2a2a', '#b04a3a') if not witch else ('#6a5010', '#9a7a20', '#c8a040')
        band = I(crown, box(g, 0, by - 3.6, 64, by - 0.4))
        L.append(Layer('band', band, band_tones, R=1.5, group='band'))
    if sp.get('hood') or sp.get('cowl') or sp.get('leaf_hood'):
        tones = sp.get('hood') or sp.get('cowl') or sp.get('leaf_hood')
        rim = S(ell(g, cx, cy + 3.5, rx + 5.0, P['ry'] + 7.0), ell(g, cx, cy + 6.0, rx + 0.2, P['ry'] + 3.2))
        rim = I(rim, box(g, 0, 0, 64, P['jaw_y'] + 4))
        L.append(Layer('hat', rim, tones, R=4, group='hat', casts=(1, 2, ('face', 'hair', 'skin'))))
    if sp.get('circlet') or sp.get('crown'):
        tones = sp.get('circlet') or sp.get('crown')
        y = hl - 0.5
        band = I(capsule(g, cx - rx - 2, y + 1.5, cx + rx + 2, y + 1.5, 0.9), ell(g, cx, cy, rx + 1.9, P['ry'] + 3))
        band = U(band, I(ell(g, cx, y + 2.8, rx + 1.9, 2.4), S(ell(g, cx, y + 2.8, rx + 1.9, 3.6), ell(g, cx, y + 1.6, rx + 0.5, 2.6))))
        if sp.get('crown'):
            pts = []
            for k in range(5):
                x = cx - 10 + k * 5
                pts.append(poly(g, [(x - 2.4, y + 1), (x, y - 7 - (2.5 if k == 2 else 0)), (x + 2.4, y + 1)], smooth=False))
            band = U(band, *pts, box(g, cx - rx, y - 1.5, cx + rx, y + 2.4, 0.6))
        L.append(Layer('circlet', band, tones, R=1.5, group='gold', bias=0.2))
        if sp.get('gem'):
            L.append(Layer('gem', ell(g, cx, y + 2.0, 1.7, 1.9), sp['gem'], R=1.5, group='gem', bias=0.3))
    if sp.get('goggles'):
        y = hl - 2.0
        strap = I(box(g, 0, y - 1.4, 64, y + 1.4), ell(g, cx, cy, rx + 1.9, P['ry'] + 3))
        L.append(Layer('strap', strap, ('#1e1a1e', '#2e2830', '#463e48'), R=1.2, group='strap'))
        for s in (-1, 1):
            rim = ell(g, cx + s * 5.2, y, 3.9, 3.4)
            L.append(Layer('goggle', rim, ('#5a4018', '#9a7430', '#d0a850'), R=2, group='goggle', bias=0.2))
            L.append(Layer('lens', ell(g, cx + s * 5.2, y, 2.5, 2.1), ('#1c5a70', '#3aa8c0', '#8ee4f0'), R=2.5, group='lens',
                           bias=0.35))
    if sp.get('bard_cap'):
        tones = sp['bard_cap']
        cap = poly(g, [(cx - rx - 2.5, hl - 0.5), (cx - rx - 1.0, top + 0.5), (cx - 4, top - 3.5), (cx + 6, top - 3.0),
                       (cx + rx + 4.5, top + 1.5), (cx + rx + 3.5, hl - 2.5), (cx + rx, hl + 0.5), (cx, hl + 0.8)])
        L.append(Layer('hat', cap, tones, R=5, group='hat', casts=(1, 2, ('face', 'hair', 'skin'))))
        L.append(Layer('feather', capsule(g, cx + rx - 1, top + 2, cx + rx + 9, top - 9, 1.3), ('#a8a090', '#e8e0cc', '#fffaf0'),
                       R=1.2, group='feather'))
    if sp.get('flower_crown'):
        y = hl + 0.5
        for k in range(9):
            a = math.pi * (0.06 + 0.88 * k / 8)
            x = cx - math.cos(a) * (rx + 1.2)
            yy = y - math.sin(a) * 3.2 + 1.2
            tone = sp['flower_crown'] if k % 2 else (sp.get('flower') if k % 4 == 0 else sp.get('flower2') or sp.get('flower'))
            L.append(Layer('flower', ell(g, x, yy, 2.3, 2.0), tone or sp['flower_crown'], R=1.5, group='flower%d' % k, bias=0.15))
    if sp.get('shades'):
        ey = P['eye_y']
        for s in (-1, 1):
            L.append(Layer('shades', box(g, cx + s * P['eye_dx'] - 3.6, ey - 2.4, cx + s * P['eye_dx'] + 3.6, ey + 2.2, 1.2),
                           ('#06060a', '#14141c', '#5a5a78'), R=1.5, group='shades', bias=0.3))
        L.append(Layer('shades', box(g, cx - 2.2, ey - 1.8, cx + 2.2, ey - 0.8), ('#06060a', '#14141c', '#5a5a78'), R=1,
                       group='shades'))
    if sp.get('mask'):
        my = P['mouth_y']
        m = I(poly(g, [(cx - rx + 1, P['nose_y'] - 2.5), (cx, P['nose_y'] - 3.5), (cx + rx - 1, P['nose_y'] - 2.5),
                       (cx + P['jaw_w'], P['jaw_y'] + 0.5), (cx, P['chin_y'] + 0.5), (cx - P['jaw_w'], P['jaw_y'] + 0.5)]),
              poly(g, [(cx - 40, 0), (cx + 40, 0), (cx + 40, 70), (cx - 40, 70)], smooth=False))
        L.append(Layer('mask', m, ('#8a9aa0', '#d4e4ea', '#f4fcff'), R=4, group='mask', casts=(1, 2, ('skin', 'cloth'))))
    if sp.get('visor_band'):
        ey = P['eye_y']
        L.append(Layer('visor', box(g, cx - rx - 0.5, ey - 2.8, cx + rx + 0.5, ey + 2.2, 1.6), ('#0a3a48', '#2ab0c8', '#90f0ff'),
                       R=1.5, group='visor', bias=0.4))
    if sp.get('bowtie'):          # a bow tie on the collar, its knot in the middle
        y = P['sh_y'] - 0.6
        for sd in (-1, 1):
            L.append(Layer('collar', poly(g, [(cx + sd * 1.0, y - 3.4), (cx + sd * 5.0, y - 1.6), (cx + sd * 1.6, y + 1.2)],
                                          smooth=False), ('#9a968c', '#e4e0d4', '#fbf8f0'), R=2, group='collarpt', bias=0.2))
        bt = U(poly(g, [(cx, y), (cx - 5.2, y - 2.6), (cx - 5.6, y + 2.4)], smooth=False),
               poly(g, [(cx, y), (cx + 5.2, y - 2.6), (cx + 5.6, y + 2.4)], smooth=False), ell(g, cx, y, 1.6, 1.6))
        L.append(Layer('bowtie', bt, sp['bowtie'], R=2, group='bowtie', bias=0.15))
        L.append(Layer('knot', ell(g, cx, y, 1.5, 1.6), sp['bowtie'], R=1.5, group='knot', bias=0.3))


def rib_tex(cx, step):
    def tex(g, t, own):
        t = t.copy()
        rib = (np.floor((g.X - cx) / step) % 2) == 0
        t[rib & (t >= 2)] -= 1
        return t
    return tex


def straw_tex():
    def tex(g, t, own):
        t = t.copy()
        w = ((np.floor(g.X / 2) + np.floor(g.Y / 2)) % 2 == 0) & (np.floor(g.Y) % 2 == 0)
        t[w & (t >= 2)] -= 1
        return t
    return tex


# =====================================================================================================================
#  The face, in pixels (templates per style; eye templates are the viewer's right eye — mirrored for the left)
# =====================================================================================================================
#   K lid line   W white   D iris dark   I iris   L iris light   P pupil   C catch-light   S skin shadow (crease)
#   s skin light   B brow   M mouth line   T inside of the mouth   R lip   H blush   N nose shadow   n nostril   E lashes
FACES = {
    'stardew': dict(
        eye={
            'open':   (['.KKKK.',
                        'KWCDWK',
                        '.WIIW.',
                        '..SS..'], (-3, -2)),
            'lashes': (['.....E',
                        '.KKKKK',
                        'KWCDWK',
                        '.WIIW.',
                        '..SS..'], (-3, -3)),
            'wide':   (['.KKKK.',
                        'KWCDWK',
                        'KWIIWK',
                        '.WWWW.'], (-3, -2)),
            'happy':  (['......',
                        '.KKKK.',
                        'K....K',
                        '......'], (-3, -2)),
            'sad':    (['.SS...',
                        '..KKKK',
                        'KWCDWK',
                        '.WIIW.'], (-3, -2)),
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
    ),
    'storybook': dict(
        eye={
            'open':   (['.KKKK.',
                        'KDDDDK',
                        'KDCPDW',
                        'KIPPIW',
                        '.LLLL.'], (-3, -2)),
            'lashes': (['......E',
                        '.KKKKKE',
                        'KDDDDK.',
                        'KDCPDW.',
                        'KIPPIW.',
                        '.LLLL..'], (-3, -3)),
            'wide':   (['.KKKK.',
                        'KWDDWK',
                        'WDCPDW',
                        'WIPPIW',
                        '.WLLW.'], (-3, -2)),
            'happy':  (['......',
                        '.KKKK.',
                        'K....K',
                        '......',
                        '......'], (-3, -2)),
            'sad':    (['.SS...',
                        '..KKKK',
                        'KDCPDW',
                        'KIPPIW',
                        '.LLLL.'], (-3, -2)),
            'shut':   (['......',
                        '......',
                        '......',
                        'KKKKKK',
                        '.SSSS.'], (-3, -2)),
            'old':    (['......',
                        '......',
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
            'smile':  ['M....M', '.MMMM.'],
            'flat':   ['.MMMM.'],
            'stern':  ['MMMMMM', 'M....M'],
            'smirk':  ['.....M', '.MMMM.'],
            'open':   ['MMMMMM', 'MTTTTM', '.MMMM.'],
            'o':      ['.MM.', 'MTTM', '.MM.'],
            'frown':  ['.MMMM.', 'M....M'],
            'beard':  ['.MMMM.', '..RR..'],
        },
        mouth_dy={'smile': -1, 'open': -1, 'o': -1, 'smirk': -1},
        nose=(['N'], (0, 0)),
        cheek=(['HHH', '.H.'], (-1, 0)),
    ),
    'painted': dict(
        eye={
            'open':   (['...KKKKKK...',
                        '.KKKKKKKKKK.',
                        'KKWWDDDDWWKK',
                        'KWWDCCDPDWWK',
                        '.WWDCIPPIDWW',
                        '..WWIIIIWW..',
                        '...SSSSSS...',
                        '............'], (-6, -4)),
            'lashes': (['...........E',
                        '...KKKKKKKE.',
                        '.KKKKKKKKKKE',
                        'KKWWDDDDWWKK',
                        'KWWDCCDPDWWK',
                        '.WWDCIPPIDWW',
                        '..WWIIIIWW..',
                        '...SSSSSS...'], (-6, -5)),
            'wide':   (['..KKKKKKKK..',
                        '.KKWWWWWWKK.',
                        'KWWWDDDDWWWK',
                        'WWWDCCDPDWWW',
                        'WWWDCIPPIDWW',
                        '.WWWIIIIWWW.',
                        '..WWWWWWWW..',
                        '............'], (-6, -5)),
            'happy':  (['............',
                        '...KKKKKK...',
                        '.KK......KK.',
                        'K..........K',
                        '............',
                        '............',
                        '............',
                        '............'], (-6, -4)),
            'sad':    (['.SSS........',
                        '...SSS......',
                        '....KKKKKKK.',
                        'KKKKKKKKKKKK',
                        'KWWDCIPPIDWW',
                        '.WWWIIIIWWW.',
                        '..SSSSSSSS..',
                        '............'], (-6, -4)),
            'shut':   (['............',
                        '............',
                        '............',
                        '............',
                        'KKKKKKKKKKKK',
                        '.KKSSSSSSKK.',
                        '............',
                        '............'], (-6, -4)),
            'old':    (['............',
                        '............',
                        '............',
                        '............',
                        '............',
                        '............',
                        '............',
                        '..SSSSSSSS..'], (-6, -4)),
        },
        brow={
            'soft':   (['..BBBBBBB...', '.BBBBBBBBBB.', 'BB........BB'], (-6, -1)),
            'raised': (['..BBBBBBB...', '.BBBBBBBBBB.', 'BB........BB'], (-6, -3)),
            'high':   (['..BBBBBBB...', '.BBBBBBBBBB.', 'BB........BB'], (-6, -5)),
            'sad':    (['BBB.........', 'BBBBBB......', '...BBBBBB...', '.......BBBBB'], (-6, -1)),
            'stern':  (['.........BBB', '......BBBBBB', '..BBBBBB....', 'BBBB........'], (-6, -1)),
            'heavy':  (['BBBBBBBBBBB.', 'BBBBBBBBBBBB', 'BB........BB'], (-6, -1)),
        },
        mouth={
            'smile':  ['RR........RR', '.MM......MM.', '..MMMMMMMM..', '...RRRRRR...'],
            'flat':   ['..MMMMMMMM..', '...RRRRRR...'],
            'stern':  ['MMMMMMMMMMMM', '.MM......MM.', '...RRRRRR...'],
            'smirk':  ['..........RR', '.........MM.', '..MMMMMMMM..', '...RRRRRR...'],
            'open':   ['MMMMMMMMMMMM', 'MTTTTTTTTTTM', '.MTTTTTTTTM.', '..MMMMMMMM..', '...RRRRRR...'],
            'o':      ['..MMMM..', '.MTTTTM.', 'MTTTTTTM', '.MTTTTM.', '..MMMM..'],
            'frown':  ['...MMMMMM...', '.MM......MM.', 'M..........M'],
            'beard':  ['..MMMMMMMM..', '....RRRR....'],
        },
        mouth_dy={'smile': -2, 'open': -2, 'o': -2, 'smirk': -2},
        nose=(['..N', '..N', '.NN', 'NnN'], (0, -2)),
        cheek=(['.HH.', 'HHHH', '.HH.'], (-2, -1)),
    ),
}

MOODS = {
    'stern': ['npc-watcher', 'npc-doorman', 'npc-pitboss', 'npc-samurai', 'npc-hm-garro', 'npc-boxman', 'npc-stickman',
              'npc-elf-warden', 'npc-registrar', 'npc-dealer-b', 'npc-vex', 'npc-sev'],
    'flat': ['npc-ferryman', 'npc-quiet', 'npc-stranger', 'npc-traveler', 'npc-keeper', 'npc-miner', 'npc-scholar',
             'npc-croupier', 'npc-dealer', 'npc-dealer-c', 'npc-clerk', 'npc-courier', 'npc-technician', 'npc-waiting',
             'npc-gambler-b', 'npc-queen', 'npc-duchess', 'npc-sorceress', 'npc-steward', 'npc-broker'],
    'smirk': ['npc-pawnbroker', 'npc-highroller', 'npc-dj', 'npc-mixer', 'npc-gambler-a', 'npc-peddler', 'npc-hm-mira',
              'npc-beckolas', 'npc-singer', 'npc-runouts-host'],
}
MOOD = {name: mood for mood, names in MOODS.items() for name in names}
ROSY = {'npc-baker', 'npc-innkeeper', 'npc-fisher-gran', 'npc-hetty', 'npc-bartender', 'npc-vbaker'}
IRISES = {
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


def paint_face(img, top, layers, A, me, style, expr):
    F = FACES[style]
    n = img.shape[0]
    k = n / 64.0
    out = img.copy()
    face_i = [i for i, L in enumerate(layers) if L.name == 'face']
    beard_i = [i for i, L in enumerate(layers) if L.name in ('beard',)]
    on_face = np.isin(top, face_i)
    on_beard = np.isin(top, beard_i)
    sp = me['spec']
    skin_r = ramp(me['skin'], 'skin')
    hair = me['hair']
    iris = tuple(sp['eye']) if isinstance(sp.get('eye'), (list, tuple)) else IRISES[IRIS_ORDER[name_hash(me['who']) % len(IRIS_ORDER)]]
    brow = mix(hair[0], (20, 10, 14), 0.25) if sum(rgb(hair[0])) > 330 else rgb(hair[0])
    blush = mix(skin_r[2], '#ff5a6e', 0.38)
    cols = {
        'K': (40, 22, 26), 'E': (40, 22, 26), 'P': (16, 10, 14), 'W': (246, 240, 230), 'C': (255, 255, 255),
        'D': rgb(iris[0]), 'I': rgb(iris[1]), 'L': rgb(iris[2]),
        'S': skin_r[1], 's': skin_r[3], 'B': brow, 'M': (96, 36, 40), 'T': (190, 80, 86), 'R': skin_r[1],
        'H': blush, 'N': skin_r[1], 'n': mix(skin_r[0], (60, 20, 24), 0.2),
    }
    cxb = int(round(2 * A['cx'] * k))               # twice the centre line in px: mirror x → cxb - 1 - x

    def stamp(rows, ax, ay, ox, oy, allow, mirror=False, centred=False):
        x0 = int(math.floor(ax * k)) + ox
        y0 = int(math.floor(ay * k)) + oy
        if centred:
            x0 = (cxb - len(rows[0])) // 2
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch == '.':
                    continue
                x = x0 + i
                if mirror:
                    x = cxb - 1 - x
                y = y0 + j
                if 0 <= x < n and 0 <= y < n and allow[y, x]:
                    out[y, x, :3] = cols[ch]

    mood = 'smile' if me['who'] not in MOOD else MOOD[me['who']]
    if sp.get('smile') is False and mood == 'smile':
        mood = 'flat'
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
    ex, ey = A['cx'] + A['eye_dx'], A['eye_y']
    for mirror in (False, True):
        if not hide_eyes:
            rows, (ox, oy) = F['eye'][eye]
            stamp(rows, ex, ey, ox, oy, on_face, mirror)
            if me['old'] and eye in ('open', 'lashes'):
                rows, (ox, oy) = F['eye']['old']
                stamp(rows, ex, ey, ox, oy, on_face, mirror)
        rows, (ox, oy) = F['brow'][brow_t]
        stamp(rows, ex, A['brow_y'], ox, oy, on_face, mirror)
        blush_on = me['young'] or (me['femme'] and mood in ('smile', 'smirk')) or me['who'] in ROSY or sp.get('blush')
        if blush_on and expr != 'sad':
            rows, (ox, oy) = F['cheek']
            stamp(rows, A['cx'] + A['cheek'][0], A['cheek'][1], ox, oy, on_face, mirror)
    rows, (ox, oy) = F['nose']
    stamp(rows, A['cx'], A['nose_y'], ox, oy, on_face)
    if not sp.get('mask'):
        mrows = F['mouth'][mouth]
        if me['beard'] and mouth in ('smile', 'flat', 'smirk', 'stern', 'frown'):
            mrows = F['mouth']['beard']
        dy = F['mouth_dy'].get(mouth, 0)
        stamp(mrows, A['cx'], A['mouth_y'], 0, dy, on_face | on_beard, centred=True)
    return out


# =====================================================================================================================
#  A strip
# =====================================================================================================================
def portrait(who, style, T):
    global T_FIXED
    T_FIXED = T['FIXED']
    spec = T['NPCS'][who]
    P = STYLES[style]
    g = Grid(P['N'])
    me = person(spec, T, who)
    layers, A = build(g, P, me)
    img, top, tone = paint(g, layers, P)
    frames = [paint_face(img, top, layers, A, me, style, e) for e in EXPRESSIONS]
    return np.concatenate(frames, axis=1)


def main(argv):
    style, look, whos, out = 'stardew', None, [], None
    i = 0
    while i < len(argv):
        if argv[i] == '--style':
            style = argv[i + 1]; i += 2
        elif argv[i] == '--look':
            look = argv[i + 1]; i += 2
        elif argv[i] == '--out':
            out = argv[i + 1]; i += 2
        else:
            whos.append(argv[i]); i += 1
    T = tables()
    strips = []
    for who in whos:
        s = portrait(who, style, T)
        strips.append(s)
        if out:
            os.makedirs(out, exist_ok=True)
            Image.fromarray(s, 'RGBA').save(os.path.join(out, who + '.png'))
    if look:
        n = strips[0].shape[0]
        scale = 4 if n <= 64 else 2
        W = strips[0].shape[1] + 4
        sheet = Image.new('RGBA', (W, len(strips) * (n + 4)), (96, 104, 112, 255))
        for k, s in enumerate(strips):
            sheet.alpha_composite(Image.fromarray(s, 'RGBA'), (2, k * (n + 4) + 2))
        sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST).save(look)
        print('look:', look)


if __name__ == '__main__':
    main(sys.argv[1:])
