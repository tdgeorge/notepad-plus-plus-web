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

test('buildMarkdownPreviewDocument supports blockquotes tables images details nested lists and spaced rules', () => {
  const markdown = [
    '> Quote line',
    '> - one',
    '>   - two',
    '',
    '| Name | Count |',
    '| :--- | ---: |',
    '| apples | 10 |',
    '| pears | 2 |',
    '',
    '![diagram](https://example.com/pic.png "Diagram")',
    '',
    '<details open>',
    '<summary>More info</summary>',
    'Extra details content.',
    '</details>',
    '',
    '- parent',
    '  - child',
    '    - grandchild',
    '',
    '* * *',
    '',
    '- - -',
  ].join('\n')

  const html = buildMarkdownPreviewDocument(markdown)
  assert.match(html, /<blockquote>[\s\S]*<ul><li>one<ul><li>two<\/li><\/ul><\/li><\/ul>[\s\S]*<\/blockquote>/)
  assert.match(html, /<table><thead><tr><th style="text-align:left">Name<\/th><th style="text-align:right">Count<\/th><\/tr><\/thead><tbody><tr><td style="text-align:left">apples<\/td><td style="text-align:right">10<\/td><\/tr><tr><td style="text-align:left">pears<\/td><td style="text-align:right">2<\/td><\/tr><\/tbody><\/table>/)
  assert.match(html, /<img src="https:\/\/example\.com\/pic\.png" alt="diagram" title="Diagram" \/>/)
  assert.match(html, /<details open>/)
  assert.match(html, /<summary>More info<\/summary>/)
  assert.match(html, /<ul><li>parent<ul><li>child<ul><li>grandchild<\/li><\/ul><\/li><\/ul><\/li><\/ul>/)
  assert.equal((html.match(/<hr \/>/g) || []).length, 2)
})

test('buildMarkdownPreviewDocument supports footnote references highlight and flexible image syntax', () => {
  const markdown = [
    'Footnotes [^1][^2] and [1][2] stay superscripted.',
    '',
    "![diagram](https://example.com/pic.png 'Diagram')",
    '![local](<./assets/pic one.png>)',
    '',
    '==highlighted text==',
    '',
    '___',
  ].join('\n')

  const html = buildMarkdownPreviewDocument(markdown)
  assert.match(html, /<sup>\[1\]<\/sup><sup>\[2\]<\/sup>/)
  assert.match(html, /<img src="https:\/\/example\.com\/pic\.png" alt="diagram" title="Diagram" \/>/)
  assert.match(html, /<img src="\.\/assets\/pic one\.png" alt="local" \/>/)
  assert.match(html, /<mark>highlighted text<\/mark>/)
  assert.match(html, /<hr \/>/)
})
