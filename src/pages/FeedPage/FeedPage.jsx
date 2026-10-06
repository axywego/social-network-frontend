import { useState, useEffect, useCallback, useRef } from 'react'
import { Rss } from 'lucide-react'
import { postService } from '../../services/postService'
import PostCard from '../../components/PostCard'
import PostComposer from '../../components/PostComposer'
import PostModeration from '../../components/PostModeration'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import styles from './FeedPage.module.css'

const PAGE_SIZE = 15

function FeedPage() {
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [error, setError] = useState(null)
    const [pagingError, setPagingError] = useState(false)

    const sentinelRef = useRef(null)
    const stateRef = useRef({ posts, loadingMore, hasMore, pagingError })
    stateRef.current = { posts, loadingMore, hasMore, pagingError }

    useEffect(() => {
        loadFeed()
    }, [])

    const loadFeed = async () => {
        try {
            setLoading(true)
            setError(null)
            setPagingError(false)
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

    const loadMore = useCallback(async (retry = false) => {
        const { posts, loadingMore, hasMore, pagingError } = stateRef.current
        if (loadingMore || !hasMore || posts.length === 0 || (pagingError && !retry)) return
        try {
            stateRef.current.loadingMore = true
            setLoadingMore(true)
            setPagingError(false)
            const lastPost = posts[posts.length - 1]
            const moreData = await postService.getFeed({
                limit: PAGE_SIZE,
                before: lastPost.created_at,
            })
            setPosts(prev => [...prev, ...moreData])
            setHasMore(moreData.length === PAGE_SIZE)
        } catch (err) {
            console.error(err)
            setPagingError(true)
        } finally {
            stateRef.current.loadingMore = false
            setLoadingMore(false)
        }
    }, [])

    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore()
            },
            { rootMargin: '200px' }
        )

        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [loadMore, loading])

    return (
        <div className={styles.container}>
            <PageHeader title="Лента" subtitle="Свежие публикации ваших друзей" />

            <PostComposer onPostCreated={loadFeed} />

            {error && (
                <Alert action={<Button size="sm" variant="secondary" onClick={loadFeed}>Повторить</Button>}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Spinner label="Загружаем ленту" />
            ) : (
                <div className={styles.feed}>
                    {posts.length === 0 && !error && (
                        <EmptyState
                            icon={Rss}
                            title="Пока пусто"
                            description="Здесь появятся публикации ваших друзей. Добавьте друзей, чтобы лента ожила."
                        />
                    )}

                    <PostModeration posts={posts} setPosts={setPosts}>
                        {posts.map(post => (
                            <PostCard key={post.id} post={post} author={post.author} />
                        ))}
                    </PostModeration>
                </div>
            )}

            {pagingError && (
                <Alert action={<Button size="sm" variant="secondary" onClick={() => loadMore(true)}>Повторить</Button>}>
                    Не удалось загрузить следующие посты
                </Alert>
            )}

            {hasMore && !pagingError && !loading && (
                <div ref={sentinelRef} className={styles.sentinel}>
                    {loadingMore && <Spinner label="Подгружаем" className={styles.sentinelSpinner} />}
                </div>
            )}

            {!hasMore && posts.length > 0 && !loading && (
                <p className={styles.endOfFeed}>На этом всё — вы посмотрели всю ленту</p>
            )}
        </div>
    )
}

export default FeedPage
