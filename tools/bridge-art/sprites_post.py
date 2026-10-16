#!/usr/bin/env python3
"""Turn Blender sprite renders (see pilot.py) into game sprite sheets.

  python3 tools/bridge-art/sprites_post.py pilot /tmp/pilot-frames [OUTDIR]

For every frame:
  • line work — a pixel becomes a darker line when a neighbouring pixel
    belongs to a different body part that is in front of it (from the id +
    depth passes), so overlapping parts read as separate shapes
  • outline — a 1px dark outline is drawn around the silhouette

Frames are packed into one sheet per colour variant:
  rows = down, right, up, left;  columns = idle 0-3, walk 0-7
written to apps/bridge/assets/characters/<name>-<variant>.png
"""
import glob
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


def process(color_path, id_path, depth_path):
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
    return out


def main():
    name, frames = sys.argv[1], sys.argv[2]
    outdir = sys.argv[3] if len(sys.argv) > 3 else OUTDIR
    os.makedirs(outdir, exist_ok=True)
    variants = sorted(os.path.basename(p)[len('color_'):] for p in glob.glob(os.path.join(frames, 'color_*')))
    for v in variants:
        sheet = None
        for r, d in enumerate(DIRS):
            for col, f in enumerate(COLS):
                tag = f'{d}_{f}.png'
                img = process(os.path.join(frames, 'color_' + v, tag),
                              os.path.join(frames, 'id', tag),
                              os.path.join(frames, 'depth', tag))
                fh, fw = img.shape[:2]
                if sheet is None:
                    sheet = np.zeros((fh * len(DIRS), fw * len(COLS), 4), np.uint8)
                sheet[r * fh:(r + 1) * fh, col * fw:(col + 1) * fw] = img
        path = os.path.join(outdir, f'{name}.png' if v == 'key' else f'{name}-{v}.png')   # key: the pilot (js/look.js recolours it)
        Image.fromarray(sheet, 'RGBA').save(path, optimize=True)
        print(path, sheet.shape[1], 'x', sheet.shape[0])


if __name__ == '__main__':
    main()
