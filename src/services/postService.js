import api from './api'

const API_BASE_URL = 'http://127.0.0.1:8000'

export const postService = {
    async getFeed() {
        const { data } = await api.get('/posts/recent')
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
        return imageUrl ? `${API_BASE_URL}${imageUrl}` : null
    }
}