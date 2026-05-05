/**
 * Language registry for syntax highlighting.
 *
 * Maps file extensions to language identifiers and provides the tokenizer
 * function for each supported language.
 *
 * Currently supported:
 *   javascript — .js  .jsm  .jsx  .mjs  .vue
 *     (extensions from PowerEditor/src/langs.model.xml, javascript.js entry)
 */

import { tokenize as tokenizeJS } from './javascript'

/** Map of file extension (lower-case, without dot) → language identifier */
const EXTENSION_MAP = {
  js: 'javascript',
  jsm: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  vue: 'javascript',
}

/** Map of language identifier → tokenizer function */
export const TOKENIZERS = {
  javascript: tokenizeJS,
}

/**
 * Detect the language from a file name (or path).
 * Returns a language identifier string, or `null` if unrecognised.
 *
 * @param {string|null|undefined} filename
 * @returns {string|null}
 */
export function detectLanguage(filename) {
  if (!filename) return null
  // Strip any leading path components before inspecting the extension so that
  // dots in directory names (e.g. "my.folder/file") do not produce false matches.
  const basename = filename.split(/[\\/]/).pop() ?? ''
  const dotIdx = basename.lastIndexOf('.')
  if (dotIdx === -1) return null // no extension (e.g. "README", "Makefile")
  const ext = basename.slice(dotIdx + 1).toLowerCase()
  return EXTENSION_MAP[ext] ?? null
}
