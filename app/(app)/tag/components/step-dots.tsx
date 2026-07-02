import { cn } from '@/lib/utils'

export function StepDots({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="fixed inset-x-0 top-0 z-40 flex justify-center gap-1.5 pt-3">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <span
          key={step}
          className={cn(
            'h-1.5 rounded-full transition-all duration-150',
            step <= currentStep ? 'bg-primary w-6' : 'bg-muted w-1.5'
          )}
        />
      ))}
    </div>
  )
}
