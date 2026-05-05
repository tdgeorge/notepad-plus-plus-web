/**
 * css.js — CSS tokenizer for syntax highlighting.
 *
 * Highlights:
 *   KEYWORD    — property names (color, margin, display…)  blue bold
 *   TYPE       — pseudo-classes (:hover, :focus…)           purple
 *   BROWSER_API — pseudo-elements (::before, ::after…)      brown bold
 *   STRING     — quoted values ("...", '...')               gray
 *   NUMBER     — numeric values (12px, 1.5em, #f00…)        orange
 *   COMMENT    — /* ... *\/                                  green
 *   OPERATOR   — braces, colon, semicolon                   dark navy bold
 *   DEFAULT    — selectors, identifiers, other text         black
 */

import { TOKEN } from './javascript'
import { CSS_KEYWORDS, CSS_TYPES, CSS_BUILTINS } from './langdata.generated'

export function tokenize(code) {
  const tokens = []
  let i = 0
  const len = code.length
  // We're inside a rule block (between { … }) when ruleDepth > 0.
  // Inside a rule block the identifiers before ':' are property names.
  let ruleDepth = 0

  while (i < len) {
    // ── Block comment  /* … */  ─────────────────────────────────────────────
    if (code[i] === '/' && code[i + 1] === '*') {
      const start = i
      i += 2
      while (i < len - 1 && !(code[i] === '*' && code[i + 1] === '/')) i++
      i += 2
      tokens.push({ type: TOKEN.COMMENT, value: code.slice(start, i) })
      continue
    }

    // ── Braces / structure  ──────────────────────────────────────────────────
    if (code[i] === '{') {
      ruleDepth++
      tokens.push({ type: TOKEN.OPERATOR, value: '{' })
      i++
      continue
    }
    if (code[i] === '}') {
      if (ruleDepth > 0) ruleDepth--
      tokens.push({ type: TOKEN.OPERATOR, value: '}' })
      i++
      continue
    }

    // ── Strings  ─────────────────────────────────────────────────────────────
    if (code[i] === '"' || code[i] === "'") {
      const q = code[i]
      const start = i++
      while (i < len && code[i] !== q && code[i] !== '\n') {
        if (code[i] === '\\') i++
        i++
      }
      if (i < len && code[i] === q) i++
      tokens.push({ type: TOKEN.STRING, value: code.slice(start, i) })
      continue
    }

    // ── Hex colour  #rrggbb / #rgb  ──────────────────────────────────────────
    if (code[i] === '#' && ruleDepth > 0 && /[0-9a-fA-F]/.test(code[i + 1])) {
      const start = i++
      while (i < len && /[0-9a-fA-F]/.test(code[i])) i++
      tokens.push({ type: TOKEN.NUMBER, value: code.slice(start, i) })
      continue
    }

    // ── Number (with optional unit)  ─────────────────────────────────────────
    if (/[0-9]/.test(code[i]) || (code[i] === '.' && /[0-9]/.test(code[i + 1]))) {
      const start = i
      while (i < len && /[0-9.]/.test(code[i])) i++
      // Unit suffix (px, em, rem, %, vw, vh, etc.)
      while (i < len && /[a-zA-Z%]/.test(code[i])) i++
      tokens.push({ type: TOKEN.NUMBER, value: code.slice(start, i) })
      continue
    }

    // ── Pseudo-class/element  :  ─────────────────────────────────────────────
    if (code[i] === ':') {
      tokens.push({ type: TOKEN.OPERATOR, value: code[i + 1] === ':' ? '::' : ':' })
      i += code[i + 1] === ':' ? 2 : 1
      const isElement = tokens[tokens.length - 1].value === '::'
      const start = i
      while (i < len && /[a-zA-Z0-9-_]/.test(code[i])) i++
      if (i > start) {
        const word = code.slice(start, i)
        const type = isElement ? TOKEN.BROWSER_API : TOKEN.TYPE
        tokens.push({ type, value: word })
      }
      continue
    }

    // ── At-rule  @media @keyframes etc.  ─────────────────────────────────────
    if (code[i] === '@') {
      const start = i++
      while (i < len && /[a-zA-Z0-9-]/.test(code[i])) i++
      tokens.push({ type: TOKEN.KEYWORD, value: code.slice(start, i) })
      continue
    }

    // ── Identifier: property name (inside rule) or selector (outside)  ───────
    if (/[a-zA-Z_-]/.test(code[i]) && code[i] !== '-' || (code[i] === '-' && /[a-zA-Z]/.test(code[i + 1]))) {
      const start = i
      while (i < len && /[a-zA-Z0-9_-]/.test(code[i])) i++
      const word = code.slice(start, i)
      let type = TOKEN.DEFAULT
      if (ruleDepth > 0 && CSS_KEYWORDS.has(word.toLowerCase())) {
        type = TOKEN.KEYWORD
      } else if (ruleDepth > 0 && CSS_TYPES.has(word.toLowerCase())) {
        type = TOKEN.TYPE
      }
      tokens.push({ type, value: word })
      continue
    }

    // ── Operators and punctuation  ────────────────────────────────────────────
    if (/[;,()[\]+=~>|^$*!]/.test(code[i])) {
      tokens.push({ type: TOKEN.OPERATOR, value: code[i] })
      i++
      continue
    }

    // ── Everything else (whitespace, newlines, other)  ───────────────────────
    tokens.push({ type: TOKEN.DEFAULT, value: code[i] })
    i++
  }

  return tokens
}
