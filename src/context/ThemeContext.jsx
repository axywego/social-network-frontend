import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

/**
 * The selectable themes. `system` is not a palette — ThemeContext
 * resolves it to a concrete id (`day` / `night`) so CSS only ever
 * has to deal with real palettes.
 */
export const THEMES = [
    { id: 'system', label: 'Как в системе' },
    { id: 'day', label: 'Светлая' },
    { id: 'night', label: 'Тёмная' },
    { id: 'mist', label: 'Туман' },
    { id: 'peach', label: 'Персик' },
    { id: 'ocean', label: 'Океан' },
    { id: 'sunset', label: 'Закат' },
    { id: 'graphite', label: 'Графит' },
]

const STORAGE_KEY = 'coova:theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'
const SWITCH_MS = 320

const ThemeContext = createContext(null)

const isKnownTheme = (id) => THEMES.some((t) => t.id === id)

function readStoredTheme() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return isKnownTheme(stored) ? stored : 'system'
    } catch {
        // Private mode / storage disabled — fall back to the OS.
        return 'system'
    }
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(readStoredTheme)
    const [systemDark, setSystemDark] = useState(
        () => typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches
    )

    // Track OS changes so `system` stays live without a reload.
    useEffect(() => {
        const mq = window.matchMedia(DARK_QUERY)
        const handleChange = (event) => setSystemDark(event.matches)
        mq.addEventListener('change', handleChange)
        return () => mq.removeEventListener('change', handleChange)
    }, [])

    const resolved = theme === 'system' ? (systemDark ? 'night' : 'day') : theme

    useEffect(() => {
        const root = document.documentElement

        // `data-switching` enables the colour transition in themes.css.
        // It is added only on user-initiated switches and removed once
        // the animation window closes, so first paint never fades in.
        const isUserSwitch = root.dataset.theme !== undefined
        if (isUserSwitch) {
            root.setAttribute('data-switching', '')
        }

        root.dataset.theme = resolved

        if (!isUserSwitch) return undefined

        const timer = setTimeout(() => root.removeAttribute('data-switching'), SWITCH_MS)
        return () => clearTimeout(timer)
    }, [resolved])

    const setTheme = useCallback((id) => {
        if (!isKnownTheme(id)) return
        setThemeState(id)
        try {
            localStorage.setItem(STORAGE_KEY, id)
        } catch {
            // Persisting is best-effort; the theme still applies.
        }
    }, [])

    const value = useMemo(
        () => ({ theme, resolved, setTheme, systemDark }),
        [theme, resolved, setTheme, systemDark]
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme должен вызываться внутри ThemeProvider')
    return ctx
}