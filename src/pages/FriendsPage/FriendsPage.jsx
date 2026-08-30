import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { friendService } from '../../services/friendService'
import { userService } from '../../services/userService'
import { useAuthContext } from '../../context/AuthContext'
import styles from './FriendsPage.module.css'
import Avatar from '../../components/Avatar'

const TABS = { FRIENDS: 'friends', INCOMING: 'incoming', OUTGOING: 'outgoing', SEARCH: 'search' }
const SEARCH_LIMIT = 20

function FriendsPage() {
    const navigate = useNavigate()
    const { userId: routeUserId } = useParams()
    const { currentUser } = useAuthContext()

    // Если параметра нет в роуте (маршрут /friends) — это моя страница друзей.
    // Сравнение через String(), т.к. id из URL всегда строка, а currentUser.id может быть числом.
    const targetUserId = routeUserId ?? currentUser?.id
    const isOwnPage = !routeUserId || String(routeUserId) === String(currentUser?.id)

    const [activeTab, setActiveTab] = useState(TABS.FRIENDS)

    // Мои собственные отношения — нужны ВСЕГДА (даже на чужой странице),
    // чтобы корректно рисовать кнопки "Добавить"/"Удалить" относительно себя
    const [myFriends, setMyFriends] = useState([])
    const [incoming, setIncoming] = useState([])
    const [outgoing, setOutgoing] = useState([])

    // Список друзей, который непосредственно отображается на странице.
    // На своей странице это = myFriends, на чужой — друзья targetUserId
    const [displayedFriends, setDisplayedFriends] = useState([])

    const [targetProfile, setTargetProfile] = useState(null)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [query, setQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searchTotal, setSearchTotal] = useState(0)
    const [searchOffset, setSearchOffset] = useState(0)
    const [searchLoading, setSearchLoading] = useState(false)

    const abortRef = useRef(null)

    useEffect(() => {
        setActiveTab(TABS.FRIENDS)
        setQuery('')
        loadAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetUserId])

    const loadAll = async () => {
        if (!targetUserId) return
        try {
            setLoading(true)
            if (isOwnPage) {
                const [friendsData, incomingData, outgoingData] = await Promise.all([
                    friendService.getFriends(currentUser.id),
                    friendService.getIncomingRequests(),
                    friendService.getOutgoingRequests()
                ])
                setMyFriends(friendsData)
                setDisplayedFriends(friendsData)
                setIncoming(incomingData)
                setOutgoing(outgoingData)
                setTargetProfile(null)
            } else {
                const [myFriendsData, incomingData, outgoingData, targetFriendsData, profile] = await Promise.all([
                    friendService.getFriends(currentUser.id),
                    friendService.getIncomingRequests(),
                    friendService.getOutgoingRequests(),
                    friendService.getFriends(targetUserId),
                    userService.getUserById(targetUserId)
                ])
                setMyFriends(myFriendsData)
                setIncoming(incomingData)
                setOutgoing(outgoingData)
                setDisplayedFriends(targetFriendsData)
                setTargetProfile(profile)
            }
        } catch (err) {
            setError('Не удалось загрузить друзей')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const runSearch = useCallback(async (q, offset) => {
        if (abortRef.current) abortRef.current.abort()
        const controller = new AbortController()
        abortRef.current = controller

        try {
            setSearchLoading(true)
            const { items, total } = await userService.searchUsers(q, {
                limit: SEARCH_LIMIT,
                offset,
                signal: controller.signal
            })
            setSearchResults(prev => offset === 0 ? items : [...prev, ...items])
            setSearchTotal(total)
            setSearchOffset(offset)
        } catch (err) {
            if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
                console.error(err)
            }
        } finally {
            setSearchLoading(false)
        }
    }, [])

    // debounce поискового запроса (только на своей странице)
    useEffect(() => {
        if (!isOwnPage) return
        if (!query.trim()) {
            setSearchResults([])
            setSearchTotal(0)
            return
        }
        const timer = setTimeout(() => {
            runSearch(query.trim(), 0)
        }, 300)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, runSearch, isOwnPage])

    const loadMoreResults = () => {
        runSearch(query.trim(), searchOffset + SEARCH_LIMIT)
    }

    // Статус считается всегда относительно МЕНЯ (currentUser), а не владельца страницы
    const relationStatus = (userId) => {
        if (userId === currentUser?.id) return 'self'
        if (myFriends.some(f => f.id === userId)) return 'friends'
        if (incoming.some(r => r.user.id === userId)) return 'incoming'
        if (outgoing.some(r => r.user.id === userId)) return 'outgoing'
        return 'none'
    }

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
            const friendsData = await friendService.getFriends(currentUser.id)
            setMyFriends(friendsData)
            if (isOwnPage) setDisplayedFriends(friendsData)
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

            setMyFriends(prev => prev.filter(f => f.username !== username))
            if (isOwnPage) {
                setDisplayedFriends(prev => prev.filter(f => f.username !== username))
            }
            setIncoming(await friendService.getIncomingRequests())
        } catch (err) {
            console.error(err)
        }
    }

    const renderActionButton = (user) => {
        const status = relationStatus(user.id)
        if (status === 'self') return null
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
            <h1>
                {isOwnPage
                    ? 'Друзья'
                    : `Друзья: ${targetProfile ? `${targetProfile.first_name} ${targetProfile.last_name}` : ''}`}
            </h1>

            {isOwnPage && (
                <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Поиск по логину, имени или фамилии..."
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setActiveTab(TABS.SEARCH) }}
                />
            )}

            {error && <div className={styles.error}>{error}</div>}

            {isOwnPage && activeTab !== TABS.SEARCH && (
                <div className={styles.tabs}>
                    <button className={activeTab === TABS.FRIENDS ? styles.tabActive : styles.tab} onClick={() => setActiveTab(TABS.FRIENDS)}>
                        Друзья ({myFriends.length})
                    </button>
                    <button className={activeTab === TABS.INCOMING ? styles.tabActive : styles.tab} onClick={() => setActiveTab(TABS.INCOMING)}>
                        Входящие ({incoming.length})
                    </button>
                    <button className={activeTab === TABS.OUTGOING ? styles.tabActive : styles.tab} onClick={() => setActiveTab(TABS.OUTGOING)}>
                        Исходящие ({outgoing.length})
                    </button>
                </div>
            )}

            {isOwnPage && activeTab === TABS.SEARCH && (
                <div className={styles.list}>
                    {!searchLoading && searchResults.length === 0 && <p className={styles.empty}>Никого не найдено</p>}
                    {searchResults.map(user => (
                        <div key={user.id} className={styles.item}>
                            <div className={styles.clickable} onClick={() => navigate(`/users/${user.id}`)}>
                                <Avatar avatarUrl={user.avatar_url} size={52} />
                                <div className={styles.info}>
                                    <div className={styles.name}>{user.first_name} {user.last_name}</div>
                                    <div className={styles.username}>@{user.username}</div>
                                </div>
                            </div>
                            {renderActionButton(user)}
                        </div>
                    ))}
                    {searchLoading && <p className={styles.empty}>Ищем...</p>}
                    {!searchLoading && searchResults.length < searchTotal && (
                        <button className={styles.tab} onClick={loadMoreResults}>Показать ещё</button>
                    )}
                </div>
            )}

            {(!isOwnPage || activeTab === TABS.FRIENDS) && (
                <div className={styles.list}>
                    {displayedFriends.length === 0 && (
                        <p className={styles.empty}>{isOwnPage ? 'Пока нет друзей' : 'У пользователя пока нет друзей'}</p>
                    )}
                    {displayedFriends.map(friend => (
                        <div key={friend.id} className={styles.item}>
                            <div className={styles.clickable} onClick={() => navigate(`/users/${friend.id}`)}>
                                <Avatar avatarUrl={friend.avatar_url} size={52} />
                                <div className={styles.info}>
                                    <div className={styles.name}>{friend.first_name} {friend.last_name}</div>
                                    <div className={styles.username}>@{friend.username}</div>
                                </div>
                            </div>
                            {renderActionButton(friend)}
                        </div>
                    ))}
                </div>
            )}

            {isOwnPage && activeTab === TABS.INCOMING && (
                <div className={styles.list}>
                    {incoming.length === 0 && <p className={styles.empty}>Нет входящих заявок</p>}
                    {incoming.map(req => (
                        <div key={req.user.id} className={styles.item}>
                            <div className={styles.clickable} onClick={() => navigate(`/users/${req.user.id}`)}>
                                <Avatar avatarUrl={req.user.avatar_url} size={52} />
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

            {isOwnPage && activeTab === TABS.OUTGOING && (
                <div className={styles.list}>
                    {outgoing.length === 0 && <p className={styles.empty}>Нет исходящих заявок</p>}
                    {outgoing.map(req => (
                        <div key={req.user.id} className={styles.item}>
                            <div className={styles.clickable} onClick={() => navigate(`/users/${req.user.id}`)}>
                                <Avatar avatarUrl={req.user.avatar_url} size={52} />
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
