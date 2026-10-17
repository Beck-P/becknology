"""Look Book 2: render a village with the richer house kit (housekit.py) and a lived-in main street.

  ~/BVENV/bin/python village/richer.py <scene script> <out dir> <lookkit args...>
  (village/render_richer.sh holds one of the shared Blender slots while it runs)

Installs housekit (every W.house, shop window and main street the scene builds comes out richer), adds Brambleford's
street life (a walled garden with an apple tree between the Crusty Loaf and the Hayloft, the pump, flower tubs, crates)
just before the render, then runs tools/lookkit.py exactly as render.sh would. The repo isn't touched.
"""
import os
import runpy
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import housekit as HK  # noqa: E402
import scenekit  # noqa: E402
import assets_village as V  # noqa: E402

LK = os.path.join(HERE, '..', 'tools', 'lookkit.py')
HK.install()


def brambleford(k):
    """The main street's life, in the stretch the look book frames (the Crusty Loaf to the Hayloft)."""
    HK.garden(k, 8.0, 9.2, 6.4, 10.05)
    HK.pump(k, 8.6, 10.34)
    HK.tub(k, 3.5, 10.5)
    HK.tub(k, 10.05, 10.5)
    HK.tub(k, 16.85, 10.5)
    V.crates(k, 2.3, 10.5)
    HK.barrels(k, 17.9, 9.3)


_init = scenekit.Kit.__init__


def _kit_init(self, cols, rows, *a, **kw):
    _init(self, cols, rows, *a, **kw)
    if (cols, rows) == (46, 34):                      # Brambleford (scenes/verdance_village.py)
        self.later.append(lambda: brambleford(self))  # first in line: placed before the meadow grows round it


scenekit.Kit.__init__ = _kit_init
sys.argv = [LK] + sys.argv[1:]
runpy.run_path(LK, run_name='__main__')
