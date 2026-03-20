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

## Live URL

**Staging:** [https://muthur-terminal.delightfulplant-4f7a6df5.eastus.azurecontainerapps.io](https://muthur-terminal.delightfulplant-4f7a6df5.eastus.azurecontainerapps.io)

## Deployment

The app is containerized and deployed to **Azure Container Apps** (not Azure App Service — see [Why Container Apps?](#why-container-apps) below).

- **Docker** — Multi-stage build (`node:24-alpine`), standalone Next.js output
- **Azure auth** — OIDC federated credentials (no long-lived secrets)
- **ACR** — Images pushed to Azure Container Registry
- **Environments** — `staging` (push to `staging` branch) and `production` (push to `main`)

### CI/CD (GitHub Actions)

Push to `main` or `staging` triggers `.github/workflows/deploy_to_azure_container_apps.yml` automatically.

The pipeline:
1. Resolves the target environment from the branch (`main` → production, `staging` → staging)
2. Logs in to Azure via OIDC (federated credentials, no stored secrets)
3. Logs in to Azure Container Registry
4. Builds and pushes the Docker image (tagged with commit SHA + `latest`)
5. Deploys to Azure Container Apps with the `GITHUB_TOKEN` secret for Copilot SDK auth

Manual dispatch is also available via the Actions tab with an environment selector.

### Why Container Apps?

The `@github/copilot-sdk` requires **Node.js 22+** (for the built-in `node:sqlite` module) and spawns a **long-running Copilot CLI subprocess**. These requirements are incompatible with serverless platforms like Vercel, Azure Functions, or AWS Lambda, which have short-lived execution environments. Azure Container Apps runs the app inside a persistent Docker container where the SDK works correctly.

### Manual deployment

A local deploy script mirrors the CI/CD pipeline. Requires [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) and [Docker](https://docs.docker.com/get-docker/).

1. **Log in to Azure:**
   ```bash
   az login
   ```

2. **Add deploy variables to `.env`** (see `.env.example`):
   ```bash
   AZURE_RESOURCE_GROUP=your-resource-group
   AZURE_CONTAINER_REGISTRY=your-acr-name
   AZURE_CONTAINER_APP_NAME=your-app-name
   ```

3. **Run the script:**
   ```bash
   ./scripts/deploy.sh              # staging (default)
   ./scripts/deploy.sh production   # production
   ```

The script sources `.env` from the project root, builds the Docker image tagged with the current commit SHA, pushes it to ACR, and updates the Container App.

### ⚠️ Serverless Runtimes Not Supported

The `@github/copilot-sdk` **cannot run on serverless platforms** such as Vercel, AWS Lambda, or Cloudflare Workers. The SDK requires:

- **Node.js 22+** for the built-in `node:sqlite` module
- **A long-running subprocess** — the SDK spawns the Copilot CLI as a child process, which is incompatible with the ephemeral, stateless execution model of serverless functions

Use a **container-based** or **VM-based** deployment (Docker, Azure Container Apps, AWS ECS/Fargate, Railway, Fly.io, etc.) where the Node.js process persists across requests.

## Future Roadmap

- **GitHub OAuth** — Log in as crew members for extended sessions
- **Persistent sessions** — Save and resume conversations with MUTHUR
- **Self-healing diagnostics** — MUTHUR uses Copilot SDK tools to inspect her own systems
- **Special Orders** — Interactive classified directive sequences

---

*USCSS Nostromo — Reg. 180924609 — All interactions logged — Property of Weyland-Yutani Corp.*
