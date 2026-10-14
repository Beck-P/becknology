"""Shade and crop the cutscene sprites rendered by cine_sprites.py.

  python3 tools/bridge-art/cine_post.py RENDER_DIR apps/bridge/assets/cine

Each sprite goes through scene_post's toon shading, is cropped to its
pixels, and its anchors (shifted by the crop) land in cine.json.
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
rd, od = sys.argv[1], sys.argv[2]
os.makedirs(od, exist_ok=True)
manifest_path = os.path.join(od, 'cine.json')
manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
for name in sorted(os.listdir(rd)):
    src = os.path.join(rd, name)
    if not os.path.exists(os.path.join(src, 'render.json')):
        continue
    tmp = os.path.join(rd, '_post_' + name)
    subprocess.run([sys.executable, os.path.join(HERE, 'scene_post.py'), src, tmp], check=True, stdout=subprocess.DEVNULL)
    im = Image.open(os.path.join(tmp, 'full.png')).convert('RGBA')
    a = np.array(im)[..., 3]
    ys, xs = np.nonzero(a)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    im.crop((x0, y0, x1, y1)).save(os.path.join(od, name + '.png'), optimize=True)
    meta = json.load(open(os.path.join(src, 'render.json')))
    manifest[name] = {'w': int(x1 - x0), 'h': int(y1 - y0),
                      'anchors': {k: [round(v[0] - x0, 1), round(v[1] - y0, 1)] for k, v in meta.get('anchors', {}).items()}}
    print(name, manifest[name])
open(manifest_path, 'w').write(json.dumps(manifest, indent=1) + '\n')
