'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil } from 'lucide-react'
import { notify } from '@/lib/toast'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { updateProfile } from '../actions'

const editProfileSchema = z.object({
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username must be 30 characters or less')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),
  bio: z.string().max(160, 'Bio must be 160 characters or less'),
})

type EditProfileForm = z.infer<typeof editProfileSchema>

type EditProfileDialogProps = {
  username: string
  bio: string | null
}

export function EditProfileDialog({ username, bio }: EditProfileDialogProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      username,
      bio: bio ?? '',
    },
  })

  const bioValue = watch('bio') ?? ''

  function handleOpen() {
    reset({ username, bio: bio ?? '' })
    setOpen(true)
  }

  async function onSubmit(data: EditProfileForm) {
    setSaving(true)
    const result = await updateProfile({
      username: data.username,
      bio: data.bio || null,
    })

    if (result?.error) {
      notify.error('unknown-error')
      setSaving(false)
      return
    }

    notify.success('profile-updated')
    setSaving(false)
    setOpen(false)

    if (result.redirectTo) {
      router.push(result.redirectTo)
    } else {
      router.refresh()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
        aria-label="Edit profile"
      >
        <Pencil className="h-3 w-3" />
        <span>Edit</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Edit profile</DialogTitle>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="edit-username">Username</Label>
              <div className="relative">
                <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  @
                </span>
                <Input
                  id="edit-username"
                  className="pl-7"
                  autoComplete="username"
                  {...register('username')}
                />
              </div>
              {errors.username && (
                <p className="text-destructive text-xs">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <Label htmlFor="edit-bio">
                  Bio <span className="text-muted-foreground">(optional)</span>
                </Label>
                <span className="text-muted-foreground text-xs">{bioValue.length}/160</span>
              </div>
              <Textarea
                id="edit-bio"
                placeholder="Tell people about yourself"
                maxLength={160}
                className="min-h-20 resize-none"
                {...register('bio')}
              />
              {errors.bio && <p className="text-destructive text-xs">{errors.bio.message}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
