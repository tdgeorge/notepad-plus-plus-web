/**
 * markdown.js — Markdown tokenizer for syntax highlighting.
 *
 * Line-oriented tokenizer. Highlights:
 *   HEADING    — # Heading 1 … ###### Heading 6          blue bold
 *   BOLD       — **bold** or __bold__                     black bold
 *   ITALIC     — *italic* or _italic_                     black italic
 *   STRING     — `inline code` and ```fenced code```      gray
 *   COMMENT    — <!-- HTML comments -->                   green
 *   KEYWORD    — [link text](url) — the link text part    blue
 *   BROWSER_API — > blockquote lines                      brown bold
 *   OPERATOR   — Markdown punctuation (* - + # > ` |)    dark navy
 *   DEFAULT    — plain text                               black
 */

import { TOKEN } from './javascript'

export function tokenize(code) {
  const tokens = []
  const lines = code.split('\n')

  for (let li = 0; li < lines.length; li++) {
    const lineTokens = tokenizeLine(lines[li])
    for (const tok of lineTokens) tokens.push(tok)
    if (li < lines.length - 1) tokens.push({ type: TOKEN.DEFAULT, value: '\n' })
  }

  return tokens
}

function tokenizeLine(line) {
  const tokens = []
  let i = 0
  const len = line.length

  if (len === 0) return tokens

  // ── Fenced code block marker  ```  ────────────────────────────────────────
  if (line.startsWith('```') || line.startsWith('~~~')) {
    tokens.push({ type: TOKEN.STRING, value: line })
    return tokens
  }

  // ── HTML comment <!-- ... -->  ────────────────────────────────────────────
  if (line.trimStart().startsWith('<!--')) {
    // Whole line as comment (multi-line comments are approximated line-by-line)
    tokens.push({ type: TOKEN.COMMENT, value: line })
    return tokens
  }

  // ── Heading  # … ######  ─────────────────────────────────────────────────
  if (line[0] === '#') {
    let j = 0
    while (j < len && line[j] === '#') j++
    if (j < len && line[j] === ' ') {
      tokens.push({ type: TOKEN.HEADING, value: line })
      return tokens
    }
  }

  // ── Setext heading (underline with === or ---)  ──────────────────────────
  if (/^[=]+$/.test(line.trim()) || /^[-]+$/.test(line.trim())) {
    tokens.push({ type: TOKEN.HEADING, value: line })
    return tokens
  }

  // ── Blockquote  >  ────────────────────────────────────────────────────────
  if (line[0] === '>') {
    tokens.push({ type: TOKEN.BROWSER_API, value: line })
    return tokens
  }

  // ── Horizontal rule --- or *** or ___  ───────────────────────────────────
  if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
    tokens.push({ type: TOKEN.OPERATOR, value: line })
    return tokens
  }

  // ── List item  - or * or + or 1.  ────────────────────────────────────────
  const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s/)
  if (listMatch) {
    const prefix = line.slice(0, listMatch[0].length)
    tokens.push({ type: TOKEN.OPERATOR, value: prefix })
    i = prefix.length
  }

  // ── Inline tokenization for the rest of the line  ────────────────────────
  while (i < len) {
    // Inline code `...`
    if (line[i] === '`') {
      let closing = line.indexOf('`', i + 1)
      if (closing === -1) closing = len - 1
      tokens.push({ type: TOKEN.STRING, value: line.slice(i, closing + 1) })
      i = closing + 1
      continue
    }

    // Bold **...** or __...__
    const boldMarker = (line.slice(i, i + 2) === '**' || line.slice(i, i + 2) === '__') ? 2 : 0
    if (boldMarker) {
      const marker = line.slice(i, i + boldMarker)
      const closeIdx = line.indexOf(marker, i + boldMarker)
      if (closeIdx !== -1) {
        tokens.push({ type: TOKEN.BOLD, value: line.slice(i, closeIdx + boldMarker) })
        i = closeIdx + boldMarker
        continue
      }
    }

    // Italic *...* or _..._  (but not ** or __)
    if ((line[i] === '*' && line[i + 1] !== '*') || (line[i] === '_' && line[i + 1] !== '_')) {
      const marker = line[i]
      const closeIdx = line.indexOf(marker, i + 1)
      if (closeIdx !== -1 && line[closeIdx + 1] !== marker) {
        tokens.push({ type: TOKEN.ITALIC, value: line.slice(i, closeIdx + 1) })
        i = closeIdx + 1
        continue
      }
    }

    // Link [text](url) or ![alt](url) image
    {
      let imgPrefix = ''
      let j = i
      if (line[j] === '!' && line[j + 1] === '[') {
        imgPrefix = '!'
        j++
      }
      if (line[j] === '[') {
        const closeText = line.indexOf(']', j + 1)
        if (closeText !== -1 && line[closeText + 1] === '(') {
          const closeUrl = line.indexOf(')', closeText + 2)
          if (closeUrl !== -1) {
            tokens.push({ type: TOKEN.KEYWORD, value: imgPrefix + line.slice(j, closeText + 1) })
            tokens.push({ type: TOKEN.STRING, value: line.slice(closeText + 1, closeUrl + 1) })
            i = closeUrl + 1
            continue
          }
        }
      }
    }

    // HTML comment inline <!-- ... -->
    if (line.startsWith('<!--', i)) {
      const closeIdx = line.indexOf('-->', i + 4)
      const end = closeIdx !== -1 ? closeIdx + 3 : len
      tokens.push({ type: TOKEN.COMMENT, value: line.slice(i, end) })
      i = end
      continue
    }

    tokens.push({ type: TOKEN.DEFAULT, value: line[i] })
    i++
  }

  return tokens
}
