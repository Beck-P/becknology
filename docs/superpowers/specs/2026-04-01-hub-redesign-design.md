# Hub Page Redesign — Design Spec

## Overview

Redesign the becknology hub page (`apps/hub/index.html`) from its current minimal dark layout into a retro-tech aesthetic with ASCII art, subtle animations, and personality.

## Visual Direction

**Palette:** Predominantly black, white, and gray. Subtle purple accents (borders, glows, grid lines) — never saturated or neon. Think monochrome with a whisper of color.

- Background: `#0a0a0a` (near-black)
- Text: `#e0e0e0` (light gray), `#666` (muted), `#333` (very muted)
- Accent: `rgba(160, 120, 220, ...)` at low opacity for purple touches
- Cards: `#111` background, `#1e1e1e` borders

**Typography:** Monospace (`Courier New`, `Consolas`) for the title, tags, and terminal-style elements. System sans-serif for body text (descriptions).

**Vibe:** Muted retro-tech. Sophisticated, not garish. The retro elements should feel like subtle nods, not cosplay.

## Page Structure

### 1. Hero — ASCII Art Title

A large ASCII block-letter "BECKNOLOGY" rendered in `<pre>` or monospace `<div>`. This is the centerpiece of the page and should take up significant vertical space.

- Uses Unicode box-drawing / block characters (like `██╗`, `╔══`, etc.)
- Color: light gray (`#d0d0d0`) with very faint purple text-shadow
- Animated effects layered on top:
  - Subtle scanline sweep (a semi-transparent bar that slowly scrolls down over the text)
  - Optional: periodic glitch effect (brief horizontal displacement of a random line, every ~8-12 seconds)
  - Optional: gentle color shift animation on the text-shadow (purple → slightly different purple, very slow)

### 2. Subtitle

Below the ASCII title: `games · tools · experiments` in monospace, uppercase, wide letter-spacing, muted gray (`#555`).

### 3. Divider

A thin horizontal line (1px) with a purple gradient that fades to transparent on both ends. About 60px wide, centered.

### 4. App Cards Grid

Same responsive grid as current (`auto-fill, minmax(280px, 1fr)`) but with upgraded styling:

- Dark card background (`#111`) with subtle border (`#1e1e1e`)
- Card titles prefixed with `>` in monospace (terminal prompt style)
- On hover: border shifts to faint purple, very subtle purple box-shadow glow
- Tags styled as monospace with a border instead of just background color
- Max-width ~700px to keep cards from stretching too wide

### 5. Background Atmosphere

Layered behind all content:

- **Grid lines**: Very faint purple grid (`rgba(140,100,220,0.03)`) at 40px spacing, applied via CSS `background-image` on `body::before`
- **Scanlines**: Nearly invisible repeating horizontal lines over the entire page (opacity ~0.015), purely cosmetic CRT nod
- Optional: a few tiny "star" dots positioned absolutely with low opacity, barely visible

### 6. Footer

Simple centered footer at the bottom: `made by beck` in small monospace, very dark color (`#333`).

### 7. Easter Eggs

Interactive hidden elements for fun:

- **Konami code** (↑↑↓↓←→←→BA): triggers a brief visual effect — could be a full-screen glitch, color inversion, or a hidden message appearing
- **Click effects**: subtle pixel-burst or small flash on click anywhere on the page
- At least one easter egg, more can be added iteratively

## Constraints

- Single `index.html` file, no build step
- All CSS inline in `<style>` tag
- All JS inline in `<script>` tag
- No external dependencies (CDN imports OK if truly needed, like a pixel font, but prefer self-contained)
- Must remain responsive / work on mobile
- Animations must be performant (CSS transforms/opacity only, no layout thrashing)
- Keep existing card template comment for adding future apps

## What's NOT Changing

- Routing setup (`vercel.json` rewrites)
- App folder structure
- The fact that this is a static HTML page
- The Runouts card content (though its styling will be upgraded)

## Open for Iteration

These details are best refined in code rather than spec:

- Exact ASCII art font/style for the title
- Animation timing and intensity
- Specific easter egg implementations
- Whether to add pixel-art icons per app card
- Exact purple accent hue tuning
