# Typist — Design Spec

## Overview

A typing speed test app at `/typist`. 60-second countdown, type silly sentences and random facts as fast as you can. Retro terminal aesthetic matching the hub page. Lots of bells and whistles: CRT boot animation, live stats, streak combos, sound effects, character-by-character coloring.

## Flow

### 1. CRT Boot Sequence (~1.5s)

Page loads to a black screen, then:
- Brief white horizontal line appears center-screen and expands
- Screen flickers once or twice
- Content fades in with a slight CRT warm-up glow
- Scanlines appear

### 2. Ready Screen

- ASCII art "TYPIST" title (block letters, same style as hub's "BECKNOLOGY")
- Subtitle: `a typing speed test`
- Blinking prompt: `press any key to start`
- Brief instructions below in muted text: "type the sentence. 60 seconds. go fast."

### 3. Game Screen

**Layout (top to bottom):**
- **Timer**: large monospace countdown `00:47` top-right
- **WPM**: live words-per-minute counter top-left, updates on each correct word
- **Streak**: combo counter, shows current streak of correct characters. Visual escalation:
  - 0-9: plain counter
  - 10-19: purple glow starts pulsing on the counter
  - 20+: glow intensifies, subtle screen shake on each correct keystroke
- **Sentence display**: the current sentence in large monospace text. Characters are colored as the user types:
  - Not yet typed: gray (`#555`)
  - Correct: white (`#e0e0e0`)
  - Wrong: red (`#e05050`) with a subtle shake animation on the character
- **Input area**: styled as a terminal prompt (`> ` prefix). The user types here. Auto-focuses on game start.
- **Progress**: subtle indicator of how many sentences completed

**Behavior:**
- User types the displayed sentence character by character
- Correct characters turn white, wrong ones turn red
- When a sentence is completed (all characters correct), it immediately transitions to the next sentence
- If the user types a wrong character, they must backspace and fix it before continuing
- Timer counts down from 60. When it hits 0, game ends immediately.

### 4. Results Screen

Appears after the 60-second timer expires. Shows:
- **WPM**: large, prominent number
- **Accuracy**: percentage of correct keystrokes vs total keystrokes
- **Longest streak**: best consecutive correct characters
- **Sentences completed**: how many sentences finished
- **Rank label** based on WPM:
  - 0-20: `HUNT & PECK`
  - 21-40: `NOVICE`
  - 41-60: `TYPIST`
  - 61-80: `HACKER`
  - 81-100: `MACHINE`
  - 101+: `TRANSCENDENT`
- **"press any key to restart"** blinking prompt

## Visual Style

- Background: `#0a0a0a`
- Text: monospace (`Courier New`, `Consolas`)
- Accent: `rgba(160, 120, 220, ...)` purple, same as hub
- Scanlines: same subtle CRT overlay as hub
- Grid background: same faint purple grid as hub
- All text elements use the terminal/retro aesthetic

## Sound Effects (Web Audio API)

All sounds synthesized — no external audio files.

- **Correct keystroke**: soft, short click. High-frequency blip, very quiet.
- **Wrong keystroke**: low buzz/error tone. Brief.
- **Streak milestone** (every 10): ascending chime/ding.
- **Game start**: short "power on" beep.
- **Game end**: descending tone.

Sounds should be subtle and not annoying. Volume kept low.

## Sentences Bank

~40 hardcoded sentences. Mix of:
- Silly/absurd: "i am a stinky little squirrel who likes to hide in trees"
- Random facts: "the circumference of the earth is about twenty four thousand nine hundred miles"
- Weird hypotheticals: "if you stacked all the cats in the world they would reach the moon twice"
- Pop culture: "according to all known laws of aviation a bee should not be able to fly"

All lowercase, no punctuation except periods and commas. This keeps typing flow smooth and avoids shift-key frustration.

Pulled randomly each game, no repeats within a session.

## Hub Integration

- Add rewrite to `vercel.json`: `{ "source": "/typist", "destination": "/apps/typist/index.html" }` and wildcard
- Add a card to `apps/hub/index.html` with tag `tool`
- Include a small `← hub` link in the top-left corner of the typist app

## Constraints

- Single `index.html` file, no build step
- All CSS in `<style>`, all JS in `<script>`
- No external dependencies (Web Audio API for sounds, no CDN imports)
- Must work on desktop (keyboard required — this is a typing test)
- Mobile: show a "keyboard required" message rather than a broken experience

## File Structure

- `apps/typist/index.html` — the entire app
- `vercel.json` — add rewrite
- `apps/hub/index.html` — add card
