/**
 * Share text for the cipher terminal.
 */

const CipherShare = (function () {
  function formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function feedback(label) {
    const btn = document.querySelector('.completion-actions .btn.primary');
    if (!btn) return;
    const original = btn.dataset.label || btn.textContent;
    btn.dataset.label = original;
    btn.textContent = label;
    setTimeout(() => { btn.textContent = original; }, 2000);
  }

  function copy(puzzle, timeSeconds) {
    const num = String(puzzle.dispatchNum).padStart(3, '0');
    const typeName = puzzle.type === 'flash' ? 'FLASH INTERCEPT' : 'FULL DOSSIER';

    const text = [
      '== ENIGMA RELAY // INTERCEPTS ==',
      `INTERCEPT #${num} - ${puzzle.station.toUpperCase()}`,
      `${typeName} - DECODED IN ${formatTime(timeSeconds)}`,
      'STATUS: [##########] CLEAR',
    ].join('\n');

    const done = () => feedback('COPIED');
    const fail = () => feedback(fallbackCopy(text) ? 'COPIED' : 'COPY BLOCKED');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fail);
    } else {
      fail();
    }
  }

  return { copy };
})();
