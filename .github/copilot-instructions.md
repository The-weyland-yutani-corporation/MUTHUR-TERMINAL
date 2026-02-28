# Copilot Instructions — MUTHUR Terminal

## Build & Run

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (output: standalone)
npm run lint         # ESLint (flat config, Next.js core-web-vitals + typescript)
```

No test framework is configured.

## Architecture

This is a **Next.js 16 App Router** project that recreates the MU/TH/UR 6000 mainframe terminal from the Alien franchise. Users chat with an AI that responds in-character as the Weyland-Yutani shipboard computer.

### Request flow

1. **`page.tsx`** — Client component manages boot → terminal transition via `booted` state
2. **`BootSequence.tsx`** — Animated startup: Weyland-Yutani ASCII logo, then sequenced system diagnostic messages with per-line delays
3. **`Terminal.tsx`** — Chat interface. POSTs user messages to `/api/muthur`, then reads the SSE stream chunk-by-chunk to render typing effect
4. **`api/muthur/route.ts`** — Server-side API route. Lazily initializes a **`@github/copilot-sdk` CopilotClient** singleton, creates a streaming session with `claude-sonnet-4-5`, and pipes `assistant.message_delta` events back as `text/event-stream` SSE
5. **`system-prompt.ts`** — Contains the full MUTHUR 6000 persona prompt with Nostromo crew manifest, Weyland-Yutani lore, and response formatting rules

### Key dependencies

- **`@github/copilot-sdk`** — AI backend; requires Copilot CLI installed and authenticated (local dev) or `GITHUB_TOKEN` env var (production)
- **`shadcn/ui`** — Component primitives (new-york style, configured in `components.json`)
- **Tailwind CSS v4** — Uses `@import` syntax, not `tailwind.config.js`

## Conventions

### CRT visual system (`globals.css`)

All visual effects are pure CSS — no JS animation libraries:

- **`.crt-screen`** — Container class that applies scanline overlay (`::before`), vignette (`::after`), and flicker animation
- **`.phosphor-text`** — Bright green text (`#33ff33`) with multi-layer glow `text-shadow` and pulse animation
- **`.phosphor-text-dim`** — Muted green (`#1a8c1a`) for secondary text
- **`.cursor-blink`** — Block cursor (`█`) with step-end blink
- **`.boot-line`** — Fade-up entrance animation for boot sequence lines

The phosphor green palette: `#33ff33` (primary), `#66ff66` (bright), `#1a8c1a` (dim), `#1a4d1a` (border/muted).

### Font

**VT323** (Google Font) loaded in `layout.tsx` via `next/font/google`, exposed as CSS variable `--font-terminal`. Applied with `font-[family-name:var(--font-terminal)]` in components.

### Component pattern

- All components under `src/components/` are `"use client"` — this is a client-heavy interactive app
- No `ui/` subdirectory yet; shadcn components would go in `src/components/ui/`
- Components are named exports (not default exports)

### API route pattern

- The Copilot SDK client is lazily initialized as a module-level singleton promise to avoid re-creating on every request
- SSE streaming uses raw `ReadableStream` with `TextEncoder`, not a framework helper
- Errors within the stream are sent as `data: {"error": "..."}` JSON events; top-level errors return 500 JSON

### Environment

- `GITHUB_TOKEN` — Required in production for headless Copilot auth; local dev uses `copilot auth login` instead
- `NODE_PATH` / `CLI_PATH` — Optional overrides if default Node.js is < 22 (Copilot CLI needs `node:sqlite`)
- Next.js config sets `output: "standalone"` and `serverExternalPackages: ["@github/copilot-sdk"]`

### Deployment

Deployed to **Azure Container Apps** via GitHub Actions (`.github/workflows/deploy.yml`):

- **Auth**: OIDC federated credentials via `azure/login@v2` with `vars.AZURE_CLIENT_ID`, `vars.AZURE_TENANT_ID`, `vars.AZURE_SUBSCRIPTION_ID` (GitHub repo variables, not secrets)
- **ACR login**: Uses `az acr login` (reuses the Azure session — no separate ACR credentials)
- **Docker**: 3-stage build (deps → build → production) with `node:24-alpine`; installs `@github/copilot` globally in the runtime stage
- **Job permissions**: `id-token: write` (required for OIDC), `contents: read`

### Lore accuracy

MUTHUR's persona and all in-universe references must stay faithful to the Alien franchise canon. Key sources: *Alien* (1979), *Aliens* (1986), *Alien³* (1992), *Prometheus* (2012), *Alien: Covenant* (2017), and the *Alien RPG* sourcebooks. When in doubt, defer to the original 1979 film. The system prompt in `src/lib/system-prompt.ts` is the single source of truth for MUTHUR's personality — keep it consistent with any UI text (boot messages, terminal headers, error messages).
