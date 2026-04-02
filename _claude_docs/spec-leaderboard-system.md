Read `.claude/CLAUDE.md` for context on this repo.

# Leaderboard System for Runouts

## Overview

Add a persistent leaderboard to the runouts app (`apps/runouts/index.html`) that tracks every game result across sessions and devices. The leaderboard replaces the current "Recent" section below the game selection grid, showing a compact top-5 view that expands to show all players and detailed stats.

Backend: Supabase (new project, separate from Realzono). The Supabase JS client loads from CDN to keep the single-file static approach.

## Step 1: Supabase Setup

Beck will create a new Supabase project manually. The spec below describes what Claude Code needs to build in the app. Beck will provide the Supabase URL and anon key as environment-safe values (these are public/anon credentials, safe to include in client-side code).

### Database Table

One table: `runouts_games`

```sql
create table runouts_games (
  id uuid default gen_random_uuid() primary key,
  played_at timestamptz default now(),
  mode_id text not null,
  mode_name text not null,
  selection_goal text not null check (selection_goal in ('winner', 'loser')),
  stakes text,
  selected_player text not null,
  all_players jsonb not null,
  headline text
);

-- Enable RLS but allow anon insert + select (this is a casual personal app)
alter table runouts_games enable row level security;
create policy "Anyone can read games" on runouts_games for select using (true);
create policy "Anyone can insert games" on runouts_games for insert with check (true);
```

The `all_players` column stores an array of objects:
```json
[
  { "name": "Beck", "result": { "value": 73, "hand": null, "rank": 1 } },
  { "name": "Sam", "result": { "value": 45, "hand": null, "rank": 2 } }
]
```

The exact shape of `result` varies by game mode — just store whatever the current result object contains for each player so we have it for future use.

## Step 2: Recording Games

### When to Record
After every completed game (when the result is determined and shown to the user), automatically insert a row into `runouts_games`. No confirmation dialog needed — every game counts.

### What to Record
From the existing result object, extract:
- `mode_id` — e.g. "holdem", "dice"
- `mode_name` — e.g. "Texas Hold'em", "Dice Duel"
- `selection_goal` — "winner" or "loser"
- `stakes` — whatever was entered in the stakes field
- `selected_player` — the name of the player who was picked (winner or loser depending on goal)
- `all_players` — array of all player names and their result data
- `headline` — the random verdict message that was shown

### Supabase Client Setup
Load the Supabase JS client from CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Initialize with:
```js
const SUPABASE_URL = '...'; // Beck will fill these in
const SUPABASE_ANON_KEY = '...';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**IMPORTANT:** Leave placeholder values for the URL and anon key with clear comments. Beck will fill these in after creating the Supabase project. Use obvious placeholder text like `'YOUR_SUPABASE_URL'` and `'YOUR_SUPABASE_ANON_KEY'`.

### Graceful Degradation
If Supabase is unreachable or the credentials aren't set, the app should work exactly as it does now — games just won't be recorded and the leaderboard shows "No data yet." Never block gameplay because of a backend issue.

## Step 3: Leaderboard UI

### Location
Replace the current "Recent" section below the game selection grid. The leaderboard lives in the same spot.

### Compact View (Default)
Shows the **top 5 players** by win percentage (minimum 3 games to qualify) in a clean, themed table:

| Rank | Player | W-L | Win % | Streak |
|------|--------|-----|-------|--------|
| 1 | Beck | 12-4 | 75% | 🔥 W3 |
| 2 | Sam | 8-5 | 62% | L1 |
| 3 | Alex | 6-6 | 50% | W1 |
| 4 | Jess | 3-7 | 30% | L4 |
| 5 | Mike | 2-3 | 40% | W2 |

- Style this to match the retro arcade theme — pixel font headers, neon accents, dark background
- Current win streaks of 3+ get a 🔥 fire emoji
- Current loss streaks of 3+ get a 💀 skull emoji
- The #1 player gets a subtle gold glow on their row

Below the table: an **"Expand Leaderboard"** button that opens the full view.

### Expanded View (Full Stats)
When expanded, shows ALL players (not just top 5) plus additional stat columns and sections:

**Full Player Table:**

| Rank | Player | Games | W-L | Win % | Best Streak | Worst Streak | Last Played | Fav Mode |
|------|--------|-------|-----|-------|-------------|--------------|-------------|----------|

- "Fav Mode" = the game mode they've played most
- "Best Streak" = their longest ever win streak
- "Worst Streak" = their longest ever loss streak
- Sortable by clicking column headers (sort by Win %, Games, Name, etc.)

**Per-Game-Mode Breakdown:**
Below the main table, show a section for each player's per-mode stats. This could be a secondary table or an expandable row per player:

```
Beck: Hold'em 5-2 (71%) | Dice 3-1 (75%) | Wheel 2-0 (100%) | Slots 0-3 (0%)
Sam:  Hold'em 2-4 (33%) | Dice 1-2 (33%) | High Card 3-0 (100%)
```

**Head-to-Head Rivalries:**
Show rivalry records for every pair of players who have appeared in the same game 3+ times:

```
🏆 RIVALRIES
Beck vs Sam: 7-3 (Beck leads)
Beck vs Alex: 4-4 (Tied!)
Sam vs Alex: 5-2 (Sam leads)
```

A "rivalry" is defined as: two players were both in the same game, and one of them was selected (won/lost). The rivalry tracks how many times each person in the pair was the selected player.

**Fun Awards Section:**
Compute and display these fun stats:

- 🎯 **Most Accurate** — highest win % (min 5 games)
- 💀 **Cursed** — lowest win % (min 5 games)
- 🔥 **On Fire** — longest current win streak
- 📉 **Down Bad** — longest current loss streak
- 🎮 **Most Games** — most total games played
- 🎲 **Luckiest Mode** — player + mode combo with highest win % (min 3 games in that mode)
- 🪦 **Unluckiest Mode** — player + mode combo with lowest win % (min 3 games in that mode)
- ⚔️ **Biggest Rivalry** — the pair of players with the most head-to-head games

### Collapse Button
The expanded view has a "Collapse" button at the top to go back to the compact top-5 view.

## Step 4: Computing Stats Client-Side

When the leaderboard component mounts (and after each game), fetch all rows from `runouts_games` ordered by `played_at desc`. Then compute everything in JavaScript:

```js
// Pseudocode for the stat computation:

function computeStats(games) {
  const players = {}; // keyed by lowercase name

  for (const game of games) {
    const selected = game.selected_player;
    const isWinnerMode = game.selection_goal === 'winner';

    for (const p of game.all_players) {
      const key = p.name.toLowerCase();
      if (!players[key]) {
        players[key] = {
          displayName: p.name,
          games: 0, wins: 0, losses: 0,
          currentStreak: 0, // positive = wins, negative = losses
          longestWinStreak: 0, longestLossStreak: 0,
          lastPlayed: null,
          perMode: {},
          opponents: {}, // for rivalries
        };
      }

      const player = players[key];
      player.games++;
      player.lastPlayed = game.played_at;

      // Initialize per-mode stats
      if (!player.perMode[game.mode_id]) {
        player.perMode[game.mode_id] = { played: 0, wins: 0, modeName: game.mode_name };
      }
      player.perMode[game.mode_id].played++;

      // Determine if this player won or lost
      const wasSelected = p.name.toLowerCase() === selected.toLowerCase();
      const won = (isWinnerMode && wasSelected) || (!isWinnerMode && !wasSelected);

      if (won) {
        player.wins++;
        player.perMode[game.mode_id].wins++;
        player.currentStreak = player.currentStreak > 0 ? player.currentStreak + 1 : 1;
      } else {
        player.losses++;
        player.currentStreak = player.currentStreak < 0 ? player.currentStreak - 1 : -1;
      }

      player.longestWinStreak = Math.max(player.longestWinStreak, player.currentStreak > 0 ? player.currentStreak : 0);
      player.longestLossStreak = Math.max(player.longestLossStreak, player.currentStreak < 0 ? -player.currentStreak : 0);

      // Track opponents for rivalries
      for (const opp of game.all_players) {
        if (opp.name.toLowerCase() !== key) {
          const oppKey = opp.name.toLowerCase();
          if (!player.opponents[oppKey]) {
            player.opponents[oppKey] = { displayName: opp.name, games: 0, winsAgainst: 0 };
          }
          player.opponents[oppKey].games++;
          if (wasSelected && !isWinnerMode) {
            // This player was picked as loser, opponent "won"
          } else if (!wasSelected && !isWinnerMode) {
            // This player survived, count as a win against this opponent if opponent was selected
            if (opp.name.toLowerCase() === selected.toLowerCase()) {
              player.opponents[oppKey].winsAgainst++;
            }
          }
          // ... similar logic for winner mode
        }
      }
    }
  }

  return players;
}
```

**IMPORTANT NOTE on streak computation:** The pseudocode above processes games in the order they're iterated, but streaks need to be computed in chronological order. Make sure games are sorted by `played_at` ascending before computing streaks. The `currentStreak` should reflect the most recent consecutive results.

**NOTE on rivalry logic:** The rivalry win/loss is about who gets selected more often when both players are in the same game. If selection_goal is "loser", the selected player LOST — so the other players in that game "won" against them. If selection_goal is "winner", the selected player WON. Track this per-pair.

## Step 5: Styling

The leaderboard should match the runouts retro arcade aesthetic:
- Dark background consistent with the rest of the page
- Pixel font (Press Start 2P) for headers and rank numbers
- System font for stats (readability)
- Neon accent colors for highlights
- Subtle scanline effect on the leaderboard container
- Gold/amber glow on the #1 ranked player
- The expand/collapse transition should be smooth (CSS max-height transition or similar)
- The "Fun Awards" section should feel special — maybe each award is a little card/badge with an emoji and the player name in neon

## Implementation Notes

- **Everything stays in the single HTML file.** The Supabase client loads from CDN.
- **Load leaderboard data on page load** and cache it in React state. Refresh after each game completes.
- **Name normalization:** Treat names case-insensitively (lowercase for matching) but display the most recent capitalization the player used.
- **Minimum games qualifier:** Players with fewer than 3 games don't appear in the ranked leaderboard (but do appear in the expanded "all players" view). This prevents someone who played once and won from being #1 at 100%.
- **Don't block on Supabase.** The insert after a game should be fire-and-forget (don't await it in the main UI flow). The leaderboard fetch can show a brief loading state.
- **Placeholder credentials:** Use obvious placeholder strings for the Supabase URL and anon key. Include a comment explaining where to get these values.

Commit and push when done.
