# Wireloop — Project Context

## Project Overview

**Wireloop** is a visual programming platform for Arduino development. It enables users to create Arduino programs using a drag-and-drop block interface (powered by Google Blockly), with real-time circuit simulation and automatic Arduino C++ code generation. The platform is designed to make learning electronics and programming accessible, especially for beginners.

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend Framework** | SvelteKit 2 (Svelte 5) + TypeScript |
| **Styling** | Tailwind CSS v4 + shadcn-svelte (New York style) |
| **Block Editor** | Google Blockly v10 |
| **Authentication** | Clerk (@clerk/clerk-js) |
| **Backend / Database** | Convex (real-time, type-safe) |
| **UI Components** | sveltestrap, bits-ui, lucide icons |
| **SVG Graphics** | SVG.js + svg.draggable.js + svg.panzoom.js |
| **Code Highlighting** | highlight.js |
| **Testing** | Vitest (unit tests) |
| **Build Tool** | Vite 6 |
| **Adapter** | @sveltejs/adapter-static (SPA mode) |

## Architecture

```
Arduino-Workflow-Builder/
├── src/
│   ├── auth/                # Clerk authentication integration
│   ├── blocks/              # Custom Blockly block definitions
│   ├── components/          # Svelte UI components
│   ├── core/                # Core application logic
│   │   ├── blockly/         # Blockly editor integration
│   │   ├── microcontroller/ # Arduino board simulation
│   │   └── virtual-circuit/ # Circuit simulation engine
│   ├── firebase/            # Legacy Firebase code (migration in progress)
│   ├── help/                # Help system content
│   ├── helpers/             # Utility functions
│   ├── lessons/             # Lesson/tutorial content
│   ├── lib/                 # Shared library code (shadcn components, utils)
│   ├── microcontrollers/    # Microcontroller-specific configurations
│   ├── routes/              # SvelteKit file-based routing
│   ├── stores/              # Svelte stores (state management)
│   ├── tests/               # Unit tests (Vitest)
│   ├── types/               # TypeScript type definitions
│   ├── app.css              # Global styles (Tailwind entry)
│   ├── app.html             # HTML template
│   └── env.ts               # Environment configuration (generated)
├── convex/                  # Convex backend functions & schema
│   ├── auth.ts              # Authentication queries/mutations
│   ├── projects.ts          # Project CRUD operations
│   ├── users.ts             # User data operations
│   ├── schema.ts            # Database schema definition
│   └── ...                  # Additional backend functions
├── env/                     # Environment configuration files
│   ├── env.development.ts   # Development config
│   ├── env.staging.ts       # Staging config
│   └── env.prod.ts          # Production config
├── static/                  # Static assets (images, libraries, etc.)
└── build/                   # Production build output
```

## Database Schema (Convex)

The Convex schema defines the following tables:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles linked to Clerk accounts |
| `projects` | Arduino projects with Blockly XML workspace, board type, visibility |
| `settings` | User preferences (board type, theme, language, auto-save) |
| `projectFiles` | File attachments for projects |
| `migrations` | Migration tracking (Firebase → Convex transition) |

## Key Commands

### Development

```bash
# Start development server (copies env.development.ts → src/env.ts)
npm run dev

# Start Convex dev server (run in a separate terminal)
npx convex dev
```

### Build

```bash
# Build for production (copies env.staging.ts → src/env.ts)
npm run build

# Preview production build locally
npm run preview
```

### Testing

```bash
# Run unit tests with Vitest
npm test

# Run tests with coverage
npm run test-coverage
```

### Code Quality

```bash
# Type check the project
npm run check

# Type check in watch mode
npm run check:watch
```

## Environment Configuration

Environment variables **must** be prefixed with `PUBLIC_` to be accessible client-side in SvelteKit:

| Variable | Purpose | Example |
|----------|---------|---------|
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk authentication key | `pk_test_...` |
| `PUBLIC_CONVEX_URL` | Convex backend URL | `https://xxx.convex.cloud` |

Environment files are in `env/` and copied to `src/env.ts` at build/dev time:
- `env/env.development.ts` → used by `npm run dev`
- `env/env.staging.ts` → used by `npm run build`
- `env/env.prod.ts` → used for production builds

## Development Conventions

- **TypeScript** is used throughout with strict mode enabled
- **Svelte 5** with backwards compatibility for Svelte 4 component API
- **shadcn-svelte** for UI components (New York style, slate base color)
- **Tailwind CSS v4** via the Vite plugin
- **Path aliases**: `$lib` maps to `src/lib`, `@` maps to `src`
- **Testing**: Vitest with globals enabled, tests located in `src/tests/`
- **Static SPA build**: Uses `adapter-static` with `index.html` fallback (client-side routing)

## Block Categories

The platform supports visual programming blocks organized into categories:
- 🔌 **Input/Output**: Digital/analog pins, PWM
- 🚨 **Sensors**: Temperature, light, motion
- 💡 **Actuators**: LEDs, servos, motors
- 🎛️ **Logic**: If/else, loops, variables
- ⏱️ **Time**: Delays, timers, scheduling
- 🔢 **Math**: Arithmetic, comparison, functions
- 📡 **Communication**: Serial, I2C, SPI

## Key Features

- Visual drag-and-drop block programming interface
- Real-time Arduino circuit simulation (SVG-based)
- Automatic Arduino C++ code generation
- User authentication via Clerk (OAuth providers)
- Real-time database sync via Convex
- Auto-save project functionality
- Responsive design (desktop + mobile)
- Multiple Arduino board support (Uno, Nano, Mega)

## Important Notes

1. **Firebase → Convex Migration**: The project is actively migrating from Firebase to Convex. Legacy Firebase code may still exist in `src/firebase/` but should not be used for new features.
2. **Convex must run alongside dev server**: The `npx convex dev` command must be running in a separate terminal for database operations to work.
3. **Environment variable generation**: The `npm run dev` and `npm run build` scripts copy the appropriate env file to `src/env.ts` — do not manually edit `src/env.ts` as it will be overwritten.
4. **Static adapter**: The project builds as a static SPA, deployed to `build/` directory.
