import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { chatService } from '../../services/chatService'
import { useAuthContext } from '../../context/AuthContext'
import ChatImage from '../../components/ChatImage'
import styles from './ChatWindowPage.module.css'

function ChatWindowPage() {
    const { chatId } = useParams()
    const navigate = useNavigate()
    const { currentUser } = useAuthContext()

    const [chatName, setChatName] = useState('')
    const [messages, setMessages] = useState([])
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)
    const bottomRef = useRef(null)

    useEffect(() => {
        loadData()
    }, [chatId])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const loadData = async () => {
        try {
            setLoading(true)
            const [chats, msgs] = await Promise.all([
                chatService.getChats(),
                chatService.getMessages(chatId)
            ])
            const chat = chats.find(c => c.chat_id === chatId)
            setChatName(chat?.name || 'Чат')
            setMessages(msgs)
        } catch (err) {
            setError('Не удалось загрузить чат')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSend = async (e) => {
        e.preventDefault()
        if (!text.trim()) return

        try {
            const message = await chatService.sendMessage(chatId, { content: text.trim() })
            setMessages(prev => [...prev, message])
            setText('')
        } catch (err) {
            console.error(err)
        }
    }

    const handleImageChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setUploading(true)
        try {
            const { filename } = await chatService.uploadChatImage(chatId, file)
            const message = await chatService.sendMessage(chatId, { image_url: filename })
            setMessages(prev => [...prev, message])
        } catch (err) {
            console.error(err)
            setError('Не удалось отправить изображение')
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    if (loading) {
        return <div className={styles.container}><div className={styles.loading}>Загрузка...</div></div>
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate('/chats')}>←</button>
                <h2>{chatName}</h2>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.messages}>
                {messages.map((m, i) => {
                    const isOwn = m.sender_id === currentUser?.id
                    return (
                        <div key={i} className={`${styles.messageRow} ${isOwn ? styles.own : ''}`}>
                            <div className={styles.bubble}>
                                {m.image_url && <ChatImage imageUrl={m.image_url} className={styles.image} />}
                                {m.content && <div className={styles.text}>{m.content}</div>}
                                <div className={styles.time}>
                                    {new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={bottomRef} />
            </div>

            <form className={styles.inputBar} onSubmit={handleSend}>
                <button type="button" className={styles.attachBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    📎
                </button>
                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                />
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Сообщение..."
                    className={styles.textInput}
                />
                <button type="submit" className={styles.sendBtn}>Отправить</button>
            </form>
        </div>
    )
}

export default ChatWindowPage