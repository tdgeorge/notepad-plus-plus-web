import { isMobileBrowserContext } from './exitPage.mjs'

const IOS_UA_RE = /iPad|iPhone|iPod/i

function createExportFile(win, name, content, type) {
  const FileCtor = win?.File ?? globalThis.File
  if (typeof FileCtor !== 'function') return null
  try {
    return new FileCtor([content], name, { type })
  } catch {
    return null
  }
}

export function shouldUseFileShare(win, file) {
  if (!isMobileBrowserContext(win) || !file) return false
  const navigator = win?.navigator
  if (typeof navigator?.share !== 'function' || typeof navigator?.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

export function isIosBrowser(win) {
  return IOS_UA_RE.test(win?.navigator?.userAgent ?? '')
}

export async function downloadFileWithFallback(name, content, type = 'text/plain', win = window) {
  if (!win) return false

  const blob = new Blob([content], { type })
  const exportFile = createExportFile(win, name, content, type)

  if (shouldUseFileShare(win, exportFile)) {
    try {
      await win.navigator.share({ title: name, files: [exportFile] })
      return true
    } catch (error) {
      if (error?.name === 'AbortError') return false
    }
  }

  const url = win.URL?.createObjectURL?.(blob)
  if (!url) return false

  if (type === 'application/pdf' && isIosBrowser(win)) {
    const popup = win.open?.(url, '_blank', 'noopener,noreferrer')
    win.setTimeout?.(() => win.URL?.revokeObjectURL?.(url), 60_000)
    if (popup) {
      return true
    }
    if (typeof win.location?.assign === 'function') {
      win.location.assign(url)
      return true
    }
    if (typeof win.location === 'object' && win.location) {
      win.location.href = url
      return true
    }
  }

  const anchor = win.document?.createElement?.('a')
  if (!anchor) {
    win.URL?.revokeObjectURL?.(url)
    return false
  }

  anchor.href = url
  anchor.download = name
  anchor.rel = 'noopener noreferrer'
  anchor.style.display = 'none'
  win.document?.body?.appendChild?.(anchor)
  anchor.click()
  anchor.remove?.()
  win.setTimeout?.(() => win.URL?.revokeObjectURL?.(url), 1_000)
  return true
}
