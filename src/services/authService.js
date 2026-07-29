import api from './api'

export const authService = {
    async register(userData) {
        const { data } = await api.post('/auth/register', userData)
        return data
    },

    async login(credentials) {
        const { data } = await api.post('/auth/login', credentials)
        if (data.access_token) {
            localStorage.setItem('accessToken', data.access_token)
        }
        if (data.refresh_token) {
            localStorage.setItem('refreshToken', data.refresh_token)
        }
        return data
    },

    async refreshToken() {
        const refreshToken = localStorage.getItem('refreshToken')
        const { data } = await api.post('/auth/refresh', {
            refresh_token: refreshToken
        })
        if (data.access_token) {
            localStorage.setItem('accessToken', data.access_token)
        }
        if (data.refresh_token) {
            localStorage.setItem('refreshToken', data.refresh_token)
        }
        return data
    },

    async logout() {
        const refreshToken = localStorage.getItem('refreshToken')
        try {
            await api.post('/auth/logout', {
                refresh_token: refreshToken
            })
        } catch (err) {
            console.error('Ошибка при выходе:', err)
        } finally {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
        }
    }
}