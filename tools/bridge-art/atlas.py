"""Write the Bridge's atlas: every place, which system (and island) it's in, and its ways out.

  python3 tools/bridge-art/atlas.py

Reads apps/bridge/assets/worlds/*.json and writes apps/bridge/assets/atlas.json, which the game menu's map
(js/map.js) uses to draw the map of everything: each system's places as a tree from where the shuttle lands,
which door leads where. Doors in the world JSON are `enter_world` / `leave_world` / `password_gate`; the ones
the JS adds or opens as a world loads (home doors, the club, the mine's lift, the chairlift, the climbing routes,
the Last Ridge...) are listed in EXTRA. Re-run it after adding a world or a door.
"""
import glob
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'bridge', 'assets'))
W = {os.path.basename(f)[:-5]: json.load(open(f)) for f in glob.glob(os.path.join(ROOT, 'worlds', '*.json'))}

# where the shuttle sets down in each system (js/ship.js LANDING) - the root of its tree; the ship's is the bridge
SYSTEMS = [
    ('ship', 'The Wayfarer', 'bridge', r'^(bridge|quarters|hangar|gameroom|office|ship-[a-z]+)$'),
    ('lumar', 'Lumar', 'lumar', r'^lumar'),
    ('arcadia', 'Arcadia', 'arcadia-skypad', r'^(arcadia|cyber-noodle|chrome-clinic|junk-pawn|tech-repair|null-den)'),
    ('enigma', 'Enigma Station', 'enigma-dock', r'^enigma'),
    ('singularity', 'The Singularity', 'singularity', r'^singularity'),
    ('verdance', 'Verdance', 'verdance-village', r'^verdance'),
    ('hoarfell', 'Hoarfell', 'hoarfell', r'^hoarfell'),
    ('sylvara', 'Sylvara', 'sylvara', r'^sylvara'),
]
# Lumar's islands (js/voyage.js ISLES), each its own tree from its pier; rooms whose ids don't start with their island's
ISLES = ['lumar', 'lumar-crown', 'lumar-tern', 'lumar-holm', 'lumar-sapphire', 'lumar-rose', 'lumar-cliff', 'lumar-crimson', 'lumar-cinder', 'lumar-midnight', 'lumar-saltmere']
INSIDE = {'lumar-home': 'lumar-sapphire', 'lumar-manor': 'lumar-crown', 'lumar-manor-drawing': 'lumar-crown', 'lumar-manor-library': 'lumar-crown',
          'lumar-manor-dining': 'lumar-crown', 'lumar-manor-bedroom': 'lumar-crown',
          'lumar-gloaming': 'lumar-saltmere'}       # the ghost ship, boarded at sea (js/sloop.js): Saltmere's own
# ways between places that the JS makes or opens, not the world JSON: (from, to, the interactions' labels, kind[, x, y])
# - x, y only for one the JS adds as the world loads (the rest are found by label, so the map can mark them)
EXTRA = [
    ('lumar-sapphire', 'lumar-home', ['WHITE HOUSE'], 'door'),                # js/home.js
    ('arcadia-street', 'arcadia-home', ['CAPSULE HOTEL'], 'door'),
    ('arcadia-skypad', 'arcadia-penthouse', ['PENTHOUSE'], 'door', 11, 3),         # js/home.js: the legacy homes (js/legacy.js)
    ('lumar-crown', 'lumar-manor', ['ASHCOMBE HOUSE'], 'door', 45, 29),
    ('verdance', 'verdance-home', ['FARMHOUSE'], 'door'),                     # js/homestead.js
    ('lumar-holm', 'lumar-holm-home', ['THE COTTAGE'], 'door'),               # js/holm.js
    ('lumar-holm', 'lumar-holm-resort', ['THE STARLING'], 'door', 35, 20),          # js/holm.js, once it's built
    ('lumar-holm', 'lumar-holm-hall', ['THE HALL OF FINDS'], 'door', 35, 13),       # js/holm.js, once it's built
    ('arcadia-street', 'arcadia-club', ['CLUB VOID'], 'door'),                # js/dance.js
    ('arcadia-spires', 'arcadia-members', ['THE ORRERY'], 'door'),            # js/spires.js: members, by introduction or bought
    ('arcadia-casino', 'arcadia-casino-vip', ['THE CROWN ROOM'], 'door'),     # js/worlds/casino.js: the rope opens for poker winners
    ('lumar-crown', 'lumar-crown-palace', ['PALACE GATE'], 'door'),           # js/crown.js
    ('lumar-crown', 'lumar-crown-oldtown', ['THE OLD TOWN'], 'door', 3, 21),   # js/capital.js: Crownhaven's districts
    ('lumar-sapphire', 'lumar-sapphire-market', ['FLOATING MARKET'], 'door', 44, 22),   # js/sapphire.js
    ('lumar-rose', 'lumar-rose-springs', ['ROSEWELL'], 'door', 52, 22),            # js/rose.js
    ('lumar-rose-mine', 'lumar-rose-mine-a', ['THE LIFT'], 'lift'),           # js/mine.js: the floors below
    ('lumar-rose-mine-a', 'lumar-rose-mine', ['LADDER UP'], 'lift'),
    ('hoarfell', 'hoarfell-summit', ['CHAIRLIFT'], 'lift'),                   # js/worlds/hoarfell.js
    ('hoarfell-summit', 'hoarfell', ['CHAIRLIFT'], 'lift'),
    ('hoarfell-piste', 'hoarfell-summit', ['CHAIRLIFT'], 'lift'),
    ('hoarfell', 'hoarfell-face', ['THE STAIRCASE', 'THE ICEFALL', 'THE HOARSPIRE'], 'climb'),   # js/climb.js
    ('hoarfell-face', 'hoarfell-summit', ['THE STAIRCASE', 'THE ICEFALL', 'THE HOARSPIRE'], 'climb'),
    ('hoarfell-summit', 'hoarfell-piste', ['START GATE'], 'ski'),             # js/ski.js
    ('hoarfell-piste', 'hoarfell-park', ['THE PARK'], 'door', 37, 102),
    ('hoarfell-summit', 'hoarfell-ridge', ['THE LAST RIDGE'], 'climb', 24, 9),   # js/expedition.js
    ('hoarfell-ridge', 'hoarfell-icestep', ['THE ICE STEP'], 'climb'),
    ('hoarfell-ridge', 'hoarfell-hollow', ['THE ICE DOOR'], 'door'),
    ('verdance-village', 'verdance-east', ['STATION ROAD'], 'door', 45, 11),   # js/village.js: Brambleford's street runs on east
    ('verdance-east', 'verdance-downs', ['THE DOWNS'], 'door', 18, 31),        # js/village.js: over the mended bridge
    ('verdance-downs', 'verdance-market', ['THE LANE TO THISTLECOMBE'], 'door', 55, 20),   # js/makers.js: the lanes
    ('verdance-downs', 'verdance-hill', ['THE LANE UP TO VINEHALLOW'], 'door', 51, 0),
    ('verdance-downs', 'verdance-mill', ['THE LANE TO THE MILL'], 'door', 7, 39),
    ('verdance-east', 'verdance-market', ['BRAMBLEFORD HALT'], 'train', 32, 11),   # js/makers.js: the branch line
    ('verdance-market', 'verdance-east', ['THISTLECOMBE STATION'], 'train', 40, 11),
    ('verdance-market', 'verdance-hill', ['THE FERRY'], 'ferry', 12, 27),        # js/makers.js: the ferry on the river
    ('verdance-market', 'verdance-mill', ['THE FERRY'], 'ferry', 12, 27),
    ('verdance-hill', 'verdance-market', ['VINEHALLOW LANDING'], 'ferry', 5, 34),
    ('verdance-hill', 'verdance-mill', ['VINEHALLOW LANDING'], 'ferry', 5, 34),
    ('verdance-mill', 'verdance-market', ['THE FERRY'], 'ferry', 6, 21),
    ('verdance-mill', 'verdance-hill', ['THE FERRY'], 'ferry', 6, 21),
]
# Arcadia's lifts, the Loop and the air cabs (assets/arcadia-lifts.json, js/transit.js): every stop leads to every
# other stop on the same shaft, ring or rank
LIFTS = json.load(open(os.path.join(ROOT, 'arcadia-lifts.json')))


def transit_exits(wid, w):
    out = []

    def at(kind, key, val):
        hit = [i for i in w.get('interactions', []) if i.get('type') == kind and all(i.get(k) == v for k, v in zip(key, val))]
        return hit[0] if hit else None
    for sid, sh in LIFTS.get('shafts', {}).items():
        for a in sh.get('lobbies', []):
            if a['world'] != wid:
                continue
            it = at('express_lift', ('shaft', 'lobby'), (sid, a['id']))
            for b in sh['lobbies']:
                if b is not a and b['world'] in W and b['world'] != wid:
                    out.append((b['world'], it, sh['name'], 'lift'))
    for kind, key, group, name in (('loop_station', 'station', LIFTS.get('loop', {}).get('stations', []), 'THE LOOP'),
                                   ('air_cab', 'pad', LIFTS.get('cabs', {}).get('pads', []), 'AIR CAB')):
        for a in group:
            if a['world'] != wid:
                continue
            it = at(kind, (key,), (a['id'],))
            for b in group:
                if b is not a and b['world'] in W and b['world'] != wid:
                    out.append((b['world'], it, name, 'loop' if kind == 'loop_station' else 'cab'))
    return out


# mine floors are one place on the map (the same three caves, twenty floors)
MERGE = {'lumar-rose-mine-b': 'lumar-rose-mine-a', 'lumar-rose-mine-c': 'lumar-rose-mine-a'}
NAMES = {'lumar-rose-mine-a': 'The Mine Floors', 'lumar': "Diggen's Point Harbour"}


def system_of(wid):
    for sid, _, _, rx in SYSTEMS:
        if re.search(rx, wid):
            return sid
    return None


def isle_of(wid):
    if wid in ISLES:
        return wid
    if wid in INSIDE:
        return INSIDE[wid]
    best = None
    for i in ISLES:
        if wid.startswith(i + '-') and (best is None or len(i) > len(best)):
            best = i
    return best


def exit_of(it):
    t = it.get('type')
    if t == 'enter_world':
        return it.get('target'), 'door'
    if t == 'leave_world':
        return it.get('leaveTo'), 'door'
    if t == 'password_gate':
        return it.get('targetWorld'), 'gate'
    return None, None


out = {'systems': [{'id': s, 'name': n, 'root': r} for s, n, r, _ in SYSTEMS], 'isles': ISLES, 'worlds': {}}
for wid in sorted(W):
    if wid in MERGE:
        continue
    w = W[wid]
    sid = system_of(wid)
    if not sid:
        continue
    exits, seen = [], set()
    for it in w.get('interactions', []):
        to, kind = exit_of(it)
        to = MERGE.get(to, to)
        if not to or to.startswith('/') or to not in W or to == wid:
            continue
        key = (to, it.get('label'))
        if key in seen:
            continue
        seen.add(key)
        exits.append({'to': to, 'label': it.get('label') or '', 'x': it['x'], 'y': it['y'], 'kind': kind})
    for ex in EXTRA:
        a, b, labels, kind = ex[:4]
        if a != wid or b not in W:
            continue
        for label in labels:
            if (b, label) in seen:
                continue
            seen.add((b, label))
            e = {'to': MERGE.get(b, b), 'label': label, 'kind': kind}
            at = [i for i in w.get('interactions', []) if i.get('label') == label]
            if at:
                e['x'], e['y'] = at[0]['x'], at[0]['y']
            elif len(ex) > 4:
                e['x'], e['y'] = ex[4], ex[5]
            exits.append(e)
    for to, it, name, kind in transit_exits(wid, w):
        label = it.get('label') if it else name
        if (to, label) in seen:
            continue
        seen.add((to, label))
        e = {'to': to, 'label': label, 'kind': kind}
        if it:
            e['x'], e['y'] = it['x'], it['y']
        exits.append(e)
    rec = {'name': NAMES.get(wid, w.get('name') or wid), 'sys': sid, 'w': w.get('width'), 'h': w.get('height'), 'exits': exits}
    if sid == 'lumar':
        rec['isle'] = isle_of(wid)
    out['worlds'][wid] = rec

path = os.path.join(ROOT, 'atlas.json')
with open(path, 'w') as f:
    json.dump(out, f, separators=(',', ':'), ensure_ascii=False)
    f.write('\n')
print('wrote', path, len(out['worlds']), 'places')
