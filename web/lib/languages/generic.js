/**
 * generic.js
 *
 * Factory that creates a tokenizer for any keyword-based programming language.
 * This handles the majority of languages: those with C-like, Python-like, or
 * shell-like syntax where the main constructs are keywords, identifiers,
 * strings, numbers, line/block comments, and operators.
 *
 * Usage:
 *   import { createTokenizer } from './generic'
 *   export const tokenize = createTokenizer({ keywords, commentLine: '#' })
 */

import { TOKEN } from './javascript'

// ── Operator tables shared across many C-like languages ─────────────────────

const FOUR_CHAR_OPS = new Set(['>>>='])
const THREE_CHAR_OPS = new Set([
  '===', '!==', '**=', '<<=', '>>=', '||=', '&&=', '??=', '->*',
])
const TWO_CHAR_OPS = new Set([
  '==', '!=', '<=', '>=', '&&', '||', '??',
  '+=', '-=', '*=', '/=', '%=', '**',
  '++', '--', '=>', '?.',
  '<<', '>>', '&=', '|=', '^=',
  '::', '->', '<-',
])
const OP_START = /[+\-*/%=<>!&|^~?:;.,()[\]{}@#\\]/

// ── Identifier start / continue ─────────────────────────────────────────────

const IDENT_START = /[a-zA-Z_$]/
const IDENT_CONT = /[a-zA-Z0-9_$]/

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {Set<string>}  opts.keywords        instre1 — primary keywords (KEYWORD colour)
 * @param {Set<string>} [opts.typeWords]      type1   — type/class names (TYPE colour)
 * @param {Set<string>} [opts.builtins]       instre2 — built-in functions (BROWSER_API colour)
 * @param {string|null} [opts.commentLine]    line-comment opener, e.g. '//', '#', '--', ';'
 * @param {string|null} [opts.commentStart]   block-comment opener, e.g. '/*'
 * @param {string|null} [opts.commentEnd]     block-comment closer, e.g. '* /'  (no space)
 * @param {string[]}    [opts.stringChars]    characters that delimit strings, default ['"', "'"]
 * @param {boolean}     [opts.tripleStrings]  whether ''' / """ triple-quoted strings are supported
 * @param {boolean}     [opts.caseInsensitive] treat keywords case-insensitively (Batch, VB, SQL)
 * @returns {(code: string) => {type: string, value: string}[]}
 */
export function createTokenizer({
  keywords = new Set(),
  typeWords = new Set(),
  builtins = new Set(),
  commentLine = null,
  commentStart = null,
  commentEnd = null,
  stringChars = ['"', "'"],
  tripleStrings = false,
  caseInsensitive = false,
}) {
  const kwCheck = caseInsensitive
    ? (w) => keywords.has(w.toLowerCase())
    : (w) => keywords.has(w)
  const typeCheck = caseInsensitive
    ? (w) => typeWords.has(w.toLowerCase())
    : (w) => typeWords.has(w)
  const builtinCheck = caseInsensitive
    ? (w) => builtins.has(w.toLowerCase())
    : (w) => builtins.has(w)

  // Pre-compute comment token lengths to avoid repeated .length accesses
  const clLen = commentLine ? commentLine.length : 0
  const csLen = commentStart ? commentStart.length : 0
  const ceLen = commentEnd ? commentEnd.length : 0

  return function tokenize(code) {
    const tokens = []
    let i = 0
    const len = code.length

    while (i < len) {
      // ── Doc comment  /** … */  (C-style languages)  ─────────────────────
      if (
        commentStart === '/*' &&
        code[i] === '/' &&
        code[i + 1] === '*' &&
        code[i + 2] === '*' &&
        code[i + 3] !== '/'
      ) {
        const start = i
        i += 3
        while (i < len - 1 && !(code[i] === '*' && code[i + 1] === '/')) i++
        i += 2
        tokens.push({ type: TOKEN.COMMENT_DOC, value: code.slice(start, i) })
        continue
      }

      // ── Block comment  ────────────────────────────────────────────────────
      if (commentStart && commentStart.length > 0 && code.startsWith(commentStart, i)) {
        const start = i
        i += csLen
        while (i < len && !code.startsWith(commentEnd, i)) i++
        i += ceLen
        tokens.push({ type: TOKEN.COMMENT, value: code.slice(start, i) })
        continue
      }

      // ── Line comment  ─────────────────────────────────────────────────────
      if (commentLine && commentLine.length > 0) {
        // Case-insensitive line comment check (e.g. REM for Batch)
        const slice = code.slice(i, i + clLen)
        if (
          caseInsensitive
            ? slice.toUpperCase() === commentLine.toUpperCase()
            : slice === commentLine
        ) {
          const start = i
          while (i < len && code[i] !== '\n') i++
          tokens.push({ type: TOKEN.COMMENT, value: code.slice(start, i) })
          continue
        }
      }

      // ── Strings (including optional triple-quoted variants)  ─────────────
      if (stringChars.includes(code[i])) {
        const q = code[i]
        const start = i
        // Triple-quoted strings (Python-style ''' / """)
        if (tripleStrings && code[i + 1] === q && code[i + 2] === q) {
          const triple = q + q + q
          i += 3
          while (i < len && !code.startsWith(triple, i)) {
            if (code[i] === '\\') i++
            i++
          }
          i += 3 // consume closing triple
        } else {
          i++ // skip opening quote
          while (i < len && code[i] !== q && code[i] !== '\n') {
            if (code[i] === '\\') i++ // skip escape
            i++
          }
          if (i < len && code[i] === q) i++ // closing quote
        }
        tokens.push({ type: TOKEN.STRING, value: code.slice(start, i) })
        continue
      }

      // ── Number literal  ───────────────────────────────────────────────────
      if (
        /[0-9]/.test(code[i]) ||
        (code[i] === '.' && i + 1 < len && /[0-9]/.test(code[i + 1]))
      ) {
        const start = i
        if (code[i] === '0' && i + 1 < len && /[xX]/.test(code[i + 1])) {
          i += 2
          while (i < len && /[0-9a-fA-F_]/.test(code[i])) i++
        } else if (code[i] === '0' && i + 1 < len && /[bB]/.test(code[i + 1])) {
          i += 2
          while (i < len && /[01_]/.test(code[i])) i++
        } else if (code[i] === '0' && i + 1 < len && /[oO]/.test(code[i + 1])) {
          i += 2
          while (i < len && /[0-7_]/.test(code[i])) i++
        } else {
          while (i < len && /[0-9_]/.test(code[i])) i++
          if (i < len && code[i] === '.') {
            i++
            while (i < len && /[0-9_]/.test(code[i])) i++
          }
          if (i < len && /[eE]/.test(code[i])) {
            i++
            if (i < len && /[+-]/.test(code[i])) i++
            while (i < len && /[0-9]/.test(code[i])) i++
          }
          if (i < len && code[i] === 'n') i++ // BigInt suffix
          if (i < len && /[fFuUlL]/.test(code[i])) i++ // C/C++ suffixes
        }
        tokens.push({ type: TOKEN.NUMBER, value: code.slice(start, i) })
        continue
      }

      // ── Identifier / keyword  ─────────────────────────────────────────────
      if (IDENT_START.test(code[i])) {
        const start = i
        while (i < len && IDENT_CONT.test(code[i])) i++
        const word = code.slice(start, i)
        let type
        if (kwCheck(word)) {
          type = TOKEN.KEYWORD
        } else if (typeCheck(word)) {
          type = TOKEN.TYPE
        } else if (builtinCheck(word)) {
          type = TOKEN.BROWSER_API
        } else {
          type = TOKEN.DEFAULT
        }
        tokens.push({ type, value: word })
        continue
      }

      // ── Operator / punctuation  ───────────────────────────────────────────
      if (OP_START.test(code[i])) {
        const s = code.slice(i)
        let opLen = 1
        if (FOUR_CHAR_OPS.has(s.slice(0, 4))) opLen = 4
        else if (THREE_CHAR_OPS.has(s.slice(0, 3))) opLen = 3
        else if (TWO_CHAR_OPS.has(s.slice(0, 2))) opLen = 2
        tokens.push({ type: TOKEN.OPERATOR, value: code.slice(i, i + opLen) })
        i += opLen
        continue
      }

      // ── Whitespace / other  ───────────────────────────────────────────────
      tokens.push({ type: TOKEN.DEFAULT, value: code[i] })
      i++
    }

    return tokens
  }
}
