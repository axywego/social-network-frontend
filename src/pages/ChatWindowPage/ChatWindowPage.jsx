import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { chatService } from '../../services/chatService'
import { friendService } from '../../services/friendService'
import { useAuthContext } from '../../context/AuthContext'
import ChatImage from '../../components/ChatImage'
import Avatar from '../../components/Avatar'
import styles from './ChatWindowPage.module.css'

function ChatWindowPage() {
    const { chatId } = useParams()
    const navigate = useNavigate()
    const { currentUser } = useAuthContext()

    const [chatName, setChatName] = useState('')
    const [chatType, setChatType] = useState(null)
    const [messages, setMessages] = useState([])
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)
    const messagesRef = useRef(null)
    const contentRef = useRef(null)
    const isFirstLoad = useRef(true)

    const [showMembers, setShowMembers] = useState(false)
    const [members, setMembers] = useState([])
    const [friends, setFriends] = useState([])
    const [membersLoading, setMembersLoading] = useState(false)
    const [busyUserId, setBusyUserId] = useState(null)

    const scrollToBottom = (behavior = 'auto') => {
        const el = messagesRef.current
        if (!el) return
        el.scrollTo({ top: el.scrollHeight, behavior })
    }

    useEffect(() => {
        const ws = chatService.connectToChat(chatId, {
            onMessage: (message) => setMessages(prev => [...prev, message])
        })
        return () => ws.close()
    }, [chatId])

    useEffect(() => {
        isFirstLoad.current = true
        setShowMembers(false)
        loadData()
    }, [chatId])

    useEffect(() => {
        if (loading || messages.length === 0) return
        scrollToBottom(isFirstLoad.current ? 'auto' : 'smooth')
        isFirstLoad.current = false
    }, [messages, loading])

    useEffect(() => {
        if (loading) return
        const content = contentRef.current
        if (!content) return

        const observer = new ResizeObserver(() => scrollToBottom('auto'))
        observer.observe(content)
        return () => observer.disconnect()
    }, [loading])

    const loadData = async () => {
        try {
            setLoading(true)
            const [chats, msgs] = await Promise.all([
                chatService.getChats(),
                chatService.getMessages(chatId)
            ])
            const chat = chats.find(c => c.chat_id === chatId)
            setChatName(chat?.name || 'Чат')
            setChatType(chat?.type || null)

            const sorted = [...msgs].sort(
                (a, b) => new Date(a.created_at) - new Date(b.created_at)
            )
            setMessages(sorted)
        } catch (err) {
            setError('Не удалось загрузить чат')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const loadMembers = async () => {
        try {
            setMembersLoading(true)
            const [membersData, friendsData] = await Promise.all([
                chatService.getChatMembers(chatId),
                friendService.getFriends()
            ])
            setMembers(membersData)
            setFriends(friendsData)
        } catch (err) {
            console.error(err)
        } finally {
            setMembersLoading(false)
        }
    }

    const handleToggleMembers = () => {
        const next = !showMembers
        setShowMembers(next)
        if (next) loadMembers()
    }

    const handleAddMember = async (userId) => {
        setBusyUserId(userId)
        try {
            await chatService.addUserToChat(chatId, userId)
            await loadMembers()
        } catch (err) {
            console.error(err)
        } finally {
            setBusyUserId(null)
        }
    }

    const handleRemoveMember = async (userId) => {
        setBusyUserId(userId)
        try {
            await chatService.removeUserFromChat(chatId, userId)
            if (userId === currentUser?.id) {
                navigate('/chats')
                return
            }
            await loadMembers()
        } catch (err) {
            console.error(err)
        } finally {
            setBusyUserId(null)
        }
    }

    const handleSend = async (e) => {
        e.preventDefault()
        if (!text.trim()) return

        try {
            await chatService.sendMessage(chatId, { content: text.trim() })
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
            await chatService.sendMessage(chatId, { image_url: filename })
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

    const memberIds = new Set(members.map(m => m.id))
    const availableFriends = friends.filter(f => !memberIds.has(f.id))

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate('/chats')}>←</button>
                <h2>{chatName}</h2>
                {chatType === 'group' && (
                    <button className={styles.membersBtn} onClick={handleToggleMembers}>
                        👥 Участники
                    </button>
                )}
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {chatType === 'group' && showMembers && (
                <div className={styles.membersPanel}>
                    {membersLoading && <p className={styles.empty}>Загрузка...</p>}

                    {!membersLoading && (
                        <>
                            <div className={styles.membersSection}>
                                <div className={styles.membersSectionTitle}>Участники ({members.length})</div>
                                {members.map(m => (
                                    <div key={m.id} className={styles.memberItem}>
                                        <Avatar avatarUrl={m.avatar_url} size={32} />
                                        <span className={styles.memberName}>
                                            {m.first_name} {m.last_name}
                                            {m.id === currentUser?.id && ' (вы)'}
                                        </span>
                                        <button
                                            className={styles.memberRemoveBtn}
                                            onClick={() => handleRemoveMember(m.id)}
                                            disabled={busyUserId === m.id}
                                        >
                                            {m.id === currentUser?.id ? 'Покинуть' : 'Удалить'}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.membersSection}>
                                <div className={styles.membersSectionTitle}>Добавить друга</div>
                                {availableFriends.length === 0 && (
                                    <p className={styles.empty}>Все друзья уже в группе</p>
                                )}
                                {availableFriends.map(f => (
                                    <div key={f.id} className={styles.memberItem}>
                                        <Avatar avatarUrl={f.avatar_url} size={32} />
                                        <span className={styles.memberName}>{f.first_name} {f.last_name}</span>
                                        <button
                                            className={styles.memberAddBtn}
                                            onClick={() => handleAddMember(f.id)}
                                            disabled={busyUserId === f.id}
                                        >
                                            Добавить
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            <div className={styles.messages} ref={messagesRef}>
                <div ref={contentRef} className={styles.messagesContent}>
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
                </div>
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