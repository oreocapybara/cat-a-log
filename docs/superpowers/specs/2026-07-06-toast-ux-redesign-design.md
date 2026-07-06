# Toast UX Redesign

## Problem

Cat-A-Log has 52 toast calls across 15 files. The current implementation suffers from:

1. **Developer-speak errors** — raw `error.message` strings from Supabase reach users, who can't act on them.
2. **Cascading noise** — a single failed action (loading the map) fires multiple sequential error toasts for related sub-queries.
3. **Wasted attention** — session-expired toasts fire alongside a redirect the user is already navigating through.
4. **Inconsistent voice** — success messages use random emoji (`🐱`, `🔗`), vary in tone, and lack a coherent personality.
5. **Poor mobile ergonomics** — `top-center` position competes with notch/Dynamic Island, requires reaching to the top to tap undo, and interrupts the primary content area.
6. **No loading feedback** — multi-step operations (photo upload → sighting → embedding) have no ambient progress indicator once the user leaves the originating screen.
7. **Short undo window** — 5s is insufficient for one-handed outdoor mobile use.

## Solution

A centralized `notify` module (`lib/toast.ts`) that wraps Sonner and becomes the single import for all toast behavior. All user-facing copy lives in a message registry keyed by ID. Direct imports from `sonner` are banned via ESLint.

## Design decisions

| Decision         | Choice                                                                             | Rationale                                                                              |
| ---------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Error philosophy | Silent for non-blocking; actionable only when user intent is blocked               | Casual mobile app — don't interrupt flow with noise                                    |
| Success toasts   | Keep but tone down (shorter duration, no emoji, consistent voice)                  | Positive reinforcement without training users to ignore all toasts                     |
| Undo pattern     | Toast-based, 7s window                                                             | Same interaction model, extended for mobile motor delay + attention splitting          |
| Cascade handling | Show only the root/most important failure, suppress downstream errors within 500ms | One action → one error toast max                                                       |
| Position         | `bottom-center`, 80px offset                                                       | Thumb-zone ergonomics, clears bottom nav, minimal overlap with content                 |
| Error voice      | Warm, specific, actionable — no jargon, no apologies, always a next step           | UX psychology: reduces cognitive load at stress moments, prevents learned helplessness |
| Loading toasts   | `toast.loading()` for operations >2s when user has left the inline-loading context | Confidence the app hasn't hung, without doubling up on visible spinners                |

## Architecture

### File structure

```
lib/
  toast.ts          # notify module — API, message registry, cascade logic
  toast.types.ts    # MessageId union type, option interfaces
```

### API

```ts
notify.error(id: MessageId, options?: { retry?: () => void })
notify.success(id: MessageId, options?: { values?: Record<string, string> })
notify.undo(id: MessageId, options: { onUndo: () => void; values?: Record<string, string> })
notify.loading(id: MessageId): { resolve: (successId?: MessageId) => void; reject: (errorId?: MessageId) => void }
```

### Message registry

All user-facing copy in one map. Messages with `null` value suppress the toast entirely.

```ts
const MESSAGES: Record<MessageId, string | null> = {
  // Errors — warm, specific, actionable
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
  'undo-expired': 'That change already saved. You can edit it from the cat's profile.',
  'unknown-error': 'Something went wrong. Try again.',
  'uploading-photo': 'Uploading photo…',

  // Success — brief, consistent, no emoji
  'tag-saved': 'Tag saved',
  'avatar-updated': 'Avatar updated',
  'avatar-removed': 'Avatar removed',
  'link-copied': 'Link copied',
  'card-downloaded': 'Card downloaded',
  'welcome': 'Welcome to Cat-A-Log, @{username}',
  'registered': "You're in — let's set up your profile.",
  'featured-set': '{name} is now your featured cat',
  'featured-reset': 'Now showing your top cat',

  // Undo — action echo
  'tag-added': 'Tagged: {label}',
  'tag-resolved': '✓ {label}',
}
```

### UX psychology grounding for message copy

Each message was reviewed against these principles:

- **Don't blame the user** (fundamental attribution error) — system failures use "Couldn't" not "Check your..."
- **Action over specification** — tell users what to do, not what went wrong technically
- **Always a forward path** — never leave the user at a dead end (prevents learned helplessness)
- **Active voice** — the system owns its failures
- **Result language** — describe outcomes, not mechanisms ("Now showing your top cat" not "Featured cat reset")
- **Recognition over recall** — don't list specs (file formats), point to the action
- **Minimal viable information** — only what's needed to understand and recover

### Duration rules

```ts
const DURATION = {
  success: 2000, // Minimal confirmation — registers subconsciously
  error: 4000, // Time to process surprise + read recovery action
  undo: 7000, // Mobile motor delay + attention splitting + deliberation
  loading: Infinity, // Dismissed programmatically; 30s safety auto-reject
} as const
```

### Cascade suppression

```ts
let lastErrorTimestamp = 0
const CASCADE_WINDOW_MS = 500

// In notify.error():
// 1. If another error was shown within 500ms → suppress silently
// 2. Otherwise → show toast, record timestamp
```

First error wins. In Cat-A-Log's data flow, downstream fetches depend on the first, so the first failure is always the root cause.

### Template interpolation

```ts
function interpolate(template: string, values?: Record<string, string>): string {
  if (!values) return template
  return Object.entries(values).reduce((str, [key, val]) => str.replace(`{${key}}`, val), template)
}
```

### Loading toast lifecycle

```ts
notify.loading(id): {
  resolve(successId?) → dismiss loading, optionally show success toast
  reject(errorId?) → dismiss loading, show error toast (respects cascade)
  // 30s safety timeout → auto-reject with 'unknown-error'
}
```

## Toaster configuration

In `app/layout.tsx`:

```tsx
<Toaster position="bottom-center" offset={80} />
```

### Visual adjustments

| Property         | Change                                                             | Rationale                                                        |
| ---------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Position         | `top-center` → `bottom-center`                                     | Thumb-zone access for undo, less interruption to primary content |
| Offset           | 0 → 80px                                                           | Clears 64px bottom nav + 16px breathing room                     |
| Success style    | Subtler — use `--muted` background instead of `--popover`, no icon | Visual hierarchy: success is quietest, error pops                |
| Width            | Responsive `max-w-[calc(100vw-2rem)]`                              | Edge padding on small devices                                    |
| Swipe-to-dismiss | Default (enabled for bottom)                                       | User agency                                                      |
| Reduced motion   | Respected by Sonner                                                | No custom work needed                                            |

## Migration

### Eliminated toasts (4 removed, 1 demoted)

| Current call                                               | Action           | Reason                                                                      |
| ---------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| `toast.error('Session expired. Please sign in again.')` ×3 | Remove           | Redirect communicates state; phantom feedback trains users to ignore toasts |
| `toast.error('Could not load cat tags')`                   | Remove           | Downstream failure; non-blocking — cats render fine without tags            |
| `toast.error('Could not track your location')`             | Demote to silent | Map still works; show in-UI state instead                                   |

### Migration pattern

```ts
// Before (scattered, inconsistent)
import { toast } from 'sonner'
toast.error(error.message)

// After (centralized, human-written)
import { notify } from '@/lib/toast'
notify.error('upload-failed')
```

### Undo migration

```ts
// Before
toast(`Tagged: ${TAG_TOAST_LABEL[tag]}`, {
  id: TAG_UNDO_TOAST_ID,
  duration: TAG_UNDO_DURATION,
  action: { label: 'Undo', onClick: () => handleUndo() },
})

// After
notify.undo('tag-added', {
  values: { label: TAG_TOAST_LABEL[tag] },
  onUndo: () => handleUndo(),
})
```

### Loading toast (new)

```ts
const upload = notify.loading('uploading-photo')
// on success:
upload.resolve('tag-saved')
// on failure:
upload.reject('upload-failed')
```

## ESLint enforcement

```json
"no-restricted-imports": ["error", {
  "paths": [{
    "name": "sonner",
    "importNames": ["toast"],
    "message": "Use `notify` from '@/lib/toast' instead."
  }]
}]
```

`lib/toast.ts` gets an `// eslint-disable-next-line` for its single internal Sonner import.

## Scope

- **In scope:** `lib/toast.ts`, `lib/toast.types.ts`, `components/ui/sonner.tsx` config update, `app/layout.tsx` Toaster props, all 15 files with toast calls migrated, ESLint rule added.
- **Out of scope:** Custom toast UI components, animation redesign, toast stacking strategies beyond cascade suppression.
