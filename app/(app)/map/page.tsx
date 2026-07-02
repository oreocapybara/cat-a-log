import { Cat, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function MapPage() {
  return (
    <div className="relative h-screen overflow-hidden">
      {/* Placeholder map surface — live map library integration is separate follow-up work */}
      <div className="bg-secondary/40 absolute inset-0" aria-hidden="true" />

      <div className="absolute inset-x-4 top-4 flex items-center gap-2">
        <div className="border-border bg-card text-muted-foreground flex flex-1 items-center gap-2 rounded-full border px-4 py-2.5 shadow-sm">
          <Search className="h-4 w-4 shrink-0" />
          <span className="text-sm">Search this area</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="bg-card shrink-0 rounded-full shadow-sm"
          aria-label="Filter cats"
        >
          <SlidersHorizontal />
        </Button>
      </div>

      <Card className="absolute inset-x-4 bottom-24 flex-row items-center gap-3 p-3 shadow-lg">
        <div className="bg-secondary flex h-16 w-16 shrink-0 items-center justify-center rounded-lg">
          <Cat className="text-secondary-foreground h-8 w-8" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-heading font-medium">Mochi</p>
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPin className="h-3 w-3" />
            <span>120m away</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
