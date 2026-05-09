/**
 * BridgeLocker — storage UI for the Pilot's Quarters locker tile.
 *
 * Two sections:
 *   ON DISPLAY  — items currently in their slots, each with a STORE button
 *                 (moves the item to the locker and empties the slot)
 *   IN STORAGE  — items currently in the locker, each with a PLACE button
 *                 (moves the item into its slot; if the slot is occupied,
 *                  the existing slot item swaps back to storage atomically)
 *
 * Buying a duplicate slot from the catalog now sends the item to the locker
 * (instead of being blocked), so the locker is the natural staging area for
 * decoration variety.
 */
var BridgeLocker = (function () {

  var overlayEl = null;
  var open = false;

  function show() {
    if (open) return;
    open = true;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();

    overlayEl = document.createElement('div');
    overlayEl.id = 'locker-overlay';
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
    document.removeEventListener('keydown', escHandler);
    if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
  }

  function renderShellHTML() {
    var html = '<div style="' +
      'width:min(720px,92vw);max-height:88vh;overflow:hidden;display:flex;flex-direction:column;' +
      'background:linear-gradient(180deg,rgba(20,30,46,0.96),rgba(10,18,28,0.96));' +
      'border:1px solid rgba(64,200,216,0.5);border-radius:8px;' +
      'box-shadow:0 0 32px rgba(64,200,216,0.25),inset 0 0 18px rgba(64,200,216,0.06);">';

    html += '<div style="padding:18px 24px;border-bottom:1px solid rgba(64,200,216,0.25);">' +
      '<div style="font-size:11px;letter-spacing:5px;color:rgba(64,200,216,0.7);">PILOT INVENTORY</div>' +
      '<div style="font-size:18px;letter-spacing:3px;color:#80e0e8;margin-top:4px;">STORAGE LOCKER</div>' +
    '</div>';

    html += '<div style="padding:18px 24px;overflow-y:auto;flex:1;">' +
      '<div style="font-size:10px;letter-spacing:4px;color:rgba(128,224,136,0.75);margin-bottom:8px;">ON DISPLAY</div>' +
      '<div id="locker-displayed-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px;"></div>' +
      '<div style="font-size:10px;letter-spacing:4px;color:rgba(64,200,216,0.75);margin-bottom:8px;">IN STORAGE</div>' +
      '<div id="locker-stored-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"></div>' +
    '</div>';

    html += '<div style="padding:12px 24px;border-top:1px solid rgba(64,200,216,0.25);' +
            'display:flex;justify-content:space-between;align-items:center;font-size:10px;' +
            'letter-spacing:3px;color:#777;">' +
      '<span>ESC TO CLOSE</span>' +
      '<span id="locker-feedback" style="color:#80e0e8;"></span>' +
    '</div>';

    html += '</div>';
    return html;
  }

  // Render one inventory card. mode='displayed' (STORE button) or 'stored' (PLACE button).
  function renderCardHTML(item, mode) {
    var actionLabel = mode === 'displayed' ? 'STORE' : 'PLACE';
    var actionColor = mode === 'displayed' ? '#80e0e8' : '#80e088';
    return '<div class="locker-card" data-key="' + item.key + '" data-mode="' + mode + '" style="' +
        'background:rgba(0,0,0,0.35);border:1px solid rgba(64,200,216,0.2);' +
        'border-radius:6px;padding:12px;display:grid;grid-template-columns:48px 1fr auto;gap:12px;align-items:center;' +
        'transition:background 0.15s, border-color 0.15s;">' +
        '<canvas class="locker-preview" data-key="' + item.key + '" width="48" height="48" ' +
          'style="display:block;width:48px;height:48px;background:rgba(60,40,90,0.18);border-radius:4px;image-rendering:pixelated;"></canvas>' +
        '<div>' +
          '<div style="font-size:12px;letter-spacing:2px;color:#e0e0e0;">' + escapeHtml(item.name.toUpperCase()) + '</div>' +
          '<div style="font-size:9px;letter-spacing:2px;color:#888;margin-top:2px;">SLOT: ' + escapeHtml(item.slot.toUpperCase()) + '</div>' +
        '</div>' +
        '<button class="locker-action" data-key="' + item.key + '" data-mode="' + mode + '" data-slot="' + item.slot + '" style="' +
          'padding:8px 14px;background:transparent;border:1px solid ' + actionColor + ';' +
          'color:' + actionColor + ';font-family:inherit;font-size:10px;letter-spacing:3px;' +
          'cursor:pointer;border-radius:4px;transition:background 0.12s, color 0.12s;">' +
          actionLabel +
        '</button>' +
      '</div>';
  }

  function refreshState() {
    if (!overlayEl) return;
    if (typeof BridgeProgression === 'undefined') return;
    if (typeof BridgeCatalog === 'undefined') return;

    Promise.all([BridgeProgression.getDecor(), BridgeProgression.getLocker()])
      .then(function (results) {
        var decor = results[0] || {};
        var lockerKeys = results[1] || [];

        // Build displayed list (items in slots)
        var displayedHtml = '';
        var displayedCount = 0;
        var slotKeys = Object.keys(decor);
        for (var i = 0; i < slotKeys.length; i++) {
          var slot = slotKeys[i];
          var itemKey = decor[slot];
          var item = BridgeCatalog.getItemByKey(itemKey);
          if (!item) continue;
          displayedHtml += renderCardHTML(item, 'displayed');
          displayedCount++;
        }
        if (displayedCount === 0) {
          displayedHtml = emptyMsgHTML('No items on display. Buy decor at the Catalog Terminal.');
        }
        document.getElementById('locker-displayed-grid').innerHTML = displayedHtml;

        // Build stored list (items in locker)
        var storedHtml = '';
        for (var j = 0; j < lockerKeys.length; j++) {
          var item2 = BridgeCatalog.getItemByKey(lockerKeys[j]);
          if (!item2) continue;
          storedHtml += renderCardHTML(item2, 'stored');
        }
        if (lockerKeys.length === 0) {
          storedHtml = emptyMsgHTML('Locker is empty. Buy items even when slots are full — they\'ll land here.');
        }
        document.getElementById('locker-stored-grid').innerHTML = storedHtml;

        // Paint previews
        var canvases = overlayEl.querySelectorAll('canvas.locker-preview');
        for (var c = 0; c < canvases.length; c++) {
          var ck = canvases[c].getAttribute('data-key');
          var citem = BridgeCatalog.getItemByKey(ck);
          if (!citem) continue;
          var ctx = canvases[c].getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, canvases[c].width, canvases[c].height);
          // Catalog previews are designed for 64px, scale down a bit
          ctx.save();
          ctx.scale(48 / 64, 48 / 64);
          // Provide a fake canvas ref of size 64 by drawing into a temp scratch
          var tmp = document.createElement('canvas');
          tmp.width = 64; tmp.height = 64;
          var tctx = tmp.getContext('2d');
          tctx.imageSmoothingEnabled = false;
          citem.preview(tctx);
          ctx.drawImage(tmp, 0, 0);
          ctx.restore();
        }

        // Bind buttons
        bindActions();
      });
  }

  function emptyMsgHTML(msg) {
    return '<div style="grid-column:1 / -1;padding:16px;text-align:center;color:#666;font-size:11px;letter-spacing:2px;">' +
           escapeHtml(msg) + '</div>';
  }

  function bindActions() {
    var btns = overlayEl.querySelectorAll('.locker-action');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener('mouseenter', function () {
          var c = btn.style.borderColor;
          btn.style.background = c.replace('rgb', 'rgba').replace(')', ',0.2)');
          // simpler:
          btn.style.background = btn.dataset.mode === 'displayed'
            ? 'rgba(64,200,216,0.18)' : 'rgba(120,224,136,0.18)';
        });
        btn.addEventListener('mouseleave', function () {
          btn.style.background = 'transparent';
        });
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-key');
          var slot = btn.getAttribute('data-slot');
          var mode = btn.getAttribute('data-mode');
          if (mode === 'displayed') {
            doStore(slot, key);
          } else {
            doPlace(key, slot);
          }
        });
      })(btns[i]);
    }
  }

  function doStore(slot, itemKey) {
    setFeedback('STORING…', '#80e0e8');
    BridgeProgression.storeDecor(slot).then(function (res) {
      if (res && res.ok) {
        setFeedback('STORED · ' + nameOf(itemKey), '#80e0e8');
        refreshState();
        if (typeof BridgeQuarters !== 'undefined' && BridgeQuarters.refreshDecor) {
          BridgeQuarters.refreshDecor();
        }
      } else {
        setFeedback('STORE FAILED', '#e88860');
      }
    });
  }

  function doPlace(itemKey, slot) {
    setFeedback('PLACING…', '#80e0e8');
    BridgeProgression.placeDecor(itemKey, slot).then(function (res) {
      if (res && res.ok) {
        if (res.displaced) {
          setFeedback('PLACED · ' + nameOf(itemKey) + ' (swapped with ' + nameOf(res.displaced) + ')', '#80e088');
        } else {
          setFeedback('PLACED · ' + nameOf(itemKey), '#80e088');
        }
        refreshState();
        if (typeof BridgeQuarters !== 'undefined' && BridgeQuarters.refreshDecor) {
          BridgeQuarters.refreshDecor();
        }
      } else {
        setFeedback('PLACE FAILED', '#e88860');
      }
    });
  }

  function nameOf(itemKey) {
    var item = BridgeCatalog.getItemByKey(itemKey);
    return item ? item.name.toUpperCase() : itemKey.toUpperCase();
  }

  function setFeedback(text, color) {
    var el = document.getElementById('locker-feedback');
    if (el) {
      el.textContent = text;
      el.style.color = color || '#80e0e8';
    }
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
      hide();
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  return { show: show, hide: hide, isOpen: function () { return open; } };
})();
