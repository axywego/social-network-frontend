import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Virtuoso } from 'react-virtuoso'
import { chatService } from '../../services/chatService'
import { friendService } from '../../services/friendService'
import { useAuthContext } from '../../context/AuthContext'
import ChatImage from '../../components/ChatImage'
import Avatar from '../../components/Avatar'
import styles from './ChatWindowPage.module.css'

const PAGE_SIZE = 30
// Стартовый индекс с большим запасом, чтобы firstItemIndex никогда не ушёл в минус
// после многократной подгрузки старых сообщений (см. доку react-virtuoso, паттерн "prepend").
const START_INDEX = 1_000_000

// ─── Отдельный компонент сообщения ─────────────────────────────────────────
function MessageBubble({ message, isOwn }) {
    return (
        <div className={`${styles.messageRow} ${isOwn ? styles.own : ''}`}>
            <div className={styles.bubble}>
                {message.image_url && <ChatImage imageUrl={message.image_url} className={styles.image} />}
                {message.content && <div className={styles.text}>{message.content}</div>}
                <div className={styles.time}>
                    {new Date(message.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    )
}

function ChatWindowPage() {
    const { chatId } = useParams()
    const navigate = useNavigate()
    const { currentUser } = useAuthContext()

    const [chatName, setChatName] = useState('')
    const [chatType, setChatType] = useState(null)
    const [messages, setMessages] = useState([])
    const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX)
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [loadingOlder, setLoadingOlder] = useState(false)
    const [hasMoreOlder, setHasMoreOlder] = useState(true)

    const fileInputRef = useRef(null)
    const virtuosoRef = useRef(null)

    const currentUserRef = useRef(currentUser)
    currentUserRef.current = currentUser

    // Всегда содержит актуальный массив сообщений — чтобы не тащить messages
    // в зависимости колбэков (startReached и т.п. не должны пересоздаваться каждый рендер)
    const messagesStateRef = useRef([])
    messagesStateRef.current = messages

    const loadingOlderRef = useRef(false)
    const hasMoreOlderRef = useRef(true)

    // Отслеживаем "у низа ли пользователь" через колбэк Virtuoso, а не через ручной onScroll
    const atBottomRef = useRef(true)
    // Взводится перед setMessages, когда новое сообщение должно принудительно проскроллить вниз
    // (своё сообщение — всегда, чужое — только если и так были у низа)
    const forceFollowRef = useRef(false)

    const [showMembers, setShowMembers] = useState(false)
    const [members, setMembers] = useState([])
    const [friends, setFriends] = useState([])
    const [membersLoading, setMembersLoading] = useState(false)
    const [busyUserId, setBusyUserId] = useState(null)
    
    const [otherUserId, setOtherUserId] = useState(null)

    const wsRef = useRef(null)

    // ─── WebSocket ───────────────────────────────────────────────────────────
    useEffect(() => {
        const conn = chatService.connectToChat(chatId, {
            onOpen: () => {
                const last = messagesStateRef.current[messagesStateRef.current.length - 1]
                if (last) conn.markRead(last.id)
            },
            onMessage: (message) => {
                const isOwn = message.sender_id === currentUserRef.current?.id
                if (isOwn || atBottomRef.current) {
                    forceFollowRef.current = true
                }
                setMessages(prev => [...prev, message])
                if (!isOwn && atBottomRef.current) {
                    conn.markRead(message.id)
                }
            }
        })
        wsRef.current = conn
        return () => {
            conn.close()
            wsRef.current = null
        }
    }, [chatId])

    // ─── Смена чата ──────────────────────────────────────────────────────────
    useEffect(() => {
        setShowMembers(false)
        setHasMoreOlder(true)
        hasMoreOlderRef.current = true
        atBottomRef.current = true
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatId])

    const loadData = async () => {
        try {
            setLoading(true)
            const [chats, msgs] = await Promise.all([
                chatService.getChats(),
                chatService.getMessages(chatId, { limit: PAGE_SIZE })
            ])
            const chat = chats.find(c => c.chat_id === chatId)
            setChatName(chat?.name || 'Чат')
            setChatType(chat?.type || null)

            setMessages(msgs)
            setFirstItemIndex(START_INDEX)
            setHasMoreOlder(msgs.length === PAGE_SIZE)
            hasMoreOlderRef.current = msgs.length === PAGE_SIZE

            // помечаем прочитанным последнее подгруженное сообщение
            const last = msgs[msgs.length - 1]
            if (last) {
                wsRef.current?.markRead(last.id)
            }

            if (chat?.type === 'direct') {
                const chatMembers = await chatService.getChatMembers(chatId)
                const other = chatMembers.find(m => m.id !== currentUserRef.current?.id)
                setOtherUserId(other?.id ?? null)
            } else {
                setOtherUserId(null)
            }
        } catch (err) {
            setError('Не удалось загрузить чат')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // ─── Подгрузка старых сообщений (вызывается Virtuoso при достижении верха) ─
    const loadOlderMessages = useCallback(async () => {
        if (loadingOlderRef.current || !hasMoreOlderRef.current) return

        const oldest = messagesStateRef.current[0]
        if (!oldest) return

        loadingOlderRef.current = true
        setLoadingOlder(true)

        try {
            const older = await chatService.getMessages(chatId, {
                limit: PAGE_SIZE,
                before: oldest.created_at,
            })

            const stillHasMore = older.length === PAGE_SIZE
            setHasMoreOlder(stillHasMore)
            hasMoreOlderRef.current = stillHasMore

            if (older.length > 0) {
                // Сдвигаем "виртуальный" индекс первого элемента — именно это
                // говорит Virtuoso "сохрани позицию скролла относительно
                // конкретных сообщений", а не относительно пикселей.
                // Поэтому ручной пересчёт scrollTop больше не нужен вообще.
                setFirstItemIndex(prev => prev - older.length)
                setMessages(prev => [...older, ...prev])
            }
        } catch (err) {
            console.error(err)
        } finally {
            loadingOlderRef.current = false
            setLoadingOlder(false)
        }
    }, [chatId])

    // followOutput решает, скроллить ли вниз при добавлении новых сообщений в конец
    const followOutput = useCallback((isAtBottom) => {
        if (forceFollowRef.current) {
            forceFollowRef.current = false
            return 'smooth'
        }
        return isAtBottom ? 'auto' : false
    }, [])

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
                <h2
                    className={chatType === 'direct' ? styles.clickableTitle : undefined}
                    onClick={() => {
                        if (chatType === 'direct' && otherUserId) {
                            navigate(`/users/${otherUserId}`)
                        }
                    }}
                >
                    {chatName}
                </h2>
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

            <div className={styles.messagesWrapper}>
                {loadingOlder && (
                    <div className={styles.loadingOlder}>Загрузка сообщений...</div>
                )}
                <Virtuoso
                    // key={chatId} форсит полный ремаунт списка при смене чата —
                    // так внутреннее состояние скролла/индексов Virtuoso не "утекает"
                    // из одного чата в другой.
                    key={chatId}
                    ref={virtuosoRef}
                    className={styles.messages}
                    style={{ height: '100%' }}
                    data={messages}
                    firstItemIndex={firstItemIndex}
                    initialTopMostItemIndex={messages.length - 1}
                    alignToBottom
                    startReached={loadOlderMessages}
                    followOutput={followOutput}
                    atBottomStateChange={(atBottom) => {
                        atBottomRef.current = atBottom
                        if (atBottom) {
                            const last = messagesStateRef.current[messagesStateRef.current.length - 1]
                            if (last) wsRef.current?.markRead(last.id)
                        }
                    }}
                    increaseViewportBy={{ top: 400, bottom: 200 }}
                    components={{
                        Header: () => <div style={{ height: 12 }} />,
                        Footer: () => <div style={{ height: 12 }} />,
                    }}
                    itemContent={(index, message) => (
                        <MessageBubble
                            message={message}
                            isOwn={message.sender_id === currentUser?.id}
                        />
                    )}
                />
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