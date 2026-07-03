'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root

function DialogContent({ className, children, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal">
      <DialogPrimitive.Backdrop
        data-slot="dialog-backdrop"
        className="motion-safe:data-[ending-style]:animate-out motion-safe:data-[ending-style]:fade-out motion-safe:data-[starting-style]:animate-in motion-safe:data-[starting-style]:fade-in fixed inset-0 z-50 bg-black/50 motion-safe:duration-200"
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'bg-card border-border motion-safe:data-[ending-style]:animate-out motion-safe:data-[ending-style]:slide-out-to-bottom motion-safe:data-[starting-style]:animate-in motion-safe:data-[starting-style]:slide-in-from-bottom fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t p-6 shadow-lg motion-safe:duration-200',
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
