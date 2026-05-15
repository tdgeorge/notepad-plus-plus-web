function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
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

function renderInlineMarkdown(line) {
  const segments = String(line).split(/(`[^`]*`)/g)
  return segments.map((segment) => {
    if (segment.startsWith('`') && segment.endsWith('`') && segment.length >= 2) {
      return `<code>${escapeHtml(segment.slice(1, -1))}</code>`
    }
    const links = []
    const withPlaceholders = segment.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => {
      const token = `__NPPW_LINK_${links.length}__`
      links.push({
        token,
        text: escapeHtml(text),
        href: escapeHtml(sanitizeHref(href)),
      })
      return token
    })
    let html = escapeHtml(withPlaceholders)
    for (const link of links) {
      html = html.replace(link.token, `<a href="${link.href}" target="_blank" rel="noopener noreferrer">${link.text}</a>`)
    }
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
    return html
  }).join('')
}

function markdownToHtml(markdown) {
  const lines = String(markdown ?? '').replaceAll('\r\n', '\n').split('\n')
  const blocks = []
  let inCodeBlock = false
  let codeLines = []
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
    if (line.trim().startsWith('```')) {
      flushParagraph()
      flushList()
      if (inCodeBlock) {
        blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
        codeLines = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    if (!line.trim()) {
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

    if (/^---+$/.test(line.trim()) || /^\*{3,}$/.test(line.trim())) {
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

    paragraph.push(line.trim())
  }

  if (inCodeBlock) {
    blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
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
