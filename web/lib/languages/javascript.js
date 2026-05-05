/**
 * JavaScript tokenizer for syntax highlighting.
 *
 * Keyword lists and style definitions are sourced from the Notepad++ C++ codebase:
 *   PowerEditor/src/langs.model.xml  — keyword sets (instre1, type1, instre2)
 *   PowerEditor/src/stylers.model.xml — colour / style assignments
 *
 * Token types and their default colours (matching the Classic NP++ theme):
 *   KEYWORD      instre1  — #0000FF bold   (INSTRUCTION WORD)
 *   TYPE         type1    — #8000FF        (TYPE WORD)
 *   BROWSER_API  instre2  — #804000 bold   (WINDOW INSTRUCTION)
 *   NUMBER                — #FF8000        (NUMBER)
 *   STRING                — #808080        (STRING / CHARACTER)
 *   TEMPLATE              — #808080 italic (STRING RAW / template literal)
 *   COMMENT               — #008000        (COMMENT / COMMENT LINE)
 *   COMMENT_DOC           — #008080        (COMMENT DOC / COMMENT LINE DOC)
 *   REGEX                 — #000000 bold   (REGEX)
 *   OPERATOR              — #000080 bold   (OPERATOR)
 *   DEFAULT               — #000000        (DEFAULT)
 */

// ── Word lists from langs.model.xml ────────────────────────────────────────

/** instre1 — language keywords */
export const KEYWORDS = new Set([
  'abstract', 'async', 'await', 'boolean', 'break', 'byte', 'case', 'catch',
  'char', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
  'double', 'else', 'enum', 'export', 'extends', 'final', 'finally', 'float',
  'for', 'function', 'goto', 'if', 'implements', 'import', 'in', 'instanceof',
  'int', 'interface', 'let', 'long', 'native', 'new', 'null', 'of', 'package',
  'private', 'protected', 'public', 'return', 'short', 'static', 'super',
  'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try',
  'typeof', 'var', 'void', 'volatile', 'while', 'with', 'true', 'false',
  'prototype', 'yield',
])

/** type1 — built-in constructors / globals */
export const TYPE_WORDS = new Set([
  'Array', 'Date', 'eval', 'hasOwnProperty', 'Infinity', 'isFinite', 'isNaN',
  'isPrototypeOf', 'Math', 'NaN', 'Number', 'Object', 'prototype', 'String',
  'toString', 'undefined', 'valueOf',
])

/** instre2 — browser / DOM API identifiers */
export const BROWSER_API_WORDS = new Set([
  'alert', 'all', 'anchor', 'anchors', 'area', 'assign', 'blur', 'button',
  'checkbox', 'clearInterval', 'clearTimeout', 'clientInformation', 'close',
  'closed', 'confirm', 'constructor', 'crypto', 'decodeURI', 'decodeURIComponent',
  'defaultStatus', 'document', 'element', 'elements', 'embed', 'embeds',
  'encodeURI', 'encodeURIComponent', 'escape', 'event', 'fileUpload', 'focus',
  'form', 'forms', 'frame', 'innerHeight', 'innerWidth', 'layer', 'layers',
  'link', 'location', 'mimeTypes', 'navigate', 'navigator', 'frames', 'frameRate',
  'hidden', 'history', 'image', 'images', 'offscreenBuffering', 'onblur',
  'onclick', 'onerror', 'onfocus', 'onkeydown', 'onkeypress', 'onkeyup',
  'onmouseover', 'onload', 'onmouseup', 'onmousedown', 'onsubmit', 'open',
  'opener', 'option', 'outerHeight', 'outerWidth', 'packages', 'pageXOffset',
  'pageYOffset', 'parent', 'parseFloat', 'parseInt', 'password', 'pkcs11',
  'plugin', 'prompt', 'propertyIsEnum', 'radio', 'reset', 'screenX', 'screenY',
  'scroll', 'secure', 'select', 'self', 'setInterval', 'setTimeout', 'status',
  'submit', 'taint', 'text', 'textarea', 'top', 'unescape', 'untaint', 'window',
])

// ── Token type constants ────────────────────────────────────────────────────

export const TOKEN = {
  DEFAULT: 'default',
  KEYWORD: 'keyword',
  TYPE: 'type',
  BROWSER_API: 'browserApi',
  NUMBER: 'number',
  STRING: 'string',
  TEMPLATE: 'template',
  COMMENT: 'comment',
  COMMENT_DOC: 'commentDoc',
  REGEX: 'regex',
  OPERATOR: 'operator',
  // HTML / XML specific
  TAG: 'tag',
  ATTRIBUTE: 'attribute',
  // Markdown specific
  HEADING: 'heading',
  BOLD: 'bold',
  ITALIC: 'italic',
}

// ── Operator tables ─────────────────────────────────────────────────────────

const FOUR_CHAR_OPS = new Set(['>>>='])

const THREE_CHAR_OPS = new Set([
  '===', '!==', '**=', '<<=', '>>=', '||=', '&&=', '??=',
])

const TWO_CHAR_OPS = new Set([
  '==', '!=', '<=', '>=', '&&', '||', '??',
  '+=', '-=', '*=', '/=', '%=', '**',
  '++', '--', '=>', '?.',
  '<<', '>>', '&=', '|=', '^=',
])

// Characters that can begin an operator token
const OP_START = /[+\-*/%=<>!&|^~?:;.,()[\]{}]/

// ── Regex-context detection ─────────────────────────────────────────────────
//
// A `/` begins a regex literal when the previous meaningful token was a
// keyword, operator, or nothing (start of file).  After a value token
// (identifier, number, closing bracket, string) it is the division operator.

const REGEX_ALLOWED_AFTER = new Set([TOKEN.KEYWORD, TOKEN.OPERATOR, null])

// ── Tokenizer ───────────────────────────────────────────────────────────────

/**
 * Tokenize JavaScript source code into an array of `{ type, value }` objects.
 *
 * The tokenizer is intentionally simple — it handles the constructs visible
 * in typical JS source without a full AST.  Template literal `${…}` expressions
 * are not recursively highlighted; the entire back-tick span is one TEMPLATE token.
 */
export function tokenize(code) {
  const tokens = []
  let i = 0
  const len = code.length
  // Tracks the last "value-producing" token type for regex vs. division heuristic.
  // Whitespace / newline characters do NOT update this.
  let lastType = null

  while (i < len) {
    // ── Doc comment  /** … */  ────────────────────────────────────────────
    // Must be tested before the plain block-comment branch.
    // '/**/' (empty) is intentionally NOT a doc comment (code[i+3] === '/').
    if (
      code[i] === '/' &&
      code[i + 1] === '*' &&
      code[i + 2] === '*' &&
      code[i + 3] !== '/'
    ) {
      const start = i
      i += 3
      while (i < len - 1 && !(code[i] === '*' && code[i + 1] === '/')) i++
      i += 2 // consume closing */
      tokens.push({ type: TOKEN.COMMENT_DOC, value: code.slice(start, i) })
      // comments do not affect the regex/division heuristic
      continue
    }

    // ── Block comment  /* … */  ───────────────────────────────────────────
    if (code[i] === '/' && code[i + 1] === '*') {
      const start = i
      i += 2
      while (i < len - 1 && !(code[i] === '*' && code[i + 1] === '/')) i++
      i += 2
      tokens.push({ type: TOKEN.COMMENT, value: code.slice(start, i) })
      continue
    }

    // ── Line comment  // … ───────────────────────────────────────────────
    if (code[i] === '/' && code[i + 1] === '/') {
      const start = i
      while (i < len && code[i] !== '\n') i++
      tokens.push({ type: TOKEN.COMMENT, value: code.slice(start, i) })
      continue
    }

    // ── Template literal  ` … `  ─────────────────────────────────────────
    // Highlighted as a single token; `${…}` expressions are not recursed into.
    if (code[i] === '`') {
      const start = i++
      while (i < len && code[i] !== '`') {
        if (code[i] === '\\') i++ // skip escaped character
        i++
      }
      if (i < len) i++ // closing back-tick
      tokens.push({ type: TOKEN.TEMPLATE, value: code.slice(start, i) })
      lastType = TOKEN.TEMPLATE
      continue
    }

    // ── Double-quoted string  " … "  ─────────────────────────────────────
    if (code[i] === '"') {
      const start = i++
      while (i < len && code[i] !== '"' && code[i] !== '\n') {
        if (code[i] === '\\') i++
        i++
      }
      if (i < len && code[i] === '"') i++
      tokens.push({ type: TOKEN.STRING, value: code.slice(start, i) })
      lastType = TOKEN.STRING
      continue
    }

    // ── Single-quoted string  ' … '  ─────────────────────────────────────
    if (code[i] === "'") {
      const start = i++
      while (i < len && code[i] !== "'" && code[i] !== '\n') {
        if (code[i] === '\\') i++
        i++
      }
      if (i < len && code[i] === "'") i++
      tokens.push({ type: TOKEN.STRING, value: code.slice(start, i) })
      lastType = TOKEN.STRING
      continue
    }

    // ── Regex literal  / … /flags  ───────────────────────────────────────
    // Only recognised when the preceding meaningful token allows a regex.
    if (
      code[i] === '/' &&
      code[i + 1] !== '/' &&
      code[i + 1] !== '*' &&
      REGEX_ALLOWED_AFTER.has(lastType)
    ) {
      const start = i++
      let inClass = false
      while (i < len && code[i] !== '\n') {
        if (!inClass && code[i] === '/') break
        if (code[i] === '[') inClass = true
        else if (code[i] === ']') inClass = false
        if (code[i] === '\\') i++
        i++
      }
      if (i < len && code[i] === '/') i++ // closing /
      while (i < len && /[gimsuy]/.test(code[i])) i++ // flags
      tokens.push({ type: TOKEN.REGEX, value: code.slice(start, i) })
      lastType = TOKEN.REGEX
      continue
    }

    // ── Number literal  ──────────────────────────────────────────────────
    // Matches decimal, hex (0x), binary (0b), octal (0o), float, BigInt (n).
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
      }
      tokens.push({ type: TOKEN.NUMBER, value: code.slice(start, i) })
      lastType = TOKEN.NUMBER
      continue
    }

    // ── Identifier / keyword / type / browser-API  ───────────────────────
    if (/[a-zA-Z_$]/.test(code[i])) {
      const start = i
      while (i < len && /[a-zA-Z0-9_$]/.test(code[i])) i++
      const word = code.slice(start, i)
      let type
      if (KEYWORDS.has(word)) {
        type = TOKEN.KEYWORD
      } else if (TYPE_WORDS.has(word)) {
        type = TOKEN.TYPE
      } else if (BROWSER_API_WORDS.has(word)) {
        type = TOKEN.BROWSER_API
      } else {
        type = TOKEN.DEFAULT
      }
      tokens.push({ type, value: word })
      lastType = type
      continue
    }

    // ── Operator  ────────────────────────────────────────────────────────
    if (OP_START.test(code[i])) {
      const s = code.slice(i)
      let opLen = 1
      if (FOUR_CHAR_OPS.has(s.slice(0, 4))) opLen = 4
      else if (THREE_CHAR_OPS.has(s.slice(0, 3))) opLen = 3
      else if (TWO_CHAR_OPS.has(s.slice(0, 2))) opLen = 2
      tokens.push({ type: TOKEN.OPERATOR, value: code.slice(i, i + opLen) })
      lastType = TOKEN.OPERATOR
      i += opLen
      continue
    }

    // ── Whitespace / newlines / other characters  ─────────────────────────
    // Pushed as DEFAULT.  Whitespace does NOT update lastType so it does not
    // affect the regex/division heuristic.
    tokens.push({ type: TOKEN.DEFAULT, value: code[i] })
    if (code[i] !== ' ' && code[i] !== '\t' && code[i] !== '\n' && code[i] !== '\r') {
      lastType = TOKEN.DEFAULT
    }
    i++
  }

  return tokens
}
