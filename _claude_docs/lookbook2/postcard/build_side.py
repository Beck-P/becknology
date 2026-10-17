"""Postcard step 1: build the Verdance farm (the repo's scene script, unchanged) and save it as a .blend with every
part's pass metadata on its object, so the side-view renders can reopen it in seconds instead of rebuilding (~11 min).

  ~/BVENV/bin/python build_side.py <scene script> <out.blend>
"""
import json
import os
import runpy
import sys

REPO = '/home/user/becknology'
sys.path.insert(0, os.path.join(REPO, 'tools', 'bridge-art'))
import bpy  # noqa: E402
import scenekit  # noqa: E402

SCENE, OUT = sys.argv[1], os.path.abspath(sys.argv[2])
scenekit.apply_world = lambda *a, **k: None


def save(self, out, *a, **k):
    for fn in self.later:
        fn()
    self.later = []
    for p in self.parts:
        d = {k2: v for k2, v in p.items() if k2 not in ('obj', 'var')}
        d['_var'] = p['var'] is not None
        p['obj']['lk_part'] = json.dumps(d, default=lambda v: list(v) if isinstance(v, tuple) else str(v))
    for L in self.lights:
        d = {k2: v for k2, v in L.items() if k2 not in ('obj', 'var')}
        d['_var'] = L['var'] is not None
        L['obj']['lk_light'] = json.dumps(d, default=str)
    sc = self.scene
    sc['lk_kit'] = json.dumps({'cols': self.cols, 'rows': self.rows, 'mt': self.mt, 'mb': self.mb, 'mx': self.mx,
                               'water_z': self.water_z, 'pid_names': self.pid_names})
    bpy.ops.wm.save_as_mainfile(filepath=OUT, compress=False)
    print('BUILD saved', OUT, len(self.parts), 'parts', len(self.lights), 'lights', flush=True)
    raise SystemExit(0)


scenekit.Kit.render = save
sys.argv = [SCENE, '/tmp/_unused']
runpy.run_path(SCENE, run_name='__main__')
