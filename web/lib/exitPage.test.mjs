import test from 'node:test'
import assert from 'node:assert/strict'
import { handleBrowserExit, isMobileBrowserContext } from './exitPage.mjs'

function createWindowMock({
  userAgent = 'Mozilla/5.0 (X11; Linux x86_64)',
  coarsePointer = false,
  href = 'https://example.com',
  closed = false,
  closeImpl,
  openImpl,
  replaceImpl,
} = {}) {
  const mock = {
    closed,
    navigator: { userAgent },
    matchMedia: () => ({ matches: coarsePointer }),
    closeCalled: 0,
    openCalled: 0,
    replaceCalledWith: null,
  }

  mock.location = {
    href,
    replace: (value) => {
      mock.replaceCalledWith = value
      replaceImpl?.(value, mock)
    },
  }

  mock.close = () => {
    mock.closeCalled += 1
    closeImpl?.(mock)
  }

  mock.open = (...args) => {
    mock.openCalled += 1
    return openImpl?.(...args)
  }

  return mock
}

test('isMobileBrowserContext detects mobile user agents', () => {
  const win = createWindowMock({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X)' })
  assert.equal(isMobileBrowserContext(win), true)
})

test('isMobileBrowserContext detects coarse pointer environments', () => {
  const win = createWindowMock({ coarsePointer: true })
  assert.equal(isMobileBrowserContext(win), true)
})

test('handleBrowserExit only calls close for non-mobile browsers', () => {
  const win = createWindowMock()
  handleBrowserExit(win)
  assert.equal(win.closeCalled, 1)
  assert.equal(win.openCalled, 0)
  assert.equal(win.replaceCalledWith, null)
})

test('handleBrowserExit uses about:blank fallback on mobile when close is ignored', () => {
  const win = createWindowMock({
    userAgent: 'Mozilla/5.0 (Android 15; Mobile)',
    openImpl: () => null,
  })
  handleBrowserExit(win)
  assert.equal(win.closeCalled, 1)
  assert.equal(win.openCalled, 1)
  assert.equal(win.replaceCalledWith, 'about:blank')
})

test('handleBrowserExit skips about:blank fallback when _self close changes location', () => {
  const win = createWindowMock({
    userAgent: 'Mozilla/5.0 (Android 15; Mobile)',
    openImpl: () => ({
      close: () => {
        win.location.href = 'about:blank'
      },
    }),
  })
  handleBrowserExit(win)
  assert.equal(win.closeCalled, 1)
  assert.equal(win.openCalled, 1)
  assert.equal(win.replaceCalledWith, null)
})
