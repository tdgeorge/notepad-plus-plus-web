/**
 * functionList.mjs — Extract code symbols (functions, classes, methods) from
 * source text for the Function List panel.
 *
 * Each returned symbol has the shape:
 *   { name: string, line: number (0-based), kind: 'function'|'class'|'method' }
 */

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Control-flow keywords that look like function calls but are not symbols. */
const JS_CONTROL_FLOW = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'catch', 'finally',
  'return', 'throw', 'typeof', 'instanceof', 'void', 'delete', 'new',
  'yield', 'await', 'case', 'import', 'export',
])

const C_CONTROL_FLOW = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'catch', 'finally',
  'return', 'goto', 'sizeof', 'typeof', 'delete', 'new', 'throw',
  'case', 'namespace', 'using', 'template', 'explicit', 'operator',
])

// ── Language-specific extractors ─────────────────────────────────────────────

/**
 * Extract symbols from JavaScript or TypeScript source.
 *
 * Recognised patterns:
 *   • function declarations / generators / async variants
 *   • class declarations
 *   • const/let/var arrow-function and function-expression assignments
 *   • shorthand method definitions (inside class bodies or object literals)
 *   • TypeScript interface members (function signatures)
 */
function extractJsSymbols(lines) {
  const symbols = []

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trimStart()

    // Skip blank lines and comment lines
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      continue
    }

    // ── class Name / abstract class Name / export [default] class Name ──────
    let m = trimmed.match(
      /^(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?class\s+(\w+)/
    )
    if (m) {
      symbols.push({ name: m[1], line: i, kind: 'class' })
      continue
    }

    // ── function [*] name / async function [*] name ──────────────────────────
    m = trimmed.match(
      /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*(\w+)\s*[(<]/
    )
    if (m) {
      symbols.push({ name: m[1], line: i, kind: 'function' })
      continue
    }

    // ── const/let/var name = [async] (...) => / function ────────────────────
    m = trimmed.match(
      /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>|\w+\s*=>)/
    )
    if (m) {
      symbols.push({ name: m[1], line: i, kind: 'function' })
      continue
    }

    // ── [async] methodName( …  ──────────────────────────────────────────────
    // Matches indented shorthand methods (class bodies, object literals).
    // The line must start with whitespace (indented), then optionally
    // access modifiers / async / static, then an identifier followed by '('.
    m = raw.match(
      /^\s+(?:(?:public|private|protected|static|abstract|override|readonly|async|get|set)\s+)*(\w+)\s*\(/
    )
    if (m && !JS_CONTROL_FLOW.has(m[1]) && m[1] !== 'constructor') {
      symbols.push({ name: m[1], line: i, kind: 'method' })
      continue
    }

    // ── constructor ──────────────────────────────────────────────────────────
    m = raw.match(/^\s+constructor\s*\(/)
    if (m) {
      symbols.push({ name: 'constructor', line: i, kind: 'method' })
      continue
    }
  }

  return symbols
}

/**
 * Extract symbols from Python source.
 *
 * Recognised patterns:
 *   • def / async def function definitions
 *   • class declarations
 */
function extractPythonSymbols(lines) {
  const symbols = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart()

    if (!trimmed || trimmed.startsWith('#')) continue

    // ── class Name[(...)] ────────────────────────────────────────────────────
    let m = trimmed.match(/^class\s+(\w+)/)
    if (m) {
      symbols.push({ name: m[1], line: i, kind: 'class' })
      continue
    }

    // ── [async] def name( ────────────────────────────────────────────────────
    m = trimmed.match(/^(?:async\s+)?def\s+(\w+)\s*\(/)
    if (m) {
      const kind = lines[i].match(/^\S/) ? 'function' : 'method'
      symbols.push({ name: m[1], line: i, kind })
      continue
    }
  }

  return symbols
}

/**
 * Extract symbols from C-family languages (C, C++, C#, Java, Go, Swift, Rust).
 *
 * Strategy: scan for lines that look like function/method signatures:
 *   – contain an identifier followed by '(' before any ';'
 *   – not a control-flow keyword
 *   – not a type cast or macro invocation
 *   – for class/struct/interface/enum declarations
 */
function extractCLikeSymbols(lines) {
  const symbols = []

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trimStart()

    if (!trimmed) continue

    // Skip pure comment lines
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('#')) {
      continue
    }

    // ── class / struct / interface / enum Name ───────────────────────────────
    let m = trimmed.match(
      /^(?:(?:public|private|protected|internal|abstract|sealed|static|partial|readonly|final|open|data|value|enum)\s+)*(?:class|struct|interface|enum|record|union|trait|impl)\s+(\w+)/
    )
    if (m) {
      symbols.push({ name: m[1], line: i, kind: 'class' })
      continue
    }

    // ── function/method definition ───────────────────────────────────────────
    // Must have identifier immediately before '(' and no ';' before the '('
    // (a ';' indicates a forward declaration we may still want to list, but
    // skip variable declarations that end with ';' but have no '(').
    if (!trimmed.includes('(')) continue

    // Skip lines that are clearly variable declarations or #define
    if (/^\s*#/.test(raw)) continue

    // Find the first '(' on the line
    const parenIdx = trimmed.indexOf('(')
    const beforeParen = trimmed.slice(0, parenIdx)

    // Skip if ';' appears before '(' (e.g. "int x; func(")  – unlikely but guard
    if (beforeParen.includes(';')) continue

    // Extract the identifier immediately before '('
    const identMatch = beforeParen.match(/(\w+)\s*$/)
    if (!identMatch) continue
    const name = identMatch[1]

    // Exclude control-flow keywords and common false-positive identifiers
    if (C_CONTROL_FLOW.has(name)) continue

    // Exclude identifiers that are only uppercase (macros / constants)
    if (/^[A-Z_][A-Z0-9_]*$/.test(name)) continue

    // The line should look like a definition, not a function call:
    // heuristic — if the line starts with an identifier (possibly with
    // modifiers) rather than being deeply indented "call" lines we accept it.
    // We allow both top-level and indented (method-level) lines.
    const kind = /^\s/.test(raw) ? 'method' : 'function'
    symbols.push({ name, line: i, kind })
  }

  return symbols
}

/**
 * Extract symbols from Ruby source.
 */
function extractRubySymbols(lines) {
  const symbols = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart()
    if (!trimmed || trimmed.startsWith('#')) continue

    // class / module
    let m = trimmed.match(/^(?:class|module)\s+(\w+)/)
    if (m) {
      symbols.push({ name: m[1], line: i, kind: 'class' })
      continue
    }

    // def [self.]name
    m = trimmed.match(/^def\s+(?:self\.)?(\w+)/)
    if (m) {
      const kind = /^\s/.test(lines[i]) ? 'method' : 'function'
      symbols.push({ name: m[1], line: i, kind })
      continue
    }
  }

  return symbols
}

/**
 * Extract symbols from PHP source.
 */
function extractPhpSymbols(lines) {
  const symbols = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart()
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#')) continue

    // class / interface / trait
    let m = trimmed.match(/^(?:(?:abstract|final)\s+)?(?:class|interface|trait)\s+(\w+)/)
    if (m) {
      symbols.push({ name: m[1], line: i, kind: 'class' })
      continue
    }

    // function name( / public function name(
    m = trimmed.match(/^(?:(?:public|protected|private|static|abstract|final)\s+)*function\s+(\w+)\s*\(/)
    if (m) {
      const kind = /^\s/.test(lines[i]) ? 'method' : 'function'
      symbols.push({ name: m[1], line: i, kind })
      continue
    }
  }

  return symbols
}

// ── Language router ──────────────────────────────────────────────────────────

/**
 * Extract symbols from `content` based on the Notepad++ web language ID.
 *
 * Returns an array of `{ name, line, kind }` objects sorted by `line`.
 * Returns an empty array when the language is unknown or unsupported.
 *
 * @param {string} content   Full document text
 * @param {string|null} language  Language ID (e.g. 'javascript', 'python')
 * @returns {{ name: string, line: number, kind: string }[]}
 */
export function extractSymbols(content, language) {
  if (!content || !language) return []
  const lines = content.split('\n')

  switch (language) {
    case 'javascript':
    case 'typescript':
      return extractJsSymbols(lines)

    case 'python':
      return extractPythonSymbols(lines)

    case 'c':
    case 'cpp':
    case 'cs':
    case 'java':
    case 'go':
    case 'swift':
    case 'rust':
    case 'd':
    case 'kotlin':
    case 'gdscript':
      return extractCLikeSymbols(lines)

    case 'ruby':
      return extractRubySymbols(lines)

    case 'php':
      return extractPhpSymbols(lines)

    default:
      return []
  }
}

/**
 * Returns true when the given language ID is supported by the function list.
 *
 * @param {string|null} language
 * @returns {boolean}
 */
export function isFunctionListSupported(language) {
  if (!language) return false
  return [
    'javascript', 'typescript',
    'python',
    'c', 'cpp', 'cs', 'java', 'go', 'swift', 'rust', 'd', 'kotlin', 'gdscript',
    'ruby',
    'php',
  ].includes(language)
}
