# MU/TH/UR 6000 Terminal

> *"Building Better Worlds"* — Weyland-Yutani Corporation

An interactive web terminal that faithfully recreates the MU/TH/UR 6000 mainframe interface from the Alien franchise. Chat with MUTHUR through an authentic 1980s green phosphor CRT terminal, powered by the GitHub Copilot SDK.

## Features

- **Authentic CRT aesthetics** — Scanlines, phosphor glow, screen flicker, vignette, and VT323 terminal font
- **Lore-accurate boot sequence** — Weyland-Yutani logo, system diagnostics, Nostromo ship manifest
- **AI-powered MUTHUR** — Responds in character as the cold, clinical Weyland-Yutani mainframe via GitHub Copilot SDK
- **Streaming responses** — Real-time Server-Sent Events for authentic terminal printing
- **Command history** — Arrow key navigation through previous queries

## Tech Stack

- **Next.js 16** (App Router) — React framework
- **Tailwind CSS v4** — Styling
- **shadcn/ui** — Component primitives
- **@github/copilot-sdk** — AI backend (Copilot CLI integration)
- **VT323** — Google Font for authentic terminal typeface

## Prerequisites

- Node.js 22+ (Copilot CLI requires `node:sqlite`)
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli) installed and authenticated
- A GitHub Copilot subscription

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — watch MUTHUR boot up, then start querying.

## Project Structure

```
src/
├── app/
│   ├── api/muthur/route.ts    # Copilot SDK API endpoint (SSE streaming)
│   ├── globals.css             # CRT effects, phosphor theme, animations
│   ├── layout.tsx              # Root layout with VT323 font
│   └── page.tsx                # Main page (boot → terminal transition)
├── components/
│   ├── BootSequence.tsx        # Animated Weyland-Yutani boot sequence
│   ├── CRTScreen.tsx           # CRT monitor frame with scanlines/glow
│   └── Terminal.tsx            # Interactive chat terminal
└── lib/
    └── system-prompt.ts        # MUTHUR 6000 AI personality & lore
```

## Deployment

The app is containerized and deployed to **Azure Container Apps**. See `.github/workflows/deploy.yml` for the full CI/CD pipeline.

- **Docker** — Multi-stage build (`node:24-alpine`), standalone Next.js output
- **Azure auth** — OIDC federated credentials (no long-lived secrets)
- **ACR** — Images pushed to Azure Container Registry, deployed on push to `main`

See `.env.example` for environment variable reference.

## Future Roadmap

- **GitHub OAuth** — Log in as crew members for extended sessions
- **Persistent sessions** — Save and resume conversations with MUTHUR
- **Self-healing diagnostics** — MUTHUR uses Copilot SDK tools to inspect her own systems
- **Special Orders** — Interactive classified directive sequences

---

*USCSS Nostromo — Reg. 180924609 — All interactions logged — Property of Weyland-Yutani Corp.*
