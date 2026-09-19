/*
 * =====================================================================
 *  app.js — connects the buttons to the artwork
 * =====================================================================
 *
 *  HOW THE APP WORKS
 *  -----------------
 *  1. You pick a run  ->  `state.activityId` changes
 *  2. You pick a theme->  `state.themeId` changes
 *  3. The editor panel toggles stats/photo/text -> `state.options` changes
 *  4. After EVERY change we call `render()` which redraws the poster.
 *
 *  `state` is the single source of truth — it holds everything about
 *  the poster the user is building. Most of this file is just wiring
 *  up the HTML buttons to update `state` and re-render.
 * =====================================================================
 */

/* Private scope — see the note at the top of artwork.js. */
(function () {
"use strict";

const { STRIDE: D } = window;
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ---------------------------------------------------------------------
 * 1. APP STATE (the "memory" of the poster being edited)
 * ------------------------------------------------------------------- */
let state = {
  activityId: "a1",
  themeId:    "bw-motion",
  ratio:      "story",
  photo:      "none",
  headline:   "",                       // custom title (empty = use run name)
  location:   "",                       // custom place   (empty = use run place)
  options: {                            // stat switches, first 3 on
    stats: { distance: true, time: true, pace: true, elevation: false, calories: false, hr: false },
    route: true,
    date: true
  }
};

const act = () => D.activities.find(a => a.id === state.activityId);

/* ---------------------------------------------------------------------
 * 2. REDRAW — always refreshes every poster on screen.
 * ------------------------------------------------------------------- */
const stages = { editor: $("#editorStage"), export: $("#exportStage") };
function render() {
  D.art.mount(stages.editor, state);
  D.art.mount(stages.export, state);
}

/* ---------------------------------------------------------------------
 * 3. SCREEN SWITCHING (Home -> Activities -> Theme -> Editor -> Export)
 *    Only the matching .screen gets the .active class; CSS animates it.
 * ------------------------------------------------------------------- */
const ORDER = ["home", "activities", "themes", "editor", "export"];
let current = "home";

function show(name) {
  if (name === current) return;
  $("#screens").dataset.dir = ORDER.indexOf(name) > ORDER.indexOf(current) ? "fwd" : "back";
  $("#screen-" + current).classList.remove("active");
  $("#screen-" + name).classList.add("active");
  current = name;
  closeSheet();
  fitStages();
  if (name === "themes") syncTheme();
}

// Every back arrow knows to go to the previous screen
$$("[data-back]").forEach(btn => btn.onclick = () => show(ORDER[ORDER.indexOf(current) - 1]));

$("#btnConnect").onclick = () => { toast("STRAVA CONNECT — MOCKED IN DEMO"); show("activities"); };
$("#btnDemo").onclick     = () => show("activities");
$("#btnToEditor").onclick = () => show("editor");
$("#btnEditorExport").onclick = () => show("export");

/* ---------------------------------------------------------------------
 * 4. ACTIVITY LIST — render the 6 runs as buttons.
 * ------------------------------------------------------------------- */
(function buildActivityList() {
  const ul = $("#actList");
  ul.innerHTML = D.activities.map((a, i) =>
    `<li><button class="act-row" data-id="${a.id}">
       <span class="act-idx">${String(i + 1).padStart(2, "0")}</span>
       <span><span class="act-name">${a.name}</span>
         <span class="act-meta">${a.stats.distance.value} KM · ${a.stats.time.value} · ${a.stats.pace.value}/KM</span></span>
       <span class="act-date">${a.place}</span>
     </button></li>`).join("");

  ul.onclick = e => {
    const b = e.target.closest("[data-id]");
    if (!b) return;
    state.activityId = b.dataset.id;
    $("#themeActName").textContent = act().name;
    buildThemeRail();          // preview cards show the new route
    render();
    show("themes");
  };
  $("#actCount").textContent = String(D.activities.length).padStart(2, "0");
})();

/* ---------------------------------------------------------------------
 * 5. THEME RAIL — little poster previews for each style.
 *    Also reused (smaller) inside the Style panel.
 * ------------------------------------------------------------------- */
function buildThemeRail() {
  const rail = $("#themeRail");
  rail.innerHTML = D.THEME_ORDER.map(k =>
    `<button class="theme-card" data-theme="${k}"><div class="theme-frame stage" data-mini="${k}"></div><span class="theme-label">${D.themes[k].label}</span></button>`).join("");
  D.THEME_ORDER.forEach(k => D.art.mount(rail.querySelector(`[data-mini="${k}"]`), { ...state, themeId: k }));
  rail.onclick = e => { const c = e.target.closest("[data-theme]"); if (c) { state.themeId = c.dataset.theme; syncTheme(); render(); } };
  syncTheme();
}

function syncTheme() {
  $$("[data-theme]").forEach(c => c.classList.toggle("is-active", c.dataset.theme === state.themeId));
}

/* ---------------------------------------------------------------------
 * 6. EDITOR STAGE SIZING — keeps the poster exactly the export shape.
 * ------------------------------------------------------------------- */
function fit(el, box) {
  const s = getComputedStyle(box);
  const w = box.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
  const h = box.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom);
  if (w <= 0 || h <= 0) return;
  const r = D.RATIOS[state.ratio].css;
  let H = h, W = H * r;
  if (W > w) { W = w; H = W / r; }
  el.style.cssText = `width:${W}px;height:${H}px`;
}
function fitStages() { fit(stages.editor, $("#editorStageBox")); fit(stages.export, $("#exportStageBox")); }
new ResizeObserver(fitStages).observe($("#editorStageBox"));
new ResizeObserver(fitStages).observe($("#exportStageBox"));

/* ---------------------------------------------------------------------
 * 7. EDITOR BOTTOM SHEET — slides up to reveal each tool's options.
 * ------------------------------------------------------------------- */
const sheet = $("#sheetBody");
let openTool = null;

function openSheet(name) {
  openTool = name;
  sheet.innerHTML = `<div class="panel">` + PANELS[name]() + `</div>`;
  wire(sheet, name);
  $("#sheetWrap").hidden = false;
  requestAnimationFrame(() => $("#sheetWrap").classList.add("open")); // 1 frame wait so CSS can animate
  $$(".tool").forEach(t => t.classList.toggle("is-active", t.dataset.tool === name));
}
function closeSheet() {
  if ($("#sheetWrap").hidden) return;
  $("#sheetWrap").classList.remove("open");
  openTool = null;
  setTimeout(() => { $("#sheetWrap").hidden = true; sheet.innerHTML = ""; }, 340); // wait for slide-down
  $$(".tool").forEach(t => t.classList.remove("is-active"));
}
$("#toolbar").onclick = e => { const b = e.target.closest(".tool"); if (!b) return; b.dataset.tool === openTool ? closeSheet() : openSheet(b.dataset.tool); };
$("#sheetScrim").onclick = closeSheet;
document.onkeydown = e => { if (e.key === "Escape") { closeSheet(); hideGen(); } };

/* The four panels (each returns HTML; wire() attaches their handlers). */
const toggle = (key, label, on) =>
  `<div class="opt-row"><span class="opt-label">${label}</span><button class="switch${on ? " is-on" : ""}" data-toggle="${key}" role="switch" aria-checked="${on}"></button></div>`;

const PANELS = {
  stats: () => D.STAT_META.map(m => toggle(m.key, m.label, state.options.stats[m.key])).join("") +
          toggle("route", "ROUTE LINE", state.options.route) + toggle("date", "DATE", state.options.date),

  photo: () => '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding-top:14px">' +
    ["none", "top", "bottom"].map(v =>
      `<button class="seg-btn${state.photo === v ? " is-active" : ""}" data-photo="${v}">${v.toUpperCase()}</button>`).join("") +
    "</div>",

  text: () =>
    `<label class="field"><span>HEADLINE</span><input data-field="headline" value="${state.headline}" placeholder="${act().name}"></label>` +
    `<label class="field"><span>LOCATION</span><input data-field="location" value="${state.location}" placeholder="${act().place}"></label>`,

  style: () => D.THEME_ORDER.map(k =>
      `<button class="style-card" data-theme="${k}"><div class="style-frame stage" data-mini2="${k}"></div><span class="style-name">${D.themes[k].label}</span></button>`).join("")
};

function wire(el, name) {
  if (name === "stats")   el.onclick = e => { const b = e.target.closest("[data-toggle]"); if (!b) return; const k = b.dataset.toggle; const v = k === "route" ? state.options.route = !state.options.route : k === "date" ? state.options.date = !state.options.date : state.options.stats[k] = !state.options.stats[k]; b.classList.toggle("is-on", v); render(); };
  if (name === "photo")   el.onclick = e => { const b = e.target.closest("[data-photo]"); if (!b) return; state.photo = b.dataset.photo; $$(".seg-btn").forEach(x => x.classList.toggle("is-active", x.dataset.photo === state.photo)); render(); };
  if (name === "text")    el.oninput  = e => { const b = e.target.closest("[data-field]"); if (!b) return; state[b.dataset.field] = b.value; render(); };
  if (name === "style") { // mount small previews, then handle clicks
    D.THEME_ORDER.forEach(k => D.art.mount(el.querySelector(`[data-mini2="${k}"]`), { ...state, themeId: k }));
    el.onclick = e => { const c = e.target.closest("[data-theme]"); if (!c || !c.dataset.theme) return; state.themeId = c.dataset.theme; syncTheme(); render(); };
  }
}

/* ---------------------------------------------------------------------
 * 8. EXPORT — choose ratio, then GENERATE draws a real PNG.
 * ------------------------------------------------------------------- */
$("#ratioSeg").onclick = e => { const b = e.target.closest("[data-ratio]"); if (!b) return; state.ratio = b.dataset.ratio; $$(".ratio").forEach(r => r.classList.toggle("is-active", r.dataset.ratio === state.ratio)); fitStages(); };

/* ---------------------------------------------------------------------
 * 9. GENERATE OVERLAY — fake "rendering" progress, then real PNG screen.
 * ------------------------------------------------------------------- */
let lastBlob = null;
function showGen() {
  $("#genlay").hidden = false;
  $(".gen-progress").hidden = false;
  $(".gen-done").hidden = true;
  $("#genBar").style.width = "0%";
  // Animate a progress bar for feel, then actually render the PNG.
  let p = 0;
  const tick = setInterval(() => { p = Math.min(100, p + 18); $("#genBar").style.width = p + "%"; if (p >= 100) { clearInterval(tick); finishGen(); } }, 150);
}
async function finishGen() {
  try { lastBlob = await D.exporter.toBlob(state, state.ratio); } catch (e) { lastBlob = null; }
  setTimeout(() => {
    $(".gen-progress").hidden = true;
    $(".gen-done").hidden = false;
    D.art.mount($("#genStage"), state);
    $("#genFile").textContent = D.exporter.fileName(state, state.ratio);
  }, 220);
}
function hideGen() { $("#genlay").hidden = true; }
$("#btnGenerate").onclick = showGen;
$("#btnGenClose").onclick = hideGen;
$("#genlay").onclick = e => { if (e.target.id === "genlay") hideGen(); };

/* SAVE — on Android send bytes to the native bridge; on web trigger download */
$("#btnSaveImg").onclick = async () => {
  const blob = lastBlob || await D.exporter.toBlob(state, state.ratio);
  const name = D.exporter.fileName(state, state.ratio);
  if (!blob) return toast("RENDER FAILED");
  if (window.MileMotion?.saveImage) {                       // Android WebView
    const b64 = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); });
    window.MileMotion.saveImage(b64, name);
  } else {                                                  // normal browser
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
    a.click();
  }
  toast("IMAGE SAVED");
};

/* SHARE — uses the browser's native share sheet if available */
$("#btnShare").onclick = async () => {
  const blob = lastBlob || await D.exporter.toBlob(state, state.ratio);
  if (!blob) return toast("RENDER FAILED");
  const file = new File([blob], D.exporter.fileName(state, state.ratio), { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "MileMotion", text: "Your run. Your story." }); toast("SHARED"); }
  else toast("SHARE SHEET — MOCKED IN DEMO");
};

/* ---------------------------------------------------------------------
 * 10. SMALL STUFF — clock + toast + home banner line.
 * ------------------------------------------------------------------- */
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2000); }
setInterval(() => { const n = new Date(); $("#sbTime").textContent = `${n.getHours()}:${String(n.getMinutes()).padStart(2, "0")}`; }, 30000);

/* home banner: a faint route line behind the logo */
(function homeLine() {
  const pts = D.art.routePoints("home-hero", 10).map(p => ({ x: p.x, y: 14 + p.y * 1.7 }));
  $("#homeTrail").setAttribute("d", D.art.toPath(pts));
})();

/* ---------------------------------------------------------------------
 * 11. GO! — build everything once the page loads.
 * ------------------------------------------------------------------- */
$("#themeActName").textContent = act().name;
buildThemeRail();
render();
})();

