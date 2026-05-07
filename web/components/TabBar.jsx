'use client'

import styles from './TabBar.module.css'

const TAB_COLORS = {
  1: { bg: '#f5d76e', text: '#333' },
  2: { bg: '#a8d8a8', text: '#1a3a1a' },
  3: { bg: '#7ec8e3', text: '#0d3349' },
  4: { bg: '#f9a66c', text: '#4a1a00' },
  5: { bg: '#d9a0d0', text: '#3a0a3a' },
}

export default function TabBar({ tabs, activeTabId, onSelect, onClose }) {
  return (
    <div className={styles.tabBar} role="tablist" aria-label="Open files">
      {tabs.map((tab) => {
        const colorStyle = tab.color ? TAB_COLORS[tab.color] : null
        return (
          <div
            key={tab.id}
            className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''}`}
            role="tab"
            aria-selected={tab.id === activeTabId}
            onClick={() => onSelect(tab.id)}
            style={colorStyle ? { backgroundColor: colorStyle.bg, color: colorStyle.text } : undefined}
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
        )
      })}
      <div className={styles.tabFill} />
    </div>
  )
}
