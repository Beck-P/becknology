/**
 * BridgeIdentity — New/returning pilot UI.
 *
 * Renders DOM forms into #identity-overlay.
 * Flow: choice → (new pilot form | returning pilot form) → cockpit
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

  function show() {
    overlay = document.getElementById('identity-overlay');
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.classList.add('active');
    showChoice();
  }

  function showChoice() {
    overlay.innerHTML =
      '<div class="identity-panel">' +
        '<h2>PILOT IDENTITY</h2>' +
        '<button class="identity-btn primary" id="btn-new">NEW PILOT</button>' +
        '<button class="identity-btn" id="btn-returning">RETURNING PILOT</button>' +
      '</div>';

    document.getElementById('btn-new').addEventListener('click', showNewForm);
    document.getElementById('btn-returning').addEventListener('click', showReturningForm);
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

    overlay.innerHTML =
      '<div class="identity-panel">' +
        '<h2>NEW PILOT</h2>' +
        '<input type="text" class="identity-input" id="pilot-name" ' +
          'placeholder="ENTER CALLSIGN" maxlength="16" autocomplete="off">' +
        '<p style="font-size:10px;color:#555;margin:8px 0 4px;letter-spacing:1px;">SUIT COLOR</p>' +
        '<div class="identity-colors">' + swatches + '</div>' +
        '<div class="identity-error" id="id-error"></div>' +
        '<button class="identity-btn primary" id="btn-register">REGISTER</button>' +
        '<button class="identity-btn" id="btn-back-choice">BACK</button>' +
      '</div>';

    document.getElementById('pilot-name').focus();

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
    document.getElementById('btn-back-choice').addEventListener('click', showChoice);
  }

  function showReturningForm() {
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
    document.getElementById('btn-back-choice').addEventListener('click', showChoice);
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
    BridgeState.transition('cockpit');
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
    BridgeState.transition('cockpit');
  }

  function hide() {
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active');
    }
  }

  return { show: show, hide: hide };
})();
