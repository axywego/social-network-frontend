import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Flag,
    Heart,
    ImagePlus,
    MessageCircle,
    MoreHorizontal,
    Pencil,
    Send,
    Trash2,
    X,
} from 'lucide-react'
import { postService } from '../services/postService'
import { validateImageFile } from '../utils/imageFile'
import { useAuthContext } from '../context/AuthContext'
import { usePostActions } from '../context/PostActionsContext'
import GlassCard from './ui/GlassCard'
import Button from './ui/Button'
import Alert from './ui/Alert'
import Avatar from './Avatar'
import ImageZoomModal from './ImageZoomModal'
import styles from './PostCard.module.css'

function PostCard({ post, author }) {
    const { currentUser } = useAuthContext()
    const { onEdit, onDelete, onReport, editingPostId, onSaveEdit, onCancelEdit } = usePostActions()

    const isEditing = post.id === editingPostId

    const [editText, setEditText] = useState(post.content || '')
    // Изображение, прикреплённое к редактируемому посту. filename — то, что уйдёт
    // в image_url при сохранении: существующий путь (если не трогали), новый путь
    // (если заменили) или null (если убрали). Пока не сохранили — на сам пост
    // это никак не влияет.
    const [pendingImage, setPendingImage] = useState(
        post.image_url ? { filename: post.image_url, previewUrl: postService.resolveImageUrl(post.image_url), uploading: false } : null
    )
    const [editSaving, setEditSaving] = useState(false)
    const editFileInputRef = useRef(null)

    const isOwner = currentUser?.id === author?.id

    const [liked, setLiked] = useState(post.liked_by_me)
    const [likesCount, setLikesCount] = useState(post.likes)
    const [likeBusy, setLikeBusy] = useState(false)

    const [comments, setComments] = useState(post.comments || [])
    const [showComments, setShowComments] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [sending, setSending] = useState(false)
    const [actionError, setActionError] = useState('')

    const [isZoomOpen, setIsZoomOpen] = useState(false)

    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef(null)

    useEffect(() => {
        const previewUrl = pendingImage?.previewUrl
        return () => {
            if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
        }
    }, [pendingImage?.previewUrl, isEditing])

    useEffect(() => {
        if (!isEditing) return
        setEditText(post.content || '')
        setPendingImage(
            post.image_url
                ? { filename: post.image_url, previewUrl: postService.resolveImageUrl(post.image_url), uploading: false }
                : null
        )
    }, [isEditing, post.content, post.image_url])

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
        setActionError('')
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
            setActionError('Не удалось изменить отметку. Попробуйте снова.')
        } finally {
            setLikeBusy(false)
        }
    }

    const handleSendComment = async (e) => {
        e.preventDefault()
        if (!commentText.trim()) return

        setSending(true)
        setActionError('')
        try {
            const comment = await postService.createComment({ post_id: post.id, content: commentText.trim() })

            setComments(prev => [...prev, comment])
            setCommentText('')
            setShowComments(true)
        } catch (err) {
            console.error(err)
            setActionError('Не удалось отправить комментарий. Попробуйте снова.')
        } finally {
            setSending(false)
        }
    }

    const handleEditClick = () => {
        setMenuOpen(false)
        onEdit(post)
    }

    const handleEditSubmit = async (e) => {
        e.preventDefault()
        if (editSaving || pendingImage?.uploading) return
        const trimmedText = editText.trim()
        if (!trimmedText && !pendingImage) return // нечего сохранять — ни текста, ни фото

        setEditSaving(true)
        try {
            await onSaveEdit(post.id, trimmedText, pendingImage ? pendingImage.filename : null)
        } catch (err) {
            console.error(err)
        } finally {
            setEditSaving(false)
        }
    }

    const handleEditCancel = () => {
        setEditText(post.content || '')
        if (pendingImage?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(pendingImage.previewUrl)
        setPendingImage(
            post.image_url
                ? { filename: post.image_url, previewUrl: postService.resolveImageUrl(post.image_url), uploading: false }
                : null
        )
        onCancelEdit()
    }

    const handleRemoveEditImage = () => {
        if (pendingImage?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(pendingImage.previewUrl)
        setPendingImage(null)
    }

    const handleEditImageChange = async (e) => {
        const file = e.target.files[0]
        e.target.value = '' // чтобы можно было выбрать тот же файл повторно
        if (!file) return

        const validationError = validateImageFile(file)
        if (validationError) {
            setActionError(validationError)
            return
        }
        setActionError('')

        if (pendingImage?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(pendingImage.previewUrl)
        const previewUrl = URL.createObjectURL(file)
        setPendingImage({ filename: null, previewUrl, uploading: true })

        try {
            const { filename } = await postService.uploadPostImage(post.id, file)
            setPendingImage(prev =>
                // если юзер уже убрал/сменил картинку, пока эта грузилась — не воскрешаем её
                prev && prev.previewUrl === previewUrl ? { ...prev, filename, uploading: false } : prev
            )
        } catch (err) {
            console.error(err)
            setActionError('Не удалось загрузить изображение.')
            setPendingImage(prev => (prev?.previewUrl === previewUrl ? null : prev))
        }
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

    const fullName = `${author.first_name} ${author.last_name}`.trim()
    const canSaveEdit = Boolean(editText.trim() || pendingImage) && !editSaving && !pendingImage?.uploading

    return (
        <GlassCard as="article" className={styles.card}>
            <header className={`${styles.header} ${menuOpen ? styles.headerOpen : ''}`}>
                <Link className={styles.authorLink} to={`/users/${author.id}`}>
                    <Avatar avatarUrl={author?.avatar_url} size={40} />
                    <div className={styles.authorMeta}>
                        <span className={styles.author}>{fullName}</span>
                        <time className={styles.time} dateTime={post.created_at}>
                            {getDate(new Date(post.created_at))}
                        </time>
                    </div>
                </Link>

                <div className={styles.menuWrapper} ref={menuRef}>
                    <button
                        type="button"
                        className={styles.menuTrigger}
                        onClick={() => setMenuOpen(v => !v)}
                        aria-haspopup="true"
                        aria-expanded={menuOpen}
                        aria-label="Действия с постом"
                    >
                        <MoreHorizontal aria-hidden="true" />
                    </button>

                    {menuOpen && (
                        <div className={styles.menuDropdown} role="menu">
                            {isOwner && (
                                <button type="button" className={styles.menuItem} onClick={handleEditClick} role="menuitem">
                                    <Pencil aria-hidden="true" />
                                    Редактировать
                                </button>
                            )}
                            {isOwner && (
                                <button type="button" className={styles.menuItemDanger} onClick={handleDeleteClick} role="menuitem">
                                    <Trash2 aria-hidden="true" />
                                    Удалить
                                </button>
                            )}
                            {!isOwner && (
                                <button type="button" className={styles.menuItem} onClick={handleReportClick} role="menuitem">
                                    <Flag aria-hidden="true" />
                                    Пожаловаться
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {isEditing ? (
                <form className={styles.editForm} onSubmit={handleEditSubmit}>
                    <textarea
                        className={styles.editTextarea}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        aria-label="Текст поста"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') handleEditCancel()
                        }}
                    />

                    {pendingImage && (
                        <div className={styles.editImagePreviewWrap}>
                            <img
                                src={pendingImage.previewUrl}
                                alt=""
                                className={styles.editImagePreview}
                            />
                            {pendingImage.uploading && (
                                <div className={styles.editImageOverlay}>Загрузка...</div>
                            )}
                            <button
                                type="button"
                                onClick={handleRemoveEditImage}
                                title="Убрать изображение"
                                aria-label="Убрать изображение"
                                className={styles.editImageRemoveBtn}
                            >
                                <X aria-hidden="true" />
                            </button>
                        </div>
                    )}

                    <div className={styles.editActionsRow}>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={ImagePlus}
                            onClick={() => editFileInputRef.current?.click()}
                            disabled={editSaving}
                        >
                            {pendingImage ? 'Заменить фото' : 'Добавить фото'}
                        </Button>
                        <input
                            type="file"
                            accept="image/*"
                            ref={editFileInputRef}
                            onChange={handleEditImageChange}
                            className="visually-hidden"
                        />

                        <div className={styles.editActions}>
                            <Button type="button" variant="ghost" size="sm" onClick={handleEditCancel} disabled={editSaving}>
                                Отмена
                            </Button>
                            <Button type="submit" variant="primary" size="sm" disabled={!canSaveEdit}>
                                {editSaving ? 'Сохранение...' : 'Сохранить'}
                            </Button>
                        </div>
                    </div>
                </form>
            ) : (
                post.content && <div className={styles.content}>{post.content}</div>
            )}

            {!isEditing && post.image_url && (
                <div className={styles.imageWrap}>
                    <button
                        type="button"
                        className={styles.imageButton}
                        onClick={() => setIsZoomOpen(true)}
                        aria-label="Открыть изображение поста"
                    >
                        <img
                            src={postService.resolveImageUrl(post.image_url)}
                            alt="Изображение поста"
                            className={styles.image}
                            loading="lazy"
                        />
                    </button>
                </div>
            )}

            <div className={styles.actions}>
                <button
                    type="button"
                    className={`${styles.actionBtn} ${liked ? styles.liked : ''}`}
                    onClick={handleToggleLike}
                    disabled={likeBusy}
                    aria-pressed={liked}
                    aria-label={liked ? 'Убрать отметку "Нравится"' : 'Нравится'}
                >
                    <Heart className={styles.actionIcon} aria-hidden="true" />
                    <span>{likesCount}</span>
                </button>

                <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setShowComments(v => !v)}
                    aria-expanded={showComments}
                >
                    <MessageCircle className={styles.actionIcon} aria-hidden="true" />
                    <span>{comments.length > 0 ? comments.length : 'Комментировать'}</span>
                </button>
            </div>

            {actionError && <Alert>{actionError}</Alert>}

            {showComments && (
                <div className={styles.commentsSection}>
                    {comments.length === 0 && (
                        <p className={styles.noComments}>Комментариев пока нет — напишите первым</p>
                    )}

                    {comments.map((c, i) => (
                        <div key={i} className={styles.commentItem}>
                            <Link to={`/users/${c.author.id}`} aria-label={`Профиль: ${c.author.first_name} ${c.author.last_name}`}>
                                <Avatar avatarUrl={c.author.avatar_url} size={34} />
                            </Link>
                            <div className={styles.commentBody}>
                                <span className={styles.commentAuthor}>
                                    {c.author.first_name} {c.author.last_name}
                                </span>
                                <span className={styles.commentText}>{c.content}</span>
                            </div>
                        </div>
                    ))}

                    <form className={styles.commentForm} onSubmit={handleSendComment}>
                        <label className="visually-hidden" htmlFor={`comment-${post.id}`}>Комментарий</label>
                        <input
                            id={`comment-${post.id}`}
                            type="text"
                            placeholder="Написать комментарий..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            icon={Send}
                            disabled={sending || !commentText.trim()}
                        >
                            {sending ? '...' : 'Отправить'}
                        </Button>
                    </form>
                </div>
            )}

            {isZoomOpen && post.image_url && (
                <ImageZoomModal
                    src={postService.resolveImageUrl(post.image_url)}
                    onClose={() => setIsZoomOpen(false)}
                />
            )}
        </GlassCard>
    )
}

export default PostCard
