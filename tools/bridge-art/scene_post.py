#!/usr/bin/env python3
"""Compose Blender scene passes (scenekit.render) into game assets.

  python3 tools/bridge-art/scene_post.py RENDER_DIR OUT_DIR

Writes to OUT_DIR (every image lossless WebP, exact to the pixel; scene.json
"ext" names the format, and the engine reads meta.ext — absent means PNG):
  <state>.webp  toon-shaded scene, one per light state (e.g. full / dim —
                the game cross-fades them to make firelight flicker)
  depth.webp    engine depth packed in 16 bits (R = high byte, G = low)
  leaves.webp   the leaf pass, shore.webp the water, glow.webp what gives off light
                alone (the emission pass at its strongest; scene.json "glow"), layers/<slot>/<key>/
  scene.json    size, origin, depth range, per-tile light for characters

The finish is "toy" (Beck's pick, Look Book 2): final = albedo × band(light) + emission, the light's
luminance snapped to a few flat bands keeping part of its hue (warm firelight stays warm), shadows leaning cool and
lights warm, and a strong line wherever one thing stands in front of another — never inside the ground, between a
roof's shingles or round a blade of grass. SCENE_STYLE=dither gives the older look (many small dithered steps and
soft lines).

A scene rendered with live light (scenekit `lit`, any scene with a day) also gets the passes the engine relights as the
planet's clock turns (js/litscene.js): lit_albedo (the flat colours), lit_a / lit_b / lit_c (the white sky and the six
suns, each with its shadows; the normal's z; flags), lit_d (which tree; line strength), lit_lamps (the lamps' light)
and, over still water, lit_refl / lit_reflglow (the mirror) — for the base and every variant layer; scene.json `lit`.
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image

# (luminance threshold, brightness) — tuned for night interiors
BANDS = [(0.0, 0.16), (0.035, 0.30), (0.10, 0.48), (0.22, 0.68), (0.42, 0.88), (0.75, 1.06)]
TINT = 0.55         # how much of the light's hue survives into the band
LIGHT_GAIN = 4.0    # undo scenekit.LIGHT_EXPOSURE (-2 stops)
EXPOSURE = 1.6 * LIGHT_GAIN
LINE_DEPTH_EPS = 0.08
OUTLINE = np.array([14, 10, 16], np.float32)


def load(path, mode=None):
    im = Image.open(path)
    return np.array(im.convert(mode) if mode else im)


def load16(path):
    """16-bit PNG → float 0..1 (RGBA or gray)."""
    im = Image.open(path)
    a = np.array(im)
    if a.dtype == np.uint16 or a.max() > 255:
        return a.astype(np.float32) / 65535.0
    return a.astype(np.float32) / 255.0


# The finish. 'toy' (since Oct 2026, every scene): the light in a few flat bands of tone(), shadows cool and lights warm,
# strong lines between things (toy_lines). 'dither' (the older look, Cast n Chill-like): a smooth tone curve quantized
# into many small steps with 4×4 ordered dithering and soft lines.
STYLE = os.environ.get('SCENE_STYLE', 'toy')
TOY_BANDS = [(0.0, 0.14), (0.17, 0.22), (0.27, 0.32), (0.4, 0.52), (0.58, 0.76), (0.82, 1.0)]    # on tone(), as (from, value)
TOY_COOL = 1.0      # how far shadows lean blue and the brightest lights warm
TOY_LINE = 0.95     # line strength: a pixel on a line is darkened to ~40%
STEPS = 14
BAYER4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) + 0.5) / 16


def tone(lum):
    return 0.16 + 0.93 * (1 - np.exp(-lum * 4.0))


def toon(albedo, light, emission):
    L = light[..., :3] * EXPOSURE
    lum = L @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    if STYLE == 'toy':
        b = tone(lum)
        band = np.full(lum.shape, TOY_BANDS[0][1], np.float32)
        for t, v in TOY_BANDS:
            band = np.where(b >= t, v, band)
    elif STYLE == 'dither':
        h, w = lum.shape
        th = np.tile(BAYER4, (h // 4 + 1, w // 4 + 1))[:h, :w]
        top = 1.12
        v = tone(lum) / top * (STEPS - 1)
        band = np.floor(v + th) / (STEPS - 1) * top
    else:
        band = np.full(lum.shape, BANDS[0][1], np.float32)
        for t, v in BANDS:
            band = np.where(lum >= t, v, band)
    chroma = L / np.maximum(lum, 1e-4)[..., None]
    chroma = np.clip(chroma, 0, 2.2)
    tint = 1 + (chroma - 1) * TINT
    a = albedo[..., :3].astype(np.float32) / 255
    out = a * band[..., None] * tint
    if STYLE == 'toy':
        sh = np.clip(1 - band, 0, 1) * TOY_COOL                    # shadows lean cool, the brightest light warm
        wv = np.clip(band - 0.85, 0, None) * TOY_COOL
        out = out * np.stack([(1 - sh * 0.22) * (1 + wv * 0.25), (1 - sh * 0.1) * (1 + wv * 0.1), 1 + sh * 0.12], -1)
    e = emission[..., :3].astype(np.float32) / 255
    out = np.clip(out + e, 0, 1)
    return out


# ---- the grass, drawn (Beck: "more actual grasses and drawn textures… not random blobs… subtle little grass") ----------
# Over the grass the leaf pass marks (R 64), small hand-drawn marks are stamped into the albedo before it's lit, so every
# light state shows them: little v and y strokes of lighter blades, slanted blades, darker accents, the odd tuft, clover,
# a tiny flower, a pebble. Each mark is shaded from the grass round it (a smoothed local colour), and the grass between
# them is calmed toward that colour, so the ground reads as a drawn texture, not noise. Legend: h highlight, l light,
# m a little darker, d dark, s shadow (relative to the local grass); w, y, p, v flower colours; g, G, H a pebble.
GRASS_MARKS = [
    (10, ['.h.h.', '.l.l.', 'ml.lm', '.ddd.']),                         # a small tuft, its shadow under it
    (7, ['...h...', '.h.l.h.', '.l.l.l.', 'm.lll.m', '.ddddd.']),       # a bigger one
    (6, ['....h.', '..h.l.', '.l.l..', 'ml.l..', '.ddd..']),            # leaning in the wind
    (5, ['.h....', '.l.h..', '..l.l.', '..ll.m', '..ddd.']),
    (9, ['l.l', 'l.l', '.d.']),                                         # a pair of blades
    (8, ['.h', 'l.', 'd.']),                                            # one blade
    (7, ['h.', '.l', '.d']),
    (7, ['d.d.d', '.ddd.', '..s..']),                                   # a shadowed tuft
    (5, ['m.m', '.m.']),
    (2, ['.ll..', 'lmll.', '.llm.', '..d..']),                          # clover
    (1, ['.w.', 'wyw', '.w.', '.m.']),                                  # a daisy
    (1, ['.y.', 'yyy', '.y.', '.m.']),                                  # a buttercup
    (1, ['Hg.', 'gGG', '.d.']),                                         # a pebble
]
MARK_ABS = {'w': (240, 240, 232), 'y': (244, 214, 80), 'p': (236, 150, 186), 'v': (170, 140, 220),
            'g': (150, 146, 134), 'G': (104, 100, 92), 'H': (196, 192, 178)}
MARK_REL = {'h': (1.34, (14, 16, -6)), 'l': (1.17, (7, 9, -3)), 'm': (0.87, (0, 0, 0)), 'd': (0.72, (0, 0, 0)), 's': (0.6, (0, 0, 0))}


def _blur(a, r):
    """Box blur (r each side) of an (h, w[, c]) float array, by cumulative sums."""
    out = a
    for ax in (0, 1):
        c = np.cumsum(np.pad(out, [(r + 1, r) if i == ax else (0, 0) for i in range(out.ndim)], mode='edge'), axis=ax)
        n = out.shape[ax]
        hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=ax)
        lo = np.take(c, np.arange(0, n), axis=ax)
        out = (hi - lo) / (2 * r + 1)
    return out


def grass_detail(albedo, grass, seed=1, calm=0.75, cell=(12, 9), fill=0.95, even=0.5):
    """Stamp the drawn marks into the albedo (in place) over the grass mask."""
    h, w = grass.shape
    a = albedo[..., :3].astype(np.float32)
    g = grass.astype(np.float32)
    num = _blur(a * g[..., None], 4)
    den = _blur(g, 4)[..., None]
    base = np.where(den > 0.05, num / np.maximum(den, 1e-3), a)
    # and the broad patches (an island's two greens, the meadow's drifts) evened out by half: big soft blobs are what
    # read as 'random', not the marks
    bnum = _blur(a * g[..., None], 22)
    bden = _blur(g, 22)[..., None]
    base = np.where(bden > 0.05, base * (1 - even) + bnum / np.maximum(bden, 1e-3) * even, base)
    a = np.where(grass[..., None], a * (1 - calm) + base * calm, a)       # the grass between the marks, calmed
    rng = np.random.default_rng(seed)
    marks = [(wt, [list(row) for row in rows]) for wt, rows in GRASS_MARKS]
    weights = np.array([m[0] for m in marks], np.float64)
    weights /= weights.sum()
    cw, ch = cell
    ph = rng.random(4) * 6.283
    for y0 in range(0, h, ch):
        for x0 in range(0, w, cw):
            # thicker in some stretches than others (slow waves, not a grid's evenness)
            f = fill * (0.72 + 0.28 * math.sin(x0 / 61 + ph[0]) * math.sin(y0 / 47 + ph[1]) + 0.12 * math.sin((x0 + y0) / 23 + ph[2]))
            if rng.random() > f:
                continue
            mk = marks[rng.choice(len(marks), p=weights)][1]
            mh, mw = len(mk), len(mk[0])
            x = x0 + int(rng.integers(0, cw)) - mw // 2
            y = y0 + int(rng.integers(0, ch)) - mh // 2
            if x < 0 or y < 0 or x + mw > w or y + mh > h:
                continue
            ok = True
            for j in range(mh):
                for i in range(mw):
                    if mk[j][i] != '.' and not grass[y + j, x + i]:
                        ok = False
                        break
                if not ok:
                    break
            if not ok:
                continue
            for j in range(mh):
                for i in range(mw):
                    c = mk[j][i]
                    if c == '.':
                        continue
                    if c in MARK_ABS:
                        a[y + j, x + i] = MARK_ABS[c]
                    else:
                        k, add = MARK_REL[c]
                        a[y + j, x + i] = base[y + j, x + i] * k + add
    albedo[..., :3] = np.clip(a, 0, 255).astype(albedo.dtype)
    return albedo


def lines(img, ids, depth, alpha):
    h, w = alpha.shape
    idk = (ids[..., 0].astype(np.int64) << 16) | (ids[..., 1].astype(np.int64) << 8) | ids[..., 2]
    line = np.zeros((h, w), bool)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        ys0, ys1 = max(0, -dy), h - max(0, dy)
        xs0, xs1 = max(0, -dx), w - max(0, dx)
        p = (slice(ys0, ys1), slice(xs0, xs1))
        q = (slice(ys0 + dy, ys1 + dy), slice(xs0 + dx, xs1 + dx))
        front = alpha[q] & ((idk[q] != idk[p]) & (depth[q] < depth[p] - LINE_DEPTH_EPS))
        line[p] |= alpha[p] & front
    out = img.copy()
    # soft line: a deeper shade of the surface itself, not near-black
    out[line] = out[line] * 0.62 + OUTLINE / 255 * 0.12
    return out


# What a part is, from its name (render.json `ids`: id colour → part name), by the words in it: the ground (no lines
# inside it — paths, turf, paving, floors, rugs, water) and roofs (lines only where the roof meets what's behind it).
GROUND_WORDS = {'ground', 'grass', 'meadow', 'turf', 'path', 'paths', 'dirt', 'sand', 'earth', 'snow', 'coast', 'lip',
                'cobble', 'cobbles', 'flagstone', 'flagstones', 'paving', 'pave', 'road', 'street', 'floor', 'rug',
                'carpet', 'water', 'pond', 'stream', 'mud', 'soil', 'field', 'moss', 'drift', 'lane', 'yard', 'beach',
                'shore', 'bank', 'wet', 'damp', 'ice', 'deck', 'parquet', 'gravel', 'pebbles', 'shallows', 'seabed', 'lawn',
                'tilled', 'furrow', 'furrows', 'litter', 'clover', 'tuft', 'tufts', 'blades', 'puddle', 'kerb', 'straw', 'chalk',
                'grout', 'plaza', 'drain', 'grate', 'weed', 'setts', 'hopscotch'}
NOT_GROUND = {'roof', 'wall', 'post', 'rail', 'fence', 'house', 'stall', 'table', 'bench', 'tree', 'trunk', 'pot',
              'box', 'window', 'door', 'sign', 'lamp', 'lantern', 'pole', 'snowman', 'cart', 'boat', 'hull', 'crate'}
ROOF_WORDS = {'roof', 'shingle', 'shingles', 'slate', 'slates', 'thatch', 'ridge', 'pantile', 'pantiles', 'eave', 'eaves'}


def _words(name):
    return set(w for w in name.lower().replace('-', '_').split('_') if w)


def part_kinds(ids_rgb, names):
    """(ground, roof) masks from the id pass and render.json `ids`."""
    key = (ids_rgb[..., 0].astype(np.int64) << 16) | (ids_rgb[..., 1].astype(np.int64) << 8) | ids_rgb[..., 2]
    gk, rk = [], []
    for k, name in (names or {}).items():
        r, g, b = [int(v) for v in k.split(',')]
        kk = (r << 16) | (g << 8) | b
        w = _words(name)
        if w & ROOF_WORDS:
            rk.append(kk)
        elif w & GROUND_WORDS and not w & NOT_GROUND:
            gk.append(kk)
    return np.isin(key, gk), np.isin(key, rk)


def toy_lines(ids, depth, alpha, ground, roof):
    """Line strength 0..1 per pixel: 1 on a thing where what's next to it lies behind it (or nothing does), 0.45 where
    two things meet without a step in depth — never on the ground, and on a roof only its real edges."""
    h, w = alpha.shape
    idk = (ids[..., 0].astype(np.int64) << 16) | (ids[..., 1].astype(np.int64) << 8) | ids[..., 2]
    line = np.zeros((h, w), np.float32)
    dep = np.where(alpha, depth, 1e9)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        ys0, ys1 = max(0, -dy), h - max(0, dy)
        xs0, xs1 = max(0, -dx), w - max(0, dx)
        p = (slice(ys0, ys1), slice(xs0, xs1))
        q = (slice(ys0 + dy, ys1 + dy), slice(xs0 + dx, xs1 + dx))
        mine = alpha[p] & ~ground[p] & (idk[p] != idk[q])
        farther = (dep[q] - dep[p]) > 0.06
        edge = mine & (farther | ~alpha[q])
        crease = mine & alpha[q] & ~ground[q] & ~farther & ~roof[p]
        line[p] = np.maximum(line[p], np.where(edge, 1.0, np.where(crease, 0.45, 0.0)))
    return line


def apply_lines(img, line):
    k = (line * TOY_LINE)[..., None]
    return img * (1 - k * np.array([0.62, 0.6, 0.5], np.float32))


EXT = 'webp'      # every image a scene writes (scene.json "ext"; the engine reads meta.ext, absent = png)


def save(arr, d, name, mode='RGBA'):
    """<name>.webp in d, lossless and exact (every pixel as written, transparent ones
    included — depth and the leaf pass are data), about half a PNG's size; an older
    <name>.png beside it goes."""
    Image.fromarray(arr, mode).save(os.path.join(d, name + '.' + EXT), 'WEBP', lossless=True, method=4, exact=True)
    old = os.path.join(d, name + '.png')
    if os.path.exists(old):
        os.remove(old)


def revision(od):
    """A fingerprint of a scene's images: the engine loads them with ?v=rev,
    so a cached picture is never paired with a newer scene.json."""
    import hashlib
    h = hashlib.sha1()
    for root, _, files in sorted(os.walk(od)):
        for f in sorted(files):
            if f.endswith(('.png', '.webp')):
                h.update(f.encode())
                h.update(open(os.path.join(root, f), 'rb').read())
    return h.hexdigest()[:10]


SHORE_REACH = 14     # px of foam / lapping out from the waterline
DEEP = 1.4          # tiles below the surface where the water turns opaque


def shore(rd, od, meta, alpha):
    """shore.png for a scene standing in the sea (scenekit water_z):
      R  distance in px from the waterline (where geometry meets the
         surface), 255 beyond SHORE_REACH — the engine's foam
      G  depth under the surface, 1..255 (0: above water or empty)
      B  255 where the render is empty (the open sea shows through)"""
    hr = meta['heightRange']
    wz = meta['waterZ']
    h01 = load16(os.path.join(rd, 'height.png'))
    if h01.ndim == 3:
        h01 = h01[..., 0]
    z = -hr + h01 * 2 * hr
    under = alpha & (z < wz)
    seed = alpha & (z >= wz) & (z < wz + 0.14)
    water = under | ~alpha
    dist = np.full(alpha.shape, 255, np.uint8)
    dist[seed] = 0
    front = seed.copy()
    reached = seed.copy()
    for d in range(1, SHORE_REACH + 1):
        grow = np.zeros_like(front)
        grow[1:, :] |= front[:-1, :]
        grow[:-1, :] |= front[1:, :]
        grow[:, 1:] |= front[:, :-1]
        grow[:, :-1] |= front[:, 1:]
        if d % 2 == 0:                       # alternate in diagonals: rounder rings
            grow[1:, 1:] |= front[:-1, :-1]
            grow[:-1, :-1] |= front[1:, 1:]
            grow[1:, :-1] |= front[:-1, 1:]
            grow[:-1, 1:] |= front[1:, :-1]
        grow &= water & ~reached
        dist[grow] = d
        reached |= grow
        front = grow
    out = np.zeros(alpha.shape + (4,), np.uint8)
    out[..., 0] = dist
    depth = np.clip((wz - z) / DEEP, 0, 1)
    out[..., 1] = np.where(under, 1 + np.round(depth * 254), 0).astype(np.uint8)
    out[..., 2] = np.where(alpha, 0, 255)
    out[..., 3] = 255
    save(out, od, 'shore')
    return {'z': wz, 'reach': SHORE_REACH}


# ---- live light (js/litscene.js) ------------------------------------------------------------------------------------
LIT_GAIN = LIGHT_GAIN / 0.8        # undo the light passes' -2 stops and the white diffuse's 0.8: 1 = lit like open ground
                                   # under the white sky dome


def lit_enc(L):
    """Light as stored: sqrt(min(1, L / 4)) × 255 (decode (v / 255)² × 4)."""
    return (np.sqrt(np.clip(L / 4.0, 0, 1)) * 255 + 0.5).astype(np.uint8)


def lit_lum(path):
    a = load16(path)
    a = a[..., :3] if a.ndim == 3 else a
    if a.ndim == 3:
        a = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    return a * LIT_GAIN


def lit_pack(rd, od, nsuns, mask, albedo, ids, line, ground, roof, box=None, water_ok=True):
    """The live-light passes of one render (the base, or a variant cropped to its box) packed for js/litscene.js:
      lit_albedo  the flat colours (alpha: covered)
      lit_a       R the white sky's light, G sun 0, B sun 1     lit_b  R, G, B suns 2, 3, 4
      lit_c       R sun 5, G the normal's z (× 0.5 + 0.5), B flags (1 leaf, 2 needle, 4 grass, 8 still water, 16 ground, 32 roof)
      lit_d       R which tree (the leaf pass's G), G line strength, B 0
      lit_lamps   the lamps' coloured light (only when there's any)
    Returns {'lamps': bool}."""
    def crop(a):
        return a if box is None else a[box[1]:box[3], box[0]:box[2]]
    m = crop(mask)
    H, W = m.shape
    alb = crop(albedo).copy()
    alb[..., 3] = np.where(m, 255, 0)
    save(alb, od, 'lit_albedo')
    sky = crop(lit_lum(os.path.join(rd, 'lit_sky.png')))
    suns = [crop(lit_lum(os.path.join(rd, 'lit_sun%d.png' % i))) for i in range(nsuns)]
    while len(suns) < 6:
        suns.append(np.zeros((H, W), np.float32))
    nz = crop(load(os.path.join(rd, 'normal.png'), 'RGB'))[..., 2]
    flags = np.zeros((H, W), np.uint8)
    tree = np.zeros((H, W), np.uint8)
    lfp = os.path.join(rd, 'leaf.png')
    if os.path.exists(lfp):
        lf = crop(load(lfp, 'RGB')).astype(np.int32)
        lr, lg, lb = lf[..., 0], lf[..., 1], lf[..., 2]
        flags |= np.where(lr > 200, 1, 0).astype(np.uint8)
        flags |= np.where(lb > 200, 2, 0).astype(np.uint8)
        flags |= np.where((lr > 32) & (lr <= 160), 4, 0).astype(np.uint8)
        if water_ok:
            flags |= np.where((lb > 32) & (lb <= 160), 8, 0).astype(np.uint8)
        tree = np.where((lr > 200) | (lb > 200), (lg // 16) * 16 + 8, 0).astype(np.uint8)
    flags |= np.where(crop(ground) | ((flags & 12) > 0), 16, 0).astype(np.uint8)
    flags |= np.where(crop(roof), 32, 0).astype(np.uint8)
    flags = np.where(m, flags, 0).astype(np.uint8)

    def rgb(r, g, b):
        out = np.zeros((H, W, 4), np.uint8)
        out[..., 0], out[..., 1], out[..., 2], out[..., 3] = r, g, b, 255
        return out
    save(rgb(lit_enc(sky), lit_enc(suns[0]), lit_enc(suns[1])), od, 'lit_a')
    save(rgb(lit_enc(suns[2]), lit_enc(suns[3]), lit_enc(suns[4])), od, 'lit_b')
    save(rgb(lit_enc(suns[5]), nz, flags), od, 'lit_c')
    save(rgb(tree, (crop(line) * 255 + 0.5).astype(np.uint8), 0), od, 'lit_d')
    lp = load16(os.path.join(rd, 'lit_lamps.png'))[..., :3] * LIT_GAIN
    lp = crop(lp)
    lamps = bool((lp.max(axis=-1)[m] > 0.02).any()) if m.any() else False
    if lamps:
        save(rgb(*[lit_enc(lp[..., c]) for c in range(3)]), od, 'lit_lamps')
    else:
        for f in ('lit_lamps.' + EXT,):
            if os.path.exists(os.path.join(od, f)):
                os.remove(os.path.join(od, f))
    return {'lamps': lamps, 'water': bool((flags & 8).any())}


def lit_refl(rd, od, water):
    """The still water's mirror (scenekit _lit_mirror): its colours where the water is, the sky (keyed magenta) taken
    out; and what glows, alone, for the lamps' streaks after dark."""
    rp = os.path.join(rd, 'refl.png')
    if not os.path.exists(rp) or not water.any():
        return {}
    refl = load(rp, 'RGBA')
    r, g, b = refl[..., 0].astype(int), refl[..., 1].astype(int), refl[..., 2].astype(int)
    sky = ((r > g + 50) & (b > g + 50)) | ((r + g + b) < 6)
    refl[..., 3] = np.where(water & ~sky & (refl[..., 3] > 0), 255, 0)
    refl[..., :3] = np.where(refl[..., 3:] > 0, refl[..., :3], 0)
    out = {}
    if refl[..., 3].any():
        save(refl, od, 'lit_refl')
        out['refl'] = 1
    gp = os.path.join(rd, 'refl_glow.png')
    if os.path.exists(gp):
        rg = load(gp, 'RGB')
        lit = water & (rg.astype(int).sum(-1) > 30)
        if lit.any():
            o = np.zeros(rg.shape[:2] + (4,), np.uint8)
            o[..., :3] = np.where(lit[..., None], rg, 0)
            o[..., 3] = np.where(lit, 255, 0)
            save(o, od, 'lit_reflglow')
            out['reflGlow'] = 1
    return out


def main():
    rd, od = sys.argv[1], sys.argv[2]
    os.makedirs(od, exist_ok=True)
    meta = json.load(open(os.path.join(rd, 'render.json')))
    albedo = load(os.path.join(rd, 'albedo.png'), 'RGBA')
    emission = load(os.path.join(rd, 'emission.png'), 'RGBA')
    ids = load(os.path.join(rd, 'id.png'), 'RGB')
    alpha = albedo[..., 3] >= 128
    d01 = load16(os.path.join(rd, 'depth.png'))
    if d01.ndim == 3:
        d01 = d01[..., 0]
    view = meta['zmin'] + d01 * (meta['zmax'] - meta['zmin'])
    depth = view + meta['camDot']                     # engine depth units
    depth = np.where(alpha, depth, np.inf)
    names = meta.get('ids')
    ground, roof = part_kinds(ids, names)

    def finish(img, ids_, depth_, alpha_, line_):
        if STYLE == 'toy':
            return apply_lines(img, line_)
        return lines(img, ids_, depth_, alpha_)
    base_line = toy_lines(ids, depth, alpha, ground, roof)

    def emit(state, e):                               # lamps by day glow less (scenekit `_emit`)
        k = (meta.get('stateOpts') or {}).get(state, {}).get('emit', 1.0)
        if k == 1.0:
            return e
        out = e.copy()
        out[..., :3] = np.clip(e[..., :3].astype(np.float32) * k, 0, 255).astype(e.dtype)
        return out

    # the grass the leaf pass marks (R 64), drawn: small hand-drawn marks stamped into the albedo (grass_detail)
    lfp = os.path.join(rd, 'leaf.png')
    if os.path.exists(lfp):
        lr = load(lfp, 'RGB')[..., 0]
        grass = alpha & (lr > 32) & (lr <= 160)
        if grass.any():
            albedo = grass_detail(albedo.copy(), grass, seed=sum(map(ord, os.path.basename(os.path.normpath(od)))))

    for state in meta['lightStates']:
        light = load16(os.path.join(rd, 'light_' + state + '.png'))
        img = toon(albedo, light, emit(state, emission))
        img = finish(img, ids, depth, alpha, base_line)
        rgba = np.zeros(albedo.shape, np.uint8)
        rgba[..., :3] = (img * 255 + 0.5).astype(np.uint8)
        rgba[..., 3] = np.where(alpha, 255, 0)
        save(rgba, od, state)

    # Foliage (scenekit k.foliage): R leaf, B needle, G which tree - js/foliage.js colours each tree for the season
    def leaves(path, mask, box=None):
        if not os.path.exists(path):
            return False
        lf = load(path, 'RGB')
        out = np.zeros(lf.shape[:2] + (4,), np.uint8)
        R, B = lf[..., 0], lf[..., 2]
        leaf, needle = mask & (R > 160), mask & (B > 160)
        tree = leaf | needle
        grass = mask & ~tree & (R > 32)                                  # scenekit marks grass R 64, still water B 64
        water = mask & ~tree & ~grass & (B > 32)
        on = tree | grass | water
        if not on.any():
            return False
        out[..., 0] = np.where(leaf, 255, np.where(grass, 64, 0))
        out[..., 2] = np.where(needle, 255, np.where(water, 64, 0))
        out[..., 1] = np.where(tree, (lf[..., 1].astype(np.int32) // 16) * 16 + 8, 0)   # written 8 + 16 * tree (mod 15)
        out[..., 3] = np.where(on, 255, 0)
        return out if box is None else out[box[1]:box[3], box[0]:box[2]]
    # What gives off light, alone (js/gpu.js blooms from it instead of guessing lamps from colour): the emission pass at
    # its strongest state's strength (a lamp by night), black and clear wherever nothing glows
    glow_k = max([(meta.get('stateOpts') or {}).get(s_, {}).get('emit', 1.0) for s_ in meta['lightStates']] or [1.0])

    def glow(e, mask, box=None):
        rgb = np.clip(e[..., :3].astype(np.float32) * glow_k, 0, 255).astype(np.uint8)
        on = mask & (rgb.max(axis=-1) > 8)
        if not on.any():
            return False
        out = np.zeros(e.shape[:2] + (4,), np.uint8)
        out[..., :3] = np.where(on[..., None], rgb, 0)
        out[..., 3] = np.where(on, 255, 0)
        return out if box is None else out[box[1]:box[3], box[0]:box[2]]
    base_glow = glow(emission, alpha)
    if base_glow is not False:
        save(base_glow, od, 'glow')
    else:
        for f in ('glow.png', 'glow.' + EXT):
            if os.path.exists(os.path.join(od, f)):
                os.remove(os.path.join(od, f))

    base_leaves = leaves(os.path.join(rd, 'leaf.png'), alpha)
    if base_leaves is not False:
        save(base_leaves, od, 'leaves')
    else:
        for f in ('leaves.png', 'leaves.' + EXT):
            if os.path.exists(os.path.join(od, f)):
                os.remove(os.path.join(od, f))

    # Swappable decor variants (scenekit k.variant): each rendered alone in
    # the room's light -> cropped lit image per state + depth
    variants = []
    for v in meta.get('variants', []):
        vd = os.path.join(rd, v['dir'])
        valb = load(os.path.join(vd, 'albedo.png'), 'RGBA')
        vemi = load(os.path.join(vd, 'emission.png'), 'RGBA')
        vids = load(os.path.join(vd, 'id.png'), 'RGB')
        va = valb[..., 3] >= 128
        bx0, by0, bx1, by1 = v['bbox']
        box = np.zeros(va.shape, bool)
        box[by0:by1, bx0:bx1] = True
        va &= box
        if not va.any():
            continue
        vdd = load16(os.path.join(vd, 'depth.png'))
        if vdd.ndim == 3:
            vdd = vdd[..., 0]
        vdepth = np.where(va, meta['zmin'] + vdd * (meta['zmax'] - meta['zmin']) + meta['camDot'], np.inf)
        ys, xs = np.nonzero(va)
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
        imgs = {}
        vground, vroof = part_kinds(vids, names)
        vline = toy_lines(vids, vdepth, va, vground, vroof)
        for state in meta['lightStates']:
            light = load16(os.path.join(vd, 'light_' + state + '.png'))
            img = finish(toon(valb, light, emit(state, vemi)), vids, vdepth, va, vline)
            rgba = np.zeros(valb.shape, np.uint8)
            rgba[..., :3] = (img * 255 + 0.5).astype(np.uint8)
            rgba[..., 3] = np.where(va, 255, 0)
            imgs[state] = rgba[y0:y1, x0:x1]
        imgs['leaves'] = leaves(os.path.join(vd, 'leaf.png'), va, (x0, y0, x1, y1))
        imgs['glow'] = glow(vemi, va, (x0, y0, x1, y1))
        imgs['lit'] = (vd, valb, vids, vline, vground, vroof, va) if meta.get('lit') and os.path.exists(os.path.join(vd, 'lit_sky.png')) else False
        variants.append((v, (x0, y0, x1, y1), imgs, vdepth[y0:y1, x0:x1]))

    # Packed depth (one range for the base and every variant)
    finite = [depth[np.isfinite(depth)]] + [vdp[np.isfinite(vdp)] for _, _, _, vdp in variants]
    finite = np.concatenate(finite)
    dmin, dmax = float(finite.min()) - 0.01, float(finite.max()) + 0.01

    def pack(dp):
        q = np.where(np.isfinite(dp), (dp - dmin) / (dmax - dmin) * 65534, 65535)
        q = np.clip(q + 0.5, 0, 65535).astype(np.uint32)
        out = np.zeros(dp.shape + (4,), np.uint8)
        out[..., 0] = q >> 8
        out[..., 1] = q & 255
        out[..., 3] = 255
        return out
    save(pack(depth), od, 'depth')

    layers = {}
    for v, (x0, y0, x1, y1), imgs, vdp in variants:
        ld = os.path.join(od, 'layers', v['slot'], v['key'])
        os.makedirs(ld, exist_ok=True)
        lv = imgs.pop('leaves', False)
        lg = imgs.pop('glow', False)
        vl = imgs.pop('lit', False)
        for state, rgba in imgs.items():
            save(rgba, ld, state)
        save(pack(vdp), ld, 'depth')
        layers.setdefault(v['slot'], {})[v['key']] = {'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0}
        if lv is not False:
            save(lv, ld, 'leaves')
            layers[v['slot']][v['key']]['leaves'] = 1
        if lg is not False:
            save(lg, ld, 'glow')
            layers[v['slot']][v['key']]['glow'] = 1
        if vl is not False:
            vd_, valb_, vids_, vline_, vg_, vr_, va_ = vl
            info = lit_pack(vd_, ld, len(meta['lit']['suns']), va_, valb_, vids_, vline_, vg_, vr_, box=(x0, y0, x1, y1),
                            water_ok='waterZ' not in meta)
            layers[v['slot']][v['key']]['lit'] = 1
            if info['lamps']:
                layers[v['slot']][v['key']]['litLamps'] = 1

    # Per-tile light on characters (probe plane at chest height)
    theta = math.radians(meta['theta'])
    ox, oy, ts = meta['originX'], meta['originY'], 32
    tiles = {}
    for state in meta['lightStates']:
        probe = load16(os.path.join(rd, 'probe_' + state + '.png'))[..., :3] * EXPOSURE
        grid = []
        for r in range(meta['rows']):
            row = []
            for c in range(meta['cols']):
                x = int(ox + (c + 0.5) * ts)
                y = int(oy + (r + 0.5 - meta['probeZ'] * math.cos(theta)) * ts)
                y = min(max(y, 0), probe.shape[0] - 1)
                L = probe[y, x]
                lum = float(L @ np.array([0.2126, 0.7152, 0.0722]))
                b = BANDS[0][1]
                for t, v in BANDS:
                    if lum >= t:
                        b = v
                ch = np.clip(L / max(lum, 1e-4), 0, 2.2)
                tint = 1 + (ch - 1) * TINT
                m = np.clip(b * tint * 1.15, 0.22, 1.25)
                row.append([round(float(v), 3) for v in m])
            grid.append(row)
        tiles[state] = grid

    water = shore(rd, od, meta, alpha) if 'waterZ' in meta else None

    lit = None
    if meta.get('lit') and os.path.exists(os.path.join(rd, 'lit_sky.png')):
        info = lit_pack(rd, od, len(meta['lit']['suns']), alpha, albedo, ids, base_line, ground, roof)
        lit = {'suns': [s_['u'] for s_ in meta['lit']['suns']], 'lamps': info['lamps'], 'base': meta['lit'].get('base')}
        if info['water']:
            lf = load(os.path.join(rd, 'leaf.png'), 'RGB').astype(int) if os.path.exists(os.path.join(rd, 'leaf.png')) else None
            still = alpha & (lf[..., 2] > 32) & (lf[..., 2] <= 160) & (lf[..., 0] <= 32) if lf is not None else np.zeros_like(alpha)
            lit.update(lit_refl(rd, od, still))
    else:
        for f in os.listdir(od):
            if f.startswith('lit_'):
                os.remove(os.path.join(od, f))

    out = {
        'width': meta['width'], 'height': meta['height'],
        'originX': meta['originX'], 'originY': meta['originY'],
        'theta': meta['theta'],
        'depthMin': dmin, 'depthMax': dmax,
        'states': meta['lightStates'],
        'tileLight': tiles,
        'ext': EXT,
    }
    if layers:
        out['layers'] = layers
    if base_leaves is not False:
        out['leaves'] = 1
    if base_glow is not False:
        out['glow'] = 1                               # glow.<ext>: what gives off light, alone (js/gpu.js)
    if water:
        out['water'] = water
    if lit:
        out['lit'] = lit                              # js/litscene.js relights the scene live from the lit_* passes
    if meta.get('cycle'):
        out['cycle'] = meta['cycle']                  # which state is day, dusk and night (js/scene.js blends them)
    out['rev'] = revision(od)
    json.dump(out, open(os.path.join(od, 'scene.json'), 'w'), separators=(',', ':'))
    print('wrote', od, out['width'], 'x', out['height'], 'depth', round(dmin, 2), round(dmax, 2))


if __name__ == '__main__':
    main()
