'use client'

import styles from './FunctionListPanel.module.css'

/**
 * Kind icons used in the symbol list.
 * Using small text glyphs so no icon library is required.
 */
const KIND_ICON = {
  class:    'C',
  function: 'ƒ',
  method:   'm',
}

/**
 * FunctionListPanel renders an outline of code symbols extracted from the
 * active document.  Clicking a symbol jumps the editor to that line.
 *
 * Props:
 *   symbols   {{ name: string, line: number, kind: string }[]}
 *             Array of symbols produced by extractSymbols().
 *   language  {string|null}  Current document language ID.
 *   onJump    {function}     Called with a 1-based line number when the user
 *                            clicks a symbol entry.
 *   onClose   {function}     Called when the close button is clicked.
 */
export default function FunctionListPanel({ symbols, language, onJump, onClose }) {
  const hasSymbols = symbols && symbols.length > 0

  const handleItemClick = (sym) => {
    if (onJump) onJump(sym.line + 1) // editor goToLine is 1-based
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Function List</span>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close Function List"
          title="Close"
        >
          ×
        </button>
      </div>
      {hasSymbols ? (
        <ul className={styles.list} role="listbox" aria-label="Symbol list">
          {symbols.map((sym, idx) => (
            <li
              key={`${sym.line}-${sym.name}-${sym.kind}`}
              className={styles.item}
              role="option"
              aria-selected="false"
              onClick={() => handleItemClick(sym)}
              title={`${sym.kind} ${sym.name} (line ${sym.line + 1})`}
            >
              <i className={styles.kindIcon} aria-hidden="true">
                {KIND_ICON[sym.kind] ?? 'ƒ'}
              </i>
              <span className={styles.symbolName}>{sym.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          {!language
            ? 'No language selected.'
            : symbols
            ? 'No symbols found.'
            : 'Language not supported.'}
        </p>
      )}
    </div>
  )
}
