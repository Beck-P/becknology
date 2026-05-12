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
    energy: 100, maxEnergy: 100,
    starterGiven: false
  };

  // Items handed out the very first time a pilot opens the inventory.
  // Future loads check state.starterGiven so we don't keep refilling after
  // the player uses things up.
  var STARTER_KIT = [
    { id: 'bread',       count: 3 },
    { id: 'mug_of_ale',  count: 2 },
    { id: 'iron_dagger', count: 1 }
  ];

  var panel = null;
  var slotsRow = null;
  var slotEls = [];                // 10 DOM nodes, indexed 0..9
  var hpFillEl = null, hpTextEl = null;
  var enFillEl = null, enTextEl = null;
  var inited = false;

  var menu = null;                 // modal overlay element
  var menuSlotEls = [];            // 10 DOM nodes inside the modal grid
  var menuDetailEl = null;
  var menuStatsEl = null;
  var menuOpen = false;

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
          state.starterGiven = !!parsed.starterGiven;
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
          // Migrated saves count as having had a starter kit equivalent.
          state.starterGiven = true;
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
    if (menuOpen) refreshMenu();
  }

  function show() { if (panel) panel.style.display = 'flex'; refresh(); }
  function hide() { if (panel) panel.style.display = 'none'; closeMenu(); }

  // ---- Inventory Menu (full modal) ------------------------------------
  function buildMenu() {
    if (menu) return;
    menu = document.createElement('div');
    menu.id = 'inventory-menu';
    menu.style.cssText =
      'position:fixed;inset:0;z-index:200;display:none;' +
      'background:rgba(4,8,14,0.78);' +
      'align-items:center;justify-content:center;' +
      'font-family:"Courier New",Consolas,monospace;color:#e0d8c0;';

    var card = document.createElement('div');
    card.style.cssText =
      'width:min(720px,94vw);max-height:88vh;overflow:hidden;' +
      'display:flex;flex-direction:column;' +
      'background:linear-gradient(180deg,rgba(20,18,14,0.96),rgba(10,8,6,0.96));' +
      'border:1px solid rgba(255,200,100,0.45);border-radius:8px;' +
      'box-shadow:0 0 32px rgba(255,200,100,0.18),inset 0 0 16px rgba(255,200,100,0.04);';

    // Header
    var head = document.createElement('div');
    head.style.cssText =
      'padding:14px 22px;border-bottom:1px solid rgba(255,200,100,0.20);' +
      'display:flex;justify-content:space-between;align-items:center;';
    head.innerHTML =
      '<div>' +
        '<div style="font-size:10px;letter-spacing:5px;color:rgba(255,200,100,0.7);">PILOT GEAR</div>' +
        '<div style="font-size:18px;letter-spacing:3px;color:#ffe080;margin-top:4px;">INVENTORY</div>' +
      '</div>' +
      '<div style="font-size:10px;color:#888;letter-spacing:2px;">[I] OR [ESC] TO CLOSE</div>';
    card.appendChild(head);

    // Body: grid on the left, detail on the right
    var body = document.createElement('div');
    body.style.cssText = 'display:flex;gap:18px;padding:18px 22px;';

    // Grid (2 rows × 5 cols)
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,56px);grid-template-rows:repeat(2,56px);gap:6px;flex:0 0 auto;';
    menuSlotEls = [];
    for (var i = 0; i < MAX_SLOTS; i++) {
      var s = buildMenuSlotEl(i);
      menuSlotEls.push(s);
      grid.appendChild(s);
    }
    body.appendChild(grid);

    // Detail panel
    menuDetailEl = document.createElement('div');
    menuDetailEl.style.cssText = 'flex:1;min-width:0;padding:8px 4px;';
    body.appendChild(menuDetailEl);

    card.appendChild(body);

    // Stats footer
    menuStatsEl = document.createElement('div');
    menuStatsEl.style.cssText =
      'padding:12px 22px;border-top:1px solid rgba(255,200,100,0.20);' +
      'font-size:11px;letter-spacing:2px;color:#a8a08c;' +
      'display:flex;justify-content:space-between;align-items:center;';
    card.appendChild(menuStatsEl);

    menu.appendChild(card);
    document.body.appendChild(menu);

    // Clicking the dim backdrop closes; clicks on the card don't
    menu.addEventListener('click', function (e) { if (e.target === menu) closeMenu(); });
  }

  function buildMenuSlotEl(i) {
    var slot = document.createElement('div');
    slot.dataset.idx = i;
    slot.style.cssText =
      'position:relative;width:56px;height:56px;' +
      'background:rgba(0,0,0,0.5);border:1px solid rgba(255,200,100,0.20);' +
      'cursor:pointer;transition:border-color 0.15s ease,box-shadow 0.15s ease;';
    var num = document.createElement('span');
    num.textContent = (i === 9) ? '0' : String(i + 1);
    num.style.cssText =
      'position:absolute;top:2px;left:4px;font-size:10px;' +
      'color:rgba(255,200,100,0.55);pointer-events:none;';
    slot.appendChild(num);
    var cnv = document.createElement('canvas');
    cnv.className = 'menu-icon';
    cnv.width = 44; cnv.height = 44;
    cnv.style.cssText = 'image-rendering:pixelated;width:44px;height:44px;display:block;margin:6px auto 0;';
    slot.appendChild(cnv);
    var cnt = document.createElement('span');
    cnt.className = 'menu-count';
    cnt.style.cssText =
      'position:absolute;bottom:2px;right:5px;font-size:12px;color:#fff;' +
      'text-shadow:1px 1px 0 #000;font-weight:bold;display:none;';
    slot.appendChild(cnt);
    slot.addEventListener('click', function () { selectSlot(i); });
    return slot;
  }

  function refreshMenuSlot(i) {
    var slot = menuSlotEls[i];
    if (!slot) return;
    var s = state.slots[i];
    var isSelected = (i === state.selected);
    if (isSelected) {
      slot.style.borderColor = '#ffe080';
      slot.style.boxShadow = '0 0 10px rgba(255,224,128,0.5),inset 0 0 8px rgba(255,224,128,0.10)';
    } else {
      slot.style.borderColor = s ? 'rgba(255,200,100,0.35)' : 'rgba(255,200,100,0.15)';
      slot.style.boxShadow = '';
    }
    var cnv = slot.querySelector('.menu-icon');
    var cnt = slot.querySelector('.menu-count');
    var ctx = cnv.getContext('2d');
    ctx.clearRect(0, 0, 44, 44);
    if (s) {
      var item = BridgeItems.get(s.id);
      if (item) item.draw(ctx, 0, 0, 44);
      if (s.count > 1) { cnt.textContent = String(s.count); cnt.style.display = ''; }
      else cnt.style.display = 'none';
    } else {
      cnt.style.display = 'none';
    }
  }

  function refreshMenuDetail() {
    if (!menuDetailEl) return;
    var s = state.slots[state.selected];
    if (!s) {
      menuDetailEl.innerHTML =
        '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#5a5040;font-style:italic;letter-spacing:2px;">EMPTY SLOT</div>';
      return;
    }
    var item = BridgeItems.get(s.id);
    if (!item) {
      menuDetailEl.innerHTML = '<div style="color:#888;">UNKNOWN ITEM</div>';
      return;
    }
    var typeColor = (BridgeItems.typeColor ? BridgeItems.typeColor(item.type) : '#888');
    var effects = (BridgeItems.effectsText ? BridgeItems.effectsText(item) : '');
    var usable = (typeof item.onUse === 'function');

    menuDetailEl.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

    // Top row: big icon + name/type
    var top = document.createElement('div');
    top.style.cssText = 'display:flex;gap:14px;align-items:center;';
    var bigCnvWrap = document.createElement('div');
    bigCnvWrap.style.cssText =
      'width:80px;height:80px;flex:0 0 80px;background:rgba(0,0,0,0.5);' +
      'border:1px solid rgba(255,200,100,0.35);display:flex;align-items:center;justify-content:center;';
    var bigCnv = document.createElement('canvas');
    bigCnv.width = 64; bigCnv.height = 64;
    bigCnv.style.cssText = 'image-rendering:pixelated;width:64px;height:64px;';
    item.draw(bigCnv.getContext('2d'), 0, 0, 64);
    bigCnvWrap.appendChild(bigCnv);
    top.appendChild(bigCnvWrap);

    var nameWrap = document.createElement('div');
    nameWrap.style.cssText = 'flex:1;min-width:0;';
    var nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:16px;letter-spacing:2px;color:#ffe080;';
    nameEl.textContent = item.name.toUpperCase();
    var typeEl = document.createElement('div');
    typeEl.style.cssText =
      'display:inline-block;margin-top:6px;padding:2px 8px;font-size:10px;letter-spacing:2px;' +
      'background:rgba(0,0,0,0.4);border:1px solid ' + typeColor + ';color:' + typeColor + ';';
    typeEl.textContent = (item.type || 'ITEM').toUpperCase();
    nameWrap.appendChild(nameEl);
    nameWrap.appendChild(typeEl);
    if (s.count > 1) {
      var countEl = document.createElement('span');
      countEl.style.cssText = 'margin-left:10px;font-size:11px;letter-spacing:1px;color:#a8a08c;';
      countEl.textContent = '×' + s.count;
      typeEl.parentNode.appendChild(countEl);
    }
    top.appendChild(nameWrap);
    wrap.appendChild(top);

    // Description
    var descEl = document.createElement('div');
    descEl.style.cssText = 'font-size:11px;line-height:1.6;color:#c8c0a8;letter-spacing:1px;';
    descEl.textContent = item.desc;
    wrap.appendChild(descEl);

    // Effects line
    if (effects) {
      var fxEl = document.createElement('div');
      fxEl.style.cssText = 'font-size:11px;letter-spacing:2px;color:#80e0a0;';
      fxEl.textContent = effects;
      wrap.appendChild(fxEl);
    }

    // Use hint
    var hintEl = document.createElement('div');
    hintEl.style.cssText =
      'margin-top:4px;padding:6px 10px;font-size:10px;letter-spacing:2px;' +
      'background:rgba(0,0,0,0.4);border:1px solid ' + (usable ? 'rgba(255,224,128,0.4)' : 'rgba(255,255,255,0.1)') + ';' +
      'color:' + (usable ? '#ffe080' : '#5a5040') + ';';
    hintEl.textContent = usable
      ? (item.type === 'weapon' ? '[F] OR RIGHT-CLICK TO STRIKE' : '[F] OR RIGHT-CLICK TO USE')
      : (item.type === 'weapon' ? 'WEAPON · NO COMBAT YET' : 'NO USE AVAILABLE HERE');
    wrap.appendChild(hintEl);

    menuDetailEl.appendChild(wrap);
  }

  function refreshMenuStats() {
    if (!menuStatsEl) return;
    menuStatsEl.innerHTML =
      '<span>HP <span style="color:#ffb0b0;">' + state.hp + '/' + state.maxHP + '</span>' +
      '  ·  EN <span style="color:#ffe0a0;">' + state.energy + '/' + state.maxEnergy + '</span></span>' +
      '<span style="color:#666;">CLICK A SLOT · 1-0 JUMP · [ ] CYCLE · F USE</span>';
  }

  function refreshMenu() {
    if (!menu) return;
    for (var i = 0; i < MAX_SLOTS; i++) refreshMenuSlot(i);
    refreshMenuDetail();
    refreshMenuStats();
  }

  function openMenu() {
    if (menuOpen) return;
    if (typeof BridgeState !== 'undefined' && BridgeState.getState() !== 'world') return;
    buildMenu();
    menu.style.display = 'flex';
    menuOpen = true;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
    refreshMenu();
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    if (menu) menu.style.display = 'none';
    if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
  }
  function toggleMenu() { menuOpen ? closeMenu() : openMenu(); }
  function isMenuOpen() { return menuOpen; }

  // Menu-only keyboard listener — fires regardless of BridgeControls
  // because we disable controls while the menu is open. Registered in
  // the capture phase so we beat world.js's global Esc-to-leave handler
  // and can swallow it via stopImmediatePropagation when the menu owns
  // the key.
  document.addEventListener('keydown', function (e) {
    if (!menuOpen) return;
    var handled = true;
    switch (e.key) {
      case 'Escape': case 'i': case 'I':
        closeMenu(); break;
      case '[':
        cycleSlot(-1); break;
      case ']':
        cycleSlot(1); break;
      case 'f': case 'F':
        useSelected(); break;
      case '1': case '2': case '3': case '4': case '5':
      case '6': case '7': case '8': case '9':
        selectSlot(parseInt(e.key, 10) - 1); break;
      case '0':
        selectSlot(9); break;
      default: handled = false;
    }
    if (handled) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  // Drop the starter kit into empty slots. Safe to call manually from
  // the console to recover from a wiped or first-run inventory.
  function giveStarter() {
    for (var i = 0; i < STARTER_KIT.length; i++) {
      addItem(STARTER_KIT[i].id, STARTER_KIT[i].count);
    }
    state.starterGiven = true;
    save(); refresh();
  }

  // ---- Public API -----------------------------------------------------
  function init() {
    if (inited) return;
    inited = true;
    load();
    if (!state.starterGiven) giveStarter();
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
    restoreAll: restoreAll, takeDamage: takeDamage,
    openMenu: openMenu, closeMenu: closeMenu, toggleMenu: toggleMenu, isMenuOpen: isMenuOpen,
    giveStarter: giveStarter
  };
  return api;
})();
