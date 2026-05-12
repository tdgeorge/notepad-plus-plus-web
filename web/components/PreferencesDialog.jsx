'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './PreferencesDialog.module.css'

// Preset fluent icon colors matching the C++ implementation
const COLOR_PRESETS = [
  { id: 'defaultColor', label: 'Default', hex: null },
  { id: 'red',         label: 'Red',     hex: '#E81123' },
  { id: 'green',       label: 'Green',   hex: '#008B00' },
  { id: 'blue',        label: 'Blue',    hex: '#0078D4' },
  { id: 'purple',      label: 'Purple',  hex: '#B146C2' },
  { id: 'cyan',        label: 'Cyan',    hex: '#00B7C3' },
  { id: 'olive',       label: 'Olive',   hex: '#498205' },
  { id: 'yellow',      label: 'Yellow',  hex: '#FFB900' },
  { id: 'custom',      label: 'Custom',  hex: null },
]

const ICON_SETS = [
  { id: 'small',        label: 'Small fluent icons (set 1)' },
  { id: 'large',        label: 'Large fluent icons (set 1)' },
  { id: 'small-filled', label: 'Small fluent icons (set 2)' },
  { id: 'large-filled', label: 'Large fluent icons (set 2)' },
  { id: 'standard',     label: 'Standard bitmap icons' },
]

export default function PreferencesDialog({
  isOpen,
  toolbarSettings,
  onApply,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('toolbar')
  const [iconSet, setIconSet] = useState(toolbarSettings?.iconSet ?? 'small')
  const [iconColor, setIconColor] = useState(toolbarSettings?.iconColor ?? 'defaultColor')
  const [iconMonochrome, setIconMonochrome] = useState(toolbarSettings?.iconMonochrome ?? false)
  const [customColor, setCustomColor] = useState(toolbarSettings?.customColor ?? '#0078D4')
  const closeBtnRef = useRef(null)

  // Sync local state when dialog opens or settings change externally
  useEffect(() => {
    if (isOpen) {
      setIconSet(toolbarSettings?.iconSet ?? 'small')
      setIconColor(toolbarSettings?.iconColor ?? 'defaultColor')
      setIconMonochrome(toolbarSettings?.iconMonochrome ?? false)
      setCustomColor(toolbarSettings?.customColor ?? '#0078D4')
      setTimeout(() => closeBtnRef.current?.focus(), 0)
    }
  }, [isOpen, toolbarSettings])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isStandard = iconSet === 'standard'
  const isCustomColor = iconColor === 'custom'

  const handleOk = () => {
    onApply({ iconSet, iconColor, iconMonochrome, customColor })
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Preferences"
      >
        <div className={styles.titleBar}>
          <span>Preferences</span>
          <button
            ref={closeBtnRef}
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Tab bar */}
        <div className={styles.tabs} role="tablist" aria-label="Preferences tabs">
          <button
            role="tab"
            aria-selected={activeTab === 'toolbar'}
            className={`${styles.tab} ${activeTab === 'toolbar' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('toolbar')}
          >
            Toolbar
          </button>
        </div>

        {/* Toolbar tab */}
        {activeTab === 'toolbar' && (
          <div className={styles.body}>
            {/* Icon set selection */}
            <fieldset className={styles.group}>
              <legend className={styles.groupLabel}>Icon set</legend>
              <div className={styles.radioList}>
                {ICON_SETS.map(({ id, label }) => (
                  <label key={id} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="iconSet"
                      value={id}
                      checked={iconSet === id}
                      onChange={() => setIconSet(id)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Icon color (disabled for standard) */}
            <fieldset className={`${styles.group} ${isStandard ? styles.disabled : ''}`} disabled={isStandard}>
              <legend className={styles.groupLabel}>Icon color</legend>
              <div className={styles.colorGrid}>
                {COLOR_PRESETS.map(({ id, label, hex }) => (
                  <label key={id} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="iconColor"
                      value={id}
                      checked={iconColor === id}
                      onChange={() => setIconColor(id)}
                      disabled={isStandard}
                    />
                    <span className={styles.colorLabelText}>
                      {hex && (
                        <span
                          className={styles.colorSwatch}
                          style={{ background: hex }}
                          aria-hidden="true"
                        />
                      )}
                      {label}
                    </span>
                  </label>
                ))}
              </div>
              {isCustomColor && !isStandard && (
                <div className={styles.customColorRow}>
                  <label className={styles.radioLabel} htmlFor="customColorPicker">
                    Custom color:
                  </label>
                  <input
                    id="customColorPicker"
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className={styles.colorPicker}
                  />
                  <span className={styles.customColorHex}>{customColor.toUpperCase()}</span>
                </div>
              )}
            </fieldset>

            {/* Colorization mode */}
            <fieldset className={`${styles.group} ${isStandard ? styles.disabled : ''}`} disabled={isStandard}>
              <legend className={styles.groupLabel}>Colorization mode</legend>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="monoMode"
                  checked={!iconMonochrome}
                  onChange={() => setIconMonochrome(false)}
                  disabled={isStandard}
                />
                Partial — colorize only accent elements
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="monoMode"
                  checked={iconMonochrome}
                  onChange={() => setIconMonochrome(true)}
                  disabled={isStandard}
                />
                Complete — colorize all icon pixels (monochrome)
              </label>
            </fieldset>
          </div>
        )}

        <div className={styles.buttons}>
          <button className={styles.btnPrimary} onClick={handleOk}>OK</button>
          <button className={styles.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
