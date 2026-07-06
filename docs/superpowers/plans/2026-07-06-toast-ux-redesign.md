# Toast UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scattered Sonner toast calls with a centralized `notify` module that enforces consistent UX-psychology-grounded copy, cascade suppression, and mobile-friendly positioning.

**Architecture:** A `lib/toast.ts` module wraps Sonner as the single import for all notifications. A message registry (keyed by `MessageId` union type) holds all user-facing copy. Call sites import `notify` instead of `toast`. An ESLint rule prevents direct Sonner imports.

**Tech Stack:** Sonner (existing), TypeScript strict mode, ESLint flat config

## Global Constraints

- All user-facing toast copy MUST come from the message registry — no inline strings at call sites
- Never pass raw `error.message` to a toast — map to a known `MessageId`
- `null` messages in the registry suppress the toast entirely (no-op)
- Duration: success=2000ms, error=4000ms, undo=7000ms, loading=Infinity (30s safety)
- Cascade suppression: errors within 500ms of a prior error are swallowed
- Position: `bottom-center`, offset `80` (clears 64px nav + gap)
- Success toasts: use `--muted` background, no icon
- TypeScript `MessageId` union derived from registry keys — compile-time safety

---

### Task 1: Create the notify module and types

**Files:**

- Create: `lib/toast.types.ts`
- Create: `lib/toast.ts`

**Interfaces:**

- Produces: `notify.error(id, options?)`, `notify.success(id, options?)`, `notify.undo(id, options)`, `notify.loading(id)` — consumed by all migration tasks
- Produces: `MessageId` type — consumed by all call sites

- [ ] **Step 1: Create `lib/toast.types.ts`**

```ts
export type MessageId =
  // Errors
  | 'upload-failed'
  | 'upload-too-large'
  | 'upload-bad-format'
  | 'save-tag-failed'
  | 'load-nearby-failed'
  | 'location-unavailable'
  | 'location-track-failed'
  | 'session-expired'
  | 'username-taken'
  | 'sign-out-failed'
  | 'share-failed'
  | 'cat-location-update-failed'
  | 'analyze-photo-failed'
  | 'google-sign-in-failed'
  | 'avatar-upload-failed'
  | 'undo-expired'
  | 'unknown-error'
  | 'uploading-photo'
  // Success
  | 'tag-saved'
  | 'avatar-updated'
  | 'avatar-removed'
  | 'link-copied'
  | 'card-downloaded'
  | 'welcome'
  | 'registered'
  | 'featured-set'
  | 'featured-reset'
  // Undo
  | 'tag-added'
  | 'tag-resolved'

export type NotifyErrorOptions = {
  retry?: () => void
}

export type NotifySuccessOptions = {
  values?: Record<string, string>
}

export type NotifyUndoOptions = {
  onUndo: () => void
  values?: Record<string, string>
}

export type LoadingHandle = {
  resolve: (successId?: MessageId, options?: NotifySuccessOptions) => void
  reject: (errorId?: MessageId) => void
}
```

- [ ] **Step 2: Create `lib/toast.ts`**

```ts
// eslint-disable-next-line no-restricted-imports
import { toast } from 'sonner'
import type {
  MessageId,
  NotifyErrorOptions,
  NotifySuccessOptions,
  NotifyUndoOptions,
  LoadingHandle,
} from './toast.types'

const MESSAGES: Record<MessageId, string | null> = {
  // Errors
  'upload-failed': "Couldn't upload that photo. Try again in a moment.",
  'upload-too-large': 'That photo is over 5 MB — try a smaller one.',
  'upload-bad-format': "That file type isn't supported. Use a photo from your camera roll.",
  'save-tag-failed': "Couldn't save your tag. Try again.",
  'load-nearby-failed': "Couldn't load cats nearby. Pull down to refresh.",
  'location-unavailable': 'Location access is off. Tap the location icon to enable it.',
  'location-track-failed': 'Lost your location signal. Tap the location button to retry.',
  'session-expired': null,
  'username-taken': 'That username is taken — try another.',
  'sign-out-failed': "Couldn't sign out. Try again.",
  'share-failed': "Couldn't share that. Try again.",
  'cat-location-update-failed': "Couldn't update cat location. Try confirming again.",
  'analyze-photo-failed': "Couldn't analyze the photo — showing nearest cats instead.",
  'google-sign-in-failed': "Couldn't connect to Google. Tap to try again.",
  'avatar-upload-failed': "Couldn't update your avatar. Try again.",
  'undo-expired': "That change already saved. You can edit it from the cat's profile.",
  'unknown-error': 'Something went wrong. Try again.',
  'uploading-photo': 'Uploading photo…',
  // Success
  'tag-saved': 'Tag saved',
  'avatar-updated': 'Avatar updated',
  'avatar-removed': 'Avatar removed',
  'link-copied': 'Link copied',
  'card-downloaded': 'Card downloaded',
  welcome: 'Welcome to Cat-A-Log, @{username}',
  registered: "You're in — let's set up your profile.",
  'featured-set': '{name} is now your featured cat',
  'featured-reset': 'Now showing your top cat',
  // Undo
  'tag-added': 'Tagged: {label}',
  'tag-resolved': '✓ {label}',
}

const DURATION = {
  success: 2000,
  error: 4000,
  undo: 7000,
  loading: Infinity,
} as const

const CASCADE_WINDOW_MS = 500
const LOADING_SAFETY_MS = 30_000

let lastErrorTimestamp = 0

function interpolate(template: string, values?: Record<string, string>): string {
  if (!values) return template
  return Object.entries(values).reduce((str, [key, val]) => str.replace(`{${key}}`, val), template)
}

export const notify = {
  error(id: MessageId, options?: NotifyErrorOptions) {
    const message = MESSAGES[id]
    if (message === null) return

    const now = Date.now()
    if (now - lastErrorTimestamp < CASCADE_WINDOW_MS) return
    lastErrorTimestamp = now

    toast.error(message, {
      duration: DURATION.error,
      ...(options?.retry && {
        action: { label: 'Try again', onClick: options.retry },
      }),
    })
  },

  success(id: MessageId, options?: NotifySuccessOptions) {
    const message = MESSAGES[id]
    if (message === null) return

    toast.success(interpolate(message, options?.values), {
      duration: DURATION.success,
    })
  },

  undo(id: MessageId, options: NotifyUndoOptions) {
    const message = MESSAGES[id]
    if (message === null) return

    toast(interpolate(message, options.values), {
      id,
      duration: DURATION.undo,
      action: { label: 'Undo', onClick: options.onUndo },
    })
  },

  loading(id: MessageId): LoadingHandle {
    const message = MESSAGES[id] ?? 'Loading…'
    const toastId = toast.loading(message, { duration: DURATION.loading })

    const safetyTimer = setTimeout(() => {
      toast.dismiss(toastId)
      notify.error('unknown-error')
    }, LOADING_SAFETY_MS)

    return {
      resolve(successId?: MessageId, options?: NotifySuccessOptions) {
        clearTimeout(safetyTimer)
        toast.dismiss(toastId)
        if (successId) notify.success(successId, options)
      },
      reject(errorId?: MessageId) {
        clearTimeout(safetyTimer)
        toast.dismiss(toastId)
        if (errorId) notify.error(errorId)
      },
    }
  },
}
```

- [ ] **Step 3: Verify the module compiles**

Run: `npx tsc --noEmit lib/toast.ts lib/toast.types.ts`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add lib/toast.ts lib/toast.types.ts
git commit -m "feat(toast): add centralized notify module with message registry"
```

---

### Task 2: Update Toaster configuration

**Files:**

- Modify: `components/ui/sonner.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**

- Consumes: nothing (standalone config)
- Produces: Toaster positioned at bottom-center with 80px offset, success style using `--muted`

- [ ] **Step 1: Update `components/ui/sonner.tsx`**

Replace the entire file with:

```tsx
'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from 'lucide-react'

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps['theme']) ?? 'system'}
      className="toaster group"
      icons={{
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--muted)',
          '--normal-text': 'var(--muted-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast max-w-[calc(100vw-2rem)]',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
```

Key changes:

- Removed `CircleCheckIcon` from success (no icon for success toasts)
- Changed `--normal-bg` from `var(--popover)` to `var(--muted)` for subtler success style
- Changed `--normal-text` from `var(--popover-foreground)` to `var(--muted-foreground)`
- Added `max-w-[calc(100vw-2rem)]` to toast classNames

- [ ] **Step 2: Update `app/layout.tsx`**

Change the Toaster line from:

```tsx
<Toaster position="top-center" />
```

To:

```tsx
<Toaster position="bottom-center" offset={80} />
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add components/ui/sonner.tsx app/layout.tsx
git commit -m "feat(toast): reposition to bottom-center with 80px offset, subtler success style"
```

---

### Task 3: Migrate auth pages

**Files:**

- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/register/page.tsx`
- Modify: `app/(auth)/setup-profile/page.tsx`
- Modify: `app/components/google-button.tsx`

**Interfaces:**

- Consumes: `notify` from `@/lib/toast`
- Produces: nothing (leaf call sites)

- [ ] **Step 1: Migrate `app/(auth)/login/page.tsx`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace:

```ts
toast.error('Google sign-in failed. Try again.')
```

With:

```ts
notify.error('google-sign-in-failed')
```

Replace:

```ts
toast.error(error.message)
```

With:

```ts
notify.error('unknown-error')
```

Note: The login `error.message` from `signInWithPassword` could be "Invalid login credentials" — this is a Supabase auth error. We use `'unknown-error'` because adding a dedicated login-failed message is out of scope for this redesign (it would need its own design decision about how explicit to be about invalid credentials for security reasons).

- [ ] **Step 2: Migrate `app/(auth)/register/page.tsx`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace:

```ts
toast.error(error.message)
```

With:

```ts
notify.error('unknown-error')
```

Replace:

```ts
toast.success("You're in! Let's set up your profile.")
```

With:

```ts
notify.success('registered')
```

- [ ] **Step 3: Migrate `app/(auth)/setup-profile/page.tsx`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace:

```ts
toast.error('Session expired. Please sign in again.')
```

With:

```ts
notify.error('session-expired')
```

Replace:

```ts
toast.error('That username is already taken. Try another.')
```

With:

```ts
notify.error('username-taken')
```

Replace:

```ts
toast.error(error.message)
```

With:

```ts
notify.error('unknown-error')
```

Replace:

```ts
toast.success(`Welcome to Cat-A-Log, @${data.username}! 🐱`)
```

With:

```ts
notify.success('welcome', { values: { username: data.username } })
```

- [ ] **Step 4: Migrate `app/components/google-button.tsx`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace:

```ts
toast.error(error.message)
```

With:

```ts
notify.error('google-sign-in-failed')
```

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add app/(auth)/login/page.tsx app/(auth)/register/page.tsx app/(auth)/setup-profile/page.tsx app/components/google-button.tsx
git commit -m "refactor(auth): migrate toast calls to notify module"
```

---

### Task 4: Migrate map page and cat-preview-card

**Files:**

- Modify: `app/(app)/map/page.tsx`
- Modify: `app/(app)/map/components/cat-preview-card.tsx`

**Interfaces:**

- Consumes: `notify` from `@/lib/toast`
- Produces: nothing (leaf call sites)

- [ ] **Step 1: Migrate `app/(app)/map/page.tsx`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace:

```ts
toast.error('Could not load nearby cats')
```

With:

```ts
notify.error('load-nearby-failed')
```

**ELIMINATE** this toast (downstream failure, non-blocking — cats render fine without tags):

```ts
toast.error('Could not load cat tags')
```

Replace with nothing — just remove the line. Keep the else branch that sets `setCatTags(tagMap)`.

**DEMOTE** this toast to silent (map still works, just no live tracking):

```ts
toast.error('Could not track your location')
```

Replace with nothing — remove the line. The `stopFollowing()` call still executes.

Replace:

```ts
toast.error('Could not get your location')
```

With:

```ts
notify.error('location-unavailable')
```

Replace (in `handleResolveTag`):

```ts
toast.error(error.message)
```

With:

```ts
notify.error('unknown-error')
```

Replace (in `handleUndoResolveTag`):

```ts
toast.error("Couldn't undo — already saved")
```

With:

```ts
notify.error('undo-expired')
```

- [ ] **Step 2: Migrate `app/(app)/map/components/cat-preview-card.tsx`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace the `handleResolve` toast call:

```ts
toast(`✓ ${label}`, {
  id: TAG_UNDO_TOAST_ID,
  duration: TAG_UNDO_DURATION,
  action: {
    label: 'Undo',
    onClick: () => {
      setRenderedTags(prevTags)
      onUndoResolveTag?.(renderedCat.id, tag)
    },
  },
})
```

With:

```ts
notify.undo('tag-resolved', {
  values: { label },
  onUndo: () => {
    setRenderedTags(prevTags)
    onUndoResolveTag?.(renderedCat.id, tag)
  },
})
```

Also remove the now-unused constants:

```ts
const TAG_UNDO_TOAST_ID = 'map-tag-undo'
const TAG_UNDO_DURATION = 5000
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/(app)/map/page.tsx app/(app)/map/components/cat-preview-card.tsx
git commit -m "refactor(map): migrate toast calls to notify, eliminate cascade noise"
```

---

### Task 5: Migrate profile pages

**Files:**

- Modify: `app/(app)/profile/[username]/components/avatar-upload-provider.tsx`
- Modify: `app/(app)/profile/[username]/components/share-profile-button.tsx`
- Modify: `app/(app)/profile/[username]/components/sign-out-button.tsx`
- Modify: `app/(app)/profile/[username]/components/my-cats-list.tsx`

**Interfaces:**

- Consumes: `notify` from `@/lib/toast`
- Produces: nothing (leaf call sites)

- [ ] **Step 1: Migrate `avatar-upload-provider.tsx`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace:

```ts
toast.error('Image must be under 5 MB')
```

With:

```ts
notify.error('upload-too-large')
```

Replace:

```ts
toast.error('Must be a JPEG, PNG, WebP, or HEIC image')
```

With:

```ts
notify.error('upload-bad-format')
```

Replace:

```ts
toast.success('Avatar updated! 🐱')
```

With:

```ts
notify.success('avatar-updated')
```

Replace:

```ts
toast.error(error instanceof Error ? error.message : 'Failed to upload avatar')
```

With:

```ts
notify.error('avatar-upload-failed')
```

Replace:

```ts
toast.success('Avatar removed')
```

With:

```ts
notify.success('avatar-removed')
```

Replace (in `removeAvatar` catch):

```ts
toast.error(error instanceof Error ? error.message : 'Failed to remove avatar')
```

With:

```ts
notify.error('avatar-upload-failed')
```

- [ ] **Step 2: Migrate `share-profile-button.tsx`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace:

```ts
toast.success('Link copied! 🔗')
```

With:

```ts
notify.success('link-copied')
```

Replace:

```ts
toast.error('Could not share card')
```

With:

```ts
notify.error('share-failed')
```

- [ ] **Step 3: Migrate `sign-out-button.tsx`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace:

```ts
toast.error(error.message)
```

With:

```ts
notify.error('sign-out-failed')
```

- [ ] **Step 4: Migrate `my-cats-list.tsx`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace:

```ts
toast.success(`⭐ ${catName} is now your featured cat`, {
  action: {
    label: 'Undo',
    onClick: () => {
      setOptimisticFeaturedId(prevId)
      setFeaturedCat(prevId)
    },
  },
})
```

With:

```ts
notify.undo('featured-set', {
  values: { name: catName },
  onUndo: () => {
    setOptimisticFeaturedId(prevId)
    setFeaturedCat(prevId)
  },
})
```

Replace:

```ts
toast.success('Featured cat reset — showing your top cat')
```

With:

```ts
notify.success('featured-reset')
```

Replace:

```ts
toast.error(result.error)
```

With:

```ts
notify.error('unknown-error')
```

Replace the tag insertion toast:

```ts
toast(`Tagged: ${TAG_TOAST_LABEL[tag]}`, {
  id: TAG_UNDO_TOAST_ID,
  duration: TAG_UNDO_DURATION,
  action: {
    label: 'Undo',
    onClick: () => handleUndoInsert(catId, tag, prevTags, insertKey),
  },
})
```

With:

```ts
notify.undo('tag-added', {
  values: { label: TAG_TOAST_LABEL[tag] },
  onUndo: () => handleUndoInsert(catId, tag, prevTags, insertKey),
})
```

Replace:

```ts
toast.error(error?.message ?? 'Could not add tag')
```

With:

```ts
notify.error('save-tag-failed')
```

Replace:

```ts
toast.error("Couldn't undo — already saved")
```

With:

```ts
notify.error('undo-expired')
```

Also remove the now-unused constants if they exist in this file:

- `TAG_UNDO_TOAST_ID`
- `TAG_UNDO_DURATION`

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add app/(app)/profile/[username]/components/avatar-upload-provider.tsx \
  app/(app)/profile/[username]/components/share-profile-button.tsx \
  app/(app)/profile/[username]/components/sign-out-button.tsx \
  app/(app)/profile/[username]/components/my-cats-list.tsx
git commit -m "refactor(profile): migrate toast calls to notify module"
```

---

### Task 6: Migrate tag flow pages

**Files:**

- Modify: `app/(app)/tag/page.tsx`
- Modify: `app/(app)/tag/components/candidates-screen.tsx`
- Modify: `app/(app)/tag/components/match-found-screen.tsx`
- Modify: `app/(auth)/tag/flush/page.tsx`

**Interfaces:**

- Consumes: `notify` from `@/lib/toast`
- Produces: nothing (leaf call sites)

- [ ] **Step 1: Migrate `app/(app)/tag/page.tsx`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace:

```ts
toast.error('Could not save your tag. Try again.')
```

With:

```ts
notify.error('save-tag-failed')
```

- [ ] **Step 2: Migrate `app/(app)/tag/components/candidates-screen.tsx`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace:

```ts
toast.error('Could not check for nearby cats')
```

With:

```ts
notify.error('load-nearby-failed')
```

Replace:

```ts
toast.error("Couldn't analyze the photo, showing nearest cats instead")
```

With:

```ts
notify.error('analyze-photo-failed')
```

- [ ] **Step 3: Migrate `app/(app)/tag/components/match-found-screen.tsx`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace all occurrences of:

```ts
toast.error('Session expired. Please sign in again.')
```

With:

```ts
notify.error('session-expired')
```

Replace:

```ts
toast.error(uploadError.message)
```

With:

```ts
notify.error('upload-failed')
```

Replace:

```ts
toast.error(error.message)
```

With:

```ts
notify.error('unknown-error')
```

Replace:

```ts
toast.error('Could not update cat location.')
```

With:

```ts
notify.error('cat-location-update-failed')
```

Replace:

```ts
toast.error('Session expired.')
```

With:

```ts
notify.error('session-expired')
```

- [ ] **Step 4: Migrate `app/(auth)/tag/flush/page.tsx`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace:

```ts
toast.error(uploadError.message)
```

With:

```ts
notify.error('upload-failed')
```

Replace:

```ts
toast.error(body.error ?? 'Something went wrong')
```

With:

```ts
notify.error('unknown-error')
```

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add app/(app)/tag/page.tsx \
  app/(app)/tag/components/candidates-screen.tsx \
  app/(app)/tag/components/match-found-screen.tsx \
  app/(auth)/tag/flush/page.tsx
git commit -m "refactor(tag): migrate toast calls to notify module"
```

---

### Task 7: Migrate shared utilities

**Files:**

- Modify: `lib/share-image.ts`
- Modify: `app/components/catch-card-share-button.tsx`

**Interfaces:**

- Consumes: `notify` from `@/lib/toast`
- Produces: nothing (leaf call sites)

- [ ] **Step 1: Migrate `lib/share-image.ts`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace:

```ts
toast.success('Card downloaded!')
```

With:

```ts
notify.success('card-downloaded')
```

- [ ] **Step 2: Migrate `app/components/catch-card-share-button.tsx`**

Replace:

```ts
import { toast } from 'sonner'
```

With:

```ts
import { notify } from '@/lib/toast'
```

Replace:

```ts
toast.error('Could not share card')
```

With:

```ts
notify.error('share-failed')
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add lib/share-image.ts app/components/catch-card-share-button.tsx
git commit -m "refactor(share): migrate toast calls to notify module"
```

---

### Task 8: Add ESLint guard and final verification

**Files:**

- Modify: `eslint.config.mjs`

**Interfaces:**

- Consumes: nothing
- Produces: ESLint rule preventing direct `toast` imports from Sonner

- [ ] **Step 1: Update `eslint.config.mjs`**

Replace the entire file with:

```mjs
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Agent worktree artifacts:
    '.claude/**',
    // Third-party skill scripts (CommonJS, not app code):
    'superpowers/**',
    '.kiro/**',
  ]),
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'sonner',
              importNames: ['toast'],
              message: "Use `notify` from '@/lib/toast' instead.",
            },
          ],
        },
      ],
    },
  },
])

export default eslintConfig
```

- [ ] **Step 2: Add ESLint disable comment to `lib/toast.ts`**

The first line of `lib/toast.ts` already has the disable comment:

```ts
// eslint-disable-next-line no-restricted-imports
import { toast } from 'sonner'
```

Verify this is present. If not, add it.

- [ ] **Step 3: Verify no remaining direct toast imports**

Run: `grep -r "from 'sonner'" --include='*.ts' --include='*.tsx' | grep -v 'lib/toast.ts' | grep -v 'components/ui/sonner.tsx' | grep -v node_modules`
Expected: No output (all direct imports eliminated except the two allowed files)

Note: `components/ui/sonner.tsx` imports `Toaster` (not `toast`) from sonner — that's fine and not restricted.

- [ ] **Step 4: Run ESLint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 5: Run full type check**

Run: `npm run type-check`
Expected: No errors

- [ ] **Step 6: Run build**

Run: `npm run build`
Expected: Successful build with no errors

- [ ] **Step 7: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore(lint): add no-restricted-imports rule for sonner toast"
```
