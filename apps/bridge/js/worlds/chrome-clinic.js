/**
 * Chrome Clinic — Arcadia interior.
 *
 * Sterile cybernetic-augmentation clinic. Cyan-and-white tile, an
 * exam chair with articulating cybernetic arms, holographic body
 * diagrams projecting from the wall, a glass cabinet of vials, a
 * floating medical drone, a doctor in a lab coat, a patient lying on
 * a recovery bed, and a status terminal showing pulse readouts.
 */
(function () {

  function drawBackground(ctx, w, h, time) {
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a1218');
    grad.addColorStop(1, '#080e14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // Wall — clinical white tile with cyan trim every 4 tiles.
  function drawWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var DK = '#0a1018';
    var BASE = '#252a35';
    var BASE_HI = '#3a4050';
    var TILE_GROUT = '#15202a';
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = BASE_HI;
    ctx.fillRect(x, y, ts, u);
    ctx.fillStyle = DK;
    ctx.fillRect(x, y + ts - u, ts, u);
    // 8u tile pattern
    ctx.fillStyle = TILE_GROUT;
    ctx.fillRect(x + 8*u - u, y, u, ts);
    ctx.fillRect(x, y + 8*u - u, ts, u);
    // Cyan trim band (1u line) at row * 4 == 0
    if (col % 4 === 0) {
      ctx.fillStyle = '#5cc8d0';
      ctx.fillRect(x, y + 5*u, ts, 1);
    }
  }

  // Sterile floor — light tile with cyan grout.
  function drawFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    ctx.fillStyle = '#202830';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#2a3340';
    ctx.fillRect(x, y, 8*u, 8*u);
    ctx.fillRect(x + 8*u, y + 8*u, 8*u, 8*u);
    // Cyan grout cross
    ctx.fillStyle = '#15202a';
    ctx.fillRect(x + 8*u - u, y, u, ts);
    ctx.fillRect(x, y + 8*u - u, ts, u);
    // Subtle reflection
    var t = time || 0;
    if ((col + row) % 6 === 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.1;
      var phase = (t / 6000 + col * 0.3) % 1;
      ctx.fillStyle = '#5cc8d0';
      ctx.fillRect(x + (Math.floor(phase * 14) - 2)*u, y + 9*u, 4*u, 1);
      ctx.restore();
    }
  }

  // Exam chair — reclined chair with cybernetic arms reaching down.
  function drawExamChair(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a1018';
    var BODY = '#3a4858';
    var BODY_HI = '#5a6878';
    var CHROME = '#a0b0c0';
    var SEAT = '#3a1830';
    // Chair base — circular pedestal
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 12*u, 8*u, 3*u);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 4*u, y + 12*u, 8*u, 2*u);
    ctx.fillStyle = BODY_HI;
    ctx.fillRect(x + 4*u, y + 12*u, 8*u, u);
    // Backrest (vertical)
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 3*u, 8*u, 5*u);
    ctx.fillStyle = SEAT;
    ctx.fillRect(x + 4*u, y + 3*u, 8*u, 4*u);
    ctx.fillStyle = '#5a2848';
    ctx.fillRect(x + 4*u, y + 3*u, 8*u, u);
    // Headrest detail — paneled
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 4*u, 6*u, 1);
    ctx.fillRect(x + 5*u, y + 6*u, 6*u, 1);
    // Seat cushion (horizontal, attached to backrest base)
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 8*u, 8*u, 4*u);
    ctx.fillStyle = SEAT;
    ctx.fillRect(x + 4*u, y + 8*u, 8*u, 3*u);
    // Cybernetic arms — reaching down from above (animated tip glow)
    var pulse = 0.7 + Math.sin(t / 500) * 0.2;
    // Left arm
    ctx.fillStyle = DK;
    ctx.fillRect(x + 2*u, y, u, 6*u);
    ctx.fillStyle = CHROME;
    ctx.fillRect(x + 2*u, y, u, 5*u);
    // Joint
    ctx.fillStyle = DK;
    ctx.fillRect(x + 2*u, y + 5*u, 2*u, 2*u);
    ctx.fillStyle = CHROME;
    ctx.fillRect(x + 2*u, y + 5*u, 2*u, u);
    // Tip with cyan light
    ctx.fillStyle = 'rgba(120, 220, 232, ' + pulse + ')';
    ctx.fillRect(x + 3*u, y + 6*u, u, 2*u);
    // Right arm (mirror)
    ctx.fillStyle = DK;
    ctx.fillRect(x + 13*u, y, u, 6*u);
    ctx.fillStyle = CHROME;
    ctx.fillRect(x + 13*u, y, u, 5*u);
    ctx.fillStyle = DK;
    ctx.fillRect(x + 12*u, y + 5*u, 2*u, 2*u);
    ctx.fillStyle = CHROME;
    ctx.fillRect(x + 12*u, y + 5*u, 2*u, u);
    ctx.fillStyle = 'rgba(232, 80, 200, ' + pulse + ')';
    ctx.fillRect(x + 12*u, y + 6*u, u, 2*u);
    // Tube cables connecting arms to seat
    ctx.fillStyle = '#3a3848';
    ctx.fillRect(x + 3*u, y + 7*u, u, 5*u);
    ctx.fillRect(x + 12*u, y + 7*u, u, 5*u);
    // Subtle aura around chair
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.3;
    var halo = ctx.createRadialGradient(x + 8*u, y + 8*u, 0, x + 8*u, y + 8*u, 9*u);
    halo.addColorStop(0, 'rgba(120, 220, 232, 0.6)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - u, y, ts + 2*u, ts);
    ctx.restore();
  }

  // Holo-display — wall-mounted holographic body diagram. Animated wireframe.
  function drawHoloDisplay(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    var DK = '#0a1018';
    // Frame
    ctx.fillStyle = DK;
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, 11*u);
    ctx.fillStyle = '#0e1a26';
    ctx.fillRect(x + 2*u, y + 3*u, ts - 4*u, 9*u);
    // Wireframe body — head + torso + limbs (1u lines)
    var pulse = 0.78 + Math.sin(t / 400) * 0.18;
    ctx.fillStyle = 'rgba(120, 220, 232, ' + pulse + ')';
    // Head (round-ish)
    ctx.fillRect(x + 7*u, y + 4*u, 2*u, 2*u);
    ctx.fillRect(x + 7*u + 1, y + 4*u - 1, 2*u - 2, 1);
    ctx.fillRect(x + 7*u + 1, y + 6*u, 2*u - 2, 1);
    // Neck
    ctx.fillRect(x + 7*u + 1, y + 6*u, 2*u - 2, 1);
    // Torso (rectangle outline)
    ctx.strokeStyle = 'rgba(120, 220, 232, ' + pulse + ')';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 6*u, y + 7*u, 4*u, 4*u);
    // Arms (1u lines diagonal)
    ctx.beginPath();
    ctx.moveTo(x + 6*u, y + 7*u);
    ctx.lineTo(x + 4*u, y + 9*u);
    ctx.moveTo(x + 10*u, y + 7*u);
    ctx.lineTo(x + 12*u, y + 9*u);
    ctx.stroke();
    // Legs
    ctx.beginPath();
    ctx.moveTo(x + 7*u, y + 11*u);
    ctx.lineTo(x + 7*u, y + 13*u);
    ctx.moveTo(x + 9*u, y + 11*u);
    ctx.lineTo(x + 9*u, y + 13*u);
    ctx.stroke();
    // Pulsing "implants" — pink dots over body parts
    var dotPhase = Math.floor(t / 700) % 4;
    var dots = [[8, 7], [6, 9], [10, 9], [8, 11]];
    var d = dots[dotPhase];
    ctx.fillStyle = 'rgba(232, 80, 200, 0.9)';
    ctx.fillRect(x + d[0] * u, y + d[1] * u, u, u);
    // Halo
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.3;
    var halo = ctx.createRadialGradient(x + ts/2, y + 8*u, 0, x + ts/2, y + 8*u, ts);
    halo.addColorStop(0, 'rgba(120, 220, 232, 0.6)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - ts*0.3, y, ts * 1.6, ts);
    ctx.restore();
    // Frame highlight
    ctx.fillStyle = '#3a4858';
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, 1);
  }

  // Medical cabinet — glass-front cabinet with glowing vials.
  function drawMedCabinet(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    var DK = '#0a1018';
    var FRAME = '#3a4858';
    ctx.fillStyle = DK;
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, 11*u);
    ctx.fillStyle = FRAME;
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, u);
    ctx.fillStyle = '#5a6878';
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, 1);
    // Glass front
    ctx.fillStyle = '#101822';
    ctx.fillRect(x + 2*u, y + 3*u, ts - 4*u, 9*u);
    // Internal cyan glow
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.5 + Math.sin(t / 700) * 0.1;
    var grad = ctx.createLinearGradient(x, y, x, y + ts);
    grad.addColorStop(0, 'rgba(120, 220, 232, 0.55)');
    grad.addColorStop(1, 'rgba(80, 60, 200, 0.2)');
    ctx.fillStyle = grad;
    ctx.fillRect(x + 2*u, y + 3*u, ts - 4*u, 9*u);
    ctx.restore();
    // 3 shelves of vials (each shelf has 4 vials)
    var COLORS = [['#5cc8d0', '#90e0e8'], ['#a040c0', '#c860e0'], ['#5ac070', '#80e890'], ['#c8a840', '#e8c870']];
    for (var s = 0; s < 3; s++) {
      var sy = y + (4 + s * 3) * u;
      // Shelf line
      ctx.fillStyle = FRAME;
      ctx.fillRect(x + 2*u, sy + 2*u, ts - 4*u, u);
      // Vials
      for (var v = 0; v < 4; v++) {
        var vx = x + (3 + v * 2) * u;
        var c = COLORS[(col * 7 + s * 5 + v) % COLORS.length];
        ctx.fillStyle = '#0a1018';
        ctx.fillRect(vx, sy, u, 2*u);
        ctx.fillStyle = c[0];
        ctx.fillRect(vx, sy + 1, u, 2*u - 1);
        ctx.fillStyle = c[1];
        ctx.fillRect(vx, sy + 1, u, 1);
      }
    }
    // Reflection band
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x + 2*u, y + 3*u, u, 9*u);
  }

  // Recovery bed — flat with patient lying. Beep monitor next to it.
  function drawRecoveryBed(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a1018';
    var BED = '#5a6878';
    var BED_HI = '#7a8898';
    var SHEET = '#e8eef4';
    var SHEET_DK = '#a8b0bc';
    // Bed frame
    ctx.fillStyle = DK;
    ctx.fillRect(x + 2*u, y + 5*u, ts - 4*u, 9*u);
    ctx.fillStyle = BED;
    ctx.fillRect(x + 2*u, y + 5*u, ts - 4*u, 9*u);
    ctx.fillStyle = BED_HI;
    ctx.fillRect(x + 2*u, y + 5*u, ts - 4*u, u);
    // Sheet
    ctx.fillStyle = SHEET;
    ctx.fillRect(x + 3*u, y + 7*u, ts - 6*u, 6*u);
    ctx.fillStyle = SHEET_DK;
    ctx.fillRect(x + 3*u, y + 7*u, ts - 6*u, u);
    // Patient — face/head visible at top
    ctx.fillStyle = '#d8c0a0';
    ctx.fillRect(x + 6*u, y + 6*u, 4*u, 2*u);
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 6*u, 4*u, u);
    ctx.fillRect(x + 7*u, y + 7*u, u, 1);
    ctx.fillRect(x + 8*u, y + 7*u, u, 1);
    // Pillow shape
    ctx.fillStyle = SHEET;
    ctx.fillRect(x + 4*u, y + 6*u, 2*u, 2*u);
    ctx.fillRect(x + 10*u, y + 6*u, 2*u, 2*u);
    // Blanket pattern (1u stripe)
    ctx.fillStyle = '#5cc8d0';
    ctx.fillRect(x + 3*u, y + 10*u, ts - 6*u, u);
    // Vital monitor — small box on the side
    ctx.fillStyle = DK;
    ctx.fillRect(x + 12*u, y + 4*u, 3*u, 4*u);
    ctx.fillStyle = '#0e1a26';
    ctx.fillRect(x + 12*u, y + 4*u, 3*u, 3*u);
    // EKG line — animated
    var pulse = 0.7 + Math.sin(t / 300) * 0.3;
    ctx.fillStyle = 'rgba(120, 220, 232, ' + pulse + ')';
    var beatOff = (t / 100) % (3 * u);
    ctx.fillRect(x + 12*u, y + 5*u + 1, 3*u, 1);
    ctx.fillRect(x + 12*u + Math.floor(beatOff), y + 4*u + 1, 1, 2*u);
    // IV stand
    ctx.fillStyle = DK;
    ctx.fillRect(x + 2*u, y + u, 1, 5*u);
    ctx.fillRect(x + u, y + u, 3*u, 2*u);
    ctx.fillStyle = '#5cc8d0';
    ctx.fillRect(x + u, y + u, 3*u, u);
  }

  // Doctor — lab coat + surgical mask + clipboard.
  function drawDoctor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a1018';
    var SKIN = '#d8c0a0';
    var COAT = '#e8eef4';
    var COAT_DK = '#a8b0bc';
    var MASK = '#5cc8d0';
    var bob = Math.sin(t / 1300) > 0.85 ? -u : 0;
    // Hair (black)
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 1*u + bob, 6*u, 2*u);
    // Head
    ctx.fillStyle = SKIN;
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, u);
    // Eyes (above mask)
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 3*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 3*u + bob, u, u);
    // Surgical mask (covers lower half of face)
    ctx.fillStyle = MASK;
    ctx.fillRect(x + 5*u, y + 4*u + bob, 6*u, 2*u);
    // Mask straps
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 10*u, y + 4*u + bob, u, u);
    // Body — lab coat
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    ctx.fillStyle = COAT;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    ctx.fillStyle = COAT_DK;
    ctx.fillRect(x + 4*u, y + 10*u + bob, 8*u, u);
    // Coat collar
    ctx.fillStyle = COAT_DK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, u);
    // Chest pocket — pink medical insignia
    ctx.fillStyle = '#a04040';
    ctx.fillRect(x + 5*u, y + 7*u + bob, 1, 2);
    ctx.fillRect(x + 5*u + 1, y + 7*u + bob + 1, 1, 1);
    // Stethoscope around neck (cyan)
    ctx.fillStyle = '#5cc8d0';
    ctx.fillRect(x + 6*u, y + 6*u + bob, u, 2*u);
    ctx.fillRect(x + 9*u, y + 6*u + bob, u, 2*u);
    ctx.fillRect(x + 7*u, y + 8*u + bob, u, u);
    // Pants — navy
    ctx.fillStyle = '#1a2030';
    ctx.fillRect(x + 5*u, y + 11*u + bob, 6*u, u);
    // Legs
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    // White shoes
    ctx.fillStyle = COAT;
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
  }

  // Medical drone — small floating sphere with cyan glow, hovering above floor.
  function drawMedDrone(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a1018';
    // Hover bob — gentle up/down
    var hover = Math.sin(t / 700 + col) * u;
    var cy = y + 7*u + hover;
    var cx = x + 8*u;
    // Body — sphere (4u)
    ctx.fillStyle = DK;
    ctx.fillRect(cx - 3*u, cy - 2*u, 6*u, 4*u);
    ctx.fillStyle = '#a0b0c0';
    ctx.fillRect(cx - 3*u, cy - 2*u, 6*u, 3*u);
    ctx.fillStyle = '#e0e8f0';
    ctx.fillRect(cx - 3*u, cy - 2*u, 6*u, u);
    // Eye sensor (cyan)
    var pulse = 0.78 + Math.sin(t / 400) * 0.18;
    ctx.fillStyle = 'rgba(120, 220, 232, ' + pulse + ')';
    ctx.fillRect(cx - u, cy, 2*u, u);
    // Antenna
    ctx.fillStyle = DK;
    ctx.fillRect(cx, cy - 4*u, 1, 2*u);
    ctx.fillStyle = 'rgba(232, 80, 200, ' + pulse + ')';
    ctx.fillRect(cx, cy - 4*u, 1, 1);
    // Hover glow under
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.55;
    var glow = ctx.createRadialGradient(cx, y + 13*u, 0, cx, y + 13*u, 6*u);
    glow.addColorStop(0, 'rgba(120, 220, 232, 0.7)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(x, y + 9*u, ts, 6*u);
    ctx.restore();
  }

  // Status terminal — wall-mounted info screen with vital readouts.
  function drawStatusTerminal(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    var DK = '#0a1018';
    ctx.fillStyle = DK;
    ctx.fillRect(x + u, y + 3*u, ts - 2*u, 9*u);
    ctx.fillStyle = '#0e1a26';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 7*u);
    // Heart rate line (animated)
    var pulse = 0.85 + Math.sin(t / 400) * 0.15;
    ctx.fillStyle = 'rgba(232, 80, 80, ' + pulse + ')';
    ctx.fillRect(x + 3*u, y + 6*u, ts - 6*u, 1);
    var beat = (t / 100) % (ts - 6*u);
    ctx.fillRect(x + 3*u + Math.floor(beat), y + 5*u, 1, 2*u);
    // Numbers (faux)
    ctx.fillStyle = 'rgba(120, 220, 232, ' + pulse + ')';
    ctx.fillRect(x + 3*u, y + 8*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 8*u, 3*u, u);
    ctx.fillRect(x + 3*u, y + 10*u, 5*u, u);
    // Frame
    ctx.fillStyle = '#3a4858';
    ctx.fillRect(x + u, y + 3*u, ts - 2*u, 1);
    // Halo
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.3;
    var halo = ctx.createRadialGradient(x + ts/2, y + 7*u, 0, x + ts/2, y + 7*u, ts);
    halo.addColorStop(0, 'rgba(120, 220, 232, 0.55)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - ts*0.3, y, ts * 1.6, ts);
    ctx.restore();
  }

  // Cleanlight — recessed ceiling fixture, very bright cyan-white.
  function drawCleanLight(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    // Frame
    ctx.fillStyle = '#0a1018';
    ctx.fillRect(x + 2*u, y + 5*u, ts - 4*u, 4*u);
    // Light panel
    var pulse = 0.92 + Math.sin(t / 800 + col * 0.7) * 0.08;
    ctx.fillStyle = 'rgba(220, 245, 255, ' + pulse + ')';
    ctx.fillRect(x + 3*u, y + 6*u, ts - 6*u, 2*u);
    // Halo
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.45;
    var halo = ctx.createLinearGradient(x, y + 7*u, x, y + ts);
    halo.addColorStop(0, 'rgba(180, 230, 255, 0.7)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x, y + 7*u, ts, 9*u);
    ctx.restore();
  }

  // Door — exit threshold.
  function drawDoor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    ctx.fillStyle = '#1a3040';
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, ts - 4*u);
    ctx.fillStyle = '#3a6878';
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, u);
    var bob = Math.sin(t / 600) * 0.5;
    ctx.fillStyle = 'rgba(180, 230, 255, ' + (0.55 + bob * 0.2).toFixed(2) + ')';
    ctx.fillRect(x + 7*u, y + ts - 4*u, 2*u, u);
    ctx.fillRect(x + 6*u, y + ts - 3*u, u, u);
    ctx.fillRect(x + 9*u, y + ts - 3*u, u, u);
  }

  // Window — clinic frosted glass, filtering street neon.
  function drawWindow(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    ctx.fillStyle = '#0a1018';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 8*u);
    // Frosted look — light-blue base
    ctx.fillStyle = '#3a5868';
    ctx.fillRect(x + 3*u, y + 5*u, ts - 6*u, 6*u);
    // Slow color phase suggesting street neon outside
    var phase = (t / 4000 + col * 0.4) % 3;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.25;
    var color = phase < 1 ? '#e870c0' : (phase < 2 ? '#80e0e8' : '#a060e0');
    ctx.fillStyle = color;
    ctx.fillRect(x + 3*u, y + 5*u, ts - 6*u, 6*u);
    ctx.restore();
    ctx.fillStyle = '#0a1018';
    ctx.fillRect(x + ts/2 - 1, y + 4*u, 2, 8*u);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 3*u, y + 5*u, u, 6*u);
  }

  BridgeWorld.registerTileset('chrome-clinic', {
    1: drawWall,
    2: drawFloor,
    3: drawExamChair,
    4: drawHoloDisplay,
    5: drawMedCabinet,
    6: drawRecoveryBed,
    7: drawDoor,
    8: drawCleanLight,
    9: drawDoctor,
    10: drawMedDrone,
    11: drawStatusTerminal,
    12: drawWindow
  });

  BridgeWorld.registerBackground('chrome-clinic', drawBackground);

})();
