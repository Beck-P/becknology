/**
 * BridgeMenu — the game menu: one window with tabs across the top, like Stardew's.
 *
 *   Backpack    the hotbar and pack (js/inventory.js mounts its screen here), a chest beside it when one is open
 *   Map         where you are, drawn small with what's in it, and every place you know (js/map.js)
 *   Journal     what to do next, your quests, the log and the rest (js/quests.js)
 *   Fish        every fish there is: the ones you've caught, the rest as shadows (js/codex.js)
 *   Collection  the codex's sets (js/codex.js)
 *
 * Keys: Tab opens it where you left it, I the Backpack, J the Journal, N the Map; the same key again (or Esc)
 * closes it, Tab / Shift-Tab step through the tabs while it's open. The Menu pill (top left, under the way out)
 * opens it on touch. It's dressed for the world you're in — parchment in Lumar, neon in Arcadia, holo aboard —
 * the same as the world's dialogs.
 *
 * A tab is a page registered by its module: BridgeMenu.page(id, { render(el, opts), key(e) → handled, leave() }).
 *   BridgeMenu.open(tab, opts) / close() / toggle(tab) / isOpen() / current() / refresh() / pill()
 */
var BridgeMenu = (function () {
  var TABS = [
    { id: 'backpack', name: 'Backpack', key: 'I' },
    { id: 'map', name: 'Map', key: 'N' },
    { id: 'journal', name: 'Journal', key: 'J' },
    { id: 'fish', name: 'Fish' },
    { id: 'collection', name: 'Collection' }
  ];
  var KEYTAB = { i: 'backpack', n: 'map', j: 'journal' };
  var pages = {};
  var el = null, pageEl = null, cur = null, last = 'journal', curOpts = {}, wasOff = false, pillEl = null;

  function page(id, p) { pages[id] = p; if (cur === id && el) render(); }

  // ---- the look: the world's dialog theme ------------------------------------------------------------------------
  function theme() {
    var id = (typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId && BridgeWorld.getWorldId()) || '';
    var w = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld ? BridgeWorld.getWorld() : null, ts = (w && w.tileset) || '';
    if (/^lumar/.test(id) || ts === 'lumar' || ts === 'tavern' || ts === 'cave' || ts === 'tower') return 'parchment';
    if (ts === 'arcadia' || /^(arcadia|cyber|chrome|junk|tech|null)/.test(id)) return 'neon';
    if (ts === 'enigma' || /^enigma/.test(id)) return 'crt';
    if (ts === 'singularity' || id === 'singularity') return 'void';
    if (ts === 'verdance' || /^verdance/.test(id)) return 'meadow';
    if (ts === 'hoarfell' || /^hoarfell/.test(id)) return 'frost';
    return 'holo';
  }

  // ---- the tab icons: 16-unit pixel art like everything else ----------------------------------------------------
  var ART = {
    backpack: { pal: { k: '#2a1a0e', b: '#6a4220', B: '#a8702e', h: '#c8904a', y: '#e0c060' }, rows: [
      '................', '......kkkk......', '.....k.kk.k.....', '....kkkkkkkk....', '...kbBBBBBBbk...', '..kbBhhhhhhBbk..',
      '..kbBkkkkkkBbk..', '..kbBkyyyykBbk..', '..kbBkkkkkkBbk..', '..kbBBBBBBBBbk..', '..kbBBkkkkBBbk..', '..kbBBkyykBBbk..',
      '..kbBBkkkkBBbk..', '..kbbbbbbbbbbk..', '...kkkkkkkkkk...', '................'] },
    map: { pal: { k: '#2a1a0e', p: '#e8d8a8', q: '#c8b480', g: '#5a9a5a', w: '#4a7ab0', r: '#c03020', d: '#7a5a30' }, rows: [
      '................', '..kkkkkkkkkkkk..', '..kpppkqqqkppk..', '..kpwwkqgqkppk..', '..kpwpkqggkprk..', '..kppdkqqdkrpk..',
      '..kpdpkqdqkrrk..', '..kdppkdqqkprk..', '..kppdkqqdkppk..', '..kpggkqqqkpwk..', '..kgggkqwwkwwk..', '..kppgkqqqkppk..',
      '..kkkkkkkkkkkk..', '................', '................', '................'] },
    journal: { pal: { k: '#2a140e', R: '#8a2a18', r: '#b84a2a', y: '#e0c060', p: '#f0e6c8' }, rows: [
      '................', '...kkkkkkkkkk...', '..kRRRRRRRRRRk..', '..kRrRRRRRRRpk..', '..kRrRyyyyyRpk..', '..kRrRyRRRyRpk..',
      '..kRrRyyyyyRpk..', '..kRrRRRRRRRpk..', '..kRrRRRRRRRpk..', '..kRrRRRRRRRpk..', '..kRrRRRRRRRpk..', '..kRRRRRRRRRpk..',
      '..kkkkkkkkkkpk..', '...kpppppppppk..', '....kkkkkkkkk...', '................'] },
    fish: { pal: { k: '#1a2430', b: '#4a6a8a', s: '#a8c0d8', w: '#e8f0f8', e: '#101820' }, rows: [
      '................', '................', '................', '......kkkk......', '....kkbbbbkk..kk', '...kbbbbbbbbkkbk',
      '..kbbbbbbbbbbbbk', '.kbbebsssbbbbbk.', '.kbsssssssssbbk.', '..kssswwwwsssbbk', '...kkswwwwskkkbk', '.....kkkkkk...kk',
      '................', '................', '................', '................'] },
    collection: { pal: { k: '#1a1430', d: '#3a50b0', m: '#5a80e8', l: '#a8c8ff', w: '#f0f8ff', y: '#e0c060' }, rows: [
      '................', '.....kkkkkk.....', '....kllwwllk....', '...klmmllmmlk...', '..kkkkkkkkkkkk..', '..kdmmlwwlmmdk..',
      '...kdmmllmmdk...', '....kdmmmmdk....', '.....kdmmdk.....', '......kddk......', '.......kk.......', '................',
      '...y.......y....', '................', '................', '................'] }
  };
  function icon(id, scale) {
    var A = ART[id], cv = document.createElement('canvas');
    cv.width = cv.height = 16 * scale;
    var g = cv.getContext('2d');
    A.rows.forEach(function (row, y) {
      for (var x = 0; x < 16; x++) { var c = A.pal[row[x]]; if (c) { g.fillStyle = c; g.fillRect(x * scale, y * scale, scale, scale); } }
    });
    return cv;
  }

  // ---- the window ------------------------------------------------------------------------------------------------
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function touch() { return document.documentElement.classList.contains('touch'); }

  function build() {
    el = document.createElement('div');
    el.id = 'game-menu';
    el.innerHTML = '<div class="gm-card"><div class="gm-tabs" role="tablist"></div><div class="gm-page"></div>' +
      '<div class="gm-foot"><span class="gm-keys"></span><button class="gm-close" type="button"><span class="ip-key">Esc</span>Close</button></div></div>';
    var tabs = el.querySelector('.gm-tabs');
    TABS.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'gm-tab'; b.setAttribute('role', 'tab'); b.dataset.tab = t.id;
      b.appendChild(icon(t.id, 2));
      var s = document.createElement('span'); s.className = 'gm-tab-name'; s.textContent = t.name; b.appendChild(s);
      if (t.key) { var k = document.createElement('span'); k.className = 'ip-key gm-tab-key'; k.textContent = t.key; b.appendChild(k); }
      b.addEventListener('click', function (e) { e.stopPropagation(); show(t.id); });
      tabs.appendChild(b);
    });
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'gm-x'; x.setAttribute('aria-label', 'Close'); x.innerHTML = '&#x2715;';
    x.addEventListener('click', function (e) { e.stopPropagation(); close(); });
    tabs.appendChild(x);
    el.querySelector('.gm-close').addEventListener('click', function (e) { e.stopPropagation(); close(); });
    el.addEventListener('click', function (e) { if (e.target === el) close(); });
    pageEl = el.querySelector('.gm-page');
    document.body.appendChild(el);
  }

  function open(tab, opts) {
    if (typeof BridgeState !== 'undefined' && BridgeState.getState && BridgeState.getState() !== 'world') return;
    tab = tab || last || 'journal';
    if (!el) build();
    var fresh = !isOpen();
    el.className = 'gm-' + theme() + (touch() ? ' gm-touch' : '') + ' open' + (fresh ? '' : ' in');
    if (fresh) {
      wasOff = document.documentElement.classList.contains('controls-off');
      if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
      window.addEventListener('keydown', onKey, true);
      window.addEventListener('resize', onResize);
      if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('open');
      document.documentElement.classList.add('menu-open');
    }
    show(tab, opts, true);
    requestAnimationFrame(function () { if (el && el.classList.contains('open')) el.classList.add('in'); });
  }

  function show(tab, opts, force) {
    if (!el) return;
    if (!pages[tab]) tab = 'journal';
    if (cur && cur !== tab && pages[cur] && pages[cur].leave) pages[cur].leave();
    if (cur !== tab && !force && typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('blip');
    cur = tab; last = tab === 'backpack' && opts && opts.chest ? last : tab;
    curOpts = opts || {};
    el.querySelectorAll('.gm-tab').forEach(function (b) { var on = b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    el.dataset.tab = tab;
    render();
  }

  function render() {
    if (!el || !cur) return;
    pageEl.innerHTML = '';
    pageEl.scrollTop = 0;
    var P = pages[cur];
    if (P && P.render) P.render(pageEl, curOpts);
    var keys = touch() ? '' : 'Tab next tab · I backpack · N map · J journal';
    el.querySelector('.gm-keys').textContent = keys;
  }

  function close() {
    if (!isOpen()) return;
    if (cur && pages[cur] && pages[cur].leave) pages[cur].leave();
    el.classList.remove('open', 'in');
    pageEl.innerHTML = '';
    cur = null; curOpts = {};
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onResize);
    document.documentElement.classList.remove('menu-open');
    if (!wasOff && typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
    if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('close');
  }

  function isOpen() { return !!(el && el.classList.contains('open') && cur); }
  function toggle(tab) {
    if (isOpen() && (!tab || cur === tab)) close();
    else if (isOpen()) show(tab);
    else open(tab);
  }

  var rz = 0;
  function onResize() { clearTimeout(rz); rz = setTimeout(function () { if (isOpen() && pages[cur] && pages[cur].resize) pages[cur].resize(); }, 120); }

  // every key goes to the menu while it's open (the world's own keys wait), the tab first
  function onKey(e) {
    if (!isOpen()) return;
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
    if (typing && e.key !== 'Escape') return;
    var k = e.key, P = pages[cur], done = function () { e.preventDefault(); e.stopImmediatePropagation(); };
    if (document.querySelector('.world-dialog.visible')) return;        // a dialog over the menu has the keys
    if (P && P.key && P.key(e)) return done();
    if (k === 'Escape') { done(); close(); return; }
    if (k === 'Tab') {
      done();
      var i = TABS.map(function (x) { return x.id; }).indexOf(cur);
      show(TABS[(i + (e.shiftKey ? TABS.length - 1 : 1)) % TABS.length].id);
      return;
    }
    var want = KEYTAB[String(k).toLowerCase()];
    if (want && !e.ctrlKey && !e.metaKey && !e.altKey) { done(); if (want === cur && !curOpts.chest) close(); else show(want); return; }
    if (k === 'm' || k === 'M') return;                                  // the sound still toggles
    if (k.length === 1 || /^(Arrow|Enter|Page|Home|End)/.test(k) || k === ' ') done();   // nothing reaches the world underneath
  }

  // the keys that open it from the world (I and J come through js/controls.js → BridgeInventory / BridgeQuests)
  function worldKeys(e) {
    if (isOpen() || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    var k = e.key, t = e.target;
    if (k !== 'Tab' && k !== 'n' && k !== 'N') return;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    var root = document.documentElement;
    if (typeof BridgeState === 'undefined' || BridgeState.getState() !== 'world') return;
    if (root.classList.contains('controls-off') || root.classList.contains('home-editing') || root.classList.contains('keys-mode')) return;
    if (typeof BridgeWorld !== 'undefined' && BridgeWorld.getMode && BridgeWorld.getMode()) return;   // skiing, climbing...
    e.preventDefault(); e.stopPropagation();
    open(k === 'Tab' ? last : 'map');
  }

  // ---- the Menu pill (it was the Journal pill; js/quests.js pings it when something's logged) --------------------
  function init() {
    window.addEventListener('keydown', worldKeys, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return { open: open, close: close, toggle: toggle, show: show, isOpen: isOpen, page: page, icon: icon,
           current: function () { return isOpen() ? cur : null; }, options: function () { return curOpts; },
           refresh: function () { if (isOpen()) render(); }, theme: theme, TABS: TABS };
})();
