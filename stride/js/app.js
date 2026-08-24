/* ============================================================
   STRIDE · app.js — state, navigation, editor, sheets, export
   ============================================================ */

(function () {
  "use strict";

  const D = window.STRIDE;
  const $ = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  /* ---------- state ---------- */

  const defaultOptions = function () {
    const stats = {};
    D.statMeta.forEach(function (m, i) {
      stats[m.key] = i < 3; // distance · time · pace on by default
    });
    return {
      stats: stats,
      route: true,
      date: true
    };
  };

  let state = {
    activityId: "a1",
    themeId: "bw-motion",
    ratio: "story",
    options: defaultOptions(),
    photo: "none",
    headline: "",
    location: ""
  };

  function getActivity() {
    return D.activities.find(function (a) { return a.id === state.activityId; });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- toast ---------- */

  const toastEl = $("#toast");
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2300);
  }

  /* ---------- navigation ---------- */

  const ORDER = ["home", "activities", "themes", "editor", "export"];
  const screensEl = $("#screens");
  let current = "home";

  function go(name) {
    if (name === current) return;
    const dir = ORDER.indexOf(name) > ORDER.indexOf(current) ? "fwd" : "back";
    screensEl.setAttribute("data-dir", dir);
    $("#screen-" + current).classList.remove("active");
    $("#screen-" + name).classList.add("active");
    current = name;
    closeSheet();
    requestAnimationFrame(function () {
      fitStages();
      if (name === "themes") syncThemeSelection();
    });
  }

  $$("[data-back]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const i = ORDER.indexOf(current);
      if (i > 0) go(ORDER[i - 1]);
    });
  });

  /* deep link: index.html#editor etc. */
  (function deepLink() {
    const h = location.hash.replace("#", "");
    if (ORDER.indexOf(h) !== -1) {
      $("#screen-" + current).classList.remove("active");
      $("#screen-" + h).classList.add("active");
      screensEl.setAttribute("data-dir", "fwd");
      current = h;
      if (h === "themes") $("#themeActName").textContent = getActivity().name;
    }
  })();

  /* ---------- status bar clock ---------- */

  function tickClock() {
    const d = new Date();
    $("#sbTime").textContent = d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  tickClock();
  setInterval(tickClock, 30000);

  /* ---------- home ---------- */

  (function homeTrail() {
    const pts = D.art.routePoints("stride-home-hero", 15).map(function (p) {
      return { x: p.x, y: 18 + p.y * 1.55 };
    });
    $("#homeTrail").setAttribute("d", D.art.catmullPath(pts, false));
  })();

  $("#btnConnect").addEventListener("click", function () {
    toast("STRAVA CONNECT — MOCKED IN DEMO");
    go("activities");
  });

  $("#btnDemo").addEventListener("click", function () {
    go("activities");
  });

  /* ---------- activities ---------- */

  (function buildActivities() {
    const ul = $("#actList");
    ul.innerHTML = D.activities.map(function (a, i) {
      const s = a.stats;
      return (
        '<li><button class="act-row" data-act="' + a.id + '">' +
        '<span class="act-idx">' + String(i + 1).padStart(2, "0") + "</span>" +
        "<span>" +
        '<span class="act-name">' + esc(a.name) + "</span>" +
        '<span class="act-meta">' +
        esc(s.distance.value + " KM · " + s.time.value + " · " + s.pace.value + "/KM") +
        "</span>" +
        "</span>" +
        '<span class="act-right">' +
        '<span class="act-date">' + esc(a.dateLabel.replace(", ", " ")) + "</span>" +
        '<svg class="act-chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>' +
        "</span>" +
        "</button></li>"
      );
    }).join("");

    ul.addEventListener("click", function (e) {
      const row = e.target.closest("[data-act]");
      if (!row) return;
      state.activityId = row.getAttribute("data-act");
      $("#themeActName").textContent = getActivity().name;
      buildThemeRail(); // re-render minis for new activity route
      renderArt();
      go("themes");
    });

    $("#actCount").textContent = String(D.activities.length).padStart(2, "0");
  })();

  /* ---------- theme rail ---------- */

  function themeCardHTML(tKey, variant) {
    const t = D.themes[tKey];
    const cls = variant === "style" ? "style-card" : "theme-card";
    const frameCls = variant === "style" ? "style-frame" : "theme-frame";
    return (
      '<button class="' + cls + '" data-theme="' + tKey + '">' +
      '<div class="' + frameCls + ' stage" data-mini="' + tKey + '"></div>' +
      (variant === "style"
        ? '<span class="style-name">' + esc(t.label) + "</span>"
        : '<span class="theme-label"><span>' + esc(t.label) + '</span>' +
          '<svg class="theme-check" viewBox="0 0 24 24"><path d="M4 12l6 6L20 6"/></svg>' +
          "</span>") +
      "</button>"
    );
  }

  function buildThemeRail() {
    const rail = $("#themeRail");
    rail.innerHTML = D.themeOrder.map(function (k) { return themeCardHTML(k, "theme"); }).join("");
    D.themeOrder.forEach(function (k) {
      const holder = rail.querySelector('[data-mini="' + k + '"]');
      D.art.mount(holder, Object.assign({}, state, { themeId: k }));
    });
    rail.onclick = function (e) {
      const card = e.target.closest("[data-theme]");
      if (!card) return;
      state.themeId = card.getAttribute("data-theme");
      syncThemeSelection();
      renderArt();
    };
    syncThemeSelection();
  }

  function syncThemeSelection() {
    $$(".theme-card").forEach(function (c) {
      c.classList.toggle("is-active", c.getAttribute("data-theme") === state.themeId);
    });
    $$(".style-card").forEach(function (c) {
      c.classList.toggle("is-active", c.getAttribute("data-theme") === state.themeId);
    });
  }

  $("#btnToEditor").addEventListener("click", function () { go("editor"); });

  /* ---------- editor ---------- */

  const editorStage = $("#editorStage");
  const exportStage = $("#exportStage");

  function renderArt() {
    D.art.mount(editorStage, state);
    D.art.mount(exportStage, state);
    if (!$("#genlay").hidden && !$(".gen-done").hidden) {
      D.art.mount($("#genStage"), state);
    }
  }

  function fitStage(stage, box) {
    const cs = getComputedStyle(box);
    const bw = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const bh = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (bw <= 0 || bh <= 0) return;
    const ratio = D.ratios[state.ratio].css;
    let h = bh, w = h * ratio;
    if (w > bw) { w = bw; h = w / ratio; }
    stage.style.width = w + "px";
    stage.style.height = h + "px";
  }

  function fitStages() {
    fitStage(editorStage, $("#editorStageBox"));
    fitStage(exportStage, $("#exportStageBox"));
  }

  const ro = new ResizeObserver(function () { fitStages(); });
  ro.observe($("#editorStageBox"));
  ro.observe($("#exportStageBox"));

  $("#btnEditorExport").addEventListener("click", function () { go("export"); });

  /* ---------- bottom sheet ---------- */

  const sheetWrap = $("#sheetWrap");
  const sheetBody = $("#sheetBody");
  let activeTool = null;

  function openSheet(tool) {
    activeTool = tool;
    sheetBody.innerHTML = panels[tool]();
    wirePanel(tool);
    sheetWrap.hidden = false;
    requestAnimationFrame(function () {
      sheetWrap.classList.add("open");
    });
    $$(".tool").forEach(function (t) {
      const on = t.getAttribute("data-tool") === tool;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function closeSheet() {
    if (sheetWrap.hidden) return;
    sheetWrap.classList.remove("open");
    activeTool = null;
    setTimeout(function () {
      sheetWrap.hidden = true;
      sheetBody.innerHTML = "";
    }, 340);
    $$(".tool").forEach(function (t) {
      t.classList.remove("is-active");
      t.setAttribute("aria-selected", "false");
    });
  }

  $("#toolbar").addEventListener("click", function (e) {
    const btn = e.target.closest(".tool");
    if (!btn) return;
    const tool = btn.getAttribute("data-tool");
    if (tool === activeTool) closeSheet();
    else openSheet(tool);
  });

  $("#sheetScrim").addEventListener("click", closeSheet);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeSheet();
      hideGenlay();
    }
  });

  /* ---------- panels ---------- */

  function swRow(key, label, on) {
    return (
      '<div class="opt-row"><span class="opt-label">' + label + "</span>" +
      '<button class="switch' + (on ? " is-on" : "") + '" data-sw="' + key + '" role="switch" aria-checked="' +
      (on ? "true" : "false") + '" aria-label="' + label + '"></button></div>'
    );
  }

  const panels = {

    stats: function () {
      let html = '<div class="panel"><p class="panel-title">RUNNING STATS</p>';
      html += D.statMeta.map(function (m) {
        return swRow(m.key, m.label, !!state.options.stats[m.key]);
      }).join("");
      html += '<p class="panel-title">LAYERS</p>';
      html += swRow("route", "ROUTE LINE", !!state.options.route);
      html += swRow("date", "DATE", !!state.options.date);
      html += '<p class="panel-note">TOGGLES UPDATE THE POSTER LIVE</p></div>';
      return html;
    },

    photo: function () {
      function cell(val, label) {
        return (
          '<button data-photo="' + val + '"' +
          (state.photo === val ? ' class="is-active"' : "") +
          ">" + label + "</button>"
        );
      }
      return (
        '<div class="panel"><p class="panel-title">PHOTO PLACEHOLDER</p>' +
        '<div class="seg seg-big">' + cell("none", "NONE") + cell("top", "TOP") + cell("bottom", "BOTTOM") + "</div>" +
        '<p class="panel-note">PHOTOS DROP INTO THIS FRAME AFTER CAMERA ROLL INTEGRATION</p></div>'
      );
    },

    text: function () {
      const act = getActivity();
      return (
        '<div class="panel"><p class="panel-title">TEXT</p>' +
        '<label class="field"><span>HEADLINE</span>' +
        '<input type="text" maxlength="26" data-field="headline" value="' + esc(state.headline) +
        '" placeholder="' + esc(act.name) + '"></label>' +
        '<label class="field"><span>LOCATION</span>' +
        '<input type="text" maxlength="28" data-field="location" value="' + esc(state.location) +
        '" placeholder="' + esc(act.location) + '"></label>' +
        '<p class="panel-note">LEAVE A FIELD EMPTY TO USE ACTIVITY DATA</p></div>'
      );
    },

    style: function () {
      return (
        '<div class="panel"><p class="panel-title">THEME</p>' +
        '<div class="style-rail">' +
        D.themeOrder.map(function (k) { return themeCardHTML(k, "style"); }).join("") +
        "</div></div>"
      );
    }
  };

  function wirePanel(tool) {
    if (tool === "stats") {
      sheetBody.onclick = function (e) {
        const sw = e.target.closest("[data-sw]");
        if (!sw) return;
        const key = sw.getAttribute("data-sw");
        if (key === "route") state.options.route = !state.options.route;
        else if (key === "date") state.options.date = !state.options.date;
        else state.options.stats[key] = !state.options.stats[key];
        const on = key === "route" ? state.options.route : key === "date" ? state.options.date : state.options.stats[key];
        sw.classList.toggle("is-on", on);
        sw.setAttribute("aria-checked", on ? "true" : "false");
        renderArt();
      };
    } else if (tool === "photo") {
      sheetBody.onclick = function (e) {
        const b = e.target.closest("[data-photo]");
        if (!b) return;
        state.photo = b.getAttribute("data-photo");
        $$(".seg [data-photo]").forEach(function (x) {
          x.classList.toggle("is-active", x.getAttribute("data-photo") === state.photo);
        });
        renderArt();
      };
    } else if (tool === "text") {
      sheetBody.oninput = function (e) {
        const inp = e.target.closest("[data-field]");
        if (!inp) return;
        state[inp.getAttribute("data-field")] = inp.value;
        renderArt();
      };
    } else if (tool === "style") {
      sheetBody.onclick = function (e) {
        const card = e.target.closest("[data-theme]");
        if (!card) return;
        state.themeId = card.getAttribute("data-theme");
        syncThemeSelection();
        renderArt();
      };
    }
  }

  /* ---------- export screen ---------- */

  $("#ratioSeg").addEventListener("click", function (e) {
    const b = e.target.closest("[data-ratio]");
    if (!b) return;
    state.ratio = b.getAttribute("data-ratio");
    $$(".ratio").forEach(function (r) {
      const on = r.getAttribute("data-ratio") === state.ratio;
      r.classList.toggle("is-active", on);
      r.setAttribute("aria-checked", on ? "true" : "false");
    });
    fitStages();
  });

  /* ---------- generate overlay ---------- */

  const genlay = $("#genlay");
  const genPhaseProgress = $(".gen-progress");
  const genPhaseDone = $(".gen-done");
  const genBarFill = $("#genBarFill");
  const genStep = $("#genStep");
  let lastBlob = null;

  function showGenlay() {
    genlay.hidden = false;
    genPhaseProgress.hidden = false;
    genPhaseDone.hidden = true;
    genBarFill.style.width = "0%";

    const steps = [
      ["COMPOSING LAYOUT…", 22],
      ["DRAWING ROUTE…", 48],
      ["SETTING TYPE…", 72],
      ["APPLYING " + D.themes[state.themeId].label + "…", 90],
      ["FINALISING " + D.ratios[state.ratio].w + "×" + D.ratios[state.ratio].h + "…", 100]
    ];
    let i = 0;
    (function next() {
      if (i < steps.length) {
        genStep.textContent = steps[i][0];
        genBarFill.style.width = steps[i][1] + "%";
        i++;
        setTimeout(next, 420);
      } else {
        finishGenerate();
      }
    })();
  }

  async function finishGenerate() {
    try {
      lastBlob = await D.exporter.toBlob(state, state.ratio);
    } catch (e) {
      lastBlob = null;
    }
    genStep.textContent = "READY";
    setTimeout(function () {
      genPhaseProgress.hidden = true;
      genPhaseDone.hidden = false;
      const gs = $("#genStage");
      gs.style.aspectRatio = String(D.ratios[state.ratio].css);
      D.art.mount(gs, state);
      $("#genFile").textContent = D.exporter.fileName(state, state.ratio);
    }, 260);
  }

  function hideGenlay() {
    if (genlay.hidden) return;
    genlay.hidden = true;
  }

  $("#btnGenerate").addEventListener("click", showGenlay);
  $("#btnGenClose").addEventListener("click", hideGenlay);

  genlay.addEventListener("click", function (e) {
    if (e.target === genlay) hideGenlay();
  });

  $("#btnSaveImg").addEventListener("click", async function () {
    const blob = lastBlob || (await D.exporter.toBlob(state, state.ratio));
    if (!blob) {
      toast("RENDER FAILED — TRY AGAIN");
      return;
    }
    if (window.MileMotion && typeof window.MileMotion.saveImage === "function") {
      const b64 = await new Promise(function (res) {
        const fr = new FileReader();
        fr.onload = function () { res(String(fr.result).split(",")[1]); };
        fr.readAsDataURL(blob);
      });
      window.MileMotion.saveImage(b64, D.exporter.fileName(state, state.ratio));
      toast("IMAGE SAVED");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = D.exporter.fileName(state, state.ratio);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    toast("IMAGE SAVED");
  });

  $("#btnShare").addEventListener("click", async function () {
    const blob = lastBlob || (await D.exporter.toBlob(state, state.ratio));
    if (!blob) { toast("RENDER FAILED — TRY AGAIN"); return; }
    const file = new File([blob], D.exporter.fileName(state, state.ratio), { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "MileMotion", text: "Your run. Your story." });
        toast("SHARED");
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    toast("SHARE SHEET — MOCKED IN DEMO");
  });

  /* ---------- init ---------- */

  $("#themeActName").textContent = getActivity().name;
  buildThemeRail();
  renderArt();
})();
