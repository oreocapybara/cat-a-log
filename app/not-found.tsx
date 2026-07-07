import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 p-4">
      <div className="w-full max-w-sm text-center">
        <p className="text-6xl" role="img" aria-label="Cat hiding">
          🐈‍⬛
        </p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-600">
          This cat must have wandered off. The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/map"
          className="mt-6 inline-block rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none"
        >
          Back to the map
        </Link>
      </div>
    </div>
  )
}
