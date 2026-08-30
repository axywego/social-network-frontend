import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { notificationService } from '../services/notificationService'
import { useAuthContext } from './AuthContext'
import ToastContainer from '../components/ToastContainer'

const NotificationContext = createContext(null)
const MAX_TOASTS = 5
const TOAST_DURATION = 5000

let toastIdCounter = 0

function formatToast(notification) {
    switch (notification.type) {
        case 'new_message':
            return { 
                title:  notification.chat_name ?
                    `${notification.chat_name} - ${notification.sender_name}` : notification.sender_name,
                text: notification.message }
        case 'new_friend':
            return { title: notification.sender_name, text: notification.message }
        case 'new_comment':
            return { title: notification.comment_author, text: notification.message }
        case 'new_like':
            return { title: notification.like_author, text: notification.message }
        default:
            return { title: 'Уведомление', text: notification.message ?? '' }
    }
}

export function NotificationProvider({ children }) {
    const { currentUser } = useAuthContext()
    const listenersRef = useRef(new Set())
    const wsRef = useRef(null)
    const [toasts, setToasts] = useState([])
    const [onlineUsers, setOnlineUsers] = useState(() => new Set())

    const activeChatIdRef = useRef(null)

    const setActiveChatId = useCallback((chatId) => {
        activeChatIdRef.current = chatId
    }, [])

    const getActiveChatId = useCallback(() => activeChatIdRef.current, [])

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const pushToast = useCallback((notification) => {
        const { title, text } = formatToast(notification)
        const id = ++toastIdCounter

        setToasts(prev => {
            const next = [...prev, { id, type: notification.type, title, text }]
            return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
        })

        setTimeout(() => removeToast(id), TOAST_DURATION)
    }, [removeToast])

    useEffect(() => {
        if (!currentUser) {
            wsRef.current?.close()
            wsRef.current = null
            setOnlineUsers(new Set())
            return
        }

        const conn = notificationService.connectToSever({
            onEvent: (notification) => {
                // Обновление одного юзера: он стал онлайн/офлайн
                if (notification.type === 'presence') {
                    setOnlineUsers(prev => {
                        const next = new Set(prev)
                        if (notification.online) {
                            next.add(notification.user_id)
                        } else {
                            next.delete(notification.user_id)
                        }
                        return next
                    })
                    return
                }

                // Начальный снепшот текущего онлайна при подключении
                if (notification.type === 'presence_snapshot') {
                    setOnlineUsers(new Set(notification.online))
                    return
                }

                listenersRef.current.forEach(listener => listener(notification))
                pushToast(notification)
            }
        })
        wsRef.current = conn

        return () => {
            conn.close()
            wsRef.current = null
        }
    }, [currentUser?.id, pushToast])

    const subscribe = useCallback((listener) => {
        listenersRef.current.add(listener)
        return () => listenersRef.current.delete(listener)
    }, [])

    const isUserOnline = useCallback(
        (userId) => onlineUsers.has(userId),
        [onlineUsers]
    )

    return (
        <NotificationContext.Provider
            value={{ subscribe, setActiveChatId, getActiveChatId, isUserOnline }}
        >
            {children}
            <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    const ctx = useContext(NotificationContext)
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
    return ctx
}