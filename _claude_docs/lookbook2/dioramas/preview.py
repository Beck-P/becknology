"""Quick look at a diorama while modelling it: flat colour × one sun and the sky, one crop, one size, in a minute.

  tools/slot.sh ~/BVENV/bin/python dioramas/preview.py dioramas/millpond_farm.py out.png c0 r0 c1 r1 [ts] [samples]
"""
import os
import runpy
import sys

import numpy as np

REPO = os.environ.get('BRIDGE_REPO', '/home/user/becknology')
sys.path.insert(0, os.path.join(REPO, 'tools', 'bridge-art'))
import bpy  # noqa: E402
import scenekit  # noqa: E402

SCENE, OUT = sys.argv[1], os.path.abspath(sys.argv[2])
CROP = [float(v) for v in sys.argv[3:7]]
scenekit.TS = int(sys.argv[7]) if len(sys.argv) > 7 else 32
SAMPLES = int(sys.argv[8]) if len(sys.argv) > 8 else 16
scenekit.apply_world = lambda *a, **k: None


def pv_render(self, out, **kw):
    for fn in self.later:
        fn()
    self.later = []
    self._world_default = ('#000000', 0.0)
    TS = scenekit.TS
    self._camera()
    sc = self.scene
    sc.world.use_nodes = True
    ox, oy = self.origin
    c0, r0, c1, r1 = CROP
    x0, x1 = max(0, int(round(ox + c0 * TS))), min(self.resx, int(round(ox + c1 * TS)))
    y0, y1 = max(0, int(round(oy + r0 * TS))), min(self.resy, int(round(oy + r1 * TS)))
    sc.render.use_border = True
    sc.render.use_crop_to_border = True
    sc.render.border_min_x, sc.render.border_max_x = x0 / self.resx, x1 / self.resx
    sc.render.border_min_y, sc.render.border_max_y = 1 - y1 / self.resy, 1 - y0 / self.resy
    tmp = OUT + '.d'
    os.makedirs(tmp, exist_ok=True)
    self._sky({'_world': ('#000000', 0.0)})
    self._assign('albedo'); self._settings(1); self._render(os.path.join(tmp, 'albedo.png'))
    sun = self.sun((0.7, 0.42, -0.5), '#ffffff', 3.0, angle=2.0, group='_pv')
    L = self.lights[-1]
    self._sky({'_world': ('#ffffff', 0.8)})
    self._assign('light', {'_emit': 0.0})
    for l in self.lights:
        l['obj'].hide_render = l is not L
    for p in self.parts:
        if p['emit'] and p['albedo'] != 'HOLDOUT':
            p['obj'].data.materials[0] = self._white_diffuse()
    self._settings(SAMPLES, raw=True, sixteen=True)
    self._render(os.path.join(tmp, 'light.png'))
    import subprocess
    subprocess.run(['python3', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pv_compose.py'), tmp, OUT])
    raise SystemExit(0)


scenekit.Kit.render = pv_render
sys.argv = [SCENE, OUT + '.unused']
runpy.run_path(SCENE, run_name='__main__')
