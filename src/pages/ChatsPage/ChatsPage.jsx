import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatService } from '../../services/chatService'
import { friendService } from '../../services/friendService'
import styles from './ChatsPage.module.css'

function ChatsPage() {
    const navigate = useNavigate()
    const [chats, setChats] = useState([])
    const [friends, setFriends] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showCreateGroup, setShowCreateGroup] = useState(false)
    const [groupName, setGroupName] = useState('')

    useEffect(() => {
        loadChats()
        friendService.getFriends().then(setFriends).catch(console.error)
    }, [])

    const loadChats = async () => {
        try {
            setLoading(true)
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
        return <div className={styles.container}><div className={styles.loading}>Загрузка...</div></div>
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Чаты</h1>
                <button className={styles.newGroupBtn} onClick={() => setShowCreateGroup(v => !v)}>
                    + Новая группа
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {showCreateGroup && (
                <form className={styles.groupForm} onSubmit={handleCreateGroup}>
                    <input
                        type="text"
                        placeholder="Название группы"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        required
                    />
                    <button type="submit">Создать</button>
                </form>
            )}

            <div className={styles.chatList}>
                {chats.length === 0 && <p className={styles.empty}>У вас пока нет чатов</p>}
                {chats.map(chat => (
                    <div key={chat.chat_id} className={styles.chatItem} onClick={() => navigate(`/chats/${chat.chat_id}`)}>
                        <div className={styles.avatar}>{chat.name?.[0]?.toUpperCase()}</div>
                        <div className={styles.chatInfo}>
                            <div className={styles.chatName}>{chat.name}</div>
                            <div className={styles.lastMessage}>{chat.last_message || 'Нет сообщений'}</div>
                        </div>
                    </div>
                ))}
            </div>

            <h2 className={styles.usersTitle}>Начать переписку с другом</h2>
            <div className={styles.usersList}>
                {friends.length === 0 && <p className={styles.empty}>Добавьте друзей, чтобы начать переписку</p>}
                {friends.map(friend => (
                    <div key={friend.id} className={styles.userItem} onClick={() => handleStartDirectChat(friend.id)}>
                        <div className={styles.avatar}>{friend.first_name?.[0]}</div>
                        <span>{friend.first_name} {friend.last_name}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ChatsPage