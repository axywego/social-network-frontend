import api from './api'

export const userService = {
    async getMyProfile() {
        const { data } = await api.get('/users/me')
        return data
    },

    async getUserById(userId) {
        const { data } = await api.get(`/users/${userId}`)
        return data
    },

    async searchUsers(query, { limit = 20, offset = 0, signal } = {}) {
        const { data } = await api.get('/users/search', {
            params: { q: query, limit, offset },
            signal
        })
        return data
    },

    async changeInfo(payload) {
        const { data } = await api.put('/users/me/change_info', payload)
        return data
    },

    async uploadAvatar(file) {
        const formData = new FormData()
        formData.append('file', file)

        const { data } = await api.patch('/users/me/change_avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        return data
    }
}