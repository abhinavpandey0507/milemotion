/*
 * =====================================================================
 *  artwork.js — builds the running-poster as ordinary HTML
 * =====================================================================
 *
 *  THE CORE IDEA
 *  -------------
 *  We draw the poster with HTML + CSS (not canvas) so it is easy to
 *  read and to style. The same markup is used in 3 places:
 *
 *     1. the little theme preview cards
 *     2. the big editor preview
 *     3. the export preview
 *
 *  `mount(container, state)` takes a <div> and fills it with the poster.
 *  The `state` object passed in decides WHAT goes on the poster
 *  (which activity, which theme, which stats are switched on, etc).
 *
 *  The theme's "look" (colors, background, decorations) lives in the
 *  CSS classes `.th-bw`, `.th-midnight`, ... — see app.css.
 *
 *  `exportCanvas` in exporter.js re-draws the SAME layout onto a real
 *  1080px canvas when you press GENERATE. Don't worry about that now.
 * =====================================================================
 */

/* Wrap everything in a function so our variables stay private and do
   not clash with the other files that also use names like `D`. */
(function () {
"use strict";

const { STRIDE: D } = window;

/* ---------------------------------------------------------------------
 * Maths helpers
 * -------------
 *  - mulberry32 : a tiny "random" number generator that always returns
 *                 the same numbers for the same seed. This keeps the
 *                 squiggly route line identical every visit instead of
 *                 changing on every page load.
 *  - routePoints / toPath : build a smooth running-route line.
 * ------------------------------------------------------------------- */
const mulberry32 = seed => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const hashSeed = str => {
  let h = 2166136261;
  for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

function routePoints(seedStr, n = 13) {
  const rnd = mulberry32(hashSeed(seedStr));
  const pts = [];
  let y = 30;
  for (let i = 0; i < n; i++) {
    const x = 5 + (90 * i) / (n - 1);
    y += (rnd() - 0.5) * 24;                 // drift up/down a bit
    pts.push({ x, y: Math.max(12, Math.min(86, y)) });
  }
  return pts;
}

function toPath(pts) {
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], mx = (a.x + b.x) / 2;
    d += ` Q${a.x.toFixed(1)} ${a.y.toFixed(1)}, ${mx.toFixed(1)} ${b.y.toFixed(1)}`; // smooth corners
  }
  return d;
}

/* ---------------------------------------------------------------------
 * Small building blocks for the poster HTML
 * ------------------------------------------------------------------ */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const markSvg = '<svg class="mark" viewBox="0 0 32 32"><path d="M7 25 L17 7"/><path d="M15 25 L25 7"/></svg>';
const photoSvg = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14"/><circle cx="9" cy="10.5" r="1.6"/><path d="M3 17l5.5-5L14 17l3.5-3.5L21 17"/></svg>';

/* Each theme can add a small "decoration" (stars, grid, layout lines). */
function decoration(themeId, seedStr) {
  const rnd = mulberry32(hashSeed(seedStr));
  const stars = () => Array.from({ length: 26 }, () =>
    `<circle cx="${(rnd() * 100).toFixed(1)}" cy="${(rnd() * 100).toFixed(1)}" r="${(0.2 + rnd() * 0.3).toFixed(2)}" opacity="${(0.2 + rnd() * 0.6).toFixed(2)}"/>`).join("");

  if (themeId === "midnight")  return `<div class="art-decor"><svg class="art-stars" viewBox="0 0 100 100" preserveAspectRatio="none">${stars()}</svg></div>`;
  if (themeId === "bw-motion") return '<div class="art-decor"><span class="slash"></span><span class="slash s2"></span></div>';
  if (themeId === "blueprint") return '<div class="art-decor"><div class="frame"></div><span class="coords">30.27° N&nbsp;&nbsp;77.08° E</span></div>';
  return ""; // minimal + topo get their looks purely from CSS
}

function photoFrame(bottom) {
  return `<figure class="art-photo${bottom ? " is-bottom" : ""}">${photoSvg}<figcaption>ADD PHOTO</figcaption></figure>`;
}

/* ---------------------------------------------------------------------
 * THE MAIN FUNCTION — turns `state` into poster HTML string
 * ------------------------------------------------------------------ */
function markup(state) {
  const act = D.activities.find(a => a.id === state.activityId);
  const cls = D.themes[state.themeId].cls;
  const opt = state.options;

  const title = (state.headline || act.name);
  const sub   = [state.location || act.place, ...(opt.date ? [act.date] : [])].join("  ·  ");

  // Pick which stat becomes the big headline number: distance > time > pace > first on
  const visible = D.STAT_META.filter(m => opt.stats[m.key]);
  const heroKey = ["distance", "time", "pace"].find(k => opt.stats[k]) || visible[0]?.key;
  const hero = act.stats[heroKey];

  let html = `<div class="art ${cls}">`;
  html += decoration(state.themeId, act.id);

  if (state.photo === "top") html += photoFrame(false);

  html += `<header class="art-head"><h2 class="art-title">${esc(title)}</h2><p class="art-sub">${esc(sub)}</p></header>`;

  if (hero) html +=
    `<div class="art-hero"><span class="art-hero-value">${esc(hero.value)}</span><span class="art-hero-unit">${esc(hero.unit)}</span></div>`;

  const rows = visible.filter(m => m.key !== heroKey);
  if (rows.length) html += `<ul class="art-stats">` +
    rows.map(m => `<li><span class="k">${esc(m.label)}</span><span class="v">${esc(act.stats[m.key].value)}<span class="u">${esc(act.stats[m.key].unit)}</span></span></li>`).join("") +
    `</ul>`;

  if (opt.route) {
    const pts = routePoints("run-" + act.id);
    html += `<svg class="art-route" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><path d="${toPath(pts)}"/><circle class="rt-start" cx="${pts[0].x}" cy="${pts[0].y}" r="1.9"/><circle class="rt-end" cx="${pts[pts.length - 1].x}" cy="${pts[pts.length - 1].y}" r="1.9"/></svg>`;
  }

  if (state.photo === "bottom") html += photoFrame(true);

  html += `<footer class="art-foot"><span class="art-brand">${markSvg}MILEMOTION</span><span class="art-tag">YOUR RUN. YOUR STORY.</span></footer></div>`;

  return html;
}

/* Fill a <div> with the poster. This is what the app calls. */
function mount(el, state) {
  el.innerHTML = markup(state);
}

window.STRIDE.art = { mount, markup, routePoints, toPath, mulberry32, hashSeed };
})();
