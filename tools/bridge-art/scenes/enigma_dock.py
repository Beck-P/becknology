"""Enigma Station, Docking Bay 3 — Blender scene (world id "enigma-dock").

  BVENV/bin/python tools/bridge-art/scenes/enigma_dock.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/enigma-dock

Where the skiff docks at Enigma: a hangar in the station's hull whose back
is open to space behind a containment field (drawn live by js/worlds/
enigma.js, with the ringed giant turning beyond it). The skiff glides in
through the field and settles into a clamp cradle; the crew's old tug lies
gutted in Berth 2 under a gantry; cargo, a cargo loader, fuel cells, the
raised control booth, a rack of EVA suits with one missing, someone's
bedroll by a lantern that is still lit — and the hatch to the relay deck.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_dock as D                # noqa: E402
import assets_ship as P                # noqa: E402
import assets_station as T             # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'enigma-dock.json')
COLS, ROWS = 30, 19
k = Kit(COLS, ROWS, margin_top=2.6, margin_bottom=0.6, margin_x=0.3, seed=313)
MOUTH = 4.0                       # the deck's open edge
FX0, FX1, FR = 0.6, 29.4, 18.4    # outer walls, front of the bay

# ---- shell ------------------------------------------------------------------------------------------------
D.deck(k, 2.0, MOUTH, 28.0, FR)
emitters = D.mouth(k, FX0, FX1, MOUTH, h=7.2, post=1.4)
D.bay_wall(k, FX0, 2.0, MOUTH + 0.35, FR, h=5.0, side='left')
D.bay_wall(k, 28.0, FX1, MOUTH + 0.35, FR, h=5.0, side='right')
k.box(FX0, FR, 0.0, FX1, FR + 0.6, 0.35, (D.HULL[1], 0.06), 'front_wall')
k.box(FX0, FR, 0.35, FX1, FR + 0.6, 0.4, D.HULL[0], 'wall_cap')
k.box(FX0, FR - 0.01, 0.29, FX1, FR + 0.02, 0.32, shade(T.TEAL, 0.3), 'led', emit=(T.TEAL, 0.6))
for x in (6.0, 15.0, 24.0):               # flood lamps high on the walls and the posts
    pass
for (x, r) in ((2.15, 9.0), (2.15, 15.0)):
    k.box(x, r - 0.3, 4.2, x + 0.25, r + 0.3, 4.45, '#2a3038', 'flood')
    k.box(x + 0.25, r - 0.25, 4.22, x + 0.27, r + 0.25, 4.43, '#e8e0c0', 'flood_lens', emit=('#ffe0b0', 1.0))
    k.point_light(x + 1.0, r, 4.0, '#ffd8a8', 90, radius=0.3)
for (x, r) in ((27.6, 9.5), (27.6, 15.0)):
    k.box(x, r - 0.3, 4.2, x + 0.25, r + 0.3, 4.45, '#2a3038', 'flood')
    k.box(x - 0.02, r - 0.25, 4.22, x, r + 0.25, 4.43, '#e8e0c0', 'flood_lens', emit=('#ffe0b0', 1.0))
    k.point_light(x - 1.0, r, 4.0, '#ffd8a8', 90, radius=0.3)

# ---- the cradle where the skiff docks ------------------------------------------------------------------------
PX, PR = 15.0, 9.6
D.cradle(k, PX, PR, w=7.0, d=3.6)
with k.variant('shuttle', 'parked'):
    P.shuttle(k, PX - 1.7, PR - 0.1)
k.solid(PX - 1.8, PR - 1.0, PX + 2.0, PR + 0.7)
guides = []
for x in (PX - 2.0, PX + 2.0):
    guides += D.guide_studs(k, x, MOUTH + 0.5, PR - 2.0, step=0.55)
D.lane(k, 10.8, MOUTH + 0.6, 10.8, FR - 0.4)
D.lane(k, 19.2, MOUTH + 0.6, 19.2, FR - 0.4)
D.lane(k, 11.0, PR + 2.6, 19.0, PR + 2.6, dash=0.3, gap=0.25)
D.floor_text(k, 'BAY 03', 'RussoOne', PX, 15.4, 1.25, shade(D.STRIPE, 0.62))
for x in range(4, 27, 3):
    for r in (6.0, 12.5, 16.5):
        if not (10 < x < 20 and r < 12):
            D.tie_down(k, x + 0.5, r)

# ---- Berth 2: the crew's tug, gutted, under the gantry ------------------------------------------------------------
D.tug(k, 3.0, 8.0, L=5.2)
D.gantry(k, 2.6, 9.0, 5.4, 10.6, h=4.4, hook=(7.0, 10.4, 2.1))
k.cyl_x(5.9, 8.0, 10.2, 1.75, 0.3, 0.3, ('#6a6a62', 0.06), 'spare_pod', verts=14)    # the new engine, half-hoisted
k.cyl_x(5.85, 5.9, 10.2, 1.75, 0.2, 0.2, '#1a1a1a', 'spare_nozzle', verts=14)
for x in (6.4, 7.6):
    k.tube((x, 10.2, 2.05), (x, 10.2, 1.95), 0.025, '#e0a020', 'sling', verts=5)
    k.tube((7.0, 10.4, 2.1), (x, 10.2, 2.05), 0.02, '#e0a020', 'sling', verts=5)
D.floor_text(k, '02', 'RussoOne', 5.6, 11.4, 0.7, shade(D.STRIPE, 0.6))
k.solid(2.0, 10.0, 5.0, 12.0)            # the pocket hidden behind the containers

# ---- cargo: containers, crates, the loader, fuel cells ---------------------------------------------------------------
D.container(k, 2.2, 12.0, 2.6, 1.3, 1.3, D.BOX_COLS[1], code='ENG-0473')
D.container(k, 2.3, 12.05, 2.4, 1.2, 1.2, D.BOX_COLS[0], z0=1.3, code='RLY-12')
D.container(k, 2.2, 13.5, 2.6, 1.3, 1.25, D.BOX_COLS[2], code='MED-77')
k.solid(2.0, 12.0, 4.8, 14.8)
for (x, r, s, z) in ((5.5, 12.6, 0.5, 0.0), (6.05, 12.7, 0.42, 0.0), (5.55, 12.6, 0.4, 0.5), (6.6, 13.4, 0.36, 0.0)):
    D.crate(k, x, r, s=s, z=z)
k.solid(5.2, 12.3, 6.8, 13.6)
D.loader(k, 5.8, 15.0)
D.fuel_cells(k, 3.2, 16.6)
D.fuel_cells(k, 4.6, 16.6, n=5)
T.debris(k, 2.5, 14.9, 9.0, 17.8, n=8)

# ---- the control booth, lockers under it, the hatch to the relay deck ------------------------------------------------
D.control_booth(k, 23.0, 27.6, 5.2, 8.0, floor=1.9, top=3.7)
for x in (23.7, 24.6, 25.5, 26.4):
    P.storage_locker(k, x, 7.55)
k.solid(22.6, MOUTH, 28.0, 8.1)
D.airlock_hatch(k, 28.0, 11.0, 13.0)
D.floor_text(k, 'RELAY', 'RussoOne', 25.6, 12.65, 0.42, shade(T.TEAL, 0.55))
D.floor_text(k, '>>', 'RussoOne', 26.9, 12.65, 0.42, shade(T.TEAL, 0.55))

# ---- crew things: suits, a bench, someone's camp -----------------------------------------------------------------------
for x in (24.55, 27.5):
    k.box(x - 0.05, 16.0, 0.0, x + 0.05, 16.12, 2.2, '#3a4450', 'rack_post')
D.suit_rack(k, 24.6, 16.0, n=4, missing=(2,))
k.solid(24.4, 15.0, 27.7, 16.6)
D.workbench(k, 18.2, 20.2, FR)
D.camp(k, 22.4, 14.2)
k.solid(21.8, 13.9, 23.0, 14.5)
for (x, r) in ((12.0, 16.4), (17.6, 5.4), (21.0, 10.5), (9.5, 14.0)):
    T.debris(k, x - 0.8, r - 0.5, x + 0.8, r + 0.5, n=4)
T.hanging_cables(k, 6.5, MOUTH + 0.2, top=6.0, n=3)
T.hanging_cables(k, 21.5, MOUTH + 0.2, top=6.0, n=2)

# ---- light ---------------------------------------------------------------------------------------------------------------
k.area_light(15.0, 1.0, 5.0, '#7a90d0', 900, 22.0, rot=(math.radians(-62), 0, 0))     # the giant's light through the mouth
for x in emitters[::2]:
    k.point_light(x, MOUTH + 0.3, 0.5, D.FIELD, 5, radius=0.2, group='flicker')
for (x, r) in ((PX, PR + 1.5), (PX, 14.0)):
    k.point_light(x, r, 3.2, '#a0c8e0', 40, radius=1.0)
k.point_light(PX - 3.6, PR, 0.6, D.FIELD, 8, radius=0.3, group='flicker')
k.point_light(PX + 3.6, PR, 0.6, D.FIELD, 8, radius=0.3, group='flicker')

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.45}}, light_samples=128,
         world_light=('#16283a', 0.6))

DOOR = [26, 12]
w = {'name': 'Docking Bay 3', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'enigma',
     'spawns': {'player': [15, 12]}, 'shipExit': False, 'tiles': [], 'collisions': [], 'tileNames': {},
     'interactions': [
         {'x': 15, 'y': 11, 'type': 'shuttle', 'label': 'SHUTTLE', 'prompt': 'PRESS E TO BOARD'},
         {'x': 27, 'y': 11, 'type': 'enter_world', 'target': 'enigma', 'spawn': [4, 5], 'label': 'RELAY DECK',
          'prompt': 'PRESS E TO CYCLE THE HATCH'},
         {'x': 27, 'y': 12, 'type': 'enter_world', 'target': 'enigma', 'spawn': [4, 5], 'label': 'RELAY DECK',
          'prompt': 'PRESS E TO CYCLE THE HATCH'},
         {'x': 15, 'y': 4, 'type': 'dialog', 'label': 'CONTAINMENT FIELD', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'A SHEET OF LIGHT HOLDS THE AIR IN.\n\nBEYOND IT THE RINGED GIANT TURNS, AND THE STATION TURNS WITH IT.\n\nA BOLT DRIFTS AGAINST THE FIELD AND STAYS THERE, HUMMING.'},
         {'x': 24, 'y': 8, 'type': 'dialog', 'label': 'BAY CONTROL', 'prompt': 'PRESS E TO READ',
          'dialog': 'BAY LOG, LAST ENTRIES:\n\n4402  SKIFF WREN DEPARTS. NO RETURN LOGGED.\n4471  TUG KESTREL: ENGINE 2 LOST TO DEBRIS.\n4473  REPAIR STARTED. OKAFOR.\n\n4544  VISITOR DOCKED, CRADLE 3.\n\nTHAT LAST ONE IS YOU.'},
         {'x': 5, 'y': 10, 'type': 'dialog', 'label': 'KESTREL', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'THE STATION\'S WORK TUG. ONE ENGINE TORN CLEAN AWAY, THE PYLON CURLED LIKE PAPER.\n\nA NEW ENGINE HANGS FROM THE HOIST, HALF-LIFTED. WHOEVER WAS FITTING IT STOPPED MID-JOB.'},
         {'x': 6, 'y': 15, 'type': 'dialog', 'label': 'LOADER', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'A CARGO LOADER, SLUMPED AGAINST THE CRATES.\n\nITS POWER CELL HAS BEEN PULLED - CAREFULLY, WITH THE RIGHT TOOL.'},
         {'x': 4, 'y': 15, 'type': 'dialog', 'label': 'CONTAINERS', 'prompt': 'PRESS E TO READ',
          'dialog': 'MANIFESTS, STILL CLIPPED TO THE DOORS:\n\nENG-0473  REPLACEMENT DRIVE PARTS\nRLY-12    RELAY CRYSTALS (FRAGILE)\nMED-77    MEDICAL - SEALED\n\nTHE MEDICAL CONTAINER\'S SEAL IS BROKEN.'},
         {'x': 4, 'y': 17, 'type': 'dialog', 'label': 'FUEL CELLS', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'AETHER CELLS, STILL HOLDING A CHARGE.\n\nENOUGH TO MOVE A TUG. NOT ENOUGH TO LEAVE THE SYSTEM.'},
         {'x': 26, 'y': 17, 'type': 'dialog', 'label': 'SUIT RACK', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'FOUR HOOKS, THREE SUITS.\n\nTHE NAME OVER THE EMPTY ONE: D. OKAFOR.'},
         {'x': 22, 'y': 15, 'type': 'dialog', 'label': 'BEDROLL', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'SOMEONE HAS BEEN SLEEPING HERE. RATION TINS, A MUG, A CAMP LANTERN.\n\nTHE LANTERN IS STILL LIT.'},
         {'x': 19, 'y': 17, 'type': 'dialog', 'label': 'DRONE', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'A MAINTENANCE DRONE, OPENED UP ON THE BENCH.\n\nITS EYE FLICKERS GREEN WHEN YOU LEAN CLOSE. IT IS LISTENING TO SOMETHING.\n\n47.3 MHZ.'},
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (2, int(MOUTH), 27, int(FR) - 1), scene_id='enigma-dock',
            scene_extra={'backdrop': True, 'layers': {'shuttle': 'parked'}, 'flicker': {'mode': 'pulse'}})
w = json.load(open(WORLD))
w['shuttle'] = {'spawn': [15, 12]}
# live parts drawn by js/worlds/enigma.js, in screen tiles (row - z * cos 45)
c45 = math.cos(math.radians(45))
w['dock'] = {
    'field': [2.0, 28.0, MOUTH + 0.35 - 6.0 * c45, MOUTH],
    'guides': [[round(x, 2), round(r, 2)] for (x, r) in guides],
    'clamps': [[round(PX + sx * 2.75, 2), round(PR + sr * 1.3 - 1.2 * c45, 2)] for sx in (-1, 1) for sr in (-1, 1)],
    'giant': [21.0, -1.5, 5.5],
}
w['view'] = [-0.2, -3.0, COLS + 0.2, ROWS + 0.8]
w['cameraLead'] = -3.0
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('dock done')
