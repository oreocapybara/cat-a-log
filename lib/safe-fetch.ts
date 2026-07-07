import { lookup } from 'dns/promises'
import { isIPv4, isIPv6 } from 'net'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Maximum response body size (5 MB) */
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 10_000

/** Maximum number of redirects to follow */
const MAX_REDIRECTS = 3

/** Allowed HTTP methods */
const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Allowed schemes */
const ALLOWED_SCHEMES = new Set(['http:', 'https:'])

/** Blocked ports — anything not 80 or 443 or ephemeral-range for http(s) */
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443'])

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SafeFetchOptions {
  /** HTTP method (default: 'GET'). Only GET, HEAD, OPTIONS allowed. */
  method?: 'GET' | 'HEAD' | 'OPTIONS'
  /** Optional allowlist of permitted hostnames. If set, only these hosts are reachable. */
  allowedHosts?: string[]
  /** Custom timeout override in ms (default: 10000, max: 30000) */
  timeoutMs?: number
  /** Custom max response size in bytes (default: 5MB, max: 20MB) */
  maxResponseSize?: number
}

export interface SafeFetchResult {
  status: number
  headers: Headers
  body: ArrayBuffer
  finalUrl: string
}

export class SafeFetchError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_URL'
      | 'BLOCKED_HOST'
      | 'BLOCKED_IP'
      | 'BLOCKED_SCHEME'
      | 'BLOCKED_PORT'
      | 'BLOCKED_REDIRECT'
      | 'TOO_MANY_REDIRECTS'
      | 'RESPONSE_TOO_LARGE'
      | 'TIMEOUT'
      | 'NETWORK_ERROR'
      | 'DNS_RESOLUTION_FAILED'
  ) {
    super(message)
    this.name = 'SafeFetchError'
  }
}

// ---------------------------------------------------------------------------
// IP address range checks
// ---------------------------------------------------------------------------

/**
 * Parse an IPv4 address string into a 32-bit number.
 * Returns null if not a valid IPv4 address.
 */
function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let num = 0
  for (const part of parts) {
    const octet = Number(part)
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null
    num = (num << 8) | octet
  }
  // convert to unsigned 32-bit
  return num >>> 0
}

/**
 * Check if a CIDR range contains the given IP (both as 32-bit unsigned).
 */
function ipv4InCidr(ip: number, network: number, prefixLen: number): boolean {
  const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0
  return (ip & mask) === (network & mask)
}

/** Blocked IPv4 ranges */
const BLOCKED_IPV4_CIDRS: Array<{ network: number; prefixLen: number }> = [
  // 127.0.0.0/8 — loopback
  { network: 0x7f000000, prefixLen: 8 },
  // 10.0.0.0/8 — private
  { network: 0x0a000000, prefixLen: 8 },
  // 172.16.0.0/12 — private
  { network: 0xac100000, prefixLen: 12 },
  // 192.168.0.0/16 — private
  { network: 0xc0a80000, prefixLen: 16 },
  // 169.254.0.0/16 — link-local
  { network: 0xa9fe0000, prefixLen: 16 },
  // 0.0.0.0/8 — "this" network
  { network: 0x00000000, prefixLen: 8 },
  // 224.0.0.0/4 — multicast
  { network: 0xe0000000, prefixLen: 4 },
  // 240.0.0.0/4 — reserved
  { network: 0xf0000000, prefixLen: 4 },
]

/**
 * Check whether an IPv4 address is in a blocked range.
 */
function isBlockedIPv4(ip: string): boolean {
  const num = ipv4ToNumber(ip)
  if (num === null) return true // unparseable → block
  return BLOCKED_IPV4_CIDRS.some((cidr) => ipv4InCidr(num, cidr.network, cidr.prefixLen))
}

/**
 * Parse IPv6 address into 16-byte Uint8Array.
 * Handles :: expansion and IPv4-mapped addresses.
 */
function parseIPv6(ip: string): Uint8Array | null {
  // Handle IPv4-mapped IPv6 (e.g. ::ffff:192.168.1.1)
  const v4MappedMatch = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i)
  if (v4MappedMatch) {
    const bytes = new Uint8Array(16)
    bytes[10] = 0xff
    bytes[11] = 0xff
    const v4Parts = v4MappedMatch[1].split('.').map(Number)
    if (v4Parts.some((p) => p > 255 || p < 0)) return null
    bytes[12] = v4Parts[0]
    bytes[13] = v4Parts[1]
    bytes[14] = v4Parts[2]
    bytes[15] = v4Parts[3]
    return bytes
  }

  // Standard IPv6 parsing
  let expanded = ip

  // Expand ::
  if (expanded.includes('::')) {
    const parts = expanded.split('::')
    if (parts.length > 2) return null
    const left = parts[0] ? parts[0].split(':') : []
    const right = parts[1] ? parts[1].split(':') : []
    const missing = 8 - left.length - right.length
    if (missing < 0) return null
    const middle = Array(missing).fill('0')
    expanded = [...left, ...middle, ...right].join(':')
  }

  const groups = expanded.split(':')
  if (groups.length !== 8) return null

  const bytes = new Uint8Array(16)
  for (let i = 0; i < 8; i++) {
    const val = parseInt(groups[i], 16)
    if (isNaN(val) || val < 0 || val > 0xffff) return null
    bytes[i * 2] = (val >> 8) & 0xff
    bytes[i * 2 + 1] = val & 0xff
  }
  return bytes
}

/**
 * Check if an IPv6 address matches a prefix.
 */
function ipv6InCidr(ipBytes: Uint8Array, prefixBytes: Uint8Array, prefixLen: number): boolean {
  const fullBytes = Math.floor(prefixLen / 8)
  const remainingBits = prefixLen % 8

  for (let i = 0; i < fullBytes; i++) {
    if (ipBytes[i] !== prefixBytes[i]) return false
  }

  if (remainingBits > 0 && fullBytes < 16) {
    const mask = (0xff << (8 - remainingBits)) & 0xff
    if ((ipBytes[fullBytes] & mask) !== (prefixBytes[fullBytes] & mask)) return false
  }

  return true
}

/** Blocked IPv6 prefixes */
const BLOCKED_IPV6: Array<{ bytes: Uint8Array; prefixLen: number }> = [
  // ::1/128 — loopback
  { bytes: parseIPv6('::1')!, prefixLen: 128 },
  // fc00::/7 — unique local
  { bytes: parseIPv6('fc00::')!, prefixLen: 7 },
  // fe80::/10 — link-local
  { bytes: parseIPv6('fe80::')!, prefixLen: 10 },
  // ff00::/8 — multicast
  { bytes: parseIPv6('ff00::')!, prefixLen: 8 },
  // :: (unspecified)
  { bytes: parseIPv6('::')!, prefixLen: 128 },
]

/**
 * Check whether an IPv6 address is in a blocked range.
 */
function isBlockedIPv6(ip: string): boolean {
  // Strip zone ID (e.g. %eth0)
  const cleanIp = ip.replace(/%.*$/, '')
  const ipBytes = parseIPv6(cleanIp)
  if (!ipBytes) return true // unparseable → block

  // Also check if it's an IPv4-mapped address and test the IPv4 portion
  if (
    ipBytes[0] === 0 &&
    ipBytes[1] === 0 &&
    ipBytes[2] === 0 &&
    ipBytes[3] === 0 &&
    ipBytes[4] === 0 &&
    ipBytes[5] === 0 &&
    ipBytes[6] === 0 &&
    ipBytes[7] === 0 &&
    ipBytes[8] === 0 &&
    ipBytes[9] === 0 &&
    ipBytes[10] === 0xff &&
    ipBytes[11] === 0xff
  ) {
    const mappedV4 = `${ipBytes[12]}.${ipBytes[13]}.${ipBytes[14]}.${ipBytes[15]}`
    if (isBlockedIPv4(mappedV4)) return true
  }

  return BLOCKED_IPV6.some((prefix) => ipv6InCidr(ipBytes, prefix.bytes, prefix.prefixLen))
}

/**
 * Check whether an IP address (v4 or v6) is in a blocked range.
 */
export function isBlockedIP(ip: string): boolean {
  if (isIPv4(ip)) return isBlockedIPv4(ip)
  if (isIPv6(ip)) return isBlockedIPv6(ip)
  // Unknown format → block
  return true
}

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

/**
 * Validate and normalize a URL. Throws SafeFetchError for invalid URLs.
 */
function validateUrl(urlString: string, allowedHosts: string[] | undefined): URL {
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    throw new SafeFetchError(`Invalid URL: ${urlString}`, 'INVALID_URL')
  }

  // Block non-http(s) schemes
  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    throw new SafeFetchError(
      `Blocked scheme "${url.protocol}" — only http: and https: are allowed`,
      'BLOCKED_SCHEME'
    )
  }

  // Block userinfo (user:pass@ in URL)
  if (url.username || url.password) {
    throw new SafeFetchError('URLs with userinfo (user:pass@) are not allowed', 'INVALID_URL')
  }

  // Block restricted ports
  if (url.port && !ALLOWED_PORTS.has(url.port)) {
    throw new SafeFetchError(`Port ${url.port} is not allowed`, 'BLOCKED_PORT')
  }

  // If allowlist is configured, check against it
  if (allowedHosts && allowedHosts.length > 0) {
    const hostname = url.hostname.toLowerCase()
    const allowed = allowedHosts.some((h) => hostname === h.toLowerCase())
    if (!allowed) {
      throw new SafeFetchError(`Host "${url.hostname}" is not in the allowlist`, 'BLOCKED_HOST')
    }
  }

  // Block if hostname looks like an IP and is in a blocked range
  if (isIPv4(url.hostname) || isIPv6(url.hostname)) {
    if (isBlockedIP(url.hostname)) {
      throw new SafeFetchError(`IP address ${url.hostname} is in a blocked range`, 'BLOCKED_IP')
    }
  }

  return url
}

// ---------------------------------------------------------------------------
// DNS resolution with safety check
// ---------------------------------------------------------------------------

/**
 * Resolve a hostname and verify none of the resulting IPs are in blocked ranges.
 */
async function resolveAndValidate(hostname: string): Promise<string> {
  // If already an IP literal, just validate it
  if (isIPv4(hostname) || isIPv6(hostname)) {
    if (isBlockedIP(hostname)) {
      throw new SafeFetchError(`IP ${hostname} is in a blocked range`, 'BLOCKED_IP')
    }
    return hostname
  }

  try {
    // Resolve all addresses for the hostname
    const { address } = await lookup(hostname)

    if (isBlockedIP(address)) {
      throw new SafeFetchError(
        `Hostname "${hostname}" resolved to blocked IP ${address}`,
        'BLOCKED_IP'
      )
    }

    return address
  } catch (error) {
    if (error instanceof SafeFetchError) throw error
    throw new SafeFetchError(
      `DNS resolution failed for "${hostname}": ${error instanceof Error ? error.message : String(error)}`,
      'DNS_RESOLUTION_FAILED'
    )
  }
}

// ---------------------------------------------------------------------------
// Main safe fetch function
// ---------------------------------------------------------------------------

/**
 * Perform an HTTP(S) fetch with SSRF protections:
 * - URL validation (scheme, port, userinfo, format)
 * - Optional host allowlist
 * - DNS resolution with IP range blocking
 * - Redirect validation (re-checks each hop)
 * - Timeout enforcement
 * - Response size limiting
 * - No custom headers or unsafe methods
 *
 * This function is intended for server-side use only (Route Handlers, Server Actions).
 */
export async function safeFetch(
  urlString: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const {
    method = 'GET',
    allowedHosts,
    timeoutMs = REQUEST_TIMEOUT_MS,
    maxResponseSize = MAX_RESPONSE_SIZE,
  } = options

  // Validate method
  const upperMethod = method.toUpperCase()
  if (!ALLOWED_METHODS.has(upperMethod)) {
    throw new SafeFetchError(
      `Method "${method}" is not allowed. Use GET, HEAD, or OPTIONS.`,
      'INVALID_URL'
    )
  }

  // Clamp timeouts and sizes to sensible maxima
  const effectiveTimeout = Math.min(Math.max(timeoutMs, 1000), 30_000)
  const effectiveMaxSize = Math.min(Math.max(maxResponseSize, 1024), 20 * 1024 * 1024)

  let currentUrl = urlString
  let redirectCount = 0

  while (true) {
    // Validate URL structure
    const url = validateUrl(currentUrl, allowedHosts)

    // Resolve DNS and validate resulting IP
    await resolveAndValidate(url.hostname)

    // Perform the fetch with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout)

    let response: Response
    try {
      response = await fetch(url.href, {
        method: upperMethod,
        redirect: 'manual', // Handle redirects ourselves to validate each hop
        signal: controller.signal,
        headers: {
          // Minimal safe headers only
          Accept: '*/*',
          'User-Agent': 'CatALog-SafeFetch/1.0',
        },
      })
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new SafeFetchError('Request timed out', 'TIMEOUT')
      }
      throw new SafeFetchError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        'NETWORK_ERROR'
      )
    } finally {
      clearTimeout(timeoutId)
    }

    // Handle redirects
    if (response.status >= 300 && response.status < 400) {
      redirectCount++
      if (redirectCount > MAX_REDIRECTS) {
        throw new SafeFetchError(`Too many redirects (max ${MAX_REDIRECTS})`, 'TOO_MANY_REDIRECTS')
      }

      const location = response.headers.get('location')
      if (!location) {
        throw new SafeFetchError('Redirect response missing Location header', 'BLOCKED_REDIRECT')
      }

      // Resolve relative redirects against current URL
      let redirectUrl: URL
      try {
        redirectUrl = new URL(location, url.href)
      } catch {
        throw new SafeFetchError(`Invalid redirect URL: ${location}`, 'BLOCKED_REDIRECT')
      }

      // Validate the redirect target (scheme, port, host, IP)
      // This will throw if the redirect target is blocked
      validateUrl(redirectUrl.href, allowedHosts)

      currentUrl = redirectUrl.href
      continue
    }

    // Read body with size limit enforcement
    const chunks: Uint8Array[] = []
    let totalSize = 0

    if (response.body) {
      const reader = response.body.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          totalSize += value.byteLength
          if (totalSize > effectiveMaxSize) {
            reader.cancel()
            throw new SafeFetchError(
              `Response body exceeds maximum size of ${effectiveMaxSize} bytes`,
              'RESPONSE_TOO_LARGE'
            )
          }
          chunks.push(value)
        }
      } catch (error) {
        if (error instanceof SafeFetchError) throw error
        throw new SafeFetchError(
          `Error reading response body: ${error instanceof Error ? error.message : String(error)}`,
          'NETWORK_ERROR'
        )
      }
    }

    // Combine chunks into a single ArrayBuffer
    const body = new Uint8Array(totalSize)
    let offset = 0
    for (const chunk of chunks) {
      body.set(chunk, offset)
      offset += chunk.byteLength
    }

    return {
      status: response.status,
      headers: response.headers,
      body: body.buffer as ArrayBuffer,
      finalUrl: url.href,
    }
  }
}
