#!/usr/bin/env python3
"""Keeps the Bridge's faces on the one system (apps/bridge/CLAUDE.md, *Portraits*): every portrait under
apps/bridge/assets/portraits is drawn by tools/bridge-art/portraits.py from characters.py, and stamped with what it was
drawn from. Run by Claude Code (.claude/settings.json):

  pre   before a Bash command: a `git commit` or `git push` with portraits missing or out of date is stopped, with
        what to run (exit 2 — Claude Code shows it the message)
  post  after an edit to tools/bridge-art/characters.py: says which portraits that edit put out of date

Anything that goes wrong in here (no Pillow, a file it can't read) lets the command through: it guards, never breaks.
"""
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FIX = ('python3 tools/bridge-art/portraits.py stale --look /tmp/faces.png  (draws just those; look at the sheet), '
       'then git add apps/bridge/assets/portraits')


def stale():
    sys.path.insert(0, os.path.join(ROOT, 'tools', 'bridge-art'))
    import portraits as P
    T = P.tables()
    P.C.fixed = T['FIXED']
    missing, old, _ = P.audit(T)
    return [os.path.relpath(p, os.path.join(ROOT, 'apps', 'bridge', 'assets', 'portraits'))[:-4] for p, _ in missing + old]


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'pre'
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0
    inp = data.get('tool_input') or {}
    if mode == 'pre':
        if not re.search(r'\bgit\b[^|;&\n]*\b(commit|push)\b', str(inp.get('command') or '')):
            return 0
    elif not str(inp.get('file_path') or '').replace('\\', '/').endswith('tools/bridge-art/characters.py'):
        return 0
    try:
        names = stale()
    except Exception:
        return 0
    if not names:
        return 0
    shown = ', '.join(names[:8]) + (' and %d more' % (len(names) - 8) if len(names) > 8 else '')
    if mode == 'pre':
        sys.stderr.write('Stopped: %d talk-card portrait(s) missing or out of date (%s). Every face in the Bridge is drawn by '
                         'tools/bridge-art/portraits.py from characters.py — never the old Blender pass or by hand. Run: %s; '
                         'then commit again.\n' % (len(names), shown, FIX))
    else:
        sys.stderr.write('That edit to characters.py leaves %d portrait(s) to draw (%s): %s.\n' % (len(names), shown, FIX))
    return 2


if __name__ == '__main__':
    sys.exit(main())
