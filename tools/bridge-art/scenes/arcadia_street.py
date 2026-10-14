"""Arcadia District — Blender scene (the neon street outside the arcade).

  BVENV/bin/python tools/bridge-art/scenes/arcadia_street.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-street

A market lane on a terrace of the megacity, lined with low frontages so the
skyline (js/skyline.js) towers over them and the city glitters under the
railing: Joro's pawnshop, the Mart, Cyber Noodles, the Arcade, Tinker's
garage, the Chrome clinic, the bike dock, the Lucky 7 pachinko parlour,
the ramen stall, the Skywalk lift, the alley gate, the capsule hotel and
Club Void. Cables and string lights overhead, fire escapes, balconies,
billboards on the roofs (the engine plays ads on them), steam from the
grates, puddles, carts and clutter on the lane.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world  # noqa: E402
import assets_cyber as Y               # noqa: E402
import assets_district as D            # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'arcadia-street.json')
COLS, ROWS = 44, 16
RF = 8.0          # the frontages' faces; doors on row 7, the lane rows 8-13, the railing at 14

k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=0.6, seed=227)
st = D.Street()


def front(x0, x1, **kw):
    kw.setdefault('rng', k.rng)
    return D.frontage(k, st, x0, x1, kw.pop('r', RF), **kw)


# ---- the lane ---------------------------------------------------------------------------------------
Y.tile_floor(k, -0.5, RF, COLS + 0.5, 14.0, tones=('#2e2a40', '#2a263a'), size=1.0, seam='#100c1a')
k.box(-0.5, 10.9, 0.0, COLS + 0.5, 11.1, 0.004, '#1a1626', 'gutter')
for x in range(0, COLS, 4):                                    # drains along the gutter
    k.box(x + 1.7, 10.85, 0.004, x + 2.3, 11.15, 0.008, '#0c0a14', 'drain')
for x in range(0, COLS, 3):                                    # kerb lights by the railing
    k.box(x + 1.4, 13.82, 0.0, x + 1.6, 13.9, 0.01, '#0c2a30', 'kerb_light', emit=(Y.CYAN, 0.8))

# ---- the frontages ---------------------------------------------------------------------------------
front(0.0, 3.2, floors=2, kind='shutter', name='PAWN', name_col=Y.YEL, trim=Y.YEL, door_x=1.5, glow='#6a4418',
      roof=('tank', 'antenna'), wall='#2e2a30')
D.graffiti(k, 2.2, 3.1, RF + 0.02, 1.5, 2.2, Y.PINK)
front(3.2, 7.2, floors=3, kind='glass', name='MART', name_col=Y.CYAN, trim=Y.CYAN, door_x=4.5, glow='#5a7a9a',
      awning=('#40c8d8', 'metal'), escape=(5.7, 7.0), roof=('dish', 'vent'), wall='#2a2c3a')
front(7.2, 11.0, floors=2, kind='glass', name='NOODLES', name_col=Y.PINK, trim=Y.PINK, door_x=8.5, glow='#8a3020',
      awning=('#a02a2a', 'fabric'), blade=Y.PINK, balcony_at=(9.2, 10.8), roof=('vent', 'tank'), wall='#32222a')
for x in (7.6, 10.6):
    Y.paper_lantern(k, x, RF + 0.35, 1.0, s=0.5, top=1.3)
# the arcade: three storeys, a marquee of bulbs round the big sign, a billboard on top
AH = front(11.0, 16.0, floors=3, kind='glass', name=None, door_x=13.0, door_w=1.6, glow='#6a2aa0', trim=Y.PURP,
           roof=('vent',), ad=(11.6, 15.4, 1.3, 1), wall='#221a3a')
Y.neon_text(k, 'ARCADE', 13.5, RF + 0.05, 1.62, h=0.5, col=Y.PINK, energy=16)
bulbs = []
for i in range(23):                                            # the marquee's chasing bulbs
    t = i / 22
    bulbs.append((11.25 + t * 4.5, 1.5))
    bulbs.append((11.25 + t * 4.5, 2.3))
for x, z in bulbs:
    k.sphere(x, RF + 0.07, z, 0.035, 0.035, '#fff0c0', 'marquee_bulb', emit=('#ffe090', 1.0), segs=5)
    st.bulbs.append([round(x, 3), round(RF + 0.07 - z * D.C45, 3)])
Y.neon_text(k, 'PLAY ALL NIGHT', 13.5, RF + 0.04, 2.55, h=0.2, col=Y.CYAN, board=False, energy=6)
front(16.0, 18.2, floors=2, kind='garage', name='TECH', name_col=Y.CYAN, trim=Y.GREEN, door_x=16.5, door_w=0.6,
      glow='#2a7a4a', roof=('antenna',), wall='#262a2e')
front(18.2, 21.2, floors=3, kind='clinic', name='CLINIC', name_col=Y.CYAN_L, trim=Y.CYAN, door_x=19.5, glow='#3a8a9a',
      roof=('dish',), wall='#3a4250')
k.box(20.55, RF + 0.02, 2.0, 20.95, RF + 0.05, 2.4, '#e0f0f4', 'cross', emit=(Y.CYAN_L, 0.6))
k.box(20.68, RF + 0.05, 1.9, 20.82, RF + 0.07, 2.5, '#40c8d8', 'cross', emit=(Y.CYAN, 0.9))
k.box(20.45, RF + 0.05, 2.13, 21.05, RF + 0.07, 2.27, '#40c8d8', 'cross', emit=(Y.CYAN, 0.9))
front(21.2, 23.6, floors=1, kind='garage', door_x=21.8, door_w=0.5, glow='#18283a', trim=Y.CYAN, roof=('vent',),
      r=RF - 0.6, wall='#24242e')
Y.hover_bike(k, 22.5, RF - 0.05)
front(23.6, 26.4, floors=2, kind='glass', name='LUCKY', name_col=Y.YEL, trim=Y.YEL, door_x=25.2, glow='#8a6a10',
      blade=Y.YEL, roof=('tank',), wall='#2e2420')
Y.token_kiosk(k, 24.1, RF + 0.4)
front(26.4, 29.6, floors=2, kind='stall', door_x=29.1, door_w=0.5, glow='#7a3a20', trim=Y.RED, roof=('vent', 'dish'),
      r=RF - 0.6, wall='#2e1e22')
Y.ramen_stand(k, 26.7, 28.7, RF - 0.45, RF)
# the Skywalk lift: a slim tower with a glass lift shaft up its face
SH = front(29.6, 32.6, floors=3, kind='glass', door_x=31.1, door_w=0.9, glow='#2a8aa0', trim=Y.CYAN, roof=('antenna',),
           ad=(29.9, 32.3, 1.1, 5), wall='#1e2638')
k.box(30.65, RF + 0.02, 0.1, 31.55, RF + 0.12, SH, '#0c1a22', 'lift_shaft', emit=('#1a4a5a', 0.5))
k.box(30.7, RF + 0.12, 2.1, 31.5, RF + 0.16, 2.9, '#2a3a44', 'lift_car', emit=(Y.CYAN_L, 0.4))
Y.neon_text(k, 'SKYWALK', 31.1, RF + 0.16, 1.45, h=0.22, col=Y.CYAN_L, board=False, energy=6)
# the alley gate: an arch through to the back streets, chained shut
front(32.6, 34.8, floors=2, kind='club', door_x=33.7, door_w=1.1, glow='#100a18', trim=Y.MAG, roof=('tank',),
      wall='#24202a')
k.boxes([(x, RF + 0.04, 0.05, x + 0.04, RF + 0.08, 1.15) for x in [33.2 + i * 0.12 for i in range(9)]], '#4a4a52', 'gate_bars')
k.tube((33.2, RF + 0.1, 0.6), (34.2, RF + 0.1, 0.7), 0.025, '#8a8a90', 'chain', verts=4)
D.graffiti(k, 32.7, 34.7, RF + 0.03, 1.4, 2.3, Y.GREEN)
front(34.8, 38.8, floors=3, kind='glass', name='HOTEL', name_col=Y.PURP, trim=Y.PURP, door_x=36.6, glow='#3a5a9a',
      awning=('#7080e8', 'metal'), balcony_at=(37.0, 38.6), escape=(35.0, 36.0), roof=('dish', 'tank'), wall='#262236')
front(38.8, 44.0, floors=2, kind='club', name='VOID', name_col=Y.MAG, trim=Y.MAG, door_x=41.5, glow='#b020b0',
      blade=Y.PINK, roof=('vent', 'antenna'), ad=(39.4, 43.4, 1.0, 2), wall='#1a1420')
D.poster_wall(k, 39.0, 40.8, RF + 0.02, 0.3, 1.1)
D.poster_wall(k, 42.3, 43.8, RF + 0.02, 0.3, 1.1)

# ---- overhead: cables and string lights between the fronts and over the lane -----------------------
for (xa, xb, za, zb, lights) in ((0.6, 3.6, 2.5, 2.6, None), (3.6, 7.0, 2.6, 2.4, (Y.YEL, Y.PINK, Y.CYAN)),
                                 (7.4, 10.8, 2.3, 2.5, ('#ff5040', '#ffc040')), (16.2, 18.0, 2.3, 2.5, None),
                                 (21.4, 25.0, 1.8, 2.3, (Y.CYAN, Y.PURP)), (26.6, 29.4, 2.3, 2.3, ('#ff5040', '#ffc040', '#ff5040')),
                                 (35.0, 38.6, 3.4, 3.2, (Y.PURP, Y.CYAN)), (39.0, 43.8, 2.4, 2.6, (Y.PINK, Y.MAG))):
    D.cable(k, (xa, RF + 0.08, za), (xb, RF + 0.08, zb), sag=0.22, lights=lights)
for (xa, xb) in ((2.0, 13.5), (14.0, 25.0), (25.5, 37.5), (38.0, 43.5)):        # across the lane to the lamps
    D.cable(k, (xa, RF + 0.08, 2.6), (xb, 12.6, 2.45), sag=0.3, lights=(Y.YEL, Y.PINK, Y.CYAN, Y.PURP), n=14)

# ---- on the lane ------------------------------------------------------------------------------------
for (x, r, col) in ((2.0, 9.4, Y.CYAN), (13.5, 12.6, Y.PURP), (25.0, 12.6, Y.PINK), (37.5, 12.6, Y.CYAN), (43.0, 9.4, Y.PINK)):
    Y.street_lamp(k, x, r, col=col)
Y.metal_bench(k, 2.6, 4.0, 9.5)
Y.street_planter(k, 6.2, 9.4, glow=Y.CYAN)
Y.trash_can(k, 9.5, 9.4)
Y.vending_machine(k, 11.6, 8.55)
Y.vending_machine(k, 34.3, 8.55, body='#183040')
Y.holo_kiosk(k, 14.5, 10.6)
D.drone_parked(k, 17.6, 8.6)
k.solid(17, 8, 18, 9)
Y.street_planter(k, 20.4, 9.4, leaf='#3a2a50', glow=Y.PINK)
D.food_cart(k, 18.0, 12.0)
Y.metal_bench(k, 27.2, 28.6, 12.4)
D.food_cart(k, 31.5, 11.4, col='#40c8d8')
Y.street_planter(k, 38.0, 9.4, glow=Y.YEL)
D.trash_pile(k, 32.9, 8.45)
D.dumpster(k, 43.2, 8.5)
D.steam_grate(k, st, 6.5, 11.6)
D.steam_grate(k, st, 22.5, 10.4)
D.steam_grate(k, st, 35.5, 12.0)
Y.manhole(k, 16.5, 10.3)
Y.manhole(k, 40.0, 10.8)
for (x, r, rx, ry, c) in ((4.8, 11.4, 0.7, 0.35, Y.CYAN), (10.8, 10.5, 0.5, 0.25, Y.PINK), (19.2, 10.2, 0.8, 0.3, Y.PURP),
                          (24.6, 11.2, 0.6, 0.3, Y.YEL), (29.6, 12.9, 0.7, 0.28, '#ff5050'), (33.6, 10.4, 0.5, 0.25, Y.CYAN),
                          (41.6, 12.2, 0.8, 0.3, Y.MAG), (1.4, 12.6, 0.4, 0.2, Y.YEL), (15.4, 13.2, 0.5, 0.2, Y.PINK)):
    Y.puddle(k, x, r, rx, ry, tint=c)
Y.street_railing(k, -0.5, COLS + 0.5, 14.0)

# ---- light ---------------------------------------------------------------------------------------------
for (x, c) in ((5.0, '#a060ff'), (13.0, '#ff60c0'), (21.0, '#60c0ff'), (29.0, '#ff8040'), (37.0, '#a060ff'), (42.0, '#ff40c0')):
    k.point_light(x, 10.5, 3.0, c, 40, radius=1.0)
k.area_light(22.0, 6.0, 12.0, '#7058b8', 1100, 46.0, rot=(math.radians(-35), 0, 0))     # sky glow on the roofs

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.8}}, light_samples=128,
         world_light=('#241a40', 0.5))

# ---- the world -----------------------------------------------------------------------------------------
w = json.load(open(WORLD))
w['width'], w['height'] = COLS, ROWS
w['spawns'] = {'player': [22, 11]}
w.pop('designTiles', None)
w.pop('designTileNames', None)


def dialog(x, y, label, prompt, text):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


def enter(x, y, target, label, prompt='PRESS E TO ENTER', spawn=(7, 8)):
    return {'x': x, 'y': y, 'type': 'enter_world', 'target': target, 'spawn': list(spawn), 'label': label, 'prompt': prompt}


old = {it.get('label'): it for it in w.get('interactions', [])}


def keep(label, x, y):
    it = dict(old[label])
    it['x'], it['y'] = x, y
    return it


w['interactions'] = [
    enter(1, 7, 'junk-pawn-shop', 'JOROS PAWNSHOP'),
    enter(4, 7, 'arcadia-shop', 'ARCADIAMART'),
    enter(8, 7, 'cyber-noodle-bar', 'CYBER NOODLES'),
    enter(12, 7, 'arcadia', 'ARCADIA ARCADE', 'ENTER ARCADE'),
    enter(13, 7, 'arcadia', 'ARCADIA ARCADE', 'ENTER ARCADE'),
    enter(16, 7, 'tech-repair-shop', 'TINKERS TECH'),
    enter(19, 7, 'chrome-clinic', 'CHROME CLINIC'),
    {'x': 0, 'y': 10, 'type': 'leave_world', 'label': 'SHIP', 'prompt': 'RETURN TO BRIDGE'},
    {'x': 43, 'y': 10, 'type': 'leave_world', 'label': 'SHIP', 'prompt': 'RETURN TO BRIDGE'},
    keep('PASSERBY', 10, 10),
    keep('STREET KID', 7, 12),
    keep('TRASH CAN', 9, 9),
    keep('HOLO-BILLBOARD', 14, 10),
    keep('HOVER-BIKE DOCK', 22, 7),
    keep('TOKEN KIOSK', 24, 8),
    keep('NEON RAMEN', 27, 7),
    keep('CYBER GEAR', 17, 7),
    dialog(20, 7, 'CHROME CLINIC', 'PRESS E TO PEEK',
           'THROUGH THE FROSTED GLASS:\n\nSTERILE LIGHT, CHROME LIMBS,\nAND QUIET MACHINES WAITING\nBEHIND A SEALED DOOR.'),
    dialog(25, 7, 'LUCKY 7', 'PRESS E TO PEEK',
           'A ROAR OF BALL BEARINGS.\n\nROWS OF PACHINKO MACHINES,\nA HAZE OF SMOKE, NOBODY\nLOOKS UP FROM THEIR GAME.'),
    dialog(31, 7, 'SKYWALK LIFT', 'PRESS E TO CALL',
           'THE LIFT CHIMES SOMEWHERE\nHIGH ABOVE.\n\nA SCREEN: "SKYWALK LEVEL -\nSERVICE IN PROGRESS."'),
    dialog(33, 7, 'ALLEY GATE', 'PRESS E TO LOOK',
           'A GATE CHAINED SHUT.\n\nBEYOND IT THE BACK STREETS\nRUN DARK AND WET. SOMEONE\nSPRAYED "NULL" ON THE BARS.'),
    dialog(36, 7, 'CAPSULE HOTEL', 'PRESS E TO PEEK',
           'CAPSULE HOTEL, 24 HOURS.\n\nA SIGN BLINKS:\n"NO VACANCY. TRY TOMORROW."'),
    dialog(41, 7, 'CLUB VOID', 'PRESS E TO KNOCK',
           'BASS THROUGH THE DOOR.\n\nA SLOT OPENS. TWO EYES.\n"MEMBERS ONLY."\nTHE SLOT CLOSES.'),
    dialog(18, 11, 'SKEWER CART', 'PRESS E TO ORDER',
           'SKEWERS HISS ON THE GRILL.\n\n"TWO CREDITS EACH, OR\nTHREE FOR A STORY."'),
    dialog(31, 11, 'SODA CART', 'PRESS E TO ORDER',
           'NEON SODA IN TWELVE\nFLAVOURS NOBODY CAN NAME.\n\nTHIS ONE TASTES BLUE.'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')

for (c, r) in ((10, 10), (7, 12), (11, 8), (34, 8)):          # NPCs, behind the vending machines
    k.solid(c, r, c + 1, r + 1)
apply_world(WORLD, k, (0, 8, COLS - 1, 13), scene_id='arcadia-street',
            actors=[{'sheet': 'npc-shopper', 'x': 10, 'y': 10, 'facing': 'down'},
                    {'sheet': 'npc-pawn-customer', 'x': 7, 'y': 12, 'facing': 'up'}],
            scene_extra={'backdrop': True, 'ads': st.ads, 'steam': st.steam, 'bulbs': st.bulbs})
w = json.load(open(WORLD))
w['view'] = [-0.5, -4.5, COLS + 0.5, ROWS + 0.4]
w['cameraLead'] = -2.0
w['skyline'] = {'baseRow': 5.2, 'railRow': 14.3, 'centerCol': COLS / 2,
                'rain': {'drops': 150, 'splash': [0, RF + 0.3, COLS, 13.8]}}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('street done')
