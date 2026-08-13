import { useState, useEffect, useCallback, useRef } from 'react'
import { postService } from '../../services/postService'
import PostCard from '../../components/PostCard'
import PostComposer from '../../components/PostComposer'
import styles from './FeedPage.module.css'
import { notificationService } from '../../services/notificationService'

import { PostActionsProvider } from '../../context/PostActionsContext'

const PAGE_SIZE = 15

function FeedPage() {
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [error, setError] = useState(null)

    const [editingPost, setEditingPost] = useState(null)

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

    const handleEditPost = (post) => {
        // setEditingPost(post)
    }

    const handleSaveEdit = async (newContent) => {
        // в разработке
        // if (!editingPost) return
        // const postId = editingPost.id
        // const prevPosts = posts

        // setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: newContent } : p))
        // setEditingPost(null)

        // try {
        //     await postService.updatePost(postId, { content: newContent })
        //     // notificationService.success('Пост обновлён')
        // } catch (err) {
        //     console.error(err)
        //     setPosts(prevPosts)
        //     // notificationService.error('Не удалось обновить пост')
        // }
    }

    const handleDeletePost = async (post) => {
        // if (!window.confirm('Удалить пост?')) return

        const prevPosts = posts
        setPosts(prev => prev.filter(p => p.id !== post.id))

        try {
            await postService.deletePost(post.id)
            // notificationService.success('Пост удалён')
        } catch (err) {
            console.error(err)
            setPosts(prevPosts)
            // notificationService.error('Не удалось удалить пост')
        }
    }

    const handleReportPost = async (post) => {
        // в разработке
        // try {
        //     await postService.reportPost(post.id)
        //     notificationService.success('Жалоба отправлена')
        // } catch (err) {
        //     console.error(err)
        //     notificationService.error('Не удалось отправить жалобу')
        // }
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
                <PostActionsProvider onEdit={handleEditPost} onDelete={handleDeletePost} onReport={handleReportPost}>
                    {posts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            author={post.author}
                        />
                    ))}
                </PostActionsProvider>
            </div>
            {hasMore && (
                <div ref={sentinelRef} className={styles.sentinel}>
                    {loadingMore && <span>Загрузка...</span>}
                </div>
            )}
            {!hasMore && posts.length > 0 && (
                <p className={styles.empty}>На этом всё!</p>
            )}

            {editingPost && (
                <EditPostModal
                    post={editingPost}
                    onSave={handleSaveEdit}
                    onClose={() => setEditingPost(null)}
                />
            )}
        </div>
    )
}

function EditPostModal({ post, onSave, onClose }) {
    const [content, setContent] = useState(post.content || '')
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!content.trim() || saving) return
        setSaving(true)
        await onSave(content.trim())
        setSaving(false)
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2>Редактировать пост</h2>
                <form onSubmit={handleSubmit}>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={5}
                        autoFocus
                    />
                    <div className={styles.modalActions}>
                        <button type="button" onClick={onClose} disabled={saving}>
                            Отмена
                        </button>
                        <button type="submit" disabled={saving || !content.trim()}>
                            {saving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default FeedPage