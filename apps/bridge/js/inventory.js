/**
 * BridgeInventory — hotbar inventory + HP/energy.
 *
 * Stardew-style hotbar: 10 fixed slots, the one highlighted is the
 * "selected" item. Items and stats persist in localStorage. Currency is
 * the server-side coin balance (BridgeProgression / top-right CoinHUD).
 *
 *   1-0           jump to slot (0 maps to slot 10)
 *   [ ]           cycle selected slot left / right
 *   F             use the selected item
 *   left-click    select that slot (also: world click = interact)
 *   right-click   on world = use selected
 *
 *   BridgeInventory.init()
 *   BridgeInventory.addItem(id, n=1)           // stacks into existing slot, else fills empty
 *   BridgeInventory.removeItem(id, n=1)
 *   BridgeInventory.getCount(id) → number
 *   BridgeInventory.selectSlot(i)              // 0..MAX_SLOTS-1
 *   BridgeInventory.cycleSlot(dir)             // -1 or +1, wraps
 *   BridgeInventory.useSelected() → bool
 *   BridgeInventory.useItem(id)                // legacy / convenience
 *   BridgeInventory.restoreHP(n) / .restoreEnergy(n)
 *   BridgeInventory.getStats()
 *
 * State lives under localStorage key 'bridge.inventory.v2'.
 */
var BridgeInventory = (function () {

  var STORAGE_KEY = 'bridge.inventory.v2';
  var LEGACY_KEY  = 'bridge.inventory.v1';
  var MAX_SLOTS = 10;
  var SLOT_SIZE = 38;
  var ICON_SIZE = 30;

  var state = {
    slots: new Array(MAX_SLOTS).fill(null),  // [{id,count}|null] * MAX_SLOTS
    selected: 0,
    hp: 100, maxHP: 100,
    energy: 100, maxEnergy: 100
  };

  var panel = null;
  var slotsRow = null;
  var slotEls = [];                // 10 DOM nodes, indexed 0..9
  var hpFillEl = null, hpTextEl = null;
  var enFillEl = null, enTextEl = null;
  var inited = false;

  // ---- Persistence ----------------------------------------------------
  function normalizeSlots(arr) {
    var out = new Array(MAX_SLOTS).fill(null);
    if (!Array.isArray(arr)) return out;
    for (var i = 0; i < Math.min(arr.length, MAX_SLOTS); i++) {
      var s = arr[i];
      if (s && typeof s.id === 'string' && typeof s.count === 'number' && s.count > 0) {
        if (BridgeItems.get(s.id)) out[i] = { id: s.id, count: s.count };
      }
    }
    return out;
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* quota / private mode — silent */ }
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          state.slots    = normalizeSlots(parsed.slots);
          state.selected = (typeof parsed.selected === 'number' && parsed.selected >= 0 && parsed.selected < MAX_SLOTS) ? parsed.selected : 0;
          state.hp        = (typeof parsed.hp === 'number') ? parsed.hp : state.hp;
          state.maxHP     = (typeof parsed.maxHP === 'number') ? parsed.maxHP : state.maxHP;
          state.energy    = (typeof parsed.energy === 'number') ? parsed.energy : state.energy;
          state.maxEnergy = (typeof parsed.maxEnergy === 'number') ? parsed.maxEnergy : state.maxEnergy;
          return;
        }
      }
      // Migrate from v1 (items object map) if present
      var legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        var parsedLegacy = JSON.parse(legacy);
        if (parsedLegacy && parsedLegacy.items && typeof parsedLegacy.items === 'object') {
          var idx = 0;
          Object.keys(parsedLegacy.items).forEach(function (id) {
            if (idx >= MAX_SLOTS) return;
            if (!BridgeItems.get(id)) return;
            state.slots[idx++] = { id: id, count: parsedLegacy.items[id] };
          });
        }
        if (typeof parsedLegacy.hp === 'number') state.hp = parsedLegacy.hp;
        if (typeof parsedLegacy.maxHP === 'number') state.maxHP = parsedLegacy.maxHP;
        if (typeof parsedLegacy.energy === 'number') state.energy = parsedLegacy.energy;
        if (typeof parsedLegacy.maxEnergy === 'number') state.maxEnergy = parsedLegacy.maxEnergy;
        save();
        try { localStorage.removeItem(LEGACY_KEY); } catch (e) {}
      }
    } catch (e) { /* corrupt save — ignore */ }
  }

  // ---- Slot ops -------------------------------------------------------
  function findSlotById(id) {
    for (var i = 0; i < MAX_SLOTS; i++) {
      if (state.slots[i] && state.slots[i].id === id) return i;
    }
    return -1;
  }
  function firstEmptySlot() {
    for (var i = 0; i < MAX_SLOTS; i++) if (!state.slots[i]) return i;
    return -1;
  }

  function addItem(id, n) {
    n = (typeof n === 'number') ? n : 1;
    var item = BridgeItems.get(id);
    if (!item) return;
    var existing = (item.stackable !== false) ? findSlotById(id) : -1;
    if (existing >= 0) {
      state.slots[existing].count += n;
    } else {
      var empty = firstEmptySlot();
      if (empty < 0) return;  // inventory full — silently drop
      state.slots[empty] = { id: id, count: n };
    }
    save(); refresh();
  }
  function removeItem(id, n) {
    n = (typeof n === 'number') ? n : 1;
    var i = findSlotById(id);
    if (i < 0) return false;
    state.slots[i].count = Math.max(0, state.slots[i].count - n);
    if (state.slots[i].count === 0) state.slots[i] = null;
    save(); refresh();
    return true;
  }
  function getCount(id) {
    var i = findSlotById(id);
    return i < 0 ? 0 : state.slots[i].count;
  }
  function getAll() {
    var out = {};
    for (var i = 0; i < MAX_SLOTS; i++) {
      if (state.slots[i]) out[state.slots[i].id] = state.slots[i].count;
    }
    return out;
  }

  function selectSlot(i) {
    if (typeof i !== 'number' || i < 0 || i >= MAX_SLOTS) return;
    state.selected = i;
    save(); refresh();
  }
  function cycleSlot(dir) {
    var n = state.selected + (dir > 0 ? 1 : -1);
    if (n < 0) n = MAX_SLOTS - 1;
    if (n >= MAX_SLOTS) n = 0;
    selectSlot(n);
  }
  function getSelectedSlot() { return state.selected; }
  function getSelectedItemId() {
    var s = state.slots[state.selected];
    return s ? s.id : null;
  }

  function useItem(id) {
    var item = BridgeItems.get(id);
    if (!item) return false;
    if (getCount(id) <= 0) return false;
    if (typeof item.onUse !== 'function') {
      flashSlotByIndex(findSlotById(id), '#a04040');
      return false;
    }
    var consumed = item.onUse(api);
    if (consumed) removeItem(id, 1);
    else flashSlotByIndex(findSlotById(id), '#ffe080');
    return true;
  }
  function useSelected() {
    var s = state.slots[state.selected];
    if (!s) { flashSlotByIndex(state.selected, '#a04040'); return false; }
    return useItem(s.id);
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
      'display:none;align-items:center;gap:12px;' +
      'padding:8px 14px;' +
      'background:rgba(10,14,22,0.86);' +
      'border:1px solid rgba(255,200,100,0.35);' +
      'border-radius:10px;' +
      'box-shadow:0 0 16px rgba(0,0,0,0.5),inset 0 0 8px rgba(255,200,100,0.05);' +
      'font-family:"Courier New",Consolas,monospace;color:#e0d8c0;font-size:12px;' +
      'letter-spacing:1.5px;';

    // Item slots row (10 fixed slots)
    slotsRow = document.createElement('div');
    slotsRow.id = 'inv-slots';
    slotsRow.style.cssText = 'display:flex;gap:3px;align-items:center;padding-right:12px;border-right:1px solid rgba(255,200,100,0.18);';
    slotEls = [];
    for (var i = 0; i < MAX_SLOTS; i++) {
      var slot = buildSlotEl(i);
      slotEls.push(slot);
      slotsRow.appendChild(slot);
    }
    panel.appendChild(slotsRow);

    // Stats: HP + Energy
    var statsWrap = document.createElement('div');
    statsWrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding-left:4px;min-width:140px;';

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

  function buildSlotEl(i) {
    var slot = document.createElement('div');
    slot.dataset.idx = i;
    slot.style.cssText =
      'position:relative;width:' + SLOT_SIZE + 'px;height:' + SLOT_SIZE + 'px;' +
      'background:rgba(0,0,0,0.45);border:1px solid rgba(255,200,100,0.20);' +
      'cursor:pointer;transition:border-color 0.15s ease,box-shadow 0.15s ease;';
    // Slot-number label (1..9, 0 for slot 10)
    var num = document.createElement('span');
    num.className = 'slot-num';
    num.textContent = (i === 9) ? '0' : String(i + 1);
    num.style.cssText =
      'position:absolute;top:1px;left:3px;font-size:9px;color:rgba(255,200,100,0.55);' +
      'letter-spacing:0;pointer-events:none;';
    slot.appendChild(num);
    // Canvas placeholder for icon
    var cnv = document.createElement('canvas');
    cnv.className = 'slot-icon';
    cnv.width = ICON_SIZE; cnv.height = ICON_SIZE;
    cnv.style.cssText = 'image-rendering:pixelated;width:' + ICON_SIZE + 'px;height:' + ICON_SIZE + 'px;display:block;margin:4px auto 0;';
    slot.appendChild(cnv);
    // Count badge
    var cnt = document.createElement('span');
    cnt.className = 'slot-count';
    cnt.style.cssText =
      'position:absolute;bottom:1px;right:3px;font-size:11px;color:#fff;' +
      'text-shadow:1px 1px 0 #000;font-weight:bold;display:none;';
    slot.appendChild(cnt);
    // Click selects the slot
    slot.addEventListener('click', function () { selectSlot(i); });
    return slot;
  }

  function refreshSlotEl(i) {
    var slot = slotEls[i];
    if (!slot) return;
    var s = state.slots[i];
    var isSelected = (i === state.selected);
    // Border + glow based on selection + occupancy
    if (isSelected) {
      slot.style.borderColor = '#ffe080';
      slot.style.boxShadow = '0 0 8px rgba(255,224,128,0.45),inset 0 0 6px rgba(255,224,128,0.10)';
    } else {
      slot.style.borderColor = s ? 'rgba(255,200,100,0.35)' : 'rgba(255,200,100,0.15)';
      slot.style.boxShadow = '';
    }
    var cnv = slot.querySelector('.slot-icon');
    var cnt = slot.querySelector('.slot-count');
    var ctx = cnv.getContext('2d');
    ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
    if (s) {
      var item = BridgeItems.get(s.id);
      if (item) {
        item.draw(ctx, 0, 0, ICON_SIZE);
        slot.title = item.name + ' — ' + item.desc;
      }
      if (s.count > 1) { cnt.textContent = String(s.count); cnt.style.display = ''; }
      else cnt.style.display = 'none';
    } else {
      slot.title = '';
      cnt.style.display = 'none';
    }
  }

  function flashSlotByIndex(i, color) {
    if (typeof i !== 'number' || i < 0 || i >= MAX_SLOTS) return;
    var slot = slotEls[i];
    if (!slot) return;
    var prevBorder = slot.style.borderColor;
    var prevShadow = slot.style.boxShadow;
    slot.style.borderColor = color;
    slot.style.boxShadow = '0 0 10px ' + color;
    setTimeout(function () {
      slot.style.borderColor = prevBorder;
      slot.style.boxShadow = prevShadow;
      // Re-apply selection styles in case selection changed during flash
      refreshSlotEl(i);
    }, 240);
  }

  function refresh() {
    if (!panel) return;
    for (var i = 0; i < MAX_SLOTS; i++) refreshSlotEl(i);
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
    useItem: useItem, useSelected: useSelected,
    selectSlot: selectSlot, cycleSlot: cycleSlot,
    getSelectedSlot: getSelectedSlot, getSelectedItemId: getSelectedItemId,
    getStats: getStats, restoreHP: restoreHP, restoreEnergy: restoreEnergy,
    restoreAll: restoreAll, takeDamage: takeDamage
  };
  return api;
})();
