import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import { authService } from '../../services/authService'
import { userService } from '../../services/userService'
import { postService } from '../../services/postService'
import { useAuthContext } from '../../context/AuthContext'
import { PostActionsProvider } from '../../context/PostActionsContext'
import PostCard from '../../components/PostCard'
import PostComposer from '../../components/PostComposer'
import styles from './ProfilePage.module.css'
import Avatar from '../../components/Avatar'

function ProfilePage() {
    const navigate = useNavigate()
    const { logout, currentUser, refreshUser } = useAuthContext()
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState(null)
    const [error, setError] = useState(null)
    const fileInputRef = useRef(null)

    useEffect(() => {
        loadPosts()
    }, [])

    useEffect(() => {
        if (currentUser) {
            setForm({
                id: currentUser.id,
                first_name: currentUser.first_name,
                last_name: currentUser.last_name,
                patronymic: currentUser.patronymic || '',
                bio: currentUser.bio || '',
                birthday: currentUser.birthday || ''
            })
        }
    }, [currentUser])

    const loadPosts = async () => {
        try {
            setLoading(true)
            const data = await postService.getMyPosts()
            setPosts(data)
        } catch (err) {
            setError('Не удалось загрузить посты')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await authService.logout()
        logout()
        navigate('/login')
    }

    const handleAvatarClick = () => fileInputRef.current?.click()

    const handleFileChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setUploading(true)
        try {
            await userService.uploadAvatar(file)
            await refreshUser()
        } catch (err) {
            console.error(err)
            setError('Не удалось загрузить фото')
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    const handleFormChange = (e) => {
        const { name, value } = e.target
        setForm(prev => ({ ...prev, [name]: value }))
    }

    const handleSaveInfo = async (e) => {
        e.preventDefault()
        try {
            await userService.changeInfo({
                first_name: form.first_name,
                last_name: form.last_name,
                patronymic: form.patronymic || null,
                bio: form.bio || null,
                birthday: form.birthday || null
            })
            await refreshUser()
            setEditing(false)
        } catch (err) {
            console.error(err)
            setError('Не удалось сохранить изменения')
        }
    }

    const handleEditPost = (post) => {
        // фичи еще нет!!!
    }

    const handleDeletePost = async (post) => {
        if (!window.confirm('Удалить пост?')) return

        const prevPosts = posts
        setPosts(prev => prev.filter(p => p.id !== post.id))

        try {
            await postService.deletePost(post.id)
        } catch (err) {
            console.error(err)
            setPosts(prevPosts)
            setError('Не удалось удалить пост')
        }
    }

    if (!currentUser || loading) {
        return <div className={styles.container}><div className={styles.loading}>Загрузка...</div></div>
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Мой профиль</h1>
                <button onClick={handleLogout} className={styles.logoutBtn}>Выйти</button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.myProfile}>
                <div className={styles.avatarLarge} onClick={handleAvatarClick} style={{ cursor: 'pointer' }}>
                    <Avatar avatarUrl={currentUser.avatar_url} size={100} />
                    {uploading && <div className={styles.uploadOverlay}>...</div>}
                </div>

                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

                {!editing ? (
                    <div className={styles.myInfo}>
                        <h2>{currentUser.last_name} {currentUser.first_name} {currentUser.patronymic || ''}</h2>
                        <p className={styles.username}>@{currentUser.username}</p>
                        {currentUser.bio && <p className={styles.bio}>{currentUser.bio}</p>}
                        {currentUser.birthday && (
                            <p className={styles.birthday}>🎂 {new Date(currentUser.birthday).toLocaleDateString('ru-RU')}</p>
                        )}
                        <button className={styles.editBtn} onClick={() => setEditing(true)}>Редактировать профиль</button>
                    </div>
                ) : (
                    <form className={styles.editForm} onSubmit={handleSaveInfo}>
                        <input name="first_name" value={form.first_name} onChange={handleFormChange} placeholder="Имя" required />
                        <input name="last_name" value={form.last_name} onChange={handleFormChange} placeholder="Фамилия" required />
                        <input name="patronymic" value={form.patronymic} onChange={handleFormChange} placeholder="Отчество" />
                        <textarea name="bio" value={form.bio} onChange={handleFormChange} placeholder="О себе" rows={2} />
                        <input name="birthday" type="date" value={form.birthday} onChange={handleFormChange} />
                        <div className={styles.editFormActions}>
                            <button type="submit">Сохранить</button>
                            <button type="button" onClick={() => setEditing(false)}>Отмена</button>
                        </div>
                    </form>
                )}
            </div>

            <PostComposer onPostCreated={loadPosts} />

            <h2 className={styles.postsTitle}>Мои посты</h2>
            <div className={styles.feed}>
                {posts.length === 0 && <p className={styles.empty}>У вас пока нет постов</p>}
                <PostActionsProvider onEdit={handleEditPost} onDelete={handleDeletePost}>
                    {posts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            author={currentUser}
                        />
                    ))}
                </PostActionsProvider>
            </div>
        </div>
    )
}

export default ProfilePage