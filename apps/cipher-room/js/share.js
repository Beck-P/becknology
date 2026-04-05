/**
 * Share text builder for The Cipher Room.
 */

const CipherShare = (function () {
  function formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function copy(puzzle, timeSeconds) {
    const dispatchNum = String(puzzle.dispatchNum).padStart(3, '0');
    const typeName = puzzle.type === 'flash' ? 'FLASH CIPHER' : 'FULL DOSSIER';
    const timeStr = formatTime(timeSeconds);

    const text = [
      '═══════════════════════',
      '  TRANSMISSION — CIPHER ROOM',
      `  DISPATCH #${dispatchNum} — ${puzzle.station.toUpperCase()} STATION`,
      `  ${typeName} — DECODED`,
      `  OP TIME: ${timeStr}`,
      '  STATUS: ██████████ COMPLETE',
      '═══════════════════════',
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      // Brief visual feedback
      const btn = document.querySelector('.completion-actions .btn.primary');
      if (btn) {
        const original = btn.textContent;
        btn.textContent = 'COPIED TO CLIPBOARD';
        setTimeout(() => { btn.textContent = original; }, 2000);
      }
    });
  }

  return { copy };
})();
