// main.js — bootstrap: load locale + book metadata + chapters, render, wire interactions.
(function () {
  "use strict";

  // === BOOK CONFIG — set BOOK_SLUG per book ===
  var BOOK_SLUG = "{{book-slug}}";

  var bootEl = document.getElementById("boot-msg");

  function bootFail(msg) {
    if (bootEl) {
      bootEl.classList.add("error");
      bootEl.textContent = "Failed to load book: " + msg +
        "\n\nMake sure you are serving the project over HTTP (e.g. run `python3 -m http.server` in the project directory), not opening index.html directly via file://.";
    }
  }

  function fetchJson(path) {
    return fetch(path, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(path + " -> " + r.status);
      return r.json();
    });
  }

  // Render a chapter object (from content/<lang>/ch-XX.json) into the DOM.
  function renderChapter(ch, lang, i18n) {
    var section = document.createElement("section");
    section.id = ch.id;
    section.className = "chapter";
    section.setAttribute("data-chapter", ch.chapter);
    section.setAttribute("data-title", ch.title);

    var html = "<h2>" + escapeHtml(ch.title) + "</h2>";

    if (ch.objectives && ch.objectives.length) {
      html += '<ul class="objectives" data-label="' + escAttr(i18n.t("ui.objectives")) + '">';
      ch.objectives.forEach(function (o) { html += "<li>" + escapeHtml(o) + "</li>"; });
      html += "</ul>";
    }

    if (ch.bodyHtml) {
      // bodyHtml is trusted pre-rendered HTML (authored by the skill), inject as-is.
      html += '<div class="body">' + ch.bodyHtml + "</div>";
    }

    if (ch.pitfallsHtml) {
      html += '<div class="pitfalls" data-label="' + escAttr(i18n.t("ui.pitfalls")) + '">' + ch.pitfallsHtml + "</div>";
    }

    if (ch.test && ch.test.questions && ch.test.questions.length) {
      html += renderTest(ch, i18n);
    }

    section.innerHTML = html;
    return section;
  }

  function renderTest(ch, i18n) {
    var qs = ch.test.questions;
    var html = '<form class="test" data-chapter="' + escAttr(ch.chapter) + '" data-pass-threshold="' +
               (ch.test.passThreshold || BookDashboard.PASS_THRESHOLD) + '">';
    html += "<h3>" + escapeHtml(i18n.t("ui.chapter_test", "Chapter test")) + ": " + escapeHtml(ch.title) + "</h3>";

    qs.forEach(function (q, idx) {
      html += renderQuestion(ch, q, idx, i18n);
    });

    html += '<button type="submit" class="submit-test">' + escapeHtml(i18n.t("ui.submit")) + "</button>";
    html += '<div class="test-result"></div>';
    html += '<button type="button" class="retake-btn" hidden>' + escapeHtml(i18n.t("ui.retake")) + "</button>";
    html += "</form>";
    return html;
  }

  function renderQuestion(ch, q, idx, i18n) {
    var num = idx + 1;
    var id = ch.chapter + "-" + (idx + 1);
    // Review anchor (language-neutral) -> chapter id + section id.
    var review = q.review ? (ch.id + "#" + q.review) : ch.id;
    var html = '<div class="q" data-id="' + escAttr(id) + '" data-type="' + escAttr(q.type) + '" data-review="' + escAttr(review) + '"';

    if (q.type === "mcq") {
      html += ' data-correct=\'' + escAttr(JSON.stringify(q.correct)) + "'";
      if (q.multiSelect) html += ' data-multiselect="true"';
      html += ">";
      html += '<div class="prompt"><span class="qnum">' + i18n.t("ui.q") + num + ".</span>" + (q.promptHtml || escapeHtml(q.prompt || "")) + "</div>";
      var inputType = q.multiSelect ? "checkbox" : "radio";
      var name = "q-" + id;
      (q.options || []).forEach(function (opt) {
        html += '<label class="opt"><input type="' + inputType + '" name="' + escAttr(name) + '" value="' + escAttr(opt.value) + '"> ' +
                (opt.labelHtml || escapeHtml(opt.label || "")) + "</label>";
      });
    } else if (q.type === "fill") {
      html += ' data-accepted=\'' + escAttr(JSON.stringify(q.accepted)) + "'>";
      html += '<div class="prompt"><span class="qnum">' + i18n.t("ui.q") + num + ".</span>" + (q.promptHtml || escapeHtml(q.prompt || "")) + "</div>";
      var blanks = q.blanks || 1;
      for (var b = 0; b < blanks; b++) {
        var ph = (q.placeholders && q.placeholders[b]) ? q.placeholders[b] : "";
        html += '<input type="text" class="fill" data-blank="' + b + '" placeholder="' + escAttr(ph) + '">';
      }
    } else if (q.type === "short") {
      html += ' data-key-points=\'' + escAttr(JSON.stringify(q.keyPoints)) + "'>";
      html += '<div class="prompt"><span class="qnum">' + i18n.t("ui.q") + num + ".</span>" + (q.promptHtml || escapeHtml(q.prompt || "")) + "</div>";
      html += '<textarea class="short" placeholder="' + escAttr(i18n.t("ui.your_answer")) + '"></textarea>';
      html += '<div class="key-points"><div class="hint">' + escapeHtml(i18n.t("ui.self_check_hint")) + "</div></div>";
    } else {
      html += ">[unknown question type: " + escapeHtml(q.type) + "]";
    }

    // Answer/rationale hidden until submit (data-* attributes, surfaced by scoring feedback renderer).
    if (q.answer) html += '<div class="feedback"></div>';
    html += "</div>";
    return html;
  }

  // After scoring, build each question's feedback box from its data-* attributes.
  function showFeedback(qEl, earned, i18n) {
    var type = qEl.getAttribute("data-type");
    var fb = qEl.querySelector(".feedback");
    if (!fb) return;
    var correct = (earned >= 1);
    var partial = (earned > 0 && earned < 1);
    fb.className = "feedback shown " + (correct ? "correct" : (partial ? "partial" : "wrong"));

    // Answer + rationale come from the chapter JSON via data-* attributes we attach at submit time.
    var verdict = correct ? i18n.t("ui.correct") : (partial ? i18n.t("ui.partial") : i18n.t("ui.wrong"));
    var html = "<strong>" + escapeHtml(verdict) + "</strong>";
    var answer = qEl.getAttribute("data-answer");
    if (answer) html += "<div>" + answer + "</div>";
    var rationale = qEl.getAttribute("data-rationale");
    if (rationale) html += '<div class="rationale">' + rationale + "</div>";
    var review = qEl.getAttribute("data-review");
    if (review) {
      var parts = review.split("#");
      var label = i18n.t("ui.review");
      html += '<div class="review-link">→ <a href="#' + escAttr(review) + '">' + escapeHtml(label) + (parts[1] ? " (#" + parts[1] + ")" : "") + "</a></div>";
    }
    fb.innerHTML = html;
  }

  // Build the language switcher <select> in the TOC.
  function buildLangSwitcher(currentLang, supported, onChange) {
    var block = document.createElement("div");
    block.className = "lang-switcher";
    var label = document.createElement("label");
    label.setAttribute("for", "lang-select");
    label.textContent = BookI18n.t("ui.language") || "Language";
    var sel = document.createElement("select");
    sel.id = "lang-select";
    supported.forEach(function (code) {
      var opt = document.createElement("option");
      opt.value = code;
      opt.textContent = code;
      if (code === currentLang) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function () {
      onChange(sel.value);
    });
    block.appendChild(label);
    block.appendChild(sel);
    return block;
  }

  // === Bootstrap ===
  var state = { meta: null, chapters: null, lang: null };

  function loadAndRender(lang) {
    return Promise.resolve()
      .then(function () { return BookI18n.init(lang); })
      .then(function () {
        state.lang = BookI18n.getLang();
        return fetchJson("content/" + state.lang + "/meta.json");
      })
      .then(function (meta) {
        state.meta = meta;
        var chFetches = (meta.chapters || []).map(function (c) {
          return fetchJson("content/" + state.lang + "/" + c.file).then(function (data) {
            data.id = c.id;
            data.chapter = c.chapter;
            return data;
          });
        });
        return Promise.all(chFetches);
      })
      .then(function (chapters) {
        state.chapters = chapters;
        document.documentElement.lang = state.lang;
        renderAll();
      });
  }

  function renderAll() {
    var i18n = BookI18n;
    var meta = state.meta;
    var chapters = state.chapters;

    // Dashboard header
    var h1 = document.querySelector("header#dashboard h1");
    var sub = document.querySelector("header#dashboard .subtitle");
    if (h1) h1.textContent = meta.title || "";
    if (sub) sub.textContent = meta.subtitle || "";

    // Chapters
    var main = document.getElementById("app");
    // Keep the dashboard header; clear everything after it.
    var dash = document.getElementById("dashboard");
    while (dash && dash.nextSibling) {
      main.removeChild(dash.nextSibling);
    }
    chapters.forEach(function (ch) {
      main.appendChild(renderChapter(ch, state.lang, i18n));
    });

    // TOC + dashboard grid
    BookDashboard.render(BOOK_SLUG, state.lang, chapters.map(function (c) {
      return { id: c.id, title: c.title, chapter: c.chapter };
    }), i18n);

    // Language switcher (rebuilt each render so it lives at the bottom of the fresh TOC)
    var toc = document.getElementById("toc");
    if (toc) {
      var switcher = buildLangSwitcher(state.lang, BookI18n.getSupported(), function (newLang) {
        BookI18n.switchTo(newLang, function () {
          loadAndRender(newLang).catch(bootFail);
        });
      });
      toc.appendChild(switcher);
    }
  }

  // Attach answer/rationale from the chapter data to each .q before scoring, then score.
  function handleSubmit(form) {
    var chapterNum = form.getAttribute("data-chapter");
    var ch = state.chapters.filter(function (c) { return c.chapter === chapterNum; })[0];
    var qs = form.querySelectorAll(".q");
    var total = qs.length;
    var earned = 0;

    qs.forEach(function (qEl, idx) {
      var qData = ch.test.questions[idx];
      // Stash answer/rationale on the element so showFeedback can surface them.
      if (qData.answer) qEl.setAttribute("data-answer", qData.answer);
      if (qData.rationale) qEl.setAttribute("data-rationale", qData.rationale);
      // For short-answer, build the key-point checkboxes from data-key-points.
      ensureKeyPoints(qEl);
      var e = BookScoring.scoreQuestion(qEl);
      earned += e;
      showFeedback(qEl, e, BookI18n);
      lockQuestion(qEl);
    });

    var percent = total ? Math.round(100 * earned / total) : 0;
    BookDashboard.saveScore(BOOK_SLUG, state.lang, chapterNum, earned, total, percent);
    var threshold = parseInt(form.getAttribute("data-pass-threshold") || BookDashboard.PASS_THRESHOLD, 10);
    var pass = percent >= threshold;

    var resultEl = form.querySelector(".test-result");
    if (resultEl) {
      resultEl.className = "test-result shown " + (pass ? "pass" : "fail");
      var verdict = pass
        ? BookI18n.t("ui.verdict_pass")
        : BookI18n.t("ui.verdict_fail").replace("{threshold}", threshold);
      resultEl.innerHTML =
        '<div class="score">' + percent + "%</div>" +
        '<div class="verdict">' + escapeHtml(verdict) + "</div>";
    }
    var submitBtn = form.querySelector(".submit-test");
    if (submitBtn) submitBtn.disabled = true;
    var retakeBtn = form.querySelector(".retake-btn");
    if (retakeBtn) retakeBtn.hidden = false;

    // Re-render TOC/dashboard to reflect new status.
    BookDashboard.render(BOOK_SLUG, state.lang, state.chapters.map(function (c) {
      return { id: c.id, title: c.title, chapter: c.chapter };
    }), BookI18n);
  }

  function ensureKeyPoints(qEl) {
    if (qEl.getAttribute("data-type") !== "short") return;
    var kpBox = qEl.querySelector(".key-points");
    if (!kpBox || kpBox.querySelector('input[type="checkbox"]')) return;
    var points = JSON.parse(qEl.getAttribute("data-key-points") || "[]");
    points.forEach(function (p, i) {
      var lbl = document.createElement("label");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.setAttribute("data-kp", i);
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode(" " + p));
      kpBox.appendChild(lbl);
    });
  }

  function lockQuestion(qEl) {
    Array.prototype.forEach.call(qEl.querySelectorAll("input, textarea"), function (el) { el.disabled = true; });
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

  // === Wire up global events ===
  document.addEventListener("submit", function (e) {
    if (e.target.classList && e.target.classList.contains("test")) {
      e.preventDefault();
      handleSubmit(e.target);
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

  // === Init ===
  var initialLang = BookI18n && (function () {
    // Inline the detection logic to avoid init-order coupling.
    try {
      var s = localStorage.getItem(BookI18n.STORAGE_LANG_KEY);
      if (s) return s;
    } catch (e) {}
    var u = new URL(location.href);
    return u.searchParams.get("lang") || "en";
  })();

  loadAndRender(initialLang).then(function () {
    if (bootEl) bootEl.style.display = "none";
  }).catch(bootFail);

  // === helpers ===
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  // For attribute values: same escaping, but used inside single or double quotes safely.
  function escAttr(s) { return escapeHtml(s); }
})();
