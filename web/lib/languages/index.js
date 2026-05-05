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
  const ext = filename.split('.').pop().toLowerCase()
  return EXTENSION_MAP[ext] ?? null
}
