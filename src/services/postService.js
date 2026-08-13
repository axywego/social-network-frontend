import api from './api'

const API_URL = import.meta.env.VITE_API_URL

export const postService = {
    async getFeed({limit = 15, before}) {
        const params = new URLSearchParams({ limit })
        if(before) {
            params.append('before', before)
        }
        const { data } = await api.get(`/posts/recent?${params}`)
        return data
    },

    async getMyPosts() {
        const { data } = await api.get('/posts/me')
        return data
    },

    async getUserPosts(userId) {
        const { data } = await api.get(`/posts/${userId}`)
        return data
    },

    async createPost(payload) {
        const { data } = await api.post('/posts/create_post', payload)
        return data
    },

    async deletePost(postId) {
        const { data } = await api.delete(`/posts/${postId}/delete`)
        return data
    },

    async uploadPostImage(postId, file) {
        const formData = new FormData()
        formData.append('file', file)

        const { data } = await api.post(`/posts/${postId}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        return data
    },

    async createComment(payload) {
        const { data } = await api.post('/posts/create_comment', payload)
        return data
    },

    async likePost(postId) {
        await api.post(`/posts/${postId}/like`)
    },

    async unlikePost(postId) {
        await api.delete(`/posts/${postId}/unlike`)
    },

    resolveImageUrl(imageUrl) {
        return imageUrl ? `${API_URL}${imageUrl}` : null
    }
}