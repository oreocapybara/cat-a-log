import { CoachMark } from '@/app/(app)/components/coach-mark'

export function TagFabHint() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
      <CoachMark text="Tap here to tag a stray cat you've found." arrow="bottom" />
    </div>
  )
}
