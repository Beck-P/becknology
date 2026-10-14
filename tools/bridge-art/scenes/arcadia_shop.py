"""ArcadiaMart — Blender scene. Usage: BVENV/bin/python arcadia_shop.py RENDER_DIR"""
import sys
from _cyber_room import Y, H, FLOOR, DOORS, new_kit, render, apply_world, world_path

k = new_kit(111)
Y.cyber_room(k, 1, 2, 13, 9, H, floor_tones=('#b8bcc8', '#a8acb8'), top_neon=Y.CYAN, base_neon=Y.PINK)

Y.cooler_bank(k, 1.0, 5.0, 2.0)
Y.cooler_bank(k, 10.0, 13.0, 2.0)
Y.fluoro_panel(k, 5.2, 6.6, 2.05, 2.2)
Y.fluoro_panel(k, 8.4, 9.8, 2.05, 2.2)
Y.glow_poster(k, 7.5, 2.0, 0.85, w=0.9, h=1.15, bg='#100a30', accent=Y.CYAN_L, kind=1)
Y.neon_text(k, 'MART', 7.5, 2.0, 2.15, h=0.22, col=Y.PINK, board=False, energy=4)

for (cx, cr) in ((2.5, 4.5), (4.5, 4.5), (2.5, 6.5), (4.5, 6.5), (9.5, 4.5), (11.5, 4.5)):
    Y.gondola(k, cx, cr)
Y.checkout(k, 9.0, 12.0, 7.0, 7.6)
k.solid(10, 6, 11, 7)                     # the cashier
Y.vending_machine(k, 12.5, 7.95, body='#183040')
k.box(1.1, 7.9, 0.0, 1.9, 8.35, 1.1, ('#5a5a6a', 0.05), 'magazine_rack')
for i in range(4):
    for j in range(2):
        col = Y.PACK[(i + j * 3) % len(Y.PACK)]
        k.box(1.15 + i * 0.18, 8.35, 0.2 + j * 0.45, 1.3 + i * 0.18, 8.37, 0.55 + j * 0.45, col, 'magazine')
k.solid(1, 7, 2, 9)

for (x, r) in ((3.5, 5.5), (10.5, 5.6), (7.0, 7.8)):
    k.point_light(x, r, 2.6, '#e8f0ff', 50, radius=0.8)

render(k, sys.argv[1], ambient=('#3a3a50', 0.45))
apply_world(world_path('arcadia-shop'), k, FLOOR, doors=DOORS, scene_id='arcadia-shop', moves={
    'CASHIER': (10, 7), 'COOLER': (1, 2), 'WALL POSTER': (7, 2), 'BROWSING CUSTOMER': (7, 5),
    'SNACK SHELF': [(2, 4), (9, 4)], 'VENDING MACHINE': (12, 8)},
    actors=[{'sheet': 'npc-cashier', 'x': 10, 'y': 6, 'facing': 'down'},
            {'sheet': 'npc-shopper', 'x': 7, 'y': 5, 'facing': 'left'}])
print('arcadia-shop done')
