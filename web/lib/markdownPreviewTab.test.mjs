import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMarkdownPreviewDocument, createMarkdownPreviewTab } from './markdownPreviewTab.mjs'

test('createMarkdownPreviewTab returns null for invalid input', () => {
  assert.equal(createMarkdownPreviewTab(null, 2), null)
  assert.equal(createMarkdownPreviewTab({ name: 'README.md', content: '# hi' }, NaN), null)
})

test('createMarkdownPreviewTab creates a markdown-rendering tab clone', () => {
  const source = {
    id: 1,
    name: 'README.md',
    content: '# Hello',
    modified: true,
    language: 'markdown',
    pinned: false,
    pinOrder: null,
  }

  const next = createMarkdownPreviewTab(source, 2)

  assert.equal(next.id, 2)
  assert.equal(next.name, 'README.md (markdown)')
  assert.equal(next.content, source.content)
  assert.equal(next.language, 'markdown')
  assert.equal(next.modified, false)
  assert.equal(next.renderMode, 'markdown')
})

test('buildMarkdownPreviewDocument converts markdown headings and lists', () => {
  const html = buildMarkdownPreviewDocument('# Title\n\n- Item 1\n- Item 2', 'README.md')
  assert.match(html, /<h1>Title<\/h1>/)
  assert.match(html, /<ul><li>Item 1<\/li><li>Item 2<\/li><\/ul>/)
  assert.match(html, /<title>README\.md \(markdown preview\)<\/title>/)
})

test('buildMarkdownPreviewDocument escapes raw html and unsafe links', () => {
  const html = buildMarkdownPreviewDocument('<script>alert(1)</script> [x](javascript:alert(1))')
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.match(html, /href="#"/)
})
