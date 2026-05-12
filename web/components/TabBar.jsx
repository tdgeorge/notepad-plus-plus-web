'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './TabBar.module.css'
import { getOrderedTabs } from '../lib/pinnedTabs.mjs'

const DOUBLE_TAP_MS = 350
const DOUBLE_TAP_MAX_MOVE = 24

const TAB_COLORS = {
  1: { bg: '#f5d76e', text: '#333' },
  2: { bg: '#a8d8a8', text: '#1a3a1a' },
  3: { bg: '#7ec8e3', text: '#0d3349' },
  4: { bg: '#f9a66c', text: '#4a1a00' },
  5: { bg: '#d9a0d0', text: '#3a0a3a' },
}

export default function TabBar({ tabs, activeTabId, onSelect, onClose, onTogglePin }) {
  const [contextMenu, setContextMenu] = useState(null)
  const lastTouchTapRef = useRef(null)
  const orderedTabs = useMemo(() => getOrderedTabs(tabs), [tabs])

  const openTabContextMenu = (tabId, x, y) => {
    setContextMenu({ tabId, x, y })
  }

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
                openTabContextMenu(tab.id, e.clientX, e.clientY)
              }}
              onTouchEnd={(e) => {
                const target = e.target
                if (target && typeof target.closest === 'function' && target.closest('button')) return
                const touch = e.changedTouches?.[0]
                if (!touch) return
                const now = Date.now()
                const lastTap = lastTouchTapRef.current
                const isSameTab = lastTap?.tabId === tab.id
                const isWithinTime = Boolean(lastTap && now - lastTap.time <= DOUBLE_TAP_MS)
                const dx = lastTap ? Math.abs(touch.clientX - lastTap.x) : Infinity
                const dy = lastTap ? Math.abs(touch.clientY - lastTap.y) : Infinity
                const isWithinDistance = dx <= DOUBLE_TAP_MAX_MOVE && dy <= DOUBLE_TAP_MAX_MOVE
                if (isSameTab && isWithinTime && isWithinDistance) {
                  e.preventDefault()
                  openTabContextMenu(tab.id, touch.clientX, touch.clientY)
                  lastTouchTapRef.current = null
                  return
                }
                lastTouchTapRef.current = {
                  tabId: tab.id,
                  time: now,
                  x: touch.clientX,
                  y: touch.clientY,
                }
              }}
              style={colorStyle ? { backgroundColor: colorStyle.bg, color: colorStyle.text } : undefined}
            >
              <span className={styles.tabName}>
                {tab.pinned ? (
                  <>
                    <span className={styles.srOnly}>Pinned </span>
                    <span className={styles.pinBadge} aria-hidden="true">📌 </span>
                  </>
                ) : null}
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
              onTogglePin(contextMenu.tabId)
              setContextMenu(null)
            }}
            role="menuitem"
          >
            {orderedTabs.find((tab) => tab.id === contextMenu.tabId)?.pinned ? 'Unpin Tab' : 'Pin Tab'}
          </button>
        </div>
      )}
    </div>
  )
}
