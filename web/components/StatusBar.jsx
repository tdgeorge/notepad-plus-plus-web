'use client'

import styles from './StatusBar.module.css'

/** Human-readable display name for each language identifier */
const LANG_LABELS = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  c: 'C',
  cpp: 'C++',
  cs: 'C#',
  java: 'Java',
  html: 'HTML',
  xml: 'XML',
  css: 'CSS',
  json: 'JSON',
  yaml: 'YAML',
  markdown: 'Markdown',
  sql: 'SQL',
  bash: 'Bash',
  lua: 'Lua',
  rust: 'Rust',
  php: 'PHP',
  powershell: 'PowerShell',
  ruby: 'Ruby',
  vb: 'VBScript',
  ada: 'Ada',
  asm: 'Assembly',
  asp: 'ASP',
  autoit: 'AutoIt',
  batch: 'Batch',
  makefile: 'Makefile',
  d: 'D',
  go: 'Go',
  perl: 'Perl',
  coffeescript: 'CoffeeScript',
  swift: 'Swift',
  gdscript: 'GDScript',
  cobol: 'COBOL',
  fortran: 'Fortran',
  fortran77: 'Fortran (fixed form)',
  haskell: 'Haskell',
  nim: 'Nim',
  r: 'R',
  toml: 'TOML',
  flash: 'ActionScript',
  asn1: 'ASN.1',
  avs: 'AviSynth',
  baanc: 'BaanC',
  blitzbasic: 'Blitzbasic',
  caml: 'Caml',
  cmake: 'CMake',
  csound: 'CSound',
  diff: 'Diff',
  erlang: 'Erlang',
  errorlist: 'ErrorList',
  escript: 'ESCRIPT',
  forth: 'Forth',
  freebasic: 'Freebasic',
  gui4cli: 'Gui4Cli',
  hollywood: 'Hollywood',
  ini: 'INI file',
  inno: 'Inno Setup',
  ihex: 'Intel HEX',
  json5: 'JSON5',
  jsp: 'JSP',
  kix: 'KIXtart',
  latex: 'LaTeX',
  lisp: 'LISP',
  matlab: 'Matlab',
  mssql: 'Microsoft Transact-SQL',
  mmixal: 'MMIXAL',
  ascii: 'MS-DOS Style',
  nncrontab: 'Nncrontab',
  nsis: 'NSIS',
  objc: 'Objective-C',
  oscript: 'OScript',
  pascal: 'Pascal',
  ps: 'PostScript',
  props: 'Properties',
  purebasic: 'Purebasic',
  raku: 'Raku',
  rebol: 'REBOL',
  registry: 'Registry',
  rc: 'Resource file',
  sas: 'SAS',
  scheme: 'Scheme',
  smalltalk: 'Smalltalk',
  spice: 'Spice',
  srec: 'S-Record',
  tcl: 'TCL',
  tehex: 'Tektronix extended HEX',
  tex: 'TeX',
  txt2tags: 'txt2tags',
  visualprolog: 'Visual Prolog',
  vhdl: 'VHDL',
  verilog: 'Verilog',
}

export default function StatusBar({ cursorPos, eol, encoding, language, isLargeFile }) {
  const { line = 1, col = 1, sel = 0 } = cursorPos ?? {}
  const langLabel = language ? (LANG_LABELS[language] ?? language) : 'Plain Text'

  return (
    <div className={styles.statusBar} role="status" aria-live="polite" aria-label="Status bar">
      <div className={styles.section}>
        <span>Ln : {line}</span>
        <span>Col : {col}</span>
        <span>Sel : {sel} | 0</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.rowBreak} />
      <div className={styles.section}>
        <span>{eol}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <span>{encoding}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <span>{langLabel}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <span>INS</span>
      </div>
      {isLargeFile && (
        <>
          <div className={styles.divider} />
          <div className={styles.section}>
            <span className={styles.largeFileBadge} title="Syntax highlighting and code folding are disabled for large files">Large File</span>
          </div>
        </>
      )}
    </div>
  )
}
