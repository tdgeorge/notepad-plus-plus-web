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

test('buildMarkdownPreviewDocument escapes unsafe script input and link protocols', () => {
  const html = buildMarkdownPreviewDocument('<script>alert(1)</script> [x](javascript:alert(1))')
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/)
  assert.match(html, /href="#"/)
})

test('buildMarkdownPreviewDocument escapes markdown link text', () => {
  const html = buildMarkdownPreviewDocument('[<b>safe</b>](https://example.com)')
  assert.match(html, /<a href="https:\/\/example\.com" target="_blank" rel="noopener noreferrer">&lt;b&gt;safe&lt;\/b&gt;<\/a>/)
})

test('buildMarkdownPreviewDocument supports full markdown fixture features', () => {
  const markdown = [
    '# Fixture',
    '',
    '~~struck~~ ^sup^ ~sub~ and `<em>raw</em>`',
    '',
    '<div class="note">embedded html block</div>',
    '',
    '```js',
    'const x = 1 < 2',
    '```',
    '',
    '``inline `code` span``',
  ].join('\n')

  const html = buildMarkdownPreviewDocument(markdown)
  assert.match(html, /<del>struck<\/del>/)
  assert.match(html, /<sup>sup<\/sup>/)
  assert.match(html, /<sub>sub<\/sub>/)
  assert.match(html, /<div class="note">embedded html block<\/div>/)
  assert.match(html, /<pre><code class="language-js">const x = 1 &lt; 2<\/code><\/pre>/)
  assert.match(html, /<code>inline `code` span<\/code>/)
})
