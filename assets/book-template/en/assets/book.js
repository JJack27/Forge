/* Personal Book Forger — shared book JS.
   Handles: localStorage scoring, TOC/dashboard, per-chapter tests,
   the light/dark theme toggle, and a small registry of interactive
   demos used across chapters.
   Loaded from each chapter via <script src="assets/book.js" defer>.

   CONFIG: every page sets window.BOOK_CONFIG inline (in a <script> block
   on the page itself, before this file loads) to override the defaults
   below — at minimum: slug (kebab-case book id), lang ("en"/"zh"/...),
   and chapters (ordered list of {n, slug}). The slug + lang form the
   localStorage key prefix so scores namespace per language. */

(function () {
  "use strict";

  // ---- Config (overridable per book via window.BOOK_CONFIG) ----
  // Replace these defaults with your book's values, OR (preferred) set
  // window.BOOK_CONFIG inline on every page just before <script src="assets/book.js">.
  var CFG = Object.assign({
    slug: "my-book",
    lang: "en",
    passThreshold: 80,
    chapters: [
      { n: 1, slug: "01-example-chapter" }
    ]
  }, window.BOOK_CONFIG || {});

  // ---- Utilities ----
  function normalize(s) {
    return String(s).trim().toLowerCase().replace(/\s+/g, " ");
  }
  function storageKey(chapter) { return "book:" + CFG.slug + ":" + CFG.lang + ":ch:" + chapter; }
  function loadScore(chapter) {
    try { var v = localStorage.getItem(storageKey(chapter)); return v ? JSON.parse(v) : null; }
    catch (e) { return null; }
  }
  function saveScore(chapter, score, total, percent) {
    try {
      localStorage.setItem(storageKey(chapter), JSON.stringify({
        score: score, total: total, percent: percent,
        pass: percent >= CFG.passThreshold, ts: Date.now()
      }));
    } catch (e) { /* localStorage unavailable (private mode) */ }
  }

  // ============================================================
  // CHAPTER PAGE: tests
  // ============================================================
  function scoreQuestion(q) {
    var type = q.getAttribute("data-type");
    if (type === "mcq") {
      var correct = JSON.parse(q.getAttribute("data-correct") || "[]");
      var multiselect = q.getAttribute("data-multiselect") === "true";
      if (multiselect) {
        var inputs = q.querySelectorAll('input[type="checkbox"]');
        var selected = Array.prototype.filter.call(inputs, function (i) { return i.checked; })
                                       .map(function (i) { return i.value; });
        var allRight = correct.every(function (c) { return selected.indexOf(c) >= 0; });
        var noWrong = selected.every(function (s) { return correct.indexOf(s) >= 0; });
        return (allRight && noWrong) ? 1 : 0;
      }
      var input = q.querySelector('input[type="radio"]:checked');
      return (input && correct.indexOf(input.value) >= 0) ? 1 : 0;
    }
    if (type === "fill") {
      var accepted = JSON.parse(q.getAttribute("data-accepted") || "[]").map(normalize);
      var fills = q.querySelectorAll("input.fill");
      if (fills.length === 1) {
        return (accepted.indexOf(normalize(fills[0].value)) >= 0) ? 1 : 0;
      }
      // multi-blank: each value in accepted, no duplicates
      var vals = Array.prototype.map.call(fills, function (f) { return normalize(f.value); });
      var allFilled = vals.every(function (v) { return v.length > 0; });
      var noDup = vals.length === new Set(vals).size;
      var matched = accepted.filter(function (a) { return vals.indexOf(a) >= 0; });
      return (allFilled && noDup && matched.length === vals.length) ? 1 : 0;
    }
    if (type === "short") {
      var kpBox = q.querySelector(".key-points");
      var checks = kpBox ? kpBox.querySelectorAll('input[type="checkbox"]') : [];
      if (!checks.length) return 0;
      var checked = Array.prototype.filter.call(checks, function (c) { return c.checked; }).length;
      return checks.length ? checked / checks.length : 0;
    }
    return 0;
  }

  function showFeedback(q, earned) {
    var fb = q.querySelector(".feedback");
    if (!fb) return;
    var correct = (earned >= 1), partial = (earned > 0 && earned < 1);
    fb.className = "feedback shown " + (correct ? "correct" : (partial ? "partial" : "wrong"));
    var verdict = correct ? "✓ Correct" : (partial ? "△ Partial credit" : "✗ Revisit this");
    var answer = q.getAttribute("data-answer") || "";
    var rationale = q.getAttribute("data-rationale") || "";
    var review = q.getAttribute("data-review");
    var html = "<strong>" + verdict + "</strong>";
    if (answer) html += "<div>" + answer + "</div>";
    if (rationale) html += "<div class='rationale'>" + rationale + "</div>";
    if (review) html += "<div class='review-link'>→ <a href='#" + review + "'>review this section</a></div>";
    fb.innerHTML = html;
  }

  function ensureKeyPoints(q) {
    if (q.getAttribute("data-type") !== "short") return;
    var kpBox = q.querySelector(".key-points");
    if (!kpBox || kpBox.querySelector('input[type="checkbox"]')) return;
    var points = JSON.parse(q.getAttribute("data-key-points") || "[]");
    points.forEach(function (p, i) {
      var lbl = document.createElement("label");
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.setAttribute("data-kp", i);
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode(" " + p));
      kpBox.appendChild(lbl);
    });
  }

  function lockQuestion(q) {
    Array.prototype.forEach.call(q.querySelectorAll("input, textarea"), function (el) { el.disabled = true; });
  }

  function scoreTest(form) {
    var chNum = form.getAttribute("data-chapter");
    var questions = form.querySelectorAll(".q");
    var total = questions.length, earned = 0;
    Array.prototype.forEach.call(questions, function (q) {
      ensureKeyPoints(q);
      var e = scoreQuestion(q);
      earned += e;
      showFeedback(q, e);
      lockQuestion(q);
    });
    var percent = total ? Math.round(100 * earned / total) : 0;
    saveScore(chNum, earned, total, percent);

    var pass = percent >= CFG.passThreshold;
    var resultEl = form.querySelector(".test-result");
    if (resultEl) {
      resultEl.className = "test-result shown " + (pass ? "pass" : "fail");
      var verdict = pass
        ? "Learned enough to move forward. ✓"
        : "Below " + CFG.passThreshold + "%. Re-read the highlighted sections, then retake. (Nothing is locked — you can still read the next chapter.)";
      resultEl.innerHTML =
        "<div class='score'>" + percent + "%</div>" +
        "<div class='verdict'>" + verdict + "</div>";
    }
    var submitBtn = form.querySelector(".submit-test");
    if (submitBtn) submitBtn.disabled = true;
    var retakeBtn = form.querySelector(".retake-btn");
    if (retakeBtn) retakeBtn.hidden = false;
  }

  function resetTest(form) {
    Array.prototype.forEach.call(form.querySelectorAll(".q"), function (q) {
      Array.prototype.forEach.call(q.querySelectorAll("input, textarea"), function (el) {
        el.disabled = false;
        if (el.type === "checkbox" || el.type === "radio") el.checked = false;
        else el.value = "";
      });
      var fb = q.querySelector(".feedback");
      if (fb) { fb.className = "feedback"; fb.innerHTML = ""; }
    });
    var resultEl = form.querySelector(".test-result");
    if (resultEl) { resultEl.className = "test-result"; resultEl.innerHTML = ""; }
    var submitBtn = form.querySelector(".submit-test");
    if (submitBtn) submitBtn.disabled = false;
    var retakeBtn = form.querySelector(".retake-btn");
    if (retakeBtn) retakeBtn.hidden = true;
  }

  document.addEventListener("submit", function (e) {
    if (e.target.classList && e.target.classList.contains("test")) {
      e.preventDefault();
      scoreTest(e.target);
    }
  });
  document.addEventListener("click", function (e) {
    if (e.target.classList && e.target.classList.contains("retake-btn")) {
      var form = e.target.closest("form.test");
      if (form) resetTest(form);
    }
  });
  document.addEventListener("focusin", function (e) {
    if (e.target.classList && e.target.classList.contains("short")) {
      var q = e.target.closest(".q");
      if (q) ensureKeyPoints(q);
    }
  });

  // ============================================================
  // CHAPTER PAGE: top nav (prev/next) + lang toggle
  // ============================================================
  function buildChapterNav(currentN) {
    var nav = document.querySelector(".topbar nav.chapter-nav");
    if (!nav) return;
    var ordered = CFG.chapters.slice().sort(function (a, b) { return a.n - b.n; });
    var prev = null, next = null;
    for (var i = 0; i < ordered.length; i++) {
      if (ordered[i].n === currentN) {
        prev = ordered[i - 1] || null;
        next = ordered[i + 1] || null;
      }
    }
    var html = "";
    if (prev) html += '<a href="' + prev.slug + '.html">← ' + prev.n + '</a>';
    else html += '<a class="disabled">←</a>';
    html += '<a href="index.html"> Contents</a>';
    if (next) html += '<a href="' + next.slug + '.html">' + next.n + ' →</a>';
    else html += '<a class="disabled">→</a>';
    nav.innerHTML = html;
  }

  // ============================================================
  // THEME (light/dark) — toggle button auto-injected into the topbar
  // ============================================================
  // The initial theme is applied BEFORE first paint by the tiny inline
  // snippet in each page's <head> (stored choice, else prefers-color-scheme,
  // else dark) so there is no flash of the wrong theme. Here we only inject
  // the toggle button and flip the attribute on click. The choice persists
  // in localStorage under a single book-agnostic key ("pbf:theme"), shared
  // across chapters AND languages (a reader's theme preference is not
  // per-language).
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function initThemeToggle() {
    var topbar = document.querySelector(".topbar");
    if (!topbar || topbar.querySelector(".theme-toggle")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    btn.setAttribute("aria-label", "Toggle light/dark theme");
    function render() {
      var light = currentTheme() === "light";
      btn.textContent = light ? "☾" : "☀";
      btn.title = light ? "Switch to dark theme" : "Switch to light theme";
    }
    btn.addEventListener("click", function () {
      var next = currentTheme() === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("pbf:theme", next); } catch (e) { /* private mode */ }
      render();
    });
    render();
    // Sit before the lang-toggle when there is one, else at the bar's end.
    var lang = topbar.querySelector(".lang-toggle");
    topbar.insertBefore(btn, lang || null);
  }

  // ============================================================
  // TOC PAGE: build cards + dashboard
  // ============================================================
  function buildTocPage() {
    var grid = document.querySelector(".chapter-grid");
    if (!grid) return;
    var descs = window.CHAPTER_DESCS || {};
    var passed = 0;
    grid.innerHTML = "";
    CFG.chapters.forEach(function (ch) {
      var rec = loadScore(ch.n);
      if (rec && rec.pass) passed++;
      var statusClass = rec ? (rec.pass ? "pass" : "fail") : "";
      var statusText = rec
        ? (rec.pass ? "✓ passed (" + rec.percent + "%)" : "● taken (" + rec.percent + "%)")
        : "○ not started";
      var card = document.createElement("a");
      card.className = "chapter-card";
      card.href = ch.slug + ".html";
      card.innerHTML =
        '<div class="ch-num">CHAPTER ' + ch.n + '</div>' +
        '<div class="ch-title">' + (descs[ch.n] ? descs[ch.n].title : ("Chapter " + ch.n)) + '</div>' +
        '<div class="ch-desc">' + (descs[ch.n] ? descs[ch.n].desc : "") + '</div>' +
        '<div class="ch-status"><span class="dot ' + statusClass + '"></span>' + statusText + '</div>';
      grid.appendChild(card);
    });
    var pct = Math.round(100 * passed / CFG.chapters.length);
    var pb = document.getElementById("overall-progress");
    if (pb) pb.style.width = pct + "%";
    var pctLabel = document.getElementById("progress-pct");
    if (pctLabel) pctLabel.textContent = pct + "%";
    var passedLabel = document.getElementById("progress-passed");
    if (passedLabel) passedLabel.textContent = passed + " / " + CFG.chapters.length;
  }

  // ============================================================
  // DEMOS — registry of interactive widgets.
  // Each chapter can include <div class="demo" data-demo="NAME">…</div>
  // blocks. NAME looks up a handler here, which receives the demo's
  // root element. The handler is bound to any <button data-run> inside
  // the demo (click), plus range/text inputs (input event) and radios
  // (change event) for live demos.
  //
  // This template ships an EMPTY registry — each book authors its own
  // demos below. Pattern:
  //
  //   var demos = {
  //     myDemo: function (root) {
  //       var out = root.querySelector(".demo-output");
  //       out.classList.remove("empty");
  //       out.textContent = "…result…";
  //     }
  //   };
  //
  // Then in a chapter: <div class="demo" data-demo="myDemo">
  //   <button data-run>Run</button>
  //   <div class="demo-output empty">Click to run.</div>
  // </div>
  // ============================================================
  var demos = {
    // Add your book's demos here. Keep it small and self-contained:
    // no fetch(), no reaching outside the demo's root element.
  };

  function initDemos() {
    var roots = document.querySelectorAll(".demo[data-demo]");
    Array.prototype.forEach.call(roots, function (root) {
      var name = root.getAttribute("data-demo");
      var handler = demos[name];
      if (!handler) return;
      var runBtns = root.querySelectorAll("button[data-run]");
      Array.prototype.forEach.call(runBtns, function (btn) {
        btn.addEventListener("click", function () { handler(root); });
      });
      // also auto-run on input change for range/text inputs
      var inputs = root.querySelectorAll('input[type="range"], input[type="text"]');
      Array.prototype.forEach.call(inputs, function (inp) {
        inp.addEventListener("input", function () { handler(root); });
      });
      // radio changes
      var radios = root.querySelectorAll('input[type="radio"]');
      Array.prototype.forEach.call(radios, function (r) {
        r.addEventListener("change", function () { handler(root); });
      });
    });
  }

  // ============================================================
  // BOOT
  // ============================================================
  function boot() {
    initDemos();
    initThemeToggle();
    buildTocPage(); // no-op if not on TOC page
    var chapterEl = document.querySelector("main.chapter");
    if (chapterEl) {
      var n = parseInt(chapterEl.getAttribute("data-chapter-n"), 10);
      if (n) buildChapterNav(n);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
