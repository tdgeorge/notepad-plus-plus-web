'use client'

import Image from 'next/image'
import styles from './Toolbar.module.css'
import { useRef, useState, useEffect, useCallback } from 'react'

// Fluent color hue-rotate angles (partial mode: shifts only the blue accent pixels)
// Base secondary hue: ~207° (light #0078D4) / ~204° (dark #4CC2FF)
const PARTIAL_COLOR_FILTERS = {
  defaultColor: null,
  red:     'hue-rotate(146deg) saturate(1.5)',
  green:   'hue-rotate(-87deg) saturate(1.4) brightness(0.85)',
  blue:    null,
  purple:  'hue-rotate(84deg) saturate(1.4)',
  cyan:    'hue-rotate(-24deg) saturate(1.1) brightness(1.1)',
  olive:   'hue-rotate(-107deg) saturate(0.7) brightness(0.75)',
  yellow:  'hue-rotate(-163deg) saturate(2.5) brightness(1.3)',
}

// Complete (monochrome) mode: all pixels become one color
// Start from grayscale, then apply sepia+hue rotation to colorize
const COMPLETE_COLOR_FILTERS = {
  defaultColor: 'grayscale(1)',
  red:     'grayscale(1) sepia(1) hue-rotate(318deg) saturate(5) brightness(0.9)',
  green:   'grayscale(1) sepia(1) hue-rotate(85deg) saturate(5) brightness(0.55)',
  blue:    'grayscale(1) sepia(1) hue-rotate(172deg) saturate(5) brightness(0.9)',
  purple:  'grayscale(1) sepia(1) hue-rotate(256deg) saturate(4) brightness(0.85)',
  cyan:    'grayscale(1) sepia(1) hue-rotate(148deg) saturate(5) brightness(1.0)',
  olive:   'grayscale(1) sepia(1) hue-rotate(65deg) saturate(3) brightness(0.55)',
  yellow:  'grayscale(1) sepia(1) hue-rotate(9deg) saturate(5) brightness(1.2)',
}

function getIconFilter(iconColor, iconMonochrome, customColor) {
  if (iconMonochrome) {
    if (iconColor === 'custom' && customColor) {
      // For custom color in monochrome, use a data-driven CSS approach
      return `grayscale(1) sepia(1) ${customColorToFilter(customColor)}`
    }
    return COMPLETE_COLOR_FILTERS[iconColor] ?? COMPLETE_COLOR_FILTERS.defaultColor
  } else {
    if (iconColor === 'custom' && customColor) {
      return customColorToPartialFilter(customColor)
    }
    return PARTIAL_COLOR_FILTERS[iconColor] ?? null
  }
}

// Convert a custom hex color to a CSS filter approximation (partial mode)
function customColorToPartialFilter(hex) {
  const [h] = hexToHsl(hex)
  // Base hue of the accent color is ~207°
  const angle = Math.round(h - 207)
  return `hue-rotate(${angle}deg) saturate(1.5)`
}

// Convert a custom hex color to a CSS filter for complete mode
function customColorToFilter(hex) {
  const [h, s, l] = hexToHsl(hex)
  const sepiaDest = 35 // sepia gives ~35° hue
  const angle = Math.round(h - sepiaDest)
  const sat = Math.round((s / 100) * 5)
  const bri = (l / 100).toFixed(2)
  return `hue-rotate(${angle}deg) saturate(${sat}) brightness(${bri})`
}

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

// Determine icon folder from iconSet + isDark
function getIconFolder(iconSet, isDark) {
  switch (iconSet) {
    case 'large':
      return isDark ? 'dark' : 'light'
    case 'small-filled':
      return isDark ? 'dark-filled' : 'light-filled'
    case 'large-filled':
      return isDark ? 'dark-filled' : 'light-filled'
    case 'standard':
      return 'standard'
    case 'small':
    default:
      return isDark ? 'dark' : 'light'
  }
}

// Determine icon display size from iconSet
function getIconSize(iconSet) {
  switch (iconSet) {
    case 'large':
    case 'large-filled':
      return 32
    default:
      return 16
  }
}

function ToolbarIcon({ name, alt, isDark, iconSet, iconColor, iconMonochrome, customColor }) {
  const folder = getIconFolder(iconSet, isDark)
  const size = getIconSize(iconSet)
  const filter = getIconFilter(iconColor, iconMonochrome, customColor)
  const isStandard = iconSet === 'standard'
  return (
    <Image
      src={`/icons/toolbar/${folder}/${name}.png`}
      alt={alt}
      width={size}
      height={size}
      className={styles.icon}
      style={filter && !isStandard ? { filter } : undefined}
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
  iconSet = 'small',
  iconColor = 'defaultColor',
  iconMonochrome = false,
  customColor = null,
  onNew, onOpen, onSave, onSaveAll, onClose, onCloseAll, onPrint,
  onUndo, onRedo, onCut, onCopy, onPaste,
  onFind, onReplace,
  onZoomIn, onZoomOut,
  onSyncScrollV, onSyncScrollH,
  onWordWrap, onShowAllChars, onShowIndent,
  viewState,
}) {
  const iconProps = { isDark, iconSet, iconColor, iconMonochrome, customColor }
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
          <ToolbarIcon name="new" alt="New" {...iconProps} />
        </ToolbarButton>

        <ToolbarButton title="Open (Ctrl+O)" onClick={onOpen}>
          <ToolbarIcon name="open" alt="Open" {...iconProps} />
        </ToolbarButton>

        <ToolbarButton title="Save (Ctrl+S)" onClick={onSave}>
          <ToolbarIcon name="save" alt="Save" {...iconProps} />
        </ToolbarButton>

        <ToolbarButton title="Save All (Ctrl+Shift+S)" onClick={onSaveAll}>
          <ToolbarIcon name="saveAll" alt="Save All" {...iconProps} />
        </ToolbarButton>

        <ToolbarButton title="Close (Ctrl+W)" onClick={onClose}>
          <ToolbarIcon name="close" alt="Close" {...iconProps} />
        </ToolbarButton>

        <ToolbarButton title="Close All" onClick={onCloseAll}>
          <ToolbarIcon name="closeAll" alt="Close All" {...iconProps} />
        </ToolbarButton>

        <ToolbarButton title="Print (Ctrl+P)" onClick={onPrint}>
          <ToolbarIcon name="print" alt="Print" {...iconProps} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton title="Cut (Ctrl+X)" onClick={onCut}>
          <ToolbarIcon name="cut" alt="Cut" {...iconProps} />
        </ToolbarButton>

        <ToolbarButton title="Copy (Ctrl+C)" onClick={onCopy}>
          <ToolbarIcon name="copy" alt="Copy" {...iconProps} />
        </ToolbarButton>

        <ToolbarButton title="Paste (Ctrl+V)" onClick={onPaste}>
          <ToolbarIcon name="paste" alt="Paste" {...iconProps} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton title="Undo (Ctrl+Z)" onClick={onUndo}>
          <ToolbarIcon name="undo" alt="Undo" {...iconProps} />
        </ToolbarButton>

        <ToolbarButton title="Redo (Ctrl+Y)" onClick={onRedo}>
          <ToolbarIcon name="redo" alt="Redo" {...iconProps} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton title="Find (Ctrl+F)" onClick={onFind}>
          <ToolbarIcon name="find" alt="Find" {...iconProps} />
        </ToolbarButton>

        <ToolbarButton title="Replace (Ctrl+H)" onClick={onReplace}>
          <ToolbarIcon name="findReplace" alt="Replace" {...iconProps} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton title="Zoom In (Ctrl+Numpad+)" onClick={onZoomIn}>
          <ToolbarIcon name="zoomIn" alt="Zoom In" {...iconProps} />
        </ToolbarButton>

        <ToolbarButton title="Zoom Out (Ctrl+Numpad-)" onClick={onZoomOut}>
          <ToolbarIcon name="zoomOut" alt="Zoom Out" {...iconProps} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton
          title="Synchronize Vertical Scrolling"
          onClick={onSyncScrollV}
          active={viewState?.syncScrollV}
          disabled={!viewState?.splitEnabled}
        >
          <ToolbarIcon name="syncV" alt="Synchronize Vertical Scrolling" {...iconProps} />
        </ToolbarButton>

        <ToolbarButton
          title="Synchronize Horizontal Scrolling"
          onClick={onSyncScrollH}
          active={viewState?.syncScrollH}
          disabled={!viewState?.splitEnabled}
        >
          <ToolbarIcon name="syncH" alt="Synchronize Horizontal Scrolling" {...iconProps} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton
          title="Word Wrap (Alt+W)"
          onClick={onWordWrap}
          active={viewState?.wordWrap}
        >
          <ToolbarIcon name="wrap" alt="Word Wrap" {...iconProps} />
        </ToolbarButton>

        <ToolbarButton
          title="Show All Characters"
          onClick={onShowAllChars}
          active={viewState?.showAllChars}
        >
          <ToolbarIcon name="allChars" alt="Show All Characters" {...iconProps} />
        </ToolbarButton>

        <ToolbarButton
          title="Show Indent Guide"
          onClick={onShowIndent}
          active={viewState?.showIndent}
        >
          <ToolbarIcon name="indentGuide" alt="Show Indent Guide" {...iconProps} />
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
