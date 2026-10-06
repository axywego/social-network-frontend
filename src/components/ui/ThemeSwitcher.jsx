import { useState, useRef, useEffect, useCallback } from 'react'
import { Check, Palette } from 'lucide-react'
import { useTheme, THEMES } from '../../context/ThemeContext'
import styles from './ThemeSwitcher.module.css'

/**
 * Preview colours for the palette picker. Two stops per theme is
 * enough to read the mood; the real palette lives in themes.css.
 */
const SWATCHES = {
    system: 'linear-gradient(135deg, #EDF2ED 50%, #0A100C 50%)',
    day: 'linear-gradient(135deg, #FFFFFF, #2F7A4F)',
    night: 'linear-gradient(135deg, #121B15, #4FC98A)',
    mist: 'linear-gradient(135deg, #FFFFFF, #2C5F8A)',
    peach: 'linear-gradient(135deg, #FFFDFB, #B85C38)',
    ocean: 'linear-gradient(135deg, #0F1C27, #38A8C9)',
    sunset: 'linear-gradient(135deg, #1F1519, #E0763F)',
    graphite: 'linear-gradient(135deg, #141417, #C9C9D2)',
}

export default function ThemeSwitcher({ className = '' }) {
    const { theme, resolved, setTheme, systemDark } = useTheme()
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)
    const menuRef = useRef(null)
    const triggerRef = useRef(null)

    const activeLabel = THEMES.find((t) => t.id === theme)?.label ?? 'Тема'

    const close = useCallback(({ restoreFocus = false } = {}) => {
        setOpen(false)
        if (restoreFocus) triggerRef.current?.focus()
    }, [])

    // Dismiss on outside pointerdown.
    useEffect(() => {
        if (!open) return undefined

        const handlePointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) close()
        }
        document.addEventListener('pointerdown', handlePointerDown)
        return () => document.removeEventListener('pointerdown', handlePointerDown)
    }, [open, close])

    // Escape closes and returns focus to the trigger.
    useEffect(() => {
        if (!open) return undefined

        const handleKey = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation()
                close({ restoreFocus: true })
            }
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [open, close])

    // Move focus into the menu so keyboard users are not stranded.
    useEffect(() => {
        if (open) menuRef.current?.querySelector('button')?.focus()
    }, [open])

    const handleSelect = (id) => {
        setTheme(id)
        close({ restoreFocus: true })
    }

    const handleTriggerKeyDown = (event) => {
        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen(true)
        }
    }

    return (
        <div ref={rootRef} className={`${styles.root} ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                className={`glass-surface ${styles.trigger}`}
                onClick={() => setOpen((v) => !v)}
                onKeyDown={handleTriggerKeyDown}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Тема оформления: ${activeLabel}`}
                title="Тема оформления"
            >
                <Palette className={styles.triggerIcon} aria-hidden="true" />
                <span className={styles.triggerLabel}>{activeLabel}</span>
            </button>

            {open && (
                <div className={styles.menu}>
                    <div
                        ref={menuRef}
                        className={`glass-surface glass-surface--strong glass-surface--lift ${styles.panel}`}
                        role="menu"
                        aria-label="Выбор темы"
                    >
                        <p className={styles.hint}>
                            {systemDark ? 'Система: тёмная' : 'Система: светлая'}
                        </p>
                        {THEMES.map(({ id, label }) => {
                            const selected = id === theme
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={selected}
                                    className={`${styles.option} ${selected ? styles.optionActive : ''}`}
                                    onClick={() => handleSelect(id)}
                                    tabIndex={selected ? 0 : -1}
                                >
                                    <span
                                        className={styles.swatch}
                                        style={{ backgroundImage: SWATCHES[id] }}
                                        aria-hidden="true"
                                    />
                                    <span className={styles.optionLabel}>{label}</span>
                                    {id === 'system' && (
                                        <span className={styles.resolvedHint}>
                                            → {resolved === 'night' ? 'тёмная' : 'светлая'}
                                        </span>
                                    )}
                                    {selected && (
                                        <Check className={styles.check} aria-hidden="true" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}