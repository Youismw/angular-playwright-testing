# QuickTix — Angular & MEAN Stack with Automated Playwright E2E Suite

> A production-grade, full-stack incident and support ticket management platform built with **Angular (v22)**, **Express (Node.js)**, and **MongoDB**, paired with an **exhaustive 185-test Playwright End-to-End (E2E) testing suite**.

---

## 📌 Executive Overview

This repository demonstrates modern full-stack development and automated quality engineering. It showcases:

- **Frontend**: Clean, reactive client architecture leveraging Angular Standalone Components, reactive signals (`signal`, `computed`), RxJS concurrency management, and WCAG 2.1 AA accessible UI.
- **Backend**: Express RESTful service featuring JWT-based authentication, RBAC (Role-Based Access Control), rate limiting, NoSQL injection resistance, and MongoDB transactional operations.
- **Automated Testing Suite**: A deterministic, multi-worker Playwright architecture covering Functional, Security (RBAC/IDOR/XSS), Visual Regression, WCAG 2.1 AA Accessibility, Boundary Mutation, and SLA Performance testing.

---

## 🏗️ Architecture & Monorepo Structure

```
angular-playwright-testing/
├── client/                     # Angular 22 Single-Page Application (SPA)
│   ├── src/app/components/     # UI Components (login, ticket, ticket-list, ticket-form, confirm-dialog, header)
│   ├── src/app/guards/         # Route activation guards (AuthGuard)
│   ├── src/app/interceptors/   # HTTP interceptors (JWT attachment & auto-logout on 401)
│   └── src/app/services/       # Reactive services (AuthService, TicketService)
│
├── server/                     # Express REST API & Database Models
│   ├── src/config/             # Database connection lifecycle & isolation
│   ├── src/middleware/         # Authentication, rate limiting, and centralized error handlers
│   ├── src/models/             # Mongoose schemas (User, Ticket)
│   └── src/routes/             # REST controllers (/api/auth, /api/tickets, /api/health, /api/test)
│
├── tests/                      # Playwright Automated Testing Suite
│   ├── auth.setup/             # Phase 0 setup: Deterministic authentication & storageState seeding
│   ├── fixtures/               # Worker routing, auto-reset fixture, mock data & reporter
│   ├── login/                  # Login component test suites (API, functional, security, visual, etc.)
│   ├── tickets/                # Tickets component test suites (API, functional, RBAC, IDOR, visual, etc.)
│   └── e2e/                    # Multi-persona collaboration & end-to-end user journeys
│
├── .github/workflows/ci.yml    # Continuous Integration pipeline (typecheck, unit, E2E)
├── CONTRACT.md                 # Formal API specifications & data-testid contracts
├── AGENTS.md                   # Engineering verification principles & state governance
├── playwright.config.ts        # Parallel 5-worker preassignment test runner configuration
└── package.json                # Monorepo task orchestration scripts
```

---

## ⚡ Key Features

### 1. Modern Angular Architecture (`client/`)
- **Reactive Signals**: Granular reactivity using Angular `signal()` and `computed()` for instantaneous metrics bar updates.
- **RxJS Concurrency Control**: Uses `switchMap` to cancel stale in-flight ticket queries during rapid tab switching.
- **Accessible Design**: Compliant semantic headings, ARIA roles (`alert`, `tab`, `tablist`), and full keyboard navigation (tested with `axe-core`).
- **Responsive Layout**: Editorial-styled warm dark theme adapted across Mobile (375px), Tablet (768px), and Desktop (1280px+).

### 2. Secure REST Backend (`server/`)
- **JWT Authentication**: HMAC-SHA256 token verification with user existence re-validation against live database state.
- **Role-Based Access Control**: Standard users are isolated to their own tickets (`owner === req.user.id`); admins hold global ticket oversight.
- **Security Defenses**: Standard rate limiting against credential brute-forcing, NoSQL injection sanitation, and secure HTTP headers.
- **Hermetic Test Reset Endpoint**: Fast worker-scoped reset endpoint (`POST /api/test/reset?worker=N`) with in-memory mutex to eliminate concurrent database write collisions.

### 3. Industrial-Grade Playwright E2E Suite (`tests/`)
- **185 Deterministic Tests**: 100% pass rate with zero flaky `.or()` tautologies or brittle sleeps.
- **Preassigned 5-Worker Parallel Architecture**: Tests are partitioned by subfolder across 5 parallel workers with independent database state slices:
  - **Worker 1**: Auth route contracts, login functional, security, rate limiting, and fault resilience.
  - **Worker 2**: Login UI, WCAG 2.1 AA accessibility (axe-core), keyboard focus, responsiveness, and visual regression.
  - **Worker 3**: Tickets API contracts, functional business logic, owner isolation, and filtered view transitions.
  - **Worker 4**: Tickets UI, Admin RBAC, IDOR authorization barriers, XSS prevention, and visual snapshots.
  - **Worker 5**: Cross-persona collaboration, multi-tenant isolation, and complete user lifecycle journeys.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v20 or higher (v22+ recommended)
- **MongoDB**: Local MongoDB instance running on `mongodb://localhost:27017` (or Docker)
- **npm**: v10+

### 1. Clone & Install
```bash
# Clone the repository
git clone https://github.com/your-username/angular-playwright-testing.git
cd angular-playwright-testing

# Install dependencies for root, client, and server
npm run install:all
```

### 2. Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env
```

### 3. Run Locally (Full-Stack Development)
```bash
# Build the Angular client
npm run build:client

# Start backend server & frontend together
npm run dev
```
- Frontend: `http://localhost:4200` (or `http://localhost:3000` when served via Express)
- API Health Check: `http://localhost:3000/api/health`

---

## 🧪 Testing Suites

This project contains three distinct testing tiers:

### 1. Client Unit Tests (Angular / Vitest)
```bash
npm run test:client
```
*57 passing unit tests verifying component creation, signal reactions, forms, dialogs, and service mocks.*

### 2. Server Unit & Integration Tests (Supertest / Playwright)
```bash
npm run test:server
```
*32 passing unit tests verifying Express middleware, URI resolution, DB isolation, and REST routes.*

### 3. Playwright End-to-End Suite (185 Tests)
```bash
# Run all E2E tests across all 5 workers
npm run test:e2e

# Run tests by specific worker slice
npm run test:worker1    # Auth & Login Batch 1
npm run test:worker2    # Login UI, Axe a11y & Visuals
npm run test:worker3    # Tickets API & Functional
npm run test:worker4    # Tickets UI, RBAC, IDOR & Security
npm run test:worker5    # Multi-Persona & E2E Journeys

# Run focused test categories
npm run test:smoke      # High-priority smoke test suite
npm run test:journey    # End-to-end user lifecycle flows
npm run test:a11y       # Automated WCAG 2.1 AA accessibility audits
npm run test:ui         # Playwright interactive UI test mode
```

---

## 📋 Test Suite Breakdown

| Category | Target Suites | Description |
| :--- | :--- | :--- |
| **API Contracts** | `login/api/`, `tickets/api/` | Verifies status codes, headers, and schemas per `CONTRACT.md`. |
| **Functional & Logic**| `login/functional/`, `tickets/functional/` | Tests reactive metrics, form validation, filter tabs, and CRUD. |
| **Security & RBAC** | `login/security/`, `tickets/security/` | Tests IDOR isolation, admin overrides, JWT tampering, and rate limits. |
| **Accessibility (a11y)**| `*/ui-browser/accessibility.spec.ts` | Validates ARIA attributes, semantic structure, and `axe-core` AA standards. |
| **Keyboard & Focus** | `*/ui-browser/keyboard-focus.spec.ts` | Confirms logical tab order, Shift+Tab reverse navigation, and Enter submission. |
| **Resilience & Faults** | `*/resilience/` | Validates recovery on 500 errors, network drops, and out-of-order responses. |
| **Performance & SLAs** | `*/performance/` | Enforces W3C navigation budgets (< 300ms TTFB) and sub-200ms API SLAs. |
| **Visual Regression** | `*/visual/` | Pixel-perfect visual snapshot comparisons for buttons, modals, and views. |
| **End-to-End Journeys**| `e2e/` | Multi-context user/admin collaboration and full user account lifecycles. |

---

## 🔒 Truthful Verification & State Governance

Per [`AGENTS.md`](./AGENTS.md), this codebase follows strict verification standards:
1. **No Silent State Overwrites**: Test resets (`POST /api/test/reset`) clean ephemeral records and insert missing seed users, never overwriting existing records behind the developer's back.
2. **No Fallback Masking**: Tests honestly fail when database state is corrupted rather than silently falling back to dummy defaults.
3. **No Weak Assertions**: Zero diluted `.or()` assertions or artificial test passes.

---

## 📄 License

This project is licensed under the MIT License.

