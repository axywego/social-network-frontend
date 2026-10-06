import api from './api'

export const complaintService = {
    async getReasons({ signal } = {}) {
        const { data } = await api.get('/complaints/reasons', { signal })
        return data
    },

    async createComplaint({ reportedId, reasonId }) {
        const { data } = await api.post('/complaints/create', {
            reported_id: reportedId,
            reported_by_reason: reasonId,
        })
        return data
    }
}