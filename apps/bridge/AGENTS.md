# Bridge — agent instructions (Codex, Claude Code, etc.)

> **Scope: this file applies to `apps/bridge/` only.** Do not apply these art-direction or prompt rules to any other Becknology app (aether-seas, cipher-room, hub, etc.).

If you are an agent generating PNG sprites, drawing procedural art, or editing visuals for the bridge game, read these two files in this order:

1. **`apps/bridge/CLAUDE.md`** — the source of truth for the bridge's art direction (view angle, palette, procedural rules, animation hooks, sizing reference, engine integration).
2. **`apps/bridge/PNG-PROMPTS.md`** — copy/paste master prompt + per-asset prompts to feed an image model when generating PNGs.

The current art style is a **high-oblique elevated front-facing RPG building view** (Stardew / Harvest Moon / Rune Factory): full front facade visible AND most or nearly all of the roof plane visible from above. Chunky pixel art, hard edges, no anti-aliasing, transparent background. The full master prompt is embedded in both files above.

## Quick rules

- **Always paste the full master prompt** from `PNG-PROMPTS.md` when generating a new PNG. Don't paraphrase; the wording is load-bearing.
- **Don't introduce new view angles.** Every building must use the same high-oblique camera as the existing set (`tavern.png`, `inn.png`, `lighthouse.png` are the gold standard).
- **Don't use these prompts for other apps.** They are tuned to the bridge's specific art and palette.
- **Match procedural and PNG style.** Procedural canvas drawing in `js/worlds/*.js` should look like it came from the same art family — see `CLAUDE.md` "Procedural drawing rules" section.
- **Don't paint detail inside windows / lantern flames / dragon eye** — those are animation hooks; leave a flat shape.

## Working on the bridge

The bridge app lives at `apps/bridge/` (with a convenience symlink at the repo root: `bridge/ -> apps/bridge/`). Routing is configured in the repo's `vercel.json`. See the repo-root `CLAUDE.md` for monorepo conventions.

Becknology works directly on `main` — no feature branches.
