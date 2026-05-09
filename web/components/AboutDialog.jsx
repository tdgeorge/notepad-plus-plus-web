'use client'

import { useEffect, useRef } from 'react'
import styles from './AboutDialog.module.css'

const VERSION = '1.2.0'
const GITHUB_URL = 'https://github.com/tdgeorge/notepad-plus-plus-web'

export default function AboutDialog({ isOpen, onClose }) {
  const closeBtnRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => closeBtnRef.current?.focus(), 0)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="About glitch.txt">
        <div className={styles.titleBar}>
          <span>About glitch.txt</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={styles.body}>
          <div className={styles.appName}>glitch.txt</div>
          <div className={styles.version}>Version {VERSION}</div>
          <hr className={styles.divider} />
          <p className={styles.description}>
            A web-based text editor inspired by Notepad++, built with Next.js and running entirely in your browser.
          </p>
          <p className={styles.disclaimer}>
            This is an independent web adaptation and is not affiliated with, endorsed by, or connected to the official Notepad++ project or its author.
          </p>
          <div className={styles.link}>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.githubLink}
            >
              View source on GitHub
            </a>
          </div>
        </div>
        <div className={styles.buttons}>
          <button ref={closeBtnRef} className={styles.btn} onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  )
}
