// scoring.js — pure question scoring. Language-neutral: works on DOM data-* attributes only.
// Three question types: mcq (single or multi-select), fill (one or more blanks), short (self-checked key points).
(function (global) {
  "use strict";

  function normalize(s) {
    return String(s == null ? "" : s).trim().toLowerCase().replace(/\s+/g, " ");
  }

  // Returns a fraction in [0, 1] for the question.
  function scoreQuestion(qEl) {
    var type = qEl.getAttribute("data-type");
    if (type === "mcq") return scoreMcq(qEl);
    if (type === "fill") return scoreFill(qEl);
    if (type === "short") return scoreShort(qEl);
    return 0;
  }

  function scoreMcq(q) {
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

  function scoreFill(q) {
    var accepted = JSON.parse(q.getAttribute("data-accepted") || "[]").map(normalize);
    var fills = q.querySelectorAll("input.fill");
    if (fills.length === 0) return 0;
    if (fills.length === 1) {
      return (accepted.indexOf(normalize(fills[0].value)) >= 0) ? 1 : 0;
    }
    // Multi-blank, order-tolerant: each value must be in accepted, no duplicates, all filled.
    var vals = Array.prototype.map.call(fills, function (f) { return normalize(f.value); });
    if (!vals.every(function (v) { return v.length > 0; })) return 0;
    if (vals.length !== new Set(vals).size) return 0;
    var matched = accepted.filter(function (a) { return vals.indexOf(a) >= 0; });
    return matched.length === vals.length ? 1 : 0;
  }

  function scoreShort(q) {
    var kpBox = q.querySelector(".key-points");
    var checks = kpBox ? kpBox.querySelectorAll('input[type="checkbox"]') : [];
    if (checks.length === 0) return 0;
    var checked = Array.prototype.filter.call(checks, function (c) { return c.checked; }).length;
    return checks.length ? checked / checks.length : 0;
  }

  global.BookScoring = { scoreQuestion: scoreQuestion, normalize: normalize };
})(window);
