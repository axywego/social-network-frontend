import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, Flag, MessageCircle, UserMinus, UserPlus, X, FileText } from 'lucide-react'
import { userService } from '../../services/userService'
import { postService } from '../../services/postService'
import { friendService } from '../../services/friendService'
import { chatService } from '../../services/chatService'
import { useAuthContext } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import PostCard from '../../components/PostCard'
import PostModeration from '../../components/PostModeration'
import ImageZoomModal from '../../components/ImageZoomModal'
import ReportModal from '../../components/ReportModal'
import { resolveAvatarUrl } from '../../components/Avatar'
import ProfileHeader from '../../components/ui/ProfileHeader'
import Button from '../../components/ui/Button'
import Alert from '../../components/ui/Alert'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import styles from './UserProfilePage.module.css'

function UserProfilePage() {
    const { userId } = useParams()
    const navigate = useNavigate()
    const { currentUser } = useAuthContext()
    const { isUserOnline } = useNotifications()

    const [profile, setProfile] = useState(null)
    const [posts, setPosts] = useState([])
    const [friendCount, setFriendCount] = useState(0)
    const [relation, setRelation] = useState('none')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [isZoomOpen, setIsZoomOpen] = useState(false)
    const [isReportOpen, setIsReportOpen] = useState(false)
    const [reportNotice, setReportNotice] = useState('')

    useEffect(() => {
        if (currentUser && userId === currentUser.id) {
            navigate('/profile', { replace: true })
            return
        }
        loadData()
    }, [userId, currentUser])

    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)
            const [profileData, postsData, friends, incoming, outgoing, friendCountData] = await Promise.all([
                userService.getUserById(userId),
                postService.getUserPosts(userId),
                friendService.getFriends(userId),
                friendService.getIncomingRequests(),
                friendService.getOutgoingRequests(),
                friendService.getFriendCount(userId)
            ])

            setFriendCount(friendCountData)
            setProfile(profileData)
            setPosts(postsData)

            if (friends.some(f => f.id === currentUser.id)) setRelation('friends')
            else if (incoming.some(r => r.user.id === userId)) setRelation('incoming')
            else if (outgoing.some(r => r.user.id === userId)) setRelation('outgoing')
            else setRelation('none')
        } catch (err) {
            setError('Не удалось загрузить профиль')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSendRequest = async () => {
        try {
            await friendService.sendRequest(profile.username)
            setRelation('outgoing')
        } catch (err) {
            console.error(err)
        }
    }

    const handleAccept = async () => {
        try {
            await friendService.acceptRequest(profile.username)
            setRelation('friends')
        } catch (err) {
            console.error(err)
        }
    }

    const handleDecline = async () => {
        try {
            await friendService.declineRequest(profile.username)
            setRelation('none')
        } catch (err) {
            console.error(err)
        }
    }

    const handleRemoveFriend = async () => {
        try {
            await friendService.removeFriend(profile.username)
            setRelation('incoming')
        } catch (err) {
            console.error(err)
        }
    }

    const handleMessage = async () => {
        try {
            const chat = await chatService.getDirectChat(userId)
            navigate(`/chats/${chat.chat_id}`)
        } catch (err) {
            if (err.response?.status === 400) {
                try {
                    const chats = await chatService.getChats()
                    const fullName = `${profile.first_name} ${profile.last_name}`
                    const existing = chats.find(c => c.name === fullName)
                    if (existing) {
                        navigate(`/chats/${existing.chat_id}`)
                        return
                    }
                } catch (innerErr) {
                    console.error(innerErr)
                }
            }
            else if(err.response?.status === 404) {
                const chat = await chatService.createChat({ type: 'direct', user_if_direct: userId })
                navigate(`/chats/${chat.chat_id}`)
            }
            console.error(err)
        }
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <Spinner label="Загружаем профиль" />
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className={styles.container}>
                <Alert>{error || 'Пользователь не найден'}</Alert>
            </div>
        )
    }

    const relationActions = {
        none: (
            <Button variant="primary" icon={UserPlus} onClick={handleSendRequest}>
                Добавить в друзья
            </Button>
        ),
        outgoing: (
            <Button variant="ghost" icon={X} onClick={handleDecline}>
                Отменить заявку
            </Button>
        ),
        incoming: (
            <>
                <Button variant="primary" icon={Check} onClick={handleAccept}>
                    Принять заявку
                </Button>
                <Button variant="ghost" icon={X} onClick={handleDecline}>
                    Отклонить
                </Button>
            </>
        ),
        friends: (
            <Button variant="danger" icon={UserMinus} onClick={handleRemoveFriend}>
                Удалить из друзей
            </Button>
        ),
    }

    return (
        <div className={styles.container}>
            <ProfileHeader
                profile={profile}
                isOnline={isUserOnline(profile.id)}
                avatarOverlay={
                    <button
                        type="button"
                        className={styles.avatarAction}
                        onClick={() => setIsZoomOpen(true)}
                        aria-label="Открыть фото"
                    >
                        <span aria-hidden="true" />
                    </button>
                }
                stats={[
                    {
                        label: 'Друзья',
                        value: friendCount,
                        onClick: () => navigate(`/users/${profile.id}/friends`),
                    },
                    { label: 'Постов', value: posts.length },
                ]}
                nameAction={
                    <Button
                        variant="ghost"
                        icon={Flag}
                        iconOnly
                        aria-label="Пожаловаться"
                        title="Пожаловаться"
                        onClick={() => {
                            setReportNotice('')
                            setIsReportOpen(true)
                        }}
                    />
                }
                actions={
                    <>
                        {relationActions[relation]}
                        <Button variant="secondary" icon={MessageCircle} onClick={handleMessage}>
                            Написать сообщение
                        </Button>
                    </>
                }
            />

            {profile.is_banned && (
                <Alert tone="error">
                    Аккаунт заблокирован администрацией — публикации и общение недоступны.
                </Alert>
            )}

            {isReportOpen && (
                <ReportModal
                    target={profile}
                    subject="Профиль"
                    onClose={() => setIsReportOpen(false)}
                    onSubmitted={() => setReportNotice('Жалоба отправлена администраторам')}
                />
            )}

            {reportNotice && <Alert tone="success">{reportNotice}</Alert>}

            {isZoomOpen && profile.avatar_url && (
                <ImageZoomModal
                    src={resolveAvatarUrl(profile.avatar_url)}
                    onClose={() => setIsZoomOpen(false)}
                />
            )}

            <h2 className={styles.postsTitle}>Посты</h2>
            <div className={styles.feed}>
                {posts.length === 0 && (
                    <EmptyState
                        icon={FileText}
                        title="Пока нет постов"
                        description="Публикации этого пользователя появятся здесь."
                    />
                )}
                <PostModeration posts={posts} setPosts={setPosts}>
                    {posts.map(post => (
                        <PostCard key={post.id} post={post} author={post.author} />
                    ))}
                </PostModeration>
            </div>
        </div>
    )
}

export default UserProfilePage
