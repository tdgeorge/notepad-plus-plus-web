'use client'

import styles from './StatusBar.module.css'

export default function StatusBar({ cursorPos, eol, encoding }) {
  const { line = 1, col = 1, sel = 0 } = cursorPos ?? {}

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
        <span>INS</span>
      </div>
    </div>
  )
}
