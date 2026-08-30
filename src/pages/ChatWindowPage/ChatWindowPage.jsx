import { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react'
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
function MessageBubble({ message, isOwn, onContextMenu, sender, showSenderInfo }) {
    const navigate = useNavigate();
    return (
        <div
            className={`${styles.messageRow} ${isOwn ? styles.own : ''}`}
            style={showSenderInfo ? { display: 'flex', alignItems: 'flex-end', gap: 6 } : undefined}
        >
            <div style={{cursor: "pointer"}} onClick={() => sender && navigate(`/users/${sender.id}`)} >
              {showSenderInfo && (
                  <Avatar avatarUrl={sender?.avatar_url} size={42} />
              )}
            </div>
            <div
                className={styles.bubble}
                onContextMenu={isOwn ? (e) => onContextMenu(e, message) : undefined}
            >
                {showSenderInfo && (
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, opacity: 0.85 }}>
                        {sender ? `${sender.first_name} ${sender.last_name}` : 'Участник вышел из группы'}
                    </div>
                )}
                {message.image_url && <ChatImage imageUrl={message.image_url} className={styles.image} width={message.image_width} height={message.image_height} />}
                {message.content && <div className={styles.text}>{message.content}</div>}
                <div className={styles.time}>
                    {message.is_edited && <span style={{ opacity: 0.6, marginRight: 4 }}>изменено</span>}
                    {new Date(message.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    )
}

// ─── Попап "правый клик" (редактировать / удалить), как в Телеге ──────────
function MessageContextMenu({ x, y, onEdit, onDelete, onClose }) {
    const menuRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
        }
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
        }
        // capture:true чтобы поймать клик раньше, чем сработает contextmenu на другом сообщении
        document.addEventListener('mousedown', handleClickOutside, true)
        document.addEventListener('contextmenu', handleClickOutside, true)
        document.addEventListener('keydown', handleKeyDown)
        window.addEventListener('scroll', onClose, true)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside, true)
            document.removeEventListener('contextmenu', handleClickOutside, true)
            document.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('scroll', onClose, true)
        }
    }, [onClose])

    // Не даём попапу вылезти за правый/нижний край экрана
    const style = {
        position: 'fixed',
        top: Math.min(y, window.innerHeight - 90),
        left: Math.min(x, window.innerWidth - 170),
        zIndex: 1000,
        minWidth: 160,
        background: 'var(--menu-bg, #fff)',
        borderRadius: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        userSelect: 'none',
    }
    const itemStyle = {
        padding: '10px 16px',
        fontSize: 14,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    }

    return (
        <div ref={menuRef} style={style}>
            <div
                style={itemStyle}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onEdit}
            >
                ✏️ Редактировать
            </div>
            <div
                style={{ ...itemStyle, color: '#e53935' }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onDelete}
            >
                🗑️ Удалить
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
    // const [messages, setMessages] = useState([])
    // const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX)
    const [listState, setListState] = useState({ messages: [], firstItemIndex: START_INDEX })
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
    messagesStateRef.current = listState.messages

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

    // Попап "редактировать / удалить" по правому клику на своё сообщение
    const [contextMenu, setContextMenu] = useState(null) // { x, y, message } | null
    // Сообщение, которое сейчас редактируется (картинка живёт отдельно в pendingImage)
    const [editingMessage, setEditingMessage] = useState(null) // { id } | null
    // Изображение, прикреплённое к полю ввода — общее и для нового сообщения, и для редактирования.
    // filename === null && присутствует => картинка убрана/ещё не выбрана.
    const [pendingImage, setPendingImage] = useState(null) // { filename, width, height, previewUrl, uploading } | null

    const textInputRef = useRef(null)
    const wsRef = useRef(null)

    // Быстрый поиск участника группы по id — для аватарки и имени в шапке сообщений
    const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members])

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
                setListState(prev => ({
                    ...prev,
                    messages: [...prev.messages, message],
                }))
                if (!isOwn && atBottomRef.current) {
                    conn.markRead(message.id)
                }
            },
            onEdit: (updatedMessage) => {
                setListState(prev => ({
                    ...prev,
                    messages: prev.messages.map(m =>
                        m.id === updatedMessage.id ? { ...m, ...updatedMessage, is_edited: true } : m
                    ),
                }))
            },
            onDelete: (messageId) => {
                setListState(prev => ({
                    ...prev,
                    messages: prev.messages.filter(m => m.id !== messageId),
                }))
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

            setListState({ messages: msgs, firstItemIndex: START_INDEX })
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
            } else if (chat?.type === 'group') {
                setOtherUserId(null)
                // нужны для аватарки + имени отправителя в шапке сообщений
                const chatMembers = await chatService.getChatMembers(chatId)
                setMembers(chatMembers)
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

        loadingOlderRef.current = true

        try {
            const oldest = messagesStateRef.current[0]

            const older = await chatService.getMessages(chatId, {
                limit: PAGE_SIZE,
                before: oldest.created_at,
            })

            setListState(prev => ({
                firstItemIndex: prev.firstItemIndex - older.length,
                messages: [...older, ...prev.messages],
            }))
        } finally {
            loadingOlderRef.current = false
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
                friendService.getFriends(currentUser.id)
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

    // Сбрасывает всё состояние поля ввода (после отправки, отмены редактирования и т.п.)
    const resetCompose = () => {
        if (pendingImage?.previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(pendingImage.previewUrl)
        }
        setPendingImage(null)
        setEditingMessage(null)
        setText('')
    }

    const handleSend = async (e) => {
        e.preventDefault()
        const trimmed = text.trim()
        if (!trimmed && !pendingImage) return // нечего отправлять
        if (pendingImage?.uploading) return // ждём, пока картинка догрузится

        if (editingMessage) {
            const messageId = editingMessage.id
            try {
                const updated = await chatService.editMessage(chatId, messageId, {
                    content: trimmed || null,
                    image_url: pendingImage ? pendingImage.filename : null,
                })
                setListState(prev => ({
                    ...prev,
                    messages: prev.messages.map(m =>
                        m.id === messageId ? { ...m, ...updated, edited: true } : m
                    ),
                }))
                resetCompose()
            } catch (err) {
                console.error(err)
                setError('Не удалось отредактировать сообщение')
            }
            return
        }

        try {
            await chatService.sendMessage(chatId, {
                content: trimmed || null,
                ...(pendingImage
                    ? {
                        image_url: pendingImage.filename,
                        image_width: pendingImage.width,
                        image_height: pendingImage.height,
                    }
                    : {}),
            })
            resetCompose()
        } catch (err) {
            console.error(err)
            setError('Не удалось отправить сообщение')
        }
    }

    // ─── Попап "правый клик" на сообщении ──────────────────────────────────
    const handleBubbleContextMenu = (e, message) => {
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY, message })
    }

    const handleStartEdit = () => {
        if (!contextMenu) return
        const { message } = contextMenu

        // если до этого что-то было прикреплено к полю ввода — подчищаем
        if (pendingImage?.previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(pendingImage.previewUrl)
        }

        if (message.image_url) {
            // message.image_url — это уже готовый путь вида /chats/{chatId}/images/{filename},
            // а бэкенду на edit нужно именно имя файла (как при отправке), поэтому достаём его из пути
            const filename = message.image_url.split('/').pop()
            setPendingImage({
                filename,
                width: message.image_width,
                height: message.image_height,
                previewUrl: message.image_url,
                uploading: false,
            })
        } else {
            setPendingImage(null)
        }

        setEditingMessage({ id: message.id })
        setText(message.content || '')
        setContextMenu(null)
        // даём React дорисовать инпут перед фокусом
        requestAnimationFrame(() => textInputRef.current?.focus())
    }

    const handleCancelEdit = () => {
        resetCompose()
    }

    const handleRemoveImage = () => {
        if (pendingImage?.previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(pendingImage.previewUrl)
        }
        setPendingImage(null)
    }

    const handleDeleteMessage = async () => {
        if (!contextMenu) return
        const messageId = contextMenu.message.id
        setContextMenu(null)

        // оптимистично убираем сообщение из списка
        setListState(prev => ({
            ...prev,
            messages: prev.messages.filter(m => m.id !== messageId),
        }))
        if (editingMessage?.id === messageId) resetCompose()

        try {
            await chatService.deleteMessage(chatId, messageId)
        } catch (err) {
            console.error(err)
            setError('Не удалось удалить сообщение')
            // откатываемся — перезагружаем чат, если удаление не удалось
            loadData()
        }
    }

    const handleImageChange = async (e) => {
        const file = e.target.files[0]
        e.target.value = '' // чтобы можно было выбрать тот же файл повторно
        if (!file) return

        // локальный превью показываем сразу, не дожидаясь загрузки на сервер
        if (pendingImage?.previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(pendingImage.previewUrl)
        }
        const previewUrl = URL.createObjectURL(file)
        setPendingImage({ filename: null, width: null, height: null, previewUrl, uploading: true })

        setUploading(true)
        try {
            const { filename, width, height } = await chatService.uploadChatImage(chatId, file)
            setPendingImage(prev =>
                // если юзер уже убрал/сменил картинку, пока эта грузилась — не воскрешаем её
                prev && prev.previewUrl === previewUrl
                    ? { ...prev, filename, width, height, uploading: false }
                    : prev
            )
        } catch (err) {
            console.error(err)
            setError('Не удалось загрузить изображение')
            setPendingImage(prev => (prev?.previewUrl === previewUrl ? null : prev))
        } finally {
            setUploading(false)
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
                <Virtuoso
                    // key={chatId} форсит полный ремаунт списка при смене чата —
                    // так внутреннее состояние скролла/индексов Virtuoso не "утекает"
                    // из одного чата в другой.
                    key={chatId}
                    ref={virtuosoRef}
                    className={styles.messages}
                    style={{ height: '100%' }}
                    data={listState.messages}
                    firstItemIndex={listState.firstItemIndex}
                    initialTopMostItemIndex={
                        START_INDEX + listState.messages.length - 1
                    }
                    computeItemKey={(index, message) => message.id}
                    // alignToBottom
                    startReached={loadOlderMessages}
                    followOutput={followOutput}
                    atBottomThreshold={120}
                    // Без этого ResizeObserver может давать визуальный рывок при prepend старых сообщений
                    // из-за отложенного пересчёта viewport.
                    skipAnimationFrameInResizeObserver
                    atBottomStateChange={(atBottom) => {
                        atBottomRef.current = atBottom
                        if (atBottom) {
                            const last = messagesStateRef.current[messagesStateRef.current.length - 1]
                            if (last) wsRef.current?.markRead(last.id)
                        }
                    }}
                    increaseViewportBy={{ top: 400, bottom: 200 }}
                    components={{
                        // Индикатор подгрузки теперь часть Header, а не внешний сосед
                        // над Virtuoso: так он не меняет высоту контейнера списка
                        // (это и дёргало скролл при prepend старых сообщений).
                        Header: () => (
                            // Высота фиксирована всегда (см. .headerSpacer в CSS,
                            // например min-height: 32px) — меняется только
                            // видимость текста, а не сама высота блока,
                            // иначе прыжок просто переместится сюда.
                            <div className={styles.headerSpacer}>
                                <div
                                    className={styles.loadingOlder}
                                    style={{ visibility: loadingOlder ? 'visible' : 'hidden' }}
                                >
                                    Загрузка сообщений...
                                </div>
                            </div>
                        ),
                        Footer: () => <div style={{ height: 12 }} />,
                    }}
                    itemContent={(index, message) => {
                        const isOwn = message.sender_id === currentUser?.id
                        return (
                            <MessageBubble
                                message={message}
                                isOwn={isOwn}
                                onContextMenu={handleBubbleContextMenu}
                                sender={memberMap.get(message.sender_id)}
                                showSenderInfo={chatType === 'group' && !isOwn}
                            />
                        )
                    }}
                />
            </div>

            {contextMenu && (
                <MessageContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onEdit={handleStartEdit}
                    onDelete={handleDeleteMessage}
                    onClose={() => setContextMenu(null)}
                />
            )}

            <div className={styles.inputBar} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                {editingMessage && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '2px 10px',
                            fontSize: 13,
                            opacity: 0.8,
                        }}
                    >
                        <span>✏️ Редактирование сообщения</span>
                        <button
                            type="button"
                            onClick={handleCancelEdit}
                            title="Отменить редактирование"
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {pendingImage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px' }}>
                        <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                            {pendingImage.previewUrl.startsWith('blob:') ? (
                                <img
                                    src={pendingImage.previewUrl}
                                    alt=""
                                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, display: 'block' }}
                                />
                            ) : (
                                <ChatImage
                                    imageUrl={pendingImage.previewUrl}
                                    width={56}
                                    height={56}
                                    className={styles.image}
                                />
                            )}
                            {pendingImage.uploading && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(255,255,255,0.65)',
                                        borderRadius: 8,
                                        fontSize: 10,
                                    }}
                                >
                                    ...
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                title="Убрать изображение"
                                style={{
                                    position: 'absolute',
                                    top: -6,
                                    right: -6,
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: 'rgba(0,0,0,0.65)',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    lineHeight: '20px',
                                    padding: 0,
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <span style={{ fontSize: 12, opacity: 0.7 }}>
                            {pendingImage.uploading ? 'Загрузка изображения...' : 'Изображение прикреплено'}
                        </span>
                    </div>
                )}

                <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        type="button"
                        className={styles.attachBtn}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        title={pendingImage ? 'Заменить изображение' : 'Прикрепить изображение'}
                    >
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
                        ref={textInputRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape' && editingMessage) handleCancelEdit()
                        }}
                        placeholder={editingMessage ? 'Изменить сообщение...' : 'Сообщение...'}
                        className={styles.textInput}
                    />
                    <button type="submit" className={styles.sendBtn} disabled={pendingImage?.uploading}>
                        <>
                            <span className={styles.sendBtnText}>{editingMessage ? 'Сохранить' : 'Отправить'}</span>
                            <span className={styles.sendBtnIcon}>{editingMessage ? '\u2713' : '\u2708'}</span>
                        </>
                    </button>
                </form>
            </div>
        </div>
    )
}

export default ChatWindowPage
