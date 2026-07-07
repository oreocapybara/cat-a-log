import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { safeFetch, isBlockedIP, SafeFetchError } from '@/lib/safe-fetch'

// ---------------------------------------------------------------------------
// Mock dns/promises and net modules
// ---------------------------------------------------------------------------

vi.mock('dns/promises', () => ({
  lookup: vi.fn(),
}))

vi.mock('net', () => ({
  isIPv4: vi.fn((ip: string) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)),
  isIPv6: vi.fn(
    (ip: string) => ip.includes(':') && !ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
  ),
}))

// We need to import the mocked module to control it in tests
import { lookup } from 'dns/promises'
const mockedLookup = vi.mocked(lookup)

// ---------------------------------------------------------------------------
// isBlockedIP — IPv4 ranges
// ---------------------------------------------------------------------------

describe('isBlockedIP', () => {
  describe('IPv4 blocked ranges', () => {
    it('blocks loopback 127.0.0.1', () => {
      expect(isBlockedIP('127.0.0.1')).toBe(true)
    })

    it('blocks entire 127.0.0.0/8 range', () => {
      expect(isBlockedIP('127.255.255.255')).toBe(true)
      expect(isBlockedIP('127.0.0.2')).toBe(true)
      expect(isBlockedIP('127.100.50.1')).toBe(true)
    })

    it('blocks 10.0.0.0/8 private range', () => {
      expect(isBlockedIP('10.0.0.1')).toBe(true)
      expect(isBlockedIP('10.255.255.255')).toBe(true)
      expect(isBlockedIP('10.100.50.25')).toBe(true)
    })

    it('blocks 172.16.0.0/12 private range', () => {
      expect(isBlockedIP('172.16.0.1')).toBe(true)
      expect(isBlockedIP('172.31.255.255')).toBe(true)
      expect(isBlockedIP('172.20.10.5')).toBe(true)
    })

    it('does not block 172.32.0.0 (outside /12)', () => {
      expect(isBlockedIP('172.32.0.1')).toBe(false)
    })

    it('blocks 192.168.0.0/16 private range', () => {
      expect(isBlockedIP('192.168.0.1')).toBe(true)
      expect(isBlockedIP('192.168.255.255')).toBe(true)
      expect(isBlockedIP('192.168.1.100')).toBe(true)
    })

    it('blocks 169.254.0.0/16 link-local (including metadata endpoint)', () => {
      expect(isBlockedIP('169.254.0.1')).toBe(true)
      expect(isBlockedIP('169.254.169.254')).toBe(true)
      expect(isBlockedIP('169.254.255.255')).toBe(true)
    })

    it('blocks 0.0.0.0/8', () => {
      expect(isBlockedIP('0.0.0.0')).toBe(true)
      expect(isBlockedIP('0.255.255.255')).toBe(true)
    })

    it('blocks 224.0.0.0/4 multicast', () => {
      expect(isBlockedIP('224.0.0.1')).toBe(true)
      expect(isBlockedIP('239.255.255.255')).toBe(true)
    })

    it('blocks 240.0.0.0/4 reserved', () => {
      expect(isBlockedIP('240.0.0.1')).toBe(true)
      expect(isBlockedIP('255.255.255.255')).toBe(true)
    })

    it('allows valid public IPs', () => {
      expect(isBlockedIP('8.8.8.8')).toBe(false)
      expect(isBlockedIP('1.1.1.1')).toBe(false)
      expect(isBlockedIP('93.184.216.34')).toBe(false)
      expect(isBlockedIP('203.0.113.1')).toBe(false)
    })
  })

  describe('IPv6 blocked ranges', () => {
    it('blocks ::1 loopback', () => {
      expect(isBlockedIP('::1')).toBe(true)
    })

    it('blocks fc00::/7 unique local', () => {
      expect(isBlockedIP('fc00::1')).toBe(true)
      expect(isBlockedIP('fd00::1')).toBe(true)
      expect(isBlockedIP('fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true)
    })

    it('blocks fe80::/10 link-local', () => {
      expect(isBlockedIP('fe80::1')).toBe(true)
      expect(isBlockedIP('fe80::abcd:ef01:2345:6789')).toBe(true)
      expect(isBlockedIP('febf::1')).toBe(true)
    })

    it('blocks ff00::/8 multicast', () => {
      expect(isBlockedIP('ff00::1')).toBe(true)
      expect(isBlockedIP('ff02::1')).toBe(true)
    })

    it('blocks :: (unspecified)', () => {
      expect(isBlockedIP('::')).toBe(true)
    })

    it('blocks IPv4-mapped IPv6 with private IPv4', () => {
      expect(isBlockedIP('::ffff:127.0.0.1')).toBe(true)
      expect(isBlockedIP('::ffff:10.0.0.1')).toBe(true)
      expect(isBlockedIP('::ffff:192.168.1.1')).toBe(true)
      expect(isBlockedIP('::ffff:169.254.169.254')).toBe(true)
    })

    it('allows valid public IPv6', () => {
      expect(isBlockedIP('2001:4860:4860::8888')).toBe(false)
      expect(isBlockedIP('2606:4700:4700::1111')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('blocks unparseable input', () => {
      expect(isBlockedIP('not-an-ip')).toBe(true)
      expect(isBlockedIP('')).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// safeFetch — URL validation
// ---------------------------------------------------------------------------

describe('safeFetch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedLookup.mockResolvedValue({ address: '93.184.216.34', family: 4 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('URL validation', () => {
    it('rejects invalid URLs', async () => {
      await expect(safeFetch('not a url')).rejects.toThrow(SafeFetchError)
      await expect(safeFetch('not a url')).rejects.toMatchObject({
        code: 'INVALID_URL',
      })
    })

    it('rejects non-http(s) schemes', async () => {
      await expect(safeFetch('ftp://example.com/file')).rejects.toMatchObject({
        code: 'BLOCKED_SCHEME',
      })
      await expect(safeFetch('file:///etc/passwd')).rejects.toMatchObject({
        code: 'BLOCKED_SCHEME',
      })
      await expect(safeFetch('javascript:alert(1)')).rejects.toMatchObject({
        code: 'BLOCKED_SCHEME',
      })
      await expect(safeFetch('data:text/html,<h1>hi</h1>')).rejects.toMatchObject({
        code: 'BLOCKED_SCHEME',
      })
    })

    it('rejects URLs with userinfo', async () => {
      await expect(safeFetch('http://user:pass@example.com/')).rejects.toMatchObject({
        code: 'INVALID_URL',
      })
      await expect(safeFetch('http://admin@example.com/')).rejects.toMatchObject({
        code: 'INVALID_URL',
      })
    })

    it('rejects restricted ports', async () => {
      await expect(safeFetch('http://example.com:22/path')).rejects.toMatchObject({
        code: 'BLOCKED_PORT',
      })
      await expect(safeFetch('http://example.com:3306/path')).rejects.toMatchObject({
        code: 'BLOCKED_PORT',
      })
      await expect(safeFetch('http://example.com:6379/path')).rejects.toMatchObject({
        code: 'BLOCKED_PORT',
      })
    })

    it('allows standard ports', async () => {
      const mockResponse = new Response('ok', { status: 200 })
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse)

      // Default ports (no explicit port)
      await expect(safeFetch('https://example.com/path')).resolves.toBeDefined()
    })

    it('allows port 8080 and 8443', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(new Response('ok', { status: 200 }))
      )

      await expect(safeFetch('http://example.com:8080/path')).resolves.toBeDefined()
      await expect(safeFetch('https://example.com:8443/path')).resolves.toBeDefined()
    })
  })

  describe('host allowlist', () => {
    it('rejects hosts not in allowlist', async () => {
      await expect(
        safeFetch('https://evil.com/path', { allowedHosts: ['example.com'] })
      ).rejects.toMatchObject({ code: 'BLOCKED_HOST' })
    })

    it('allows hosts in allowlist (case-insensitive)', async () => {
      const mockResponse = new Response('ok', { status: 200 })
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse)

      await expect(
        safeFetch('https://Example.Com/path', {
          allowedHosts: ['example.com'],
        })
      ).resolves.toBeDefined()
    })
  })

  describe('IP blocking via URL', () => {
    it('blocks direct private IP in URL', async () => {
      await expect(safeFetch('http://127.0.0.1/admin')).rejects.toMatchObject({
        code: 'BLOCKED_IP',
      })
      await expect(safeFetch('http://10.0.0.1/internal')).rejects.toMatchObject({
        code: 'BLOCKED_IP',
      })
      await expect(safeFetch('http://169.254.169.254/metadata')).rejects.toMatchObject({
        code: 'BLOCKED_IP',
      })
    })
  })

  describe('DNS resolution validation', () => {
    it('blocks when hostname resolves to private IP', async () => {
      mockedLookup.mockResolvedValue({ address: '127.0.0.1', family: 4 })

      await expect(safeFetch('https://evil-rebind.attacker.com/')).rejects.toMatchObject({
        code: 'BLOCKED_IP',
      })
    })

    it('blocks when hostname resolves to link-local/metadata IP', async () => {
      mockedLookup.mockResolvedValue({ address: '169.254.169.254', family: 4 })

      await expect(safeFetch('https://metadata.attacker.com/')).rejects.toMatchObject({
        code: 'BLOCKED_IP',
      })
    })

    it('throws DNS_RESOLUTION_FAILED on DNS errors', async () => {
      mockedLookup.mockRejectedValue(new Error('ENOTFOUND'))

      await expect(safeFetch('https://nonexistent.invalid/')).rejects.toMatchObject({
        code: 'DNS_RESOLUTION_FAILED',
      })
    })
  })

  describe('method restrictions', () => {
    it('allows GET, HEAD, OPTIONS', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(new Response('ok', { status: 200 }))
      )

      await expect(safeFetch('https://example.com/', { method: 'GET' })).resolves.toBeDefined()
      await expect(safeFetch('https://example.com/', { method: 'HEAD' })).resolves.toBeDefined()
      await expect(safeFetch('https://example.com/', { method: 'OPTIONS' })).resolves.toBeDefined()
    })

    it('rejects POST, PUT, DELETE, PATCH', async () => {
      // @ts-expect-error — intentionally testing invalid method
      await expect(safeFetch('https://example.com/', { method: 'POST' })).rejects.toThrow(
        SafeFetchError
      )
      // @ts-expect-error — intentionally testing invalid method
      await expect(safeFetch('https://example.com/', { method: 'PUT' })).rejects.toThrow(
        SafeFetchError
      )
      // @ts-expect-error — intentionally testing invalid method
      await expect(safeFetch('https://example.com/', { method: 'DELETE' })).rejects.toThrow(
        SafeFetchError
      )
    })
  })

  describe('redirect handling', () => {
    it('follows valid redirects', async () => {
      const redirectResponse = new Response(null, {
        status: 302,
        headers: { Location: 'https://example.com/final' },
      })
      const finalResponse = new Response('final content', { status: 200 })

      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      fetchSpy.mockResolvedValueOnce(redirectResponse).mockResolvedValueOnce(finalResponse)

      const result = await safeFetch('https://example.com/start')
      expect(result.status).toBe(200)
      expect(result.finalUrl).toBe('https://example.com/final')
    })

    it('blocks redirects to private IPs', async () => {
      const redirectResponse = new Response(null, {
        status: 302,
        headers: { Location: 'http://127.0.0.1/admin' },
      })

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(redirectResponse)

      await expect(safeFetch('https://example.com/redirect')).rejects.toMatchObject({
        code: 'BLOCKED_IP',
      })
    })

    it('blocks redirects to non-http schemes', async () => {
      const redirectResponse = new Response(null, {
        status: 302,
        headers: { Location: 'file:///etc/passwd' },
      })

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(redirectResponse)

      await expect(safeFetch('https://example.com/redirect')).rejects.toMatchObject({
        code: 'BLOCKED_SCHEME',
      })
    })

    it('blocks redirects to hosts not in allowlist', async () => {
      const redirectResponse = new Response(null, {
        status: 302,
        headers: { Location: 'https://evil.com/steal' },
      })

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(redirectResponse)

      await expect(
        safeFetch('https://example.com/redirect', { allowedHosts: ['example.com'] })
      ).rejects.toMatchObject({ code: 'BLOCKED_HOST' })
    })

    it('enforces max redirect count', async () => {
      const makeRedirect = (n: number) =>
        new Response(null, {
          status: 302,
          headers: { Location: `https://example.com/hop${n}` },
        })

      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      fetchSpy
        .mockResolvedValueOnce(makeRedirect(1))
        .mockResolvedValueOnce(makeRedirect(2))
        .mockResolvedValueOnce(makeRedirect(3))
        .mockResolvedValueOnce(makeRedirect(4))

      await expect(safeFetch('https://example.com/start')).rejects.toMatchObject({
        code: 'TOO_MANY_REDIRECTS',
      })
    })

    it('handles missing Location header in redirect', async () => {
      const redirectResponse = new Response(null, { status: 302 })

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(redirectResponse)

      await expect(safeFetch('https://example.com/redirect')).rejects.toMatchObject({
        code: 'BLOCKED_REDIRECT',
      })
    })

    it('handles relative redirect URLs', async () => {
      const redirectResponse = new Response(null, {
        status: 301,
        headers: { Location: '/new-path' },
      })
      const finalResponse = new Response('ok', { status: 200 })

      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      fetchSpy.mockResolvedValueOnce(redirectResponse).mockResolvedValueOnce(finalResponse)

      const result = await safeFetch('https://example.com/old-path')
      expect(result.finalUrl).toBe('https://example.com/new-path')
    })
  })

  describe('timeout enforcement', () => {
    it('rejects on timeout', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            const signal = init?.signal as AbortSignal | undefined
            if (signal) {
              signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'))
              })
            }
          })
      )

      await expect(safeFetch('https://example.com/', { timeoutMs: 1000 })).rejects.toMatchObject({
        code: 'TIMEOUT',
      })
    }, 15_000)
  })

  describe('response size limiting', () => {
    it('rejects responses exceeding max size', async () => {
      // Create a response with a large streaming body
      const largeChunk = new Uint8Array(1024 * 1024) // 1MB chunk
      let chunkCount = 0
      const stream = new ReadableStream({
        pull(controller) {
          chunkCount++
          if (chunkCount > 6) {
            controller.close()
            return
          }
          controller.enqueue(largeChunk)
        },
      })

      const mockResponse = new Response(stream, { status: 200 })
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse)

      await expect(
        safeFetch('https://example.com/large', { maxResponseSize: 5 * 1024 * 1024 })
      ).rejects.toMatchObject({
        code: 'RESPONSE_TOO_LARGE',
      })
    })

    it('accepts responses within size limit', async () => {
      const smallBody = new Uint8Array(100)
      const mockResponse = new Response(smallBody, { status: 200 })
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse)

      const result = await safeFetch('https://example.com/small')
      expect(result.body.byteLength).toBe(100)
    })
  })

  describe('successful requests', () => {
    it('returns status, headers, body, and finalUrl', async () => {
      const body = new TextEncoder().encode('Hello, World!')
      const mockResponse = new Response(body, {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse)

      const result = await safeFetch('https://example.com/hello')

      expect(result.status).toBe(200)
      expect(result.headers.get('content-type')).toBe('text/plain')
      expect(new TextDecoder().decode(result.body)).toBe('Hello, World!')
      expect(result.finalUrl).toBe('https://example.com/hello')
    })

    it('sends only minimal safe headers', async () => {
      const mockResponse = new Response('ok', { status: 200 })
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse)

      await safeFetch('https://example.com/')

      const [, init] = fetchSpy.mock.calls[0]
      const headers = init?.headers as Record<string, string>
      expect(headers).toEqual({
        Accept: '*/*',
        'User-Agent': 'CatALog-SafeFetch/1.0',
      })
    })

    it('uses redirect: manual to control redirects', async () => {
      const mockResponse = new Response('ok', { status: 200 })
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse)

      await safeFetch('https://example.com/')

      const [, init] = fetchSpy.mock.calls[0]
      expect(init?.redirect).toBe('manual')
    })
  })

  describe('network errors', () => {
    it('wraps generic fetch errors as NETWORK_ERROR', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(safeFetch('https://example.com/')).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      })
    })
  })

  describe('options clamping', () => {
    it('clamps timeout to minimum 1000ms', async () => {
      const mockResponse = new Response('ok', { status: 200 })
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse)

      // Should not throw — just clamp
      await expect(safeFetch('https://example.com/', { timeoutMs: 1 })).resolves.toBeDefined()
    })

    it('clamps timeout to maximum 30000ms', async () => {
      const mockResponse = new Response('ok', { status: 200 })
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse)

      // Should not throw — just clamp
      await expect(safeFetch('https://example.com/', { timeoutMs: 999_999 })).resolves.toBeDefined()
    })
  })
})
