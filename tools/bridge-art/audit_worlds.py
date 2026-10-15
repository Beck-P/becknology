"""Audit the Bridge's worlds for things that silently don't work.

  python3 tools/bridge-art/audit_worlds.py

For every world JSON in apps/bridge/assets/worlds: flood-fills the walkable
tiles from the spawn and from every exit that leads in, then reports
interactions nobody can reach (not within a tile of a reachable one, or two
ahead over a counter), exits to worlds that don't exist or onto solid tiles,
and NPC actors standing on walkable tiles (walk-through people). Then checks
that every person (people.json), quest clue (quests.json) and business
(businesses.json) finds its {world, label}. Interactions added at load time
by the JS (the Peddler, the hands on the farm, the Last Ridge's rope, the
Park's gate) are listed in ADDED.
"""
import collections
import glob
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'bridge', 'assets'))
W = {os.path.basename(f)[:-5]: json.load(open(f)) for f in glob.glob(os.path.join(ROOT, 'worlds', '*.json'))}
ADDED = {('*', 'PEDDLER'), ('verdance', 'TAM'), ('verdance', 'ODILE'), ('hoarfell-summit', 'THE LAST RIDGE'), ('hoarfell-piste', 'THE PARK')}
EXTRA_ENTRIES = {'hoarfell-ridge': [(14, 27), (41, 60)]}      # the Ice Step's top-out (js/climb.js), back out of the Hollow


def walk(w, x, y):
    return 0 <= y < w['height'] and 0 <= x < w['width'] and w['collisions'][y][x] == 0


def reach(w, start):
    if not walk(w, *start):
        return set()
    seen, q = {tuple(start)}, collections.deque([tuple(start)])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n not in seen and walk(w, *n):
                seen.add(n)
                q.append(n)
    return seen


def exit_of(it):
    if it['type'] == 'enter_world':
        return it.get('target'), it.get('spawn')
    if it['type'] == 'leave_world':
        return it.get('leaveTo'), it.get('leaveSpawn')
    if it['type'] == 'password_gate':
        return it.get('targetWorld'), None
    return None, None


entries = collections.defaultdict(list)
for wid, w in W.items():
    for it in w.get('interactions', []):
        tgt, spn = exit_of(it)
        if tgt and spn:
            entries[tgt].append(tuple(spn))
for wid, extra in EXTRA_ENTRIES.items():
    entries[wid] += extra

issues = []
for wid, w in sorted(W.items()):
    sp = (w.get('spawns') or {}).get('player')
    if 'collisions' not in w or not sp:
        continue
    R = reach(w, sp)
    if not R:
        issues.append((wid, 'spawn %s is solid' % sp))
        continue
    for e in entries.get(wid, []):
        R |= reach(w, e)
    for it in w.get('interactions', []):
        x, y = it['x'], it['y']
        near = any((x + dx, y + dy) in R for dx in (-1, 0, 1) for dy in (-1, 0, 1))
        over = any((x + dx * 2, y + dy * 2) in R and not walk(w, x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        if not (near or over):
            issues.append((wid, 'unreachable %s %s at %s,%s' % (it['type'], it.get('label'), x, y)))
        tgt, spn = exit_of(it)
        if tgt and not tgt.startswith('/') and tgt not in W:
            issues.append((wid, 'exit %s leads to a missing world %s' % (it.get('label'), tgt)))
        elif tgt in W and spn and not walk(W[tgt], spn[0], spn[1]):
            issues.append((wid, 'exit %s lands on a solid tile %s in %s' % (it.get('label'), spn, tgt)))
    for a in (w.get('scene') or {}).get('actors', []):
        if a.get('pose') != 'sit' and walk(w, a['x'], a['y']):
            issues.append((wid, 'actor %s stands on a walkable tile %s,%s' % (a['sheet'], a['x'], a['y'])))

labels = {wid: set(i.get('label') for i in w.get('interactions', [])) for wid, w in W.items()}


def found(world, label):
    if (world, label) in ADDED or ('*', label) in ADDED:
        return True
    if world.endswith('*'):
        return any(label in labels[k] for k in labels if k.startswith(world[:-1]))
    return label in labels.get(world, ())


def records(name):
    d = json.load(open(os.path.join(ROOT, name)))
    return d.items() if isinstance(d, dict) else [(r.get('id'), r) for r in d]


for pid, p in records('people.json'):
    for at in p.get('at', []):
        if not found(at['world'], at['label']):
            issues.append(('people.json', '%s not found at %s / %s' % (pid, at['world'], at['label'])))
for qid, q in records('quests.json'):
    for c in q.get('clues', []):
        if 'world' in c and not found(c['world'], c.get('label')):
            issues.append(('quests.json', '%s clue not found at %s / %s' % (qid, c['world'], c.get('label'))))
for bid, b in records('businesses.json'):
    if 'world' in b and not found(b['world'], b.get('label')):
        issues.append(('businesses.json', '%s not found at %s / %s' % (bid, b['world'], b.get('label'))))

for i in issues:
    print(*i)
print(len(issues), 'issues;', len(W), 'worlds')
