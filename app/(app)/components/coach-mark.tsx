import { cn } from '@/lib/utils'

export function CoachMark({
  text,
  arrow = 'bottom',
  className,
}: {
  text: string
  arrow?: 'top' | 'bottom'
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none z-40 flex flex-col items-center', className)}
    >
      {arrow === 'top' && (
        <div className="border-b-primary h-0 w-0 border-x-8 border-b-8 border-x-transparent" />
      )}
      <div className="bg-primary text-primary-foreground animate-in fade-in zoom-in-95 max-w-[200px] rounded-xl px-3 py-2 text-center text-xs font-medium shadow-lg duration-300">
        {text}
      </div>
      {arrow === 'bottom' && (
        <div className="border-t-primary h-0 w-0 border-x-8 border-t-8 border-x-transparent" />
      )}
    </div>
  )
}
