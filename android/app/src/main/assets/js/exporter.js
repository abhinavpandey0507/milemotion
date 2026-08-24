/* ============================================================
   STRIDE · exporter.js — true-resolution canvas renderer.
   Mirrors the DOM artwork so GENERATE produces a real file.
   ============================================================ */

(function () {
  "use strict";

  const D = window.STRIDE;
  const A = window.STRIDE.art;

  /* ---------- fonts ---------- */

  async function ensureFonts() {
    try {
      await Promise.all([
        document.fonts.load('400 120px Anton'),
        document.fonts.load('400 40px "IBM Plex Mono"'),
        document.fonts.load("500 40px 'IBM Plex Mono'"),
        document.fonts.load("300 80px Inter"),
        document.fonts.load("600 80px Inter"),
        document.fonts.load("800 80px Inter")
      ]);
      await document.fonts.ready;
    } catch (e) {
      /* fall back to system stacks */
    }
  }

  /* ---------- theme palettes ---------- */

  function pal(themeId) {
    switch (themeId) {
      case "bw-motion":
        return {
          fg: "#fafafa", mut: "rgba(250,250,250,0.5)", line: "rgba(250,250,250,0.22)",
          acc: "#fafafa", disp: "Anton", uiDisp: true,
          speedlines: true, slashes: true
        };
      case "midnight":
        return {
          fg: "#edf2ff", mut: "rgba(237,242,255,0.52)", line: "rgba(237,242,255,0.16)",
          acc: "#9cc0ff", disp: "Anton", uiDisp: true,
          stars: true, glow: true
        };
      case "blueprint":
        return {
          fg: "#d9ebf7", mut: "rgba(217,235,247,0.55)", line: "rgba(143,208,255,0.3)",
          acc: "#8fd0ff", disp: "Anton", uiDisp: true,
          grid: true, frame: true, dashed: true
        };
      case "minimal":
        return {
          fg: "#171512", mut: "rgba(23,21,18,0.46)", line: "rgba(23,21,18,0.16)",
          acc: "#171512", disp: "Inter", uiDisp: false
        };
      case "topo":
        return {
          fg: "#e9eee2", mut: "rgba(233,238,226,0.5)", line: "rgba(233,238,226,0.16)",
          acc: "#b7c9a6", disp: "Anton", uiDisp: true,
          contours: true
        };
    }
  }

  function paintBg(ctx, W, H, p, themeId) {
    if (themeId === "midnight") {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#090e22");
      g.addColorStop(0.52, "#0f1734");
      g.addColorStop(1, "#16224a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const rg = ctx.createRadialGradient(W * 0.82, -H * 0.06, 0, W * 0.82, -H * 0.06, W * 1.2);
      rg.addColorStop(0, "rgba(156,192,255,0.16)");
      rg.addColorStop(1, "rgba(156,192,255,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle =
        themeId === "blueprint" ? "#07293f" :
        themeId === "minimal" ? "#f3f1ec" :
        themeId === "topo" ? "#101310" : "#000";
      ctx.fillRect(0, 0, W, H);
    }

    if (p.grid) {
      ctx.save();
      [[W / 16, "rgba(143,208,255,0.075)"], [W / 8, "rgba(143,208,255,0.16)"]].forEach(function (cfg) {
        ctx.strokeStyle = cfg[1];
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = cfg[0]; x < W; x += cfg[0]) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
        for (let y = cfg[0]; y < H; y += cfg[0]) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
        ctx.stroke();
      });
      ctx.restore();
    }

    if (p.speedlines) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = Math.max(1.5, W * 0.004);
      const step = W * 0.13;
      ctx.beginPath();
      for (let d = -H; d < W + H; d += step) {
        ctx.moveTo(d, 0);
        ctx.lineTo(d + H * Math.tan((58 * Math.PI) / 180), H);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (p.slashes) {
      ctx.save();
      ctx.translate(W * 0.92, H * 0.38);
      ctx.rotate((-24 * Math.PI) / 180);
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fillRect(-W * 0.23, -W * 0.045, W * 0.46, W * 0.09);
      ctx.fillRect(-W * 0.13, W * 0.09, W * 0.3, W * 0.06);
      ctx.restore();
    }

    if (p.stars) {
      const rnd = A.mulberry32(A.seedFrom("stars-canvas"));
      ctx.save();
      for (let i = 0; i < 46; i++) {
        ctx.globalAlpha = 0.2 + rnd() * 0.65;
        ctx.fillStyle = "#dbe6ff";
        const r = (0.18 + rnd() * 0.34) * (W / 100) * 1.4;
        ctx.beginPath();
        ctx.arc(rnd() * W, rnd() * H, Math.max(0.7, r), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (p.contours) {
      const rnd = A.mulberry32(A.seedFrom("topo-canvas"));
      const cx = W * 0.74, cy = H * 0.22, baseR = W * 0.36;
      ctx.save();
      ctx.strokeStyle = "rgba(183,201,166,0.2)";
      ctx.lineWidth = Math.max(1, W * 0.0035);
      [1, 0.76, 0.54, 0.34].forEach(function (s) {
        const path = new Path2D(A.blobPath(rnd, cx / (W / 100), cy / (H / 100), baseR * s / (W / 100), 0.42));
        ctx.save();
        ctx.scale(W / 100, H / 100);
        ctx.stroke(path);
        ctx.restore();
      });
      ctx.restore();
    }

    if (p.frame) {
      ctx.strokeStyle = p.line;
      ctx.lineWidth = 1;
      ctx.strokeRect(W * 0.034, W * 0.034, W - W * 0.068, H - W * 0.068);
      ctx.fillStyle = p.acc;
      ctx.fillRect(W / 2 - W * 0.025, W * 0.034, W * 0.05, 1);
      ctx.fillRect(W * 0.034, H * 0.82, 1, W * 0.05);
      ctx.font = `400 ${W * 0.021}px "IBM Plex Mono"`;
      ctx.fillStyle = p.mut;
      ctx.textAlign = "right";
      try { ctx.letterSpacing = `${W * 0.002}px`; } catch (e) {}
      ctx.fillText("47.21° N  08.54° E", W - W * 0.06, W * 0.075);
      ctx.textAlign = "left";
    }
  }

  /* ---------- text helpers ---------- */

  function setFont(ctx, weight, sizePx, family) {
    ctx.font = `${weight} ${sizePx}px ${family}`;
  }

  function tracked(ctx, text, x, y, lsPx) {
    try { ctx.letterSpacing = `${lsPx}px`; } catch (e) {}
    ctx.fillText(text, x, y);
    try { ctx.letterSpacing = "0px"; } catch (e) {}
  }

  function trackedWidth(ctx, text, lsPx) {
    return ctx.measureText(text).width + Math.max(0, text.length - 1) * lsPx;
  }

  function wrapLines(ctx, text, maxW) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = "";
    words.forEach(function (w) {
      const t = cur ? cur + " " + w : w;
      if (ctx.measureText(t).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = t;
      }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function dashLine(ctx, x1, y, x2, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y + 0.5);
    ctx.lineTo(x2, y + 0.5);
    ctx.stroke();
  }

  /* ---------- route ---------- */

  function drawRoute(ctx, p, themeId, pts, rx, ry, rw, rh) {
    let minX = 100, maxX = 0, minY = 100, maxY = 0;
    pts.forEach(function (q) {
      minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x);
      minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y);
    });
    const s = Math.min(rw / (maxX - minX || 1), rh / (maxY - minY || 1));
    const ox = rx + (rw - (maxX - minX) * s) / 2;
    const oy = ry + (rh - (maxY - minY) * s) / 2;

    ctx.save();
    ctx.strokeStyle = p.acc;
    ctx.lineWidth = Math.max(1.5, s * 2.1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (p.dashed) ctx.setLineDash([s * 4.5, s * 3]);
    ctx.beginPath();
    pts.forEach(function (q, i) {
      const X = ox + (q.x - minX) * s;
      const Y = oy + (q.y - minY) * s;
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    function dot(q, r) {
      ctx.beginPath();
      ctx.arc(ox + (q.x - minX) * s, oy + (q.y - minY) * s, Math.max(2, s * r), 0, Math.PI * 2);
      ctx.fillStyle = p.bgSolid || "#000";
      if (themeId === "minimal") ctx.fillStyle = "#f3f1ec";
      if (themeId === "topo") ctx.fillStyle = "#101310";
      ctx.fill();
      ctx.strokeStyle = p.acc;
      ctx.lineWidth = Math.max(1.2, s * 1.8);
      ctx.stroke();
    }
    dot(pts[0], 1.9);
    dot(pts[pts.length - 1], 1.9);
    if (themeId === "topo") {
      pts.forEach(function (q, i) {
        if (i % 4 === 2 && i < pts.length - 1) dot(q, 1.5);
      });
    }
    ctx.restore();
    return s;
  }

  /* ---------- photo slot ---------- */

  function drawPhotoSlot(ctx, p, x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = p.line;
    ctx.setLineDash([w * 0.02, w * 0.014]);
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.setLineDash([]);

    const cx = x + w / 2;
    const cy = y + h / 2 - h * 0.06;
    const u = w * 0.028;
    ctx.strokeStyle = p.mut;
    ctx.lineWidth = Math.max(1.2, u * 0.32);
    ctx.strokeRect(cx - u * 3.2, cy - u * 2.5, u * 6.4, u * 5);
    ctx.beginPath();
    ctx.arc(cx - u * 1.5, cy - u * 0.8, u * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - u * 3.2, cy + u * 2.1);
    ctx.lineTo(cx - u * 0.9, cy - u * 0.3);
    ctx.lineTo(cx + u * 0.8, cy + u * 1.4);
    ctx.lineTo(cx + u * 2.2, cy);
    ctx.lineTo(cx + u * 3.2, cy + u * 0.9);
    ctx.stroke();

    setFont(ctx, 400, w * 0.021, '"IBM Plex Mono"');
    ctx.fillStyle = p.mut;
    ctx.textAlign = "center";
    const cap = "ADD PHOTO";
    const ls = w * 0.007;
    try { ctx.letterSpacing = `${ls}px`; } catch (e) {}
    ctx.fillText(cap, cx, y + h / 2 + h * 0.28);
    try { ctx.letterSpacing = "0px"; } catch (e) {}
    ctx.textAlign = "left";
    ctx.restore();
  }

  /* ---------- main ---------- */

  async function exportCanvas(state, ratioKey) {
    await ensureFonts();

    const R = D.ratios[ratioKey];
    const W = R.w, H = R.h;
    const act = D.activities.find(function (a) { return a.id === state.activityId; });
    const o = state.options;
    const p = pal(state.themeId);
    p.bgSolid =
      state.themeId === "minimal" ? "#f3f1ec" :
      state.themeId === "topo" ? "#101310" :
      state.themeId === "blueprint" ? "#07293f" :
      state.themeId === "midnight" ? "#0c1228" : "#000";

    const fit = ratioKey === "story" ? 1 : ratioKey === "portrait" ? 0.93 : 0.86;
    const pad = W * 0.08;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    paintBg(ctx, W, H, p, state.themeId);

    let y = pad;
    const innerW = W - pad * 2;

    /* photo top */
    if (state.photo === "top") {
      const ph = innerW * 0.594;
      drawPhotoSlot(ctx, p, pad, y, innerW, ph);
      y += ph + W * 0.06;
    }

    /* head */
    const title = (state.headline || "").trim() || act.name;
    const titleSize = (state.themeId === "minimal" ? W * 0.084 : state.themeId === "blueprint" ? W * 0.09 : W * 0.105) * fit;
    if (p.uiDisp) setFont(ctx, 400, titleSize, "Anton");
    else setFont(ctx, 800, titleSize, "Inter");
    ctx.fillStyle = p.fg;
    const titleLs = state.themeId === "minimal" ? -titleSize * 0.015 : titleSize * 0.045;
    const titleLines = wrapLines(ctx, title, innerW);
    const titleLH = titleSize * (state.themeId === "minimal" ? 1.06 : 1.02);
    titleLines.forEach(function (ln) {
      tracked(ctx, ln, pad, y + titleSize * 0.82, titleLs);
      y += titleLH;
    });

    const subParts = [];
    const loc = (state.location || "").trim() || act.location;
    if (loc) subParts.push(loc.toUpperCase());
    if (o.date) subParts.push(act.dateLabel);
    if (subParts.length) {
      y += W * 0.012;
      setFont(ctx, 400, W * 0.027, '"IBM Plex Mono"');
      ctx.fillStyle = state.themeId === "blueprint" ? p.acc : p.mut;
      tracked(ctx, subParts.join("  ·  "), pad, y, W * 0.0081);
      y += W * 0.045;
    }

    /* hero */
    const visibleKeys = D.statMeta.filter(function (m) { return o.stats[m.key]; }).map(function (m) { return m.key; });
    const heroKey = ["distance", "time", "pace"].find(function (k) { return visibleKeys.indexOf(k) !== -1; }) || visibleKeys[0];

    if (heroKey) {
      const meta = D.statMeta.find(function (m) { return m.key === heroKey; });
      const v = act.stats[heroKey];
      y += W * 0.055 * fit;
      const hv = W * 0.29 * fit;
      if (p.disp === "Anton") setFont(ctx, 400, hv, "Anton");
      else setFont(ctx, 275, hv, "Inter");
      ctx.fillStyle = p.fg;
      if (p.glow) {
        ctx.shadowColor = "rgba(156,192,255,0.55)";
        ctx.shadowBlur = W * 0.06;
      }
      ctx.fillText(v.value, pad, y + hv * 0.78);
      ctx.shadowBlur = 0;
      const vw = ctx.measureText(v.value).width;
      if (v.unit) {
        setFont(ctx, 500, W * 0.055 * fit, '"IBM Plex Mono"');
        ctx.fillStyle = p.acc;
        tracked(ctx, v.unit, pad + vw + W * 0.018, y + hv * 0.78, W * 0.0015);
      }
      y += hv * 0.86;

      /* cap with dimension dashes */
      setFont(ctx, 400, W * 0.025, '"IBM Plex Mono"');
      ctx.fillStyle = state.themeId === "blueprint" ? p.acc : p.mut;
      const capLs = W * 0.008;
      const capW = trackedWidth(ctx, meta.label, capLs);
      const dashW = W * 0.07;
      const capY = y + W * 0.01;
      const dashY = capY + W * 0.004;
      dashLine(ctx, pad, dashY, pad + dashW, p.line);
      tracked(ctx, meta.label, pad + dashW + W * 0.03, capY + W * 0.009, capLs);
      dashLine(ctx, pad + dashW + W * 0.03 + capW + W * 0.03, dashY, pad + dashW * 2 + W * 0.06 + capW, p.line);
      y += W * 0.045;
    }

    /* stats */
    const listKeys = visibleKeys.filter(function (k) { return k !== heroKey; });

    if (listKeys.length && state.themeId === "bw-motion") {
      y += W * 0.045;
      dashLine(ctx, pad, y, W - pad, p.line);
      y += W * 0.042;
      let x = pad;
      listKeys.forEach(function (k, i) {
        const meta = D.statMeta.find(function (m) { return m.key === k; });
        const v = act.stats[k];
        setFont(ctx, 600, W * 0.046, "Inter");
        ctx.fillStyle = p.fg;
        const vs = v.value + (v.unit ? " " + v.unit : "");
        const vw2 = ctx.measureText(vs).width;
        if (x + vw2 > W - pad && x > pad) { y += W * 0.06; x = pad; }
        ctx.fillText(vs, x, y);
        x += vw2 + W * 0.015;
        setFont(ctx, 400, W * 0.023, '"IBM Plex Mono"');
        ctx.fillStyle = p.mut;
        tracked(ctx, meta.label, x, y, W * 0.006);
        x += trackedWidth(ctx, meta.label, W * 0.006) + W * 0.045;
        if (i < listKeys.length - 1) {
          setFont(ctx, 300, W * 0.04, "Inter");
          ctx.fillStyle = p.mut;
          ctx.fillText("/", x, y);
          x += W * 0.045;
        }
      });
      y += W * 0.03;
    } else if (listKeys.length && state.themeId === "topo") {
      const gap = W * 0.05;
      const colW = (innerW - gap) / 2;
      const rowH = W * 0.105;
      const rows = Math.ceil(listKeys.length / 2);
      y += W * 0.03;
      listKeys.forEach(function (k, i) {
        const meta = D.statMeta.find(function (m) { return m.key === k; });
        const v = act.stats[k];
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx0 = pad + col * (colW + gap);
        const ry0 = y + row * rowH;
        ctx.strokeStyle = p.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx0, ry0 + 0.5);
        ctx.lineTo(cx0 + colW, ry0 + 0.5);
        ctx.stroke();
        setFont(ctx, 400, W * 0.024, '"IBM Plex Mono"');
        ctx.fillStyle = p.mut;
        tracked(ctx, meta.label, cx0, ry0 + W * 0.032, W * 0.007);
        setFont(ctx, 600, W * 0.049, "Inter");
        ctx.fillStyle = p.fg;
        ctx.fillText(v.value + (v.unit ? " " + v.unit : ""), cx0, ry0 + W * 0.085);
      });
      y += rows * rowH;
    } else if (listKeys.length) {
      const rowH = W * 0.078;
      y += W * 0.035;
      listKeys.forEach(function (k) {
        const meta = D.statMeta.find(function (m) { return m.key === k; });
        const v = act.stats[k];
        ctx.strokeStyle = p.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad, y + 0.5);
        ctx.lineTo(W - pad, y + 0.5);
        ctx.stroke();
        setFont(ctx, 400, W * 0.026, '"IBM Plex Mono"');
        ctx.fillStyle = p.mut;
        tracked(ctx, meta.label, pad, y + rowH * 0.62, W * 0.0078);
        setFont(ctx, 600, W * 0.049, "Inter");
        ctx.fillStyle = p.fg;
        const vs = v.value;
        const vsW = ctx.measureText(vs).width;
        let ux = W - pad;
        if (v.unit) {
          setFont(ctx, 600, W * 0.026, "Inter");
          ctx.fillStyle = p.mut;
          const uw = ctx.measureText(v.unit).width;
          ctx.fillText(v.unit, ux - uw, y + rowH * 0.64);
          ux -= uw + W * 0.012;
        }
        ctx.fillStyle = p.fg;
        setFont(ctx, 600, W * 0.049, "Inter");
        ctx.fillText(vs, ux - vsW, y + rowH * 0.64);
        y += rowH;
      });
    }

    /* route + bottom photo share the space above the footer */
    const footH = W * 0.115;
    let routeBottom = H - pad - footH - W * 0.03;
    if (state.photo === "bottom") {
      const ph = innerW * 0.45;
      drawPhotoSlot(ctx, p, pad, routeBottom - ph, innerW, ph);
      routeBottom -= ph + W * 0.035;
    }
    const routeTop = y + W * 0.02;
    if (o.route && routeBottom - routeTop > W * 0.1) {
      const pts = A.routePoints("stride-" + act.id);
      drawRoute(ctx, p, state.themeId, pts, pad, routeTop, innerW, routeBottom - routeTop);
    }

    /* footer */
    const fy = H - pad;
    dashLine(ctx, pad, fy - W * 0.085, W - pad, p.line);
    setFont(ctx, 500, W * 0.027, '"IBM Plex Mono"');
    ctx.fillStyle = p.fg;
    const mLs = W * 0.0086;
    const mw = W * 0.044;
    ctx.strokeStyle = p.acc;
    ctx.lineWidth = Math.max(1.5, W * 0.007);
    ctx.beginPath();
    ctx.moveTo(pad, fy - W * 0.052);
    ctx.lineTo(pad + mw * 0.42, fy - W * 0.083);
    ctx.moveTo(pad + mw * 0.58, fy - W * 0.052);
    ctx.lineTo(pad + mw, fy - W * 0.083);
    ctx.stroke();
    tracked(ctx, "MILEMOTION", pad + mw + W * 0.022, fy - W * 0.048, mLs);
    setFont(ctx, 400, W * 0.022, '"IBM Plex Mono"');
    ctx.fillStyle = p.mut;
    const tag = "YOUR RUN. YOUR STORY.";
    const tagLs = W * 0.0057;
    tracked(ctx, tag, W - pad - trackedWidth(ctx, tag, tagLs), fy - W * 0.05, tagLs);

    return canvas;
  }

  /* ---------- save / share ---------- */

  function fileName(state, ratioKey) {
    const act = D.activities.find(function (a) { return a.id === state.activityId; });
    const km = act.stats.distance.value.replace(".", "");
    return `milemotion-${state.themeId}-${km}km-${ratioKey}.png`;
  }

  async function toBlob(state, ratioKey) {
    const canvas = await exportCanvas(state, ratioKey);
    return new Promise(function (resolve) {
      canvas.toBlob(resolve, "image/png");
    });
  }

  window.STRIDE.exporter = {
    exportCanvas: exportCanvas,
    toBlob: toBlob,
    fileName: fileName
  };
})();
