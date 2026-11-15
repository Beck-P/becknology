# The review board's engine

`stockfish-19-lite-single.js` and `.wasm` are Stockfish 19 built for the browser: the "lite, single-threaded" flavour of
[Stockfish.js](https://github.com/nmrugg/stockfish.js) (Nathan Rugg's WebAssembly build of
[Stockfish](https://github.com/official-stockfish/Stockfish)), copied unchanged from the npm package `stockfish@19.0.1`
(`bin/`). The review board (`../review/engine.js`) runs it in a worker.

- **Why this flavour:** it needs no special server headers (the multi-threaded builds need cross-origin isolation), and at
  1.8 MB it loads at once. It uses a smaller network than the full 94 MB engine and is still far stronger than any player.
- **Why it's in the repo and not on a CDN:** a worker has to come from the page's own origin, and the `.wasm` has to sit
  beside the `.js`.
- **Licence:** GPL-3.0 (`COPYING.txt`). The source for exactly this build is the Stockfish.js repository above, tag `v19.0.1`.
- **A newer one:** `npm pack stockfish`, copy the two `lite-single` files here, and change the file name in
  `../review/engine.js` (and `ENGINE_NAME`). `vercel.json` caches `/chess/engine/stockfish-*` for a year, which is safe
  because the version is in the name.

(Wizard Chess 3D still loads its own, older Stockfish from a CDN to play against; this one is only for analysis.)
