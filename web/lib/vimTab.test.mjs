import test from 'node:test'
import assert from 'node:assert/strict'
import { createVimTab } from './vimTab.mjs'

test('createVimTab returns null for invalid input', () => {
  assert.equal(createVimTab(null, 2), null)
  assert.equal(createVimTab({ name: 'notes.txt', content: '' }, NaN), null)
})

test('createVimTab creates a vim-rendering tab clone', () => {
  const source = {
    id: 1,
    name: 'notes.txt',
    content: 'hello',
    modified: true,
    language: 'plaintext',
    pinned: false,
    pinOrder: null,
  }

  const next = createVimTab(source, 2)

  assert.equal(next.id, 2)
  assert.equal(next.name, 'notes.txt (vim)')
  assert.equal(next.content, source.content)
  assert.equal(next.language, 'plaintext')
  assert.equal(next.modified, false)
  assert.equal(next.renderMode, 'vim')
})

test('createVimTab applies a consistent untitled fallback name', () => {
  const next = createVimTab({ id: 1, name: '', content: 'draft' }, 7)
  assert.equal(next.name, 'Untitled 7 (vim)')
})

test('createVimTab treats mixed whitespace names as empty', () => {
  const next = createVimTab({ id: 1, name: '\n \t', content: 'draft' }, 8)
  assert.equal(next.name, 'Untitled 8 (vim)')
})
