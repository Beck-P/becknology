/**
 * BridgeState — State machine + localStorage persistence.
 *
 * States: intro → identity → cockpit → starmap → travel → redirect
 *
 * Persists to localStorage:
 *   bridge_pilot   — cached pilot name (skip identity on revisit)
 *   bridge_state   — last state + context (current world, etc.)
 */
var BridgeState = (function () {
  var PILOT_KEY = 'bridge_pilot';
  var STATE_KEY = 'bridge_state';

  var current = 'intro';
  var pilot = null;       // { id, name, suit_color }
  var listeners = [];     // onChange callbacks

  function getState() { return current; }
  function getPilot() { return pilot; }

  function setPilot(data) {
    pilot = data;
    if (data && data.name) {
      localStorage.setItem(PILOT_KEY, data.name);
    }
  }

  function clearPilot() {
    pilot = null;
    localStorage.removeItem(PILOT_KEY);
    localStorage.removeItem(STATE_KEY);
  }

  function getCachedPilotName() {
    return localStorage.getItem(PILOT_KEY);
  }

  function transition(newState, context) {
    var prev = current;
    current = newState;
    if (newState !== 'travel' && newState !== 'redirect') {
      localStorage.setItem(STATE_KEY, JSON.stringify({
        state: newState,
        context: context || null,
        ts: Date.now()
      }));
    }
    for (var i = 0; i < listeners.length; i++) {
      listeners[i](newState, prev, context);
    }
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  function loadSaved() {
    try {
      var raw = localStorage.getItem(STATE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  return {
    getState: getState,
    getPilot: getPilot,
    setPilot: setPilot,
    clearPilot: clearPilot,
    getCachedPilotName: getCachedPilotName,
    transition: transition,
    onChange: onChange,
    loadSaved: loadSaved
  };
})();
