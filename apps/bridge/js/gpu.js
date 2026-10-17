/**
 * BridgeGPU — the graphics card's share of drawing the world (WebGL2).
 *
 * The world is still painted in 2D into its native buffer (js/world.js); on its way to the screen the finished
 * frame goes through the card, which adds what's cheap there and dear on the CPU:
 *
 *   glow   light that spills: what gives off light throws a soft halo over its surroundings, more after dark than
 *          by day. A scene rendered with its glow image (scene.json "glow": the render's emission pass, alone) says
 *          exactly what that is, lined up with the scene as the camera moves; anything else — lanterns on the water,
 *          neon drawn in code — is found by eye: much brighter than what's round it, and coloured or blazing (a
 *          guess, used outdoors; indoors only without a glow image, where a firelit pale thing can pass for a lamp).
 *          The guess is taken from the place before anyone is drawn in it (BridgeGPU.source, js/world.js), so a pale
 *          helmet never glows; the halo is then laid over everything.
 *          Worked at half, quarter and eighth size, then laid over the frame (a screen blend) at native resolution, so it
 *          lands on the same pixel grid as the art; the art's own pixels are read exactly, never resampled.
 *
 * BridgeGPU.source(buf) — the place as drawn so far (scene and ground, no people yet): what glows this frame.
 *   Without it the whole finished frame is used.
 * BridgeGPU.present(buf, w, h, opts) → a canvas holding the finished frame, or null when the card isn't there to
 *   help (no WebGL2, the context lost, graphics drawn in software, or turned off: ?gpu=0 in the URL, or localStorage
 *   bridge_gpu = 'off') — the caller then draws buf as before. ?gpu=1 keeps it on even in software (the tests).
 *   opts.glow scales the glow (0 none, 1 as tuned; a world's JSON may set "glow"); opts.scene / offX / offY: the
 *   scene drawn and where (its glow image); opts.guess: how much to trust the eye (0..1); opts.vignette: how much the
 *   corners darken (soft light; VIGNETTE by default, 0 none).
 */
var BridgeGPU = (function () {
  // soft light (Beck's pick from Look Book 2: "toy… with soft light"): the glow below, and the frame's corners a little
  // darker so the eye settles in the middle (opts.vignette, 0 none)
  var VIGNETTE = 0.18;
  var off = /[?&]gpu=0(&|$)/.test(location.search), force = /[?&]gpu=1(&|$)/.test(location.search);
  try { if (localStorage.getItem('bridge_gpu') === 'off') off = true; } catch (e) { /* private mode */ }

  var cv = null, gl = null, failed = false, lost = false, frames = 0;
  var prog = {}, frame = null, src = null, sourced = false, T = {}, vao = null, none = null, glows = {};

  var VS = '#version 300 es\nin vec2 p;\nvoid main() { gl_Position = vec4(p, 0.0, 1.0); }\n';
  var HEAD = '#version 300 es\nprecision highp float;\nout vec4 o;\n' +
             'float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }\n';
  var FS = {
    // what glows: a light, not a pale surface. Lights here are coloured (flame, lamp yellow, neon) or blazing white;
    // and brighter than their neighbourhood, so a sunlit wall or a lit room's floor doesn't, a lamp in the dark does
    bright: HEAD +
      'uniform sampler2D frame; uniform vec2 size; uniform float gain;\n' +
      'uniform sampler2D glowTex; uniform vec4 glowAt; uniform vec2 full; uniform float glowK; uniform float guess;\n' +
      'float val(vec3 c) { return max(c.r, max(c.g, c.b)); }\n' +
      'void main() {\n' +
      '  vec2 uv = gl_FragCoord.xy / size;\n' +
      '  vec3 c = textureLod(frame, uv, 0.0).rgb;\n' +                 // the 2x2 of the frame under this texel
      '  float v = val(c), sat = v > 0.0 ? (v - min(c.r, min(c.g, c.b))) / v : 0.0;\n' +
      '  float near = val(textureLod(frame, uv, 3.0).rgb);\n' +        // the neighbourhood, ~8 px round
      '  float all = luma(textureLod(frame, vec2(0.5), 12.0).rgb);\n' + // the whole frame
      '  float light = max(smoothstep(0.3, 0.55, sat), 0.6 * smoothstep(0.9, 0.98, v));\n' +
      '  float k = guess * light * smoothstep(0.6, 0.9, v) * smoothstep(0.15, 0.4, v - near);\n' +
      '  float dark = 1.0 - smoothstep(0.12, 0.5, all);\n' +
      '  vec2 su = (uv * full - glowAt.xy) / glowAt.zw;\n' +              // where this falls on the scene's glow image
      '  vec3 e = (glowK > 0.0 && su.x >= 0.0 && su.y >= 0.0 && su.x <= 1.0 && su.y <= 1.0) ? texture(glowTex, su).rgb * glowK : vec3(0.0);\n' +
      '  o = vec4(max(c * k * gain * mix(0.25, 1.0, dark), e * gain * 0.8), 1.0);\n' +
      '}\n',
    // a 9-tap gaussian along dir, from five linear reads
    blur: HEAD +
      'uniform sampler2D src; uniform vec2 size; uniform vec2 dir;\n' +
      'void main() {\n' +
      '  vec2 uv = gl_FragCoord.xy / size, d = dir / size;\n' +
      '  vec3 s = texture(src, uv).rgb * 0.2270270;\n' +
      '  s += (texture(src, uv + d * 1.3846154).rgb + texture(src, uv - d * 1.3846154).rgb) * 0.3162162;\n' +
      '  s += (texture(src, uv + d * 3.2307692).rgb + texture(src, uv - d * 3.2307692).rgb) * 0.0702703;\n' +
      '  o = vec4(s, 1.0);\n' +
      '}\n',
    // one size down (a linear read averages the 2x2)
    copy: HEAD +
      'uniform sampler2D src; uniform vec2 size;\n' +
      'void main() { o = vec4(texture(src, gl_FragCoord.xy / size).rgb, 1.0); }\n',
    // the frame, exactly, with the glow screened over it (premultiplied, so the alpha comes along)
    out: HEAD +
      'uniform sampler2D frame; uniform sampler2D g1; uniform sampler2D g2; uniform sampler2D g3; uniform vec3 wts;\n' +
      'uniform vec2 size; uniform float amt; uniform float vig;\n' +
      'void main() {\n' +
      '  ivec2 px = ivec2(int(gl_FragCoord.x), int(size.y) - 1 - int(gl_FragCoord.y));\n' +
      '  vec4 f = texelFetch(frame, px, 0);\n' +
      '  vec2 uv = (vec2(px) + 0.5) / size;\n' +
      '  vec2 q = (uv - 0.5) * vec2(2.0, 2.0 * size.y / size.x);\n' +
      '  f.rgb *= 1.0 - vig * smoothstep(0.45, 1.3, length(q));\n' +
      '  vec3 g = texture(g1, uv).rgb * wts.x + texture(g2, uv).rgb * wts.y + texture(g3, uv).rgb * wts.z;\n' +
      '  g = min(vec3(1.0), g * amt);\n' +
      '  float ga = max(g.r, max(g.g, g.b));\n' +
      '  o = vec4(f.rgb + g - f.rgb * g, f.a + ga - f.a * ga);\n' +
      '}\n'
  };

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
    return s;
  }
  function program(fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('program: ' + gl.getProgramInfoLog(p));
    var u = {};
    for (var i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) {
      var name = gl.getActiveUniform(p, i).name;
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p: p, u: u };
  }
  function texture(filter) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  // a texture to draw into, (re)sized to w × h
  function target(name, w, h) {
    var t = T[name];
    if (t && t.w === w && t.h === h) return t;
    if (!t) { t = T[name] = { tex: texture(gl.LINEAR), fb: gl.createFramebuffer() }; }
    t.w = w; t.h = h;
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
    return t;
  }

  function init() {
    cv = document.createElement('canvas');
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    cv.addEventListener('webglcontextrestored', function () { lost = false; setup(); });
    gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false,
                                    stencil: false, preserveDrawingBuffer: false });
    if (!gl) { failed = true; return; }
    // graphics drawn in software (no driver for the card) would cost more frame time than the glow is worth
    var dbg = gl.getExtension('WEBGL_debug_renderer_info');
    var who = String(gl.getParameter(gl.RENDERER)) + ' ' + (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '');
    if (!force && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(who)) {
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      gl = null; failed = true;
      return;
    }
    setup();
  }
  function setup() {
    try {
      prog = {}; T = {};
      for (var k in FS) prog[k] = program(FS[k]);
      frame = texture(gl.NEAREST);               // the finished frame, read exactly
      src = texture(gl.LINEAR_MIPMAP_LINEAR);    // what glows, with its averages
      none = texture(gl.NEAREST);                // no glow image: black
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      glows = {};
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);   // one triangle over the lot
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.disable(gl.BLEND);
    } catch (e) {
      failed = true;
      if (window.console) console.warn('BridgeGPU off:', e.message);
    }
  }

  function bind(unit, tex) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); }
  function pass(name, into, w, h, set) {
    var P = prog[name];
    gl.useProgram(P.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, into ? into.fb : null);
    gl.viewport(0, 0, w, h);
    if (P.u.size) gl.uniform2f(P.u.size, w, h);
    set(P.u);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // the halo at half, quarter and eighth size: a tight bloom round the light, then wider and softer
  var LEVELS = [0.9, 1.3, 1.6], GAIN = 2.0;

  // a canvas into a texture; mips: with its chain (the neighbourhood and whole-frame averages the bright pass reads)
  function upload(tex, canvas, mips) {
    bind(0, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    if (mips) gl.generateMipmap(gl.TEXTURE_2D);
  }

  // a scene's glow image, as a texture once it's loaded (null till then, or if it has none)
  function sceneGlow(sc) {
    if (!sc || !sc.meta || !sc.meta.glow) return null;
    var key = sc.id + (sc.q || ''), G = glows[key];
    if (!G) {
      G = glows[key] = { ready: false, tex: null, img: new Image() };
      G.img.onload = function () {
        if (!gl || lost) return;
        G.tex = texture(gl.LINEAR);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, G.img);
        G.w = G.img.width; G.h = G.img.height; G.ready = true;
      };
      G.img.src = '/bridge/assets/scenes/' + sc.id + '/glow' + (sc.ext || '.png') + (sc.q || '');
    }
    return G.ready ? G : null;
  }

  function glow(buf, w, h, amt, sourced, o) {
    upload(frame, buf, false);
    if (!sourced) upload(src, buf, true);         // no source taken this frame: the whole frame is what glows
    bind(0, src);
    var lw = w, lh = h, outs = [];
    for (var i = 0; i < LEVELS.length; i++) {
      lw = Math.max(1, Math.ceil(lw / 2)); lh = Math.max(1, Math.ceil(lh / 2));
      var a = target('a' + i, lw, lh), b = target('b' + i, lw, lh);
      if (i === 0) {
        var G = sceneGlow(o.scene), sky = G && typeof BridgeScene !== 'undefined' && BridgeScene.skyOf ? BridgeScene.skyOf(o.scene) : null;
        bind(1, G ? G.tex : none);
        pass('bright', a, lw, lh, function (u) {
          gl.uniform1i(u.frame, 0); gl.uniform1f(u.gain, GAIN); gl.uniform1i(u.glowTex, 1); gl.uniform2f(u.full, w, h);
          gl.uniform4f(u.glowAt, G ? o.offX - o.scene.meta.originX : 0, G ? o.offY - o.scene.meta.originY : 0, G ? G.w : 1, G ? G.h : 1);
          gl.uniform1f(u.glowK, G ? (sky ? 1 - 0.85 * sky.day : 1) : 0);              // a lamp by day hardly glows
          gl.uniform1f(u.guess, o.guess != null ? o.guess : 1);
        });
      } else { bind(0, outs[i - 1].tex); pass('copy', a, lw, lh, function (u) { gl.uniform1i(u.src, 0); }); }
      bind(0, a.tex); pass('blur', b, lw, lh, function (u) { gl.uniform1i(u.src, 0); gl.uniform2f(u.dir, 1, 0); });
      bind(0, b.tex); pass('blur', a, lw, lh, function (u) { gl.uniform1i(u.src, 0); gl.uniform2f(u.dir, 0, 1); });
      outs.push(a);
    }
    // out to the canvas
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    bind(0, frame); bind(1, outs[0].tex); bind(2, outs[1].tex); bind(3, outs[2].tex);
    pass('out', null, w, h, function (u) {
      gl.uniform1i(u.frame, 0); gl.uniform1i(u.g1, 1); gl.uniform1i(u.g2, 2); gl.uniform1i(u.g3, 3);
      gl.uniform3f(u.wts, LEVELS[0], LEVELS[1], LEVELS[2]); gl.uniform1f(u.amt, amt);
      gl.uniform1f(u.vig, o.vignette != null ? +o.vignette : VIGNETTE);
    });
  }

  function ready() {
    if (off || failed) return false;
    if (!gl) { init(); if (failed) return false; }
    return !(lost || gl.isContextLost());
  }
  function fail(e) {
    failed = true;
    if (window.console) console.warn('BridgeGPU off:', e.message);
  }

  function source(buf) {
    if (!ready()) return;
    try { upload(src, buf, true); sourced = true; } catch (e) { fail(e); }
  }

  function present(buf, w, h, opts) {
    var amt = opts && opts.glow != null ? +opts.glow : 1, use = sourced;
    sourced = false;                               // a source is for this frame only
    if (!(amt > 0) || !ready()) return null;
    try { glow(buf, w, h, amt, use, opts || {}); } catch (e) { fail(e); return null; }
    frames++;
    return cv;
  }

  /** Whether the card is drawing (false until the first frame tries, or when it can't). */
  function active() { return !!gl && !failed && !lost && !off; }
  /** Turn it on or off for this pilot (kept in localStorage). */
  function setOn(on) {
    off = !on;
    try { localStorage.setItem('bridge_gpu', on ? 'on' : 'off'); } catch (e) { /* private mode */ }
  }
  /** Frames that have gone through the card so far (the tests). */
  function stats() { return { frames: frames, active: active() }; }

  return { source: source, present: present, active: active, setOn: setOn, stats: stats, _gl: function () { return gl; } };
})();
