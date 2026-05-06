'use client'

import { useEffect, useRef } from 'react'
import styles from './WindowsDialog.module.css'

export default function WindowsDialog({ isOpen, tabs, view2Tabs, activeTabId, view2ActiveTabId, onActivate, onClose }) {
  const closeBtnRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => closeBtnRef.current?.focus(), 0)
    }
  }, [isOpen])

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

  const allTabs = [
    ...tabs.map((t) => ({ ...t, view: 1 })),
    ...view2Tabs.map((t) => ({ ...t, view: 2 })),
  ]

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Windows">
        <div className={styles.titleBar}>
          <span>Windows</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={styles.body}>
          <ul className={styles.list} role="listbox" aria-label="Open documents">
            {allTabs.map((tab) => {
              const isActive = (tab.view === 1 && tab.id === activeTabId) ||
                (tab.view === 2 && tab.id === view2ActiveTabId)
              return (
                <li
                  key={`${tab.view}-${tab.id}`}
                  className={`${styles.listItem} ${isActive ? styles.active : ''}`}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => { onActivate(tab.id, tab.view); onClose() }}
                >
                  <span className={styles.tabName}>
                    {tab.modified ? `${tab.name} \u25cf` : tab.name}
                  </span>
                  {view2Tabs.length > 0 && (
                    <span className={styles.viewBadge}>View {tab.view}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        <div className={styles.buttons}>
          <button ref={closeBtnRef} className={styles.btn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
