// dashboard.js — TOC + progress dashboard rendering, and per-language score persistence.
// localStorage keys are namespaced by BOTH book slug and language:
//   book:<slug>:<lang>:ch:<n>  -> { score, total, percent, pass, ts }
// so progress is tracked independently per language.
(function (global) {
  "use strict";

  var PASS_THRESHOLD = 80;

  function storageKey(bookSlug, lang, chapter) {
    return "book:" + bookSlug + ":" + lang + ":ch:" + chapter;
  }

  function loadScore(bookSlug, lang, chapter) {
    try {
      var v = localStorage.getItem(storageKey(bookSlug, lang, chapter));
      return v ? JSON.parse(v) : null;
    } catch (e) { return null; }
  }

  function saveScore(bookSlug, lang, chapter, score, total, percent) {
    try {
      localStorage.setItem(storageKey(bookSlug, lang, chapter), JSON.stringify({
        score: score, total: total, percent: percent,
        pass: percent >= PASS_THRESHOLD, ts: Date.now()
      }));
    } catch (e) { /* localStorage unavailable */ }
  }

  // Render the TOC and the dashboard grid based on chapters + saved scores.
  // chapters: [{ id, title, chapter: "1" }, ...]
  function render(bookSlug, lang, chapters, i18n) {
    var tocNav = document.getElementById("toc");
    var statusGrid = document.getElementById("status-grid");
    if (statusGrid) statusGrid.innerHTML = "";

    var chapterCount = chapters.length;
    var passedCount = 0;

    // Rebuild TOC heading + chapter links (preserve the lang switcher block at the bottom).
    var langBlock = tocNav ? tocNav.querySelector(".lang-switcher") : null;
    if (tocNav) {
      tocNav.innerHTML = '<h2>' + i18n.t("ui.contents") + '</h2>';
    }

    chapters.forEach(function (ch) {
      var rec = loadScore(bookSlug, lang, ch.chapter);
      if (rec && rec.pass) passedCount++;

      // TOC link
      if (tocNav) {
        var link = document.createElement("a");
        link.href = "#" + ch.id;
        link.className = "chapter-link";
        var status = document.createElement("span");
        status.className = "status";
        if (rec) {
          status.textContent = rec.pass ? "✓" : "•";
          status.classList.add(rec.pass ? "pass" : "fail");
        } else {
          status.textContent = "○";
          status.classList.add("fail");
        }
        link.appendChild(status);
        link.appendChild(document.createTextNode(ch.title));
        tocNav.appendChild(link);
      }

      // Dashboard cell
      if (statusGrid) {
        var cell = document.createElement("a");
        cell.href = "#" + ch.id;
        var dot = document.createElement("span");
        dot.className = "dot";
        if (rec) dot.classList.add(rec.pass ? "pass" : "fail");
        cell.appendChild(document.createTextNode(ch.title));
        cell.appendChild(dot);
        statusGrid.appendChild(cell);
      }
    });

    // Re-attach the language switcher block (it lives at the bottom of the TOC).
    if (tocNav && langBlock) tocNav.appendChild(langBlock);

    var progressEl = document.getElementById("overall-progress");
    if (progressEl && chapterCount) {
      progressEl.style.width = Math.round(100 * passedCount / chapterCount) + "%";
    }
  }

  global.BookDashboard = {
    PASS_THRESHOLD: PASS_THRESHOLD,
    loadScore: loadScore,
    saveScore: saveScore,
    render: render
  };
})(window);
