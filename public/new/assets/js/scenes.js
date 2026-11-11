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
          if (animate) items.push({
            node: seg, kind: "line", from: t0, to: t0 + step,
            spine: !!(from.spine && node.spine), x: node.x,
            x1: from.x, y1: from.y, x2: node.x, y2: node.y
          });
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
          if (animate) items.push({
            node: stub, kind: "line", from: at, to: at + 0.07, spine: false,
            x1: node.x, y1: node.y, x2: tip.x, y2: tip.y
          });
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
    var fit = radiusAt(focus.d) / radiusAt(0);
    var fx = (fit * origin.x - focus.x) / (fit - 1);
    var fy = (fit * origin.y - focus.y) / (fit - 1);
    var cycle = el("g", { class: "cycle" }, svg);
    var drawn = render(cycle, levels, true, true, focus);
    var ring = el("circle", { class: "dive", cx: focus.x, cy: focus.y, r: "12" }, svg);
    return {
      items: drawn.items,
      focusDot: drawn.focusDot,
      originDot: drawn.originDot,
      total: drawn.total,
      open: true,
      cycle: cycle,
      ring: ring,
      _k: 1,
      zoom: { focus: focus, origin: origin, fit: fit, fx: fx, fy: fy }
    };
  }

  /* z is 0 at the wide view and 1 when the last node sits on the first
     node, at the first node's size. The next loop grows from that dot. */
  function applyZoom(tree, z) {
    var s = tree.zoom.fit;
    var k = 1 + z * (1 / s - 1);
    var fx = tree.zoom.fx;
    var fy = tree.zoom.fy;
    tree._k = k;
    tree.cycle.setAttribute("transform",
      "translate(" + fx.toFixed(2) + " " + fy.toFixed(2) + ") scale(" + k.toFixed(4) +
      ") translate(" + (-fx).toFixed(2) + " " + (-fy).toFixed(2) + ")");
  }

  function cycleParts(t) {
    /* Most of the loop is the tree growing out of the bullet we just
       entered. The push into the newest bullet is the short ending, and
       the next loop starts on that same dot. */
    var grow = clamp(t / 0.52);
    var u = clamp((t - 0.42) / 0.58);
    var zoom = u < 0.86 ? (u / 0.86) * 0.94 : 0.94 + 0.06 * ((u - 0.86) / 0.14);
    var fade = u < 0.78 ? 1 - u * 0.28 : clamp(1 - (u - 0.78) / 0.16);
    return { grow: grow, zoom: zoom, fade: fade };
  }

  function placeNode(node, x, y, cx, cy, scale) {
    node.setAttribute("transform",
      "translate(" + x.toFixed(2) + " " + y.toFixed(2) + ") scale(" + scale.toFixed(4) +
      ") translate(" + (-cx).toFixed(2) + " " + (-cy).toFixed(2) + ")");
  }

  function paintTree(tree, p, parts) {
    var items = tree.items;
    var focusDot = tree.focusDot;
    var fade = parts && parts.fade != null ? parts.fade : 1;
    var zoom = parts && parts.zoom ? parts.zoom : 0;
    var k = tree._k || 1;
    var fx = tree.zoom ? tree.zoom.fx : 0;
    var fy = tree.zoom ? tree.zoom.fy : 0;
    function soften(x, y, rad) {
      var px = k * x + fx * (1 - k);
      var py = k * y + fy * (1 - k);
      var reach = (rad || 6) * k + 10;
      var dx = Math.min(px, 760 - px) - reach;
      var dy = Math.min(py, 300 - py) - reach;
      return clamp(Math.min(dx / 28, dy / 20));
    }
    var shown = 0;
    items.forEach(function (item) {
      var keep = item.node === focusDot;
      if (item.kind === "line") {
        var draw = clamp((p - item.from) / (item.to - item.from));
        var dim = keep ? 1 : fade;
        if (!keep && item.x1 != null) dim *= Math.min(soften(item.x1, item.y1, 5), soften(item.x2, item.y2, 5));
        item.node.style.strokeDashoffset = String(1 - draw);
        item.node.style.opacity = String(draw <= 0 ? 0 : dim);
      } else {
        var reveal = clamp((p - item.from) / 0.06 + 1);
        var dotDim = keep ? 1 : fade;
        if (!keep && item.x != null && tree.zoom) dotDim *= soften(item.x, item.y, (item.r || 6) * 2.2);
        item.node.classList.toggle("on", reveal > 0);
        item.node.style.opacity = String(reveal * dotDim);
        if (item.x != null) {
          var pop = 0.55 + 0.45 * reveal;
          placeNode(item.node, item.x, item.y, item.x, item.y, pop);
        }
        if (reveal > 0 && item.counts) shown += 1;
      }
    });
    if (tree.ring && tree.zoom) {
      var f = tree.zoom.focus;
      var px = k * f.x + fx * (1 - k);
      var py = k * f.y + fy * (1 - k);
      var pulse = Math.sin(Math.min(zoom, 1) * Math.PI);
      tree.ring.setAttribute("cx", px.toFixed(2));
      tree.ring.setAttribute("cy", py.toFixed(2));
      tree.ring.setAttribute("r", (18 + 14 * pulse).toFixed(2));
      tree.ring.style.opacity = String(0.5 * pulse);
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
    function play(w, name) {
      if (reduce.matches) return;
      w.classList.remove("jolt", "nudge", "knock");
      void w.offsetWidth;
      w.classList.add(name);
    }
    Array.prototype.forEach.call(words, function (w) {
      w.addEventListener("pointerenter", function () {
        if (!w.classList.contains("knock")) play(w, "nudge");
      });
      w.addEventListener("click", function () { play(w, "knock"); });
      w.addEventListener("animationend", function () { w.classList.remove("jolt", "nudge", "knock"); });
    });
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
    var CYCLE = 5.4;

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
            ? { grow: 1, zoom: 0, fade: 1 }
            : (spinning ? cycleParts(spinPhase - turns) : { grow: 0, zoom: 0, fade: 1 });
          if (tree.zoom) applyZoom(tree, parts.zoom);
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
