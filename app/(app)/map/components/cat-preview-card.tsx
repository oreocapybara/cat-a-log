import { MapPin, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { CatTag, NearbyCat } from '@/lib/supabase/types'

const TAG_LABELS: Record<CatTag['tag'], string> = {
  needs_medical: 'Needs medical attention',
  possible_rabies: 'Possible rabies',
  deceased: 'Deceased',
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m away`
  return `${km.toFixed(1)}km away`
}

export function CatPreviewCard({
  cat,
  tags,
  onClose,
}: {
  cat: NearbyCat
  tags: CatTag['tag'][]
  onClose: () => void
}) {
  return (
    <Card className="absolute inset-x-4 bottom-24 z-10 flex-row items-start gap-3 p-3 shadow-lg">
      <div className="bg-secondary h-16 w-16 shrink-0 overflow-hidden rounded-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cat.primary_photo_url} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="font-heading truncate font-medium">{cat.name ?? 'Unnamed cat'}</p>
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <MapPin className="h-3 w-3 shrink-0" />
          <span>{formatDistance(cat.distance_km)}</span>
        </div>
        {(cat.is_ear_tipped || tags.length > 0) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {cat.is_ear_tipped && (
              <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-[11px]">
                Ear-tipped
              </span>
            )}
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-[11px]"
              >
                {TAG_LABELS[tag]}
              </span>
            ))}
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        aria-label="Close"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </Card>
  )
}
