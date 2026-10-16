/**
 * BridgeCloud — your game saved to your pilot, so it follows you to any device (and back from a browser that's
 * cleared its storage). Supabase table `pilot_saves` (docs/supabase/2026-10-16-multiplayer.sql): one row per pilot,
 * `data` holding every `bridge_*` localStorage key as it stands (the journal, quests, fish, fleet, farm, homes, the
 * holm... everything but the few in SKIP), `rev` counting saves.
 *
 * - When a pilot signs in (BridgeState.setPilot): their row is fetched. If it's newer than what this device last
 *   synced (another device saved since), it's written into localStorage and the page reloads once, so every module
 *   starts from it. Otherwise this device's state is pushed.
 * - The browser remembers whose game it holds (`bridge_owner`). Signing in as someone else on the same browser puts
 *   the last pilot's game away (pushed to their row if it had changes) and brings yours: two people can share a
 *   laptop without sharing a farm.
 * - Every ten seconds, and when the tab is hidden, a changed game is pushed.
 * - No table yet (the SQL not run), or offline: nothing happens, the game stays in this browser as before.
 *
 *   BridgeCloud.peek(pilotId) → Promise of another pilot's saved data ({key: string}), for visiting their places
 *   BridgeCloud.write(pilotId, key, value) → write one key of another pilot's save (a partner's farm, as you tend it)
 *   BridgeCloud.ready() / .enabled() / .flush()
 */
var BridgeCloud = (function () {
  var META = 'bridge_cloud', OWNER = 'bridge_owner', INV = 'bridge.inventory.v2';
  // device things, not the game: who's signed in, sound, this tab's screen state, the sync's own bookkeeping.
  // (The hotbar has its own row, pilot_inventory, and syncs itself.)
  var SKIP = { bridge_pilot: 1, bridge_audio: 1, bridge_cloud: 1, bridge_owner: 1, bridge_state: 1, bridge_cloud_backup: 1 };
  var pilot = null, on = false, started = null, lastJson = null, timer = 0, busy = false, readyCbs = [], isReady = false;

  function client() { return typeof BridgeDB !== 'undefined' && BridgeDB.client ? BridgeDB.client() : null; }
  function meta() { try { return JSON.parse(localStorage.getItem(META) || '{}') || {}; } catch (e) { return {}; } }
  function setMeta(m) { try { localStorage.setItem(META, JSON.stringify(m)); } catch (e) { /* private mode */ } }
  function gameKey(k) { return k && k.indexOf('bridge_') === 0 && !SKIP[k]; }
  function keys() {
    var out = [];
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (gameKey(k)) out.push(k); }
    return out.sort();
  }
  // the raw browser storage: while you visit a partner's place js/partner.js shows its modules hers, never your save
  function rget(k) { return window.__lsGet ? window.__lsGet(k) : localStorage.getItem(k); }
  function rset(k, v) { return window.__lsSet ? window.__lsSet(k, v) : localStorage.setItem(k, v); }
  function snapshot() { var d = {}; keys().forEach(function (k) { d[k] = rget(k); }); return d; }
  function apply(data) {
    try { localStorage.setItem('bridge_cloud_backup', JSON.stringify({ at: Date.now(), data: snapshot() })); } catch (e) { /* too big: so be it */ }
    keys().forEach(function (k) { if (!data || !(k in data)) localStorage.removeItem(k); });
    Object.keys(data || {}).forEach(function (k) { if (gameKey(k) && typeof data[k] === 'string') { try { rset(k, data[k]); } catch (e) { /* full */ } } });
  }
  function device() {
    var d = localStorage.getItem('bridge_device');
    if (!d) { d = Math.random().toString(36).slice(2, 10); try { localStorage.setItem('bridge_device', d); } catch (e) { /* */ } }
    return d;
  }
  SKIP.bridge_device = 1;

  function fetchRow(id) {
    var c = client();
    if (!c) return Promise.resolve(undefined);
    return c.from('pilot_saves').select('data, rev, updated_at').eq('pilot_id', id).maybeSingle()
      .then(function (r) { if (r.error) { console.warn('[cloud] no pilot_saves (run docs/supabase/2026-10-16-multiplayer.sql):', r.error.message || r.error); return undefined; } return r.data || null; },
            function (e) { console.warn('[cloud] offline:', e); return undefined; });
  }
  function upsert(id, data, rev) {
    var c = client();
    if (!c) return Promise.resolve(false);
    return c.from('pilot_saves').upsert({ pilot_id: id, data: data, rev: rev, device: device(), updated_at: new Date().toISOString() }, { onConflict: 'pilot_id' })
      .then(function (r) { if (r.error) { console.warn('[cloud] save failed:', r.error.message || r.error); return false; } return true; }, function () { return false; });
  }

  function reload() {
    var last = +(sessionStorage.getItem('bridge_cloud_reload') || 0);
    if (Date.now() - last < 30000) { done(); tick(); return; }        // never loop: once is enough
    try { sessionStorage.setItem('bridge_cloud_reload', String(Date.now())); } catch (e) { /* */ }
    location.reload();
  }
  function done() { isReady = true; var cbs = readyCbs; readyCbs = []; cbs.forEach(function (f) { try { f(); } catch (e) { /* */ } }); }

  /** A pilot signed in: bring their game here (or this browser's up to the cloud). */
  function start(p) {
    if (!p || !p.id || started === p.id) return;
    started = p.id; pilot = p; on = false;
    var owner = localStorage.getItem(OWNER), m = meta();
    fetchRow(p.id).then(function (row) {
      if (row === undefined) { done(); return; }                      // no cloud: as before
      on = true;
      if (owner && owner !== p.id) {                                   // this browser holds someone else's game
        var theirs = snapshot(), mine = row;
        return fetchRow(owner).then(function (orow) {
          // their changes since the last save go up first (unless they've saved from somewhere else since)
          var keep = (!orow || (orow.rev || 0) <= (m.rev || 0)) && JSON.stringify(theirs) !== JSON.stringify(orow ? orow.data : null);
          return keep ? upsert(owner, theirs, (m.rev || 0) + 1) : true;
        }).then(function () {
          apply(mine ? mine.data : {});
          localStorage.removeItem(INV);                                  // their hotbar too: yours comes from your row
          localStorage.removeItem('bridge_world_pos');
          localStorage.setItem(OWNER, p.id);
          setMeta({ rev: mine ? mine.rev : 0, dirty: 0 });
          reload();
        });
      }
      localStorage.setItem(OWNER, p.id);
      if (row && (row.rev || 0) > (m.rev || 0)) {                       // saved from another device since this one synced
        var localNewer = m.dirty && m.dirty > Date.parse(row.updated_at);
        // this device's first sync, with progress of its own: the bigger game wins (the other's kept in bridge_cloud_backup)
        if (m.rev == null && keys().length) localNewer = JSON.stringify(snapshot()).length > JSON.stringify(row.data || {}).length;
        if (!localNewer) { apply(row.data); setMeta({ rev: row.rev, dirty: 0 }); reload(); return; }
      }
      lastJson = null;
      done();
      tick();
    });
  }

  // ---- saving -------------------------------------------------------------------------------------------------------
  function tick() {
    clearTimeout(timer);
    timer = setTimeout(tick, 10000);
    flush();
  }
  function flush() {
    if (!on || !pilot || busy) return Promise.resolve(false);
    var data = snapshot(), json = JSON.stringify(data);
    if (json === lastJson) return Promise.resolve(false);
    var m = meta();
    m.dirty = m.dirty || Date.now(); setMeta(m);                          // changed here, not yet in the cloud
    busy = true;
    var rev = (m.rev || 0) + 1;
    return upsert(pilot.id, data, rev).then(function (ok) {
      busy = false;
      if (ok) { lastJson = json; setMeta({ rev: rev, dirty: 0 }); }
      return ok;
    });
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });

  // ---- other pilots' saves: visiting a partner's places (js/multi.js) ------------------------------------------------
  var peeks = {};
  function peek(id, fresh) {
    if (!fresh && peeks[id] && Date.now() - peeks[id].at < 15000) return Promise.resolve(peeks[id].data);
    return fetchRow(id).then(function (row) { var d = row ? row.data || {} : null; peeks[id] = { at: Date.now(), data: d, rev: row ? row.rev : 0 }; return d; });
  }
  /** Change one key of another pilot's save (their farm, as you water it): read, set, write back. */
  function write(id, key, value) {
    return fetchRow(id).then(function (row) {
      if (row === undefined) return false;
      var data = (row && row.data) || {};
      data[key] = value;
      peeks[id] = { at: Date.now(), data: data, rev: (row ? row.rev : 0) + 1 };
      return upsert(id, data, (row ? row.rev : 0) + 1);
    });
  }

  // sign-in: every way in goes through BridgeState.setPilot
  if (typeof BridgeState !== 'undefined') {
    var set = BridgeState.setPilot;
    BridgeState.setPilot = function (data) { set(data); if (data && data.id) start(data); };
  }

  return { start: start, flush: flush, peek: peek, write: write, enabled: function () { return on; },
           ready: function (f) { if (isReady) f(); else readyCbs.push(f); }, _snapshot: snapshot };
})();
