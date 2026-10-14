/**
 * BridgeTalk — free conversation with the cast, and how each of them feels
 * about you (the server side is api/talk.mjs, Claude Haiku 5.5).
 *
 * Every person has a bond with the pilot: a feeling from -10 (cold) to +10
 * (trusts you), their mood, a handful of things they remember about you and
 * a summary of the rest, when you last talked. It moves with what you say —
 * the model judges each exchange — and it changes what they'll share (their
 * secrets open up as trust grows), whether they'll join your crew, and
 * prices. News of what you've done since you last spoke (quests finished,
 * crew hired, businesses bought) travels to them, and they react.
 *
 * Bonds live in localStorage and, once the pilot_bonds table exists
 * (docs/supabase/2026-10-14-pilot-bonds.sql), follow the pilot account.
 * Without the server (no API key, offline) free talk is hidden and the
 * authored topics work as before.
 */
var BridgeTalk = (function () {
  var KEY = 'bridge_bonds';
  var API = '/api/talk';
  var MAX_MEMORIES = 12;
  var bonds = {};
  var enabled = false;
  var sync = { on: true, pilot: null, timer: null, dirty: {} };

  try { bonds = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { bonds = {}; }

  function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(bonds)); } catch (e) { /* private mode */ } }

  function bond(id) {
    return bonds[id] || (bonds[id] = { feeling: 0, mood: '', memories: [], summary: '', met: false, last: 0, talks: 0, updated: 0 });
  }

  function feelingLabel(f) {
    if (f <= -6) return 'Cold';
    if (f <= -2) return 'Wary';
    if (f < 2) return 'Neutral';
    if (f < 5) return 'Friendly';
    if (f < 8) return 'Warm';
    return 'Trusts you';
  }

  // ---- what the pilot has done and found (for news, story beats and spoiler-safe facts) -------------
  function events() {
    var ev = [];
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.finished) {
      BridgeQuests.finished().forEach(function (q) { ev.push({ key: 'quest:' + q.id, at: q.at }); });
    }
    if (typeof BridgeCrew !== 'undefined') {
      BridgeCrew.list().forEach(function (c) { ev.push({ key: 'crew:' + c.id, at: BridgeCrew.hiredAt(c.id) }); });
    }
    if (typeof BridgeBusiness !== 'undefined') {
      BridgeBusiness.summary().forEach(function (b) { var s = BridgeBusiness.state(b.id); ev.push({ key: 'biz:' + b.id, at: s && s.owned }); });
    }
    return ev.filter(function (e) { return e.at; }).sort(function (a, b) { return a.at - b.at; });
  }

  function context(id) {
    var b = bond(id), ev = events();
    var news = b.met ? ev.filter(function (e) { return e.at > b.last; }) : ev.slice(-3);
    return {
      clues: typeof BridgeQuests !== 'undefined' && BridgeQuests.found ? BridgeQuests.found().slice(-30).map(function (c) { return c.id; }) : [],
      news: news.slice(-8).map(function (e) { return e.key; }),
      flags: ev.map(function (e) { return e.key; }),
      place: typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : ''
    };
  }

  // ---- the server ----------------------------------------------------------------------------------
  function post(payload) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl && setTimeout(function () { ctl.abort(); }, 15000);
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
                        signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (d) { if (timer) clearTimeout(timer); return d; });
  }

  function request(mode, person, say, history) {
    var b = bond(person.id), c = context(person.id);
    return post({
      mode: mode, person: person.id, say: say || '', history: (history || []).slice(-12),
      pilot: typeof BridgeState !== 'undefined' && BridgeState.getPilot && BridgeState.getPilot() ? BridgeState.getPilot().name : '',
      bond: { feeling: b.feeling, mood: b.mood, memories: b.memories, summary: b.summary, met: b.met },
      clues: c.clues, news: c.news, flags: c.flags, place: c.place
    }).then(function (d) {
      if (!d || typeof d.reply !== 'string') return null;
      apply(person.id, d);
      return d;
    });
  }

  function apply(id, d) {
    var b = bond(id);
    b.feeling = Math.max(-10, Math.min(10, b.feeling + (d.feeling || 0)));
    if (d.mood) b.mood = d.mood;
    if (d.remember) b.memories.push(d.remember);
    touch(id);
  }

  function touch(id) {
    bond(id).updated = Date.now();
    saveLocal();
    sync.dirty[id] = true;
    clearTimeout(sync.timer);
    sync.timer = setTimeout(push, 1500);
  }

  // A greeting that remembers you (only once you've met; a first meeting keeps the authored line).
  function greet(person) {
    if (!enabled || !bond(person.id).met) return Promise.resolve(null);
    return request('greet', person, '', []);
  }

  function say(person, text, history) {
    if (!enabled) return Promise.resolve(null);
    return request('talk', person, text, history);
  }

  // The conversation is over: they've met you, and a long memory gets folded into the summary.
  function end(person) {
    var b = bond(person.id);
    b.met = true;
    b.last = Date.now();
    b.talks = (b.talks || 0) + 1;
    touch(person.id);
    if (b.memories.length > MAX_MEMORIES) {
      var old = b.memories.slice(0, b.memories.length - 6);
      if (!enabled) { b.memories = b.memories.slice(-MAX_MEMORIES); touch(person.id); return; }
      post({ mode: 'fold', person: person.id, bond: { summary: b.summary, memories: old } }).then(function (d) {
        if (!d || !d.summary) { b.memories = b.memories.slice(-MAX_MEMORIES); }
        else { b.summary = d.summary; b.memories = b.memories.slice(old.length); }
        touch(person.id);
      });
    }
  }

  // ---- the pilot account (pilot_bonds) ------------------------------------------------------------------
  function db() {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.client ? BridgeProgression.client() : null;
  }

  function pull() {
    var client = db();
    if (!client || !BridgeProgression.getPilot) return;
    BridgeProgression.getPilot().then(function (pilot) {
      if (!pilot) return;
      sync.pilot = pilot.id;
      return client.from('pilot_bonds').select('person_id, bond').eq('pilot_id', pilot.id).then(function (res) {
        if (res.error) { sync.on = false; return; }           // table not there yet: browser only
        (res.data || []).forEach(function (row) {
          var remote = row.bond || {}, local = bonds[row.person_id];
          if (!local || (remote.updated || 0) > (local.updated || 0)) bonds[row.person_id] = remote;
        });
        saveLocal();
        Object.keys(bonds).forEach(function (id) { sync.dirty[id] = true; });
        push();
      });
    }).catch(function () { /* offline */ });
  }

  function push() {
    var client = db();
    if (!sync.on || !client || !sync.pilot) return;
    var ids = Object.keys(sync.dirty);
    if (!ids.length) return;
    sync.dirty = {};
    var rows = ids.map(function (id) { return { pilot_id: sync.pilot, person_id: id, bond: bonds[id], updated_at: new Date().toISOString() }; });
    client.from('pilot_bonds').upsert(rows).then(function (res) { if (res.error) sync.on = false; });
  }

  // ---- start -------------------------------------------------------------------------------------------
  fetch(API, { method: 'GET' }).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { enabled = !!(d && d.enabled); }).catch(function () { enabled = false; });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pull); else pull();

  return {
    enabled: function () { return enabled; },
    bond: bond,
    feeling: function (id) { return bond(id).feeling; },
    feelingLabel: function (id) { return feelingLabel(bond(id).feeling); },
    greet: greet,
    say: say,
    end: end
  };
})();
