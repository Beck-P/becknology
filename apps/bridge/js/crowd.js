/**
 * BridgeCrowd — passers-by (assets/crowds.json). Beck: "need lots of people".
 *
 * The cast (people.json, js/routines.js) are the people you know; the crowd is everyone else: people coming out of
 * doors, crossing to a stall, standing at a counter a while, sitting at a table, going in somewhere else or off the
 * edge of the map. A place with no entry in crowds.json has nobody (Midnight Isle, the Last Ridge, the Singularity,
 * Enigma, your own homes).
 *
 *   "lumar-square": { "n": 12, "wardrobe": "lumar", "busy": "day" }
 *
 *   n         how many at the busiest
 *   wardrobe  who they are and what they wear (WARDROBES below: the bodies, their colours, their names)
 *   busy      when it's busiest: day · night (taverns) · bustle (Arcadia's 8pm–1am ET rush) · always
 *   sit       the share who come to sit down where there are seats (assets/actions.json), default 0.5 indoors
 *   pass      the share who just walk through, from one way in to another (default 0.55 on Arcadia's streets, 0.3 outdoors)
 *   adults    no children (always so where it's busiest at night: the taverns)
 *   emerge    n: people also step out of the open ground and fade away into it (Sylvara's elves, among the trees)
 *   sources / spots   [[x, y]] more ways in, and more places to stand (facing as a third entry), than the place's own
 *   avoid     [[x0, y0, x1, y1]] tiles to keep clear
 *
 * **Everyone sees the same crowd.** Each place has a number of slots; a slot's day is a run of visits of its own
 * length, and a visit — who it is, where they come in, where they go, how long they stop, where they leave — is worked
 * out from a hash of the place, the slot and the visit's number. Whether a slot is out at all is decided at the
 * visit's start from how busy the place is then (the planet's clock, the weather, a festival), so nobody pops out of
 * the air mid-walk, and two pilots in one place see the same people in the same spots with nothing sent between them.
 *
 * **The art** is a handful of bodies (characters.py EXTRAS, tools/bridge-art/crowd.sh) rendered in key colours (XKEYS)
 * and swapped as a sheet loads for a wardrobe's skin, hair and clothes — as js/look.js does the pilot's — so a few
 * renders make hundreds of different people. Each body has a seated sheet for the chairs and stools.
 *
 * What they don't do: block anything (they're never solid; they ease aside as you pass), stand in a door, or talk at
 * length — E on one gets a line, and now and then someone wants something you might be carrying.
 *
 * BridgeCrowd.gather(worldId, { x, y, r, n, until, face, id, start }) → { release() }   people come and stand round a
 *   point (an event: js/events.js), facing it, till `until`, then go. The same `id` gathers once.
 * BridgeCrowd.react(worldId, { x, y, r, kind })   'flee' (they step away), 'look' (they turn to it), 'cheer' (they hop)
 * BridgeCrowd._here() → who's out where you are (tests) · _count(worldId) → how many there now · _plan(worldId, i)
 */
var BridgeCrowd = (function () {
  var CFG = null;
  fetch('/bridge/assets/crowds.json?v=' + Date.now()).then(function (r) { return r.json(); })
    .then(function (d) { CFG = d; }).catch(function () { CFG = {}; });
  var SEATS = null;
  fetch('/bridge/assets/actions.json?v=' + Date.now()).then(function (r) { return r.json(); })
    .then(function (d) { SEATS = d; }).catch(function () { SEATS = {}; });

  var FW = 32, FH = 48, DIR = { down: 0, right: 1, up: 2, left: 3 }, IDLE = [0, 1, 2, 1];
  function idleCol(k) { return k % 12 === 5 ? 3 : IDLE[k % 4]; }   // breathing, and now and then idle3: a blink
  var PHONE = (function () { try { return matchMedia('(pointer: coarse)').matches || innerWidth < 760; } catch (e) { return false; } })();
  var CAP = PHONE ? 12 : 28;                   // at most this many drawn in one place

  // ---- who they are --------------------------------------------------------------------------------------------------
  // the key colours the sheets are drawn in (keep in step with XKEYS in tools/bridge-art/characters.py)
  var XKEYS = {
    skin: ['#704000', '#b06000', '#f08000'], hair: ['#007060', '#00b090', '#00f0c0'], top: ['#700060', '#b00090', '#f000c0'],
    bot: ['#606000', '#909000', '#c0c000'], out: ['#305070', '#4878b0', '#60a0f0'], hat: ['#407000', '#60b000', '#80f000']
  };
  var SKINS = [['#9a6a4e', '#d8a07a', '#f0c49c'], ['#7a4e36', '#b0784e', '#cc9468'], ['#3e2418', '#6a3e28', '#8a563a'],
               ['#b48468', '#ecc0a0', '#fcdcc4']];
  var HAIRS = { dark: ['#2a1a10', '#4a2e1a', '#6a4428'], black: ['#1a1410', '#2e2218', '#44342a'], brown: ['#5a3a1a', '#8a5a2a', '#aa7a42'],
                auburn: ['#6a2a14', '#9a4422', '#c06030'], blond: ['#a8843a', '#d8b058', '#f0d080'], ginger: ['#8a3a10', '#b85a1a', '#d87a2a'],
                grey: ['#6a6a70', '#a0a0a8', '#c8c8d0'], white: ['#9a9aa0', '#c8c8d0', '#ececf2'],
                pink: ['#c06080', '#e080a0', '#f0a8c0'], teal: ['#1a6a70', '#30b0b8', '#60e0e8'], violet: ['#5a1a4a', '#8a2a70', '#b04a90'],
                silver: ['#7a8a96', '#b4c4d0', '#e0ecf4'] };
  var NATURAL = ['dark', 'black', 'brown', 'brown', 'auburn', 'blond', 'ginger', 'dark', 'black'];
  // the bodies (assets/characters/crowd/<body>.png and <body>-sit.png) and who wears what where; colours are mid
  // tones, shaded into three bands as the NPCs' are (shade)
  var MEN = ['man', 'man-cap', 'vest', 'worker', 'elder', 'suit', 'elf', 'merchant', 'mystic-m'],
      WOMEN = ['woman', 'woman-bun', 'woman-hat', 'woman-hood', 'gown', 'elf-braid', 'woman-shawl', 'mystic'];
  var WARDROBES = {
    lumar: {
      bodies: { man: 3, 'man-cap': 3, vest: 3, worker: 2, elder: 2, traveller: 1, woman: 3, 'woman-bun': 2, 'woman-hood': 2, child: 1, 'child-cap': 1 },
      top: ['#d8d0bc', '#5a6a7a', '#2e4054', '#7a4a2a', '#4a7244', '#8a2a20', '#5a5070', '#b8a880', '#a89e8a'],
      bot: ['#3e3646', '#2a3548', '#4a3a28', '#3a4a3a', '#5e5a50', '#2e2a30'],
      out: ['#22304a', '#5e3a22', '#b88a20', '#2a5a40', '#7a5032', '#9a968c', '#3a2e4a'],
      hat: ['#22304a', '#7a2020', '#5e4228', '#3a5078', '#2a5a40', '#4a4a52'],
      umbrella: ['#1e1e28', '#22304a', '#7a2020', '#b88a20', '#2a5a40'],
      names: { m: ['Tobin', 'Edric', 'Harl', 'Bram', 'Nils', 'Corwin', 'Fenn', 'Garret', 'Osric', 'Wim', 'Jory', 'Ansel'],
               f: ['Marla', 'Nessa', 'Brin', 'Ottilie', 'Sabine', 'Wenna', 'Liddy', 'Rhosyn', 'Tess', 'Morag', 'Elsa', 'Hild'],
               c: ['Pip', 'Kit', 'Tam', 'Wren', 'Nib', 'Dot'] }
    },
    crown: {      // the capital: the same seas, better cloth
      bodies: { man: 2, 'man-cap': 2, vest: 3, elder: 2, traveller: 1, suit: 1, woman: 3, 'woman-bun': 2, 'woman-hood': 1, gown: 1, child: 1, 'child-cap': 1 },
      top: ['#e4e0d4', '#2a4084', '#6a2a5a', '#1a3a2a', '#8a2a20', '#5a6a7a', '#c8a050', '#34466a'],
      bot: ['#22304a', '#3e3646', '#2e2a30', '#4a3a28', '#1c1c26'],
      out: ['#1a2a5a', '#5a1424', '#2a5a40', '#7a5a18', '#3a2416', '#e2d8c8'],
      hat: ['#1a2a5a', '#3a2416', '#5a1424', '#22304a'],
      umbrella: ['#1e1e28', '#1a2a5a', '#5a1424', '#2a5a40'],
      names: null
    },
    pirates: {
      bodies: { 'man-cap': 3, vest: 3, worker: 3, traveller: 2, woman: 1, 'woman-hood': 2 },
      top: ['#8a2a20', '#2e2a30', '#5e3a22', '#a89e8a', '#3a2e4a', '#5a1424'],
      bot: ['#2e2a30', '#3a2416', '#1c1c26', '#4a3a28'],
      out: ['#1c1c26', '#5e3a22', '#8a2a20', '#3a2416'],
      hat: ['#8a2a20', '#1c1c26', '#5a1424', '#3a2416'],
      umbrella: null,
      names: { m: ['Scab', 'Rook', 'Gaff', 'Hob', 'Lucky', 'Saltjaw'], f: ['Red Nan', 'Brine', 'Mags', 'Vee'], c: ['Nipper'] }
    },
    arcadia: {
      bodies: { man: 3, 'man-cap': 2, vest: 3, traveller: 2, worker: 1, suit: 0.5, woman: 3, 'woman-bun': 1, 'woman-hood': 2, 'child-cap': 0.4 },
      top: ['#1e1e26', '#2a2a3e', '#e870c0', '#5cc8d0', '#7080e8', '#3a1840', '#a8c020', '#d0d0d8', '#c01880'],
      bot: ['#141418', '#2a2240', '#3a3650', '#1e2a38', '#101014'],
      out: ['#101014', '#e870c0', '#30a0c0', '#c01880', '#f0c840', '#2a2a3e'],
      hat: ['#e870c0', '#5cc8d0', '#1e1e26', '#f0c840', '#7080e8'],
      umbrella: ['#e870c0', '#5cc8d0', '#1e1e26', '#7080e8', '#f0c840'],
      wild: 0.35,
      names: { m: ['Kade', 'Jin', 'Rook', 'Dex', 'Hiro', 'Vasco', 'Ozu', 'Kenji', 'Lio', 'Marz'],
               f: ['Nyx', 'Kiri', 'Juno', 'Mika', 'Sable', 'Reya', 'Tamsin', 'Yuki', 'Zara', 'Echo'], c: ['Bit', 'Pixel', 'Zip'] }
    },
    // the Mid-Levels (the Terraces, L200): office money out for the evening — suits and smart coats in glass and cyan,
    // ice and slate, a dash of pink; fewer children, nobody in work clothes
    midlevels: {
      bodies: { suit: 3, man: 2, vest: 1, traveller: 1, woman: 2, 'woman-bun': 2, gown: 1, 'woman-hat': 1, child: 0.2 },
      top: ['#2a3a4e', '#5cc8d0', '#e8f0f4', '#3a4a6a', '#a8dce8', '#1e2430', '#e870c0', '#7080e8', '#c8ccd4'],
      bot: ['#141820', '#1e2430', '#2a3040', '#3a4258', '#101014'],
      out: ['#1e2430', '#5cc8d0', '#e8f0f4', '#3a4a6a', '#c8ccd4', '#2a3a4e'],
      hat: ['#1e2430', '#c8ccd4', '#5cc8d0', '#e870c0'],
      umbrella: ['#5cc8d0', '#e8f0f4', '#1e2430', '#7080e8', '#a8dce8'],
      wild: 0.15,
      names: { m: ['Aurel', 'Kenzo', 'Felix', 'Idris', 'Mateo', 'Sven', 'Ravi', 'Jules', 'Teo', 'Caspian'],
               f: ['Celeste', 'Mira', 'Noor', 'Ines', 'Saskia', 'Lena', 'Yara', 'Ottilie', 'Rin', 'Paloma'], c: ['Pip', 'Lumi'] }
    },
    lantern: {    // Lantern Row, the old quarter: older folk, plainer cloth, indigo and rust, paper umbrellas
      bodies: { man: 2, 'man-cap': 1, vest: 2, elder: 3, worker: 1, woman: 2, 'woman-bun': 3, 'woman-hood': 1, child: 0.6, 'child-cap': 0.4 },
      top: ['#2e3e6a', '#7a3a2a', '#d8ccb0', '#3a4a3a', '#5a2048', '#a02a1e', '#1e2a4a', '#8a7a5a'],
      bot: ['#1e2a4a', '#2e2a30', '#3e3646', '#4a3a28', '#141418'],
      out: ['#1e2a4a', '#7a3a2a', '#3a2416', '#2a4a3a', '#d4c8ae'],
      hat: ['#1e2a4a', '#d4c8ae', '#7a3a2a', '#2a2a30'],
      umbrella: ['#c8301e', '#e8d8b0', '#1e2a4a', '#d89a30', '#3a6a4a'],
      wild: 0.08,
      names: { m: ['Taro', 'Genji', 'Ikki', 'Shun', 'Bo', 'Ren', 'Haru', 'Old Sato', 'Kaito', 'Yoshi'],
               f: ['Hana', 'Aiko', 'Sumi', 'Nori', 'Fumi', 'Rin', 'Old Mitsu', 'Chiyo', 'Asa', 'Mei'], c: ['Tama', 'Koji', 'Momo'] }
    },
    spacers: {    // the spaceport: freighter crews off nine worlds, dockers, a customs clerk or two
      bodies: { worker: 4, 'man-cap': 3, vest: 3, traveller: 3, man: 1, 'woman-hood': 2, woman: 1, 'woman-bun': 1 },
      top: ['#d86a1a', '#3a4a3a', '#5a5a64', '#2a3a5a', '#a8c020', '#7a3a2a', '#1e1e26', '#c8a050'],
      bot: ['#2a2a30', '#3a3a2a', '#1e2a38', '#4a3a28', '#141418'],
      out: ['#d86a1a', '#3a3a2a', '#5e3a22', '#2a2a30', '#e0b020'],
      hat: ['#e0b020', '#d86a1a', '#2a2a30', '#5e3a22', '#3a4a3a'],
      umbrella: ['#2a2a30', '#d86a1a', '#e0b020'],
      wild: 0.3,
      names: { m: ['Vosk', 'Tibor', 'Okoro', 'Lenz', 'Ruk', 'Marten', 'Abe', 'Sol', 'Corvin', 'Dag'],
               f: ['Ines', 'Petra', 'Yara', 'Ondine', 'Kass', 'Mags', 'Lior', 'Seren', 'Bex', 'Noor'], c: ['Sprocket'] }
    },
    spires: {     // Arcadia above the smog (L480): white, gold and pastel, old money and new eyes
      bodies: { suit: 4, gown: 4, woman: 1.5, 'woman-bun': 1.5, elder: 1.5, vest: 1, man: 1, child: 0.4 },
      top: ['#f4f0e8', '#e8dce8', '#d8c8f0', '#c8e8e0', '#1c1c26', '#c89a28', '#f0c8d8', '#22304a'],
      bot: ['#e4e0d4', '#1c1c26', '#c8c2d4', '#22304a', '#5a2a44', '#2e2a30'],
      out: ['#f4f0e8', '#c89a28', '#d8c8f0', '#e2d8c8', '#1a2a5a', '#f0c8d8'],
      hat: ['#f4f0e8', '#c89a28', '#1c1c26'],
      umbrella: null,
      wild: 0.25,
      names: { m: ['Aurelien', 'Caspian', 'Lucan', 'Sebastien', 'Orion', 'Ambrose', 'Felix', 'Ravel'],
               f: ['Celestine', 'Isolde', 'Valentina', 'Seraphine', 'Ondine', 'Perpetua', 'Lux', 'Vesper'], c: ['Clio', 'Teddy', 'Bijou'] }
    },
    casino: {
      bodies: { suit: 5, gown: 5, vest: 1, man: 1, woman: 1 },
      top: ['#1c1c26', '#22304a', '#34164a', '#c89a28', '#8a1022', '#e4e0d4', '#0e0e14'],
      bot: ['#1c1c26', '#0e0e14', '#22304a', '#34164a', '#8a1022', '#c89a28'],
      out: ['#8a1420', '#0a0a0e', '#e2d8c8', '#c89a28', '#5a1424'],
      hat: ['#1c1c26'],
      umbrella: null,
      wild: 0.15,
      names: { m: ['Monty', 'Laszlo', 'Vince', 'Remy', 'Baron Ott', 'Fitz'], f: ['Coco', 'Delphine', 'Margaux', 'Ivy', 'Opal', 'Celeste'], c: ['Kid'] }
    },
    verdance: {
      bodies: { 'man-cap': 3, vest: 2, worker: 2, elder: 2, 'woman-hat': 3, 'woman-bun': 3, woman: 2, child: 2, 'child-cap': 2 },
      top: ['#e4d8b8', '#7a9a60', '#4a6a9a', '#c06048', '#d8b058', '#9a6aa0', '#e8e0cc'],
      bot: ['#3a4a6a', '#6a5a3a', '#4a5a3a', '#8a7a5a', '#5a4a3a'],
      out: ['#e4e0d4', '#a04a30', '#6a8a4a', '#d8c8a0', '#4a6a9a'],
      hat: ['#d8b058', '#c89a28', '#a8843a', '#e4d8b8'],
      umbrella: ['#a04a30', '#4a6a9a', '#d8b058', '#6a8a4a'],
      names: { m: ['Ned', 'Alf', 'Hobb', 'Silas', 'Jem', 'Wilf', 'Rowan', 'Barnaby'], f: ['Polly', 'Mabel', 'Hattie', 'Rosie', 'Clover', 'Edith', 'Primrose', 'June'],
               c: ['Tilly', 'Sam', 'Bea', 'Ollie'] }
    },
    hoarfell: {
      bodies: { skier: 7, 'man-cap': 1, vest: 2, 'woman-hood': 1, woman: 1, 'child-cap': 1.5, elder: 0.5 },
      top: ['#b82a2a', '#2a6ac0', '#f0c840', '#16747a', '#e06a18', '#5a2a8a', '#e8e8f0', '#2aa8a8'],
      bot: ['#1e1e26', '#2a3548', '#3e3646', '#e8e8f0', '#22304a'],
      out: ['#e2d8c8', '#7a5a3a', '#22304a', '#1e1e26', '#b82a2a'],
      hat: ['#b82a70', '#c89a20', '#2a6ac0', '#b82a2a', '#e8e8f0', '#16747a'],
      umbrella: null,
      names: { m: ['Lars', 'Anders', 'Piet', 'Mattias', 'Henrik', 'Sven', 'Olaf'], f: ['Ingrid', 'Freya', 'Solveig', 'Astrid', 'Kaja', 'Liv'], c: ['Elsi', 'Bo'] }
    },
    sylvara: {
      bodies: { elf: 1, 'elf-braid': 1 },
      top: ['#2a5a2e', '#3e5a30', '#a04a22', '#3a5a7a', '#6a5690', '#78b0a6', '#5a8e40'],
      bot: ['#3e6e34', '#54447a', '#5a4232', '#2a3e20', '#3a5a7a'],
      out: ['#3e7a3e', '#5a8e40', '#d0a040', '#78b0a6', '#a04a22'],
      hat: ['#3e7a3e'],
      umbrella: null,
      hairs: ['blond', 'silver', 'white', 'auburn', 'dark', 'brown', 'black', 'ginger'],
      skins: [0, 3, 1],
      names: { m: ['Eldrin', 'Calael', 'Thoren', 'Ilvar', 'Saelith', 'Vaeron'], f: ['Lirael', 'Ysmir', 'Naeva', 'Aelin', 'Seraphel', 'Thalia'], c: ['Fenwick'] }
    }
  };
  // Lumar's other seas look their own (Beck: "each of their people and cities should probably be a little bit more
  // unique"): Sapphire, the merchants' sea — whitewash and deep blue, gold sashes, the glassblowers' leather aprons;
  // Rose, the crystal sea — makers and mystics in plum, rose and cream, robes with the cowl fallen back, silk
  WARDROBES.sapphire = {
    bodies: { merchant: 3, 'woman-shawl': 3, man: 2, worker: 1.5, 'man-cap': 1, woman: 2, 'woman-hat': 1.5, elder: 1, traveller: 1, child: 1, 'child-cap': 1 },
    top: ['#eceae2', '#dcd8cc', '#2a4a9a', '#3a6ac8', '#1e2e5a', '#c8d4e8', '#e8e0c8', '#5a7ab0'],
    bot: ['#1e2e5a', '#2a3548', '#eceae2', '#3a4a6a', '#5e5a50'],
    out: ['#1a3a8a', '#2a5ad8', '#e8e8f0', '#6a4a2a', '#c8a040', '#16306a', '#8ab0e0'],
    hat: ['#c8a040', '#e0b848', '#2a5ad8', '#e8e8f0', '#1a3a8a'],
    umbrella: ['#2a5ad8', '#e8e8f0', '#1a3a8a', '#c8a040'],
    names: { m: ['Aris', 'Stavro', 'Nikos', 'Theo', 'Pelle', 'Doran', 'Mattias', 'Yannis', 'Lukas', 'Corin'],
             f: ['Ione', 'Calla', 'Daria', 'Melina', 'Thessaly', 'Nerys', 'Zoe', 'Ariadne', 'Kassia', 'Lyra'],
             c: ['Niko', 'Pip', 'Effie', 'Tam'] }
  };
  WARDROBES.rose = {
    bodies: { mystic: 3, 'mystic-m': 2, 'woman-hood': 2, woman: 2, 'woman-bun': 1.5, traveller: 1.5, man: 1.5, vest: 1, elder: 1, child: 1 },
    top: ['#e8d8d0', '#c87a9a', '#7a2a5a', '#f0c8d8', '#5a3a6a', '#d8b8a0', '#9a4a6a', '#eae2d8'],
    bot: ['#4a2440', '#6a3458', '#e8d8d0', '#3a2a3e', '#8a5a7a', '#5a4a52'],
    out: ['#b04884', '#f08cc8', '#e8d0b8', '#5a2a5a', '#d8a0b8', '#c8a050', '#3a2440'],
    hat: ['#f08cc8', '#c8a050', '#e8d0b8', '#7a2a5a'],
    umbrella: ['#f08cc8', '#b04884', '#e8d0b8', '#5a2a5a'],
    hairs: ['dark', 'black', 'brown', 'auburn', 'blond', 'grey', 'white', 'pink', 'violet', 'silver', 'dark', 'brown'],
    names: { m: ['Ilan', 'Soren', 'Eben', 'Rafe', 'Teodor', 'Ashby', 'Lior', 'Quill'],
             f: ['Rosalind', 'Mireille', 'Ottoline', 'Seren', 'Amaryllis', 'Liesl', 'Wisteria', 'Odette', 'Briar', 'Isolde'],
             c: ['Petal', 'Wren', 'Nim'] }
  };
  WARDROBES.crown.names = WARDROBES.lumar.names;
  function sexOf(body) { return body.indexOf('child') === 0 ? 'c' : MEN.indexOf(body) >= 0 ? 'm' : WOMEN.indexOf(body) >= 0 ? 'f' : null; }

  // ---- a little arithmetic -------------------------------------------------------------------------------------------
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  function rng(seed) {                         // a little seeded stream (mulberry32)
    var a = Math.floor(hash(seed) * 4294967296) >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function pick(r, list) { return list[Math.floor(r() * list.length) % list.length]; }
  function weighted(r, obj) {
    var keys = Object.keys(obj), tot = 0, i;
    for (i = 0; i < keys.length; i++) tot += obj[keys[i]];
    var x = r() * tot;
    for (i = 0; i < keys.length; i++) { x -= obj[keys[i]]; if (x <= 0) return keys[i]; }
    return keys[keys.length - 1];
  }
  function hex(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function toHex(c) { return '#' + c.map(function (v) { return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); }).join(''); }
  // a mid tone shaded into three bands the way the NPCs' tones are (dark two thirds of it, the light a little up)
  function shade(mid) { var c = hex(mid); return [toHex(c.map(function (v) { return v * 0.66; })), mid, toHex(c.map(function (v) { return v * 1.18 + 18; }))]; }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function now() { return typeof BridgeClock !== 'undefined' && BridgeClock.now ? BridgeClock.now() : Date.now(); }

  // ---- recolouring (as js/look.js does the pilot's) ----------------------------------------------------------------
  var OUTLINE = [11, 10, 24];                  // sprites_post.py OUTLINE: line work is half this, half the colour
  // painted faces: eyes, mouth and catch-light are no key colour (left alone); brows are the hair key's deep tone (they
  // swap with the hair); blush is XBLUSH (characters.py), swapped for the skin flushed toward PINK (sprites_post.py)
  var XBLUSH = [255, 96, 96], PINK = [240, 128, 124];
  function lineOf(c) { return [(c[0] + OUTLINE[0]) >> 1, (c[1] + OUTLINE[1]) >> 1, (c[2] + OUTLINE[2]) >> 1]; }
  function int(c) { return (c[0] << 16) | (c[1] << 8) | c[2]; }
  var bases = {}, painted = {}, paintedKeys = [];
  function base(name) {
    if (!bases[name]) {
      var e = bases[name] = { img: new Image(), ready: false, failed: false };
      e.img.onload = function () { e.ready = true; };
      e.img.onerror = function () { e.failed = true; };
      e.img.src = '/bridge/assets/characters/crowd/' + name + '.png';
    }
    return bases[name];
  }
  // what each key colour (and its line-work copy) becomes on this person
  function keyMap(p) {
    var map = {};
    Object.keys(XKEYS).forEach(function (k) {
      var to = p.dress[k];
      if (!to) return;
      for (var i = 0; i < 3; i++) { var from = hex(XKEYS[k][i]), into = hex(to[i]); map[int(from)] = into; map[int(lineOf(from))] = lineOf(into); }
    });
    // the painted face's blush (sprites_post.py) is one key colour: this person's skin, flushed pink
    var sk = p.dress.skin ? hex(p.dress.skin[1]) : [216, 160, 122];
    map[int(XBLUSH)] = [0, 1, 2].map(function (i) { return Math.floor(sk[i] * 0.45 + PINK[i] * 0.55); });
    return map;
  }
  /** A person's sheet ({ body, dress }, seated or not) recoloured, or null while its base loads. Kept (the last 80). */
  function sheetOf(p, sit) {
    var name = p.body + (sit ? '-sit' : ''), key = name + '|' + p.code;
    if (painted[key]) return painted[key];
    var b = base(name);
    if (!b.ready) return null;
    var map = keyMap(p);
    var c = document.createElement('canvas');
    c.width = b.img.naturalWidth; c.height = b.img.naturalHeight;
    var g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(b.img, 0, 0);
    var data = g.getImageData(0, 0, c.width, c.height), px = data.data;
    for (var i = 0; i < px.length; i += 4) {
      if (!px[i + 3]) continue;
      var to = map[(px[i] << 16) | (px[i + 1] << 8) | px[i + 2]];
      if (to) { px[i] = to[0]; px[i + 1] = to[1]; px[i + 2] = to[2]; }
    }
    g.putImageData(data, 0, 0);
    painted[key] = c; paintedKeys.push(key);
    if (paintedKeys.length > 80) delete painted[paintedKeys.shift()];
    return c;
  }

  // someone's look from a seed: a body from the wardrobe and its colours
  function personOf(wardrobe, seed, adults) {
    var W = WARDROBES[wardrobe] || WARDROBES.lumar, r = rng('who:' + seed);
    var body = weighted(r, W.bodies);
    for (var tries = 0; adults && body.indexOf('child') === 0 && tries < 6; tries++) body = weighted(r, W.bodies);
    if (adults && body.indexOf('child') === 0) body = 'man';
    var sex = sexOf(body);
    var hairName = body === 'elder' ? pick(r, ['grey', 'white', 'grey']) :
                   W.hairs ? pick(r, W.hairs) : (W.wild && r() < W.wild ? pick(r, ['pink', 'teal', 'violet', 'silver']) : pick(r, NATURAL));
    var skin = W.skins ? SKINS[pick(r, W.skins)] : pick(r, SKINS);
    var top = pick(r, W.top), bot = pick(r, W.bot), out = pick(r, W.out), hat = pick(r, W.hat);
    if (out === top) out = pick(r, W.out);
    var dress = { skin: skin, hair: HAIRS[hairName], top: shade(top), bot: shade(bot), out: shade(out), hat: shade(hat) };
    var names = W.names || WARDROBES.lumar.names, name = pick(r, names[sex || (r() < 0.5 ? 'm' : 'f')] || names.m);
    return { body: body, dress: dress, code: [hairName, skin[1], top, bot, out, hat].join(','), name: name, sex: sex,
             speed: body === 'elder' ? 0.7 : sex === 'c' ? 1.35 : 0.9 + r() * 0.35, umbrella: W.umbrella ? pick(r, W.umbrella) : null,
             lane: (r() - 0.5) * 0.4, jy: (r() - 0.5) * 0.3, wardrobe: wardrobe, seed: seed };
  }

  // ---- the place: where people can go -------------------------------------------------------------------------------
  var W = null;                                 // the place you're in: { id, data, cfg, grid, w, h, sources, spots, seats, wander, … }
  var NOT_SPOT = { enter_world: 1, leave_world: 1, password_gate: 1, shuttle: 1, go_sailing: 1, climb: 1, climb_board: 1, lift: 1,
                   hostile: 1, player: 1, curio: 1, home_door: 1, crowd: 1, palace_gate: 1, royale_vip: 1, companion: 1, farm_plot: 1,
                   farm_animal: 1, ski: 1, ski_here: 1, treasure_dig: 1, express_lift: 1, loop_station: 1, air_cab: 1, loop_doors: 1 };

  var TRANSIT = { express_lift: 1, loop_station: 1, air_cab: 1 };   // Arcadia's lifts, the Loop, the cabs (js/transit.js): ways in and out too
  function analyse(id, data, cfg) {
    var w = data.width, h = data.height, C = data.collisions;
    var solid = new Uint8Array(w * h), reach = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) solid[y * w + x] = C[y] && C[y][x] === 1 ? 1 : 0;
    (cfg.avoid || []).forEach(function (a) { for (var yy = a[1]; yy <= a[3]; yy++) for (var xx = a[0]; xx <= a[2]; xx++) if (xx >= 0 && yy >= 0 && xx < w && yy < h) solid[yy * w + xx] = 1; });
    // everywhere you can walk from where you come in
    var starts = [], sp = data.spawns && data.spawns.player;
    if (sp) starts.push(sp);
    (data.interactions || []).forEach(function (it) { if (it.type === 'leave_world' || it.type === 'enter_world' || it.type === 'shuttle' || TRANSIT[it.type]) starts.push([it.x, it.y]); });
    var q = [];
    starts.forEach(function (s) {
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var x0 = s[0] + dx, y0 = s[1] + dy, c0 = y0 * w + x0;
        if (x0 >= 0 && y0 >= 0 && x0 < w && y0 < h && !solid[c0] && !reach[c0]) { reach[c0] = 1; q.push(c0); }
      }
    });
    for (var qi = 0; qi < q.length; qi++) {
      var c = q[qi], cx = c % w, cy = (c - cx) / w;
      for (var k = 0; k < 4; k++) {
        var nx = cx + [1, -1, 0, 0][k], ny = cy + [0, 0, 1, -1][k], n = ny * w + nx;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || reach[n] || solid[n]) continue;
        reach[n] = 1; q.push(n);
      }
    }
    var open = function (x, y) { return x >= 0 && y >= 0 && x < w && y < h && reach[y * w + x] === 1; };
    function nearOpen(x, y, rad) {                 // the nearest open cell to (x, y), the one below first (in front of a counter)
      x = Math.round(x); y = Math.round(y);
      if (open(x, y)) return [x, y];
      var best = null, bd = 1e9;
      for (var dy = -rad; dy <= rad; dy++) for (var dx = -rad; dx <= rad; dx++) {
        if (!open(x + dx, y + dy)) continue;
        var d = dx * dx + dy * dy + (dy > 0 ? -0.5 : dy < 0 ? 0.4 : 0);
        if (d < bd) { bd = d; best = [x + dx, y + dy]; }
      }
      return best;
    }
    function facing(from, to) { var dx = to[0] - from[0], dy = to[1] - from[1]; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy < 0 ? 'up' : 'down'); }
    // ways in and out: the doors, the dock, the map's open edges, and any the place adds
    var sources = [];
    (data.interactions || []).forEach(function (it) {
      if (it.type !== 'enter_world' && it.type !== 'leave_world' && !TRANSIT[it.type] && !/DOCK|PIER/.test(it.label || '')) return;
      var o = nearOpen(it.x, it.y, 2);
      if (o && !sources.some(function (s) { return Math.abs(s.at[0] - o[0]) + Math.abs(s.at[1] - o[1]) < 2; })) sources.push({ at: o, door: [it.x, it.y], fade: true });
    });
    var edge = [];
    for (var ex = 0; ex < w; ex++) { if (open(ex, 0)) edge.push([ex, 0, ex, -1]); if (open(ex, h - 1)) edge.push([ex, h - 1, ex, h]); }
    for (var ey = 0; ey < h; ey++) { if (open(0, ey)) edge.push([0, ey, -1, ey]); if (open(w - 1, ey)) edge.push([w - 1, ey, w, ey]); }
    for (var ei = 0; ei < edge.length; ei += 3) sources.push({ at: [edge[ei][0], edge[ei][1]], door: [edge[ei][2], edge[ei][3]], fade: false });
    (cfg.sources || []).forEach(function (s) { var o = nearOpen(s[0], s[1], 2); if (o) sources.push({ at: o, door: [s[0], s[1]], fade: true }); });
    if (!sources.length && reach.indexOf(1) >= 0) {   // nowhere obvious: a house front (an open cell under a long wall) or two
      for (var hy = 1; hy < h && sources.length < 4; hy++) for (var hx = 1; hx < w - 1 && sources.length < 4; hx++) {
        if (open(hx, hy) && solid[(hy - 1) * w + hx] && solid[(hy - 1) * w + hx - 1] && solid[(hy - 1) * w + hx + 1] && hash(id + hx + ',' + hy) < 0.08)
          sources.push({ at: [hx, hy], door: [hx, hy - 1], fade: true });
      }
    }
    // places to stop: the things in the place (stalls, people, boards, the water), its seats, and the open ground
    var spots = [];
    (data.interactions || []).forEach(function (it) {
      if (NOT_SPOT[it.type] || it.x == null) return;
      var o = nearOpen(it.x, it.y, 2);
      if (o && !spots.some(function (s) { return s.at[0] === o[0] && s.at[1] === o[1]; }))
        spots.push({ at: o, face: o[0] === it.x && o[1] === it.y ? 'down' : facing(o, [it.x, it.y]) });
    });
    (cfg.spots || []).forEach(function (s) { var o = nearOpen(s[0], s[1], 1); if (o) spots.push({ at: o, face: s[2] || 'down' }); });
    var seats = [];
    ((SEATS && SEATS[id]) || []).forEach(function (s) {
      if (s.action !== 'sit' || !s.seat) return;
      var tile = [Math.floor(s.seat[0]), Math.round(s.seat[1] - 0.5)], o = nearOpen(tile[0], tile[1], 2);
      if (o) seats.push({ seat: s.seat, at: o, face: s.facing || 'down' });
    });
    var wander = [], r = rng('wander:' + id), tries = 0;
    var cells = [];
    for (var i = 0; i < w * h; i++) if (reach[i]) cells.push(i);
    while (wander.length < Math.min(12, cells.length) && tries++ < 400) {
      var cc = cells[Math.floor(r() * cells.length)], wx = cc % w, wy = (cc - wx) / w, room = 0;
      for (var ny2 = -1; ny2 <= 1; ny2++) for (var nx2 = -1; nx2 <= 1; nx2++) if (open(wx + nx2, wy + ny2)) room++;
      if (room >= 8) wander.push({ at: [wx, wy], face: pick(r, ['down', 'left', 'right', 'down', 'up']) });
    }
    // emerge: the place's people step out of the trees (Sylvara's elves): fading in and out at open ground among them
    for (var em = 0; em < (cfg.emerge || 0) && wander.length; em++) {
      var wp = wander[(em * 5) % wander.length].at;
      sources.push({ at: wp, door: wp, fade: true });
    }
    return { id: id, data: data, cfg: cfg, w: w, h: h, solid: solid, reach: reach, open: open, sources: sources, spots: spots,
             seats: seats, wander: wander, paths: {}, cells: cells.length };
  }

  // a way between two open cells (eight ways, no cutting corners), as cell centres; cached
  function path(P, a, b) {
    var key = a + '>' + b;
    if (P.paths[key] !== undefined) return P.paths[key];
    var w = P.w, h = P.h, start = a[1] * w + a[0], goal = b[1] * w + b[0];
    if (start === goal) return (P.paths[key] = [a, b]);
    var prev = new Int32Array(w * h).fill(-1), q = [start];
    prev[start] = start;
    var D = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (var qi = 0; qi < q.length && prev[goal] < 0; qi++) {
      var c = q[qi], x = c % w, y = (c - x) / w;
      for (var k = 0; k < 8; k++) {
        var nx = x + D[k][0], ny = y + D[k][1];
        if (!P.open(nx, ny)) continue;
        if (k >= 4 && (!P.open(x + D[k][0], y) || !P.open(x, y + D[k][1]))) continue;
        var n = ny * w + nx;
        if (prev[n] >= 0) continue;
        prev[n] = c; q.push(n);
      }
    }
    if (prev[goal] < 0) return (P.paths[key] = null);
    var out = [];
    for (var at = goal; at !== start; at = prev[at]) out.push([at % w, (at - at % w) / w]);
    out.push(a);
    out.reverse();
    return (P.paths[key] = out);
  }
  function lengthOf(pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }

  // ---- how busy -----------------------------------------------------------------------------------------------------
  function sunAt(planet, ms) {
    if (typeof BridgeClock === 'undefined') return 1;
    var P = BridgeClock.PLANETS[planet];
    if (!P) return 1;
    if (P.night) return 0;
    if (P.none || !P.day) return 0.5;
    var x = BridgeClock.hoursAt(planet, ms) / P.day, D = BridgeClock.daylight(planet), wd = Math.PI / 12;
    return smooth(-wd, wd, Math.cos(2 * Math.PI * (x - 0.5)) - Math.cos(Math.PI * D));
  }
  var WEATHER = { rain: 0.55, storm: 0.2, gale: 0.45, fog: 0.75, blizzard: 0.25, snow: 0.85, heat: 0.7, blackout: 0.4, smog: 0.85, mist: 0.75 };
  /** How many of a place's people are out at a moment (from its clock, weather and any festival there). */
  var counts = {};
  function countAt(id, cfg, ms) {
    var ck = id + ':' + Math.round(ms);
    if (counts[ck] == null) counts[ck] = countNow(id, cfg, ms);
    return counts[ck];
  }
  function countNow(id, cfg, ms) {
    var planet = typeof BridgeClock !== 'undefined' ? BridgeClock.planet(id) : null, f = 1, busy = cfg.busy || 'day';
    var sun = sunAt(planet, ms);
    if (busy === 'day') f = 0.3 + 0.7 * sun;
    else if (busy === 'night') f = 0.3 + 0.7 * (1 - sun);
    else if (busy === 'bustle') f = 0.35 + 0.65 * (typeof BridgeClock !== 'undefined' && BridgeClock.bustleAt ? BridgeClock.bustleAt(ms) : 1);
    var outdoor = typeof BridgeClock !== 'undefined' && BridgeClock.outdoor && BridgeClock.outdoor(id);
    if (typeof BridgeWeather !== 'undefined' && BridgeWeather.regionOf) {
      var r = BridgeWeather.regionOf(id), wx = r && BridgeWeather.at(r, ms);
      if (wx && WEATHER[wx.kind] != null) {
        if (outdoor) f *= 1 - (1 - WEATHER[wx.kind]) * wx.k;
        else if (WEATHER[wx.kind] < 0.8) f *= 1 + 0.15 * wx.k;                // in out of it
      }
    }
    if (typeof BridgeFestivals !== 'undefined' && BridgeFestivals.on && planet &&
        BridgeFestivals.on(planet).some(function (fe) { return fe.world === id; })) f *= 1.4;
    return Math.min(CAP, Math.round(cfg.n * Math.min(1.4, f)));
  }

  // ---- a visit ----------------------------------------------------------------------------------------------------
  // A slot's visits each run P ms (its own length); the k-th starts at k·P − phase. Its plan: in at a source (or a seat
  // already taken, for someone found sitting), on to a spot or two and a pause at each — or a seat — then out.
  function slotTiming(id, i) {
    var P = (150 + 90 * hash(id + ':P:' + i)) * 1000;
    return { P: P, phase: hash(id + ':ph:' + i) * P };
  }
  var plans = {};
  function planOf(P, i, k, t0, len) {
    var key = P.id + ':' + i + ':' + k;
    if (plans[key] !== undefined) return plans[key];
    var r = rng(key), cfg = P.cfg, who = personOf(cfg.wardrobe || 'lumar', key, cfg.busy === 'night' || cfg.adults), segs = [], t = t0;
    var plan = null;
    function walk(a, b, fadeIn, fadeOut, door) {
      var pts = path(P, a, b);
      if (!pts) return false;
      if (door) pts = fadeIn ? [door].concat(pts) : pts.concat([door]);
      var dur = lengthOf(pts) / who.speed * 1000;
      segs.push({ kind: 'walk', pts: pts, cum: cumOf(pts), t0: t, t1: t + dur, fadeIn: fadeIn, fadeOut: fadeOut });
      t += dur;
      return true;
    }
    var outdoors = typeof BridgeClock !== 'undefined' && BridgeClock.outdoor(P.id);
    var pass = cfg.pass != null ? cfg.pass : outdoors ? (cfg.busy === 'bustle' ? 0.55 : 0.3) : 0;
    if (P.sources.length > 1 && !(i < P.seats.length && cfg.sit > 0.6) && r() < pass) {
      var cur = pick(r, P.sources), end = t0 + len;
      while (true) {
        var a = pick(r, P.sources), b = pick(r, P.sources), nxt = Math.hypot(a.at[0] - cur.at[0], a.at[1] - cur.at[1]) > Math.hypot(b.at[0] - cur.at[0], b.at[1] - cur.at[1]) ? a : b;
        if (nxt === cur) nxt = P.sources[(P.sources.indexOf(cur) + 1) % P.sources.length];
        var pts = path(P, cur.at, nxt.at);
        if (!pts) break;
        if (cur.fade) pts = [cur.door].concat(pts);
        if (nxt.fade) pts = pts.concat([nxt.door]);
        var dur = lengthOf(pts) / who.speed * 1000;
        if (t + dur > end) break;
        segs.push({ kind: 'walk', pts: pts, cum: cumOf(pts), t0: t, t1: t + dur, fadeIn: cur.fade, fadeOut: nxt.fade });
        t += dur;
        var gap = 3000 + r() * 15000;                        // off out of sight a while, then back the way they went
        segs.push({ kind: 'away', t0: t, t1: Math.min(end, t + gap) });
        t += gap;
        cur = nxt;
        if (t >= end) break;
      }
      plans[key] = segs.length ? { who: who, segs: segs, t0: t0, t1: t0 + len, i: i, k: k } : null;
      return plans[key];
    }
    if (P.sources.length || P.seats.length) {
      var src = P.sources.length ? pick(r, P.sources) : null;
      // slot i only ever sits in seat i, so no two people share a chair
      var sitting = i < P.seats.length && r() < (cfg.sit != null ? cfg.sit : (typeof BridgeClock !== 'undefined' && BridgeClock.outdoor(P.id) ? 0.15 : 0.5));
      var stops = [], pool = P.spots.concat(P.wander);
      if (sitting) stops.push({ seat: P.seats[i] });
      else {
        if (pool.length) stops.push(pick(r, pool));
        if (pool.length > 1 && r() < 0.5) stops.push(pick(r, pool));
      }
      for (var attempt = 0; attempt < 3 && !plan && stops.length; attempt++) {
        segs = []; t = t0;
        var from = src ? src.at : null, ok = true;
        if (src) ok = walk(src.at, (stops[0] && (stops[0].seat ? stops[0].seat.at : stops[0].at)) || src.at, src.fade, false, src.fade ? src.door : null);
        if (!src && stops[0]) from = stops[0].seat ? stops[0].seat.at : stops[0].at;    // nowhere to come from: already here
        for (var s = 0; ok && s < stops.length; s++) {
          var st = stops[s], at = st.seat ? st.seat.at : st.at;
          if (s > 0) ok = walk(from, at, false, false, null);
          if (!ok) break;
          segs.push(st.seat ? { kind: 'sit', seat: st.seat, t0: t, t1: t } : { kind: 'stand', at: at, face: st.face, t0: t, t1: t });
          from = at;
        }
        // out by the nearest way most of the time, any of them now and then
        var out = null;
        if (ok && P.sources.length) {
          out = P.sources.slice().sort(function (a, b) { return Math.hypot(a.at[0] - from[0], a.at[1] - from[1]) - Math.hypot(b.at[0] - from[0], b.at[1] - from[1]); })[r() < 0.65 ? 0 : Math.floor(r() * P.sources.length)];
          ok = walk(from, out.at, false, out.fade, out.fade ? out.door : null);
        }
        var walking = segs.reduce(function (a, g) { return a + (g.kind === 'walk' ? g.t1 - g.t0 : 0); }, 0);
        if (!ok || walking > len * 0.85) { stops = stops.slice(0, stops.length - 1); continue; }
        // the time left over goes to the stops (a seat gets more), and the walks shift on by it
        var rest = len - walking - 2000, pauses = segs.filter(function (g) { return g.kind !== 'walk'; });
        var wts = pauses.map(function (g) { return g.kind === 'sit' ? 3 : 0.6 + r(); }), tw = wts.reduce(function (a, b) { return a + b; }, 0);
        var shift = 0;
        segs.forEach(function (g) {
          g.t0 += shift; g.t1 += shift;
          var j = pauses.indexOf(g);
          if (j >= 0) { var add = tw ? rest * wts[j] / tw : 0; g.t1 += add; shift += add; }
        });
        if (!out && segs.length) segs[segs.length - 1].t1 = t0 + len;         // no way out: they stay till the next visit
        plan = { who: who, segs: segs, t0: t0, t1: t0 + len, i: i, k: k };
      }
    }
    plans[key] = plan;
    return plan;
  }
  function cumOf(pts) { var c = [0]; for (var i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return c; }
  // where along a walk at time t: { x, y, facing, dist, alpha }
  function along(g, t, speed) {
    var s = Math.max(0, (t - g.t0) / 1000 * speed), cum = g.cum, pts = g.pts, n = pts.length;
    if (s >= cum[n - 1]) return { x: pts[n - 1][0], y: pts[n - 1][1], facing: 'down', dist: s, done: true };
    var j = 1;
    while (j < n - 1 && cum[j] < s) j++;
    var a = pts[j - 1], b = pts[j], seg = cum[j] - cum[j - 1] || 1, f = (s - cum[j - 1]) / seg;
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var alpha = 1;
    if (g.fadeIn) alpha = Math.min(alpha, s / 0.9);
    if (g.fadeOut) alpha = Math.min(alpha, (cum[n - 1] - s) / 0.9);
    return { x: a[0] + dx * f, y: a[1] + dy * f, dx: dx, dy: dy, facing: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'),
             dist: s, alpha: Math.max(0, Math.min(1, alpha)) };
  }
  // where someone is in their plan at t: { x, y, facing, walk (dist) | null, sit (seat) | null, alpha }
  function stateAt(plan, t) {
    if (!plan || t < plan.t0 || t >= plan.t1) return null;
    for (var i = 0; i < plan.segs.length; i++) {
      var g = plan.segs[i];
      if (t < g.t0 || t >= g.t1) continue;
      if (g.kind === 'away') return null;
      if (g.kind === 'walk') { var p = along(g, t, plan.who.speed); p.walk = p.dist; return p; }
      if (g.kind === 'sit') return { x: g.seat.seat[0] - 0.5, y: g.seat.seat[1] - 0.5, facing: g.seat.face, sit: g.seat, alpha: 1 };
      return { x: g.at[0] + plan.who.lane * 0.8, y: g.at[1] + plan.who.jy, facing: g.face, alpha: 1 };
    }
    return null;
  }

  // ---- gatherings and reactions (js/events.js) --------------------------------------------------------------------
  var gatherings = {}, reactions = [];
  function gather(worldId, spec) {
    spec = spec || {};
    var id = spec.id || ('g' + spec.x + ',' + spec.y + ',' + spec.until);
    if (!gatherings[id]) gatherings[id] = { id: id, world: worldId, x: spec.x, y: spec.y, r: spec.r || 2.5, n: Math.min(spec.n || 6, 12),
                                            start: spec.start || now(), until: spec.until || now() + 120000, face: spec.face || [spec.x, spec.y],
                                            plans: null };
    var g = gatherings[id];
    return { release: function () { g.until = Math.min(g.until, now()); } };
  }
  function react(worldId, spec) {
    reactions = reactions.filter(function (e) { return e.until > now(); });
    reactions.push({ world: worldId, x: spec.x, y: spec.y, r: spec.r || 3, kind: spec.kind || 'look', at: now(), until: now() + (spec.ms || (spec.kind === 'flee' ? 2500 : 3500)) });
  }
  // the people a gathering brings: in from a source to a place round the point, there till it's over, then away
  function gatherPlans(P, g) {
    if (g.plans) return g.plans;
    var cells = [], r = rng('gather:' + g.id);
    for (var y = Math.floor(g.y - g.r - 1); y <= Math.ceil(g.y + g.r + 1); y++) for (var x = Math.floor(g.x - g.r - 1); x <= Math.ceil(g.x + g.r + 1); x++) {
      var d = Math.hypot(x - g.x, y - g.y);
      if (P.open(x, y) && d <= g.r + 0.3 && d >= Math.max(1, g.r * 0.45)) cells.push([x, y, hash(g.id + x + ',' + y)]);
    }
    cells.sort(function (a, b) { return a[2] - b[2]; });
    g.plans = [];
    for (var j = 0; j < Math.min(g.n, cells.length); j++) {
      var who = personOf(P.cfg.wardrobe || 'lumar', g.id + ':' + j), at = [cells[j][0], cells[j][1]], segs = [], t = g.start + j * 600;
      who.speed = Math.max(who.speed, 1.15);                         // hurrying over to see
      var near = P.sources.slice().sort(function (a, b) { return Math.hypot(a.at[0] - g.x, a.at[1] - g.y) - Math.hypot(b.at[0] - g.x, b.at[1] - g.y); }).slice(0, 3);
      var src = near.length ? pick(r, near) : null;                  // from the nearest ways in: a crowd forms quickly
      var face = (function () { var dx = g.face[0] - at[0], dy = g.face[1] - at[1]; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy < 0 ? 'up' : 'down'); })();
      if (src) {
        var pin = path(P, src.at, at);
        if (!pin) continue;
        if (src.fade) pin = [src.door].concat(pin);
        var d1 = lengthOf(pin) / who.speed * 1000;
        segs.push({ kind: 'walk', pts: pin, cum: cumOf(pin), t0: t, t1: t + d1, fadeIn: src.fade });
        t += d1;
      }
      var leave = Math.max(t + 2000, g.until + j * 700);
      segs.push({ kind: 'stand', at: at, face: face, t0: t, t1: leave });
      var t1 = leave;
      if (src) {
        var pout = path(P, at, src.at);
        if (pout) {
          if (src.fade) pout = pout.concat([src.door]);
          var d2 = lengthOf(pout) / who.speed * 1000;
          segs.push({ kind: 'walk', pts: pout, cum: cumOf(pout), t0: leave, t1: leave + d2, fadeOut: src.fade });
          t1 = leave + d2;
        }
      }
      g.plans.push({ who: who, segs: segs, t0: segs[0].t0, t1: t1, gather: g.id, i: 'g' + j, k: 0 });
    }
    return g.plans;
  }

  // ---- this frame -----------------------------------------------------------------------------------------------
  var shown = [], talkTo = null, inter = null, OFF = false;
  function enter(worldId, data) {
    var cfg = CFG && CFG[worldId];
    W = cfg && data && data.collisions ? analyse(worldId, data, cfg) : { id: worldId, data: data, none: true };
    plans = {};
    shown = [];
    off = {};
  }
  var off = {};                                    // per person: how far they've eased aside (you passing, a reaction)
  function tick(world, now0) {
    var wid = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null;
    if (!CFG || !SEATS || !wid) return;
    if (OFF) { shown = []; dropInter(); return; }
    if (!W || W.id !== wid || W.data !== world) enter(wid, world);
    if (W.none) { dropInter(); shown = []; return; }
    var t = now(), cfg = W.cfg, out = [];
    var slots = Math.min(CAP, Math.ceil(cfg.n * 1.4));
    for (var i = 0; i < slots; i++) {
      var T = slotTiming(W.id, i), k = Math.floor((t + T.phase) / T.P), t0 = k * T.P - T.phase;
      if (i >= countAt(W.id, cfg, t0)) continue;              // not out this visit (how busy it was as it began)
      var plan = planOf(W, i, k, t0, T.P), st = stateAt(plan, t);
      if (st) out.push({ plan: plan, st: st });
    }
    Object.keys(gatherings).forEach(function (gid) {
      var g = gatherings[gid];
      if (g.world !== W.id) return;
      var ps = gatherPlans(W, g), live = false;
      ps.forEach(function (p) { var st = stateAt(p, t); if (st) { out.push({ plan: p, st: st }); live = true; } });
      if (!live && t > g.until + 60000) delete gatherings[gid];
    });
    // you passing: they ease aside; standing near you, they look at you; reactions
    var px = null, py = null;
    if (typeof BridgeCharacter !== 'undefined' && BridgeCharacter.getRenderPos) { var rp = BridgeCharacter.getRenderPos(); px = rp.x; py = rp.y; }
    var dt = Math.min(0.1, (t - (tick.last || t)) / 1000); tick.last = t;
    out.forEach(function (e) {
      var key = e.plan.i + ':' + e.plan.k, o = off[key] || (off[key] = { x: 0, y: 0 }), st = e.st, tx = 0, ty = 0;
      if (st.walk != null && st.dx != null) {                  // their own side of the path, so two going the same way don't merge
        var L = Math.hypot(st.dx, st.dy) || 1;
        tx += -st.dy / L * e.plan.who.lane; ty += st.dx / L * e.plan.who.lane;
      }
      if (px != null && !st.sit) {
        var dx = st.x - px, dy = st.y - py, d = Math.hypot(dx, dy);
        if (d < 0.95) { var push = (0.95 - d) * 0.9; tx += (d ? dx / d : 1) * push; ty += (d ? dy / d : 0) * push; }
        if (st.walk == null && d < 2.4) st.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'left' : 'right') : (dy > 0 ? 'up' : 'down');
      }
      reactions.forEach(function (rx) {
        if (rx.world !== W.id || t > rx.until || st.sit) return;
        var dx = st.x - rx.x, dy = st.y - rx.y, d = Math.hypot(dx, dy);
        if (d > rx.r) return;
        if (rx.kind === 'flee') { var f = Math.min(1, (t - rx.at) / 600) * (1 - Math.max(0, (t - rx.until + 800) / 800)); tx += (d ? dx / d : 1) * 1.2 * f; ty += (d ? dy / d : 0) * 1.2 * f; }
        else { st.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'left' : 'right') : (dy > 0 ? 'up' : 'down'); if (rx.kind === 'cheer') st.hop = 1; }
      });
      // ease toward where they'd step to, and never into a wall
      o.x += (tx - o.x) * Math.min(1, dt * 6); o.y += (ty - o.y) * Math.min(1, dt * 6);
      var nx = st.x + o.x, ny = st.y + o.y;
      if (W.open(Math.round(nx), Math.round(ny)) || st.sit) { st.x = nx; st.y = ny; }
    });
    // the one you're talking to waits for you
    if (talkTo) {
      var still = document.querySelector('.world-dialog');
      if (!still || now() - talkTo.at > 120000) talkTo = null;
      else out.forEach(function (e) { if (e.plan === talkTo.plan) { e.st.x = talkTo.x; e.st.y = talkTo.y; e.st.walk = null; e.st.facing = talkTo.facing; } });
    }
    if (typeof BridgeCharacter !== 'undefined' && BridgeCharacter.isSeated && BridgeCharacter.isSeated() && px != null)
      out = out.filter(function (e) { return !e.st.sit || Math.hypot(e.st.sit.seat[0] - 0.5 - px, e.st.sit.seat[1] - 0.5 - py) > 0.8; });
    if (t - (tick.pruned || 0) > 30000) {                       // forget visits long over
      tick.pruned = t;
      Object.keys(plans).forEach(function (k) { if (!plans[k] || plans[k].t1 < t - 60000) delete plans[k]; });
      Object.keys(counts).forEach(function (k) { if (+k.split(':').pop() < t - 900000) delete counts[k]; });
    }
    shown = out;
    offerTalk(world, px, py);
  }

  // ---- talking to one -------------------------------------------------------------------------------------------
  // the nearest of them within reach (and nothing else nearer) carries the one interaction; E on it: a line, and now
  // and then something they'd like
  function dropInter() {
    var w = W && W.data;
    if (inter && w && w.interactions) { var i = w.interactions.indexOf(inter); if (i >= 0) w.interactions.splice(i, 1); }
    inter = null;
  }
  function offerTalk(world, px, py) {
    if (px == null || !world.interactions) return;
    var best = null, bd = 1.45;
    shown.forEach(function (e) {
      if (e.st.alpha < 0.8) return;
      var d = Math.hypot(e.st.x - px, e.st.y - py);
      if (d < bd) { bd = d; best = e; }
    });
    if (best) world.interactions.forEach(function (it) {
      if (it !== inter && it.x != null && it.type !== 'player' && Math.hypot(it.x - px, it.y - py) < bd + 0.2) best = null;
    });
    if (!best) { dropInter(); return; }
    if (!inter) inter = { type: 'crowd', prompt: 'PRESS E TO TALK' };
    inter.x = Math.round(best.st.x); inter.y = Math.round(best.st.y);
    inter.label = best.plan.who.name.toUpperCase();
    inter.crowd = best;
    if (world.interactions.indexOf(inter) < 0) world.interactions.push(inter);
  }
  var given = {};
  function talk(it) {
    var e = it && it.crowd;
    if (!e) return;
    var who = e.plan.who, L = (CFG && CFG._lines) || {}, r = rng('line:' + who.seed + ':' + Math.floor(now() / 600000));
    var planet = typeof BridgeClock !== 'undefined' ? BridgeClock.planet(W.id) : null;
    var pool = (L[who.wardrobe] || L[planet] || L.lumar || ['...']).slice();
    var wx = typeof BridgeWeather !== 'undefined' && BridgeWeather.here ? BridgeWeather.here(W.id) : null;
    if (wx && wx.def && wx.def.wet && L.rain && typeof BridgeClock !== 'undefined' && BridgeClock.outdoor(W.id)) pool = pool.concat(L.rain, L.rain);
    var sky = typeof BridgeClock !== 'undefined' ? BridgeClock.sky(W.id) : null;
    if (sky && sky.sun < 0.2 && L.night) pool = pool.concat(L.night);
    var line = pick(r, pool);
    talkTo = { plan: e.plan, x: e.st.x, y: e.st.y, facing: towardYou(e.st), at: now() };
    // now and then someone would like something you might be carrying
    var wants = (CFG && CFG._wants && (CFG._wants[who.wardrobe] || CFG._wants[planet])) || [], want = null, gkey = who.seed;
    if (wants.length && hash('want:' + who.seed) < 0.2 && !given[gkey]) want = wants[Math.floor(hash('wantwhich:' + who.seed) * wants.length)];
    var item = want && typeof BridgeItems !== 'undefined' && BridgeItems.get(want.id);
    var have = want && typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount ? BridgeInventory.getCount(want.id) : 0;
    var text = line;
    if (want && item) text = (want.ask || 'YOU WOULDN\'T HAVE ANY {item} ON YOU? I\'D GIVE YOU {pay} FOR SOME.').split('{item}').join(item.name.toUpperCase()).split('{pay}').join(want.pay + ' COINS');
    var buttons = [];
    if (want && item && have > 0) buttons.push({ label: 'Give them one: ' + item.name + ' (+' + want.pay + ')', act: function () {
      if (!BridgeInventory.removeItem(want.id, 1) && BridgeInventory.getCount(want.id) >= have) return;
      given[gkey] = 1;
      if (typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) BridgeProgression.awardCoins(want.pay, 'crowd:' + want.id);
      if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(who.name, 'Thanks a lot', '+' + want.pay + ' coins for the ' + item.name.toLowerCase());
    } });
    if (typeof BridgeInteractions === 'undefined') return;
    BridgeInteractions.choose({ title: who.name, text: text, buttons: buttons, closeLabel: 'Bye', face: function (cv) { portrait(cv, who); } });
  }
  function towardYou(st) {
    if (typeof BridgeCharacter === 'undefined') return st.facing;
    var rp = BridgeCharacter.getRenderPos(), dx = rp.x - st.x, dy = rp.y - st.y;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }
  // their face for the talk card: their body's portrait (assets/portraits/crowd/<body>.png, tools/bridge-art/portraits.py)
  // in their colours — the same keys as the sheets, plus the portrait's iris and blush (js/look.js portraitKeys) — or,
  // with no portrait file, the head and shoulders of their first standing frame
  function portrait(cv, who) {
    if (typeof BridgeLook !== 'undefined' && BridgeLook.portrait) {
      return BridgeLook.portrait(cv, 'crowd/' + who.body, { map: BridgeLook.portraitKeys(keyMap(who), who.seed, who.dress.skin),
        key: who.code + '|' + who.seed, blink: true, fallback: function () { crop(cv, who); } });
    }
    crop(cv, who);
  }
  function crop(cv, who) {
    var sh = sheetOf(who, false);
    if (!sh) { cv.remove(); return; }
    var g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    var t = document.createElement('canvas'); t.width = FW; t.height = FH;
    var tg = t.getContext('2d'); tg.drawImage(sh, 0, 0, FW, FH, 0, 0, FW, FH);
    var a = tg.getImageData(0, 0, FW, FH).data, top = 0;
    for (var y = 0; y < FH && !top; y++) for (var x = 0; x < FW; x++) if (a[(y * FW + x) * 4 + 3]) { top = y; break; }
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(t, 3, Math.max(0, top - 1), 26, 26, 0, 0, cv.width, cv.height);
  }

  // ---- drawing ----------------------------------------------------------------------------------------------------
  var brollies = {};
  function brolly(col) {                       // an umbrella held up over the head, drawn once per colour in the sheet's frame
    if (brollies[col]) return brollies[col];
    var c = document.createElement('canvas'); c.width = FW; c.height = FH;
    var g = c.getContext('2d'), t = shade(col), px = function (x, y, w, h, f) { g.fillStyle = f; g.fillRect(x, y, w, h); };
    var ink = '#0b0a18', rib = toHex(hex(t[0]).map(function (v) { return v * 0.8; }));
    px(21, 9, 1, 17, ink);                                            // the shaft, down to the hand at the side
    px(21, 24, 2, 2, '#3a2416');                                      // the handle
    // the canopy seen from above at the scenes' angle: a dome 24 across, 10 deep, in panels, lit from the upper left
    var rows = [[13, 6], [10, 12], [8, 16], [6, 20], [5, 22], [4, 24], [4, 24], [4, 24], [5, 22]];
    rows.forEach(function (rw, j) { px(rw[0] - 1, j, rw[1] + 2, 1, ink); });
    px(15, 0, 2, 1, ink);
    rows.forEach(function (rw, j) {
      if (j === 0) { px(rw[0], j, rw[1], 1, t[2]); return; }
      for (var x = rw[0]; x < rw[0] + rw[1]; x++) {
        var dx = x + 0.5 - 16, light = dx < -2 && j < 6 ? t[2] : dx > 4 || j > 6 ? t[0] : t[1];
        var onRib = [-8, -3, 3, 8].some(function (r) { return Math.abs(dx - r * j / 8) < 0.5; });
        px(x, j, 1, 1, onRib && j > 1 ? rib : light);
      }
    });
    [5, 10, 16, 22, 27].forEach(function (x) { px(x, 9, 1, 1, ink); });   // the ribs' tips under the rim, a scalloped edge
    px(15, 0, 2, 1, t[2]);                                             // the ferrule catching the light
    return (brollies[col] = c);
  }
  function raining() {
    if (typeof BridgeWeather === 'undefined' || typeof BridgeClock === 'undefined' || !BridgeClock.outdoor(W.id)) return false;
    var wx = BridgeWeather.here(W.id);
    return wx && (wx.kind === 'rain' || wx.kind === 'storm') && wx.k > 0.4;
  }
  function draw(world, offX, offY, ts, nowMs, sc) {
    if (!W || W.none || W.data !== world || !sc || typeof BridgeScene === 'undefined') return [];
    var V = BridgeWorld.getView ? BridgeWorld.getView() : null, wet = raining(), list = [];
    shown.forEach(function (e) {
      var st = e.st, who = e.plan.who, sit = !!st.sit, sh = sheetOf(who, sit);
      if (!sh) return;
      // seated: drawn on the seat, depth-tested (and sorted) from its front edge, so the seat isn't drawn across them
      var cx = Math.round(offX + (st.x + 0.5) * ts), seatY = sit ? st.sit.seat[1] + 0.05 : 0;
      var footRow = sit ? BridgeScene.seatedRow(st.sit.seat[1], st.facing) : st.y + 0.9, footY = Math.round(offY + (sit ? seatY : footRow) * ts);
      if (V && (cx < -FW || cx > V.w + FW || footY < -8 || footY > V.h + FH)) return;
      list.push({ footRow: footRow, draw: function (ctx) {
        var col = st.walk != null ? 4 + Math.floor(st.walk / 0.3) % 8 : idleCol(Math.floor((nowMs + who.seed.length * 97 + e.plan.k * 131) / 360));
        if (sit) cx = Math.round(offX + st.sit.seat[0] * ts);
        var hop = st.hop ? Math.round(Math.abs(Math.sin(nowMs / 140)) * 3) : 0;
        var dx = cx - FW / 2, dy = footY - (FH - 3) - hop, tint = BridgeScene.tintAt(sc, world, Math.round(st.x), Math.round(st.y), nowMs);
        var a = st.alpha == null ? 1 : st.alpha;
        if (a < 1) { ctx.save(); ctx.globalAlpha = a; }
        BridgeScene.drawOccluded(ctx, sc, sh, col * FW, (DIR[st.facing] || 0) * FH, FW, FH, dx, dy, footRow, offX, offY, tint,
          sit ? null : { x: cx, y: footY, rx: 7, ry: 3 });
        if (wet && !sit && who.umbrella && who.sex !== 'c' && hash('brolly:' + who.seed) < 0.6)
          BridgeScene.drawOccluded(ctx, sc, brolly(who.umbrella), 0, 0, FW, FH, dx, dy - 3, footRow, offX, offY, tint, null);
        if (a < 1) ctx.restore();
      } });
    });
    return list;
  }

  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) {
    BridgeWorld.registerSceneHooks('*', { ground: function (ctx, world) { tick(world); }, items: draw });
  }
  if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) BridgeInteractions.register('crowd', talk, 'Talk');

  return {
    gather: gather, react: react, XKEYS: XKEYS, WARDROBES: WARDROBES,
    _here: function () { return shown.map(function (e) { return { name: e.plan.who.name, body: e.plan.who.body, x: +e.st.x.toFixed(2), y: +e.st.y.toFixed(2), sit: !!e.st.sit, walk: e.st.walk != null, alpha: e.st.alpha, gather: e.plan.gather || null }; }); },
    _count: function (id, ms) { return CFG && CFG[id] ? countAt(id, CFG[id], ms || now()) : 0; },
    _place: function () { return W && !W.none ? { sources: W.sources.length, spots: W.spots.length, seats: W.seats.length, wander: W.wander.length, cells: W.cells } : null; },
    _plan: function (id, i, ms) {
      if (!W || W.none || W.id !== id) return null;
      var T = slotTiming(id, i), t = ms || now(), k = Math.floor((t + T.phase) / T.P), p = planOf(W, i, k, k * T.P - T.phase, T.P);
      return p ? { who: p.who.name, body: p.who.body, code: p.who.code, segs: p.segs.map(function (g) { return g.kind + (g.at ? '@' + g.at : g.seat ? '@' + g.seat.seat : '') + ' ' + Math.round(g.t0) + '-' + Math.round(g.t1); }) } : null;
    },
    _ready: function () { return !!(CFG && SEATS); },
    _off: function (v) { OFF = !!v; }
  };
})();
