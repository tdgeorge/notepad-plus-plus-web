const MOBILE_UA_RE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i

function getLocationHref(win) {
  try {
    return win?.location?.href ?? null
  } catch {
    return null
  }
}

function hasNavigatedAway(win, initialHref) {
  const currentHref = getLocationHref(win)
  return (
    typeof initialHref === 'string' &&
    typeof currentHref === 'string' &&
    currentHref !== initialHref
  )
}

export function isMobileBrowserContext(win) {
  const userAgent = win?.navigator?.userAgent ?? ''
  if (MOBILE_UA_RE.test(userAgent)) return true

  if (typeof win?.matchMedia === 'function') {
    try {
      if (win.matchMedia('(pointer: coarse)').matches) return true
    } catch {
      // ignore
    }
  }

  return false
}

export function handleBrowserExit(win = window) {
  if (!win) return

  const initialHref = getLocationHref(win)
  win.close?.()

  if (!isMobileBrowserContext(win)) return
  if (win.closed || hasNavigatedAway(win, initialHref)) return

  try {
    const currentWindow = win.open?.('', '_self')
    currentWindow?.close?.()
  } catch {
    // ignore
  }

  if (win.closed || hasNavigatedAway(win, initialHref)) return

  try {
    win.location?.replace?.('about:blank')
  } catch {
    // ignore
  }
}
