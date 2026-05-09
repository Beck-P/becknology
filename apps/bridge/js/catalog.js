/**
 * BridgeCatalog — the in-game decor shop.
 *
 * Opens as a card-grid overlay when the player presses E on the Catalog
 * Terminal in Quarters. Each card shows the item's preview sprite, name,
 * price, and a BUY button (or ✓ OWNED if already purchased).
 *
 * On purchase: deducts coins atomically server-side via purchase_decor RPC,
 * fires BridgeProgression coin/decor events so the HUD ticks and the room
 * re-renders the slot with the new item.
 */
var BridgeCatalog = (function () {

  // ---- Catalog (the 6 starter items) ----
  // Each item has a slot (which floor slot it auto-places into),
  // a price, and a small preview painter for the card.
  var CATALOG = [
    { key: 'houseplant',   slot: 'plant',  name: 'Houseplant',    price: 50,  preview: previewHouseplant },
    { key: 'floor_lamp',   slot: 'lamp',   name: 'Floor Lamp',    price: 75,  preview: previewLamp },
    { key: 'crystal_lamp', slot: 'lamp',   name: 'Crystal Lamp',  price: 150, preview: previewCrystalLamp },
    { key: 'holo_poster',  slot: 'poster', name: 'Holo Poster',   price: 200, preview: previewPoster },
    { key: 'bonsai',       slot: 'plant',  name: 'Bonsai Tree',   price: 350, preview: previewBonsai },
    { key: 'nebula_tank',  slot: 'tank',   name: 'Nebula Tank',   price: 500, preview: previewTank }
  ];

  function getCatalog() { return CATALOG.slice(); }
  function getItemByKey(key) {
    for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].key === key) return CATALOG[i];
    return null;
  }

  // ---- Open / close ----
  var overlayEl = null;
  var open = false;

  function show() {
    if (open) return;
    open = true;
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
      'width:min(720px,92vw);max-height:88vh;overflow:hidden;display:flex;flex-direction:column;' +
      'background:linear-gradient(180deg,rgba(20,30,46,0.96),rgba(10,18,28,0.96));' +
      'border:1px solid rgba(64,200,216,0.5);border-radius:8px;' +
      'box-shadow:0 0 32px rgba(64,200,216,0.25),inset 0 0 18px rgba(64,200,216,0.06);">';

    // Header
    html += '<div style="padding:18px 24px;border-bottom:1px solid rgba(64,200,216,0.25);' +
            'display:flex;justify-content:space-between;align-items:center;">' +
      '<div>' +
        '<div style="font-size:11px;letter-spacing:5px;color:rgba(64,200,216,0.7);">CATALOG TERMINAL</div>' +
        '<div style="font-size:18px;letter-spacing:3px;color:#80e0e8;margin-top:4px;">DECOR INVENTORY</div>' +
      '</div>' +
      '<div id="catalog-balance" style="' +
        'font-size:18px;letter-spacing:3px;color:#ffe080;text-align:right;">' +
        '🪙 …' +
      '</div>' +
    '</div>';

    // Grid container
    html += '<div id="catalog-grid" style="' +
      'padding:20px 24px;display:grid;grid-template-columns:1fr 1fr;gap:14px;' +
      'overflow-y:auto;flex:1;">' + renderGridHTML() + '</div>';

    // Footer
    html += '<div style="padding:12px 24px;border-top:1px solid rgba(64,200,216,0.25);' +
            'display:flex;justify-content:space-between;align-items:center;font-size:10px;' +
            'letter-spacing:3px;color:#777;">' +
      '<span>ESC TO CLOSE</span>' +
      '<span id="catalog-feedback" style="color:#80e0e8;"></span>' +
    '</div>';

    html += '</div>';
    return html;
  }

  function renderGridHTML() {
    var html = '';
    for (var i = 0; i < CATALOG.length; i++) {
      var it = CATALOG[i];
      html +=
        '<div class="catalog-card" data-key="' + it.key + '" style="' +
          'background:rgba(0,0,0,0.35);border:1px solid rgba(64,200,216,0.2);' +
          'border-radius:6px;padding:12px;display:grid;grid-template-columns:64px 1fr;gap:12px;' +
          'transition:background 0.15s, border-color 0.15s;cursor:pointer;align-items:center;">' +
          '<canvas class="catalog-preview" data-key="' + it.key + '" width="64" height="64" ' +
            'style="display:block;width:64px;height:64px;background:rgba(60,40,90,0.18);border-radius:4px;image-rendering:pixelated;"></canvas>' +
          '<div>' +
            '<div style="font-size:13px;letter-spacing:2px;color:#e0e0e0;">' + escapeHtml(it.name.toUpperCase()) + '</div>' +
            '<div style="font-size:10px;letter-spacing:2px;color:#888;margin-top:2px;">SLOT: ' + escapeHtml(it.slot.toUpperCase()) + '</div>' +
            '<div class="catalog-action" data-key="' + it.key + '" style="' +
              'margin-top:8px;font-size:11px;letter-spacing:3px;color:#ffe080;">🪙 ' + it.price + '</div>' +
          '</div>' +
        '</div>';
    }
    return html;
  }

  // ---- Preview painters (small canvases on each card) ----

  function previewHouseplant(ctx) {
    var w = ctx.canvas.width, h = ctx.canvas.height, u = w / 16;
    // Pot
    ctx.fillStyle = '#7a4818';
    ctx.fillRect(5 * u, 11 * u, 6 * u, 4 * u);
    ctx.fillStyle = '#a06820';
    ctx.fillRect(5 * u, 11 * u, 6 * u, u);
    // Leaves (green)
    ctx.fillStyle = '#3a8038';
    ctx.fillRect(7 * u, 4 * u, 2 * u, 7 * u);
    ctx.fillStyle = '#5aa050';
    ctx.fillRect(5 * u, 6 * u, 2 * u, 4 * u);
    ctx.fillRect(9 * u, 6 * u, 2 * u, 4 * u);
    ctx.fillRect(4 * u, 8 * u, 2 * u, 2 * u);
    ctx.fillRect(10 * u, 8 * u, 2 * u, 2 * u);
  }

  function previewLamp(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    // Base
    ctx.fillStyle = '#3a2820';
    ctx.fillRect(5 * u, 13 * u, 6 * u, 2 * u);
    // Pole
    ctx.fillStyle = '#5a3a28';
    ctx.fillRect(7 * u, 5 * u, 2 * u, 8 * u);
    // Shade
    ctx.fillStyle = '#a08040';
    ctx.fillRect(4 * u, 2 * u, 8 * u, 3 * u);
    ctx.fillStyle = '#e0c060';
    ctx.fillRect(4 * u, 4 * u, 8 * u, u);
    // Glow
    ctx.fillStyle = 'rgba(255,224,128,0.45)';
    ctx.fillRect(2 * u, 5 * u, 12 * u, 2 * u);
  }

  function previewCrystalLamp(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    // Base
    ctx.fillStyle = '#1a1430';
    ctx.fillRect(5 * u, 13 * u, 6 * u, 2 * u);
    ctx.fillStyle = '#3a2858';
    ctx.fillRect(5 * u, 13 * u, 6 * u, u);
    // Crystal column (purple)
    var grad = ctx.createLinearGradient(0, 4 * u, 0, 13 * u);
    grad.addColorStop(0, '#c0a0f0');
    grad.addColorStop(1, '#503090');
    ctx.fillStyle = grad;
    ctx.fillRect(6 * u, 4 * u, 4 * u, 9 * u);
    // Crystal facet highlights
    ctx.fillStyle = '#e0c0f8';
    ctx.fillRect(6 * u, 4 * u, u, 9 * u);
    // Glow above
    ctx.fillStyle = 'rgba(192,144,232,0.45)';
    ctx.fillRect(2 * u, 2 * u, 12 * u, 4 * u);
  }

  function previewPoster(ctx) {
    var w = ctx.canvas.width, h = ctx.canvas.height, u = w / 16;
    // Frame
    ctx.fillStyle = '#3a2820';
    ctx.fillRect(2 * u, 2 * u, 12 * u, 12 * u);
    // Poster background — purple/cyan gradient
    var g = ctx.createLinearGradient(3 * u, 3 * u, 13 * u, 13 * u);
    g.addColorStop(0, '#6040a0'); g.addColorStop(1, '#80e0e8');
    ctx.fillStyle = g;
    ctx.fillRect(3 * u, 3 * u, 10 * u, 10 * u);
    // Big star
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(7 * u, 5 * u, 2 * u, 6 * u);
    ctx.fillRect(5 * u, 7 * u, 6 * u, 2 * u);
  }

  function previewBonsai(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    // Pot (wide, shallow)
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(3 * u, 12 * u, 10 * u, 3 * u);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(3 * u, 12 * u, 10 * u, u);
    // Trunk
    ctx.fillStyle = '#3a1810';
    ctx.fillRect(7 * u, 6 * u, 2 * u, 6 * u);
    ctx.fillRect(6 * u, 9 * u, 2 * u, 2 * u);
    // Foliage clouds (bonsai style)
    ctx.fillStyle = '#3a8038';
    ctx.fillRect(4 * u, 4 * u, 4 * u, 3 * u);
    ctx.fillRect(8 * u, 3 * u, 4 * u, 3 * u);
    ctx.fillRect(5 * u, 6 * u, 6 * u, u);
    ctx.fillStyle = '#5aa050';
    ctx.fillRect(4 * u, 4 * u, 4 * u, u);
    ctx.fillRect(8 * u, 3 * u, 4 * u, u);
  }

  function previewTank(ctx) {
    var w = ctx.canvas.width, u = w / 16;
    // Stand
    ctx.fillStyle = '#3a2820';
    ctx.fillRect(3 * u, 13 * u, 10 * u, 2 * u);
    ctx.fillRect(4 * u, 11 * u, u, 2 * u);
    ctx.fillRect(11 * u, 11 * u, u, 2 * u);
    // Tank glass — purple nebula inside
    ctx.fillStyle = '#0a0418';
    ctx.fillRect(3 * u, 2 * u, 10 * u, 9 * u);
    var g = ctx.createRadialGradient(8 * u, 6 * u, 0, 8 * u, 6 * u, 6 * u);
    g.addColorStop(0, 'rgba(192,144,232,0.85)');
    g.addColorStop(0.5, 'rgba(96,80,180,0.55)');
    g.addColorStop(1, 'rgba(20,12,40,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(3 * u, 2 * u, 10 * u, 9 * u);
    // Star sparkles
    ctx.fillStyle = '#fff';
    ctx.fillRect(5 * u, 4 * u, u, u);
    ctx.fillRect(10 * u, 7 * u, u, u);
    ctx.fillRect(7 * u, 9 * u, u, u);
    // Glass border
    ctx.strokeStyle = 'rgba(160,240,248,0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(3 * u + 0.5, 2 * u + 0.5, 10 * u - 1, 9 * u - 1);
  }

  // ---- State refresh: paint previews + show owned/buy state per card ----
  function refreshState() {
    if (!overlayEl) return;
    // Paint each preview
    var canvases = overlayEl.querySelectorAll('canvas.catalog-preview');
    for (var i = 0; i < canvases.length; i++) {
      var key = canvases[i].getAttribute('data-key');
      var item = getItemByKey(key);
      if (!item) continue;
      var ctx = canvases[i].getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvases[i].width, canvases[i].height);
      item.preview(ctx);
    }

    // Pull balance + owned decor
    if (typeof BridgeProgression === 'undefined') return;
    BridgeProgression.getBalance().then(function (balance) {
      var balEl = document.getElementById('catalog-balance');
      if (balEl) balEl.textContent = '🪙 ' + (balance == null ? 0 : balance);
    });
    BridgeProgression.getDecor().then(function (decor) {
      // Mark owned slots
      var actions = overlayEl.querySelectorAll('.catalog-action');
      for (var i = 0; i < actions.length; i++) {
        var key = actions[i].getAttribute('data-key');
        var item = getItemByKey(key);
        if (!item) continue;
        var ownedKeyInSlot = decor[item.slot];
        if (ownedKeyInSlot === item.key) {
          actions[i].textContent = '✓ OWNED';
          actions[i].style.color = '#80e088';
          var card = actions[i].closest('.catalog-card');
          if (card) {
            card.style.borderColor = 'rgba(120,224,136,0.55)';
            card.style.background = 'rgba(40,90,55,0.18)';
          }
        } else if (ownedKeyInSlot) {
          actions[i].textContent = '🪙 ' + item.price + ' · slot full';
          actions[i].style.color = '#888';
        } else {
          actions[i].textContent = '🪙 ' + item.price;
          actions[i].style.color = '#ffe080';
        }
      }
    });
  }

  // ---- Buy handler ----
  function attemptBuy(key) {
    var item = getItemByKey(key);
    if (!item) return;
    if (typeof BridgeProgression === 'undefined') return;
    setFeedback('PROCESSING…', '#80e0e8');
    BridgeProgression.purchaseDecor(item.slot, item.key, item.price).then(function (res) {
      if (res.ok) {
        setFeedback('PURCHASED · ' + item.name.toUpperCase(), '#80e088');
        refreshState();
        // Notify quarters render layer to show the new decor immediately
        if (typeof BridgeQuarters !== 'undefined' && BridgeQuarters.refreshDecor) {
          BridgeQuarters.refreshDecor();
        }
        // First decor purchase → grant the Settled In trophy
        BridgeProgression.recordAchievement('settled_in', 50, { first: item.key });
      } else if (res.reason === 'insufficient') {
        setFeedback('NOT ENOUGH COINS', '#e88860');
      } else if (res.reason === 'occupied') {
        setFeedback('SLOT ALREADY FILLED', '#e88860');
        refreshState();
      } else {
        setFeedback('PURCHASE FAILED', '#e88860');
      }
    });
  }

  function setFeedback(text, color) {
    var el = document.getElementById('catalog-feedback');
    if (el) {
      el.textContent = text;
      el.style.color = color || '#80e0e8';
    }
  }

  // ---- Bindings ----
  function bindHandlers() {
    // Card hover + click
    var cards = overlayEl.querySelectorAll('.catalog-card');
    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        var key = card.getAttribute('data-key');
        card.addEventListener('mouseenter', function () {
          card.style.background = 'rgba(64,200,216,0.16)';
          card.style.borderColor = 'rgba(64,200,216,0.55)';
        });
        card.addEventListener('mouseleave', function () {
          // Defer to refreshState's owned styling
          card.style.background = '';
          card.style.borderColor = '';
          refreshState();
        });
        card.addEventListener('click', function () { attemptBuy(key); });
      })(cards[i]);
    }

    // Backdrop click closes
    overlayEl.addEventListener('click', function (e) {
      if (e.target === overlayEl) hide();
    });
    // Esc closes
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

  // ---- Helpers ----
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
    getItemByKey: getItemByKey
  };
})();
