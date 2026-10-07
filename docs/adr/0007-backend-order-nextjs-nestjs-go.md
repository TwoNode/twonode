# 0007. Backend order: Next.js now, NestJS later, Go much later

- **Status:** Accepted
- **Date:** 2026-10-06
- **Related:** [`../backend/roadmap.md`](../backend/roadmap.md), [`../mobile/roadmap.md`](../mobile/roadmap.md), [`../future-plans.md`](../future-plans.md)

## Context

A mobile app needs an API, and scaling may later need a separately run backend. The existing Next.js app has about 267 API routes, a tested service layer, and the payment and webhook rules. A rewrite risks that code.

## Decision

Use the Next.js API for the mobile app first. Move to NestJS later, one area at a time, only when a gate in the roadmap is hit (long-running jobs, connection limits, push or queues, a separately scaled API). Go comes much later, only on measured evidence or a deliberate team choice. Web stays on Next.js throughout. The HTTP contract is the product, so each move happens behind the same URLs.

## Consequences

- Nothing is rewritten before it is needed, and each move can be rolled back by removing a rewrite rule.
- The groundwork is done now: native-client auth, an OpenAPI spec, shared packages and thin routes.
- Payments and webhooks move last.
- A second deployment (a server to run and monitor) is a cost that arrives with NestJS.
