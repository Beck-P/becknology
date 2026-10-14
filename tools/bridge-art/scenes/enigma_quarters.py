"""Enigma Station, crew quarters — Blender scene (off the ring).

  BVENV/bin/python tools/bridge-art/scenes/enigma_quarters.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/enigma-quarters

Five berths along the back wall, left as they were the day the Wren went
out — a name plate on each, something of theirs on the shelf (the
keepsakes quest) — Okafor's bunk stripped by the west wall, the mess table
with six mugs and a card game nobody finished, the galley, the shower, the
crew photo. Small viewports onto the giant over the berths.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world  # noqa: E402
import assets_ring as R                        # noqa: E402
import assets_station as T                     # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'enigma-quarters.json')
COLS, ROWS = 18, 12
RF = 4.0
H = 2.4 / math.cos(THETA)

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, margin_x=1.0, seed=607)

# ---- shell ----------------------------------------------------------------------------------------
T.station_floor(k, 1, RF, 17, 11)
T.station_room(k, 1, RF, 17, 11, H, door=(8.0, 10.0),
               windows=[(2.0, 3.3, 1.95, 2.55, False), (5.2, 6.5, 1.95, 2.55, False), (8.4, 9.7, 1.95, 2.55, False),
                        (11.6, 12.9, 1.95, 2.55, False), (14.8, 16.1, 1.95, 2.55, True)])
k.area_light(9.0, RF + 0.5, 2.4, '#d0a070', 40, 10.0, rot=(math.radians(-60), 0, 0))     # the giant through the portholes

# ---- the berths -------------------------------------------------------------------------------------
CREW = [('ADA', '#3a5a7a', R.harmonica), ('BIX', '#6a3a3a', R.cards), ('CORA', '#3a6a4a', R.pressed_flower),
        ('DELL', '#5a4a2a', R.unfinished_letter), ('EZE', '#4a3a6a', R.childs_drawing)]
BERTHS = []
for i, (name, blanket, keepsake) in enumerate(CREW):
    x0 = 1.2 + i * 3.15
    R.berth(k, x0, RF, blanket=blanket, keepsake=keepsake, made=(name != 'BIX'))
    BERTHS.append((name, int(x0 + 1.0)))
# Okafor's bunk, stripped, along the west wall
k.box(1.05, 6.3, 0, 1.95, 8.6, 0.42, (T.ST_WALL[2], 0.06), 'bunk_frame')
k.box(1.1, 6.35, 0.42, 1.9, 8.55, 0.5, ('#9a9aa4', 0.1), 'bare_mattress')
k.solid(1.0, 6.3, 2.0, 8.6)

# ---- the room ---------------------------------------------------------------------------------------
R.mess_table(k, 9.0, 7.6)
for (x, r, f) in ((8.2, 6.65, 'down'), (9.8, 6.65, 'down'), (8.2, 8.6, 'up'), (9.8, 8.6, 'up')):
    R.crew_chair(k, x, r, facing=f)
R.crew_chair(k, 11.0, 7.7, toppled=True)
R.galley(k, 16.1, 16.95, 5.6, 8.8)
R.shower(k, 1.05, 2.4, 9.2, 10.95)
T.emergency_light(k, 16.6, RF, z=2.2, energy=8)
T.hanging_cables(k, 6.0, 9.6, top=H - 0.2, n=2)

# ---- light -----------------------------------------------------------------------------------------
for (x, r) in ((4.0, 6.5), (9.0, 6.0), (14.0, 6.5), (9.0, 9.5), (3.0, 9.5), (15.0, 9.5)):
    k.point_light(x, r, 2.5, '#a8d0e0', 60, radius=0.6, group='flicker')
k.point_light(9.0, 7.6, 1.6, '#ffd890', 25, radius=0.3)
for i in range(5):                                       # the berths' reading lights, still on
    k.point_light(1.3 + i * 3.15, RF + 0.5, 1.5, '#ffd890', 10, radius=0.1)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.45}}, light_samples=128,
         world_light=('#1c3044', 0.9))

# ---- the world -------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Crew Quarters', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'enigma', 'fixedCamera': True,
          'spawns': {'player': [9, 10]}, 'shipExit': False})


def dialog(x, y, label, prompt, text):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


TEXT = {
    'ADA': "ADA'S BERTH. A FLIGHT JACKET HUNG NEATLY ON THE LOCKER. ON THE SHELF, A BATTERED HARMONICA, THE BRASS WORN BRIGHT WHERE "
           "HER THUMBS WENT.\n\nTAPED UNDER IT: 'FOR THE LONG HAULS.'",
    'BIX': "BIX'S BERTH, UNMADE. A DECK OF CARDS ON THE SHELF, FIFTY-ONE OF THEM. THE ACE OF HEARTS IS MISSING.\n\n"
           "A NOTE IN THE BOX: 'I'LL WIN IT BACK. - B.'",
    'CORA': "CORA'S BERTH. A MEDIC'S BAG UNDER THE BUNK. ON THE SHELF, A PRESSED FLOWER IN A FRAME - A LUMAR SPORE-BLOOM, "
            "STILL FAINTLY GLOWING AFTER ALL THIS TIME.",
    'DELL': "DELL'S BERTH. ON THE SHELF, A LETTER, UNFINISHED, PEN STILL ON IT:\n\n'DEAR MAR - I SWAPPED A SHIFT TODAY SO DAMI "
            "COULD FINISH HER TUG. SHE'D HAVE DONE THE SAME. SHORT RUN TO ARCADIA, BACK BEFORE YOU KNOW IT, AND THEN -'",
    'EZE': "EZE'S BERTH, THE YOUNGEST. ON THE SHELF, A CRAYON DRAWING: AN ORANGE SHIP UNDER A BLUE SKY FULL OF YELLOW STARS. "
           "IN THE CORNER, IN A CHILD'S HAND: 'BIG SISTER EZE FLIES THE WREN.'",
}
w['interactions'] = [
    {'x': 8, 'y': 11, 'type': 'leave_world', 'label': 'THE RING', 'prompt': 'RETURN TO THE RING', 'leaveTo': 'enigma-ring',
     'leaveSpawn': [8, 8]},
    {'x': 9, 'y': 11, 'type': 'leave_world', 'label': 'THE RING', 'prompt': 'RETURN TO THE RING', 'leaveTo': 'enigma-ring',
     'leaveSpawn': [8, 8]},
] + [dialog(c, 4, name + "'S BERTH", 'PRESS E TO LOOK', TEXT[name]) for name, c in BERTHS] + [
    dialog(1, 7, "OKAFOR'S BUNK", 'PRESS E TO LOOK',
           "A BARE MATTRESS. THE NAME PLATE SAYS D. OKAFOR. SHE TOOK EVERYTHING ELSE DOWN TO HYDROPONICS, YEARS AGO, AND NEVER CAME BACK "
           "TO SLEEP HERE."),
    dialog(9, 7, 'MESS TABLE', 'PRESS E TO LOOK',
           "SIX MUGS, FIVE OF THEM WASHED AND TURNED UPSIDE DOWN TO WAIT. A CARD GAME LAID OUT, HALF PLAYED. "
           "WHOEVER WAS WINNING, NOBODY WILL KNOW."),
    dialog(16, 7, 'GALLEY', 'PRESS E TO LOOK', "A KETTLE, RATION PACKS STACKED BY FLAVOUR, A CHORE WHEEL STUCK ON 'DELL - DISHES'."),
    dialog(1, 10, 'SHOWER', 'PRESS E TO LOOK', "THE SHOWER STILL WORKS. THE WATER IS COLD AND SMELLS OF METAL."),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (1, 4, 16, 10), doors=[(8, 11), (9, 11)], scene_id='enigma-quarters',
            scene_extra={'flicker': {'mode': 'pulse'}})
print('quarters done', BERTHS)
