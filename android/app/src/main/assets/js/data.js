/*
 * =====================================================================
 *  data.js  —  the app's "database" (MOCK DATA only, no real backend)
 * =====================================================================
 *
 *  WHAT THIS FILE IS FOR
 *  ---------------------
 *  MarkingMotion builds a poster from one "activity" (a run). Right now
 *  there is no Strava login yet, so we ship 6 sample runs you can pick
 *  from. Later you can swap `activities` for real data returned by the
 *  Strava API — the rest of the code does not care where the numbers
 *  come from.
 *
 *  HOW TO READ IT
 *  --------------
 *  - ACTIVITIES  : one entry per run. Only raw numbers are stored.
 *  - themes      : the 5 visual styles, each with a CSS class name.
 *  - RATIOS      : the 3 export sizes (width x height in pixels).
 *  - STAT_META   : which stats exist and what label/order to show them.
 *
 *  The `window.STRIDE = {...}` line at the bottom is the ONLY thing
 *  other files can see. Everything else stays private to this file.
 * =====================================================================
 */

/* ---------------------------------------------------------------------
 * 1. RAW mock runs (the numbers a Strava activity would give us)
 *    NOTE: time is stored in SECONDS, distance in KILOMETERS.
 * ------------------------------------------------------------------- */
const RAW_RUNS = [
  { id: "a1", name: "MORNING RUN",   place: "RIVERFRONT LOOP",      date: "24 AUG", km: 10.01, sec: 2717, elev: 112, kcal: 784, hr: 158 },
  { id: "a2", name: "TEMPO TUESDAY", place: "LAKESIDE PARK",        date: "21 AUG", km: 8.05,  sec: 2282, elev: 86,  kcal: 611, hr: 167 },
  { id: "a3", name: "LONG RUN",      place: "COUNTRYSIDE TRAIL",    date: "17 AUG", km: 21.4,  sec: 6740, elev: 230, kcal: 1620, hr: 149 },
  { id: "a4", name: "INTERVALS",     place: "CITY STADIUM",         date: "14 AUG", km: 6.2,   sec: 1798, elev: 12,  kcal: 486, hr: 171 },
  { id: "a5", name: "EASY RUN",      place: "CITY STREETS",         date: "12 AUG", km: 5.03,  sec: 1845, elev: 34,  kcal: 398, hr: 132 },
  { id: "a6", name: "HILL REPEATS",  place: "RIDGE ROUTE",          date: "09 AUG", km: 7.7,   sec: 2480, elev: 310, kcal: 702, hr: 162 }
];

/* ---------------------------------------------------------------------
 * 2. Tiny helpers to format numbers into the way runners read them
 *    e.g. 2717 seconds -> "45:17"   |   10.01 km -> "10.01"
 * ------------------------------------------------------------------- */
const pad = n => String(n).padStart(2, "0");
const fmt = {
  time: s => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`; },
  pace: s => `${Math.floor(s / 60)}:${pad(Math.round(s % 60))}`,
  dist: k => k.toFixed(2)
};

/* ---------------------------------------------------------------------
 * 3. Build the full activity objects the rest of the app uses.
 *    Every activity ends up with a `stats` object shaped like:
 *        stats = { distance:{value,unit}, time:{...}, ... }
 *    That predictable shape is what the poster renderers read.
 * ------------------------------------------------------------------- */
const activities = RAW_RUNS.map(r => ({
  id: r.id,
  name: r.name,
  place: r.place,
  date: r.date,
  stats: {
    distance: { value: fmt.dist(r.km),  unit: "KM" },
    time:     { value: fmt.time(r.sec), unit: "" },
    pace:     { value: fmt.pace(r.sec / r.km), unit: "/KM" },
    elevation:{ value: String(r.elev), unit: "M" },
    calories: { value: String(r.kcal), unit: "KCAL" },
    hr:       { value: String(r.hr),   unit: "BPM" }
  }
}));

/* ---------------------------------------------------------------------
 * 4. Stat metadata: label + the order they appear on the poster.
 * ------------------------------------------------------------------- */
const STAT_META = [
  { key: "distance",  label: "DISTANCE" },
  { key: "time",      label: "TIME" },
  { key: "pace",      label: "AVG PACE" },
  { key: "elevation", label: "ELEVATION" },
  { key: "calories",  label: "CALORIES" },
  { key: "hr",        label: "AVG HEART RATE" }
];

/* ---------------------------------------------------------------------
 * 5. Themes — each maps to a `.th-*` CSS class that draws the artwork.
 * ------------------------------------------------------------------- */
const themes = {
  "bw-motion":   { label: "B/W MOTION",  cls: "th-bw" },
  "midnight":    { label: "MIDNIGHT",    cls: "th-midnight" },
  "blueprint":   { label: "BLUEPRINT",   cls: "th-blueprint" },
  "minimal":     { label: "MINIMAL",     cls: "th-minimal" },
  "topo":        { label: "TOPOGRAPHIC", cls: "th-topo" }
};
const THEME_ORDER = ["bw-motion", "midnight", "blueprint", "minimal", "topo"];

/* ---------------------------------------------------------------------
 * 6. Export sizes — `css` (9/16 etc.) keeps the on-screen preview the
 *    same shape as the real pixels it will export as.
 * ------------------------------------------------------------------- */
const RATIOS = {
  story:    { label: "STORY",    w: 1080, h: 1920, css: 9 / 16 },
  portrait: { label: "PORTRAIT", w: 1080, h: 1350, css: 4 / 5 },
  square:   { label: "SQUARE",   w: 1080, h: 1080, css: 1 }
};

/* ---------------------------------------------------------------------
 * 7. Export — the single public "API" for every other file.
 * ------------------------------------------------------------------- */
window.STRIDE = { activities, STAT_META, themes, THEME_ORDER, RATIOS };
