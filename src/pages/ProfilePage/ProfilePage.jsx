import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { useAuthContext } from '../../context/AuthContext'
import { userService } from '../../services/userService'
import styles from './ProfilePage.module.css'

const API_BASE_URL = 'http://127.0.0.1:8000'

function ProfilePage() {
    const navigate = useNavigate()
    const { logout } = useAuthContext()
    const [myProfile, setMyProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)

    useEffect(() => {
        loadMyProfile()
    }, [])

    const loadMyProfile = async () => {
        try {
            setLoading(true)
            const myData = await userService.getMyProfile()
            setMyProfile(myData)
        } catch (err) {
            setError('Ошибка загрузки профиля')
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

    const handleAvatarClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setUploading(true)
        try {
            const result = await userService.uploadAvatar(file)
            // Бэк возвращает { avatar_url: "/static/avatars/..." }
            setMyProfile(prev => ({ 
                ...prev, 
                avatar_url: result.avatar_url 
            }))
        } catch (err) {
            console.error('Ошибка загрузки аватара:', err)
            setError('Не удалось загрузить фото')
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Загрузка...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>{error}</div>
                <button onClick={() => {
                    setError(null)
                    loadMyProfile()
                }}>Попробовать снова</button>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Мой профиль</h1>
                <button onClick={handleLogout} className={styles.logoutBtn}>
                    Выйти
                </button>
            </div>

            {myProfile && (
                <div className={styles.myProfile}>
                    <div
                        className={styles.avatarLarge}
                        onClick={handleAvatarClick}
                        style={{ cursor: 'pointer', position: 'relative' }}
                    >
                        {myProfile.avatar_url ? (
                            <img
                                src={`${API_BASE_URL}${myProfile.avatar_url}`}
                                alt="avatar"
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            />
                        ) : (
                            <>{myProfile.first_name[0]}{myProfile.last_name[0]}</>
                        )}

                        {uploading && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(0,0,0,0.5)', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: 12
                            }}>
                                ...
                            </div>
                        )}
                    </div>

                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />

                    <div className={styles.myInfo}>
                        <h2>{myProfile.last_name} {myProfile.first_name} {myProfile.patronymic || ''}</h2>
                        <p className={styles.username}>@{myProfile.username}</p>
                        {myProfile.birthday && (
                            <p className={styles.birthday}>
                                🎂 {new Date(myProfile.birthday).toLocaleDateString('ru-RU')}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProfilePage