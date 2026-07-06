'use client'

import { useEffect, useState } from 'react'
import { Leaf, ThumbsUp, ThumbsDown, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type VoteState = {
  confirmCount: number
  denyCount: number
  userVote: 'confirm' | 'deny' | null
}

export function InvasiveVoteCallout({
  catTagId,
  currentUserId,
  verificationStatus,
  onStatusChange,
}: {
  catTagId: string
  currentUserId: string
  verificationStatus: 'pending' | 'verified' | 'dismissed'
  onStatusChange?: (newStatus: 'verified' | 'dismissed') => void
}) {
  const [voteState, setVoteState] = useState<VoteState | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchVotes() {
      const supabase = createClient()
      const { data: votes } = await supabase
        .from('invasive_risk_votes')
        .select('vote, voted_by')
        .eq('cat_tag_id', catTagId)

      if (votes) {
        const confirmCount = votes.filter((v) => v.vote === 'confirm').length
        const denyCount = votes.filter((v) => v.vote === 'deny').length
        const userVote =
          (votes.find((v) => v.voted_by === currentUserId)?.vote as
            | 'confirm'
            | 'deny'
            | undefined) ?? null
        setVoteState({ confirmCount, denyCount, userVote })
      }
      setLoading(false)
    }

    fetchVotes()
  }, [catTagId, currentUserId])

  async function handleVote(vote: 'confirm' | 'deny') {
    setSubmitting(true)
    const supabase = createClient()

    const { error } = await supabase.from('invasive_risk_votes').insert({
      cat_tag_id: catTagId,
      voted_by: currentUserId,
      vote,
    })

    if (error) {
      if (error.code === '23505') {
        toast.error('You have already voted on this flag.')
      } else {
        toast.error('Could not submit vote.')
      }
      setSubmitting(false)
      return
    }

    const newState: VoteState = {
      confirmCount: voteState!.confirmCount + (vote === 'confirm' ? 1 : 0),
      denyCount: voteState!.denyCount + (vote === 'deny' ? 1 : 0),
      userVote: vote,
    }
    setVoteState(newState)
    setSubmitting(false)

    toast.success(vote === 'confirm' ? 'Vote recorded: Yes' : 'Vote recorded: No')

    if (newState.confirmCount >= 3) {
      onStatusChange?.('verified')
    } else if (newState.denyCount >= 3) {
      onStatusChange?.('dismissed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
      </div>
    )
  }

  if (!voteState) return null

  // Already verified — show confirmed badge
  if (verificationStatus === 'verified') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-medium text-green-700 dark:bg-green-950/30 dark:text-green-300">
        <Check className="h-3.5 w-3.5" />
        <span>Verified by community ({voteState.confirmCount} confirmations)</span>
      </div>
    )
  }

  // Dismissed — don't render
  if (verificationStatus === 'dismissed') return null

  // User already voted
  if (voteState.userVote) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50/50 px-3 py-2 dark:border-green-800/50 dark:bg-green-950/20">
        <div className="flex items-center gap-2 text-xs font-medium text-green-700 dark:text-green-300">
          <Check className="h-3.5 w-3.5" />
          <span>You voted: {voteState.userVote === 'confirm' ? 'Yes' : 'No'}</span>
        </div>
        <p className="text-muted-foreground mt-1 text-[10px]">
          {voteState.confirmCount} of 3 confirmations
        </p>
      </div>
    )
  }

  // Show vote prompt
  return (
    <div className="space-y-2 rounded-xl border border-green-200 bg-green-50/50 p-3 dark:border-green-800/50 dark:bg-green-950/20">
      <div className="flex items-center gap-2">
        <Leaf className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        <span className="text-xs font-semibold text-green-800 dark:text-green-200">
          Invasive risk — verify?
        </span>
      </div>
      <p className="text-muted-foreground text-[11px]">
        Do you think this cat is a risk to local wildlife?
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 flex-1 gap-1 rounded-lg text-xs"
          onClick={() => handleVote('confirm')}
          disabled={submitting}
        >
          <ThumbsUp className="h-3 w-3" />
          Yes
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 flex-1 gap-1 rounded-lg text-xs"
          onClick={() => handleVote('deny')}
          disabled={submitting}
        >
          <ThumbsDown className="h-3 w-3" />
          No
        </Button>
      </div>
      <p className="text-muted-foreground text-[10px]">
        {voteState.confirmCount} of 3 confirmations needed
      </p>
    </div>
  )
}
