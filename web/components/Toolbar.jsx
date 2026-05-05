'use client'

import styles from './Toolbar.module.css'

function ToolbarButton({ title, onClick, children, disabled }) {
  return (
    <button
      className={styles.button}
      title={title}
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
    >
      {children}
    </button>
  )
}

function ToolbarSep() {
  return <div className={styles.separator} />
}

export default function Toolbar({ onNew, onOpen, onSave, onSaveAll, onUndo, onRedo, onCut, onCopy, onPaste, onFind, onReplace }) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Main toolbar">
      <ToolbarButton title="New (Ctrl+N)" onClick={onNew}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1zm0 1.5L12.5 6H9V2.5zM3 14V2h5v5h5v7H3z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Open (Ctrl+O)" onClick={onOpen}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
          <path d="M4.5 9a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Save (Ctrl+S)" onClick={onSave}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H9.5a1 1 0 0 0-1 1v4.5h2a.5.5 0 0 1 .354.854l-2.5 2.5a.5.5 0 0 1-.708 0l-2.5-2.5A.5.5 0 0 1 5.5 6.5h2V2a2 2 0 0 1 2-2H14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h2.5a.5.5 0 0 1 0 1H2z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Save All (Ctrl+Shift+S)" onClick={onSaveAll}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H9.5a1 1 0 0 0-1 1v4.5h2a.5.5 0 0 1 .354.854l-2.5 2.5a.5.5 0 0 1-.708 0l-2.5-2.5A.5.5 0 0 1 5.5 6.5h2V2a2 2 0 0 1 2-2H14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h2.5a.5.5 0 0 1 0 1H2z" />
          <circle cx="12" cy="12" r="3" fill="#1a73e8" />
          <path d="M11 12h1v-1h1v1h1v1h-1v1h-1v-1h-1v-1z" fill="#fff" />
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

      <ToolbarButton title="Zoom In (Ctrl+Numpad+)">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0zm-5-2.5a.5.5 0 0 1 .5.5v1.5H9a.5.5 0 0 1 0 1H8v1.5a.5.5 0 0 1-1 0V7H5.5a.5.5 0 0 1 0-1H7V5a.5.5 0 0 1 .5-.5z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Zoom Out (Ctrl+Numpad-)">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0zm-5-2.5a.5.5 0 0 1 .5.5v2H9a.5.5 0 0 1 0 1H5.5a.5.5 0 0 1 0-1H7V5a.5.5 0 0 1 .5-.5z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton title="Restore Default Zoom">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
        </svg>
      </ToolbarButton>
    </div>
  )
}
