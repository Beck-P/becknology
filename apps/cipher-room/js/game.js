/**
 * Game logic — grid rendering, input handling, timer, completion.
 * Depends on: prng.js, generator.js, storage.js, share.js, supabase.js
 * Optional: /bridge/js/shared/progression.js (coins + trophies on a decode).
 *
 * With another pilot (the Bridge's js/together.js, through /bridge/js/shared/together-frame.js): an intercept of
 * its own from the session's seed (not today's, which stays yours), the clock starting for both at once. A race:
 * each on your own grid, the other's progress shown under yours, first decoded takes it. Decode together: one
 * grid — every letter either of you types lands on the other's (`cell`), and their cursor shows on yours (`cur`).
 * Nothing's saved, ranked or paid from these; the stake is the prize.
 */

const CipherGame = (function () {
  let puzzle = null;
  let playerGrid = null; // 2D array of player-entered letters (null = empty)
  let activeRow = -1;
  let activeCol = -1;
  let direction = 'across'; // 'across' or 'down'
  let timerInterval = null;
  let startTime = null;
  let elapsedMs = 0;
  let completed = false;

  // another pilot (null when it's just you)
  const TF = window.BridgeTogetherFrame || null;
  const DUO = !!(TF && TF.cfg.mode === 'decode');
  let waiting = !!TF;            // a game with someone waits for both terminals before the clock starts
  let peerCell = null, curSent = '';

  /** Coins for decoding today's intercept of each type (paid once a day each). */
  const REWARD = { flash: 20, dossier: 60 };
  const TYPE_NAME = { flash: 'FLASH INTERCEPT', dossier: 'FULL DOSSIER' };
  const TYPE_SUB = { flash: '5\u00d75 \u00b7 SHORT BURST', dossier: '11\u00d711 \u00b7 DEEP RELAY LOG' };

  const inFrame = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
  function toBridge(msg) {
    if (!inFrame) return;
    try { window.parent.postMessage(msg, '*'); } catch (e) { /* bridge gone */ }
  }

  /** Format milliseconds as MM:SS */
  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  /** Format a date as DD MMM YYYY */
  function formatDate(dateStr) {
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const d = new Date(dateStr + 'T00:00:00');
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  /** Get puzzle type from URL params */
  function getPuzzleType() {
    const params = new URLSearchParams(window.location.search);
    return params.get('type') === 'dossier' ? 'dossier' : 'flash';
  }

  /** Render the grid */
  function renderGrid() {
    const gridEl = document.getElementById('grid');
    gridEl.innerHTML = '';
    gridEl.className = `grid size-${puzzle.size}`;

    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        if (puzzle.templateGrid[r][c] === 0) {
          cell.classList.add('black');
          const redaction = document.createElement('div');
          redaction.className = 'redaction';
          cell.appendChild(redaction);
        } else {
          cell.classList.add('white');
          // Number
          const key = `${r},${c}`;
          if (puzzle.numbers[key]) {
            const num = document.createElement('span');
            num.className = 'number';
            num.textContent = puzzle.numbers[key];
            cell.appendChild(num);
          }
          // Letter
          if (playerGrid[r][c]) {
            if (puzzle.numbers[key]) {
              // Number already added as child, add letter as text node
              const letter = document.createTextNode(playerGrid[r][c]);
              cell.appendChild(letter);
            } else {
              cell.textContent = playerGrid[r][c];
            }
          }

          cell.addEventListener('click', () => onCellClick(r, c));
        }

        gridEl.appendChild(cell);
      }
    }

    updateHighlights();
    updateProgress();
  }

  /** Render clues panel */
  function renderClues() {
    const section = document.getElementById('clues-section');
    const acrossWords = puzzle.words.filter(w => w.direction === 'across').sort((a, b) => a.number - b.number);
    const downWords = puzzle.words.filter(w => w.direction === 'down').sort((a, b) => a.number - b.number);

    let html = '';
    html += '<div class="clues-direction"><h3>&rarr; Across</h3>';
    acrossWords.forEach(w => {
      html += `<div class="clue" data-number="${w.number}" data-direction="across">`;
      html += `<span class="clue-num">${w.number}.</span> ${w.clue.text}`;
      html += '</div>';
    });
    html += '</div>';

    html += '<div class="clues-direction"><h3>&darr; Down</h3>';
    downWords.forEach(w => {
      html += `<div class="clue" data-number="${w.number}" data-direction="down">`;
      html += `<span class="clue-num">${w.number}.</span> ${w.clue.text}`;
      html += '</div>';
    });
    html += '</div>';

    section.innerHTML = html;

    // Click handler on clues to jump to that word
    section.querySelectorAll('.clue').forEach(el => {
      el.addEventListener('click', () => {
        const num = parseInt(el.dataset.number);
        const dir = el.dataset.direction;
        const word = puzzle.words.find(w => w.number === num && w.direction === dir);
        if (word) {
          direction = dir;
          const firstEmpty = word.cells.find(({ r, c }) => !playerGrid[r][c]);
          if (firstEmpty) {
            activeRow = firstEmpty.r;
            activeCol = firstEmpty.c;
          } else {
            activeRow = word.cells[0].r;
            activeCol = word.cells[0].c;
          }
          renderGrid();
          renderClueHighlight();
          focusInput();
        }
      });
    });

    renderClueHighlight();
  }

  /** Highlight active clue in the clue list and update the active clue bar */
  function renderClueHighlight() {
    document.querySelectorAll('.clue').forEach(el => el.classList.remove('active-clue'));
    const activeWord = getActiveWord();
    const bar = document.getElementById('active-clue-bar');
    if (activeWord) {
      const el = document.querySelector(`.clue[data-number="${activeWord.number}"][data-direction="${activeWord.direction}"]`);
      if (el) {
        el.classList.add('active-clue');
      }
      // Update active clue bar
      if (bar) {
        const dirLabel = activeWord.direction.toUpperCase();
        bar.innerHTML = `<span class="clue-num">${activeWord.number}.</span> <span class="clue-dir">${dirLabel}</span> &mdash; ${activeWord.clue.text}`;
      }
    } else if (bar) {
      bar.innerHTML = '';
    }
  }

  /** Get the word object that contains the active cell in the current direction */
  function getActiveWord() {
    if (activeRow < 0 || activeCol < 0) return null;
    return puzzle.words.find(w =>
      w.direction === direction &&
      w.cells.some(({ r, c }) => r === activeRow && c === activeCol)
    );
  }

  /** Update cell highlights */
  function updateHighlights() {
    document.querySelectorAll('.cell.white').forEach(cell => {
      cell.classList.remove('active', 'word-highlight');
      const r = parseInt(cell.dataset.row);
      const c = parseInt(cell.dataset.col);

      cell.classList.toggle('peer', !!(peerCell && peerCell[0] === r && peerCell[1] === c));
      if (r === activeRow && c === activeCol) {
        cell.classList.add('active');
      } else {
        const activeWord = getActiveWord();
        if (activeWord && activeWord.cells.some(pos => pos.r === r && pos.c === c)) {
          cell.classList.add('word-highlight');
        }
      }
    });
    if (DUO && !waiting && !completed && activeRow >= 0) {           // where you are, for the other's grid
      const k = activeRow + ',' + activeCol;
      if (k !== curSent) { curSent = k; TF.send('cur', { r: activeRow, c: activeCol }); }
    }
  }

  /** Update progress bar */
  function updateProgress() {
    let filled = 0;
    let total = 0;
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (puzzle.templateGrid[r][c] === 1) {
          total++;
          if (playerGrid[r][c]) filled++;
        }
      }
    }
    const pct = total > 0 ? (filled / total) * 100 : 0;
    document.getElementById('progress-fill').style.width = pct + '%';
    if (TF && !waiting && !completed && !DUO) TF.score(filled, false, Math.round(pct) + '% decrypted');
  }

  /** Handle cell click */
  function onCellClick(r, c) {
    if (completed || waiting) return;
    if (r === activeRow && c === activeCol) {
      // Toggle direction on second click
      direction = direction === 'across' ? 'down' : 'across';
      // If no word in new direction, switch back
      if (!getActiveWord()) direction = direction === 'across' ? 'down' : 'across';
    } else {
      activeRow = r;
      activeCol = c;
      // If current direction has no word here, try the other
      if (!getActiveWord()) {
        direction = direction === 'across' ? 'down' : 'across';
      }
    }
    updateHighlights();
    renderClueHighlight();
    focusInput();
  }

  /** Focus the hidden input for keyboard capture */
  function focusInput() {
    const input = document.getElementById('hidden-input');
    input.focus();
  }

  /** Move to next cell in current direction */
  function advanceCursor() {
    const word = getActiveWord();
    if (!word) return;
    const idx = word.cells.findIndex(({ r, c }) => r === activeRow && c === activeCol);
    if (idx < word.cells.length - 1) {
      activeRow = word.cells[idx + 1].r;
      activeCol = word.cells[idx + 1].c;
    }
  }

  /** Move to previous cell in current direction */
  function retreatCursor() {
    const word = getActiveWord();
    if (!word) return;
    const idx = word.cells.findIndex(({ r, c }) => r === activeRow && c === activeCol);
    if (idx > 0) {
      activeRow = word.cells[idx - 1].r;
      activeCol = word.cells[idx - 1].c;
    }
  }

  /** Handle keyboard input */
  function onKeyDown(e) {
    if (completed || waiting) return;
    if (activeRow < 0 || activeCol < 0) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts alone

    const key = e.key;

    if (key === 'Backspace') {
      e.preventDefault();
      if (playerGrid[activeRow][activeCol]) {
        playerGrid[activeRow][activeCol] = null;
      } else {
        retreatCursor();
        playerGrid[activeRow][activeCol] = null;
      }
      shareCell(activeRow, activeCol);
      renderGrid();
      renderClueHighlight();
      saveState();
      return;
    }

    if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
      e.preventDefault();
      moveArrow(key);
      updateHighlights();
      renderClueHighlight();
      return;
    }

    if (key === 'Tab') {
      e.preventDefault();
      moveToNextWord(e.shiftKey);
      updateHighlights();
      renderClueHighlight();
      return;
    }

    if (/^[a-zA-Z]$/.test(key)) {
      e.preventDefault();
      playerGrid[activeRow][activeCol] = key.toUpperCase();
      shareCell(activeRow, activeCol);
      advanceCursor();
      renderGrid();
      renderClueHighlight();
      saveState();
      checkCompletion();
    }
  }

  /** Handle mobile input via the hidden input field */
  function onInput(e) {
    if (completed || waiting) return;
    const val = e.target.value;
    e.target.value = '';
    if (val && /[a-zA-Z]/.test(val)) {
      const letter = val.replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase();
      if (letter) {
        playerGrid[activeRow][activeCol] = letter;
        shareCell(activeRow, activeCol);
        advanceCursor();
        renderGrid();
        renderClueHighlight();
        saveState();
        checkCompletion();
      }
    }
  }

  /** Arrow key navigation */
  function moveArrow(key) {
    let r = activeRow;
    let c = activeCol;
    const dr = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0;
    const dc = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;

    // Update direction to match arrow
    if (dc !== 0) direction = 'across';
    if (dr !== 0) direction = 'down';

    r += dr;
    c += dc;
    while (r >= 0 && r < puzzle.size && c >= 0 && c < puzzle.size) {
      if (puzzle.templateGrid[r][c] === 1) {
        activeRow = r;
        activeCol = c;
        if (!getActiveWord()) {
          direction = direction === 'across' ? 'down' : 'across';
        }
        return;
      }
      r += dr;
      c += dc;
    }
  }

  /** Tab to next/previous word */
  function moveToNextWord(reverse) {
    const allWords = [...puzzle.words].sort((a, b) => a.number - b.number || (a.direction === 'across' ? -1 : 1));
    const currentWord = getActiveWord();
    if (!currentWord) return;
    const idx = allWords.indexOf(currentWord);
    const nextIdx = reverse
      ? (idx - 1 + allWords.length) % allWords.length
      : (idx + 1) % allWords.length;
    const next = allWords[nextIdx];
    direction = next.direction;
    const firstEmpty = next.cells.find(({ r, c }) => !playerGrid[r][c]);
    if (firstEmpty) {
      activeRow = firstEmpty.r;
      activeCol = firstEmpty.c;
    } else {
      activeRow = next.cells[0].r;
      activeCol = next.cells[0].c;
    }
  }

  // decoding together: a letter typed (or rubbed out) here lands on the other grid too
  function shareCell(r, c) { if (DUO) TF.send('cell', { r, c, v: playerGrid[r][c] || null }); }

  /** Save current state to localStorage */
  function saveState() {
    if (!puzzle || !playerGrid || completed || TF) return;
    if (typeof CipherStorage !== 'undefined') {
      CipherStorage.saveGameState(puzzle.dateStr, puzzle.type, playerGrid, elapsedMs);
    }
  }

  /** Check if puzzle is complete and correct */
  function checkCompletion() {
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (puzzle.templateGrid[r][c] === 1) {
          if (playerGrid[r][c] !== puzzle.letterGrid[r][c]) return;
        }
      }
    }
    onComplete();
  }

  /** Handle puzzle completion */
  function onComplete() {
    stopTimer();
    completed = true;
    const totalSeconds = Math.floor(elapsedMs / 1000);
    if (TF) { togetherDone(totalSeconds); return; }
    const prevBest = typeof CipherStorage !== 'undefined' ? CipherStorage.getBestTime(puzzle.type) : null;
    const isBest = prevBest !== null && totalSeconds < prevBest;

    // Save completion
    if (typeof CipherStorage !== 'undefined') {
      CipherStorage.saveCompletion(puzzle.dateStr, puzzle.type, totalSeconds);
    }

    // Submit score to the relay rankings (the board waits for it)
    const submitted = typeof CipherSupabase !== 'undefined'
      ? CipherSupabase.submitScore(puzzle.dateStr, puzzle.type, totalSeconds).catch(() => {})
      : null;

    showCompletion(totalSeconds, isBest, submitted);
    payOut(totalSeconds, isBest);
  }

  /**
   * Coins through the Bridge: once a day per intercept type (the achievement
   * key carries the local date, so it is idempotent), plus the one-off
   * 'played_cipher_room' trophy. Safe to call again for a solved puzzle.
   */
  function payOut(totalSeconds, isBest, quiet) {
    const coins = REWARD[puzzle.type] || 20;
    const line = quiet ? null : document.getElementById('reward-line');
    const say = (t, cls) => { if (line) { line.textContent = t; line.className = 'reward-line' + (cls ? ' ' + cls : ''); } };
    const report = (paid) => {
      if (quiet) return;
      const best = typeof CipherStorage !== 'undefined' ? CipherStorage.getBestTime(puzzle.type) : null;
      toBridge({
        type: 'bridge-run-ended', game: 'cipher-room', title: 'Cipher Terminal',
        score: formatTime(totalSeconds * 1000), best: best !== null ? formatTime(best * 1000) : '--',
        newBest: !!isBest, coins: paid,
      });
    };
    report(0);

    if (typeof BridgeProgression === 'undefined' || !CipherStorage.getPilotName()) {
      say('NO PILOT ON FILE \u2014 BOARD THE BRIDGE TO GET PAID');
      return;
    }
    if (!BridgeProgression.client()) {
      say('RELAY OFFLINE \u2014 PAY NOT LOGGED');
      return;
    }
    say('LOGGING PAY\u2026');
    const key = 'cipher_' + puzzle.dateStr + '_' + puzzle.type;
    BridgeProgression.recordAchievement(key, coins, { game: 'cipher-room', type: puzzle.type, seconds: totalSeconds })
      .then((isNew) => {
        if (isNew) { say('+' + coins + ' COINS', 'paid'); report(coins); }
        else say('PAY FOR TODAY\u2019S ' + (puzzle.type === 'flash' ? 'FLASH' : 'DOSSIER') + ' ALREADY LOGGED');
      })
      .catch(() => say('RELAY OFFLINE \u2014 PAY NOT LOGGED'));
    BridgeProgression.recordAchievement('played_cipher_room', 25, { game: 'cipher-room' }).catch(() => {});
  }

  /** Show the INTERCEPT DECODED overlay */
  function showCompletion(totalSeconds, isBest, submitted) {
    const overlay = document.getElementById('completion-overlay');
    const timeStr = formatTime(totalSeconds * 1000);

    overlay.innerHTML = `
      <div class="completion-card" role="dialog" aria-label="Intercept decoded">
        <div class="stamp-large">INTERCEPT DECODED</div>
        <div class="time-label">DECODE TIME</div>
        <div class="time-result">${timeStr}</div>
        ${isBest ? '<div class="personal-best">NEW PERSONAL BEST</div>' : ''}
        <div class="reward-line" id="reward-line"></div>
        <div id="leaderboard-container" class="leaderboard"></div>
        <div class="completion-actions">
          <button class="btn primary" type="button" onclick="CipherGame.copyShare()">COPY TRANSMISSION</button>
          <a href="/cipher-room" class="btn">BACK TO INTERCEPTS</a>
          <button class="btn ghost" type="button" onclick="CipherGame.hideCompletion()">VIEW GRID</button>
        </div>
      </div>
    `;
    overlay.style.display = 'flex';

    // Load leaderboard
    if (typeof CipherSupabase !== 'undefined') {
      CipherSupabase.loadLeaderboard(puzzle.dateStr, puzzle.type, 'leaderboard-container', submitted);
    } else {
      document.getElementById('leaderboard-container').innerHTML = '<p class="muted-note">RELAY RANKINGS OFFLINE</p>';
    }
  }

  function hideCompletion() {
    const overlay = document.getElementById('completion-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  /** Copy share text */
  function copyShare() {
    if (typeof CipherShare !== 'undefined') {
      const totalSeconds = Math.floor(elapsedMs / 1000);
      CipherShare.copy(puzzle, totalSeconds);
    }
  }

  /** The decode clock: runs only while the page is visible. */
  function tick() {
    elapsedMs = Date.now() - startTime;
    document.getElementById('timer').textContent = formatTime(elapsedMs);
  }

  function startTimer() {
    if (timerInterval || completed) return;
    startTime = Date.now() - elapsedMs;
    timerInterval = setInterval(tick, 200);
  }

  function stopTimer() {
    if (!timerInterval) return;
    tick();
    clearInterval(timerInterval);
    timerInterval = null;
  }

  function onVisibility() {
    if (!puzzle || completed || waiting) return;
    if (document.hidden) {
      stopTimer();
      saveState();
    } else {
      startTimer();
    }
  }

  // ---- with another pilot ----------------------------------------------------------------------------------------
  // an intercept of the session's own: a date long before the relay's first, picked by the seed
  function togetherDate() {
    const d = new Date(Date.UTC(2001, 0, 1) + (Math.abs(TF.cfg.seed | 0) % 3650) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  function peerLine(text) {
    let el = document.getElementById('tg-peer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tg-peer';
      el.className = 'tg-peer';
      const bar = document.querySelector('.progress-bar');
      bar.parentNode.insertBefore(el, bar.nextSibling);
    }
    el.textContent = text;
  }
  function togetherDone(totalSeconds) {
    const t = formatTime(totalSeconds * 1000);
    // a race: the quicker the higher (an unfinished grid counts its letters); together: you made it
    TF.score(DUO ? 1 : Math.max(1000, 36000 - totalSeconds), true, DUO ? 'decoded in ' + t : t);
    const overlay = document.getElementById('completion-overlay');
    overlay.innerHTML = `
      <div class="completion-card" role="dialog" aria-label="Intercept decoded">
        <div class="stamp-large">INTERCEPT DECODED</div>
        <div class="time-label">${DUO ? 'DECODED TOGETHER IN' : 'DECODE TIME'}</div>
        <div class="time-result">${t}</div>
        <div class="reward-line" id="tg-verdict">${TF.peer && TF.peer.done ? '' : 'WAITING FOR ' + String(TF.cfg.vs).toUpperCase() + '\u2026'}</div>
        <div class="completion-actions"><button class="btn ghost" type="button" onclick="CipherGame.hideCompletion()">VIEW GRID</button></div>
      </div>`;
    overlay.style.display = 'flex';
  }
  function togetherInit() {
    document.body.classList.add('together');
    const back = document.querySelector('.back-link');
    if (back) back.hidden = true;
    const vs = String(TF.cfg.vs).toUpperCase();
    document.getElementById('puzzle-subtitle').textContent = (DUO ? 'DECODING WITH ' : 'RACING ') + vs + (TF.cfg.wager ? ' \u00b7 ' + TF.cfg.wager + ' EACH' : '');
    document.getElementById('active-clue-bar').innerHTML = '<span class="clue-dir">STANDBY</span> Waiting for ' + vs + '\u2019s terminal\u2026';
    peerLine(DUO ? vs + ' IS ON THE LINE' : vs + ' \u00b7 0% DECRYPTED');
    document.getElementById('dispatch-info').textContent = 'AN INTERCEPT FOR TWO \u00b7 ' + String(puzzle.station).toUpperCase();
    TF.on('start', () => {
      if (!waiting) return;
      waiting = false;
      startTimer();
      updateHighlights();
      renderClueHighlight();
      focusInput();
    });
    TF.on('peer', (p) => { if (!DUO) peerLine(vs + ' \u00b7 ' + (p.done ? 'DECODED IN ' + p.label : (p.label || '').toUpperCase())); });
    TF.on('data', (m) => {
      if (!m || !m.d) return;
      if (m.k === 'cell' && DUO && !completed) {
        const { r, c, v } = m.d;
        if (!playerGrid[r] || puzzle.templateGrid[r][c] !== 1) return;
        playerGrid[r][c] = v ? String(v).toUpperCase().slice(0, 1) : null;
        peerCell = [r, c];
        renderGrid();
        renderClueHighlight();
        checkCompletion();
      } else if (m.k === 'cur' && DUO) {
        peerCell = [m.d.r, m.d.c];
        const w = puzzle.words.find((x) => x.cells.some(({ r, c }) => r === m.d.r && c === m.d.c));
        peerLine(vs + (w ? ' IS ON ' + w.number + ' ' + w.direction.toUpperCase() : ' IS ON THE LINE'));
        updateHighlights();
      }
    });
    TF.on('verdict', (v) => {
      const line = document.getElementById('tg-verdict');
      const text = String(v.head).toUpperCase() + (v.paid ? ' \u00b7 +' + v.paid + ' COINS' : '');
      if (line) { line.textContent = text; line.className = 'reward-line' + (v.outcome === 'win' || v.outcome === 'made' ? ' paid' : ''); }
      else peerLine(text);
    });
    TF.on('gone', () => { peerLine(vs + ' LEFT THE RELAY \u00b7 YOUR STAKE IS BACK'); });
    TF.ready();
  }

  /** Initialize the game */
  async function init() {
    const type = getPuzzleType();
    const today = TF ? togetherDate() : CipherStorage.localDate();

    // Update header
    document.getElementById('puzzle-title').textContent = TYPE_NAME[type];
    document.getElementById('puzzle-subtitle').textContent = TYPE_SUB[type];
    document.title = TYPE_NAME[type] + ' \u2014 Cipher Terminal';

    // Resolve the leaderboard identity in the background (pilot name)
    if (typeof CipherSupabase !== 'undefined') CipherSupabase.ensureAgent().catch(() => {});

    // Generate puzzle
    try {
      puzzle = await CipherGenerator.generate(today, type);
    } catch (e) {
      console.error('Puzzle generation failed:', e);
      document.getElementById('app').innerHTML = `
        <div class="error-panel">
          <div class="classification">CARRIER LOST</div>
          <h1>INTERCEPT CORRUPTED</h1>
          <p class="subtitle">The cipher engine dropped this packet. Try the other intercept.</p>
          <a href="/cipher-room" class="btn">BACK TO INTERCEPTS</a>
        </div>
      `;
      return;
    }

    // Update intercept info
    const dispatchNum = String(puzzle.dispatchNum).padStart(3, '0');
    document.getElementById('dispatch-info').textContent =
      `INTERCEPT #${dispatchNum} \u00b7 ${puzzle.station.toUpperCase()} \u00b7 ${formatDate(today)}`;

    // Load saved state or create fresh grid (a game with someone always starts fresh)
    const saved = typeof CipherStorage !== 'undefined' && !TF
      ? CipherStorage.loadGameState(today, type)
      : null;

    if (saved) {
      playerGrid = saved.grid;
      elapsedMs = saved.elapsedMs || 0;
    } else {
      playerGrid = Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill(null));
      elapsedMs = 0;
    }

    // Check if already completed
    if (typeof CipherStorage !== 'undefined' && !TF && CipherStorage.isCompleted(today, type)) {
      // Show completed state — fill in the correct answers
      playerGrid = puzzle.letterGrid.map(row => [...row]);
      completed = true;
      renderGrid();
      renderClues();
      const secs = CipherStorage.getCompletionTime(today, type);
      document.getElementById('timer').textContent = formatTime(secs * 1000);
      document.body.classList.add('solved');
      document.getElementById('active-clue-bar').innerHTML =
        '<span class="clue-dir">DECODED</span> Today\u2019s intercept is clear. A new one lands at midnight.';
      // Idempotent: settles today's pay if it didn't reach the Bridge last time.
      payOut(secs, false, true);
      return;
    }

    renderGrid();
    renderClues();
    if (!TF) startTimer();

    // Set initial active cell to first white cell
    for (let r = 0; r < puzzle.size && activeRow < 0; r++) {
      for (let c = 0; c < puzzle.size && activeRow < 0; c++) {
        if (puzzle.templateGrid[r][c] === 1) {
          activeRow = r;
          activeCol = c;
        }
      }
    }
    updateHighlights();
    renderClueHighlight();

    // Input handlers
    const hiddenInput = document.getElementById('hidden-input');
    hiddenInput.addEventListener('keydown', onKeyDown);
    hiddenInput.addEventListener('input', onInput);

    // Focus input on grid container click
    document.querySelector('.grid-container').addEventListener('click', focusInput);

    // The clock stops while the tab (or the Bridge around us) is hidden
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', () => { if (!completed) { stopTimer(); saveState(); } });
    window.addEventListener('pageshow', (e) => { if (e.persisted && !document.hidden) startTimer(); });
    if (document.hidden) onVisibility();

    // Initial focus
    focusInput();
    if (TF) togetherInit();
  }

  return { init, copyShare, hideCompletion, _puzzle: () => puzzle, _grid: () => playerGrid,
           _type: (r, c, v) => { if (completed || waiting) return; activeRow = r; activeCol = c; playerGrid[r][c] = v; shareCell(r, c); renderGrid(); checkCompletion(); } };
})();

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', CipherGame.init);
