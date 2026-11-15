// Stockfish 19 (the lite, single-threaded WASM build in ../engine) in a worker: one search at a time,
// answers in White's point of view.
//
//   const e = new Engine();  await e.load();            // false if it couldn't start
//   const r = await e.analyze(fen, { kind, multipv, depth, movetime, onInfo });
//   r = { lines: [{ cp, mate, depth, pv: ['e2e4', …] }, …], best: 'e2e4', depth, stopped } | null
//
// Three kinds of search share a worker:
//   'live'  — the position on the board, deepening while you look at it. Only the newest matters: a new
//             one drops any still waiting and stops the one running (which answers with what it had).
//   'tool'  — something the coach asked for. Goes ahead of any live search and stops a running one.
//   'batch' — the pass over a whole game, each in turn, never interrupted.
// `null` comes back for a search that was dropped before it ran, or when the engine isn't there.

const ENGINE_URL = new URL('../engine/stockfish-19-lite-single.js', import.meta.url).href;
export const ENGINE_NAME = 'Stockfish 19';

const MATE_CP = 100000;   // a mate, as centipawns, for anything that needs one number (never shown)

export class Engine {
  constructor() {
    this.worker = null;
    this.state = 'idle';            // idle | loading | ready | failed
    this.loading = null;
    this.current = null;
    this.queue = [];
    this.multipv = 1;
  }

  load() {
    if (this.loading) return this.loading;
    this.loading = new Promise((resolve) => {
      let w;
      try { w = new Worker(ENGINE_URL); } catch { this.state = 'failed'; resolve(false); return; }
      this.worker = w;
      this.state = 'loading';
      const giveUp = setTimeout(() => this.broke(resolve), 30000);
      w.onerror = () => { clearTimeout(giveUp); this.broke(resolve); };
      w.onmessage = (e) => {
        const line = typeof e.data === 'string' ? e.data : '';
        if (this.state !== 'loading') { this.heard(line); return; }
        if (line === 'uciok') w.postMessage('isready');
        else if (line === 'readyok') {
          clearTimeout(giveUp);
          this.state = 'ready';
          resolve(true);
          this.pump();
        }
      };
      w.postMessage('uci');
    });
    return this.loading;
  }

  // the worker died or never started: everyone waiting gets no answer
  broke(resolve) {
    this.state = 'failed';
    try { if (this.worker) this.worker.terminate(); } catch { /* already gone */ }
    this.worker = null;
    const waiting = this.queue.concat(this.current ? [this.current] : []);
    this.queue = [];
    this.current = null;
    waiting.forEach((j) => { clearTimeout(j.timer); j.resolve(null); });
    if (resolve) resolve(false);
  }

  analyze(fen, { kind = 'live', multipv = 1, depth = 16, movetime = 0, onInfo = null } = {}) {
    if (this.state === 'failed') return Promise.resolve(null);
    return new Promise((resolve) => {
      const job = { fen, kind, multipv, depth, movetime, onInfo, resolve, lines: [], white: fen.split(' ')[1] !== 'b', stopped: false };
      if (kind === 'live') {
        this.queue = this.queue.filter((j) => (j.kind === 'live' ? (j.resolve(null), false) : true));
        this.queue.push(job);
      } else if (kind === 'tool') {
        const at = this.queue.findIndex((j) => j.kind === 'live');
        if (at < 0) this.queue.push(job); else this.queue.splice(at, 0, job);
      } else {
        this.queue.push(job);
      }
      if (this.current && this.current.kind === 'live' && kind !== 'batch') this.halt();
      this.load().then(() => this.pump());
    });
  }

  // drop every search of a kind: the waiting ones unanswered, the running one with what it has
  cancel(kind) {
    this.queue = this.queue.filter((j) => (j.kind === kind ? (j.resolve(null), false) : true));
    if (this.current && this.current.kind === kind) this.halt();
  }

  halt() {
    const job = this.current;
    if (!job || job.stopped || !this.worker) return;
    job.stopped = true;
    this.worker.postMessage('stop');
  }

  pump() {
    if (this.state !== 'ready' || this.current) return;
    const job = this.queue.shift();
    if (!job) return;
    this.current = job;
    const w = this.worker;
    if (job.multipv !== this.multipv) {
      w.postMessage(`setoption name MultiPV value ${job.multipv}`);
      this.multipv = job.multipv;
    }
    w.postMessage(`position fen ${job.fen}`);
    w.postMessage(`go depth ${job.depth}${job.movetime ? ` movetime ${job.movetime}` : ''}`);
    // no answer long after it was due: the worker is stuck, and a stuck worker can't be trusted with
    // the next position either. Everyone waiting goes unanswered; the next search starts a new worker.
    job.timer = setTimeout(() => { if (this.current === job) this.dispose(); }, (job.movetime || 30000) + 20000);
  }

  heard(line) {
    const job = this.current;
    if (!job) return;
    if (line.startsWith('info ') && line.includes(' pv ') && line.includes(' score ') && !line.includes('bound')) {
      const n = (re) => { const m = line.match(re); return m ? parseInt(m[1], 10) : null; };
      const depth = n(/ depth (\d+)/) || 0;
      const idx = (n(/ multipv (\d+)/) || 1) - 1;
      const cp = n(/ score cp (-?\d+)/);
      const mate = n(/ score mate (-?\d+)/);
      const sign = job.white ? 1 : -1;
      job.lines[idx] = {
        depth,
        mate: mate === null ? null : sign * mate,
        cp: mate === null ? sign * cp : sign * Math.sign(mate) * (MATE_CP - Math.abs(mate) * 100),
        pv: line.slice(line.indexOf(' pv ') + 4).trim().split(/\s+/),
      };
      if (job.onInfo && idx === 0) job.onInfo(this.result(job, null));
    } else if (line.startsWith('bestmove')) {
      clearTimeout(job.timer);
      this.current = null;
      const best = line.split(/\s+/)[1];
      job.resolve(this.result(job, best && best !== '(none)' ? best : null));
      this.pump();
    }
  }

  result(job, best) {
    // a line from a shallower pass than the first is left over from before the search went deeper
    const lines = job.lines.filter(Boolean);
    const depth = lines.length ? lines[0].depth : 0;
    return { fen: job.fen, lines: lines.filter((l, i) => i === 0 || l.depth >= depth - 1), best: best || (lines[0] && lines[0].pv[0]) || null, depth, stopped: job.stopped };
  }

  dispose() {
    this.broke();
    this.state = 'idle';
    this.loading = null;
  }
}
