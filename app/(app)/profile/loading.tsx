export default function ProfileLoading() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center gap-6 px-4 py-6">
      {/* Avatar skeleton */}
      <div className="bg-muted h-24 w-24 animate-pulse rounded-full" />

      {/* Username skeleton */}
      <div className="bg-muted h-5 w-32 animate-pulse rounded-md" />

      {/* Bio skeleton */}
      <div className="bg-muted h-4 w-48 animate-pulse rounded-md" />

      {/* Stats skeleton */}
      <div className="flex gap-8">
        <div className="flex flex-col items-center gap-1">
          <div className="bg-muted h-5 w-8 animate-pulse rounded-md" />
          <div className="bg-muted h-3 w-12 animate-pulse rounded-md" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="bg-muted h-5 w-8 animate-pulse rounded-md" />
          <div className="bg-muted h-3 w-16 animate-pulse rounded-md" />
        </div>
      </div>

      {/* Cat cards skeleton */}
      <div className="w-full space-y-3">
        <div className="bg-muted h-5 w-20 animate-pulse rounded-md" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-muted h-20 w-full animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  )
}
