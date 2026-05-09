/**
 * BridgeStatsPanel — read-only pilot stats overlay.
 *
 * Opens when the player presses E on the Bridge's STATS CONSOLE.
 * Shows current coin balance, owned trophies (with sprites), worlds visited,
 * decor purchased — basically a "pilot dossier" view.
 */
var BridgeStatsPanel = (function () {

  // Trophy definitions — must match what quarters.js renders on shelves.
  var TROPHIES = [
    { key: 'first_light',     name: 'First Light',     desc: 'First game played anywhere.' },
    { key: 'cabinet_crusher', name: 'Cabinet Crusher', desc: 'Played all 5 arcade cabinets.' },
    { key: 'wayfarer',        name: 'Wayfarer',        desc: 'Visited all 4 hyperspace destinations.' },
    { key: 'settled_in',      name: 'Settled In',      desc: 'Bought your first piece of decor.' },
    { key: 'bookworm',        name: 'Bookworm',        desc: 'Completed a chess opening.' }
  ];

  var overlayEl = null;
  var open = false;

  function show() {
    if (open) return;
    open = true;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();

    overlayEl = document.createElement('div');
    overlayEl.id = 'stats-overlay';
    overlayEl.style.cssText =
      'position:fixed;inset:0;z-index:200;' +
      'background:rgba(4,8,14,0.78);' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-family:"Courier New",Consolas,monospace;color:#e0e0e0;';

    overlayEl.innerHTML = renderShellHTML();
    document.body.appendChild(overlayEl);

    bindHandlers();
    refreshState();
  }

  function hide() {
    if (!open) return;
    open = false;
    if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
    overlayEl = null;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
  }

  function renderShellHTML() {
    var html = '<div style="' +
      'width:min(640px,92vw);max-height:88vh;overflow:hidden;display:flex;flex-direction:column;' +
      'background:linear-gradient(180deg,rgba(20,30,46,0.96),rgba(10,18,28,0.96));' +
      'border:1px solid rgba(64,200,216,0.5);border-radius:8px;' +
      'box-shadow:0 0 32px rgba(64,200,216,0.25),inset 0 0 18px rgba(64,200,216,0.06);">';

    // Header
    html += '<div style="padding:18px 24px;border-bottom:1px solid rgba(64,200,216,0.25);">' +
      '<div style="font-size:11px;letter-spacing:5px;color:rgba(64,200,216,0.7);">STATS CONSOLE</div>' +
      '<div style="font-size:18px;letter-spacing:3px;color:#80e0e8;margin-top:4px;" id="stats-pilot-name">PILOT</div>' +
    '</div>';

    // Body
    html += '<div style="padding:20px 24px;overflow-y:auto;flex:1;">' +
      // Top stats row
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">' +
        statCard('COINS', '<span id="stats-coins">…</span>', '#ffe080') +
        statCard('TROPHIES', '<span id="stats-trophies">…</span> / ' + TROPHIES.length, '#ffe080') +
        statCard('WORLDS VISITED', '<span id="stats-worlds">…</span> / 4', '#80e0e8') +
        statCard('DECOR OWNED', '<span id="stats-decor">…</span>', '#80e088') +
      '</div>' +

      // Trophies
      '<div style="font-size:11px;letter-spacing:4px;color:rgba(64,200,216,0.7);margin:18px 0 8px;">TROPHIES</div>' +
      '<div id="stats-trophy-list" style="display:flex;flex-direction:column;gap:6px;">…</div>' +
    '</div>';

    // Footer
    html += '<div style="padding:12px 24px;border-top:1px solid rgba(64,200,216,0.25);' +
            'display:flex;justify-content:flex-end;font-size:10px;letter-spacing:3px;color:#777;">' +
      '<span>ESC TO CLOSE</span>' +
    '</div>';

    html += '</div>';
    return html;
  }

  function statCard(label, value, color) {
    return '<div style="' +
      'background:rgba(0,0,0,0.35);border:1px solid rgba(64,200,216,0.2);border-radius:6px;' +
      'padding:14px 16px;">' +
      '<div style="font-size:9px;letter-spacing:3px;color:#888;">' + label + '</div>' +
      '<div style="font-size:22px;letter-spacing:2px;color:' + color + ';margin-top:6px;">' + value + '</div>' +
    '</div>';
  }

  function refreshState() {
    if (!overlayEl) return;

    // Pilot name
    var nameEl = document.getElementById('stats-pilot-name');
    var pilotName = (function () {
      try { return localStorage.getItem('bridge_pilot') || 'PILOT'; }
      catch (e) { return 'PILOT'; }
    })().toUpperCase();
    if (nameEl) nameEl.textContent = pilotName;

    if (typeof BridgeProgression === 'undefined') return;

    BridgeProgression.getBalance().then(function (b) {
      var el = document.getElementById('stats-coins');
      if (el) el.textContent = b == null ? 0 : b;
    });

    BridgeProgression.getAchievements().then(function (set) {
      // Visible trophies count
      var earned = TROPHIES.filter(function (t) { return set.has(t.key); }).length;
      var trEl = document.getElementById('stats-trophies');
      if (trEl) trEl.textContent = earned;

      // Worlds visited count (4 hyperspace destinations)
      var worldKeys = ['visited_arcadia', 'visited_lumar', 'visited_singularity', 'visited_enigma'];
      var visited = worldKeys.filter(function (k) { return set.has(k); }).length;
      var wEl = document.getElementById('stats-worlds');
      if (wEl) wEl.textContent = visited;

      // Trophy list
      var listEl = document.getElementById('stats-trophy-list');
      if (listEl) {
        var html = '';
        for (var i = 0; i < TROPHIES.length; i++) {
          var t = TROPHIES[i];
          var owned = set.has(t.key);
          var icon = owned ? '★' : '○';
          var labelColor = owned ? '#ffe080' : '#666';
          var descColor = owned ? '#aaa' : '#444';
          html += '<div style="display:grid;grid-template-columns:24px 1fr;gap:12px;align-items:center;' +
            'padding:8px 12px;background:rgba(0,0,0,0.25);border:1px solid ' +
            (owned ? 'rgba(255,224,128,0.35)' : 'rgba(64,200,216,0.12)') + ';border-radius:4px;">' +
            '<div style="font-size:18px;color:' + labelColor + ';text-align:center;">' + icon + '</div>' +
            '<div>' +
              '<div style="font-size:12px;letter-spacing:2px;color:' + labelColor + ';">' + t.name.toUpperCase() + '</div>' +
              '<div style="font-size:10px;color:' + descColor + ';margin-top:2px;">' + t.desc + '</div>' +
            '</div>' +
          '</div>';
        }
        listEl.innerHTML = html;
      }
    });

    BridgeProgression.getDecor().then(function (d) {
      var count = Object.keys(d || {}).length;
      var el = document.getElementById('stats-decor');
      if (el) el.textContent = count;
    });
  }

  function bindHandlers() {
    overlayEl.addEventListener('click', function (e) {
      if (e.target === overlayEl) hide();
    });
    document.addEventListener('keydown', escHandler);
  }

  function escHandler(e) {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      document.removeEventListener('keydown', escHandler);
      hide();
    }
  }

  return { show: show, hide: hide };
})();
