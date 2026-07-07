/**
 * Safe redirect utility.
 *
 * Validates user-supplied redirect targets against a strict allowlist of
 * known application paths. Rejects absolute URLs, protocol-prefixed values,
 * protocol-relative forms, encoded variants, and path traversal attempts.
 *
 * Usage:
 *   import { getSafeRedirect } from '@/lib/safe-redirect'
 *   router.push(getSafeRedirect(userInput))
 */

const DEFAULT_REDIRECT = '/map'

/**
 * Allowlist of path prefixes that are valid redirect destinations.
 * Only relative paths within the application are permitted.
 */
const ALLOWED_PATH_PREFIXES = [
  '/map',
  '/tag',
  '/profile',
  '/cat',
  '/setup-profile',
  '/login',
  '/register',
] as const

/**
 * Dangerous patterns that indicate an open-redirect attempt.
 * Checked against the decoded, normalized input.
 */
const DANGEROUS_PATTERNS = [
  /^[a-z][a-z0-9+\-.]*:/i, // Any protocol (http:, https:, javascript:, data:, etc.)
  /^\/\//, // Protocol-relative URL
  /^\\\\/, // UNC path
  /^\/\\/, // Mixed slash that browsers may interpret as protocol-relative
  /[\x00-\x1f]/, // Control characters (tabs, newlines used to bypass filters)
  /[^\x20-\x7e/]/, // Non-printable ASCII after basic decode (catches exotic encodings)
]

/**
 * Fully decodes a URI string, handling double/triple encoding.
 * Returns null if decoding fails (malformed input).
 */
function fullyDecode(value: string): string | null {
  let decoded = value
  const maxIterations = 5

  for (let i = 0; i < maxIterations; i++) {
    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) return decoded
      decoded = next
    } catch {
      // Malformed encoding
      return null
    }
  }

  // If we hit the iteration cap, the input is suspiciously over-encoded
  return null
}

/**
 * Returns a safe redirect path, or the default redirect if the input is
 * invalid or potentially dangerous.
 *
 * @param target - The user-supplied redirect target (e.g. from ?returnTo=)
 * @param fallback - Fallback path if target is invalid (defaults to '/map')
 * @returns A validated path guaranteed to be a relative app route
 */
export function getSafeRedirect(
  target: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT
): string {
  // Reject nullish or empty values
  if (!target || target.trim() === '') {
    return fallback
  }

  // Fully decode to catch %2f%2f, %5c, double-encoding tricks, etc.
  const decoded = fullyDecode(target.trim())
  if (decoded === null) {
    return fallback
  }

  // Must start with a single forward slash (relative path)
  if (!decoded.startsWith('/')) {
    return fallback
  }

  // Check all dangerous patterns against the decoded value
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(decoded)) {
      return fallback
    }
  }

  // Normalize path: resolve . and .. segments
  // Using URL constructor with a dummy base to safely parse the path
  let parsedPath: string
  try {
    const url = new URL(decoded, 'http://localhost')

    // If the URL constructor parsed this as having a different host, reject it
    if (url.hostname !== 'localhost') {
      return fallback
    }

    parsedPath = url.pathname
  } catch {
    return fallback
  }

  // After normalization, reject path traversal (should be resolved but double-check)
  if (parsedPath.includes('..') || parsedPath.includes('./')) {
    return fallback
  }

  // Re-check dangerous patterns against the normalized path
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(parsedPath)) {
      return fallback
    }
  }

  // Allowlist check: the normalized path must start with one of our known prefixes
  const isAllowed = ALLOWED_PATH_PREFIXES.some(
    (prefix) => parsedPath === prefix || parsedPath.startsWith(prefix + '/')
  )

  if (!isAllowed) {
    return fallback
  }

  // Return the normalized path (no query string or fragment — strip those)
  return parsedPath
}
