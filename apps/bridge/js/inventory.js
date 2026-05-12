/**
 * BridgeInventory — personal inventory + currency + HP/energy.
 *
 * Persistent local state (localStorage), independent of the server-side
 * coin balance handled by BridgeProgression. Renders a bottom-of-screen
 * panel showing brass count, item slots with icons + counts, and
 * HP / energy bars.
 *
 *   BridgeInventory.init()
 *   BridgeInventory.show() / .hide()        // toggle bottom panel
 *   BridgeInventory.addItem(id, n=1)
 *   BridgeInventory.removeItem(id, n=1)
 *   BridgeInventory.getCount(id) → number
 *   BridgeInventory.useItem(id)             // apply onUse, decrement count
 *   BridgeInventory.addBrass(n) / .spendBrass(n) → bool / .getBrass()
 *   BridgeInventory.restoreHP(n) / .restoreEnergy(n)
 *   BridgeInventory.getStats() → { hp, maxHP, energy, maxEnergy }
 *
 * State lives under localStorage key 'bridge.inventory.v1'.
 */
var BridgeInventory = (function () {

  var STORAGE_KEY = 'bridge.inventory.v1';
  var SLOT_SIZE = 40;          // panel slot square (px)
  var ICON_SIZE = 32;          // canvas-rendered icon size

  var state = {
    brass: 20,
    items: {},                 // { item_id: count }
    hp: 100, maxHP: 100,
    energy: 100, maxEnergy: 100
  };

  var panel = null;
  var slotsRow = null;
  var brassEl = null;
  var hpFillEl = null, hpTextEl = null;
  var enFillEl = null, enTextEl = null;
  var inited = false;

  // ---- Persistence ----------------------------------------------------
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* quota / private mode — silent */ }
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed) {
        // Defensive merge — older saves may lack new fields.
        state.brass     = (typeof parsed.brass === 'number') ? parsed.brass : state.brass;
        state.items     = (typeof parsed.items === 'object' && parsed.items) ? parsed.items : {};
        state.hp        = (typeof parsed.hp === 'number') ? parsed.hp : state.hp;
        state.maxHP     = (typeof parsed.maxHP === 'number') ? parsed.maxHP : state.maxHP;
        state.energy    = (typeof parsed.energy === 'number') ? parsed.energy : state.energy;
        state.maxEnergy = (typeof parsed.maxEnergy === 'number') ? parsed.maxEnergy : state.maxEnergy;
      }
    } catch (e) { /* corrupt save — ignore */ }
  }

  // ---- Item ops -------------------------------------------------------
  function addItem(id, n) {
    n = (typeof n === 'number') ? n : 1;
    if (!BridgeItems.get(id)) return;
    state.items[id] = (state.items[id] || 0) + n;
    save(); refresh();
  }
  function removeItem(id, n) {
    n = (typeof n === 'number') ? n : 1;
    if (!state.items[id]) return false;
    state.items[id] = Math.max(0, state.items[id] - n);
    if (state.items[id] === 0) delete state.items[id];
    save(); refresh();
    return true;
  }
  function getCount(id) { return state.items[id] || 0; }
  function getAll() { return Object.assign({}, state.items); }

  function useItem(id) {
    var item = BridgeItems.get(id);
    if (!item || !state.items[id]) return false;
    if (typeof item.onUse !== 'function') return false;
    var consumed = item.onUse(api);
    if (consumed) removeItem(id, 1);
    return true;
  }

  // ---- Currency -------------------------------------------------------
  function getBrass() { return state.brass; }
  function addBrass(n) { state.brass += (n || 0); save(); refresh(); }
  function spendBrass(n) {
    if (state.brass < n) return false;
    state.brass -= n; save(); refresh(); return true;
  }

  // ---- Stats ----------------------------------------------------------
  function getStats() { return { hp: state.hp, maxHP: state.maxHP, energy: state.energy, maxEnergy: state.maxEnergy }; }
  function restoreHP(n) {
    state.hp = Math.min(state.maxHP, state.hp + (n || 0));
    save(); refresh();
  }
  function restoreEnergy(n) {
    state.energy = Math.min(state.maxEnergy, state.energy + (n || 0));
    save(); refresh();
  }
  function restoreAll() {
    state.hp = state.maxHP; state.energy = state.maxEnergy;
    save(); refresh();
  }
  function takeDamage(n) {
    state.hp = Math.max(0, state.hp - (n || 0));
    save(); refresh();
  }

  // ---- UI -------------------------------------------------------------
  function buildPanel() {
    if (panel) return;
    panel = document.createElement('div');
    panel.id = 'inventory-panel';
    panel.style.cssText =
      'position:fixed;left:50%;bottom:8px;transform:translateX(-50%);' +
      'z-index:60;' +
      'display:none;align-items:center;gap:14px;' +
      'padding:8px 16px;' +
      'background:rgba(10,14,22,0.86);' +
      'border:1px solid rgba(255,200,100,0.35);' +
      'border-radius:10px;' +
      'box-shadow:0 0 16px rgba(0,0,0,0.5),inset 0 0 8px rgba(255,200,100,0.05);' +
      'font-family:"Courier New",Consolas,monospace;color:#e0d8c0;font-size:12px;' +
      'letter-spacing:1.5px;';

    // Brass display
    var brassWrap = document.createElement('div');
    brassWrap.style.cssText = 'display:flex;align-items:center;gap:8px;padding-right:14px;border-right:1px solid rgba(255,200,100,0.18);';
    var brassIcon = document.createElement('canvas');
    brassIcon.width = brassIcon.height = 28;
    brassIcon.style.cssText = 'image-rendering:pixelated;width:28px;height:28px;';
    drawCoin(brassIcon.getContext('2d'), 0, 0, 28);
    brassEl = document.createElement('span');
    brassEl.style.cssText = 'color:#ffe080;font-size:14px;font-weight:bold;min-width:32px;text-align:right;';
    brassWrap.appendChild(brassIcon);
    brassWrap.appendChild(brassEl);
    panel.appendChild(brassWrap);

    // Item slots row
    slotsRow = document.createElement('div');
    slotsRow.id = 'inv-slots';
    slotsRow.style.cssText = 'display:flex;gap:4px;align-items:center;';
    panel.appendChild(slotsRow);

    // Stats: HP + Energy
    var statsWrap = document.createElement('div');
    statsWrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding-left:14px;border-left:1px solid rgba(255,200,100,0.18);min-width:140px;';

    var hpRow = document.createElement('div');
    hpRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
    var hpLabel = document.createElement('span');
    hpLabel.textContent = 'HP'; hpLabel.style.cssText = 'color:#ff8080;width:24px;';
    var hpBarWrap = document.createElement('div');
    hpBarWrap.style.cssText = 'flex:1;height:10px;background:rgba(255,80,80,0.18);border:1px solid rgba(255,80,80,0.35);';
    hpFillEl = document.createElement('div');
    hpFillEl.style.cssText = 'height:100%;background:#e84040;transition:width 0.25s ease;';
    hpBarWrap.appendChild(hpFillEl);
    hpTextEl = document.createElement('span');
    hpTextEl.style.cssText = 'min-width:48px;text-align:right;color:#ffb0b0;';
    hpRow.appendChild(hpLabel); hpRow.appendChild(hpBarWrap); hpRow.appendChild(hpTextEl);
    statsWrap.appendChild(hpRow);

    var enRow = document.createElement('div');
    enRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
    var enLabel = document.createElement('span');
    enLabel.textContent = 'EN'; enLabel.style.cssText = 'color:#ffd060;width:24px;';
    var enBarWrap = document.createElement('div');
    enBarWrap.style.cssText = 'flex:1;height:10px;background:rgba(255,200,80,0.18);border:1px solid rgba(255,200,80,0.35);';
    enFillEl = document.createElement('div');
    enFillEl.style.cssText = 'height:100%;background:#e8c040;transition:width 0.25s ease;';
    enBarWrap.appendChild(enFillEl);
    enTextEl = document.createElement('span');
    enTextEl.style.cssText = 'min-width:48px;text-align:right;color:#ffe0a0;';
    enRow.appendChild(enLabel); enRow.appendChild(enBarWrap); enRow.appendChild(enTextEl);
    statsWrap.appendChild(enRow);

    panel.appendChild(statsWrap);
    document.body.appendChild(panel);
  }

  // Draw a brass coin icon
  function drawCoin(ctx, x, y, s) {
    var u = s / 16;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(x, y, s, s);
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 4*u, y + 3*u, 8*u, 10*u);
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + 4*u, y + 4*u, 8*u, 8*u);
    ctx.fillStyle = '#e0c060';
    ctx.fillRect(x + 4*u, y + 4*u, 8*u, 2*u);
    ctx.fillStyle = '#fff0c0';
    ctx.fillRect(x + 5*u, y + 4*u, 2*u, u);
    // "B"
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 7*u, y + 7*u, u, 4*u);
    ctx.fillRect(x + 8*u, y + 7*u, u, u);
    ctx.fillRect(x + 8*u, y + 9*u, u, u);
    ctx.fillRect(x + 8*u, y + 10*u, u, u);
  }

  function refresh() {
    if (!panel) return;
    // Brass
    brassEl.textContent = String(state.brass);
    // Slots — render an icon for each item in inventory
    slotsRow.innerHTML = '';
    var ids = Object.keys(state.items);
    if (ids.length === 0) {
      var empty = document.createElement('span');
      empty.style.cssText = 'color:#5a5040;font-style:italic;padding:4px 8px;';
      empty.textContent = '— empty —';
      slotsRow.appendChild(empty);
    } else {
      ids.forEach(function (id) {
        var item = BridgeItems.get(id);
        if (!item) return;
        var count = state.items[id];
        var slot = document.createElement('div');
        slot.style.cssText =
          'position:relative;width:' + SLOT_SIZE + 'px;height:' + SLOT_SIZE + 'px;' +
          'background:rgba(0,0,0,0.45);border:1px solid rgba(255,200,100,0.25);' +
          'cursor:pointer;';
        slot.title = item.name + ' — ' + item.desc;
        var cnv = document.createElement('canvas');
        cnv.width = ICON_SIZE; cnv.height = ICON_SIZE;
        cnv.style.cssText = 'image-rendering:pixelated;width:32px;height:32px;display:block;margin:3px auto;';
        item.draw(cnv.getContext('2d'), 0, 0, ICON_SIZE);
        slot.appendChild(cnv);
        if (count > 1) {
          var cnt = document.createElement('span');
          cnt.style.cssText =
            'position:absolute;bottom:1px;right:3px;font-size:11px;color:#fff;' +
            'text-shadow:1px 1px 0 #000;font-weight:bold;';
          cnt.textContent = String(count);
          slot.appendChild(cnt);
        }
        // Click to use (consumables only)
        slot.addEventListener('click', function () {
          if (typeof item.onUse === 'function') useItem(id);
        });
        slotsRow.appendChild(slot);
      });
    }
    // Stats bars
    var hpPct = Math.max(0, Math.min(100, (state.hp / state.maxHP) * 100));
    var enPct = Math.max(0, Math.min(100, (state.energy / state.maxEnergy) * 100));
    hpFillEl.style.width = hpPct + '%';
    enFillEl.style.width = enPct + '%';
    hpTextEl.textContent = state.hp + '/' + state.maxHP;
    enTextEl.textContent = state.energy + '/' + state.maxEnergy;
  }

  function show() { if (panel) panel.style.display = 'flex'; refresh(); }
  function hide() { if (panel) panel.style.display = 'none'; }

  // ---- Public API -----------------------------------------------------
  function init() {
    if (inited) return;
    inited = true;
    load();
    buildPanel();
    refresh();
  }

  var api = {
    init: init,
    show: show, hide: hide, refresh: refresh,
    addItem: addItem, removeItem: removeItem, getCount: getCount, getAll: getAll,
    useItem: useItem,
    getBrass: getBrass, addBrass: addBrass, spendBrass: spendBrass,
    getStats: getStats, restoreHP: restoreHP, restoreEnergy: restoreEnergy,
    restoreAll: restoreAll, takeDamage: takeDamage
  };
  return api;
})();
