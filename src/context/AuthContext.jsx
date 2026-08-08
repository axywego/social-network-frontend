import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { userService } from '../services/userService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const [loading, setLoading] = useState(true)

    const loadCurrentUser = useCallback(async () => {
        try {
            const me = await userService.getMyProfile()
            setCurrentUser(me)
        } catch (err) {
            console.error('Не удалось загрузить профиль:', err)
        }
    }, [])

    useEffect(() => {
        const token = localStorage.getItem('accessToken')
        if (token) {
            setIsAuthenticated(true)
            loadCurrentUser().finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [loadCurrentUser])

    const login = async () => {
        setIsAuthenticated(true)
        await loadCurrentUser()
    }

    const logout = () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        setIsAuthenticated(false)
        setCurrentUser(null)
    }

    if (loading) {
        return <div>Загрузка...</div>
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