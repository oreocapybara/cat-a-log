import { CoachMark } from '@/app/(app)/components/coach-mark'

export function FilterHint() {
  return (
    <CoachMark
      text="Filter by ear-tip status or welfare tags."
      arrow="top"
      className="absolute top-16 right-4"
    />
  )
}
