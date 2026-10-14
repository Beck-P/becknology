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
import assets_signs as S               # noqa: E402

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
k.box(-0.5, 12.0, 0.0, COLS + 0.5, 12.06, 0.004, '#24203a', 'gutter')
for x in range(0, COLS, 6):                                    # drains along the gutter
    k.boxes([(x + 2.7 + i * 0.1, 11.96, 0.004, x + 2.74 + i * 0.1, 12.1, 0.006) for i in range(6)], '#16121e', 'drain')
for x in range(0, COLS, 3):                                    # kerb lights by the railing
    k.box(x + 1.4, 13.82, 0.0, x + 1.6, 13.9, 0.01, '#0c2a30', 'kerb_light', emit=(Y.CYAN, 0.8))

# ---- the frontages ---------------------------------------------------------------------------------
# every shop its own sign: real typefaces (assets_signs), neon outlines, channel letters, lightboxes,
# vertical glyph signs and neon icons — the first floor above each shop is given over to its sign
G = 1.35
SZ = G + 0.12                                                   # sign baseline


def fit(text, font, max_w, size):
    w = S.width(text, font, size)
    return size * min(1.0, max_w / w)


front(0.0, 3.2, floors=2, kind='shutter', trim=Y.YEL, door_x=1.5, glow='#6a4418', sign_floor=True,
      roof=('tank', 'antenna'), wall='#3a2e2a', clad='brick')
S.letters(k, 'PAWN', 'Bungee', 1.25, RF, SZ + 0.1, size=fit('PAWN', 'Bungee', 2.0, 0.62), col=Y.YEL)
S.icon_ring(k, 2.75, RF, SZ + 0.12, s=0.42)
S.blade(k, '質屋', 'DelaGothicOne', 3.0, RF, 0.5, 1.6, col='#ffd040', w=0.42)
D.razor_wire(k, 0.1, 3.1, RF - 0.06, G + 1.15 + 0.14)
front(3.2, 7.2, floors=3, kind='glass', trim=Y.CYAN, door_x=4.5, glow='#5a7a9a', sign_floor=True,
      awning=('#40c8d8', 'metal'), escape=(5.7, 7.0), roof=('dish', 'vent'), wall='#2a3040', clad='tile', window_neon=Y.CYAN)
S.lightbox(k, 'ARCADIA MART', 'RussoOne', 5.2, RF, SZ + 0.05, 3.6, 0.5, bg='#e8f4ff', ink='#1a3a8a', glow='#a0d0ff')
S.neon(k, '24H', 'ZenDots', 6.5, RF, SZ + 0.72, size=0.3, col=Y.CYAN)
front(7.2, 11.0, floors=2, kind='glass', trim=Y.PINK, door_x=8.5, glow='#8a3020', sign_floor=True,
      balcony_at=(9.2, 10.8), roof=('vent', 'tank'), wall='#3a2228', clad='brick', window_neon=Y.PINK)
D.timber_front(k, 7.2, 11.0, RF, G)
S.letters(k, 'NOODLES', 'RubikMonoOne', 8.75, RF, G + 0.55, size=fit('NOODLES', 'RubikMonoOne', 2.6, 0.42), col='#ff6aa0')
S.icon_bowl(k, 10.45, RF, G + 0.5, s=0.45)
S.blade(k, 'ラーメン', 'DelaGothicOne', 7.35, RF, 0.45, 2.0, col='#ff5050', w=0.44)
for (x, z) in ((7.6, 1.0), (8.0, 0.85), (9.95, 0.95), (10.35, 0.8), (10.75, 1.0)):
    Y.paper_lantern(k, x, RF + 0.5, z, s=0.32, top=1.35)
# the arcade: three storeys, a marquee of bulbs round the big sign, a billboard on top
AH = front(11.0, 16.0, floors=3, kind='glass', door_x=13.0, door_w=1.6, glow='#6a2aa0', trim=Y.PURP,
           roof=('vent',), ad=(11.6, 15.4, 1.3, 1), wall='#241c40', clad='metal', sign_floor=True, windows=False)
D.arcade_canopy(k, st, 12.1, 13.9, RF, G - 0.06)
D.portholes(k, 11.3, 15.7, RF, G + 1.15 + 0.55, col=Y.PINK, n=5)
k.box(11.15, RF, 1.38, 15.85, RF + 0.04, 2.42, '#0c0818', 'marquee_board')
S.neon(k, 'ARCADE', 'Audiowide', 13.5, RF + 0.04, SZ + 0.2, size=fit('ARCADE', 'Audiowide', 3.9, 0.7), col=Y.CYAN, tube=0.02)
S.letters(k, 'PLAY ALL NIGHT', 'ZenDots', 13.5, RF + 0.04, SZ + 0.03, size=0.13, col=Y.PINK)
S.icon_joystick(k, 15.45, RF + 0.04, SZ + 0.25, s=0.42)
S.blade(k, 'ゲーム', 'DelaGothicOne', 11.0, RF, 2.6, 1.4, col='#ff70c0', w=0.42)
bulbs = []
for i in range(23):                                            # the marquee's chasing bulbs
    t = i / 22
    bulbs.append((11.25 + t * 4.5, 1.42))
    bulbs.append((11.25 + t * 4.5, 2.38))
for x, z in bulbs:
    k.sphere(x, RF + 0.07, z, 0.035, 0.035, '#fff0c0', 'marquee_bulb', emit=('#ffe090', 1.0), segs=5)
    st.bulbs.append([round(x, 3), round(RF + 0.07 - z * D.C45, 3)])
front(16.0, 18.2, floors=2, kind='garage', trim=Y.GREEN, door_x=16.5, door_w=0.6, sign_floor=True,
      glow='#2a7a4a', roof=('antenna',), wall='#283028', clad='metal')
S.lightbox(k, 'TECH', 'ZenDots', 16.85, RF, SZ + 0.08, 1.5, 0.48, bg='#2a9a5a', ink='#06140a', glow='#40e080')
S.icon_wrench(k, 17.85, RF, SZ + 0.1, s=0.4)
front(18.2, 21.2, floors=3, kind='clinic', trim=Y.CYAN, door_x=19.5, glow='#3a8a9a', sign_floor=True,
      roof=('dish',), wall='#4a5464', clad='tile')
S.letters(k, 'CLINIC', 'RussoOne', 19.4, RF, SZ + 0.15, size=fit('CLINIC', 'RussoOne', 2.0, 0.5), col='#d0f8ff')
k.box(20.55, RF + 0.02, 1.5, 20.95, RF + 0.05, 2.1, '#e0f0f4', 'cross', emit=(Y.CYAN_L, 0.6))
k.box(20.68, RF + 0.05, 1.45, 20.82, RF + 0.07, 2.15, '#40c8d8', 'cross', emit=(Y.CYAN, 0.9))
k.box(20.4, RF + 0.05, 1.73, 21.1, RF + 0.07, 1.87, '#40c8d8', 'cross', emit=(Y.CYAN, 0.9))
front(21.2, 23.6, floors=1, kind='garage', door_x=21.8, door_w=0.5, glow='#18283a', trim=Y.CYAN, roof=('vent',),
      r=RF - 0.6, wall='#24242e')
S.neon(k, 'HOVER', 'Audiowide', 22.4, RF - 0.6, 1.0, size=0.26, col=Y.CYAN)
Y.hover_bike(k, 22.5, RF - 0.05)
front(23.6, 26.4, floors=2, kind='glass', trim=Y.YEL, door_x=25.2, glow='#8a6a10', sign_floor=True,
      roof=('tank',), wall='#3a2a22', clad='brick', window_neon=Y.YEL)
S.letters(k, 'LUCKY', 'Righteous', 24.75, RF, SZ + 0.3, size=fit('LUCKY', 'Righteous', 1.55, 0.5), col=Y.YEL)
D.bulb_seven(k, st, 25.95, RF, SZ + 0.05, h=0.85)
S.blade(k, 'パチンコ', 'DelaGothicOne', 23.8, RF, 1.6, 1.9, col='#ffb040', w=0.4)
Y.token_kiosk(k, 24.1, RF + 0.4)
front(26.4, 29.6, floors=2, kind='stall', door_x=29.1, door_w=0.5, glow='#7a3a20', trim=Y.RED, roof=('vent', 'dish'),
      r=RF - 0.6, wall='#2e1e22', sign_floor=True)
S.lightbox(k, 'ラーメン', 'DelaGothicOne', 27.7, RF - 0.6, 2.55, 2.2, 0.5, bg='#f4e4c8', ink='#b01818', glow='#ffd8a0')
Y.ramen_stand(k, 26.7, 28.7, RF - 0.45, RF)
# the Skywalk lift: a slim tower with a glass lift shaft up its face
SH = front(29.6, 32.6, floors=3, kind='glass', door_x=31.1, door_w=0.9, glow='#2a8aa0', trim=Y.CYAN, roof=('antenna',),
           ad=(29.9, 32.3, 1.1, 5), wall='#1e2a40', clad='metal')
k.box(30.65, RF + 0.02, 0.1, 31.55, RF + 0.12, SH, '#0c1a22', 'lift_shaft', emit=('#1a4a5a', 0.5))
k.box(30.7, RF + 0.12, 2.1, 31.5, RF + 0.16, 2.9, '#2a3a44', 'lift_car', emit=(Y.CYAN_L, 0.4))
S.letters(k, 'SKYWALK', 'Audiowide', 31.1, RF + 0.16, 1.42, size=0.2, col=Y.CYAN_L)
# the alley gate: an arch through to the back streets, chained shut
front(32.6, 34.8, floors=2, kind='club', door_x=33.7, door_w=1.1, glow='#100a18', trim=Y.MAG, roof=('tank',),
      wall='#2a242e', clad='brick')
k.boxes([(x, RF + 0.04, 0.05, x + 0.04, RF + 0.08, 1.15) for x in [33.2 + i * 0.12 for i in range(9)]], '#4a4a52', 'gate_bars')
k.tube((33.2, RF + 0.1, 0.6), (34.2, RF + 0.1, 0.7), 0.025, '#8a8a90', 'chain', verts=4)
S.letters(k, 'NULL', 'Bungee', 33.7, RF + 0.02, 1.6, size=0.36, col=Y.GREEN, energy=3)
front(34.8, 38.8, floors=3, kind='glass', trim=Y.PURP, door_x=36.6, glow='#3a5a9a', sign_floor=True,
      awning=('#7080e8', 'metal'), roof=('dish', 'tank'), wall='#2c2840', clad='tile', windows=False)
D.capsule_wall(k, 35.0, 38.6, RF, G + 0.82, G + 2 * 1.15 - 0.05)
S.letters(k, 'HOTEL', 'Righteous', 36.4, RF, SZ + 0.08, size=0.42, col='#c8b0ff')
S.lightbox(k, 'CAPSULE', 'RussoOne', 38.15, RF, SZ + 0.12, 1.0, 0.3, bg='#c0b0ff', ink='#1a0a40', glow='#a080ff')
front(38.8, 44.0, floors=2, kind='club', trim=Y.MAG, door_x=41.5, glow='#b020b0', sign_floor=True,
      roof=('vent', 'antenna'), ad=(39.4, 43.4, 1.0, 2), wall='#1e1626', clad='metal')
D.monolith(k, 38.8, 44.0, RF, G + 0.02, G + 1.15 + 0.1)
S.letters(k, 'VOID', 'Monoton', 40.9, RF + 0.1, SZ + 0.05, size=fit('VOID', 'Monoton', 2.6, 0.8), col='#e050e0')
D.velvet_rope(k, 39.6, 41.0, RF + 0.5)
k.solid(39.5, 8.0, 41.0, 8.9)
S.blade(k, 'クラブ', 'DelaGothicOne', 38.95, RF, 0.5, 1.6, col='#ff60d0', w=0.4)
D.poster_wall(k, 39.2, 40.8, RF + 0.02, 0.3, 1.1)
D.poster_wall(k, 42.3, 43.8, RF + 0.02, 0.3, 1.1)

# ---- overhead: cables and string lights, up under the eaves and across the lane ----------------------
for (xa, xb, za, zb, lights) in ((3.6, 7.0, 3.3, 3.2, (Y.YEL, Y.PINK, Y.CYAN)), (16.2, 18.0, 2.4, 2.45, None),
                                 (26.6, 29.4, 2.4, 2.4, ('#ff5040', '#ffc040', '#ff5040')), (35.0, 38.6, 3.5, 3.4, (Y.PURP, Y.CYAN))):
    D.cable(k, (xa, RF + 0.08, za), (xb, RF + 0.08, zb), sag=0.2, lights=lights)
for (xa, xb, za) in ((3.0, 13.5, 3.4), (16.5, 25.0, 2.45), (26.0, 36.5, 2.45), (38.6, 43.5, 2.45)):    # across to the lamps
    D.cable(k, (xa, RF + 0.08, za), (xb, 12.7, 2.45), sag=0.3, lights=(Y.YEL, Y.PINK, Y.CYAN, Y.PURP), n=14)

# ---- on the lane: the shopfront row stays clear; furniture lines the kerb -------------------------
for (x, r, col) in ((3.0, 12.7, Y.CYAN), (13.5, 12.7, Y.PURP), (25.0, 12.7, Y.PINK), (36.5, 12.7, Y.CYAN)):
    Y.street_lamp(k, x, r, col=col)
Y.metal_bench(k, 4.4, 5.8, 12.55)
Y.street_planter(k, 7.6, 12.55, glow=Y.CYAN)
Y.trash_can(k, 9.6, 12.6)
Y.vending_machine(k, 11.45, 8.55)
Y.vending_machine(k, 34.45, 8.55, body='#183040')
Y.holo_kiosk(k, 14.5, 10.6)
D.food_cart(k, 18.0, 12.4)
Y.street_planter(k, 21.5, 12.55, leaf='#3a2a50', glow=Y.PINK)
Y.metal_bench(k, 27.2, 28.6, 12.55)
D.food_cart(k, 31.5, 12.4, col='#40c8d8')
Y.street_planter(k, 39.5, 12.55, glow=Y.YEL)
D.drone_parked(k, 41.8, 12.6)
k.solid(41, 12, 43, 13)
D.trash_pile(k, 32.95, 8.3)
D.dumpster(k, 43.2, 8.5)
D.steam_grate(k, st, 6.5, 10.6)
D.steam_grate(k, st, 22.5, 10.4)
D.steam_grate(k, st, 35.5, 10.8)
Y.manhole(k, 16.5, 10.3)
Y.manhole(k, 40.0, 10.4)
for (x, r, rx, ry, c) in ((4.8, 11.0, 0.7, 0.35, Y.CYAN), (10.8, 10.2, 0.5, 0.25, Y.PINK), (19.2, 10.0, 0.8, 0.3, Y.PURP),
                          (24.6, 11.0, 0.6, 0.3, Y.YEL), (29.6, 10.6, 0.7, 0.28, '#ff5050'), (33.6, 10.4, 0.5, 0.25, Y.CYAN),
                          (41.6, 11.2, 0.8, 0.3, Y.MAG), (1.4, 11.4, 0.4, 0.2, Y.YEL), (15.4, 13.2, 0.5, 0.2, Y.PINK)):
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
    keep('STREET KID', 5, 10),
    keep('TRASH CAN', 9, 12),
    keep('HOLO-BILLBOARD', 14, 10),
    keep('HOVER-BIKE DOCK', 22, 8),
    keep('TOKEN KIOSK', 24, 8),
    keep('NEON RAMEN', 27, 7),
    keep('CYBER GEAR', 17, 7),
    dialog(20, 7, 'CHROME CLINIC', 'PRESS E TO PEEK',
           'THROUGH THE FROSTED GLASS:\n\nSTERILE LIGHT, CHROME LIMBS,\nAND QUIET MACHINES WAITING\nBEHIND A SEALED DOOR.'),
    dialog(25, 7, 'LUCKY 7', 'PRESS E TO PEEK',
           'A ROAR OF BALL BEARINGS.\n\nROWS OF PACHINKO MACHINES,\nA HAZE OF SMOKE, NOBODY\nLOOKS UP FROM THEIR GAME.'),
    enter(31, 7, 'arcadia-skypad', 'SKYWALK LIFT', 'PRESS E TO RIDE UP', spawn=(19, 5)),
    dialog(33, 7, 'ALLEY GATE', 'PRESS E TO LOOK',
           'A GATE CHAINED SHUT.\n\nBEYOND IT THE BACK STREETS\nRUN DARK AND WET. SOMEONE\nSPRAYED "NULL" ON THE BARS.'),
    dialog(36, 7, 'CAPSULE HOTEL', 'PRESS E TO PEEK',
           'CAPSULE HOTEL, 24 HOURS.\n\nA SIGN BLINKS:\n"NO VACANCY. TRY TOMORROW."'),
    dialog(41, 7, 'CLUB VOID', 'PRESS E TO KNOCK',
           'BASS THROUGH THE DOOR.\n\nA SLOT OPENS. TWO EYES.\n"MEMBERS ONLY."\nTHE SLOT CLOSES.'),
    dialog(18, 12, 'SKEWER CART', 'PRESS E TO ORDER',
           'SKEWERS HISS ON THE GRILL.\n\n"TWO CREDITS EACH, OR\nTHREE FOR A STORY."'),
    dialog(31, 12, 'SODA CART', 'PRESS E TO ORDER',
           'NEON SODA IN TWELVE\nFLAVOURS NOBODY CAN NAME.\n\nTHIS ONE TASTES BLUE.'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')

for (c, r) in ((10, 10), (5, 10)):                            # NPCs
    k.solid(c, r, c + 1, r + 1)
for (c, r) in ((17, 11), (18, 10), (18, 11), (21, 11), (31, 11), (32, 11), (32, 10), (39, 11), (14, 9), (7, 11)):   # behind parasols, trees
    k.solid(c, r, c + 1, r + 1)
apply_world(WORLD, k, (0, 8, COLS - 1, 13), scene_id='arcadia-street',
            actors=[{'sheet': 'npc-shopper', 'x': 10, 'y': 10, 'facing': 'down'},
                    {'sheet': 'npc-pawn-customer', 'x': 5, 'y': 10, 'facing': 'right'}],
            scene_extra={'backdrop': True, 'ads': st.ads, 'steam': st.steam, 'bulbs': st.bulbs})
w = json.load(open(WORLD))
w['view'] = [-0.5, -4.5, COLS + 0.5, ROWS + 0.4]
w['cameraLead'] = -2.0
w['skyline'] = {'baseRow': 5.2, 'railRow': 14.3, 'centerCol': COLS / 2,
                'rain': {'drops': 150, 'splash': [0, RF + 0.3, COLS, 13.8]}}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('street done')
