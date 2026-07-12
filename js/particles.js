/* ═══════════ Hero 头像粒子：从左聚合 → 粒子头像成形 → hover 扰动 ═══════════ */
/* 原图作为像素采样源，成形后再低透明叠回，canvas 负责粒子质感与 hover 扰动。 */
(function () {
  "use strict";

  var ALPHA = 150;
  // 跟蓝双曝光头像一致：墨轮廓 + 冰蓝高光（不用橙；橙是 sac 暖色头像那套）
  var INK = [22, 28, 40];         // 冷墨，比纯黑更贴蓝图
  var INK_SOFT = [48, 62, 88];
  var ICE_DEEP = [18, 42, 78];    // 深空蓝
  var ICE = [93, 157, 230];       // #5D9DE6 品牌 Ice
  var ICE_HI = [184, 217, 248];   // 星空/雪高光
  var CYAN = [120, 190, 220];     // 雪山青一点缀

  function lerp3(a, b, t) {
    return [
      (a[0] + (b[0] - a[0]) * t) | 0,
      (a[1] + (b[1] - a[1]) * t) | 0,
      (a[2] + (b[2] - a[2]) * t) | 0
    ];
  }

  // 背景判定：透明 / 纸底 / 抠图残留浅灰块（勿把冷蓝主体当背景）
  function isBg(r, g, b, a) {
    if (a < ALPHA) return true;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    var L = (mx + mn) / 2;
    var S = mx - mn;
    var cool = b - r;
    // 冷蓝双曝光主体（含较亮雪山青）→ 保留为粒子
    if (cool > 12 && (S > 10 || L < 210)) return false;
    if (cool > 22) return false;
    // 浅灰/暖纸/抠图毛边
    if (L > 200 && S < 48) return true;
    if (L > 182 && S < 32) return true;
    if (L > 215) return true;
    if (L > 205 && S < 42) return true;
    return false;
  }

  /**
   * 采样色 → 冷墨轮廓 + 冰蓝高光/左缘流光（对齐蓝头像）
   * nx,ny：左缘更亮冰蓝，深部用冷墨
   */
  function colorFor(r, g, b, nx, ny) {
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    var L = (mx + mn) / 2, S = mx - mn;
    var cool = b - r;
    var h = Math.abs(Math.sin(nx * 127.1 + ny * 311.7) * 43758.5453);
    h = h - Math.floor(h);

    // ① 深部轮廓 / 发丝 → 冷墨（带一点蓝，不是死黑）
    if (L < 52) {
      return lerp3(INK, INK_SOFT, Math.max(0, L / 52) * 0.7 + h * 0.15);
    }

    // ② 左缘流散：亮冰蓝（聚合从左来，对应头像高光）
    var leftEdge = nx < 0.24 ? (0.24 - nx) / 0.24 : 0;
    if (leftEdge > 0 && h < 0.42 + leftEdge * 0.4) {
      return lerp3(ICE, ICE_HI, 0.25 + h * 0.55);
    }

    // ③ 冷色主体（星空 / 雪山 / 青蓝）→ Ice 阶
    if (cool > 8 || (b >= g && b >= r && S > 12)) {
      var t = Math.max(0, Math.min(1, (L - 28) / 180));
      if (cool > 18) t = Math.min(1, t + 0.06);
      // 高光：冰蓝 → 近白蓝
      if (t > 0.72) return lerp3(ICE, ICE_HI, (t - 0.72) / 0.28);
      // 中亮：深空 → Ice；少量雪山青
      if (h < 0.14 && t > 0.4) return lerp3(ICE, CYAN, 0.35 + h);
      if (t < 0.4) return lerp3(ICE_DEEP, ICE, t / 0.4 * 0.85);
      return lerp3(ICE_DEEP, ICE, 0.35 + (t - 0.4) * 1.1);
    }

    // ④ 轮廓环带：冷墨里掺一点冰蓝，避免死黑块
    var edge = Math.min(nx, 1 - nx, ny, 1 - ny);
    if (edge < 0.07 && L < 130) {
      return lerp3(INK, ICE_DEEP, 0.35 + h * 0.4);
    }

    // ⑤ 中灰默认：冷墨 → 灰蓝
    var tm = Math.max(0, Math.min(1, (L - 40) / 140));
    if (h < 0.2) return lerp3(INK_SOFT, ICE, 0.2 + tm * 0.5);
    return lerp3(INK, INK_SOFT, 0.3 + tm * 0.7);
  }

  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  function init() {
    var fig = document.querySelector(".portrait[data-portrait]");
    if (!fig) return;
    var media = fig.querySelector(".portrait__media");
    var img = fig.querySelector(".portrait__img");
    if (!media || !img) return;
    if (!img.complete || !img.naturalWidth) {
      img.addEventListener("load", init, { once: true });
      return;
    }

    var reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var EXT = 0.62; // canvas 向左扩展（让溶解粒子能铺到中间）

    var canvas = document.createElement("canvas");
    canvas.className = "portrait__particles";
    canvas.setAttribute("aria-hidden", "true");
    fig.appendChild(canvas);
    var ctx = canvas.getContext("2d");

    fig.classList.remove("is-base-visible");
    img.style.opacity = "0";

    var boxW = 0, boxH = 0, extPx = 0, W = 0, H = 0;
    var particles = [];
    var TARGET = window.innerWidth < 760 ? 11000 : 30000;
    var t0 = 0, settleStart = 1600;
    var baseRevealStart = settleStart + 360;
    var baseVisible = false;
    var mouse = { x: -9999, y: -9999, on: false };

    function sample() {
      // 复刻 CSS：object-fit:cover + object-position:50% 22%
      var nat = img.naturalWidth, natH = img.naturalHeight;
      var sw = Math.min(window.innerWidth < 760 ? 340 : 420, nat);
      var boxRatio = boxH / Math.max(1, boxW);
      var srcW = nat;
      var srcH = Math.min(natH, Math.round(nat * boxRatio));
      var maxSy = Math.max(0, natH - srcH);
      var srcY = Math.round(maxSy * 0.22);
      var visH = Math.max(1, Math.round(sw * boxRatio));
      var off = document.createElement("canvas");
      off.width = sw; off.height = visH;
      var octx = off.getContext("2d");
      octx.drawImage(img, 0, srcY, srcW, srcH, 0, 0, sw, visH);
      var data = octx.getImageData(0, 0, off.width, off.height).data;
      var w = off.width, h = off.height;

      var subj = 0, i;
      for (i = 0; i < data.length; i += 4) {
        if (!isBg(data[i], data[i + 1], data[i + 2], data[i + 3])) subj++;
      }
      var step = Math.max(2, Math.round(Math.sqrt(subj / TARGET)));

      particles = [];
      for (var y = 0; y < h; y += step) {
        for (var x = 0; x < w; x += step) {
          var idx = (y * w + x) * 4;
          if (isBg(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) continue;
          var nx = x / w, ny = y / h;
          var c = colorFor(data[idx], data[idx + 1], data[idx + 2], nx, ny);
          var drift = Math.max(0, (0.18 - nx) / 0.18); // 左缘呼吸略宽
          // 亮冰蓝稍大、冷墨更细，层次跟蓝头像一致
          var isBright = c[2] > 150 || (c[2] > c[0] + 40 && c[1] + c[2] > 220);
          var baseSize = isBright ? (0.9 + Math.random() * 1.1) : (0.55 + Math.random() * 0.8);
          particles.push({
            nx: nx, ny: ny, r: c[0], g: c[1], b: c[2],
            warm: isBright ? 1 : 0,
            drift: drift,
            life: Math.random(),
            phase: Math.random() * 6.28,
            size: baseSize,
            delay: nx * 640 + Math.random() * 240,
            dur: 760 + Math.random() * 460,
            x: 0, y: 0, tx: 0, ty: 0, sx: 0, sy: 0,
          });
        }
      }
      layoutTargets(true);
    }

    function measure() {
      var r = media.getBoundingClientRect();
      boxW = r.width; boxH = r.height;
      extPx = boxW * EXT;
      canvas.style.left = (-extPx) + "px";
      canvas.style.top = "0px";
      canvas.style.width = (boxW + extPx) + "px";
      canvas.style.height = boxH + "px";
      W = boxW + extPx; H = boxH;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function layoutTargets(first) {
      for (var k = 0; k < particles.length; k++) {
        var p = particles[k];
        p.tx = extPx + p.nx * boxW; // 头像落在 canvas 右侧（扩展区在左）
        p.ty = p.ny * boxH;
        if (first) {
          p.sx = extPx * (0.08 + Math.random() * 0.72);
          p.sy = p.ty + (Math.random() - 0.5) * 140;
          p.x = p.sx; p.y = p.sy;
        }
      }
    }

    function frame(now) {
      var elapsed = now - t0;
      if (!baseVisible && (reduce || elapsed >= baseRevealStart)) {
        img.style.opacity = "";
        fig.classList.add("is-base-visible");
        baseVisible = true;
      }
      ctx.clearRect(0, 0, W, H);

      var time = now * 0.001;
      for (var k = 0; k < particles.length; k++) {
        var p = particles[k], a, px, py, hoverBoost = 0;
        if (!reduce && elapsed < settleStart) {
          // 入场聚合：整张脸的粒子从左聚合成形
          var lp = (elapsed - p.delay) / p.dur;
          var prog = lp <= 0 ? 0 : lp >= 1 ? 1 : easeOut(lp);
          px = p.sx + (p.tx - p.sx) * prog;
          py = p.sy + (p.ty - p.sy) * prog;
          a = Math.max(0, Math.min(1, lp + 0.12));
        } else {
          // 成形后：整张头像持续由粒子保持，只有轻微呼吸与 hover 扰动。
          a = 1;
          p.life += 0.006;
          if (p.life > 1) p.life -= 1;
          var k2 = p.life;
          px = p.tx - 10 * p.drift * k2 + Math.sin(time + p.phase) * 0.38;
          py = p.ty + Math.cos(time * 0.8 + p.phase) * 0.5;
          if (mouse.on) {
            var dx = px - mouse.x, dy = py - mouse.y, d2 = dx * dx + dy * dy;
            var hoverR = Math.max(115, Math.min(180, boxW * 0.2));
            if (d2 < hoverR * hoverR) {
              var d = Math.sqrt(d2) || 1;
              var hover = 1 - d / hoverR;
              hoverBoost = hover;
              var f = hover * 24;
              px += dx / d * f + Math.sin(time * 8 + p.phase) * hover * 4;
              py += dy / d * f + Math.cos(time * 7 + p.phase) * hover * 4;
              a = Math.max(a, Math.pow(hover, 0.72) * 0.94);
            }
          }
        }
        if (a <= 0.01) continue;
        ctx.fillStyle = "rgb(" + p.r + "," + p.g + "," + p.b + ")";
        var drawSize = p.size * (1 + hoverBoost * 0.75);
        // 亮冰蓝软光更强，冷墨更实
        var glow = p.warm ? 0.15 : 0.08;
        var core = p.warm ? Math.min(1, a * 1.04) : a * 0.94;
        ctx.globalAlpha = a * glow;
        ctx.fillRect(px - 0.2, py - 0.2, drawSize + 0.45, drawSize + 0.45);
        ctx.globalAlpha = core;
        ctx.fillRect(px, py, drawSize, drawSize);
      }
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    var raf, resizeId;
    window.addEventListener("resize", function () {
      clearTimeout(resizeId);
      resizeId = setTimeout(function () { measure(); layoutTargets(false); }, 160);
    });
    window.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.on = mouse.x >= 0 && mouse.x <= W && mouse.y >= 0 && mouse.y <= H;
    });
    fig.addEventListener("pointerleave", function () { mouse.on = false; });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelAnimationFrame(raf); }
      else { t0 = performance.now() - (settleStart + 100); raf = requestAnimationFrame(frame); }
    });

    measure();
    sample();
    fig.classList.add("is-particle-ready");
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
