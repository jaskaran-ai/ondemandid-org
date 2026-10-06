<!-- GSD:project-start source:PROJECT.md -->

## Project

**iVALT OnDemand ID**

A password-free identity verification SaaS platform that lets enterprises verify user identities through biometric authentication (face/fingerprint) delivered via secure push notifications to the iVALT mobile app. Companies register, get provisioned with an IDCONNECTION code, and then trigger on-demand verification requests to users' phones.

**Core Value:** Enterprises can verify anyone's identity in under 5 seconds without passwords, using only their phone and biometrics.

### Constraints

- **Tech Stack**: Next.js 16, React 19, TypeScript 6, Tailwind CSS 4 — locked
- **Database**: Must support both PostgreSQL (Neon) and SQLite — dual schema maintenance required
- **API Dependency**: iVALT API availability required for verification flow production testing
- **Deployment**: Vercel-compatible architecture assumed (serverless functions, edge-ready)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Context

| Layer            | Status     | Decision                           |
| ---------------- | ---------- | ---------------------------------- |
| Framework        | ✅ Locked  | Next.js 16 App Router              |
| Language         | ✅ Locked  | TypeScript 6                       |
| Styling          | ✅ Locked  | Tailwind CSS 4 + tw-animate-css    |
| UI Components    | ✅ Locked  | Radix UI primitives                |
| State Management | ✅ Locked  | TanStack React Query               |
| Forms            | ✅ Locked  | React Hook Form + Zod              |
| Database ORM     | ✅ Locked  | Drizzle ORM (dual Postgres/SQLite) |
| Database Hosting | ✅ Locked  | Neon (Postgres production)         |
| Database Dev     | ✅ Locked  | SQLite via better-sqlite3          |
| Email            | ✅ Locked  | AWS SES + Nodemailer fallback      |
| Analytics        | ✅ Present | @vercel/analytics                  |
| Icons            | ✅ Locked  | Lucide + HugeIcons                 |

## Recommended Additions (Production Hardening)

### 1. Testing Framework

| Technology                      | Version | Purpose                                | Why                                                                                                                                                            | Confidence |
| ------------------------------- | ------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Vitest**                      | ^3.x    | Unit & integration tests (non-browser) | Community standard for Next.js. 3-5x faster cold starts than Jest. Native ESM support, same API as Jest. Official Next.js testing guide uses Vitest, not Jest. | HIGH       |
| **@testing-library/react**      | ^16.x   | React component rendering tests        | Standard companion to Vitest for React component testing. Tests behavior, not implementation.                                                                  | HIGH       |
| **@testing-library/jest-dom**   | ^6.x    | DOM matchers for Vitest                | Adds `toBeInTheDocument()`, `toHaveClass()` etc. Essential for readable assertions.                                                                            | HIGH       |
| **@testing-library/user-event** | ^14.x   | Simulated user interactions            | `userEvent.setup()` models real browser interactions better than `fireEvent`.                                                                                  | HIGH       |
| **Playwright**                  | ^1.52+  | End-to-end testing                     | Only reliable way to test async Server Components (Vitest can't render them). Tests against real browser. Run against Vercel preview deployments in CI.        | HIGH       |
| **@vitejs/plugin-react**        | ^4.x    | React transform for Vitest             | Required for JSX transform in Vitest tests.                                                                                                                    | HIGH       |
| **jsdom**                       | ^26.x   | DOM environment for Vitest             | Lightweight browser environment for unit tests.                                                                                                                | HIGH       |
| **vite-tsconfig-paths**         | ^5.x    | Path alias resolution for Vitest       | Makes `@/` imports work in tests without duplication.                                                                                                          | HIGH       |

- **Vitest** → utility functions, Zod schemas, React hooks, client components, synchronous server components
- **Playwright** → async Server Components, auth flows, signup flow, verification flow, form submissions against real endpoints
- **Key constraint:** Vitest cannot render async Server Components (documented limitation in official Next.js guide). Don't fight it — push those tests to Playwright.

### 2. CI/CD Pipeline

| Technology         | Version | Purpose      | Why                                                                                                            | Confidence |
| ------------------ | ------- | ------------ | -------------------------------------------------------------------------------------------------------------- | ---------- |
| **GitHub Actions** | N/A     | CI pipeline  | Zero-config for GitHub-hosted repos. Run lint, typecheck, Vitest, build on every PR.                           | HIGH       |
| **Vercel**         | N/A     | CD + hosting | Built by Next.js team. Zero-config Next.js deployment. Auto-scaling. Preview deployments per PR. Edge network. | HIGH       |

- `VERCEL_TOKEN` — Vercel API token
- `VERCEL_ORG_ID` — from `.vercel/project.json`
- `VERCEL_PROJECT_ID` — from `.vercel/project.json`
- `SENTRY_AUTH_TOKEN` — if using Sentry source maps

### 3. Error Tracking & Performance Monitoring

| Technology                 | Version | Purpose                                 | Why                                                                                                                                                                                                               | Confidence |
| -------------------------- | ------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **@sentry/nextjs**         | ^9.x    | Error tracking + performance monitoring | Industry standard for Next.js production error monitoring. Covers client, server, AND edge runtimes. Native Next.js 16 instrumentation via `instrumentation-client.ts`. Session replay, source maps, breadcrumbs. | HIGH       |
| **@vercel/speed-insights** | ^1.x    | Core Web Vitals (RUM)                   | Real user monitoring for LCP, CLS, INP. Already have `@vercel/analytics` — add speed insights.                                                                                                                    | HIGH       |

- **vs Datadog/New Relic:** Overkill for this stage. Sentry covers errors + performance + session replay at $0-$26/month.
- **vs Highlight.io:** Sentry has deeper Next.js integration and larger community. Highlight is strong for session replay but weaker for APM.
- **vs Rollbar:** Sentry has better Next.js App Router support, tracing, and session replay.
- `sentry.client.config.ts` (or `instrumentation-client.ts`) — browser error tracking
- `sentry.server.config.ts` — Node.js server error tracking
- `sentry.edge.config.ts` — Edge runtime error tracking
- Wraps `next.config.mjs` with `withSentryConfig`
- Adds `SENTRY_AUTH_TOKEN` for source map upload
- `tracesSampleRate: 0.1` in production (sample 10% of transactions)
- `replaysSessionSampleRate: 0.1` (session replay for 10% of sessions)
- `replaysOnErrorSampleRate: 1.0` (always capture replay on error)
- Ignore noise: `ResizeObserver loop limit exceeded`, `Non-Error exception captured`

### 4. Structured Logging & Observability

| Technology                       | Version | Purpose                     | Why                                                                                                                            | Confidence |
| -------------------------------- | ------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| **pino**                         | ^9.x    | Structured JSON logging     | Fastest Node.js logger. JSON output is machine-parseable. Works in serverless. Default logger for Fastify.                     | HIGH       |
| **pino-opentelemetry-transport** | ^3.x    | Logs → OpenTelemetry export | Ships logs via OTLP to any OpenTelemetry-compatible backend. Correlates logs with traces via trace_id/span_id.                 | MEDIUM     |
| **pino-pretty**                  | ^13.x   | Human-readable log output   | Dev-mode prettifier. Install as dev dependency only.                                                                           | HIGH       |
| **pino-http**                    | ^10.x   | HTTP request logging        | Auto-logs all HTTP requests with method, URL, status, duration. Drop-in for route handlers.                                    | MEDIUM     |
| **OpenTelemetry JS**             | ^0.200+ | Distributed tracing         | Traces across Next.js server components, API routes, iVALT API calls, database queries. Future-proof observability foundation. | MEDIUM     |

# Phase 3 additions:

### 5. Rate Limiting & Abuse Prevention

| Technology             | Version | Purpose                         | Why                                                                                                                                                   | Confidence |
| ---------------------- | ------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **@upstash/ratelimit** | ^2.x    | Serverless-native rate limiting | HTTP-based Redis access works in Edge Runtime and serverless. Sliding window, token bucket algorithms. No cold start issues. Sub-millisecond latency. | HIGH       |
| **@upstash/redis**     | ^1.x    | Redis client for rate limiting  | Vercel KV is deprecated — Upstash Redis is the migration path. Free tier available. No TCP required (HTTP-based).                                     | HIGH       |

### 6. Security Hardening

| Technology                | Version | Purpose                       | Why                                                                                                      | Confidence |
| ------------------------- | ------- | ----------------------------- | -------------------------------------------------------------------------------------------------------- | ---------- |
| **HTTP Security Headers** | N/A     | CSP, HSTS, XFO, etc.          | Configured via `next.config.ts` `async headers()`. Zero runtime cost. Blocks full attack categories.     | HIGH       |
| **Arcjet** (optional)     | ^1.x    | Bot detection + PII redaction | If you need more than rate limiting. Detects automated clients, scrapers, crawlers. Redacts PII in logs. | MEDIUM     |

### 7. Compliance & Audit Infrastructure

| Technology            | Version | Purpose               | Why                                                                                                                                                        | Confidence |
| --------------------- | ------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Custom Audit Log**  | N/A     | Immutable audit trail | Required for SOC 2 readiness. Log every signup, verification request, status change, and admin action. Store in separate `audit_logs` table (append-only). | HIGH       |
| **SOC 2 Preparation** | N/A     | Compliance framework  | Not a tool — a process. Requires: pen testing (annual), vulnerability management, access controls, incident response plan, change management.              | MEDIUM     |

- No UPDATE or DELETE operations on `audit_logs` table (enforce at application level via Drizzle — never expose an update endpoint)
- Use database-level triggers or RLS for extra protection in Postgres
- Ship audit logs to a separate log stream (Sentry + Pino) for redundancy

### 8. Uptime Monitoring

| Technology          | Version | Purpose                       | Why                                                                                                           | Confidence |
| ------------------- | ------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------- |
| **Better Stack**    | N/A     | External uptime monitoring    | Combines uptime checks, log management, and incident response. Generous free tier (10 monitors). Quick setup. | HIGH       |
| **OR: Uptime Kuma** | N/A     | Self-hosted uptime monitoring | Open-source alternative. Free forever. Runs anywhere (Railway, Fly.io, a $5 VPS). More control.               | MEDIUM     |

### 9. Scripts & Configuration Additions

## Alternatives Considered

| Category           | Recommended       | Alternative                | Why Not                                                                           |
| ------------------ | ----------------- | -------------------------- | --------------------------------------------------------------------------------- |
| Testing runner     | Vitest            | Jest (next/jest)           | Jest is slower, has ESM issues, Vitest is official Next.js recommendation in 2026 |
| E2E testing        | Playwright        | Cypress                    | Playwright: simpler config, cross-browser, better CI DX, faster                   |
| Error tracking     | Sentry            | Highlight.io, Datadog      | Sentry: best Next.js App Router support, larger community, predictable pricing    |
| Logging            | Pino              | Winston, Morgan            | Pino: 2-5x faster, JSON-native, OpenTelemetry transport available                 |
| Rate limiting      | Upstash Ratelimit | Arcjet, express-rate-limit | Upstash: serverless-native, works in Edge + Node runtimes, free tier              |
| Security (bundled) | Upstash + headers | Arcjet                     | Arcjet is newer, fewer community patterns. Re-evaluate later.                     |
| Uptime monitoring  | Better Stack      | Uptime Kuma, Pingdom       | Better Stack: easiest setup, bundled logs + incidents, generous free tier         |
| CI/CD              | GitHub Actions    | CircleCI, Jenkins          | Already on GitHub. Zero additional cost. Tight Vercel integration.                |

## Environment Variables to Add

# Sentry (Error Tracking)

# Upstash Redis (Rate Limiting)

# Better Stack (Uptime Monitoring)

# Vercel (CI/CD)

## Implementation Order (for Roadmap)

| Phase  | What                      | Depends On                       | Risk if Deferred                    |
| ------ | ------------------------- | -------------------------------- | ----------------------------------- |
| **1**  | Vitest + first test suite | Nothing                          | You ship without any test coverage  |
| **2**  | Playwright + E2E tests    | Nothing (separate from Vitest)   | Async Server Components untestable  |
| **3**  | GitHub Actions CI         | Vitest + Playwright setup        | Manual testing only                 |
| **4**  | Sentry error tracking     | Nothing (adds to existing code)  | Production errors invisible         |
| **5**  | Security headers          | Nothing (config-only change)     | XSS/clickjacking vulnerabilities    |
| **6**  | Upstash rate limiting     | Nothing (adds to route handlers) | API abuse, cost overruns            |
| **7**  | Pino structured logging   | Nothing (replaces console.log)   | Debugging production issues harder  |
| **8**  | Audit log table           | Database schema access           | Non-compliant, can't trace issues   |
| **9**  | Better Stack uptime       | Health endpoint                  | No external availability visibility |
| **10** | OpenTelemetry             | Pino setup                       | Only needed at scale                |

## Sources

- [Next.js Official Testing Guide](https://nextjs.org/docs/app/guides/testing) — HIGH confidence
- [Sentry Next.js SDK Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/) — HIGH confidence
- [Upstash Ratelimit Docs](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) — HIGH confidence
- [Pino + OpenTelemetry Transport](https://github.com/pinojs/pino-opentelemetry-transport) — MEDIUM confidence (active development)
- [Next.js Content Security Policy Guide](https://nextjs.org/docs/pages/guides/content-security-policy) — HIGH confidence
- [Vercel Storage (KV deprecated → Upstash migration)](https://github.com/vercel/storage) — HIGH confidence
- [Better Stack Uptime Monitoring](https://betterstack.com/) — MEDIUM confidence (service terms may change)
- [Production-grade CI/CD with Next.js/Vercel](https://coffey.codes/articles/production-grade-ci-cd-with-nextjs-vercel-and-github-actions) — MEDIUM confidence (single source)
- [Vitest Next.js Testing Guide 2026](https://medium.com/@securestartkit/next-js-testing-in-2026-vitest-playwright-0caf6dd1f829) — MEDIUM confidence (community article, verified against official docs)
- [Arcjet Next.js SDK](https://docs.arcjet.com/reference/nextjs) — LOW confidence for inclusion (compelling product, newer ecosystem)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.

<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.

<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.

<!-- GSD:profile-end -->

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**This project has a knowledge graph. Start with the code-review-graph
MCP tools to narrow scope, then read the source.** The graph is cheaper than scanning files and
gives you structural context (callers, dependents, test coverage) that file search cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes_tool` or `query_graph_tool` instead of Grep
- **Understanding impact**: `get_impact_radius_tool` instead of manually tracing imports
- **Code review**: `detect_changes_tool` + `get_review_context_tool` instead of reading entire files
- **Finding relationships**: `query_graph_tool` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview_tool` + `list_communities_tool`

### Verify in the source

- Narrow scope with the graph, then read the source. Do not change code from graph output alone.
- For any non-trivial change, read the implementation and the relevant tests before concluding.
- Verify the exact source when touching behavior, database logic, migrations, retries, fallbacks,
  recovery, or compatibility code.
- When the graph and the source disagree, the source wins. The graph may be stale or may not
  model that relationship.
- An empty graph result can mean "not indexed" or "not statically visible", not "does not exist".

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes_tool` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context_tool` | Need source snippets for review — token-efficient |
| `get_impact_radius_tool` | Understanding blast radius of a change |
| `get_affected_flows_tool` | Finding which execution paths are impacted |
| `query_graph_tool` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes_tool` | Finding functions/classes by name or keyword |
| `get_architecture_overview_tool` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes_tool` for code review.
3. Use `get_affected_flows_tool` to understand impact.
4. Use `query_graph_tool` pattern="tests_for" to check coverage.
<!-- /code-review-graph MCP tools -->
