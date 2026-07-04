'use client'

import { cn } from '@/lib/utils'
import { Camera, Search, PawPrint, ClipboardList } from 'lucide-react'

const STEPS_4 = [
  { label: 'Photo', icon: Camera },
  { label: 'Match', icon: Search },
  { label: 'Name', icon: PawPrint },
  { label: 'Details', icon: ClipboardList },
]

const STEPS_3 = [
  { label: 'Photo', icon: Camera },
  { label: 'Match', icon: Search },
  { label: 'Found!', icon: PawPrint },
]

export function StepDots({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const steps = totalSteps === 3 ? STEPS_3 : STEPS_4

  return (
    <div className="from-background/95 to-background/0 fixed inset-x-0 top-0 z-40 bg-gradient-to-b pt-3 pb-4">
      <div className="mx-auto flex max-w-xs items-center justify-center gap-0">
        {steps.map((step, i) => {
          const stepNum = i + 1
          const isCompleted = stepNum < currentStep
          const isCurrent = stepNum === currentStep
          const Icon = step.icon

          return (
            <div key={step.label} className="flex items-center">
              {/* Step node */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300',
                    isCompleted && 'bg-primary text-primary-foreground scale-90',
                    isCurrent &&
                      'bg-primary text-primary-foreground ring-primary/30 scale-110 ring-4',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground scale-90'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium transition-colors duration-300',
                    isCurrent ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="relative mx-1.5 mb-4 h-0.5 w-6">
                  <div className="bg-muted absolute inset-0 rounded-full" />
                  <div
                    className={cn(
                      'bg-primary absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                      stepNum < currentStep ? 'w-full' : 'w-0'
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
