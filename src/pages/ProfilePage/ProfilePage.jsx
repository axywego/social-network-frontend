import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, LogOut, Pencil } from 'lucide-react'
import { authService } from '../../services/authService'
import { userService } from '../../services/userService'
import { postService } from '../../services/postService'
import { useAuthContext } from '../../context/AuthContext'
import PostCard from '../../components/PostCard'
import PostComposer from '../../components/PostComposer'
import PostModeration from '../../components/PostModeration'
import ImageZoomModal from '../../components/ImageZoomModal'
import { resolveAvatarUrl } from '../../components/Avatar'
import { todayIso, validateBirthday } from '../../utils/birthday'
import ProfileHeader from '../../components/ui/ProfileHeader'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import Alert from '../../components/ui/Alert'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { FileText } from 'lucide-react'
import styles from './ProfilePage.module.css'

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

    const [isZoomOpen, setIsZoomOpen] = useState(false)

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
            setError(null)
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
        setError(null)

        const birthdayError = validateBirthday(form.birthday)
        if (birthdayError) {
            setError(birthdayError)
            return
        }

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

    if (!currentUser || loading) {
        return (
            <div className={styles.container}>
                <Spinner label="Загружаем профиль" />
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <PageHeader
                title="Мой профиль"
                action={
                    <Button variant="danger" size="sm" icon={LogOut} onClick={handleLogout}>
                        Выйти
                    </Button>
                }
            />

            {error && <Alert>{error}</Alert>}

            <ProfileHeader
                profile={currentUser}
                avatarOverlay={
                    <button
                        type="button"
                        className={styles.avatarAction}
                        onClick={editing ? handleAvatarClick : () => setIsZoomOpen(true)}
                        aria-label={editing ? 'Загрузить фото' : 'Открыть фото'}
                    >
                        {uploading ? (
                            <span className={styles.avatarOverlay}>...</span>
                        ) : (
                            <Camera aria-hidden="true" />
                        )}
                    </button>
                }
                actions={
                    !editing && (
                        <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
                            Редактировать профиль
                        </Button>
                    )
                }
            />

            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="visually-hidden"
            />

            {isZoomOpen && currentUser.avatar_url && (
                <ImageZoomModal
                    src={resolveAvatarUrl(currentUser.avatar_url)}
                    onClose={() => setIsZoomOpen(false)}
                />
            )}

            {editing && (
                <form className={styles.editPanel} onSubmit={handleSaveInfo}>
                    <h2 className={styles.editTitle}>Редактирование профиля</h2>

                    <div className={styles.editGrid}>
                        <Field
                            label="Имя"
                            name="first_name"
                            value={form.first_name}
                            onChange={handleFormChange}
                            required
                        />
                        <Field
                            label="Фамилия"
                            name="last_name"
                            value={form.last_name}
                            onChange={handleFormChange}
                            required
                        />
                        <Field
                            label="Отчество"
                            name="patronymic"
                            value={form.patronymic}
                            onChange={handleFormChange}
                        />
                        <Field
                            label="Дата рождения"
                            name="birthday"
                            type="date"
                            value={form.birthday}
                            max={todayIso()}
                            onChange={handleFormChange}
                        />
                    </div>

                    <Field
                        as="textarea"
                        label="О себе"
                        name="bio"
                        value={form.bio}
                        onChange={handleFormChange}
                        rows={3}
                        placeholder="Пара слов о себе"
                    />

                    <div className={styles.editActions}>
                        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                            Отмена
                        </Button>
                        <Button type="submit" variant="primary">
                            Сохранить
                        </Button>
                    </div>
                </form>
            )}

            <PostComposer onPostCreated={loadPosts} />

            <h2 className={styles.postsTitle}>Мои посты</h2>
            <div className={styles.feed}>
                {posts.length === 0 && (
                    <EmptyState
                        icon={FileText}
                        title="У вас пока нет постов"
                        description="Опубликуйте первый пост — он появится здесь и в ленте друзей."
                    />
                )}
                <PostModeration posts={posts} setPosts={setPosts}>
                    {posts.map(post => (
                        <PostCard key={post.id} post={post} author={post.author} />
                    ))}
                </PostModeration>
            </div>
        </div>
    )
}

export default ProfilePage
