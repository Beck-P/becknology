/**
 * BridgeBottle — a bottle washed up on the beach at the head of Rose Cove (world `lumar-rose`, tile 25,21,
 * left of the pier), with a tag round its neck: FOR ALYSSA & BECK ONLY. Uncork it with their code and it
 * opens The Aether Seas (apps/aether-seas), the story Beck wrote for Alyssa.
 *
 * It's a password_gate (js/interactions.js) that keeps only a SHA-256 hash of the code, since the repo
 * is public. To change the code: printf 'newcode' | sha256sum, and put the hex in HASH.
 * The bottle is drawn in the sand (the lumar `ground` hook) in 16-unit art, with a little heart over it.
 */
var BridgeBottle = (function () {
  var WORLD = 'lumar-rose', AT = [25, 21];
  var HASH = '877db6ca4d30e8807e913118ffc6fc505b33573224266eb83ef6084785845d58';

  function decorate(worldId, data) {
    if (worldId !== WORLD) return;
    data.interactions = data.interactions || [];
    data.interactions.push({
      x: AT[0], y: AT[1], type: 'password_gate', label: 'FOR ALYSSA & BECK', prompt: 'PRESS E TO UNCORK',
      dialog: 'A BOTTLE WASHED UP AT THE HEAD OF THE COVE, WITH A TAG TIED ROUND ITS NECK: "FOR ALYSSA & BECK ONLY." ' +
              'THE LETTER INSIDE IS SEALED WITH WAX, AND THE SEAL TAKES THEIR CODE.',
      passwordHash: HASH, target: '/aether-seas', failMessage: 'THE SEAL HOLDS. THIS ONE IS ONLY FOR THE TWO OF THEM.'
    });
  }

  // the bottle, lying on the sand: 16-unit art (u = 2 native px), three tones of glass, a cork, an outline
  function ground(ctx, world, offX, offY, ts, now) {
    if (typeof BridgeWorld === 'undefined' || BridgeWorld.getWorldId() !== WORLD) return;
    var u = ts / 16, X = Math.round(offX + AT[0] * ts), Y = Math.round(offY + AT[1] * ts);
    function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(X + x * u, Y + y * u, w * u, h * u); }
    px(1, 11, 8, 3, '#0e1a14');          // outline
    px(9, 12, 2, 1, '#0e1a14');
    px(2, 12, 6, 1, '#2a6a48');          // glass
    px(2, 11.5, 6, 0.5, '#4a9a6a');
    px(8, 12, 1, 1, '#2a6a48');          // neck
    px(10, 12, 1, 1, '#9a6a3a');         // cork
    px(1, 14, 9, 0.5, 'rgba(0,0,0,0.25)'); // shadow
    px(9, 13, 2, 1, '#f4ecd8');          // the tag on its neck
    // a little heart over it, breathing
    var a = 0.55 + 0.35 * Math.sin(now / 600), H = ['.X.X.', 'XXXXX', '.XXX.', '..X..'];
    ctx.globalAlpha = a;
    for (var r = 0; r < H.length; r++) for (var c = 0; c < 5; c++) if (H[r][c] === 'X') px(3.5 + c, 5 + r, 1, 1, '#f078a8');
    ctx.globalAlpha = 1;
    var t = (now % 6000) / 6000;         // a glint along the glass every six seconds
    if (t < 0.08) px(2 + Math.floor(t / 0.08 * 6), 11.5, 1, 0.5, '#c8f0d8');
  }

  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('lumar', { ground: ground });

  return { decorate: decorate };
})();
