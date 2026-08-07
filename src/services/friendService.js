import api from './api'

export const friendService = {
    async getFriends() {
        const { data } = await api.get('/friends/list')
        return data
    },

    async getIncomingRequests() {
        const { data } = await api.get('/friends/incoming_requests')
        return data
    },

    async getOutgoingRequests() {
        const { data } = await api.get('/friends/outgoing_requests')
        return data
    },

    async sendRequest(targetLogin) {
        const { data } = await api.post('/friends/send_request', { target_login: targetLogin })
        return data
    },

    async acceptRequest(targetLogin) {
        const { data } = await api.put('/friends/accept_request', { target_login: targetLogin })
        return data
    },

    async declineRequest(targetLogin) {
        const { data } = await api.delete('/friends/decline_request', { data: { target_login: targetLogin } })
        return data
    },

    async removeFriend(targetLogin) {
        const { data } = await api.delete('/friends/remove_friend', { data: { target_login: targetLogin } })
        return data
    }
}