import api, { API_URL } from './api'

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

    async getDirectChat(user_id) {
        const { data } = await api.get(`/chats/${user_id}`)
        return data
    },

    async getChatMembers(chatId) {
        const { data } = await api.get(`/chats/${chatId}/members`)
        return data
    },

    async addUserToChat(chatId, userId) {
        const { data } = await api.post('/chats/add_user', { chat_id: chatId, user_id: userId })
        return data
    },

    async removeUserFromChat(chatId, userId) {
        const { data } = await api.delete('/chats/remove_user', { data: { chat_id: chatId, user_id: userId } })
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
    },

    connectToChat(chatId, { onMessage }) {
        const token = localStorage.getItem('accessToken')
        const wsUrl = `${API_URL.replace(/^http/, 'ws')}/chats/ws/${chatId}?token=${token}`
        const ws = new WebSocket(wsUrl)

        ws.onmessage = (event) => {
            onMessage(JSON.parse(event.data))
        }

        return ws
    }
}