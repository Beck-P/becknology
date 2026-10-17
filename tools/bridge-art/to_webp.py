#!/usr/bin/env python3
"""Turn rendered scenes' PNGs into lossless WebP, as scene_post writes them now.

  python3 tools/bridge-art/to_webp.py [--skip id,id] [id ...]

Every image of a scene (its states, depth, leaves, shore and its layers'
images) is written as WebP (lossless, exact: every pixel as it was, transparent
ones included), read back and checked against the PNG, and only then is the PNG
removed; scene.json gets "ext": "webp" and a new rev. With no ids, every scene
in apps/bridge/assets/scenes that isn't WebP yet. A scene whose images don't
all come back identical is left as it was.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scene_post import revision  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'apps', 'bridge', 'assets', 'scenes')


def convert(d):
    meta_path = os.path.join(d, 'scene.json')
    meta = json.load(open(meta_path))
    if meta.get('ext') == 'webp':
        return None
    pngs = [os.path.join(r, f) for r, _, fs in os.walk(d) for f in fs if f.endswith('.png')]
    before = sum(os.path.getsize(p) for p in pngs)
    made = []
    for p in pngs:
        im = Image.open(p)
        im.load()
        w = p[:-4] + '.webp'
        mode = 'RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB'
        src = im.convert(mode)
        src.save(w, 'WEBP', lossless=True, method=4, exact=True)
        made.append(w)
        back = Image.open(w).convert(mode)
        if back.size != src.size or not np.array_equal(np.asarray(back), np.asarray(src)):
            for m in made:
                os.remove(m)
            print('  !! not identical, left as PNG:', os.path.relpath(p, d))
            return False
    for p in pngs:
        os.remove(p)
    meta['ext'] = 'webp'
    meta['rev'] = revision(d)
    json.dump(meta, open(meta_path, 'w'), separators=(',', ':'))
    after = sum(os.path.getsize(m) for m in made)
    return before, after


def main():
    args = sys.argv[1:]
    skip = set()
    if '--skip' in args:
        i = args.index('--skip')
        skip = set(args[i + 1].split(','))
        del args[i:i + 2]
    ids = args or sorted(x for x in os.listdir(ROOT) if os.path.exists(os.path.join(ROOT, x, 'scene.json')))
    total = [0, 0]
    for sid in ids:
        if sid in skip:
            continue
        r = convert(os.path.join(ROOT, sid))
        if r:
            total[0] += r[0]
            total[1] += r[1]
            print('%-28s %6d KB -> %6d KB' % (sid, r[0] // 1024, r[1] // 1024), flush=True)
    print('all: %d KB -> %d KB' % (total[0] // 1024, total[1] // 1024))


if __name__ == '__main__':
    main()
