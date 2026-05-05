'use client'

import styles from './TabBar.module.css'

export default function TabBar({ tabs, activeTabId, onSelect, onClose }) {
  return (
    <div className={styles.tabBar} role="tablist" aria-label="Open files">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''}`}
          role="tab"
          aria-selected={tab.id === activeTabId}
          onClick={() => onSelect(tab.id)}
        >
          <span className={styles.tabName}>
            {tab.modified ? `${tab.name} \u25cf` : tab.name}
          </span>
          <button
            className={styles.closeButton}
            onClick={(e) => {
              e.stopPropagation()
              onClose(tab.id)
            }}
            aria-label={`Close ${tab.name}`}
            title="Close"
          >
            ×
          </button>
        </div>
      ))}
      <div className={styles.tabFill} />
    </div>
  )
}
