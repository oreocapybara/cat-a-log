'use client'

import { Camera, Loader2, User } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { ShareProfileButton } from './share-profile-button'
import { useAvatarUpload } from './avatar-upload-provider'
import { avatarDialogOpen } from './avatar-upload-dialog'

type ProfileHeaderProps = {
  username: string
  avatarUrl: string | null
  bio: string | null
  catsCount: number
  totalSightings: number
  isOwner: boolean
}

export function ProfileHeader({
  username,
  avatarUrl,
  bio,
  catsCount,
  totalSightings,
  isOwner,
}: ProfileHeaderProps) {
  const initials = username.slice(0, 2).toUpperCase()

  return (
    <>
      {/* Top bar */}
      <div className="flex w-full items-center justify-between">
        <div>{/* spacer */}</div>
        <div className="relative flex items-center gap-2">
          {isOwner && <ThemeToggle />}
          <ShareProfileButton username={username} />
        </div>
      </div>

      {/* Avatar */}
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300">
        {isOwner ? (
          <AvatarWithEdit avatarUrl={avatarUrl} username={username} initials={initials} />
        ) : (
          <AvatarDisplay avatarUrl={avatarUrl} username={username} initials={initials} />
        )}
      </div>

      {/* Username + bio */}
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-backwards space-y-2 motion-safe:delay-100 motion-safe:duration-300">
        <h1 className="font-heading text-2xl font-bold tracking-tight">@{username}</h1>
        {bio && (
          <p className="text-muted-foreground mx-auto max-w-[280px] text-sm leading-relaxed">
            {bio}
          </p>
        )}
      </div>

      {/* Stats strip */}
      {catsCount > 0 && (
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-backwards bg-muted/50 flex w-full items-center justify-center gap-6 rounded-xl px-4 py-3 motion-safe:delay-150 motion-safe:duration-300">
          <div className="text-center">
            <p className="text-foreground text-lg font-bold">{catsCount}</p>
            <p className="text-muted-foreground text-xs">
              {catsCount === 1 ? 'Cat' : 'Cats'} tagged
            </p>
          </div>
          <div className="bg-border h-8 w-px" />
          <div className="text-center">
            <p className="text-foreground text-lg font-bold">{totalSightings}</p>
            <p className="text-muted-foreground text-xs">
              {totalSightings === 1 ? 'Sighting' : 'Sightings'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

/** Avatar display for non-owners (no edit button) */
function AvatarDisplay({
  avatarUrl,
  username,
  initials,
}: {
  avatarUrl: string | null
  username: string
  initials: string
}) {
  if (avatarUrl) {
    return (
      <div className="ring-primary/20 h-24 w-24 overflow-hidden rounded-full ring-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div className="bg-primary text-primary-foreground flex h-24 w-24 items-center justify-center rounded-full text-2xl font-semibold">
      {initials ?? <User className="h-10 w-10" />}
    </div>
  )
}

/** Avatar with edit overlay for owner — consumes AvatarUploadProvider context */
function AvatarWithEdit({
  avatarUrl,
  username,
  initials,
}: {
  avatarUrl: string | null
  username: string
  initials: string
}) {
  const { isUploading, previewUrl } = useAvatarUpload()
  const displayUrl = previewUrl ?? avatarUrl

  return (
    <button
      type="button"
      onClick={() => avatarDialogOpen?.()}
      className="group relative"
      aria-label="Change profile photo"
      aria-busy={isUploading}
    >
      {/* Avatar circle */}
      {displayUrl ? (
        <div className="ring-primary/20 h-24 w-24 overflow-hidden rounded-full ring-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displayUrl} alt={username} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="border-primary/40 text-muted-foreground flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed text-2xl font-semibold">
          {initials ?? <User className="h-10 w-10" />}
        </div>
      )}

      {/* Upload spinner overlay */}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
          <span className="sr-only" role="status">
            Uploading avatar
          </span>
        </div>
      )}

      {/* Edit badge (camera icon) — bottom-right */}
      {!isUploading && (
        <div className="bg-primary text-primary-foreground absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full shadow-md transition-transform group-hover:scale-110">
          <Camera className="h-3.5 w-3.5" />
        </div>
      )}
    </button>
  )
}
