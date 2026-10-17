#!/usr/bin/env python3
"""Postcard step 4: pack the side view for the page (tools/pack.py, plus the horizon and the anchors) and bake the move.

  python3 postcard/pack_all.py      (from lookbook2/)
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(ROOT, 'renders', 'postcard')
for ts in (32, 48):
    src, dst = os.path.join(R, 'side-%d' % ts), os.path.join(ROOT, 'assets', 'postcard-side-%d' % ts)
    if os.path.exists(os.path.join(src, 'render.json')):
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'pack.py'), src, dst], check=True)
        rj = json.load(open(os.path.join(src, 'render.json')))
        m = json.load(open(os.path.join(dst, 'meta.json')))
        m['horizon'] = rj['horizon']
        m['cam'] = rj.get('cam')
        json.dump(m, open(os.path.join(dst, 'meta.json'), 'w'), indent=1)
        json.dump(rj.get('anchors', {}), open(os.path.join(dst, 'anchors.json'), 'w'), indent=1)
    mv = os.path.join(R, 'move-%d' % ts)
    if os.path.exists(os.path.join(mv, 'frames.json')):
        subprocess.run([sys.executable, os.path.join(ROOT, 'postcard', 'move_bake.py'), mv,
                        os.path.join(ROOT, 'assets', 'postcard-move-%d' % ts), '--steps', '9' if ts == 32 else '14'], check=True)
print('packed the postcard')
