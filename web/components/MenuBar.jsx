'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styles from './MenuBar.module.css'

const MENUS = [
  {
    label: 'File',
    items: [
      { label: 'New', shortcut: 'Ctrl+N', action: 'new' },
      { label: 'New Window', shortcut: 'Ctrl+Shift+N', action: 'newWindow' },
      { separator: true },
      { label: 'Open...', shortcut: 'Ctrl+O', action: 'open' },
      { label: 'Open Containing Folder' },
      { label: 'Open Folder as Workspace' },
      { separator: true },
      { label: 'Reload from Disk', shortcut: 'Ctrl+R', action: 'reload' },
      { separator: true },
      { label: 'Save', shortcut: 'Ctrl+S', action: 'save' },
      { label: 'Save As...', shortcut: 'Ctrl+Alt+S', action: 'saveAs' },
      { label: 'Save a Copy As...', action: 'saveCopyAs' },
      { label: 'Save All', shortcut: 'Ctrl+Shift+S', action: 'saveAll' },
      { separator: true },
      { label: 'Rename...', action: 'rename' },
      { label: 'Move to Recycle Bin', action: 'closeActive' },
      { separator: true },
      { label: 'Print...', shortcut: 'Ctrl+P', action: 'print' },
      { separator: true },
      { label: 'Exit', shortcut: 'Alt+F4', action: 'exit' },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: 'undo' },
      { label: 'Redo', shortcut: 'Ctrl+Y', action: 'redo' },
      { separator: true },
      { label: 'Cut', shortcut: 'Ctrl+X', action: 'cut' },
      { label: 'Copy', shortcut: 'Ctrl+C', action: 'copy' },
      { label: 'Paste', shortcut: 'Ctrl+V', action: 'paste' },
      { label: 'Delete', shortcut: 'Del', action: 'delete' },
      { label: 'Select All', shortcut: 'Ctrl+A', action: 'selectAll' },
      { separator: true },
      { label: 'Begin/End Select', shortcut: 'Alt+Shift+B' },
      { separator: true },
      { label: 'Copy to Clipboard' },
      { label: 'Indent', shortcut: 'Tab', action: 'indent' },
      { label: 'Dedent', shortcut: 'Shift+Tab', action: 'dedent' },
      { separator: true },
      { label: 'EOL Conversion' },
      { label: 'Blank Operations' },
      { label: 'Paste Special' },
      { label: 'Line Operations' },
      { separator: true },
      { label: 'Column Mode Edit', shortcut: 'Alt+C' },
      { label: 'Character Panel' },
      { label: 'Clipboard History' },
    ],
  },
  {
    label: 'Search',
    items: [
      { label: 'Find...', shortcut: 'Ctrl+F', action: 'find' },
      { label: 'Find Next', shortcut: 'F3', action: 'findNext' },
      { label: 'Find Previous', shortcut: 'Shift+F3', action: 'findPrev' },
      { label: 'Select and Find Next', shortcut: 'Ctrl+F3', action: 'selectFindNext' },
      { label: 'Select and Find Previous', shortcut: 'Ctrl+Shift+F3', action: 'selectFindPrev' },
      { separator: true },
      { label: 'Replace...', shortcut: 'Ctrl+H', action: 'replace' },
      { separator: true },
      { label: 'Find in Files...', shortcut: 'Ctrl+Shift+F' },
      { separator: true },
      { label: 'Incremental Search', shortcut: 'Ctrl+Alt+I', action: 'incrementalSearch' },
      { separator: true },
      { label: 'Go to...', shortcut: 'Ctrl+G', action: 'goTo' },
      { label: 'Go to Matching Brace', shortcut: 'Ctrl+B', action: 'goToMatchingBrace' },
    ],
  },
  {
    label: 'View',
    items: [
      { label: 'Toggle Full Screen Mode', shortcut: 'F11', action: 'fullscreen' },
      { separator: true },
      {
        label: 'Show Symbol',
        submenu: [
          { label: 'Show White Space and Tab', action: 'show-whitespace' },
          { label: 'Show End of Line', action: 'show-eol' },
          { label: 'Show All Characters', action: 'show-all-chars' },
          { separator: true },
          { label: 'Show Indent Guide', action: 'show-indent' },
        ],
      },
      {
        label: 'Zoom',
        submenu: [
          { label: 'Zoom In', shortcut: 'Ctrl+Numpad+', action: 'zoom-in' },
          { label: 'Zoom Out', shortcut: 'Ctrl+Numpad-', action: 'zoom-out' },
          { label: 'Restore Default Zoom', shortcut: 'Ctrl+Numpad/', action: 'zoom-reset' },
        ],
      },
      { separator: true },
      {
        label: 'Move/Clone Current Document',
        submenu: [
          { label: 'Move to Other View', action: 'move-to-other-view' },
          { label: 'Clone to Other View', action: 'clone-to-other-view' },
        ],
      },
      { separator: true },
      {
        label: 'Tab/Space',
        submenu: [
          { label: 'Convert Tab to Space', action: 'tab-to-space' },
          { label: 'Convert Space to Tab (All)', action: 'space-to-tab-all' },
          { label: 'Convert Space to Tab (Leading)', action: 'space-to-tab-leading' },
        ],
      },
      { label: 'Word Wrap', shortcut: 'Alt+W', action: 'word-wrap' },
      { separator: true },
      { label: 'Focus on Another View', action: 'focus-other-view' },
      { separator: true },
      { label: 'Hide Lines', shortcut: 'Alt+H', action: 'hide-lines' },
      { label: 'Fold All', shortcut: 'Alt+0', action: 'fold-all' },
      { label: 'Unfold All', shortcut: 'Alt+Shift+0', action: 'unfold-all' },
      { separator: true },
      { label: 'Summary...', action: 'summary' },
    ],
  },
  {
    label: 'Encoding',
    items: [
      { label: 'Encode in ANSI' },
      { label: 'Encode in UTF-8-BOM' },
      { label: 'Encode in UTF-8' },
      { label: 'Encode in UTF-16 BE BOM' },
      { label: 'Encode in UTF-16 LE BOM' },
      { separator: true },
      { label: 'Convert to ANSI' },
      { label: 'Convert to UTF-8-BOM' },
      { label: 'Convert to UTF-8' },
      { label: 'Convert to UTF-16 BE BOM' },
      { label: 'Convert to UTF-16 LE BOM' },
      { separator: true },
      { label: 'Character sets' },
    ],
  },
  {
    label: 'Language',
    items: [
      { label: 'User Defined Language...' },
      { separator: true },
      { label: 'Plain Text', action: 'lang-plain-text' },
      { label: 'Ada' },
      { label: 'ASP' },
      { label: 'Assembly' },
      { label: 'AutoIt' },
      { label: 'Bash' },
      { label: 'Batch' },
      { label: 'C' },
      { label: 'C#' },
      { label: 'C++' },
      { label: 'CSS' },
      { label: 'HTML' },
      { label: 'Java' },
      { label: 'JavaScript', action: 'lang-javascript' },
      { label: 'JSON' },
      { label: 'Lua' },
      { label: 'Makefile' },
      { label: 'Markdown' },
      { label: 'PHP' },
      { label: 'PowerShell' },
      { label: 'Python' },
      { label: 'Ruby' },
      { label: 'Rust' },
      { label: 'Shell' },
      { label: 'SQL' },
      { label: 'TypeScript' },
      { label: 'VBScript' },
      { label: 'XML' },
      { label: 'YAML' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Preferences...', shortcut: 'Ctrl+Alt+P' },
      { separator: true },
      { label: 'Style Configurator...', action: 'styleConfigurator' },
      { label: 'Shortcut Mapper...' },
      { separator: true },
      { label: 'Import' },
      { label: 'Edit Popup ContextMenu' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'MD5' },
      { label: 'SHA-256' },
      { separator: true },
      { label: 'Generate Random Number' },
    ],
  },
  {
    label: 'Macro',
    items: [
      { label: 'Start Recording' },
      { label: 'Stop Recording' },
      { label: 'Playback', shortcut: 'Ctrl+Shift+P' },
      { separator: true },
      { label: 'Save Current Recorded Macro...' },
      { separator: true },
      { label: 'Run a Macro Multiple Times...' },
      { separator: true },
      { label: 'Trim Trailing Space and Save', shortcut: 'Shift+F5' },
    ],
  },
  {
    label: 'Run',
    items: [
      { label: 'Run...', shortcut: 'F5' },
      { separator: true },
      { label: 'Open in Chrome' },
      { label: 'Open in Firefox' },
      { label: 'Open in Edge' },
      { separator: true },
      { label: 'Manage Shortcuts...' },
    ],
  },
  {
    label: 'Plugins',
    items: [
      { label: 'Plugins Admin...' },
      { separator: true },
      { label: 'Open Plugins Folder' },
    ],
  },
  {
    label: 'Window',
    items: [
      { label: 'Windows...' },
      { separator: true },
      { label: 'Next Tab', shortcut: 'Ctrl+Tab' },
      { label: 'Previous Tab', shortcut: 'Ctrl+Shift+Tab' },
      { separator: true },
      { label: 'Move to Other View' },
      { label: 'Clone to Other View' },
      { separator: true },
      { label: 'Tab moves to right Tab Bar' },
    ],
  },
  {
    label: '?',
    items: [
      { label: 'About Notepad++ Web...', action: 'about' },
      { separator: true },
      { label: 'GitHub Repository', action: 'github' },
    ],
  },
]

export default function MenuBar({ onFileAction, onEditAction, onViewAction, onSearchAction, onLanguageAction, viewState }) {
  const [openMenu, setOpenMenu] = useState(null)
  const [openSubmenu, setOpenSubmenu] = useState(null)
  const [dropdownPos, setDropdownPos] = useState(null)   // { top, left } for portal dropdown
  const [dropdownLeft, setDropdownLeft] = useState(null) // clamping adjustment
  const [submenuLeft, setSubmenuLeft] = useState(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [mounted, setMounted] = useState(false)
  const barRef = useRef(null)
  const scrollRef = useRef(null)
  const submenuRef = useRef(null)
  const dropdownRef = useRef(null)
  const menuButtonRefs = useRef({})

  useEffect(() => setMounted(true), [])

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const SCROLL_THRESHOLD = 1
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - SCROLL_THRESHOLD)
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

  const handleScrollLeft = () => scrollRef.current?.scrollBy({ left: -120, behavior: 'smooth' })
  const handleScrollRight = () => scrollRef.current?.scrollBy({ left: 120, behavior: 'smooth' })

  // Step 1: when openMenu changes, record the button's viewport position for the portal
  useLayoutEffect(() => {
    if (!openMenu) {
      setDropdownPos(null)
      setDropdownLeft(null)
      return
    }
    const btn = menuButtonRefs.current[openMenu]
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom, left: rect.left })
    setDropdownLeft(null)
  }, [openMenu])

  // Step 2: after the portal dropdown renders, clamp its left so it stays in the viewport
  useLayoutEffect(() => {
    if (!dropdownRef.current || !dropdownPos) {
      setDropdownLeft(null)
      return
    }
    const rect = dropdownRef.current.getBoundingClientRect()
    let adjust = 0
    if (rect.right > window.innerWidth) {
      adjust = -(rect.right - window.innerWidth)
    }
    if (rect.left + adjust < 0) {
      adjust = -rect.left
    }
    setDropdownLeft(adjust !== 0 ? adjust : null)
  }, [openMenu, dropdownPos])

  // Clamp submenu to viewport edges
  useLayoutEffect(() => {
    if (!submenuRef.current) {
      setSubmenuLeft(null)
      return
    }
    const rect = submenuRef.current.getBoundingClientRect()
    let left = 0
    if (rect.right > window.innerWidth) {
      left -= (rect.right - window.innerWidth)
    }
    if (rect.left + left < 0) {
      left = -rect.left
    }
    setSubmenuLeft(left !== 0 ? left : null)
  }, [openSubmenu])

  useEffect(() => {
    const handleClick = (e) => {
      const inBar = barRef.current && barRef.current.contains(e.target)
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target)
      if (!inBar && !inDropdown) {
        setOpenMenu(null)
        setOpenSubmenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleItemClick = (item, menuLabel) => {
    if (item.separator || item.submenu) return
    if (item.action) {
      if (menuLabel === 'Edit') {
        onEditAction?.(item.action)
      } else if (menuLabel === 'View') {
        onViewAction?.(item.action)
      } else if (menuLabel === 'Search') {
        onSearchAction?.(item.action)
      } else if (menuLabel === 'Language') {
        onLanguageAction?.(item.action)
      } else if (menuLabel === '?') {
        if (item.action === 'github') {
          window.open('https://github.com/tdgeorge/notepad-plus-plus-web', '_blank', 'noopener,noreferrer')
        } else {
          onFileAction?.(item.action)
        }
      } else {
        onFileAction?.(item.action)
      }
    }
    setOpenMenu(null)
    setOpenSubmenu(null)
  }

  const isChecked = (action) => {
    if (!viewState || !action) return false
    switch (action) {
      case 'word-wrap': return viewState.wordWrap
      case 'show-whitespace': return viewState.showWhitespace
      case 'show-eol': return viewState.showEol
      case 'show-all-chars': return viewState.showAllChars
      case 'show-indent': return viewState.showIndent
      case 'lang-javascript': return viewState.language === 'javascript'
      case 'lang-plain-text': return viewState.language == null
      default: return false
    }
  }

  const renderItems = (items, menuLabel) =>
    items.map((item, idx) => {
      if (item.separator) {
        return <li key={idx} className={styles.separator} role="separator" />
      }
      const submenuKey = `${menuLabel}-${idx}`
      const checked = isChecked(item.action)
      if (item.submenu) {
        return (
          <li
            key={idx}
            className={`${styles.dropdownItem} ${styles.hasSubmenu}`}
            onMouseEnter={() => setOpenSubmenu(submenuKey)}
            onClick={() => setOpenSubmenu(submenuKey)}
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={openSubmenu === submenuKey}
          >
            <span className={styles.checkmark} aria-hidden="true" />
            <span className={styles.itemLabel}>{item.label}</span>
            <span className={styles.submenuArrow} aria-hidden="true">▼</span>
            {openSubmenu === submenuKey && (
              <ul
                ref={submenuRef}
                className={styles.submenuDropdown}
                style={submenuLeft != null ? { left: submenuLeft } : undefined}
                role="menu"
              >
                {item.submenu.map((subitem, subIdx) =>
                  subitem.separator ? (
                    <li key={subIdx} className={styles.separator} role="separator" />
                  ) : (
                    <li
                      key={subIdx}
                      className={styles.dropdownItem}
                      onClick={(e) => { e.stopPropagation(); handleItemClick(subitem, menuLabel) }}
                      role="menuitem"
                    >
                      <span className={styles.checkmark} aria-hidden="true">
                        {isChecked(subitem.action) ? '✓' : ''}
                      </span>
                      <span className={styles.itemLabel}>{subitem.label}</span>
                      {subitem.shortcut && (
                        <span className={styles.shortcut}>{subitem.shortcut}</span>
                      )}
                    </li>
                  )
                )}
              </ul>
            )}
          </li>
        )
      }
      return (
        <li
          key={idx}
          className={styles.dropdownItem}
          onClick={() => handleItemClick(item, menuLabel)}
          onMouseEnter={() => setOpenSubmenu(null)}
          role="menuitem"
        >
          <span className={styles.checkmark} aria-hidden="true">
            {checked ? '✓' : ''}
          </span>
          <span className={styles.itemLabel}>{item.label}</span>
          {item.shortcut && (
            <span className={styles.shortcut}>{item.shortcut}</span>
          )}
        </li>
      )
    })

  const activeMenu = MENUS.find((m) => m.label === openMenu)

  const portalDropdown = mounted && activeMenu && dropdownPos ? createPortal(
    <ul
      ref={dropdownRef}
      className={styles.dropdown}
      style={{
        position: 'fixed',
        top: dropdownPos.top,
        left: dropdownPos.left + (dropdownLeft ?? 0),
      }}
      role="menu"
    >
      {renderItems(activeMenu.items, activeMenu.label)}
    </ul>,
    document.body
  ) : null

  return (
    <div className={styles.menuBarWrapper} ref={barRef}>
      {canScrollLeft && (
        <button
          className={styles.scrollBtn}
          onClick={handleScrollLeft}
          aria-label="Scroll menu left"
          tabIndex={-1}
        >
          &#8249;
        </button>
      )}
      <nav className={styles.menuBar} ref={scrollRef} role="menubar">
        {MENUS.map((menu) => (
          <div key={menu.label} className={styles.menuItem}>
            <button
              ref={(el) => { menuButtonRefs.current[menu.label] = el }}
              className={`${styles.menuButton} ${openMenu === menu.label ? styles.active : ''}`}
              onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
              onMouseEnter={() => openMenu !== null && setOpenMenu(menu.label)}
              role="menuitem"
              aria-haspopup="true"
              aria-expanded={openMenu === menu.label}
            >
              {menu.label}
            </button>
          </div>
        ))}
      </nav>
      {canScrollRight && (
        <button
          className={styles.scrollBtn}
          onClick={handleScrollRight}
          aria-label="Scroll menu right"
          tabIndex={-1}
        >
          &#8250;
        </button>
      )}
      {portalDropdown}
    </div>
  )
}
