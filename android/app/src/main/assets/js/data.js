/* ============================================================
   STRIDE · data.js — mock activities + theme registry.
   Replace with Strava API later; shapes stay identical.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- helpers ---------- */

  function fmtTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.round(sec % 60);
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
  }

  function fmtPace(secPerKm) {
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function fmtDist(km) {
    return km.toFixed(2);
  }

  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  function fmtDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }

  /* ---------- mock activities ---------- */

  // distance km · time s · elev m · kcal · avg hr bpm
  const RAW = [
    { id: "a1", name: "MORNING RUN",     location: "RIVERFRONT LOOP",        date: "2026-08-24", dist: 10.01, time: 2717, elev: 112, cal: 784, hr: 158 },
    { id: "a2", name: "TEMPO TUESDAY",   location: "LAKESIDE PARK",          date: "2026-08-21", dist: 8.05,  time: 2282, elev: 86,  cal: 611, hr: 167 },
    { id: "a3", name: "SUNDAY LONG RUN", location: "COUNTRYSIDE TRAIL",      date: "2026-08-17", dist: 21.4,  time: 6740, elev: 230, cal: 1620, hr: 149 },
    { id: "a4", name: "TRACK INTERVALS", location: "CITY STADIUM",           date: "2026-08-14", dist: 6.2,   time: 1798, elev: 12,  cal: 486, hr: 171 },
    { id: "a5", name: "EASY RECOVERY",   location: "NEIGHBORHOOD STREETS",   date: "2026-08-12", dist: 5.03,  time: 1845, elev: 34,  cal: 398, hr: 132 },
    { id: "a6", name: "HILL REPEATS",    location: "RIDGE ROUTE",            date: "2026-08-09", dist: 7.7,   time: 2480, elev: 310, cal: 702, hr: 162 }
  ];

  const ACTIVITIES = RAW.map(function (r) {
    return {
      id: r.id,
      name: r.name,
      location: r.location,
      date: r.date,
      dateLabel: fmtDate(r.date),
      stats: {
        distance: { value: fmtDist(r.dist), unit: "KM" },
        time:     { value: fmtTime(r.time), unit: "" },
        pace:     { value: fmtPace(r.time / r.dist), unit: "/KM" },
        elevation:{ value: String(r.elev), unit: "M" },
        calories: { value: String(r.cal), unit: "KCAL" },
        hr:       { value: String(r.hr), unit: "BPM" }
      }
    };
  });

  /* ---------- stat metadata (order + labels) ---------- */

  const STAT_META = [
    { key: "distance",  label: "DISTANCE" },
    { key: "time",      label: "TIME" },
    { key: "pace",      label: "AVG PACE" },
    { key: "elevation", label: "ELEVATION" },
    { key: "calories",  label: "CALORIES" },
    { key: "hr",        label: "AVG HEART RATE" }
  ];

  /* ---------- themes ---------- */

  const THEMES = {
    "bw-motion": { label: "B/W MOTION", cls: "th-bw" },
    "midnight":  { label: "MIDNIGHT",   cls: "th-midnight" },
    "blueprint": { label: "BLUEPRINT",  cls: "th-blueprint" },
    "minimal":   { label: "MINIMAL",    cls: "th-minimal" },
    "topo":      { label: "TOPOGRAPHIC", cls: "th-topo" }
  };

  const THEME_ORDER = ["bw-motion", "midnight", "blueprint", "minimal", "topo"];

  /* ---------- export ratios ---------- */

  const RATIOS = {
    story:    { label: "STORY",    w: 1080, h: 1920, css: 9 / 16 },
    portrait: { label: "PORTRAIT", w: 1080, h: 1350, css: 4 / 5 },
    square:   { label: "SQUARE",   w: 1080, h: 1080, css: 1 }
  };

  /* ---------- export ---------- */

  window.STRIDE = {
    activities: ACTIVITIES,
    statMeta: STAT_META,
    themes: THEMES,
    themeOrder: THEME_ORDER,
    ratios: RATIOS,
    util: { fmtTime: fmtTime, fmtPace: fmtPace, fmtDate: fmtDate }
  };
})();
