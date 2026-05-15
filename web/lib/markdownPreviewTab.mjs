function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const ALLOWED_HTML_TAGS = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'dd', 'del', 'details', 'div', 'dl', 'dt',
  'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'mark', 'ol', 'p',
  'pre', 's', 'span', 'strong', 'sub', 'summary', 'sup', 'u', 'ul',
])

const COMMON_ALLOWED_ATTRS = new Set(['class', 'id', 'title', 'lang'])
const TAG_ALLOWED_ATTRS = {
  a: new Set(['href', 'target', 'rel', 'title']),
  img: new Set(['src', 'alt', 'width', 'height', 'title']),
  code: new Set(['class']),
  pre: new Set(['class']),
  span: new Set(['class']),
  div: new Set(['class']),
  details: new Set(['open']),
}

const INLINE_SAFE_HTML_TAG_PATTERN = Array
  .from(ALLOWED_HTML_TAGS)
  .sort((a, b) => b.length - a.length)
  .join('|')
const INLINE_SAFE_HTML_TAG_REGEX = new RegExp(`</?(?:${INLINE_SAFE_HTML_TAG_PATTERN})(?:\\s+[^<>]*)?\\s*/?>`, 'gi')
const LIST_LINE_REGEX = /^([ \t]*)([-*+]|\d+\.)\s+(.*)$/

function countIndent(value) {
  return String(value).replace(/\t/g, '  ').length
}

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

function sanitizeImageSrc(rawSrc) {
  let trimmed = String(rawSrc).trim()
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    trimmed = trimmed.slice(1, -1).trim()
  }
  if (!trimmed) return '#'
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) return trimmed
  try {
    const parsed = new URL(trimmed, 'https://example.local/')
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
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

    if (attrName === 'href') {
      const safe = sanitizeHref(rawValue)
      attrs.push(`${attrName}="${escapeHtml(safe)}"`)
      continue
    }

    if (attrName === 'src') {
      const safe = sanitizeImageSrc(rawValue)
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

    if (attrName === 'open') {
      attrs.push('open')
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
  const parseImageTarget = (target) => {
    const trimmed = String(target).trim()
    let source = trimmed
    let title = ''

    const titleMatch = /^(.*?)(?:\s+"([^"]*)"|\s+'([^']*)')\s*$/.exec(trimmed)
    if (titleMatch) {
      source = titleMatch[1].trim()
      title = titleMatch[2] ?? titleMatch[3] ?? ''
    }

    if (source.startsWith('<') && source.endsWith('>')) {
      source = source.slice(1, -1).trim()
    }

    return { source, title }
  }

  const images = []
  const withImages = segment.replace(/!\[([^\]]*)\]\((.*?)\)/g, (_, alt, target) => {
    const { source, title } = parseImageTarget(target)
    const token = `@@MDIMAGE${images.length}@@`
    images.push({
      token,
      alt: escapeHtml(alt),
      src: escapeHtml(sanitizeImageSrc(source)),
      title: title ? escapeHtml(title) : '',
    })
    return token
  })

  const links = []
  const withLinks = withImages.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
    const token = `@@MDLINK${links.length}@@`
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
    const token = `@@MDHTML${htmlTags.length}@@`
    htmlTags.push({ token, safeTag })
    return token
  })

  let html = escapeHtml(withHtmlPlaceholders)
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/==(.+?)==/g, '<mark>$1</mark>')
  html = html.replace(/\[\^([^\]\s]+)\](?!\()/g, '<sup>[$1]</sup>')
  html = html.replace(/\[(\d+)\](?!\()/g, '<sup>[$1]</sup>')
  html = html.replace(/\^([^^\s][^^]*?)\^/g, '<sup>$1</sup>')
  html = html.replace(/(^|[^~])~([^~\s][^~]*?)~(?!~)/g, '$1<sub>$2</sub>')

  for (const image of images) {
    const titleAttr = image.title ? ` title="${image.title}"` : ''
    html = html.replace(image.token, `<img src="${image.src}" alt="${image.alt}"${titleAttr} />`)
  }
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

function isHorizontalRuleLine(trimmedLine) {
  return /^(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(trimmedLine)
}

function parseTableRow(line) {
  const trimmed = String(line).trim()
  if (!trimmed.includes('|')) return null
  const normalized = trimmed.replace(/^\|/, '').replace(/\|$/, '')
  const cells = normalized.split('|').map((cell) => cell.trim())
  if (cells.length < 2) return null
  return cells
}

function parseTableDivider(line, expectedCount) {
  const cells = parseTableRow(line)
  if (!cells || cells.length !== expectedCount) return null

  const aligns = []
  for (const cell of cells) {
    const compact = cell.replace(/\s+/g, '')
    if (!/^:?-{3,}:?$/.test(compact)) return null
    if (compact.startsWith(':') && compact.endsWith(':')) aligns.push('center')
    else if (compact.endsWith(':')) aligns.push('right')
    else if (compact.startsWith(':')) aligns.push('left')
    else aligns.push('')
  }

  return aligns
}

function parseTableBlock(lines, startIndex) {
  const headerCells = parseTableRow(lines[startIndex])
  const aligns = parseTableDivider(lines[startIndex + 1], headerCells.length)
  let index = startIndex + 2
  const bodyRows = []

  while (index < lines.length) {
    const rowLine = lines[index]
    if (!rowLine.trim()) break
    const rowCells = parseTableRow(rowLine)
    if (!rowCells || rowCells.length !== headerCells.length) break
    bodyRows.push(rowCells)
    index += 1
  }

  const renderCell = (tag, cell, align) => {
    const alignAttr = align ? ` style="text-align:${align}"` : ''
    return `<${tag}${alignAttr}>${renderInlineMarkdown(cell)}</${tag}>`
  }

  const thead = `<thead><tr>${headerCells.map((cell, i) => renderCell('th', cell, aligns[i])).join('')}</tr></thead>`
  const tbodyRows = bodyRows
    .map((row) => `<tr>${row.map((cell, i) => renderCell('td', cell, aligns[i])).join('')}</tr>`)
    .join('')
  const tbody = `<tbody>${tbodyRows}</tbody>`

  return {
    html: `<table>${thead}${tbody}</table>`,
    nextIndex: index,
  }
}

function parseListBlock(lines, startIndex) {
  let index = startIndex
  const parts = []
  const stack = []

  const closeList = () => {
    const current = stack.pop()
    if (current) {
      parts.push(`</li></${current.type}>`)
    }
  }

  while (index < lines.length) {
    const line = lines[index]
    const match = LIST_LINE_REGEX.exec(line)
    if (!match) break

    const indent = countIndent(match[1])
    const type = /\d+\./.test(match[2]) ? 'ol' : 'ul'
    const text = match[3].trim()

    while (stack.length && indent < stack[stack.length - 1].indent) {
      closeList()
    }

    if (!stack.length) {
      parts.push(`<${type}><li>${renderInlineMarkdown(text)}`)
      stack.push({ type, indent })
    } else {
      const current = stack[stack.length - 1]
      if (indent > current.indent) {
        parts.push(`<${type}><li>${renderInlineMarkdown(text)}`)
        stack.push({ type, indent })
      } else if (indent === current.indent) {
        if (type === current.type) {
          parts.push(`</li><li>${renderInlineMarkdown(text)}`)
        } else {
          closeList()
          parts.push(`<${type}><li>${renderInlineMarkdown(text)}`)
          stack.push({ type, indent })
        }
      } else {
        break
      }
    }

    index += 1

    while (index < lines.length) {
      const continuation = lines[index]
      if (!continuation.trim()) break
      if (LIST_LINE_REGEX.test(continuation)) break
      if (countIndent(continuation) > indent) {
        parts.push(` ${renderInlineMarkdown(continuation.trim())}`)
        index += 1
        continue
      }
      break
    }
  }

  while (stack.length) {
    closeList()
  }

  return {
    html: parts.join(''),
    nextIndex: index,
  }
}

function sanitizeStandaloneHtmlLine(line) {
  const trimmed = line.trim()

  if (/^<\/?[a-zA-Z][^>]*>$/.test(trimmed)) {
    return sanitizeHtmlTag(trimmed)
  }

  const fullTagMatch = /^<([a-zA-Z][\w:-]*)([^>]*)>([\s\S]*)<\/\1>$/.exec(trimmed)
  if (!fullTagMatch) return null

  const tagName = fullTagMatch[1].toLowerCase()
  if (!ALLOWED_HTML_TAGS.has(tagName)) return null

  const opening = sanitizeHtmlTag(`<${fullTagMatch[1]}${fullTagMatch[2]}>`)
  const closing = sanitizeHtmlTag(`</${fullTagMatch[1]}>`)
  if (!opening || !closing) return null

  return `${opening}${renderInlineMarkdown(fullTagMatch[3])}${closing}`
}

function markdownToHtml(markdown) {
  const lines = String(markdown ?? '').replaceAll('\r\n', '\n').split('\n')
  const blocks = []
  let inCodeBlock = false
  let codeLines = []
  let codeFenceMarker = null
  let codeFenceLang = ''
  let paragraph = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`)
    paragraph = []
  }

  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()
    const fenceMatch = /^(```+|~~~+)\s*([\w-]+)?\s*$/.exec(trimmed)

    if (fenceMatch) {
      flushParagraph()
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
      index += 1
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      index += 1
      continue
    }

    if (!trimmed) {
      flushParagraph()
      index += 1
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      flushParagraph()
      const quoteLines = []
      while (index < lines.length) {
        const quoteLine = lines[index]
        const quoteMatch = /^\s*>\s?(.*)$/.exec(quoteLine)
        if (quoteMatch) {
          quoteLines.push(quoteMatch[1])
          index += 1
          continue
        }
        if (!quoteLine.trim() && /^\s*>\s?/.test(lines[index + 1] || '')) {
          quoteLines.push('')
          index += 1
          continue
        }
        break
      }
      blocks.push(`<blockquote>${markdownToHtml(quoteLines.join('\n'))}</blockquote>`)
      continue
    }

    const standaloneHtml = sanitizeStandaloneHtmlLine(line)
    if (standaloneHtml !== null) {
      flushParagraph()
      if (standaloneHtml) {
        blocks.push(standaloneHtml)
      } else {
        blocks.push(`<p>${escapeHtml(line)}</p>`)
      }
      index += 1
      continue
    }

    const headerMatch = /^(#{1,6})\s+(.*)$/.exec(line)
    if (headerMatch) {
      flushParagraph()
      const level = headerMatch[1].length
      blocks.push(`<h${level}>${renderInlineMarkdown(headerMatch[2])}</h${level}>`)
      index += 1
      continue
    }

    if (isHorizontalRuleLine(trimmed)) {
      flushParagraph()
      blocks.push('<hr />')
      index += 1
      continue
    }

    const headerCells = parseTableRow(line)
    if (headerCells && index + 1 < lines.length && parseTableDivider(lines[index + 1], headerCells.length)) {
      flushParagraph()
      const table = parseTableBlock(lines, index)
      blocks.push(table.html)
      index = table.nextIndex
      continue
    }

    if (LIST_LINE_REGEX.test(line)) {
      flushParagraph()
      const list = parseListBlock(lines, index)
      blocks.push(list.html)
      index = list.nextIndex
      continue
    }

    paragraph.push(trimmed)
    index += 1
  }

  if (inCodeBlock) {
    const classAttr = codeFenceLang ? ` class="language-${escapeHtml(codeFenceLang)}"` : ''
    blocks.push(`<pre><code${classAttr}>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
  }

  flushParagraph()
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
    blockquote { margin: 1em 0; padding-left: 1em; border-left: 4px solid rgba(127, 127, 127, 0.5); }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; }
    th, td { border: 1px solid rgba(127, 127, 127, 0.35); padding: 0.45em 0.6em; }
    img { max-width: 100%; height: auto; }
    mark { background: rgba(255, 235, 59, 0.45); color: inherit; padding: 0 0.15em; border-radius: 0.2em; }
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
