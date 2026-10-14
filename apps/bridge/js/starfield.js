/**
 * BridgeStarfield — Particle starfield renderer.
 *
 * Two modes:
 *   'drift'  — gentle forward drift (intro + cockpit background)
 *   'streak' — stars streak to horizontal lines (hyperspace)
 *
 * Usage:
 *   BridgeStarfield.init(canvas)
 *   BridgeStarfield.draw(ctx, w, h)
 *   BridgeStarfield.setMode('streak')
 */
var BridgeStarfield = (function () {
  var stars = [];
  var COUNT = 220;
  var mode = 'drift';
  var speed = 1;
  var targetSpeed = 1;

  var PALETTE = [
    [225, 232, 255], // ice blue-white
    [210, 195, 255], // soft violet
    [165, 235, 255], // cyan-white
    [255, 230, 190], // warm amber
    [255, 190, 225]  // rose tint
  ];

  var NEBULAE = [
    { x: 0.28, y: 0.35, r: 0.38, col: [95, 55, 165], spd: 0.00018, phase: 0.0 },
    { x: 0.72, y: 0.62, r: 0.42, col: [35, 125, 155], spd: 0.00014, phase: 2.1 },
    { x: 0.52, y: 0.25, r: 0.32, col: [150, 55, 115], spd: 0.00021, phase: 4.2 }
  ];

  function init(canvas) {
    stars = [];
    for (var i = 0; i < COUNT; i++) {
      stars.push(makeStar(canvas.width, canvas.height, true));
    }
  }

  function makeStar(w, h, randomZ) {
    var col = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    return {
      x: Math.random() * w - w / 2,
      y: Math.random() * h - h / 2,
      z: randomZ ? Math.random() * 1000 : 1000,
      col: col,
      twinkle: Math.random() * Math.PI * 2,
      glint: Math.random() < 0.14
    };
  }

  function setMode(m) {
    mode = m;
    targetSpeed = m === 'streak' ? 42 : 1;
  }

  function getMode() { return mode; }

  function draw(ctx, w, h) {
    speed += (targetSpeed - speed) * 0.05;
    var now = Date.now();

    // Vanishing point near top — 45° behind view, stars stream downward
    var cx = w / 2;
    var cy = h * 0.15;

    // 1. Soft drifting deep-space nebula clouds
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var maxDim = Math.max(w, h);
    for (var n = 0; n < NEBULAE.length; n++) {
      var neb = NEBULAE[n];
      var nx = (neb.x + Math.sin(now * neb.spd + neb.phase) * 0.06) * w;
      var ny = (neb.y + Math.cos(now * neb.spd * 0.8 + neb.phase) * 0.05) * h;
      var nr = neb.r * maxDim;
      var nGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
      var nAlpha = mode === 'streak' ? 0.14 : 0.085;
      nGrad.addColorStop(0, 'rgba(' + neb.col[0] + ',' + neb.col[1] + ',' + neb.col[2] + ',' + nAlpha + ')');
      nGrad.addColorStop(0.55, 'rgba(' + neb.col[0] + ',' + neb.col[1] + ',' + neb.col[2] + ',' + (nAlpha * 0.35).toFixed(3) + ')');
      nGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = nGrad;
      ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
    }

    // Hyperspace core tunnel glow when streaking
    if (mode === 'streak' && speed > 6) {
      var warpFrac = Math.min(1, (speed - 6) / 36);
      var wGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim * 0.55);
      wGrad.addColorStop(0, 'rgba(130, 210, 255, ' + (warpFrac * 0.22).toFixed(2) + ')');
      wGrad.addColorStop(0.4, 'rgba(140, 90, 240, ' + (warpFrac * 0.10).toFixed(2) + ')');
      wGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = wGrad;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();

    // 2. Stars & warp streaks
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var sx = (s.x / s.z) * 300 + cx;
      var sy = (s.y / s.z) * 300 + cy;

      s.z -= speed;

      if (s.z <= 1 || sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) {
        stars[i] = makeStar(w, h, false);
        stars[i].z = 1000;
        continue;
      }

      var depth = 1 - s.z / 1000;
      var r = Math.max(0.5, depth * 2.5);
      var tw = 0.72 + 0.28 * Math.sin(now * 0.003 + s.twinkle);
      var alpha = Math.max(0.1, depth * tw);
      var c = s.col;

      if (mode === 'streak' && speed > 5) {
        var px = (s.x / (s.z + speed * 2.2)) * 300 + cx;
        var py = (s.y / (s.z + speed * 2.2)) * 300 + cy;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (alpha * 0.85).toFixed(2) + ')';
        ctx.lineWidth = r * 0.9;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha.toFixed(2) + ')';
        ctx.fill();

        // Crisp 4-point pixel glint on bright foreground stars
        if (s.glint && depth > 0.62) {
          var gLen = Math.round(r * 2.6);
          ctx.fillStyle = 'rgba(255, 255, 255, ' + (alpha * 0.55).toFixed(2) + ')';
          ctx.fillRect(Math.floor(sx - gLen), Math.floor(sy), gLen * 2 + 1, 1);
          ctx.fillRect(Math.floor(sx), Math.floor(sy - gLen), 1, gLen * 2 + 1);
        }
      }
    }
  }

  return {
    init: init,
    draw: draw,
    setMode: setMode,
    getMode: getMode
  };
})();
