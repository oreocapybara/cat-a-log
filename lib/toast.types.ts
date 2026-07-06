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
  | 'cat-released'
  | 'cat-removed'
  | 'info-updated'
  | 'profile-updated'
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
