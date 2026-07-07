import Link from 'next/link'
import { Cat, MapPin } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function NotFound() {
  return (
    <div className="bg-background flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      {/* Icon */}
      <div className="bg-primary/10 mb-6 flex h-20 w-20 items-center justify-center rounded-full">
        <Cat className="text-primary h-10 w-10" />
      </div>

      {/* Copy */}
      <h1 className="font-heading text-3xl font-bold tracking-tight">Lost cat?</h1>
      <p className="text-muted-foreground mt-2 max-w-xs text-base">
        This page doesn&apos;t exist. Head back to the map to find the cats that do.
      </p>

      {/* CTA */}
      <Link
        href="/map"
        className={cn(buttonVariants(), 'mt-8 h-11 gap-2 px-5 text-base font-medium')}
      >
        <MapPin className="h-4 w-4" />
        Back to the map
      </Link>
    </div>
  )
}
