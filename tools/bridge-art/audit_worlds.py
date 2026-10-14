"""Audit every scene world: walkable tiles where the player would be mostly
hidden behind geometry, NPCs hidden or standing on walkable tiles, and
interactions the proximity rules can never select.
usage: python3 tools/bridge-art/audit_worlds.py [world ...]"""
import json, math, os, sys
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'apps', 'bridge', 'assets')
TH = math.radians(45); COT, TAN = 1 / math.tan(TH), math.tan(TH)
DIRS = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}

def depth_of(sid):
    m = json.load(open(f'{ROOT}/scenes/{sid}/scene.json'))
    px = np.asarray(Image.open(f'{ROOT}/scenes/{sid}/depth.png').convert('RGBA')).astype(np.int64)
    q = px[..., 0] * 256 + px[..., 1]
    d = m['depthMin'] + q / 65534 * (m['depthMax'] - m['depthMin'])
    d[q >= 65535] = np.inf
    return m, d

def hidden(m, d, x, foot, half=7, tall=40):
    ox, oy = m['originX'], m['originY']
    cx = round((x + 0.5) * 32); fy = round(foot * 32)
    tot = hid = 0
    for Y in range(fy - tall, fy):
        above = max(0.0, foot - Y / 32)
        cd = -foot * COT - above * TAN
        yy = int(Y + oy)
        if yy < 0 or yy >= d.shape[0]: continue
        for X in range(cx - half, cx + half):
            xx = int(X + ox)
            if xx < 0 or xx >= d.shape[1]: continue
            tot += 1
            if d[yy, xx] < cd - 0.04: hid += 1
    return hid / max(1, tot)

def reach(w):
    C = w['collisions']; H, W = len(C), len(C[0])
    s0 = w.get('spawns') or {}
    s0 = s0.get('player') or s0.get('default') or (list(s0.values())[0] if s0 else None)
    sp = (s0[0], s0[1]) if isinstance(s0, list) else ((s0['x'], s0['y']) if s0 else (7, 8))
    seen = {sp}; q = [sp]
    while q:
        x, y = q.pop()
        for dx, dy in DIRS.values():
            n = (x + dx, y + dy)
            if 0 <= n[0] < W and 0 <= n[1] < H and not C[n[1]][n[0]] and n not in seen:
                seen.add(n); q.append(n)
    return sp, seen

def solid(C, x, y):
    return not (0 <= y < len(C) and 0 <= x < len(C[0])) or C[y][x] != 0

def target(w, px, py, f):
    C = w['collisions']; fx, fy = DIRS[f]
    best, bs = None, 1e9
    for i, it in enumerate(w['interactions']):
        if it['type'] == 'hostile' or it.get('hidden'): continue
        dx, dy = it['x'] - px, it['y'] - py
        d = math.hypot(dx, dy)
        dot = (dx * fx + dy * fy) / d if d else 0
        ok = d <= 1.5
        if ok and abs(dx) == 1 and abs(dy) == 1:
            ok = not solid(C, px + dx, py) or not solid(C, px, py + dy) or not solid(C, it['x'], it['y'])
        if not ok and d <= 2.01 and dot > 0.99: ok = solid(C, px + fx, py + fy)
        if not ok: continue
        s = (0.55 if d == 0 else d) - 0.75 * dot
        if s < bs: bs, best = s, i
    return best

def audit(wid):
    w = json.load(open(f'{ROOT}/worlds/{wid}.json'))
    out = []
    sp, seen = reach(w)
    sc = w.get('scene')
    if sc:
        m, d = depth_of(sc['id'])
        bad = sorted((round(hidden(m, d, x, y + 0.906), 2), x, y) for (x, y) in seen)
        bad = [b for b in bad if b[0] > 0.45]
        if bad: out.append('hidden walk tiles: ' + ' '.join(f'({x},{y}){h}' for h, x, y in bad))
        void = []
        for (x, y) in sorted(seen):     # floor point empty in the render: walking on the backdrop
            yy, xx = int((y + 0.5) * 32 + m['originY']), int((x + 0.5) * 32 + m['originX'])
            if 0 <= yy < d.shape[0] and 0 <= xx < d.shape[1] and not np.isfinite(d[yy, xx]):
                void.append((x, y))
        if void: out.append('walkable over nothing: ' + ' '.join(f'({x},{y})' for x, y in void))
        for a in sc.get('actors', []):
            foot = a['y'] + (0.55 if a.get('pose') == 'sit' else 0.9)
            h = hidden(m, d, a['x'], foot, tall=28 if a.get('pose') == 'sit' else 40)
            flag = []
            if h > 0.35: flag.append(f'{int(h*100)}% hidden')
            if not w['collisions'][a['y']][a['x']]: flag.append('walkable')
            if flag: out.append(f"actor {a['sheet']} ({a['x']},{a['y']}): " + ', '.join(flag))
    picked = set()
    for (x, y) in seen:
        for f in DIRS:
            t = target(w, x, y, f)
            if t is not None: picked.add(t)
    for i, it in enumerate(w['interactions']):
        if it['type'] == 'hostile': continue
        if i not in picked:
            out.append(f"never selectable: {it['label']} ({it['x']},{it['y']}) {it['type']}")
    print(f'== {wid} spawn {sp} reach {len(seen)}')
    for o in out: print('   ' + o)

ids = sys.argv[1:] or sorted(f[:-5] for f in os.listdir(f'{ROOT}/worlds') if f.endswith('.json'))
for wid in ids: audit(wid)
