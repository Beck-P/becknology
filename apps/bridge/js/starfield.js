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
  var COUNT = 200;
  var mode = 'drift';
  var speed = 1;
  var targetSpeed = 1;

  function init(canvas) {
    stars = [];
    for (var i = 0; i < COUNT; i++) {
      stars.push(makeStar(canvas.width, canvas.height, true));
    }
  }

  function makeStar(w, h, randomZ) {
    return {
      x: Math.random() * w - w / 2,
      y: Math.random() * h - h / 2,
      z: randomZ ? Math.random() * 1000 : 1000,
      prevX: 0,
      prevY: 0
    };
  }

  function setMode(m) {
    mode = m;
    targetSpeed = m === 'streak' ? 40 : 1;
  }

  function getMode() { return mode; }

  function draw(ctx, w, h) {
    speed += (targetSpeed - speed) * 0.05;

    var cx = w / 2;
    var cy = h / 2;

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

      var r = Math.max(0.5, (1 - s.z / 1000) * 2.5);
      var alpha = Math.max(0.1, 1 - s.z / 1000);

      if (mode === 'streak' && speed > 5) {
        var px = (s.x / (s.z + speed * 2)) * 300 + cx;
        var py = (s.y / (s.z + speed * 2)) * 300 + cy;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = 'rgba(200, 190, 255, ' + (alpha * 0.8) + ')';
        ctx.lineWidth = r * 0.8;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(220, 215, 240, ' + alpha + ')';
        ctx.fill();
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
