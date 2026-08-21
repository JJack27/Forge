/* Knowledge graph — optional index-page module (opt-in via the .kg section
   in index.html; loaded there by <script src="assets/graph.js" defer>).

   Shows the book's core concepts as an interactive graph with two views:
   "progress" (concepts light up as chapter quizzes are passed — reads the
   same localStorage records as the dashboard) and "full" (the complete
   map). Clicking a node lists every chapter section that teaches it,
   deep-linking to the page anchors.

   AUTHORING: everything between the DATA START/END markers below is the
   book-specific part — replace the example nodes, edges, and clusters with
   your book's concepts. The engine underneath is generic; keep it as is.
   See the personal-book-forger skill's references/knowledge-graph.md for
   the authoring pipeline and the verification checklist.

   Rendering prefers Cytoscape.js + fcose, loaded from a CDN by the page
   (pan / zoom / drag out of the box). The book promises to work offline
   from file://, so when the CDN scripts are unavailable this file falls
   back to a small built-in SVG force layout — data, progress logic, side
   panel, and modes are shared by both renderers.

   This file is plain ES5 with no build step. The DATA carries both
   languages ({zh, en} strings); rendering picks strings via
   BOOK_CONFIG.lang, so the file stays byte-identical across the book's
   language folders. Section ids are language-neutral, so one ref list
   serves every edition. */

(function () {
  "use strict";

  var section = document.querySelector(".kg");
  if (!section) return;

  var CFG = Object.assign({ slug: "my-book", lang: "en", chapters: [] }, window.BOOK_CONFIG || {});
  var ZH = String(CFG.lang).toLowerCase().indexOf("zh") === 0;
  function T(obj) { return obj ? (ZH ? (obj.zh || obj.en) : (obj.en || obj.zh)) : ""; }

  // ============================================================
  // ==================== DATA START — author this ==============
  // ============================================================
  // Clusters = concept domains, shown as graph colors and legend chips in
  // "full" view. Keys c1..c4 are pre-wired to the four theme accents in
  // style.css (.kg-node.c1 .dot etc.) — edit the LABELS, keep the keys,
  // or extend both the CSS and CLUSTER_ORDER together.
  var CLUSTERS = {
    c1: { label: { zh: "领域一", en: "Domain one" } },
    c2: { label: { zh: "领域二", en: "Domain two" } },
    c3: { label: { zh: "领域三", en: "Domain three" } },
    c4: { label: { zh: "领域四", en: "Domain four" } }
  };
  var CLUSTER_ORDER = ["c1", "c2", "c3", "c4"];

  // One node per core concept. refs point at real section anchors
  // ({ch, sec}); t is the heading text per language (shown in the side
  // panel). A node SHOULD span several chapters when the concept does —
  // that cross-referencing is the point of the graph. Aim for 25–40
  // nodes and ~1.4× as many edges for a readable layout.
  var NODES = [
    { id: "structure", c: "c1",
      label: { zh: "章节结构", en: "Chapter structure" },
      desc: { zh: "每个章节共用的骨架：锚点小节、回顾、测试。",
              en: "The shared skeleton every chapter follows: anchored sections, recap, test." },
      refs: [
        { ch: 1, sec: "sec-main-concept", t: { zh: "1.1 主要概念", en: "1.1 The main concept" } }
      ] },
    { id: "diagrams", c: "c2",
      label: { zh: "内联 SVG 图", en: "Inline SVG diagrams" },
      desc: { zh: "用画的而不是写的：关系、流程、对比。",
              en: "Relationships, flows, and contrasts — drawn, not described." },
      refs: [
        { ch: 1, sec: "sec-diagrams", t: { zh: "1.2 内联 SVG 图", en: "1.2 Inline SVG diagrams" } }
      ] },
    { id: "demos", c: "c2",
      label: { zh: "Demo 注册表", en: "Demo registry" },
      desc: { zh: "book.js 里的小交互组件，按名字在章节中引用。",
              en: "Small interactive widgets in book.js, referenced by name from chapters." },
      refs: [
        { ch: 1, sec: "sec-demos", t: { zh: "1.3 交互 demo", en: "1.3 Interactive demos" } },
        { ch: 1, sec: "sec-recap", t: { zh: "1.4 回顾", en: "1.4 Recap" } }
      ] }
  ];

  // Concept relations, as [idA, idB] pairs. Curate these by hand — an
  // edge should read as "A is a prerequisite for / part of / enables B".
  var EDGES = [
    ["structure", "diagrams"],
    ["structure", "demos"]
  ];
  // ============================================================
  // ==================== DATA END ==============================
  // ============================================================

  // ============================================================
  // Progress (same localStorage records the dashboard reads)
  // ============================================================
  var chStates = {};          // chapter n -> "pass" | "taken" | "new"
  function chState(n) {
    if (chStates.hasOwnProperty(n)) return chStates[n];
    var rec = null;
    try {
      var v = localStorage.getItem("book:" + CFG.slug + ":" + CFG.lang + ":ch:" + n);
      if (v) rec = JSON.parse(v);
    } catch (e) { /* private mode */ }
    chStates[n] = rec ? (rec.pass ? "pass" : "taken") : "new";
    return chStates[n];
  }
  function frontierChapter() {
    for (var i = 0; i < CFG.chapters.length; i++) {
      var n = CFG.chapters[i].n;
      if (chState(n) !== "pass") return n;
    }
    return null;
  }
  // Node status in progress mode: "learned" | "current" | "new"
  function nodeStatus(node) {
    var seen = false, passedAny = false;
    for (var i = 0; i < node.refs.length; i++) {
      var s = chState(node.refs[i].ch);
      if (s !== "new") seen = true;
      if (s === "pass") passedAny = true;
    }
    return passedAny ? "learned" : (seen ? "current" : "new");
  }

  // ============================================================
  // DOM strings (bilingual UI chrome)
  // ============================================================
  var I = {
    ariaGraph: { zh: "知识图谱", en: "Knowledge graph" },
    hintTitle: { zh: "从一个概念开始", en: "Start from a concept" },
    hintBody: { zh: "点击任意节点，这里会列出讲解它的章节和小节；悬停高亮相邻概念，节点可以拖拽。",
                en: "Click any node to list the chapters and sections that teach it; hover to highlight related concepts; nodes are draggable." },
    appearsIn: { zh: "出现在", en: "Appears in" },
    chapter: { zh: "第", en: "Chapter" },
    stPass: { zh: "已过关", en: "passed" },
    stTaken: { zh: "已测验", en: "taken" },
    stNew: { zh: "未开始", en: "not started" },
    lgLearned: { zh: "已掌握", en: "mastered" },
    lgCurrent: { zh: "学习中", en: "in progress" },
    lgNew: { zh: "待学习", en: "not yet" },
    lgNext: { zh: "下一步", en: "up next" },
    counts: { zh: "个概念", en: "concepts" },
    links: { zh: "条关联", en: "links" },
    offlineNote: { zh: "CDN 渲染不可用，已切换内置渲染", en: "CDN renderer unavailable — using the built-in layout" }
  };

  var stage = section.querySelector(".kg-stage");
  var panel = section.querySelector(".kg-panel");

  // ============================================================
  // Shared state machine: mode, selection, statuses
  // ============================================================
  var mode = "progress";
  try {
    var saved = localStorage.getItem("book:" + CFG.slug + ":graph-mode");
    if (saved === "full" || saved === "progress") mode = saved;
  } catch (e) { /* private mode */ }

  var selected = null;        // node id
  var renderer = null;        // set below

  function nodeById(id) {
    for (var i = 0; i < NODES.length; i++) if (NODES[i].id === id) return NODES[i];
    return null;
  }

  function select(id) {
    selected = id;
    renderer.setSelected(id);
    renderPanel();
  }

  function applyAll() {
    var frontier = (mode === "progress") ? frontierChapter() : null;
    var statuses = {}, nextIds = {};
    NODES.forEach(function (d) { statuses[d.id] = mode === "full" ? "learned" : nodeStatus(d); });
    if (frontier !== null) {
      NODES.forEach(function (d) {
        for (var i = 0; i < d.refs.length; i++) if (d.refs[i].ch === frontier) nextIds[d.id] = true;
      });
    }
    var lit = {};
    EDGES.forEach(function (p) {
      lit[p[0] + "\u0000" + p[1]] = mode === "full" ||
        (statuses[p[0]] === "learned" && statuses[p[1]] === "learned");
    });
    renderer.applyStates(statuses, nextIds, lit, frontier !== null);
    renderLegend(frontier);
    if (selected) renderPanel();
  }

  // ============================================================
  // Side panel + legend (shared by both renderers)
  // ============================================================
  function chTitle(n) {
    var d = (window.CHAPTER_DESCS || {})[n];
    return d ? d.title : (ZH ? "第 " + n + " 章" : "Chapter " + n);
  }
  function chSlug(n) {
    for (var i = 0; i < CFG.chapters.length; i++) {
      if (CFG.chapters[i].n === n) return CFG.chapters[i].slug;
    }
    return "";
  }
  function statusWord(s) { return s === "pass" ? T(I.stPass) : (s === "taken" ? T(I.stTaken) : T(I.stNew)); }

  function renderPanel() {
    var d = selected ? nodeById(selected) : null;
    if (!d) {
      var clusterChips = CLUSTER_ORDER.map(function (c) {
        return '<span class="kg-chip c-' + c + '">' + T(CLUSTERS[c].label) + "</span>";
      }).join("");
      panel.innerHTML =
        '<div class="kg-panel-hint">' +
        "<h3>" + T(I.hintTitle) + "</h3>" +
        "<p>" + T(I.hintBody) + "</p>" +
        '<div class="kg-chips">' + clusterChips + "</div>" +
        '<div class="kg-counts">' + NODES.length + " " + T(I.counts) + " · " + EDGES.length + " " + T(I.links) + "</div>" +
        "</div>";
      return;
    }
    var refs = d.refs.slice().sort(function (a, b) { return a.ch - b.ch; });
    var html = "";
    for (var i = 0; i < refs.length; i++) {
      var r = refs[i];
      if (i === 0 || refs[i - 1].ch !== r.ch) {
        if (i > 0) html += "</div>";
        var st = chState(r.ch);
        html +=
          '<div class="kg-ref-group">' +
          '<div class="kg-ref-head"><span class="dot ' + (st === "pass" ? "pass" : st === "taken" ? "fail" : "") + '"></span>' +
          "<strong>" + (ZH ? "第 " + r.ch + " 章" : "Chapter " + r.ch) + " · " + chTitle(r.ch) + "</strong>" +
          '<span class="kg-ref-state">' + statusWord(st) + "</span></div>";
      }
      html += '<a class="kg-ref" href="' + chSlug(r.ch) + ".html#" + r.sec + '">' + T(r.t) + "</a>";
    }
    if (refs.length) html += "</div>";
    panel.innerHTML =
      '<div class="kg-node-head">' +
      '<span class="kg-chip c-' + d.c + '">' + T(CLUSTERS[d.c].label) + "</span>" +
      "<h3>" + T(d.label) + "</h3>" +
      "</div>" +
      '<p class="kg-desc">' + T(d.desc) + "</p>" +
      '<div class="kg-refs-title">' + T(I.appearsIn) + "</div>" +
      html;
  }

  function renderLegend(frontier) {
    var lg = section.querySelector(".kg-legend");
    if (!lg) return;
    var html = "";
    if (mode === "progress") {
      html +=
        '<span class="kg-lg"><i class="sw learned"></i>' + T(I.lgLearned) + "</span>" +
        '<span class="kg-lg"><i class="sw current"></i>' + T(I.lgCurrent) + "</span>" +
        '<span class="kg-lg"><i class="sw new"></i>' + T(I.lgNew) + "</span>" +
        (frontier !== null ? '<span class="kg-lg"><i class="sw next"></i>' + T(I.lgNext) + "</span>" : "");
    } else {
      CLUSTER_ORDER.forEach(function (c) {
        html += '<span class="kg-lg"><i class="sw c-' + c + '"></i>' + T(CLUSTERS[c].label) + "</span>";
      });
    }
    lg.innerHTML = html;
  }

  // ============================================================
  // RENDERER A — Cytoscape.js (CDN). Colors are read from the
  // page's CSS variables, and re-applied when the theme flips.
  // ============================================================
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function cytoStyle() {
    var v = {
      accent: cssVar("--accent"), accent2: cssVar("--accent-2"),
      pass: cssVar("--pass"), warn: cssVar("--warn"),
      fg: cssVar("--fg"), fgDim: cssVar("--fg-dim"), muted: cssVar("--muted"),
      border: cssVar("--border"), bg: cssVar("--code-bg")
    };
    return [
      { selector: "node",
        style: {
          label: "data(label)", "font-size": 11, color: v.fgDim,
          "text-valign": "bottom", "text-margin-y": 7, "text-background-color": v.bg,
          "text-background-opacity": 1, "text-background-padding": 2, "text-background-shape": "rectangle",
          "background-opacity": 0.16, "border-width": 1.6, "border-style": "solid",
          width: "data(size)", height: "data(size)",
          "transition-property": "border-width border-color background-opacity opacity line-color color",
          "transition-duration": 250
        } },
      { selector: "node.c1", style: { "background-color": v.accent, "border-color": v.accent } },
      { selector: "node.c2", style: { "background-color": v.accent2, "border-color": v.accent2 } },
      { selector: "node.c3", style: { "background-color": v.pass, "border-color": v.pass } },
      { selector: "node.c4", style: { "background-color": v.warn, "border-color": v.warn } },
      { selector: "node.st-current", style: { "border-style": "dashed", "background-opacity": 0.06 } },
      { selector: "node.st-new",
        style: { "border-color": v.border, "border-style": "dashed", "background-opacity": 0,
                 color: v.muted, opacity: 0.6 } },
      { selector: "node.pulse", style: { "border-width": 4 } },
      { selector: "node:selected", style: { "border-width": 3, color: v.fg, "font-weight": "bold" } },
      { selector: "node.dimmed", style: { opacity: 0.12 } },
      { selector: "node.adjacent", style: { color: v.fg } },
      { selector: "edge",
        style: { "line-color": v.border, width: 1.2, "curve-style": "bezier",
                 "transition-property": "line-color opacity", "transition-duration": 250 } },
      { selector: "edge.lit", style: { "line-color": v.accent, opacity: 0.55 } },
      { selector: "edge.dimmed", style: { opacity: 0.08 } }
    ];
  }

  function cytoRenderer() {
    var degrees = {};
    EDGES.forEach(function (p) { degrees[p[0]] = (degrees[p[0]] || 0) + 1; degrees[p[1]] = (degrees[p[1]] || 0) + 1; });
    var elements = NODES.map(function (d) {
      var size = Math.round(2 * (10 + Math.min(degrees[d.id] || 0, 6) * 1.4));
      return { data: { id: d.id, label: T(d.label), size: size }, classes: "c-" + d.c };
    }).concat(EDGES.map(function (p) {
      return { data: { id: p[0] + "~" + p[1], source: p[0], target: p[1] } };
    }));

    var cy = window.cytoscape({
      container: stage, elements: elements, style: cytoStyle(),
      layout: { name: "grid" }     // placeholder until fcose runs below
    });
    section._kgCy = cy;            // debug handle (canvas has no DOM to inspect)

    // fcose (bundled with the CDN <script> tags) gives the nicest
    // layout; fall back to the built-in cose if the plugin is missing.
    try {
      cy.layout({
        name: "fcose", quality: "proof", animate: true, animationDuration: 900,
        nodeSeparation: 95, idealEdgeLength: 120, nodeDimensionsIncludeLabels: true,
        packComponents: true, padding: 30
      }).run();
    } catch (e) {
      cy.layout({ name: "cose", animate: true, nodeOverlap: 24, idealEdgeLength: 120, padding: 30 }).run();
    }

    var pulseTimer = 0, pulseOn = false;

    cy.on("tap", "node", function (e) { select(e.target.id()); });
    cy.on("tap", function (e) { if (e.target === cy) select(null); });
    cy.on("mouseover", "node", function (e) {
      var near = e.target.closedNeighborhood();
      cy.elements().not(near).addClass("dimmed");
      near.filter("node").not(e.target).addClass("adjacent");
    });
    cy.on("mouseout", "node", function () {
      cy.elements().removeClass("dimmed adjacent");
    });

    return {
      isCytoscape: true,
      applyStates: function (statuses, nextIds, lit, hasFrontier) {
        clearInterval(pulseTimer);
        pulseOn = false;
        cy.batch(function () {
          cy.nodes().forEach(function (n) {
            var id = n.id();
            n.removeClass("st-learned st-current st-new pulse");
            n.addClass("st-" + statuses[id]);
          });
          cy.edges().forEach(function (e) {
            var k = e.data("source") + "\u0000" + e.data("target");
            e.toggleClass("lit", !!lit[k]);
          });
        });
        var nextNodes = cy.nodes().filter(function (n) { return !!nextIds[n.id()]; });
        if (hasFrontier && nextNodes.length) {
          pulseTimer = setInterval(function () {   // CSS can't loop styles here, so toggle a class
            pulseOn = !pulseOn;
            nextNodes.toggleClass("pulse", pulseOn);
          }, 850);
        }
      },
      setSelected: function (id) { /* handled by cytoscape :selected + tap */ },
      restyleTheme: function () { cy.style(cytoStyle()); }
    };
  }

  // ============================================================
  // RENDERER B — built-in SVG force layout (offline fallback).
  // Deterministic (seeded), so all language editions render the same
  // shape; nodes are draggable and hover-focusable.
  // ============================================================
  function svgRenderer() {
    var note = document.createElement("div");
    note.className = "kg-offline-note";
    note.textContent = T(I.offlineNote);
    stage.appendChild(note);

    var W = 960, H = 640;
    var seed = 42;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

    var nodes = NODES.map(function (d) {
      var ci = CLUSTER_ORDER.indexOf(d.c);
      var base = -Math.PI / 2 + ci * (2 * Math.PI / CLUSTER_ORDER.length);   // one wedge per cluster
      var ang = base + (rnd() - 0.5) * 1.1;
      var rad = 120 + rnd() * 150;
      return { d: d, x: W / 2 + Math.cos(ang) * rad, y: H / 2 + Math.sin(ang) * rad,
               vx: 0, vy: 0, deg: 0, fixed: false };
    });
    var anchors = {};
    CLUSTER_ORDER.forEach(function (c, i) {
      var a = -Math.PI / 2 + i * (2 * Math.PI / CLUSTER_ORDER.length);
      anchors[c] = { x: W / 2 + Math.cos(a) * 215, y: H / 2 + Math.sin(a) * 215 };
    });
    var byId = {};
    nodes.forEach(function (n) { byId[n.d.id] = n; });
    var edges = EDGES.map(function (pair) {
      var a = byId[pair[0]], b = byId[pair[1]];
      a.deg++; b.deg++;
      return { a: a, b: b };
    });

    var alpha = 1, running = false;

    function step() {
      var i, j, n, m, dx, dy, d2, f, dl;
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          m = nodes[j];
          dx = n.x - m.x; dy = n.y - m.y;
          d2 = dx * dx + dy * dy;
          if (d2 < 1) { d2 = 1; dx = 0.5; dy = 0.4; }
          dl = Math.sqrt(d2);
          f = Math.min(9000 / d2, 8) * alpha;
          dx /= dl; dy /= dl;
          n.vx += dx * f; n.vy += dy * f;
          m.vx -= dx * f; m.vy -= dy * f;
        }
      }
      for (i = 0; i < edges.length; i++) {
        var e = edges[i];
        dx = e.b.x - e.a.x; dy = e.b.y - e.a.y;
        var dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        f = (dist - 135) * 0.05 * alpha;
        dx /= dist; dy /= dist;
        e.a.vx += dx * f; e.a.vy += dy * f;
        e.b.vx -= dx * f; e.b.vy -= dy * f;
      }
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        var an = anchors[n.d.c];
        n.vx += (W / 2 - n.x) * 0.0025 * alpha;
        n.vy += (H / 2 - n.y) * 0.0025 * alpha;
        n.vx += (an.x - n.x) * 0.012 * alpha;
        n.vy += (an.y - n.y) * 0.012 * alpha;
        if (n.fixed) { n.vx = 0; n.vy = 0; continue; }
        n.vx *= 0.85; n.vy *= 0.85;
        n.vx = Math.max(-14, Math.min(14, n.vx));
        n.vy = Math.max(-14, Math.min(14, n.vy));
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(46, Math.min(W - 46, n.x));
        n.y = Math.max(40, Math.min(H - 52, n.y));
      }
      alpha *= 0.982;
    }

    var SVGNS = "http://www.w3.org/2000/svg";
    function el(tag, cls, attrs) {
      var e = document.createElementNS(SVGNS, tag);
      if (cls) e.setAttribute("class", cls);
      for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
      return e;
    }

    var svg = el("svg", "kg-svg", { viewBox: "0 0 " + W + " " + H,
      "aria-label": T(I.ariaGraph), role: "img" });
    var edgeLayer = el("g", "kg-edges");
    var nodeLayer = el("g", "kg-nodes");
    svg.appendChild(edgeLayer);
    svg.appendChild(nodeLayer);
    stage.appendChild(svg);

    edges.forEach(function (e) {
      e.line = el("line", "kg-edge", { "data-a": e.a.d.id, "data-b": e.b.d.id });
      edgeLayer.appendChild(e.line);
    });
    nodes.forEach(function (n) {
      var r = 10 + Math.min(n.deg, 6) * 1.3;
      n.r = r;
      var g = el("g", "kg-node c-" + n.d.c, {
        "data-id": n.d.id, tabindex: "0", role: "button",
        "aria-label": T(n.d.label)
      });
      n.halo = el("circle", "halo", { r: r + 7 });
      n.dot = el("circle", "dot", { r: r });
      n.label = el("text", null, { "text-anchor": "middle", y: r + 15 });
      n.label.textContent = T(n.d.label);
      g.appendChild(n.halo);
      g.appendChild(n.dot);
      g.appendChild(n.label);
      n.g = g;
      nodeLayer.appendChild(g);
    });

    function draw() {
      edges.forEach(function (e) {
        e.line.setAttribute("x1", e.a.x); e.line.setAttribute("y1", e.a.y);
        e.line.setAttribute("x2", e.b.x); e.line.setAttribute("y2", e.b.y);
      });
      nodes.forEach(function (n) {
        n.g.setAttribute("transform", "translate(" + n.x + "," + n.y + ")");
      });
    }
    function tick() {
      step(); step();
      draw();
      if (alpha > 0.03) requestAnimationFrame(tick);
      else running = false;
    }
    function reheat(a) {
      alpha = Math.max(alpha, a);
      if (!running) { running = true; requestAnimationFrame(tick); }
    }
    reheat(1);

    function setHover(id) {
      if (!id) {
        svg.classList.remove("focusing");
        nodes.forEach(function (n) { n.g.classList.remove("dimmed", "adjacent"); });
        edges.forEach(function (e) { e.line.classList.remove("dimmed"); });
        return;
      }
      var near = {};
      near[id] = true;
      edges.forEach(function (e) {
        if (e.a.d.id === id) near[e.b.d.id] = true;
        else if (e.b.d.id === id) near[e.a.d.id] = true;
      });
      svg.classList.add("focusing");
      nodes.forEach(function (n) {
        n.g.classList.toggle("dimmed", !near[n.d.id]);
        n.g.classList.toggle("adjacent", near[n.d.id] && n.d.id !== id);
      });
      edges.forEach(function (e) {
        e.line.classList.toggle("dimmed", e.a.d.id !== id && e.b.d.id !== id);
      });
    }

    var dragNode = null, dragMoved = false, lastPtr = null;
    var pt = svg.createSVGPoint();
    function toSvg(evt) {
      pt.x = evt.clientX; pt.y = evt.clientY;
      var ctm = svg.getScreenCTM();
      return ctm ? pt.matrixTransform(ctm.inverse()) : null;
    }
    nodeLayer.addEventListener("pointerdown", function (e) {
      var g = e.target.closest ? e.target.closest(".kg-node") : null;
      if (!g) return;
      dragNode = byId[g.getAttribute("data-id")];
      dragMoved = false;
      lastPtr = { x: e.clientX, y: e.clientY };
      try { g.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    svg.addEventListener("pointermove", function (e) {
      if (!dragNode) return;
      if (Math.abs(e.clientX - lastPtr.x) + Math.abs(e.clientY - lastPtr.y) > 3) dragMoved = true;
      if (!dragMoved) return;
      var p = toSvg(e);
      if (!p) return;
      dragNode.x = Math.max(30, Math.min(W - 30, p.x));
      dragNode.y = Math.max(30, Math.min(H - 30, p.y));
      dragNode.fixed = true;
      reheat(0.45);
    });
    svg.addEventListener("pointerup", function () {
      if (!dragNode) return;
      dragNode.fixed = false;
      if (!dragMoved) select(dragNode.d.id);
      else reheat(0.3);
      dragNode = null;
    });
    svg.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".kg-node")) return;
      select(null);
    });
    nodes.forEach(function (n) {
      n.g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(n.d.id); }
      });
      n.g.addEventListener("pointerenter", function () { setHover(n.d.id); });
      n.g.addEventListener("pointerleave", function () { setHover(null); });
    });

    return {
      isCytoscape: false,
      applyStates: function (statuses, nextIds, lit) {
        nodes.forEach(function (n) {
          n.g.classList.toggle("st-learned", statuses[n.d.id] === "learned");
          n.g.classList.toggle("st-current", statuses[n.d.id] === "current");
          n.g.classList.toggle("st-new", statuses[n.d.id] === "new");
          n.g.classList.toggle("is-next", !!nextIds[n.d.id]);
        });
        edges.forEach(function (e) {
          var k = e.a.d.id + "\u0000" + e.b.d.id;
          e.line.classList.toggle("lit", !!lit[k]);
        });
      },
      setSelected: function (id) {
        nodes.forEach(function (n) {
          n.g.classList.toggle("selected", n.d.id === id);
        });
      },
      restyleTheme: function () { /* SVG renderer colors come from CSS vars */ }
    };
  }

  // ============================================================
  // Boot: prefer Cytoscape when its CDN scripts arrived; otherwise
  // fall back to the built-in renderer so the page still works
  // offline from file://.
  // ============================================================
  renderer = (typeof window.cytoscape === "function") ? cytoRenderer() : svgRenderer();

  // Re-apply palette colors when the theme flips (the SVG fallback
  // uses CSS variables and restyles itself).
  if (renderer.isCytoscape && typeof MutationObserver !== "undefined") {
    try {
      new MutationObserver(function () { renderer.restyleTheme(); })
        .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    } catch (e) { /* observer unsupported */ }
  }

  var buttons = section.querySelectorAll(".kg-toggle button");
  function syncToggle() {
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].getAttribute("data-mode") === mode;
      buttons[i].classList.toggle("active", on);
      buttons[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
  }
  for (var bi = 0; bi < buttons.length; bi++) {
    buttons[bi].addEventListener("click", function () {
      mode = this.getAttribute("data-mode");
      try { localStorage.setItem("book:" + CFG.slug + ":graph-mode", mode); } catch (e) {}
      syncToggle();
      applyAll();
    });
  }

  // Live update: passing a quiz in another tab fires a storage event.
  window.addEventListener("storage", function (e) {
    if (e.key && e.key.indexOf("book:" + CFG.slug + ":" + CFG.lang + ":ch:") === 0) {
      chStates = {};
      applyAll();
    }
  });

  syncToggle();
  applyAll();
  renderPanel();
})();
