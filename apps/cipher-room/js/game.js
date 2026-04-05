/**
 * Game logic — grid rendering, input handling, timer, completion.
 * Depends on: prng.js, generator.js, storage.js, share.js, supabase.js
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
    return params.get('type') || 'flash';
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
    html += '<div class="clues-direction"><h3>&rarr; Across Signals</h3>';
    acrossWords.forEach(w => {
      html += `<div class="clue" data-number="${w.number}" data-direction="across">`;
      html += `<span class="clue-num">${w.number}.</span> ${w.clue.text}`;
      html += '</div>';
    });
    html += '</div>';

    html += '<div class="clues-direction"><h3>&darr; Down Signals</h3>';
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

  /** Highlight active clue in the clue list */
  function renderClueHighlight() {
    document.querySelectorAll('.clue').forEach(el => el.classList.remove('active-clue'));
    const activeWord = getActiveWord();
    if (activeWord) {
      const el = document.querySelector(`.clue[data-number="${activeWord.number}"][data-direction="${activeWord.direction}"]`);
      if (el) {
        el.classList.add('active-clue');
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
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

      if (r === activeRow && c === activeCol) {
        cell.classList.add('active');
      } else {
        const activeWord = getActiveWord();
        if (activeWord && activeWord.cells.some(pos => pos.r === r && pos.c === c)) {
          cell.classList.add('word-highlight');
        }
      }
    });
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
  }

  /** Handle cell click */
  function onCellClick(r, c) {
    if (completed) return;
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
    if (completed) return;
    if (activeRow < 0 || activeCol < 0) return;

    const key = e.key;

    if (key === 'Backspace') {
      e.preventDefault();
      if (playerGrid[activeRow][activeCol]) {
        playerGrid[activeRow][activeCol] = null;
      } else {
        retreatCursor();
        playerGrid[activeRow][activeCol] = null;
      }
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
      advanceCursor();
      renderGrid();
      renderClueHighlight();
      saveState();
      checkCompletion();
    }
  }

  /** Handle mobile input via the hidden input field */
  function onInput(e) {
    if (completed) return;
    const val = e.target.value;
    e.target.value = '';
    if (val && /[a-zA-Z]/.test(val)) {
      const letter = val.replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase();
      if (letter) {
        playerGrid[activeRow][activeCol] = letter;
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

  /** Save current state to localStorage */
  function saveState() {
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
    completed = true;
    clearInterval(timerInterval);
    const totalSeconds = Math.floor(elapsedMs / 1000);

    // Save completion
    if (typeof CipherStorage !== 'undefined') {
      CipherStorage.saveCompletion(puzzle.dateStr, puzzle.type, totalSeconds);
    }

    // Submit score to leaderboard
    if (typeof CipherSupabase !== 'undefined') {
      CipherSupabase.submitScore(puzzle.dateStr, puzzle.type, totalSeconds);
    }

    // Show completion overlay
    showCompletion(totalSeconds);
  }

  /** Show DISPATCH DECODED overlay */
  function showCompletion(totalSeconds) {
    const overlay = document.getElementById('completion-overlay');
    const timeStr = formatTime(totalSeconds * 1000);
    const bestTime = typeof CipherStorage !== 'undefined'
      ? CipherStorage.getBestTime(puzzle.type)
      : null;
    const isBest = bestTime !== null && totalSeconds <= bestTime;

    overlay.innerHTML = `
      <div class="completion-card">
        <div class="stamp-large">DISPATCH DECODED</div>
        <div class="time-label">OP TIME</div>
        <div class="time-result">${timeStr}</div>
        ${isBest ? '<div class="personal-best">NEW PERSONAL BEST</div>' : ''}
        <div id="leaderboard-container" class="leaderboard"></div>
        <div class="completion-actions">
          <button class="btn primary" onclick="CipherGame.copyShare()">COPY TRANSMISSION</button>
          <a href="/cipher-room" class="btn" style="text-decoration:none;text-align:center;">RETURN TO FIELD OFFICE</a>
        </div>
      </div>
    `;
    overlay.style.display = 'flex';

    // Load leaderboard
    if (typeof CipherSupabase !== 'undefined') {
      CipherSupabase.loadLeaderboard(puzzle.dateStr, puzzle.type, 'leaderboard-container');
    }
  }

  /** Copy share text */
  function copyShare() {
    if (typeof CipherShare !== 'undefined') {
      const totalSeconds = Math.floor(elapsedMs / 1000);
      CipherShare.copy(puzzle, totalSeconds);
    }
  }

  /** Start the timer */
  function startTimer() {
    startTime = Date.now() - elapsedMs;
    timerInterval = setInterval(() => {
      elapsedMs = Date.now() - startTime;
      document.getElementById('timer').textContent = formatTime(elapsedMs);
    }, 200);
  }

  /** Initialize the game */
  async function init() {
    const type = getPuzzleType();
    const today = new Date().toISOString().slice(0, 10);

    // Update header
    const typeName = type === 'flash' ? 'FLASH CIPHER' : 'FULL DOSSIER';
    const subtitleText = type === 'flash' ? 'DAILY DISPATCH — MINI' : 'DAILY DISPATCH — FULL';
    document.getElementById('puzzle-title').textContent = typeName;
    document.getElementById('puzzle-subtitle').textContent = subtitleText;

    // Generate puzzle
    try {
      puzzle = await CipherGenerator.generate(today, type);
    } catch (e) {
      console.error('Puzzle generation failed:', e);
      document.getElementById('app').innerHTML = `
        <div style="text-align:center;margin-top:80px;">
          <div class="classification">TRANSMISSION ERROR</div>
          <h1 style="margin-top:16px;">DISPATCH UNAVAILABLE</h1>
          <p class="subtitle" style="margin-top:8px;">Decoding failed. Try the other dispatch.</p>
          <a href="/cipher-room" class="btn" style="display:inline-block;margin-top:24px;text-decoration:none;">RETURN TO FIELD OFFICE</a>
        </div>
      `;
      return;
    }

    // Update dispatch info
    const dispatchNum = String(puzzle.dispatchNum).padStart(3, '0');
    document.getElementById('dispatch-info').textContent =
      `DISPATCH #${dispatchNum} — ${puzzle.station.toUpperCase()} STATION — ${formatDate(today)}`;

    // Load saved state or create fresh grid
    const saved = typeof CipherStorage !== 'undefined'
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
    if (typeof CipherStorage !== 'undefined' && CipherStorage.isCompleted(today, type)) {
      // Show completed state — fill in the correct answers
      playerGrid = puzzle.letterGrid.map(row => [...row]);
      completed = true;
      renderGrid();
      renderClues();
      document.getElementById('timer').textContent = formatTime(
        CipherStorage.getCompletionTime(today, type) * 1000
      );
      return;
    }

    renderGrid();
    renderClues();
    startTimer();

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

    // Initial focus
    focusInput();
  }

  return { init, copyShare };
})();

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', CipherGame.init);
