// i18n.js — locale loader, string lookup, language switching.
// Locales are flat JSON dictionaries in locales/<lang>.json. Same key set across all languages.
(function (global) {
  "use strict";

  var STORAGE_LANG_KEY = "book:lang";
  var SUPPORTED = ["en", "zh"]; // extend as you add locales
  var DEFAULT_LANG = "en";

  var currentLang = DEFAULT_LANG;
  var strings = {}; // flat key -> value for current language

  function detectInitialLang() {
    try {
      var stored = localStorage.getItem(STORAGE_LANG_KEY);
      if (stored && SUPPORTED.indexOf(stored) >= 0) return stored;
    } catch (e) {}
    var url = new URL(global.location.href);
    var q = url.searchParams.get("lang");
    if (q && SUPPORTED.indexOf(q) >= 0) return q;
    // Fall back to browser preference among supported languages.
    if (global.navigator && global.navigator.language) {
      var pref = global.navigator.language.slice(0, 2);
      if (SUPPORTED.indexOf(pref) >= 0) return pref;
    }
    return DEFAULT_LANG;
  }

  // Fetch a locale JSON file. Throws on failure (caller handles).
  function fetchLocale(lang) {
    return fetch("locales/" + lang + ".json", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("locale " + lang + " returned " + r.status);
        return r.json();
      });
  }

  // Initialize for the given language. Returns a Promise resolving to the loaded strings.
  function init(lang) {
    var target = SUPPORTED.indexOf(lang) >= 0 ? lang : DEFAULT_LANG;
    return fetchLocale(target).then(function (s) {
      currentLang = target;
      strings = s || {};
      try { localStorage.setItem(STORAGE_LANG_KEY, target); } catch (e) {}
      return strings;
    });
  }

  // Look up a key. Supports dotted paths. Returns the key itself if missing (makes gaps obvious).
  function t(key, fallback) {
    if (Object.prototype.hasOwnProperty.call(strings, key)) return strings[key];
    return (fallback !== undefined) ? fallback : key;
  }

  function getLang() { return currentLang; }
  function getSupported() { return SUPPORTED.slice(); }

  // Switch language at runtime: reload locale, then call onSwitch so the app re-renders.
  function switchTo(lang, onSwitch) {
    return init(lang).then(function () {
      if (typeof onSwitch === "function") onSwitch(currentLang);
    });
  }

  global.BookI18n = {
    init: init,
    t: t,
    getLang: getLang,
    getSupported: getSupported,
    switchTo: switchTo,
    STORAGE_LANG_KEY: STORAGE_LANG_KEY
  };
})(window);
