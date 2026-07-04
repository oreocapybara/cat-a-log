import BottomNav from './components/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Main content — padded at bottom for the floating nav (clears its FAB overhang) */}
      <main className="flex-1 pb-28">{children}</main>
      <BottomNav />
    </div>
  )
}
