import api from './api'

export const adminService = {
    async getComplaints({ page = 1, size = 20, signal } = {}) {
        const { data } = await api.get('/admin/complaints', {
            params: { page, size },
            signal
        })
        return data
    },

    async approveComplaint(complaintId) {
        const { data } = await api.post(`/admin/complaints/${complaintId}`)
        return data
    },

    async declineComplaint(complaintId) {
        const { data } = await api.delete(`/admin/complaints/${complaintId}`)
        return data
    },

    async getBannedUsers({ page = 1, size = 20, signal } = {}) {
        const { data } = await api.get('/admin/banned', {
            params: { page, size },
            signal
        })
        return data
    },

    async unbanUser(userId) {
        const { data } = await api.delete(`/admin/banned/${userId}`)
        return data
    },

    async getUsers({ page = 1, size = 20, signal } = {}) {
        const { data } = await api.get('/admin/users', {
            params: { page, size },
            signal
        })
        return data
    }
}