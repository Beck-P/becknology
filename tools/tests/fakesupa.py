"""A stand-in for Supabase on 127.0.0.1:8767, for testing multiplayer locally: a few tables (PostgREST-ish ops over
POST /db) and Realtime broadcast + presence (SSE stream per client, POST to join/track/send)."""
import http.server, json, queue, socketserver, threading, uuid, time

LOCK = threading.Lock()
TABLES = {
    'pilots': [
        {'id': '11111111-1111-1111-1111-111111111111', 'name': 'BECK', 'suit_color': 'gold'},
        {'id': '22222222-2222-2222-2222-222222222222', 'name': 'ALYSSA', 'suit_color': 'cyan'},
    ],
    'pilot_saves': [], 'pilot_mail': [], 'pilot_inventory': [],
}
MISSING = set()          # tables to pretend don't exist (POST /admin {missing: [...]})
SEQ = {'pilot_mail': 0}
CLIENTS = {}             # cid -> queue
CHANNELS = {}            # name -> {cid: {'key': k, 'meta': m or None}}


def match(row, filters):
    for col, op, val in filters:
        v = row.get(col)
        if op == 'eq' and v != val: return False
        if op == 'is' and v is not val and not (val is None and v is None): return False
        if op == 'in' and v not in val: return False
    return True


def db(q):
    t, op = q['table'], q['op']
    if t in MISSING or t not in TABLES:
        return {'data': None, 'error': {'message': 'relation "%s" does not exist' % t, 'code': '42P01'}}
    rows = TABLES[t]
    if op == 'select':
        out = [dict(r) for r in rows if match(r, q.get('filters', []))]
        if q.get('order'):
            col, asc = q['order']
            out.sort(key=lambda r: (r.get(col) is None, r.get(col)), reverse=not asc)
        if q.get('limit'): out = out[:q['limit']]
    elif op == 'insert':
        new = q['row'] if isinstance(q['row'], list) else [q['row']]
        out = []
        for r in new:
            r = dict(r)
            if t == 'pilot_mail':
                SEQ['pilot_mail'] += 1; r.setdefault('id', SEQ['pilot_mail']); r.setdefault('created_at', time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()))
                r.setdefault('opened_at', None); r.setdefault('items', []); r.setdefault('coins', 0)
            if t == 'pilots': r.setdefault('id', str(uuid.uuid4()))
            rows.append(r); out.append(dict(r))
    elif op == 'upsert':
        key = q.get('onConflict') or 'id'
        new = q['row'] if isinstance(q['row'], list) else [q['row']]
        out = []
        for r in new:
            hit = next((x for x in rows if x.get(key) == r.get(key)), None)
            if hit: hit.update(r); out.append(dict(hit))
            else: rows.append(dict(r)); out.append(dict(r))
    elif op == 'update':
        out = []
        for r in rows:
            if match(r, q.get('filters', [])): r.update(q['patch']); out.append(dict(r))
    elif op == 'delete':
        out = [r for r in rows if match(r, q.get('filters', []))]
        TABLES[t] = [r for r in rows if not match(r, q.get('filters', []))]
    else:
        return {'data': None, 'error': {'message': 'bad op'}}
    single = q.get('single')
    if single == 'maybe': return {'data': out[0] if out else None, 'error': None}
    if single == 'one': return {'data': out[0], 'error': None} if out else {'data': None, 'error': {'message': 'no rows'}}
    return {'data': out, 'error': None}


def push(mid, msg):
    qq = CLIENTS.get(mid.split('/')[0])
    if qq: qq.put(dict(msg, mid=mid))


def presence(name, joins=None, leaves=None):
    ch = CHANNELS.get(name, {})
    state = {}
    for cid, m in ch.items():
        if m['meta'] is not None:
            state.setdefault(m['key'], []).append(dict(m['meta'], presence_ref=cid))
    for cid in list(ch):
        push(cid, {'type': 'presence', 'channel': name, 'state': state, 'joins': joins or {}, 'leaves': leaves or {}})


def drop(cid):
    for name, ch in CHANNELS.items():
        for mid in [k for k in ch if k == cid or k.startswith(cid + '/')]:
            m = ch.pop(mid)
            presence(name, leaves={m['key']: [m['meta']]} if m['meta'] else {})
    CLIENTS.pop(cid, None)


class H(http.server.BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def log_message(self, *a): pass
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.send_header('Content-Length', '0'); self.end_headers()
    def reply(self, obj):
        b = json.dumps(obj).encode()
        self.send_response(200); self.cors(); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b))); self.end_headers()
        self.wfile.write(b)
    def do_GET(self):
        if self.path.startswith('/rt/stream'):
            cid = self.path.split('cid=')[1].split('&')[0]
            qq = queue.Queue(); CLIENTS[cid] = qq
            self.send_response(200); self.cors()
            self.send_header('Content-Type', 'text/event-stream'); self.send_header('Cache-Control', 'no-cache'); self.end_headers()
            try:
                self.wfile.write(b': hi\n\n'); self.wfile.flush()
                while True:
                    try: msg = qq.get(timeout=10)
                    except queue.Empty: msg = None
                    if msg is None: self.wfile.write(b': ping\n\n')
                    else: self.wfile.write(('data: ' + json.dumps(msg) + '\n\n').encode())
                    self.wfile.flush()
            except Exception:
                pass
            finally:
                with LOCK: drop(cid)
            return
        if self.path.startswith('/dump'):
            with LOCK: return self.reply({'tables': TABLES, 'channels': {k: {c: v for c, v in ch.items()} for k, ch in CHANNELS.items()}})
        self.send_response(404); self.cors(); self.send_header('Content-Length', '0'); self.end_headers()
    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0)
        body = json.loads(self.rfile.read(n) or b'{}')
        with LOCK:
            if self.path == '/db': return self.reply(db(body))
            if self.path == '/rpc': return self.reply({'data': None, 'error': {'message': 'no rpc in the fake'}})
            if self.path == '/admin':
                if 'missing' in body: MISSING.clear(); MISSING.update(body['missing'])
                if body.get('reset'):
                    for k in ('pilot_saves', 'pilot_mail', 'pilot_inventory'): TABLES[k] = []
                return self.reply({'ok': True})
            cid, name = body.get('cid'), body.get('channel')
            if self.path == '/rt/join':
                CHANNELS.setdefault(name, {})[cid] = {'key': body.get('key') or cid, 'meta': None}
                presence(name); return self.reply({'ok': True})
            if self.path == '/rt/track':
                ch = CHANNELS.setdefault(name, {})
                m = ch.setdefault(cid, {'key': body.get('key') or cid, 'meta': None})
                fresh = m['meta'] is None
                m['meta'] = body.get('meta') or {}
                presence(name, joins={m['key']: [m['meta']]} if fresh else {}); return self.reply({'ok': True})
            if self.path == '/rt/untrack':
                m = CHANNELS.get(name, {}).get(cid)
                if m: old = m['meta']; m['meta'] = None; presence(name, leaves={m['key']: [old]} if old else {})
                return self.reply({'ok': True})
            if self.path == '/rt/leave':
                m = CHANNELS.get(name, {}).pop(cid, None)
                if m: presence(name, leaves={m['key']: [m['meta']]} if m['meta'] else {})
                return self.reply({'ok': True})
            if self.path == '/rt/send':
                for other in list(CHANNELS.get(name, {})):
                    if other != cid or body.get('self'):
                        push(other, {'type': 'broadcast', 'channel': name, 'event': body.get('event'), 'payload': body.get('payload')})
                return self.reply({'ok': True})
        self.send_response(404); self.cors(); self.send_header('Content-Length', '0'); self.end_headers()


socketserver.ThreadingTCPServer.allow_reuse_address = True
socketserver.ThreadingTCPServer.daemon_threads = True
with socketserver.ThreadingTCPServer(('127.0.0.1', 8767), H) as s: s.serve_forever()
