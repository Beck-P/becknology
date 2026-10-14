/**
 * The game room — aboard the Wayfarer, east of the bridge (pre-rendered:
 * scenes/gameroom.py). Each game's slot shows the game once you've found
 * it out in the worlds and a dust sheet until then (js/games.js picks the
 * scene layers on the way in).
 */
(function () {
  BridgeWorld.registerTileset('gameroom', {});
  BridgeWorld.registerBackground('gameroom', function (ctx, w, h) {
    ctx.fillStyle = '#07060c';
    ctx.fillRect(0, 0, w, h);
  });

  BridgeState.onChange(function (state, prev, ctx) {
    if (state !== 'world' || !ctx || ctx.worldId !== 'gameroom') return;
    if (typeof BridgeScene !== 'undefined' && typeof BridgeGames !== 'undefined') BridgeScene.setLayers('gameroom', BridgeGames.layers());
  });
})();
