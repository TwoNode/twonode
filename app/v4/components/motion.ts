/* eslint-disable */
// @ts-nocheck
// Verbatim port of out/twonode-website/script.js (TASK-0008). The only changes:
// the mobile menu and footer year now live in React, and every listener,
// observer, timer, animation frame and injected element is tracked so that
// initMotion() returns a cleanup function (needed for client-side navigation
// and React strict mode).

export function initMotion(): () => void {
  let stopped = false;
  // Canvas text uses the page's body font (Bricolage Grotesque via next/font).
  const CANVAS_FONT = getComputedStyle(document.body).fontFamily;
  const cleanups: Array<() => void> = [];
  const rafIds = new Set<number>();
  const timers = new Set<number>();
  const observers: Array<{ disconnect: () => void }> = [];

  const listen = (target, type, fn, opts?) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  const rAF = (cb) => {
    if (stopped) return 0;
    const id = requestAnimationFrame((t) => {
      rafIds.delete(id);
      if (!stopped) cb(t);
    });
    rafIds.add(id);
    return id;
  };
  const tInterval = (cb, ms) => {
    const id = window.setInterval(cb, ms);
    timers.add(id);
    return id;
  };
  const tTimeout = (cb, ms) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (!stopped) cb();
    }, ms);
    timers.add(id);
    return id;
  };
  class IO extends IntersectionObserver {
    constructor(cb, opts?) {
      super(cb, opts);
      observers.push(this);
    }
  }
  class RO extends ResizeObserver {
    constructor(cb) {
      super(cb);
      observers.push(this);
    }
  }

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Headline choreography: words rise out of a mask, in sequence.
  const canObserve = "IntersectionObserver" in window;
  function splitWords(root) {
    if (root.classList.contains("split-title")) return;
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(" "));
              return;
            }
            const word = document.createElement("span");
            word.className = "w";
            word.setAttribute("aria-hidden", "true");
            const inner = document.createElement("span");
            inner.textContent = part;
            inner.style.setProperty("--i", i++);
            word.appendChild(inner);
            frag.appendChild(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    const label = root.textContent.replace(/\s+/g, " ").trim();
    walk(root);
    root.setAttribute("aria-label", label);
    root.classList.add("split-title");
  }
  if (!reduceMotion) {
    const heroTitles = Array.from(
      document.querySelectorAll(".hero h1, .story-hero h1")
    );
    const sectionTitles = Array.from(
      document.querySelectorAll(
        ".section-heading h2, .origin-copy h2, .intro-grid h2, .belief-inner h2, .contact-section h2, .story-article h2, .story-cta h2"
      )
    );
    [...heroTitles, ...sectionTitles].forEach(splitWords);
    const startHero = () =>
      heroTitles.forEach((t) => {
        t.style.setProperty("--base", "120ms");
        t.classList.add("is-in");
      });
    const fontsReady =
      document.fonts && document.fonts.ready
        ? Promise.race([
            document.fonts.ready,
            new Promise((r) => tTimeout(r, 700)),
          ])
        : Promise.resolve();
    fontsReady.then(() => {
      if (!stopped) startHero();
    });
    if (canObserve) {
      const titleObserver = new IO(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.35, rootMargin: "0px 0px -8% 0px" }
      );
      sectionTitles.forEach((t) => titleObserver.observe(t));
    } else {
      sectionTitles.forEach((t) => t.classList.add("is-in"));
    }
  }

  // Reveal content as it enters the viewport, while keeping the page readable
  // when IntersectionObserver is unavailable or reduced motion is preferred.
  if (!reduceMotion && "IntersectionObserver" in window) {
    const revealTargets = Array.from(
      document.querySelectorAll(
        ".intro-grid, .section-heading, .principle, .origin-visual, .origin-copy, .work-card, .belief-inner > *, .contact-section > *, .story-hero > *, .story-index, .story-article section, .story-cta-inner > *"
      )
    ).filter((el) => !el.classList.contains("split-title"));
    revealTargets.forEach((el, index) => {
      el.classList.add("js-reveal");
      if (
        el.classList.contains("principle") ||
        el.classList.contains("work-card")
      ) {
        el.dataset.revealDelay = String((index % 3) + 1);
      }
    });
    const observer = new IO(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -36px 0px" }
    );
    revealTargets.forEach((el) => observer.observe(el));
  }

  // Keep anchor navigation polished for browsers that support it.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    listen(link, "click", () => {
      const target = document.querySelector(link.getAttribute("href"));
      if (target) target.classList.add("anchor-arrival");
    });
  });

  // ---------------------------------------------------------------------------
  // Motion layer v2: scroll progress, header, parallax, spotlight, magnetism.
  // Everything here is progressive: no JS (or reduced motion) leaves a static page.
  // ---------------------------------------------------------------------------
  (() => {
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const header = document.querySelector(".site-header");
    cleanups.push(() => {
      document.documentElement.style.removeProperty("--progress");
      if (header) header.classList.remove("is-scrolled");
    });
    const origin = document.querySelector(".origin-visual");
    const belief = document.querySelector(".belief-decoration");

    // Scroll progress bar
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.prepend(bar);
    cleanups.push(() => bar.remove());

    // -1 (element below viewport centre) .. 1 (above), used for parallax depth
    const depthOf = (el) => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      return clamp(
        (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2),
        -1,
        1
      );
    };

    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const prog = max > 0 ? (y / max).toFixed(4) : "0";
      bar.style.setProperty("--progress", prog);
      document.documentElement.style.setProperty("--progress", prog);
      if (header) header.classList.toggle("is-scrolled", y > 12);
      if (!reduceMotion) {
        [origin, belief].forEach((el) => {
          if (!el) return;
          const r = el.getBoundingClientRect();
          if (r.bottom < -150 || r.top > window.innerHeight + 150) return;
          el.style.setProperty("--p", depthOf(el).toFixed(3));
        });
      }
    };
    listen(
      window,
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          rAF(update);
        }
      },
      { passive: true }
    );
    listen(window, "resize", update);
    update();

    if (reduceMotion) return;

    // Hero: cursor-driven depth + spotlight, eased with a small lerp loop
    const art = document.querySelector(".hero-art");
    if (art && finePointer) {
      let tx = 0,
        ty = 0,
        cx = 0,
        cy = 0,
        raf = 0;
      const step = () => {
        cx += (tx - cx) * 0.08;
        cy += (ty - cy) * 0.08;
        art.style.setProperty("--mx", cx.toFixed(3));
        art.style.setProperty("--my", cy.toFixed(3));
        raf =
          Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001
            ? rAF(step)
            : 0;
      };
      const kick = () => {
        if (!raf) raf = rAF(step);
      };
      listen(art, "pointermove", (e) => {
        const r = art.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        tx = (x - 0.5) * 2;
        ty = (y - 0.5) * 2;
        art.style.setProperty("--gx", (x * 100).toFixed(1) + "%");
        art.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
        art.classList.add("is-active");
        kick();
      });
      listen(art, "pointerleave", () => {
        tx = 0;
        ty = 0;
        art.classList.remove("is-active");
        kick();
      });
    }

    // Survey plan: light 3D tilt and a glare that follows the pointer
    const plan = document.querySelector(".plan-photo");
    if (plan && origin && finePointer) {
      let tx = 0,
        ty = 0,
        cx = 0,
        cy = 0,
        raf = 0;
      const step = () => {
        cx += (tx - cx) * 0.09;
        cy += (ty - cy) * 0.09;
        plan.style.setProperty("--tx", cx.toFixed(3));
        plan.style.setProperty("--ty", cy.toFixed(3));
        raf =
          Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001
            ? rAF(step)
            : 0;
      };
      const kick = () => {
        if (!raf) raf = rAF(step);
      };
      listen(origin, "pointermove", (e) => {
        const r = plan.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        tx = clamp((x - 0.5) * 2, -1, 1);
        ty = clamp((y - 0.5) * 2, -1, 1);
        plan.style.setProperty("--gx", (clamp(x, 0, 1) * 100).toFixed(1) + "%");
        plan.style.setProperty("--gy", (clamp(y, 0, 1) * 100).toFixed(1) + "%");
        plan.classList.add("is-lit");
        kick();
      });
      listen(origin, "pointerleave", () => {
        tx = 0;
        ty = 0;
        plan.classList.remove("is-lit");
        kick();
      });
    }

    // Work cards: soft spotlight that follows the pointer
    document.querySelectorAll(".work-card").forEach((card) => {
      listen(card, "pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--cx", e.clientX - r.left + "px");
        card.style.setProperty("--cy", e.clientY - r.top + "px");
      });
    });

    // Buttons: gentle magnetic pull
    if (finePointer) {
      document.querySelectorAll(".button, .nav-cta").forEach((btn) => {
        listen(btn, "pointermove", (e) => {
          const r = btn.getBoundingClientRect();
          const x = (e.clientX - (r.left + r.width / 2)) / r.width;
          const y = (e.clientY - (r.top + r.height / 2)) / r.height;
          btn.style.translate =
            (x * 9).toFixed(1) + "px " + (y * 6).toFixed(1) + "px";
        });
        listen(btn, "pointerleave", () => {
          btn.style.translate = "";
        });
      });
    }

    // Story page: highlight the chapter currently being read
    const chapterLinks = Array.from(
      document.querySelectorAll(".story-index a")
    );
    if (chapterLinks.length && "IntersectionObserver" in window) {
      const byId = new Map(
        chapterLinks.map((a) => [a.getAttribute("href").slice(1), a])
      );
      const chapterObserver = new IO(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            chapterLinks.forEach((a) => a.classList.remove("is-current"));
            const link = byId.get(entry.target.id);
            if (link) link.classList.add("is-current");
          });
        },
        { rootMargin: "-30% 0px -55% 0px" }
      );
      byId.forEach((_, id) => {
        const sec = document.getElementById(id);
        if (sec) chapterObserver.observe(sec);
      });
    }

    // Save battery: pause looping animation in sections that are off-screen
    if ("IntersectionObserver" in window) {
      const pauser = new IO(
        (entries) => {
          entries.forEach((entry) =>
            entry.target.classList.toggle("is-paused", !entry.isIntersecting)
          );
        },
        { rootMargin: "120px 0px" }
      );
      document
        .querySelectorAll(
          ".hero-art, .origin-visual, .work-card, .belief-section"
        )
        .forEach((el) => pauser.observe(el));
    }
  })();

  // ---------------------------------------------------------------------------
  // Hero: two seed nodes divide and grow into a living network (~70 nodes).
  // Packets travel the links, the cursor joins as a node, a click sends a wave
  // through the network, then everything gathers back into two. ~20s loop.
  // ---------------------------------------------------------------------------
  // Africa outline (lon, lat), shared by the hero network and the "bigger picture" section.
  const AFRICA = [
    [-5.9, 35.8],
    [-2, 35.1],
    [3, 36.8],
    [10, 37.2],
    [10.3, 34.5],
    [11.5, 33.2],
    [15, 32.3],
    [20, 32.8],
    [20, 30.4],
    [24, 32.8],
    [29.5, 31.2],
    [32.3, 31.3],
    [32.6, 29.9],
    [34.2, 27.8],
    [35.5, 24],
    [37.2, 21],
    [38.5, 18],
    [39.5, 15.5],
    [43.1, 12.7],
    [44, 10.5],
    [47, 11.2],
    [51.2, 11.8],
    [50.8, 10],
    [49, 6],
    [47.5, 3],
    [45, 1.5],
    [42.5, -0.8],
    [40.5, -2.5],
    [39.3, -4.7],
    [39.2, -6.8],
    [40.2, -10.5],
    [40.6, -13.5],
    [40.5, -16],
    [36.5, -18.5],
    [35, -20],
    [35.5, -23.8],
    [32.9, -26],
    [32.8, -28.5],
    [30, -31.5],
    [27, -33.5],
    [25.7, -34],
    [22, -34.2],
    [18.5, -34.2],
    [18, -32.5],
    [16.5, -28.6],
    [15, -26.5],
    [14.5, -22.5],
    [13.5, -20],
    [11.8, -16.5],
    [13.5, -12],
    [13.2, -8.8],
    [12.2, -6],
    [9.5, -1],
    [9.5, 1],
    [9.8, 3.8],
    [6, 4.3],
    [4.5, 6],
    [3.4, 6.4],
    [1, 6],
    [-1, 5],
    [-4, 5.2],
    [-7.5, 4.3],
    [-11.4, 6.9],
    [-13.7, 9.5],
    [-15.5, 11.5],
    [-17.2, 14.7],
    [-16.5, 19.5],
    [-17, 21],
    [-14.5, 26],
    [-9.7, 30],
    [-9.8, 32.5],
    [-6.8, 34],
  ];
  const AFRICA_CITIES = [
    [3.4, 6.5, "Lagos"],
    [-17.4, 14.7],
    [31.2, 30],
    [36.8, -1.3],
    [18.4, -33.9],
    [38.7, 9],
  ];
  const africaUnit = (p) => [(p[0] - 17) / 72.5, -(p[1] - 1.25) / 72.5]; // unit space, roughly -0.5..0.5
  const AFRICA_U = AFRICA.map(africaUnit);
  const inPoly = (x, y, P) => {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      if (
        P[i][1] > y !== P[j][1] > y &&
        x <
          ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]
      )
        c = !c;
    }
    return c;
  };

  (() => {
    const art = document.querySelector(".hero-art");
    const canvas = art && art.querySelector(".hero-canvas");
    const ctx = canvas && canvas.getContext && canvas.getContext("2d");
    if (!ctx) return;

    const BLUE = [6, 81, 251],
      VIOLET = [52, 50, 199],
      WHITE = [255, 255, 255];
    const T = 26.5;
    const lerp = (a, b, t) => a + (b - a) * t;
    const mix = (a, b, t) => [
      lerp(a[0], b[0], t),
      lerp(a[1], b[1], t),
      lerp(a[2], b[2], t),
    ];
    const rgba = (c, a) =>
      "rgba(" +
      (c[0] | 0) +
      "," +
      (c[1] | 0) +
      "," +
      (c[2] | 0) +
      "," +
      a.toFixed(3) +
      ")";
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const smooth = (t) => {
      t = clamp(t, 0, 1);
      return t * t * (3 - 2 * t);
    };
    const ease = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Deterministic layout: seeded scatter with a minimum spacing, so it looks organic but never changes.
    let seed = 11;
    const rnd = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const nodes = [
      { x: -0.13, y: 0.02, gen: 0 },
      { x: 0.13, y: -0.02, gen: 0 },
    ];
    for (let n = 0; n < 4000 && nodes.length < 74; n++) {
      const a = rnd() * 6.2832,
        r = Math.sqrt(rnd()),
        x = Math.cos(a) * r * 0.95,
        y = Math.sin(a) * r * 0.88;
      if (nodes.every((o) => Math.hypot(o.x - x, o.y - y) > 0.15))
        nodes.push({ x, y });
    }
    nodes.forEach((n, i) => {
      if (i > 1)
        n.gen = Math.min(4, 1 + Math.floor(Math.hypot(n.x, n.y / 0.93) / 0.24));
    });
    nodes.sort((a, b) => a.gen - b.gen); // seeds stay first; parents always precede children
    nodes.forEach((n, i) => {
      n.par = -1;
      n.b = 0;
      n.p = n.gen ? 0 : 1;
      n.w = 0;
      n.rx = n.x;
      n.ry = n.y;
      if (i > 1) {
        let best = 0,
          bd = 9;
        nodes.forEach((o, j) => {
          if (o.gen < n.gen) {
            const d = Math.hypot(o.x - n.x, o.y - n.y);
            if (d < bd) {
              bd = d;
              best = j;
            }
          }
        });
        n.par = best;
        n.b = 0.9 + n.gen * 1.25 + rnd() * 0.8;
      }
      const k = clamp((n.x + 0.95) / 1.9, 0, 1);
      n.col =
        i === 0
          ? BLUE
          : i === 1
            ? VIOLET
            : mix(
                mix(BLUE, VIOLET, k),
                WHITE,
                clamp(Math.hypot(n.x, n.y) - 0.3, 0, 0.6) * 0.5
              );
      n.r0 = i < 2 ? 7 : 2.3 + rnd() * 1.3;
    });
    const edges = [[0, 1, 0.9]],
      seen = new Set(["0-1"]),
      adj = nodes.map(() => []);
    const link = (a, b) => {
      const k = a < b ? a + "-" + b : b + "-" + a;
      if (a === b || seen.has(k)) return;
      seen.add(k);
      edges.push([a, b, rnd()]);
    };
    nodes.forEach((n, i) => {
      if (i > 1) link(i, n.par);
      nodes
        .map((o, j) => [j, Math.hypot(o.x - n.x, o.y - n.y)])
        .filter((q) => q[0] !== i && q[1] < 0.36)
        .sort((p, q) => p[1] - q[1])
        .slice(0, 2)
        .forEach((q) => link(i, q[0]));
    });
    edges.forEach((e) => {
      adj[e[0]].push(e[1]);
      adj[e[1]].push(e[0]);
    });
    // three hubs, named for what TwoNode connects
    const hubs = [
      [-0.58, -0.42, "People", -12, -10, "right"],
      [0.66, -0.05, "Systems", 12, 4, "left"],
      [-0.14, 0.64, "Information", 0, 20, "center"],
      [0.36, -0.64, "Process", 12, -8, "left"],
      [-0.7, 0.28, "Relationships", -12, 4, "right"],
    ].map((h) => {
      let best = 2,
        bd = 9;
      nodes.forEach((n, i) => {
        const d = Math.hypot(n.x - h[0], n.y - h[1]);
        if (i > 1 && !n.hub && d < bd) {
          bd = d;
          best = i;
        }
      });
      nodes[best].hub = true;
      nodes[best].r0 = 5.4;
      return { i: best, label: h[2], dx: h[3], dy: h[4], align: h[5] };
    });

    // Africa targets: ~55% of nodes trace the outline, the rest scatter inside it.
    const U = AFRICA_U,
      K = Math.round(nodes.length * 0.55);
    const seg = U.map((p, i) =>
        Math.hypot(
          p[0] - U[(i + 1) % U.length][0],
          p[1] - U[(i + 1) % U.length][1]
        )
      ),
      perim = seg.reduce((a, b) => a + b, 0);
    const tg = [];
    let acc = 0,
      si = 0;
    for (let k = 0; k < K; k++) {
      const s = (k * perim) / K;
      while (acc + seg[si] < s) {
        acc += seg[si];
        si++;
      }
      const f = (s - acc) / seg[si],
        a = U[si],
        b = U[(si + 1) % U.length];
      tg.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]);
    }
    for (let g = 0; g < 20000 && tg.length < nodes.length; g++) {
      const x = rnd() - 0.5,
        y = rnd() - 0.5;
      if (
        inPoly(x, y, U) &&
        tg.every((q) => Math.hypot(q[0] - x, q[1] - y) > 0.065)
      )
        tg.push([x, y]);
    }
    while (tg.length < nodes.length) {
      const x = rnd() - 0.5,
        y = rnd() - 0.5;
      if (inPoly(x, y, U)) tg.push([x, y]);
    }
    const used = tg.map(() => false),
      byT = [];
    nodes
      .map((n, i) => i)
      .sort(
        (a, b) =>
          Math.hypot(nodes[b].x, nodes[b].y) -
          Math.hypot(nodes[a].x, nodes[a].y)
      )
      .forEach((i) => {
        const n = nodes[i];
        let best = -1,
          bd = 9;
        tg.forEach((q, k) => {
          if (used[k]) return;
          const d = Math.hypot(
            n.x * 0.528 - q[0] * 0.9,
            n.y * 0.42 - q[1] * 0.9
          );
          if (d < bd) {
            bd = d;
            best = k;
          }
        });
        used[best] = true;
        n.ax = tg[best][0];
        n.ay = tg[best][1];
        byT[best] = i;
      });
    const aedges = [],
      aseen = new Set();
    const alink = (k1, k2, o) => {
      const a = byT[k1],
        b = byT[k2],
        key = a < b ? a + "-" + b : b + "-" + a;
      if (a === b || aseen.has(key)) return;
      aseen.add(key);
      aedges.push([a, b, o]);
    };
    for (let k = 0; k < K; k++) alink(k, (k + 1) % K, 1);
    for (let k = K; k < tg.length; k++)
      tg.map((q, j) => [j, Math.hypot(q[0] - tg[k][0], q[1] - tg[k][1])])
        .filter((q) => q[0] !== k)
        .sort((p, q) => p[1] - q[1])
        .slice(0, 2)
        .forEach((q) => alink(k, q[0], 0));

    let W = 0,
      H = 0,
      dpr = 1,
      clock = 0,
      last = 0,
      running = false,
      raf = 0,
      wave = null;
    let mx = -999,
      my = -999,
      tpx = 0,
      tpy = 0,
      px = 0,
      py = 0;
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;

    const resize = () => {
      const r = art.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!running) draw(reduceMotion ? 9.5 : clock);
    };

    const startWave = (i) => {
      const d = nodes.map(() => Infinity);
      d[i] = 0;
      const q = [i];
      while (q.length) {
        const c = q.shift();
        adj[c].forEach((nb) => {
          if (d[nb] === Infinity) {
            d[nb] = d[c] + 1;
            q.push(nb);
          }
        });
      }
      wave = { d, t0: clock, max: Math.max.apply(null, d.filter(isFinite)) };
    };

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      const u = t % T,
        ue = u < 11 ? u : u < 22.5 ? 11 : Math.max(0, 11 - (u - 22.5) * 3.2);
      const m = smooth((u - 11.5) / 3) * (1 - smooth((u - 20) / 2.5)); // 0 = network, 1 = Africa
      const sx = W * 0.44,
        sy = H * 0.42,
        ox = W / 2 + px * 10,
        oy = H / 2 + py * 8,
        sc = Math.min(W, H) / 465,
        S = Math.min(W, H) * 0.9;
      const age = wave ? t - wave.t0 : 0;
      if (wave && age * 3.6 > wave.max + 3) wave = null;

      nodes.forEach((n, i) => {
        if (n.gen) n.p = ease(clamp((ue - n.b) / 1.7, 0, 1));
        const fx = ox + n.x * sx,
          fy = oy + n.y * sy,
          pa = n.par >= 0 ? nodes[n.par] : null;
        let x = lerp(pa ? pa.rx : fx, fx, n.p),
          y = lerp(pa ? pa.ry : fy, fy, n.p);
        const amp = (0.5 + 1.8 * n.p) * sc * (1 - 0.6 * m);
        x += Math.sin(t * 0.6 + i * 1.7) * amp;
        y += Math.cos(t * 0.5 + i * 2.3) * amp;
        if (finePointer && mx > -900) {
          const dx = mx - x,
            dy = my - y,
            d = Math.hypot(dx, dy);
          if (d < 150 && d > 0.1) {
            const f = Math.pow(1 - d / 150, 2) * 10;
            x += (dx / d) * f;
            y += (dy / d) * f;
          }
        }
        if (m > 0) {
          x = lerp(x, ox + n.ax * S, m);
          y = lerp(y, oy + n.ay * S, m);
        }
        n.rx = x;
        n.ry = y;
        n.w = wave ? clamp(1 - Math.abs(age * 3.6 - wave.d[i]) / 1.3, 0, 1) : 0;
      });

      // links, with data packets travelling along a share of them
      edges.forEach((e) => {
        const a = nodes[e[0]],
          b = nodes[e[1]],
          al = Math.min(a.p, b.p);
        if (al < 0.05 || m > 0.98) return;
        const lit = (a.w + b.w) / 2;
        ctx.strokeStyle = rgba(
          mix(a.col, b.col, 0.5),
          (0.2 + 0.55 * lit) * al * (1 - m)
        );
        ctx.lineWidth = (0.8 + 1.1 * lit) * Math.max(0.8, sc);
        ctx.beginPath();
        ctx.moveTo(a.rx, a.ry);
        ctx.lineTo(b.rx, b.ry);
        ctx.stroke();
        if (e[2] < 0.4 && al > 0.95 && m < 0.3 && !reduceMotion) {
          const ph = (t * 0.28 + e[2] * 7) % 2.6;
          if (ph < 1) {
            const q = ease(ph),
              f = e[2] < 0.2 ? a : b,
              o = f === a ? b : a;
            const x = lerp(f.rx, o.rx, q),
              y = lerp(f.ry, o.ry, q),
              gl = ctx.createRadialGradient(x, y, 0, x, y, 7 * sc);
            gl.addColorStop(0, rgba(BLUE, 0.7 * Math.sin(Math.PI * ph)));
            gl.addColorStop(1, rgba(BLUE, 0));
            ctx.fillStyle = gl;
            ctx.beginPath();
            ctx.arc(x, y, 7 * sc, 0, 6.2832);
            ctx.fill();
          }
        }
      });

      // Africa: outline and inner mesh draw in, then Lagos reaches out to the other hubs
      if (m > 0.02) {
        aedges.forEach((e) => {
          const a = nodes[e[0]],
            b = nodes[e[1]];
          ctx.strokeStyle = rgba(
            mix(a.col, b.col, 0.5),
            m * (e[2] ? 0.6 : 0.24)
          );
          ctx.lineWidth = (e[2] ? 1.5 : 0.8) * Math.max(0.8, sc);
          ctx.beginPath();
          ctx.moveTo(a.rx, a.ry);
          ctx.lineTo(b.rx, b.ry);
          ctx.stroke();
        });
        const mm = smooth((m - 0.85) / 0.15);
        if (mm > 0) {
          const cp = AFRICA_CITIES.map((c) => {
            const q = africaUnit(c);
            return [ox + q[0] * S, oy + q[1] * S, c[2]];
          });
          cp.forEach((c, i) => {
            if (i) {
              const a = cp[0],
                mxp = (a[0] + c[0]) / 2,
                myp =
                  (a[1] + c[1]) / 2 -
                  0.22 * Math.hypot(c[0] - a[0], c[1] - a[1]);
              ctx.strokeStyle = rgba(BLUE, 0.4 * mm);
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a[0], a[1]);
              ctx.quadraticCurveTo(mxp, myp, c[0], c[1]);
              ctx.stroke();
              const ph = (t * 0.35 + i * 0.37) % 1.7;
              if (ph < 1 && !reduceMotion) {
                const q = ease(ph),
                  x =
                    (1 - q) * (1 - q) * a[0] +
                    2 * (1 - q) * q * mxp +
                    q * q * c[0],
                  y =
                    (1 - q) * (1 - q) * a[1] +
                    2 * (1 - q) * q * myp +
                    q * q * c[1];
                ctx.fillStyle = rgba(VIOLET, 0.9 * mm);
                ctx.beginPath();
                ctx.arc(x, y, 2.4 * sc, 0, 6.2832);
                ctx.fill();
              }
            }
            const ph = (t * 0.45 + i * 0.3) % 1;
            ctx.strokeStyle = rgba(BLUE, 0.5 * (1 - ph) * mm);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(c[0], c[1], (3 + ph * 24) * sc, 0, 6.2832);
            ctx.stroke();
            ctx.fillStyle = rgba(i ? BLUE : VIOLET, mm);
            ctx.beginPath();
            ctx.arc(c[0], c[1], (i ? 3.4 : 5) * sc, 0, 6.2832);
            ctx.fill();
            if (c[2]) {
              ctx.font = `700 10px ${CANVAS_FONT}`;
              ctx.textAlign = "left";
              ctx.fillStyle = "rgba(0,11,61," + (0.85 * mm).toFixed(3) + ")";
              ctx.fillText(c[2], c[0] + 9 * sc, c[1] + 4);
            }
          });
        }
      }

      // the cursor joins the network as a node
      if (finePointer && mx > -900 && ue > 6) {
        nodes.forEach((n) => {
          const d = Math.hypot(n.rx - mx, n.ry - my);
          if (n.p > 0.5 && d < 140) {
            ctx.strokeStyle = rgba(BLUE, (1 - d / 140) * 0.5);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(n.rx, n.ry);
            ctx.stroke();
          }
        });
        ctx.strokeStyle = rgba(BLUE, 0.55);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(mx, my, 5, 0, 6.2832);
        ctx.stroke();
        ctx.fillStyle = rgba(BLUE, 0.9);
        ctx.beginPath();
        ctx.arc(mx, my, 1.8, 0, 6.2832);
        ctx.fill();
      }

      // nodes: a faint ring marks each one as it divides off its parent
      nodes.forEach((n, i) => {
        if (n.p < 0.02) return;
        const r =
          n.r0 *
          sc *
          n.p *
          (1 - 0.3 * m) *
          (1 + 0.05 * Math.sin(t * 1.6 + i * 0.8) + 0.5 * n.w);
        if (n.gen && n.p < 0.9) {
          ctx.strokeStyle = rgba(BLUE, 0.28 * (1 - n.p));
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.rx, n.ry, n.r0 * sc * (1.3 + 3.2 * n.p), 0, 6.2832);
          ctx.stroke();
        }
        if (((n.gen === 0 || n.hub) && m < 0.5) || n.w > 0.05) {
          const rad = r * (n.gen === 0 ? 3.4 : 3 + 4 * n.w),
            h = ctx.createRadialGradient(n.rx, n.ry, r * 0.6, n.rx, n.ry, rad);
          h.addColorStop(0, rgba(n.col, 0.2 + 0.4 * n.w));
          h.addColorStop(1, rgba(n.col, 0));
          ctx.fillStyle = h;
          ctx.beginPath();
          ctx.arc(n.rx, n.ry, rad, 0, 6.2832);
          ctx.fill();
        }
        if (n.hub && m < 0.5) {
          ctx.strokeStyle = rgba(n.col, 0.3 * n.p);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.rx, n.ry, r * 2, 0, 6.2832);
          ctx.stroke();
        }
        ctx.fillStyle = rgba(mix(n.col, WHITE, n.w * 0.55), 1);
        ctx.beginPath();
        ctx.arc(n.rx, n.ry, r, 0, 6.2832);
        ctx.fill();
        if (r > 4) {
          ctx.fillStyle = "rgba(255,255,255,.55)";
          ctx.beginPath();
          ctx.arc(n.rx - r * 0.3, n.ry - r * 0.32, r * 0.22, 0, 6.2832);
          ctx.fill();
        }
      });

      // hub labels once the network has formed
      const la = smooth((u - 8.8) / 0.8) * (1 - smooth((u - 10.7) / 0.7));
      if (la > 0.01) {
        ctx.font = `600 10px ${CANVAS_FONT}`;
        hubs.forEach((h) => {
          const n = nodes[h.i];
          ctx.textAlign = h.align;
          ctx.fillStyle = "rgba(67,78,107," + (0.9 * la).toFixed(3) + ")";
          ctx.fillText(h.label, n.rx + h.dx, n.ry + h.dy);
        });
      }
    }

    const frame = (now) => {
      raf = 0;
      if (!running) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      clock += dt;
      px += (tpx - px) * 0.06;
      py += (tpy - py) * 0.06;
      draw(clock);
      raf = rAF(frame);
    };
    const setRunning = (v) => {
      if (v === running) return;
      running = v;
      if (v) {
        last = performance.now();
        if (!raf) raf = rAF(frame);
      }
    };

    if ("ResizeObserver" in window) new RO(resize).observe(art);
    else listen(window, "resize", resize);
    resize();
    if (document.fonts && document.fonts.ready)
      document.fonts.ready.then(() => {
        if (!running) draw(reduceMotion ? 9.5 : clock);
      });
    if (reduceMotion) return;

    if (finePointer) {
      listen(art, "pointermove", (e) => {
        const r = art.getBoundingClientRect();
        mx = e.clientX - r.left;
        my = e.clientY - r.top;
        tpx = (mx / r.width - 0.5) * 2;
        tpy = (my / r.height - 0.5) * 2;
      });
      listen(art, "pointerleave", () => {
        mx = my = -999;
        tpx = tpy = 0;
      });
    }
    listen(art, "pointerdown", (e) => {
      const r = art.getBoundingClientRect(),
        x = e.clientX - r.left,
        y = e.clientY - r.top;
      let best = -1,
        bd = 70;
      nodes.forEach((n, i) => {
        const d = Math.hypot(n.rx - x, n.ry - y);
        if (n.p > 0.5 && d < bd) {
          bd = d;
          best = i;
        }
      });
      if (best >= 0) startWave(best);
    });
    let inView = true;
    const sync = () => setRunning(inView && !document.hidden);
    if ("IntersectionObserver" in window) {
      new IO(
        (entries) => {
          inView = entries[0].isIntersecting;
          sync();
        },
        { rootMargin: "80px" }
      ).observe(art);
    }
    listen(document, "visibilitychange", sync);
    sync();
  })();

  // ---------------------------------------------------------------------------
  // Motion layer v3: page thread, scrubbed survey plan, text scramble, card tilt, GBC crowd.
  // ---------------------------------------------------------------------------
  (() => {
    if (reduceMotion) return;
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    // A thread that draws down the page as you scroll, ending in the closing rings
    const thread = document.createElement("div");
    thread.className = "page-thread";
    thread.setAttribute("aria-hidden", "true");
    thread.innerHTML = "<i></i><b></b>";
    document.body.appendChild(thread);
    cleanups.push(() => thread.remove());

    // Text scramble on small labels and numbers
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/";
    const scramble = (el) => {
      const final = el.textContent;
      let f = 0;
      const total = 18;
      const id = tInterval(() => {
        f++;
        const k = Math.floor((f / total) * final.length);
        el.textContent =
          final.slice(0, k) +
          final
            .slice(k)
            .replace(/[^\s]/g, () => chars[(Math.random() * chars.length) | 0]);
        if (f >= total) {
          el.textContent = final;
          clearInterval(id);
        }
      }, 32);
    };
    if ("IntersectionObserver" in window) {
      const so = new IO(
        (entries, obs) =>
          entries.forEach((en) => {
            if (en.isIntersecting) {
              obs.unobserve(en.target);
              scramble(en.target);
            }
          }),
        { threshold: 0.8 }
      );
      document
        .querySelectorAll(
          ".eyebrow, .hero-bottom strong, .principle-top span:first-child, .plan-caption"
        )
        .forEach((el) => {
          if (
            el.childNodes.length === 1 &&
            el.firstChild.nodeType === 3 &&
            el.textContent.trim()
          )
            so.observe(el);
        });
    }

    // Work cards: soft 3D tilt toward the pointer
    if (finePointer) {
      document.querySelectorAll(".work-card").forEach((card) => {
        listen(card, "pointermove", (e) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty(
            "--ry",
            ((e.clientX - r.left) / r.width - 0.5) * 8
          );
          card.style.setProperty(
            "--rx",
            -((e.clientY - r.top) / r.height - 0.5) * 6
          );
        });
        listen(card, "pointerleave", () => {
          card.style.setProperty("--rx", 0);
          card.style.setProperty("--ry", 0);
        });
      });
    }

    // GBC crowd: leans toward the cursor, hops in a wave on click
    const gbc = document.querySelector(".gbc-art");
    const people = gbc ? Array.from(gbc.querySelectorAll(".person")) : [];
    if (gbc && people.length) {
      people.forEach((p, i) => p.style.setProperty("--n", i));
      if (finePointer) {
        listen(gbc, "pointermove", (e) =>
          people.forEach((p) => {
            const r = p.getBoundingClientRect();
            p.style.setProperty(
              "--lean",
              (
                clamp((e.clientX - (r.left + r.width / 2)) / 70, -1, 1) * 9
              ).toFixed(1)
            );
          })
        );
        listen(gbc, "pointerleave", () =>
          people.forEach((p) => p.style.setProperty("--lean", 0))
        );
      }
      const crowd = gbc.querySelector(".gbc-people");
      listen(gbc, "click", () => {
        crowd.classList.remove("wave");
        void crowd.offsetWidth;
        crowd.classList.add("wave");
        tTimeout(() => crowd.classList.remove("wave"), 1200);
      });
    }
  })();

  // ---------------------------------------------------------------------------
  // "The bigger picture": Africa lights up from Lagos. Outline traces in, a dot field
  // fills the continent, then waves radiate from key cities and Lagos links out to them.
  // ---------------------------------------------------------------------------
  (() => {
    const deco = document.querySelector(".belief-decoration");
    const cv = deco && document.createElement("canvas");
    const ctx = cv && cv.getContext && cv.getContext("2d");
    if (!ctx) return;
    cv.className = "belief-canvas";
    deco.appendChild(cv);
    cleanups.push(() => cv.remove());
    const LIGHT = [127, 162, 255],
      WHITE = [255, 255, 255],
      BLUE = [6, 81, 251];
    const T = 14;
    const lerp = (a, b, t) => a + (b - a) * t;
    const mix = (a, b, t) => [
      lerp(a[0], b[0], t),
      lerp(a[1], b[1], t),
      lerp(a[2], b[2], t),
    ];
    const rgba = (c, a) =>
      "rgba(" +
      (c[0] | 0) +
      "," +
      (c[1] | 0) +
      "," +
      (c[2] | 0) +
      "," +
      a.toFixed(3) +
      ")";
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const smooth = (t) => {
      t = clamp(t, 0, 1);
      return t * t * (3 - 2 * t);
    };
    let W = 0,
      H = 0,
      S = 0,
      L = 0,
      poly = [],
      cities = [],
      dots = [],
      running = false,
      raf = 0,
      clock = 0,
      last = 0;

    const build = () => {
      const r = cv.getBoundingClientRect(),
        dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      S = Math.min(W, H) * 0.92;
      poly = AFRICA_U.map((p) => [W / 2 + p[0] * S, H / 2 + p[1] * S]);
      L = poly.reduce((a, p, i) => {
        const q = poly[(i + 1) % poly.length];
        return a + Math.hypot(p[0] - q[0], p[1] - q[1]);
      }, 0);
      cities = AFRICA_CITIES.map((c) => {
        const q = africaUnit(c);
        return { x: W / 2 + q[0] * S, y: H / 2 + q[1] * S, n: c[2] };
      });
      const g = Math.max(8, S / 38);
      dots = [];
      for (let y = H / 2 - S / 2; y < H / 2 + S / 2; y += g)
        for (let x = W / 2 - S / 2; x < W / 2 + S / 2; x += g) {
          if (inPoly(x, y, poly))
            dots.push(
              [x, y].concat(cities.map((c) => Math.hypot(x - c.x, y - c.y)))
            );
        }
      if (!running) draw(reduceMotion ? 8 : clock);
    };

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      const u = t % T,
        alive = smooth(u / 0.8) * (1 - smooth((u - 12.2) / 1.6));
      if (alive < 0.01) return;
      const rev = smooth((u - 1) / 4.2) * S * 1.4,
        rings = smooth((u - 4.5) / 1.2);
      dots.forEach((d) => {
        const a = clamp((rev - d[2]) / 40, 0, 1) * alive;
        if (a <= 0.01) return;
        let s = 0;
        for (let c = 0; c < cities.length; c++)
          s += Math.exp(
            -Math.pow((d[2 + c] - ((t * 55 + c * 47) % 230)) / 12, 2)
          );
        s = clamp(s * rings, 0, 1);
        ctx.fillStyle = rgba(mix(LIGHT, WHITE, s), a * (0.3 + 0.7 * s));
        ctx.beginPath();
        ctx.arc(d[0], d[1], 1.1 + 1.2 * s, 0, 6.2832);
        ctx.fill();
      });
      ctx.strokeStyle = rgba(LIGHT, 0.8 * alive);
      ctx.lineWidth = 1.4;
      ctx.lineJoin = "round";
      ctx.setLineDash([L * smooth(u / 3.2) + 0.01, L]);
      ctx.beginPath();
      poly.forEach((p, i) =>
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])
      );
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      const net = smooth((u - 5) / 1.2) * alive;
      cities.forEach((c, i) => {
        if (i) {
          const a = cities[0],
            mx = (a.x + c.x) / 2,
            my = (a.y + c.y) / 2 - 0.22 * Math.hypot(c.x - a.x, c.y - a.y);
          ctx.strokeStyle = rgba(LIGHT, 0.35 * net);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(mx, my, c.x, c.y);
          ctx.stroke();
          const ph = (t * 0.3 + i * 0.37) % 1.7;
          if (ph < 1 && !reduceMotion) {
            const q = ph * ph * (3 - 2 * ph),
              x = (1 - q) * (1 - q) * a.x + 2 * (1 - q) * q * mx + q * q * c.x,
              y = (1 - q) * (1 - q) * a.y + 2 * (1 - q) * q * my + q * q * c.y;
            ctx.fillStyle = rgba(WHITE, 0.9 * net);
            ctx.beginPath();
            ctx.arc(x, y, 2.2, 0, 6.2832);
            ctx.fill();
          }
        }
        ctx.fillStyle = rgba(i ? WHITE : BLUE, net);
        ctx.shadowColor = "#0651fb";
        ctx.shadowBlur = 12 * net;
        ctx.beginPath();
        ctx.arc(c.x, c.y, i ? 3 : 5, 0, 6.2832);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (c.n) {
          ctx.font = `700 10px ${CANVAS_FONT}`;
          ctx.fillStyle = "rgba(219,229,255," + (0.9 * net).toFixed(3) + ")";
          ctx.fillText(c.n, c.x + 9, c.y + 4);
        }
      });
    }
    const frame = (now) => {
      raf = 0;
      if (!running) return;
      clock += Math.min(0.1, (now - last) / 1000);
      last = now;
      draw(clock);
      raf = rAF(frame);
    };
    const setRunning = (v) => {
      if (v === running) return;
      running = v;
      if (v) {
        last = performance.now();
        if (!raf) raf = rAF(frame);
      }
    };
    if ("ResizeObserver" in window) new RO(build).observe(cv);
    else listen(window, "resize", build);
    build();
    if (reduceMotion) return;
    let vis = true;
    const sync = () => setRunning(vis && !document.hidden);
    if ("IntersectionObserver" in window)
      new IO(
        (en) => {
          vis = en[0].isIntersecting;
          sync();
        },
        { rootMargin: "80px" }
      ).observe(deco);
    listen(document, "visibilitychange", sync);
    sync();
  })();

  // Count-up for the proof numbers (static final values stay in the HTML for no-JS and reduced motion).
  (() => {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    const els = document.querySelectorAll(".count");
    els.forEach((el) => {
      el.textContent = "0";
    });
    const io = new IO(
      (entries, obs) =>
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          obs.unobserve(en.target);
          const el = en.target,
            to = +el.dataset.to,
            t0 = performance.now(),
            dur = 1900;
          const step = (now) => {
            const k = Math.min(1, (now - t0) / dur),
              e = 1 - Math.pow(1 - k, 3);
            el.textContent = Math.round(to * e).toLocaleString("en-US");
            if (k < 1) rAF(step);
          };
          rAF(step);
        }),
      { threshold: 0.6 }
    );
    els.forEach((el) => io.observe(el));
  })();

  return () => {
    stopped = true;
    rafIds.forEach((id) => cancelAnimationFrame(id));
    timers.forEach((id) => {
      clearInterval(id);
      clearTimeout(id);
    });
    observers.forEach((o) => o.disconnect());
    cleanups.forEach((fn) => fn());
  };
}
