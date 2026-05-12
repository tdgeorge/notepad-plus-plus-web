'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './TabBar.module.css'
import { getOrderedTabs } from '../lib/pinnedTabs.mjs'

const DOUBLE_TAP_MS = 500
const DOUBLE_TAP_MAX_MOVE = 36
const TOUCH_DISMISS_GUARD_MS = 250

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
  const contextMenuTab = useMemo(
    () => (contextMenu ? orderedTabs.find((tab) => tab.id === contextMenu.tabId) : null),
    [contextMenu, orderedTabs]
  )

  const openTabContextMenu = (tabId, x, y, { fromTouch = false } = {}) => {
    setContextMenu({ tabId, x, y, openedAt: Date.now(), fromTouch })
  }

  useEffect(() => {
    if (!contextMenu) return undefined
    const closeOnClick = (event) => {
      if (
        contextMenu.fromTouch &&
        Date.now() - contextMenu.openedAt < TOUCH_DISMISS_GUARD_MS
      ) {
        return
      }
      if (event.target instanceof Element && event.target.closest('[data-tab-context-menu="true"]')) return
      setContextMenu(null)
    }
    document.addEventListener('click', closeOnClick)
    return () => {
      document.removeEventListener('click', closeOnClick)
    }
  }, [contextMenu])

  return (
    <div className={styles.tabBar} role="tablist" aria-label="Open files">
      {orderedTabs.map((tab, index) => {
        const colorStyle = tab.color ? TAB_COLORS[tab.color] : null
        const prev = orderedTabs[index - 1]
        const showPinnedDivider = index > 0 && Boolean(prev?.pinned) && !tab.pinned
        const tabAriaLabel = `${tab.pinned ? 'Pinned: ' : ''}${tab.name}`
        return (
          <div key={tab.id} className={styles.tabSlot}>
            {showPinnedDivider && <div className={styles.pinnedDivider} aria-hidden="true" />}
            <div
              className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''} ${tab.pinned ? styles.pinned : ''}`}
              role="tab"
              aria-selected={tab.id === activeTabId}
              aria-label={tabAriaLabel}
              onClick={() => onSelect(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                openTabContextMenu(tab.id, e.clientX, e.clientY)
              }}
              onTouchEnd={(e) => {
                if (e.target.closest(`.${styles.closeButton}`)) return
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
                  openTabContextMenu(tab.id, touch.clientX, touch.clientY, { fromTouch: true })
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
                  <span className={styles.pinBadge} aria-hidden="true">📌</span>
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
          data-tab-context-menu="true"
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
            {contextMenuTab?.pinned ? 'Unpin Tab' : 'Pin Tab'}
          </button>
        </div>
      )}
    </div>
  )
}
