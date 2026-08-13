import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { userService } from '../../services/userService'
import { postService } from '../../services/postService'
import { friendService } from '../../services/friendService'
import { chatService } from '../../services/chatService'
import { useAuthContext } from '../../context/AuthContext'
import { PostActionsProvider } from '../../context/PostActionsContext'
import PostCard from '../../components/PostCard'
import styles from './UserProfilePage.module.css'
import Avatar from '../../components/Avatar'

function UserProfilePage() {
    const { userId } = useParams()
    const navigate = useNavigate()
    const { currentUser } = useAuthContext()

    const [profile, setProfile] = useState(null)
    const [posts, setPosts] = useState([])
    const [relation, setRelation] = useState('none')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

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
            const [profileData, postsData, friends, incoming, outgoing] = await Promise.all([
                userService.getUserById(userId),
                postService.getUserPosts(userId),
                friendService.getFriends(),
                friendService.getIncomingRequests(),
                friendService.getOutgoingRequests()
            ])
            setProfile(profileData)
            setPosts(postsData)

            if (friends.some(f => f.id === userId)) setRelation('friends')
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
            setRelation('none')
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

    const handleReportPost = async (post) => {
        try {
            await postService.reportPost(post.id)
        } catch (err) {
            console.error(err)
            setError('Не удалось отправить жалобу')
        }
    }

    if (loading) {
        return <div className={styles.container}><div className={styles.loading}>Загрузка...</div></div>
    }

    if (error || !profile) {
        return <div className={styles.container}><div className={styles.error}>{error || 'Пользователь не найден'}</div></div>
    }

    return (
        <div className={styles.container}>
            <div className={styles.profileHeader}>
                <div className={styles.avatarLarge}>
                    <Avatar avatarUrl={profile.avatar_url} size={100} />
                </div>
                <div className={styles.info}>
                    <h1>{profile.last_name} {profile.first_name} {profile.patronymic || ''}</h1>
                    <p className={styles.username}>@{profile.username}</p>
                    {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
                    {profile.birthday && (
                        <p className={styles.birthday}>🎂 {new Date(profile.birthday).toLocaleDateString('ru-RU')}</p>
                    )}

                    <div className={styles.actionsRow}>
                        {relation === 'none' && (
                            <button className={styles.addBtn} onClick={handleSendRequest}>Добавить в друзья</button>
                        )}
                        {relation === 'outgoing' && (
                            <button className={styles.declineBtn} onClick={handleDecline}>Отменить заявку</button>
                        )}
                        {relation === 'incoming' && (
                            <>
                                <button className={styles.addBtn} onClick={handleAccept}>Принять заявку</button>
                                <button className={styles.declineBtn} onClick={handleDecline}>Отклонить</button>
                            </>
                        )}
                        {relation === 'friends' && (
                            <button className={styles.declineBtn} onClick={handleRemoveFriend}>Удалить из друзей</button>
                        )}
                        <button className={styles.messageBtn} onClick={handleMessage}>Написать сообщение</button>
                    </div>
                </div>
            </div>

            <h2 className={styles.postsTitle}>Посты</h2>
            <div className={styles.feed}>
                {posts.length === 0 && <p className={styles.empty}>Пока нет постов</p>}
                <PostActionsProvider onReport={handleReportPost}>
                    {posts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            author={profile}
                        />
                    ))}
                </PostActionsProvider>
            </div>
        </div>
    )
}

export default UserProfilePage