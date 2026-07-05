'use client'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { cn } from '@/lib/utils'

const Dialog = DrawerPrimitive.Root

function DialogContent({ className, children, ...props }: DrawerPrimitive.Popup.Props) {
  return (
    <DrawerPrimitive.Portal data-slot="dialog-portal">
      <DrawerPrimitive.Backdrop
        data-slot="dialog-backdrop"
        className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
      />
      <DrawerPrimitive.Viewport data-slot="dialog-viewport" className="fixed inset-0 z-50">
        <DrawerPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            'bg-card border-border fixed inset-x-0 bottom-0 [transform:translateY(var(--drawer-swipe-movement-y))] rounded-t-2xl border-t p-6 shadow-lg transition-transform duration-200 ease-out data-[ending-style]:[transform:translateY(100%)] data-[starting-style]:[transform:translateY(100%)]',
            className
          )}
          {...props}
        >
          {children}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  )
}

function DialogTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-heading text-lg font-medium', className)}
      {...props}
    />
  )
}

export { Dialog, DialogContent, DialogTitle }
