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
