import api from './api'

const API_BASE_URL = 'http://127.0.0.1:8000'

export const chatService = {
    async getChats() {
        const { data } = await api.get('/chats')
        console.log(data)
        return data
    },

    async createChat(payload) {
        const { data } = await api.post('/chats/create_chat', payload)
        return data
    },

    async getMessages(chatId) {
        const { data } = await api.get(`/chats/${chatId}/messages`)
        return data
    },

    async sendMessage(chatId, payload) {
        const { data } = await api.post(`/chats/${chatId}/messages`, payload)
        return data
    },

    async fetchImageBlob(imageUrl) {
        const { data } = await api.get(imageUrl, { responseType: 'blob' })
        return URL.createObjectURL(data)
    },

    async uploadChatImage(chatId, file) {
        const formData = new FormData()
        formData.append('file', file)

        const { data } = await api.post(`/chats/${chatId}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        return data
    }
}