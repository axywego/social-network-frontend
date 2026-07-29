import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { useAuthContext } from '../../context/AuthContext'
import { userService } from '../../services/userService'
import styles from './ProfilePage.module.css'

function ProfilePage() {
    const navigate = useNavigate()
    const { logout } = useAuthContext()
    const [myProfile, setMyProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

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
                <button onClick={loadMyProfile}>Попробовать снова</button>
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

            {/* ТВОЙ ПРОФИЛЬ */}
            {myProfile && (
                <div className={styles.myProfile}>
                    <div className={styles.avatarLarge}>
                        {myProfile.first_name[0]}{myProfile.last_name[0]}
                    </div>
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