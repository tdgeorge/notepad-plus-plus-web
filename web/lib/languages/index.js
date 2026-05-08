/**
 * Language registry for syntax highlighting.
 *
 * Maps file extensions to language identifiers and provides the tokenizer
 * function for each supported language.
 *
 * Keyword data is sourced from the Notepad++ C++ codebase:
 *   PowerEditor/src/langs.model.xml  — keyword sets and file-extension mappings
 *
 * To regenerate langdata.generated.js after updating langs.model.xml:
 *   node web/scripts/generate-lang-data.mjs
 */

import { tokenize as tokenizeJS } from './javascript'
import { tokenize as tokenizeTS } from './typescript'
import { tokenize as tokenizePython } from './python'
import { tokenize as tokenizeC } from './c'
import { tokenize as tokenizeCPP } from './cpp'
import { tokenize as tokenizeCS } from './cs'
import { tokenize as tokenizeJava } from './java'
import { tokenize as tokenizeHTML } from './html'
import { tokenize as tokenizeXML } from './xml'
import { tokenize as tokenizeCSS } from './css'
import { tokenize as tokenizeJSON } from './json'
import { tokenize as tokenizeYAML } from './yaml'
import { tokenize as tokenizeMarkdown } from './markdown'
import { tokenize as tokenizeSQL } from './sql'
import { tokenize as tokenizeBash } from './bash'
import { tokenize as tokenizeLua } from './lua'
import { tokenize as tokenizeRust } from './rust'
import { tokenize as tokenizePHP } from './php'
import { tokenize as tokenizePowerShell } from './powershell'
import { tokenize as tokenizeRuby } from './ruby'
import { tokenize as tokenizeVB } from './vb'
import { tokenize as tokenizeAda } from './ada'
import { tokenize as tokenizeASM } from './asm'
import { tokenize as tokenizeASP } from './asp'
import { tokenize as tokenizeAutoIt } from './autoit'
import { tokenize as tokenizeBatch } from './batch'
import { tokenize as tokenizeMakefile } from './makefile'
import { tokenize as tokenizeD } from './d'
import { tokenize as tokenizeGo } from './go'
import { tokenize as tokenizePerl } from './perl'
import { tokenize as tokenizeCoffeeScript } from './coffeescript'
import { tokenize as tokenizeSwift } from './swift'
import { tokenize as tokenizeGDScript } from './gdscript'
import { tokenize as tokenizeCobol } from './cobol'
import { tokenize as tokenizeFortran } from './fortran'
import { tokenize as tokenizeHaskell } from './haskell'
import { tokenize as tokenizeNim } from './nim'
import { tokenize as tokenizeR } from './r'
import { tokenize as tokenizeToml } from './toml'

/** Map of file extension (lower-case, without dot) → language identifier */
const EXTENSION_MAP = {
  // JavaScript / TypeScript
  js: 'javascript',
  jsm: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  vue: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  // Python
  py: 'python',
  pyw: 'python',
  pyx: 'python',
  pxd: 'python',
  pxi: 'python',
  pyi: 'python',
  // C / C++ / C# / Java
  c: 'c',
  lex: 'c',
  cpp: 'cpp',
  cxx: 'cpp',
  cc: 'cpp',
  h: 'cpp',
  hh: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  ino: 'cpp',
  cs: 'cs',
  java: 'java',
  // Web
  html: 'html',
  htm: 'html',
  shtml: 'html',
  shtm: 'html',
  xhtml: 'html',
  xht: 'html',
  hta: 'html',
  css: 'css',
  json: 'json',
  // XML variants
  xml: 'xml',
  xaml: 'xml',
  xsl: 'xml',
  xslt: 'xml',
  xsd: 'xml',
  xul: 'xml',
  kml: 'xml',
  svg: 'xml',
  mxml: 'xml',
  wsdl: 'xml',
  plist: 'xml',
  csproj: 'xml',
  vbproj: 'xml',
  // YAML
  yml: 'yaml',
  yaml: 'yaml',
  // Markdown
  md: 'markdown',
  markdown: 'markdown',
  // SQL
  sql: 'sql',
  // Shell / Bash
  sh: 'bash',
  bash: 'bash',
  bsh: 'bash',
  csh: 'bash',
  bashrc: 'bash',
  bash_profile: 'bash',
  profile: 'bash',
  // Lua
  lua: 'lua',
  // Rust
  rs: 'rust',
  // PHP
  php: 'php',
  php3: 'php',
  php4: 'php',
  php5: 'php',
  phps: 'php',
  phpt: 'php',
  phtml: 'php',
  // PowerShell
  ps1: 'powershell',
  psm1: 'powershell',
  psd1: 'powershell',
  // Ruby
  rb: 'ruby',
  rbw: 'ruby',
  // VBScript / VBA
  vb: 'vb',
  vba: 'vb',
  vbs: 'vb',
  // Ada
  ada: 'ada',
  ads: 'ada',
  adb: 'ada',
  // Assembly
  asm: 'asm',
  // AutoIt
  au3: 'autoit',
  // ASP
  asp: 'asp',
  aspx: 'asp',
  // Batch
  bat: 'batch',
  cmd: 'batch',
  nt: 'batch',
  // Makefile
  mak: 'makefile',
  mk: 'makefile',
  // D
  d: 'd',
  // Go
  go: 'go',
  // COBOL
  cbl: 'cobol',
  cob: 'cobol',
  cpy: 'cobol',
  copy: 'cobol',
  // Fortran
  f: 'fortran',
  for: 'fortran',
  f90: 'fortran',
  f95: 'fortran',
  f2k: 'fortran',
  f23: 'fortran',
  // Haskell
  hs: 'haskell',
  lhs: 'haskell',
  // Nim
  nim: 'nim',
  // R
  r: 'r',
  s: 'r',
  // TOML
  toml: 'toml',
  // Perl
  pl: 'perl',
  pm: 'perl',
  plx: 'perl',
  // CoffeeScript
  coffee: 'coffeescript',
  litcoffee: 'coffeescript',
  // Swift
  swift: 'swift',
  // GDScript
  gd: 'gdscript',
}

/** Map of language identifier → tokenizer function */
export const TOKENIZERS = {
  javascript: tokenizeJS,
  typescript: tokenizeTS,
  python: tokenizePython,
  c: tokenizeC,
  cpp: tokenizeCPP,
  cs: tokenizeCS,
  java: tokenizeJava,
  html: tokenizeHTML,
  xml: tokenizeXML,
  css: tokenizeCSS,
  json: tokenizeJSON,
  yaml: tokenizeYAML,
  markdown: tokenizeMarkdown,
  sql: tokenizeSQL,
  bash: tokenizeBash,
  lua: tokenizeLua,
  rust: tokenizeRust,
  php: tokenizePHP,
  powershell: tokenizePowerShell,
  ruby: tokenizeRuby,
  vb: tokenizeVB,
  ada: tokenizeAda,
  asm: tokenizeASM,
  asp: tokenizeASP,
  autoit: tokenizeAutoIt,
  batch: tokenizeBatch,
  makefile: tokenizeMakefile,
  d: tokenizeD,
  go: tokenizeGo,
  perl: tokenizePerl,
  coffeescript: tokenizeCoffeeScript,
  swift: tokenizeSwift,
  gdscript: tokenizeGDScript,
  cobol: tokenizeCobol,
  fortran: tokenizeFortran,
  fortran77: tokenizeFortran,
  haskell: tokenizeHaskell,
  nim: tokenizeNim,
  r: tokenizeR,
  toml: tokenizeToml,
  // Legacy aliases from existing menu actions/state
  au3: tokenizeAutoIt,
  golang: tokenizeGo,
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
