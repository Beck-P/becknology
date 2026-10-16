// The Royale's regulars and dealers. Each wears one of the Bridge's character sheets
// (/bridge/assets/characters/<sheet>.png, 32 × 48 frames), and the regulars play poker their own way:
//   tight: how choosy about starting hands (0 loose … 1 rock), aggro: bets and raises vs calls, bluff: how often
//   they fire with nothing, tilt: how much a big loss loosens them up.
export const NPCS = [
  { id: 'vega', name: 'Vega', sheet: 'npc-juno', tight: 0.35, aggro: 0.75, bluff: 0.22, line: 'Neon nights, loose chips.', any: true },
  { id: 'duke', name: 'Duke', sheet: 'npc-broker', tight: 0.7, aggro: 0.7, bluff: 0.08, line: 'Plays it like a ledger.', any: true },
  { id: 'moth', name: 'Moth', sheet: 'npc-quiet', tight: 0.8, aggro: 0.25, bluff: 0.03, line: 'Never says a word.', any: true },
  { id: 'kira', name: 'Kira', sheet: 'npc-liv', tight: 0.2, aggro: 0.3, bluff: 0.1, line: 'Calls anything, wins sometimes.', any: true },
  { id: 'rook', name: 'Rook', sheet: 'npc-samurai', tight: 0.5, aggro: 0.9, bluff: 0.3, line: 'Shoves when you blink.', any: true },
  { id: 'jinx', name: 'Jinx', sheet: 'npc-skier-b', tight: 0.45, aggro: 0.5, bluff: 0.15, line: 'Lucky charm on every finger.', any: true },
  { id: 'sable', name: 'Sable', sheet: 'npc-stranger', tight: 0.75, aggro: 0.8, bluff: 0.12, line: 'Reads you like a visor display.', high: true },
  { id: 'okafor', name: 'Orbit', sheet: 'npc-okafor', tight: 0.55, aggro: 0.55, bluff: 0.1, line: 'Counts outs out loud.', any: true },
  { id: 'dj', name: 'Spin', sheet: 'npc-dj', tight: 0.3, aggro: 0.65, bluff: 0.25, line: 'Here for the music.', any: true },
  { id: 'vex', name: 'Vex', sheet: 'npc-vex', tight: 0.6, aggro: 0.85, bluff: 0.18, line: 'High roller. Higher ego.', high: true },
  { id: 'inge', name: 'Ivy', sheet: 'npc-inge', tight: 0.65, aggro: 0.45, bluff: 0.06, line: 'Old money, new goggles.', high: true },
  { id: 'patron', name: 'Mohawk Mo', sheet: 'npc-patron-b', tight: 0.25, aggro: 0.6, bluff: 0.2, line: 'Second paycheck this week.', any: true },
];
export const npcById = (id) => NPCS.find((n) => n.id === id) || null;

export const DEALERS = [
  { id: 'marcel', name: 'Marcel', sheet: 'npc-steward' },
  { id: 'lux', name: 'Lux', sheet: 'npc-cashier' },
  { id: 'teo', name: 'Teo', sheet: 'npc-clerk' },
  { id: 'nadia', name: 'Nadia', sheet: 'npc-ysolde' },
];

// the patrons whose wins scroll past on the lobby's board
export const PATRONS = ['Vega', 'Duke', 'Moth', 'Kira', 'Rook', 'Jinx', 'Sable', 'Orbit', 'Spin', 'Vex', 'Ivy', 'Mohawk Mo', 'Lux', 'Cass', 'Neon Nell', 'Pip'];
