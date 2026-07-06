'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { notify } from '@/lib/toast'
import { createClient } from '@/lib/supabase/client'
import { resizeImageToJpeg } from '@/lib/image-utils'
import { updateAvatar } from '../actions'

type AvatarUploadState = {
  isUploading: boolean
  previewUrl: string | null
  isCropping: boolean
  cropImageUrl: string | null
  openPicker: () => void
  openCamera: () => void
  startCrop: (file: File) => void
  finishCrop: (croppedFile: File) => void
  cancelCrop: () => void
  removeAvatar: () => void
}

const AvatarUploadContext = createContext<AvatarUploadState | null>(null)

export function useAvatarUpload() {
  const ctx = useContext(AvatarUploadContext)
  if (!ctx) throw new Error('useAvatarUpload must be used within AvatarUploadProvider')
  return ctx
}

export function AvatarUploadProvider({
  userId,
  children,
}: {
  userId: string
  children: ReactNode
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isCropping, setIsCropping] = useState(false)
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null)

  const handleFileSelected = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      notify.error('upload-too-large')
      return
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (!validTypes.includes(file.type)) {
      notify.error('upload-bad-format')
      return
    }

    // Open crop screen
    const url = URL.createObjectURL(file)
    setCropImageUrl(url)
    setIsCropping(true)
  }, [])

  const openPicker = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp,image/heic'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handleFileSelected(file)
    }
    input.click()
  }, [handleFileSelected])

  const openCamera = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handleFileSelected(file)
    }
    input.click()
  }, [handleFileSelected])

  const startCrop = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    setCropImageUrl(url)
    setIsCropping(true)
  }, [])

  const cancelCrop = useCallback(() => {
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl)
    setCropImageUrl(null)
    setIsCropping(false)
  }, [cropImageUrl])

  const finishCrop = useCallback(
    async (croppedFile: File) => {
      // Close crop screen
      if (cropImageUrl) URL.revokeObjectURL(cropImageUrl)
      setCropImageUrl(null)
      setIsCropping(false)

      // Show optimistic preview
      const preview = URL.createObjectURL(croppedFile)
      setPreviewUrl(preview)
      setIsUploading(true)

      try {
        // Resize to 512x512 JPEG
        const resizedBlob = await resizeImageToJpeg(croppedFile, 512, 0.85)

        // Upload to Supabase Storage
        const supabase = createClient()
        const path = `${userId}/avatar.jpg`

        if (path.includes('..')) {
          throw new Error('Invalid path')
        }

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, resizedBlob, {
            upsert: true,
            contentType: 'image/jpeg',
          })

        if (uploadError) {
          throw new Error(uploadError.message)
        }

        // Get public URL with cache-busting timestamp
        const {
          data: { publicUrl },
        } = supabase.storage.from('avatars').getPublicUrl(path)

        const avatarUrl = `${publicUrl}?t=${Date.now()}`

        // Update profile via server action
        const result = await updateAvatar(avatarUrl)
        if (result.error) {
          throw new Error(result.error)
        }

        notify.success('avatar-updated')
      } catch (error) {
        notify.error('avatar-upload-failed')
        setPreviewUrl(null)
      } finally {
        setIsUploading(false)
        // Clean up preview URL after a delay (let the revalidation replace it)
        setTimeout(() => {
          URL.revokeObjectURL(preview)
          setPreviewUrl(null)
        }, 2000)
      }
    },
    [cropImageUrl, userId]
  )

  const removeAvatar = useCallback(async () => {
    setIsUploading(true)
    setPreviewUrl(null)

    try {
      // Delete from storage
      const supabase = createClient()
      const filePath = `${userId}/avatar.jpg`
      if (filePath.includes('..')) {
        throw new Error('Invalid file path')
      }
      await supabase.storage.from('avatars').remove([filePath])

      // Update profile
      const result = await updateAvatar(null)
      if (result.error) {
        throw new Error(result.error)
      }

      notify.success('avatar-removed')
    } catch (error) {
      notify.error('avatar-upload-failed')
    } finally {
      setIsUploading(false)
    }
  }, [userId])

  return (
    <AvatarUploadContext.Provider
      value={{
        isUploading,
        previewUrl,
        isCropping,
        cropImageUrl,
        openPicker,
        openCamera,
        startCrop,
        finishCrop,
        cancelCrop,
        removeAvatar,
      }}
    >
      {children}
    </AvatarUploadContext.Provider>
  )
}
