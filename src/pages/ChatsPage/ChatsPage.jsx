import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Plus, X } from 'lucide-react'
import { chatService } from '../../services/chatService'
import { friendService } from '../../services/friendService'
import { useNotifications } from '../../context/NotificationContext'
import { useAuthContext } from '../../context/AuthContext'
import Avatar from '../../components/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import Alert from '../../components/ui/Alert'
import Spinner from '../../components/ui/Spinner'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import styles from './ChatsPage.module.css'

function ChatsPage() {
    const navigate = useNavigate()
    const [chats, setChats] = useState([])
    const [friends, setFriends] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showCreateGroup, setShowCreateGroup] = useState(false)
    const [groupName, setGroupName] = useState('')

    const { currentUser } = useAuthContext()

    const { subscribe, getActiveChatId } = useNotifications()

    useEffect(() => {
        loadChats()
        friendService.getFriends(currentUser.id).then(setFriends).catch(console.error)
    }, [])

    useEffect(() => {
        const unsubscribe = subscribe((notification) => {
            if (notification.type !== 'new_message') return
            const isViewingThisChat = notification.chat_id === getActiveChatId()

            setChats(prev => {
                const idx = prev.findIndex(c => c.chat_id === notification.chat_id)
                if (idx === -1) return prev
                const updated = {
                    ...prev[idx],
                    last_message: notification.message,
                    last_message_time: notification.created_at,
                    unread_count: isViewingThisChat ? prev[idx].unread_count : prev[idx].unread_count + 1,
                }
                const rest = prev.filter((_, i) => i !== idx)
                return [updated, ...rest]
            })
        })
        return unsubscribe
    }, [subscribe, getActiveChatId])

    const loadChats = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await chatService.getChats()
            setChats(data)
        } catch (err) {
            setError('Не удалось загрузить чаты')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleStartDirectChat = async (userId) => {
        try {
            const chat = await chatService.createChat({ type: 'direct', user_if_direct: userId })
            navigate(`/chats/${chat.chat_id}`)
        } catch (err) {
            if (err.response?.status === 400) {
                await loadChats()
                setError('Чат с этим пользователем уже существует — найдите его в списке ниже')
            } else {
                console.error(err)
            }
        }
    }

    const handleCreateGroup = async (e) => {
        e.preventDefault()
        if (!groupName.trim()) return

        try {
            const chat = await chatService.createChat({ type: 'group', name: groupName.trim() })
            setShowCreateGroup(false)
            setGroupName('')
            navigate(`/chats/${chat.chat_id}`)
        } catch (err) {
            console.error(err)
        }
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <Spinner label="Загружаем чаты" />
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <PageHeader
                title="Чаты"
                subtitle="Личные переписки и группы"
                action={
                    <Button
                        variant={showCreateGroup ? 'ghost' : 'primary'}
                        size="sm"
                        icon={showCreateGroup ? X : Plus}
                        onClick={() => setShowCreateGroup(v => !v)}
                    >
                        {showCreateGroup ? 'Отмена' : 'Новая группа'}
                    </Button>
                }
            />

            {error && <Alert>{error}</Alert>}

            {showCreateGroup && (
                <form className={styles.groupForm} onSubmit={handleCreateGroup}>
                    <Field
                        label="Название группы"
                        placeholder="Например, «Команда»"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        required
                        controlClassName={styles.groupInput}
                    />
                    <Button type="submit" variant="primary">
                        Создать
                    </Button>
                </form>
            )}

            <div className={styles.chatList}>
                {chats.length === 0 && (
                    <EmptyState
                        icon={MessageCircle}
                        title="Чатов пока нет"
                        description="Создайте группу или начните переписку с другом из раздела «Друзья»."
                    />
                )}

                {chats.map(chat => (
                    <button
                        key={chat.chat_id}
                        type="button"
                        className={styles.chatItem}
                        onClick={() => navigate(`/chats/${chat.chat_id}`)}
                    >
                        <Avatar avatarUrl={chat.avatar_url} size={46} />
                        <div className={styles.chatInfo}>
                            <span className={styles.chatName}>{chat.name}</span>
                            <span className={styles.lastMessage}>
                                {chat.last_message || 'Нет сообщений'}
                            </span>
                        </div>
                        {chat.unread_count > 0 && <Badge tone="brand">{chat.unread_count}</Badge>}
                    </button>
                ))}
            </div>

            <section className={styles.friendsSection}>
                <h2 className={styles.friendsTitle}>Начать переписку</h2>
                {friends.length === 0 ? (
                    <p className={styles.friendsEmpty}>
                        Добавьте друзей, чтобы начать переписку
                    </p>
                ) : (
                    <div className={styles.friendList}>
                        {friends.map(friend => (
                            <button
                                key={friend.id}
                                type="button"
                                className={styles.friendItem}
                                onClick={() => handleStartDirectChat(friend.id)}
                            >
                                <Avatar avatarUrl={friend.avatar_url} size={36} />
                                <span className={styles.friendName}>
                                    {friend.first_name} {friend.last_name}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}

export default ChatsPage
