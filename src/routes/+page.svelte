<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
</script>

<svelte:head>
  <title>Wireloop — Arduino Workflow Builder</title>
</svelte:head>

<!-- Nav -->
<nav class="fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center justify-between px-6">
  <a href="/" class="flex items-center gap-2 no-underline">
    <img src="/LOGO%20-%20Inversed.svg" alt="Wireloop" class="h-8 w-auto brightness-110" />
  </a>
  <div class="flex items-center gap-3">
    <a href="/login" class="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium no-underline">Sign In</a>
    <a href="/signup">
      <Button variant="default" size="sm">Get Started</Button>
    </a>
  </div>
</nav>

<!-- Hero -->
<section class="min-h-screen flex flex-col items-center justify-center bg-background px-6 pt-14">
  <div class="max-w-3xl text-center">
    <h1 class="text-4xl sm:text-5xl font-bold text-foreground mb-4">
      Build Arduino Projects<br />
      <span class="text-accent">Visually</span>
    </h1>
    <p class="text-lg mb-8 max-w-xl mx-auto text-muted-foreground">
      Drag, drop, and wire up microcontrollers in your browser. Generate Arduino code in real time, simulate circuits, and deploy — no hardware required.
    </p>
    <div class="flex items-center justify-center gap-4">
      <a href="/signup">
        <Button variant="default" size="lg" class="text-base px-6">Get Started Free</Button>
      </a>
      <a href="/studio">
        <Button variant="outline" size="lg" class="text-base px-6">Try the Studio</Button>
      </a>
    </div>
  </div>
</section>

<!-- Features -->
<section class="py-24 px-6 bg-background">
  <div class="max-w-5xl mx-auto">
    <h2 class="text-2xl font-bold text-center text-foreground mb-12">What You Can Build</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="rounded-lg p-6 border border-border bg-card">
        <div class="text-3xl mb-3">🧩</div>
        <h3 class="font-semibold text-foreground mb-2">Visual Programming</h3>
        <p class="text-sm text-muted-foreground">Snap together Blockly blocks to define logic, loops, and sensor interactions without writing a single line of code.</p>
      </div>
      <div class="rounded-lg p-6 border border-border bg-card">
        <div class="text-3xl mb-3">⚡</div>
        <h3 class="font-semibold text-foreground mb-2">Real-Time Simulation</h3>
        <p class="text-sm text-muted-foreground">Watch your circuit come to life with SVG-based visual simulation. LEDs blink, servos turn, and sensors react — right in the browser.</p>
      </div>
      <div class="rounded-lg p-6 border border-border bg-card">
        <div class="text-3xl mb-3">🔌</div>
        <h3 class="font-semibold text-foreground mb-2">Code Generation</h3>
        <p class="text-sm text-muted-foreground">Every block translates to real Arduino C++ code. Copy it to your IDE or compile directly from the workspace.</p>
      </div>
    </div>
  </div>
</section>

<!-- Footer -->
<footer class="py-8 px-6 text-center text-xs text-muted-foreground bg-background">
  <p>Wireloop — Arduino Workflow Builder</p>
</footer>
