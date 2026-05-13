# Remaining Differences: C++ Notepad++ vs Web Version

This document lists all known features present in the C++ Notepad++ desktop application that are not yet fully implemented in the web version (glitch.txt).

Items marked **N/A** are inherently unavailable in a browser context. All others are implementation gaps that could potentially be addressed.

---

## File Menu

| Feature | Status |
|---------|--------|
| Open Containing Folder → Explorer / cmd | Not implemented — no OS shell access |
| Open Containing Folder → Folder as Workspace | Not implemented |
| Open in Default Viewer | Not implemented — no OS shell access |
| Open Folder as Workspace | Not implemented |
| Move to Recycle Bin | Not implemented — no file-system delete access |

---

## Edit Menu

| Feature | Status |
|---------|--------|
| Begin/End Select (`Alt+Shift+B`) | Not implemented |
| Begin/End Select in Column Mode | Not implemented |
| Auto-Completion — Function Completion | Not implemented |
| Auto-Completion — Word Completion | Not implemented |
| Auto-Completion — Function Parameters Hint / Previous / Next | Not implemented |
| Auto-Completion — Path Completion | Not implemented |
| Paste Special — Paste HTML Content | Not implemented |
| Paste Special — Paste RTF Content | Not implemented |
| Paste Special — Copy / Cut / Paste Binary Content | Not implemented |
| On Selection — Open File | Not implemented |
| On Selection — Open Containing Folder in Explorer | Not implemented |
| On Selection — Redact Selection | Not implemented |
| On Selection — Search on Internet | Not implemented |
| On Selection — Change Search Engine | Not implemented |
| Multi-select All (all four variants) | Not implemented |
| Multi-select Next (all four variants) | Not implemented |
| Undo the Latest Added Multi-Select | Not implemented |
| Skip Current & Go to Next Multi-select | Not implemented |
| Column Mode... | Not implemented |
| Column Editor... | Not implemented |
| Character Panel | Not implemented |
| Clipboard History | Not implemented |
| Read-Only on Current Document | Not implemented |
| Read-Only for All Documents | Not implemented |
| Clear Read-Only for All Documents | Not implemented |
| Read-Only Attribute in Windows | **N/A** — Windows file attribute only |

---

## Search Menu

| Feature | Status |
|---------|--------|
| Find in Files (`Ctrl+Shift+F`) | Not implemented — no file-system search |
| Find (Volatile) Next / Previous | Not implemented |
| Search Results Window | Not implemented |
| Next / Previous Search Result | Not implemented |
| Select All In-between `{}` `[]` or `()` | Not implemented |
| Regular expression support in Find / Replace | Not implemented |
| Change History — Go to Next / Previous Change | Not implemented |
| Change History — Clear Change History | Not implemented |
| Style All Occurrences of Token (5 styles) | Not implemented |
| Style One Token (5 styles) | Not implemented |
| Clear Style (5 styles + all) | Not implemented |
| Jump Up / Down by style (5 styles + Find Mark) | Not implemented |
| Copy Styled Text (5 styles + all) | Not implemented |
| Find characters in range... | Not implemented |

---

## View Menu

| Feature | Status |
|---------|--------|
| Always on Top | **N/A** — OS window management only |
| Post-It (transparent topmost window) | **N/A** — OS window management only |
| Show Non-Printing Characters | Not implemented |
| Show Control Characters & Unicode EOL | Not implemented |
| Show Wrap Symbol | Not implemented |
| Synchronize Zoom Across Views | Not implemented |
| Move to New Instance | **N/A** — no multi-instance concept in browser |
| Open in New Instance | **N/A** — no multi-instance concept in browser |
| Fold Current Level | Not implemented |
| Unfold Current Level | Not implemented |
| Fold Level 1–8 | Not implemented |
| Unfold Level 1–8 | Not implemented |
| Project Panel 1 / 2 / 3 | Not implemented |
| Folder as Workspace panel | Not implemented |
| Monitoring (tail -f) | Not implemented — no file-system watching |

---

## Encoding Menu

| Feature | Status |
|---------|--------|
| Switching active encoding (ANSI, UTF-8-BOM, UTF-16 BE/LE BOM) | Not implemented — browser is always UTF-8 |
| Character sets (Arabic, Baltic, Cyrillic, Chinese, etc.) | Not implemented |
| Convert to ANSI / UTF-8-BOM / UTF-16 BE/LE BOM | Not implemented |

---

## Language Menu

| Feature | Status |
|---------|--------|
| User Defined Language — Define your language... | Not implemented |
| User Defined Language — Open UDL folder... | Not implemented |
| User Defined Language — Notepad++ UDL Collection | Not implemented |
| User-Defined languages in the language list | Not implemented |

---

## Settings Menu

| Feature | Status |
|---------|--------|
| Shortcut Mapper | Not implemented — keyboard shortcuts are not user-configurable |
| Import plugin(s)... | Not implemented |
| Import style theme(s)... | Not implemented |
| Edit Popup ContextMenu | Not implemented |
| Preferences — most setting tabs (auto-complete, backup, MISC, new document defaults, etc.) | Not implemented — only toolbar icon preferences are exposed |

---

## Tools Menu

| Feature | Status |
|---------|--------|
| MD5 / SHA-1 / SHA-256 / SHA-512 — Generate from files... | Not implemented — no file-system access |

---

## Run Menu

| Feature | Status |
|---------|--------|
| Run... (`F5`) | **N/A** — cannot launch external programs from a browser |

---

## Plugins Menu

| Feature | Status |
|---------|--------|
| Plugins Admin... | Not implemented — no plugin system |
| Open Plugins Folder... | **N/A** — no plugin system |
| All third-party plugins (Compare, HexEditor, etc.) | Not implemented — no plugin system |

---

## Window Menu

| Feature | Status |
|---------|--------|
| Sort By Path (A→Z, Z→A) | Not implemented — no file-path metadata |
| Sort By Modified Time (Ascending / Descending) | Not implemented — no modification-time metadata |
| Recent Window | Not implemented |

---

## Help (?) Menu

| Feature | Status |
|---------|--------|
| Command Line Arguments... | **N/A** — no command-line interface for browser app |
| Update Notepad++ | **N/A** — web app is always the latest deployed version |
| Set Updater Proxy... | **N/A** — no updater |

---

## Editor Features (Not Menu-Driven)

| Feature | Status |
|---------|--------|
| Column / rectangular selection (`Alt`+drag) | Not implemented |
| Multiple cursors via `Alt`+click | Not implemented |
| Auto-close brackets, parentheses, and quotes | Not implemented |
| Auto-close HTML/XML tags | Not implemented |
| Smart indent per language | Not implemented — browser-native indent only |
| Tab / indent settings per language | Not implemented |
| Overtype / insert mode toggle (`Insert` key, OVR in status bar) | Not implemented — status bar shows INS but mode is fixed |
| Brace/bracket match highlighting at caret | Not implemented (go-to-matching-brace works, but no visual highlight) |
| Calltip / parameter-hint popups | Not implemented |

---

## Style Configurator

| Feature | Status |
|---------|--------|
| Per-language and per-token style editing (font, foreground, background, bold, italic) | Not implemented — only global theme switching is available |
| Global override styles | Not implemented |
| Save / restore custom style sets | Not implemented |

---

## Status Bar

| Feature | Status |
|---------|--------|
| OVR mode display and toggle | Not implemented — always shows INS |
| Document count / position indicator | Not implemented |

---

## System / OS Integration

| Feature | Status |
|---------|--------|
| System tray icon and minimize-to-tray | **N/A** |
| Shell extension (right-click "Edit with Notepad++") | **N/A** |
| File-change detection and reload prompt | Not implemented — no file-system watching |
| Jump list / taskbar pinning (Windows) | **N/A** |
