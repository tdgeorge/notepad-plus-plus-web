/**
 * generate-lang-data.mjs
 *
 * Reads PowerEditor/src/langs.model.xml from the Notepad++ C++ repository and
 * generates web/lib/languages/langdata.generated.js — a JavaScript module that
 * exports keyword Sets and language metadata used by the web tokenizers.
 *
 * Usage:
 *   node web/scripts/generate-lang-data.mjs
 *
 * Run from the repository root (notepad-plus-plus-web/).
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const XML_PATH = join(__dirname, '../../PowerEditor/src/langs.model.xml')
const OUT_PATH = join(__dirname, '../lib/languages/langdata.generated.js')

const xml = readFileSync(XML_PATH, 'utf-8')

// ── Minimal XML helpers ──────────────────────────────────────────────────────
// We only need to handle the predictable structure of langs.model.xml:
//   <Language name="..." ext="..." commentLine="..." commentStart="..." commentEnd="...">
//     <Keywords name="...">word1 word2 ...</Keywords>
//   </Language>

/**
 * Decode XML character entities we might encounter in langs.model.xml.
 * Uses a single-pass replacement to avoid any risk of double-decoding.
 */
function decodeEntities(str) {
  const NAMED = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }
  return str.replace(
    /&(?:#x([0-9a-fA-F]+)|#(\d+)|([a-zA-Z]+));/g,
    (_, hex, dec, named) => {
      if (hex) return String.fromCodePoint(parseInt(hex, 16))
      if (dec) return String.fromCodePoint(parseInt(dec, 10))
      return NAMED[named] ?? `&${named};`
    }
  )
}

/** Extract the value of an XML attribute by name (case-sensitive). */
function attr(tagText, name) {
  const re = new RegExp(`${name}="([^"]*)"`)
  const m = tagText.match(re)
  return m ? decodeEntities(m[1]) : ''
}

// ── Parse every <Language> element ──────────────────────────────────────────

// We want the languages referenced in the web Language menu:
const LANG_IDS = new Set([
  'ada', 'asm', 'asp', 'autoit', 'bash', 'batch', 'c', 'cs', 'cpp', 'css',
  'html', 'java', 'javascript.js', 'json', 'lua', 'makefile', 'php',
  'powershell', 'python', 'ruby', 'rust', 'sql', 'typescript', 'vb', 'xml',
  'yaml', 'd', 'go', 'perl', 'cobol', 'coffeescript', 'fortran', 'swift',
  'r', 'kotlin', 'haskell', 'gdscript', 'nim', 'toml',
])

const languages = {}

// Split on <Language ...> tags
const langBlocks = xml.split(/<Language\s/)
for (const block of langBlocks.slice(1)) {
  // Grab the opening tag text (everything up to the first > that closes it)
  const tagEndIdx = block.indexOf('>')
  if (tagEndIdx === -1) continue
  const tagText = block.slice(0, tagEndIdx)

  const name = attr(tagText, 'name')
  if (!LANG_IDS.has(name)) continue

  const ext = attr(tagText, 'ext')
  const commentLine = attr(tagText, 'commentLine')
  const commentStart = attr(tagText, 'commentStart')
  const commentEnd = attr(tagText, 'commentEnd')

  // Collect <Keywords name="...">...</Keywords> inside this Language block
  // (Language blocks end at </Language> or the next <Language)
  const bodyEnd = block.indexOf('</Language>')
  const body = bodyEnd !== -1 ? block.slice(tagEndIdx + 1, bodyEnd) : block.slice(tagEndIdx + 1)

  const keywords = {}
  const kwRe = /<Keywords\s+name="([^"]+)">([^<]*)<\/Keywords>/g
  let kwMatch
  while ((kwMatch = kwRe.exec(body)) !== null) {
    const kwName = kwMatch[1]
    const kwText = kwMatch[2].trim()
    if (kwText) {
      keywords[kwName] = kwText.split(/\s+/).filter(Boolean)
    }
  }

  languages[name] = { ext: ext.split(/\s+/).filter(Boolean), commentLine, commentStart, commentEnd, keywords }
}

// ── Emit the generated JS module ─────────────────────────────────────────────

function jsSet(words) {
  if (!words || words.length === 0) return 'new Set()'
  // Sort for deterministic output; wrap each word in single quotes,
  // 8 words per line for readability.
  const sorted = [...words].sort()
  const lines = []
  for (let i = 0; i < sorted.length; i += 8) {
    lines.push('  ' + sorted.slice(i, i + 8).map(w => JSON.stringify(w)).join(', ') + ',')
  }
  return `new Set([\n${lines.join('\n')}\n])`
}

const lines = [
  '// AUTO-GENERATED — do not edit by hand.',
  '// Run: node web/scripts/generate-lang-data.mjs',
  '// Source: PowerEditor/src/langs.model.xml',
  '',
  '/** @type {Record<string, { ext: string[], commentLine: string, commentStart: string, commentEnd: string }>} */',
  'export const LANG_META = {',
]

for (const [name, info] of Object.entries(languages)) {
  lines.push(`  ${JSON.stringify(name)}: {`)
  lines.push(`    ext: ${JSON.stringify(info.ext)},`)
  lines.push(`    commentLine: ${JSON.stringify(info.commentLine)},`)
  lines.push(`    commentStart: ${JSON.stringify(info.commentStart)},`)
  lines.push(`    commentEnd: ${JSON.stringify(info.commentEnd)},`)
  lines.push(`  },`)
}
lines.push('}', '')

// Emit keyword sets per language
for (const [name, info] of Object.entries(languages)) {
  const varName = name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()
  const { keywords } = info

  // instre1 → KEYWORDS, type1 → TYPES, instre2 → BUILTINS
  const instre1 = keywords['instre1'] || []
  const type1 = keywords['type1'] || []
  const instre2 = keywords['instre2'] || []
  const type2 = keywords['type2'] || []

  lines.push(`// ── ${name} ─────────────────────────────────────`)
  lines.push(`export const ${varName}_KEYWORDS = ${jsSet(instre1)}`)
  lines.push(`export const ${varName}_TYPES = ${jsSet([...type1, ...type2])}`)
  lines.push(`export const ${varName}_BUILTINS = ${jsSet(instre2)}`)
  lines.push('')
}

writeFileSync(OUT_PATH, lines.join('\n'), 'utf-8')
console.log(`Generated ${OUT_PATH}`)
console.log(`Languages: ${Object.keys(languages).join(', ')}`)
