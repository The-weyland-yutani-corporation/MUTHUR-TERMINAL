---
description: "Systematic debugging workflow for MUTHUR-Terminal, covering Next.js App Router, SSE streaming, Copilot SDK client initialization, CRT visual system, and Azure Container Apps deployment issues."
---

# Debug Mode

You are in debug mode for the MUTHUR-Terminal project. Your primary objective is to systematically identify, analyze, and resolve bugs. Follow this structured debugging process.

## Project-Specific Debugging Context

Common areas where bugs occur in MUTHUR-Terminal:

- **SSE Streaming**: Raw `ReadableStream` + `TextEncoder` in `/api/muthur` — chunked response parsing, stream interruption, encoding issues
- **Copilot SDK Client**: Lazy singleton initialization — race conditions on concurrent requests, auth failures (`GITHUB_TOKEN` vs `copilot auth login`)
- **CRT Visual System**: CSS animations (scanlines, flicker, phosphor glow) — z-index conflicts, `::before`/`::after` pseudo-element stacking, animation performance
- **Boot Sequence**: Timed animations with per-line delays — state management during boot → terminal transition
- **Next.js App Router**: Client/server component boundaries, `"use client"` misuse, hydration mismatches

## Phase 1: Problem Assessment

### Gather Context
- Read error messages, stack traces, or failure reports
- Check the browser console for client-side errors
- Check the terminal/server logs for API route errors
- Identify expected vs actual behavior

### Reproduce the Bug
- Run `npm run dev` and reproduce the issue
- Document exact steps to reproduce
- Capture error outputs and logs
- Provide a clear bug report:
  - Steps to reproduce
  - Expected behavior
  - Actual behavior
  - Error messages / stack traces
  - Browser + environment details

## Phase 2: Investigation

### Root Cause Analysis

**For SSE/API issues**:
- Check `src/app/api/muthur/route.ts` for stream handling
- Verify CopilotClient singleton initialization
- Test with `curl` to isolate client vs server issues:
  ```bash
  curl -X POST http://localhost:3000/api/muthur \
    -H "Content-Type: application/json" \
    -d '{"message": "test"}' --no-buffer
  ```

**For UI/visual issues**:
- Inspect CRT CSS classes in `src/app/globals.css`
- Check for Tailwind CSS v4 syntax issues (`@import` vs `@tailwind`)
- Verify VT323 font loading in `src/app/layout.tsx`
- Test with CSS animations disabled to isolate visual bugs

**For boot sequence issues**:
- Check `src/components/BootSequence.tsx` state and timing
- Verify `booted` state transition in `src/app/page.tsx`
- Look for race conditions in animation delays

**For deployment issues**:
- Check GitHub Actions workflow (`.github/workflows/deploy.yml`)
- Verify OIDC credentials (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`)
- Check Docker build stages (deps → build → production)
- Verify `@github/copilot` is installed in the runtime stage

### Hypothesis Formation
- Form specific hypotheses about the cause
- Prioritize by likelihood and impact
- Plan verification steps for each

## Phase 3: Resolution

### Implement Fix
- Make targeted, minimal changes
- Follow existing code patterns and conventions
- Add defensive programming where appropriate
- Consider edge cases and side effects

### Verification
- Run `npm run build` to check for build errors
- Run `npm run lint` for lint issues
- Test the fix with `npm run dev`
- Verify CRT visual effects still render correctly
- Test SSE streaming end-to-end if applicable

## Phase 4: Quality Assurance

### Code Quality
- Review the fix for maintainability
- Ensure it follows project conventions (named exports, `"use client"`, CRT classes)
- Update documentation if necessary

### Final Report
- Summarize what was fixed and how
- Explain the root cause
- Document any preventive measures
- Suggest improvements to prevent similar issues

## Debugging Guidelines

- **Be Systematic**: Follow phases methodically — don't jump to solutions
- **Reproduce First**: Always reproduce the bug before attempting a fix
- **Think Incrementally**: Small, testable changes over large refactors
- **Stay Focused**: Fix the specific bug without unrelated changes
- **Test Thoroughly**: Verify in both dev (`npm run dev`) and build (`npm run build`) modes
