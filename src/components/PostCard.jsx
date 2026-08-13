import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { postService } from '../services/postService'
import { useAuthContext } from '../context/AuthContext'
import { usePostActions } from '../context/PostActionsContext'
import styles from './PostCard.module.css'
import Avatar from './Avatar'
import ImageZoomModal from './ImageZoomModal'

function PostCard({ post, author }) {
    const navigate = useNavigate()
    const { currentUser } = useAuthContext()
    const { onEdit, onDelete, onReport } = usePostActions()

    const isOwner = currentUser?.id === author?.id

    const [liked, setLiked] = useState(post.liked_by_me)
    const [likesCount, setLikesCount] = useState(post.likes)
    const [likeBusy, setLikeBusy] = useState(false)

    const [comments, setComments] = useState(post.comments || [])
    const [showComments, setShowComments] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [sending, setSending] = useState(false)

    const [isZoomOpen, setIsZoomOpen] = useState(false)

    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef(null)

    useEffect(() => {
        if (!menuOpen) return

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false)
            }
        }
        const handleEscape = (e) => {
            if (e.key === 'Escape') setMenuOpen(false)
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscape)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [menuOpen])

    const handleToggleLike = async () => {
        if (likeBusy) return
        setLikeBusy(true)
        try {
            if (liked) {
                await postService.unlikePost(post.id)
                setLikesCount(c => c - 1)
            } else {
                await postService.likePost(post.id)
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
            console.log(`${post.id}: ${commentText.trim()}`)

            const comment = await postService.createComment({ post_id: post.id, content: commentText.trim() })
            
            setComments(prev => [...prev, comment])
            setCommentText('')
            setShowComments(true)
        } catch (err) {
            console.error(err)
        } finally {
            setSending(false)
        }
    }

    const handleEditClick = () => {
        setMenuOpen(false)
        onEdit(post)
    }

    const handleDeleteClick = () => {
        setMenuOpen(false)
        onDelete(post)
    }

    const handleReportClick = () => {
        setMenuOpen(false)
        onReport(post)
    }

    const getDate = (date) => {
        const today = new Date()
        if (date.getFullYear() === today.getFullYear() && 
            date.getMonth() === today.getMonth() && 
            date.getDate() === today.getDate()
        ) {
            return `Сегодня, ${date.toLocaleString('ru-RU', {hour: '2-digit', minute: '2-digit'})}`
        }
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (
            date.getFullYear() === yesterday.getFullYear() &&
            date.getMonth() === yesterday.getMonth() &&
            date.getDate() === yesterday.getDate()
        ) {
            return `Вчера, ${date.toLocaleString('ru-RU', {hour: '2-digit', minute: '2-digit'})}`
        }
        
        return date.toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        })
    }

    return (
        <div className={styles.card}>
            <div className={styles.header} >
                <div style={ {display: "flex", gap: "12px", flexDirection: "row"} }
                 onClick={() => navigate(`/users/${author.id}`)}
                >
                    <Avatar avatarUrl={author?.avatar_url} size={38} />
                    <div>
                        <div className={styles.author}>{`${author.first_name} ${author.last_name}`}</div>
                        <div className={styles.time}>{getDate(new Date(post.created_at))}</div>
                    </div>
                </div>

                <div className={styles.menuWrapper} ref={menuRef}>
                    <button
                        type="button"
                        className={styles.menuTrigger}
                        onClick={() => setMenuOpen(v => !v)}
                        aria-haspopup="true"
                        aria-expanded={menuOpen}
                        aria-label="Действия с постом"
                    >
                        •••
                    </button>

                    {menuOpen && (
                        <div className={styles.menuDropdown} role="menu">
                            {isOwner && (
                                <button type="button" className={styles.menuItem} onClick={handleEditClick} role="menuitem">
                                    ✏️ Редактировать
                                </button>
                            )}
                            {isOwner && (
                                <button type="button" className={styles.menuItemDanger} onClick={handleDeleteClick} role="menuitem">
                                    🗑️ Удалить
                                </button>
                            )}
                            {!isOwner && (
                                <button type="button" className={styles.menuItem} onClick={handleReportClick} role="menuitem">
                                    🚩 Пожаловаться
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {post.content && <div className={styles.content}>{post.content}</div>}
            <div style={{width: "100%", display: "flex", justifyContent: "center"}}>
                {post.image_url && (
                    <img
                        src={postService.resolveImageUrl(post.image_url)}
                        alt="post attachment"
                        className={styles.image}
                        style= {{cursor: 'zoom-in'}}
                        onClick={() => setIsZoomOpen(true)}
                    />
                )}
            </div>            

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
                            <div style={{cursor: 'pointer'}} onClick={() => navigate(`/users/${c.author.id}`)}>
                                <Avatar avatarUrl={c.author.avatar_url} size={38}/>
                            </div>
                            <div className={styles.commentBody}>
                                <span className={styles.commentAuthor}>{c.author.first_name} {c.author.last_name}</span>
                                <span className={styles.commentText}>{c.content}</span>
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
            {isZoomOpen && post.image_url && (
                <ImageZoomModal
                    src={postService.resolveImageUrl(post.image_url)}
                    onClose={() => setIsZoomOpen(false)}
                />
            )}
        </div>
    )
}

export default PostCard