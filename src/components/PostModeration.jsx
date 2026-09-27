import { useState } from 'react'
import { postService } from '../services/postService'
import { PostActionsProvider } from '../context/PostActionsContext'
import styles from './PostModeration.module.css'

export default function PostModeration({ posts, setPosts, children }) {
    const [editingPostId, setEditingPostId] = useState(null)
    const [error, setError] = useState('')

    const handleEditPost = (post) => {
        setEditingPostId(post.id)
    }

    const handleCancelEdit = () => {
        setEditingPostId(null)
    }

    const handleSaveEdit = async (postId, newContent, newImageUrl) => {
        setError('')
        const prevPosts = posts
        setPosts(prev => prev.map(p => (
            p.id === postId ? { ...p, content: newContent, image_url: newImageUrl } : p
        )))
        setEditingPostId(null)
        try {
            const updated = await postService.updatePost(postId, { content: newContent, image_url: newImageUrl })
            setPosts(prev => prev.map(p => (p.id === postId ? updated : p)))
        } catch (err) {
            console.error(err)
            setPosts(prevPosts)
            setEditingPostId(postId)
            setError('Не удалось сохранить пост. Попробуйте ещё раз.')
            throw err
        }
    }

    const handleDeletePost = async (post) => {
        setError('')
        const prevPosts = posts
        setPosts(prev => prev.filter(p => p.id !== post.id))

        try {
            await postService.deletePost(post.id)
        } catch (err) {
            console.error(err)
            setPosts(prevPosts)
            setError('Не удалось удалить пост. Попробуйте ещё раз.')
        }
    }

    const handleReportPost = async (post) => {
        setError('')
        try {
            await postService.reportPost(post.id)
        } catch (err) {
            console.error(err)
            setError('Не удалось отправить жалобу. Попробуйте ещё раз.')
        }
    }

    return (
        <PostActionsProvider
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onReport={handleReportPost}
            editingPostId={editingPostId}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
        >
            {error && <p className={styles.error} role="alert">{error}</p>}
            {children}
        </PostActionsProvider>
    )
}
