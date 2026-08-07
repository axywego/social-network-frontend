import { useState, useEffect } from 'react'
import { friendService } from '../../services/friendService'
import styles from './FriendsPage.module.css'

const TABS = {
    FRIENDS: 'friends',
    INCOMING: 'incoming',
    OUTGOING: 'outgoing'
}

function FriendsPage() {
    const [activeTab, setActiveTab] = useState(TABS.FRIENDS)
    const [friends, setFriends] = useState([])
    const [incoming, setIncoming] = useState([])
    const [outgoing, setOutgoing] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [targetLogin, setTargetLogin] = useState('')
    const [sendStatus, setSendStatus] = useState(null)
    const [sending, setSending] = useState(false)

    useEffect(() => {
        loadAll()
    }, [])

    const loadAll = async () => {
        try {
            setLoading(true)
            const [friendsData, incomingData, outgoingData] = await Promise.all([
                friendService.getFriends(),
                friendService.getIncomingRequests(),
                friendService.getOutgoingRequests()
            ])
            setFriends(friendsData)
            setIncoming(incomingData)
            setOutgoing(outgoingData)
        } catch (err) {
            setError('Не удалось загрузить друзей')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSendRequest = async (e) => {
        e.preventDefault()
        if (!targetLogin.trim()) return

        setSending(true)
        setSendStatus(null)
        try {
            await friendService.sendRequest(targetLogin.trim())
            setSendStatus({ type: 'success', text: 'Заявка отправлена' })
            setTargetLogin('')
            const outgoingData = await friendService.getOutgoingRequests()
            setOutgoing(outgoingData)
        } catch (err) {
            setSendStatus({ type: 'error', text: err.response?.data?.detail || 'Не удалось отправить заявку' })
        } finally {
            setSending(false)
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
        } catch (err) {
            console.error(err)
        }
    }

    const handleCancelOutgoing = async (username) => {
        try {
            await friendService.declineRequest(username)
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

    if (loading) {
        return <div className={styles.container}><div className={styles.loading}>Загрузка...</div></div>
    }

    return (
        <div className={styles.container}>
            <h1>Друзья</h1>

            <form className={styles.sendForm} onSubmit={handleSendRequest}>
                <input
                    type="text"
                    placeholder="Логин пользователя"
                    value={targetLogin}
                    onChange={(e) => setTargetLogin(e.target.value)}
                />
                <button type="submit" disabled={sending}>
                    {sending ? 'Отправка...' : 'Добавить в друзья'}
                </button>
            </form>
            {sendStatus && (
                <div className={sendStatus.type === 'error' ? styles.error : styles.success}>
                    {sendStatus.text}
                </div>
            )}

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.tabs}>
                <button
                    className={activeTab === TABS.FRIENDS ? styles.tabActive : styles.tab}
                    onClick={() => setActiveTab(TABS.FRIENDS)}
                >
                    Друзья ({friends.length})
                </button>
                <button
                    className={activeTab === TABS.INCOMING ? styles.tabActive : styles.tab}
                    onClick={() => setActiveTab(TABS.INCOMING)}
                >
                    Входящие ({incoming.length})
                </button>
                <button
                    className={activeTab === TABS.OUTGOING ? styles.tabActive : styles.tab}
                    onClick={() => setActiveTab(TABS.OUTGOING)}
                >
                    Исходящие ({outgoing.length})
                </button>
            </div>

            {activeTab === TABS.FRIENDS && (
                <div className={styles.list}>
                    {friends.length === 0 && <p className={styles.empty}>Пока нет друзей</p>}
                    {friends.map(friend => (
                        <div key={friend.id} className={styles.item}>
                            <div className={styles.avatar}>{friend.first_name?.[0]}</div>
                            <div className={styles.info}>
                                <div className={styles.name}>{friend.first_name} {friend.last_name}</div>
                                <div className={styles.username}>@{friend.username}</div>
                            </div>
                            <button className={styles.removeBtn} onClick={() => handleRemoveFriend(friend.username)}>
                                Удалить
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === TABS.INCOMING && (
                <div className={styles.list}>
                    {incoming.length === 0 && <p className={styles.empty}>Нет входящих заявок</p>}
                    {incoming.map(req => (
                        <div key={req.user.id} className={styles.item}>
                            <div className={styles.avatar}>{req.user.first_name?.[0]}</div>
                            <div className={styles.info}>
                                <div className={styles.name}>{req.user.first_name} {req.user.last_name}</div>
                                <div className={styles.username}>@{req.user.username}</div>
                            </div>
                            <div className={styles.actions}>
                                <button className={styles.acceptBtn} onClick={() => handleAccept(req.user.username)}>
                                    Принять
                                </button>
                                <button className={styles.declineBtn} onClick={() => handleDecline(req.user.username)}>
                                    Отклонить
                                </button>
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
                            <div className={styles.avatar}>{req.user.first_name?.[0]}</div>
                            <div className={styles.info}>
                                <div className={styles.name}>{req.user.first_name} {req.user.last_name}</div>
                                <div className={styles.username}>@{req.user.username}</div>
                            </div>
                            <button className={styles.declineBtn} onClick={() => handleCancelOutgoing(req.user.username)}>
                                Отменить
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default FriendsPage