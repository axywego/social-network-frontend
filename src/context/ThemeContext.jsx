import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

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
        return 'system'
    }
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(readStoredTheme)
    const [systemDark, setSystemDark] = useState(
        () => typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches
    )

    useEffect(() => {
        const mq = window.matchMedia(DARK_QUERY)
        const handleChange = (event) => setSystemDark(event.matches)
        mq.addEventListener('change', handleChange)
        return () => mq.removeEventListener('change', handleChange)
    }, [])

    const resolved = theme === 'system' ? (systemDark ? 'night' : 'day') : theme

    useEffect(() => {
        const root = document.documentElement

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
            return
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