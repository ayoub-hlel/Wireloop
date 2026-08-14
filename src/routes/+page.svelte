<script lang="ts">
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { toggleTheme, getTheme } from "$lib/theme.js";

  // ── Theme tracking (reactive for icon display) ───────────────────
  let currentTheme = $state(getTheme());
  function handleToggle() {
    toggleTheme();
    currentTheme = getTheme();
  }

  // ── Smooth scroll to anchor ──────────────────────────────────────
  function scrollTo(e: Event, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    mobileOpen = false;
  }

  // ── Mobile menu state ────────────────────────────────────────────
  let mobileOpen = $state(false);

  // ── Nav items ────────────────────────────────────────────────────
  const navItems = [
    { label: "Product", id: "product" },
    { label: "Features", id: "features" },
    { label: "How it works", id: "how" },
  ];

  // ── Feature data ─────────────────────────────────────────────────
  const features = [
    {
      title: "Visual Block Editor",
      body: "Snap together blocks for sensors, actuators, logic, and math. Every connection is valid by construction — no syntax errors, no guessing.",
    },
    {
      title: "Real-Time Simulation",
      body: "LEDs blink, servos turn, sensors react. Your circuit comes to life in the browser before you ever flash a board.",
    },
    {
      title: "Code Generation",
      body: "Every block compiles to real Arduino C++. Copy to your IDE or compile directly from the workspace.",
    },
    {
      title: "Serial Monitor",
      body: "Watch sensor readings and debug output in real time. Step through your program frame by frame.",
    },
  ];

  const steps = [
    { n: "01", title: "Drag your blocks", body: "Pick from the toolbox and snap them together. The editor prevents invalid connections." },
    { n: "02", title: "Wire your circuit", body: "Connect components on a virtual breadboard. The circuit updates live as your program changes." },
    { n: "03", title: "Generate and deploy", body: "Copy the C++ to your IDE and flash. Or simulate everything right in the browser." },
  ];
</script>

<svelte:head>
  <title>Wireloop — Visual Arduino Programming</title>
  <meta name="description" content="Build Arduino projects without writing code. Drag blocks, wire circuits, simulate in real time, and generate production C++ — all in your browser." />
  <meta property="og:title" content="Wireloop — Visual Arduino Programming" />
  <meta property="og:description" content="Drag blocks, wire circuits, simulate in real time. No syntax. No setup. Just build." />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Wireloop — Visual Arduino Programming" />
  <meta name="twitter:description" content="Build Arduino projects without writing code. Drag, wire, simulate, deploy." />
  <link rel="canonical" href="https://wireloop.io/" />
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Wireloop",
      "applicationCategory": "DeveloperTool",
      "operatingSystem": "Web",
      "description": "Visual Arduino programming environment. Drag blocks, wire circuits, simulate in the browser, and generate Arduino C++ code.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    }
  </script>
</svelte:head>

<!-- ═══════════════════════════════════════════════════════════════
     NAV — minimal, Apple-style
     ═══════════════════════════════════════════════════════════════ -->
<nav class="fixed top-0 left-0 right-0 z-50 h-12 bg-background/80 backdrop-blur-xl border-b border-border/50">
  <div class="max-w-[980px] mx-auto h-full flex items-center justify-between px-6">
    <a href="/" class="flex items-center gap-2 no-underline shrink-0">
      <img src="/LOGO.svg" alt="Wireloop" class="h-5 w-auto" />
    </a>

    <!-- Desktop links -->
    <div class="hidden md:flex items-center gap-7">
      {#each navItems as item (item.id)}
        <a
          href="#{item.id}"
          onclick={(e) => scrollTo(e, item.id)}
          class="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 no-underline"
        >
          {item.label}
        </a>
      {/each}
    </div>

    <!-- Desktop auth + theme toggle -->
    <div class="hidden md:flex items-center gap-4">
      <button
        onclick={handleToggle}
        class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors duration-150"
        aria-label="Toggle theme"
      >
        {#if currentTheme === "dark"}
          <!-- Sun icon in dark mode -->
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" class="text-muted-foreground">
            <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        {:else}
          <!-- Moon icon in light mode -->
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" class="text-muted-foreground">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        {/if}
      </button>
      <a href="/login" class="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 no-underline">Sign In</a>
      <a href="/signup" class="text-xs px-3.5 py-1.5 rounded-full font-medium transition-opacity duration-150 no-underline" style="background: hsl(var(--foreground)); color: hsl(var(--background));">Get Started</a>
    </div>

    <!-- Mobile toggle -->
    <div class="md:hidden flex items-center gap-2">
      <button
        onclick={handleToggle}
        class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors duration-150"
        aria-label="Toggle theme"
      >
        {#if currentTheme === "dark"}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" class="text-muted-foreground">
            <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        {:else}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" class="text-muted-foreground">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        {/if}
      </button>
      <button
        class="w-8 h-8 flex items-center justify-center"
        onclick={() => mobileOpen = !mobileOpen}
        aria-label="Toggle menu"
        aria-expanded={mobileOpen}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" class="text-foreground">
          {#if !mobileOpen}
            <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          {:else}
            <path d="M5 5l8 8M13 5l-8 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          {/if}
        </svg>
      </button>
    </div>
  </div>

  <!-- Mobile menu -->
  {#if mobileOpen}
    <div class="md:hidden bg-background border-b border-border px-6 py-5 space-y-4">
      {#each navItems as item (item.id)}
        <a
          href="#{item.id}"
          onclick={(e) => scrollTo(e, item.id)}
          class="block text-sm text-foreground no-underline py-1"
        >
          {item.label}
        </a>
      {/each}
      <Separator />
      <div class="flex flex-col gap-3 pt-2">
        <a href="/login" class="text-sm text-muted-foreground no-underline">Sign In</a>
        <a href="/signup" class="text-sm px-4 py-2 rounded-full text-center font-medium no-underline" style="background: hsl(var(--foreground)); color: hsl(var(--background));">Get Started</a>
      </div>
    </div>
  {/if}
</nav>

<!-- ═══════════════════════════════════════════════════════════════
     HERO — big type, centered, no decoration
     ═══════════════════════════════════════════════════════════════ -->
<section id="product" class="pt-32 sm:pt-40 pb-20 sm:pb-28 px-6">
  <div class="max-w-[680px] mx-auto text-center">
    <h1 class="text-[2.5rem] sm:text-[3.5rem] lg:text-[4rem] leading-[1.08] tracking-tight font-semibold text-foreground mb-6">
      Build Arduino projects without writing code.
    </h1>
    <p class="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-[540px] mx-auto mb-10">
      Drag blocks, wire circuits, and simulate in real time. Generate production C++ — all in your browser.
    </p>
    <div class="flex items-center justify-center gap-5">
      <a href="/signup" class="text-sm px-5 py-2.5 rounded-full font-medium no-underline hover:opacity-80" style="background: hsl(var(--foreground)); color: hsl(var(--background)); transition: opacity 150ms;">
        Start Building
      </a>
      <a
        href="#how"
        onclick={(e) => scrollTo(e, 'how')}
        class="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 no-underline"
      >
        See how it works
      </a>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════════════
     PRODUCT PREVIEW — full width, no chrome, just the product
     ═══════════════════════════════════════════════════════════════ -->
<section class="px-6 pb-28">
  <div class="max-w-[980px] mx-auto">
    <div class="rounded-2xl border border-border bg-card overflow-hidden">
      <!-- Minimal window chrome -->
      <div class="flex items-center gap-1.5 px-5 py-3 border-b border-border">
        <span class="w-2.5 h-2.5 rounded-full bg-muted-foreground/20"></span>
        <span class="w-2.5 h-2.5 rounded-full bg-muted-foreground/20"></span>
        <span class="w-2.5 h-2.5 rounded-full bg-muted-foreground/20"></span>
      </div>
      <!-- Workspace visualization -->
      <div class="aspect-[16/10] relative bg-background flex items-center justify-center p-8 sm:p-12">
        <!-- Subtle grid -->
        <div class="absolute inset-0 opacity-[0.03]" style="background-image: linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px); background-size: 48px 48px;"></div>

        <div class="relative z-10 w-full max-w-[700px] grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-8 sm:gap-12 items-center">
          <!-- Blocks side -->
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-muted/50 border border-border w-fit">
              <span class="w-2 h-2 rounded-full bg-foreground/40"></span>
              <span class="text-xs font-mono text-foreground">Setup</span>
            </div>
            <div class="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-muted/50 border border-border w-fit ml-4">
              <span class="w-2 h-2 rounded-full bg-foreground/30"></span>
              <span class="text-xs font-mono text-muted-foreground">Loop</span>
            </div>
            <div class="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-muted/50 border border-border w-fit">
              <span class="w-2 h-2 rounded-full bg-foreground/20"></span>
              <span class="text-xs font-mono text-muted-foreground/70">Delay</span>
            </div>
          </div>

          <!-- Circuit SVG -->
          <svg viewBox="0 0 240 160" class="w-full max-w-[280px] mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Arduino board -->
            <rect x="10" y="35" width="80" height="90" rx="8" stroke="hsl(var(--foreground))" stroke-width="1" opacity="0.3"/>
            <text x="50" y="84" text-anchor="middle" fill="hsl(var(--foreground))" font-size="10" font-family="monospace" opacity="0.5">Arduino</text>
            <!-- Pins -->
            <rect x="46" y="28" width="8" height="7" rx="1" fill="hsl(var(--foreground))" opacity="0.15"/>
            <rect x="58" y="125" width="8" height="7" rx="1" fill="hsl(var(--foreground))" opacity="0.15"/>
            <!-- LED -->
            <circle cx="180" cy="80" r="22" stroke="hsl(var(--foreground))" stroke-width="1" opacity="0.25"/>
            <circle cx="180" cy="80" r="8" stroke="hsl(var(--foreground))" stroke-width="1" opacity="0.4"/>
            <line x1="180" y1="102" x2="180" y2="135" stroke="hsl(var(--foreground))" stroke-width="0.75" opacity="0.2"/>
            <line x1="170" y1="135" x2="190" y2="135" stroke="hsl(var(--foreground))" stroke-width="0.75" opacity="0.2"/>
            <!-- Wire -->
            <path d="M90 45 L150 45 L150 80 L168 80" stroke="hsl(var(--foreground))" stroke-width="1.5" opacity="0.5" stroke-linecap="round"/>
            <!-- Resistor -->
            <rect x="140" y="76" width="20" height="8" rx="2" stroke="hsl(var(--foreground))" stroke-width="0.75" opacity="0.3"/>
            <!-- Pin label -->
            <text x="50" y="24" text-anchor="middle" fill="hsl(var(--foreground))" font-size="7" font-family="monospace" opacity="0.4">13</text>
          </svg>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════════════
     FEATURES — clean list, no cards, generous spacing
     ═══════════════════════════════════════════════════════════════ -->
<section id="features" class="py-24 sm:py-32 px-6">
  <div class="max-w-[680px] mx-auto">
    <p class="text-sm text-muted-foreground mb-2">Features</p>
    <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-16 sm:mb-20">
      Everything you need.
    </h2>

    <div class="space-y-16">
      {#each features as feature (feature.title)}
        <div>
          <h3 class="text-xl sm:text-2xl font-semibold text-foreground mb-3 tracking-tight">
            {feature.title}
          </h3>
          <p class="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-[560px]">
            {feature.body}
          </p>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════════════
     HOW IT WORKS — numbered, minimal
     ═══════════════════════════════════════════════════════════════ -->
<section id="how" class="py-24 sm:py-32 px-6 border-t border-border">
  <div class="max-w-[680px] mx-auto">
    <p class="text-sm text-muted-foreground mb-2">How it works</p>
    <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-16 sm:mb-20">
      Three steps. Zero setup.
    </h2>

    <div class="space-y-12">
      {#each steps as step (step.n)}
        <div class="flex gap-5">
          <span class="text-sm font-mono text-muted-foreground/50 shrink-0 mt-0.5 w-8">{step.n}</span>
          <div>
            <h3 class="text-lg sm:text-xl font-semibold text-foreground mb-2 tracking-tight">
              {step.title}
            </h3>
            <p class="text-base text-muted-foreground leading-relaxed max-w-[480px]">
              {step.body}
            </p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════════════
     CTA — simple, centered
     ═══════════════════════════════════════════════════════════════ -->
<section class="py-24 sm:py-32 px-6">
  <div class="max-w-[480px] mx-auto text-center">
    <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-4">
      Start building today.
    </h2>
    <p class="text-base sm:text-lg text-muted-foreground mb-10 leading-relaxed">
      Free to use. No hardware required.
    </p>
    <a href="/signup" class="inline-block text-sm px-6 py-3 rounded-full font-medium no-underline hover:opacity-80" style="background: hsl(var(--foreground)); color: hsl(var(--background)); transition: opacity 150ms;">
      Get Started Free
    </a>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════════════
     FOOTER — minimal
     ═══════════════════════════════════════════════════════════════ -->
<footer class="py-6 px-6 border-t border-border">
  <div class="max-w-[980px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
    <span class="text-xs text-muted-foreground/60">Arduino Workflow Builder</span>
    <div class="flex items-center gap-5">
      <a href="/studio" class="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-150 no-underline">Studio</a>
      <a href="/login" class="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-150 no-underline">Sign In</a>
      <a href="/signup" class="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-150 no-underline">Sign Up</a>
    </div>
  </div>
</footer>

<!-- ═══════════════════════════════════════════════════════════════
     GLOBAL — smooth scroll, respect reduced motion
     ═══════════════════════════════════════════════════════════════ -->
<style>
  :global(html) {
    scroll-behavior: smooth;
    scroll-padding-top: 3.5rem;
  }

  @media (prefers-reduced-motion: reduce) {
    :global(html) {
      scroll-behavior: auto;
    }
  }
</style>
