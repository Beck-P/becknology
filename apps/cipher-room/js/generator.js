/**
 * Crossword generator.
 * Uses a pre-made grid template + backtracking to fill words.
 *
 * Depends on: prng.js (createPRNG, dateSeed, shuffle)
 */

const CipherGenerator = (function () {
  let templates = null;
  let wordList = null;

  /** Load data files. Call once before generating. */
  async function loadData() {
    if (templates && wordList) return;
    const [tRes, wRes] = await Promise.all([
      fetch('/cipher-room/data/templates.json'),
      fetch('/cipher-room/data/words.json'),
    ]);
    templates = await tRes.json();
    wordList = await wRes.json();
  }

  /** Extract word slots from a template grid.
   *  Returns array of { row, col, direction, length, cells: [{r,c}...] } */
  function extractSlots(grid) {
    const size = grid.length;
    const slots = [];

    // Across slots
    for (let r = 0; r < size; r++) {
      let start = null;
      for (let c = 0; c <= size; c++) {
        const isWhite = c < size && grid[r][c] === 1;
        if (isWhite && start === null) start = c;
        if (!isWhite && start !== null) {
          const length = c - start;
          if (length >= 3) {
            const cells = [];
            for (let k = start; k < c; k++) cells.push({ r, c: k });
            slots.push({ row: r, col: start, direction: 'across', length, cells });
          }
          start = null;
        }
      }
    }

    // Down slots
    for (let c = 0; c < size; c++) {
      let start = null;
      for (let r = 0; r <= size; r++) {
        const isWhite = r < size && grid[r][c] === 1;
        if (isWhite && start === null) start = r;
        if (!isWhite && start !== null) {
          const length = r - start;
          if (length >= 3) {
            const cells = [];
            for (let k = start; k < r; k++) cells.push({ r: k, c });
            slots.push({ row: start, col: c, direction: 'down', length, cells });
          }
          start = null;
        }
      }
    }

    return slots;
  }

  /** Assign clue numbers. Returns map of "r,c" -> number. */
  function assignNumbers(slots) {
    const numbered = {};
    let num = 1;
    // Sort by position: top-to-bottom, left-to-right
    const starts = [];
    slots.forEach((s) => {
      const key = `${s.row},${s.col}`;
      if (!starts.find((x) => x.key === key)) {
        starts.push({ key, row: s.row, col: s.col });
      }
    });
    starts.sort((a, b) => a.row - b.row || a.col - b.col);
    starts.forEach((s) => {
      numbered[s.key] = num++;
    });
    return numbered;
  }

  /** Try to fill all slots with words using backtracking.
   *  Uses most-constrained-variable heuristic: always picks the unfilled
   *  slot with the fewest compatible words next. Much faster for dense grids.
   *  Returns filled letter grid or null if impossible. */
  function fillGrid(templateGrid, slots, words, rng, timeoutMs) {
    const size = templateGrid.length;
    const letterGrid = Array.from({ length: size }, () => Array(size).fill(null));
    const usedWords = new Set();
    const filled = new Array(slots.length).fill(false);

    // Group words by length
    const wordsByLength = {};
    words.forEach((w) => {
      const len = w.word.length;
      if (!wordsByLength[len]) wordsByLength[len] = [];
      wordsByLength[len].push(w);
    });

    // Timeout: give up if taking too long
    const deadline = Date.now() + (timeoutMs || 3000);

    function getCompatibleWords(slot) {
      const candidates = wordsByLength[slot.length] || [];
      return candidates.filter((w) => {
        if (usedWords.has(w.word)) return false;
        for (let i = 0; i < slot.cells.length; i++) {
          const { r, c } = slot.cells[i];
          if (letterGrid[r][c] !== null && letterGrid[r][c] !== w.word[i]) return false;
        }
        return true;
      });
    }

    function placeWord(slot, word) {
      const prev = [];
      for (let i = 0; i < slot.cells.length; i++) {
        const { r, c } = slot.cells[i];
        prev.push(letterGrid[r][c]);
        letterGrid[r][c] = word[i];
      }
      usedWords.add(word);
      return prev;
    }

    function removeWord(slot, word, prev) {
      for (let i = 0; i < slot.cells.length; i++) {
        const { r, c } = slot.cells[i];
        letterGrid[r][c] = prev[i];
      }
      usedWords.delete(word);
    }

    function solve(depth) {
      if (Date.now() > deadline) return false;

      // Find unfilled slot with fewest compatible words (MCV heuristic)
      let bestIdx = -1;
      let bestCount = Infinity;
      for (let i = 0; i < slots.length; i++) {
        if (filled[i]) continue;
        const count = getCompatibleWords(slots[i]).length;
        if (count === 0) return false; // Dead end — prune immediately
        if (count < bestCount) { bestCount = count; bestIdx = i; }
      }
      if (bestIdx === -1) return true; // All slots filled

      const slot = slots[bestIdx];
      const candidates = shuffle(getCompatibleWords(slot), rng);
      filled[bestIdx] = true;

      for (const candidate of candidates) {
        const prev = placeWord(slot, candidate.word);
        if (solve(depth + 1)) return true;
        removeWord(slot, candidate.word, prev);
      }

      filled[bestIdx] = false;
      return false;
    }

    if (solve(0)) return letterGrid;
    return null;
  }

  /** Station names for dispatch flavor. */
  const STATIONS = [
    'Cairo', 'Berlin', 'Vienna', 'Istanbul', 'Lisbon', 'Tangier',
    'Casablanca', 'Zurich', 'Prague', 'Moscow', 'Havana', 'Manila',
    'Saigon', 'Bogota', 'Marrakech', 'Budapest', 'Stockholm', 'Oslo',
    'Athens', 'Nairobi', 'Lima', 'Santiago', 'Beirut', 'Tehran',
    'Bucharest', 'Helsinki', 'Reykjavik', 'Montevideo', 'Hanoi', 'Algiers',
  ];

  /** Reference date for dispatch numbering. */
  const EPOCH = new Date('2026-04-01');

  /**
   * Generate a puzzle for a given date and type.
   * @param {string} dateStr - e.g. "2026-04-04"
   * @param {string} type - "flash" (5x5) or "dossier" (11x11)
   * @returns {object} puzzle object
   */
  async function generate(dateStr, type) {
    await loadData();

    const size = type === 'flash' ? 5 : 11;
    const sizeKey = String(size);
    const seed = dateSeed(dateStr + ':' + type);
    const rng = createPRNG(seed);

    // Filter words to appropriate lengths
    // 11x11 templates use max 6-letter slots for reliable generation
    const maxLen = type === 'flash' ? 5 : 6;
    const relevantWords = wordList.filter((w) => w.word.length >= 3 && w.word.length <= maxLen);

    // Try all templates in shuffled order until one fills successfully
    const pool = [...templates[sizeKey]];
    shuffle(pool, rng);

    let letterGrid = null;
    let chosenTemplate = null;
    let chosenSlots = null;

    for (const template of pool) {
      const slots = extractSlots(template.grid);
      // Try with a fresh RNG seeded per template to get different word orderings
      const templateRng = createPRNG(seed + dateSeed(template.id));
      const timeout = size === 11 ? 10000 : 3000;
      const result = fillGrid(template.grid, slots, relevantWords, templateRng, timeout);
      if (result) {
        letterGrid = result;
        chosenTemplate = template;
        chosenSlots = slots;
        break;
      }
    }

    if (!letterGrid) {
      throw new Error('Failed to generate puzzle — not enough words to fill any template');
    }

    // Assign numbers
    const numbers = assignNumbers(chosenSlots);

    // Build word entries with clues
    const words = chosenSlots.map((slot) => {
      const word = slot.cells.map(({ r, c }) => letterGrid[r][c]).join('');
      const entry = wordList.find((w) => w.word === word);
      const clue = entry.clues[Math.floor(rng() * entry.clues.length)];
      const num = numbers[`${slot.row},${slot.col}`];
      return { word, row: slot.row, col: slot.col, direction: slot.direction, number: num, clue, cells: slot.cells };
    });

    // Dispatch number (days since epoch)
    const puzzleDate = new Date(dateStr);
    const dispatchNum = Math.floor((puzzleDate - EPOCH) / 86400000) + 1;

    // Station name
    const station = STATIONS[Math.floor(rng() * STATIONS.length)];

    return {
      dateStr,
      type,
      size,
      dispatchNum,
      station,
      templateGrid: chosenTemplate.grid,
      letterGrid,
      numbers,
      words,
    };
  }

  return { loadData, generate };
})();
