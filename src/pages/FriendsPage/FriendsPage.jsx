import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Search, UserSearch, UserX, Users } from 'lucide-react'
import { friendService } from '../../services/friendService'
import { userService } from '../../services/userService'
import { useAuthContext } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import UserRow, { AcceptButton, DeclineButton, RemoveButton } from './UserRow'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import styles from './FriendsPage.module.css'

const TABS = { FRIENDS: 'friends', INCOMING: 'incoming', OUTGOING: 'outgoing' }
const SEARCH_LIMIT = 20

function FriendsPage() {
    const { userId: routeUserId } = useParams()
    const { currentUser } = useAuthContext()
    const { isUserOnline } = useNotifications()

    const targetUserId = routeUserId ?? currentUser?.id
    const isOwnPage = !routeUserId || String(routeUserId) === String(currentUser?.id)

    const [activeTab, setActiveTab] = useState(TABS.FRIENDS)
    const [searching, setSearching] = useState(false)

    const [myFriends, setMyFriends] = useState([])
    const [incoming, setIncoming] = useState([])
    const [outgoing, setOutgoing] = useState([])

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
        setSearching(false)
        loadAll()
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
    }, [query, runSearch, isOwnPage])

    const loadMoreResults = () => {
        runSearch(query.trim(), searchOffset + SEARCH_LIMIT)
    }

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
            return <RemoveButton onClick={() => handleRemoveFriend(user.username)} />
        }
        if (status === 'incoming') {
            return (
                <>
                    <AcceptButton onClick={() => handleAccept(user.username)} />
                    <DeclineButton onClick={() => handleDecline(user.username)} />
                </>
            )
        }
        if (status === 'outgoing') {
            return <DeclineButton label="Отменить" onClick={() => handleDecline(user.username)} />
        }
        return (
            <Button variant="primary" size="sm" onClick={() => handleSendRequest(user.username)}>
                Добавить
            </Button>
        )
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <Spinner label="Загружаем друзей" />
            </div>
        )
    }

    const targetName = targetProfile
        ? `${targetProfile.first_name} ${targetProfile.last_name}`.trim()
        : ''

    const TAB_ITEMS = [
        { id: TABS.FRIENDS, label: 'Друзья', count: myFriends.length },
        { id: TABS.INCOMING, label: 'Входящие', count: incoming.length },
        { id: TABS.OUTGOING, label: 'Исходящие', count: outgoing.length },
    ]

    return (
        <div className={styles.container}>
            <PageHeader
                title={isOwnPage ? 'Друзья' : `Друзья: ${targetName}`}
                subtitle={isOwnPage ? 'Управляйте списками друзей и заявками' : undefined}
            />

            {isOwnPage && (
                <div className={styles.search}>
                    <Search className={styles.searchIcon} aria-hidden="true" />
                    <label className="visually-hidden" htmlFor="friend-search">Поиск пользователей</label>
                    <input
                        id="friend-search"
                        type="text"
                        className={styles.searchInput}
                        placeholder="Поиск по логину, имени или фамилии..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setSearching(Boolean(e.target.value.trim()))
                        }}
                    />
                </div>
            )}

            {error && <Alert>{error}</Alert>}

            {isOwnPage && !searching && (
                <div className={styles.tabs} role="tablist" aria-label="Списки друзей">
                    {TAB_ITEMS.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === item.id}
                            className={`${styles.tab} ${activeTab === item.id ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            {item.label}
                            <span className={styles.tabCount}>{item.count}</span>
                        </button>
                    ))}
                </div>
            )}

            {searching && (
                <div className={styles.list}>
                    {!searchLoading && searchResults.length === 0 && (
                        <EmptyState
                            icon={UserSearch}
                            title="Никого не найдено"
                            description="Попробуйте изменить запрос."
                        />
                    )}

                    {searchResults.map(user => (
                        <UserRow
                            key={user.id}
                            user={user}
                            online={isUserOnline(user.id)}
                            actions={renderActionButton}
                        />
                    ))}

                    {searchLoading && <Spinner label="Ищем" />}

                    {!searchLoading && searchResults.length > 0 && searchResults.length < searchTotal && (
                        <Button variant="secondary" size="sm" onClick={loadMoreResults}>
                            Показать ещё
                        </Button>
                    )}
                </div>
            )}

            {!searching && (!isOwnPage || activeTab === TABS.FRIENDS) && (
                <div className={styles.list}>
                    {displayedFriends.length === 0 && (
                        <EmptyState
                            icon={Users}
                            title={isOwnPage ? 'Пока нет друзей' : 'У пользователя пока нет друзей'}
                            description={
                                isOwnPage
                                    ? 'Найдите людей через поиск и отправьте им заявку.'
                                    : undefined
                            }
                        />
                    )}
                    {displayedFriends.map(friend => (
                        <UserRow
                            key={friend.id}
                            user={friend}
                            online={isUserOnline(friend.id)}
                            actions={renderActionButton}
                        />
                    ))}
                </div>
            )}

            {!searching && isOwnPage && activeTab === TABS.INCOMING && (
                <div className={styles.list}>
                    {incoming.length === 0 && (
                        <EmptyState
                            icon={UserX}
                            title="Нет входящих заявок"
                            description="Заявки на добавление появятся здесь."
                        />
                    )}
                    {incoming.map(req => (
                        <UserRow key={req.user.id} user={req.user} actions={renderActionButton} />
                    ))}
                </div>
            )}

            {!searching && isOwnPage && activeTab === TABS.OUTGOING && (
                <div className={styles.list}>
                    {outgoing.length === 0 && (
                        <EmptyState
                            icon={UserX}
                            title="Нет исходящих заявок"
                            description="Здесь собраны отправленные вами заявки."
                        />
                    )}
                    {outgoing.map(req => (
                        <UserRow key={req.user.id} user={req.user} actions={renderActionButton} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default FriendsPage
