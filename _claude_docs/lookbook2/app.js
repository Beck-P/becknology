// Becknology Look Book 2 — the renderer (with versions: a scene can change size and load its passes first): mounts each scene, runs the frame pipeline, applies the finish, drives the controls.
(function () {
  'use strict';
  const LB = window.LB;
  const q = new URLSearchParams(location.search);
  const DEV = q.has('id');
  const state = (LB.state = {
    time: q.has('time') ? +q.get('time') : 18.2,
    season: q.get('season') || 'summer',
    weather: q.get('weather') || 'clear',
    finish: q.get('finish') || 'soft',
    version: q.get('version') || 'model',
    playing: false,
    fixedT: q.has('t') ? +q.get('t') : null,
  });
  const pick = (list, want) => (!list || list.includes(want) ? want : list[0]);

  function makeS(def, now) {
    const season = pick(def.seasons, state.season);
    const weather = pick(def.weathers, state.weather);
    let time = state.time;
    if (def.hours) time = Math.min(def.hours[1], Math.max(def.hours[0], time)); // a scene that only exists in some hours
    const finish = def.finish || state.finish;
    const L = LB.sky(time, season, weather);
    return {
      id: def.id, def, w: def.w, h: def.h, t: now, time, season, weather, finish, L, night: L.night,
      snow: season === 'winter' ? 1 : weather === 'snow' ? 0.5 : 0,
      wet: weather === 'rain' ? 1 : 0,
    };
  }

  function call(panel, name, ...a) {
    const f = panel.def[name];
    if (!f) return undefined;
    try { return f.apply(panel.def, a); } catch (e) {
      if (!panel.err) { panel.err = name + ': ' + e.message; console.error(panel.def.id, name, e); panel.showErr(); }
      return undefined;
    }
  }

  LB.mount = function (host, def) {
    host.classList.add('stage');
    host.style.aspectRatio = def.w + ' / ' + def.h;
    const mk = (cls) => { const c = LB.canvas(def.w, def.h); c.className = 'layer ' + cls; host.appendChild(c); return c; };
    const main = mk('main'), dof = mk('dof'), bloom = mk('bloom');
    const vig = document.createElement('div'); vig.className = 'layer vig'; host.appendChild(vig);
    const tag = document.createElement('div'); tag.className = 'stage-tag'; host.appendChild(tag);
    let mctx = LB.ctx2d(main), dctx = LB.ctx2d(dof), bctx = LB.ctx2d(bloom);
    const ground = LB.canvas(def.w, def.h), objects = LB.canvas(def.w, def.h);
    let gctx = LB.ctx2d(ground), octx = LB.ctx2d(objects);
    let key = '', inited = false, waiting = null, dims = [def.w, def.h];
    const resize = (w, h) => {
      for (const c of [main, dof, bloom, ground, objects]) { c.width = w; c.height = h; }
      mctx = LB.ctx2d(main); dctx = LB.ctx2d(dof); bctx = LB.ctx2d(bloom); gctx = LB.ctx2d(ground); octx = LB.ctx2d(objects);
      def.w = w; def.h = h; dims = [w, h]; key = '';
      host.style.aspectRatio = w + ' / ' + h;
    };
    if (def.click) { host.style.cursor = 'pointer'; host.addEventListener('click', (e) => def.click(e, state, host)); }
    const panel = {
      def, host, visible: true, err: null,
      showErr() { const e = document.createElement('div'); e.className = 'stage-err'; e.textContent = def.id + ' — ' + panel.err; host.appendChild(e); },
      draw(now) {
        if (def.prepare) {
          if (waiting) return;
          const pr = def.prepare(state);
          if (pr) {
            waiting = pr; tag.hidden = false; tag.textContent = 'Loading the render…';
            pr.then(() => { waiting = null; key = ''; panel.draw(state.fixedT != null ? state.fixedT : performance.now() / 1000); if (LB.onReady) LB.onReady(panel); })
              .catch((e) => { waiting = null; panel.err = 'load: ' + e.message; panel.showErr(); });
            return;
          }
        }
        if (def.dims) { const d = def.dims(state); if (d[0] !== dims[0] || d[1] !== dims[1]) resize(d[0], d[1]); }
        const S = makeS(def, now);
        host.dataset.finish = S.finish;
        const notes = [];
        if (def.seasons && !def.seasons.includes(state.season)) notes.push(def.seasonNote || 'Always ' + S.season + ' here');
        if (def.weathers && !def.weathers.includes(state.weather)) notes.push('No ' + state.weather + ' here');
        tag.textContent = notes.join(' · ');
        tag.hidden = !notes.length;
        S.scale = def.scale ? def.scale() : 1;
        if (!inited) { inited = true; call(panel, 'init', S); }
        const k = [S.season, S.weather, Math.round(S.time * 8), S.finish, state.version].join('|');
        if (k !== key) {
          key = k;
          gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.clearRect(0, 0, def.w, def.h);
          octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, def.w, def.h);
          call(panel, 'ground', gctx, S, LB.paint(gctx));
          if (def.shadows) { const sh = LB.shadows(S); call(panel, 'shadows', sh, S); sh.apply(gctx); }
          call(panel, 'objects', octx, S, LB.paint(octx));
        }
        const ctx = mctx, P = LB.paint(ctx);
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, def.w, def.h);
        ctx.drawImage(ground, 0, 0);
        call(panel, 'water', ctx, S, P);
        ctx.drawImage(objects, 0, 0);
        call(panel, 'live', ctx, S, P);
        if (def.clouds !== false) LB.cloudShadows(ctx, S, def.clouds || {});
        if (def.weatherFx !== false) LB.weatherFx(ctx, S, def.weatherFx || {});
        if (def.grade !== false) LB.grade(ctx, S);
        call(panel, 'emissive', ctx, S, P);
        const lights = call(panel, 'lights', S);
        LB.glows(ctx, S, lights, S.finish);
        call(panel, 'after', ctx, S, P);
        if (S.finish !== 'clean') {
          bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalAlpha = 1; bctx.globalCompositeOperation = 'source-over';
          bctx.clearRect(0, 0, def.w, def.h);
          call(panel, 'emissive', bctx, S, LB.paint(bctx));
          LB.glows(bctx, S, lights, 'soft');
          call(panel, 'bloom', bctx, S, LB.paint(bctx));
        }
        if (S.finish === 'hd2d') { dctx.clearRect(0, 0, def.w, def.h); dctx.drawImage(main, 0, 0); }
      },
    };
    return panel;
  };

  // ---------- the loop ----------
  const panels = [];
  LB.panels = panels;
  let last = 0, lastFrame = 0;
  function frame(ms) {
    requestAnimationFrame(frame);
    if (ms - lastFrame < 1000 / 30) return;
    const dt = Math.min(0.1, (ms - (last || ms)) / 1000);
    last = ms; lastFrame = ms;
    if (state.playing) { state.time = (state.time + dt * 0.5) % 24; LB.onTime && LB.onTime(); }
    const now = state.fixedT != null ? state.fixedT : ms / 1000;
    for (const p of panels) if (p.visible) p.draw(now);
  }
  LB.redraw = () => { const now = state.fixedT != null ? state.fixedT : performance.now() / 1000; for (const p of panels) p.draw(now); };

  LB.start = function () {
    LB.scenes.sort((a, b) => (a.order || 0) - (b.order || 0));
    if (DEV) {
      const def = LB.scenes.find((d) => d.id === q.get('id'));
      const host = document.getElementById('dev');
      if (!def) { host.textContent = 'no scene ' + q.get('id') + ' (have: ' + LB.scenes.map((d) => d.id).join(', ') + ')'; window.__ready = true; return; }
      host.style.width = (q.get('width') || def.w * 2) + 'px';
      const p = LB.mount(host, def);
      panels.push(p);
      p.draw(state.fixedT != null ? state.fixedT : 0);
      if (def.prepare) { LB.onReady = () => { window.__ready = true; }; setTimeout(() => { window.__ready = true; }, 60000); } else window.__ready = true;
      window.__err = () => p.err;
      if (state.fixedT == null) requestAnimationFrame(frame);
      return;
    }
    if (LB.buildPage) LB.buildPage(panels);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { for (const e of es) { const p = panels.find((x) => x.host === e.target); if (p) p.visible = e.isIntersecting; } }, { rootMargin: '200px' });
      for (const p of panels) io.observe(p.host);
    }
    requestAnimationFrame(frame);
  };
})();
