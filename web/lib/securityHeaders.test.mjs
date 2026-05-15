import test from 'node:test'
import assert from 'node:assert/strict'
import nextConfig from '../next.config.js'

test('content security policy allows external images for markdown previews', async () => {
  const headers = await nextConfig.headers()
  const rootHeaders = headers.find((entry) => entry.source === '/(.*)')?.headers ?? []
  const csp = rootHeaders.find((entry) => entry.key === 'Content-Security-Policy')?.value ?? ''
  assert.match(csp, /img-src[^;]*https:/)
  assert.match(csp, /img-src[^;]*http:/)
})
