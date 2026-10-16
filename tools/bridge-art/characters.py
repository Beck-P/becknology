"""Model characters in Blender and render native sprite frames.

  BVENV/bin/python tools/bridge-art/characters.py OUTDIR npc-bartender
  python3 tools/bridge-art/sprites_post.py npc OUTDIR/npc-bartender

The pilot is customisable (js/look.js): pilot[-sit|-ski|-climb][-<style>]-<body a|b>
renders one suit on one body with every head (each hairstyle, with and without a
beard, and the helmet) into OUTDIR/<head>/. Suit, skin and hair are drawn in KEY
colours that the game swaps for the player's picks, so no colour is baked in.
tools/bridge-art/pilots.sh renders and packs the lot into assets/characters/pilots/.

Characters use the scene camera (45° orthographic, 32 px per tile) and tile
units, so they sit at true stool height and match the pre-rendered rooms.
Frames are 32 × 48; the floor point under the character (its feet, or the
seat centre for sitting poses) lands on pixel (16, 45).

Shading is done in the shader: N·L against a fixed key light (high,
upper-left), three flat tone bands per material, no lamps, one sample, no
filtering or dithering. Passes: color_<variant>/, id/, depth/ — see
sprites_post.py for line work and packing.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

OUT, WHO = sys.argv[1], sys.argv[2]
W, H = 32, 48
ORIGIN_PX = (16, 45)
ELEV = math.radians(45)
UNIT = 0.055        # model units → tiles (the pilot is ~31 units ≈ 1.7 tiles)

SUITS = {
    'purple': ('#6048a0', '#a078dc', '#c0a8ee'),
    'cyan':   ('#388890', '#5cc8d0', '#8ce0e8'),
    'red':    ('#903838', '#d06060', '#e89090'),
    'green':  ('#387838', '#60b060', '#90d090'),
    'gold':   ('#887028', '#c8a840', '#e0c870'),
    'white':  ('#909090', '#d0d0d0', '#f0f0f0'),
}
# The pilot's recolourable tones are rendered in these exact key colours (dark, mid, light);
# js/look.js swaps them, and the darkened line-work copies of them, for the player's picks.
# Keep in step with KEYS in js/look.js.
KEYS = {
    'suit':   ('#200070', '#3000b0', '#4000f0'),
    'suitdk': ('#100038', '#180058', '#200078'),
    'arm':    ('#003870', '#0050b0', '#0068f0'),
    'skin':   ('#700020', '#b00030', '#f00040'),
    'hair':   ('#007020', '#00b030', '#00f040'),
}
HAIRSTYLES = ['short', 'bald', 'long', 'bun', 'ponytail', 'curly', 'mohawk']
FIXED = {
    'helmet': ('#8c8ca8', '#d4d4e4', '#f6f6ff'),
    'visor':  ('#1c5a70', '#3aa8c0', '#8ee4f0'),
    'boot':   ('#141420', '#262636', '#3a3a50'),
    'pack':   ('#2c2c3c', '#4a4a5e', '#6c6c84'),
    'brass':  ('#7a5a20', '#c8a040', '#f0d070'),
    'glint':  ('#ffffff', '#ffffff', '#ffffff'),
    'ledc':   ('#80f0ff', '#80f0ff', '#80f0ff'),
    'ledy':   ('#ffe080', '#ffe080', '#ffe080'),
    'ledoff': ('#3a3a48', '#3a3a48', '#3a3a48'),
    'skin':   ('#9a6a4e', '#d8a07a', '#f0c49c'),
    'skin2':  ('#7a4e36', '#b0784e', '#cc9468'),
    'skin3':  ('#3e2418', '#6a3e28', '#8a563a'),
    'skin0':  ('#b48468', '#ecc0a0', '#fcdcc4'),     # very fair (Queen Alyssa)
    'eye':    ('#120c0a', '#120c0a', '#2a1a14'),
    'white':  ('#9a968c', '#e4e0d4', '#fbf8f0'),
    'leather': ('#3a2416', '#5e3a22', '#7e5232'),
    'pants':  ('#24202a', '#3e3646', '#5a5064'),
    'steel':  ('#4a5060', '#8a94a8', '#c8d0e0'),
    'steeldk': ('#22262e', '#3a404c', '#5a6272'),
    'fur':    ('#a89a88', '#e2d8c8', '#fbf6ec'),
    'sneaker': ('#8a8a96', '#dcdce6', '#ffffff'),
    'ski':    ('#6a1812', '#c83a2e', '#f07a60'),
    'pole':   ('#1e1e26', '#4a4a56', '#8a8a98'),
    'ledp':   ('#f078c8', '#f078c8', '#f078c8'),
    # the Neon Royale's dress code (bow ties, shades, white gloves, sequins, a tray of drinks)
    'bowtie': ('#0a0a0e', '#18181e', '#2e2e3a'),
    'shades': ('#06060a', '#14141c', '#5a5a78'),
    'bib':    ('#9a968c', '#e4e0d4', '#fbf8f0'),
    'glove':  ('#9a968c', '#e4e0d4', '#fbf8f0'),
    'sequin': ('#c8a040', '#fff0b0', '#ffffff'),
    'glassA': ('#a06010', '#e8b030', '#fff0a0'),
    'glassB': ('#a02040', '#e04070', '#ff90b0'),
}
NPCS = {
    # tone keys: shirt, sleeve, pants, hair, apron?, hat?
    'npc-bartender': dict(skin='skin', shirt=('#8a8478', '#d8d2c4', '#f2ede2'), apron=('#4a2e1a', '#7a5032', '#9a6a44'),
                          hair=('#2a1a10', '#4a2e1a', '#6a4428'), bald=True, mustache=True, pose='stand'),
    'npc-regular':   dict(skin='skin2', shirt=('#1e4a5a', '#2e7088', '#4a94ac'), hair=('#2a1a10', '#4a2e1a', '#6a4428'),
                          beanie=('#6a1e1e', '#a83232', '#c85050'), beard=True, pose='sit'),
    'npc-merchant':  dict(skin='skin', shirt=('#2e4a2e', '#4a7244', '#6a9460'), vest=('#3a2416', '#5e3a22', '#7e5232'),
                          hair=('#6a6a70', '#a0a0a8', '#c8c8d0'), cap=('#3a2a1a', '#5e4228', '#7e5a38'), beard=True, pose='sit'),
    'npc-innkeeper': dict(skin='skin', shirt=('#8a7a62', '#d0c0a0', '#ece0c4'), skirt=('#2a4a3a', '#3e6a52', '#5a8a6c'),
                          apron=('#9a968c', '#e4e0d4', '#fbf8f0'), hair=('#6a2a14', '#9a4422', '#c06030'), bun=True, pose='stand'),
    'npc-traveler':  dict(skin='skin2', shirt=('#3e444c', '#5e6872', '#828e9a'), hair=('#2a1a10', '#4a2e1a', '#6a4428'),
                          hood=('#3e444c', '#5e6872', '#828e9a'), pose='sit'),
    'npc-quiet':     dict(skin='skin', shirt=('#2e1e34', '#4a3050', '#664670'), hair=('#1a1418', '#2e2430', '#443a48'),
                          hood=('#2e1e34', '#4a3050', '#664670'), pose='sit'),
    'npc-baker':     dict(skin='skin', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), apron=('#9a968c', '#e4e0d4', '#fbf8f0'),
                          hair=('#5a3a1a', '#8a5a2a', '#aa7a42'), chef=True, mustache=True, pose='stand'),
    'npc-smith':     dict(skin='skin2', shirt=('#2a2a30', '#44444c', '#5e5e68'), sleeve='skin', apron=('#3a2416', '#5e3a22', '#7e5232'),
                          hair=('#1a1410', '#2e2218', '#44342a'), bald=True, beard=True, brawny=True, pose='stand'),
    'npc-apothecary': dict(skin='skin', shirt=('#3a2450', '#5a3a78', '#7a5a9a'), skirt=('#3a2450', '#5a3a78', '#7a5a9a'),
                           hair=('#8a8a98', '#c0c0cc', '#e2e2ec'), long_hair=True, pose='stand'),
    # Lumar outdoors
    'npc-fishmonger': dict(skin='skin2', shirt=('#3a4a5a', '#5a6a7a', '#7a8a9a'), apron=('#8a7a5a', '#b8a880', '#d8c8a0'),
                           hair=('#5a3a1a', '#8a5a2a', '#aa7a42'), cap=('#2a3a4a', '#3a5068', '#5a7088'), beard=True, pose='stand'),
    'npc-passerby':  dict(skin='skin', shirt=('#4a2a1a', '#7a4a2a', '#9a6a40'), hair=('#2a1a10', '#4a2e1a', '#6a4428'),
                          hood=('#3e444c', '#5e6872', '#828e9a'), pose='stand'),
    'npc-townsman':  dict(skin='skin', shirt=('#2e4a2e', '#4a7244', '#6a9460'), vest=('#3a2416', '#5e3a22', '#7e5232'),
                          hair=('#6a6a70', '#a0a0a8', '#c8c8d0'), cap=('#3a2a1a', '#5e4228', '#7e5a38'), beard=True, pose='stand'),
    'npc-watcher':   dict(skin='skin2', shirt=('#3a1418', '#6a2028', '#8a3038'), hair=('#1a1414', '#2e2224', '#443034'),
                          hood=('#3a1418', '#6a2028', '#8a3038'), beard=True, pose='stand'),
    'npc-harvester': dict(skin='skin', shirt=('#6a3a4a', '#9a5a6a', '#c07a8a'), apron=('#5a4a3a', '#8a7458', '#a89070'),
                          hair=('#c06080', '#e080a0', '#f0a8c0'), bun=True, pose='stand'),
    'npc-trader':    dict(skin='skin2', shirt=('#1a3a6a', '#2a5a9a', '#4a7ac0'), vest=('#c8b890', '#e0d4b0', '#f0e8d0'),
                          hair=('#1a1410', '#2e2218', '#44342a'), cap=('#1a3a6a', '#2a5a9a', '#4a7ac0'), pose='stand'),
    'npc-potter':    dict(skin='skin', shirt=('#8a6a4a', '#b08a60', '#d0aa80'), apron=('#6a3a2a', '#9a5a40', '#b87a5a'),
                          hair=('#8a8a90', '#b8b8c0', '#dcdce4'), bald=True, mustache=True, pose='stand'),
    'npc-fisher-gran': dict(skin='skin', shirt=('#2a3a2e', '#3e5a44', '#5a7a60'), skirt=('#3a2a22', '#5a4032', '#7a5a46'),
                            hair=('#8a8a90', '#c0c0c8', '#e2e2ea'), bun=True, pose='sit'),
    'npc-miner':     dict(skin='skin2', shirt=('#4a3a2a', '#6a5640', '#8a7458'), vest=('#2a2a30', '#44444c', '#5e5e68'),
                          hair=('#8a8a90', '#b8b8c0', '#dcdce4'), beard=True, cap=('#7a6a2a', '#a8943a', '#c8b45a'),
                          pose='sit'),
    'npc-keeper':    dict(skin='skin', shirt=('#18223a', '#26365a', '#3a5080'), vest=('#9a7418', '#d0a028', '#e8c050'),
                          hair=('#8a8a90', '#b8b8c0', '#dcdce4'), bun=True, pose='sit'),
    'npc-scholar':   dict(skin='skin2', shirt=('#3a2a1e', '#5e4430', '#7e6046'), vest=('#1e2a3a', '#2e4058', '#465c78'),
                          hair=('#c8c8d0', '#e0e0e8', '#f4f4fa'), long_hair=True, beard=True, pose='stand'),
    # Arcadia (neon city)
    'npc-stranger':  dict(skin='skin2', shirt=('#1e1430', '#32224e', '#4a3670'), hair=('#1a1418', '#2e2430', '#443a48'),
                          hood=('#1e1430', '#32224e', '#4a3670'), visor_band=True, pose='stand'),
    'npc-cashier':   dict(skin='skin', shirt=('#1a4a50', '#2a7a80', '#4aa8ae'), vest=('#3a1840', '#5a2a60', '#7a4080'),
                          hair=('#5a1a4a', '#8a2a70', '#b04a90'), cap=('#e870c0', '#f078a8', '#f8a8c8'), pose='stand'),
    'npc-shopper':   dict(skin='skin2', shirt=('#4a3a10', '#7a6020', '#a88a3a'), hair=('#1a1410', '#2e2218', '#44342a'),
                          beanie=('#1a3a50', '#2a5a7a', '#4a80a0'), pose='stand'),
    'npc-noodle-chef': dict(skin='skin', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), apron=('#4a1418', '#7a2028', '#a03038'),
                            hair=('#1a1418', '#2e2430', '#443a48'), chef=True, pose='stand'),
    'npc-patron-a':  dict(skin='skin', shirt=('#3a1840', '#5a2a60', '#7a4080'), hair=('#2a6a70', '#40a0a8', '#70d0d8'),
                          long_hair=True, pose='sit'),
    'npc-patron-b':  dict(skin='skin2', shirt=('#2a2a30', '#44444c', '#5e5e68'), vest=('#4a1a14', '#7a2a20', '#a04030'),
                          hair=('#1a1410', '#2e2218', '#44342a'), mohawk=True, bald=True, pose='sit'),
    'npc-doctor':    dict(skin='skin', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), skirt=('#9a968c', '#e4e0d4', '#fbf8f0'),
                          hair=('#1a1418', '#2e2430', '#443a48'), bun=True, mask=True, pose='stand'),
    'npc-pawnbroker': dict(skin='skin2', shirt=('#3a3420', '#5a5030', '#7a7048'), vest=('#2a1a10', '#3e2a1a', '#5a4028'),
                           hair=('#6a6a70', '#a0a0a8', '#c8c8d0'), bald=True, visor_cap=True, beard=True, pose='stand'),
    'npc-pawn-customer': dict(skin='skin', shirt=('#1a3a2a', '#2a5a40', '#4a8060'), hair=('#7a5a1a', '#b08a2a', '#d0b050'),
                              hood=('#1a3a2a', '#2a5a40', '#4a8060'), pose='stand'),
    'npc-technician': dict(skin='skin', shirt=('#3a4a5a', '#5a6a7a', '#7a8a9a'), apron=('#3a3a40', '#5a5a62', '#7a7a84'),
                           hair=('#c05020', '#e07030', '#f0a050'), goggles=True, bun=True, pose='stand'),
    'npc-waiting':   dict(skin='skin2', shirt=('#4a2a50', '#6a4070', '#8a6090'), hair=('#1a1410', '#2e2218', '#44342a'),
                          cap=('#2a2a30', '#44444c', '#5e5e68'), pose='sit'),
    'npc-okafor':    dict(skin='skin3', shirt=('#2e4a52', '#46707a', '#6a98a2'), vest=('#8a4a1a', '#c87830', '#e8a050'),
                          hair=('#141010', '#241c1a', '#362a26'), goggles=True, pose='stand'),
    # The Backs, behind the District (arcadia-alley, null-den)
    'npc-hollin':    dict(skin='skin', shirt=('#a89878', '#d0c4a4', '#ece2c8'), apron=('#2e5a2e', '#3e7a3e', '#5a9a50'),
                          hair=('#5a3a20', '#7a5230', '#9a6a40'), beard=True, straw_hat=('#a8843a', '#d8b058', '#f0d080'), pose='stand'),
    'npc-marlo':     dict(skin='skin2', shirt=('#6a2a22', '#9a3a2e', '#c05a40'), vest=('#3a3a22', '#5a5a34', '#7a7a48'),
                          hair=('#1a1410', '#2e2418', '#443624'), mustache=True, cap=('#2a4a6a', '#3a6a9a', '#5a8ac0'), pose='stand'),
    # the farm's hands (Verdance): Tam in a straw hat and a denim bib, Odile with her grey bun and a work apron
    'npc-tam':       dict(skin='skin', shirt=('#8a3a2a', '#b85a3a', '#d87a50'), apron=('#2a3a5a', '#3a5a8a', '#5a7ab0'),
                          hair=('#8a3a10', '#b85a1a', '#d87a2a'), straw_hat=('#a8843a', '#d8b058', '#f0d080'), pose='stand'),
    'npc-odile':     dict(skin='skin2', shirt=('#5a6a4a', '#7a8a5a', '#9aaa7a'), apron=('#6a5a40', '#8a7a5a', '#aa9a78'),
                          hair=('#7a7a80', '#a8a8b0', '#d0d0d8'), bun=True, pose='stand'),
    # the Peddler of oddments, who sets up in a different world each day: a battered indigo hat, a grey beard, a plum
    # coat and a mustard waistcoat hung with charms
    'npc-peddler':   dict(skin='skin3', shirt=('#3a1a3a', '#5a2a5a', '#7a4a7a'), vest=('#6a5010', '#9a7a20', '#c8a040'),
                          hair=('#7a7a80', '#a8a8b0', '#d0d0d8'), long_hair=True, beard=True,
                          witch_hat=('#22203a', '#363060', '#4e4888'), pose='stand'),
    # Hoarfell (the ski village)
    'npc-ysolde':    dict(skin='skin', shirt=('#8a2a14', '#c84a20', '#f07a40'), vest=('#24262e', '#383a46', '#50525e'),
                          hair=('#a8843a', '#d8b058', '#f0d080'), long_hair=True, beanie=('#1a5a5a', '#2a8080', '#4aa8a8'),
                          goggles=True, pose='stand'),
    'npc-tove':      dict(skin='skin2', shirt=('#a8988a', '#d8ccbc', '#f4ece0'), apron=('#6a1a1a', '#9a2a2a', '#c04a3a'),
                          hair=('#6a2a14', '#9a4020', '#c05a30'), bun=True, pose='stand'),
    'npc-ansgar':    dict(skin='skin3', shirt=('#1a2a4a', '#2a4070', '#4a64a0'), hood=('#1a2a4a', '#2a4070', '#4a64a0'),
                          hair=('#6a6a70', '#9a9aa2', '#c4c4cc'), beard=True, mustache=True, pose='stand'),
    'npc-liv':       dict(skin='skin', shirt=('#8a1a1a', '#c82a2a', '#f04a3a'), vest=('#1a1a22', '#2a2a36', '#3e3e4e'),
                          hair=('#c8a050', '#e8c870', '#f8e8a0'), long_hair=True, goggles=True, pose='stand'),
    # Juno Pike, who built the Park below the pistes: a pink beanie, goggles up, a teal hoodie under a mustard shell
    'npc-juno':      dict(skin='skin2', shirt=('#1a5a6a', '#2a8a9a', '#4ab8c8'), vest=('#8a6a10', '#c89a20', '#f0c840'),
                          hair=('#1a1410', '#2e2218', '#44342a'), beanie=('#7a1a5a', '#b82a88', '#e85ab8'), goggles=True, pose='stand'),
    # the Snowcap Lodge: Mette Rask keeps it (a cream knit, a green apron); Old Bryn and Sigrun play dice by the fire
    'npc-mette':     dict(skin='skin3', shirt=('#a89a80', '#d8ccb0', '#f4ecd8'), apron=('#1a3a2a', '#2a5a40', '#3e7a58'),
                          hair=('#7a7a80', '#a8a8b0', '#d0d0d8'), bun=True, pose='stand'),
    'npc-bryn':      dict(skin='skin', shirt=('#7a5a10', '#a88020', '#d0a840'), beanie=('#5a1414', '#8a2020', '#b83a2a'),
                          hair=('#9a9aa2', '#c8c8d0', '#ececf2'), beard=True, mustache=True, pose='sit'),
    'npc-sigrun':    dict(skin='skin2', shirt=('#1a2a3a', '#2a4058', '#3e5a78'), vest=('#a04a10', '#e06a18', '#ff9a40'),
                          hair=('#6a1a0a', '#a02a10', '#d04a20'), long_hair=True, pose='sit'),
    # Fellhaven: Inge Brask runs the ski hire (red fleece, goggles up); skiers in bright shells on the street
    'npc-inge':      dict(skin='skin', shirt=('#7a1a1a', '#b82a2a', '#e04a3a'), vest=('#141c30', '#22304a', '#34466a'),
                          hair=('#a8843a', '#d8b058', '#f0d080'), bun=True, goggles=True, pose='stand'),
    'npc-skier-a':   dict(skin='skin2', shirt=('#0e4a50', '#16747a', '#2aa8a8'), hair=('#1a1410', '#2e2218', '#44342a'),
                          beanie=('#8a6a10', '#c89a20', '#f0c840'), goggles=True, pose='stand'),
    'npc-skier-b':   dict(skin='skin3', shirt=('#3a1a5a', '#5a2a8a', '#8048b8'), hair=('#2a1810', '#4a2a18', '#6a3e24'),
                          long_hair=True, beanie=('#7a1a4a', '#b82a70', '#e8509a'), pose='stand'),
    # Lumar: a fishwife in an oilskin apron and headscarf, a dockhand, a sailor off the galleons
    'npc-fishwife':  dict(skin='skin3', shirt=('#3a3448', '#5a5070', '#7a7096'), apron=('#7a5a10', '#b88a20', '#e0b040'),
                          hair=('#5a5a60', '#8a8a92', '#b4b4bc'), hood=('#1a3a2a', '#2a5a40', '#3e7a58'), pose='stand'),
    'npc-dockhand':  dict(skin='skin2', shirt=('#1e2a38', '#2e4054', '#46607a'), vest=('#3a2412', '#5a3a1e', '#7a5230'),
                          hair=('#2a1810', '#4a2a18', '#6a3e24'), beanie=('#4a1414', '#7a2020', '#a83232'), beard=True, brawny=True, pose='stand'),
    'npc-sailor':    dict(skin='skin', shirt=('#a89e8a', '#d8d0bc', '#f4ecd8'), vest=('#141c30', '#22304a', '#34466a'),
                          hair=('#5a3a1a', '#8a5a2a', '#aa7a42'), cap=('#141c30', '#22304a', '#34466a'), mustache=True, pose='stand'),
    # Lumar's harbourmasters, one at the head of each island's pier (js/harbour.js)
    'npc-hm-bess':   dict(skin='skin3', shirt=('#141c30', '#22304a', '#34466a'), skirt=('#141c30', '#22304a', '#34466a'),
                          hair=('#5a4a3a', '#7a6a58', '#9a8a76'), bun=True, cap=('#141c30', '#22304a', '#34466a'), pose='stand'),
    'npc-hm-aldous': dict(skin='skin', shirt=('#a89e8a', '#d8d0bc', '#f4ecd8'), vest=('#1a2a5a', '#2a4084', '#4060b0'),
                          hair=('#6a6a70', '#a0a0a8', '#c8c8d0'), cap=('#1a2a5a', '#2a4084', '#4060b0'), beard=True, pose='stand'),
    'npc-hm-mira':   dict(skin='skin2', shirt=('#7a3a5a', '#b05a84', '#e088b0'), skirt=('#4a2a4a', '#6a3a6a', '#8a5a8a'),
                          hair=('#2a1a10', '#4a2e1a', '#6a4428'), long_hair=True, pose='stand'),
    'npc-hm-garro':  dict(skin='skin2', shirt=('#5a1a14', '#8a2a20', '#b04030'), vest=('#141014', '#262026', '#3a323a'),
                          hair=('#1a1410', '#2e2218', '#44342a'), beanie=('#6a1414', '#9a2020', '#c03030'), beard=True, brawny=True, pose='stand'),
    'npc-hm-rowena': dict(skin='skin2', shirt=('#1a3a2a', '#2a5a40', '#3e7a58'), skirt=('#1a3a2a', '#2a5a40', '#3e7a58'),
                          hair=('#6a2a14', '#9a4422', '#c06030'), bun=True, cap=('#1a3a2a', '#2a5a40', '#3e7a58'), pose='stand'),
    'npc-hm-pell':   dict(skin='skin', shirt=('#3a4a5a', '#56687a', '#74889a'), vest=('#5a4a2a', '#7a6a3a', '#9a8a5a'),
                          hair=('#9a9aa0', '#c8c8d0', '#ececf2'), beard=True, beanie=('#2a3a5a', '#3a5078', '#5a7098'), pose='stand'),
    'npc-ferryman':  dict(skin='skin', shirt=('#1a1a24', '#2a2a3a', '#3e3e54'), skirt=('#1a1a24', '#2a2a3a', '#3e3e54'),
                          hair=('#9a9aa0', '#c8c8d0', '#ececf2'), hood=('#1a1a24', '#2a2a3a', '#3e3e54'), beard=True, pose='stand'),
    # Crownhaven's interiors: the Crown & Anchor (Hetty, Salt Annie, Cutter Joss, the bosun), the Exchange's registrar,
    # the Harbour Office's clerks (Wynn, Pim), Mother Coralie of St Brendan's
    'npc-hetty':     dict(skin='skin3', shirt=('#a89a80', '#d8ccb0', '#f4ecd8'), apron=('#3a1414', '#5a2420', '#7a3430'),
                          hair=('#6a2a14', '#9a4422', '#c06030'), bun=True, pose='stand'),
    'npc-annie':     dict(skin='skin2', shirt=('#2a3a5a', '#3e5478', '#5a7098'), hair=('#8a8a90', '#b8b8c0', '#dcdce4'),
                          long_hair=True, beanie=('#5a1414', '#8a2020', '#b83a2a'), pose='sit'),
    'npc-joss':      dict(skin='skin', shirt=('#1a3a2a', '#2a5a40', '#3e7a58'), vest=('#3a2416', '#5e3a22', '#7e5232'),
                          hair=('#1a1410', '#2e2218', '#44342a'), beard=True, brawny=True, pose='sit'),
    'npc-bosun':     dict(skin='skin2', shirt=('#3a3a40', '#55555e', '#72727c'), hair=('#9a9aa0', '#c8c8d0', '#ececf2'),
                          beard=True, mustache=True, cap=('#1a1a2a', '#2a2a40', '#3e3e5a'), pose='sit'),
    'npc-registrar': dict(skin='skin', shirt=('#1a1a20', '#2a2a32', '#3e3e48'), vest=('#7a5a10', '#a88020', '#d0a840'),
                          hair=('#8a8a90', '#b8b8c0', '#dcdce4'), mustache=True, bald=True, pose='stand'),
    'npc-clerk':     dict(skin='skin2', shirt=('#a8a49a', '#e4e0d4', '#fbf8f0'), vest=('#1a2a3a', '#2a4058', '#3e5878'),
                          hair=('#2a1a10', '#4a2e1a', '#6a4428'), visor_cap=True, pose='stand'),
    'npc-pim':       dict(skin='skin3', shirt=('#4a3a2a', '#6a5640', '#8a7458'), vest=('#2a4a3a', '#3e6a52', '#5a8a6e'),
                          hair=('#1a1410', '#2e2218', '#44342a'), bun=True, pose='stand'),
    'npc-liesl':     dict(skin='skin2', shirt=('#4a2a3a', '#6a3a52', '#8a5a72'), apron=('#3a2416', '#5e3a22', '#7e5232'),
                          hair=('#c06080', '#e080a0', '#f0a8c0'), long_hair=True, pose='stand'),
    # Tern Holm's inn: Bryony Kettle and two fisherfolk
    'npc-bryony':    dict(skin='skin', shirt=('#6a3a2a', '#9a5a3a', '#c07a50'), apron=('#a8a49a', '#e4e0d4', '#fbf8f0'),
                          hair=('#8a6a2a', '#b8903a', '#e0b858'), bun=True, pose='stand'),
    'npc-fisher-a':  dict(skin='skin2', shirt=('#8a6a10', '#c09020', '#e8c040'), hair=('#2a1a10', '#4a2e1a', '#6a4428'),
                          beard=True, beanie=('#1a3a5a', '#2a5a8a', '#4a7ab0'), pose='sit'),
    'npc-fisher-b':  dict(skin='skin3', shirt=('#3a4a3a', '#56685a', '#74887a'), hair=('#9a9aa0', '#c8c8d0', '#ececf2'),
                          long_hair=True, cap=('#3a2a1a', '#5e4228', '#7e5a38'), pose='sit'),
    'npc-queen':     dict(skin='skin2', shirt=('#1a3a2a', '#2a5a40', '#3e7a58'), skirt=('#1a3a2a', '#2a5a40', '#3e7a58'),
                          vest=('#7a5a10', '#a88020', '#d0a840'), hair=('#1a1410', '#2e2218', '#44342a'), long_hair=True,
                          crown=('#8a6a10', '#c89a20', '#f0d060'), pose='sit'),
    # Sylvara, the elven wood: Queen Alyssa of the wood elves on her throne, and Beckolas, her first sword
    'npc-alyssa':    dict(skin='skin0', shirt=('#2a5a2a', '#3e7a38', '#5a9a4a'), skirt=('#2a5a2a', '#3e7a38', '#5a9a4a'),
                          trim=('#8a6a10', '#c89a20', '#f0d060'), belt=('#8a6a10', '#c89a20', '#f0d060'),
                          hair=('#a8843a', '#d8b058', '#f0d080'), long_hair='flowing', elf_ears=True,
                          circlet=('#8a6a10', '#c89a20', '#f0d060'), gem=('#0a6a3a', '#18b060', '#80f0b0'), gown=True, shoes=('#8a6a10', '#c89a20', '#f0d060'), pose='sit'),
    'npc-beckolas':  dict(skin='skin', shirt=('#2e4a22', '#4a6a30', '#6a8a44'), armour=('#3a5a26', '#5a7a34', '#7e9a4a'),
                          cloak=('#1e3a1e', '#2e5a2e', '#447a3e'), trim=('#7a5a20', '#c8a040', '#f0d070'),
                          hair=('#a8843a', '#d8b058', '#f0d080'), ponytail=True, elf_ears=True, sword=True, bow=True,
                          scabbard=('#5a3a1a', '#8a5a2a', '#b07a3a'), bowwood=('#6a4a20', '#a07a38', '#d0a858'), fletch=('#c8c0b0', '#ece4d4', '#ffffff'),
                          eye=('#1a3a6a', '#2a5aa0', '#4a80c8'), pose='stand'),
    'npc-elf-warden': dict(skin='skin', shirt=('#3a4a2a', '#56683a', '#748a50'), cloak=('#2a3a22', '#3e5430', '#566e42'),
                           hair=('#5a3a1a', '#8a5a2a', '#aa7a42'), long_hair=True, elf_ears=True, pose='stand'),
    'npc-elf-bard':  dict(skin='skin2', shirt=('#5a2a4a', '#7a3e66', '#9a5a84'), vest=('#7a5a20', '#a88030', '#c8a048'),
                          hair=('#1a1410', '#2e2218', '#44342a'), ponytail=True, elf_ears=True, pose='sit'),
    'npc-elf-herbalist': dict(skin='skin3', shirt=('#4a5a3a', '#6a7a52', '#8a9a6e'), skirt=('#4a3a2a', '#6a5640', '#8a7458'),
                              apron=('#8a7a5a', '#b8a880', '#d8c8a0'), hair=('#c8c8d0', '#e0e0e8', '#f4f4fa'), long_hair=True,
                              elf_ears=True, pose='stand'),
    'npc-steward':   dict(skin='skin', shirt=('#1a1a2a', '#2a2a40', '#3e3e5a'), vest=('#5a1a14', '#8a2a20', '#b83a2a'),
                          hair=('#9a9aa0', '#c8c8d0', '#ececf2'), mustache=True, pose='stand'),
    'npc-broker':    dict(skin='skin3', shirt=('#4a1418', '#6a2028', '#8a3038'), vest=('#1a1a20', '#2a2a32', '#3e3e48'),
                          hair=('#1a1410', '#2e2218', '#44342a'), mustache=True, pose='stand'),
    'npc-coralie':   dict(skin='skin', shirt=('#1a3a5a', '#2a5a8a', '#4a7ab0'), skirt=('#1a3a5a', '#2a5a8a', '#4a7ab0'),
                          hair=('#9a9aa0', '#c8c8d0', '#ececf2'), hood=('#a8a49a', '#e4e0d4', '#fbf8f0'), pose='stand'),
    # Verdance town: the baker, the smith, the miller, the shopkeeper, two villagers
    'npc-vbaker':    dict(skin='skin', shirt=('#8a4a5a', '#b8687a', '#e090a0'), apron=('#a8a49a', '#e4e0d4', '#fbf8f0'),
                          hair=('#6a2a14', '#9a4422', '#c06030'), chef=True, pose='stand'),
    'npc-vsmith':    dict(skin='skin3', shirt=('#3a3a40', '#55555e', '#72727c'), apron=('#2a1a10', '#4a2e1a', '#6a4428'),
                          hair=('#1a1410', '#2e2218', '#44342a'), bald=True, beard=True, brawny=True, pose='stand'),
    'npc-vmiller':   dict(skin='skin2', shirt=('#a89a7a', '#d8ccaa', '#f4ead0'), hair=('#8a8a90', '#b8b8c0', '#dcdce4'),
                          cap=('#a8a49a', '#e4e0d4', '#fbf8f0'), mustache=True, pose='stand'),
    'npc-vshop':     dict(skin='skin', shirt=('#4a3a5a', '#6a5a80', '#9080a8'), vest=('#1a3a1a', '#2a5a2a', '#3e7a3e'),
                          hair=('#6a6a70', '#a0a0a8', '#c8c8d0'), bun=True, pose='stand'),
    'npc-vfolk-a':   dict(skin='skin2', shirt=('#2a5a2a', '#3e7a3a', '#5aa050'), hair=('#6a3a1a', '#9a5a2a', '#c07a3a'),
                          long_hair=True, straw_hat=('#a8843a', '#d8b058', '#f0d080'), pose='stand'),
    'npc-vfolk-b':   dict(skin='skin3', shirt=('#6a4a1a', '#9a6a2a', '#c08a3a'), vest=('#2a2a3a', '#3e3e54', '#545470'),
                          hair=('#1a1410', '#2e2218', '#44342a'), cap=('#3a2a1a', '#5e4228', '#7e5a38'), beard=True, pose='stand'),
    # more of Brambleford: Mags who keeps the Hayloft, an old farmer in from the fields, the schoolmistress
    'npc-vinn':      dict(skin='skin', shirt=('#5a1e24', '#8a3038', '#b04a52'), apron=('#a8a49a', '#e4e0d4', '#fbf8f0'),
                          hair=('#6a2a14', '#9a4422', '#c06030'), bun=True, pose='stand'),
    'npc-vfarmer':   dict(skin='skin2', shirt=('#2a3a5a', '#3e5680', '#5a78a8'), vest=('#4a3018', '#6a4828', '#8a6238'),
                          hair=('#9a9aa0', '#c8c8d0', '#ececf2'), beard=True, straw_hat=('#a8843a', '#d8b058', '#f0d080'), pose='stand'),
    'npc-vschool':   dict(skin='skin3', shirt=('#3a2a5a', '#54407e', '#7058a0'), hair=('#7a7a80', '#a8a8b0', '#d0d0d8'),
                          bun=True, pose='stand'),
    # Arcadia: a courier in hi-vis neon, a street samurai with a mohawk and a mask
    'npc-courier':   dict(skin='skin2', shirt=('#6a7a10', '#a8c020', '#e0f040'), vest=('#101014', '#1e1e26', '#30303c'),
                          hair=('#1a1410', '#2e2218', '#44342a'), visor_band=True, pose='stand'),
    'npc-samurai':   dict(skin='skin', shirt=('#101014', '#1e1e26', '#30303c'), vest=('#5a0a1a', '#9a1430', '#d02848'),
                          hair=('#1a6a70', '#30b0b8', '#60e0e8'), mohawk=True, mask=True, pose='stand'),
    # Club Void: Kiri Vale on the decks (silver hair, goggles up as headphones), Dez behind the bar
    'npc-dj':        dict(skin='skin', shirt=('#141018', '#241c2c', '#3a2e44'), vest=('#10405a', '#1a6a8a', '#30a0c0'),
                          hair=('#9a9aaa', '#c8c8d8', '#f0f0ff'), long_hair=True, goggles=True, pose='stand'),
    'npc-mixer':     dict(skin='skin2', shirt=('#2a1030', '#4a1c50', '#6a2a70'), vest=('#141018', '#241c2c', '#3a2e44'),
                          hair=('#1a1410', '#2e2218', '#44342a'), bun=True, pose='stand'),
    'npc-sev':       dict(skin='skin2', shirt=('#7a5010', '#b88020', '#e0b040'), hair=('#8a8a90', '#b8b8c0', '#dcdce4'),
                          bun=True, visor_cap=True, pose='stand'),
    'npc-vex':       dict(skin='skin', shirt=('#141018', '#241c2c', '#3a2e44'), vest=('#5a1040', '#a01870', '#d83098'),
                          hair=('#1a6a70', '#30b0b8', '#60e0e8'), mohawk=True, bald=True, visor_band=True, pose='sit'),
    'npc-cook':      dict(skin='skin2', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), apron=('#5a5040', '#8a7a60', '#a89878'),
                          hair=('#1a1410', '#2e2218', '#44342a'), beanie=('#2a2a30', '#44444c', '#5e5e68'), pose='sit'),
    'npc-sorceress': dict(skin='skin', shirt=('#1e1e48', '#2e3070', '#4a4c9a'), skirt=('#1e1e48', '#2e3070', '#4a4c9a'),
                          hair=('#8a8a98', '#c8c8d4', '#ececf4'), long_hair=True,
                          witch_hat=('#24163a', '#3e2a5e', '#5a4282'), pose='stand'),
    # The Neon Royale (the casino): dealers in white shirts, oxblood waistcoats and bow ties; a croupier; the craps
    # crew (a stickman in an eyeshade, a boxman sat in his suit); the pit boss in shades with an earpiece and a chrome
    # arm; the cashier; the bartender in a white mess jacket; Lady Velvet in red sequins; the pianist; Gideon the
    # doorman in his greatcoat; cocktail servers with trays; a high roller in a white suit; gamblers sat at the tables;
    # the restaurant's chef and waiter; the VIP host; the Runouts attendant; the Duchess herself.
    'npc-dealer':    dict(skin='skin', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), waistcoat=('#3a0a14', '#62121f', '#8a1e2e'),
                          bowtie=('#0a0a0e', '#18181e', '#2e2e3a'), hair=('#1a1410', '#2e2218', '#44342a'), pose='stand'),
    'npc-dealer-b':  dict(skin='skin3', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), waistcoat=('#3a0a14', '#62121f', '#8a1e2e'),
                          bowtie=('#0a0a0e', '#18181e', '#2e2e3a'), hair=('#141010', '#241c1a', '#362a26'), bun=True, pose='stand'),
    'npc-dealer-c':  dict(skin='skin2', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), waistcoat=('#3a0a14', '#62121f', '#8a1e2e'),
                          bowtie=('#0a0a0e', '#18181e', '#2e2e3a'), hair=('#6a2a14', '#9a4422', '#c06030'), long_hair=True, pose='stand'),
    'npc-croupier':  dict(skin='skin', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), waistcoat=('#2a1e08', '#4a3612', '#6a5020'),
                          bowtie=('#5a0a14', '#8a1420', '#b02030'), hair=('#141010', '#241c1a', '#362a26'), mustache=True, pose='stand'),
    'npc-stickman':  dict(skin='skin2', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), waistcoat=('#3a0a14', '#62121f', '#8a1e2e'),
                          bowtie=('#0a0a0e', '#18181e', '#2e2e3a'), hair=('#1a1410', '#2e2218', '#44342a'), visor_cap=True, pose='stand'),
    'npc-boxman':    dict(skin='skin', shirt=('#14141c', '#24242e', '#383846'), bib=True, bowtie=('#0a0a0e', '#18181e', '#2e2e3a'),
                          hair=('#8a8a90', '#b8b8c0', '#dcdce4'), bald=True, mustache=True, pose='sit'),
    'npc-pitboss':   dict(skin='skin2', shirt=('#16161e', '#282832', '#3e3e4c'), bib=('#5a0a14', '#8a1420', '#b02030'),
                          hair=('#5a5a60', '#8a8a92', '#b4b4bc'), beard=True, brawny=True, shades=True, earpiece=True,
                          chrome_arm=True, pose='stand'),
    'npc-royale-cashier': dict(skin='skin0', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), waistcoat=('#0a2a20', '#124232', '#1e6048'),
                          hair=('#1a1410', '#2e2218', '#44342a'), bun=True, visor_cap=True, pose='stand'),
    'npc-royale-bartender': dict(skin='skin3', shirt=('#a8a49a', '#e8e4d8', '#fcfaf2'), bowtie=('#0a0a0e', '#18181e', '#2e2e3a'),
                          hair=('#141010', '#241c1a', '#362a26'), mustache=True, pose='stand'),
    'npc-singer':    dict(skin='skin2', shirt=('#5a0614', '#a01428', '#e03048'), skirt=('#5a0614', '#a01428', '#e03048'), gown=True,
                          sequin=True, sleeve='skin2', gloves=('#0a0a0e', '#1c1c24', '#34343e'),
                          hair=('#a8a090', '#e0d8c8', '#fff8e8'), long_hair='flowing', pose='stand'),
    'npc-pianist':   dict(skin='skin3', shirt=('#0e0e14', '#1c1c26', '#30303e'), bib=True, bowtie=('#0a0a0e', '#18181e', '#2e2e3a'),
                          hair=('#141010', '#241c1a', '#362a26'), ponytail=True, pose='sit'),
    'npc-doorman':   dict(skin='skin3', shirt=('#4a0612', '#7a0e1e', '#a81a2e'), coat=('#4a0612', '#7a0e1e', '#a81a2e'),
                          cap=('#4a0612', '#7a0e1e', '#a81a2e'), gloves=True, hair=('#141010', '#241c1a', '#362a26'),
                          mustache=True, brawny=True, shades=True, pose='stand'),
    'npc-server':    dict(skin='skin2', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), skirt=('#0e0e14', '#1c1c26', '#30303e'),
                          waistcoat=('#0e0e14', '#1c1c26', '#30303e'), bowtie=('#5a0a14', '#8a1420', '#b02030'),
                          hair=('#6a2a14', '#9a4422', '#c06030'), bun=True, tray=True, pose='stand'),
    'npc-server-b':  dict(skin='skin', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), waistcoat=('#0e0e14', '#1c1c26', '#30303e'),
                          bowtie=('#5a0a14', '#8a1420', '#b02030'), hair=('#c8a050', '#e8c870', '#f8e8a0'), tray=True, pose='stand'),
    'npc-highroller': dict(skin='skin', shirt=('#a8a49a', '#e8e4d8', '#fcfaf2'), pants=('#a8a49a', '#e8e4d8', '#fcfaf2'),
                          bib=('#0e0e14', '#1c1c26', '#30303e'), hair=('#141010', '#241c1a', '#362a26'), shades=True, pose='stand'),
    'npc-gambler-a': dict(skin='skin', shirt=('#7a5a10', '#c89a28', '#f0d060'), skirt=('#7a5a10', '#c89a28', '#f0d060'), gown=True,
                          sequin=True, sleeve='skin', hair=('#6a1a0a', '#a02a10', '#d04a20'), long_hair=True, pose='sit'),
    'npc-gambler-b': dict(skin='skin2', shirt=('#141c30', '#22304a', '#34466a'), bib=True, bowtie=('#5a0a14', '#8a1420', '#b02030'),
                          hair=('#8a8a90', '#b8b8c0', '#dcdce4'), mustache=True, shades=True, pose='sit'),
    'npc-gambler-c': dict(skin='skin3', shirt=('#1a0a24', '#2e1440', '#4a2060'), vest=('#10405a', '#1a6a8a', '#30a0c0'),
                          hair=('#c06080', '#e080a0', '#f0a8c0'), bun=True, visor_band=True, pose='sit'),
    'npc-gambler-d': dict(skin='skin0', shirt=('#0e0e14', '#1c1c26', '#30303e'), bib=True, bowtie=('#0a0a0e', '#18181e', '#2e2e3a'),
                          hair=('#c8a050', '#e8c870', '#f8e8a0'), chrome_arm=True, pose='sit'),
    'npc-royale-chef': dict(skin='skin', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), apron=('#9a968c', '#e4e0d4', '#fbf8f0'),
                          hair=('#6a6a70', '#a0a0a8', '#c8c8d0'), chef=True, mustache=True, pose='stand'),
    'npc-waiter':    dict(skin='skin2', shirt=('#9a968c', '#e4e0d4', '#fbf8f0'), waistcoat=('#0e0e14', '#1c1c26', '#30303e'),
                          apron=('#0e0e14', '#1c1c26', '#30303e'), bowtie=('#0a0a0e', '#18181e', '#2e2e3a'),
                          hair=('#141010', '#241c1a', '#362a26'), pose='stand'),
    'npc-host':      dict(skin='skin3', shirt=('#2a2010', '#4a3a18', '#6a5424'), bib=True, bowtie=('#7a5a10', '#c89a28', '#f0d060'),
                          hair=('#141010', '#241c1a', '#362a26'), earpiece=True, pose='stand'),
    'npc-boutique':  dict(skin='skin2', shirt=('#4a3a10', '#7a6020', '#a88a30'), bowtie=('#5a0a14', '#8a1420', '#b02030'),
                          hair=('#5a1a4a', '#8a2a70', '#b04a90'), bun=True, earpiece=True, pose='stand'),
    'npc-runouts-host': dict(skin='skin', shirt=('#141018', '#241c2c', '#3a2e44'), vest=('#5a1040', '#c01880', '#f040a8'),
                          hair=('#1a6a70', '#30b0b8', '#60e0e8'), bun=True, visor_band=True, pose='stand'),
    'npc-duchess':   dict(skin='skin2', shirt=('#1a0a24', '#34164a', '#52246e'), skirt=('#1a0a24', '#34164a', '#52246e'), gown=True,
                          trim=('#7a5a10', '#c89a28', '#f0d060'), stole=('#a89a88', '#e2d8c8', '#fbf6ec'), sleeve='skin2',
                          circlet=('#8a6a10', '#c89a20', '#f0d060'), gem=('#6a0a3a', '#c0186a', '#ff70b0'),
                          hair=('#9a9aa0', '#c8c8d0', '#ececf2'), long_hair='flowing', pose='sit'),
}
LIGHT_DIR = Vector((-0.5, -0.35, 0.8)).normalized()


def hexc(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def lin(c):
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)


def mix(a, b, t):
    ca, cb = hexc(a), hexc(b)
    return '#' + ''.join('%02x' % round(255 * (ca[i] * (1 - t) + cb[i] * t)) for i in range(3))


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.world = bpy.data.worlds.new('w')


def emission_mat(name, setup):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    setup(nt, em)
    return m


def cel_mat(name, tones):
    def setup(nt, em):
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        dot = nt.nodes.new('ShaderNodeVectorMath')
        dot.operation = 'DOT_PRODUCT'
        dot.inputs[1].default_value = LIGHT_DIR
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.inputs['From Min'].default_value = -1.0
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.interpolation = 'CONSTANT'
        e = ramp.color_ramp.elements
        e[0].position, e[0].color = 0.0, lin(hexc(tones[0]))
        e[1].position, e[1].color = 0.56, lin(hexc(tones[1]))
        e3 = e.new(0.83)
        e3.color = lin(hexc(tones[2]))
        nt.links.new(geo.outputs['Normal'], dot.inputs[0])
        nt.links.new(dot.outputs['Value'], mr.inputs['Value'])
        nt.links.new(mr.outputs['Result'], ramp.inputs['Fac'])
        nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    return emission_mat(name, setup)


def flat_mat(name, rgb):
    def setup(nt, em):
        em.inputs['Color'].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
    return emission_mat(name, setup)


def depth_mat():
    def setup(nt, em):
        cam = nt.nodes.new('ShaderNodeCameraData')
        div = nt.nodes.new('ShaderNodeMath')
        div.operation = 'DIVIDE'
        div.inputs[1].default_value = 200.0
        nt.links.new(cam.outputs['View Z Depth'], div.inputs[0])
        nt.links.new(div.outputs['Value'], em.inputs['Color'])
    return emission_mat('depth', setup)


DEPTH = depth_mat()
PARTS = []          # (obj, tone_key, part_id)
PIDS = {}


def pid(name):
    if name not in PIDS:
        PIDS[name] = len(PIDS) + 1
    return PIDS[name]


def pivot(name, loc, parent=None):
    e = bpy.data.objects.new(name, None)
    scene.collection.objects.link(e)
    e.location = loc
    if parent:
        e.parent = parent
    return e


def add(prim, name, loc, scale, tone, part, parent, bevel=0.0, rot=(0, 0, 0), **kw):
    getattr(bpy.ops.mesh, 'primitive_' + prim + '_add')(location=(0, 0, 0), **kw)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    o.location = loc
    if bevel:
        m = o.modifiers.new('bev', 'BEVEL')
        m.width = bevel
        m.segments = 3
    for p in o.data.polygons:
        p.use_smooth = True
    o.parent = parent
    o.data.materials.append(DEPTH)
    PARTS.append((o, tone, pid(part)))
    return o


# ---- skeleton (model units; root scaled to tiles) ---------------------------
root = pivot('root', (0, 0, 0))
root.scale = (UNIT, UNIT, UNIT)
body = pivot('body', (0, 0, 0), root)
hips, knees, shoulders = {}, {}, {}


def legs(tone_leg, tone_boot, thigh_tone=None):
    THIGH_TONE[0] = thigh_tone or tone_leg
    for side, sx in (('L', -2.1), ('R', 2.1)):
        hip = pivot('hip' + side, (sx, 0, 9.2), body)
        hips[side] = hip
        add('cube', 'thigh' + side, (0, 0, -2.0), (1.45, 1.6, 2.2), thigh_tone or tone_leg, 'leg' + side, hip, bevel=0.5)
        knee = pivot('knee' + side, (0, 0, -4.2), hip)
        knees[side] = knee
        add('cube', 'shin' + side, (0, 0, -1.6), (1.35, 1.5, 1.8), tone_leg, 'leg' + side, knee, bevel=0.5)
        add('cube', 'boot' + side, (0, -0.6, -3.2), (1.75, 2.5, 1.45), tone_boot, 'boot' + side, knee, bevel=0.6)


def arms(tone_arm, tone_hand):
    for side, sx in (('L', -5.3), ('R', 5.3)):
        sh = pivot('sh' + side, (sx, 0, 16.0), body)
        shoulders[side] = sh
        add('cube', 'arm' + side, (0, 0, -2.9), (1.25, 1.4, 3.1), tone_arm, 'arm' + side, sh, bevel=0.5)
        add('cube', 'hand' + side, (0, 0, -6.3), (1.3, 1.45, 1.15), tone_hand, 'arm' + side, sh, bevel=0.5)


head = None
tip = None


def build_pilot():
    global head, tip
    legs('suit', 'boot')
    for side in 'LR':
        add('cube', 'knee' + side, (0, -1.5, 0.2), (1.2, 0.35, 0.9), 'suitdk', 'leg' + side, knees[side], bevel=0.2)
    add('cube', 'torso', (0, 0, 13.2), (4.3, 3.1, 4.3), 'suit', 'torso', body, bevel=1.4)
    add('cube', 'belt', (0, 0, 9.7), (4.45, 3.25, 0.65), 'suitdk', 'torso', body, bevel=0.3)
    add('cube', 'buckle', (0, -3.25, 9.7), (0.85, 0.3, 0.55), 'brass', 'torso', body)
    add('cube', 'chest', (0, -3.05, 13.6), (2.1, 0.35, 1.5), 'suitdk', 'torso', body, bevel=0.2)
    add('cube', 'ledC', (-0.8, -3.4, 13.9), (0.45, 0.2, 0.45), 'ledc', 'torso', body)
    add('cube', 'ledY', (0.8, -3.4, 13.9), (0.45, 0.2, 0.45), 'ledy', 'torso', body)
    add('cube', 'pack', (0, 3.5, 13.4), (3.4, 1.5, 3.7), 'pack', 'pack', body, bevel=0.7)
    add('cylinder', 'tank', (2.2, 4.6, 13.6), (0.9, 0.9, 3.0), 'brass', 'pack', body, vertices=10)
    add('cube', 'packLight', (-1.6, 4.9, 16.2), (0.5, 0.3, 0.5), 'ledc', 'pack', body)
    arms('arm', 'suitdk')
    for side in 'LR':
        add('uv_sphere', 'pad' + side, (0, 0, 0.2), (1.9, 1.9, 1.5), 'suitdk', 'arm' + side, shoulders[side], segments=12, ring_count=8)
    helmet()


GROUPS = {}        # pilot head parts by group ('helmet', 'face', 'hair-<style>', 'beard'); see set_head()


def grouped(name):
    """Collect every part add()-ed inside the with-block under GROUPS[name]."""
    class G:
        def __enter__(self):
            self.start = len(PARTS)

        def __exit__(self, *a):
            GROUPS.setdefault(name, []).extend(o for o, _, _ in PARTS[self.start:])
    return G()


def helmet(collar='suitdk', ruff=False):
    global head, tip
    head = pivot('head', (0, 0, 18.6), body)
    if ruff:
        add('torus', 'ruff', (0, 0, 0.7), (1, 1, 1), 'fur', 'collar', head,
            major_radius=3.9, minor_radius=1.5, major_segments=20, minor_segments=8)
    else:
        add('torus', 'collar', (0, 0, 0.5), (1, 1, 1), collar, 'collar', head,
            major_radius=3.6, minor_radius=0.9, major_segments=20, minor_segments=8)
    with grouped('helmet'):
        add('uv_sphere', 'helmet', (0, 0, 5.0), (5.8, 5.5, 5.3), 'helmet', 'helmet', head, segments=28, ring_count=14)
        add('uv_sphere', 'visor', (0, -3.7, 4.6), (4.2, 3.1, 2.7), 'visor', 'visor', head, segments=24, ring_count=12)
        add('cube', 'glint', (-1.9, -6.55, 5.7), (0.55, 0.2, 0.5), 'glint', 'visor', head)
        add('cylinder', 'antenna', (3.0, 0.6, 10.6), (0.3, 0.3, 1.9), 'pack', 'helmet', head, vertices=8)
        tip = add('uv_sphere', 'antennaTip', (3.0, 0.6, 12.6), (0.85, 0.85, 0.85), 'ledy', 'helmet', head, segments=8, ring_count=6)
    bare_head()


def bare_head():
    """The pilot without the helmet: a face (same build as the NPCs'), every hairstyle and a beard, each in its
    own group so set_head() can show one combination per render."""
    with grouped('face'):
        add('cylinder', 'neck', (0, 0, 0.6), (1.6, 1.6, 1.2), 'skin', 'neck', head, vertices=10)
        add('uv_sphere', 'face', (0, 0, 5.2), (5.0, 4.8, 5.0), 'skin', 'head', head, segments=24, ring_count=12)
        for sx in (-1.8, 1.8):
            add('cube', 'eye', (sx, -4.6, 5.9), (0.7, 0.7, 1.0), 'eye', 'eyes', head)
        add('cube', 'nose', (0, -4.9, 4.4), (0.55, 0.6, 0.6), 'skin', 'head', head, bevel=0.2)

    def cap():                  # the NPCs' short hair: a cap of hair over the crown, ears showing
        add('uv_sphere', 'hair', (0, 0.5, 6.4), (5.3, 5.0, 4.3), 'hair', 'hair', head, segments=20, ring_count=10)

    with grouped('hair-short'):
        cap()
    with grouped('hair-bald'):  # shaved on top, a little left over the ears
        for sx in (-4.6, 4.6):
            add('uv_sphere', 'hairside', (sx, 0.6, 4.6), (1.0, 2.6, 1.8), 'hair', 'hair', head, segments=10, ring_count=6)
    with grouped('hair-long'):  # past the shoulders, framing the face
        cap()
        add('cube', 'hair_back', (0, 3.0, 3.0), (4.6, 1.9, 4.6), 'hair', 'hair', head, bevel=1.2)
        for sx in (-4.4, 4.4):
            add('cube', 'hair_lock', (sx, 0.4, 3.4), (1.0, 2.8, 3.6), 'hair', 'hair', head, bevel=0.6)
    with grouped('hair-bun'):
        cap()
        add('uv_sphere', 'bun', (0, 3.6, 8.4), (2.2, 2.0, 2.0), 'hair', 'hair', head, segments=12, ring_count=8)
    with grouped('hair-ponytail'):
        cap()
        add('uv_sphere', 'tie', (0, 4.6, 6.6), (1.1, 1.0, 1.1), 'hair', 'hair', head, segments=10, ring_count=6)
        add('uv_sphere', 'tail', (0, 5.6, 3.6), (1.4, 1.3, 3.4), 'hair', 'hair', head, rot=(0.35, 0, 0), segments=12, ring_count=8)
    with grouped('hair-curly'):  # a big round cloud of curls
        add('uv_sphere', 'curls', (0, 0.9, 6.8), (6.4, 6.0, 5.2), 'hair', 'hair', head, segments=20, ring_count=10)
        for ang in range(0, 360, 45):
            a = math.radians(ang)
            add('uv_sphere', 'curl', (math.cos(a) * 5.6, 0.9 + math.sin(a) * 5.2, 8.6), (1.6, 1.6, 1.6), 'hair', 'hair', head,
                segments=8, ring_count=6)
    with grouped('hair-mohawk'):
        for sx in (-4.6, 4.6):
            add('uv_sphere', 'hairside', (sx, 0.6, 4.6), (1.0, 2.6, 1.8), 'hair', 'hair', head, segments=10, ring_count=6)
        add('cube', 'mohawk', (0, 0.8, 9.8), (0.9, 3.8, 1.9), 'hair', 'hair', head, bevel=0.6)
    with grouped('beard'):
        add('uv_sphere', 'beard', (0, -3.4, 2.4), (3.6, 2.0, 2.5), 'hair', 'beard', head, segments=14, ring_count=8)
        add('cube', 'mustache', (0, -4.75, 3.4), (2.2, 0.5, 0.5), 'hair', 'beard', head, bevel=0.2)


# every head a pilot can have: (name, groups shown)
HEADS = [('helmet', ['helmet'])]
for _h in HAIRSTYLES:
    HEADS.append((_h, ['face', 'hair-' + _h]))
    HEADS.append((_h + '-beard', ['face', 'hair-' + _h, 'beard']))


def set_head(groups):
    for g, objs in GROUPS.items():
        for o in objs:
            o.hide_render = g not in groups


def body_b():
    """Body type B: narrower through the shoulders and chest, fuller at the hips — applied to any suit after it's
    built, so every suit gets it. (Body A is the suit as modelled.)"""
    for sh in shoulders.values():
        sh.location.x *= 0.8
        sh.scale = (0.85, 0.9, 1.0)          # slimmer arms and shoulder pads
    for h in hips.values():
        h.location.x *= 1.1
    for o, _, _ in PARTS:
        if o.parent is not body:
            continue
        if o.location.z > 11.0:
            o.scale.x *= 0.8
        elif o.location.z > 6.0:
            o.scale.x *= 1.08
    for side, hp in hips.items():
        add('uv_sphere', 'hipcurve' + side, (0, 0.2, -0.6), (2.0, 1.9, 1.8), THIGH_TONE[0], 'leg' + side, hp,
            segments=12, ring_count=8)


THIGH_TONE = ['suit']


def build_coat():
    # the Voyager's Coat: a captain's long coat over the flight suit, gold epaulettes, a satchel on a strap
    legs('pants', 'leather')
    add('cube', 'torso', (0, 0, 13.2), (4.4, 3.2, 4.3), 'suit', 'torso', body, bevel=1.4)
    add('cone', 'tails', (0, 0.25, 7.5), (1, 0.9, 1), 'suit', 'tails', body, vertices=18, radius1=5.0, radius2=4.45, depth=4.8)
    add('cube', 'split', (0, -4.15, 7.3), (0.9, 0.45, 2.4), 'pants', 'split', body)        # the coat open below the belt
    for sx, rz in ((-1.55, 0.32), (1.55, -0.32)):
        add('cube', 'lapel', (sx, -3.28, 14.4), (0.95, 0.3, 2.7), 'suitdk', 'torso', body, rot=(0, rz, 0), bevel=0.2)
    for z in (12.4, 10.9):
        for sx in (-1.15, 1.15):
            add('cube', 'button', (sx, -3.35, z), (0.4, 0.25, 0.4), 'brass', 'torso', body)
    add('cube', 'belt', (0, 0, 9.7), (4.55, 3.35, 0.6), 'leather', 'torso', body, bevel=0.3)
    add('cube', 'buckle', (0, -3.4, 9.7), (0.85, 0.3, 0.55), 'brass', 'torso', body)
    add('cube', 'satchel', (4.2, -0.4, 8.6), (1.0, 2.1, 1.7), 'leather', 'satchel', body, bevel=0.4)
    add('cube', 'pack', (0, 3.6, 13.6), (3.2, 1.4, 3.4), 'leather', 'pack', body, bevel=0.8)
    add('cube', 'packflap', (0, 3.9, 16.4), (3.3, 1.5, 0.7), 'suitdk', 'pack', body, bevel=0.3)
    arms('suit', 'leather')
    for side in 'LR':
        add('cube', 'cuff' + side, (0, 0, -5.1), (1.45, 1.6, 0.55), 'suitdk', 'arm' + side, shoulders[side], bevel=0.2)
        add('cube', 'epaulette' + side, (0, 0, 0.8), (1.9, 1.75, 0.5), 'brass', 'arm' + side, shoulders[side], bevel=0.3)
    helmet()


def build_plate():
    # the Plated Suit: steel cuirass and pauldrons over the suit's colour, greaves, gauntlets, a heavy pack
    legs('steel', 'steeldk', thigh_tone='suit')
    for side in 'LR':
        add('uv_sphere', 'kneeguard' + side, (0, -1.5, 0.1), (1.5, 0.9, 1.4), 'steel', 'leg' + side, knees[side], segments=12, ring_count=8)
    add('cube', 'torso', (0, 0, 13.2), (4.3, 3.1, 4.3), 'suit', 'torso', body, bevel=1.4)
    add('cube', 'cuirass', (0, -0.15, 13.7), (4.6, 3.4, 3.4), 'steel', 'plate', body, bevel=1.3)
    add('cube', 'tabard', (0, -3.6, 11.4), (1.3, 0.3, 3.4), 'suit', 'tabard', body, bevel=0.2)
    add('cube', 'fauld', (0, 0, 9.4), (4.7, 3.5, 1.1), 'steeldk', 'torso', body, bevel=0.4)
    add('cube', 'pack', (0, 3.8, 13.6), (3.8, 1.8, 4.2), 'steeldk', 'pack', body, bevel=0.8)
    add('cylinder', 'tank', (2.5, 5.1, 13.8), (1.0, 1.0, 3.4), 'brass', 'pack', body, vertices=10)
    add('cube', 'packLight', (-1.8, 5.5, 16.6), (0.5, 0.3, 0.5), 'ledc', 'pack', body)
    arms('suit', 'steel')
    for side in 'LR':
        add('uv_sphere', 'pauldron' + side, (0, 0, 0.5), (2.5, 2.4, 1.9), 'steel', 'pauldron' + side, shoulders[side], segments=14, ring_count=8)
        add('cube', 'bracer' + side, (0, 0, -4.6), (1.5, 1.65, 1.0), 'steeldk', 'arm' + side, shoulders[side], bevel=0.3)
    helmet(collar='steeldk')


def build_thermal():
    # the Thermal Suit: quilted and puffed, a fur ruff, fur-topped snow boots, a sleeping roll on the pack
    legs('suit', 'boot')
    for side in 'LR':
        add('torus', 'bootfur' + side, (0, -0.4, -2.0), (1, 1.15, 1), 'fur', 'boot' + side, knees[side],
            major_radius=1.8, minor_radius=0.65, major_segments=14, minor_segments=6)
        add('uv_sphere', 'puffleg' + side, (0, 0, -1.9), (1.8, 1.95, 2.4), 'suit', 'leg' + side, hips[side], segments=12, ring_count=8)
    add('cube', 'torso', (0, 0, 13.0), (4.7, 3.5, 4.6), 'suit', 'torso', body, bevel=2.0)
    for z in (10.6, 13.0, 15.4):
        add('torus', 'quilt', (0, 0, z), (1, 0.76, 1), 'suitdk', 'torso', body,
            major_radius=4.75, minor_radius=0.55, major_segments=24, minor_segments=6)
    add('cube', 'pack', (0, 3.9, 13.4), (3.4, 1.5, 3.7), 'pack', 'pack', body, bevel=0.7)
    add('cylinder', 'bedroll', (0, 4.0, 17.9), (1.2, 1.2, 3.5), 'suitdk', 'pack', body, rot=(0, math.pi / 2, 0), vertices=12)
    add('cube', 'packLight', (-1.6, 5.3, 15.8), (0.5, 0.3, 0.5), 'ledy', 'pack', body)
    arms('suit', 'suitdk')
    for side in 'LR':
        add('uv_sphere', 'puffarm' + side, (0, 0, -2.3), (1.75, 1.85, 2.7), 'suit', 'arm' + side, shoulders[side], segments=12, ring_count=8)
        add('torus', 'mittfur' + side, (0, 0, -5.3), (1, 1, 1), 'fur', 'arm' + side, shoulders[side],
            major_radius=1.45, minor_radius=0.5, major_segments=12, minor_segments=6)
    helmet(ruff=True)


def build_runner():
    # the Neon Runner: an Arcadian street jacket open over a black tee, LED piping, a high collar, white kicks
    legs('pants', 'sneaker')
    for side, sx in (('L', -1.45), ('R', 1.45)):
        add('cube', 'ledthigh' + side, (sx, 0, -2.0), (0.22, 0.4, 2.0), 'ledp', 'led', hips[side])
        add('cube', 'ledshin' + side, (sx, 0, -1.4), (0.22, 0.4, 1.6), 'ledp', 'led', knees[side])
    add('cube', 'torso', (0, 0, 13.2), (4.1, 3.0, 4.3), 'suit', 'torso', body, bevel=1.3)
    add('cube', 'tee', (0, -2.95, 13.0), (1.15, 0.25, 3.9), 'pants', 'tee', body)
    for sx in (-1.3, 1.3):
        add('cube', 'piping', (sx, -3.1, 13.0), (0.22, 0.25, 3.9), 'ledc', 'led', body)
    add('cube', 'hem', (0, 0, 9.3), (4.2, 3.1, 0.55), 'suitdk', 'torso', body, bevel=0.2)
    add('cube', 'pack', (0, 3.25, 13.8), (2.5, 1.0, 3.0), 'pack', 'pack', body, bevel=0.6)
    add('cube', 'packLight', (0, 4.3, 14.6), (1.6, 0.25, 0.3), 'ledp', 'pack', body)
    arms('suit', 'pants')
    for side, sx in (('L', -1.3), ('R', 1.3)):
        add('cube', 'ledarm' + side, (sx, 0, -2.9), (0.2, 0.42, 2.7), 'ledc', 'led', shoulders[side])
    helmet()
    add('cylinder', 'highcollar', (0, 0, 1.2), (3.6, 3.4, 1.5), 'suitdk', 'collar', head, vertices=18)


def build_mystic():
    # the Starweave Robe: a long robe in the suit's colour to the ankles, gold stars stitched down the front, a sash,
    # wide sleeves, and a hood fallen back behind the helmet
    legs('suitdk', 'leather')
    add('cube', 'torso', (0, 0, 13.2), (4.2, 3.1, 4.3), 'suit', 'torso', body, bevel=1.4)
    add('cone', 'robe', (0, 0.2, 6.0), (1, 0.92, 1), 'suit', 'robe', body, vertices=20, radius1=5.5, radius2=4.3, depth=7.6)
    add('cube', 'hemline', (0, -4.6, 2.6), (2.2, 0.3, 0.45), 'brass', 'robe', body)
    add('cube', 'sash', (0, 0, 9.9), (4.45, 3.35, 0.75), 'brass', 'torso', body, bevel=0.3)
    add('cube', 'sashtail', (1.6, -3.4, 8.2), (0.7, 0.3, 1.8), 'brass', 'torso', body, bevel=0.1)
    for z, dy in ((15.2, 0), (13.4, 0), (11.6, 0), (7.6, -0.9), (5.4, -1.3), (3.4, -1.6)):
        add('uv_sphere', 'star', (0, -3.35 + dy, z), (0.42, 0.22, 0.42), 'brass', 'stars', body, segments=6, ring_count=4)
    add('cube', 'charm', (-1.9, -3.5, 9.0), (0.5, 0.25, 0.8), 'ledc', 'charm', body)
    add('cube', 'pack', (0, 3.3, 13.8), (2.6, 1.1, 3.0), 'suitdk', 'pack', body, bevel=0.6)
    arms('suit', 'leather')
    for side in 'LR':
        add('cone', 'sleeve' + side, (0, 0, -4.2), (1, 1, 1), 'suit', 'arm' + side, shoulders[side], vertices=12,
            radius1=2.1, radius2=1.45, depth=2.6)
        add('torus', 'cufftrim' + side, (0, 0, -5.4), (1, 1, 1), 'brass', 'arm' + side, shoulders[side],
            major_radius=1.95, minor_radius=0.22, major_segments=12, minor_segments=4)
    helmet()
    add('uv_sphere', 'hood', (0, 3.0, 1.6), (4.0, 1.9, 3.0), 'suitdk', 'hood', head, segments=14, ring_count=8)


def build_ranger():
    # the Ranger's Cloak: a field cloak and mantle in the suit's colour over a leather jerkin, bracers, tall boots,
    # a coil of rope at the hip and a bedroll on the pack — for the long walks out past the villages
    legs('pants', 'leather')
    add('cube', 'torso', (0, 0, 13.2), (4.2, 3.1, 4.3), 'leather', 'torso', body, bevel=1.4)
    add('cube', 'jerkinlace', (0, -3.2, 13.4), (0.35, 0.2, 3.2), 'pants', 'torso', body)
    add('cube', 'cloak', (0, 3.1, 11.3), (4.7, 0.7, 6.2), 'suit', 'cloak', body, bevel=0.5)
    add('uv_sphere', 'mantle', (0, 0.5, 16.9), (5.0, 4.0, 1.7), 'suit', 'mantle', body, segments=16, ring_count=8)
    add('cube', 'clasp', (0, -3.6, 16.6), (0.6, 0.3, 0.6), 'brass', 'mantle', body)
    add('cube', 'belt', (0, 0, 9.7), (4.45, 3.25, 0.65), 'pants', 'torso', body, bevel=0.3)
    add('torus', 'rope', (4.2, -0.6, 8.8), (1, 0.6, 1), 'fur', 'rope', body, rot=(0, math.pi / 2, 0),
        major_radius=1.2, minor_radius=0.35, major_segments=12, minor_segments=5)
    add('cube', 'pack', (0, 4.2, 13.4), (3.0, 1.3, 3.2), 'leather', 'pack', body, bevel=0.7)
    add('cylinder', 'bedroll', (0, 4.3, 17.4), (1.1, 1.1, 3.3), 'suitdk', 'pack', body, rot=(0, math.pi / 2, 0), vertices=12)
    arms('suit', 'leather')
    for side in 'LR':
        add('cube', 'bracer' + side, (0, 0, -4.5), (1.5, 1.65, 1.1), 'leather', 'arm' + side, shoulders[side], bevel=0.3)
    helmet()
    add('uv_sphere', 'hood', (0, 3.2, 1.2), (4.2, 1.8, 3.2), 'suit', 'hood', head, segments=14, ring_count=8)


def build_human(spec):
    global head
    legs('pants', 'shoes' if 'shoes' in spec else 'leather')
    wide = 1.12 if spec.get('brawny') else 1.0
    add('cube', 'torso', (0, 0, 13.0), (4.0 * wide, 2.9 * wide, 4.2), 'shirt', 'torso', body, bevel=1.3)
    add('cube', 'belt', (0, 0, 9.6), (4.1 * wide, 3.0 * wide, 0.6), 'belt' if 'belt' in spec else 'leather', 'torso', body, bevel=0.3)
    if 'skirt' in spec:
        add('cone', 'skirt', (0, 0, 5.2), (1, 0.9, 1), 'skirt', 'skirt', body,
            vertices=16, radius1=4.9, radius2=3.6, depth=8.6)
        if 'trim' in spec:       # a band of embroidery round the hem
            add('torus', 'hem', (0, 0, 1.2), (1, 0.9, 1), 'trim', 'skirt', body,
                major_radius=4.75, minor_radius=0.45, major_segments=20, minor_segments=5)
    if 'cloak' in spec:          # hangs from the shoulders down the back
        add('cube', 'cloak', (0, 3.2, 10.6), (4.6, 0.6, 6.6), 'cloak', 'cloak', body, bevel=0.4)
        add('cube', 'cloak_clasp', (0, -2.9, 16.3), (0.6, 0.3, 0.6), 'trim' if 'trim' in spec else 'brass', 'torso', body)
    if spec.get('sword'):        # a long sheathed sword at the left hip, out from the body so it reads, hilt forward
        add('cube', 'scabbard', (-5.6, 0.9, 6.0), (0.6, 0.9, 4.6), 'scabbard', 'sword', body, rot=(-0.4, 0, 0.12), bevel=0.2)
        add('cube', 'chape', (-5.4, 2.6, 1.9), (0.7, 1.0, 0.6), 'brass', 'sword', body, rot=(-0.4, 0, 0.12))
        add('cube', 'crossguard', (-6.0, -1.0, 10.4), (0.6, 2.0, 0.45), 'brass', 'sword', body)
        add('cube', 'grip', (-6.0, -1.6, 11.8), (0.45, 0.45, 1.3), 'leather', 'sword', body, rot=(-0.4, 0, 0))
        add('uv_sphere', 'pommel', (-6.0, -2.1, 13.2), (0.7, 0.7, 0.7), 'brass', 'sword', body, segments=8, ring_count=6)
    if spec.get('bow'):          # a longbow slung across the back, a quiver of arrows over the right shoulder
        tilt = math.radians(35)
        prev = None
        for i in range(11):
            t = -1 + 2 * i / 10
            u, v = t * 9.0, 2.2 * (1 - t * t)                  # along the bow, and the curve out from the back
            p = (math.cos(tilt) * u, 4.2 + v, 12.0 + math.sin(tilt) * u)
            if prev:
                d = [p[j] - prev[j] for j in range(3)]
                L = math.sqrt(sum(c * c for c in d))
                mid = tuple((p[j] + prev[j]) / 2 for j in range(3))
                add('cube', 'bow', mid, (0.38, 0.38, L / 2 + 0.1), 'bowwood', 'bow', body,
                    rot=(-math.atan2(d[1], math.hypot(d[0], d[2])), math.atan2(d[0], d[2]), 0))
            prev = p
        a, b = (math.cos(tilt) * -9.0, 4.2, 12.0 + math.sin(tilt) * -9.0), (math.cos(tilt) * 9.0, 4.2, 12.0 + math.sin(tilt) * 9.0)
        d = [b[j] - a[j] for j in range(3)]
        add('cube', 'bowstring', tuple((a[j] + b[j]) / 2 for j in range(3)), (0.12, 0.12, 9.2), 'white', 'bowstring', body,
            rot=(0, math.atan2(d[0], d[2]), 0))
        add('cylinder', 'quiver', (2.6, 3.6, 14.0), (1.1, 1.1, 3.6), 'leather', 'quiver', body, rot=(0, -0.35, 0), vertices=10)
        for k_, dx in enumerate((-0.5, 0.2, 0.8)):
            add('cube', 'fletching', (3.9 + dx, 3.6 + 0.3 * k_, 18.0), (0.25, 0.6, 1.0), 'fletch', 'arrows', body, rot=(0, -0.35, 0))
    if 'apron' in spec:
        add('cube', 'apron', (0, -2.95, 9.6), (3.4, 0.35, 4.2), 'apron', 'torso', body, bevel=0.2)
    if 'vest' in spec:
        add('cube', 'vestL', (-2.4, -2.1, 13.4), (1.5, 1.0, 3.8), 'vest', 'torso', body, bevel=0.3)
        add('cube', 'vestR', (2.4, -2.1, 13.4), (1.5, 1.0, 3.8), 'vest', 'torso', body, bevel=0.3)
    # ---- the Neon Royale's staff and guests ----
    if 'waistcoat' in spec:      # a closed waistcoat over the shirt, three brass buttons
        add('cube', 'waistcoat', (0, -2.55, 12.3), (3.9 * wide, 0.75, 3.4), 'waistcoat', 'waistcoat', body, bevel=0.3)
        for bz in (10.4, 11.9, 13.4):
            add('uv_sphere', 'button', (0, -3.32, bz), (0.42, 0.3, 0.42), 'brass', 'buttons', body, segments=6, ring_count=4)
    if spec.get('bib'):          # a shirt front showing down a jacket (a dinner suit)
        add('cube', 'bib', (0, -2.95, 14.0), (1.35, 0.32, 2.8), 'bib', 'bib', body, bevel=0.2)
    if 'coat' in spec:           # a doorman's greatcoat: skirts to the knee, two rows of gold buttons
        add('cone', 'coat_skirt', (0, 0, 7.0), (1, 0.92, 1), 'coat', 'coat', body, vertices=16, radius1=4.75, radius2=4.15, depth=5.4)
        for bz in (10.2, 12.0, 13.8):
            for bx in (-1.4, 1.4):
                add('uv_sphere', 'button', (bx, -3.05, bz), (0.45, 0.35, 0.45), 'brass', 'buttons', body, segments=6, ring_count=4)
    if spec.get('sequin'):       # sequins scattered over the front of a dress, catching the light
        for i in range(18):
            a = math.radians(25 + (i * 137.5) % 130)                # round the front half
            z = 1.6 + (i * 0.61) % 1.0 * 14.0
            if z < 9.4:                                              # the skirt: a cone, 4.9 at the hem to 3.6 at the waist
                rad = 4.9 - (z - 0.9) / 8.6 * 1.3 + 0.15
                p = (math.cos(a) * rad, -math.sin(a) * rad * 0.9, z)
            else:                                                    # the bodice
                p = (math.cos(a) * 4.0 * 0.9, -3.0, z)
            add('cube', 'sequin', p, (0.3, 0.3, 0.3), 'sequin', 'sequins', body)
    if 'bowtie' in spec:
        add('cube', 'bowtie', (0, -3.15, 16.5), (1.25, 0.4, 0.5), 'bowtie', 'bowtie', body, bevel=0.15)
    if 'stole' in spec:          # a fur stole round the shoulders
        add('torus', 'stole', (0, 0.2, 16.4), (1, 0.82, 0.75), 'stole', 'stole', body,
            major_radius=4.7, minor_radius=1.4, major_segments=16, minor_segments=6)
    if spec.get('tray'):         # a cocktail tray held up at the shoulder, two drinks on it
        add('cylinder', 'tray', (6.4, -1.4, 17.8), (2.9, 2.9, 0.28), 'steel', 'tray', body, vertices=16)
        for (gx, gy, tone) in ((5.5, -2.3, 'glassA'), (7.2, -0.9, 'glassB'), (6.6, -2.4, 'glassA')):
            add('cylinder', 'glass', (gx, gy, 18.9), (0.6, 0.6, 1.0), tone, 'drinks', body, vertices=8)
    arms('sleeve' if 'sleeve' in spec else 'shirt', 'glove' if 'gloves' in spec else 'skin')
    if spec.get('chrome_arm'):   # a cyber arm: the left one is polished chrome
        for i, (o, tone, p) in enumerate(PARTS):
            if o.name.startswith(('armL', 'handL')):
                PARTS[i] = (o, 'steel', p)
    if 'coat' in spec:           # gold epaulettes on the greatcoat
        for side in 'LR':
            add('cube', 'epaulette' + side, (0, 0, 0.5), (1.7, 1.7, 0.45), 'brass', 'epaulette' + side, shoulders[side], bevel=0.2)
    if 'armour' in spec:         # leaf-shaped pauldrons over the shoulders
        for side in 'LR':
            add('uv_sphere', 'pauldron' + side, (0, 0, 0.4), (2.2, 2.1, 1.4), 'armour', 'pauldron' + side, shoulders[side],
                segments=12, ring_count=8)
    head = pivot('head', (0, 0, 17.4), body)
    add('cylinder', 'neck', (0, 0, 0.6), (1.6, 1.6, 1.2), 'skin', 'neck', head, vertices=10)
    add('uv_sphere', 'face', (0, 0, 5.2), (5.0, 4.8, 5.0), 'skin', 'head', head, segments=24, ring_count=12)
    for sx in (-1.8, 1.8):
        add('cube', 'eye', (sx, -4.6, 5.9), (0.7, 0.7, 1.0), 'eye', 'eyes', head)
    add('cube', 'nose', (0, -4.9, 4.4), (0.55, 0.6, 0.6), 'skin', 'head', head, bevel=0.2)
    if not spec.get('bald'):
        add('uv_sphere', 'hair', (0, 0.5, 6.4), (5.3, 5.0, 4.3), 'hair', 'hair', head, segments=20, ring_count=10)
    else:
        for sx in (-4.6, 4.6):
            add('uv_sphere', 'hairside', (sx, 0.6, 4.6), (1.0, 2.6, 1.8), 'hair', 'hair', head, segments=10, ring_count=6)
    if spec.get('mustache'):
        add('cube', 'mustache', (0, -4.75, 3.4), (2.2, 0.5, 0.5), 'hair', 'beard', head, bevel=0.2)
    if spec.get('beard'):
        add('uv_sphere', 'beard', (0, -3.4, 2.4), (3.6, 2.0, 2.5), 'hair', 'beard', head, segments=14, ring_count=8)
    if 'beanie' in spec:
        add('uv_sphere', 'beanie', (0, 0.3, 7.6), (5.3, 5.1, 3.6), 'beanie', 'hat', head, segments=20, ring_count=10)
        add('torus', 'beanie_rim', (0, 0.2, 6.9), (1, 1, 0.7), 'beanie', 'hat', head,
            major_radius=4.9, minor_radius=0.8, major_segments=20, minor_segments=6)
    if 'crown' in spec:          # a gold circlet with five points (the Queen-Regent)
        add('cylinder', 'crown', (0, 0.4, 9.6), (4.4, 4.2, 0.9), 'crown', 'hat', head, vertices=16)
        for i in range(5):
            ang = math.pi / 2 + (i - 2) * 0.62
            add('cone', 'crownpt', (math.cos(ang) * 4.1, 0.4 - math.sin(ang) * 3.9, 11.2), (1, 1, 1), 'crown', 'hat', head,
                vertices=6, radius1=0.9, radius2=0.0, depth=2.0)
    if spec.get('bun'):
        add('uv_sphere', 'bun', (0, 3.6, 8.4), (2.2, 2.0, 2.0), 'hair', 'hair', head, segments=12, ring_count=8)
    if spec.get('long_hair'):
        add('cube', 'hair_back', (0, 3.2, 2.6), (4.2, 1.6, 4.2), 'hair', 'hair', head, bevel=1.0)
        if spec.get('long_hair') == 'flowing':   # longer, past the shoulders, with locks framing the face
            add('cube', 'hair_fall', (0, 3.4, -1.2), (3.8, 1.3, 3.4), 'hair', 'hair', head, bevel=1.0)
            for sx in (-4.4, 4.4):
                add('cube', 'hair_lock', (sx, 0.4, 3.4), (1.0, 2.8, 3.6), 'hair', 'hair', head, bevel=0.6)
    if spec.get('ponytail'):
        add('uv_sphere', 'tie', (0, 4.6, 6.6), (1.1, 1.0, 1.1), 'hair', 'hair', head, segments=10, ring_count=6)
        add('uv_sphere', 'tail', (0, 5.6, 3.6), (1.4, 1.3, 3.4), 'hair', 'hair', head, rot=(0.35, 0, 0), segments=12, ring_count=8)
    if spec.get('elf_ears'):     # long, pointed, swept back
        for sx, sgn in ((-4.8, -1), (4.8, 1)):
            add('cone', 'ear', (sx + 0.9 * sgn, 0.9, 6.4), (1, 1, 1), 'skin', 'ears', head, rot=(0.5, sgn * -1.1, 0),
                vertices=6, radius1=0.9, radius2=0.0, depth=3.4)
    if 'circlet' in spec:        # a fine band round the brow, a leaf at the front
        add('torus', 'circlet', (0, 0.3, 7.6), (1, 0.98, 0.6), 'circlet', 'hat', head,
            major_radius=5.15, minor_radius=0.32, major_segments=24, minor_segments=5)
        add('uv_sphere', 'circlet_leaf', (0, -4.9, 8.0), (0.9, 0.35, 1.2), 'circlet', 'hat', head, segments=8, ring_count=6)
        if 'gem' in spec:        # a stone set in the leaf
            add('uv_sphere', 'circlet_gem', (0, -5.3, 8.0), (0.65, 0.4, 0.75), 'gem', 'gem', head, segments=8, ring_count=6)
    if 'hood' in spec:
        add('uv_sphere', 'hood', (0, 1.2, 5.8), (5.7, 5.4, 5.6), 'hood', 'hood', head, segments=20, ring_count=10)
        add('cone', 'hood_drape', (0, 1.6, 0.4), (1, 1, 1), 'hood', 'hood', head, vertices=14, radius1=5.0, radius2=3.2, depth=3.0)
    if spec.get('chef'):
        add('cylinder', 'chef_band', (0, 0.2, 9.0), (4.6, 4.4, 1.0), 'white', 'hat', head, vertices=18)
        add('uv_sphere', 'chef_puff', (0, 0.2, 11.2), (5.0, 4.8, 2.6), 'white', 'hat', head, segments=16, ring_count=8)
    if 'cap' in spec:
        add('cylinder', 'cap', (0, 0.3, 9.0), (5.4, 5.2, 1.4), 'cap', 'hat', head, vertices=20)
        add('cube', 'brim', (0, -4.6, 8.1), (3.4, 2.2, 0.35), 'cap', 'hat', head, bevel=0.3)
    if spec.get('shades'):       # dark glasses
        add('cube', 'shades', (0, -4.55, 5.95), (4.5, 0.75, 0.95), 'shades', 'shades', head, bevel=0.3)
    if spec.get('earpiece'):     # security earpiece, a lit bead
        add('uv_sphere', 'earpiece', (4.95, -0.3, 5.0), (0.65, 0.65, 0.65), 'ledc', 'earpiece', head, segments=6, ring_count=4)
    if spec.get('visor_band'):   # glowing cyber visor across the eyes
        add('cube', 'visor_band', (0, -4.4, 5.9), (4.9, 0.9, 1.1), 'ledc', 'visor', head, bevel=0.3)
    if spec.get('visor_cap'):    # green eyeshade
        add('cube', 'eyeshade', (0, -3.8, 8.0), (4.8, 2.6, 0.35), 'visor', 'hat', head, rot=(0.25, 0, 0), bevel=0.2)
        add('torus', 'eyeshade_band', (0, 0.0, 8.2), (1, 1, 0.5), 'visor', 'hat', head,
            major_radius=4.8, minor_radius=0.5, major_segments=18, minor_segments=5)
    if spec.get('goggles'):      # pushed up on the forehead
        for sx in (-1.9, 1.9):
            add('cylinder', 'goggle', (sx, -3.9, 8.3), (1.4, 1.4, 0.9), 'brass', 'goggles', head, rot=(1.2, 0, 0), vertices=12)
            add('cylinder', 'goggle_lens', (sx, -4.5, 8.5), (1.0, 1.0, 0.3), 'ledc', 'goggle_lens', head, rot=(1.2, 0, 0), vertices=12)
        add('torus', 'goggle_strap', (0, 0.0, 8.0), (1, 1, 0.6), 'leather', 'goggles', head,
            major_radius=5.0, minor_radius=0.45, major_segments=18, minor_segments=5)
    if spec.get('mask'):         # surgical mask
        add('cube', 'mask', (0, -4.3, 3.4), (3.6, 1.0, 1.9), 'white', 'mask', head, bevel=0.5)
    if spec.get('mohawk'):
        add('cube', 'mohawk', (0, 0.6, 10.0), (0.9, 4.4, 2.2), 'hair', 'hair', head, bevel=0.4)
    if 'straw_hat' in spec:      # a wide-brimmed straw hat with a band (Verdance)
        add('cylinder', 'straw_brim', (0, 0.4, 8.7), (7.2, 6.9, 0.35), 'straw_hat', 'hat', head, vertices=24)
        add('cylinder', 'straw_crown', (0, 0.4, 9.9), (4.5, 4.3, 1.5), 'straw_hat', 'hat', head, vertices=18)
        add('cylinder', 'straw_band', (0, 0.4, 9.3), (4.6, 4.4, 0.45), 'leather', 'hat_band', head, vertices=18)
    if 'witch_hat' in spec:
        add('cylinder', 'hat_brim', (0, 0.8, 9.2), (6.4, 6.0, 0.4), 'witch_hat', 'hat', head, rot=(-0.3, 0, 0), vertices=24)
        add('cylinder', 'hat_band', (0, 1.0, 9.9), (4.4, 4.2, 0.8), 'leather', 'hat_band', head, rot=(-0.3, 0, 0), vertices=18)
        add('cone', 'hat_cone', (0, 2.4, 13.4), (1, 1, 1), 'witch_hat', 'hat', head,
            rot=(-0.4, 0, 0), vertices=16, radius1=4.3, radius2=0.5, depth=8.0)


if WHO.startswith('pilot'):          # pilot[-sit|-ski|-climb][-<style>]-<a|b>: one suit on one body, every head
    _parts = WHO.split('-')[1:]
    BODY = _parts.pop() if _parts and _parts[-1] in ('a', 'b') else 'a'
    MODE = _parts[0] if _parts and _parts[0] in ('sit', 'ski', 'climb') else 'stand'
    _rest = _parts[1:] if MODE != 'stand' else _parts
    STYLE = _rest[0] if _rest else 'flight'
    {'flight': build_pilot, 'coat': build_coat, 'plate': build_plate, 'thermal': build_thermal, 'runner': build_runner,
     'mystic': build_mystic, 'ranger': build_ranger}[STYLE]()
    if BODY == 'b':
        body_b()
    if MODE == 'climb':                # arms over the head need a taller frame
        W, H = 32, 64
        ORIGIN_PX = (16, 61)
    elif MODE == 'ski':                # and ski tips pointing at you need room below the feet, a carve room to lean
        W, H = 40, 56
        ORIGIN_PX = (20, 45)
    VARIANTS = {'key': dict(KEYS)}
    POSE = MODE
else:
    spec = NPCS[WHO]
    build_human(spec)
    tones = {'shirt': spec['shirt'], 'pants': FIXED['pants'], 'hair': spec['hair'], 'skin': FIXED[spec['skin']]}
    if spec.get('gown'):         # a floor-length gown: what shows of the legs is gown too
        tones['pants'] = spec['skirt']
    if 'sleeve' in spec:
        tones['sleeve'] = FIXED[spec['sleeve']] if spec['sleeve'] in FIXED else FIXED[spec['skin']]
    for key in ('apron', 'vest', 'beanie', 'cap', 'skirt', 'hood', 'witch_hat', 'straw_hat', 'crown',
                'belt', 'trim', 'cloak', 'armour', 'circlet', 'eye', 'shoes', 'gem', 'scabbard', 'bowwood', 'fletch',
                'waistcoat', 'coat', 'bowtie', 'stole', 'pants'):
        if key in spec:
            tones[key] = spec[key]
    for key, tone in (('bib', 'bib'), ('gloves', 'glove'), ('sequin', 'sequin')):   # True: the stock colour; a tuple: its own
        if isinstance(spec.get(key), tuple):
            tones[tone] = spec[key]
    VARIANTS = {WHO.replace('npc-', ''): tones}
    POSE = spec['pose']

# ---- skis and poles (pilot-ski-*): skis on the root so they stay on the snow however the legs bend ----
skis, poles = {}, {}
if WHO.startswith('pilot') and POSE == 'ski':
    for side, sx in (('L', -2.0), ('R', 2.0)):
        sp = pivot('ski' + side, (sx, 0, 0), root)
        skis[side] = sp
        add('cube', 'skiBoard' + side, (0, -1.0, 0.3), (0.85, 7.0, 0.3), 'ski', 'ski' + side, sp, bevel=0.15)
        add('cube', 'skiTip' + side, (0, -8.2, 0.9), (0.85, 0.9, 0.3), 'ski', 'ski' + side, sp, rot=(-0.6, 0, 0), bevel=0.15)
        add('cube', 'binding' + side, (0, -0.6, 0.8), (1.0, 1.4, 0.35), 'pole', 'ski' + side, sp)
        poles[side] = add('cylinder', 'pole' + side, (0, 1.2, -11.0), (0.32, 0.32, 5.2), 'pole', 'pole' + side, shoulders[side],
                          rot=(0.22, 0, 0), vertices=6)
        add('cylinder', 'basket' + side, (0, 2.3, -15.8), (1.0, 1.0, 0.15), 'pole', 'pole' + side, shoulders[side], vertices=8)

# ---- camera: scene angle, origin pinned to ORIGIN_PX ----------------------------
cd = bpy.data.cameras.new('cam')
cd.type = 'ORTHO'
cd.ortho_scale = max(W, H) / 32
cam = bpy.data.objects.new('cam', cd)
scene.collection.objects.link(cam)
f = Vector((0, math.cos(ELEV), -math.sin(ELEV)))
up = Vector((0, math.sin(ELEV), math.cos(ELEV)))
# frame centre is (W/2, H/2); origin pixel sits below/left of it
dx = (W / 2 - ORIGIN_PX[0]) / 32
dy = (ORIGIN_PX[1] - H / 2) / 32          # tiles the centre is above the origin
center = Vector((dx, 0, 0)) + up * dy
cam.location = center - f * 50
cam.rotation_euler = (math.pi / 2 - ELEV, 0, 0)
scene.camera = cam

scene.render.engine = 'CYCLES'
scene.cycles.samples = 1
scene.cycles.use_denoising = False
scene.cycles.filter_width = 0.01
scene.cycles.device = 'CPU'
scene.render.resolution_x = W
scene.render.resolution_y = H
scene.render.film_transparent = True
scene.render.dither_intensity = 0.0
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'Standard'

# ---- poses -------------------------------------------------------------------------
DIRS = {'down': 0, 'right': 90, 'up': 180, 'left': -90}
STRIDE, ARM = math.radians(34), math.radians(30)
SEAT = 0.48 / UNIT          # stool height in model units
FRAMES = []
for i in range(4):
    FRAMES.append(('idle', i, 0.0, [0, 0.4, 0.8, 0.4][i], i != 2))
for i in range(8):
    ph = 2 * math.pi * i / 8
    FRAMES.append(('walk', i, math.sin(ph), -0.9 * abs(math.sin(ph)) + 0.45, True))


def pose(swing, lift, frame):
    if POSE == 'sit':
        # thighs forward onto the seat, shins down; small breathing + sway
        for side in 'LR':
            hips[side].rotation_euler = (math.radians(-88), 0, 0)
            knees[side].rotation_euler = (math.radians(92), 0, 0)
        shoulders['L'].rotation_euler = (math.radians(-28), 0, math.radians(-8))
        shoulders['R'].rotation_euler = (math.radians(-20 - 6 * (frame % 2)), 0, math.radians(8))
        body.location = (0, 0, SEAT - 9.2 + lift * 0.6)
        if head:
            head.rotation_euler = (0, 0, math.radians([0, 4, 0, -4][frame % 4]))
        return
    hips['L'].rotation_euler = (STRIDE * swing, 0, 0)
    hips['R'].rotation_euler = (-STRIDE * swing, 0, 0)
    for side in 'LR':
        knees[side].rotation_euler = (max(0.0, -STRIDE * swing * (1 if side == 'L' else -1)) * 0.6, 0, 0)
    shoulders['L'].rotation_euler = (-ARM * swing, 0, 0)
    shoulders['R'].rotation_euler = (ARM * swing, 0, 0)
    body.location = (0, 0, lift)


ID_MATS = {p: flat_mat('id%d' % p, (((p * 37) % 251) / 255, ((p * 91) % 251) / 255, ((p * 53) % 251) / 255)) for p in PIDS.values()}
COLOR = {}
for v, tones in VARIANTS.items():
    for _, tone, _ in PARTS:
        if (v, tone) not in COLOR:
            COLOR[(v, tone)] = cel_mat(v + tone, tones.get(tone) or FIXED[tone])
TIP_OFF = cel_mat('tipoff', FIXED['ledoff'])


def set_pass(kind, variant=None):
    for o, tone, p in PARTS:
        o.data.materials[0] = DEPTH if kind == 'depth' else ID_MATS[p] if kind == 'id' else COLOR[(variant, tone)]


def render(path, sixteen=False):
    scene.render.image_settings.color_mode = 'BW' if sixteen else 'RGBA'
    scene.render.image_settings.color_depth = '16' if sixteen else '8'
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)




# ---- sport poses: skiing and climbing --------------------------------------------------------------
# Same sheet layout as walking (rows down/right/up/left × columns idle0-3, walk0-7) so sprites_post packs them,
# but the cells mean other things — see SKI_ROWS / CLIMB_ROWS and js/ski.js, js/climb.js.
COLNAMES = [f'idle{i}' for i in range(4)] + [f'walk{i}' for i in range(8)]


def rest_pose():
    for side in 'LR':
        hips[side].rotation_euler = (0, 0, 0)
        knees[side].rotation_euler = (0, 0, 0)
        shoulders[side].rotation_euler = (0, 0, 0)
        if side in skis:
            skis[side].rotation_euler = (0, 0, 0)
            skis[side].location.z = 0
    body.location = (0, 0, 0)
    body.rotation_euler = (0, 0, 0)
    if head:
        head.rotation_euler = (0, 0, 0)


def crouch(h, k, lift=0.0):
    """Bend at hips and knees (degrees) and drop the body so the boots stay on the skis."""
    for side in 'LR':
        hips[side].rotation_euler = (math.radians(-h), 0, 0)
        knees[side].rotation_euler = (math.radians(k), 0, 0)
    drop = 9.2 - 4.2 * math.cos(math.radians(h)) - 4.0 * math.cos(math.radians(k - h))
    body.location = (0, 0, -drop + lift)


def arms_to(lx, rx, lz=0.0, rz=0.0):
    shoulders['L'].rotation_euler = (math.radians(lx), 0, math.radians(lz))
    shoulders['R'].rotation_euler = (math.radians(rx), 0, math.radians(rz))


def ski_glide(bob):
    def f():
        crouch(28, 48, bob * 0.35)
        arms_to(-34, -34, -8, 8)
    return f


def ski_frame(fn, roll=0.0, yaw=0.0):
    return {'fn': fn, 'roll': roll, 'yaw': yaw}


def tuck():
    crouch(58, 100)
    arms_to(-72, -72, -4, 4)


def carve():
    crouch(34, 58)
    arms_to(-40, -28, -14, 14)


def plough():
    crouch(18, 32)
    arms_to(-26, -26, -12, 12)
    skis['L'].rotation_euler = (0, 0, math.radians(-14))
    skis['R'].rotation_euler = (0, 0, math.radians(14))


def air():
    crouch(55, 90, 3.0)
    for side in 'LR':
        skis[side].location.z = 2.2
    arms_to(-40, -40, -45, 45)


def pole_push():
    crouch(22, 40)
    arms_to(28, 28, -6, 6)


def crash(v):
    def f():
        for side in 'LR':
            hips[side].rotation_euler = (math.radians(-82), 0, math.radians(8 if side == 'L' else -8))
            knees[side].rotation_euler = (math.radians(40 + 10 * v), 0, 0)
        body.location = (0, 0, -7.6)
        arms_to(38, 30 + 8 * v, -30, 30)
        skis['L'].rotation_euler = (0, 0, math.radians(28 + 6 * v))
        skis['R'].rotation_euler = (0, 0, math.radians(-38))
        skis['R'].location.z = 0.4
    return f


SKI_ROWS = []
if POSE == 'ski':
    run = [ski_frame(ski_glide(b)) for b in (0, 1, 2, 1)] + [ski_frame(tuck), ski_frame(tuck),
           ski_frame(carve, roll=-13), ski_frame(carve, roll=13), ski_frame(plough), ski_frame(air),
           ski_frame(pole_push), ski_frame(pole_push)]
    # rows: straight down the fall line, a traverse across it, the diagonal between; the last row is the
    # spin off a jump (eight headings, airborne) and sitting in the snow after a fall
    SKI_ROWS = [('down', 0, run), ('right', 90, run), ('up', 45, run),
                ('left', 0, [ski_frame(air, yaw=a) for a in range(0, 360, 45)] + [ski_frame(crash(v), yaw=25) for v in range(4)])]


def hang(lx_, rx_, lspread=-10, rspread=10, lhip=40, lknee=70, rhip=10, rknee=20, lift=0.0):
    def f():
        arms_to(-lx_, -rx_, lspread, rspread)
        hips['L'].rotation_euler = (math.radians(-lhip), 0, 0)
        knees['L'].rotation_euler = (math.radians(lknee), 0, 0)
        hips['R'].rotation_euler = (math.radians(-rhip), 0, 0)
        knees['R'].rotation_euler = (math.radians(rknee), 0, 0)
        body.location = (0, 0, lift)
    return f


def stand_ledge():
    arms_to(-12, -12, -4, 4)


def falling():
    arms_to(-130, -130, -60, 60)
    for side in 'LR':
        hips[side].rotation_euler = (math.radians(-30), 0, 0)
        knees[side].rotation_euler = (math.radians(55), 0, 0)


CLIMB_ROWS = []
if POSE == 'climb':
    # (arms spread wide of the helmet, or they vanish behind it seen from behind)
    climb = [{'fn': hang(160, 160, -30, 30, 40 + 6 * b, 70, 10, 20, 0.3 * b)} for b in (0, 1, 2, 1)] + [
        {'fn': hang(172, 140, -24, 34, 20, 30, 50, 85)},       # reaching up with the left hand
        {'fn': hang(140, 172, -34, 24, 50, 85, 20, 30)},       # reaching up with the right
        {'fn': hang(145, 145, -36, 36, 70, 100, 30, 50, 2.5)}, # pulling up
        {'fn': hang(115, 115, -40, 40, 85, 110, 15, 25, 3.5)}, # mantling onto a ledge
        {'fn': stand_ledge}, {'fn': falling},
        {'fn': hang(160, -25, -30, 6, 30, 60, 10, 20)},        # one hand down, chalking up
        {'fn': hang(165, 10, -30, 10, 20, 40, 40, 70)}]        # shaking out an arm
    CLIMB_ROWS = [('up', 180, climb)]


def render_cell(base, dname, col, yaw, spec):
    rest_pose()
    spec['fn']()
    root.rotation_euler = (0, math.radians(spec.get('roll', 0.0)), math.radians(yaw + spec.get('yaw', 0.0)))
    tag = f'{dname}_{COLNAMES[col]}.png'
    set_pass('id'); render(os.path.join(base, 'id', tag))
    set_pass('depth'); render(os.path.join(base, 'depth', tag), sixteen=True)
    for v in VARIANTS:
        set_pass('color', v)
        render(os.path.join(base, 'color_' + v, tag))
    return tag


def render_all(base):
    """Every frame of this character (as it's shown right now) into base/{id,depth,color_<variant>}/."""
    for kind in ['id', 'depth'] + ['color_' + v for v in VARIANTS]:
        os.makedirs(os.path.join(base, kind), exist_ok=True)
    if POSE in ('ski', 'climb'):
        import shutil
        for dname, yaw, specs in (SKI_ROWS if POSE == 'ski' else CLIMB_ROWS):
            for col, spec in enumerate(specs):
                tag = render_cell(base, dname, col, yaw, spec)
                if POSE == 'climb':                 # one view of a climber (from behind); the other rows copy it
                    for other in ('down', 'right', 'left'):
                        for kind in ['id', 'depth'] + ['color_' + v for v in VARIANTS]:
                            shutil.copy(os.path.join(base, kind, tag), os.path.join(base, kind, tag.replace(dname + '_', other + '_')))
        return
    rest_pose()
    for dname, yaw in DIRS.items():
        root.rotation_euler = (0, 0, math.radians(yaw))
        for anim, i, swing, lift, tip_on in FRAMES:
            pose(swing, lift, i)
            tag = f'{dname}_{anim}{i}.png'
            set_pass('id'); render(os.path.join(base, 'id', tag))
            set_pass('depth'); render(os.path.join(base, 'depth', tag), sixteen=True)
            for v in VARIANTS:
                set_pass('color', v)
                if tip is not None and not tip_on:
                    tip.data.materials[0] = TIP_OFF
                render(os.path.join(base, 'color_' + v, tag))


if WHO.startswith('pilot'):
    only = sys.argv[3].split(',') if len(sys.argv) > 3 else None     # just these heads (for a quick look)
    for name, groups in HEADS:
        if only and name not in only:
            continue
        set_head(groups)
        render_all(os.path.join(OUT, name))
    print('rendered', WHO, 'heads x', len(HEADS))
else:
    render_all(OUT)
    print('rendered', WHO)
