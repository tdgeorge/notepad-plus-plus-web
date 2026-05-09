'use client'

import Image from 'next/image'
import styles from './Toolbar.module.css'
import { useRef, useState, useEffect, useCallback } from 'react'

function ToolbarIcon({ name, alt, isDark }) {
  const scheme = isDark ? 'dark' : 'light'
  return (
    <Image
      src={`/icons/toolbar/${scheme}/${name}.png`}
      alt={alt}
      width={16}
      height={16}
      className={styles.icon}
      draggable={false}
    />
  )
}

function ToolbarButton({ title, onClick, children, disabled, active }) {
  return (
    <button
      className={`${styles.button}${active ? ` ${styles.active}` : ''}`}
      title={title}
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      aria-pressed={active !== undefined ? active : undefined}
    >
      {children}
    </button>
  )
}

function ToolbarSep() {
  return <div className={styles.separator} />
}

export default function Toolbar({
  isDark,
  onNew, onOpen, onSave, onSaveAll, onClose, onCloseAll, onPrint,
  onUndo, onRedo, onCut, onCopy, onPaste,
  onFind, onReplace,
  onZoomIn, onZoomOut,
  onSyncScrollV, onSyncScrollH,
  onWordWrap, onShowAllChars, onShowIndent,
  viewState,
}) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const THRESHOLD = 1
    setCanScrollLeft(el.scrollLeft > THRESHOLD)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - THRESHOLD)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollButtons()
    el.addEventListener('scroll', updateScrollButtons)
    const ro = new ResizeObserver(updateScrollButtons)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScrollButtons)
      ro.disconnect()
    }
  }, [updateScrollButtons])

  const SCROLL_DISTANCE = 120

  const handleScrollLeft = () => scrollRef.current?.scrollBy({ left: -SCROLL_DISTANCE, behavior: 'smooth' })
  const handleScrollRight = () => scrollRef.current?.scrollBy({ left: SCROLL_DISTANCE, behavior: 'smooth' })

  return (
    <div className={styles.toolbarWrapper}>
      {canScrollLeft && (
        <button
          className={styles.scrollBtn}
          onClick={handleScrollLeft}
          aria-label="Scroll toolbar left"
          tabIndex={-1}
        >
          &#8249;
        </button>
      )}
      <div className={styles.toolbar} ref={scrollRef} role="toolbar" aria-label="Main toolbar">
        <ToolbarButton title="New (Ctrl+N)" onClick={onNew}>
          <ToolbarIcon name="new" alt="New" isDark={isDark} />
        </ToolbarButton>

        <ToolbarButton title="Open (Ctrl+O)" onClick={onOpen}>
          <ToolbarIcon name="open" alt="Open" isDark={isDark} />
        </ToolbarButton>

        <ToolbarButton title="Save (Ctrl+S)" onClick={onSave}>
          <ToolbarIcon name="save" alt="Save" isDark={isDark} />
        </ToolbarButton>

        <ToolbarButton title="Save All (Ctrl+Shift+S)" onClick={onSaveAll}>
          <ToolbarIcon name="saveAll" alt="Save All" isDark={isDark} />
        </ToolbarButton>

        <ToolbarButton title="Close (Ctrl+W)" onClick={onClose}>
          <ToolbarIcon name="close" alt="Close" isDark={isDark} />
        </ToolbarButton>

        <ToolbarButton title="Close All" onClick={onCloseAll}>
          <ToolbarIcon name="closeAll" alt="Close All" isDark={isDark} />
        </ToolbarButton>

        <ToolbarButton title="Print (Ctrl+P)" onClick={onPrint}>
          <ToolbarIcon name="print" alt="Print" isDark={isDark} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton title="Cut (Ctrl+X)" onClick={onCut}>
          <ToolbarIcon name="cut" alt="Cut" isDark={isDark} />
        </ToolbarButton>

        <ToolbarButton title="Copy (Ctrl+C)" onClick={onCopy}>
          <ToolbarIcon name="copy" alt="Copy" isDark={isDark} />
        </ToolbarButton>

        <ToolbarButton title="Paste (Ctrl+V)" onClick={onPaste}>
          <ToolbarIcon name="paste" alt="Paste" isDark={isDark} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton title="Undo (Ctrl+Z)" onClick={onUndo}>
          <ToolbarIcon name="undo" alt="Undo" isDark={isDark} />
        </ToolbarButton>

        <ToolbarButton title="Redo (Ctrl+Y)" onClick={onRedo}>
          <ToolbarIcon name="redo" alt="Redo" isDark={isDark} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton title="Find (Ctrl+F)" onClick={onFind}>
          <ToolbarIcon name="find" alt="Find" isDark={isDark} />
        </ToolbarButton>

        <ToolbarButton title="Replace (Ctrl+H)" onClick={onReplace}>
          <ToolbarIcon name="findReplace" alt="Replace" isDark={isDark} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton title="Zoom In (Ctrl+Numpad+)" onClick={onZoomIn}>
          <ToolbarIcon name="zoomIn" alt="Zoom In" isDark={isDark} />
        </ToolbarButton>

        <ToolbarButton title="Zoom Out (Ctrl+Numpad-)" onClick={onZoomOut}>
          <ToolbarIcon name="zoomOut" alt="Zoom Out" isDark={isDark} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton
          title="Synchronize Vertical Scrolling"
          onClick={onSyncScrollV}
          active={viewState?.syncScrollV}
          disabled={!viewState?.splitEnabled}
        >
          <ToolbarIcon name="syncV" alt="Synchronize Vertical Scrolling" isDark={isDark} />
        </ToolbarButton>

        <ToolbarButton
          title="Synchronize Horizontal Scrolling"
          onClick={onSyncScrollH}
          active={viewState?.syncScrollH}
          disabled={!viewState?.splitEnabled}
        >
          <ToolbarIcon name="syncH" alt="Synchronize Horizontal Scrolling" isDark={isDark} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton
          title="Word Wrap (Alt+W)"
          onClick={onWordWrap}
          active={viewState?.wordWrap}
        >
          <ToolbarIcon name="wrap" alt="Word Wrap" isDark={isDark} />
        </ToolbarButton>

        <ToolbarButton
          title="Show All Characters"
          onClick={onShowAllChars}
          active={viewState?.showAllChars}
        >
          <ToolbarIcon name="allChars" alt="Show All Characters" isDark={isDark} />
        </ToolbarButton>

        <ToolbarButton
          title="Show Indent Guide"
          onClick={onShowIndent}
          active={viewState?.showIndent}
        >
          <ToolbarIcon name="indentGuide" alt="Show Indent Guide" isDark={isDark} />
        </ToolbarButton>

      </div>
      {canScrollRight && (
        <button
          className={styles.scrollBtn}
          onClick={handleScrollRight}
          aria-label="Scroll toolbar right"
          tabIndex={-1}
        >
          &#8250;
        </button>
      )}
    </div>
  )
}
