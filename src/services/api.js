import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

const api = axios.create({
    baseURL: API_URL
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })
    failedQueue = []
}

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (originalRequest.url === '/auth/refresh') {
                localStorage.removeItem('accessToken')
                localStorage.removeItem('refreshToken')
                window.location.href = '/login'
                return Promise.reject(error)
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`
                    return api(originalRequest)
                }).catch(err => Promise.reject(err))
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                const refreshToken = localStorage.getItem('refreshToken')
                const { data } = await axios.post(`${API_URL}/auth/refresh`, {
                    refresh_token: refreshToken
                })

                const newAccessToken = data.access_token
                const newRefreshToken = data.refresh_token

                localStorage.setItem('accessToken', newAccessToken)
                localStorage.setItem('refreshToken', newRefreshToken)

                api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

                processQueue(null, newAccessToken)

                return api(originalRequest)
            } catch (refreshError) {
                processQueue(refreshError, null)
                localStorage.removeItem('accessToken')
                localStorage.removeItem('refreshToken')
                window.location.href = '/login'
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        return Promise.reject(error)
    }
)

export default api