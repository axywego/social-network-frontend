import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { userService } from '../services/userService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [profileError, setProfileError] = useState(false)

    const loadCurrentUser = useCallback(async () => {
        const me = await userService.getMyProfile()
        setCurrentUser(me)
        setProfileError(false)
        return me
    }, [])

    const handleProfileError = useCallback((err) => {
        console.error('Не удалось загрузить профиль:', err)
        if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            setIsAuthenticated(false)
            setCurrentUser(null)
        } else {
            setProfileError(true)
        }
    }, [])

    useEffect(() => {
        const token = localStorage.getItem('accessToken')
        if (token) {
            setIsAuthenticated(true)
            loadCurrentUser().catch(handleProfileError).finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [loadCurrentUser, handleProfileError])

    const login = async () => {
        try {
            await loadCurrentUser()
            setIsAuthenticated(true)
        } catch (err) {
            handleProfileError(err)
            throw err
        }
    }

    const logout = () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        setIsAuthenticated(false)
        setCurrentUser(null)
        setProfileError(false)
    }

    const retryProfile = async () => {
        setLoading(true)
        try {
            await loadCurrentUser()
        } catch (err) {
            handleProfileError(err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div>Загрузка...</div>
    }

    if (profileError && isAuthenticated) {
        return <div className="auth-recovery" role="alert">
            <p>Не удалось загрузить профиль. Проверьте соединение и попробуйте снова.</p>
            <button type="button" onClick={retryProfile}>Повторить</button>
            <button type="button" onClick={logout}>Выйти</button>
        </div>
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, currentUser, login, logout, refreshUser: loadCurrentUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuthContext() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuthContext должен использоваться внутри AuthProvider')
    }
    return context
}
