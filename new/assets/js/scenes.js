(function () {
  var SVG = "http://www.w3.org/2000/svg";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var roomy = window.matchMedia("(min-width: 52rem) and (min-height: 40rem)");

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seeded(seed) {
    return function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  function el(name, attrs, parent) {
    var node = document.createElementNS(SVG, name);
    Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    parent.appendChild(node);
    return node;
  }

  /* A story as a set of levels. The hand-written one stops after three
     choices and every branch ends on a cap. The open one loops: it grows
     from its first node, zooms into a leaf until that leaf is the first
     node again, and grows once more. */

  function levelsOf(open) {
    var counts = open ? [1, 2, 3, 5, 7, 10, 13] : [1, 2, 4, 8];
    var span = open ? 46 : 92;
    var rand = seeded(open ? 11 : 5);
    return counts.map(function (n, d) {
      var nodes = [];
      for (var i = 0; i < n; i++) {
        var y = n === 1 ? 80 : 12 + (136 * i) / (n - 1);
        if (open && d > 1) y += (rand() - 0.5) * (60 / n);
        nodes.push({ x: 18 + d * span, y: y });
      }
      return nodes.sort(function (a, b) { return a.y - b.y; });
    });
  }

  function closest(level, y) {
    return level.reduce(function (best, node) {
      return Math.abs(node.y - y) < Math.abs(best.y - y) ? node : best;
    });
  }

  function render(parent, levels, open, animate, focus) {
    var lines = el("g", { class: "ln" }, parent);
    var dots = el("g", { class: "dot" }, parent);
    var items = [];
    var focusDot = null;
    var originDot = null;
    var total = 0;
    var last = levels.length - 1;
    var start = open ? 0 : 0.04;
    var step = open ? 0.08 : 0.15;

    levels.forEach(function (nodes, d) {
      nodes.forEach(function (node, i) {
        var t0 = start + Math.max(d - 1, 0) * step;
        if (d > 0) {
          var parents = levels[d - 1];
          var from = parents[Math.min(parents.length - 1, Math.floor((i * parents.length) / nodes.length))];
          var seg = el("path", {
            d: "M" + from.x + " " + from.y + " L" + node.x + " " + node.y,
            pathLength: "1"
          }, lines);
          if (animate) items.push({ node: seg, kind: "line", from: t0, to: t0 + step });
        }
        var at = d === 0 ? 0 : t0 + step;
        if (!open && d === last) {
          var cap = el("rect", { x: node.x - 5, y: node.y - 5, width: 10, height: 10, class: "cap" }, dots);
          if (animate) items.push({ node: cap, kind: "dot", from: at });
        } else {
          var dot = el("circle", {
            cx: node.x, cy: node.y,
            r: Math.max(3, 7 - d),
            class: "node"
          }, dots);
          if (!animate) dot.classList.add("on");
          if (open && node === focus) focusDot = dot;
          if (d === 0) originDot = dot;
          total += 1;
          if (animate) items.push({ node: dot, kind: "dot", from: at, counts: true });
        }
        if (open && d === last && node !== focus) {
          var stub = el("path", {
            d: "M" + node.x + " " + node.y + " l18 " + ((seeded(d * 17 + i + 3)() - 0.5) * 14).toFixed(1),
            pathLength: "1",
            class: "stub"
          }, lines);
          if (animate) items.push({ node: stub, kind: "line", from: at, to: at + 0.08 });
        }
      });
    });
    return { items: items, focusDot: focusDot, originDot: originDot, total: total };
  }

  function buildTree(svg, open) {
    var levels = levelsOf(open);
    if (!open) return { items: render(svg, levels, false, true, null).items };

    var focus = closest(levels[levels.length - 1], 80);
    var origin = levels[0][0];
    var cycle = el("g", { class: "cycle" }, svg);
    var drawn = render(cycle, levels, true, true, focus);
    var fit = Number(drawn.focusDot.getAttribute("r")) / Number(drawn.originDot.getAttribute("r"));
    return {
      items: drawn.items,
      focusDot: drawn.focusDot,
      cycle: cycle,
      total: drawn.total,
      zoom: { focus: focus, origin: origin, fit: fit }
    };
  }

  /* z is 0 at the wide view and 1 when the focus leaf sits on the first
     node, at the first node's size. Everything else has faded by then, so
     the next loop can start from that single dot. */
  function applyZoom(tree, z) {
    var s = tree.zoom.fit;
    var k = 1 + z * (1 / s - 1);
    var rx = tree.zoom.origin.x;
    var ry = tree.zoom.origin.y;
    var tx = tree.zoom.focus.x;
    var ty = tree.zoom.focus.y;
    var fx = (s * rx - tx) / (s - 1);
    var fy = (s * ry - ty) / (s - 1);
    tree.cycle.setAttribute("transform",
      "translate(" + fx.toFixed(2) + " " + fy.toFixed(2) + ") scale(" + k.toFixed(4) +
      ") translate(" + (-fx).toFixed(2) + " " + (-fy).toFixed(2) + ")");
  }

  /* Grow and zoom overlap, and the zoom keeps a steady pace until a short
     landing. Nothing in the loop sits still. */
  function cycleParts(t) {
    var grow = clamp(t / 0.58);
    var u = clamp((t - 0.1) / 0.9);
    var zoom = u < 0.92 ? (u / 0.92) * 0.97 : 0.97 + 0.03 * ((u - 0.92) / 0.08);
    var fade = u < 0.42 ? 1 : clamp(1 - (u - 0.42) / 0.5);
    return { grow: grow, zoom: zoom, fade: fade };
  }

  function paintTree(items, p, fade, focusDot) {
    var shown = 0;
    items.forEach(function (item) {
      if (item.kind === "line") {
        item.node.style.strokeDashoffset = String(1 - clamp((p - item.from) / (item.to - item.from)));
        item.node.style.opacity = fade < 1 ? String(fade) : "";
      } else {
        var on = p >= item.from;
        item.node.classList.toggle("on", on);
        if (on && item.counts) shown += 1;
        if (focusDot) {
          var reveal = clamp((p - item.from) / 0.05 + 1);
          item.node.style.opacity = String(item.node === focusDot ? reveal : reveal * fade);
          item.node.style.scale = String(0.6 + 0.4 * reveal);
        }
      }
    });
    return shown;
  }

  function sceneProgress(scene) {
    var box = scene.getBoundingClientRect();
    var travel = box.height - window.innerHeight;
    return travel > 0 ? clamp(-box.top / travel) : 1;
  }

  /* Every few seconds one word of the headline glitches sideways, as if it
     shifted in transit. Off under reduced motion, where the loop also stops. */
  function shiftTitle() {
    var title = document.querySelector(".shift-title");
    var video = document.querySelector(".screen video");
    if (reduce.matches) {
      if (video) { video.removeAttribute("autoplay"); video.pause(); }
      return;
    }
    if (!title) return;
    Array.prototype.forEach.call(title.children, function (line) {
      line.innerHTML = line.textContent.split(" ").map(function (w) {
        return "<span class=\"w\">" + w + "</span>";
      }).join(" ");
    });
    var words = title.querySelectorAll(".w");
    var rand = seeded(3);
    setInterval(function () {
      if (document.hidden || reduce.matches) return;
      var w = words[Math.floor(rand() * words.length)];
      w.classList.remove("jolt");
      void w.offsetWidth;
      w.classList.add("jolt");
    }, 2600);
  }

  function init() {
    shiftTitle();
    var bench = document.querySelector(".bench-scene");
    var choose = document.querySelector(".choose-scene");
    var frames = bench ? Array.prototype.slice.call(bench.querySelectorAll(".bot-frame")) : [];
    var steps = bench ? Array.prototype.slice.call(bench.querySelectorAll(".build-steps li")) : [];
    var puff = bench && bench.querySelector(".puff");
    var stage = -1;
    var loop = 0;

    function build(i) {
      if (i === stage) return;
      var forward = i > stage;
      stage = i;
      frames.forEach(function (f, k) { f.classList.toggle("on", k === i); });
      steps.forEach(function (s, k) { s.classList.toggle("on", k === i); });
      if (puff && forward && i > 0) {
        puff.classList.remove("go");
        void puff.offsetWidth;
        puff.classList.add("go");
      }
    }

    var trees = Array.prototype.map.call(document.querySelectorAll("[data-tree]"), function (svg) {
      var open = svg.getAttribute("data-tree") === "open";
      var built = buildTree(svg, open);
      built.open = open;
      return built;
    });
    var stamp = choose && choose.querySelector(".stamp");
    var count = choose && choose.querySelector(".count b");
    var openDiagram = choose && choose.querySelector(".side.local .diagram");
    var spinning = false;
    var spinPhase = 0;
    var spinLast = 0;
    var spinRaf = 0;
    var CYCLE = 5.2;

    function paint() {
      var live = root.classList.contains("scenes");

      if (bench && frames.length) {
        if (live) {
          var bp = sceneProgress(bench);
          bench.style.setProperty("--p", bp.toFixed(4));
          build(Math.min(frames.length - 1, Math.floor((bp / 0.85) * frames.length)));
        } else if (!loop) {
          build(frames.length - 1);
        }
      }

      if (choose) {
        var cp = live ? clamp(sceneProgress(choose) / 0.92) : 1;
        if (stamp) stamp.classList.toggle("on", cp >= 0.5);
        trees.forEach(function (tree) {
          if (!tree.open) {
            paintTree(tree.items, cp);
            return;
          }
          var turns = Math.floor(spinPhase);
          var parts = reduce.matches
            ? { grow: 1, zoom: 0, fade: 1 }
            : (spinning ? cycleParts(spinPhase - turns) : { grow: 0, zoom: 0, fade: 1 });
          var shown = paintTree(tree.items, parts.grow, parts.fade, tree.focusDot);
          if (tree.zoom) applyZoom(tree, parts.zoom);
          if (count) count.textContent = String(turns * tree.total + Math.max(shown, 1));
        });
      }
    }

    function spinFrame(now) {
      if (!spinning) { spinRaf = 0; return; }
      var dt = spinLast ? Math.min(0.05, (now - spinLast) / 1000) : 0;
      spinLast = now;
      spinPhase += dt / CYCLE;
      paint();
      spinRaf = requestAnimationFrame(spinFrame);
    }

    function diagramOnScreen() {
      if (!openDiagram) return false;
      var box = openDiagram.getBoundingClientRect();
      return box.top < window.innerHeight * 0.82 && box.bottom > window.innerHeight * 0.18;
    }

    function syncSpin() {
      var allow = diagramOnScreen() && !reduce.matches;
      if (allow && !spinning) {
        spinning = true;
        spinLast = 0;
        if (!spinRaf) spinRaf = requestAnimationFrame(spinFrame);
      } else if (!allow && spinning) {
        spinning = false;
        spinPhase = 0;
      }
    }

    function mode() {
      root.classList.toggle("scenes", roomy.matches && !reduce.matches);
      if (root.classList.contains("scenes")) {
        clearInterval(loop);
        loop = 0;
      }
      syncSpin();
      paint();
    }

    var queued = false;
    function schedule() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        paint();
      });
    }

    /* Narrow screens get no pinned scroll, so the bench plays itself as a
       slow flipbook while it is on screen, and stops when it leaves. */
    if (bench && frames.length && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        clearInterval(loop);
        loop = 0;
        if (entries[0].isIntersecting && !root.classList.contains("scenes") && !reduce.matches) {
          build(0);
          loop = setInterval(function () { build((stage + 1) % frames.length); }, 1700);
        }
      }, { threshold: 0.4 }).observe(bench.querySelector(".bench"));
    }

    window.addEventListener("scroll", function () { syncSpin(); schedule(); }, { passive: true });
    window.addEventListener("resize", schedule);
    if (reduce.addEventListener) {
      reduce.addEventListener("change", mode);
      roomy.addEventListener("change", mode);
    }
    mode();
  }

  document.addEventListener("content:ready", init);
})();
