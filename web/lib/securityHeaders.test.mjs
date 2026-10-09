import test from 'node:test'
import assert from 'node:assert/strict'
import nextConfig from '../next.config.js'

test('content security policy allows external images for markdown previews', async () => {
  const headers = await nextConfig.headers()
  const rootHeaders = headers.find((entry) => entry.source === '/(.*)')?.headers ?? []
  const csp = rootHeaders.find((entry) => entry.key === 'Content-Security-Policy')?.value ?? ''
  assert.match(csp, /img-src[^;]*https:/)
})

test('embedded pdfcraft path can be framed by same origin and compile wasm', async () => {
  const headers = await nextConfig.headers()
  const entry = headers.find((e) => e.source === '/pdfcraft/(.*)')?.headers ?? []
  const csp = entry.find((h) => h.key === 'Content-Security-Policy')?.value ?? ''
  assert.match(csp, /frame-ancestors 'self'/)
  assert.match(csp, /wasm-unsafe-eval/)
  assert.equal(entry.find((h) => h.key === 'X-Frame-Options')?.value, 'SAMEORIGIN')
})
