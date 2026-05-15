import test from 'node:test'
import assert from 'node:assert/strict'
import { createWebPreviewTab } from './webPreviewTab.mjs'

test('createWebPreviewTab returns null for invalid input', () => {
  assert.equal(createWebPreviewTab(null, 2), null)
  assert.equal(createWebPreviewTab({ name: 'index.html', content: '' }, NaN), null)
})

test('createWebPreviewTab creates a webpage-rendering tab clone', () => {
  const source = {
    id: 1,
    name: 'index.html',
    content: '<h1>Hello</h1>',
    modified: true,
    language: 'html',
    pinned: false,
    pinOrder: null,
  }

  const next = createWebPreviewTab(source, 2)

  assert.equal(next.id, 2)
  assert.equal(next.name, 'index.html (webpage)')
  assert.equal(next.content, source.content)
  assert.equal(next.language, 'html')
  assert.equal(next.modified, false)
  assert.equal(next.renderMode, 'webpage')
})

test('createWebPreviewTab applies a consistent untitled fallback name', () => {
  const next = createWebPreviewTab({ id: 1, name: '   ', content: '' }, 9)
  assert.equal(next.name, 'Untitled 9 (webpage)')
})
