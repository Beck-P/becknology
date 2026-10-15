// Every game's screen, by mode id. A mode without one here falls back to its old DOM playback.
import dice from "./dice.js";
import { holdem, plo } from "./poker.js";
import highcard from "./highcard.js";
import { coins, marble, slots, wheel, number } from "./classic.js";
import derby from "./derby.js";
import plinko from "./plinko.js";
import { rocket, invaders, royale, stocks, bomb } from "./heavy.js";

export const SCREENS = {
  dice,
  holdem,
  plo,
  "high-card": highcard,
  "coin-flips": coins,
  "black-marble": marble,
  slots,
  wheel,
  rng: number,
  "horse-race": derby,
  plinko,
  rocket,
  "space-invaders": invaders,
  "battle-royale": royale,
  "stock-market": { ...stocks, drafts: true },
  bomb,
};
