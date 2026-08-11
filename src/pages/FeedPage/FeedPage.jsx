import { useState, useEffect, useCallback, useRef } from 'react'
import { postService } from '../../services/postService'
import PostCard from '../../components/PostCard'
import PostComposer from '../../components/PostComposer'
import styles from './FeedPage.module.css'
import { notificationService } from '../../services/notificationService'

import { useAuthContext } from '../../context/AuthContext'

const PAGE_SIZE = 15

function FeedPage() {
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [error, setError] = useState(null)

    const sentinelRef = useRef(null)
    const stateRef = useRef( {posts, loadingMore, hasMore })
    stateRef.current = { posts, loadingMore, hasMore}

    useEffect(() => {
        loadFeed()
    }, [])

    const loadFeed = async () => {
        try {
            setLoading(true)
            const feedData = await postService.getFeed({ limit: PAGE_SIZE })
            setPosts(feedData)
            setHasMore(feedData.length === PAGE_SIZE)
        } catch (err) {
            setError('Не удалось загрузить ленту')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const loadMore = useCallback(async () => {
        const {posts, loadingMore, hasMore } = stateRef.current
        if (loadingMore || !hasMore || posts.length === 0) return
        try {
            setLoadingMore(true)
            const lastPost = posts[posts.length - 1]
            const moreData = await postService.getFeed({
                limit: PAGE_SIZE,
                before: lastPost.created_at,
            })
            setPosts(prev => [...prev, ...moreData])
            setHasMore(moreData.length === PAGE_SIZE)
        } 
        catch (err) {
            console.error(err)
        } 
        finally {
            setLoadingMore(false)
        }
    }, [])

    useEffect(() => {
        const sentinel = sentinelRef.current
        if(!sentinel) return

        const observer = new IntersectionObserver(
            (entries) => {
                if(entries[0].isIntersecting) {
                    loadMore()
                }
            },
            {
                rootMargin: '200px'
            }
        )

        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [loadMore, loading])

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
                    <PostCard key={post.id} post={post} author={post.author} />
                ))}
            </div>
            {hasMore && (
                <div ref={sentinelRef} className={styles.sentinel}>
                    {loadingMore && <span>Загрузка...</span>}
                </div>
            )}
            {!hasMore && posts.length > 0 && (
                <p className={styles.empty}>На этом всё!</p>
            )}
        </div>
    )
}

export default FeedPage