#!/usr/bin/env python3
"""Look Book 2: pack chibi_chars.py renders into sprite sheets, painting Stardew-style faces on as it goes.

  python3 chibi_post.py <frames dir> <out png> [--face A|B|C] [--hair #hex] [--friendly 0|1] [--blush 0|1]

Line work and outline as the game's sprites_post.py. Then, unless the render is the 'today' variant, a face is painted
in pixels from the anchors chibi_chars.py projected for every frame: eyes with a catch-light, brows, a mouth, blush —
only onto the face's own pixels (so hats, fringes and visors keep covering it), only on the side of the head facing
the camera. idle3 is a blink (the game player shows it now and then).
"""
import json
import os
import sys

import numpy as np
from PIL import Image

DIRS = ['down', 'right', 'up', 'left']
COLS = [f'idle{i}' for i in range(4)] + [f'walk{i}' for i in range(8)]
OUTLINE = np.array([11, 10, 24], np.uint8)
DEPTH_EPS = 40
MIRROR = os.environ.get('CHIBI_MIRROR', '0') == '1'


def hexc(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def process(c, ids, dep):
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
        hit = op[p] & op[q] & (idk[p] != idk[q]) & (dep[q] < dep[p] - DEPTH_EPS)
        line[p] |= hit
    rgb = out[..., :3].astype(np.float32)
    dark = rgb * 0.5 + OUTLINE.astype(np.float32) * 0.5
    out[line, :3] = dark[line].astype(np.uint8)
    ring = np.zeros((h, w), bool)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        sh = np.zeros((h, w), bool)
        sh[max(0, dy):h + min(0, dy), max(0, dx):w + min(0, dx)] = op[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)]
        ring |= sh
    ring &= ~op
    out[ring, :3] = OUTLINE
    out[ring, 3] = 255
    return out, idk, line


# Face templates: (dx, dy, colour key) relative to the anchor pixel. Keys: D eye, W catch-light, B brow, M mouth,
# P blush (blended), L lid (closed eye)
FACES = {
    # 32 px a tile
    1: {
        'A': {'eye': [(0, -1, 'D'), (0, 0, 'D')], 'eyeL': None, 'shut': [(0, 0, 'L')],
              'brow': [], 'mouth': [(0, 0, 'M')], 'smile': [(0, 0, 'M')], 'blush': [(0, 0, 'P')]},
        'B': {'eye': [(0, -1, 'W'), (1, -1, 'D'), (0, 0, 'D'), (1, 0, 'D')], 'shut': [(0, 0, 'L'), (1, 0, 'L')],
              'brow': [(0, 0, 'B'), (1, 0, 'B')], 'mouth': [(0, 0, 'M'), (1, 0, 'M')], 'smile': [(-1, -1, 'M'), (0, 0, 'M'), (1, 0, 'M'), (2, -1, 'M')],
              'blush': [(0, 0, 'P'), (1, 0, 'P')]},
        'C': {'eye': [(0, -1, 'W'), (1, -1, 'D'), (0, 0, 'D'), (1, 0, 'D'), (0, 1, 'D'), (1, 1, 'D')], 'shut': [(0, 1, 'L'), (1, 1, 'L')],
              'brow': [(0, 0, 'B'), (1, 0, 'B')], 'mouth': [(0, 0, 'M'), (1, 0, 'M')], 'smile': [(-1, -1, 'M'), (0, 0, 'M'), (1, 0, 'M'), (2, -1, 'M')],
              'blush': [(0, 0, 'P'), (1, 0, 'P')]},
    },
    # 48 px a tile
    1.5: {
        'A': {'eye': [(0, -2, 'D'), (0, -1, 'D'), (0, 0, 'D'), (1, -1, 'D'), (1, 0, 'D'), (1, -2, 'W')], 'shut': [(0, 0, 'L'), (1, 0, 'L')],
              'brow': [(0, 0, 'B'), (1, 0, 'B')], 'mouth': [(0, 0, 'M'), (1, 0, 'M')], 'smile': [(-1, -1, 'M'), (0, 0, 'M'), (1, 0, 'M'), (2, -1, 'M')],
              'blush': [(-1, 0, 'P'), (0, 0, 'P'), (1, 0, 'P')]},
        'B': {'eye': [(0, -2, 'W'), (1, -2, 'D'), (0, -1, 'D'), (1, -1, 'D'), (0, 0, 'D'), (1, 0, 'D')], 'shut': [(-1, 0, 'L'), (0, 0, 'L'), (1, 0, 'L')],
              'brow': [(-1, 0, 'B'), (0, 0, 'B'), (1, 0, 'B')], 'mouth': [(0, 0, 'M'), (1, 0, 'M')],
              'smile': [(-1, -1, 'M'), (0, 0, 'M'), (1, 0, 'M'), (2, -1, 'M')], 'blush': [(-1, 0, 'P'), (0, 0, 'P'), (1, 0, 'P')]},
        'C': {'eye': [(0, -3, 'W'), (1, -3, 'D'), (0, -2, 'D'), (1, -2, 'D'), (0, -1, 'D'), (1, -1, 'D'), (0, 0, 'D'), (1, 0, 'D'), (-1, -1, 'D'), (-1, -2, 'D')],
              'shut': [(-1, 0, 'L'), (0, 0, 'L'), (1, 0, 'L')],
              'brow': [(-1, 0, 'B'), (0, 0, 'B'), (1, 0, 'B')], 'mouth': [(0, 0, 'M'), (1, 0, 'M')],
              'smile': [(-1, -1, 'M'), (0, 0, 'M'), (1, 0, 'M'), (2, -1, 'M')], 'blush': [(-1, 0, 'P'), (0, 0, 'P'), (1, 0, 'P')]},
    },
}


def paint_face(img, idk, line, anchors, scale, style, cols, blink, friendly, blush):
    h, w = idk.shape
    a = anchors
    if not a:
        return img
    T = FACES[scale][style]
    # the face's own pixels: the id under the face centre (or under an eye)
    key = None
    for nm in ('centre', 'nose', 'eyeL', 'eyeR'):
        x, y, f = a[nm]
        xi, yi = int(np.floor(x)), int(np.floor(y))
        if f > 0.1 and 0 <= xi < w and 0 <= yi < h and img[yi, xi, 3] > 0:
            key = idk[yi, xi]
            break
    if key is None:
        return img
    face = (idk == key) & (img[..., 3] > 0)
    out = img.copy()

    def put(px, py, ck):
        if not (0 <= px < w and 0 <= py < h) or not face[py, px]:
            return
        c = cols[ck]
        if ck == 'P':
            out[py, px, :3] = (out[py, px, :3].astype(np.float32) * 0.45 + c * 0.55).astype(np.uint8)
        else:
            out[py, px, :3] = c.astype(np.uint8)

    def stamp(name, tmpl, mirror=False, need=0.25):
        x, y, f = a[name]
        if f < need:
            return
        xi, yi = int(np.floor(x)), int(np.floor(y))
        for dx, dy, ck in tmpl:
            put(xi + (-dx if mirror else dx), yi + dy, ck)

    eye = T['shut'] if blink else T['eye']
    # the left eye is drawn mirrored so a 2-px eye sits symmetrically (catch-lights both toward the upper left — the key light)
    # a 2-px eye sits over the anchor's pixel and the one to its left; the catch-light on the upper left (the key light),
    # or toward the outside of each eye with CHIBI_MIRROR=1
    wide = max(d[0] for d in eye)
    stamp('eyeL', [(dx - wide, dy, ck) for dx, dy, ck in eye])
    stamp('eyeR', [(-dx, dy, ck) for dx, dy, ck in eye] if MIRROR else [(dx - wide, dy, ck) for dx, dy, ck in eye])
    if T['brow']:
        stamp('browL', T['brow'], need=0.35)
        stamp('browR', [(dx - (1 if len(T['brow']) > 1 else 0), dy, ck) for dx, dy, ck in T['brow']], need=0.35)
    mouth = T['smile'] if friendly else T['mouth']
    mx = a['mouth']
    if mx[2] > 0.35:
        off = -1 if len(set(d[0] for d in mouth)) > 1 and mouth is T['mouth'] else 0
        stamp('mouth', [(dx + off, dy, ck) for dx, dy, ck in mouth], need=0.35)
    elif mx[2] > 0.12:                         # in profile: a single pixel at the front of the face
        stamp('mouth', [(0, 0, 'M')], need=0.12)
    if blush:
        stamp('blushL', T['blush'], need=0.3)
        stamp('blushR', [(dx - (1 if len(T['blush']) > 1 else 0), dy, ck) for dx, dy, ck in T['blush']], need=0.3)
    return out


def main():
    frames, outp = sys.argv[1], sys.argv[2]
    opt = {'face': 'C', 'hair': None, 'friendly': '1', 'blush': '0', 'eye': '#2a1820'}
    i = 3
    while i < len(sys.argv):
        opt[sys.argv[i].lstrip('-')] = sys.argv[i + 1]; i += 2
    meta = {}
    ap = os.path.join(frames, 'anchors.json')
    if os.path.exists(ap):
        meta = json.load(open(ap))
    anchors = meta.get('anchors', {})
    scale = meta.get('scale', 1.0)
    scale = 1.5 if scale > 1.2 else 1
    variant = meta.get('variant', 'today')
    hair = hexc(opt['hair'] or meta.get('hair') or '#2a1a14')
    cols = {'D': hexc(opt['eye']), 'W': hexc('#ffffff'), 'B': (hair * 0.75).clip(0, 255), 'M': hexc('#8a3640'),
            'P': hexc('#f0807c'), 'L': hexc(opt['eye']) * 0.9 + hexc('#6a4038') * 0.1}
    vs = sorted(d[len('color_'):] for d in os.listdir(frames) if d.startswith('color_'))
    v = vs[0]
    sheet = None
    for r, d in enumerate(DIRS):
        for col, f in enumerate(COLS):
            tag = f'{d}_{f}.png'
            c = np.array(Image.open(os.path.join(frames, 'color_' + v, tag)).convert('RGBA'))
            ids = np.array(Image.open(os.path.join(frames, 'id', tag)).convert('RGB')).astype(np.int64)
            dep = np.array(Image.open(os.path.join(frames, 'depth', tag))).astype(np.int64)
            if dep.ndim == 3:
                dep = dep[..., 0]
            img, idk, line = process(c, ids, dep)
            if variant != 'today' and tag in anchors:
                img = paint_face(img, idk, line, anchors[tag], scale, opt['face'], cols, f == 'idle3',
                                 opt['friendly'] == '1', opt['blush'] == '1')
            fh, fw = img.shape[:2]
            if sheet is None:
                sheet = np.zeros((fh * len(DIRS), fw * len(COLS), 4), np.uint8)
            sheet[r * fh:(r + 1) * fh, col * fw:(col + 1) * fw] = img
    os.makedirs(os.path.dirname(os.path.abspath(outp)), exist_ok=True)
    Image.fromarray(sheet, 'RGBA').save(outp, optimize=True)
    print(outp, sheet.shape[1], 'x', sheet.shape[0])


if __name__ == '__main__':
    main()
