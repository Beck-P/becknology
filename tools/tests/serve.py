"""Local server for the repo with vercel.json's rewrites (port 8766, or the first argument)."""
import http.server, json, os, re, socketserver, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
rules = []
for r in json.load(open(os.path.join(ROOT, 'vercel.json'))).get('rewrites', []):
    src = '^' + re.sub(r'\(\.\*\)', '(.*)', r['source']) + '$'
    rules.append((re.compile(src), re.sub(r'\$(\d)', r'\\\1', r['destination'])))
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
    def translate_path(self, path):
        p = path.split('?', 1)[0].split('#', 1)[0]
        if p == '/runouts' or p.startswith('/runouts/'):            # production copies the built app here (build.sh)
            q = p[len('/runouts'):].lstrip('/') or 'index.html'
            return super().translate_path('/apps/runouts/dist/' + q)
        for rx, dest in rules:
            m = rx.match(p)
            if m:
                p = rx.sub(dest, p); break
        return super().translate_path(p)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
socketserver.ThreadingTCPServer.allow_reuse_address = True
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), H) as s: s.serve_forever()
