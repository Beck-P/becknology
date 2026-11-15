"""Put a person back into people.json from e93d7dc (they were taken out while their place was closed), after elf_boatwright."""
import json, subprocess, sys
pid = sys.argv[1]
P = 'apps/bridge/assets/people.json'
old = json.loads(subprocess.check_output(['git', 'show', 'e93d7dc:' + P]))
cur = json.load(open(P))
if pid in cur:
    print('already there'); sys.exit()
out = {}
for k, v in cur.items():
    out[k] = v
    if k == 'elf_boatwright':
        out[pid] = old[pid]
if pid not in out:
    out[pid] = old[pid]
open(P, 'w').write(json.dumps(out, indent=2, ensure_ascii=False) + '\n')
print('restored', pid)
