'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root

function DialogContent({ className, children, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal">
      <DialogPrimitive.Backdrop
        data-slot="dialog-backdrop"
        className="fixed inset-0 z-50 bg-black/50 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-safe:transition-opacity motion-safe:duration-200"
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'bg-card border-border fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t p-6 shadow-lg data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full motion-safe:transition-[translate] motion-safe:duration-200 motion-safe:ease-out',
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-heading text-lg font-medium', className)}
      {...props}
    />
  )
}

export { Dialog, DialogContent, DialogTitle }
