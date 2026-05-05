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
}

export default function StatusBar({ cursorPos, eol, encoding, language }) {
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
    </div>
  )
}
