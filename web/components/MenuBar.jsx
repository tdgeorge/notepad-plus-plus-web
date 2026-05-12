'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal, flushSync } from 'react-dom'
import styles from './MenuBar.module.css'

const EDIT_ACTIONS_REQUIRING_CLIPBOARD_WRITE = new Set([
  'copy-filename',
  'copy-all-names',
])

const EDIT_ACTIONS_REQUIRING_FILE_PATH_ACCESS = new Set([
  'copy-filepath',
  'copy-filedir',
  'copy-all-paths',
])

// 400 ms safely outlasts the short tap-to-click window on mobile browsers, so
// any immediate synthetic follow-up click on the underlying menu button is
// ignored after a compact submenu action closes the portal.
const MENU_TOGGLE_SUPPRESS_DURATION_MS = 400

function isUnavailableEditAction(action, hasClipboardWriteSupport) {
  if (!action) return true
  if (EDIT_ACTIONS_REQUIRING_FILE_PATH_ACCESS.has(action)) return true
  if (EDIT_ACTIONS_REQUIRING_CLIPBOARD_WRITE.has(action) && !hasClipboardWriteSupport) {
    return true
  }
  return false
}

const MENUS = [
  {
    label: 'File',
    items: [
      { label: 'New', shortcut: 'Ctrl+N', action: 'new' },
      { label: 'Open...', shortcut: 'Ctrl+O', action: 'open' },
      {
        label: 'Open Containing Folder',
        submenu: [
          { label: 'Explorer', disabled: true },
          { label: 'cmd', disabled: true },
          { separator: true },
          { label: 'Folder as Workspace', disabled: true },
        ],
      },
      { label: 'Open in Default Viewer', disabled: true },
      { label: 'Open Folder as Workspace...', disabled: true },
      { label: 'Reload from Disk', shortcut: 'Ctrl+R', action: 'reload' },
      { label: 'Save', shortcut: 'Ctrl+S', action: 'save' },
      { label: 'Save As...', shortcut: 'Ctrl+Alt+S', action: 'saveAs' },
      { label: 'Save a Copy As...', action: 'saveCopyAs' },
      { label: 'Save All', shortcut: 'Ctrl+Shift+S', action: 'saveAll' },
      { label: 'Rename...', action: 'rename' },
      { label: 'Close', shortcut: 'Ctrl+W', action: 'closeActive' },
      { label: 'Close All', action: 'closeAll' },
      {
        label: 'Close Multiple Documents',
        submenu: [
          { label: 'Close All but Active Document', action: 'closeAllButActive' },
          { label: 'Close All but Pinned Documents', action: 'closeAllButPinned' },
          { label: 'Close All to the Left', action: 'closeAllToLeft' },
          { label: 'Close All to the Right', action: 'closeAllToRight' },
          { label: 'Close All Unchanged', action: 'closeAllUnchanged' },
        ],
      },
      { label: 'Move to Recycle Bin', disabled: true },
      { separator: true },
      { label: 'Load Session...', action: 'loadSession' },
      { label: 'Save Session...', action: 'saveSession' },
      { separator: true },
      { label: 'Print...', shortcut: 'Ctrl+P', action: 'print' },
      { label: 'Print Now', action: 'printNow' },
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
      { label: 'Begin/End Select', shortcut: 'Alt+Shift+B' },
      { label: 'Begin/End Select in Column Mode' },
      { separator: true },
      {
        label: 'Insert',
        submenu: [
          { label: 'Date Time (short)', action: 'insert-datetime-short' },
          { label: 'Date Time (long)', action: 'insert-datetime-long' },
          { label: 'Date Time (customized)', action: 'insert-datetime-custom' },
        ],
      },
      {
        label: 'Copy to Clipboard',
        submenu: [
          { label: 'Copy Current Full File path', action: 'copy-filepath' },
          { label: 'Copy Current Filename', action: 'copy-filename' },
          { label: 'Copy Current Dir. Path', action: 'copy-filedir' },
          { separator: true },
          { label: 'Copy All Filenames', action: 'copy-all-names' },
          { label: 'Copy All File Paths', action: 'copy-all-paths' },
        ],
      },
      {
        label: 'Indent',
        submenu: [
          { label: 'Increase Line Indent', shortcut: 'Tab', action: 'indent' },
          { label: 'Decrease Line Indent', shortcut: 'Shift+Tab', action: 'dedent' },
        ],
      },
      {
        label: 'Convert Case to',
        submenu: [
          { label: 'UPPERCASE', action: 'case-upper' },
          { label: 'lowercase', action: 'case-lower' },
          { label: 'Proper Case', action: 'case-proper' },
          { label: 'Proper Case (blend)', action: 'case-proper-blend' },
          { label: 'Sentence case', action: 'case-sentence' },
          { label: 'Sentence case (blend)', action: 'case-sentence-blend' },
          { label: 'iNVERT cASE', action: 'case-invert' },
          { label: 'ranDOm CasE', action: 'case-random' },
        ],
      },
      {
        label: 'Line Operations',
        submenu: [
          { label: 'Duplicate Current Line', action: 'line-duplicate' },
          { label: 'Remove Duplicate Lines', action: 'remove-duplicate-lines' },
          { label: 'Remove Consecutive Duplicate Lines', action: 'line-remove-consecutive-dup' },
          { label: 'Split Lines', action: 'line-split' },
          { label: 'Join Lines', action: 'line-join' },
          { label: 'Move Up Current Line', action: 'line-move-up' },
          { label: 'Move Down Current Line', action: 'line-move-down' },
          { label: 'Remove Empty Lines', action: 'remove-empty-lines' },
          { label: 'Remove Empty Lines (Containing Blank characters)', action: 'line-remove-empty-blank' },
          { label: 'Insert Blank Line Above Current', action: 'line-insert-above' },
          { label: 'Insert Blank Line Below Current', action: 'line-insert-below' },
          { label: 'Reverse Line Order', action: 'line-reverse' },
          { label: 'Randomize Line Order', action: 'line-randomize' },
          { separator: true },
          { label: 'Sort Lines Lexicographically Ascending', action: 'sort-asc' },
          { label: 'Sort Lines Lex. Ascending Ignoring Case', action: 'sort-asc-ic' },
          { label: 'Sort Lines In Locale Order Ascending', action: 'sort-locale-asc' },
          { label: 'Sort Lines As Integers Ascending', action: 'sort-int-asc' },
          { label: 'Sort Lines As Decimals (Comma) Ascending', action: 'sort-deccomma-asc' },
          { label: 'Sort Lines As Decimals (Dot) Ascending', action: 'sort-decdot-asc' },
          { label: 'Sort Lines By Length Ascending', action: 'sort-len-asc' },
          { separator: true },
          { label: 'Sort Lines Lexicographically Descending', action: 'sort-desc' },
          { label: 'Sort Lines Lex. Descending Ignoring Case', action: 'sort-desc-ic' },
          { label: 'Sort Lines In Locale Order Descending', action: 'sort-locale-desc' },
          { label: 'Sort Lines As Integers Descending', action: 'sort-int-desc' },
          { label: 'Sort Lines As Decimals (Comma) Descending', action: 'sort-deccomma-desc' },
          { label: 'Sort Lines As Decimals (Dot) Descending', action: 'sort-decdot-desc' },
          { label: 'Sort Lines By Length Descending', action: 'sort-len-desc' },
        ],
      },
      {
        label: 'Comment/Uncomment',
        submenu: [
          { label: 'Toggle Single Line Comment', action: 'comment-toggle' },
          { label: 'Single Line Comment', action: 'comment-single' },
          { label: 'Single Line Uncomment', action: 'comment-uncomment' },
          { label: 'Block Comment', action: 'comment-block' },
          { label: 'Block Uncomment', action: 'comment-block-uncomment' },
        ],
      },
      {
        label: 'Auto-Completion',
        submenu: [
          { label: 'Function Completion' },
          { label: 'Word Completion' },
          { label: 'Function Parameters Hint' },
          { label: 'Function Parameters Previous Hint' },
          { label: 'Function Parameters Next Hint' },
          { label: 'Path Completion' },
        ],
      },
      {
        label: 'EOL Conversion',
        submenu: [
          { label: 'Windows (CR LF)', action: 'eol-crlf' },
          { label: 'Unix (LF)', action: 'eol-lf' },
          { label: 'Macintosh (CR)', action: 'eol-cr' },
        ],
      },
      {
        label: 'Blank Operations',
        submenu: [
          { label: 'Trim Trailing Space', action: 'trim-trailing' },
          { label: 'Trim Leading Space', action: 'trim-leading' },
          { label: 'Trim Leading and Trailing Space', action: 'trim-both' },
          { label: 'EOL to Space', action: 'eol-to-space' },
          { label: 'Trim both and EOL to Space', action: 'remove-blank-eol' },
          { separator: true },
          { label: 'TAB to Space', action: 'tab-to-space' },
          { label: 'Space to TAB (All)', action: 'space-to-tab-all' },
          { label: 'Space to TAB (Leading)', action: 'space-to-tab-leading' },
        ],
      },
      {
        label: 'Paste Special',
        submenu: [
          { label: 'Paste HTML Content' },
          { label: 'Paste RTF Content' },
          { separator: true },
          { label: 'Copy Binary Content' },
          { label: 'Cut Binary Content' },
          { label: 'Paste Binary Content' },
        ],
      },
      {
        label: 'On Selection',
        submenu: [
          { label: 'Open File' },
          { label: 'Open Containing Folder in Explorer' },
          { separator: true },
          { label: 'Redact Selection █ (Shift: ●)' },
          { separator: true },
          { label: 'Search on Internet' },
          { label: 'Change Search Engine...' },
        ],
      },
      { separator: true },
      {
        label: 'Multi-select All',
        submenu: [
          { label: 'Ignore Case & Whole Word' },
          { label: 'Match Case Only' },
          { label: 'Match Whole Word Only' },
          { label: 'Match Case & Whole Word' },
        ],
      },
      {
        label: 'Multi-select Next',
        submenu: [
          { label: 'Ignore Case & Whole Word' },
          { label: 'Match Case Only' },
          { label: 'Match Whole Word Only' },
          { label: 'Match Case & Whole Word' },
        ],
      },
      { label: 'Undo the Latest Added Multi-Select' },
      { label: 'Skip Current & Go to Next Multi-select' },
      { separator: true },
      { label: 'Column Mode...' },
      { label: 'Column Editor...' },
      { label: 'Character Panel' },
      { label: 'Clipboard History' },
      { separator: true },
      {
        label: 'Read-Only in glitch.txt',
        submenu: [
          { label: 'Read-Only on Current Document' },
          { label: 'Read-Only for All Documents' },
          { label: 'Clear Read-Only for All Documents' },
        ],
      },
      { label: 'Read-Only Attribute in Windows' },
    ],
  },
  {
    label: 'Search',
    items: [
      { label: 'Find...', shortcut: 'Ctrl+F', action: 'find' },
      { label: 'Find in Files...', shortcut: 'Ctrl+Shift+F', disabled: true },
      { label: 'Find Next', shortcut: 'F3', action: 'findNext' },
      { label: 'Find Previous', shortcut: 'Shift+F3', action: 'findPrev' },
      { label: 'Select and Find Next', shortcut: 'Ctrl+F3', action: 'selectFindNext' },
      { label: 'Select and Find Previous', shortcut: 'Ctrl+Shift+F3', action: 'selectFindPrev' },
      { label: 'Find (Volatile) Next', disabled: true },
      { label: 'Find (Volatile) Previous', disabled: true },
      { label: 'Replace...', shortcut: 'Ctrl+H', action: 'replace' },
      { label: 'Incremental Search', shortcut: 'Ctrl+Alt+I', action: 'incrementalSearch' },
      { label: 'Search Results Window', disabled: true },
      { label: 'Next Search Result', disabled: true },
      { label: 'Previous Search Result', disabled: true },
      { label: 'Go to...', shortcut: 'Ctrl+G', action: 'goTo' },
      { label: 'Go to Matching Brace', shortcut: 'Ctrl+B', action: 'goToMatchingBrace' },
      { label: 'Select All In-between {} [] or ()', disabled: true },
      { label: 'Mark...', action: 'mark-prompt' },
      { separator: true },
      {
        label: 'Change History',
        disabled: true,
        submenu: [
          { label: 'Go to Next Change', disabled: true },
          { label: 'Go to Previous Change', disabled: true },
          { label: 'Clear Change History', disabled: true },
        ],
      },
      { separator: true },
      {
        label: 'Style All Occurrences of Token',
        disabled: true,
        submenu: [
          { label: 'Using 1st Style', disabled: true },
          { label: 'Using 2nd Style', disabled: true },
          { label: 'Using 3rd Style', disabled: true },
          { label: 'Using 4th Style', disabled: true },
          { label: 'Using 5th Style', disabled: true },
        ],
      },
      {
        label: 'Style One Token',
        disabled: true,
        submenu: [
          { label: 'Using 1st Style', disabled: true },
          { label: 'Using 2nd Style', disabled: true },
          { label: 'Using 3rd Style', disabled: true },
          { label: 'Using 4th Style', disabled: true },
          { label: 'Using 5th Style', disabled: true },
        ],
      },
      {
        label: 'Clear Style',
        disabled: true,
        submenu: [
          { label: 'Clear 1st Style', disabled: true },
          { label: 'Clear 2nd Style', disabled: true },
          { label: 'Clear 3rd Style', disabled: true },
          { label: 'Clear 4th Style', disabled: true },
          { label: 'Clear 5th Style', disabled: true },
          { label: 'Clear all Styles', disabled: true },
        ],
      },
      {
        label: 'Jump Up',
        disabled: true,
        submenu: [
          { label: '1st Style', disabled: true },
          { label: '2nd Style', disabled: true },
          { label: '3rd Style', disabled: true },
          { label: '4th Style', disabled: true },
          { label: '5th Style', disabled: true },
          { label: 'Find Mark Style', disabled: true },
        ],
      },
      {
        label: 'Jump Down',
        disabled: true,
        submenu: [
          { label: '1st Style', disabled: true },
          { label: '2nd Style', disabled: true },
          { label: '3rd Style', disabled: true },
          { label: '4th Style', disabled: true },
          { label: '5th Style', disabled: true },
          { label: 'Find Mark Style', disabled: true },
        ],
      },
      {
        label: 'Copy Styled Text',
        disabled: true,
        submenu: [
          { label: '1st Style', disabled: true },
          { label: '2nd Style', disabled: true },
          { label: '3rd Style', disabled: true },
          { label: '4th Style', disabled: true },
          { label: '5th Style', disabled: true },
          { label: 'All Styles', disabled: true },
          { label: 'Find Mark Style', disabled: true },
        ],
      },
      { separator: true },
      {
        label: 'Bookmark',
        submenu: [
          { label: 'Toggle Bookmark', shortcut: 'Ctrl+F2', action: 'bookmark-toggle' },
          { label: 'Next Bookmark', shortcut: 'F2', action: 'bookmark-next' },
          { label: 'Previous Bookmark', shortcut: 'Shift+F2', action: 'bookmark-prev' },
          { label: 'Clear All Bookmarks', action: 'bookmark-clear' },
          { label: 'Cut Bookmarked Lines', action: 'bookmark-cut-lines' },
          { label: 'Copy Bookmarked Lines', action: 'bookmark-copy-lines' },
          { label: 'Paste to (Replace) Bookmarked Lines', action: 'bookmark-paste-lines' },
          { label: 'Remove Bookmarked Lines', action: 'bookmark-remove-lines' },
          { label: 'Remove Non-Bookmarked Lines', action: 'bookmark-remove-unmarked-lines' },
          { label: 'Inverse Bookmarks', action: 'bookmark-inverse' },
        ],
      },
      { separator: true },
      { label: 'Find characters in range...', disabled: true },
    ],
  },
  {
    label: 'View',
    items: [
      { label: 'Always on Top', disabled: true },
      { label: 'Toggle Full Screen Mode', shortcut: 'F11', action: 'fullscreen' },
      { label: 'Post-It', disabled: true },
      { label: 'Distraction Free Mode', action: 'distraction-free' },
      { separator: true },
      {
        label: 'View Current File in',
        submenu: [
          { label: 'Firefox', action: 'view-in-browser' },
          { label: 'Chrome', action: 'view-in-browser' },
          { label: 'Edge', action: 'view-in-browser' },
          { label: 'IE', action: 'view-in-browser' },
        ],
      },
      { separator: true },
      {
        label: 'Show Symbol',
        submenu: [
          { label: 'Show Space and Tab', action: 'show-whitespace' },
          { label: 'Show End of Line', action: 'show-eol' },
          { label: 'Show Non-Printing Characters', disabled: true },
          { label: 'Show Control Characters & Unicode EOL', disabled: true },
          { label: 'Show All Characters', action: 'show-all-chars' },
          { separator: true },
          { label: 'Show Indent Guide', action: 'show-indent' },
          { label: 'Show Wrap Symbol', disabled: true },
        ],
      },
      {
        label: 'Zoom',
        submenu: [
          { label: 'Zoom In (Ctrl+Mouse Wheel Up)', action: 'zoom-in' },
          { label: 'Zoom Out (Ctrl+Mouse Wheel Down)', action: 'zoom-out' },
          { label: 'Restore Default Zoom', action: 'zoom-reset' },
          { separator: true },
          { label: 'Synchronize Across Views', disabled: true },
        ],
      },
      {
        label: 'Move/Clone Current Document',
        submenu: [
          { label: 'Move to Other View', action: 'move-to-other-view' },
          { label: 'Clone to Other View', action: 'clone-to-other-view' },
          { label: 'Move to New Instance', disabled: true },
          { label: 'Open in New Instance', disabled: true },
        ],
      },
      {
        label: 'Tab',
        submenu: [
          { label: '1st Tab', action: 'view-tab-1' },
          { label: '2nd Tab', action: 'view-tab-2' },
          { label: '3rd Tab', action: 'view-tab-3' },
          { label: '4th Tab', action: 'view-tab-4' },
          { label: '5th Tab', action: 'view-tab-5' },
          { label: '6th Tab', action: 'view-tab-6' },
          { label: '7th Tab', action: 'view-tab-7' },
          { label: '8th Tab', action: 'view-tab-8' },
          { label: '9th Tab', action: 'view-tab-9' },
          { separator: true },
          { label: 'First Tab', action: 'view-tab-first' },
          { label: 'Last Tab', action: 'view-tab-last' },
          { label: 'Next Tab', shortcut: 'Ctrl+Tab', action: 'nextTab' },
          { label: 'Previous Tab', shortcut: 'Ctrl+Shift+Tab', action: 'prevTab' },
          { separator: true },
          { label: 'Move to Start', action: 'view-tab-move-start' },
          { label: 'Move to End', action: 'view-tab-move-end' },
          { label: 'Move Tab Forward', action: 'view-tab-move-forward' },
          { label: 'Move Tab Backward', action: 'view-tab-move-backward' },
          { separator: true },
          { label: 'Apply Color 1', action: 'view-tab-color-1' },
          { label: 'Apply Color 2', action: 'view-tab-color-2' },
          { label: 'Apply Color 3', action: 'view-tab-color-3' },
          { label: 'Apply Color 4', action: 'view-tab-color-4' },
          { label: 'Apply Color 5', action: 'view-tab-color-5' },
          { label: 'Remove Color', action: 'view-tab-color-remove' },
        ],
      },
      { label: 'Word Wrap', shortcut: 'Alt+W', action: 'word-wrap' },
      { label: 'Focus on Another View', action: 'focus-other-view' },
      { label: 'Hide Lines', shortcut: 'Alt+H', action: 'hide-lines' },
      { separator: true },
      { label: 'Fold All', shortcut: 'Alt+0', action: 'fold-all' },
      { label: 'Unfold All', shortcut: 'Alt+Shift+0', action: 'unfold-all' },
      { label: 'Fold Current Level', disabled: true },
      { label: 'Unfold Current Level', disabled: true },
      {
        label: 'Fold Level',
        submenu: [
          { label: '1', disabled: true }, { label: '2', disabled: true }, { label: '3', disabled: true }, { label: '4', disabled: true },
          { label: '5', disabled: true }, { label: '6', disabled: true }, { label: '7', disabled: true }, { label: '8', disabled: true },
        ],
      },
      {
        label: 'Unfold Level',
        submenu: [
          { label: '1', disabled: true }, { label: '2', disabled: true }, { label: '3', disabled: true }, { label: '4', disabled: true },
          { label: '5', disabled: true }, { label: '6', disabled: true }, { label: '7', disabled: true }, { label: '8', disabled: true },
        ],
      },
      { separator: true },
      { label: 'Summary...', action: 'summary' },
      { separator: true },
      {
        label: 'Project Panels',
        submenu: [
          { label: 'Project Panel 1', disabled: true },
          { label: 'Project Panel 2', disabled: true },
          { label: 'Project Panel 3', disabled: true },
        ],
      },
      { label: 'Folder as Workspace', disabled: true },
      { label: 'Document Map', action: 'document-map' },
      { label: 'Document List', action: 'document-list' },
      { label: 'Function List', action: 'function-list' },
      { separator: true },
      { label: 'Synchronize Vertical Scrolling', action: 'sync-scroll-v' },
      { label: 'Synchronize Horizontal Scrolling', action: 'sync-scroll-h' },
      { separator: true },
      { label: 'Text Direction RTL', action: 'text-dir-rtl' },
      { label: 'Text Direction LTR', action: 'text-dir-ltr' },
      { separator: true },
      { label: 'Monitoring (tail -f)', disabled: true },
    ],
  },
  {
    label: 'Encoding',
    items: [
      { label: 'ANSI' },
      { label: 'UTF-8' },
      { label: 'UTF-8-BOM' },
      { label: 'UTF-16 BE BOM' },
      { label: 'UTF-16 LE BOM' },
      {
        label: 'Character sets',
        submenu: [
          { label: 'Arabic: ISO 8859-6' },
          { label: 'Arabic: OEM 720' },
          { label: 'Arabic: Windows-1256' },
          { label: 'Baltic: ISO 8859-4' },
          { label: 'Baltic: ISO 8859-13' },
          { label: 'Baltic: OEM 775' },
          { label: 'Baltic: Windows-1257' },
          { label: 'Celtic: ISO 8859-14' },
          { label: 'Cyrillic: ISO 8859-5' },
          { label: 'Cyrillic: KOI8-R' },
          { label: 'Cyrillic: KOI8-U' },
          { label: 'Cyrillic: Macintosh' },
          { label: 'Cyrillic: OEM 855' },
          { label: 'Cyrillic: OEM 866' },
          { label: 'Cyrillic: Windows-1251' },
          { label: 'Central European: OEM 852' },
          { label: 'Central European: Windows-1250' },
          { label: 'Chinese: Big5 (Traditional)' },
          { label: 'Chinese: GB2312 (Simplified)' },
          { label: 'Eastern European: ISO 8859-2' },
          { label: 'Greek: ISO 8859-7' },
          { label: 'Greek: OEM 737' },
          { label: 'Greek: OEM 869' },
          { label: 'Greek: Windows-1253' },
          { label: 'Hebrew: ISO 8859-8' },
          { label: 'Hebrew: OEM 862' },
          { label: 'Hebrew: Windows-1255' },
          { label: 'Japanese: Shift-JIS' },
          { label: 'Korean: Windows 949' },
          { label: 'Korean: EUC-KR' },
          { label: 'North European: OEM 861 : Icelandic' },
          { label: 'North European: OEM 865 : Nordic' },
          { label: 'Thai: TIS-620' },
          { label: 'Turkish: ISO 8859-3' },
          { label: 'Turkish: ISO 8859-9' },
          { label: 'Turkish: OEM 857' },
          { label: 'Turkish: Windows-1254' },
          { label: 'Western European: ISO 8859-1' },
          { label: 'Western European: ISO 8859-15' },
          { label: 'Western European: OEM 850' },
          { label: 'Western European: OEM 858' },
          { label: 'Western European: OEM 860 : Portuguese' },
          { label: 'Western European: OEM 863 : French' },
          { label: 'Western European: OEM-US' },
          { label: 'Western European: Windows-1252' },
          { label: 'Vietnamese: Windows-1258' },
        ],
      },
      { separator: true },
      { label: 'Convert to ANSI' },
      { label: 'Convert to UTF-8' },
      { label: 'Convert to UTF-8-BOM' },
      { label: 'Convert to UTF-16 BE BOM' },
      { label: 'Convert to UTF-16 LE BOM' },
    ],
  },
  {
    label: 'Language',
    items: [
      { label: 'None (Normal Text)', action: 'lang-plain-text' },
      { separator: true },
      {
        label: 'A',
        submenu: [
          { label: 'ActionScript', action: 'lang-flash' },
          { label: 'Ada', action: 'lang-ada' },
          { label: 'ASN.1', action: 'lang-asn1' },
          { label: 'ASP', action: 'lang-asp' },
          { label: 'Assembly', action: 'lang-asm' },
          { label: 'AutoIt', action: 'lang-autoit' },
          { label: 'AviSynth', action: 'lang-avs' },
        ],
      },
      {
        label: 'B',
        submenu: [
          { label: 'BaanC', action: 'lang-baanc' },
          { label: 'Batch', action: 'lang-batch' },
          { label: 'Blitzbasic', action: 'lang-blitzbasic' },
        ],
      },
      {
        label: 'C',
        submenu: [
          { label: 'C', action: 'lang-c' },
          { label: 'C#', action: 'lang-cs' },
          { label: 'C++', action: 'lang-cpp' },
          { label: 'Caml', action: 'lang-caml' },
          { label: 'CMake', action: 'lang-cmake' },
          { label: 'COBOL', action: 'lang-cobol' },
          { label: 'CSound', action: 'lang-csound' },
          { label: 'CoffeeScript', action: 'lang-coffeescript' },
          { label: 'CSS', action: 'lang-css' },
        ],
      },
      {
        label: 'D',
        submenu: [
          { label: 'D', action: 'lang-d' },
          { label: 'Diff', action: 'lang-diff' },
        ],
      },
      {
        label: 'E',
        submenu: [
          { label: 'Erlang', action: 'lang-erlang' },
          { label: 'ErrorList', action: 'lang-errorlist' },
          { label: 'ESCRIPT', action: 'lang-escript' },
        ],
      },
      {
        label: 'F',
        submenu: [
          { label: 'Forth', action: 'lang-forth' },
          { label: 'Fortran (free form)', action: 'lang-fortran' },
          { label: 'Fortran (fixed form)', action: 'lang-fortran77' },
          { label: 'Freebasic', action: 'lang-freebasic' },
        ],
      },
      {
        label: 'G',
        submenu: [
          { label: 'GDScript', action: 'lang-gdscript' },
          { label: 'Go', action: 'lang-go' },
          { label: 'Gui4Cli', action: 'lang-gui4cli' },
        ],
      },
      {
        label: 'H',
        submenu: [
          { label: 'Haskell', action: 'lang-haskell' },
          { label: 'Hollywood', action: 'lang-hollywood' },
          { label: 'HTML', action: 'lang-html' },
        ],
      },
      {
        label: 'I',
        submenu: [
          { label: 'INI file', action: 'lang-ini' },
          { label: 'Inno Setup', action: 'lang-inno' },
          { label: 'Intel HEX', action: 'lang-ihex' },
        ],
      },
      {
        label: 'J',
        submenu: [
          { label: 'Java', action: 'lang-java' },
          { label: 'JavaScript', action: 'lang-javascript' },
          { label: 'JSON', action: 'lang-json' },
          { label: 'JSON5', action: 'lang-json5' },
          { label: 'JSP', action: 'lang-jsp' },
        ],
      },
      { label: 'KIXtart', action: 'lang-kix' },
      {
        label: 'L',
        submenu: [
          { label: 'LaTeX', action: 'lang-latex' },
          { label: 'LISP', action: 'lang-lisp' },
          { label: 'Lua', action: 'lang-lua' },
        ],
      },
      {
        label: 'M',
        submenu: [
          { label: 'Makefile', action: 'lang-makefile' },
          { label: 'Markdown', action: 'lang-markdown' },
          { label: 'Matlab', action: 'lang-matlab' },
          { label: 'Microsoft Transact-SQL', action: 'lang-mssql' },
          { label: 'MMIXAL', action: 'lang-mmixal' },
          { label: 'MS-DOS Style', action: 'lang-ascii' },
        ],
      },
      {
        label: 'N',
        submenu: [
          { label: 'Nim', action: 'lang-nim' },
          { label: 'Nncrontab', action: 'lang-nncrontab' },
          { label: 'NSIS', action: 'lang-nsis' },
        ],
      },
      {
        label: 'O',
        submenu: [
          { label: 'Objective-C', action: 'lang-objc' },
          { label: 'OScript', action: 'lang-oscript' },
        ],
      },
      {
        label: 'P',
        submenu: [
          { label: 'Pascal', action: 'lang-pascal' },
          { label: 'Perl', action: 'lang-perl' },
          { label: 'PHP', action: 'lang-php' },
          { label: 'PostScript', action: 'lang-ps' },
          { label: 'PowerShell', action: 'lang-powershell' },
          { label: 'Properties', action: 'lang-props' },
          { label: 'Purebasic', action: 'lang-purebasic' },
          { label: 'Python', action: 'lang-python' },
        ],
      },
      {
        label: 'R',
        submenu: [
          { label: 'R', action: 'lang-r' },
          { label: 'Raku', action: 'lang-raku' },
          { label: 'REBOL', action: 'lang-rebol' },
          { label: 'Registry', action: 'lang-registry' },
          { label: 'Resource file', action: 'lang-rc' },
          { label: 'Ruby', action: 'lang-ruby' },
          { label: 'Rust', action: 'lang-rust' },
        ],
      },
      {
        label: 'S',
        submenu: [
          { label: 'SAS', action: 'lang-sas' },
          { label: 'Shell', action: 'lang-bash' },
          { label: 'Scheme', action: 'lang-scheme' },
          { label: 'Smalltalk', action: 'lang-smalltalk' },
          { label: 'Spice', action: 'lang-spice' },
          { label: 'SQL', action: 'lang-sql' },
          { label: 'Swift', action: 'lang-swift' },
          { label: 'S-Record', action: 'lang-srec' },
        ],
      },
      {
        label: 'T',
        submenu: [
          { label: 'TCL', action: 'lang-tcl' },
          { label: 'Tektronix extended HEX', action: 'lang-tehex' },
          { label: 'TeX', action: 'lang-tex' },
          { label: 'TOML', action: 'lang-toml' },
          { label: 'txt2tags', action: 'lang-txt2tags' },
          { label: 'TypeScript', action: 'lang-typescript' },
        ],
      },
      {
        label: 'V',
        submenu: [
          { label: 'Visual Basic', action: 'lang-vb' },
          { label: 'Visual Prolog', action: 'lang-visualprolog' },
          { label: 'VHDL', action: 'lang-vhdl' },
          { label: 'Verilog', action: 'lang-verilog' },
        ],
      },
      { label: 'XML', action: 'lang-xml' },
      { label: 'YAML', action: 'lang-yaml' },
      { separator: true },
      {
        label: 'User Defined Language',
        submenu: [
          { label: 'Define your language...', disabled: true },
          { label: 'Open User Defined Language folder...', disabled: true },
          { label: 'Notepad++ User Defined Languages Collection', disabled: true },
        ],
      },
      { label: 'User-Defined', disabled: true },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Preferences...', shortcut: 'Ctrl+Alt+P', action: 'preferences' },
      { label: 'Style Configurator...', action: 'styleConfigurator' },
      { label: 'Shortcut Mapper...', disabled: true },
      { separator: true },
      {
        label: 'Import',
        submenu: [
          { label: 'Import plugin(s)...', disabled: true },
          { label: 'Import style theme(s)...', disabled: true },
        ],
      },
      { separator: true },
      { label: 'Edit Popup ContextMenu', disabled: true },
    ],
  },
  {
    label: 'Tools',
    items: [
      {
        label: 'MD5',
        submenu: [
          { label: 'Generate...', action: 'md5-generate' },
          { label: 'Generate from files...', disabled: true },
          { label: 'Generate from selection into clipboard', action: 'md5-from-selection' },
        ],
      },
      {
        label: 'SHA-1',
        submenu: [
          { label: 'Generate...', action: 'sha1-generate' },
          { label: 'Generate from files...', disabled: true },
          { label: 'Generate from selection into clipboard', action: 'sha1-from-selection' },
        ],
      },
      {
        label: 'SHA-256',
        submenu: [
          { label: 'Generate...', action: 'sha256-generate' },
          { label: 'Generate from files...', disabled: true },
          { label: 'Generate from selection into clipboard', action: 'sha256-from-selection' },
        ],
      },
      {
        label: 'SHA-512',
        submenu: [
          { label: 'Generate...', action: 'sha512-generate' },
          { label: 'Generate from files...', disabled: true },
          { label: 'Generate from selection into clipboard', action: 'sha512-from-selection' },
        ],
      },
    ],
  },
  {
    label: 'Macro',
    items: [
      { label: 'Start Recording', action: 'macro-start-recording' },
      { label: 'Stop Recording', action: 'macro-stop-recording' },
      { label: 'Playback', shortcut: 'Ctrl+Shift+P', action: 'macro-playback' },
      { label: 'Save Current Recorded Macro...', action: 'macro-save-current' },
      { label: 'Run a Macro Multiple Times...', action: 'macro-run-multiple' },
    ],
  },
  {
    label: 'Run',
    items: [
      { label: 'Run...', shortcut: 'F5', disabled: true },
    ],
  },
  {
    label: 'Plugins',
    items: [
      { label: 'Plugins Admin...', disabled: true },
      { separator: true },
      { label: 'Open Plugins Folder...', disabled: true },
    ],
  },
  {
    label: 'Window',
    items: [
      {
        label: 'Sort By',
        submenu: [
          { label: 'Name A to Z', action: 'sort-tabs-name-asc' },
          { label: 'Name Z to A', action: 'sort-tabs-name-desc' },
          { label: 'Path A to Z', disabled: true },
          { label: 'Path Z to A', disabled: true },
          { label: 'Type A to Z', action: 'sort-tabs-type-asc' },
          { label: 'Type Z to A', action: 'sort-tabs-type-desc' },
          { label: 'Content Length Ascending', action: 'sort-tabs-length-asc' },
          { label: 'Content Length Descending', action: 'sort-tabs-length-desc' },
          { label: 'Modified Time Ascending', disabled: true },
          { label: 'Modified Time Descending', disabled: true },
        ],
      },
      { label: 'Windows...', action: 'windows' },
      { separator: true },
      { label: 'Recent Window', disabled: true },
    ],
  },
  {
    label: '?',
    items: [
      { label: 'Command Line Arguments...', disabled: true },
      { separator: true },
      { label: 'glitch.txt Home', action: 'npp-home' },
      { label: 'glitch.txt Project Page', action: 'npp-project' },
      { label: 'glitch.txt README', action: 'npp-docs' },
      { label: 'glitch.txt Issues', action: 'npp-forum' },
      { separator: true },
      { label: 'Update glitch.txt', disabled: true },
      { label: 'Set Updater Proxy...', disabled: true },
      { separator: true },
      { label: 'Debug Info...', action: 'debug-info' },
      { label: 'About glitch.txt...', action: 'about' },
    ],
  },
]

export default function MenuBar({ onFileAction, onEditAction, onViewAction, onSearchAction, onLanguageAction, onToolsAction, onMacroAction, viewState, fileState, macroState }) {
  const [openMenu, setOpenMenu] = useState(null)
  const [openSubmenu, setOpenSubmenu] = useState(null)
  const [dropdownPos, setDropdownPos] = useState(null)   // { top, left } for portal dropdown
  const [dropdownLeft, setDropdownLeft] = useState(null) // clamping adjustment
  const [submenuStyle, setSubmenuStyle] = useState(null) // positional overrides for open submenu
  const [isCompactMenuLayout, setIsCompactMenuLayout] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [mounted, setMounted] = useState(false)
  const barRef = useRef(null)
  const scrollRef = useRef(null)
  const submenuRef = useRef(null)
  const dropdownRef = useRef(null)
  const menuButtonRefs = useRef({})
  const suppressMenuToggleUntilRef = useRef(0)
  const hasClipboardWriteSupport = typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function'
  const closeMenus = useCallback(() => {
    setOpenSubmenu(null)
    setOpenMenu(null)
  }, [])
  const isMenuToggleSuppressed = useCallback(
    () => performance.now() < suppressMenuToggleUntilRef.current,
    []
  )
  const openMenuItem = useCallback((menuLabel) => {
    setOpenSubmenu(null)
    setOpenMenu(menuLabel)
  }, [])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const updateLayoutMode = () => {
      setIsCompactMenuLayout(window.innerWidth <= 640)
    }
    updateLayoutMode()
    window.addEventListener('resize', updateLayoutMode)
    return () => window.removeEventListener('resize', updateLayoutMode)
  }, [])

  useEffect(() => {
    setOpenSubmenu(null)
  }, [openMenu])

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

  // Position the submenu at fixed viewport coordinates.
  //
  // Using position:fixed (instead of position:absolute relative to the trigger
  // <li>) is essential now that the parent dropdown has overflow-y:auto — CSS
  // spec §10.6.4 says a non-visible overflow box clips its absolutely-positioned
  // descendants.  By switching to fixed we escape that clipping so the submenu
  // is always fully visible even when the user has scrolled the dropdown.
  //
  // getBoundingClientRect() is called after the submenu first renders at its
  // CSS-default position (absolute), giving us the correct viewport coordinates
  // to transplant into fixed space.
  useLayoutEffect(() => {
    if (!submenuRef.current) {
      setSubmenuStyle(null)
      return
    }
    // Viewport rect of the submenu as rendered by CSS defaults:
    //   desktop  → top: 0;   left: 100%  (opens right of trigger)
    //   mobile   → top: 100%; left: 0    (opens below trigger)
    const rect = submenuRef.current.getBoundingClientRect()

    let top = rect.top
    let left = rect.left

    // Horizontal: if right edge overflows, shift left enough to stay in view
    if (rect.right > window.innerWidth) {
      left -= rect.right - window.innerWidth
    }
    if (left < 0) left = 0

    // Vertical: if not enough space below, push the submenu upward
    const spaceBelow = window.innerHeight - top - 8
    if (spaceBelow < rect.height) {
      top = Math.max(8, top - (rect.height - spaceBelow))
    }

    setSubmenuStyle({
      position: 'fixed',
      top,
      left,
      bottom: 'auto',
      right: 'auto',
      maxHeight: `${window.innerHeight - top - 8}px`,
      overflowY: 'auto',
      zIndex: 10000,
    })
  }, [openSubmenu, isCompactMenuLayout])

  // Batch-reset submenu position state so each new submenu is measured from its CSS default
  const openSubmenuItem = useCallback((key) => {
    if (openSubmenu !== key) {
      setSubmenuStyle(null)
    }
    setOpenSubmenu(key)
  }, [openSubmenu])

  useEffect(() => {
    const handleClick = (e) => {
      const inBar = barRef.current && barRef.current.contains(e.target)
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target)
      if (!inBar && !inDropdown) {
        closeMenus()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [closeMenus])

  const handleItemClick = (item, menuLabel) => {
    if (item.separator || item.submenu || isDisabledItem(item, menuLabel)) return
    if (isCompactMenuLayout && openSubmenu) {
      suppressMenuToggleUntilRef.current = performance.now() + MENU_TOGGLE_SUPPRESS_DURATION_MS
    }
    flushSync(closeMenus)
    if (item.action) {
      if (menuLabel === 'Edit') {
        onEditAction?.(item.action)
      } else if (menuLabel === 'View') {
        onViewAction?.(item.action)
      } else if (menuLabel === 'Search') {
        onSearchAction?.(item.action)
      } else if (menuLabel === 'Language') {
        onLanguageAction?.(item.action)
      } else if (menuLabel === 'Tools') {
        onToolsAction?.(item.action)
      } else if (menuLabel === 'Macro') {
        onMacroAction?.(item.action)
      } else if (menuLabel === '?') {
        if (item.action === 'npp-home') {
          window.open('https://github.com/tdgeorge/notepad-plus-plus-web', '_blank', 'noopener,noreferrer')
        } else if (item.action === 'npp-project') {
          window.open('https://github.com/tdgeorge/notepad-plus-plus-web', '_blank', 'noopener,noreferrer')
        } else if (item.action === 'npp-docs') {
          window.open('https://github.com/tdgeorge/notepad-plus-plus-web/blob/webapp-main/README.md', '_blank', 'noopener,noreferrer')
        } else if (item.action === 'npp-forum') {
          window.open('https://github.com/tdgeorge/notepad-plus-plus-web/issues', '_blank', 'noopener,noreferrer')
        } else {
          onFileAction?.(item.action)
        }
      } else {
        onFileAction?.(item.action)
      }
    }
  }

  const isChecked = (action) => {
    if (!viewState || !action) return false
    switch (action) {
      case 'word-wrap': return viewState.wordWrap
      case 'show-whitespace': return viewState.showWhitespace
      case 'show-eol': return viewState.showEol
      case 'show-all-chars': return viewState.showAllChars
      case 'show-indent': return viewState.showIndent
      case 'distraction-free': return viewState.distractionFree
      case 'sync-scroll-v': return viewState.syncScrollV
      case 'sync-scroll-h': return viewState.syncScrollH
      case 'document-map': return viewState.docMapOpen
      case 'function-list': return viewState.funcListOpen
      case 'text-dir-rtl': return viewState.textDirection === 'rtl'
      case 'text-dir-ltr': return viewState.textDirection === 'ltr'
      case 'lang-plain-text': return viewState.language == null
      default:
        if (action.startsWith('lang-')) {
          const langId = action.slice(5)
          return viewState.language === langId
        }
        return false
    }
  }

  const isDisabledItem = (item, menuLabel, depth = 0) => {
    if (item.disabled) return true
    if (menuLabel === 'Encoding' && !item.action) return true
    if (depth > 4) return false
    if (item.submenu) {
      return menuLabel === 'Edit'
        ? item.submenu.every((subitem) => subitem.separator || isDisabledItem(subitem, menuLabel, depth + 1))
        : false
    }
    if (menuLabel === 'Edit') {
      return isUnavailableEditAction(item.action, hasClipboardWriteSupport)
    }
    if (!item.action) return false
    switch (item.action) {
      case 'reload': return !fileState?.hasFileHandle
      case 'closeAllToLeft':
        return (fileState?.activeTabIndex ?? 0) === 0
      case 'closeAllToRight':
        return (fileState?.activeTabIndex ?? -1) >= (fileState?.tabCount ?? 0) - 1
      case 'macro-start-recording':
        return Boolean(macroState?.isRecording)
      case 'macro-stop-recording':
        return !macroState?.isRecording
      case 'macro-playback':
        return Boolean(macroState?.isRecording) || !macroState?.hasRunnableMacro
      case 'macro-save-current':
        return Boolean(macroState?.isRecording) || !macroState?.hasCurrentMacro
      case 'macro-run-multiple':
        return Boolean(macroState?.isRecording) || !macroState?.hasRunnableMacro
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
      const disabled = isDisabledItem(item, menuLabel)
      if (item.submenu) {
        return (
          <li
            key={idx}
            className={`${styles.dropdownItem} ${styles.hasSubmenu}${disabled ? ` ${styles.disabledItem}` : ''}`}
            onMouseEnter={() => !disabled && !isCompactMenuLayout && openSubmenuItem(submenuKey)}
            onClick={() => !disabled && (openSubmenu === submenuKey ? setOpenSubmenu(null) : openSubmenuItem(submenuKey))}
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={!disabled && openSubmenu === submenuKey}
            aria-disabled={disabled ? 'true' : undefined}
          >
            <span className={styles.checkmark} aria-hidden="true" />
            <span className={styles.itemLabel}>{item.label}</span>
            <span className={styles.submenuArrow} aria-hidden="true" />
            {!isCompactMenuLayout && !disabled && openSubmenu === submenuKey && (
              <ul
                ref={submenuRef}
                className={styles.submenuDropdown}
                style={submenuStyle ?? undefined}
                role="menu"
              >
                {item.submenu.map((subitem, subIdx) => {
                  if (subitem.separator) {
                    return <li key={subIdx} className={styles.separator} role="separator" />
                  }
                  const subitemDisabled = isDisabledItem(subitem, menuLabel)
                  return (
                    <li
                      key={subIdx}
                      className={`${styles.dropdownItem}${subitemDisabled ? ` ${styles.disabledItem}` : ''}`}
                      onClick={(e) => { e.stopPropagation(); handleItemClick(subitem, menuLabel) }}
                      role="menuitem"
                      aria-disabled={subitemDisabled ? 'true' : undefined}
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
                })}
              </ul>
            )}
          </li>
        )
      }
      return (
        <li
          key={idx}
          className={`${styles.dropdownItem}${disabled ? ` ${styles.disabledItem}` : ''}`}
          onClick={() => handleItemClick(item, menuLabel)}
          onMouseEnter={() => {
            if (!isCompactMenuLayout) {
              setOpenSubmenu(null)
            }
          }}
          role="menuitem"
          aria-disabled={disabled ? 'true' : undefined}
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
  const activeCompactSubmenu = isCompactMenuLayout && activeMenu && openSubmenu
    ? activeMenu.items.find((item, idx) => item.submenu && `${activeMenu.label}-${idx}` === openSubmenu)
    : null

  const portalDropdown = mounted && activeMenu && dropdownPos ? createPortal(
    <ul
      ref={dropdownRef}
      className={styles.dropdown}
      style={{
        position: 'fixed',
        top: dropdownPos.top,
        left: dropdownPos.left + (dropdownLeft ?? 0),
        // Use window.innerHeight so the cap reflects the *actual* visible viewport
        // height. 100vh is unreliable on iOS Safari when the address bar is
        // visible and can be ~100 px taller than the usable area, which lets the
        // menu extend below the fold without ever overflowing its maxHeight,
        // causing overflow-y: auto to never activate.
        maxHeight: `${window.innerHeight - dropdownPos.top - 8}px`,
        overflowY: 'auto',
      }}
      role="menu"
    >
      {activeCompactSubmenu && (
        <li className={styles.submenuHeader} role="presentation">
          <button
            type="button"
            className={styles.submenuBackButton}
            onClick={() => setOpenSubmenu(null)}
          >
            ‹ {activeCompactSubmenu.label}
          </button>
        </li>
      )}
      {renderItems(activeCompactSubmenu?.submenu ?? activeMenu.items, activeMenu.label)}
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
              onClick={(e) => {
                if (isMenuToggleSuppressed()) {
                  e.stopPropagation()
                  return
                }
                if (openMenu === menu.label) {
                  closeMenus()
                  return
                }
                openMenuItem(menu.label)
              }}
              onMouseEnter={() => {
                if (isMenuToggleSuppressed()) return
                if (openMenu !== null) openMenuItem(menu.label)
              }}
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
