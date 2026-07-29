import api from './api'

export const userService = {
    async getUsers() {
        const { data } = await api.get('/users')
        return data
    },

    async getMyProfile() {
        const { data } = await api.get('/users/me')

        const token = localStorage.getItem('accessToken')
        if (!token) throw new Error('Нет токена')
    
        return data
    }
}