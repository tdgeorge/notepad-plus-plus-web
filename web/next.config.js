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
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')

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
    ]
  },
}

module.exports = nextConfig
