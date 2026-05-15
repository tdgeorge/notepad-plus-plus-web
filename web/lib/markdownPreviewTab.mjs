function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const ALLOWED_HTML_TAGS = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'dd', 'del', 'div', 'dl', 'dt',
  'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p',
  'pre', 's', 'span', 'strong', 'sub', 'sup', 'u', 'ul',
])

const COMMON_ALLOWED_ATTRS = new Set(['class', 'id', 'title', 'lang'])
const TAG_ALLOWED_ATTRS = {
  a: new Set(['href', 'target', 'rel', 'title']),
  img: new Set(['src', 'alt', 'width', 'height', 'title']),
  code: new Set(['class']),
  pre: new Set(['class']),
  span: new Set(['class']),
  div: new Set(['class']),
}

const INLINE_SAFE_HTML_TAG_PATTERN = Array
  .from(ALLOWED_HTML_TAGS)
  .sort((a, b) => b.length - a.length)
  .join('|')
const INLINE_SAFE_HTML_TAG_REGEX = new RegExp(`</?(?:${INLINE_SAFE_HTML_TAG_PATTERN})(?:\\s+[^<>]*)?\\s*/?>`, 'gi')

function sanitizeHref(rawHref) {
  const trimmed = String(rawHref).trim()
  if (!trimmed) return '#'
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return trimmed
  if (trimmed.startsWith('./') || trimmed.startsWith('../')) return trimmed
  try {
    const parsed = new URL(trimmed, 'https://example.local/')
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      return trimmed
    }
  } catch {}
  return '#'
}

function sanitizeHtmlTag(rawTag) {
  const tagMatch = /^<\s*(\/?)\s*([a-zA-Z][\w:-]*)([\s\S]*?)\s*(\/?)>$/.exec(rawTag)
  if (!tagMatch) return ''
  const isClosing = Boolean(tagMatch[1])
  const tagName = tagMatch[2].toLowerCase()
  const isSelfClosing = Boolean(tagMatch[4])
  if (!ALLOWED_HTML_TAGS.has(tagName)) return ''
  if (isClosing) return `</${tagName}>`

  const attrsRaw = tagMatch[3] ?? ''
  const attrs = []
  const allowedForTag = TAG_ALLOWED_ATTRS[tagName] ?? new Set()
  const attrRegex = /([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(".*?"|'.*?'|[^\s"'`=<>]+))?/g
  let match
  while ((match = attrRegex.exec(attrsRaw)) !== null) {
    const attrName = match[1].toLowerCase()
    if (attrName.startsWith('on')) continue
    if (!COMMON_ALLOWED_ATTRS.has(attrName) && !allowedForTag.has(attrName)) continue

    let rawValue = ''
    if (match[2]) {
      rawValue = match[2].trim()
      if ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
        rawValue = rawValue.slice(1, -1)
      }
    }

    if (attrName === 'href' || attrName === 'src') {
      const safe = sanitizeHref(rawValue)
      attrs.push(`${attrName}="${escapeHtml(safe)}"`)
      continue
    }

    if (attrName === 'target') {
      const target = rawValue === '_blank' ? '_blank' : '_self'
      attrs.push(`target="${target}"`)
      continue
    }

    if (attrName === 'rel') {
      attrs.push(`rel="${escapeHtml(rawValue || 'noopener noreferrer')}"`)
      continue
    }

    attrs.push(`${attrName}="${escapeHtml(rawValue)}"`)
  }

  if (tagName === 'a' && !attrs.some((attr) => attr.startsWith('rel='))) {
    attrs.push('rel="noopener noreferrer"')
  }
  const attrsPart = attrs.length ? ` ${attrs.join(' ')}` : ''
  return `<${tagName}${attrsPart}${isSelfClosing ? ' /' : ''}>`
}

function splitInlineCodeSegments(line) {
  const text = String(line)
  const segments = []
  let cursor = 0

  while (cursor < text.length) {
    const openIndex = text.indexOf('`', cursor)
    if (openIndex === -1) {
      segments.push({ type: 'text', value: text.slice(cursor) })
      break
    }
    if (openIndex > cursor) {
      segments.push({ type: 'text', value: text.slice(cursor, openIndex) })
    }
    let backtickCount = 1
    while (text[openIndex + backtickCount] === '`') backtickCount++
    const delimiter = '`'.repeat(backtickCount)
    const closeIndex = text.indexOf(delimiter, openIndex + backtickCount)
    if (closeIndex === -1) {
      segments.push({ type: 'text', value: text.slice(openIndex) })
      break
    }
    segments.push({ type: 'code', value: text.slice(openIndex + backtickCount, closeIndex) })
    cursor = closeIndex + backtickCount
  }

  return segments
}

function renderTextInlineMarkdown(segment) {
  const links = []
  const withLinks = segment.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
    const token = `@@NPPWLINK${links.length}@@`
    links.push({
      token,
      text: escapeHtml(text),
      href: escapeHtml(sanitizeHref(href)),
    })
    return token
  })

  const htmlTags = []
  const withHtmlPlaceholders = withLinks.replace(INLINE_SAFE_HTML_TAG_REGEX, (rawTag) => {
    const safeTag = sanitizeHtmlTag(rawTag)
    if (!safeTag) return ''
    const token = `@@NPPWHTML${htmlTags.length}@@`
    htmlTags.push({ token, safeTag })
    return token
  })

  let html = escapeHtml(withHtmlPlaceholders)
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/\^([^^\s][^^]*?)\^/g, '<sup>$1</sup>')
  html = html.replace(/(^|[^~])~([^~\s][^~]*?)~(?!~)/g, '$1<sub>$2</sub>')

  for (const link of links) {
    html = html.replace(link.token, `<a href="${link.href}" target="_blank" rel="noopener noreferrer">${link.text}</a>`)
  }
  for (const tag of htmlTags) {
    html = html.replace(tag.token, tag.safeTag)
  }
  return html
}

function renderInlineMarkdown(line) {
  return splitInlineCodeSegments(line).map((segment) => {
    if (segment.type === 'code') {
      return `<code>${escapeHtml(segment.value)}</code>`
    }
    return renderTextInlineMarkdown(segment.value)
  }).join('')
}

function markdownToHtml(markdown) {
  const lines = String(markdown ?? '').replaceAll('\r\n', '\n').split('\n')
  const blocks = []
  let inCodeBlock = false
  let codeLines = []
  let codeFenceMarker = null
  let codeFenceLang = ''
  let paragraph = []
  let listType = null
  let listItems = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`)
    paragraph = []
  }
  const flushList = () => {
    if (!listType || !listItems.length) return
    const items = listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')
    blocks.push(`<${listType}>${items}</${listType}>`)
    listType = null
    listItems = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const fenceMatch = /^(```+|~~~+)\s*([\w-]+)?\s*$/.exec(trimmed)
    if (fenceMatch) {
      flushParagraph()
      flushList()
      if (inCodeBlock) {
        if (fenceMatch[1][0] === codeFenceMarker) {
          const classAttr = codeFenceLang ? ` class="language-${escapeHtml(codeFenceLang)}"` : ''
          blocks.push(`<pre><code${classAttr}>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
          codeLines = []
          codeFenceMarker = null
          codeFenceLang = ''
          inCodeBlock = false
        } else {
          codeLines.push(line)
        }
      } else {
        inCodeBlock = true
        codeFenceMarker = fenceMatch[1][0]
        codeFenceLang = fenceMatch[2] ? fenceMatch[2].toLowerCase() : ''
        codeLines = []
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    if (/^<\/?[a-zA-Z][^>]*>\s*$/.test(trimmed)) {
      flushParagraph()
      flushList()
      const safeTag = sanitizeHtmlTag(trimmed)
      if (safeTag) {
        blocks.push(safeTag)
      } else {
        blocks.push(`<p>${escapeHtml(line)}</p>`)
      }
      continue
    }

    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const level = headingMatch[1].length
      blocks.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`)
      continue
    }

    if (/^---+$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
      flushParagraph()
      flushList()
      blocks.push('<hr />')
      continue
    }

    const unorderedMatch = /^[-*+]\s+(.*)$/.exec(line)
    if (unorderedMatch) {
      flushParagraph()
      if (listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(unorderedMatch[1])
      continue
    }

    const orderedMatch = /^\d+\.\s+(.*)$/.exec(line)
    if (orderedMatch) {
      flushParagraph()
      if (listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(orderedMatch[1])
      continue
    }

    paragraph.push(trimmed)
  }

  if (inCodeBlock) {
    const classAttr = codeFenceLang ? ` class="language-${escapeHtml(codeFenceLang)}"` : ''
    blocks.push(`<pre><code${classAttr}>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
  }
  flushParagraph()
  flushList()
  return blocks.join('\n')
}

export function buildMarkdownPreviewDocument(markdown, tabName) {
  const title = tabName?.trim() ? `${tabName} (markdown preview)` : 'Markdown preview'
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    main { max-width: 900px; margin: 0 auto; }
    pre, code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
    pre { padding: 12px; border-radius: 6px; overflow: auto; background: rgba(127, 127, 127, 0.12); }
    code { padding: 0.15em 0.35em; border-radius: 4px; background: rgba(127, 127, 127, 0.12); }
    pre code { padding: 0; background: transparent; }
  </style>
</head>
<body>
  <main>
${markdownToHtml(markdown)}
  </main>
</body>
</html>`
}

export function createMarkdownPreviewTab(sourceTab, id) {
  if (!sourceTab || !Number.isFinite(id)) return null
  const baseName = sourceTab.name?.trim() ? sourceTab.name : `Untitled ${id}`
  return {
    ...sourceTab,
    id,
    name: `${baseName} (markdown)`,
    modified: false,
    renderMode: 'markdown',
  }
}
