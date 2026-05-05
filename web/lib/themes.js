/**
 * Theme definitions for Notepad++ Web.
 *
 * The "classic" theme mirrors the GlobalStyles from
 * PowerEditor/src/stylers.model.xml verbatim so the app looks like the
 * native Notepad++ desktop application.
 *
 * The "modern" theme is a web-native design that replaces the Windows-style
 * chrome with clean typography, generous border-radius, soft shadows, and a
 * contemporary colour palette.
 *
 * Themes are applied by writing CSS custom properties onto the <html> element
 * (document.documentElement) so they cascade into every CSS Module.
 */

export const THEMES = [
  {
    id: 'classic',
    name: 'Default (Notepad++)',
    description: 'The classic Notepad++ look — faithful to the Windows desktop application.',
    variables: {
      // Chrome shell (menu bar, toolbar, status bar, dialog title bars)
      '--chrome-bg': '#f0f0f0',
      '--chrome-bg-raised': '#f5f5f5',
      '--chrome-bg-title': '#dcdcdc',
      '--chrome-border': '#a0a0a0',
      '--chrome-border-light': '#d0d0d0',
      '--chrome-text': '#000000',
      '--chrome-text-muted': '#333333',
      '--chrome-text-subtle': '#555555',
      '--chrome-hover': '#d8d8d8',
      '--chrome-separator': '#c0c0c0',

      // Accent (active menu items, selection, links)
      '--accent': '#0078d4',
      '--accent-text': '#ffffff',

      // Tab bar
      '--tab-bar-bg': '#bdbdbd',
      '--tab-inactive-bg': '#d4d0c8',
      '--tab-inactive-text': '#333333',
      '--tab-active-bg': '#ffffff',
      '--tab-active-text': '#000000',
      '--tab-hover-bg': '#e8e8e0',
      '--tab-radius': '3px 3px 0 0',

      // Editor area
      '--editor-bg': '#ffffff',
      '--editor-fg': '#000000',
      '--editor-gutter-bg': '#f0f0f0',
      '--editor-gutter-fg': '#888888',
      '--editor-gutter-border': '#d0d0d0',

      // Form controls
      '--btn-bg': '#e8e8e8',
      '--btn-hover-bg': '#d0d0d0',
      '--btn-border': '#a0a0a0',
      '--btn-text': '#000000',
      '--input-bg': '#ffffff',
      '--input-border': '#a0a0a0',

      // Dialogs
      '--dialog-bg': '#f5f5f5',
      '--dialog-shadow': '4px 4px 8px rgba(0, 0, 0, 0.3)',
      '--dialog-radius': '0px',

      // Typography & geometry
      '--font-ui': "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      '--font-editor': "'Courier New', Courier, monospace",
      '--ui-radius': '2px',
    },
  },
  {
    id: 'modern',
    name: 'Modern Web',
    description:
      'A clean, contemporary web design — smooth curves, soft depth, and a system font stack.',
    variables: {
      // Chrome shell
      '--chrome-bg': '#ffffff',
      '--chrome-bg-raised': '#f8f9fa',
      '--chrome-bg-title': '#f1f3f5',
      '--chrome-border': '#dee2e6',
      '--chrome-border-light': '#e9ecef',
      '--chrome-text': '#212529',
      '--chrome-text-muted': '#495057',
      '--chrome-text-subtle': '#6c757d',
      '--chrome-hover': '#f1f3f5',
      '--chrome-separator': '#dee2e6',

      // Accent
      '--accent': '#228be6',
      '--accent-text': '#ffffff',

      // Tab bar
      '--tab-bar-bg': '#f1f3f5',
      '--tab-inactive-bg': '#e9ecef',
      '--tab-inactive-text': '#495057',
      '--tab-active-bg': '#ffffff',
      '--tab-active-text': '#212529',
      '--tab-hover-bg': '#f8f9fa',
      '--tab-radius': '8px 8px 0 0',

      // Editor area
      '--editor-bg': '#ffffff',
      '--editor-fg': '#212529',
      '--editor-gutter-bg': '#f8f9fa',
      '--editor-gutter-fg': '#adb5bd',
      '--editor-gutter-border': '#dee2e6',

      // Form controls
      '--btn-bg': '#f8f9fa',
      '--btn-hover-bg': '#e9ecef',
      '--btn-border': '#ced4da',
      '--btn-text': '#212529',
      '--input-bg': '#ffffff',
      '--input-border': '#ced4da',

      // Dialogs
      '--dialog-bg': '#ffffff',
      '--dialog-shadow':
        '0 20px 60px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
      '--dialog-radius': '12px',

      // Typography & geometry
      '--font-ui':
        "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      '--font-editor':
        "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace",
      '--ui-radius': '6px',
    },
  },
]

export const DEFAULT_THEME_ID = 'classic'

/** Apply a theme's CSS variables to the document root. */
export function applyTheme(themeId) {
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0]
  const root = document.documentElement
  for (const [prop, value] of Object.entries(theme.variables)) {
    root.style.setProperty(prop, value)
  }
}
