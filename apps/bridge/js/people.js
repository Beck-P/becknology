/**
 * BridgePeople — the cast: who's who across the worlds (assets/people.json).
 *
 * A person is matched to an interaction by {world, label} and turns its
 * one-line dialog into a conversation: a greeting (a different one once
 * you've met), then topics to ask about — who they are, their place, what
 * they've heard — which often point at quests. Who you've met and what
 * you've asked is remembered. The same records (name, role, backstory in
 * the answers) are what an AI conversation layer would be seeded from.
 */
var BridgePeople = (function () {
  var KEY = 'bridge_people';
  var cast = null, memory = {};

  function load() {
    try { memory = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { memory = {}; }
    return fetch('/bridge/assets/people.json?v=' + Date.now()).then(function (r) { return r.json(); })
      .then(function (d) { cast = d; }).catch(function () { cast = {}; });
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch (e) { /* private mode */ }
  }

  function find(worldId, label) {
    if (!cast) return null;
    for (var id in cast) {
      var p = cast[id];
      for (var i = 0; i < p.at.length; i++) {
        if (p.at[i].world === worldId && p.at[i].label === label) { p.id = id; return p; }
      }
    }
    return null;
  }

  function met(id) { return !!(memory[id] && memory[id].met); }
  function meet(id) { (memory[id] = memory[id] || { asked: {} }).met = Date.now(); save(); }
  function asked(id, q) { return !!(memory[id] && memory[id].asked && memory[id].asked[q]); }
  function ask(id, q) { var m = memory[id] = memory[id] || { asked: {} }; m.asked = m.asked || {}; m.asked[q] = Date.now(); save(); }

  load();
  return { find: find, met: met, meet: meet, asked: asked, ask: ask, all: function () { return cast || {}; } };
})();
