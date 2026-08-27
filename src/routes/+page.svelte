<script lang="ts">
  import { onMount } from "svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import { toggleTheme, getTheme } from "$lib/theme.js";

  let currentTheme = $state(getTheme());
  const isDark = $derived(currentTheme === "dark");
  function handleToggle() {
    toggleTheme();
    currentTheme = getTheme();
  }

  let booted = $state(false);
  let scrolled = $state(false);
  let activeStep = $state(0);

  const features = [
    {
      title: "Drag-and-drop editor",
      body: "Snap blocks for lights, motors and sensors. Connections are always valid, so mistakes can't happen.",
      icon: "blocks",
    },
    {
      title: "Live circuit simulation",
      body: "Watch LEDs blink and motors turn before you touch hardware. Pause or step through whenever you like.",
      icon: "pulse",
    },
    {
      title: "One-click upload",
      body: "Plug in your board and flash your project instantly. No extra software needed.",
      icon: "upload",
    },
  ] as const;

  const steps = [
    {
      n: "01",
      title: "Build your program",
      body: "Drag colorful blocks together to build your program. Logic, timing, sensors and actuators snap into place — and only valid connections are allowed, so mistakes can't happen.",
    },
    {
      n: "02",
      title: "Wire the circuit",
      body: "Connect LEDs, motors and sensors on a virtual breadboard. The circuit updates as you build, so you always see exactly what's connected to what.",
    },
    {
      n: "03",
      title: "Watch it run",
      body: "Simulate your project instantly, right in the browser. Follow every step, pause whenever you like, and understand precisely what your program does before touching hardware.",
    },
    {
      n: "04",
      title: "Upload to your board",
      body: "Plug in your Arduino and flash your project with a single click. No extra tools, no configuration — your creation runs on real hardware in seconds.",
    },
  ];

  onMount(() => {
    requestAnimationFrame(() => (booted = true));

    // nav morph — transparent over hero, frosty pill narrows past threshold
    let ticking = false;
    let stepEls: HTMLElement[] = [];
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        scrolled = window.scrollY > 80;
        // active how-it-works step = the one nearest viewport center
        if (!stepEls.length) stepEls = [...document.querySelectorAll<HTMLElement>(".step")];
        const mid = window.innerHeight * 0.5;
        let best = 0;
        let bestDist = Infinity;
        stepEls.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const d = Math.abs(r.top + r.height / 2 - mid);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        activeStep = best;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  });
</script>

<svelte:head>
  <title>Wireloop — Visual Arduino Programming</title>
  <meta name="description" content="Build Arduino projects without writing code. Drag blocks, simulate in real time and upload to your board — all in your browser." />
  <meta property="og:title" content="Wireloop — Visual Arduino Programming" />
  <meta property="og:description" content="Drag blocks, watch it run, upload to your board. No syntax. No setup." />
  <meta property="og:type" content="website" />
  <link rel="canonical" href="https://wireloop.io/" />
</svelte:head>

<!-- ── Nav — part of the hero at top, narrows into a frosty pill ── -->
<nav class="nav-wrap" class:is-booted={booted} aria-label="Primary">
  <div class="nav-pill" class:is-scrolled={scrolled} style:max-width={scrolled ? "980px" : "1280px"}>
    <a href="/" class="nav-logo" aria-label="Wireloop home">
      <img src="/LOGO.svg" alt="" class="nav-logo-img" />
      <span class="nav-word">Wireloop</span>
      <span class="badge-halo badge-sm"><span class="badge-halo-in">Beta</span></span>
    </a>

    <div class="nav-right">
      <a
        href="https://github.com/ayoub-hlel/Wireloop"
        target="_blank"
        rel="noopener noreferrer"
        class="nav-gh"
        aria-label="GitHub"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
      </a>
      <div class="theme-switch" role="group" aria-label="Theme">
        <button
          class="seg"
          class:active={!isDark}
          onclick={() => { if (isDark) handleToggle(); }}
          aria-label="Light theme"
          aria-pressed={!isDark}
        >
          <SunIcon size={12} strokeWidth={2} />
        </button>
        <button
          class="seg"
          class:active={isDark}
          onclick={() => { if (!isDark) handleToggle(); }}
          aria-label="Dark theme"
          aria-pressed={isDark}
        >
          <MoonIcon size={12} strokeWidth={2} />
        </button>
      </div>
      <Button href="/signup" class="nav-cta rounded-full h-8 px-4 text-[14px]">Get Started</Button>
    </div>
  </div>
</nav>

<main>
  <!-- ── Hero ───────────────────────────────────────────────────── -->
  <section class="hero" id="top">
    <div class="hero-inner">
      <div class="hero-copy" class:is-booted={booted}>
        <p class="hero-eyebrow boot boot-1">Visual Arduino programming</p>
        <h1 class="ds-h1 boot boot-2">Build Arduino projects<br />without writing code.</h1>
        <p class="hero-sub boot boot-3">
          Drag blocks together, watch your circuit run, and upload to your board — right from the browser.
        </p>
        <div class="hero-actions boot boot-4">
          <Button href="/signup" class="pill-primary h-10 px-[18px] text-[15px] font-medium">Start Building</Button>
          <Button variant="outline" href="/studio" class="pill-ghost h-10 px-[18px] text-[15px] font-medium">Open Studio</Button>
          <a
            href="https://github.com/ayoub-hlel/Wireloop"
            target="_blank"
            rel="noopener noreferrer"
            class="pill-ghost inline-flex h-10 items-center gap-1.5 rounded-full border border-border px-[18px] text-[15px] font-medium text-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            GitHub
          </a>
        </div>
      </div>
      <!-- right half intentionally empty -->
    </div>
  </section>

  <!-- ── Manifesto ──────────────────────────────────────────────── -->
  <section class="manifesto reveal">
    <span class="badge-halo"><span class="badge-halo-in">BUILD · SIMULATE · FLASH</span></span>
    <h2 class="ds-h2">From first block to running board.</h2>
    <p class="manifesto-line">No syntax to learn. No drivers to install.</p>
    <p class="manifesto-line muted">Your idea, working on real hardware, in minutes.</p>
  </section>

  <!-- ── Feature trio ───────────────────────────────────────────── -->
  <section class="trio reveal" aria-label="Features">
    {#each features as f, i (f.title)}
      <Card.Root class="feature-card card-enter rounded-[10px] border-border shadow-none py-0 gap-0 overflow-hidden" style="--d:{i * 100}ms">
        <Card.Content class="p-8 pb-9 flex flex-col items-center text-center gap-3">
          <div class="feature-icon" aria-hidden="true">
            {#if f.icon === "blocks"}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>
            {:else if f.icon === "pulse"}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 4v2M12 18v2M4 12h2M18 12h2" /></svg>
            {:else}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            {/if}
          </div>
          <Card.Title class="feature-title text-[18px] font-medium tracking-[-0.01em]">{f.title}</Card.Title>
          <Card.Description class="feature-body text-[14px] leading-[1.65] text-muted-foreground m-0">{f.body}</Card.Description>
        </Card.Content>
      </Card.Root>
    {/each}
  </section>

  <!-- ── How it works — sticky media swaps while text scrolls ──── -->
  <section class="how" id="how-it-works">
    <div class="how-head reveal">
      <span class="badge-halo"><span class="badge-halo-in">HOW IT WORKS</span></span>
      <h2 class="ds-h2 left">Four steps. Zero setup.</h2>
    </div>
    <div class="how-grid">
      <div class="how-copy">
        {#each steps as s, i (s.n)}
          <div class="step" class:active={activeStep === i}>
            <span class="step-n font-mono">{s.n}</span>
            <h3 class="step-title">{s.title}</h3>
            <p class="step-text">{s.body}</p>
            <!-- mobile-only: DS-style media under each step -->
            <div class="media-frame step-media" aria-hidden="true">
              <span class="media-label font-mono">{s.n} · SCREENSHOT / VIDEO</span>
            </div>
          </div>
        {/each}
      </div>
      <div class="how-media">
        <div class="media-frame">
          {#each steps as s, i (s.n)}
            <!-- media placeholder: swap inner box for <img>/<video> when ready -->
            <div class="media-pane" class:pane-active={activeStep === i} aria-hidden="true">
              <span class="media-label font-mono">{s.n} · SCREENSHOT / VIDEO</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <!-- ── Get started ────────────────────────────────────────────── -->
  <section class="start">
    <div class="how-head reveal">
      <span class="badge-halo"><span class="badge-halo-in">GET STARTED</span></span>
      <h2 class="ds-h2 left">Try it now.</h2>
    </div>
    <div class="start-grid">
      <Card.Root class="feature-card start-card card-enter rounded-[10px] border-border shadow-none py-0 gap-0" style="--d:0ms">
        <Card.Content class="p-8 flex flex-col items-stretch text-left gap-2.5 h-full">
          <Card.Title class="text-[18px] font-medium tracking-[-0.01em]">Open Studio</Card.Title>
          <Card.Description class="text-[14px] leading-[1.65] text-muted-foreground m-0">Autosaved workspace — blocks, wiring and code in sync.</Card.Description>
          <Button href="/studio" class="pill-primary mt-auto h-10 w-full rounded-full text-[15px] font-medium">Open Studio</Button>
        </Card.Content>
      </Card.Root>
      <Card.Root class="feature-card start-card card-enter rounded-[10px] border-border shadow-none py-0 gap-0" style="--d:100ms">
        <Card.Content class="p-8 flex flex-col items-stretch text-left gap-2.5 h-full">
          <Card.Title class="text-[18px] font-medium tracking-[-0.01em]">Create a free account</Card.Title>
          <Card.Description class="text-[14px] leading-[1.65] text-muted-foreground m-0">Save projects and continue on any device.</Card.Description>
          <Button href="/signup" class="pill-primary mt-auto h-10 w-full rounded-full text-[15px] font-medium">Sign up</Button>
        </Card.Content>
      </Card.Root>
    </div>
  </section>
</main>

<footer class="footer">
  <div class="footer-inner">
    <div class="footer-rule"></div>
    <div class="footer-row">
      <div class="footer-brand-row">
        <a href="/" class="footer-brand" aria-label="Wireloop home">
          <img src="/LOGO.svg" alt="" class="footer-logo" />
          <span class="footer-word">Wireloop</span>
        </a>
        <a
          href="https://github.com/ayoub-hlel/Wireloop"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-gh"
          aria-label="GitHub"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
        </a>
      </div>
      <p class="footer-copy">© {new Date().getFullYear()} Wireloop · All rights reserved.</p>
      <nav class="footer-links" aria-label="Policies and statements">
        <a href="#top" class="footer-link">Terms of Service</a>
        <span aria-hidden="true" class="footer-dot">·</span>
        <a href="#top" class="footer-link">Privacy Policy</a>
        <span aria-hidden="true" class="footer-dot">·</span>
        <a href="#top" class="footer-link">Safe Use Policy</a>
      </nav>
    </div>
  </div>
</footer>

<style>
  /* rotating conic border — custom property must be registered to animate */
  @property --border-angle {
    syntax: "<angle>";
    initial-value: 0deg;
    inherits: false;
  }
  @keyframes rotating-border {
    from {
      --border-angle: 0deg;
    }
    to {
      --border-angle: 360deg;
    }
  }

  /* ── tokens ─────────────────────────────────────────────────── */
  main,
  footer {
    width: min(100% - var(--ds-gutter) * 2, var(--ds-container));
    margin: 0 auto;
  }
  @media (min-width: 1280px) {
    main,
    footer {
      width: min(100% - var(--ds-gutter-wide) * 2, var(--ds-container-wide));
    }
  }
  main {
    scroll-margin-top: 5.5rem;
  }
  .font-mono {
    font-family: var(--font-mono);
  }

  /* ── nav — part of hero at top, narrows into frosty pill ───── */
  .nav-wrap {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    display: flex;
    justify-content: center;
    padding: 0.55rem 1.25rem 0;
  }
  .nav-pill {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 7px 7px 7px 15px;
    transition: max-width 450ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  /* frosty pill surface — DS ::before pattern */
  .nav-pill::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 999px;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--card) / 0.52);
    backdrop-filter: blur(22px) saturate(150%);
    -webkit-backdrop-filter: blur(22px) saturate(150%);
    box-shadow:
      0 1px 0 hsl(var(--background) / 0.4) inset,
      0 12px 40px -12px hsl(var(--background) / 0.5);
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 400ms ease-in-out,
      visibility 0s 400ms;
  }
  .nav-pill.is-scrolled::before {
    opacity: 1;
    visibility: visible;
    transition: opacity 400ms ease-in-out;
  }
  .nav-pill > * {
    position: relative;
  }
  .nav-wrap {
    opacity: 0;
    transform: translateY(-0.4rem);
    transition:
      opacity 600ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .nav-wrap.is-booted {
    opacity: 1;
    transform: none;
  }
  .nav-logo {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    text-decoration: none;
    min-width: 0;
  }
  .nav-logo-img {
    height: 22px;
    width: auto;
    display: block;
  }
  .nav-word {
    color: hsl(var(--foreground));
    font-weight: 600;
    font-size: 15.5px;
    letter-spacing: -0.01em;
    white-space: nowrap;
  }
  :global(.nav-beta) {
    height: auto;
    padding: 0.08rem 0.45rem;
    font-size: 0.58rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-radius: 999px;
    color: hsl(var(--muted-foreground));
    border-color: hsl(var(--border));
    background: hsl(var(--card) / 0.5);
  }
  .nav-right {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .nav-gh {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    color: hsl(var(--foreground));
    transition: background 200ms;
  }
  .nav-gh:hover {
    background: hsl(var(--muted));
  }

  /* ── theme switch — segmented, animated glyphs ─────────────── */
  .theme-switch {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border: 1px solid hsl(var(--border));
    border-radius: 999px;
    background: hsl(var(--card) / 0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .seg {
    display: grid;
    place-items: center;
    width: 1.5rem;
    height: 1.35rem;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    transition:
      background 300ms,
      color 300ms;
  }
  .seg:hover {
    color: hsl(var(--foreground));
  }
  .seg.active {
    background: hsl(var(--foreground) / 0.14);
    color: hsl(var(--foreground));
  }
  .seg :global(svg) {
    transform: scale(0.78);
    opacity: 0.5;
    transition:
      transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1),
      opacity 300ms;
  }
  .seg.active :global(svg) {
    transform: scale(1);
    opacity: 1;
  }

  :global(.nav-cta) {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }
  @media (max-width: 420px) {
    .badge-halo {
      display: none;
    }
    .nav-word {
      font-size: 0.85rem;
    }
    :global(.nav-cta) {
      padding-inline: 0.75rem;
      font-size: 0.78rem;
    }
    .nav-pill {
      gap: 0.4rem;
      padding-left: 0.6rem;
      padding-right: 0.35rem;
    }
    .nav-right {
      gap: 0.25rem;
    }
    .theme-switch {
      padding: 2px;
      gap: 1px;
    }
    .seg {
      width: 1.35rem;
    }
  }

  /* ── typography scale — smaller, more air ──────────────────── */
  .ds-h1 {
    font-family: var(--font-heading);
    font-weight: 500;
    font-size: clamp(32px, 3.6vw, 46px);
    line-height: 1.2;
    letter-spacing: -0.02em;
    color: hsl(var(--foreground));
    margin: 0;
    text-wrap: balance;
  }
  .ds-h2 {
    font-family: var(--font-heading);
    font-weight: 500;
    font-size: clamp(26px, 2.8vw, 36px);
    line-height: 1.45;
    letter-spacing: -0.02em;
    color: hsl(var(--foreground));
    margin: 0;
    text-align: center;
    text-wrap: balance;
  }
  .ds-h2.left {
    text-align: left;
  }
  /* ── hero ───────────────────────────────────────────────────── */
  .hero {
    min-height: 100svh;
    display: flex;
    align-items: center;
  }
  .hero-inner {
    width: 100%;
    max-width: 490px;
  }
  .hero-eyebrow {
    margin: 0 0 18px;
    font-size: 16px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: hsl(var(--foreground));
  }
  .hero-sub {
    margin: 1.35rem 0 0;
    max-width: 560px;
    font-size: 16px;
    line-height: 1.7;
    color: hsl(var(--muted-foreground));
    text-wrap: pretty;
  }
  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.55rem;
    margin-top: 2rem;
  }
  :global(.pill-primary) {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border-radius: 999px;
  }
  :global(.pill-ghost) {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    border-radius: 999px;
    border-color: hsl(var(--border));
    background: hsl(var(--card) / 0.35);
    color: hsl(var(--foreground));
  }
  :global(.pill-ghost:hover) {
    background: hsl(var(--card) / 0.35);
  }
  /* DS button glow-orb — color fade only, no scale growth */
  :global(.pill-primary::after),
  :global(.pill-ghost::after) {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0;
    z-index: -1;
    transition: opacity 150ms ease;
  }
  :global(.pill-primary::after) {
    background: hsl(var(--background) / 0.18);
  }
  :global(.pill-ghost::after) {
    background: hsl(var(--foreground) / 0.07);
  }
  :global(.pill-primary:hover::after),
  :global(.pill-ghost:hover::after) {
    opacity: 1;
  }
  :global(.nav-cta) {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }
  :global(.nav-cta::after) {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0;
    z-index: -1;
    background: hsl(var(--background) / 0.18);
    transition: opacity 150ms ease;
  }
  :global(.nav-cta:hover::after) {
    opacity: 1;
  }

  /* staggered boot — blur-in like the pill fade */
  .hero-copy .boot {
    opacity: 0;
    transform: translateY(12px);
    filter: blur(8px);
    transition:
      opacity 800ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 800ms cubic-bezier(0.22, 1, 0.36, 1),
      filter 800ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .hero-copy.is-booted .boot {
    opacity: 1;
    transform: none;
    filter: blur(0);
  }
  .boot-1 { transition-delay: 80ms; }
  .boot-2 { transition-delay: 160ms; }
  .boot-3 { transition-delay: 240ms; }
  .boot-4 { transition-delay: 320ms; }

  /* scroll reveal — blur-in */
  .reveal {
    opacity: 0;
    transform: translateY(16px);
    filter: blur(10px);
    transition:
      opacity 750ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 750ms cubic-bezier(0.22, 1, 0.36, 1),
      filter 750ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .reveal:global(.is-in) {
    opacity: 1;
    transform: none;
    filter: blur(0);
  }
  @media (prefers-reduced-motion: reduce) {
    .nav-wrap,
    .boot,
    .reveal {
      opacity: 1 !important;
      transform: none !important;
      filter: none !important;
      transition: none !important;
    }
    :global(.start-card::before) {
      animation: none;
    }
    :global(.card-enter) {
      opacity: 1 !important;
      animation: none !important;
    }
  }

  /* staggered card entrance once the parent reveals — DS card cascade */
  .reveal :global(.card-enter) {
    opacity: 0;
  }
  .reveal:global(.is-in) :global(.card-enter) {
    opacity: 1;
    animation: card-in 700ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
    animation-delay: var(--d, 0ms);
  }
  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(30px);
      filter: blur(8px);
    }
    to {
      opacity: 1;
      transform: none;
      filter: blur(0);
    }
  }

  /* ── manifesto ──────────────────────────────────────────────── */
  .manifesto {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
    max-width: 720px;
    margin: 0 auto;
    padding: 128px 0 120px;
  }
  .manifesto-line {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: hsl(var(--foreground));
  }
  .manifesto-line.muted {
    color: hsl(var(--muted-foreground));
    margin-top: -8px;
  }

  /* ── feature trio ───────────────────────────────────────────── */
  .trio {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 24px;
    padding-bottom: 96px;
  }
  @media (max-width: 900px) {
    .trio {
      grid-template-columns: 1fr;
    }
  }
  :global(.feature-card) {
    background: hsl(var(--card) / 0.42);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition:
      border-color 250ms,
      transform 400ms cubic-bezier(0.16, 1, 0.3, 1),
      background 250ms,
      box-shadow 250ms;
  }
  :global(.feature-card:hover) {
    border-color: hsl(var(--border-strong));
    background: hsl(var(--card) / 0.6);
    transform: translateY(-3px);
    box-shadow:
      0 0 0 1px hsl(var(--border) / 0.4),
      0 0 48px hsl(var(--foreground) / 0.06),
      0 16px 40px hsl(0 0% 0% / 0.25);
  }
  .feature-icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    background: hsl(var(--background) / 0.6);
    color: hsl(var(--muted-foreground));
  }
  .feature-title {
    margin: 0;
  }
  .feature-body {
    max-width: 22rem;
  }

  /* ── how it works — sticky swapping media + scrolling copy ──── */
  .how {
    padding: 48px 0 136px;
  }
  .how-head {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    max-width: 980px;
    margin: 0 auto 72px;
  }
  .how-grid {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    gap: clamp(32px, 4vw, 72px);
    align-items: start;
    max-width: 980px;
    margin: 0 auto;
  }
  @media (max-width: 860px) {
    .how-grid {
      grid-template-columns: 1fr;
    }
  }
  .how-copy {
    /* trailing space so the last step can reach viewport center before the sticky unpins */
    padding-bottom: 26vh;
    /* top padding keeps step 01 clear of the mask's top fade */
    padding-top: 110px;
    /* gradient fade at edges while scrolling through steps */
    mask-image: linear-gradient(to bottom, transparent 0, black 110px, black calc(100% - 26vh), transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 110px, black calc(100% - 26vh), transparent 100%);
  }
  .step {
    min-height: 42vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 440px;
    opacity: 0.3;
    transition: opacity 450ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .step:first-child {
    min-height: 36vh;
  }
  .step:last-child {
    min-height: 36vh;
  }
  .step.active {
    opacity: 1;
  }
  .step-media {
    display: none;
  }
  @media (max-width: 860px) {
    .step {
      min-height: 0;
      padding-block: 1.4rem;
      opacity: 1;
      max-width: none;
    }
    .how-copy {
      padding: 0;
      mask-image: none;
      -webkit-mask-image: none;
    }
    .how-media {
      display: none;
    }
    .step-media {
      display: grid;
      place-items: center;
      margin-top: 1.4rem;
    }
  }
  .step-n {
    display: block;
    margin-bottom: 9px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.12em;
    color: hsl(var(--muted-foreground));
  }
  .step-title {
    margin: 0 0 9px;
    font-family: var(--font-heading);
    font-weight: 500;
    font-size: 22px;
    letter-spacing: -0.015em;
    color: hsl(var(--foreground));
  }
  .step-text {
    margin: 0;
    font-size: 16px;
    line-height: 1.7;
    color: hsl(var(--muted-foreground));
  }
  .how-media {
    position: sticky;
    top: 50%;
    transform: translateY(-50%);
  }
  .media-frame {
    position: relative;
    aspect-ratio: 16 / 11;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--card) / 0.35);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    /* DS demo-video-frame halo */
    box-shadow:
      0 0 0 1px hsl(var(--foreground) / 0.04),
      0 0 80px hsl(var(--foreground) / 0.06),
      0 24px 64px hsl(0 0% 0% / 0.3);
  }
  .media-pane {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    opacity: 0;
    transform: scale(1.03);
    filter: blur(6px);
    transition:
      opacity 550ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 550ms cubic-bezier(0.22, 1, 0.36, 1),
      filter 550ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .media-pane.pane-active {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
  .media-label {
    font-size: 12px;
    letter-spacing: 0.14em;
    color: hsl(var(--muted-foreground));
    opacity: 0.7;
  }

  /* ── get started — compact horizontal cards ─────────────────── */
  .start {
    padding-bottom: 136px;
  }
  .start-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
    max-width: 980px;
    margin: 0 auto;
  }
  @media (max-width: 720px) {
    .start-grid {
      grid-template-columns: 1fr;
    }
  }
  :global(.start-card) {
    position: relative;
    background: hsl(var(--card) / 0.42);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition:
      background 200ms ease,
      border-color 200ms ease;
  }
  :global(.start-card:hover) {
    background: hsl(var(--card) / 0.6);
    border-color: transparent;
  }
  /* DS rotating conic light-ring, revealed on hover */
  :global(.start-card::before) {
    content: "";
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    padding: 2px;
    background: conic-gradient(
      from var(--border-angle),
      hsl(var(--primary) / 0.12) 0%,
      hsl(var(--primary) / 0.55) 25%,
      hsl(var(--primary) / 0.12) 50%,
      hsl(var(--primary) / 0.55) 75%,
      hsl(var(--primary) / 0.12) 100%
    );
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask-composite: exclude;
    opacity: 0;
    pointer-events: none;
    transition: opacity 300ms ease;
    animation: rotating-border 6s linear infinite;
  }
  :global(.start-card:hover::before) {
    opacity: 1;
  }

  /* ── footer — DS minimal hairline + centered 1fr/auto/1fr row ── */
  .footer {
    padding-bottom: 1.75rem;
  }
  .footer-rule {
    width: 100%;
    height: 1px;
    background: hsl(var(--border));
  }
  .footer-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding-top: 20px;
  }
  @media (min-width: 1024px) {
    .footer-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
    }
    .footer-brand-row {
      justify-self: start;
    }
    .footer-links {
      justify-self: end;
    }
  }
  .footer-brand-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .footer-logo {
    height: 1.15rem;
    width: auto;
  }
  .footer-word {
    color: hsl(var(--foreground));
    font-weight: 600;
    font-size: 0.88rem;
  }
  .footer-gh {
    display: inline-grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid hsl(var(--border));
    border-radius: 999px;
    color: hsl(var(--muted-foreground));
    transition:
      color 200ms,
      border-color 200ms;
  }
  .footer-gh:hover {
    color: hsl(var(--foreground));
    border-color: hsl(var(--border-strong));
  }
  .footer-copy {
    margin: 0;
    font-size: 14px;
    color: hsl(var(--muted-foreground));
    text-align: center;
    white-space: nowrap;
  }
  .footer-links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    column-gap: 12px;
    row-gap: 8px;
  }
  .footer-link {
    font-size: 14px;
    line-height: 150%;
    color: hsl(var(--foreground));
    text-decoration: none;
    transition: opacity 180ms;
    white-space: nowrap;
  }
  .footer-link:hover {
    opacity: 0.7;
  }
  .footer-dot {
    font-size: 14px;
    color: hsl(var(--muted-foreground));
  }
  @media (max-width: 640px) {
    .manifesto,
    .how,
    .start {
      padding-top: 64px;
      padding-bottom: 72px;
    }
    .trio {
      padding-bottom: 72px;
    }
  }
</style>
