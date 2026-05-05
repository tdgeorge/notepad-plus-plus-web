'use client'

import { useEffect, useRef, useState } from 'react'
import { THEMES } from '../lib/themes'
import styles from './StyleConfiguratorDialog.module.css'

export default function StyleConfiguratorDialog({ isOpen, currentThemeId, onApply, onClose }) {
  const [selected, setSelected] = useState(currentThemeId)
  const closeBtnRef = useRef(null)

  // Keep local selection in sync when the dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelected(currentThemeId)
      setTimeout(() => closeBtnRef.current?.focus(), 0)
    }
  }, [isOpen, currentThemeId])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const selectedTheme = THEMES.find((t) => t.id === selected) ?? THEMES[0]

  const handleOk = () => {
    onApply(selected)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Style Configurator"
      >
        <div className={styles.titleBar}>
          <span>Style Configurator</span>
          <button
            ref={closeBtnRef}
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.columns}>
            {/* Theme list */}
            <div className={styles.themePanel}>
              <div className={styles.panelTitle}>Select theme</div>
              <ul className={styles.themeList} role="listbox" aria-label="Available themes">
                {THEMES.map((theme) => (
                  <li
                    key={theme.id}
                    className={`${styles.themeItem} ${selected === theme.id ? styles.themeItemSelected : ''}`}
                    role="option"
                    aria-selected={selected === theme.id}
                    onClick={() => setSelected(theme.id)}
                  >
                    {theme.name}
                    {theme.id === currentThemeId && (
                      <span className={styles.activeBadge}>active</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Theme preview / description */}
            <div className={styles.previewPanel}>
              <div className={styles.panelTitle}>Preview</div>
              <ThemePreview theme={selectedTheme} />
              <p className={styles.description}>{selectedTheme.description}</p>
            </div>
          </div>
        </div>

        <div className={styles.buttons}>
          <button className={styles.btnPrimary} onClick={handleOk}>
            OK
          </button>
          <button className={styles.btn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/** Renders a small pixel-perfect preview swatch for a theme. */
function ThemePreview({ theme }) {
  const v = theme.variables
  return (
    <div
      className={styles.preview}
      style={{
        background: v['--chrome-bg'],
        border: `1px solid ${v['--chrome-border']}`,
        borderRadius: v['--dialog-radius'] === '0px' ? '2px' : '8px',
        fontFamily: v['--font-ui'],
      }}
    >
      {/* Menu bar strip */}
      <div
        className={styles.previewMenuBar}
        style={{
          background: v['--chrome-bg'],
          borderBottom: `1px solid ${v['--chrome-border']}`,
        }}
      >
        <span
          className={styles.previewMenuActive}
          style={{
            background: v['--accent'],
            color: v['--accent-text'],
            borderRadius: v['--ui-radius'],
          }}
        >
          File
        </span>
        <span className={styles.previewMenuItem} style={{ color: v['--chrome-text'] }}>
          Edit
        </span>
        <span className={styles.previewMenuItem} style={{ color: v['--chrome-text'] }}>
          View
        </span>
      </div>

      {/* Tab bar */}
      <div
        className={styles.previewTabBar}
        style={{ background: v['--tab-bar-bg'] }}
      >
        <span
          className={styles.previewTabActive}
          style={{
            background: v['--tab-active-bg'],
            color: v['--tab-active-text'],
            borderRadius: v['--tab-radius'],
            border: `1px solid ${v['--chrome-border']}`,
            borderBottom: 'none',
          }}
        >
          untitled
        </span>
        <span
          className={styles.previewTabInactive}
          style={{
            background: v['--tab-inactive-bg'],
            color: v['--tab-inactive-text'],
            borderRadius: v['--tab-radius'],
            border: `1px solid ${v['--chrome-border']}`,
            borderBottom: 'none',
          }}
        >
          file.txt
        </span>
      </div>

      {/* Editor area */}
      <div
        className={styles.previewEditor}
        style={{ background: v['--editor-bg'] }}
      >
        <div
          className={styles.previewGutter}
          style={{
            background: v['--editor-gutter-bg'],
            borderRight: `1px solid ${v['--editor-gutter-border']}`,
            color: v['--editor-gutter-fg'],
          }}
        >
          <div>1</div>
          <div>2</div>
          <div>3</div>
        </div>
        <div
          className={styles.previewCode}
          style={{ color: v['--editor-fg'], fontFamily: v['--font-editor'] }}
        >
          <div>
            <span style={{ color: '#0000ff' }}>function</span>{' '}
            <span style={{ color: '#795e26' }}>hello</span>
            {'() {'}
          </div>
          <div>
            {'  '}<span style={{ color: '#0070c1' }}>return</span>{' '}
            <span style={{ color: '#a31515' }}>&quot;world&quot;</span>
          </div>
          <div>{'}'}</div>
        </div>
      </div>
    </div>
  )
}
