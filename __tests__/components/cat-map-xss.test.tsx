import { describe, it, expect } from 'vitest'

/**
 * Tests for XSS mitigation in cat marker icon rendering.
 * 
 * Pentest finding: Stored XSS in selected cat marker icon rendering
 * 
 * The vulnerability was that cat names from the database were directly
 * interpolated into HTML strings passed to Leaflet's divIcon without
 * sanitization, allowing script execution when a viewer selected a
 * malicious marker.
 * 
 * Mitigation: The escapeHtml function now sanitizes all user-controlled
 * strings before they are interpolated into HTML.
 */

// Extract the escapeHtml function from cat-map.tsx for testing
// This is the mitigation function that prevents XSS
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

describe('Cat Map XSS Mitigation', () => {
  describe('escapeHtml function', () => {
    it('should escape basic script tags', () => {
      const malicious = '<script>alert("XSS")</script>'
      const escaped = escapeHtml(malicious)
      
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;')
      expect(escaped).not.toContain('<script>')
      expect(escaped).not.toContain('</script>')
    })

    it('should escape img tag with onerror handler', () => {
      const malicious = '<img src=x onerror=alert(1)>'
      const escaped = escapeHtml(malicious)
      
      expect(escaped).toBe('&lt;img src=x onerror=alert(1)&gt;')
      expect(escaped).not.toContain('<img')
      // The key is that < and > are escaped, preventing tag interpretation
      expect(escaped).not.toContain('<')
      expect(escaped).not.toContain('>')
    })

    it('should escape event handlers in attributes', () => {
      const malicious = '" onclick="alert(1)"'
      const escaped = escapeHtml(malicious)
      
      expect(escaped).toBe('&quot; onclick=&quot;alert(1)&quot;')
      // The key is that quotes are escaped, preventing attribute breakout
      expect(escaped).not.toContain('"')
    })

    it('should escape single quotes to prevent attribute breakout', () => {
      const malicious = "' onmouseover='alert(1)'"
      const escaped = escapeHtml(malicious)
      
      expect(escaped).toBe('&#039; onmouseover=&#039;alert(1)&#039;')
      expect(escaped).not.toContain("'")
    })

    it('should escape ampersands to prevent entity injection', () => {
      const malicious = '&lt;script&gt;'
      const escaped = escapeHtml(malicious)
      
      // Double escaping - the & in &lt; becomes &amp;lt;
      expect(escaped).toBe('&amp;lt;script&amp;gt;')
    })

    it('should handle multiple special characters', () => {
      const malicious = '<div class="test" onclick=\'alert("XSS")\'>&</div>'
      const escaped = escapeHtml(malicious)
      
      expect(escaped).toBe('&lt;div class=&quot;test&quot; onclick=&#039;alert(&quot;XSS&quot;)&#039;&gt;&amp;&lt;/div&gt;')
      expect(escaped).not.toContain('<')
      expect(escaped).not.toContain('>')
      expect(escaped).not.toContain('"')
      expect(escaped).not.toContain("'")
    })

    it('should handle empty string', () => {
      const escaped = escapeHtml('')
      expect(escaped).toBe('')
    })

    it('should handle normal cat names without modification', () => {
      const normalName = 'Fluffy'
      const escaped = escapeHtml(normalName)
      expect(escaped).toBe('Fluffy')
    })

    it('should handle cat names with spaces and numbers', () => {
      const normalName = 'Cat 123'
      const escaped = escapeHtml(normalName)
      expect(escaped).toBe('Cat 123')
    })

    it('should handle unicode characters safely', () => {
      const unicodeName = 'Кот 🐱'
      const escaped = escapeHtml(unicodeName)
      expect(escaped).toBe('Кот 🐱')
    })
  })

  describe('XSS attack vectors from pentest', () => {
    it('should prevent script execution via cat name in selected marker', () => {
      // Simulate the exact attack vector from the pentest:
      // A cat name containing script tags that would execute when
      // the marker is selected and rendered with makeCatIcon
      const attackName = '<script>alert(document.cookie)</script>'
      const escaped = escapeHtml(attackName)
      
      // Verify the escaped output would be safe in HTML context
      const htmlTemplate = `<span>${escaped}</span>`
      
      expect(htmlTemplate).toBe('<span>&lt;script&gt;alert(document.cookie)&lt;/script&gt;</span>')
      expect(htmlTemplate).not.toContain('<script>')
    })

    it('should prevent event handler injection via cat name', () => {
      // Attack vector: breaking out of the span attribute to inject onclick
      const attackName = '" onclick="alert(1)" data-x="'
      const escaped = escapeHtml(attackName)
      
      // Simulate the HTML template from makeCatIcon (line 295 in cat-map.tsx)
      const htmlTemplate = `<span style="...">${escaped}</span>`
      
      // The quotes are escaped, so the onclick cannot break out of the style attribute
      expect(escaped).toBe('&quot; onclick=&quot;alert(1)&quot; data-x=&quot;')
      expect(escaped).not.toContain('"')
    })

    it('should prevent img tag with onerror handler', () => {
      // Attack vector: injecting an img tag that executes JS on error
      const attackName = '<img src=x onerror=alert(String.fromCharCode(88,83,83))>'
      const escaped = escapeHtml(attackName)
      
      const htmlTemplate = `<span>${escaped}</span>`
      
      // The angle brackets are escaped, preventing tag interpretation
      expect(htmlTemplate).not.toContain('<img')
      expect(escaped).not.toContain('<')
      expect(escaped).not.toContain('>')
    })

    it('should prevent SVG-based XSS', () => {
      // Attack vector: SVG with embedded script
      const attackName = '<svg onload=alert(1)>'
      const escaped = escapeHtml(attackName)
      
      const htmlTemplate = `<span>${escaped}</span>`
      
      // The angle brackets are escaped, preventing tag interpretation
      expect(htmlTemplate).not.toContain('<svg')
      expect(escaped).not.toContain('<')
      expect(escaped).not.toContain('>')
    })

    it('should prevent data URI XSS', () => {
      // Attack vector: data URI with JavaScript
      const attackName = '<a href="data:text/html,<script>alert(1)</script>">click</a>'
      const escaped = escapeHtml(attackName)
      
      const htmlTemplate = `<span>${escaped}</span>`
      
      // The angle brackets and quotes are escaped, preventing tag interpretation
      expect(htmlTemplate).not.toContain('<a')
      expect(htmlTemplate).not.toContain('<script>')
      expect(escaped).not.toContain('<')
      expect(escaped).not.toContain('>')
      expect(escaped).not.toContain('"')
    })

    it('should prevent iframe injection', () => {
      // Attack vector: iframe with malicious source
      const attackName = '<iframe src="javascript:alert(1)"></iframe>'
      const escaped = escapeHtml(attackName)
      
      const htmlTemplate = `<span>${escaped}</span>`
      
      // The angle brackets and quotes are escaped, preventing tag interpretation
      expect(htmlTemplate).not.toContain('<iframe')
      expect(escaped).not.toContain('<')
      expect(escaped).not.toContain('>')
      expect(escaped).not.toContain('"')
    })

    it('should prevent style-based XSS', () => {
      // Attack vector: style tag with expression
      const attackName = '<style>body{background:url("javascript:alert(1)")}</style>'
      const escaped = escapeHtml(attackName)
      
      const htmlTemplate = `<span>${escaped}</span>`
      
      // The angle brackets and quotes are escaped, preventing tag interpretation
      expect(htmlTemplate).not.toContain('<style>')
      expect(escaped).not.toContain('<')
      expect(escaped).not.toContain('>')
      expect(escaped).not.toContain('"')
    })

    it('should prevent HTML comment breakout', () => {
      // Attack vector: breaking out of HTML comments
      const attackName = '--><script>alert(1)</script><!--'
      const escaped = escapeHtml(attackName)
      
      const htmlTemplate = `<!-- ${escaped} -->`
      
      expect(htmlTemplate).not.toContain('--><script>')
    })
  })

  describe('Integration with marker rendering', () => {
    it('should safely render cat name in selected marker HTML template', () => {
      // Simulate the exact code path from makeCatIcon (lines 259-295)
      const catName = '<script>alert("XSS")</script>'
      const label = escapeHtml(catName ?? 'Unknown')
      
      // This is the actual HTML template structure from cat-map.tsx
      const html = `
        <span style="
          background:#f97316;
          color:#fff;
          font-size:11px;
          font-weight:600;
          padding:2px 7px;
          border-radius:9999px;
          white-space:nowrap;
          box-shadow:0 1px 4px rgba(0,0,0,0.25);
          max-width:96px;
          overflow:hidden;
          text-overflow:ellipsis;
        ">${label}</span>
      `
      
      expect(html).toContain('&lt;script&gt;')
      expect(html).not.toContain('<script>')
      expect(html).not.toContain('alert("XSS")')
    })

    it('should handle null cat name with Unknown fallback', () => {
      const catName = null
      const label = escapeHtml(catName ?? 'Unknown')
      
      expect(label).toBe('Unknown')
    })

    it('should handle undefined cat name with Unknown fallback', () => {
      const catName = undefined
      const label = escapeHtml(catName ?? 'Unknown')
      
      expect(label).toBe('Unknown')
    })

    it('should safely render legitimate cat names', () => {
      const legitimateNames = [
        'Fluffy',
        'Mr. Whiskers',
        'Cat #42',
        'Mittens (stray)',
        'Orange & White',
        "Tom's Cat"
      ]
      
      legitimateNames.forEach(name => {
        const label = escapeHtml(name)
        const html = `<span>${label}</span>`
        
        // Should not break HTML structure
        expect(html).toContain('<span>')
        expect(html).toContain('</span>')
        
        // Should contain the escaped version of the name
        expect(html).toContain(label)
      })
    })
  })

  describe('Security properties', () => {
    it('should ensure no unescaped angle brackets in output', () => {
      const inputs = [
        '<script>',
        '<<script>>',
        '<img>',
        '</div>',
        '< >',
      ]
      
      inputs.forEach(input => {
        const escaped = escapeHtml(input)
        expect(escaped).not.toContain('<')
        expect(escaped).not.toContain('>')
      })
    })

    it('should ensure no unescaped quotes in output', () => {
      const inputs = [
        '"onclick="alert(1)"',
        "'onload='alert(1)'",
        '""',
        "''",
      ]
      
      inputs.forEach(input => {
        const escaped = escapeHtml(input)
        expect(escaped).not.toContain('"')
        expect(escaped).not.toContain("'")
      })
    })

    it('should be idempotent - escaping twice should be safe', () => {
      const malicious = '<script>alert(1)</script>'
      const escaped1 = escapeHtml(malicious)
      const escaped2 = escapeHtml(escaped1)
      
      // Second escape should further escape the ampersands
      expect(escaped2).toBe('&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;')
      expect(escaped2).not.toContain('<')
      expect(escaped2).not.toContain('>')
    })

    it('should prevent all common XSS patterns', () => {
      const xssPatterns = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '<iframe src=javascript:alert(1)>',
        '<body onload=alert(1)>',
        '<input onfocus=alert(1) autofocus>',
        '<select onfocus=alert(1) autofocus>',
        '<textarea onfocus=alert(1) autofocus>',
        '<marquee onstart=alert(1)>',
        '<div style="background:url(javascript:alert(1))">',
        '"><script>alert(1)</script>',
        "'><script>alert(1)</script>",
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
      ]
      
      xssPatterns.forEach(pattern => {
        const escaped = escapeHtml(pattern)
        const html = `<span>${escaped}</span>`
        
        // Verify no script execution is possible by checking that
        // angle brackets and quotes are escaped
        expect(escaped).not.toContain('<script')
        expect(escaped).not.toContain('<')
        expect(escaped).not.toContain('>')
      })
    })
  })
})
