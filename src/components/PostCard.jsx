import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { postService } from '../services/postService'
import styles from './PostCard.module.css'
import Avatar from './Avatar'

function PostCard({ post, author, usersById }) {
    const navigate = useNavigate()

    const [liked, setLiked] = useState(post.liked_by_me)
    const [likesCount, setLikesCount] = useState(post.likes)
    const [likeBusy, setLikeBusy] = useState(false)

    const [comments, setComments] = useState(post.comments || [])
    const [showComments, setShowComments] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [sending, setSending] = useState(false)

    const handleToggleLike = async () => {
        if (likeBusy) return
        setLikeBusy(true)
        try {
            if (liked) {
                await postService.unlikePost(post.post_id)
                setLikesCount(c => c - 1)
            } else {
                await postService.likePost(post.post_id)
                setLikesCount(c => c + 1)
            }
            setLiked(v => !v)
        } catch (err) {
            console.error(err)
        } finally {
            setLikeBusy(false)
        }
    }

    const handleSendComment = async (e) => {
        e.preventDefault()
        if (!commentText.trim()) return

        setSending(true)
        try {
            const comment = await postService.createComment({ post_id: post.post_id, content: commentText.trim() })
            
            setComments(prev => [...prev, comment])
            setCommentText('')
            setShowComments(true)
        } catch (err) {
            console.error(err)
        } finally {
            setSending(false)
        }
    }

    const authorName = (userId) => {
        const u = usersById?.[userId]
        return u ? `${u.first_name} ${u.last_name}` : 'Пользователь'
    }

    const authorImage = (userId) => {
        const u = usersById?.[userId]
        console.log(u)
        return u ? u.avatar_url : null
    }

    return (
        <div className={styles.card}>
            <div className={styles.header} onClick={() => navigate(`/users/${author.id}`)}>
                <Avatar avatarUrl={author?.avatar_url} size={38} />
                <div>
                    <div className={styles.author}>{author ? `${author.first_name} ${author.last_name}` : 'Пользователь'}</div>
                    <div className={styles.time}>
                        {new Date(post.created_at).toLocaleString('ru-RU', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                    </div>
                </div>
            </div>

            {post.content && <div className={styles.content}>{post.content}</div>}

            {post.image_url && (
                <img
                    src={postService.resolveImageUrl(post.image_url)}
                    alt="post attachment"
                    className={styles.image}
                />
            )}

            <div className={styles.actions}>
                <button
                    className={liked ? styles.likeBtnActive : styles.likeBtn}
                    onClick={handleToggleLike}
                    disabled={likeBusy}
                >
                    {liked ? '❤️' : '🤍'} {likesCount}
                </button>
                <button className={styles.commentBtn} onClick={() => setShowComments(v => !v)}>
                    💬 {comments.length > 0 ? comments.length : 'Комментировать'}
                </button>
            </div>

            {showComments && (
                <div className={styles.commentsSection}>
                    {comments.map((c, i) => (
                        <div key={i} className={styles.commentItem}>
                            <Avatar avatarUrl={authorImage(c.user_id)} size={38} />
                            <div className={styles.commentBody}>
                                <span className={styles.commentAuthor}>{authorName(c.user_id)}</span>
                                {c.content && <span className={styles.commentText}>{c.content}</span>}
                                {c.image_url && (
                                    <img
                                        src={postService.resolveImageUrl(c.image_url)}
                                        alt="comment attachment"
                                        className={styles.commentImage}
                                    />
                                )}
                            </div>
                        </div>
                    ))}

                    <form className={styles.commentForm} onSubmit={handleSendComment}>
                        <input
                            type="text"
                            placeholder="Написать комментарий..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                        />
                        <button type="submit" disabled={sending}>
                            {sending ? '...' : 'Отправить'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}

export default PostCard