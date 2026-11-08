import { useState, useCallback } from 'react'
import { postService } from '../services/postService'
import { PostActionsProvider } from '../context/PostActionsContext'
import ReportModal from './ReportModal'
import Alert from './ui/Alert'

export default function PostModeration({ posts, setPosts, children }) {
    const [editingPostId, setEditingPostId] = useState(null)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reportedPost, setReportedPost] = useState(null)

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

    const handleReportPost = useCallback((post) => {
        setError('')
        setNotice('')
        setReportedPost(post)
    }, [])

    const handleReported = useCallback(() => {
        setNotice('Жалоба отправлена администраторам')
    }, [])

    return (
        <PostActionsProvider
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onReport={handleReportPost}
            editingPostId={editingPostId}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
        >
            {error && <Alert>{error}</Alert>}
            {notice && <Alert tone="success">{notice}</Alert>}
            {children}

            {reportedPost && (
                <ReportModal
                    target={reportedPost.author}
                    subject="Пост"
                    onClose={() => setReportedPost(null)}
                    onSubmitted={handleReported}
                />
            )}
        </PostActionsProvider>
    )
}