"""Fast look at the real Brambleford crop with either kit: builds the whole village (as the scene script does), then
renders only the look book's frame: flat colour and one golden sun with the sky, composed to a PNG.

  ~/BVENV/bin/python village/preview_crop.py <out.png> [today|richer]
"""
import os
import runpy
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
OUT, WHICH = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'richer')
import housekit as HK  # noqa: E402
import scenekit  # noqa: E402
if WHICH == 'richer':
    import richer_dress  # noqa: E402,F401   (installs the kit and the street life, like richer.py)
C0, R0, C1, R1 = 2.0, 4.2, 17.0, 12.64375


def render(self, out, *a, **kw):
    for fn in self.later:
        fn()
    self.later = []
    self._camera()
    sc = self.scene
    TS = scenekit.TS
    ox, oy = self.origin
    x0, x1 = int(round(ox + C0 * TS)), int(round(ox + C1 * TS))
    y0, y1 = int(round(oy + R0 * TS)), int(round(oy + R1 * TS))
    sc.render.use_border = True
    sc.render.use_crop_to_border = True
    sc.render.border_min_x, sc.render.border_max_x = x0 / self.resx, x1 / self.resx
    sc.render.border_min_y, sc.render.border_max_y = 1 - y1 / self.resy, 1 - y0 / self.resy
    self._world_default = ('#a8c4e0', 0.85)
    sc.world.use_nodes = True
    self._sky(None)
    self._assign('albedo'); self._settings(1); self._render('/tmp/claude-0/pvc_alb.png')
    for L in self.lights:
        L['obj'].hide_render = True
    self.sun((0.62, 0.42, -0.62), '#ffe2b0', 4.2, angle=3.0)
    self._assign('light', {})
    for L in self.lights[:-1]:
        L['obj'].hide_render = True
    self._settings(12, raw=True, sixteen=True); self._render('/tmp/claude-0/pvc_light.png')
    print("passes written", flush=True); raise SystemExit(0)
    import numpy as np
    from PIL import Image
    a = np.array(Image.open('/tmp/claude-0/pvc_alb.png').convert('RGBA')).astype(np.float32) / 255
    L = np.array(Image.open('/tmp/claude-0/pvc_light.png')).astype(np.float32)
    L = (L / (65535.0 if L.max() > 255 else 255.0))[..., :3] * 4.0
    lum = L @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    b = 1.1 * (1 - np.exp(-lum[..., None] * 1.2))
    col = np.clip(a[..., :3] * b * 255, 0, 255).astype(np.uint8)
    Image.fromarray(col).resize((col.shape[1] * 3, col.shape[0] * 3), Image.NEAREST).save(OUT)
    print('preview', OUT, col.shape, flush=True)
    raise SystemExit(0)


scenekit.Kit.render = render
scenekit.apply_world = lambda *a, **k: None
SCENE = '/home/user/becknology/tools/bridge-art/scenes/verdance_village.py'
sys.argv = [SCENE, '/tmp/claude-0/none']
runpy.run_path(SCENE, run_name='__main__')
