/**
 * yaml.js — YAML tokenizer for syntax highlighting.
 *
 * Highlights:
 *   TYPE       — mapping keys (word before a colon)         purple
 *   KEYWORD    — boolean literals: true, false, yes, no, null, ~  blue bold
 *   STRING     — quoted strings "..." and '...'             gray
 *   NUMBER     — numeric values                             orange
 *   COMMENT    — # to end of line                           green
 *   OPERATOR   — : - | > [ ] { } ,                         dark navy
 *   DEFAULT    — scalar values, other text                  black
 */

import { TOKEN } from './javascript'

// YAML special literals (case-insensitive per YAML 1.1; YAML 1.2 only has true/false/null)
const YAML_LITERALS = new Set(['true', 'false', 'yes', 'no', 'null', '~', 'on', 'off'])

export function tokenize(code) {
  const tokens = []
  const lines = code.split('\n')

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    const lineTokens = tokenizeLine(line)
    for (const tok of lineTokens) tokens.push(tok)
    if (li < lines.length - 1) tokens.push({ type: TOKEN.DEFAULT, value: '\n' })
  }

  return tokens
}

function tokenizeLine(line) {
  const tokens = []
  let i = 0
  const len = line.length

  // Skip leading whitespace (indentation)
  const indentStart = i
  while (i < len && (line[i] === ' ' || line[i] === '\t')) i++
  if (i > indentStart) tokens.push({ type: TOKEN.DEFAULT, value: line.slice(indentStart, i) })

  if (i >= len) return tokens

  // ── Comment  # to EOL  ────────────────────────────────────────────────────
  if (line[i] === '#') {
    tokens.push({ type: TOKEN.COMMENT, value: line.slice(i) })
    return tokens
  }

  // ── Document markers --- and ...  ─────────────────────────────────────────
  if (line.slice(i, i + 3) === '---' || line.slice(i, i + 3) === '...') {
    tokens.push({ type: TOKEN.OPERATOR, value: line.slice(i, i + 3) })
    i += 3
  }

  // ── Sequence indicator -  ─────────────────────────────────────────────────
  if (i < len && line[i] === '-' && (i + 1 >= len || line[i + 1] === ' ' || line[i + 1] === '\n')) {
    tokens.push({ type: TOKEN.OPERATOR, value: '-' })
    i++
    if (i < len && line[i] === ' ') {
      tokens.push({ type: TOKEN.DEFAULT, value: ' ' })
      i++
    }
  }

  if (i >= len) return tokens

  // ── Quoted string as key or value  ────────────────────────────────────────
  if (line[i] === '"' || line[i] === "'") {
    const q = line[i]
    const start = i++
    while (i < len && line[i] !== q) {
      if (line[i] === '\\') i++
      i++
    }
    if (i < len) i++
    const strVal = line.slice(start, i)
    // Check if this quoted string is a key (followed by optional space + colon)
    let j = i
    while (j < len && line[j] === ' ') j++
    if (j < len && line[j] === ':') {
      tokens.push({ type: TOKEN.TYPE, value: strVal })
      // Emit colon + rest
      tokens.push({ type: TOKEN.OPERATOR, value: ':' })
      i = j + 1
    } else {
      tokens.push({ type: TOKEN.STRING, value: strVal })
    }
  }

  // ── Unquoted token: may be a key (word:) or a value  ────────────────────
  while (i < len) {
    // Inline comment
    if (line[i] === '#' && (i === 0 || line[i - 1] === ' ')) {
      tokens.push({ type: TOKEN.COMMENT, value: line.slice(i) })
      return tokens
    }

    // Quoted string value
    if (line[i] === '"' || line[i] === "'") {
      const q = line[i]
      const start = i++
      while (i < len && line[i] !== q) {
        if (line[i] === '\\') i++
        i++
      }
      if (i < len) i++
      tokens.push({ type: TOKEN.STRING, value: line.slice(start, i) })
      continue
    }

    // Structural chars
    if (/[|>[\]{},]/.test(line[i])) {
      tokens.push({ type: TOKEN.OPERATOR, value: line[i] })
      i++
      continue
    }

    // Colon (separator)
    if (line[i] === ':' && (i + 1 >= len || line[i + 1] === ' ' || line[i + 1] === '\n')) {
      tokens.push({ type: TOKEN.OPERATOR, value: ':' })
      i++
      continue
    }

    // Anchor / alias &name or *name
    if (line[i] === '&' || line[i] === '*') {
      const start = i++
      while (i < len && /[a-zA-Z0-9_-]/.test(line[i])) i++
      tokens.push({ type: TOKEN.BROWSER_API, value: line.slice(start, i) })
      continue
    }

    // Word or number token
    if (/[a-zA-Z0-9._\-+]/.test(line[i])) {
      const start = i
      while (i < len && /[a-zA-Z0-9._\-+:/]/.test(line[i])) {
        // Stop at ': ' pattern (key-value separator)
        if (line[i] === ':' && (i + 1 >= len || line[i + 1] === ' ' || line[i + 1] === '\n')) break
        i++
      }
      const word = line.slice(start, i)

      // Check if it's a key (followed by colon)
      let j = i
      while (j < len && line[j] === ' ') j++
      if (j < len && line[j] === ':') {
        tokens.push({ type: TOKEN.TYPE, value: word })
        // Colon will be handled in the next iteration
        continue
      }

      // Value — could be a boolean/null literal or a number
      if (YAML_LITERALS.has(word.toLowerCase())) {
        tokens.push({ type: TOKEN.KEYWORD, value: word })
      } else if (/^-?[0-9]/.test(word) || /^0x/i.test(word)) {
        tokens.push({ type: TOKEN.NUMBER, value: word })
      } else {
        tokens.push({ type: TOKEN.DEFAULT, value: word })
      }
      continue
    }

    tokens.push({ type: TOKEN.DEFAULT, value: line[i] })
    i++
  }

  return tokens
}
