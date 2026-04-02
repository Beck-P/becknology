# Hub Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `apps/hub/index.html` into a retro-tech aesthetic with ASCII art hero, subtle purple accents, atmospheric background, and easter eggs.

**Architecture:** Single self-contained HTML file. All CSS in one `<style>` block, all JS in one `<script>` block. No build step, no external dependencies. Animations use CSS transforms/opacity only for performance.

**Tech Stack:** Vanilla HTML, CSS, JavaScript. No frameworks or CDN imports.

**Spec:** `docs/superpowers/specs/2026-04-01-hub-redesign-design.md`

---

### Task 1: Base Layout & Typography

**Files:**
- Modify: `apps/hub/index.html` (full rewrite)

- [ ] **Step 1: Replace the full contents of `apps/hub/index.html` with the new base structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Becknology</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow-x: hidden;
    }

    /* Monospace base for terminal-style elements */
    .mono {
      font-family: 'Courier New', Consolas, monospace;
    }

    /* ---- ASCII Hero ---- */
    .ascii-title {
      font-family: 'Courier New', Consolas, monospace;
      white-space: pre;
      font-size: 10px;
      line-height: 1.15;
      color: #d0d0d0;
      text-align: center;
      padding: 60px 20px 0;
      letter-spacing: 2px;
      user-select: none;
    }

    .subtitle-text {
      font-family: 'Courier New', Consolas, monospace;
      font-size: 0.8rem;
      color: #555;
      letter-spacing: 6px;
      text-transform: uppercase;
      margin-top: 20px;
      text-align: center;
    }

    .divider {
      width: 60px;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(160, 120, 220, 0.4), transparent);
      margin: 30px auto;
    }

    /* ---- App Cards ---- */
    .apps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.2rem;
      max-width: 700px;
      width: 100%;
      padding: 0 2rem;
    }

    .app-card {
      background: #111;
      border: 1px solid #1e1e1e;
      border-radius: 8px;
      padding: 1.4rem;
      text-decoration: none;
      color: inherit;
      transition: border-color 0.3s, box-shadow 0.3s;
    }

    .app-card:hover {
      border-color: rgba(160, 120, 220, 0.3);
      box-shadow: 0 0 20px rgba(160, 120, 220, 0.06);
    }

    .app-card h2 {
      font-family: 'Courier New', Consolas, monospace;
      font-size: 1rem;
      color: #ccc;
      margin-bottom: 0.4rem;
    }

    .app-card p {
      color: #666;
      font-size: 0.85rem;
      line-height: 1.4;
    }

    .tag {
      display: inline-block;
      font-family: 'Courier New', Consolas, monospace;
      background: transparent;
      color: #555;
      font-size: 0.7rem;
      padding: 0.15rem 0.5rem;
      border-radius: 3px;
      margin-top: 0.6rem;
      border: 1px solid #222;
    }

    /* ---- Footer ---- */
    .footer {
      margin-top: 80px;
      padding-bottom: 40px;
      text-align: center;
    }

    .footer p {
      font-family: 'Courier New', Consolas, monospace;
      font-size: 0.7rem;
      color: #333;
      letter-spacing: 2px;
    }

    /* ---- Responsive ---- */
    @media (max-width: 600px) {
      .ascii-title {
        font-size: 5px;
        letter-spacing: 1px;
        padding: 40px 10px 0;
      }
      .subtitle-text {
        font-size: 0.7rem;
        letter-spacing: 4px;
      }
      .apps-grid {
        padding: 0 1rem;
      }
    }
  </style>
</head>
<body>

  <div class="ascii-title">
 ██████╗ ███████╗ ██████╗██╗  ██╗███╗   ██╗ ██████╗ ██╗      ██████╗  ██████╗██╗   ██╗
 ██╔══██╗██╔════╝██╔════╝██║ ██╔╝████╗  ██║██╔═══██╗██║     ██╔═══██╗██╔════╝╚██╗ ██╔╝
 ██████╔╝█████╗  ██║     █████╔╝ ██╔██╗ ██║██║   ██║██║     ██║   ██║██║  ███╗╚████╔╝
 ██╔══██╗██╔══╝  ██║     ██╔═██╗ ██║╚██╗██║██║   ██║██║     ██║   ██║██║   ██║ ╚██╔╝
 ██████╔╝███████╗╚██████╗██║  ██╗██║ ╚████║╚██████╔╝███████╗╚██████╔╝╚██████╔╝  ██║
 ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝  ╚═╝
  </div>

  <p class="subtitle-text">games · tools · experiments</p>

  <div class="divider"></div>

  <div class="apps-grid">

    <!-- Add new apps here. Copy this card template: -->
    <a class="app-card" href="/runouts">
      <h2>> runouts</h2>
      <p>Animated random game modes to decide who gets stuck with the chores.</p>
      <span class="tag">game</span>
    </a>

    <!--
    <a class="app-card" href="/app-name">
      <h2>> app-name</h2>
      <p>Short description of what this app does.</p>
      <span class="tag">category</span>
    </a>
    -->

  </div>

  <div class="footer">
    <p>made by beck</p>
  </div>

</body>
</html>
```

- [ ] **Step 2: Verify in browser**

Open `apps/hub/index.html` directly in a browser (or via Vercel dev). Confirm:
- ASCII title renders large and centered
- Subtitle shows below in muted monospace
- Purple gradient divider is visible
- Runouts card renders with monospace title, `>` prefix, border-styled tag
- Footer shows at bottom
- On mobile (resize to 375px): ASCII title scales down, cards stack

- [ ] **Step 3: Commit**

```bash
git add apps/hub/index.html
git commit -m "hub: base layout with ASCII title, card grid, and footer"
```

---

### Task 2: Background Atmosphere

**Files:**
- Modify: `apps/hub/index.html` (add CSS rules)

- [ ] **Step 1: Add grid lines, scanlines, and purple text-shadow to the `<style>` block**

Insert these rules after the `body` rule (before the `.mono` rule):

```css
/* ---- Atmosphere ---- */
body::before {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image:
    linear-gradient(rgba(140, 100, 200, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(140, 100, 200, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
  z-index: 0;
}

body::after {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 100;
  background: repeating-linear-gradient(
    transparent,
    transparent 3px,
    rgba(0, 0, 0, 0.015) 3px,
    rgba(0, 0, 0, 0.015) 6px
  );
}
```

Also update `.ascii-title` to add the purple text-shadow:

```css
.ascii-title {
  /* ... existing properties ... */
  text-shadow: 0 0 30px rgba(160, 120, 220, 0.08);
}
```

And ensure all page content sits above the grid with a wrapper. Add to the existing body content wrapper or add:

```css
body > *:not(style) {
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 2: Verify in browser**

Confirm:
- Faint purple grid lines visible across entire page when looking closely
- Very subtle horizontal scanlines across the page (barely visible)
- ASCII title has a very faint purple glow behind it
- Grid and scanlines don't interfere with clicking cards or links

- [ ] **Step 3: Commit**

```bash
git add apps/hub/index.html
git commit -m "hub: add atmospheric grid lines, scanlines, and title glow"
```

---

### Task 3: Hero Animations

**Files:**
- Modify: `apps/hub/index.html` (add CSS keyframes and JS)

- [ ] **Step 1: Add the scanline sweep animation**

Add this CSS keyframe and update `.ascii-title`:

```css
/* ---- Animations ---- */
@keyframes scanline-sweep {
  0% { top: -10%; }
  100% { top: 110%; }
}

.ascii-title {
  position: relative;
  overflow: hidden;
}

.ascii-title::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
    180deg,
    transparent,
    rgba(160, 120, 220, 0.15),
    transparent
  );
  box-shadow: 0 0 15px rgba(160, 120, 220, 0.1);
  animation: scanline-sweep 4s linear infinite;
}
```

- [ ] **Step 2: Add the glitch effect via JavaScript**

Add a `<script>` block just before `</body>`:

```html
<script>
  // Periodic glitch effect on ASCII title
  (function() {
    const title = document.querySelector('.ascii-title');
    if (!title) return;

    function glitch() {
      const lines = title.textContent.split('\n');
      const lineIdx = Math.floor(Math.random() * lines.length);
      const offset = (Math.random() * 6 - 3).toFixed(0);

      title.style.transition = 'none';
      title.style.textShadow = `${offset}px 0 rgba(160, 120, 220, 0.3), ${-offset}px 0 rgba(100, 200, 220, 0.2)`;

      setTimeout(() => {
        title.style.textShadow = '0 0 30px rgba(160, 120, 220, 0.08)';
      }, 80);

      setTimeout(() => {
        title.style.textShadow = `${offset * 0.5}px 0 rgba(160, 120, 220, 0.15)`;
      }, 120);

      setTimeout(() => {
        title.style.textShadow = '0 0 30px rgba(160, 120, 220, 0.08)';
      }, 180);
    }

    // Glitch every 8-12 seconds
    function scheduleGlitch() {
      const delay = 8000 + Math.random() * 4000;
      setTimeout(() => {
        glitch();
        scheduleGlitch();
      }, delay);
    }

    scheduleGlitch();
  })();
</script>
```

- [ ] **Step 3: Verify in browser**

Confirm:
- A faint purple line sweeps slowly down through the ASCII title on a loop
- Every 8-12 seconds the title briefly "glitches" — a quick horizontal color split that resolves instantly
- Both effects are subtle, not distracting
- Animations don't cause layout shifts or jank

- [ ] **Step 4: Commit**

```bash
git add apps/hub/index.html
git commit -m "hub: add scanline sweep and periodic glitch animation to hero"
```

---

### Task 4: Easter Eggs

**Files:**
- Modify: `apps/hub/index.html` (add to existing `<script>` block)

- [ ] **Step 1: Add Konami code easter egg**

Add this to the existing `<script>` block:

```javascript
// Konami code: ↑↑↓↓←→←→BA
(function() {
  const konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
  let konamiIndex = 0;

  document.addEventListener('keydown', function(e) {
    if (e.keyCode === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        konamiIndex = 0;
        activateKonami();
      }
    } else {
      konamiIndex = 0;
    }
  });

  function activateKonami() {
    // Full-screen glitch flash
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;pointer-events:none;';

    document.body.appendChild(overlay);

    const colors = [
      'rgba(160, 120, 220, 0.15)',
      'rgba(100, 200, 220, 0.1)',
      'rgba(220, 120, 160, 0.1)',
      'transparent'
    ];

    let i = 0;
    const flash = setInterval(() => {
      overlay.style.background = colors[i % colors.length];
      document.body.style.transform = i % 2 === 0 ? 'translateX(2px)' : 'translateX(-2px)';
      i++;
      if (i > 12) {
        clearInterval(flash);
        document.body.style.transform = '';
        overlay.remove();
      }
    }, 50);
  }
})();
```

- [ ] **Step 2: Add click ripple effect**

Add this to the existing `<script>` block:

```javascript
// Click ripple — subtle pixel burst
(function() {
  document.addEventListener('click', function(e) {
    // Don't add ripples on interactive elements
    if (e.target.closest('a, button')) return;

    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: fixed;
      left: ${e.clientX}px;
      top: ${e.clientY}px;
      width: 4px;
      height: 4px;
      background: rgba(160, 120, 220, 0.4);
      border-radius: 0;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      animation: ripple-out 0.4s ease-out forwards;
    `;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 400);
  });
})();
```

Add the corresponding CSS keyframe to the `<style>` block:

```css
@keyframes ripple-out {
  0% {
    width: 4px;
    height: 4px;
    opacity: 0.6;
    box-shadow: 0 0 0 0 rgba(160, 120, 220, 0.3);
  }
  100% {
    width: 20px;
    height: 20px;
    opacity: 0;
    box-shadow: 0 0 8px 4px rgba(160, 120, 220, 0);
  }
}
```

- [ ] **Step 3: Verify in browser**

Confirm:
- Type the Konami code (↑↑↓↓←→←→BA) — screen briefly glitches with colored flashes and slight shake, then returns to normal
- Click on empty space — small purple pixel ripple appears and fades
- Clicking on app cards does NOT trigger ripple (navigates normally instead)
- No console errors

- [ ] **Step 4: Commit**

```bash
git add apps/hub/index.html
git commit -m "hub: add konami code easter egg and click ripple effect"
```

---

### Task 5: Final Polish & Responsive Tuning

**Files:**
- Modify: `apps/hub/index.html` (CSS tweaks)

- [ ] **Step 1: Add a subtle fade-in on page load**

Add this CSS:

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.ascii-title {
  animation: fade-in 0.8s ease-out;
}

.subtitle-text {
  animation: fade-in 0.8s ease-out 0.2s both;
}

.divider {
  animation: fade-in 0.8s ease-out 0.3s both;
}

.apps-grid {
  animation: fade-in 0.8s ease-out 0.4s both;
}

.footer {
  animation: fade-in 0.8s ease-out 0.5s both;
}
```

Note: `.ascii-title` already has `animation` for scanline-sweep on the `::after` pseudo-element. The `fade-in` goes on the element itself — these don't conflict since they target different things (element vs pseudo-element).

- [ ] **Step 2: Refine mobile breakpoint**

Update the existing `@media (max-width: 600px)` block and add a medium breakpoint:

```css
@media (max-width: 900px) {
  .ascii-title {
    font-size: 7px;
    letter-spacing: 1px;
  }
}

@media (max-width: 600px) {
  .ascii-title {
    font-size: 4.5px;
    letter-spacing: 0.5px;
    padding: 30px 10px 0;
  }
  .subtitle-text {
    font-size: 0.65rem;
    letter-spacing: 3px;
  }
  .apps-grid {
    padding: 0 1rem;
    gap: 1rem;
  }
  .footer {
    margin-top: 50px;
  }
}
```

- [ ] **Step 3: Verify in browser at multiple sizes**

Check at these widths:
- **Desktop (1200px+):** ASCII title large and centered, cards in grid
- **Tablet (~800px):** Title scales down but still readable
- **Mobile (~375px):** Title very small but still recognizable as block text, cards stack, all text readable
- **Page load:** Elements fade in with staggered timing
- **All sizes:** No horizontal scrollbar, no overflow issues

- [ ] **Step 4: Commit**

```bash
git add apps/hub/index.html
git commit -m "hub: add staggered fade-in and responsive tuning"
```
