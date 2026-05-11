/**
 * BridgeCatalog — shop UI used by the Quarters Catalog Terminal and any
 * other in-world merchant. Supports BUY (per-shop inventory) and SELL
 * (everything the pilot owns, anywhere).
 *
 * Usage:
 *   BridgeCatalog.show()                       // default shop = 'quarters_catalog'
 *   BridgeCatalog.show('lumar_dockside')       // themed merchant
 *   BridgeCatalog.getItemByKey('houseplant')   // master item lookup
 *   BridgeCatalog.getCatalog('quarters_catalog')
 *
 * Items live in the master ITEMS registry. SHOPS map shop key → list of
 * item keys that shop sells. An item can appear in only one shop.
 *
 * Sell price = floor(buy_price / 2). Selling works from the SELL tab in
 * any shop UI — sells are universal, not shop-specific.
 */
var BridgeCatalog = (function () {

  var SELL_RATIO = 0.5;
  var DEFAULT_SHOP = 'quarters_catalog';

  // ---- Master item registry ----
  var ITEMS = {
    // Quarters catalog (the original 6)
    houseplant:    { slot: 'plant',  name: 'Houseplant',    price: 50,  preview: previewHouseplant },
    floor_lamp:    { slot: 'lamp',   name: 'Floor Lamp',    price: 75,  preview: previewLamp },
    crystal_lamp:  { slot: 'lamp',   name: 'Crystal Lamp',  price: 150, preview: previewCrystalLamp },
    holo_poster:   { slot: 'poster', name: 'Holo Poster',   price: 200, preview: previewPoster },
    bonsai:        { slot: 'plant',  name: 'Bonsai Tree',   price: 350, preview: previewBonsai },
    nebula_tank:   { slot: 'tank',   name: 'Nebula Tank',   price: 500, preview: previewTank },
    // Lumar dockside merchant — sea/dock theme
    driftwood_lamp: { slot: 'lamp',  name: 'Driftwood Lamp', price: 120, preview: previewDriftwoodLamp },
    glass_float:    { slot: 'shelf', name: 'Glass Float',    price: 180, preview: previewGlassFloat },
    kelp_canister:  { slot: 'shelf', name: 'Kelp Canister',  price: 250, preview: previewKelpCanister },
    brass_compass:  { slot: 'shelf', name: 'Brass Compass',  price: 400, preview: previewBrassCompass },
    // ArcadiaMart — cyberpunk / arcade vibe
    cosmic_soda:    { slot: 'shelf', name: 'Cosmic Soda',    price: 90,  preview: previewCosmicSoda },
    neon_cactus:    { slot: 'plant', name: 'Neon Cactus',    price: 150, preview: previewNeonCactus },
    arcade_marquee: { slot: 'poster',name: 'Arcade Marquee', price: 220, preview: previewArcadeMarquee },
    retro_crt:      { slot: 'tank',  name: 'Retro CRT',      price: 450, preview: previewRetroCRT }
  };

  var SHOPS = {
    quarters_catalog: {
      title: 'CATALOG TERMINAL',
      subtitle: 'DECOR INVENTORY',
      items: ['houseplant', 'floor_lamp', 'crystal_lamp', 'holo_poster', 'bonsai', 'nebula_tank']
    },
    lumar_dockside: {
      title: "DOCKSIDE MERCHANT",
      subtitle: 'CURIOS FROM THE TIDE',
      items: ['driftwood_lamp', 'glass_float', 'kelp_canister', 'brass_compass']
    },
    arcadia_mart: {
      title: 'ARCADIAMART CASHIER',
      subtitle: 'NEON & NOSTALGIA',
      items: ['cosmic_soda', 'neon_cactus', 'arcade_marquee', 'retro_crt']
    }
  };

  function getItemByKey(key) { return ITEMS[key] ? Object.assign({ key: key }, ITEMS[key]) : null; }
  function getCatalog(shopKey) {
    var s = SHOPS[shopKey || DEFAULT_SHOP];
    if (!s) return [];
    return s.items.map(function (k) { return getItemByKey(k); }).filter(Boolean);
  }
  function getShopMeta(shopKey) { return SHOPS[shopKey] || SHOPS[DEFAULT_SHOP]; }
  function sellPriceOf(item) { return Math.max(1, Math.floor((item.price || 0) * SELL_RATIO)); }

  // ---- Open / close ----
  var overlayEl = null;
  var open = false;
  var currentShop = DEFAULT_SHOP;
  var currentTab = 'buy'; // 'buy' | 'sell'

  function show(shopKey) {
    if (open) return;
    open = true;
    currentShop = shopKey || DEFAULT_SHOP;
    currentTab = 'buy';
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();

    overlayEl = document.createElement('div');
    overlayEl.id = 'catalog-overlay';
    overlayEl.style.cssText =
      'position:fixed;inset:0;z-index:200;' +
      'background:rgba(4,8,14,0.78);' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-family:"Courier New",Consolas,monospace;color:#e0e0e0;';

    overlayEl.innerHTML = renderShellHTML();
    document.body.appendChild(overlayEl);

    bindHandlers();
    refreshView();
  }

  function hide() {
    if (!open) return;
    open = false;
    if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
    overlayEl = null;
    document.removeEventListener('keydown', escHandler);
    if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
  }

  function renderShellHTML() {
    var meta = getShopMeta(currentShop);
    var html = '<div style="' +
      'width:min(720px,92vw);max-height:88vh;overflow:hidden;display:flex;flex-direction:column;' +
      'background:linear-gradient(180deg,rgba(20,30,46,0.96),rgba(10,18,28,0.96));' +
      'border:1px solid rgba(64,200,216,0.5);border-radius:8px;' +
      'box-shadow:0 0 32px rgba(64,200,216,0.25),inset 0 0 18px rgba(64,200,216,0.06);">';

    html += '<div style="padding:18px 24px;border-bottom:1px solid rgba(64,200,216,0.25);' +
            'display:flex;justify-content:space-between;align-items:center;">' +
      '<div>' +
        '<div style="font-size:11px;letter-spacing:5px;color:rgba(64,200,216,0.7);">' + escapeHtml(meta.title) + '</div>' +
        '<div style="font-size:18px;letter-spacing:3px;color:#80e0e8;margin-top:4px;">' + escapeHtml(meta.subtitle) + '</div>' +
      '</div>' +
      '<div id="catalog-balance" style="' +
        'font-size:18px;letter-spacing:3px;color:#ffe080;text-align:right;">🪙 …</div>' +
    '</div>';

    // Tab strip — BUY | SELL
    html += '<div id="catalog-tabs" style="' +
      'display:flex;border-bottom:1px solid rgba(64,200,216,0.25);">' +
      tabBtn('buy',  'BUY')  +
      tabBtn('sell', 'SELL') +
    '</div>';

    // Content body
    html += '<div id="catalog-body" style="padding:18px 24px;overflow-y:auto;flex:1;">' +
      '<div style="text-align:center;color:#666;font-size:11px;letter-spacing:2px;padding:24px;">Loading…</div>' +
    '</div>';

    html += '<div style="padding:12px 24px;border-top:1px solid rgba(64,200,216,0.25);' +
            'display:flex;justify-content:space-between;align-items:center;font-size:10px;' +
            'letter-spacing:3px;color:#777;">' +
      '<span>ESC TO CLOSE</span>' +
      '<span id="catalog-feedback" style="color:#80e0e8;"></span>' +
    '</div>';

    html += '</div>';
    return html;
  }

  function tabBtn(key, label) {
    var active = (currentTab === key);
    return '<div class="catalog-tab" data-tab="' + key + '" style="' +
      'flex:1;padding:12px 18px;text-align:center;cursor:pointer;' +
      'font-size:12px;letter-spacing:4px;' +
      'color:' + (active ? '#80e0e8' : '#666') + ';' +
      'border-bottom:2px solid ' + (active ? '#80e0e8' : 'transparent') + ';' +
      'background:' + (active ? 'rgba(64,200,216,0.06)' : 'transparent') + ';' +
      'transition:color 0.15s, background 0.15s;">' +
      escapeHtml(label) +
    '</div>';
  }

  // ---- View refresh: re-render the body for the current tab ----
  function refreshView() {
    if (!overlayEl) return;

    // Refresh tabs (active state)
    var tabBar = document.getElementById('catalog-tabs');
    if (tabBar) tabBar.innerHTML = tabBtn('buy', 'BUY') + tabBtn('sell', 'SELL');
    bindTabHandlers();

    // Body
    if (currentTab === 'buy') refreshBuyView();
    else refreshSellView();

    // Balance + feedback persistence
    if (typeof BridgeProgression !== 'undefined') {
      BridgeProgression.getBalance().then(function (b) {
        var el = document.getElementById('catalog-balance');
        if (el) el.textContent = '🪙 ' + (b == null ? 0 : b);
      });
    }
  }

  // ---- BUY view ----
  function refreshBuyView() {
    var body = document.getElementById('catalog-body');
    if (!body) return;
    var items = getCatalog(currentShop);
    body.style.padding = '20px 24px';
    body.innerHTML = '<div id="buy-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
      items.map(buyCardHTML).join('') +
    '</div>';

    paintPreviews(body, items);
    bindBuyCards();

    if (typeof BridgeProgression === 'undefined') return;
    Promise.all([BridgeProgression.getDecor(), BridgeProgression.getLocker()])
      .then(function (results) {
        var decor = results[0] || {};
        var lockerKeys = results[1] || [];
        var inLocker = {};
        for (var i = 0; i < lockerKeys.length; i++) inLocker[lockerKeys[i]] = true;

        var actions = body.querySelectorAll('.catalog-action');
        for (var i = 0; i < actions.length; i++) {
          var key = actions[i].getAttribute('data-key');
          var item = getItemByKey(key);
          if (!item) continue;
          var card = actions[i].closest('.catalog-card');
          if (card) { card.style.borderColor = ''; card.style.background = ''; }
          var inSlot = decor[item.slot] === item.key;
          var stored = !!inLocker[item.key];
          if (inSlot) {
            actions[i].textContent = '✓ ON DISPLAY';
            actions[i].style.color = '#80e088';
            if (card) { card.style.borderColor = 'rgba(120,224,136,0.55)'; card.style.background = 'rgba(40,90,55,0.18)'; }
          } else if (stored) {
            actions[i].textContent = '✓ IN LOCKER';
            actions[i].style.color = '#80e0e8';
            if (card) { card.style.borderColor = 'rgba(64,200,216,0.45)'; card.style.background = 'rgba(40,80,90,0.18)'; }
          } else if (decor[item.slot]) {
            actions[i].textContent = '🪙 ' + item.price + ' · → LOCKER';
            actions[i].style.color = '#ffe080';
          } else {
            actions[i].textContent = '🪙 ' + item.price;
            actions[i].style.color = '#ffe080';
          }
        }
      });
  }

  function buyCardHTML(item) {
    return '<div class="catalog-card" data-key="' + item.key + '" style="' +
      'background:rgba(0,0,0,0.35);border:1px solid rgba(64,200,216,0.2);' +
      'border-radius:6px;padding:12px;display:grid;grid-template-columns:64px 1fr;gap:12px;' +
      'transition:background 0.15s, border-color 0.15s;cursor:pointer;align-items:center;">' +
      '<canvas class="catalog-preview" data-key="' + item.key + '" width="64" height="64" ' +
        'style="display:block;width:64px;height:64px;background:rgba(60,40,90,0.18);border-radius:4px;image-rendering:pixelated;"></canvas>' +
      '<div>' +
        '<div style="font-size:13px;letter-spacing:2px;color:#e0e0e0;">' + escapeHtml(item.name.toUpperCase()) + '</div>' +
        '<div style="font-size:10px;letter-spacing:2px;color:#888;margin-top:2px;">SLOT: ' + escapeHtml(item.slot.toUpperCase()) + '</div>' +
        '<div class="catalog-action" data-key="' + item.key + '" style="margin-top:8px;font-size:11px;letter-spacing:3px;color:#ffe080;">🪙 ' + item.price + '</div>' +
      '</div>' +
    '</div>';
  }

  function bindBuyCards() {
    var cards = overlayEl.querySelectorAll('.catalog-card');
    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        var key = card.getAttribute('data-key');
        card.addEventListener('mouseenter', function () {
          card.style.background = 'rgba(64,200,216,0.16)';
          card.style.borderColor = 'rgba(64,200,216,0.55)';
        });
        card.addEventListener('mouseleave', function () {
          card.style.background = ''; card.style.borderColor = '';
          refreshBuyView(); // re-apply owned styling
        });
        card.addEventListener('click', function () { attemptBuy(key); });
      })(cards[i]);
    }
  }

  function attemptBuy(key) {
    var item = getItemByKey(key);
    if (!item) return;
    if (typeof BridgeProgression === 'undefined') return;
    setFeedback('PROCESSING…', '#80e0e8');
    BridgeProgression.purchaseDecor(item.slot, item.key, item.price).then(function (res) {
      if (res.ok) {
        var dest = res.destination === 'locker' ? '→ LOCKER' : '→ ON DISPLAY';
        var color = res.destination === 'locker' ? '#80e0e8' : '#80e088';
        setFeedback('PURCHASED · ' + item.name.toUpperCase() + ' ' + dest, color);
        refreshView();
        if (typeof BridgeQuarters !== 'undefined' && BridgeQuarters.refreshDecor) {
          BridgeQuarters.refreshDecor();
        }
        BridgeProgression.recordAchievement('settled_in', 50, { first: item.key });
      } else if (res.reason === 'insufficient') {
        setFeedback('NOT ENOUGH COINS', '#e88860');
      } else if (res.reason === 'already_owned') {
        setFeedback('ALREADY OWNED', '#e8c060');
        refreshView();
      } else {
        setFeedback('PURCHASE FAILED', '#e88860');
      }
    });
  }

  // ---- SELL view ----
  function refreshSellView() {
    var body = document.getElementById('catalog-body');
    if (!body) return;
    if (typeof BridgeProgression === 'undefined') {
      body.innerHTML = '<div style="text-align:center;color:#666;padding:24px;">Progression unavailable.</div>';
      return;
    }

    body.innerHTML = '<div style="text-align:center;color:#666;font-size:11px;letter-spacing:2px;padding:24px;">Loading…</div>';
    Promise.all([BridgeProgression.getDecor(), BridgeProgression.getLocker()])
      .then(function (results) {
        var decor = results[0] || {};
        var lockerKeys = results[1] || [];
        var owned = [];
        // From slots
        var slotKeys = Object.keys(decor);
        for (var i = 0; i < slotKeys.length; i++) {
          var item = getItemByKey(decor[slotKeys[i]]);
          if (item) owned.push({ item: item, location: 'slot:' + slotKeys[i] });
        }
        // From locker
        for (var j = 0; j < lockerKeys.length; j++) {
          var item2 = getItemByKey(lockerKeys[j]);
          if (item2) owned.push({ item: item2, location: 'locker' });
        }

        if (owned.length === 0) {
          body.innerHTML = '<div style="text-align:center;color:#666;font-size:11px;letter-spacing:2px;padding:32px;">' +
            'You don\'t own anything yet. Buy something first to be able to sell it.</div>';
          return;
        }

        body.innerHTML =
          '<div style="font-size:10px;letter-spacing:3px;color:rgba(64,200,216,0.7);margin-bottom:10px;">' +
            'SELL FOR ' + Math.round(SELL_RATIO * 100) + '% OF BUY PRICE' +
          '</div>' +
          '<div id="sell-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
            owned.map(sellCardHTML).join('') +
          '</div>';

        paintPreviews(body, owned.map(function (o) { return o.item; }));
        bindSellButtons();
      });
  }

  function sellCardHTML(entry) {
    var item = entry.item;
    var price = sellPriceOf(item);
    var locText = entry.location === 'locker'
      ? 'IN LOCKER'
      : 'ON DISPLAY · ' + entry.location.replace('slot:', '').toUpperCase();
    return '<div class="sell-card" data-key="' + item.key + '" style="' +
      'background:rgba(0,0,0,0.35);border:1px solid rgba(64,200,216,0.2);' +
      'border-radius:6px;padding:12px;display:grid;grid-template-columns:48px 1fr auto;gap:12px;align-items:center;">' +
      '<canvas class="catalog-preview" data-key="' + item.key + '" width="48" height="48" ' +
        'style="display:block;width:48px;height:48px;background:rgba(60,40,90,0.18);border-radius:4px;image-rendering:pixelated;"></canvas>' +
      '<div>' +
        '<div style="font-size:12px;letter-spacing:2px;color:#e0e0e0;">' + escapeHtml(item.name.toUpperCase()) + '</div>' +
        '<div style="font-size:9px;letter-spacing:2px;color:#888;margin-top:2px;">' + escapeHtml(locText) + '</div>' +
      '</div>' +
      '<button class="sell-btn" data-key="' + item.key + '" data-price="' + price + '" style="' +
        'padding:8px 14px;background:transparent;border:1px solid #ffe080;color:#ffe080;' +
        'font-family:inherit;font-size:11px;letter-spacing:3px;cursor:pointer;border-radius:4px;' +
        'transition:background 0.12s, color 0.12s;">SELL · 🪙 ' + price +
      '</button>' +
    '</div>';
  }

  function bindSellButtons() {
    var btns = overlayEl.querySelectorAll('.sell-btn');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener('mouseenter', function () { btn.style.background = 'rgba(255,224,128,0.18)'; });
        btn.addEventListener('mouseleave', function () { btn.style.background = 'transparent'; });
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-key');
          var price = parseInt(btn.getAttribute('data-price'), 10);
          attemptSell(key, price);
        });
      })(btns[i]);
    }
  }

  function attemptSell(itemKey, price) {
    var item = getItemByKey(itemKey);
    if (!item) return;
    setFeedback('SELLING…', '#80e0e8');
    BridgeProgression.sellItem(itemKey, price).then(function (res) {
      if (res && res.ok) {
        setFeedback('SOLD · ' + item.name.toUpperCase() + ' (+ 🪙 ' + price + ')', '#ffe080');
        refreshView();
        if (typeof BridgeQuarters !== 'undefined' && BridgeQuarters.refreshDecor) {
          BridgeQuarters.refreshDecor();
        }
      } else if (res && res.reason === 'not_owned') {
        setFeedback('YOU DON\'T OWN THAT', '#e88860');
        refreshView();
      } else {
        setFeedback('SELL FAILED', '#e88860');
      }
    });
  }

  // ---- Preview painters ----
  function paintPreviews(container, items) {
    var canvases = container.querySelectorAll('canvas.catalog-preview');
    for (var i = 0; i < canvases.length; i++) {
      var key = canvases[i].getAttribute('data-key');
      var item = getItemByKey(key);
      if (!item) continue;
      var ctx = canvases[i].getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvases[i].width, canvases[i].height);
      // Previews are designed for 64; if the canvas is 48, scale down.
      if (canvases[i].width === 64) {
        item.preview(ctx);
      } else {
        var tmp = document.createElement('canvas');
        tmp.width = 64; tmp.height = 64;
        var tctx = tmp.getContext('2d');
        tctx.imageSmoothingEnabled = false;
        item.preview(tctx);
        ctx.drawImage(tmp, 0, 0, canvases[i].width, canvases[i].height);
      }
    }
  }

  function previewHouseplant(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    ctx.fillStyle = '#7a4818'; ctx.fillRect(5*u, 11*u, 6*u, 4*u);
    ctx.fillStyle = '#a06820'; ctx.fillRect(5*u, 11*u, 6*u, u);
    ctx.fillStyle = '#3a8038'; ctx.fillRect(7*u, 4*u, 2*u, 7*u);
    ctx.fillStyle = '#5aa050'; ctx.fillRect(5*u, 6*u, 2*u, 4*u); ctx.fillRect(9*u, 6*u, 2*u, 4*u);
    ctx.fillRect(4*u, 8*u, 2*u, 2*u); ctx.fillRect(10*u, 8*u, 2*u, 2*u);
  }
  function previewLamp(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    ctx.fillStyle = '#3a2820'; ctx.fillRect(5*u, 13*u, 6*u, 2*u);
    ctx.fillStyle = '#5a3a28'; ctx.fillRect(7*u, 5*u, 2*u, 8*u);
    ctx.fillStyle = '#a08040'; ctx.fillRect(4*u, 2*u, 8*u, 3*u);
    ctx.fillStyle = '#e0c060'; ctx.fillRect(4*u, 4*u, 8*u, u);
    ctx.fillStyle = 'rgba(255,224,128,0.45)'; ctx.fillRect(2*u, 5*u, 12*u, 2*u);
  }
  function previewCrystalLamp(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    ctx.fillStyle = '#1a1430'; ctx.fillRect(5*u, 13*u, 6*u, 2*u);
    ctx.fillStyle = '#3a2858'; ctx.fillRect(5*u, 13*u, 6*u, u);
    var grad = ctx.createLinearGradient(0, 4*u, 0, 13*u);
    grad.addColorStop(0, '#c0a0f0'); grad.addColorStop(1, '#503090');
    ctx.fillStyle = grad; ctx.fillRect(6*u, 4*u, 4*u, 9*u);
    ctx.fillStyle = '#e0c0f8'; ctx.fillRect(6*u, 4*u, u, 9*u);
    ctx.fillStyle = 'rgba(192,144,232,0.45)'; ctx.fillRect(2*u, 2*u, 12*u, 4*u);
  }
  function previewPoster(ctx) {
    var w = ctx.canvas.width, h = ctx.canvas.height, u = w / 16;
    ctx.fillStyle = '#3a2820'; ctx.fillRect(2*u, 2*u, 12*u, 12*u);
    var g = ctx.createLinearGradient(3*u, 3*u, 13*u, 13*u);
    g.addColorStop(0, '#6040a0'); g.addColorStop(1, '#80e0e8');
    ctx.fillStyle = g; ctx.fillRect(3*u, 3*u, 10*u, 10*u);
    ctx.fillStyle = '#ffe080'; ctx.fillRect(7*u, 5*u, 2*u, 6*u); ctx.fillRect(5*u, 7*u, 6*u, 2*u);
  }
  function previewBonsai(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    ctx.fillStyle = '#3a2410'; ctx.fillRect(3*u, 12*u, 10*u, 3*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(3*u, 12*u, 10*u, u);
    ctx.fillStyle = '#3a1810'; ctx.fillRect(7*u, 6*u, 2*u, 6*u); ctx.fillRect(6*u, 9*u, 2*u, 2*u);
    ctx.fillStyle = '#3a8038'; ctx.fillRect(4*u, 4*u, 4*u, 3*u); ctx.fillRect(8*u, 3*u, 4*u, 3*u); ctx.fillRect(5*u, 6*u, 6*u, u);
    ctx.fillStyle = '#5aa050'; ctx.fillRect(4*u, 4*u, 4*u, u); ctx.fillRect(8*u, 3*u, 4*u, u);
  }
  function previewTank(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    ctx.fillStyle = '#3a2820'; ctx.fillRect(3*u, 13*u, 10*u, 2*u);
    ctx.fillRect(4*u, 11*u, u, 2*u); ctx.fillRect(11*u, 11*u, u, 2*u);
    ctx.fillStyle = '#0a0418'; ctx.fillRect(3*u, 2*u, 10*u, 9*u);
    var g = ctx.createRadialGradient(8*u, 6*u, 0, 8*u, 6*u, 6*u);
    g.addColorStop(0, 'rgba(192,144,232,0.85)');
    g.addColorStop(0.5, 'rgba(96,80,180,0.55)');
    g.addColorStop(1, 'rgba(20,12,40,0.0)');
    ctx.fillStyle = g; ctx.fillRect(3*u, 2*u, 10*u, 9*u);
    ctx.fillStyle = '#fff'; ctx.fillRect(5*u, 4*u, u, u); ctx.fillRect(10*u, 7*u, u, u); ctx.fillRect(7*u, 9*u, u, u);
    ctx.strokeStyle = 'rgba(160,240,248,0.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(3*u + 0.5, 2*u + 0.5, 10*u - 1, 9*u - 1);
  }

  // ---- Lumar dockside item previews ----
  function previewDriftwoodLamp(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    // Wide weathered base
    ctx.fillStyle = '#5a4a30'; ctx.fillRect(4*u, 13*u, 8*u, 2*u);
    ctx.fillStyle = '#7a6a48'; ctx.fillRect(4*u, 13*u, 8*u, u);
    // Twisted driftwood pole
    ctx.fillStyle = '#3a2a18'; ctx.fillRect(7*u, 5*u, 2*u, 8*u);
    ctx.fillStyle = '#5a4a30'; ctx.fillRect(6*u, 7*u, u, 2*u); ctx.fillRect(9*u, 9*u, u, 2*u);
    // Frosted-glass shade
    ctx.fillStyle = '#8aa0a8'; ctx.fillRect(4*u, 2*u, 8*u, 3*u);
    ctx.fillStyle = '#c8e0e8'; ctx.fillRect(4*u, 2*u, 8*u, u);
    // Warm halo
    ctx.fillStyle = 'rgba(255,210,140,0.4)'; ctx.fillRect(2*u, 4*u, 12*u, 2*u);
  }
  function previewGlassFloat(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    // Wooden cradle base
    ctx.fillStyle = '#3a2410'; ctx.fillRect(3*u, 13*u, 10*u, 2*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(3*u, 13*u, 10*u, u);
    // Net wrap
    ctx.strokeStyle = '#3a2818'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(4*u, 13*u); ctx.lineTo(8*u, 5*u); ctx.lineTo(12*u, 13*u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5*u, 12*u); ctx.lineTo(11*u, 12*u); ctx.stroke();
    // Glass orb
    var grad = ctx.createRadialGradient(7*u, 7*u, 0, 8*u, 8*u, 5*u);
    grad.addColorStop(0, '#c8f0e8'); grad.addColorStop(0.6, '#5aa098'); grad.addColorStop(1, '#205848');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(8*u, 8*u, 4.5*u, 0, Math.PI * 2); ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(220,240,232,0.6)'; ctx.beginPath();
    ctx.arc(6.5*u, 6.5*u, 1.2*u, 0, Math.PI * 2); ctx.fill();
  }
  function previewKelpCanister(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    // Base
    ctx.fillStyle = '#3a2818'; ctx.fillRect(4*u, 13*u, 8*u, 2*u);
    // Glass canister
    ctx.fillStyle = '#0a1820'; ctx.fillRect(4*u, 3*u, 8*u, 10*u);
    // Bioluminescent water + kelp
    var grad = ctx.createLinearGradient(0, 4*u, 0, 13*u);
    grad.addColorStop(0, 'rgba(96,200,160,0.6)');
    grad.addColorStop(1, 'rgba(40,100,80,0.3)');
    ctx.fillStyle = grad; ctx.fillRect(5*u, 4*u, 6*u, 8*u);
    // Kelp strands
    ctx.fillStyle = '#3a8038';
    ctx.fillRect(6*u, 5*u, u, 7*u);
    ctx.fillRect(8*u, 6*u, u, 6*u);
    ctx.fillRect(10*u, 5*u, u, 7*u);
    // Glow particles
    ctx.fillStyle = '#a8f0c8'; ctx.fillRect(7*u, 7*u, u, u);
    ctx.fillStyle = '#80e0a0'; ctx.fillRect(9*u, 9*u, u, u);
    // Brass cap
    ctx.fillStyle = '#a08040'; ctx.fillRect(4*u, 2*u, 8*u, u);
    ctx.fillStyle = '#e0c060'; ctx.fillRect(4*u, 2*u, 8*u, Math.max(1, u * 0.4));
    // Glass border
    ctx.strokeStyle = 'rgba(160,200,200,0.5)'; ctx.lineWidth = 1;
    ctx.strokeRect(4*u + 0.5, 3*u + 0.5, 8*u - 1, 10*u - 1);
  }
  // ---- ArcadiaMart item previews ----
  function previewCosmicSoda(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    // Can body — magenta-to-cyan gradient
    var grad = ctx.createLinearGradient(0, 3*u, 0, 14*u);
    grad.addColorStop(0, '#e870c0'); grad.addColorStop(0.5, '#7080e8'); grad.addColorStop(1, '#40c8d8');
    ctx.fillStyle = grad;
    ctx.fillRect(5*u, 3*u, 6*u, 11*u);
    // Top rim
    ctx.fillStyle = '#c0c0c0'; ctx.fillRect(5*u, 2*u, 6*u, u);
    ctx.fillStyle = '#888'; ctx.fillRect(5*u, 3*u, 6*u, Math.max(1, u*0.4));
    // Tab
    ctx.fillStyle = '#888'; ctx.fillRect(7*u, 2*u, 2*u, Math.max(1, u*0.5));
    // Pull tab hole
    ctx.fillStyle = '#222'; ctx.fillRect(7*u, 3*u, 2*u, Math.max(1, u*0.4));
    // Label band
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(5*u, 7*u, 6*u, 3*u);
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(6*u, 8*u, 4*u, Math.max(1, u*0.7));
    // Bubble sparkles
    ctx.fillStyle = '#fff';
    ctx.fillRect(6*u, 5*u, u, u); ctx.fillRect(9*u, 6*u, u, u); ctx.fillRect(7*u, 12*u, u, u);
    // Highlight stripe
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(5*u, 3*u, Math.max(1, u), 11*u);
  }

  function previewNeonCactus(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    // Black pot with cyan accent
    ctx.fillStyle = '#0a0418'; ctx.fillRect(5*u, 11*u, 6*u, 4*u);
    ctx.fillStyle = '#40c8d8'; ctx.fillRect(5*u, 11*u, 6*u, Math.max(1, u*0.5));
    ctx.fillStyle = '#7080e8'; ctx.fillRect(4*u, 13*u, 8*u, Math.max(1, u*0.4));
    // Cactus body (neon pink)
    ctx.fillStyle = '#e870c0';
    ctx.fillRect(7*u, 4*u, 2*u, 7*u);
    // Side arms
    ctx.fillRect(5*u, 6*u, 2*u, 2*u); ctx.fillRect(5*u, 7*u, u, 3*u);
    ctx.fillRect(9*u, 7*u, 2*u, 2*u); ctx.fillRect(10*u, 8*u, u, 3*u);
    // Inner glow line
    ctx.fillStyle = '#ffb0e0';
    ctx.fillRect(7*u, 4*u, Math.max(1, u*0.6), 7*u);
    // Halo glow
    ctx.fillStyle = 'rgba(232,112,192,0.35)';
    ctx.fillRect(3*u, 3*u, 10*u, 8*u);
  }

  function previewArcadeMarquee(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    // Black frame
    ctx.fillStyle = '#0a0a16'; ctx.fillRect(2*u, 3*u, 12*u, 10*u);
    // Marquee bezel — gold bulbs
    ctx.fillStyle = '#a08040';
    ctx.fillRect(2*u, 3*u, 12*u, u);
    ctx.fillRect(2*u, 12*u, 12*u, u);
    // Bulb dots
    ctx.fillStyle = '#ffe080';
    for (var b = 0; b < 6; b++) {
      ctx.fillRect((3 + b*2)*u, 3*u + Math.max(0, u*0.2), Math.max(1, u*0.6), Math.max(1, u*0.6));
      ctx.fillRect((3 + b*2)*u, 12*u + Math.max(0, u*0.2), Math.max(1, u*0.6), Math.max(1, u*0.6));
    }
    // Screen — radial gradient with text-like blocks
    var grad = ctx.createLinearGradient(0, 4*u, 0, 12*u);
    grad.addColorStop(0, '#3a1840'); grad.addColorStop(1, '#0a0418');
    ctx.fillStyle = grad; ctx.fillRect(3*u, 5*u, 10*u, 6*u);
    // Pixel "PLAY" text approximation (neon)
    ctx.fillStyle = '#e870c0';
    ctx.fillRect(4*u, 6*u, u, 3*u); ctx.fillRect(5*u, 6*u, 2*u, u); ctx.fillRect(6*u, 7*u, u, u);
    ctx.fillStyle = '#5cc8d0';
    ctx.fillRect(8*u, 6*u, u, 3*u); ctx.fillRect(8*u, 6*u, 2*u, u); ctx.fillRect(9*u, 7*u, u, u);
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(11*u, 6*u, u, 3*u); ctx.fillRect(11*u, 6*u, 2*u, u);
    // Scanline
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(3*u, 9*u, 10*u, Math.max(1, u*0.4));
  }

  function previewRetroCRT(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    // Wood-grain stand
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(2*u, 13*u, 12*u, 2*u);
    ctx.fillStyle = '#7a4e22'; ctx.fillRect(2*u, 13*u, 12*u, u);
    // CRT body — beige cabinet
    ctx.fillStyle = '#a09080'; ctx.fillRect(3*u, 3*u, 10*u, 10*u);
    ctx.fillStyle = '#c8b8a0'; ctx.fillRect(3*u, 3*u, 10*u, u);
    // Screen bezel (dark)
    ctx.fillStyle = '#1a1410'; ctx.fillRect(4*u, 4*u, 8*u, 7*u);
    // Glitchy static screen
    var grad = ctx.createLinearGradient(0, 5*u, 0, 10*u);
    grad.addColorStop(0, '#7080e8'); grad.addColorStop(0.5, '#40c8d8'); grad.addColorStop(1, '#5cc8d0');
    ctx.fillStyle = grad; ctx.fillRect(5*u, 5*u, 6*u, 5*u);
    // Glitch bars
    ctx.fillStyle = 'rgba(255,80,180,0.7)'; ctx.fillRect(5*u, 6*u, 6*u, Math.max(1, u*0.6));
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(5*u, 8*u, 6*u, Math.max(1, u*0.4));
    // Knobs
    ctx.fillStyle = '#3a2820';
    ctx.fillRect(4*u, 11*u, Math.max(1, u*0.8), Math.max(1, u*0.8));
    ctx.fillRect(6*u, 11*u, Math.max(1, u*0.8), Math.max(1, u*0.8));
    // Speaker grille
    ctx.fillStyle = '#3a2820';
    for (var g = 0; g < 4; g++) ctx.fillRect((9 + g*0.5)*u, 11*u, Math.max(1, u*0.3), Math.max(1, u));
  }

  function previewBrassCompass(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    // Wooden display stand
    ctx.fillStyle = '#3a2410'; ctx.fillRect(3*u, 13*u, 10*u, 2*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(3*u, 13*u, 10*u, u);
    // Compass body
    ctx.fillStyle = '#a08040';
    ctx.beginPath(); ctx.arc(8*u, 7*u, 5*u, 0, Math.PI * 2); ctx.fill();
    // Inner face
    ctx.fillStyle = '#0a1418';
    ctx.beginPath(); ctx.arc(8*u, 7*u, 3.7*u, 0, Math.PI * 2); ctx.fill();
    // Brass tick marks (N/E/S/W)
    ctx.fillStyle = '#e0c060';
    ctx.fillRect(8*u - Math.max(1, u*0.5), 7*u - 4.5*u, Math.max(1, u), Math.max(1, u));
    ctx.fillRect(8*u + 3.5*u, 7*u - Math.max(1, u*0.5), Math.max(1, u), Math.max(1, u));
    ctx.fillRect(8*u - Math.max(1, u*0.5), 7*u + 3.5*u, Math.max(1, u), Math.max(1, u));
    ctx.fillRect(8*u - 4.5*u, 7*u - Math.max(1, u*0.5), Math.max(1, u), Math.max(1, u));
    // Needle (tilted slightly)
    ctx.save(); ctx.translate(8*u, 7*u); ctx.rotate(0.3);
    ctx.fillStyle = '#e84040'; ctx.fillRect(-Math.max(1, u*0.4), -3*u, Math.max(1, u*0.8), 3*u);
    ctx.fillStyle = '#fff'; ctx.fillRect(-Math.max(1, u*0.4), 0, Math.max(1, u*0.8), 3*u);
    ctx.restore();
    // Glass dome highlight
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(7*u, 5.5*u, 1.5*u, 0, Math.PI * 2); ctx.fill();
  }

  function setFeedback(text, color) {
    var el = document.getElementById('catalog-feedback');
    if (el) { el.textContent = text; el.style.color = color || '#80e0e8'; }
  }

  function bindHandlers() {
    overlayEl.addEventListener('click', function (e) {
      if (e.target === overlayEl) hide();
    });
    document.addEventListener('keydown', escHandler);
  }

  function bindTabHandlers() {
    var tabs = overlayEl.querySelectorAll('.catalog-tab');
    for (var i = 0; i < tabs.length; i++) {
      (function (tab) {
        tab.addEventListener('click', function () {
          var key = tab.getAttribute('data-tab');
          if (key === currentTab) return;
          currentTab = key;
          refreshView();
        });
      })(tabs[i]);
    }
  }

  function escHandler(e) {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      hide();
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  return {
    show: show,
    hide: hide,
    isOpen: function () { return open; },
    getCatalog: getCatalog,
    getItemByKey: getItemByKey,
    sellPriceOf: sellPriceOf
  };
})();
