#!/usr/bin/env python3
"""Turn Blender sprite renders (see pilot.py) into game sprite sheets.

  python3 tools/bridge-art/sprites_post.py pilot /tmp/pilot-frames [OUTDIR]

For every frame:
  • line work — a pixel becomes a darker line when a neighbouring pixel
    belongs to a different body part that is in front of it (from the id +
    depth passes), so overlapping parts read as separate shapes
  • outline — a 1px dark outline is drawn around the silhouette
  • the face — painted in pixels (eyes with a catch-light, brows, a mouth or
    a smile, blush) where characters.py's anchors.json says the face's points
    are, only onto the face's own pixels (so hats, fringes, beards and shades
    still cover it) and only where they face the camera; idle3 blinks

Frames are packed into one sheet per colour variant:
  rows = down, right, up, left;  columns = idle 0-3, walk 0-7
written to apps/bridge/assets/characters/<name>-<variant>.png
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUTDIR = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'characters')
DIRS = ['down', 'right', 'up', 'left']
COLS = [f'idle{i}' for i in range(4)] + [f'walk{i}' for i in range(8)]
OUTLINE = np.array([11, 10, 24], np.uint8)
DEPTH_EPS = 40  # 16-bit depth counts — ignore near-coplanar neighbours

# ---- the painted face ------------------------------------------------------------------------------------------
# None of these is a key colour (characters.py KEYS / XKEYS) or a line-work copy of one, so js/look.js and
# js/crowd.js leave them be; the brows are the hair's deep tone (a key on key sheets: they recolour with the hair).
WHITE = np.array([255, 255, 255], np.float32)          # the catch-light, upper left (where the key light is)
MOUTH = np.array([138, 54, 64], np.float32)
PINK = np.array([240, 128, 124], np.float32)           # blush: the skin under it flushed toward this
LIDMIX = np.array([106, 64, 56], np.float32)
EYE_PULL = 0.5      # each eye drawn this many px in toward the middle (so the pair sits evenly on the pixel grid)


def hexc(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def paint_face(out, face, a, o, blink):
    """Paint the face onto out (h × w × 4) where face (h × w bool) is the head's own pixels. a: this frame's points
    {name: [x, y, facing]}; o: characters.py's face options (anchors.json)."""
    h, w = face.shape
    top, rest = hexc(o['eye'][0]), hexc(o['eye'][1])
    lid = rest * 0.9 + LIDMIX * 0.1
    brow = hexc(o['brows'])

    def on(x, y):
        return 0 <= x < w and 0 <= y < h and face[y, x]

    def stamp(px, need=1):
        """Paint [(x, y, colour)] where it's face — if at least `need` of them are (no lone stray pixels)."""
        if sum(on(x, y) for x, y, _ in px) < need:
            return
        for x, y, c in px:
            if on(x, y):
                if c is PINK:
                    out[y, x, :3] = hexc(o['xblush']) if o['key'] else out[y, x, :3] * 0.45 + PINK * 0.55
                else:
                    out[y, x, :3] = c

    mid = a['centre'][0]
    # The rows hang off the chin: the last pixel row the head covers (a pixel is the head's if its centre is above the
    # chin's edge). From the eyes to the chin is under 4 px, so rounding each point on its own would put the mouth off
    # the chin, or touching the eyes, in some frames. Eyes m-1..m+1, brows m-2, blush m+1, the smile m+2..m+3 (the chin).
    # (No chin — the head turned aside, tumbling, or tipped so far the chin isn't ~3.5 px under the eyes — and the rows
    # hang off the eyes instead.)
    ey = (a['eyeL'][1] + a['eyeR'][1]) / 2
    if 'chin' in a and 2.5 <= a['chin'][1] - ey <= 4.5:
        m = int(np.ceil(a['chin'][1] - 0.5)) - 4
    else:
        m = int(np.floor(ey))
    if o['blush'] and o['mouth']:                            # the cheeks first: the eyes go over them
        for side in 'LR':
            x, y, f = a['blush' + side]
            if f >= 0.3 and a['eye' + side][2] >= 0.5:      # a cheek beside an eye that's facing us
                c = round(x)
                stamp([(c - 1, m + 1, PINK), (c, m + 1, PINK)], 2)
    if o['mouth']:
        x, y, f = a['mouth']
        c, r = round(x), m + 3
        if f > 0.35:
            if on(c - 1, r) and on(c, r):                    # the middle has to show (no corners on their own)
                stamp([(c - 2, r - 1, MOUTH), (c - 1, r, MOUTH), (c, r, MOUTH), (c + 1, r - 1, MOUTH)] if o['smile'] else
                      [(c - 1, r, MOUTH), (c, r, MOUTH)], 2)
        elif f > 0.12:                                       # turned away: a pixel at the front of the face
            stamp([(int(np.floor(x)), int(np.floor(y)), MOUTH)])
    if not o['eyes']:                                        # shades, a visor band: nothing to see
        return
    for side in 'LR':
        x, y, f = a['eye' + side]
        if f >= 0.5:                                         # facing us: 2 wide, 3 tall, the catch-light top left
            c, r = round(x + EYE_PULL * np.sign(mid - x)), m
            if blink:
                stamp([(c - 1, r + 1, lid), (c, r + 1, lid)], 2)
            else:
                eye = [(c, r - 1, top), (c - 1, r, rest), (c, r, rest), (c - 1, r + 1, rest), (c, r + 1, rest)]
                if on(c - 1, r):
                    eye.append((c - 1, r - 1, WHITE))
                stamp(eye, 3)
            if a['brow' + side][2] >= 0.35:
                stamp([(c - 1, r - 2, brow), (c, r - 2, brow)], 2)
        elif f >= 0.2:                                       # in profile: one dark pixel wide, two tall
            c, r = int(np.floor(x)), int(np.floor(y))
            stamp([(c, r + 1, lid)] if blink else [(c, r, rest), (c, r + 1, rest)], 1 if blink else 2)


def process(color_path, id_path, depth_path, face=None):
    """One frame: line work, outline and (face: (anchors.json, this frame's points, blink)) the painted face."""
    c = np.array(Image.open(color_path).convert('RGBA'))
    ids = np.array(Image.open(id_path).convert('RGB')).astype(np.int32)
    idk = (ids[..., 0] << 16) | (ids[..., 1] << 8) | ids[..., 2]
    dep = np.array(Image.open(depth_path)).astype(np.int64)
    if dep.ndim == 3:
        dep = dep[..., 0]
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
        sh[max(0, dy):h + min(0, dy), max(0, dx):w + min(0, dx)] = \
            op[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)]
        ring |= sh
    ring &= ~op
    out[ring, :3] = OUTLINE
    out[ring, 3] = 255

    if face:
        meta, pts, blink = face
        own = op & (np.abs(ids - np.array(meta['faceId'])).max(-1) <= 2)     # the head's own pixels (its id)
        if own.any():
            paint_face(out, own, pts, meta, blink)
    return out


def main():
    name, frames = sys.argv[1], sys.argv[2]
    outdir = sys.argv[3] if len(sys.argv) > 3 else OUTDIR
    os.makedirs(outdir, exist_ok=True)
    variants = sorted(os.path.basename(p)[len('color_'):] for p in glob.glob(os.path.join(frames, 'color_*')))
    cols = COLS
    if os.path.exists(os.path.join(frames, 'cols.json')):        # a sheet of its own columns (attacks.py)
        cols = json.load(open(os.path.join(frames, 'cols.json')))
    meta = None
    if os.path.exists(os.path.join(frames, 'anchors.json')):     # where the face is (characters.py face_write)
        meta = json.load(open(os.path.join(frames, 'anchors.json')))
    for v in variants:
        sheet = None
        for r, d in enumerate(DIRS):
            for col, f in enumerate(cols):
                tag = f'{d}_{f}.png'
                pts = meta and meta['anchors'].get(tag)
                img = process(os.path.join(frames, 'color_' + v, tag),
                              os.path.join(frames, 'id', tag),
                              os.path.join(frames, 'depth', tag),
                              (meta, pts, f == 'idle3') if pts else None)
                fh, fw = img.shape[:2]
                if sheet is None:
                    sheet = np.zeros((fh * len(DIRS), fw * len(cols), 4), np.uint8)
                sheet[r * fh:(r + 1) * fh, col * fw:(col + 1) * fw] = img
        path = os.path.join(outdir, f'{name}.png' if v == 'key' else f'{name}-{v}.png')   # key: the pilot (js/look.js recolours it)
        Image.fromarray(sheet, 'RGBA').save(path, optimize=True)
        print(path, sheet.shape[1], 'x', sheet.shape[0])


if __name__ == '__main__':
    main()
