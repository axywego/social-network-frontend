import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatService } from '../../services/chatService'
import { userService } from '../../services/userService'
import styles from './ChatsPage.module.css'

function ChatsPage() {
    const navigate = useNavigate()
    const [chats, setChats] = useState([])
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showCreateGroup, setShowCreateGroup] = useState(false)
    const [groupName, setGroupName] = useState('')

    useEffect(() => {
        loadChats()
        loadUsers()
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

    const loadUsers = async () => {
        try {
            const data = await userService.getUsers()
            setUsers(data)
        } catch (err) {
            console.error(err)
        }
    }

    const handleStartDirectChat = async (userId) => {
        try {
            const chat = await chatService.createChat({ type: 'direct', user_if_direct: userId })
            navigate(`/chats/${chat.chat_id}`)
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.detail === 'Chat already exists') {
                const existing = chats.find(c => c.name === users.find(u => u.id === userId)?.first_name)
                await loadChats()
                navigate('/chats')
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
                            <div className={styles.lastMessage}>
                                {chat.last_message || 'Нет сообщений'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <h2 className={styles.usersTitle}>Начать новый чат</h2>
            <div className={styles.usersList}>
                {users.map(user => (
                    <div key={user.id} className={styles.userItem} onClick={() => handleStartDirectChat(user.id)}>
                        <div className={styles.avatar}>{user.first_name?.[0]}</div>
                        <span>{user.first_name} {user.last_name}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ChatsPage