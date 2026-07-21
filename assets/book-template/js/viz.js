// viz.js — runner for chapter visualizations.
//
// Each visualization is raw D3 code stored as a string in the chapter JSON:
//   { type: "diagram"|"chart"|"simulation", slug, code, caption? }
// The `code` is run as `new Function(code).call(container, d3, helpers)`.
//
// Interactive test questions use the same mechanism, with an additional `check`
// string that scores the learner's interaction at submit time:
//   { type: "interactive", code, check }  // check -> (container) => {passed, earned}
//
// All viz code is authored by the skill (the LLM), so it's trusted-by-construction.
// Errors are isolated: a throwing viz shows a styled error placeholder, never breaks
// the rest of the book.
(function (global) {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // Build the helpers object passed to each viz's code.
  // `ctx` carries: { lang, t } where t is the i18n lookup function.
  function makeHelpers(ctx) {
    return {
      // i18n lookup — labels localize per language without touching the viz code.
      t: function (key, fallback) { return ctx.t ? ctx.t(key, fallback) : (fallback != null ? fallback : key); },
      // Current language code (e.g. "en", "zh").
      get lang() { return ctx.lang || "en"; },
      // Namespace-safe SVG element creator (avoids createElementNS boilerplate).
      svg: function (tagName, attrs) {
        var el = document.createElementNS(SVG_NS, tagName);
        if (attrs) {
          for (var k in attrs) {
            if (Object.prototype.hasOwnProperty.call(attrs, k)) el.setAttribute(k, attrs[k]);
          }
        }
        return el;
      },
      // Empty the container (for clean re-mounts on language switch).
      clear: function (container) {
        while (container.firstChild) container.removeChild(container.firstChild);
      }
    };
  }

  // Compile a code string into a function. Throws on syntax errors — caller handles.
  function compile(code) {
    // The code runs with `this` = container, args = (d3, helpers).
    // A leading "use strict" is added to keep behavior consistent across engines.
    return new Function("d3", "helpers", '"use strict";\n' + code);
  }

  // Mount a viz spec into a container. Renders an error placeholder on failure.
  // Returns true on success, false if it errored (so callers can count/track).
  function mountViz(container, spec, ctx) {
    if (!container) return false;
    var helpers = makeHelpers(ctx);

    // Reset the container to a clean state.
    container.className = "viz-container";
    container.innerHTML = "";

    // Compile (syntax-check) the code up front so we can report parse errors clearly.
    var compiled;
    try {
      compiled = compile(spec.code);
    } catch (parseErr) {
      renderError(container, spec.slug, "Failed to parse viz code: " + parseErr.message);
      return false;
    }

    // Run it.
    try {
      compiled.call(container, global.d3, helpers);
    } catch (runErr) {
      renderError(container, spec.slug, "Viz threw while rendering: " + runErr.message);
      return false;
    }

    // Optional caption beneath the viz.
    if (spec.caption) {
      var cap = document.createElement("div");
      cap.className = "viz-caption";
      cap.textContent = typeof spec.caption === "string" ? spec.caption : (helpers.t(spec.caption) || "");
      container.appendChild(cap);
    }
    return true;
  }

  // Score an interactive question by running its `check` code against the container.
  // Returns { passed: bool, earned: 0|1 }. On error, returns earned=0 (no crash).
  function runInteractiveCheck(container, spec, ctx) {
    var helpers = makeHelpers(ctx);
    if (!spec.check) return { passed: false, earned: 0 };
    try {
      var checkFn = new Function("d3", "helpers", '"use strict";\n' + spec.check);
      var result = checkFn.call(container, global.d3, helpers);
      if (result && typeof result === "object") {
        var earned = result.earned != null ? result.earned : (result.passed ? 1 : 0);
        return { passed: !!result.passed, earned: earned };
      }
      return { passed: false, earned: 0 };
    } catch (e) {
      // A failing check shouldn't break test scoring — treat as 0.
      try { console && console.warn && console.warn("interactive check failed:", e.message); } catch (_) {}
      return { passed: false, earned: 0 };
    }
  }

  function renderError(container, slug, msg) {
    container.className = "viz-container viz-error";
    container.innerHTML = "";
    var head = document.createElement("strong");
    head.textContent = "Visualization failed to render";
    if (slug) head.textContent += " (" + slug + ")";
    var detail = document.createElement("div");
    detail.className = "viz-error-detail";
    detail.textContent = msg;
    container.appendChild(head);
    container.appendChild(detail);
  }

  global.BookViz = {
    mountViz: mountViz,
    runInteractiveCheck: runInteractiveCheck,
    makeHelpers: makeHelpers
  };
})(window);
