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
  'cat-released': "Released {name} — it's still on the map",
  'cat-removed': 'Removed {name} completely',
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
