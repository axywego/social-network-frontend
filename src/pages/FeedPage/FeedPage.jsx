import { useState, useEffect } from 'react'
import { postService } from '../../services/postService'
import { userService } from '../../services/userService'
import PostCard from '../../components/PostCard'
import PostComposer from '../../components/PostComposer'
import styles from './FeedPage.module.css'
import { useAuthContext } from '../../context/AuthContext'

function FeedPage() {
    const { currentUser } = useAuthContext()

    const [posts, setPosts] = useState([])
    const [usersById, setUsersById] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadFeed()
    }, [])

    const loadFeed = async () => {
        try {
            setLoading(true)
            const [feedData, usersData] = await Promise.all([
                postService.getFeed(),
                userService.getUsers()
            ])
            setPosts(feedData)

            const map = {}
            usersData.forEach(u => { map[u.id] = u })
            map.me = currentUser
            setUsersById(map)
        } catch (err) {
            setError('Не удалось загрузить ленту')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className={styles.container}><div className={styles.loading}>Загрузка...</div></div>
    }

    return (
        <div className={styles.container}>
            <h1>Лента</h1>

            <PostComposer onPostCreated={loadFeed} />

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.feed}>
                {posts.length === 0 && <p className={styles.empty}>Пока нет постов от друзей</p>}
                {posts.map(post => (
                    <PostCard key={post.post_id} post={post} author={usersById[post.user_id]} usersById={usersById} />
                ))}
            </div>
        </div>
    )
}

export default FeedPage