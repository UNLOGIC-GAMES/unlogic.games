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
     choices and every branch ends on a cap. The open one stays inside its
     frame: it grows, the paths you did not take dissolve where they are,
     and the chosen node glides home to become the first node again. */

  function levelsOf(open) {
    if (!open) {
      var closed = [1, 2, 4, 8];
      return closed.map(function (n, d) {
        var nodes = [];
        for (var i = 0; i < n; i++) {
          var y = n === 1 ? 80 : 12 + (136 * i) / (n - 1);
          nodes.push({ x: 18 + d * 92, y: y, d: d });
        }
        return nodes.sort(function (a, b) { return a.y - b.y; });
      });
    }

    var counts = [1, 2, 3, 4, 6, 8];
    var rand = seeded(11);
    var x0 = 119;
    var x1 = 639;
    var top = 54;
    var bot = 246;
    var span = (x1 - x0) / (counts.length - 1);
    var levels = counts.map(function (n, d) {
      var nodes = [];
      for (var i = 0; i < n; i++) {
        var y = n === 1 ? (top + bot) / 2 : top + ((bot - top) * i) / (n - 1);
        if (d > 1) y += (rand() - 0.5) * Math.min(16, (bot - top) / n);
        if (y < top) y = top;
        if (y > bot) y = bot;
        nodes.push({ x: x0 + d * span, y: y, d: d });
      }
      nodes.sort(function (a, b) { return a.y - b.y; });
      return nodes;
    });
    for (var d = 1; d < levels.length; d++) {
      var parents = levels[d - 1];
      levels[d].forEach(function (node, i) {
        node.parent = parents[Math.min(parents.length - 1, Math.floor((i * parents.length) / nodeParentCount(levels[d])))];
      });
    }
    return levels;
  }

  function nodeParentCount(nodes) { return nodes.length; }

  function closest(level, y) {
    return level.reduce(function (best, node) {
      return Math.abs(node.y - y) < Math.abs(best.y - y) ? node : best;
    });
  }

  function radiusAt(d) { return Math.max(4.6, 12.5 - d * 1.5); }

  function curve(a, b) {
    var dx = b.x - a.x;
    return "M" + a.x.toFixed(1) + " " + a.y.toFixed(1) +
      "C" + (a.x + dx * 0.62).toFixed(1) + " " + a.y.toFixed(1) +
      " " + (a.x + dx * 0.38).toFixed(1) + " " + b.y.toFixed(1) +
      " " + b.x.toFixed(1) + " " + b.y.toFixed(1);
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
    var step = open ? 0.07 : 0.15;

    levels.forEach(function (nodes, d) {
      nodes.forEach(function (node, i) {
        var t0 = start + Math.max(d - 1, 0) * step;
        var from = node.parent;
        if (!from && d > 0) {
          var parents = levels[d - 1];
          from = parents[Math.min(parents.length - 1, Math.floor((i * parents.length) / nodes.length))];
        }
        if (from) {
          var seg = el("path", {
            d: open ? curve(from, node) : ("M" + from.x + " " + from.y + " L" + node.x + " " + node.y),
            pathLength: "1",
            class: open && from.spine && node.spine ? "spine" : ""
          }, lines);
          if (animate) items.push({ node: seg, kind: "line", from: t0, to: t0 + step, spine: !!(from.spine && node.spine), x: node.x });
        }
        var at = d === 0 ? 0 : t0 + step;
        if (!open && d === last) {
          var cap = el("rect", { x: node.x - 5, y: node.y - 5, width: 10, height: 10, class: "cap" }, dots);
          if (animate) items.push({ node: cap, kind: "dot", from: at });
        } else if (open) {
          var r = radiusAt(d);
          var g = el("g", { class: "node-g" + (node.spine ? " spine" : "") + (node === focus ? " focus" : "") }, dots);
          el("circle", { cx: node.x, cy: node.y, r: (r * 2.15).toFixed(2), "data-r": (r * 2.15).toFixed(2), class: "halo" }, g);
          el("circle", { cx: node.x, cy: node.y, r: r.toFixed(2), "data-r": r.toFixed(2), class: "core" }, g);
          el("circle", { cx: node.x, cy: node.y, r: (r * 0.4).toFixed(2), "data-r": (r * 0.4).toFixed(2), class: "pupil" }, g);
          if (node === focus) focusDot = g;
          if (d === 0) originDot = g;
          total += 1;
          if (animate) items.push({ node: g, kind: "dot", from: at, counts: true, spine: !!node.spine, x: node.x, y: node.y, r: r });
        } else {
          var dot = el("circle", {
            cx: node.x, cy: node.y,
            r: Math.max(3, 7 - d),
            class: "node"
          }, dots);
          if (!animate) dot.classList.add("on");
          total += 1;
          if (animate) items.push({ node: dot, kind: "dot", from: at, counts: true });
        }
        if (open && d === last && node !== focus) {
          var drift = (seeded(d * 17 + i + 3)() - 0.5) * 18;
          var tip = { x: node.x + 30, y: node.y + drift };
          var stub = el("path", {
            d: curve(node, tip),
            pathLength: "1",
            class: "stub"
          }, lines);
          if (animate) items.push({ node: stub, kind: "line", from: at, to: at + 0.07, spine: false });
        }
      });
    });
    return { items: items, focusDot: focusDot, originDot: originDot, total: total };
  }

  function buildTree(svg, open) {
    var levels = levelsOf(open);
    if (!open) return { items: render(svg, levels, false, true, null).items, open: false };

    var focus = closest(levels[levels.length - 1], 150);
    var walk = focus;
    while (walk) { walk.spine = true; walk = walk.parent; }
    var origin = levels[0][0];
    var cycle = el("g", { class: "cycle" }, svg);
    var drawn = render(cycle, levels, true, true, focus);
    var ring = el("circle", { class: "dive", cx: focus.x, cy: focus.y, r: "12" }, cycle);
    return {
      items: drawn.items,
      focusDot: drawn.focusDot,
      originDot: drawn.originDot,
      total: drawn.total,
      open: true,
      ring: ring,
      zoom: { focus: focus, origin: origin, fit: radiusAt(focus.d) / radiusAt(0) }
    };
  }

  /* The tree never scales as a camera. Side paths fade where they stand,
     the chosen node grows as it glides back to the root, and the next
     loop starts on that same dot. */
  function glide(u) {
    return u < 0.84 ? (u / 0.84) * 0.92 : 0.92 + 0.08 * ((u - 0.84) / 0.16);
  }

  function cycleParts(t) {
    var grow = clamp(t / 0.42);
    var side = t < 0.28 ? 1 : clamp(1 - (t - 0.28) / 0.16);
    var travel = t < 0.40 ? 0 : glide(clamp((t - 0.40) / 0.60));
    return { grow: grow, side: side, spine: 1, travel: travel };
  }

  function moveFocus(g, x, y, scale) {
    for (var i = 0; i < g.childNodes.length; i++) {
      var c = g.childNodes[i];
      c.setAttribute("cx", x.toFixed(2));
      c.setAttribute("cy", y.toFixed(2));
      c.setAttribute("r", (Number(c.getAttribute("data-r")) * scale).toFixed(2));
    }
  }

  function placeNode(node, x, y, cx, cy, scale) {
    node.setAttribute("transform",
      "translate(" + x.toFixed(2) + " " + y.toFixed(2) + ") scale(" + scale.toFixed(4) +
      ") translate(" + (-cx).toFixed(2) + " " + (-cy).toFixed(2) + ")");
  }

  function paintTree(tree, p, parts) {
    var items = tree.items;
    var focusDot = tree.focusDot;
    var side = parts && parts.side != null ? parts.side : 1;
    var travel = parts && parts.travel ? parts.travel : 0;
    var f = tree.zoom && tree.zoom.focus;
    var o = tree.zoom && tree.zoom.origin;
    var span = f && o ? (f.x - o.x) || 1 : 1;
    function behind(x) {
      if (travel <= 0 || !f) return 1;
      var at = clamp((f.x - x) / span);
      return clamp(1 - (travel - (at - 0.12)) / 0.16);
    }
    var shown = 0;
    items.forEach(function (item) {
      if (item.kind === "line") {
        var draw = clamp((p - item.from) / (item.to - item.from));
        var dim = item.spine ? behind(item.x) : side;
        item.node.style.strokeDashoffset = String(1 - draw);
        item.node.style.opacity = String(draw <= 0 ? 0 : dim);
      } else {
        var reveal = clamp((p - item.from) / 0.06 + 1);
        var dotDim = item.node === focusDot ? 1 : (item.spine ? behind(item.x) : side);
        item.node.classList.toggle("on", reveal > 0);
        item.node.style.opacity = String(reveal * dotDim);
        if (item.x != null && item.node !== focusDot) {
          placeNode(item.node, item.x, item.y, item.x, item.y, 0.55 + 0.45 * reveal);
        }
        if (reveal > 0 && item.counts) shown += 1;
      }
    });
    if (focusDot && tree.zoom) {
      var x = f.x + (o.x - f.x) * travel;
      var y = f.y + (o.y - f.y) * travel;
      var born = 0;
      items.forEach(function (item) {
        if (item.node === focusDot) born = clamp((p - item.from) / 0.06 + 1);
      });
      var scale = (0.55 + 0.45 * born) * (1 + travel * (1 / tree.zoom.fit - 1));
      focusDot.removeAttribute("transform");
      moveFocus(focusDot, x, y, scale);
      if (tree.ring) {
        var pulse = Math.sin(Math.min(travel, 1) * Math.PI);
        tree.ring.setAttribute("cx", x.toFixed(2));
        tree.ring.setAttribute("cy", y.toFixed(2));
        tree.ring.setAttribute("r", (16 + 18 * pulse).toFixed(2));
        tree.ring.style.opacity = String(0.55 * pulse * born);
      }
    }
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
    var CYCLE = 6.2;

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
            paintTree(tree, cp, null);
            return;
          }
          var turns = Math.floor(spinPhase);
          var parts = reduce.matches
            ? { grow: 1, side: 1, spine: 1, travel: 0 }
            : (spinning ? cycleParts(spinPhase - turns) : { grow: 0, side: 1, spine: 1, travel: 0 });
          var shown = paintTree(tree, parts.grow, parts);
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
