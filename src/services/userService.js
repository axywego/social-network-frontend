import api from './api'

export const userService = {
    async getUsers() {
        const { data } = await api.get('/users')
        return data
    },

    async getMyProfile() {
        const { data } = await api.get('/users/me')
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