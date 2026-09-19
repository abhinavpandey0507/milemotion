/*
 * =====================================================================
 *  exporter.js — draws the poster as a REAL high-resolution PNG
 * =====================================================================
 *
 *  WHY THIS FILE EXISTS
 *  --------------------
 *  The poster you see on screen is HTML/CSS (see artwork.js). That is
 *  easy to read, but HTML can't easily be "downloaded" as a crisp
 *  image file. So when the user presses GENERATE, this file re-draws
 *  the exact same poster onto a <canvas> at full 1080x1920 (etc.)
 *  resolution, then converts the canvas to a PNG that can be saved.
 *
 *  It intentionally mirrors artwork.js so the export always matches
 *  the preview. THEME palettes live in `PALETTES` below.
 * =====================================================================
 */

/* Private scope — see the note at the top of artwork.js. */
(function () {
"use strict";

const { STRIDE: D } = window;
const A = window.STRIDE.art;

/* Palette = the colors/fonts for each theme. */
const PALETTES = {
  "bw-motion":   { bg: "#000",     fg: "#fafafa", mut: "rgba(250,250,250,.5)",   line: "rgba(250,250,250,.22)",  acc: "#fafafa", disp: "Anton" },
  "midnight":    { bg: "#101730",  fg: "#edf2ff", mut: "rgba(237,242,255,.52)",  line: "rgba(237,242,255,.16)",  acc: "#9cc0ff", disp: "Anton" },
  "blueprint":   { bg: "#07293f",  fg: "#d9ebf7", mut: "rgba(217,235,247,.55)",  line: "rgba(143,208,255,.3)",   acc: "#8fd0ff", disp: "Anton" },
  "minimal":     { bg: "#f3f1ec",  fg: "#171512", mut: "rgba(23,21,18,.46)",     line: "rgba(23,21,18,.16)",     acc: "#171512", disp: "Inter" },
  "topo":        { bg: "#101310",  fg: "#e9eee2", mut: "rgba(233,238,226,.5)",   line: "rgba(233,238,226,.16)",  acc: "#b7c9a6", disp: "Anton" }
};

/* ----------------------- tiny helpers ----------------------- */

/* Draw text with letter-spacing (canvas has no built-in tracking). */
function tracked(ctx, txt, x, y, ls) {
  ctx.letterSpacing = ls + "px";
  ctx.fillText(txt, x, y);
  ctx.letterSpacing = "0px";
}
function line(ctx, x1, y1, x2, y2, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x1, y1 + .5); ctx.lineTo(x2, y2 + .5); ctx.stroke();
}
function setFont(ctx, weight, size, family) { ctx.font = `${weight} ${size}px ${family}`; }

/* Wait for the Google fonts to load so exported text looks right. */
async function waitFonts() {
  try {
    await Promise.all([
      document.fonts.load('400 100px Anton'),
      document.fonts.load("800 100px Inter"),
      document.fonts.load("600 100px Inter"),
      document.fonts.load('400 50px "IBM Plex Mono"')
    ]);
    await document.fonts.ready;
  } catch (e) { /* if fonts fail, canvas falls back to built-in fonts */ }
}

/* ----------------------- the main renderer ----------------------- */

async function exportCanvas(state, ratioKey) {
  await waitFonts();

  const R = D.RATIOS[ratioKey];
  const W = R.w, H = R.h;
  const pad = W * 0.08;                 // margin around the edges
  const innerW = W - pad * 2;
  const act = D.activities.find(a => a.id === state.activityId);
  const p = PALETTES[state.themeId];
  const opt = state.options;

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  /* 1) BACKGROUND + small decorations per theme */
  if (state.themeId === "midnight") {           // subtle blue gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#090e22"); g.addColorStop(1, "#16224a");
    ctx.fillStyle = g;
  } else ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);

  let y = pad;

  /* optional photo placeholder at the top */
  if (state.photo === "top") { y = drawPhoto(ctx, p, pad, y, innerW, innerW * 0.55) + W * 0.06; }

  /* 2) TITLE + subtitle */
  const title = state.headline || act.name;
  setFont(ctx, p.disp === "Anton" ? 400 : 800, W * 0.1, p.disp);
  ctx.fillStyle = p.fg;
  ctx.fillText(title, pad, y + W * 0.075);
  y += W * 0.1 + (p.disp === "Anton" ? W * 0.02 : 0);

  const sub = [state.location || act.place, ...(opt.date ? [act.date] : [])].join("  ·  ");
  setFont(ctx, 400, W * 0.026, '"IBM Plex Mono"');
  ctx.fillStyle = p.mut;
  tracked(ctx, sub, pad, y + W * 0.02, W * 0.008);
  y += W * 0.06;

  /* 3) HERO stat (the big number) */
  const visible = D.STAT_META.filter(m => opt.stats[m.key]);
  const heroKey = ["distance", "time", "pace"].find(k => opt.stats[k]) || visible[0]?.key;
  const hero = act.stats[heroKey];
  if (hero) {
    y += W * 0.08;
    setFont(ctx, 400, W * 0.29, p.disp === "Anton" ? "Anton" : "Inter");
    ctx.fillStyle = p.fg;
    ctx.fillText(hero.value, pad, y + W * 0.22);
    if (hero.unit) { setFont(ctx, 400, W * 0.05, '"IBM Plex Mono"'); ctx.fillStyle = p.acc; ctx.fillText(hero.unit, pad + W * 0.34, y + W * 0.22); }
    y += W * 0.3;
  }

  /* 4) Remaining stats as labelled rows */
  const rows = visible.filter(m => m.key !== heroKey);
  rows.forEach(m => {
    y += W * 0.07;
    line(ctx, pad, y, W - pad, p.line);
    const v = act.stats[m.key];
    setFont(ctx, 400, W * 0.026, '"IBM Plex Mono"'); ctx.fillStyle = p.mut;
    tracked(ctx, m.label, pad, y + W * 0.035, W * 0.008);
    setFont(ctx, 600, W * 0.045, "Inter"); ctx.fillStyle = p.fg;
    tracked(ctx, v.value + (v.unit ? " " + v.unit : ""), W - pad, y + W * 0.045, 0);
  });
  ctx.textAlign = "left";

  /* 5) route line fills whatever space is left before the footer */
  const routeH = H - pad - W * 0.12 - y;            // space between stats and footer
  if (opt.route && routeH > W * 0.1) {
    const pts = A.routePoints("run-" + act.id);
    const d = A.toPath(pts);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
                `<path d="${d}" fill="none" stroke="#${p.acc.slice(1)}" stroke-width="2" stroke-linecap="round"/>` + // route
                `<circle cx="${pts[0].x}" cy="${pts[0].y}" r="1.9" fill="#${p.bg.slice(1)}" stroke="#${p.acc.slice(1)}" stroke-width="2"/>` +
                `<circle cx="${pts[pts.length - 1].x}" cy="${pts[pts.length - 1].y}" r="1.9" fill="#${p.bg.slice(1)}" stroke="#${p.acc.slice(1)}" stroke-width="2"/>` +
                `</svg>`;
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await new Promise(res => img.onload = res);      // wait for the image to decode
    ctx.drawImage(img, pad, y + W * 0.02, innerW, routeH - W * 0.02);
    y += routeH - W * 0.02;
  }

  /* 6) optional photo placeholder at the bottom */
  if (state.photo === "bottom") y = drawPhoto(ctx, p, pad, y, innerW, innerW * 0.4) + W * 0.03;

  /* 7) footer line + brand */
  line(ctx, pad, H - pad, W - pad, H - pad, p.line);
  setFont(ctx, 400, W * 0.026, '"IBM Plex Mono"'); ctx.fillStyle = p.fg;
  tracked(ctx, "MILEMOTION", pad, H - pad + W * 0.035, W * 0.009);
  ctx.fillStyle = p.mut;
  tracked(ctx, "YOUR RUN. YOUR STORY.", W - pad, H - pad + W * 0.035, W * 0.006);

  return canvas;
}

/* Draw a dashed "add photo" placeholder box; returns the new y position. */
function drawPhoto(ctx, p, x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = p.line;
  ctx.setLineDash([w * 0.02, w * 0.014]);
  ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  ctx.setLineDash([]);
  ctx.fillStyle = p.mut;
  ctx.textAlign = "center";
  setFont(ctx, 400, w * 0.022, '"IBM Plex Mono"');
  tracked(ctx, "ADD PHOTO", x + w / 2, y + h / 2, w * 0.007);
  ctx.restore();
  return y + h;
}

/* ----------------------- public helpers ----------------------- */

function fileName(state, ratioKey) {
  const a = D.activities.find(a => a.id === state.activityId);
  return `milemotion-${state.themeId}-${a.stats.distance.value.replace(".", "")}km-${ratioKey}.png`;
}

/* ----------------------- conversion: canvas -> PNG blob ----------------------- */
async function toBlob(state, ratioKey) {
  const canvas = await exportCanvas(state, ratioKey);
  return new Promise(res => canvas.toBlob(res, "image/png"));
}

window.STRIDE.exporter = { exportCanvas, toBlob, fileName };
})();
