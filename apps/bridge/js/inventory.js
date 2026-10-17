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
 * The inventory screen is the Backpack tab of the game menu (js/menu.js;
 * I opens it): click an item to pick it up and another slot to put it down
 * (swapping, or stacking like with like). With a chest open (js/storage.js)
 * its slots sit above yours and a click moves a stack across. Suits add to
 * max health and energy (BridgeGear.bonus()).
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
  var enFillEl = null, enTextEl = null, enBackEl = null;
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
    enBarWrap.style.cssText = 'position:relative;flex:1;height:10px;background:rgba(255,200,80,0.18);border:1px solid rgba(255,200,80,0.35);';
    enFillEl = document.createElement('div');
    enFillEl.style.cssText = 'height:100%;background:#e8c040;transition:width 0.25s ease;';
    enBarWrap.appendChild(enFillEl);
    // what a fight took that's still coming back once you stop for a breath (js/arms.js, the second wind), pale
    enBackEl = document.createElement('div');
    enBackEl.style.cssText = 'position:absolute;top:0;height:100%;left:0;width:0;background:rgba(255,224,140,0.45);transition:left 0.25s ease,width 0.25s ease;';
    enBarWrap.appendChild(enBackEl);
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
    // a weapon's stats on hover (js/arms.js)
    slot.addEventListener('mouseenter', function () { hoverTip(slot, i); });
    slot.addEventListener('mouseleave', function () { hoverTip(null); });
    return slot;
  }

  var tipEl = null;
  function hoverTip(slot, i) {
    var s = slot && state.slots[i], item = s && BridgeItems.get(s.id);
    var html = item && typeof BridgeArms !== 'undefined' && BridgeArms.stats(item) ? BridgeArms.card(item, {}) : '';
    if (!html) { if (tipEl) tipEl.style.display = 'none'; return; }
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.id = 'ws-tip'; document.body.appendChild(tipEl); }
    tipEl.innerHTML = '<div class="ws-name">' + esc(item.name) + '</div>' + html;
    tipEl.style.display = 'block';
    var r = slot.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    tipEl.style.left = Math.max(6, Math.min(window.innerWidth - w - 6, r.left + r.width / 2 - w / 2)) + 'px';
    tipEl.style.top = Math.max(6, r.top - h - 8) + 'px';
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
        slot.title = typeof BridgeArms !== 'undefined' && BridgeArms.stats(item) ? '' : item.name + ' — ' + item.desc;   // a weapon has its own card
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
    var back = typeof BridgeArms !== 'undefined' && BridgeArms.winded ? BridgeArms.winded() : 0;
    if (enBackEl) { enBackEl.style.left = enPct + '%'; enBackEl.style.width = Math.max(0, Math.min(100 - enPct, back / state.maxEnergy * 100)) + '%'; }
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
  // them with what you can do with it (use, split, drop, throw away, send to
  // the ship, sell when you're standing at a buyer), health and energy, the
  // wardrobe. Click an item to pick it up and a slot to put it down (swapping,
  // or stacking like with like) - or drag it there. Sort the pack by kind or
  // by worth, or pull stacks together. With a chest open (js/storage.js) its
  // slots sit above yours and a click moves a whole stack across (shift-click
  // or right-click: just one). With something offered and no room for it
  // (BridgeInventory.offer), the new thing sits on top and you pick what goes.
  var root = null, chest = null, offerNow = null, menuGrid = null, chestGrid = null, menuCap = 0, held = -1, focus = -1, focusChest = -1;
  var chestSlotEls = [], note = '', binArmed = -1, drag = null, dragged = false;
  function isTouch() { return document.documentElement.classList.contains('touch'); }

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function itemName(id) { var it = BridgeItems.get(id); return it ? it.name : id; }
  function S() { return typeof BridgeStorage !== 'undefined' ? BridgeStorage : null; }

  function mount(el, opts) {
    opts = opts || {};
    menuOpen = true;
    chest = opts.chest || null;
    offerNow = opts.offer && offers[0] === opts.offer ? opts.offer : null;
    held = -1; focus = -1; focusChest = -1; menuCap = 0; menuSlotEls = []; chestSlotEls = []; note = ''; binArmed = -1;
    root = document.createElement('div');
    root.className = 'bp' + (chest ? ' bp-with-chest' : '') + (offerNow ? ' bp-offering' : '');
    root.innerHTML =
      '<div class="bp-main">' +
        (offerNow ? '<section class="bp-offer"></section>' : '') +
        (chest ? '<section class="bp-chest"><div class="bp-head"><span class="bp-title"></span><span class="bp-sub"></span></div>' +
                 '<div class="bp-grid bp-chest-grid"></div>' +
                 '<div class="bp-chest-btns"><button type="button" class="gm-btn" data-c="store">Store your pack</button>' +
                 '<button type="button" class="gm-btn" data-c="stack">Add to stacks</button>' +
                 '<button type="button" class="gm-btn" data-c="take">Take all</button>' +
                 (chest.extra ? '<button type="button" class="gm-btn" data-c="extra">' + esc(chest.extra.label) + '</button>' : '') + '</div></section>' : '') +
        '<section class="bp-mine"><div class="bp-slots"></div><div class="bp-tools">' +
          '<span class="bp-tools-label">Pack</span><button type="button" class="gm-btn gm-btn-sm" data-s="type">Sort by kind</button>' +
          '<button type="button" class="gm-btn gm-btn-sm" data-s="value">Sort by worth</button><button type="button" class="gm-btn gm-btn-sm" data-s="stack">Stack like with like</button></div>' +
        '<div class="bp-next"></div></section>' +
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
    root.querySelectorAll('[data-s]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); var s = b.getAttribute('data-s'); if (s === 'stack') stackAll(); else sortPack(s); });
    });
    if (chest) buildChestGrid();
    if (offerNow) paintOffer();
    refreshMenu();
  }
  function unmount() {
    if (offerNow) { var o = offerNow; offerNow = null; settle(o, false); }          // closing the menu leaves the new thing
    endDrag();
    menuOpen = false; root = null; chest = null; menuGrid = null; chestGrid = null; menuSlotEls = []; chestSlotEls = []; held = -1;
  }
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
    function label(t, sub, cls) {
      var l = document.createElement('div');
      l.className = 'bp-head' + (cls ? ' ' + cls : '');
      l.innerHTML = '<span class="bp-title">' + esc(t) + '</span><span class="bp-sub">' + esc(sub || '') + '</span>';
      menuGrid.appendChild(l);
    }
    function grid(from, to) {
      var g = document.createElement('div');
      g.className = 'bp-grid';
      for (var i = from; i < to; i++) { var el = buildMenuSlotEl(i, false); menuSlotEls[i] = el; g.appendChild(el); }
      menuGrid.appendChild(g);
    }
    label('Hotbar', isTouch() ? 'B uses the one picked' : '1-0 to pick · F to use');
    grid(0, MAX_SLOTS);
    label(typeof BridgeGear !== 'undefined' ? BridgeGear.packName() : 'Pack', '', 'bp-pack-head');
    grid(MAX_SLOTS, c);
  }
  function buildChestGrid() {
    chestGrid.innerHTML = '';
    chestSlotEls = [];
    for (var j = 0; j < chest.size; j++) { var el = buildMenuSlotEl(j, true); chestSlotEls[j] = el; chestGrid.appendChild(el); }
  }

  function clickMenuSlot(i, one) {
    binArmed = -1;
    if (offerNow) { focus = i; focusChest = -1; refreshMenu(); return; }        // making room: pick what goes
    if (chest && held < 0) { storeSlot(i, one); return; }
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
    slot.dataset.i = i;
    if (inChest) slot.dataset.chest = '1';
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
      if (dragged) { dragged = false; return; }                                 // the end of a drag isn't a click
      if (inChest) { if (offerNow) return; takeSlot(i, one); } else clickMenuSlot(i, one);
    }
    slot.addEventListener('click', function (e) { act(e, e.shiftKey); });
    slot.addEventListener('contextmenu', function (e) { if (chest && !isTouch()) act(e, true); else e.preventDefault(); });
    slot.addEventListener('pointerdown', function (e) { startDrag(e, i, !!inChest); });
    slot.addEventListener('mouseenter', function () {
      if (held >= 0 || drag || offerNow) return;
      if (inChest) { focusChest = i; focus = -1; } else { focus = i; focusChest = -1; }
      binArmed = -1;
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
    slot.title = item ? item.name + (item.value > 0 ? ' · worth ' + item.value + (s.count > 1 ? ' each' : '') : '') : '';
    cnt.textContent = s && s.count > 1 ? String(s.count) : '';
  }
  function refreshMenuSlot(i) {
    var cls = (i === held ? ' held' : '') + (i === state.selected && !offerNow ? ' sel' : '') + (i === focus && held < 0 ? (offerNow ? ' swap' : ' focus') : '');
    paintSlot(menuSlotEls[i], state.slots[i], cls);
  }

  // what the item in hand (or under the pointer) is, does and is worth - and what you can do with it
  function refreshMenuDetail() {
    if (!menuDetailEl) return;
    var inChest = focusChest >= 0 && chest, idx = held >= 0 ? held : focus >= 0 ? focus : state.selected;
    var s = inChest ? chest.slots[focusChest] : state.slots[idx];
    var item = s && BridgeItems.get(s.id);
    if (!item) {
      menuDetailEl.innerHTML = '<div class="bp-d-empty">' + (offerNow ? (isTouch() ? 'Tap' : 'Click') + ' something in your pack to make room.'
        : chest ? (isTouch() ? 'Tap a stack to move it across, into the chest or out of it.' : 'Click a stack to move it across. Shift-click (or right-click) moves just one.')
        : (isTouch() ? 'Tap something to see what it is.' : 'Point at something to see what it is.')) + '</div>' + (note ? '<div class="bp-note">' + esc(note) + '</div>' : '');
      return;
    }
    var typeColor = BridgeItems.typeColor ? BridgeItems.typeColor(item.type) : '#888';
    var effects = BridgeItems.effectsText ? BridgeItems.effectsText(item) : '';
    var arms = typeof BridgeArms !== 'undefined' && BridgeArms.stats(item) ? BridgeArms.card(item, { compare: !inChest }) : '';   // a weapon: its stats
    var usable = typeof item.onUse === 'function';
    var worth = S() && S().worthLine ? S().worthLine(s.id) : '';
    var buyer = !inChest && S() && S().buyerHere ? S().buyerHere() : null, price = buyer ? S().priceAt(buyer, s.id) : 0;
    var acts = [];
    if (!inChest && !offerNow) {
      if (usable && item.type !== 'weapon') acts.push(['use', 'Use']);
      if (s.count > 1 && firstFree(MAX_SLOTS) >= 0) acts.push(['split', 'Split']);
      if (price) acts.push(['sell1', 'Sell 1 · ' + price]);
      if (price && s.count > 1) acts.push(['sellall', 'Sell ' + s.count + ' · ' + price * s.count]);
      acts.push(chest ? ['store', 'Into the chest'] : ['ship', 'Send to the ship']);
      acts.push(['drop', 'Drop']);
      acts.push(['bin', binArmed === idx ? 'Sure? Throw it away' : 'Throw away']);
    }
    menuDetailEl.innerHTML =
      '<div class="bp-d-top"><canvas class="bp-d-icon" width="64" height="64"></canvas><div class="bp-d-id">' +
        '<div class="bp-d-name">' + esc(item.name) + '</div>' +
        '<span class="bp-d-type" style="--tc:' + typeColor + '">' + esc(item.type || 'item') + '</span>' + (s.count > 1 ? '<span class="bp-d-n">×' + s.count + '</span>' : '') +
      '</div></div>' +
      '<div class="bp-d-desc">' + esc(item.desc || '') + '</div>' +
      (arms || (effects ? '<div class="bp-d-fx">' + esc(effects) + '</div>' : '')) +
      (worth ? '<div class="bp-d-worth">' + worth + '</div>' : '') +
      (buyer ? '<div class="bp-d-worth bp-d-buyer">' + (price ? esc(buyer.label) + ' pays <b>' + price + '</b> here.' : esc(buyer.label) + ' doesn\'t buy these.') + '</div>' : '') +
      (acts.length ? '<div class="bp-d-acts">' + acts.map(function (a) {
        return '<button type="button" class="gm-btn gm-btn-sm' + (a[0] === 'bin' && binArmed === idx ? ' bp-danger' : '') + '" data-d="' + a[0] + '">' + esc(a[1]) + '</button>';
      }).join('') + '</div>' : '') +
      (note ? '<div class="bp-note">' + esc(note) + '</div>' : '') +
      '<div class="bp-d-hint">' + esc(held >= 0 ? (isTouch() ? 'Tap' : 'Click') + ' another slot to put it there, or this one to keep it here.'
        : offerNow ? 'This goes to make room - drop it, throw it away or send it to the ship.'
        : chest ? (focusChest >= 0 ? (isTouch() ? 'Tap to take it.' : 'Click to take it. Shift-click takes one.') : (isTouch() ? 'Tap to store it.' : 'Click to store it. Shift-click stores one.'))
        : usable ? (item.type === 'weapon' ? (isTouch() ? 'B to strike - hold it after a swing to charge; ROLL to dodge'
                                                         : 'F or right-click to strike - hold it after a swing to charge. Shift to roll')
                   : (isTouch() ? 'B' : 'F') + ' uses it from the hotbar')
        : (isTouch() ? 'Drag it, or tap it then a slot, to move it.' : 'Drag it, or click it then a slot, to move it.')) + '</div>';
    var g = menuDetailEl.querySelector('.bp-d-icon').getContext('2d');
    g.imageSmoothingEnabled = false;
    item.draw(g, 0, 0, 64);
    menuDetailEl.querySelectorAll('[data-d]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); slotAction(b.getAttribute('data-d'), idx, buyer, price); });
    });
  }

  function refreshMenuStats() {
    if (!menuStatsEl) return;
    var hp = Math.max(0, Math.min(100, state.hp / state.maxHP * 100)), en = Math.max(0, Math.min(100, state.energy / state.maxEnergy * 100));
    menuStatsEl.innerHTML =
      '<div class="bp-bar hp"><span>Health</span><i><b style="width:' + hp + '%"></b></i><em>' + state.hp + '/' + state.maxHP + '</em></div>' +
      '<div class="bp-bar en"><span>Energy</span><i><b style="width:' + en + '%"></b></i><em>' + state.energy + '/' + state.maxEnergy + '</em></div>';
    var help = root && root.querySelector('.bp-help');
    if (help) help.textContent = offerNow ? 'Pick what makes room, then how it goes. Esc leaves the new thing.'
                                       : chest ? 'What you leave in a chest stays there, wherever you go - come back for it.'
                                       : isTouch() ? 'Tap an item to pick it up, then a slot to put it down - or drag it.'
                                       : 'Click an item to pick it up and a slot to put it down, or drag it. 1-0 picks a hotbar slot, F uses it.';
    // the pack's head: how big, what it's all worth to a trader
    var ph = root && root.querySelector('.bp-pack-head .bp-sub');
    if (ph) {
      var worth = 0;
      for (var i = 0; i < cap(); i++) { var s = state.slots[i], it = s && BridgeItems.get(s.id); if (it && it.value > 0) worth += it.value * s.count; }
      ph.textContent = (cap() - MAX_SLOTS) + ' slots' + (worth ? ' · all you carry is worth ' + worth : '');
    }
  }

  // the next pack up, and where to buy it (js/storage.js knows the outfitters)
  function refreshNext() {
    var box = root && root.querySelector('.bp-next');
    if (!box) return;
    var n = S() && S().nextPack ? S().nextPack() : null;
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
    if (offerNow) paintOffer();
  }

  // ---- doing things with what you carry -------------------------------------
  function firstFree(from) { for (var i = from || 0, n = cap(); i < n; i++) if (!state.slots[i]) return i; for (var j = 0; j < (from || 0); j++) if (!state.slots[j]) return j; return -1; }
  function here() { return typeof BridgeCharacter !== 'undefined' ? { x: BridgeCharacter.getX(), y: BridgeCharacter.getY() } : null; }
  function say(t) { note = t; }
  function shipChest() { return S() && S().chest ? S().chest('wayfarer-chest') : null; }
  // let a slot go: dropped at your feet (it waits on the ground till you step away), thrown away, or sent to the ship
  function letGo(i, how) {
    var s = state.slots[i];
    if (!s) return false;
    if (how === 'ship') {
      var C = chest || shipChest();
      if (!C) return false;
      var put = putInto(C.slots, C.size, s.id, s.count);
      if (put < s.count) { if (put) { s.count -= put; C.save(); } say(chest ? 'The chest is full.' : 'The sea chest aboard is full.'); return false; }
      C.save();
      say(itemName(s.id) + (s.count > 1 ? ' ×' + s.count : '') + (chest ? ' put in the chest.' : ' sent to the sea chest aboard the Wayfarer.'));
    } else if (how === 'drop') {
      var p = here();
      if (!p || typeof BridgeLoot === 'undefined') return false;
      BridgeLoot.spawn(p.x, p.y, s.id, s.count, { dropped: true });
      say('Dropped at your feet: ' + itemName(s.id) + (s.count > 1 ? ' ×' + s.count : '') + '. Step away and back to pick it up.');
    } else say(itemName(s.id) + (s.count > 1 ? ' ×' + s.count : '') + ' thrown away.');
    state.slots[i] = null;
    if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(how === 'bin' ? 'crumble' : 'pickup');
    return true;
  }
  function slotAction(a, i, buyer, price) {
    var s = state.slots[i];
    if (!s) return;
    if (a === 'bin' && binArmed !== i) { binArmed = i; note = ''; refreshMenuDetail(); return; }
    binArmed = -1; note = ''; held = -1;
    if (a === 'use') { if (i < MAX_SLOTS) selectSlot(i); useItem(s.id); refresh(); return; }
    if (a === 'split') {
      var j = firstFree(MAX_SLOTS), half = Math.floor(s.count / 2);
      if (j < 0 || half < 1) return;
      s.count -= half; state.slots[j] = { id: s.id, count: half }; focus = j;
      save(); refresh(); return;
    }
    if (a === 'sell1' || a === 'sellall') { quickSell(i, a === 'sell1' ? 1 : s.count, buyer, price); return; }
    if (a === 'store') { storeSlot(i, false); return; }
    if (letGo(i, a === 'bin' ? 'bin' : a)) { save(); if (chest) chest.save(); }
    refresh();
  }
  // selling straight from the pack, to whoever you're standing at (the goods go once you're paid)
  function quickSell(i, n, buyer, price) {
    var s = state.slots[i];
    if (!s || !buyer || !price || typeof BridgeProgression === 'undefined' || !BridgeProgression.awardCoins) return;
    var id = s.id, total = price * n;
    say('Counting it out…'); refreshMenuDetail();
    if (typeof BridgeTreasury !== 'undefined') BridgeTreasury.noteSale([{ id: id, total: total }]);
    BridgeProgression.awardCoins(total, 'sell:' + buyer.label).then(function (bal) {
      if (bal === null || bal === undefined) { say('No way to pay you right now - keep it.'); refresh(); return; }
      removeItem(id, n);
      if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('coin');
      say('Sold ' + n + ' ' + itemName(id) + ' for ' + total + ' coins.');
      refresh();
    }).catch(function () { say('No way to pay you right now - keep it.'); refresh(); });
  }
  // the pack (not the hotbar), sorted by kind or by worth, like with like stacked first
  var KIND = { weapon: 0, tool: 1, key: 2, map: 3, seed: 4, food: 5, drink: 6, potion: 7, gift: 8, material: 9 };
  function sortPack(by) {
    stackAll(true);
    var items = [];
    for (var i = MAX_SLOTS; i < cap(); i++) if (state.slots[i]) items.push(state.slots[i]);
    items.sort(function (a, b) {
      var A = BridgeItems.get(a.id) || {}, B = BridgeItems.get(b.id) || {};
      if (by === 'value') return ((B.value || 0) * b.count - (A.value || 0) * a.count) || A.name.localeCompare(B.name);
      return ((KIND[A.type] == null ? 10 : KIND[A.type]) - (KIND[B.type] == null ? 10 : KIND[B.type])) || String(A.name).localeCompare(String(B.name));
    });
    for (var j = MAX_SLOTS; j < cap(); j++) state.slots[j] = items[j - MAX_SLOTS] || null;
    held = -1; focus = -1;
    say(by === 'value' ? 'Sorted: the most valuable first.' : 'Sorted by kind.');
    save(); refresh();
  }
  // every stack of a thing pulled onto its first slot (hotbar and pack)
  function stackAll(quiet) {
    var first = {}, n = 0;
    for (var i = 0; i < cap(); i++) {
      var s = state.slots[i];
      if (!s || !stackable(s.id)) continue;
      if (first[s.id] == null) { first[s.id] = i; continue; }
      state.slots[first[s.id]].count += s.count; state.slots[i] = null; n++;
    }
    if (quiet === true) return;
    say(n ? 'Stacked like with like.' : 'Nothing to stack.');
    save(); refresh();
  }

  // ---- dragging a stack from slot to slot (the mouse, or a finger held a moment) -------------
  function slotArr(inChest) { return inChest ? chest && chest.slots : state.slots; }
  function startDrag(e, i, inChest) {
    if (e.button !== 0 || offerNow) return;
    var arr = slotArr(inChest);
    if (!arr || !arr[i]) return;
    drag = { i: i, chest: inChest, x0: e.clientX, y0: e.clientY, on: false, touch: e.pointerType !== 'mouse', t0: performance.now(), ghost: null };
    if (drag.touch) drag.timer = setTimeout(function () { if (drag && !drag.on) beginDrag(drag.x0, drag.y0); }, 320);
    document.addEventListener('pointermove', dragMove, true);
    document.addEventListener('pointerup', dragUp, true);
    document.addEventListener('pointercancel', endDrag, true);
    document.addEventListener('touchmove', noScroll, { capture: true, passive: false });
  }
  function noScroll(e) { if (drag && drag.on) e.preventDefault(); }
  function beginDrag(x, y) {
    var arr = slotArr(drag.chest), s = arr && arr[drag.i], it = s && BridgeItems.get(s.id);
    if (!it) return endDrag();
    drag.on = true;
    var g = document.createElement('canvas');
    g.width = g.height = 32; g.className = 'bp-ghost';
    var c = g.getContext('2d'); c.imageSmoothingEnabled = false; it.draw(c, 0, 0, 32);
    document.body.appendChild(g);
    drag.ghost = g;
    root && root.classList.add('bp-dragging');
    moveGhost(x, y);
  }
  function moveGhost(x, y) {
    if (!drag || !drag.ghost) return;
    drag.ghost.style.transform = 'translate(' + (x - 22) + 'px,' + (y - 22) + 'px)';
    var over = slotAt(x, y);
    if (root) root.querySelectorAll('.bp-slot.over').forEach(function (s) { s.classList.remove('over'); });
    if (over) over.classList.add('over');
  }
  function slotAt(x, y) { var el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.bp-slot') : null; }
  function dragMove(e) {
    if (!drag) return;
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 7) return;
      if (drag.touch) { endDrag(); return; }                                    // a finger moving straight away: scrolling, not dragging
      beginDrag(e.clientX, e.clientY);
    }
    e.preventDefault();
    moveGhost(e.clientX, e.clientY);
  }
  function dragUp(e) {
    if (!drag) return;
    var d = drag;
    if (d.on) {
      var to = slotAt(e.clientX, e.clientY);
      dragged = true;
      setTimeout(function () { dragged = false; }, 0);
      if (to && root && root.contains(to)) dropOn(d.chest, d.i, to.dataset.chest === '1', +to.dataset.i);
    }
    endDrag();
  }
  function endDrag() {
    if (!drag) return;
    clearTimeout(drag.timer);
    if (drag.ghost) drag.ghost.remove();
    drag = null;
    if (root) { root.classList.remove('bp-dragging'); root.querySelectorAll('.bp-slot.over').forEach(function (s) { s.classList.remove('over'); }); }
    document.removeEventListener('pointermove', dragMove, true);
    document.removeEventListener('pointerup', dragUp, true);
    document.removeEventListener('pointercancel', endDrag, true);
    document.removeEventListener('touchmove', noScroll, { capture: true, passive: false });
  }
  // a stack dropped on a slot: onto the same thing it stacks, onto something else they swap
  function dropOn(fromChest, i, toChest, j) {
    var A = slotArr(fromChest), B = slotArr(toChest);
    if (!A || !B || (A === B && i === j)) return;
    if (!toChest && j >= cap()) return;
    var a = A[i], b = B[j];
    if (!a) return;
    if (b && b.id === a.id && stackable(a.id)) { b.count += a.count; A[i] = null; }
    else { A[i] = b || null; B[j] = a; }
    held = -1;
    if (toChest) { focusChest = j; focus = -1; } else { focus = j; focusChest = -1; if (j < MAX_SLOTS) state.selected = j; }
    save(); if (chest && (fromChest || toChest)) chest.save();
    if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('pickup');
    refresh();
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

  // ---- no room: offer the new thing, and let you pick what makes way for it ------------------
  // BridgeInventory.offer(id, n, { title, onTake, onDecline }): into the pack if it fits (onTake at once); if not, the
  // Backpack opens with it on top - pick something to drop, throw away or send to the ship and it takes the place, or
  // leave it (onDecline). One at a time; the next waits. BridgeInventory.give(id, n) is the same for rewards you
  // shouldn't lose: true if it went straight in.
  var offers = [];
  function offer(id, n, opts) {
    n = typeof n === 'number' ? n : 1;
    opts = opts || {};
    if (!BridgeItems.get(id)) return false;
    if (api.addItem(id, n)) { if (opts.onTake) opts.onTake(); return true; }
    var o = { id: id, n: n, title: opts.title || 'No room in your pack', onTake: opts.onTake, onDecline: opts.onDecline };
    offers.push(o);
    if (offers.length === 1) present();
    return false;
  }
  function give(id, n, opts) { return offer(id, n, opts); }
  function present() {
    var o = offers[0];
    if (!o) return;
    if (api.addItem(o.id, o.n)) { settle(o, true); return; }                // room appeared meanwhile
    if (typeof BridgeMenu === 'undefined' || (typeof BridgeState !== 'undefined' && BridgeState.getState() !== 'world')) { settle(o, false); return; }
    // something else has the screen (a dialog, a climb, the fishing panel...): ask when it's done
    var busy = (document.documentElement.classList.contains('controls-off') && !BridgeMenu.isOpen()) ||
               document.querySelector('#world-dialog, .world-dialog.visible, #fishing.visible, #fish-reveal, #sea-chart, #catalog-overlay, #locker-overlay, #splice.visible, #trade-panel') ||
               (typeof BridgeWorld !== 'undefined' && BridgeWorld.getMode && BridgeWorld.getMode());
    if (busy) { clearTimeout(present.t); present.t = setTimeout(present, 700); return; }
    BridgeMenu.open('backpack', { offer: o });
    if (!BridgeMenu.isOpen()) settle(o, false);                               // (can't open now: at sea, say)
  }
  function settle(o, took) {
    var k = offers.indexOf(o);
    if (k >= 0) offers.splice(k, 1);
    try { if (took) { if (o.onTake) o.onTake(); } else if (o.onDecline) o.onDecline(); } catch (e) { /* the caller's own trouble */ }
    if (offers.length) setTimeout(present, 120);
  }
  function paintOffer() {
    var box = root && root.querySelector('.bp-offer');
    if (!box || !offerNow) return;
    var it = BridgeItems.get(offerNow.id), pick = focus >= 0 && state.slots[focus], pn = pick ? itemName(pick.id) + (pick.count > 1 ? ' ×' + pick.count : '') : '';
    box.innerHTML = '<div class="bp-offer-top"><canvas class="bp-offer-icon" width="48" height="48"></canvas><div class="bp-offer-id">' +
        '<div class="bp-offer-kick">' + esc(offerNow.title) + '</div>' +
        '<div class="bp-offer-name">' + esc(it ? it.name : offerNow.id) + (offerNow.n > 1 ? ' ×' + offerNow.n : '') + '</div>' +
        '<div class="bp-offer-sub">' + (it && it.value > 0 ? 'Worth ' + it.value + (offerNow.n > 1 ? ' each' : '') + '. ' : '') +
          (pick ? 'Make room by letting the ' + esc(pn) + ' go:' : 'Your pack is full. Pick something below to make room for it.') + '</div></div></div>' +
      '<div class="bp-offer-btns">' +
        '<button type="button" class="gm-btn" data-o="drop"' + (pick ? '' : ' disabled') + '>Drop it here</button>' +
        '<button type="button" class="gm-btn" data-o="ship"' + (pick ? '' : ' disabled') + '>Send it to the ship</button>' +
        '<button type="button" class="gm-btn" data-o="bin"' + (pick ? '' : ' disabled') + '>Throw it away</button>' +
        '<button type="button" class="gm-btn bp-leave" data-o="leave">Leave the ' + esc(it ? it.name : 'new thing') + '</button></div>';
    var g = box.querySelector('.bp-offer-icon').getContext('2d');
    g.imageSmoothingEnabled = false;
    if (it) it.draw(g, 0, 0, 48);
    box.querySelectorAll('[data-o]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); resolveOffer(b.getAttribute('data-o')); });
    });
  }
  function resolveOffer(how) {
    var o = offerNow;
    if (!o) return;
    if (how === 'leave') { offerNow = null; settle(o, false); if (typeof BridgeMenu !== 'undefined') BridgeMenu.close(); return; }
    if (focus < 0 || !state.slots[focus]) return;
    var gone = state.slots[focus];
    if (!letGo(focus, how)) { refreshMenu(); return; }
    if (!api.addItem(o.id, o.n)) { state.slots[focus] = gone; save(); refreshMenu(); return; }   // (it can't not fit now, but never lose the old thing)
    save();
    offerNow = null;
    var msg = note;
    settle(o, true);
    if (typeof BridgeMenu !== 'undefined') BridgeMenu.close();
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('Made room', itemName(o.id) + (o.n > 1 ? ' ×' + o.n : '') + ' is in your pack', msg, false);
  }

  // keys while the Backpack is the menu's page (js/menu.js hands them over first)
  function menuKey(e) {
    if (offerNow) {
      if (e.key === 'Escape') { resolveOffer('leave'); return true; }
      return false;
    }
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
    offer: offer, give: give, offering: function () { return offers.length > 0; }, sortPack: sortPack, stackAll: stackAll,
    tick: tick,
    loadRemote: loadRemote
  };
  return api;
})();
