/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    // 'unsafe-inline' is required for both scripts and styles:
    //   - script-src: Next.js 15 App Router injects inline scripts for
    //     hydration and streaming that cannot be nonce-exempt without
    //     significant middleware refactoring.
    //   - style-src: components use React's style={{}} prop extensively.
    // The remaining directives (object-src, base-uri, form-action,
    // connect-src, frame-ancestors) still provide meaningful protection.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')

    // The embedded PdfCraft build (public/pdfcraft) is framed by the editor
    // itself, so it must be same-origin frameable.
    const pdfcraftCsp = csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'")

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
      {
        source: '/pdfcraft/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: pdfcraftCsp },
        ],
      },
    ]
  },
}

module.exports = nextConfig
