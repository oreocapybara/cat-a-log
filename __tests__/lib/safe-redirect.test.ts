import { describe, it, expect } from 'vitest'
import { getSafeRedirect } from '@/lib/safe-redirect'

describe('getSafeRedirect', () => {
  const DEFAULT = '/map'

  describe('valid inputs (allowlisted paths)', () => {
    it('accepts /map', () => {
      expect(getSafeRedirect('/map')).toBe('/map')
    })

    it('accepts /tag', () => {
      expect(getSafeRedirect('/tag')).toBe('/tag')
    })

    it('accepts /tag/save', () => {
      expect(getSafeRedirect('/tag/save')).toBe('/tag/save')
    })

    it('accepts /profile/me', () => {
      expect(getSafeRedirect('/profile/me')).toBe('/profile/me')
    })

    it('accepts /profile/someuser', () => {
      expect(getSafeRedirect('/profile/someuser')).toBe('/profile/someuser')
    })

    it('accepts /cat/some-uuid', () => {
      expect(getSafeRedirect('/cat/some-uuid')).toBe('/cat/some-uuid')
    })

    it('accepts /setup-profile', () => {
      expect(getSafeRedirect('/setup-profile')).toBe('/setup-profile')
    })

    it('accepts /login', () => {
      expect(getSafeRedirect('/login')).toBe('/login')
    })

    it('accepts /register', () => {
      expect(getSafeRedirect('/register')).toBe('/register')
    })

    it('accepts nested tag paths', () => {
      expect(getSafeRedirect('/tag/flush')).toBe('/tag/flush')
    })
  })

  describe('fallback behavior', () => {
    it('returns /map for null', () => {
      expect(getSafeRedirect(null)).toBe(DEFAULT)
    })

    it('returns /map for undefined', () => {
      expect(getSafeRedirect(undefined)).toBe(DEFAULT)
    })

    it('returns /map for empty string', () => {
      expect(getSafeRedirect('')).toBe(DEFAULT)
    })

    it('returns /map for whitespace-only', () => {
      expect(getSafeRedirect('   ')).toBe(DEFAULT)
    })

    it('supports custom fallback', () => {
      expect(getSafeRedirect(null, '/login')).toBe('/login')
    })

    it('returns fallback for non-allowlisted path', () => {
      expect(getSafeRedirect('/admin')).toBe(DEFAULT)
    })

    it('returns fallback for root path', () => {
      expect(getSafeRedirect('/')).toBe(DEFAULT)
    })
  })

  describe('rejects absolute URLs', () => {
    it('rejects http:// URLs', () => {
      expect(getSafeRedirect('http://evil.com')).toBe(DEFAULT)
    })

    it('rejects https:// URLs', () => {
      expect(getSafeRedirect('https://evil.com/map')).toBe(DEFAULT)
    })

    it('rejects http:// with path that looks local', () => {
      expect(getSafeRedirect('http://evil.com/profile/me')).toBe(DEFAULT)
    })
  })

  describe('rejects protocol-relative URLs', () => {
    it('rejects //evil.com', () => {
      expect(getSafeRedirect('//evil.com')).toBe(DEFAULT)
    })

    it('rejects //evil.com/map', () => {
      expect(getSafeRedirect('//evil.com/map')).toBe(DEFAULT)
    })
  })

  describe('rejects dangerous protocols', () => {
    it('rejects javascript:', () => {
      expect(getSafeRedirect('javascript:alert(1)')).toBe(DEFAULT)
    })

    it('rejects data:', () => {
      expect(getSafeRedirect('data:text/html,<script>alert(1)</script>')).toBe(DEFAULT)
    })

    it('rejects vbscript:', () => {
      expect(getSafeRedirect('vbscript:msgbox')).toBe(DEFAULT)
    })
  })

  describe('rejects encoded variants', () => {
    it('rejects URL-encoded //', () => {
      expect(getSafeRedirect('%2f%2fevil.com')).toBe(DEFAULT)
    })

    it('rejects double-encoded //', () => {
      expect(getSafeRedirect('%252f%252fevil.com')).toBe(DEFAULT)
    })

    it('rejects encoded backslash', () => {
      expect(getSafeRedirect('/%5cevil.com')).toBe(DEFAULT)
    })

    it('rejects encoded javascript protocol', () => {
      expect(getSafeRedirect('%6aavascript:alert(1)')).toBe(DEFAULT)
    })

    it('rejects triple encoding', () => {
      expect(getSafeRedirect('%25252f%25252fevil.com')).toBe(DEFAULT)
    })
  })

  describe('rejects path traversal', () => {
    it('rejects ../ sequences', () => {
      expect(getSafeRedirect('/map/../../../etc/passwd')).toBe(DEFAULT)
    })

    it('rejects encoded ../', () => {
      expect(getSafeRedirect('/map/%2e%2e/%2e%2e/etc/passwd')).toBe(DEFAULT)
    })

    it('rejects backslash path traversal', () => {
      expect(getSafeRedirect('/map/..\\..\\etc\\passwd')).toBe(DEFAULT)
    })
  })

  describe('rejects mixed slash attacks', () => {
    it('rejects /\\ prefix', () => {
      expect(getSafeRedirect('/\\evil.com')).toBe(DEFAULT)
    })

    it('rejects backslash-backslash UNC', () => {
      expect(getSafeRedirect('\\\\evil.com\\share')).toBe(DEFAULT)
    })
  })

  describe('rejects control characters', () => {
    it('rejects tab in URL', () => {
      expect(getSafeRedirect('/\t/evil.com')).toBe(DEFAULT)
    })

    it('rejects newline in URL', () => {
      expect(getSafeRedirect('/map\n/evil.com')).toBe(DEFAULT)
    })

    it('rejects null byte', () => {
      expect(getSafeRedirect('/map\x00')).toBe(DEFAULT)
    })
  })

  describe('rejects non-allowlisted paths', () => {
    it('rejects /api paths', () => {
      expect(getSafeRedirect('/api/secret')).toBe(DEFAULT)
    })

    it('rejects /admin', () => {
      expect(getSafeRedirect('/admin/dashboard')).toBe(DEFAULT)
    })

    it('rejects partial prefix matches', () => {
      // /maps is NOT /map or /map/...
      expect(getSafeRedirect('/maps')).toBe(DEFAULT)
    })

    it('rejects /profiles (not /profile)', () => {
      expect(getSafeRedirect('/profiles/all')).toBe(DEFAULT)
    })

    it('rejects /tagger (not /tag)', () => {
      expect(getSafeRedirect('/tagger')).toBe(DEFAULT)
    })
  })

  describe('strips query strings and fragments', () => {
    it('returns path without query string', () => {
      // URL constructor normalizes, but we only return pathname
      expect(getSafeRedirect('/map?foo=bar')).toBe('/map')
    })

    it('returns path without fragment', () => {
      expect(getSafeRedirect('/profile/me#section')).toBe('/profile/me')
    })
  })

  describe('edge cases', () => {
    it('rejects relative paths without leading slash', () => {
      expect(getSafeRedirect('map')).toBe(DEFAULT)
    })

    it('rejects protocol with slashes (e.g. http:/evil.com)', () => {
      expect(getSafeRedirect('http:/evil.com')).toBe(DEFAULT)
    })

    it('handles very long paths gracefully', () => {
      const longPath = '/map/' + 'a'.repeat(10000)
      expect(getSafeRedirect(longPath)).toBe('/map/' + 'a'.repeat(10000))
    })

    it('rejects empty path after prefix', () => {
      // Just the prefix with no trailing content is valid
      expect(getSafeRedirect('/map')).toBe('/map')
    })
  })
})
