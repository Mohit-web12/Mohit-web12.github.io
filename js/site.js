/* Site behavior: header state, scroll progress, scrollspy, scroll reveals, count ups,
   parallax, the SpendGauge demo video, the "how a break is caught" diagram, and page
   transitions.

   Every hidden starting state is tied to the .reveal-on class on <html>, which the
   inline <head> snippet adds (and takes away again if this file never runs), so if
   anything here fails the page falls back to plain, fully visible content.
   Reduced motion: no reveals, no count ups, no parallax, no progress bar. */
(function () {
  "use strict";

  var root = document.documentElement;
  // "?motion=on" (remembered for the tab) previews the motion even with reduced motion set.
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) &&
    !root.classList.contains("force-motion");
  var hasIO = "IntersectionObserver" in window;
  var motionOn = root.classList.contains("reveal-on");
  window.siteReady = true;

  function safely(fn) {
    try { fn(); } catch (err) { root.classList.remove("reveal-on"); }
  }
  function cssMs(name, fallback) {
    var value = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return isNaN(value) ? fallback : value;
  }
  var STAGGER = cssMs("--stagger", 80);

  /* One scroll loop. Each task measures first, then all tasks apply, so layout is
     read once per frame and never forced between writes. */
  var tasks = [];
  function track(task) { tasks.push(task); }
  function frame() {
    var applies = [];
    for (var i = 0; i < tasks.length; i++) applies.push(tasks[i]());
    for (var j = 0; j < applies.length; j++) if (applies[j]) applies[j]();
  }
  var queued = false;
  function requestFrame() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () { queued = false; frame(); });
  }
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame);

  /* Header: shrink and tint once the page has scrolled. */
  safely(function () {
    var header = document.querySelector(".site-header");
    if (!header) return;
    track(function () {
      var scrolled = window.scrollY > 4;
      return function () { header.classList.toggle("is-scrolled", scrolled); };
    });
  });

  /* Reading progress bar. */
  safely(function () {
    if (reduceMotion) return;
    var bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.insertBefore(bar, document.body.firstChild);
    track(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      return function () { bar.style.transform = "scaleX(" + progress.toFixed(4) + ")"; };
    });
  });

  /* Scrollspy: an underline slides to the nav link for the section on screen. On a
     write up page it sits under the section the page belongs to. */
  safely(function () {
    var nav = document.querySelector(".site-nav");
    if (!nav) return;
    var links = Array.prototype.filter.call(nav.querySelectorAll("a[href]"), function (a) {
      var url = new URL(a.href, location.href);
      return url.origin === location.origin && url.hash.length > 1;
    });
    if (!links.length) return;

    var indicator = document.createElement("span");
    indicator.className = "nav-indicator";
    indicator.setAttribute("aria-hidden", "true");
    nav.appendChild(indicator);

    function place(link) {
      if (!link) { indicator.classList.remove("is-on"); return; }
      var size = parseFloat(getComputedStyle(link).fontSize) || 15;
      var x = link.offsetLeft;
      var y = link.offsetTop + link.offsetHeight / 2 + size * 0.62;
      indicator.style.transform = "translate3d(" + x + "px," + y.toFixed(1) + "px,0) scaleX(" + (link.offsetWidth / 100).toFixed(3) + ")";
      indicator.classList.add("is-on");
      links.forEach(function (a) {
        if (a === link) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      });
    }

    var sections = links.map(function (a) {
      var url = new URL(a.href, location.href);
      var samePage = url.pathname === location.pathname;
      return { link: a, el: samePage ? document.getElementById(url.hash.slice(1)) : null };
    });
    var onThisPage = sections.filter(function (s) { return s.el; });

    if (!onThisPage.length) {
      // Write up pages: underline the section this page belongs to (from its back link).
      var crumb = document.querySelector(".crumb");
      var hash = crumb ? new URL(crumb.href, location.href).hash : "";
      var match = sections.filter(function (s) { return new URL(s.link.href, location.href).hash === hash; })[0];
      var settle = function () { place(match ? match.link : null); };
      settle();
      window.addEventListener("resize", settle);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
      return;
    }

    var current = null;
    track(function () {
      var line = window.innerHeight * 0.35;
      var active = null;
      onThisPage.forEach(function (s) {
        var r = s.el.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) active = s.link;
      });
      return function () {
        if (active !== current) { current = active; place(active); }
      };
    });
    window.addEventListener("resize", function () { if (current) place(current); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (current) place(current); });
  });

  /* Closing headline: split into lines (as they wrap right now) so each can rise. */
  var lineHeads = [];
  function splitLines(el) {
    if (!el.dataset.original) el.dataset.original = el.textContent.replace(/\s+/g, " ").trim();
    var words = el.dataset.original.split(" ");
    el.textContent = "";
    var probes = words.map(function (word, i) {
      var span = document.createElement("span");
      span.textContent = word;
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      return span;
    });
    var lines = [];
    var top = null;
    probes.forEach(function (span, i) {
      if (span.offsetTop !== top) { lines.push([]); top = span.offsetTop; }
      lines[lines.length - 1].push(words[i]);
    });
    el.textContent = "";
    lines.forEach(function (lineWords, i) {
      var line = document.createElement("span");
      line.className = "line";
      var inner = document.createElement("span");
      inner.className = "line-inner";
      inner.style.setProperty("--line", i);
      inner.textContent = lineWords.join(" ") + (i < lines.length - 1 ? " " : "");
      line.appendChild(inner);
      el.appendChild(line);
    });
    el.classList.add("is-split");
  }
  function unsplit(el) {
    if (el.dataset.original) el.textContent = el.dataset.original;
    el.classList.remove("is-split");
  }

  /* Scroll reveals. Each element reveals once; elements entering together are
     staggered by --stagger. */
  safely(function () {
    if (!motionOn) return;
    var targets = [];
    function add(el) { if (targets.indexOf(el) === -1) targets.push(el); }
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      if (el.getAttribute("data-reveal") !== "lines") add(el);
    });
    document.querySelectorAll("[data-reveal-children]").forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (el) {
        if (!el.hasAttribute("data-reveal")) add(el);
      });
    });

    var hold = { lines: 2000, figure: 1500, heading: 1200 };
    function show(el, delay) {
      if (el.classList.contains("is-revealed")) return;
      var type = el.getAttribute("data-reveal") || "";
      el.style.setProperty("--reveal-delay", delay + "ms");
      el.classList.add("is-revealing", "is-revealed");
      window.setTimeout(function () {
        el.classList.remove("is-revealing");
        el.style.removeProperty("--reveal-delay");
        if (type === "lines") unsplit(el);
      }, delay + (hold[type] || 900));
    }

    if (!hasIO) {
      targets.forEach(function (el) { el.classList.add("is-revealed"); });
      root.classList.remove("reveal-on");
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      var step = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        show(entry.target, Math.min(step, 8) * STAGGER);
        step += 1;
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
    targets.forEach(function (el) { observer.observe(el); });

    // The closing headline is split once fonts are in, so the lines match the real wrap.
    var heads = document.querySelectorAll('[data-reveal="lines"]');
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(function () {
      safely(function () {
        heads.forEach(function (el) { splitLines(el); lineHeads.push(el); targets.push(el); observer.observe(el); });
      });
    });
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        lineHeads.forEach(function (el) { if (!el.classList.contains("is-revealed")) splitLines(el); });
      }, 150);
    });

    // At the very bottom of the page the -8% trigger line can sit below the last
    // items, so reveal anything still hidden that's on screen.
    track(function () {
      var atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      if (!atBottom) return null;
      var due = targets.filter(function (el) {
        return !el.classList.contains("is-revealed") && el.getBoundingClientRect().top < window.innerHeight;
      });
      return function () {
        due.forEach(function (el, i) { observer.unobserve(el); show(el, Math.min(i, 8) * STAGGER); });
      };
    });
  });

  /* Data table: the accent copy shown on row hover. */
  safely(function () {
    document.querySelectorAll(".data-table .res").forEach(function (res) {
      var base = res.querySelector(".res-base");
      if (base) res.setAttribute("data-text", base.textContent);
    });
  });

  /* Count ups: numbers marked [data-count] run from 0 to their exact final text,
     then flash the accent color once. */
  safely(function () {
    var nodes = document.querySelectorAll("[data-count]");
    if (!nodes.length || reduceMotion || !hasIO) return;

    function run(el) {
      var finalText = el.textContent;
      var match = finalText.match(/\d[\d,]*(?:\.\d+)?/);
      if (!match) return;
      var numText = match[0];
      var decimals = (numText.split(".")[1] || "").length;
      var target = parseFloat(numText.replace(/,/g, ""));
      var grouped = numText.indexOf(",") !== -1;
      var before = finalText.slice(0, match.index);
      var after = finalText.slice(match.index + numText.length);

      // Reserve the final width (all of these are monospaced) so nothing shifts.
      el.style.display = "inline-block";
      el.style.minWidth = finalText.length + "ch";
      el.style.textAlign = "right";
      el.setAttribute("data-final", finalText);

      function format(value) {
        var text = value.toFixed(decimals);
        if (grouped) {
          var parts = text.split(".");
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          text = parts.join(".");
        }
        return before + text + after;
      }

      var start = null;
      function step(now) {
        if (start === null) start = now;
        var t = Math.min(1, (now - start) / 800);
        var eased = 1 - Math.pow(1 - t, 3);
        if (t < 1) {
          el.textContent = format(target * eased);
          window.requestAnimationFrame(step);
        } else {
          el.textContent = finalText;
          el.classList.add("count-flash");
        }
      }
      el.textContent = format(0);
      window.requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        run(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
    nodes.forEach(function (el) { observer.observe(el); });
  });

  /* Parallax: the two homepage images drift a few px against the scroll. */
  safely(function () {
    if (reduceMotion) return;
    var items = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
    if (!items.length) return;
    var RANGE = 8; // px either way
    var current = items.map(function () { return 0; });
    track(function () {
      var vh = window.innerHeight;
      var next = items.map(function (el, i) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return current[i];
        var center = r.top - current[i] + r.height / 2;
        return Math.max(-RANGE, Math.min(RANGE, (vh / 2 - center) * 0.03));
      });
      return function () {
        items.forEach(function (el, i) {
          if (Math.abs(next[i] - current[i]) < 0.05) return;
          current[i] = next[i];
          el.style.setProperty("--py", next[i].toFixed(2) + "px");
        });
      };
    });
  });

  /* SpendGauge demo: load and play only when it's on screen, with a pause control. */
  safely(function () {
    var video = document.getElementById("sg-demo");
    var button = document.querySelector(".demo-toggle:not(.break-replay)");
    if (!video || !button) return;

    var userPaused = reduceMotion;
    var loaded = false;
    function load() {
      if (loaded) return;
      var source = video.querySelector("source[data-src]");
      if (source) source.src = source.getAttribute("data-src");
      video.load();
      loaded = true;
    }
    function play() {
      load();
      var attempt = video.play();
      if (attempt && attempt.catch) attempt.catch(function () {});
    }
    function label() { button.textContent = video.paused ? "Play demo" : "Pause demo"; }

    button.hidden = false;
    button.addEventListener("click", function () {
      if (video.paused) { userPaused = false; play(); }
      else { userPaused = true; video.pause(); }
    });
    video.addEventListener("play", label);
    video.addEventListener("pause", label);

    if (reduceMotion) return;
    if (!hasIO) { play(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !userPaused) play();
        else if (!entry.isIntersecting && !video.paused) video.pause();
      });
    }, { threshold: 0.25 }).observe(video);
  });

  /* How a break is caught: play once on screen, replay on click. */
  safely(function () {
    var demo = document.querySelector("[data-break-demo]");
    if (!demo || reduceMotion) return;
    var replay = demo.querySelector(".break-replay");

    function play() {
      demo.classList.remove("is-playing");
      void demo.offsetWidth; // restart the CSS animations
      demo.classList.add("is-playing");
    }

    demo.classList.add("is-armed");
    if (replay) {
      replay.hidden = false;
      replay.addEventListener("click", function (event) { event.stopPropagation(); play(); });
    }
    demo.addEventListener("click", function (event) {
      if (event.target.closest("a, button")) return;
      play();
    });

    if (!hasIO) { play(); return; }
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { observer.disconnect(); play(); }
    }, { threshold: 0.45 });
    observer.observe(demo);
  });

  /* Page transitions where cross document View Transitions aren't supported: fade
     out quickly, then navigate. (The fade in is CSS: .pt-fade body.) */
  safely(function () {
    if (reduceMotion || !root.classList.contains("pt-fade")) return;
    document.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var link = event.target.closest("a[href]");
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      var url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      if (!/(\.html|\/)$/.test(url.pathname)) return; // pages only, not the PDF or images
      if (url.pathname === location.pathname) return;  // same page anchors scroll as usual
      event.preventDefault();
      root.classList.add("is-leaving");
      window.setTimeout(function () { location.href = url.href; }, 180);
    });
    window.addEventListener("pageshow", function (event) {
      if (event.persisted) root.classList.remove("is-leaving");
    });
  });

  frame();
})();
