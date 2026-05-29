import test from 'node:test'
import assert from 'node:assert/strict'
import { downloadFileWithFallback, isIosBrowser, shouldUseFileShare } from './fileDownload.mjs'

function createWindow(overrides = {}) {
  const bodyChildren = []
  const anchor = {
    clickCalled: false,
    style: {},
    click() {
      this.clickCalled = true
    },
    remove() {
      this.removed = true
    },
  }

  return {
    navigator: {
      userAgent: '',
      ...overrides.navigator,
    },
    File: globalThis.File,
    URL: {
      createObjectURL: () => 'blob:download',
      revokeObjectURL: () => {},
      ...overrides.URL,
    },
    document: {
      body: {
        appendChild(node) {
          bodyChildren.push(node)
        },
      },
      createElement(tagName) {
        assert.equal(tagName, 'a')
        return anchor
      },
      ...overrides.document,
    },
    open: () => null,
    location: {
      href: '',
      assign(url) {
        this.href = url
      },
      ...overrides.location,
    },
    setTimeout: (callback) => callback(),
    matchMedia: () => ({ matches: false }),
    ...overrides,
    __anchor: anchor,
    __bodyChildren: bodyChildren,
  }
}

test('shouldUseFileShare returns true for mobile file-sharing browsers', () => {
  const file = new File(['pdf'], 'demo.pdf', { type: 'application/pdf' })
  const win = createWindow({
    navigator: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      share: async () => {},
      canShare: ({ files }) => files?.[0]?.name === 'demo.pdf',
    },
  })

  assert.equal(shouldUseFileShare(win, file), true)
})

test('isIosBrowser detects iPhone user agents', () => {
  const win = createWindow({
    navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
  })

  assert.equal(isIosBrowser(win), true)
})

test('downloadFileWithFallback uses file sharing on mobile when available', async () => {
  const calls = []
  const win = createWindow({
    navigator: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      share: async (payload) => {
        calls.push(payload)
      },
      canShare: () => true,
    },
    matchMedia: () => ({ matches: true }),
  })

  const didSave = await downloadFileWithFallback('demo.pdf', new Uint8Array([1, 2, 3]), 'application/pdf', win)

  assert.equal(didSave, true)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].files[0].name, 'demo.pdf')
  assert.equal(win.__anchor.clickCalled, false)
})

test('downloadFileWithFallback opens PDFs in a new tab on iOS when share is unavailable', async () => {
  const openCalls = []
  const win = createWindow({
    navigator: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    },
    open: (...args) => {
      openCalls.push(args)
      return {}
    },
    matchMedia: () => ({ matches: true }),
  })

  const didSave = await downloadFileWithFallback('demo.pdf', new Uint8Array([1, 2, 3]), 'application/pdf', win)

  assert.equal(didSave, true)
  assert.deepEqual(openCalls[0], ['blob:download', '_blank', 'noopener,noreferrer'])
  assert.equal(win.__anchor.clickCalled, false)
})

test('downloadFileWithFallback navigates current tab to PDFs on iOS when popup opening fails', async () => {
  const win = createWindow({
    navigator: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    },
    matchMedia: () => ({ matches: true }),
  })

  const didSave = await downloadFileWithFallback('demo.pdf', new Uint8Array([1, 2, 3]), 'application/pdf', win)

  assert.equal(didSave, true)
  assert.equal(win.location.href, 'blob:download')
  assert.equal(win.__anchor.clickCalled, false)
})

test('downloadFileWithFallback falls back to a hidden anchor download', async () => {
  const win = createWindow()

  const didSave = await downloadFileWithFallback('demo.txt', 'hello world', 'text/plain', win)

  assert.equal(didSave, true)
  assert.equal(win.__anchor.download, 'demo.txt')
  assert.equal(win.__anchor.clickCalled, true)
  assert.equal(win.__bodyChildren.length, 1)
})

test('downloadFileWithFallback returns false when mobile share is cancelled', async () => {
  const win = createWindow({
    navigator: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      share: async () => {
        const error = new Error('cancelled')
        error.name = 'AbortError'
        throw error
      },
      canShare: () => true,
    },
    matchMedia: () => ({ matches: true }),
  })

  const didSave = await downloadFileWithFallback('demo.pdf', new Uint8Array([1]), 'application/pdf', win)

  assert.equal(didSave, false)
  assert.equal(win.__anchor.clickCalled, false)
})
