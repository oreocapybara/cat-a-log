# Exploration-Driven Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the WelcomeSheet interstitial so contextual coach marks appear immediately on first visit, making onboarding exploration-driven instead of sequential.

**Architecture:** Delete the `WelcomeSheet` component and remove its import/render from the map page. The existing coach marks already operate independently per page — no other code changes are needed.

**Tech Stack:** Next.js 16 App Router, React Client Components, Tailwind CSS v4, `localStorage`.

## Global Constraints

- No new dependencies.
- No changes to the `useSeenFlag` hook, `CoachMark` component, or any existing coach mark wiring.
- This repo has no test framework. Verification is: `npm run type-check`, `npm run lint`, then `npm run build`.
- Follow existing commit conventions (Conventional Commits).

---

## Task 1: Remove WelcomeSheet

**Files:**

- Delete: `app/(app)/map/components/welcome-sheet.tsx`
- Modify: `app/(app)/map/page.tsx`

**Interfaces:**

- Consumes: nothing new
- Produces: nothing new — this is a deletion

- [ ] **Step 1: Delete the WelcomeSheet component file**

```bash
rm "app/(app)/map/components/welcome-sheet.tsx"
```

- [ ] **Step 2: Remove the WelcomeSheet import from the map page**

In `app/(app)/map/page.tsx`, remove this line (currently line 10):

```tsx
import { WelcomeSheet } from './components/welcome-sheet'
```

- [ ] **Step 3: Remove the WelcomeSheet render from the map page**

In `app/(app)/map/page.tsx`, remove this line (rendered after `<CatMap ... />`):

```tsx
<WelcomeSheet />
```

- [ ] **Step 4: Verify**

Run: `npm run type-check && npm run lint && npm run build`
Expected: all pass with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(map): remove WelcomeSheet to make onboarding exploration-driven"
```

---

## Final check

- [ ] Run `npm run format:check && npm run lint && npm run type-check && npm run build` — this mirrors the CI pipeline in `.github/workflows/ci.yml` and must pass before opening a PR.
