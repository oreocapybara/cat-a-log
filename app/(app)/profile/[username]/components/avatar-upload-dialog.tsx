'use client'

import { useState } from 'react'
import { Camera, ImagePlus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useAvatarUpload } from './avatar-upload-provider'
import { AvatarCropScreen } from './avatar-crop-screen'

type AvatarUploadDialogProps = {
  hasAvatar: boolean
}

export function AvatarUploadDialog({ hasAvatar }: AvatarUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const { openPicker, openCamera, removeAvatar, isCropping, cropImageUrl, finishCrop, cancelCrop } =
    useAvatarUpload()

  function handleOpenPicker() {
    setOpen(false)
    // Small delay to let the dialog close animation complete
    setTimeout(() => openPicker(), 200)
  }

  function handleOpenCamera() {
    setOpen(false)
    setTimeout(() => openCamera(), 200)
  }

  function handleRemove() {
    setOpen(false)
    removeAvatar()
  }

  return (
    <>
      {/* Trigger — exposed via this component's parent controlling `open` */}
      <AvatarUploadDialogTrigger onOpen={() => setOpen(true)} />

      {/* Bottom-sheet dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Change Avatar</DialogTitle>

          <div className="mt-4 flex flex-col gap-2">
            {/* Camera option — primarily useful on mobile */}
            <button
              type="button"
              onClick={handleOpenCamera}
              className="hover:bg-muted flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors"
            >
              <Camera className="text-primary h-5 w-5" />
              <span className="text-sm font-medium">Take Photo</span>
            </button>

            {/* Library option */}
            <button
              type="button"
              onClick={handleOpenPicker}
              className="hover:bg-muted flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors"
            >
              <ImagePlus className="text-primary h-5 w-5" />
              <span className="text-sm font-medium">Choose from Library</span>
            </button>

            {/* Remove option — only show if user already has an avatar */}
            {hasAvatar && (
              <button
                type="button"
                onClick={handleRemove}
                className="hover:bg-destructive/10 flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors"
              >
                <Trash2 className="text-destructive h-5 w-5" />
                <span className="text-destructive text-sm font-medium">Remove Photo</span>
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Crop screen — renders as full-screen overlay */}
      {isCropping && cropImageUrl && (
        <AvatarCropScreen imageUrl={cropImageUrl} onDone={finishCrop} onCancel={cancelCrop} />
      )}
    </>
  )
}

/**
 * Hidden trigger component — exposes `onOpen` for the ProfileHeader to call.
 * We use a global ref approach so the header can trigger the dialog.
 */
function AvatarUploadDialogTrigger({ onOpen }: { onOpen: () => void }) {
  // Store the onOpen callback in a module-level ref so the header can access it
  avatarDialogOpen = onOpen
  return null
}

// Module-level callback — used by ProfileHeader to open the dialog

export let avatarDialogOpen: (() => void) | null = null
