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
 *   BridgeInventory.addItem(id, n=1)           // stacks into existing slot, else fills empty; false if full
 *   BridgeInventory.removeItem(id, n=1)
 *   BridgeInventory.getCount(id) → number
 *   BridgeInventory.selectSlot(i)              // 0..MAX_SLOTS-1
 *   BridgeInventory.cycleSlot(dir)             // -1 or +1, wraps
 *   BridgeInventory.useSelected() → bool
 *   BridgeInventory.useItem(id)                // legacy / convenience
 *   BridgeInventory.restoreHP(n) / .restoreEnergy(n)
 *   BridgeInventory.getStats()
 *
 * Behind the hotbar is the backpack: more slots, as many as the pack you
 * carry holds (js/gear.js — the Flight Pack's 6 up to the Voidweave's 30).
 * In the inventory screen click an item to pick it up and another slot to
 * put it down (swapping, or stacking like with like). Suits add to max
 * health and energy (BridgeGear.bonus()).
 *
 * State lives under localStorage key 'bridge.inventory.v2'.
 */
var BridgeInventory = (function () {

  var STORAGE_KEY = 'bridge.inventory.v2';
  var LEGACY_KEY  = 'bridge.inventory.v1';
  var MAX_SLOTS = 10;               // the hotbar
  var TOTAL = 40;                   // hotbar + the biggest pack
  var BASE_HP = 100, BASE_EN = 100;
  function cap() { return Math.min(TOTAL, MAX_SLOTS + (typeof BridgeGear !== 'undefined' ? BridgeGear.packSlots() : 6)); }
  var SLOT_SIZE = 38;
  var ICON_SIZE = 30;

  var state = {
    slots: new Array(TOTAL).fill(null),      // [{id,count}|null] * TOTAL: hotbar first, then the pack
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

  var menuSlotEls = [];            // the Backpack page's slots (the game menu, js/menu.js)
  var menuDetailEl = null;
  var menuStatsEl = null;
  var menuOpen = false;            // the Backpack page is showing

  // ---- Persistence ----------------------------------------------------
  function normalizeSlots(arr) {
    var out = new Array(TOTAL).fill(null);
    if (!Array.isArray(arr)) return out;
    for (var i = 0; i < Math.min(arr.length, TOTAL); i++) {
      var s = arr[i];
      if (s && typeof s.id === 'string' && typeof s.count === 'number' && s.count > 0) {
        if (BridgeItems.get(s.id)) out[i] = { id: s.id, count: s.count };
      }
    }
    return out;
  }
  // localStorage is the offline cache + the source of truth before the
  // first Supabase pull lands. Supabase wins once we've heard from it.
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* quota / private mode — silent */ }
    scheduleRemoteSave();
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          applyState(parsed);
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
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          localStorage.removeItem(LEGACY_KEY);
        } catch (e) {}
      }
    } catch (e) { /* corrupt save — ignore */ }
  }

  // Apply a state-shaped object (either localStorage or the Supabase row
  // shape from BridgeProgression.getInventory) into our `state`.
  function applyState(parsed) {
    state.slots    = normalizeSlots(parsed.slots);
    var sel = (typeof parsed.selected === 'number') ? parsed.selected
            : (typeof parsed.selected_slot === 'number') ? parsed.selected_slot
            : 0;
    state.selected = (sel >= 0 && sel < MAX_SLOTS) ? sel : 0;
    state.hp        = (typeof parsed.hp === 'number') ? parsed.hp : state.hp;
    state.maxHP     = (typeof parsed.maxHP === 'number') ? parsed.maxHP
                    : (typeof parsed.max_hp === 'number') ? parsed.max_hp : state.maxHP;
    state.energy    = (typeof parsed.energy === 'number') ? parsed.energy : state.energy;
    state.maxEnergy = (typeof parsed.maxEnergy === 'number') ? parsed.maxEnergy
                    : (typeof parsed.max_energy === 'number') ? parsed.max_energy : state.maxEnergy;
  }

  // Pull from Supabase if a pilot is signed in. Server state wins over
  // localStorage (the cache may be stale from a different browser). On
  // first-ever load for a new pilot the row doesn't exist yet — we keep
  // the local defaults and push them up on the next save.
  function loadRemote() {
    if (typeof BridgeProgression === 'undefined' || !BridgeProgression.getInventory) {
      return Promise.resolve(false);
    }
    return BridgeProgression.getInventory().then(function (row) {
      if (!row) return false;
      applyState(row);
      // Auto-revive: if the saved state has us dead, treat the world
      // load as a respawn rather than leaving the player permanently
      // stuck (hostile pathfinding pauses at hp = 0, so a dead pilot
      // would re-enter to a frozen world). Real death mechanics can
      // replace this later (lose coins, drop items, etc.).
      if (state.hp <= 0) {
        state.hp = state.maxHP;
        state.energy = Math.max(state.energy, Math.floor(state.maxEnergy / 2));
        scheduleRemoteSave();
      }
      // Mirror into localStorage so offline reloads see the same state.
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
      refresh();
      return true;
    }).catch(function () { return false; });
  }

  // Debounced upsert to Supabase. Local writes happen synchronously via
  // `save()`; the remote write trails by ~500ms so a flurry of changes
  // (buying 5 items in a vendor) becomes one round-trip.
  var saveTimer = null;
  function scheduleRemoteSave() {
    if (typeof BridgeProgression === 'undefined' || !BridgeProgression.saveInventory) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      BridgeProgression.saveInventory(state);
    }, 500);
  }

  // ---- Slot ops -------------------------------------------------------
  function findSlotById(id) {
    for (var i = 0; i < TOTAL; i++) {
      if (state.slots[i] && state.slots[i].id === id) return i;
    }
    return -1;
  }
  function firstEmptySlot() {
    for (var i = 0, n = cap(); i < n; i++) if (!state.slots[i]) return i;
    return -1;
  }
  // max health and energy follow the suit you wear
  function applyGear() {
    var b = typeof BridgeGear !== 'undefined' ? BridgeGear.bonus() : { hp: 0, energy: 0 };
    state.maxHP = BASE_HP + (b.hp || 0); state.maxEnergy = BASE_EN + (b.energy || 0);
    state.hp = Math.min(state.hp, state.maxHP); state.energy = Math.min(state.energy, state.maxEnergy);
  }

  function addItem(id, n) {
    n = (typeof n === 'number') ? n : 1;
    var item = BridgeItems.get(id);
    if (!item) return false;
    var existing = (item.stackable !== false) ? findSlotById(id) : -1;
    if (existing >= 0) {
      state.slots[existing].count += n;
    } else {
      var empty = firstEmptySlot();
      if (empty < 0) return false;  // inventory full — dropped (callers can say so)
      state.slots[empty] = { id: id, count: n };
    }
    save(); refresh();
    return true;
  }
  function removeItem(id, n) {
    n = (typeof n === 'number') ? n : 1;
    if (findSlotById(id) < 0) return false;
    for (var i = TOTAL - 1; i >= 0 && n > 0; i--) {         // from the back of the pack first
      var sl = state.slots[i];
      if (!sl || sl.id !== id) continue;
      var take = Math.min(n, sl.count);
      sl.count -= take; n -= take;
      if (sl.count === 0) state.slots[i] = null;
    }
    save(); refresh();
    return true;
  }
  function getCount(id) {
    var c = 0;
    for (var i = 0; i < TOTAL; i++) if (state.slots[i] && state.slots[i].id === id) c += state.slots[i].count;
    return c;
  }
  function getAll() {
    var out = {};
    for (var i = 0; i < TOTAL; i++) {
      if (state.slots[i]) out[state.slots[i].id] = (out[state.slots[i].id] || 0) + state.slots[i].count;
    }
    return out;
  }
  // pick up from one slot, put down in another: swap, or stack like with like
  function moveSlot(from, to) {
    if (from === to || from < 0 || to < 0 || from >= cap() || to >= cap()) return;
    var a = state.slots[from], b = state.slots[to];
    if (a && b && a.id === b.id && (BridgeItems.get(a.id) || {}).stackable !== false) {
      b.count += a.count; state.slots[from] = null;
    } else {
      state.slots[from] = b; state.slots[to] = a;
    }
    save(); refresh();
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
  function useEnergy(n) {             // work costs energy (swinging a pickaxe)
    state.energy = Math.max(0, state.energy - (n || 0));
    save(); refresh();
  }
  function takeDamage(n) {
    state.hp = Math.max(0, state.hp - (n || 0));
    save(); refresh();
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('hurt');
    if (state.hp <= 0 && typeof BridgeCombat !== 'undefined') BridgeCombat.faint();     // black out, come round somewhere safe
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
      'letter-spacing:1.5px;' +
      'opacity:1;transition:opacity 0.20s ease;';

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
    statsWrap.id = 'inv-stats';
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
    applyGear();
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

  // Auto-fade the hotbar when the pilot is in the lower band of the
  // viewport (Stardew's trick) — otherwise the panel covers doors,
  // dock-edge content, and boats. Called from the world loop each
  // frame; uses the smooth render position so the fade tracks motion.
  var fadeState = 'full';
  function tick() {
    if (!panel || panel.style.display === 'none') return;
    if (typeof BridgeWorld === 'undefined' || typeof BridgeCharacter === 'undefined') return;
    var v = BridgeWorld.getScreenView();
    if (!v || !v.ts) return;
    var ts = v.ts;
    var h = window.innerHeight;
    var pos = BridgeCharacter.getRenderPos ? BridgeCharacter.getRenderPos() : { x: BridgeCharacter.getX(), y: BridgeCharacter.getY() };
    var offY = v.offY;
    var screenY = offY + (pos.y + 0.5) * ts;
    // Anything in the bottom 30% of the viewport gets the dim treatment.
    var near = screenY > h * 0.70;
    var want = near ? 'dim' : 'full';
    if (want !== fadeState) {
      fadeState = want;
      panel.style.opacity = (want === 'dim') ? '0.30' : '1';
    }
  }

  // ---- The Backpack: a page of the game menu (js/menu.js) ----------------
  // The hotbar and the pack as a grid, the item in hand described beside
  // them, health and energy, the wardrobe. Click an item to pick it up and a
  // slot to put it down (swapping, or stacking like with like). With a chest
  // open (js/storage.js) its slots sit above yours and a click moves a whole
  // stack across (shift-click or right-click: just one).
  var root = null, chest = null, menuGrid = null, chestGrid = null, menuCap = 0, held = -1, focus = -1, focusChest = -1;
  var chestSlotEls = [];

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function mount(el, opts) {
    opts = opts || {};
    menuOpen = true;
    chest = opts.chest || null;
    held = -1; focus = -1; focusChest = -1; menuCap = 0; menuSlotEls = []; chestSlotEls = [];
    root = document.createElement('div');
    root.className = 'bp' + (chest ? ' bp-with-chest' : '');
    root.innerHTML =
      '<div class="bp-main">' +
        (chest ? '<section class="bp-chest"><div class="bp-head"><span class="bp-title"></span><span class="bp-sub"></span></div>' +
                 '<div class="bp-grid bp-chest-grid"></div>' +
                 '<div class="bp-chest-btns"><button type="button" class="gm-btn" data-c="store">Store your pack</button>' +
                 '<button type="button" class="gm-btn" data-c="stack">Add to stacks</button>' +
                 '<button type="button" class="gm-btn" data-c="take">Take all</button>' +
                 (chest.extra ? '<button type="button" class="gm-btn" data-c="extra">' + esc(chest.extra.label) + '</button>' : '') + '</div></section>' : '') +
        '<section class="bp-mine"><div class="bp-slots"></div><div class="bp-next"></div></section>' +
      '</div>' +
      '<aside class="bp-side"><div class="bp-detail"></div><div class="bp-stats"></div>' +
        '<div class="bp-actions"><button type="button" class="gm-btn" data-a="outfit"><span class="ip-key">O</span>Wardrobe</button></div>' +
        '<div class="bp-help"></div></aside>';
    el.appendChild(root);
    menuGrid = root.querySelector('.bp-slots');
    chestGrid = root.querySelector('.bp-chest-grid');
    menuDetailEl = root.querySelector('.bp-detail');
    menuStatsEl = root.querySelector('.bp-stats');
    root.querySelector('[data-a="outfit"]').addEventListener('click', function (e) { e.stopPropagation(); outfit(); });
    root.querySelectorAll('[data-c]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var c = b.getAttribute('data-c');
        if (c === 'store') storeAll(false); else if (c === 'stack') storeAll(true); else if (c === 'take') takeAll();
        else if (c === 'extra' && chest.extra) chest.extra.act();
      });
    });
    if (chest) buildChestGrid();
    refreshMenu();
  }
  function unmount() { menuOpen = false; root = null; chest = null; menuGrid = null; chestGrid = null; menuSlotEls = []; chestSlotEls = []; held = -1; }
  function outfit() {
    if (typeof BridgeMenu !== 'undefined') BridgeMenu.close();
    if (typeof BridgeGear !== 'undefined') BridgeGear.open();
  }

  // the grid: a row for the hotbar, rows for the pack (rebuilt when the pack changes)
  function buildMenuGrid() {
    var c = cap();
    if (menuCap === c && menuSlotEls.length) return;
    menuCap = c;
    menuGrid.innerHTML = '';
    menuSlotEls = [];
    function label(t, sub) {
      var l = document.createElement('div');
      l.className = 'bp-head';
      l.innerHTML = '<span class="bp-title">' + esc(t) + '</span>' + (sub ? '<span class="bp-sub">' + esc(sub) + '</span>' : '');
      menuGrid.appendChild(l);
    }
    function grid(from, to) {
      var g = document.createElement('div');
      g.className = 'bp-grid';
      for (var i = from; i < to; i++) { var el = buildMenuSlotEl(i, false); menuSlotEls[i] = el; g.appendChild(el); }
      menuGrid.appendChild(g);
    }
    label('Hotbar', '1-0 to pick · F to use');
    grid(0, MAX_SLOTS);
    label(typeof BridgeGear !== 'undefined' ? BridgeGear.packName() : 'Pack', (c - MAX_SLOTS) + ' slots');
    grid(MAX_SLOTS, c);
  }
  function buildChestGrid() {
    chestGrid.innerHTML = '';
    chestSlotEls = [];
    for (var j = 0; j < chest.size; j++) { var el = buildMenuSlotEl(j, true); chestSlotEls[j] = el; chestGrid.appendChild(el); }
  }

  function clickMenuSlot(i, one) {
    if (chest) { storeSlot(i, one); return; }
    if (held < 0) {
      if (state.slots[i]) held = i;
      focus = i; focusChest = -1;
      if (i < MAX_SLOTS) selectSlot(i); else refreshMenu();
      return;
    }
    if (i !== held) { moveSlot(held, i); focus = i; if (i < MAX_SLOTS) state.selected = i; }
    held = -1;
    refreshMenu();
  }

  function buildMenuSlotEl(i, inChest) {
    var slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'bp-slot' + (inChest ? ' bp-cslot' : '');
    if (!inChest && i < MAX_SLOTS) {
      var num = document.createElement('span');
      num.className = 'bp-num';
      num.textContent = (i === 9) ? '0' : String(i + 1);
      slot.appendChild(num);
    }
    var cnv = document.createElement('canvas');
    cnv.className = 'bp-icon';
    cnv.width = 32; cnv.height = 32;
    slot.appendChild(cnv);
    var cnt = document.createElement('span');
    cnt.className = 'bp-count';
    slot.appendChild(cnt);
    function act(e, one) {
      e.preventDefault(); e.stopPropagation();
      if (inChest) takeSlot(i, one); else clickMenuSlot(i, one);
    }
    slot.addEventListener('click', function (e) { act(e, e.shiftKey); });
    slot.addEventListener('contextmenu', function (e) { if (chest) act(e, true); else e.preventDefault(); });
    slot.addEventListener('mouseenter', function () {
      if (held >= 0) return;
      if (inChest) { focusChest = i; focus = -1; } else { focus = i; focusChest = -1; }
      refreshMenuDetail();
    });
    return slot;
  }

  function paintSlot(slot, s, cls) {
    if (!slot) return;
    slot.className = 'bp-slot' + (cls || '') + (s ? '' : ' empty');
    var cnv = slot.querySelector('.bp-icon'), cnt = slot.querySelector('.bp-count');
    var ctx = cnv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 32, 32);
    var item = s && BridgeItems.get(s.id);
    if (item) item.draw(ctx, 0, 0, 32);
    slot.title = item ? item.name : '';
    cnt.textContent = s && s.count > 1 ? String(s.count) : '';
  }
  function refreshMenuSlot(i) {
    var cls = (i === held ? ' held' : '') + (i === state.selected ? ' sel' : '') + (i === focus && held < 0 ? ' focus' : '');
    paintSlot(menuSlotEls[i], state.slots[i], cls);
  }

  // what the item in hand (or under the pointer) is, does, and is worth
  function refreshMenuDetail() {
    if (!menuDetailEl) return;
    var s = focusChest >= 0 && chest ? chest.slots[focusChest] : state.slots[held >= 0 ? held : focus >= 0 ? focus : state.selected];
    var item = s && BridgeItems.get(s.id);
    if (!item) {
      var tch = document.documentElement.classList.contains('touch');
      menuDetailEl.innerHTML = '<div class="bp-d-empty">' + (chest ? (tch ? 'Tap a stack to move it across, into the chest or out of it.' : 'Click a stack to move it across. Shift-click (or right-click) moves just one.')
                                                                    : (tch ? 'Tap something to see what it is.' : 'Point at something to see what it is.')) + '</div>';
      return;
    }
    var typeColor = BridgeItems.typeColor ? BridgeItems.typeColor(item.type) : '#888';
    var effects = BridgeItems.effectsText ? BridgeItems.effectsText(item) : '';
    var usable = typeof item.onUse === 'function';
    var worth = typeof BridgeStorage !== 'undefined' && BridgeStorage.worthLine ? BridgeStorage.worthLine(s.id) : '';
    menuDetailEl.innerHTML =
      '<div class="bp-d-top"><canvas class="bp-d-icon" width="64" height="64"></canvas><div class="bp-d-id">' +
        '<div class="bp-d-name">' + esc(item.name) + '</div>' +
        '<span class="bp-d-type" style="--tc:' + typeColor + '">' + esc(item.type || 'item') + '</span>' + (s.count > 1 ? '<span class="bp-d-n">×' + s.count + '</span>' : '') +
      '</div></div>' +
      '<div class="bp-d-desc">' + esc(item.desc || '') + '</div>' +
      (effects ? '<div class="bp-d-fx">' + esc(effects) + '</div>' : '') +
      (worth ? '<div class="bp-d-worth">' + worth + '</div>' : '') +
      '<div class="bp-d-hint">' + esc(held >= 0 ? 'Click another slot to put it there, or this one to keep it here.'
        : chest ? (focusChest >= 0 ? 'Click to take it. Shift-click takes one.' : 'Click to store it. Shift-click stores one.').replace(/Click/g, document.documentElement.classList.contains('touch') ? 'Tap' : 'Click').replace(/ Shift-click (takes|stores) one\./, document.documentElement.classList.contains('touch') ? '' : ' Shift-click $1 one.')
        : usable ? (item.type === 'weapon' ? 'F or right-click in the world to strike' : 'F (or B on touch) to use it from the hotbar')
        : 'Nothing to use it for here') + '</div>';
    var g = menuDetailEl.querySelector('.bp-d-icon').getContext('2d');
    g.imageSmoothingEnabled = false;
    item.draw(g, 0, 0, 64);
  }

  function refreshMenuStats() {
    if (!menuStatsEl) return;
    var hp = Math.max(0, Math.min(100, state.hp / state.maxHP * 100)), en = Math.max(0, Math.min(100, state.energy / state.maxEnergy * 100));
    menuStatsEl.innerHTML =
      '<div class="bp-bar hp"><span>Health</span><i><b style="width:' + hp + '%"></b></i><em>' + state.hp + '/' + state.maxHP + '</em></div>' +
      '<div class="bp-bar en"><span>Energy</span><i><b style="width:' + en + '%"></b></i><em>' + state.energy + '/' + state.maxEnergy + '</em></div>';
    var help = root && root.querySelector('.bp-help');
    if (help) help.textContent = chest ? 'What you leave in a chest stays there, wherever you go - come back for it.'
                                       : document.documentElement.classList.contains('touch') ? 'Tap an item to pick it up, then a slot to put it down.'
                                       : 'Click an item to pick it up, a slot to put it down. 1-0 picks a hotbar slot, F uses it.';
  }

  // the next pack up, and where to buy it (js/storage.js knows the outfitters)
  function refreshNext() {
    var box = root && root.querySelector('.bp-next');
    if (!box) return;
    var n = typeof BridgeStorage !== 'undefined' && BridgeStorage.nextPack ? BridgeStorage.nextPack() : null;
    box.innerHTML = n ? '<b>A bigger pack:</b> the ' + esc(n.name) + ', ' + n.slots + ' slots, ' + n.price + ' coins' + (n.where ? ' · ' + esc(n.where) : '')
                      : '<b>The biggest pack there is.</b> Chests at home and aboard hold the rest.';
  }

  function refreshChest() {
    if (!chest || !chestGrid) return;
    var used = 0;
    for (var j = 0; j < chest.size; j++) {
      if (chest.slots[j]) used++;
      paintSlot(chestSlotEls[j], chest.slots[j], ' bp-cslot' + (j === focusChest ? ' focus' : ''));
    }
    var head = root.querySelector('.bp-chest .bp-head');
    head.querySelector('.bp-title').textContent = chest.name;
    head.querySelector('.bp-sub').textContent = used + ' of ' + chest.size + ' slots used' + (chest.where ? ' · ' + chest.where : '');
  }

  function refreshMenu() {
    if (!root) return;
    buildMenuGrid();
    for (var i = 0; i < menuCap; i++) refreshMenuSlot(i);
    refreshChest();
    refreshMenuDetail();
    refreshMenuStats();
    refreshNext();
  }

  // ---- chests: moving things in and out ------------------------------------
  function stackable(id) { return (BridgeItems.get(id) || {}).stackable !== false; }
  // put n of id into a slot array: onto a stack of the same, else the first empty slot; how many went in
  function putInto(arr, size, id, n, from) {
    var put = 0;
    if (stackable(id)) {
      for (var i = from || 0; i < size; i++) if (arr[i] && arr[i].id === id) { arr[i].count += n; return n; }
      for (var j = from || 0; j < size; j++) if (!arr[j]) { arr[j] = { id: id, count: n }; return n; }
      return 0;
    }
    for (var k = from || 0; k < size && put < n; k++) if (!arr[k]) { arr[k] = { id: id, count: 1 }; put++; }
    return put;
  }
  function moved(sound) {
    save();
    if (chest && chest.save) chest.save();
    refresh();
    if (sound && typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('pickup');
  }
  function storeSlot(i, one) {
    var s = state.slots[i];
    if (!s || !chest) return 0;
    var n = one ? 1 : s.count, put = putInto(chest.slots, chest.size, s.id, n);
    if (!put) { flashChestFull(); return 0; }
    s.count -= put;
    if (s.count <= 0) state.slots[i] = null;
    focus = i; focusChest = -1;
    moved(true);
    return put;
  }
  function takeSlot(j, one) {
    var s = chest && chest.slots[j];
    if (!s) return 0;
    var n = one ? 1 : s.count, put = putInto(state.slots, cap(), s.id, n);
    if (!put) { flashPackFull(); return 0; }
    s.count -= put;
    if (s.count <= 0) chest.slots[j] = null;
    focusChest = j; focus = -1;
    moved(true);
    return put;
  }
  // store everything in the pack (not the hotbar) - or, `stacks`, only what the chest already has some of (hotbar too)
  function storeAll(stacks) {
    if (!chest) return;
    var n = 0, full = false;
    for (var i = stacks ? 0 : MAX_SLOTS; i < cap(); i++) {
      var s = state.slots[i];
      if (!s) continue;
      if (stacks && !chest.slots.some(function (c) { return c && c.id === s.id; })) continue;
      var put = putInto(chest.slots, chest.size, s.id, s.count);
      if (!put) { full = true; continue; }
      s.count -= put; n += put;
      if (s.count <= 0) state.slots[i] = null;
    }
    if (full) flashChestFull();
    if (n) moved(true); else refresh();
  }
  function takeAll() {
    if (!chest) return;
    var n = 0, full = false;
    for (var j = 0; j < chest.size; j++) {
      var s = chest.slots[j];
      if (!s) continue;
      var put = putInto(state.slots, cap(), s.id, s.count);
      if (!put) { full = true; continue; }
      s.count -= put; n += put;
      if (s.count <= 0) chest.slots[j] = null;
    }
    if (full) flashPackFull();
    if (n) moved(true); else refresh();
  }
  function flash(cls) {
    if (!root) return;
    root.classList.remove(cls); void root.offsetWidth; root.classList.add(cls);
    if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('error');
  }
  function flashChestFull() { flash('bp-chest-full'); }
  function flashPackFull() { flash('bp-pack-full'); }

  // keys while the Backpack is the menu's page (js/menu.js hands them over first)
  function menuKey(e) {
    switch (e.key) {
      case 'Escape': if (held >= 0) { held = -1; refreshMenu(); return true; } return false;
      case '[': cycleSlot(-1); return true;
      case ']': cycleSlot(1); return true;
      case 'f': case 'F': useSelected(); return true;
      case 'o': case 'O': outfit(); return true;
      case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9':
        selectSlot(parseInt(e.key, 10) - 1); return true;
      case '0': selectSlot(9); return true;
    }
    return false;
  }

  if (typeof BridgeMenu !== 'undefined') {
    BridgeMenu.page('backpack', {
      render: function (el, opts) { mount(el, opts); },
      leave: function () { if (chest && chest.close) chest.close(); unmount(); },
      key: menuKey
    });
  }

  function openMenu(opts) {
    if (typeof BridgeMenu !== 'undefined') BridgeMenu.open('backpack', opts);
  }
  function closeMenu() {
    if (typeof BridgeMenu !== 'undefined' && BridgeMenu.isOpen()) BridgeMenu.close();
  }
  function toggleMenu() { if (typeof BridgeMenu !== 'undefined') BridgeMenu.toggle('backpack'); }
  function isMenuOpen() { return typeof BridgeMenu !== 'undefined' && BridgeMenu.isOpen(); }

  // ---- Public API -----------------------------------------------------
  function init() {
    if (inited) return;
    inited = true;
    load();             // localStorage cache first — instant render
    buildPanel();
    refresh();
    loadRemote();       // then overlay Supabase state when it lands

    // When the player switches pilot (sign-in, identity change), pull
    // that pilot's inventory. State.onChange fires for every transition;
    // we just retry the remote pull and the no-pilot case bails.
    if (typeof BridgeState !== 'undefined' && BridgeState.onChange) {
      BridgeState.onChange(function (newState) {
        if (newState === 'world') loadRemote();
      });
    }
  }

  var api = {
    init: init,
    show: show, hide: hide, refresh: refresh,
    addItem: addItem, removeItem: removeItem, getCount: getCount, getAll: getAll,
    freeSlots: function () { var n = 0; for (var i = 0, c = cap(); i < c; i++) if (!state.slots[i]) n++; return n; },
    useItem: useItem, useSelected: useSelected,
    selectSlot: selectSlot, cycleSlot: cycleSlot,
    getSelectedSlot: getSelectedSlot, getSelectedItemId: getSelectedItemId,
    getStats: getStats, restoreHP: restoreHP, restoreEnergy: restoreEnergy,
    restoreAll: restoreAll, takeDamage: takeDamage, useEnergy: useEnergy,
    openMenu: openMenu, closeMenu: closeMenu, toggleMenu: toggleMenu, isMenuOpen: isMenuOpen,
    storeAll: storeAll, takeAll: takeAll, putInto: putInto,
    tick: tick,
    loadRemote: loadRemote
  };
  return api;
})();
