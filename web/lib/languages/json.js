/**
 * json.js — JSON tokenizer for syntax highlighting.
 *
 * Highlights:
 *   KEYWORD    — null, true, false                      blue bold
 *   STRING     — keys and string values "..."           gray
 *   NUMBER     — numeric values                         orange
 *   OPERATOR   — structural characters { } [ ] : ,     dark navy
 *   DEFAULT    — whitespace / other                     black
 */

import { TOKEN } from './javascript'

export function tokenize(code) {
  const tokens = []
  let i = 0
  const len = code.length

  while (i < len) {
    // ── String  "..."  ────────────────────────────────────────────────────────
    if (code[i] === '"') {
      const start = i++
      while (i < len && code[i] !== '"') {
        if (code[i] === '\\') i++ // escape sequence
        i++
      }
      if (i < len) i++ // closing "
      tokens.push({ type: TOKEN.STRING, value: code.slice(start, i) })
      continue
    }

    // ── Number  ───────────────────────────────────────────────────────────────
    if (code[i] === '-' || /[0-9]/.test(code[i])) {
      const start = i
      if (code[i] === '-') i++
      while (i < len && /[0-9]/.test(code[i])) i++
      if (i < len && code[i] === '.') {
        i++
        while (i < len && /[0-9]/.test(code[i])) i++
      }
      if (i < len && /[eE]/.test(code[i])) {
        i++
        if (i < len && /[+-]/.test(code[i])) i++
        while (i < len && /[0-9]/.test(code[i])) i++
      }
      tokens.push({ type: TOKEN.NUMBER, value: code.slice(start, i) })
      continue
    }

    // ── Keywords: true / false / null  ────────────────────────────────────────
    if (/[a-z]/.test(code[i])) {
      const start = i
      while (i < len && /[a-z]/.test(code[i])) i++
      const word = code.slice(start, i)
      const type = (word === 'true' || word === 'false' || word === 'null')
        ? TOKEN.KEYWORD
        : TOKEN.DEFAULT
      tokens.push({ type, value: word })
      continue
    }

    // ── Structural operators  { } [ ] : ,  ────────────────────────────────────
    if (/[{}[\]:,]/.test(code[i])) {
      tokens.push({ type: TOKEN.OPERATOR, value: code[i] })
      i++
      continue
    }

    // ── Whitespace / other  ────────────────────────────────────────────────────
    tokens.push({ type: TOKEN.DEFAULT, value: code[i] })
    i++
  }

  return tokens
}
