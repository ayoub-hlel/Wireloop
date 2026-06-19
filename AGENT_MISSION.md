# AGENT_MISSION.md
# Wireloop — Complete AI Agent Mission Document
# Version: 1.0.0 | Last Updated: 2025
# This document is the single source of truth for all AI-assisted development sessions.
# Drop this file in your repo root. Gemini_CLI reads it at the start of every session.

---

## ⚠️ CRITICAL STANDING ORDERS — READ BEFORE ANYTHING ELSE

These rules are ABSOLUTE. They apply to every task, every file, every session, without exception.
Violating any of these is a hard stop. Report the conflict and wait for human approval.

```
RULE 01 → Never commit directly to `main` or `develop` branches. Ever.
RULE 02 → Run npm run check + npm test + npm run build before every commit. All must exit 0.
RULE 03 → If any check fails — STOP. Report the full error. Propose a fix. Wait for approval.
RULE 04 → Every commit must follow Conventional Commits format (defined in Goal 6).
RULE 05 → Every commit must include the Co-authored-by trailer (defined in Goal 6).
RULE 06 → Never hardcode colors, spacing, or font values — use Tailwind tokens only.
RULE 07 → Never modify src/env.ts directly — edit env/ files only.
RULE 08 → Never use Svelte 4 patterns ($:, export let, createEventDispatcher, <slot>).
RULE 09 → Auth logic lives in src/lib/auth.ts only. Never scattered across components.
RULE 10 → Convex client singleton lives in src/lib/convex.ts only.
RULE 11 → Components used in 1 route → colocate next to that route.
RULE 12 → Components used in 2+ routes → src/lib/components/[category]/.
RULE 13 → Before any task → state which branch you are on.
RULE 14 → After any task → state what still needs to be done.
RULE 15 → When in doubt → generate a report and ask before changing anything.
RULE 16 → Never delete files without confirming what imports them first.
RULE 17 → Always use git mv when moving files (preserves git history).
RULE 18 → Design audit must show 0 violations before any UI branch merges.
RULE 19 → npm run check must show 0 TypeScript errors before any branch merges.
RULE 20 → Never install a new package without flagging it for human review first.
```

---

## 📋 PROJECT OVERVIEW

**Project Name:** Wireloop
**Purpose:** Visual programming platform for Arduino development. Drag-and-drop block interface (Google Blockly v10), real-time SVG circuit simulation, automatic Arduino C++ code generation. Designed to make electronics and embedded programming accessible to beginners and students.

### Complete Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | SvelteKit | 2.x | File-based routing, SSR, static adapter |
| UI Language | Svelte | 5.x | Runes-based reactivity — NO Svelte 4 patterns |
| Type System | TypeScript | 5.x | Strict mode enabled — zero any types |
| Styling | Tailwind CSS | v4 | Vite plugin, no postcss config needed |
| UI Components | shadcn-svelte | Latest | New York style, slate base — do not modify |
| Block Editor | Google Blockly | v10 | Custom block definitions, XML serialization |
| Authentication | Auth.js (SvelteKit) | v5 | Replaces Clerk — GitHub + Google + Credentials |
| Backend/DB | Convex | Latest | Real-time, type-safe, serverless |
| SVG Engine | SVG.js + plugins | Latest | Circuit simulation canvas |
| Code Highlight | shiki | Latest | Replaces highlight.js — lighter, Vite-native |
| Testing | Vitest | Latest | Unit tests, globals enabled |
| Build Tool | Vite | 6.x | With SvelteKit plugin |
| Adapter | @sveltejs/adapter-static | Latest | SPA mode, index.html fallback |
| Icons | lucide-svelte | Latest | Consistent icon system |
| UI Primitives | bits-ui | Latest | Headless, accessible primitives |

### Path Aliases (svelte.config.ts)
```
$lib    → src/lib/
@       → src/
```

### Environment Variables
```
# Authentication (Auth.js)
AUTH_SECRET=<openssl rand -base64 32>
GITHUB_ID=<from github.com/settings/developers>
GITHUB_SECRET=<from github.com/settings/developers>
GOOGLE_ID=<from console.cloud.google.com>
GOOGLE_SECRET=<from console.cloud.google.com>

# Convex
PUBLIC_CONVEX_URL=https://xxx.convex.cloud

# REMOVED (do not use):
# PUBLIC_CLERK_PUBLISHABLE_KEY — deleted in Goal 2
```

---

## 🗂️ TARGET PROJECT STRUCTURE

This is the final target architecture. All reorganization work converges here.

```
Arduino-Workflow-Builder/
│
├── .github/
│   ├── pull_request_template.md     ← PR checklist template
│   └── workflows/
│       └── ci.yml                   ← GitHub Actions: check + test + build
│
├── convex/                          ← Convex backend (serverless functions)
│   ├── schema.ts                    ← Database schema — single source of truth
│   ├── auth.ts                      ← Auth.js ↔ Convex JWT integration
│   ├── users.ts                     ← User CRUD operations
│   ├── projects.ts                  ← Project CRUD + queries
│   ├── sessions.ts                  ← Auth.js session management
│   ├── settings.ts                  ← User preferences
│   ├── projectFiles.ts              ← File attachments
│   └── _generated/                  ← Auto-generated by Convex CLI (do not edit)
│
├── env/
│   ├── env.development.ts           ← Dev config (copied to src/env.ts by npm run dev)
│   ├── env.staging.ts               ← Staging config
│   └── env.prod.ts                  ← Production config
│
├── src/
│   ├── lib/                         ← Everything importable via $lib/
│   │   ├── components/
│   │   │   ├── ui/                  ← shadcn-svelte primitives (NEVER MODIFY)
│   │   │   ├── layout/              ← Navbar, Sidebar, Shell, PageHeader, Footer
│   │   │   ├── editor/              ← Blockly wrapper, CodePanel, Toolbar (shared)
│   │   │   ├── circuit/             ← SVG canvas, component overlays (shared)
│   │   │   └── shared/              ← Schematic-styled Card, Badge, Button variants
│   │   ├── stores/                  ← ONLY truly global cross-cutting state
│   │   ├── auth.ts                  ← Auth.js config: providers, callbacks, adapter
│   │   ├── convex.ts                ← Convex client singleton
│   │   ├── convex-auth-adapter.ts   ← Auth.js → Convex database adapter
│   │   └── utils.ts                 ← cn() and shared utility functions
│   │
│   ├── blocks/                      ← Blockly block definitions (organized by category)
│   │   ├── io/                      ← digital read/write, analog, PWM
│   │   ├── sensors/                 ← temperature, light, motion, distance
│   │   ├── actuators/               ← LED, servo, motor, buzzer
│   │   ├── logic/                   ← if/else, loops, variables, comparison
│   │   ├── time/                    ← delay, millis, timer, scheduling
│   │   ├── math/                    ← arithmetic, map, constrain, random
│   │   ├── comms/                   ← Serial, I2C, SPI, UART
│   │   └── index.ts                 ← Registers ALL blocks with Blockly
│   │
│   ├── core/
│   │   ├── blockly/                 ← Editor init, toolbox XML, workspace serialization
│   │   ├── codegen/                 ← Arduino C++ code generation from Blockly AST
│   │   └── simulation/              ← SVG circuit simulation engine
│   │
│   ├── microcontrollers/            ← Board configs: Uno, Nano, Mega pin maps
│   │
│   ├── routes/
│   │   ├── (auth)/                  ← Public auth routes (no session required)
│   │   │   ├── login/
│   │   │   │   └── +page.svelte
│   │   │   └── auth/
│   │   │       └── [...auth]/
│   │   │           └── +server.ts   ← Auth.js catch-all handler
│   │   │
│   │   ├── (app)/                   ← Protected routes (session required)
│   │   │   ├── +layout.server.ts    ← Single auth guard for ALL app routes
│   │   │   ├── +layout.svelte       ← App shell with Navbar + Sidebar
│   │   │   ├── dashboard/
│   │   │   │   ├── +page.svelte
│   │   │   │   └── +page.server.ts
│   │   │   ├── editor/
│   │   │   │   └── [projectId]/
│   │   │   │       ├── +page.svelte
│   │   │   │       ├── +page.server.ts
│   │   │   │       ├── +page.ts      ← Client-only Blockly init
│   │   │   │       └── components/   ← Colocated editor components
│   │   │   │           ├── BlocklyPanel.svelte
│   │   │   │           ├── CircuitPanel.svelte
│   │   │   │           ├── CodePanel.svelte
│   │   │   │           └── Toolbar.svelte
│   │   │   ├── projects/
│   │   │   │   ├── +page.svelte
│   │   │   │   └── +page.server.ts
│   │   │   └── settings/
│   │   │       ├── +page.svelte
│   │   │       └── +page.server.ts
│   │   │
│   │   └── (marketing)/             ← Public marketing pages
│   │       ├── +page.svelte         ← Landing page
│   │       ├── +layout.svelte       ← Marketing layout (different from app shell)
│   │       └── about/
│   │           └── +page.svelte
│   │
│   ├── types/                       ← ALL TypeScript interfaces centralized
│   │   ├── project.ts               ← ProjectData, ProjectFile, BoardType
│   │   ├── board.ts                 ← MicrocontrollerConfig, PinMap
│   │   ├── session.ts               ← SessionUser, AuthSession
│   │   ├── blocks.ts                ← BlockDefinition, BlockCategory
│   │   └── index.ts                 ← Re-exports everything from this folder
│   │
│   ├── app.css                      ← Global styles (Tailwind entry + schematic classes)
│   ├── app.html                     ← HTML template
│   ├── env.ts                       ← AUTO-GENERATED — do not edit manually
│   └── hooks.server.ts              ← Auth.js handle hook
│
├── static/                          ← Static assets (images, fonts, etc.)
├── AGENT_MISSION.md                 ← This file
├── package.json
├── svelte.config.ts
├── tailwind.config.ts               ← Design token single source of truth
├── tsconfig.json                    ← Strict TypeScript config
└── vite.config.ts
```

---

---

# 🎨 GOAL 1 — SCHEMATIC UI DESIGN SYSTEM

## Design Philosophy

**Style Name:** Schematic UI (PCB Aesthetic / Technical Brutalism)

**Inspiration:** KiCad schematic editor, oscilloscope displays, multimeter interfaces, ESD anti-static workbench mats, signal trace routing, Arduino IDE dark theme, CAD software UI.

**Core Principle:** Every pixel should feel like it belongs in an electronics lab. The interface is a tool, not a decoration. High contrast, technical precision, zero fluff. Dark backgrounds with fine grid overlays, neon electric blue accents, monospace typography for anything data-related, sharp corners on all containers (like PCB component footprints).

**What it is NOT:** No glassmorphism, no purple gradients, no rounded blobs, no drop shadows that look like material design, no white backgrounds, no "startup SaaS" aesthetic.

---

## Design Tokens — Tailwind Config

**File: `tailwind.config.ts`** — This is the ONLY place colors, shadows, and fonts are defined.

```typescript
import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds (PCB board layers) ──────────────────────
        bg: {
          DEFAULT:  '#0A0E14',   // deepest background — near black with blue tint
          surface:  '#111827',   // card surfaces — slightly lifted
          elevated: '#1A2236',   // modals, dropdowns, tooltips
          overlay:  '#0D1520CC', // semi-transparent overlay (CC = 80% opacity)
        },

        // ── Borders (trace lines) ────────────────────────────────
        border: {
          DEFAULT: '#1E3A5F',    // standard border — subtle blue-dark
          strong:  '#2563EB',    // highlighted border — active states
          glow:    '#00BFFF44',  // glowing border — focus rings
        },

        // ── Primary Accent (oscilloscope blue) ───────────────────
        primary: {
          DEFAULT: '#00BFFF',    // electric blue — main accent
          glow:    '#00BFFF33',  // 20% opacity — glow backgrounds
          dim:     '#007EA8',    // dimmed — secondary actions
          dark:    '#004D6B',    // very dim — subtle highlights
        },

        // ── Semantic Colors ───────────────────────────────────────
        success:  '#00FF88',     // terminal green — success states
        warning:  '#FFB800',     // amber — warnings, caution
        danger:   '#FF4444',     // red — errors, destructive actions
        info:     '#00BFFF',     // same as primary — informational

        // ── Text ──────────────────────────────────────────────────
        text: {
          DEFAULT: '#E2E8F0',    // primary text — slightly warm white
          muted:   '#64748B',    // secondary text — slate gray
          subtle:  '#334155',    // very muted — placeholder text
          code:    '#00BFFF',    // inline code — electric blue
          inverse: '#0A0E14',    // text on light backgrounds
        },
      },

      // ── Typography ─────────────────────────────────────────────
      fontFamily: {
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Use font-mono for: code blocks, pin labels, voltage readings, block names
        // Use font-sans for: body copy, descriptions, UI labels
      },

      fontSize: {
        'xs-mono':  ['0.65rem', { lineHeight: '1rem',    letterSpacing: '0.05em' }],
        'sm-mono':  ['0.75rem', { lineHeight: '1.25rem', letterSpacing: '0.04em' }],
        'base-mono':['0.875rem',{ lineHeight: '1.5rem',  letterSpacing: '0.03em' }],
      },

      // ── Grid Background (ESD mat / PCB grid) ───────────────────
      backgroundImage: {
        'grid-schematic': `
          linear-gradient(rgba(0,191,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,191,255,0.04) 1px, transparent 1px)
        `,
        'grid-schematic-dense': `
          linear-gradient(rgba(0,191,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,191,255,0.03) 1px, transparent 1px)
        `,
        'grid-dot': `radial-gradient(circle, rgba(0,191,255,0.15) 1px, transparent 1px)`,
        'trace-h':  'linear-gradient(90deg, rgba(0,191,255,0.1) 1px, transparent 1px)',
        'trace-v':  'linear-gradient(rgba(0,191,255,0.1) 1px, transparent 1px)',
      },

      backgroundSize: {
        'grid-schematic':       '24px 24px',
        'grid-schematic-dense': '12px 12px',
        'grid-dot':             '20px 20px',
      },

      // ── Shadows (glow effects like LEDs on a board) ─────────────
      boxShadow: {
        'glow-blue':    '0 0 8px rgba(0,191,255,0.25), 0 0 20px rgba(0,191,255,0.1)',
        'glow-blue-lg': '0 0 16px rgba(0,191,255,0.35), 0 0 40px rgba(0,191,255,0.15)',
        'glow-green':   '0 0 8px rgba(0,255,136,0.25), 0 0 20px rgba(0,255,136,0.1)',
        'glow-amber':   '0 0 8px rgba(255,184,0,0.25), 0 0 20px rgba(255,184,0,0.1)',
        'glow-red':     '0 0 8px rgba(255,68,68,0.25), 0 0 20px rgba(255,68,68,0.1)',
        'inset-trace':  'inset 0 1px 0 rgba(0,191,255,0.15)',
        'card':         '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,191,255,0.08)',
      },

      // ── Border Radius (sharp = technical precision) ─────────────
      // Use rounded-sm (2px) for cards and containers
      // Use rounded (4px) for buttons and inputs
      // NEVER use rounded-lg, rounded-xl, rounded-2xl, rounded-full (on non-circular elements)
      borderRadius: {
        DEFAULT: '4px',
        sm:      '2px',
        // rounded-full is still allowed ONLY for circular avatar images and loading spinners
      },

      // ── Animation (subtle, technical) ───────────────────────────
      keyframes: {
        'trace-flow': {
          '0%':   { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '24px 24px' },
        },
        'led-pulse': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 8px rgba(0,191,255,0.4)' },
          '50%':       { opacity: '0.6', boxShadow: '0 0 16px rgba(0,191,255,0.8)' },
        },
        'scan-line': {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      animation: {
        'trace-flow': 'trace-flow 4s linear infinite',
        'led-pulse':  'led-pulse 2s ease-in-out infinite',
        'scan-line':  'scan-line 3s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
```

---

## Global CSS (`src/app.css`)

```css
@import 'tailwindcss';

/* ── Base Schematic Layout ──────────────────────────────────────── */
html, body {
  @apply bg-bg text-text font-sans;
  background-image: theme('backgroundImage.grid-schematic');
  background-size: theme('backgroundSize.grid-schematic');
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── PCB Card Component ─────────────────────────────────────────── */
/* Use class="card-schematic" on all container cards */
.card-schematic {
  @apply bg-bg-surface border border-border rounded-sm shadow-card relative overflow-hidden;
}
/* Top trace line (like a PCB component boundary) */
.card-schematic::before {
  content: '';
  @apply absolute inset-x-0 top-0 h-[1px];
  background: linear-gradient(90deg, transparent, rgba(0,191,255,0.5), transparent);
}
/* Active/highlighted card state */
.card-schematic.active,
.card-schematic:focus-within {
  @apply border-border-strong shadow-glow-blue;
}

/* ── Schematic Panel (larger sections) ─────────────────────────── */
.panel-schematic {
  @apply bg-bg-surface border border-border rounded-sm;
  box-shadow: inset 0 1px 0 rgba(0,191,255,0.08), 0 4px 24px rgba(0,0,0,0.4);
}

/* ── Trace Divider (instead of <hr>) ────────────────────────────── */
.trace-divider {
  @apply h-[1px] w-full my-4;
  background: linear-gradient(90deg, transparent, rgba(0,191,255,0.2) 20%, rgba(0,191,255,0.2) 80%, transparent);
}

/* ── LED Indicator Dot ──────────────────────────────────────────── */
.led {
  @apply w-2 h-2 rounded-full inline-block;
}
.led-green  { @apply bg-success animate-led-pulse; box-shadow: 0 0 6px #00FF88; }
.led-blue   { @apply bg-primary animate-led-pulse; box-shadow: 0 0 6px #00BFFF; }
.led-amber  { @apply bg-warning; box-shadow: 0 0 6px #FFB800; }
.led-red    { @apply bg-danger; box-shadow: 0 0 6px #FF4444; }
.led-off    { @apply bg-text-subtle; }

/* ── Pin Label (board pin annotations) ──────────────────────────── */
.pin-label {
  @apply font-mono text-xs-mono text-primary bg-primary-dark
         border border-primary-dim rounded-sm px-1 py-0.5
         tracking-wider uppercase;
}

/* ── Monospace Data Display (voltage, frequency, readings) ─────── */
.data-readout {
  @apply font-mono text-base-mono text-primary bg-bg
         border border-border rounded-sm px-3 py-2
         shadow-inset-trace;
  font-variant-numeric: tabular-nums;
}

/* ── Schematic Button Styles ────────────────────────────────────── */
.btn-schematic {
  @apply font-mono text-sm-mono text-primary bg-transparent
         border border-primary rounded-sm px-4 py-2
         hover:bg-primary-glow hover:shadow-glow-blue
         active:scale-[0.98]
         transition-all duration-150
         cursor-pointer select-none;
}
.btn-schematic-ghost {
  @apply font-mono text-sm-mono text-text-muted bg-transparent
         border border-border rounded-sm px-4 py-2
         hover:border-primary hover:text-primary
         transition-all duration-150;
}
.btn-schematic-danger {
  @apply font-mono text-sm-mono text-danger bg-transparent
         border border-danger rounded-sm px-4 py-2
         hover:bg-danger/10 hover:shadow-glow-red
         transition-all duration-150;
}

/* ── Input Fields ───────────────────────────────────────────────── */
.input-schematic {
  @apply font-mono text-sm-mono text-text bg-bg
         border border-border rounded-sm px-3 py-2
         placeholder:text-text-subtle
         focus:outline-none focus:border-primary focus:ring-1 focus:ring-border-glow
         transition-colors duration-150;
}

/* ── Scrollbar Styling ───────────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #0A0E14; }
::-webkit-scrollbar-thumb {
  background: #1E3A5F;
  border-radius: 2px;
}
::-webkit-scrollbar-thumb:hover { background: #2563EB; }

/* ── Code Blocks (shiki output) ─────────────────────────────────── */
.shiki {
  @apply rounded-sm border border-border p-4 overflow-x-auto font-mono text-sm;
  background-color: #0A0E14 !important;
}

/* ── Selection ───────────────────────────────────────────────────── */
::selection {
  background: rgba(0, 191, 255, 0.2);
  color: #E2E8F0;
}
```

---

## Design Enforcement Rules for Agent

### Hard Rules (violations block merge)
```
❌ VIOLATION: Any bg-white, bg-gray-*, bg-slate-*, bg-zinc-* used as main background
❌ VIOLATION: Any text-black or text-gray-900 on dark backgrounds
❌ VIOLATION: Any rounded-lg, rounded-xl, rounded-2xl on non-circular elements
❌ VIOLATION: Hardcoded color values in style="" attributes (e.g. style="color: #fff")
❌ VIOLATION: Hardcoded color values in CSS not from the Tailwind token system
❌ VIOLATION: highlight.js usage (replaced by shiki)
❌ VIOLATION: Any shadow other than the defined shadow-* tokens in tailwind.config.ts
❌ VIOLATION: Missing border on interactive card or panel components
❌ VIOLATION: font-sans on code blocks, pin labels, or data readouts
```

### Warnings (fix this sprint)
```
⚠️ WARNING: Using generic Tailwind colors (blue-500, green-400) instead of semantic tokens
⚠️ WARNING: Component missing hover state
⚠️ WARNING: Interactive element missing focus-visible ring
⚠️ WARNING: Animation without prefers-reduced-motion guard
⚠️ WARNING: Text contrast below WCAG AA (4.5:1 for normal text)
```

### Design Audit Agent Prompt
```
SYSTEM: You are a design audit agent for the Wireloop project.
You enforce the Schematic UI design system. Your job is ONLY to audit and report.
Do NOT modify any files. Do NOT suggest fixes outside the design system.

DESIGN SYSTEM RULES:
- Backgrounds: ONLY bg-bg, bg-bg-surface, bg-bg-elevated, bg-bg-overlay
- Borders: ONLY border-border, border-border-strong, border-border-glow
- Accent: text-primary, bg-primary, bg-primary-glow, shadow-glow-blue
- Text: text-text, text-text-muted, text-text-subtle, text-text-code
- Success: text-success, bg-success (terminal green #00FF88)
- Warning: text-warning, bg-warning (amber #FFB800)
- Danger: text-danger, bg-danger (red #FF4444)
- Border radius: rounded-sm (cards), rounded (buttons/inputs) — NO rounded-lg+
- Fonts: font-mono for code/labels/readouts, font-sans for body
- Shadows: ONLY shadow-glow-blue, shadow-glow-green, shadow-glow-amber, shadow-glow-red, shadow-card, shadow-inset-trace
- NO: white backgrounds, NO hardcoded colors, NO rounded-xl, NO light themes
- EVERY card/panel must have: border border-border minimum
- EVERY interactive element must have: hover state + focus-visible ring

TASK:
Scan all .svelte files in src/routes/ and src/lib/components/.
For each violation, output:

## Design Audit Report — [timestamp]

### ❌ Critical Violations (block merge)
| File | Line | Rule Violated | Current Value | Required Fix |
|------|------|--------------|---------------|--------------|

### ⚠️ Warnings (fix this sprint)
| File | Line | Issue | Suggestion |

### 💡 Suggestions (nice to have)
| File | Suggestion |

### ✅ Compliant Components
[List of components with zero violations]

### Summary
- Total violations: X
- Total warnings: X
- Files audited: X
- Estimated fix effort: Low / Medium / High
- Merge blocked: YES / NO

Do NOT suggest changes outside the Schematic UI design system.
Do NOT modify any files.
```

---

---

# 🔐 GOAL 2 — AUTH.JS MIGRATION (REPLACE CLERK)

## Why This Migration

| Concern | Clerk | Auth.js v5 |
|---------|-------|------------|
| Cost | Free tier limited, expensive at scale | Completely free, open source |
| Bundle size | ~300kb client-side JS SDK | Minimal — server-side only |
| SvelteKit integration | Bolted-on JS SDK, not native | Official @auth/sveltekit adapter |
| Session ownership | Clerk-managed (external) | You own sessions in Convex |
| Convex integration | Required JWT template setup in Clerk dashboard | Native JWT → Convex auth |
| Offline dev | Requires Clerk service to be up | Works fully local |
| OAuth providers | GitHub, Google, many more | Same providers, identical setup |
| Vendor lock-in | High — migrations are painful | Zero — standard OAuth flows |

## OAuth Providers to Support
- ✅ GitHub OAuth
- ✅ Google OAuth
- ✅ Email/Password (Credentials provider with Convex user lookup)

## Session Strategy
- **Database sessions via Convex** (not JWT)
- Every session stored in Convex `sessions` table
- Session token in HTTP-only cookie (Auth.js default)
- Sessions queryable alongside user data — no token decoding needed

---

## Phase 1 — Cleanup: Remove Clerk

### Qwen Prompt — Phase 1
```
TASK: Remove Clerk from the project completely.

Step 1: Uninstall package
  Run: npm uninstall @clerk/clerk-js

Step 2: Remove Clerk source
  Delete the entire src/auth/ directory.
  Before deleting, scan ALL files in src/ for any import from src/auth/ or @clerk/clerk-js
  If any file imports from these locations: LIST IT, do not delete, report to me first.

Step 3: Remove environment variables
  In env/env.development.ts, env/env.staging.ts, env/env.prod.ts:
  Remove the PUBLIC_CLERK_PUBLISHABLE_KEY entry from each file.

Step 4: Remove Clerk usage from components
  Search all .svelte and .ts files for:
  - import ... from '@clerk/clerk-js'
  - Clerk()
  - clerk.user
  - clerk.session
  - currentUser()
  - useUser()
  - useClerk()
  - SignedIn, SignedOut (Clerk components)
  For each occurrence: COMMENT IT OUT with // TODO: CLERK_REMOVAL — do not delete yet.
  Report every file where a comment was added.

Step 5: Remove Firebase (also legacy)
  Check if any file OUTSIDE src/firebase/ imports from src/firebase/
  If YES: list those files, stop, report to me.
  If NO: delete src/firebase/ directory entirely.
  Run: npm uninstall firebase (if it exists in package.json)
  Remove any FIREBASE_* env vars from env/ files.

Step 6: Run npm run check
  Paste the FULL output. Do not interpret it — paste verbatim.

Report: A table of every file touched, what was done, and current status.
```

---

## Phase 2 — Install Auth.js

```bash
npm install @auth/sveltekit @auth/core
```

---

## Phase 3 — Core Auth.js Files

### File: `src/lib/auth.ts`
```typescript
import { SvelteKitAuth } from '@auth/sveltekit'
import GitHub from '@auth/core/providers/github'
import Google from '@auth/core/providers/google'
import Credentials from '@auth/core/providers/credentials'
import { ConvexAdapter } from '$lib/convex-auth-adapter'
import { env } from '$env/dynamic/private'
import bcrypt from 'bcryptjs'
import { convexClient } from '$lib/convex'
import { api } from '../../convex/_generated/api'

export const { handle, signIn, signOut } = SvelteKitAuth({
  adapter: ConvexAdapter,

  providers: [
    GitHub({
      clientId:     env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
    }),

    Google({
      clientId:     env.GOOGLE_ID,
      clientSecret: env.GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    Credentials({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email',    placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password', placeholder: '••••••••' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Look up user in Convex by email
        const user = await convexClient.query(api.users.getByEmail, {
          email: credentials.email as string,
        })

        if (!user?.passwordHash) return null

        // Verify password
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValid) return null

        return {
          id:    user._id,
          email: user.email,
          name:  user.name,
          image: user.avatarUrl ?? null,
        }
      },
    }),
  ],

  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    // Expose Convex user ID on session — accessible in all load functions
    session({ session, user }) {
      if (user) session.user.id = user.id
      return session
    },
    // Called after OAuth sign-in — can block sign-in by returning false
    async signIn({ user, account }) {
      // Block sign-in if email domain is banned, etc.
      // Return true to allow, false to deny
      return true
    },
  },

  pages: {
    signIn:  '/login',
    signOut: '/login',
    error:   '/login',     // Error page — ?error=... query param
  },
})
```

### File: `src/hooks.server.ts`
```typescript
import { handle } from '$lib/auth'
export { handle }
```

### File: `src/routes/auth/[...auth]/+server.ts`
```typescript
import { handle } from '$lib/auth'
export const { GET, POST } = handle
```

---

## Phase 4 — Convex Auth Adapter

Auth.js requires an adapter to read/write sessions to your database.
There is no official Convex adapter yet — build it as follows.

### Convex Schema Additions (`convex/schema.ts`)
```typescript
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // ── Existing tables ──────────────────────────────────────────────
  profiles: defineTable({
    userId:    v.string(),          // Auth.js user ID (replaces clerkId)
    username:  v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio:       v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_userId', ['userId']),

  projects: defineTable({
    userId:      v.string(),        // Auth.js user ID
    name:        v.string(),
    description: v.optional(v.string()),
    boardType:   v.string(),        // 'uno' | 'nano' | 'mega'
    blockyXml:   v.string(),        // Serialized Blockly workspace
    visibility:  v.string(),        // 'private' | 'public'
    createdAt:   v.number(),
    updatedAt:   v.number(),
  }).index('by_userId', ['userId']),

  settings: defineTable({
    userId:    v.string(),
    boardType: v.optional(v.string()),
    theme:     v.optional(v.string()),
    language:  v.optional(v.string()),
    autoSave:  v.optional(v.boolean()),
  }).index('by_userId', ['userId']),

  projectFiles: defineTable({
    projectId: v.id('projects'),
    name:      v.string(),
    content:   v.string(),
    mimeType:  v.string(),
    createdAt: v.number(),
  }).index('by_projectId', ['projectId']),

  // ── Auth.js required tables ──────────────────────────────────────
  users: defineTable({
    name:          v.optional(v.string()),
    email:         v.optional(v.string()),
    emailVerified: v.optional(v.number()),
    image:         v.optional(v.string()),
    passwordHash:  v.optional(v.string()),  // For credentials provider
    createdAt:     v.number(),
  }).index('by_email', ['email']),

  accounts: defineTable({
    userId:            v.string(),   // References users._id
    type:              v.string(),   // 'oauth' | 'credentials' | 'email'
    provider:          v.string(),   // 'github' | 'google' | 'credentials'
    providerAccountId: v.string(),
    access_token:      v.optional(v.string()),
    refresh_token:     v.optional(v.string()),
    expires_at:        v.optional(v.number()),
    token_type:        v.optional(v.string()),
    scope:             v.optional(v.string()),
    id_token:          v.optional(v.string()),
    session_state:     v.optional(v.string()),
  })
    .index('by_userId', ['userId'])
    .index('by_provider', ['provider', 'providerAccountId']),

  sessions: defineTable({
    userId:       v.string(),        // References users._id
    expires:      v.number(),        // Unix timestamp (ms)
    sessionToken: v.string(),
  }).index('by_token', ['sessionToken']),

  verificationTokens: defineTable({
    identifier: v.string(),          // Email address
    token:      v.string(),
    expires:    v.number(),
  }).index('by_token', ['identifier', 'token']),
})
```

### File: `src/lib/convex-auth-adapter.ts`
```typescript
import type { Adapter, AdapterUser, AdapterSession, AdapterAccount, VerificationToken } from '@auth/core/adapters'
import { convexClient } from '$lib/convex'
import { api } from '../../convex/_generated/api'

export const ConvexAdapter: Adapter = {
  // ── User ──────────────────────────────────────────────────────────
  async createUser(user: Omit<AdapterUser, 'id'>): Promise<AdapterUser> {
    const id = await convexClient.mutation(api.users.create, {
      email:         user.email ?? undefined,
      name:          user.name ?? undefined,
      image:         user.image ?? undefined,
      emailVerified: user.emailVerified ? user.emailVerified.getTime() : undefined,
      createdAt:     Date.now(),
    })
    return { id, ...user }
  },

  async getUser(id: string): Promise<AdapterUser | null> {
    const user = await convexClient.query(api.users.getById, { id })
    if (!user) return null
    return {
      id:            user._id,
      email:         user.email ?? null,
      name:          user.name ?? null,
      image:         user.image ?? null,
      emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
    }
  },

  async getUserByEmail(email: string): Promise<AdapterUser | null> {
    const user = await convexClient.query(api.users.getByEmail, { email })
    if (!user) return null
    return {
      id:            user._id,
      email:         user.email ?? null,
      name:          user.name ?? null,
      image:         user.image ?? null,
      emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
    }
  },

  async getUserByAccount({ provider, providerAccountId }): Promise<AdapterUser | null> {
    const account = await convexClient.query(api.accounts.getByProvider, {
      provider,
      providerAccountId,
    })
    if (!account) return null
    return this.getUser!(account.userId)
  },

  async updateUser(user: Partial<AdapterUser> & { id: string }): Promise<AdapterUser> {
    await convexClient.mutation(api.users.update, {
      id:            user.id,
      name:          user.name ?? undefined,
      image:         user.image ?? undefined,
      emailVerified: user.emailVerified ? user.emailVerified.getTime() : undefined,
    })
    return this.getUser!(user.id) as Promise<AdapterUser>
  },

  // ── Session ───────────────────────────────────────────────────────
  async createSession(session: AdapterSession): Promise<AdapterSession> {
    await convexClient.mutation(api.sessions.create, {
      userId:       session.userId,
      sessionToken: session.sessionToken,
      expires:      session.expires.getTime(),
    })
    return session
  },

  async getSessionAndUser(sessionToken: string) {
    const result = await convexClient.query(api.sessions.getWithUser, { sessionToken })
    if (!result) return null
    return {
      session: {
        userId:       result.session.userId,
        sessionToken: result.session.sessionToken,
        expires:      new Date(result.session.expires),
      },
      user: {
        id:            result.user._id,
        email:         result.user.email ?? null,
        name:          result.user.name ?? null,
        image:         result.user.image ?? null,
        emailVerified: result.user.emailVerified ? new Date(result.user.emailVerified) : null,
      },
    }
  },

  async updateSession(session: Partial<AdapterSession> & { sessionToken: string }) {
    await convexClient.mutation(api.sessions.update, {
      sessionToken: session.sessionToken,
      expires:      session.expires ? session.expires.getTime() : undefined,
    })
    return session as AdapterSession
  },

  async deleteSession(sessionToken: string) {
    await convexClient.mutation(api.sessions.remove, { sessionToken })
  },

  // ── Account ───────────────────────────────────────────────────────
  async linkAccount(account: AdapterAccount) {
    await convexClient.mutation(api.accounts.create, account)
  },

  async unlinkAccount({ provider, providerAccountId }) {
    await convexClient.mutation(api.accounts.remove, { provider, providerAccountId })
  },

  // ── Verification Token (email magic links) ────────────────────────
  async createVerificationToken(token: VerificationToken) {
    await convexClient.mutation(api.verificationTokens.create, {
      identifier: token.identifier,
      token:      token.token,
      expires:    token.expires.getTime(),
    })
    return token
  },

  async useVerificationToken({ identifier, token }) {
    const result = await convexClient.mutation(api.verificationTokens.use, {
      identifier,
      token,
    })
    if (!result) return null
    return {
      identifier: result.identifier,
      token:      result.token,
      expires:    new Date(result.expires),
    }
  },
}
```

---

## Phase 5 — Route Auth Guard

### File: `src/routes/(app)/+layout.server.ts`
```typescript
import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

// This single file protects EVERY route inside (app)/
// No per-page auth checks needed anywhere inside (app)/
export const load: LayoutServerLoad = async ({ locals }) => {
  const session = await locals.auth()
  if (!session?.user) {
    redirect(303, '/login')
  }
  return {
    session,        // Available to all (app) pages via $page.data.session
    user: session.user,
  }
}
```

### File: `src/routes/(auth)/login/+page.svelte`
```svelte
<script lang="ts">
  import { signIn } from '@auth/sveltekit/client'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
  let email    = $state('')
  let password = $state('')
  let loading  = $state(false)
  let error    = $state<string | null>(null)

  async function handleCredentials() {
    loading = true
    error   = null
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    if (result?.error) {
      error = 'Invalid email or password'
    }
    loading = false
  }
</script>

<!-- Schematic UI login page -->
<div class="min-h-screen bg-bg bg-grid-schematic bg-grid-schematic flex items-center justify-center">
  <div class="card-schematic w-full max-w-md p-8 space-y-6">
    <div class="space-y-1">
      <h1 class="font-mono text-xl text-primary tracking-wider">ARDUINO_WORKFLOW</h1>
      <p class="text-text-muted text-sm font-mono">authenticate to continue</p>
    </div>

    <!-- OAuth Providers -->
    <div class="space-y-3">
      <button class="btn-schematic w-full flex items-center gap-3"
              onclick={() => signIn('github', { redirectTo: '/dashboard' })}>
        <span class="font-mono">$ auth --provider github</span>
      </button>
      <button class="btn-schematic w-full flex items-center gap-3"
              onclick={() => signIn('google', { redirectTo: '/dashboard' })}>
        <span class="font-mono">$ auth --provider google</span>
      </button>
    </div>

    <div class="trace-divider"></div>

    <!-- Credentials Form -->
    <div class="space-y-3">
      <input class="input-schematic w-full" type="email"
             placeholder="email@domain.com" bind:value={email} />
      <input class="input-schematic w-full" type="password"
             placeholder="••••••••" bind:value={password} />
      {#if error}
        <p class="font-mono text-xs-mono text-danger">> ERROR: {error}</p>
      {/if}
      <button class="btn-schematic w-full" onclick={handleCredentials} disabled={loading}>
        {loading ? '> connecting...' : '> sign_in()'}
      </button>
    </div>
  </div>
</div>
```

---

## Phase 6 — Convex Projects Migration

### Qwen Prompt — Phase 6
```
TASK: Migrate Convex backend from Clerk to Auth.js user IDs.

In convex/schema.ts:
1. Find any field named 'clerkId' in the profiles table
2. Rename it to 'userId' (string type — Auth.js user ID)
3. Update the index from 'by_clerkId' to 'by_userId'

In convex/users.ts:
1. Replace all ctx.auth.getUserIdentity() calls that expect a Clerk token subject
   with: const identity = await ctx.auth.getUserIdentity()
   The identity.subject will now be the Auth.js user ID
2. Add a getByEmail query (required by ConvexAdapter)
3. Add a getById query
4. Add create, update mutations

In convex/projects.ts:
1. Replace all references to clerkId with userId
2. Ensure every mutation that writes a project includes:
   const identity = await ctx.auth.getUserIdentity()
   if (!identity) throw new Error('Unauthenticated')
   And uses identity.subject as the userId

In convex/auth.ts:
1. Remove Clerk JWT template configuration
2. Auth.js issues standard JWTs that Convex accepts via JWKS endpoint
3. The Convex JWKS integration is handled automatically — no custom config needed

Create new Convex files:
- convex/sessions.ts    (create, getWithUser, update, remove)
- convex/accounts.ts    (create, remove, getByProvider)
- convex/verificationTokens.ts (create, use)

Report: Every file changed, what changed, any query/mutation with hardcoded
Clerk logic that needs manual review.

After all changes: Run npm run check and paste full output.
```

---

---

# 🚨 GOAL 3 — ALERT AGENT (BEST PRACTICES WATCHDOG)

## What the Alert Agent Does

The Alert Agent is a **code review agent** that runs on demand. It is NOT a linter.
ESLint handles syntax. The Alert Agent handles:
1. Deprecated or suboptimal packages
2. Svelte 5 + SvelteKit 2 anti-patterns
3. Security and architecture red flags
4. Better package alternatives
5. Performance issues specific to this stack

It outputs a prioritized report. It NEVER auto-fixes. You approve fixes first.

---

## Package Watch List

These packages should be audited on every `npm install` of a new dependency:

| If you see this package | Flag it as | Recommended alternative |
|------------------------|------------|------------------------|
| highlight.js | ⚠️ Heavy | shiki (Vite-native, tree-shakeable) |
| sveltestrap | 🔴 Incompatible | bits-ui + shadcn-svelte (Svelte 5 native) |
| @clerk/clerk-js | 🔴 Replaced | @auth/sveltekit (Goal 2) |
| firebase | 🔴 Legacy | Convex (already migrated) |
| axios | ⚠️ Unnecessary | Native fetch (SvelteKit has it built in) |
| moment | ⚠️ 67kb bundle | date-fns or Temporal API |
| lodash | ⚠️ Usually overkill | Specific lodash-es imports or vanilla JS |
| jquery | 🔴 Never | Svelte reactivity + native DOM APIs |
| react / vue | 🔴 Wrong framework | Svelte 5 |
| styled-components | 🔴 Wrong paradigm | Tailwind CSS v4 tokens |
| dotenv | ⚠️ SvelteKit handles this | $env/dynamic/private or $env/static/private |
| cross-env | ⚠️ SvelteKit handles this | npm scripts in package.json |
| express | ⚠️ Usually wrong | SvelteKit server routes (+server.ts) |

---

## Alert Agent Prompt (run on demand)

```
SYSTEM: You are a best-practices audit agent for Wireloop.
Stack: SvelteKit 2, Svelte 5, TypeScript strict, Tailwind v4, Convex, Auth.js v5.
You audit and report ONLY. You do NOT modify files.

TASK: Full codebase audit. Scan: package.json, src/**/*.svelte, src/**/*.ts, convex/**/*.ts

OUTPUT FORMAT:

## Best Practices Audit Report — [timestamp]

### 🔴 Critical Issues (fix before next commit)
| Location | Issue | Impact | Recommended Fix |
|----------|-------|--------|----------------|

### ⚠️ Warnings (fix this sprint)
| Location | Issue | Effort | Recommended Fix |

### 💡 Suggestions (backlog)
| Location | Suggestion | Benefit |

### 📦 Package Audit
| Package | Status | Version | Recommendation |

### 🔐 Security Flags
| Location | Issue | Severity |

### ✅ Good Patterns Found
[List things that are done correctly — positive reinforcement]

### Summary Statistics
- Critical issues: X
- Warnings: X
- Packages flagged: X
- Security issues: X

---

WHAT TO LOOK FOR:

SVELTE 5 ANTI-PATTERNS:
- $: reactive statements → should be $derived() or $effect()
- export let prop → should be let { prop } = $props()
- createEventDispatcher → should be callback props
- <slot> → should be {@render children()} snippets
- writable() stores for local component state → should be $state()
- onMount for data fetching → should be +page.server.ts load function
- Direct document.querySelector DOM manipulation → Svelte bind: or use: action
- new Promise in component script for async init → use SvelteKit load functions

SVELTEKIT 2 ANTI-PATTERNS:
- fetch in onMount instead of load functions
- Per-page auth checks when a layout guard exists
- Missing +error.svelte pages for route groups
- goto() on server side (use redirect() instead)
- Using deprecated load({ fetch }) without proper typing
- Not using $app/navigation properly
- Missing proper error handling in load functions (use error() from @sveltejs/kit)

CONVEX ANTI-PATTERNS:
- Mutations without ctx.auth.getUserIdentity() check
- No input validation on mutations (use v. validators)
- Queries returning all records without pagination
- Client-side Convex mutations without optimistic updates on long operations
- Missing indexes for frequently queried fields

TYPESCRIPT ANTI-PATTERNS:
- any type usage
- Missing return types on exported functions
- Type assertions (as SomeType) instead of type guards
- Non-null assertions (!) without a comment explaining why
- Missing interface definitions for $props()

SECURITY FLAGS:
- Environment variables that should be private but are PUBLIC_
- Client-side code accessing sensitive data directly
- Missing rate limiting on credentials login
- Convex mutations callable by unauthenticated users
- eval() or new Function() usage
- dangerouslySetInnerHTML equivalent in Svelte ({@html} without sanitization)
```

---

---

# ⚡ GOAL 4 — SVELTE 5 FULL CODEBASE OPTIMIZATION

## The Runes System — Complete Reference

Svelte 5 replaces the compiler-magic reactivity of Svelte 4 with explicit **Runes**.
These are special functions prefixed with `$` that signal to the compiler.

### Complete Rune Reference

```svelte
<script lang="ts">
// ──────────────────────────────────────────────────────────────────
// $state() — Reactive state (replaces: let x = value + $: x = value)
// ──────────────────────────────────────────────────────────────────
let count = $state(0)                          // primitive
let user  = $state<User | null>(null)          // nullable typed state
let items = $state<string[]>([])               // array (mutations are tracked)
let form  = $state({ name: '', email: '' })    // object (nested props tracked)

// $state.raw() — State that does NOT track nested mutations
// Use for large objects where you always replace, never mutate
let config = $state.raw<Config>(defaultConfig)

// $state.snapshot() — Get a non-reactive copy of state
const snapshot = $state.snapshot(items)        // plain array, not reactive

// ──────────────────────────────────────────────────────────────────
// $derived() — Computed values (replaces: $: derived = ...)
// ──────────────────────────────────────────────────────────────────
let double    = $derived(count * 2)
let fullName  = $derived(`${user?.firstName} ${user?.lastName}`)
let filtered  = $derived(items.filter(i => i.includes(search)))

// $derived.by() — For complex derivations with multiple steps
let processedData = $derived.by(() => {
  const sorted = [...items].sort()
  const filtered = sorted.filter(Boolean)
  return filtered.map(transformItem)
})

// ──────────────────────────────────────────────────────────────────
// $effect() — Side effects (replaces: $: { sideEffect() })
// ──────────────────────────────────────────────────────────────────
$effect(() => {
  // Runs when dependencies change (auto-tracked)
  console.log('count changed:', count)

  // Cleanup function (runs before next effect + on destroy)
  return () => {
    console.log('cleanup')
  }
})

// $effect.pre() — Runs BEFORE DOM updates (rare, for measurements)
$effect.pre(() => {
  const height = element.offsetHeight  // capture before update
})

// $effect.root() — Creates an effect outside component lifecycle
// Use in .svelte.ts files or class instances
const cleanup = $effect.root(() => {
  $effect(() => { /* effect */ })
  return () => { /* cleanup */ }
})

// ──────────────────────────────────────────────────────────────────
// $props() — Component props (replaces: export let prop)
// ──────────────────────────────────────────────────────────────────
// Always define an interface first
interface Props {
  title:    string
  count?:   number                    // optional — use default
  onClose?: () => void                // callback prop (replaces event dispatch)
  class?:   string                    // allow parent to pass class names
  children?: import('svelte').Snippet // slot equivalent
}
let {
  title,
  count    = 0,                       // default value
  onClose,
  class:   className = '',            // rename reserved words
  children,
}: Props = $props()

// $bindable() — Makes a prop bindable with bind:propName
interface BindableProps {
  value: string
}
let { value = $bindable('') }: BindableProps = $props()
// Parent usage: <Component bind:value={myVar} />

// ──────────────────────────────────────────────────────────────────
// $inspect() — Debug logging (DEVELOPMENT ONLY — remove before commit)
// ──────────────────────────────────────────────────────────────────
$inspect(count)                        // logs when count changes
$inspect(user, items).with(console.trace) // custom handler

// ──────────────────────────────────────────────────────────────────
// Snippets — Replaces <slot> and named slots
// ──────────────────────────────────────────────────────────────────
// In component definition:
interface Props {
  header?:   import('svelte').Snippet
  children?: import('svelte').Snippet
  item?:     import('svelte').Snippet<[{ name: string; id: string }]>  // typed snippet
}
let { header, children, item }: Props = $props()

// Render in template:
// {@render header?.()}
// {@render children?.()}
// {@render item?.({ name: 'test', id: '1' })}

// In parent (snippet definition):
// {#snippet header()}<h1>Title</h1>{/snippet}
// {#snippet item(data)}<li>{data.name}</li>{/snippet}
// <MyComponent {header} {item}>Default children</MyComponent>
</script>
```

---

## Migration Patterns: Svelte 4 → Svelte 5

### Pattern 1: Reactive Declarations
```svelte
<!-- ❌ SVELTE 4 -->
<script>
  let count = 0
  $: double = count * 2
  $: triple = count * 3
  $: if (count > 100) resetCount()
  $: console.log('count:', count)        // side effect
</script>

<!-- ✅ SVELTE 5 -->
<script lang="ts">
  let count  = $state(0)
  let double = $derived(count * 2)
  let triple = $derived(count * 3)
  $effect(() => { if (count > 100) resetCount() })
  $effect(() => { console.log('count:', count) })
</script>
```

### Pattern 2: Props
```svelte
<!-- ❌ SVELTE 4 -->
<script>
  export let title = 'Untitled'
  export let items = []
  export let disabled = false
  export let onSubmit          // function prop
</script>

<!-- ✅ SVELTE 5 -->
<script lang="ts">
  interface Props {
    title?:    string
    items?:    string[]
    disabled?: boolean
    onSubmit?: (data: FormData) => void
  }
  let {
    title    = 'Untitled',
    items    = [],
    disabled = false,
    onSubmit,
  }: Props = $props()
</script>
```

### Pattern 3: Event Dispatching
```svelte
<!-- ❌ SVELTE 4 -->
<script>
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  function save() {
    dispatch('save', { projectId: '123', xml: workspace.getXml() })
  }
  function close() {
    dispatch('close')
  }
</script>
<button on:click={save}>Save</button>
<button on:click={close}>Close</button>

<!-- ✅ SVELTE 5 -->
<script lang="ts">
  interface Props {
    onSave?:  (data: { projectId: string; xml: string }) => void
    onClose?: () => void
  }
  let { onSave, onClose }: Props = $props()

  function save() {
    onSave?.({ projectId: '123', xml: workspace.getXml() })
  }
</script>
<button onclick={save}>Save</button>
<button onclick={onClose}>Close</button>
```

### Pattern 4: Slot → Snippet
```svelte
<!-- ❌ SVELTE 4 — Component definition -->
<div class="card-schematic">
  <div class="header">
    <slot name="header">Default Header</slot>
  </div>
  <div class="body">
    <slot />
  </div>
  <div class="footer">
    <slot name="footer" {onClose} />
  </div>
</div>

<!-- ✅ SVELTE 5 — Component definition -->
<script lang="ts">
  import type { Snippet } from 'svelte'
  interface Props {
    header?:   Snippet
    children?: Snippet
    footer?:   Snippet<[{ onClose: () => void }]>
  }
  let { header, children, footer }: Props = $props()
  function onClose() { /* ... */ }
</script>
<div class="card-schematic">
  <div class="header">{@render header?.() ?? 'Default Header'}</div>
  <div class="body">{@render children?.()}</div>
  <div class="footer">{@render footer?.({ onClose })}</div>
</div>

<!-- ✅ SVELTE 5 — Usage -->
<Card>
  {#snippet header()}<h2 class="font-mono text-primary">Project Editor</h2>{/snippet}
  <p>Content goes here</p>
  {#snippet footer({ onClose })}<button onclick={onClose}>Close</button>{/snippet}
</Card>
```

### Pattern 5: Store → Shared State Module
```typescript
// ❌ SVELTE 4 — src/stores/projectStore.ts
import { writable, derived } from 'svelte/store'

export const currentProject = writable<Project | null>(null)
export const isDirty        = writable(false)
export const projectName    = derived(currentProject, p => p?.name ?? 'Untitled')

// ✅ SVELTE 5 — src/lib/stores/project.svelte.ts
// Note: .svelte.ts extension enables runes in .ts files

class ProjectStore {
  current = $state<Project | null>(null)
  isDirty = $state(false)
  name    = $derived.by(() => this.current?.name ?? 'Untitled')

  setProject(project: Project) {
    this.current = project
    this.isDirty = false
  }

  markDirty() {
    this.isDirty = true
  }

  reset() {
    this.current = null
    this.isDirty = false
  }
}

// Export singleton — same instance across all imports
export const projectStore = new ProjectStore()
```

### Pattern 6: Store subscription in components
```svelte
<!-- ❌ SVELTE 4 -->
<script>
  import { currentProject } from '@/stores/projectStore'
  // Auto-subscription with $ prefix
</script>
<h1>{$currentProject?.name}</h1>

<!-- ✅ SVELTE 5 -->
<script lang="ts">
  import { projectStore } from '$lib/stores/project.svelte'
  // Direct property access — no $ subscription needed
</script>
<h1>{projectStore.name}</h1>
```

---

## Store Classification Rules

Before migrating any store, classify it:

```
Question 1: Is this state used in only ONE component?
  YES → Convert to $state() inline in that component. Delete the store file.
  NO  → Continue to Question 2.

Question 2: Is this state derived from other state?
  YES → Convert to $derived() where it's used, or derived property in store class.
  NO  → Continue to Question 3.

Question 3: Is this state needed in .ts files (not .svelte)?
  YES → Create a .svelte.ts file with a class using $state()
  NO  → Inline $state() in the component or parent component.

Question 4: Is this state truly global (needed in 5+ unrelated components)?
  YES → Keep as shared store, migrate to .svelte.ts class pattern
  NO  → Lift state to closest common parent component.
```

---

## SvelteKit 2 Load Function Patterns

```typescript
// ── +page.server.ts — Server load (runs on server, has DB access) ──
import { error, redirect } from '@sveltejs/kit'
import { convexClient } from '$lib/convex'
import { api } from '../../../convex/_generated/api'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals, parent }) => {
  // Get session from layout (parent load already validated it)
  const { session } = await parent()

  // Fetch project from Convex
  const project = await convexClient.query(api.projects.getById, {
    id: params.projectId,
  })

  // Proper error handling
  if (!project) {
    error(404, { message: `Project ${params.projectId} not found` })
  }

  // Authorization check — only owner can edit
  if (project.userId !== session.user.id) {
    error(403, { message: 'You do not have access to this project' })
  }

  return {
    project,    // Typed — TypeScript knows the shape
    boardType: project.boardType,
  }
}

// ── +page.ts — Universal load (runs on client AND server) ──────────
// Use for non-sensitive data, client-side only init
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ data }) => {
  // data comes from +page.server.ts
  // Add client-side only processing here
  return {
    ...data,
    // Blockly workspace init happens client-side only
    blocklyReady: typeof window !== 'undefined',
  }
}

// ── +layout.server.ts — Layout load (shared across child routes) ───
import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals }) => {
  const session = await locals.auth()
  if (!session?.user) redirect(303, '/login')
  return { session, user: session.user }
}

// ── +page.server.ts — Form Actions ─────────────────────────────────
import { fail } from '@sveltejs/kit'
import type { Actions } from './$types'

export const actions: Actions = {
  saveProject: async ({ request, locals }) => {
    const session = await locals.auth()
    if (!session?.user) return fail(401, { error: 'Unauthenticated' })

    const data = await request.formData()
    const xml  = data.get('xml') as string

    if (!xml) return fail(400, { error: 'Missing workspace XML' })

    await convexClient.mutation(api.projects.update, {
      id:  data.get('projectId') as string,
      xml,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
}
```

---

## Qwen Prompts for Goal 4

### Prompt 1 — Store Audit
```
TASK: Audit all files in src/stores/ (and src/lib/stores/).

For each store, determine:
1. What state does it hold?
2. Where is it imported? (grep all .svelte and .ts files)
3. Is it local (1 component), shared (2-5), or global (5+)?
4. Is it derived from another store?
5. Does it need to work in .ts files (not just .svelte)?

Classification table:
| Store File | State Held | Imported In | Classification | Migration Path |

Do NOT modify files. After audit, present the migration plan for approval.
```

### Prompt 2 — Component Audit
```
TASK: Svelte 5 migration audit for all .svelte files in src/.

For each file, scan for:
1. export let → flag for $props() conversion
2. $: expression → flag for $derived() conversion
3. $: { block } → flag for $effect() conversion
4. createEventDispatcher → flag for callback prop conversion
5. <slot> or <slot name="x"> → flag for snippet conversion
6. onMount with fetch/data loading → flag for load function migration
7. writable() / readable() / derived() stores → classify per store audit rules
8. svelte/store imports that can be eliminated

Output table sorted by complexity (High first):
| File | Issues Found | Pattern Count | Svelte 5 Migration | Complexity: L/M/H |

Then: Group Low complexity files together — these can be batch-migrated.
Do NOT modify files.
```

### Prompt 3 — Execute Migration (Low complexity batch)
```
TASK: Migrate all LOW complexity components identified in the audit.

For each Low complexity component:
1. Convert export let → $props() with TypeScript interface
2. Convert $: derived → $derived()
3. Convert $: effect → $effect()
4. Convert on:event → onevent (Svelte 5 event syntax)
5. Remove any svelte/store imports if store was classified as local state

Rules:
- Do NOT change component behavior — only syntax migration
- Preserve ALL existing class names and styling
- Preserve ALL existing IDs and accessibility attributes
- Add TypeScript types to all $props() interfaces
- If unsure about a conversion → skip it and flag it for manual review

After each file: verify it still renders the same structure.
After all files: Run npm run check. Paste full output.
Report: Files migrated, conversions made, files skipped with reason.
```

---

---

# 🗂️ GOAL 5 — PROJECT ORGANIZATION & ROUTE STRUCTURE

## Colocation Rule (Locked In)

```
Rule: A component lives where it is used.

Used in exactly 1 route  → colocate in that route's folder
  src/routes/(app)/editor/[projectId]/components/BlocklyPanel.svelte ✅

Used in 2+ unrelated routes → shared component library
  src/lib/components/editor/CodePanel.svelte ✅

Used everywhere (layout, nav, etc.) → shared/layout
  src/lib/components/layout/Navbar.svelte ✅

Belongs to shadcn-svelte → never touch
  src/lib/components/ui/** ❌ do not modify
```

---

## Qwen Prompts for Goal 5

### Prompt 1 — Route Audit
```
TASK: Audit the current state of src/routes/.

For every route file (.svelte, .ts, +page, +layout, +server, +error):
1. Map the full current route tree (nested structure)
2. For each route:
   - Does it have a load function?
   - Where does it get data from? (onMount? load? store? hardcoded?)
   - Is it behind an auth check? (which file does the check?)
   - Does it have an error boundary (+error.svelte)?
3. Flag routes that are:
   - Missing +error.svelte
   - Fetching data in onMount instead of load functions
   - Doing their own auth check (instead of using layout guard)
   - Not organized in route groups ((auth)/ (app)/ (marketing)/)

Output:
- Current route tree (indented)
- Issues table
- Recommended route group organization

Do NOT modify files.
```

### Prompt 2 — Full Restructure
```
TASK: Reorganize the project to the target structure defined in AGENT_MISSION.md.

Critical rules for this task:
1. Use `git mv` for ALL file moves — never copy-paste (preserves git history)
2. Update ALL import paths after each move — broken imports are not acceptable
3. Execute moves in this exact order (dependency order):
   a. Create all new directories first
   b. Move src/types/ files (no dependencies on other src files)
   c. Merge src/helpers/ → src/lib/utils.ts
      (combine all helper functions, remove duplicates, export all)
   d. Move and recategorize src/lib/components/ into subfolders
   e. Reorganize src/blocks/ into category subfolders
   f. Create src/blocks/index.ts that imports and registers all blocks
   g. Restructure src/routes/ into (auth)/ (app)/ (marketing)/ groups
   h. Create src/routes/(app)/+layout.server.ts auth guard
   i. Colocate single-route components next to their routes
   j. Update svelte.config.ts path aliases if any paths changed

4. After EVERY file move, immediately update all imports to that file
5. After ALL moves: run `npm run check` — fix all TypeScript errors
6. After `npm run check` passes: run `npm test` — all tests must pass
7. After tests pass: run `npm run build` — build must succeed

Report format:
- Table of every file moved: [original path] → [new path]
- Any import updates made: [file] updated [N] imports
- Any issues encountered
- Final: npm run check output, npm test output, npm run build output
```

### Prompt 3 — Blocks Reorganization
```
TASK: Reorganize src/blocks/ by Arduino category.

Step 1: Read all existing block definition files. For each block, identify:
- Block name
- Arduino category (io, sensors, actuators, logic, time, math, comms)
- Generated Arduino C++ code (for context)

Step 2: Create category subdirectories:
  src/blocks/io/
  src/blocks/sensors/
  src/blocks/actuators/
  src/blocks/logic/
  src/blocks/time/
  src/blocks/math/
  src/blocks/comms/

Step 3: Move each block file to its category folder using git mv

Step 4: Create src/blocks/index.ts:
  - Import all block definitions from all category folders
  - Call the Blockly block registration function for each
  - Export a registerAllBlocks() function
  - Export block category arrays for toolbox configuration

Step 5: Update src/core/blockly/ toolbox config to import from src/blocks/index.ts

Step 6: npm run check → zero errors
Step 7: Manually verify Blockly editor still loads all blocks correctly
  (describe what to look for in the browser)
```

---

---

# 🐙 GOAL 6 — GITHUB WORKFLOW

## Branch Strategy

```
main (protected)
  ↑ merge only after full smoke test
develop (integration)
  ↑ merge only after all checks pass
  ├── feat/schematic-ui              Goal 1
  ├── feat/authjs-migration          Goal 2
  ├── feat/alert-agent               Goal 3
  ├── refactor/svelte5-runes         Goal 4
  ├── refactor/project-structure     Goal 5
  └── fix/[descriptive-name]         Any bug found during work
```

## Branch Rules
- NEVER commit to `main` or `develop` directly
- Branch names: `feat/`, `refactor/`, `fix/`, `chore/`, `docs/`
- One branch per goal — do not mix goals in a branch
- Create branch from `develop`, merge back to `develop`
- `develop` → `main` only after manual smoke test

## Creating Branches
```bash
git checkout develop
git pull origin develop
git checkout -b feat/schematic-ui
```

---

## Conventional Commits — Complete Reference

**Format:** `type(scope): description`

### Types
| Type | When to use |
|------|------------|
| `feat` | New feature or capability added |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `chore` | Build process, dependency updates, tooling |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `style` | CSS/styling changes (not logic) |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |

### Scopes (use these consistently)
```
ui          → Design system, visual changes, CSS
auth        → Authentication, sessions, Auth.js
convex      → Database, backend functions, schema
blocks      → Blockly block definitions
editor      → Editor route and components
circuit     → Circuit simulation
codegen     → Arduino code generation
routes      → SvelteKit routing, load functions
stores      → State management
types       → TypeScript types
config      → tailwind.config, svelte.config, vite.config
deps        → package.json dependencies
```

### Examples
```
feat(ui): add schematic grid background and PCB card component
feat(auth): implement Auth.js with GitHub, Google, and credentials providers
feat(auth): build Convex session adapter for Auth.js database strategy
fix(auth): resolve session token mismatch between Auth.js and Convex
refactor(blocks): reorganize block definitions into category subfolders
refactor(editor): migrate BlocklyPanel from Svelte 4 slots to Svelte 5 snippets
chore(deps): replace highlight.js with shiki for code highlighting
chore(deps): remove @clerk/clerk-js and src/firebase legacy code
test(projects): add unit tests for Convex project CRUD mutations
style(ui): apply electric blue glow shadows to interactive cards
perf(codegen): memoize Arduino code generation with $derived.by()
docs: add AGENT_MISSION.md master mission document
```

### Full Commit Template
```
type(scope): short description (max 72 chars, imperative mood)

Why this change was made (optional but recommended for non-obvious changes).
What problem it solves. What approach was chosen and why.

Changes:
- Specific change 1
- Specific change 2
- Specific change 3

Breaking changes (if any):
- BREAKING: describe what breaks and migration path

Refs: #issue-number (if applicable)
```

---

## Pre-Commit Checklist (Qwen runs this every time)

```bash
# Step 1: Type check
npm run check
# Must exit 0 — zero TypeScript errors

# Step 2: Unit tests
npm test
# Must exit 0 — all tests pass

# Step 3: Production build
npm run build
# Must exit 0 — catches runtime errors that type check misses

# Step 4: Design audit (if UI files changed)
# Run design audit prompt → must show 0 violations

# Step 5: Only if all above pass:
git add -A
git diff --staged --stat    # Review what's being committed
git commit -m "..."
git push origin [branch]
```

---

## Qwen Commit Prompt (use after every completed goal)

```
TASK: Commit completed work following Wireloop conventions.

Pre-commit (run ALL before any git commands):
1. npm run check → must exit 0. If not: STOP, report full error, propose fix, wait.
2. npm test      → must exit 0. If not: STOP, report full test output, propose fix, wait.
3. npm run build → must exit 0. If not: STOP, report full build error, propose fix, wait.

If all 3 pass, proceed:
1. Run: git status
2. Run: git diff --staged --stat (or git diff HEAD if nothing staged yet)
3. Summarize in plain English what changed:
   - Files added: X
   - Files modified: X
   - Files deleted: X
   - Key changes: [bullet summary]

4. Write a commit message following this exact template:
   [type]([scope]): [description under 72 chars]

   [Body: why this change, what it does]

   Changes:
   - [change 1]
   - [change 2]

   Co-authored-by: Gemini_CLI <qwen@coder.ai>

5. Run: git add -A
6. Run: git commit with the message above
7. Run: git push origin [current branch name]

8. Final report:
   - Branch: [name]
   - Commit: [hash]
   - Files changed: [count]
   - Lines: +[added] -[removed]
   - Next step: [what still needs to be done]
```

---

## GitHub Actions CI (`/.github/workflows/ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [develop, main, 'feat/**', 'refactor/**', 'fix/**']
  pull_request:
    branches: [develop, main]

jobs:
  check:
    name: Type Check + Test + Build
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Copy environment config
        run: cp env/env.staging.ts src/env.ts

      - name: Type check
        run: npm run check

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
        env:
          PUBLIC_CONVEX_URL: ${{ secrets.PUBLIC_CONVEX_URL }}
          AUTH_SECRET:       ${{ secrets.AUTH_SECRET }}
```

---

## PR Template (`/.github/pull_request_template.md`)

```markdown
## What This PR Does
<!-- One sentence: what capability does this add or fix? -->

## Goal Completed
- [ ] Goal 1 — Schematic UI Design System
- [ ] Goal 2 — Auth.js Migration (remove Clerk)
- [ ] Goal 3 — Alert Agent (best practices watchdog)
- [ ] Goal 4 — Svelte 5 Runes Optimization
- [ ] Goal 5 — Project Structure Reorganization
- [ ] Fix: _______________
- [ ] Other: _______________

## Type of Change
- [ ] feat — new feature
- [ ] fix — bug fix
- [ ] refactor — code restructure (no behavior change)
- [ ] chore — dependencies, tooling
- [ ] style — visual/CSS only
- [ ] docs — documentation only

## Pre-Merge Checklist
- [ ] `npm run check` passes (0 TypeScript errors)
- [ ] `npm test` passes (all tests green)
- [ ] `npm run build` passes (production build succeeds)
- [ ] Design audit shows 0 violations (if UI files changed)
- [ ] Alert agent shows 0 critical issues (if logic files changed)
- [ ] No hardcoded colors outside tailwind.config.ts
- [ ] No auth logic outside src/lib/auth.ts
- [ ] No Svelte 4 patterns ($:, export let, createEventDispatcher, <slot>)
- [ ] All new components have TypeScript interfaces for props
- [ ] Co-authored-by trailer included in all commits
- [ ] Branch is up to date with develop

## Screenshots (Required for UI Changes)
| Before | After |
|--------|-------|
| _screenshot_ | _screenshot_ |

## Testing Notes
<!-- How was this manually tested? What edge cases were checked? -->

## Breaking Changes
<!-- List anything that might break existing functionality or data -->
```

---

---

# 🎯 MASTER EXECUTION ORDER

This is the recommended sequence for running all 6 goals.
Each goal must be COMPLETE before the next starts.

```
PHASE 0 — SETUP (do this first, one time)
────────────────────────────────────────────────────────
□ Add this AGENT_MISSION.md to repo root
□ Create .github/pull_request_template.md
□ Create .github/workflows/ci.yml
□ Configure branch protection on main and develop in GitHub settings
  (Settings → Branches → Add rule: require PR, require status checks)
□ Add repo secrets in GitHub: PUBLIC_CONVEX_URL, AUTH_SECRET
□ Create GitHub OAuth app (github.com/settings/developers)
□ Create Google OAuth app (console.cloud.google.com)
□ git checkout -b feat/schematic-ui from develop

PHASE 1 — GOAL 1: SCHEMATIC UI
────────────────────────────────────────────────────────
Branch: feat/schematic-ui
□ Update tailwind.config.ts with design tokens
□ Update src/app.css with global schematic classes
□ Install JetBrains Mono font (Google Fonts or local)
□ Replace highlight.js with shiki
□ Run design audit → fix all violations
□ Visual review in browser
□ Checks: npm run check + npm test + npm run build
□ Commit + push → PR to develop

PHASE 2 — GOAL 2: AUTH.JS MIGRATION
────────────────────────────────────────────────────────
Branch: feat/authjs-migration (from develop after Goal 1 merged)
□ Run Phase 1 cleanup prompt (remove Clerk, Firebase)
□ Install @auth/sveltekit @auth/core bcryptjs
□ Create src/lib/auth.ts
□ Create src/hooks.server.ts
□ Create src/routes/auth/[...auth]/+server.ts
□ Update convex/schema.ts (add sessions, accounts, users, verificationTokens tables)
□ Create src/lib/convex-auth-adapter.ts
□ Create convex/sessions.ts, convex/accounts.ts, convex/users.ts, convex/verificationTokens.ts
□ Migrate profiles table (clerkId → userId)
□ Create src/routes/(auth)/login/+page.svelte
□ Create src/routes/(app)/+layout.server.ts
□ Set environment variables in env/ files
□ Manual test: GitHub OAuth login
□ Manual test: Google OAuth login
□ Manual test: Email/password login
□ Manual test: Session persists on refresh
□ Manual test: Logout works
□ Checks: npm run check + npm test + npm run build
□ Commit + push → PR to develop

PHASE 3 — GOAL 3: ALERT AGENT
────────────────────────────────────────────────────────
Branch: feat/alert-agent (from develop after Goal 2 merged)
□ Run alert agent prompt on full codebase
□ Review report — fix all Critical issues
□ Fix Warning issues
□ Document Suggestion items in GitHub Issues for later
□ Save the alert agent prompt as a Cursor rule / Continue.dev command
□ Checks: npm run check + npm test
□ Commit + push → PR to develop

PHASE 4 — GOAL 4: SVELTE 5 OPTIMIZATION
────────────────────────────────────────────────────────
Branch: refactor/svelte5-runes (from develop after Goal 3 merged)
□ Run store audit → classify all stores
□ Run component audit → get complexity table
□ Migrate Low complexity components (batch)
□ Migrate Medium complexity components (one by one, review each)
□ Migrate High complexity components (manually, with Qwen assist)
□ Migrate stores per classification
□ Migrate load functions (move onMount fetches to server)
□ TypeScript strictness pass
□ Run alert agent → verify no Svelte 4 patterns remain
□ Checks: npm run check + npm test + npm run build
□ Commit + push → PR to develop

PHASE 5 — GOAL 5: PROJECT STRUCTURE
────────────────────────────────────────────────────────
Branch: refactor/project-structure (from develop after Goal 4 merged)
□ Run route audit
□ Approve target structure
□ Run full restructure prompt
□ Colocate single-route components
□ Reorganize blocks by category
□ Run alert agent on new structure
□ Run design audit on moved components
□ Checks: npm run check + npm test + npm run build
□ Commit + push → PR to develop

PHASE 6 — INTEGRATION
────────────────────────────────────────────────────────
On develop branch:
□ Merge all feature branches (in order)
□ Full smoke test:
  - Login with all 3 providers
  - Create a new project
  - Open editor — Blockly loads
  - Add blocks — circuit simulation works
  - Generate Arduino code — code displays
  - Save project — auto-save works
  - View projects list
  - Open settings — save preferences
  - Logout — redirects to login
□ Run full alert agent audit — zero critical issues
□ Run full design audit — zero violations
□ npm run check + npm test + npm run build — all green
□ PR develop → main
□ Merge to main
□ Deploy
```

---

---

# 🔧 QUICK REFERENCE CHEATSHEET

## Commands
```bash
npm run dev           # Start SvelteKit dev server
npx convex dev        # Start Convex dev server (SEPARATE TERMINAL, always required)
npm run build         # Production build
npm run preview       # Preview production build locally
npm run check         # TypeScript type check
npm run check:watch   # Type check in watch mode
npm test              # Run Vitest unit tests
npm run test-coverage # Tests with coverage report
```

## File Location Rules
```
New color/shadow/font  → tailwind.config.ts only
New auth logic         → src/lib/auth.ts only
New Convex query       → convex/[table].ts
New TypeScript type    → src/types/[domain].ts + re-export from src/types/index.ts
New shared component   → src/lib/components/[category]/
New route component    → src/routes/(app)/[route]/components/
New block definition   → src/blocks/[category]/
New utility function   → src/lib/utils.ts
New store              → src/lib/stores/[name].svelte.ts (class-based)
Environment variable   → env/env.[environment].ts (NOT src/env.ts directly)
```

## Svelte 5 Quick Reference
```svelte
let x = $state(0)                           // reactive state
let y = $derived(x * 2)                     // computed
$effect(() => { sideEffect(x) })            // side effect
let { prop = default }: Props = $props()    // typed props
let { val = $bindable('') } = $props()      // bindable prop
{@render children?.()}                      // render snippet
{#snippet name()}<div/>{/snippet}           // define snippet
```

## Auth.js Quick Reference
```typescript
// Server-side session access (load functions, +server.ts)
const session = await locals.auth()
if (!session) redirect(303, '/login')
const userId = session.user.id

// Client-side session access (Svelte components)
import { page } from '$app/stores'
const session = $page.data.session

// Sign in (client-side)
import { signIn, signOut } from '@auth/sveltekit/client'
await signIn('github', { redirectTo: '/dashboard' })
await signOut({ redirectTo: '/login' })
```

## Convex Quick Reference
```typescript
// In +page.server.ts load function
import { convexClient } from '$lib/convex'
import { api } from '../../../convex/_generated/api'
const projects = await convexClient.query(api.projects.listByUser, { userId })

// In Convex function (always validate auth)
export const createProject = mutation({
  args: { name: v.string(), boardType: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    return await ctx.db.insert('projects', {
      userId:    identity.subject,
      name:      args.name,
      boardType: args.boardType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})
```

---

## Session Start Checklist (paste this at the start of EVERY Qwen session)

```
You are working on Wireloop.
Read AGENT_MISSION.md before doing anything.

Current session goal: [GOAL N — NAME]
Current branch: [branch name]
Last completed: [what was done last session]
This session: [what needs to be done now]

Standing rules summary:
- Never commit to main/develop directly
- npm run check + npm test + npm run build must all pass before any commit
- Follow Conventional Commits with Co-authored-by: Gemini_CLI <qwen@coder.ai>
- Schematic UI only — electric blue (#00BFFF), dark backgrounds, sharp corners
- Svelte 5 runes only — no $:, no export let, no createEventDispatcher, no <slot>
- When in doubt — report first, act after approval
```

---

*AGENT_MISSION.md — Wireloop*
*Maintained by: [Your Name] + Gemini_CLI*
*This document evolves with the project. Update it when decisions change.*
