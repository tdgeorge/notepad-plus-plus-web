/**
 * html.js — HTML / XML tokenizer for syntax highlighting.
 *
 * Highlights:
 *   TAG        — element names (<div, </div, />)          dark blue bold
 *   ATTRIBUTE  — attribute names (class=, href=)          red
 *   STRING     — attribute values ("...", '...')           gray
 *   COMMENT    — <!-- ... -->                             green
 *   OPERATOR   — tag delimiters  < > / = ? !              dark navy bold
 *   DEFAULT    — text content                             black
 */

import { TOKEN } from './javascript'

export function tokenize(code) {
  const tokens = []
  let i = 0
  const len = code.length

  while (i < len) {
    // ── Comment  <!-- ... -->  ──────────────────────────────────────────────
    if (code.startsWith('<!--', i)) {
      const start = i
      i += 4
      while (i < len && !code.startsWith('-->', i)) i++
      i += 3
      tokens.push({ type: TOKEN.COMMENT, value: code.slice(start, i) })
      continue
    }

    // ── CDATA  <![CDATA[ ... ]]>  ───────────────────────────────────────────
    if (code.startsWith('<![CDATA[', i)) {
      const start = i
      i += 9
      while (i < len && !code.startsWith(']]>', i)) i++
      i += 3
      tokens.push({ type: TOKEN.STRING, value: code.slice(start, i) })
      continue
    }

    // ── DOCTYPE / processing instruction  <!... or <?...  ──────────────────
    if (code[i] === '<' && (code[i + 1] === '!' || code[i + 1] === '?')) {
      const start = i
      // Emit the opening < as OPERATOR
      tokens.push({ type: TOKEN.OPERATOR, value: '<' })
      i++
      // Directive keyword (e.g. !DOCTYPE, ?xml)
      const dirStart = i
      while (i < len && code[i] !== '>' && code[i] !== ' ' && code[i] !== '\n') i++
      tokens.push({ type: TOKEN.TAG, value: code.slice(dirStart, i) })
      // Rest of directive until >
      while (i < len && code[i] !== '>') {
        if (code[i] === '"' || code[i] === "'") {
          const q = code[i]
          const qStart = i++
          while (i < len && code[i] !== q) i++
          if (i < len) i++
          tokens.push({ type: TOKEN.STRING, value: code.slice(qStart, i) })
        } else {
          tokens.push({ type: TOKEN.DEFAULT, value: code[i] })
          i++
        }
      }
      if (i < len && code[i] === '>') {
        tokens.push({ type: TOKEN.OPERATOR, value: '>' })
        i++
      }
      continue
    }

    // ── Opening or closing tag  < or </  ───────────────────────────────────
    if (code[i] === '<' && i + 1 < len && (code[i + 1] !== ' ' && code[i + 1] !== '\n')) {
      // Opening <
      let opStart = i
      tokens.push({ type: TOKEN.OPERATOR, value: '<' })
      i++
      // Optional closing slash
      if (code[i] === '/') {
        tokens.push({ type: TOKEN.OPERATOR, value: '/' })
        i++
      }
      // Tag name
      const nameStart = i
      while (i < len && /[a-zA-Z0-9:_.-]/.test(code[i])) i++
      if (i > nameStart) {
        tokens.push({ type: TOKEN.TAG, value: code.slice(nameStart, i) })
      }
      // Attributes and closing >
      while (i < len && code[i] !== '>') {
        // Self-close />
        if (code[i] === '/' && code[i + 1] === '>') {
          tokens.push({ type: TOKEN.OPERATOR, value: '/>' })
          i += 2
          break
        }
        // Attribute name
        if (/[a-zA-Z_:@]/.test(code[i])) {
          const attrStart = i
          while (i < len && /[a-zA-Z0-9_:.-]/.test(code[i])) i++
          tokens.push({ type: TOKEN.ATTRIBUTE, value: code.slice(attrStart, i) })
          continue
        }
        // = sign
        if (code[i] === '=') {
          tokens.push({ type: TOKEN.OPERATOR, value: '=' })
          i++
          continue
        }
        // Attribute value string
        if (code[i] === '"' || code[i] === "'") {
          const q = code[i]
          const vStart = i++
          while (i < len && code[i] !== q) i++
          if (i < len) i++
          tokens.push({ type: TOKEN.STRING, value: code.slice(vStart, i) })
          continue
        }
        // Whitespace and other chars
        tokens.push({ type: TOKEN.DEFAULT, value: code[i] })
        i++
      }
      // Closing >
      if (i < len && code[i] === '>') {
        tokens.push({ type: TOKEN.OPERATOR, value: '>' })
        i++
      }
      continue
    }

    // ── Text content / other  ───────────────────────────────────────────────
    const start = i
    while (i < len && code[i] !== '<') i++
    if (i > start) {
      tokens.push({ type: TOKEN.DEFAULT, value: code.slice(start, i) })
    }
  }

  return tokens
}
