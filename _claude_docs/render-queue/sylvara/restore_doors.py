"""Put back, into the open worlds' JSON, the ways into a place that were taken out while it was closed (from e93d7dc).
python3 restore_doors.py <target-world-id>   (run from the repo root)"""
import json, subprocess, sys
tgt = sys.argv[1]
for w in ('sylvara-roots', 'sylvara-crown', 'sylvara-river', 'sylvara-boughs', 'sylvara-tavern', 'sylvara-falls', 'sylvara-fallcave', 'sylvara-lake', 'sylvara-deepwood'):
    path = 'apps/bridge/assets/worlds/%s.json' % w
    try:
        cur = json.load(open(path))
    except FileNotFoundError:
        continue
    try:
        old = json.loads(subprocess.check_output(['git', 'show', 'e93d7dc:' + path], stderr=subprocess.DEVNULL))
    except subprocess.CalledProcessError:
        continue
    have = {(i.get('x'), i.get('y'), i.get('target')) for i in cur.get('interactions', [])}
    add = [i for i in old.get('interactions', []) if i.get('target') == tgt and (i.get('x'), i.get('y'), tgt) not in have]
    if not add:
        continue
    for i in add:
        if cur['collisions'][i['y']][i['x']] != 0:
            print('  !! solid door cell', w, i['x'], i['y'])
    cur['interactions'] += add
    open(path, 'w').write(json.dumps(cur, indent=2) + '\n')
    print(w, '+', [(i['label'], i['x'], i['y']) for i in add])
