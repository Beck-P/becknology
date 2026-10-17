/**
 * BridgeIdentity — New/returning pilot UI.
 *
 * Renders DOM forms into #identity-overlay, over the title page's scene (js/intro.js).
 * Flow: choice → (new pilot form | returning pilot form) → the push into the ship (BridgeIntro.board) → the bridge.
 * show({ form: 'new' | 'returning' }) opens a form straight from the title's menu; BACK from there (and
 * from the choice) goes back to the title.
 */
var BridgeIdentity = (function () {
  var overlay;
  var SUIT_COLORS = [
    { name: 'purple', hex: '#a078dc' },
    { name: 'cyan',   hex: '#5cc8d0' },
    { name: 'red',    hex: '#d06060' },
    { name: 'green',  hex: '#60b060' },
    { name: 'gold',   hex: '#c8a840' },
    { name: 'white',  hex: '#d0d0d0' }
  ];
  var selectedColor = 'purple';
  var newLook = null;        // the look being made on the new-pilot form (js/look.js), saved on REGISTER
  var previewRaf = 0;
  var direct = false;        // a form opened straight from the title's menu: its BACK goes back to the title

  function show(opts) {
    opts = opts || {};
    overlay = document.getElementById('identity-overlay');
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.classList.add('active');
    direct = !!opts.form;
    if (opts.form === 'new') showNewForm();
    else if (opts.form === 'returning') showReturningForm();
    else showChoice();
  }

  function stopPreview() { cancelAnimationFrame(previewRaf); previewRaf = 0; }

  function toTitle() { stopPreview(); BridgeState.transition('intro'); }
  function back() { if (direct) toTitle(); else showChoice(); }

  // into the ship: the title's push through the stern gallery, then the bridge
  function aboard() {
    stopPreview();
    hide();
    var go = function () { BridgeWorld.load('bridge', function () { BridgeState.transition('world', { worldId: 'bridge' }); }); };
    if (typeof BridgeIntro !== 'undefined' && BridgeIntro.board) BridgeIntro.board(go); else go();
  }

  function showChoice() {
    stopPreview();
    direct = false;
    overlay.innerHTML =
      '<div class="identity-panel">' +
        '<h2>PILOT IDENTITY</h2>' +
        '<button class="identity-btn primary" id="btn-new">NEW PILOT</button>' +
        '<button class="identity-btn" id="btn-returning">RETURNING PILOT</button>' +
        '<button class="identity-btn" id="btn-title">BACK</button>' +
      '</div>';

    document.getElementById('btn-new').addEventListener('click', showNewForm);
    document.getElementById('btn-returning').addEventListener('click', showReturningForm);
    document.getElementById('btn-title').addEventListener('click', toTitle);
  }

  function showNewForm() {
    selectedColor = 'purple';
    var swatches = '';
    for (var i = 0; i < SUIT_COLORS.length; i++) {
      var c = SUIT_COLORS[i];
      var sel = c.name === selectedColor ? ' selected' : '';
      swatches += '<div class="color-swatch' + sel + '" data-color="' + c.name + '" ' +
        'style="background:' + c.hex + ';"></div>';
    }

    // a new pilot starts bare-headed so you can see the face you're making
    newLook = BridgeLook.clean({ helmet: false });
    overlay.innerHTML =
      '<div class="identity-panel identity-wide">' +
        '<h2>NEW PILOT</h2>' +
        '<input type="text" class="identity-input" id="pilot-name" ' +
          'placeholder="ENTER CALLSIGN" maxlength="16" autocomplete="off">' +
        '<div class="identity-look"><canvas id="pilot-preview" width="96" height="144"></canvas><div id="pilot-look"></div></div>' +
        '<p style="font-size:10px;color:#555;margin:8px 0 4px;letter-spacing:1px;">SUIT COLOR</p>' +
        '<div class="identity-colors">' + swatches + '</div>' +
        '<div class="identity-error" id="id-error"></div>' +
        '<button class="identity-btn primary" id="btn-register">REGISTER</button>' +
        '<button class="identity-btn" id="btn-back-choice">BACK</button>' +
      '</div>';

    document.getElementById('pilot-name').focus();

    BridgeLook.editor(document.getElementById('pilot-look'), { look: newLook, onChange: function (l) { newLook = l; } });
    var preview = document.getElementById('pilot-preview'), t0 = performance.now();
    stopPreview();
    (function tick(now) {
      if (!preview.isConnected) { previewRaf = 0; return; }
      BridgeLook.drawPreview(preview, now - t0, 'flight', selectedColor, newLook);
      previewRaf = requestAnimationFrame(tick);
    })(t0);

    var swatchEls = overlay.querySelectorAll('.color-swatch');
    for (var i = 0; i < swatchEls.length; i++) {
      swatchEls[i].addEventListener('click', function () {
        selectedColor = this.getAttribute('data-color');
        var all = overlay.querySelectorAll('.color-swatch');
        for (var j = 0; j < all.length; j++) all[j].classList.remove('selected');
        this.classList.add('selected');
      });
    }

    document.getElementById('btn-register').addEventListener('click', doRegister);
    document.getElementById('pilot-name').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doRegister();
    });
    document.getElementById('btn-back-choice').addEventListener('click', back);
  }

  function showReturningForm() {
    stopPreview();
    overlay.innerHTML =
      '<div class="identity-panel">' +
        '<h2>RETURNING PILOT</h2>' +
        '<input type="text" class="identity-input" id="pilot-name" ' +
          'placeholder="ENTER CALLSIGN" maxlength="16" autocomplete="off">' +
        '<div class="identity-error" id="id-error"></div>' +
        '<button class="identity-btn primary" id="btn-login">LOCATE RECORDS</button>' +
        '<button class="identity-btn" id="btn-back-choice">BACK</button>' +
      '</div>';

    document.getElementById('pilot-name').focus();
    document.getElementById('btn-login').addEventListener('click', doLogin);
    document.getElementById('pilot-name').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doLogin();
    });
    document.getElementById('btn-back-choice').addEventListener('click', back);
  }

  function showError(msg) {
    var el = document.getElementById('id-error');
    if (el) el.textContent = msg;
  }

  async function doRegister() {
    var input = document.getElementById('pilot-name');
    var name = input.value.trim().toUpperCase();
    if (!name) { showError('ENTER A CALLSIGN'); return; }
    if (name.length < 2) { showError('TOO SHORT — 2 CHARACTERS MINIMUM'); return; }

    showError('');
    var btn = document.getElementById('btn-register');
    btn.textContent = 'REGISTERING...';
    btn.disabled = true;

    var result = await BridgeDB.createPilot(name, selectedColor);
    if (result.error) {
      showError(result.error);
      btn.textContent = 'REGISTER';
      btn.disabled = false;
      return;
    }

    BridgeState.setPilot(result);
    if (newLook) BridgeLook.set(newLook);
    aboard();
  }

  async function doLogin() {
    var input = document.getElementById('pilot-name');
    var name = input.value.trim().toUpperCase();
    if (!name) { showError('ENTER YOUR CALLSIGN'); return; }

    showError('');
    var btn = document.getElementById('btn-login');
    btn.textContent = 'SEARCHING...';
    btn.disabled = true;

    var result = await BridgeDB.lookupPilot(name);
    if (result.error) {
      showError(result.error);
      btn.textContent = 'LOCATE RECORDS';
      btn.disabled = false;
      return;
    }

    BridgeState.setPilot(result);
    BridgeDB.updateLastSeen(result.id);
    aboard();
  }

  function hide() {
    stopPreview();
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active');
    }
  }

  return { show: show, hide: hide };
})();
