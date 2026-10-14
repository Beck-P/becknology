"""The Sapphire Light, the lamp room at the top of the tower.

  BVENV/bin/python tools/bridge-art/scenes/lumar_sapphire_lamproom.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-sapphire-lamproom

The great lens in the middle, rings of glass round a cold blue lamp, one
panel of it a cut sapphire; windows all round onto the night; the
clockwork that turns it; the bench of polishing cloths and oil; the
signal lamp aimed north by east at Midnight Isle; the keeper, Tamsin Gale,
in her armchair with a spyglass and a cold mug of tea. The stair winds
down to the keeper's room (lumar-sapphire-lighthouse); the doorway in the front
opens on the gallery.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world  # noqa: E402
import assets_light as L                       # noqa: E402
import assets_lumar as A                       # noqa: E402
import assets_magic as M                       # noqa: E402
import assets_town as W                        # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-sapphire-lamproom.json')

H = 2.6 / math.cos(THETA)
k = Kit(12, 13, margin_top=1.0, margin_bottom=0.5, seed=1409)
P, C = M.octagon_room(k, 2, 2, 10, 11, 2, H, door=(5.0, 7.0), stone='#7a7680', floor_tone='#4a4a54',
                      holes=[(3.0, 7.4, 4.6, 9.0)])

# ---- the lens ------------------------------------------------------------------------------------------
LX, LR = 6.0, 5.2
L.fresnel_lens(k, LX, LR)
# the sapphire panel: one cut crystal set into the glass, facing the room
k.box(LX - 0.15, LR + 0.74, 1.2, LX + 0.15, LR + 0.84, 1.55, '#102060', 'sapphire_panel', emit=('#3060ff', 1.0))
k.point_light(LX, LR + 1.1, 1.3, '#4070ff', 10, radius=0.1, group='pulse')

# ---- windows all round -----------------------------------------------------------------------------------
M.angled_window(k, P[0], P[1], C, 0.08, 0.42, 1.3, 2.55)
M.angled_window(k, P[0], P[1], C, 0.58, 0.92, 1.3, 2.55)
M.angled_window(k, P[7], P[0], C, 0.22, 0.78, 1.0, 2.55, moon=True)
M.angled_window(k, P[1], P[2], C, 0.22, 0.78, 1.0, 2.55)
k.area_light(3.3, 3.3, 1.9, '#7890e0', 30, 1.0, rot=(math.radians(-70), 0, math.radians(45)))
k.area_light(8.7, 3.3, 1.9, '#7890e0', 24, 1.0, rot=(math.radians(-70), 0, math.radians(-45)))

# ---- along the back: the clockwork, the bench of lens things ---------------------------------------------------
L.clockwork(k, 4.75, 2.6)
L.lens_kit(k, 7.45, 2.6)

# ---- the signal lamp, on its stand at the north-east glass ---------------------------------------------------------
SLX, SLR = 8.7, 4.05
for i in range(3):
    a = math.radians(90 + i * 120)
    k.tube((SLX + math.cos(a) * 0.28, SLR + math.sin(a) * 0.28, 0.0), (SLX, SLR, 0.9), 0.025, '#2a2a30', 'lamp_leg', verts=5)
k.cyl_y(SLX, SLR - 0.25, SLR + 0.2, 1.08, 0.2, 0.2, ('#a08040', 0.1), 'signal_drum', verts=14)
k.cyl_y(SLX, SLR - 0.29, SLR - 0.25, 1.08, 0.16, 0.16, '#1a2a40', 'signal_glass', emit=(L.LAMP, 0.7), verts=14)
for z in (0.98, 1.06, 1.14):
    k.box(SLX - 0.17, SLR - 0.32, z, SLX + 0.17, SLR - 0.3, z + 0.03, '#2a2a30', 'signal_shutter')
k.box(SLX + 0.2, SLR - 0.04, 1.02, SLX + 0.42, SLR + 0.02, 1.07, '#2a2a30', 'signal_lever')
k.solid(SLX - 0.3, SLR - 0.3, SLX + 0.3, SLR + 0.3)

# ---- the keeper's corner: her armchair, a table with a spyglass and a mug ---------------------------------------
A.rug(k, 7.6, 7.6, 9.6, 9.4, col='#5a3a2a', pattern=False)
A.armchair(k, 8.5, 8.5, facing='down', tone='#2a4a7a')
A.side_table(k, 9.4, 7.35)
A.mug(k, 9.3, 7.25, 0.6)
k.tube((9.25, 7.55, 0.64), (9.62, 7.3, 0.66), 0.03, ('#d0a048', 0.08), 'spyglass', verts=8)
A.book_stack(k, 7.75, 9.3, n=3)                          # on the floor by her chair
k.box(8.15, 8.2, 0.42, 8.4, 8.8, 0.62, ('#d0a028', 0.1), 'blanket', bevel=0.04)       # the oilskin over the arm

# ---- the stairwell down, front left ------------------------------------------------------------------------------
A.stairwell_down(k, 3.0, 4.6, 7.4, 9.0)
k.solid(3.0, 7.4, 4.6, 9.0)

# ---- light -----------------------------------------------------------------------------------------------------------
k.point_light(6.0, 9.6, 2.4, '#8aa0d0', 30, radius=0.6)
W.lantern(k, 9.55, 7.2, 0.6, 0.8, s=0.07, energy=10)                   # her storm lantern
k.point_light(8.7, 7.9, 1.5, '#ffb060', 22, radius=0.2, group='flicker')
A.desk_lamp(k, 4.3, 2.75, 1.15, energy=5.0)                            # on the clockwork case

k.render(OUT, light_states={'full': {'flicker': 1.0, 'pulse': 1.0}, 'dim': {'flicker': 0.8, 'pulse': 0.35}},
         light_samples=128, world_light=('#22304c', 0.45))

# ---- the world ---------------------------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Lamp Room', 'width': 12, 'height': 13, 'tileSize': 16, 'tileset': 'lumar-sapphire-lamproom',
          'spawns': {'player': [5, 9]}, 'shipExit': False})


def look(x, y, label, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    {'x': 3, 'y': 8, 'type': 'leave_world', 'leaveTo': 'lumar-sapphire-lighthouse', 'leaveSpawn': [6, 4], 'label': 'STAIRS DOWN',
     'prompt': 'PRESS E TO GO DOWN'},
    {'x': 4, 'y': 8, 'type': 'leave_world', 'leaveTo': 'lumar-sapphire-lighthouse', 'leaveSpawn': [6, 4], 'label': 'STAIRS DOWN',
     'prompt': 'PRESS E TO GO DOWN'},
    look(8, 8, 'KEEPER',
         "A WOMAN IN A NAVY JUMPER AND A YELLOW OILSKIN WAISTCOAT, GREY HAIR PINNED UP, A SPYGLASS IN HER LAP.\n\n"
         "\"MIND THE LENS. IT'S OLDER THAN BOTH OF US PUT TOGETHER.\"", 'PRESS E TO TALK'),
    look(6, 6, 'THE LENS',
         "THE GREAT LENS: RINGS OF GLASS STACKED ROUND A COLD BLUE LAMP, TURNING SO SLOWLY YOU ONLY SEE IT IF YOU LOOK AWAY.\n\n"
         "ONE PANEL ISN'T GLASS. IT'S A CUT SAPPHIRE, THE SIZE OF YOUR HAND - THAT'S WHAT TURNS THE BEAM BLUE. SCRATCHED INTO "
         "THE BRASS BESIDE IT:\n'SO THEY KNOW IT'S US. - E.G.'"),
    look(8, 4, 'SIGNAL LAMP',
         "A SHUTTERED SIGNAL LAMP ON A TRIPOD, AIMED THROUGH THE GLASS AT MIDNIGHT ISLE, NORTH BY EAST. THE LEVER IS WORN "
         "BRIGHT.\n\nA CARD TUCKED IN THE STAND: 'THREE LONG, ONE SHORT. MORNING TIDE, COMING HOME.'"),
    look(4, 2, 'CLOCKWORK',
         "THE CLOCKWORK THAT TURNS THE LENS. A WEIGHT ON A CHAIN DROPS THROUGH THE FLOOR ALL NIGHT; SOMEBODY HAS TO WIND IT "
         "BACK UP EVERY FOUR HOURS.\n\nTALLY MARKS ON THE CASE. A LOT OF THEM, ALL RECENT."),
    look(7, 2, 'LENS BENCH',
         "POLISHING CLOTHS, A CHAMOIS, AN OIL CAN, AND A SPARE PRISM IN A PADDED BOX.\n\nA NOTE: 'GLASS IS CLEAN WHEN YOU "
         "CAN'T SEE IT. - DAD'"),
    look(3, 3, 'WINDOW',
         "THE WHOLE SEA, AND THE BEAM GOING OUT OVER IT. FAR OFF NORTH BY EAST, THE DARK HUMP OF MIDNIGHT ISLE.\n\n"
         "YOU WATCH FOR A WHILE. NOTHING. THEN, JUST AS YOU TURN AWAY - A LIGHT."),
    look(5, 11, 'GALLERY',
         "YOU STEP OUT ONTO THE IRON GALLERY. THE WIND TAKES YOUR BREATH.\n\nBELOW, SAPPHIRE PORT: LANTERNS ON THE QUAY, SMOKE "
         "FROM THE KILN, THE GALLEON CREAKING AT HER BERTH. ABOVE, THE BEAM SWINGS ROUND OVER YOUR HEAD, BLUE AND HUGE.",
         'PRESS E TO STEP OUT'),
    look(6, 11, 'GALLERY',
         "YOU STEP OUT ONTO THE IRON GALLERY. THE WIND TAKES YOUR BREATH.\n\nBELOW, SAPPHIRE PORT: LANTERNS ON THE QUAY, SMOKE "
         "FROM THE KILN, THE GALLEON CREAKING AT HER BERTH. ABOVE, THE BEAM SWINGS ROUND OVER YOUR HEAD, BLUE AND HUGE.",
         'PRESS E TO STEP OUT'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (2, 2, 9, 10), doors=[(5, 11), (6, 11)], scene_id='lumar-sapphire-lamproom',
            actors=[{'sheet': 'npc-keeper', 'x': 8, 'y': 8, 'facing': 'down', 'pose': 'sit'}],
            scene_extra={'flicker': {'mode': 'pulse'}})
print('lamp room done')
