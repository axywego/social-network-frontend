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

    async getMessages(chatId, {limit = 30, before} = {}) {
        const params = new URLSearchParams({limit})
        if (before) params.append('before', before)
        const { data } = await api.get(`/chats/${chatId}/messages?${params}`)
        return data
    },

    async sendMessage(chatId, payload) {
        const { data } = await api.post(`/chats/${chatId}/messages`, payload)
        return data
    },

    async editMessage(chatId, messageId, payload) {
        const { data } = await api.patch(`/chats/${chatId}/edit/${messageId}`, payload)
        return data
    },

    async deleteMessage(chatId, messageId) {
        const { data } = await api.delete(`/chats/${chatId}/delete/${messageId}`)
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

    connectToChat(chatId, { onMessage, onRead, onOpen, onEdit, onDelete }) {
        const token = localStorage.getItem('accessToken')
        const wsUrl = `${API_URL.replace(/^http/, 'ws')}/chats/ws/${chatId}?token=${token}`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => onOpen?.()
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (data.type === 'message_read') {
                onRead?.(data)
            } else if (data.type === 'message_edited') {
                onEdit?.(data.message)
            } else if (data.type === 'message_deleted') {
                onDelete?.(data.message_id)
            } else {
                onMessage?.(data)
            }
        }

        return {
            close: () => ws.close(),
            markRead: (messageId) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'read', message_id: messageId }))
                }
            }
        }
    }
}
