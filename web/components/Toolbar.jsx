'use client'

import styles from './Toolbar.module.css'

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
  onNew, onOpen, onSave, onSaveAll, onClose, onCloseAll, onPrint,
  onUndo, onRedo, onCut, onCopy, onPaste,
  onFind, onReplace,
  onZoomIn, onZoomOut,
  onWordWrap, onShowAllChars, onShowIndent,
  viewState,
}) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Main toolbar">
      <ToolbarButton title="New (Ctrl+N)" onClick={onNew}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1zm0 1.5L12.5 6H9V2.5zM3 14V2h5v5h5v7H3z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Open (Ctrl+O)" onClick={onOpen}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Save (Ctrl+S)" onClick={onSave}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2.5L12.5 1H2zm5.5 12v-3h3v3h-3zM11 1v3H5V1h6zM2 2h2v3H2V2zm1 9H2V8h1v3zm4 0H4V8h3v3zm2 0V8h3v3h-3z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Save All (Ctrl+Shift+S)" onClick={onSaveAll}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M1.5 3.5A1.5 1.5 0 0 1 3 2h7.586a1.5 1.5 0 0 1 1.06.44l1.915 1.914A1.5 1.5 0 0 1 14 5.414V13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5v-9A1.5 1.5 0 0 1 1.5 3.5zM3 3v2.5h7V3H3zm5.5 8.5v-2h-3v2h3zM10 3v2.5H12L10 3z" />
          <path d="M10.5 10.5h4v4h-4v-4zm.5.5v3h3v-3h-3zm1.5 2v-1.5h.5v1h1v.5h-1.5z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Close (Ctrl+W)" onClick={onClose}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1zm0 1.5L12.5 6H9V2.5zM3 14V2h5v5h5v7H3z" />
          <path d="M6.146 7.146a.5.5 0 0 1 .708 0L8 8.293l1.146-1.147a.5.5 0 1 1 .708.708L8.707 9l1.147 1.146a.5.5 0 0 1-.708.708L8 9.707l-1.146 1.147a.5.5 0 0 1-.708-.708L7.293 9 6.146 7.854a.5.5 0 0 1 0-.708z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Close All" onClick={onCloseAll}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 13.5 1h-11zm5 5.293 2.146-2.147a.5.5 0 0 1 .708.708L8.207 7l2.147 2.146a.5.5 0 0 1-.708.708L7.5 7.707l-2.146 2.147a.5.5 0 0 1-.708-.708L6.793 7 4.646 4.854a.5.5 0 1 1 .708-.708L7.5 6.293z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Print (Ctrl+P)" onClick={onPrint}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z" />
          <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z" />
        </svg>
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton title="Cut (Ctrl+X)" onClick={onCut}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M3.5 3.5c-.474-.37-.998-.576-1.5-.576a2.5 2.5 0 0 0 0 5c.502 0 1.026-.207 1.5-.576L8 5.53l1.5 2.393c-.474.37-.998.576-1.5.576a2.5 2.5 0 0 0 0 5c.502 0 1.026-.207 1.5-.576l1.5-2.393L12.5 13h1.5l-5-8 1.5-2.5h-1.5L8 4.47 6.5 2H5L6.5 4.47 5 6.87 3.5 3.5z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Copy (Ctrl+C)" onClick={onCopy}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
          <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Paste (Ctrl+V)" onClick={onPaste}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M5 1.5A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5v1A1.5 1.5 0 0 1 9.5 4h-3A1.5 1.5 0 0 1 5 2.5v-1zm1.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-3z" />
          <path d="M3 2.5a.5.5 0 0 1 .5-.5H5a.5.5 0 0 1 0 1h-1.5v11h9V3H11a.5.5 0 0 1 0-1h1.5a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-11z" />
        </svg>
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton title="Undo (Ctrl+Z)" onClick={onUndo}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z" />
          <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Redo (Ctrl+Y)" onClick={onRedo}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
        </svg>
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton title="Find (Ctrl+F)" onClick={onFind}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Replace (Ctrl+H)" onClick={onReplace}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
          <path d="M6.5 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill="#fff" />
        </svg>
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton title="Zoom In (Ctrl+Numpad+)" onClick={onZoomIn}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0zm-5-2.5a.5.5 0 0 1 .5.5v1.5H9a.5.5 0 0 1 0 1H8v1.5a.5.5 0 0 1-1 0V7H5.5a.5.5 0 0 1 0-1H7V5a.5.5 0 0 1 .5-.5z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Zoom Out (Ctrl+Numpad-)" onClick={onZoomOut}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0zm-5-2.5a.5.5 0 0 1 .5.5v2H9a.5.5 0 0 1 0 1H5.5a.5.5 0 0 1 0-1H7V5a.5.5 0 0 1 .5-.5z" />
        </svg>
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton title="Synchronize Vertical Scrolling">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M11.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM9.05 3a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0V3h9.05zM4.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM2.05 8a2.5 2.5 0 0 1 4.9 0H16v1H6.95a2.5 2.5 0 0 1-4.9 0H0V8h2.05zM11.5 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-2.45 1a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0v-1h9.05z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Synchronize Horizontal Scrolling">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M3 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0-4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm10 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0-1a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM8 5.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5z" />
        </svg>
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton
        title="Word Wrap (Alt+W)"
        onClick={onWordWrap}
        active={viewState?.wordWrap}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M1 3.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h10.5a2 2 0 0 1 0 4H8.707l.646.646a.5.5 0 0 1-.707.708l-1.5-1.5a.5.5 0 0 1 0-.708l1.5-1.5a.5.5 0 1 1 .707.708L8.707 10H12a1 1 0 0 0 0-2H1.5a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        title="Show All Characters"
        onClick={onShowAllChars}
        active={viewState?.showAllChars}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h11A1.5 1.5 0 0 1 15 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9zM2.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-11z" />
          <path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        title="Show Indent Guide"
        onClick={onShowIndent}
        active={viewState?.showIndent}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M1.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 1 0v-11a.5.5 0 0 0-.5-.5zm3 2a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 1 0v-7a.5.5 0 0 0-.5-.5zm3 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 1 0v-3a.5.5 0 0 0-.5-.5z" />
        </svg>
      </ToolbarButton>

    </div>
  )
}
