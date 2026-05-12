'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from './TabBar.module.css'
import { getOrderedTabs } from '../lib/pinnedTabs.mjs'

const TAB_COLORS = {
  1: { bg: '#f5d76e', text: '#333' },
  2: { bg: '#a8d8a8', text: '#1a3a1a' },
  3: { bg: '#7ec8e3', text: '#0d3349' },
  4: { bg: '#f9a66c', text: '#4a1a00' },
  5: { bg: '#d9a0d0', text: '#3a0a3a' },
}

export default function TabBar({ tabs, activeTabId, onSelect, onClose, onTogglePin }) {
  const [contextMenu, setContextMenu] = useState(null)
  const orderedTabs = useMemo(() => getOrderedTabs(tabs), [tabs])

  useEffect(() => {
    if (!contextMenu) return undefined
    const close = () => setContextMenu(null)
    document.addEventListener('click', close)
    document.addEventListener('contextmenu', close)
    document.addEventListener('keydown', close)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('contextmenu', close)
      document.removeEventListener('keydown', close)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [contextMenu])

  return (
    <div className={styles.tabBar} role="tablist" aria-label="Open files">
      {orderedTabs.map((tab, index) => {
        const colorStyle = tab.color ? TAB_COLORS[tab.color] : null
        const prev = orderedTabs[index - 1]
        const showPinnedDivider = index > 0 && Boolean(prev?.pinned) && !tab.pinned
        return (
          <div key={tab.id} className={styles.tabSlot}>
            {showPinnedDivider && <div className={styles.pinnedDivider} aria-hidden="true" />}
            <div
              className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''} ${tab.pinned ? styles.pinned : ''}`}
              role="tab"
              aria-selected={tab.id === activeTabId}
              onClick={() => onSelect(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                setContextMenu({ tabId: tab.id, x: e.clientX, y: e.clientY })
              }}
              style={colorStyle ? { backgroundColor: colorStyle.bg, color: colorStyle.text } : undefined}
            >
              <span className={styles.tabName}>
                {tab.pinned ? '\uD83D\uDCCC ' : ''}
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
          </div>
        )
      })}
      <div className={styles.tabFill} />
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              onTogglePin?.(contextMenu.tabId)
              setContextMenu(null)
            }}
            role="menuitem"
          >
            {tabs.find((tab) => tab.id === contextMenu.tabId)?.pinned ? 'Unpin Tab' : 'Pin Tab'}
          </button>
        </div>
      )}
    </div>
  )
}
