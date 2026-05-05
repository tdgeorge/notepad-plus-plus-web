'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './MenuBar.module.css'

const MENUS = [
  {
    label: 'File',
    items: [
      { label: 'New', shortcut: 'Ctrl+N' },
      { label: 'New Window', shortcut: 'Ctrl+Shift+N' },
      { separator: true },
      { label: 'Open...', shortcut: 'Ctrl+O' },
      { label: 'Open Containing Folder' },
      { label: 'Open Folder as Workspace' },
      { separator: true },
      { label: 'Reload from Disk', shortcut: 'Ctrl+R' },
      { separator: true },
      { label: 'Save', shortcut: 'Ctrl+S' },
      { label: 'Save As...', shortcut: 'Ctrl+Alt+S' },
      { label: 'Save a Copy As...' },
      { label: 'Save All', shortcut: 'Ctrl+Shift+S' },
      { separator: true },
      { label: 'Rename...' },
      { label: 'Move to Recycle Bin' },
      { separator: true },
      { label: 'Print...', shortcut: 'Ctrl+P' },
      { separator: true },
      { label: 'Exit', shortcut: 'Alt+F4' },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', shortcut: 'Ctrl+Z' },
      { label: 'Redo', shortcut: 'Ctrl+Y' },
      { separator: true },
      { label: 'Cut', shortcut: 'Ctrl+X' },
      { label: 'Copy', shortcut: 'Ctrl+C' },
      { label: 'Paste', shortcut: 'Ctrl+V' },
      { label: 'Delete', shortcut: 'Del' },
      { label: 'Select All', shortcut: 'Ctrl+A' },
      { separator: true },
      { label: 'Begin/End Select', shortcut: 'Alt+Shift+B' },
      { separator: true },
      { label: 'Copy to Clipboard' },
      { label: 'Indent', shortcut: 'Tab' },
      { label: 'Dedent', shortcut: 'Shift+Tab' },
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
      { label: 'Find...', shortcut: 'Ctrl+F' },
      { label: 'Find Next', shortcut: 'F3' },
      { label: 'Find Previous', shortcut: 'Shift+F3' },
      { label: 'Select and Find Next', shortcut: 'Ctrl+F3' },
      { label: 'Select and Find Previous', shortcut: 'Ctrl+Shift+F3' },
      { separator: true },
      { label: 'Replace...', shortcut: 'Ctrl+H' },
      { separator: true },
      { label: 'Find in Files...', shortcut: 'Ctrl+Shift+F' },
      { separator: true },
      { label: 'Incremental Search', shortcut: 'Ctrl+Alt+I' },
      { separator: true },
      { label: 'Go to...', shortcut: 'Ctrl+G' },
      { label: 'Go to Matching Brace', shortcut: 'Ctrl+B' },
    ],
  },
  {
    label: 'View',
    items: [
      { label: 'Always on Top' },
      { label: 'Toggle Full Screen Mode', shortcut: 'F11' },
      { label: 'Post-It', shortcut: 'F12' },
      { separator: true },
      { label: 'Show Symbol' },
      { label: 'Zoom' },
      { separator: true },
      { label: 'Move/Clone Current Document' },
      { separator: true },
      { label: 'Tab/Space' },
      { label: 'Word Wrap', shortcut: 'Alt+W' },
      { separator: true },
      { label: 'Focus on Another View' },
      { separator: true },
      { label: 'Hide Lines', shortcut: 'Alt+H' },
      { label: 'Fold All', shortcut: 'Alt+0' },
      { label: 'Unfold All', shortcut: 'Alt+Shift+0' },
      { separator: true },
      { label: 'Summary...' },
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
      { label: 'Plain Text' },
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
      { label: 'JavaScript' },
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
      { label: 'Style Configurator...' },
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
      { label: 'About Notepad++ Web...' },
      { separator: true },
      { label: 'GitHub Repository' },
    ],
  },
]

export default function MenuBar({ onNew }) {
  const [openMenu, setOpenMenu] = useState(null)
  const barRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleItemClick = (item) => {
    if (item.separator) return
    if (item.label === 'New') onNew?.()
    setOpenMenu(null)
  }

  return (
    <nav className={styles.menuBar} ref={barRef} role="menubar">
      {MENUS.map((menu) => (
        <div key={menu.label} className={styles.menuItem}>
          <button
            className={`${styles.menuButton} ${openMenu === menu.label ? styles.active : ''}`}
            onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
            onMouseEnter={() => openMenu !== null && setOpenMenu(menu.label)}
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={openMenu === menu.label}
          >
            {menu.label}
          </button>
          {openMenu === menu.label && (
            <ul className={styles.dropdown} role="menu">
              {menu.items.map((item, idx) =>
                item.separator ? (
                  <li key={idx} className={styles.separator} role="separator" />
                ) : (
                  <li
                    key={idx}
                    className={styles.dropdownItem}
                    onClick={() => handleItemClick(item)}
                    role="menuitem"
                  >
                    <span className={styles.itemLabel}>{item.label}</span>
                    {item.shortcut && (
                      <span className={styles.shortcut}>{item.shortcut}</span>
                    )}
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      ))}
    </nav>
  )
}
