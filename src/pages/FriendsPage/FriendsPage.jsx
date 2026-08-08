import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { friendService } from '../../services/friendService'
import { userService } from '../../services/userService'
import { useAuthContext } from '../../context/AuthContext'
import styles from './FriendsPage.module.css'

const TABS = { FRIENDS: 'friends', INCOMING: 'incoming', OUTGOING: 'outgoing', SEARCH: 'search' }

function FriendsPage() {
    const navigate = useNavigate()
    const { currentUser } = useAuthContext()

    const [activeTab, setActiveTab] = useState(TABS.FRIENDS)
    const [friends, setFriends] = useState([])
    const [incoming, setIncoming] = useState([])
    const [outgoing, setOutgoing] = useState([])
    const [allUsers, setAllUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [query, setQuery] = useState('')

    useEffect(() => {
        loadAll()
    }, [])

    const loadAll = async () => {
        try {
            setLoading(true)
            const [friendsData, incomingData, outgoingData, usersData] = await Promise.all([
                friendService.getFriends(),
                friendService.getIncomingRequests(),
                friendService.getOutgoingRequests(),
                userService.getUsers()
            ])
            setFriends(friendsData)
            setIncoming(incomingData)
            setOutgoing(outgoingData)
            setAllUsers(usersData)
        } catch (err) {
            setError('Не удалось загрузить друзей')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const relationStatus = (userId) => {
        if (friends.some(f => f.id === userId)) return 'friends'
        if (incoming.some(r => r.user.id === userId)) return 'incoming'
        if (outgoing.some(r => r.user.id === userId)) return 'outgoing'
        return 'none'
    }

    const searchResults = useMemo(() => {
        if (!query.trim()) return []
        const q = query.trim().toLowerCase()
        return allUsers.filter(u =>
            u.id !== currentUser?.id && (
                u.username.toLowerCase().includes(q) ||
                u.first_name.toLowerCase().includes(q) ||
                u.last_name.toLowerCase().includes(q)
            )
        )
    }, [query, allUsers, currentUser])

    const handleSendRequest = async (username) => {
        try {
            await friendService.sendRequest(username)
            const outgoingData = await friendService.getOutgoingRequests()
            setOutgoing(outgoingData)
        } catch (err) {
            console.error(err)
        }
    }

    const handleAccept = async (username) => {
        try {
            await friendService.acceptRequest(username)
            setIncoming(prev => prev.filter(r => r.user.username !== username))
            const friendsData = await friendService.getFriends()
            setFriends(friendsData)
        } catch (err) {
            console.error(err)
        }
    }

    const handleDecline = async (username) => {
        try {
            await friendService.declineRequest(username)
            setIncoming(prev => prev.filter(r => r.user.username !== username))
            setOutgoing(prev => prev.filter(r => r.user.username !== username))
        } catch (err) {
            console.error(err)
        }
    }

    const handleRemoveFriend = async (username) => {
        try {
            await friendService.removeFriend(username)
            setFriends(prev => prev.filter(f => f.username !== username))
        } catch (err) {
            console.error(err)
        }
    }

    const renderActionButton = (user) => {
        const status = relationStatus(user.id)
        if (status === 'friends') {
            return <button className={styles.removeBtn} onClick={() => handleRemoveFriend(user.username)}>Удалить</button>
        }
        if (status === 'incoming') {
            return (
                <div className={styles.actions}>
                    <button className={styles.acceptBtn} onClick={() => handleAccept(user.username)}>Принять</button>
                    <button className={styles.declineBtn} onClick={() => handleDecline(user.username)}>Отклонить</button>
                </div>
            )
        }
        if (status === 'outgoing') {
            return <button className={styles.declineBtn} onClick={() => handleDecline(user.username)}>Отменить</button>
        }
        return <button className={styles.addBtn} onClick={() => handleSendRequest(user.username)}>Добавить</button>
    }

    if (loading) {
        return <div className={styles.container}><div className={styles.loading}>Загрузка...</div></div>
    }

    return (
        <div className={styles.container}>
            <h1>Друзья</h1>

            <input
                type="text"
                className={styles.searchInput}
                placeholder="Поиск по логину, имени или фамилии..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveTab(TABS.SEARCH) }}
            />

            {error && <div className={styles.error}>{error}</div>}

            {activeTab !== TABS.SEARCH && (
                <div className={styles.tabs}>
                    <button className={activeTab === TABS.FRIENDS ? styles.tabActive : styles.tab} onClick={() => setActiveTab(TABS.FRIENDS)}>
                        Друзья ({friends.length})
                    </button>
                    <button className={activeTab === TABS.INCOMING ? styles.tabActive : styles.tab} onClick={() => setActiveTab(TABS.INCOMING)}>
                        Входящие ({incoming.length})
                    </button>
                    <button className={activeTab === TABS.OUTGOING ? styles.tabActive : styles.tab} onClick={() => setActiveTab(TABS.OUTGOING)}>
                        Исходящие ({outgoing.length})
                    </button>
                </div>
            )}

            {activeTab === TABS.SEARCH && (
                <div className={styles.list}>
                    {searchResults.length === 0 && <p className={styles.empty}>Никого не найдено</p>}
                    {searchResults.map(user => (
                        <div key={user.id} className={styles.item}>
                            <div className={styles.clickable} onClick={() => navigate(`/users/${user.id}`)}>
                                <div className={styles.avatar}>{user.first_name?.[0]}</div>
                                <div className={styles.info}>
                                    <div className={styles.name}>{user.first_name} {user.last_name}</div>
                                    <div className={styles.username}>@{user.username}</div>
                                </div>
                            </div>
                            {renderActionButton(user)}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === TABS.FRIENDS && (
                <div className={styles.list}>
                    {friends.length === 0 && <p className={styles.empty}>Пока нет друзей</p>}
                    {friends.map(friend => (
                        <div key={friend.id} className={styles.item}>
                            <div className={styles.clickable} onClick={() => navigate(`/users/${friend.id}`)}>
                                <div className={styles.avatar}>{friend.first_name?.[0]}</div>
                                <div className={styles.info}>
                                    <div className={styles.name}>{friend.first_name} {friend.last_name}</div>
                                    <div className={styles.username}>@{friend.username}</div>
                                </div>
                            </div>
                            <button className={styles.removeBtn} onClick={() => handleRemoveFriend(friend.username)}>Удалить</button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === TABS.INCOMING && (
                <div className={styles.list}>
                    {incoming.length === 0 && <p className={styles.empty}>Нет входящих заявок</p>}
                    {incoming.map(req => (
                        <div key={req.user.id} className={styles.item}>
                            <div className={styles.clickable} onClick={() => navigate(`/users/${req.user.id}`)}>
                                <div className={styles.avatar}>{req.user.first_name?.[0]}</div>
                                <div className={styles.info}>
                                    <div className={styles.name}>{req.user.first_name} {req.user.last_name}</div>
                                    <div className={styles.username}>@{req.user.username}</div>
                                </div>
                            </div>
                            <div className={styles.actions}>
                                <button className={styles.acceptBtn} onClick={() => handleAccept(req.user.username)}>Принять</button>
                                <button className={styles.declineBtn} onClick={() => handleDecline(req.user.username)}>Отклонить</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === TABS.OUTGOING && (
                <div className={styles.list}>
                    {outgoing.length === 0 && <p className={styles.empty}>Нет исходящих заявок</p>}
                    {outgoing.map(req => (
                        <div key={req.user.id} className={styles.item}>
                            <div className={styles.clickable} onClick={() => navigate(`/users/${req.user.id}`)}>
                                <div className={styles.avatar}>{req.user.first_name?.[0]}</div>
                                <div className={styles.info}>
                                    <div className={styles.name}>{req.user.first_name} {req.user.last_name}</div>
                                    <div className={styles.username}>@{req.user.username}</div>
                                </div>
                            </div>
                            <button className={styles.declineBtn} onClick={() => handleDecline(req.user.username)}>Отменить</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default FriendsPage