/* ============================================================
   STRIDE · artwork.js — reusable artwork renderer.
   One component renders every preview: theme cards, editor,
   export stage. Skins come from CSS theme classes.
   ============================================================ */

(function () {
  "use strict";

  const D = window.STRIDE;

  /* ---------- seeded rng ---------- */

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seedFrom(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* ---------- geometry ---------- */

  function routePoints(seedStr, n) {
    n = n || 13;
    const rnd = mulberry32(seedFrom(seedStr));
    const pts = [];
    let y = 22 + rnd() * 30;
    let vy = 0;
    for (let i = 0; i < n; i++) {
      const x = 5 + (90 * i) / (n - 1) + (rnd() - 0.5) * 5;
      vy += (rnd() - 0.5) * 16;
      vy *= 0.72;
      y += vy;
      if (y < 10) { y = 10 + rnd() * 6; vy = Math.abs(vy); }
      if (y > 88) { y = 88 - rnd() * 6; vy = -Math.abs(vy); }
      pts.push({ x: x, y: y });
    }
    return pts;
  }

  function catmullPath(pts, closed) {
    const n = pts.length;
    function pt(i) {
      if (closed) return pts[(i + n) % n];
      return pts[Math.max(0, Math.min(n - 1, i))];
    }
    function f(v) { return v.toFixed(1); }
    let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = pt(i - 1), p1 = pt(i), p2 = pt(i + 1), p3 = pt(i + 2);
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(p2.x)} ${f(p2.y)}`;
    }
    if (closed) d += " Z";
    return d;
  }

  function routeD(activityId) {
    return catmullPath(routePoints("stride-" + activityId), false);
  }

  function blobPath(rnd, cx, cy, r, wobble) {
    const k = 9;
    const pts = [];
    for (let i = 0; i < k; i++) {
      const ang = (Math.PI * 2 * i) / k + rnd() * 0.25;
      const rr = r * (1 - wobble / 2 + rnd() * wobble);
      pts.push({ x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr * 0.82 });
    }
    return catmullPath(pts, true);
  }

  /* ---------- esc ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- decorations per theme ---------- */

  const MARK_SVG =
    '<svg class="mark" viewBox="0 0 32 32" aria-hidden="true">' +
    '<path d="M7 25 L17 7"/><path d="M15 25 L25 7"/></svg>';

  const PHOTO_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<rect x="3" y="5" width="18" height="14"/>' +
    '<circle cx="9" cy="10.5" r="1.6"/>' +
    '<path d="M3 17l5.5-5L14 17l3.5-3.5L21 17"/></svg>';

  function decorFor(themeKey, activityId) {
    if (themeKey === "bw-motion") {
      return (
        '<div class="art-decor">' +
        '<div class="speedlines"></div>' +
        '<span class="slash s1"></span>' +
        '<span class="slash s2"></span>' +
        "</div>"
      );
    }
    if (themeKey === "midnight") {
      const rnd = mulberry32(seedFrom("stars-" + activityId));
      let dots = "";
      for (let i = 0; i < 26; i++) {
        const twinkle = i % 5 === 0;
        dots +=
          `<circle cx="${(rnd() * 100).toFixed(1)}" cy="${(rnd() * 100).toFixed(1)}" ` +
          `r="${(0.18 + rnd() * 0.34).toFixed(2)}" ` +
          `opacity="${(0.2 + rnd() * 0.65).toFixed(2)}"` +
          (twinkle ? ` class="tw" style="animation-delay:${(rnd() * 3).toFixed(1)}s"` : "") +
          "/>";
      }
      return `<div class="art-decor"><svg class="art-stars" viewBox="0 0 100 100" preserveAspectRatio="none">${dots}</svg></div>`;
    }
    if (themeKey === "blueprint") {
      return (
        '<div class="art-decor">' +
        '<div class="frame"></div>' +
        '<span class="coords">47.21° N&nbsp;&nbsp;08.54° E</span>' +
        "</div>"
      );
    }
    if (themeKey === "topo") {
      const rnd = mulberry32(seedFrom("topo-" + activityId));
      const cx = 74, cy = 26, r = 34;
      let paths = "";
      [1, 0.76, 0.54, 0.34].forEach(function (s, i) {
        paths += `<path d="${blobPath(rnd, cx, cy, r * s, 0.42)}"/>`;
      });
      paths += '<text class="idx" x="70" y="27">112</text>';
      return `<div class="art-decor"><svg class="art-contours" viewBox="0 0 100 100" preserveAspectRatio="none">${paths}</svg></div>`;
    }
    return "";
  }

  /* ---------- main renderer ---------- */

  function artworkMarkup(state) {
    const act = D.activities.find(function (a) { return a.id === state.activityId; });
    const th = D.themes[state.themeId];
    const o = state.options;

    const title = (state.headline || "").trim() || act.name;
    const subParts = [];
    if ((state.location || "").trim()) subParts.push(state.location.trim().toUpperCase());
    else if (act.location) subParts.push(act.location);
    if (o.date) subParts.push(act.dateLabel);

    // hero metric: distance > time > pace > first visible
    const visibleKeys = D.statMeta.filter(function (m) { return o.stats[m.key]; }).map(function (m) { return m.key; });
    const heroKey = ["distance", "time", "pace"].find(function (k) { return visibleKeys.indexOf(k) !== -1; }) || visibleKeys[0];

    let html = `<div class="art ${th.cls}" role="img" aria-label="Running poster">`;
    html += decorFor(state.themeId, act.id);

    if (state.photo && state.photo !== "none" && state.photo !== "bottom") {
      html += photoSlot(false);
    }

    html += `<header class="art-head"><h2 class="art-title">${esc(title)}</h2>`;
    if (subParts.length) html += `<p class="art-sub">${esc(subParts.join("  ·  "))}</p>`;
    html += "</header>";

    if (heroKey) {
      const meta = D.statMeta.find(function (m) { return m.key === heroKey; });
      const v = act.stats[heroKey];
      html +=
        '<div class="art-hero">' +
        '<div class="art-hero-row">' +
        `<span class="art-hero-value">${esc(v.value)}</span>` +
        (v.unit ? `<span class="art-hero-unit">${esc(v.unit)}</span>` : "") +
        "</div>" +
        `<span class="art-hero-cap">${esc(meta.label)}</span>` +
        "</div>";
    }

    const listKeys = visibleKeys.filter(function (k) { return k !== heroKey; });
    if (listKeys.length) {
      html += '<ul class="art-stats">';
      listKeys.forEach(function (k) {
        const meta = D.statMeta.find(function (m) { return m.key === k; });
        const v = act.stats[k];
        html +=
          "<li>" +
          `<span class="k">${esc(meta.label)}</span>` +
          `<span class="v">${esc(v.value)}${v.unit ? `<span class="u">${esc(v.unit)}</span>` : ""}</span>` +
          "</li>";
      });
      html += "</ul>";
    }

    if (state.options.route) {
      const pts = routePoints("stride-" + act.id);
      const d = catmullPath(pts, false);
      const first = pts[0], last = pts[pts.length - 1];
      let extras = "";
      if (state.themeId === "topo") {
        pts.forEach(function (p, i) {
          if (i % 4 === 2 && i < pts.length - 1) {
            extras += `<circle class="wp" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.5"/>`;
          }
        });
      }
      html +=
        '<svg class="art-route" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
        `<path d="${d}"/>` +
        extras +
        `<circle class="rt-start" cx="${first.x.toFixed(1)}" cy="${first.y.toFixed(1)}" r="1.9"/>` +
        `<circle class="rt-end" cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="1.9"/>` +
        "</svg>";
    } else {
      html += '<div class="art-route" style="min-height:2cqw"></div>';
    }

    if (state.photo === "bottom") {
      html += photoSlot(true);
    }

    html +=
      '<footer class="art-foot">' +
      `<span class="art-brand">${MARK_SVG}MILEMOTION</span>` +
      '<span class="art-tag">YOUR RUN. YOUR STORY.</span>' +
      "</footer>";

    html += "</div>";
    return html;
  }

  function photoSlot(bottom) {
    return `<figure class="art-photo${bottom ? " is-bottom" : ""}">${PHOTO_ICON}<figcaption>ADD PHOTO</figcaption></figure>`;
  }

  function mountArtwork(el, state) {
    el.innerHTML = artworkMarkup(state);
  }

  /* ---------- export ---------- */

  window.STRIDE.art = {
    markup: artworkMarkup,
    mount: mountArtwork,
    routeD: routeD,
    routePoints: routePoints,
    catmullPath: catmullPath,
    blobPath: blobPath,
    mulberry32: mulberry32,
    seedFrom: seedFrom,
    MARK_SVG: MARK_SVG
  };
})();
