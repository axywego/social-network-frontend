import { useState } from 'react'
import { postService } from '../services/postService'
import { PostActionsProvider } from '../context/PostActionsContext'

export default function PostModeration({ posts, setPosts, children }) {
    const [editingPostId, setEditingPostId] = useState(null)

    const handleEditPost = (post) => {
        setEditingPostId(post.id)
    }

    const handleCancelEdit = () => {
        setEditingPostId(null)
    }

    const handleSaveEdit = async (postId, newContent, newImageUrl) => {
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
        }
    }

    const handleDeletePost = async (post) => {
        const prevPosts = posts
        setPosts(prev => prev.filter(p => p.id !== post.id))

        try {
            await postService.deletePost(post.id)
        } catch (err) {
            console.error(err)
            setPosts(prevPosts)
        }
    }

    const handleReportPost = async (post) => {
        try {
            await postService.reportPost(post.id)
        } catch (err) {
            console.error(err)
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
            {children}
        </PostActionsProvider>
    )
}
