import api, { API_URL } from './api'

export const notificationService = {
    connectToSever({ onEvent }) {
        const token = localStorage.getItem('accessToken')
        const wsUrl = `${API_URL.replace(/^http/, 'ws')}/notifications/ws?token=${token}`
        const ws = new WebSocket(wsUrl)

        ws.onmessage = (event) => {
            onEvent(JSON.parse(event.data))
            console.log(JSON.parse(event.data))
        }

        return ws
    }
}