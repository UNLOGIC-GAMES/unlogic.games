(function () {
  function yamlError(line, message) {
    throw new Error("content.yaml:" + line + ": " + message);
  }

  function loadYaml(text) {
    var rows = [];
    text.split(/\r?\n/).forEach(function (raw, i) {
      if (!raw.trim() || raw.trimLeft().charAt(0) === "#") return;
      var indent = raw.match(/^ */)[0].length;
      rows.push({ indent: indent, body: raw.slice(indent), line: i + 1 });
    });
    var parsed = parseValue(rows, 0, -1);
    if (parsed.index !== rows.length) {
      yamlError(rows[parsed.index].line, "leftover content");
    }
    return parsed.value;
  }

  function parseValue(rows, index, parentIndent) {
    if (index >= rows.length) return { value: null, index: index };
    var row = rows[index];
    if (row.indent <= parentIndent) yamlError(row.line, "expected indented value");
    if (row.body === "-" || row.body.indexOf("- ") === 0) {
      return parseList(rows, index, row.indent);
    }
    return parseMap(rows, index, row.indent);
  }

  function parseMap(rows, index, indent) {
    var data = {};
    while (index < rows.length) {
      var row = rows[index];
      if (row.indent < indent) break;
      if (row.indent > indent) yamlError(row.line, "unexpected indent");
      if (row.body === "-" || row.body.indexOf("- ") === 0) {
        yamlError(row.line, "list item inside a mapping");
      }
      var split = splitKey(row.body, row.line);
      if (Object.prototype.hasOwnProperty.call(data, split.key)) {
        yamlError(row.line, "duplicate key " + split.key);
      }
      if (split.rest === null) {
        index += 1;
        if (index < rows.length && rows[index].indent > indent) {
          var nested = parseValue(rows, index, indent);
          data[split.key] = nested.value;
          index = nested.index;
        } else {
          data[split.key] = null;
        }
        continue;
      }
      if (split.rest === ">" || split.rest === "|") {
        var block = parseBlock(rows, index + 1, indent, split.rest);
        data[split.key] = block.value;
        index = block.index;
        continue;
      }
      data[split.key] = parseScalar(split.rest);
      index += 1;
    }
    return { value: data, index: index };
  }

  function parseList(rows, index, indent) {
    var items = [];
    while (index < rows.length) {
      var row = rows[index];
      if (row.indent < indent) break;
      if (row.indent > indent) yamlError(row.line, "unexpected indent");
      if (!(row.body === "-" || row.body.indexOf("- ") === 0)) {
        yamlError(row.line, "expected list item");
      }
      var payload = row.body.indexOf("- ") === 0 ? row.body.slice(2) : "";
      if (payload === "" || payload === ">" || payload === "|" || looksLikeKey(payload)) {
        if (payload === ">" || payload === "|") {
          var folded = parseBlock(rows, index + 1, indent, payload);
          items.push(folded.value);
          index = folded.index;
          continue;
        }
        if (payload === "") {
          index += 1;
          if (index < rows.length && rows[index].indent > indent) {
            var nested = parseValue(rows, index, indent);
            items.push(nested.value);
            index = nested.index;
          } else {
            items.push(null);
          }
          continue;
        }
        var split = splitKey(payload, row.line);
        var item = {};
        if (split.rest === null) {
          index += 1;
          if (index < rows.length && rows[index].indent > indent) {
            var child = parseValue(rows, index, indent);
            item[split.key] = child.value;
            index = child.index;
          } else {
            item[split.key] = null;
          }
        } else if (split.rest === ">" || split.rest === "|") {
          var inner = parseBlock(rows, index + 1, indent, split.rest);
          item[split.key] = inner.value;
          index = inner.index;
        } else {
          item[split.key] = parseScalar(split.rest);
          index += 1;
        }
        while (index < rows.length) {
          var next = rows[index];
          if (next.indent <= indent) break;
          if (next.body === "-" || next.body.indexOf("- ") === 0) break;
          var extra = parseMap(rows, index, next.indent);
          Object.keys(extra.value).forEach(function (key) {
            item[key] = extra.value[key];
          });
          index = extra.index;
        }
        items.push(item);
        continue;
      }
      items.push(parseScalar(payload));
      index += 1;
    }
    return { value: items, index: index };
  }

  function parseBlock(rows, index, parentIndent, kind) {
    if (index >= rows.length || rows[index].indent <= parentIndent) {
      return { value: "", index: index };
    }
    var blockIndent = rows[index].indent;
    var chunks = [];
    while (index < rows.length && rows[index].indent >= blockIndent) {
      var pad = new Array(rows[index].indent - blockIndent + 1).join(" ");
      chunks.push(pad + rows[index].body);
      index += 1;
    }
    if (kind === "|") {
      return { value: chunks.join("\n").replace(/\n+$/, ""), index: index };
    }
    var folded = [];
    var paragraph = [];
    chunks.forEach(function (chunk) {
      if (chunk.trim() === "") {
        if (paragraph.length) {
          folded.push(paragraph.join(" "));
          paragraph = [];
        }
        folded.push("");
      } else {
        paragraph.push(chunk.trim());
      }
    });
    if (paragraph.length) folded.push(paragraph.join(" "));
    return { value: folded.join("\n").replace(/^\s+|\s+$/g, ""), index: index };
  }

  function splitKey(body, line) {
    if (body.charAt(0) === "\"" || body.charAt(0) === "'") {
      yamlError(line, "quoted keys are not supported");
    }
    var pair = body.indexOf(": ");
    if (pair !== -1) return { key: body.slice(0, pair), rest: body.slice(pair + 2) };
    if (body.charAt(body.length - 1) === ":") return { key: body.slice(0, -1), rest: null };
    yamlError(line, "expected key:");
  }

  function looksLikeKey(payload) {
    if (payload.charAt(0) === "\"" || payload.charAt(0) === "'") return false;
    if (payload === ">" || payload === "|") return true;
    return payload.indexOf(": ") !== -1 || payload.charAt(payload.length - 1) === ":";
  }

  function parseScalar(value) {
    value = value.replace(/\s+$/, "");
    if (value.length >= 2 && value.charAt(0) === "\"" && value.charAt(value.length - 1) === "\"") {
      return value.slice(1, -1).replace(/\\"/g, "\"").replace(/\\n/g, "\n");
    }
    if (value.length >= 2 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
      return value.slice(1, -1).replace(/''/g, "'");
    }
    var comment = value.indexOf(" #");
    if (comment !== -1) value = value.slice(0, comment).replace(/\s+$/, "");
    return value;
  }

  function get(data, path) {
    return path.split(".").reduce(function (node, key) {
      return node == null ? undefined : node[key];
    }, data);
  }

  function escapeHtml(text, quotes) {
    var out = String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    if (quotes) out = out.replace(/"/g, "&quot;");
    return out;
  }

  function mark(text) {
    return linkify(escapeHtml(text, false).replace(/\*(.+?)\*/g, "<em>$1</em>"));
  }

  function linkify(html) {
    html = html.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, function (email) {
      return "<a href=\"mailto:" + escapeHtml(email, true) + "\">" + email + "</a>";
    });
    return html.replace(/https?:\/\/[^\s<]+/gi, function (url) {
      var label = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      return (
        "<a href=\"" + escapeHtml(url, true) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" +
          label +
        "</a>"
      );
    });
  }

  function copyHtml(copy) {
    return copy.map(function (item) {
      var text = typeof item === "string" ? item : item.text;
      var cls = item && item.class ? " class=\"" + escapeHtml(item.class, true) + "\"" : "";
      return "<p" + cls + ">" + mark(text) + "</p>";
    }).join("");
  }

  function itemsHtml(items) {
    return items.map(function (item) {
      return "<p><span class=\"k\">" + escapeHtml(item.label, false) + ":</span> " + mark(item.text) + "</p>";
    }).join("");
  }

  function conceptsHtml(items) {
    return items.map(function (item) {
      var images = item.images && item.images.length ? item.images : [item.image];
      var alt = escapeHtml(item.title, true);
      var many = images.length > 1;
      var tight = item.zoom || item.focus;
      var shotStyle = "";
      if (tight) {
        shotStyle = " style=\"";
        if (item.zoom) shotStyle += "--zoom:" + escapeHtml(String(item.zoom), true) + ";";
        if (item.focus) shotStyle += "--focus:" + escapeHtml(item.focus, true) + ";";
        shotStyle += "\"";
      }
      var shots = images.map(function (image, i) {
        var src = escapeHtml("assets/images/" + image, true);
        var on = many && i === 0 ? " on" : "";
        return (
          "<figure class=\"shot" + on + (tight ? " tight" : "") + "\"" + shotStyle + ">" +
            "<img src=\"" + src + "\" alt=\"" + alt + "\">" +
          "</figure>"
        );
      }).join("");
      return (
        "<article class=\"concept\">" +
          "<div class=\"concept-copy\">" +
            "<h3><span>" + escapeHtml(item.title, false) + "</span></h3>" +
            "<p>" + mark(item.text) + "</p>" +
          "</div>" +
          "<div class=\"shots" + (many ? " slides" : "") + "\">" + shots + "</div>" +
        "</article>"
      );
    }).join("");
  }

  function roadmapHtml(items) {
    return items.map(function (item) {
      return (
        "<li class=\"mile\">" +
          "<span class=\"year\">" + escapeHtml(item.year, false) + "</span>" +
          "<p>" + mark(item.text) + "</p>" +
        "</li>"
      );
    }).join("");
  }

  function fill(data) {
    if (data.site && data.site.title) document.title = data.site.title;

    Array.prototype.forEach.call(document.querySelectorAll("[data-text]"), function (node) {
      var value = get(data, node.getAttribute("data-text"));
      if (value != null) node.textContent = value;
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-alt]"), function (node) {
      var value = get(data, node.getAttribute("data-alt"));
      if (value != null) node.setAttribute("alt", value);
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-copy]"), function (node) {
      var value = get(data, node.getAttribute("data-copy"));
      if (value) node.innerHTML = copyHtml(value);
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-items]"), function (node) {
      var value = get(data, node.getAttribute("data-items"));
      if (value) node.innerHTML = itemsHtml(value);
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-concepts]"), function (node) {
      var value = get(data, node.getAttribute("data-concepts"));
      if (value) node.innerHTML = conceptsHtml(value);
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-list]"), function (node) {
      var value = get(data, node.getAttribute("data-list"));
      if (value) {
        node.innerHTML = value.map(function (item) {
          return "<li>" + mark(item) + "</li>";
        }).join("");
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-steps]"), function (node) {
      var value = get(data, node.getAttribute("data-steps"));
      if (value) {
        node.innerHTML = value.map(function (step) {
          return "<li><b>" + escapeHtml(step.name, false) + "</b><span>" + mark(step.text) + "</span></li>";
        }).join("");
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-gazette]"), function (node) {
      var value = get(data, node.getAttribute("data-gazette"));
      if (value) gazetteFill(node, value);
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-href]"), function (node) {
      var value = get(data, node.getAttribute("data-href"));
      if (value) node.setAttribute("href", value);
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-roadmap]"), function (node) {
      var value = get(data, node.getAttribute("data-roadmap"));
      if (value) node.innerHTML = roadmapHtml(value);
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-reel]"), function (node) {
      var slides = get(data, node.getAttribute("data-reel")) || [];
      var stage = node.querySelector(".reel-stage");
      var dots = node.querySelector(".reel-dots");
      slides.forEach(function (slide, i) {
        var figure = document.createElement("figure");
        figure.className = "slide";
        var img = document.createElement("img");
        img.src = "assets/images/" + slide.image;
        img.alt = slide.alt;
        img.loading = "lazy";
        img.draggable = false;
        figure.appendChild(img);
        stage.appendChild(figure);
        var dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", slide.alt);
        dot.setAttribute("data-to", String(i));
        dots.appendChild(dot);
      });
    });
  }

  function gazetteFill(root, data) {
    var head = root.querySelector(".gz-head");
    var body = root.querySelector(".gz-body");
    var quote = root.querySelector(".gz-quote");
    var number = root.querySelector(".gz-no");
    var sheet = root.querySelector(".gz-sheet");
    var opts = root.querySelector(".gz-opts");
    var edition = 1;

    function print(story) {
      head.textContent = story.headline;
      body.innerHTML = mark(story.body);
      quote.textContent = story.quote || "";
      number.textContent = String(edition);
    }

    root.querySelector(".gz-ask").textContent = data.ask;
    data.options.forEach(function (option) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = option.choice;
      button.addEventListener("click", function () {
        Array.prototype.forEach.call(opts.children, function (b) {
          b.setAttribute("aria-pressed", b === button ? "true" : "false");
        });
        edition += 1;
        sheet.classList.remove("fresh");
        void sheet.offsetWidth;
        sheet.classList.add("fresh");
        print(option);
      });
      opts.appendChild(button);
    });
    print(data.intro);
  }

  var viewer = null;

  function openViewer(img, onClose, caption) {
    if (!viewer) {
      viewer = document.createElement("div");
      viewer.className = "viewer";
      viewer.setAttribute("role", "dialog");
      viewer.setAttribute("aria-modal", "true");
      viewer.innerHTML =
        "<button class=\"viewer-close\" type=\"button\" aria-label=\"Close\">&times;</button>" +
        "<div class=\"viewer-pan\"><img alt=\"\"></div>" +
        "<p class=\"viewer-cap\"></p>";
      document.body.appendChild(viewer);
      viewer.addEventListener("click", function (event) {
        if (event.target.tagName !== "IMG") viewer.close();
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && viewer.classList.contains("open")) viewer.close();
      });
    }
    var big = viewer.querySelector("img");
    var pan = viewer.querySelector(".viewer-pan");
    big.onload = function () {
      pan.scrollLeft = (pan.scrollWidth - pan.clientWidth) / 2;
    };
    big.src = img.currentSrc || img.src;
    big.alt = img.alt;
    viewer.querySelector(".viewer-cap").textContent = caption || "";
    var opener = document.activeElement;
    viewer.close = function () {
      viewer.classList.remove("open");
      document.documentElement.classList.remove("viewing");
      if (opener && opener.focus) opener.focus();
      if (onClose) onClose();
    };
    viewer.classList.add("open");
    document.documentElement.classList.add("viewing");
    if (big.complete) big.onload();
    viewer.querySelector(".viewer-close").focus();
  }

  function startViewer() {
    document.addEventListener("click", function (event) {
      var shot = event.target.closest(".concept .shot");
      if (shot) openViewer(shot.querySelector("img"), null, shot.querySelector("img").alt);
    });
  }

  function startReel(root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll(".slide"));
    var dots = Array.prototype.slice.call(root.querySelectorAll(".reel-dots button"));
    var n = slides.length;
    if (!n) return;
    var lit = 0;
    var timer = 0;
    var visible = false;
    var held = false;
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function show(index) {
      lit = (index + n) % n;
      slides.forEach(function (slide, i) {
        var offset = (i - lit + n) % n;
        slide.classList.toggle("on", offset === 0);
        slide.classList.toggle("next", n > 1 && offset === 1);
        slide.classList.toggle("prev", n > 2 && offset === n - 1);
        slide.setAttribute("aria-hidden", offset === 0 ? "false" : "true");
      });
      dots.forEach(function (dot, i) {
        if (i === lit) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    }

    function arm() {
      clearInterval(timer);
      if (!reduceMotion && visible && !held && n > 1) {
        timer = setInterval(function () { show(lit + 1); }, 5200);
      }
    }

    function go(index) {
      show(index);
      arm();
    }

    var swiped = false;
    root.addEventListener("click", function (event) {
      if (swiped) {
        swiped = false;
        return;
      }
      var step = event.target.closest("[data-step]");
      var dot = event.target.closest("[data-to]");
      var side = event.target.closest(".slide.prev, .slide.next");
      var current = event.target.closest(".slide.on");
      if (step) go(lit + Number(step.getAttribute("data-step")));
      else if (dot) go(Number(dot.getAttribute("data-to")));
      else if (side) go(lit + (side.classList.contains("next") ? 1 : -1));
      else if (current) {
        held = true;
        arm();
        openViewer(current.querySelector("img"), function () {
          held = false;
          arm();
        });
      }
    });

    root.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") go(lit + 1);
      if (event.key === "ArrowLeft") go(lit - 1);
    });

    var startX = null;
    root.addEventListener("pointerdown", function (event) {
      startX = event.clientX;
      swiped = false;
    });
    root.addEventListener("pointerup", function (event) {
      if (startX === null) return;
      var dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) {
        swiped = true;
        go(lit + (dx < 0 ? 1 : -1));
      }
    });

    root.addEventListener("mouseenter", function () { held = true; arm(); });
    root.addEventListener("mouseleave", function () { held = false; arm(); });
    root.addEventListener("focusin", function () { held = true; arm(); });
    root.addEventListener("focusout", function () { held = false; arm(); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        arm();
      }, { threshold: 0.35 }).observe(root);
    }

    show(0);
  }

  function startMotion() {
    var lamps = Array.prototype.slice.call(document.querySelectorAll(".rod-on"));
    var nights = Array.prototype.slice.call(document.querySelectorAll(".daynight > .night"));
    if ((!lamps.length && !nights.length) || !window.requestAnimationFrame) return;

    var queued = false;
    var ZONE = 0.35;
    var HOLD = 140;
    var moved = 0;

    function dusk() {
      var vh = window.innerHeight;
      var still = Date.now() - moved > HOLD;
      nights.forEach(function (night) {
        var band = night.parentNode.getBoundingClientRect();
        var delta = band.top + band.height / 2 - vh / 2;
        if (night.style.opacity !== "1") {
          if ((still && Math.abs(delta) < vh * ZONE) || delta < -vh * ZONE) {
            night.style.opacity = "1";
          }
        } else if (delta > vh * 0.55) {
          night.style.opacity = "0";
        }
      });
    }

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var shows = Array.prototype.slice.call(document.querySelectorAll(".shots.slides")).map(function (root) {
      return {
        root: root,
        frames: Array.prototype.slice.call(root.querySelectorAll(".shot")),
        lit: 0,
        turning: false
      };
    });

    function stepShow(show) {
      show.frames[show.lit].classList.remove("on");
      show.lit = (show.lit + 1) % show.frames.length;
      show.frames[show.lit].classList.add("on");
    }

    function carousels() {
      if (reduceMotion) return;
      shows.forEach(function (show) {
        if (show.turning || show.frames.length < 2) return;
        var box = show.root.getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight) return;
        show.turning = true;
        setInterval(function () { stepShow(show); }, 4200);
      });
    }

    function paint() {
      queued = false;
      dusk();
      carousels();
      var middle = window.innerHeight / 2;
      var reach = window.innerHeight * 0.9;
      var gaps = lamps.map(function (lamp) {
        var box = lamp.getBoundingClientRect();
        return Math.abs(box.top + box.height / 2 - middle);
      });
      var nearest = gaps.indexOf(Math.min.apply(null, gaps));
      lamps.forEach(function (lamp, i) {
        var t = Math.max(0, 1 - gaps[i] / reach);
        var on = i === nearest && gaps[i] < reach ? Math.max(t, 0.9) : t * t;
        lamp.style.opacity = on.toFixed(3);
      });
    }

    var settle = 0;
    function schedule() {
      moved = Date.now();
      clearTimeout(settle);
      settle = setTimeout(paint, HOLD + 40);
      if (!queued) {
        queued = true;
        requestAnimationFrame(paint);
      }
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    paint();
  }

  var menu = document.querySelector(".site-nav");
  if (menu) {
    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) menu.removeAttribute("open");
    });
  }

  var source = document.body.getAttribute("data-content") || "content.yaml?v=18";
  fetch(source)
    .then(function (response) {
      if (!response.ok) throw new Error("Could not load " + source);
      return response.text();
    })
    .then(function (text) {
      fill(loadYaml(text));
      document.dispatchEvent(new Event("content:ready"));
      Array.prototype.forEach.call(document.querySelectorAll(".reel"), startReel);
      startViewer();
      startMotion();
    })
    .catch(function (error) {
      console.error(error);
    });
})();
