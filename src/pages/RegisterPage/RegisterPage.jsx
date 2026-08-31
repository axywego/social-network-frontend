import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { userService } from '../../services/userService'
import { useAuthContext } from '../../context/AuthContext'
import styles from './RegisterPage.module.css'
import Avatar from '../../components/Avatar'

function RegisterPage() {
    const navigate = useNavigate()
    const { login, refreshUser } = useAuthContext()
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        patronymic: '',
        birthday: ''
    })
    const [avatarFile, setAvatarFile] = useState(null)
    const [avatarPreview, setAvatarPreview] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const avatarInputRef = useRef(null)

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleAvatarClick = () => avatarInputRef.current?.click()

    // На этом шаге пользователя ещё не существует, поэтому файл
    // не грузим на сервер, а только сохраняем локально и делаем превью.
    // Реальная загрузка произойдёт в handleSubmit после успешного логина.
    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        setAvatarFile(file)
        setAvatarPreview(URL.createObjectURL(file))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const dataToSend = {
            ...formData,
            patronymic: formData.patronymic || null,
            birthday: formData.birthday || null
        }

        // Имя пользователя - только латиница, 5-32 символов
        if (!/^[a-zA-Z]{5,32}$/.test(dataToSend.username)) {
            setError('Имя пользователя должно содержать только латиницу (5-32 символов)!')
            setLoading(false)
            return
        }

        // Пароль - любые символы, кроме пробелов, минимум 8 символов
        if (/\s/.test(dataToSend.password)) {
            setError('Пароль не может содержать пробелы!')
            setLoading(false)
            return
        }

        if (dataToSend.password.length < 8) {
            setError('Пароль должен быть не менее 8 символов!')
            setLoading(false)
            return
        }

        try {
            await authService.register(dataToSend)

            await authService.login({ username: formData.username, password: formData.password })
            await login()

            if (avatarFile) {
                try {
                    await userService.uploadAvatar(avatarFile)
                    await refreshUser()
                } catch (avatarErr) {
                    console.error('Ошибка загрузки аватара:', avatarErr)
                    // не блокируем регистрацию из-за неудачной загрузки фото
                }
            }

            navigate('/feed')
        } catch (err) {
            if (err.response?.status === 422) {
                const details = err.response.data.detail
                const messages = details.map(d => d.msg).join('. ')
                setError(messages)
            } else {
                setError(err.response?.data?.detail || 'Ошибка регистрации')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>Регистрация</h1>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field} style={{ textAlign: 'center' }}>
                        <div
                            onClick={handleAvatarClick}
                            style={{ cursor: 'pointer', display: 'inline-block' }}
                        >
                            {avatarPreview ? (
                                // Avatar-компонент не умеет в blob: URL (он всегда клеит API_URL),
                                // поэтому локальное превью рендерим обычным img напрямую
                                <img
                                    src={avatarPreview}
                                    alt="avatar preview"
                                    width={150}
                                    height={150}
                                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                                />
                            ) : (
                                <Avatar avatarUrl={null} size={150} />
                            )}
                        </div>
                        <input
                            id="avatar-input"
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Логин *</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            placeholder="Придумайте логин"
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Пароль *</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="Придумайте пароль"
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Имя *</label>
                        <input
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            required
                            placeholder="Ваше имя"
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Фамилия *</label>
                        <input
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            required
                            placeholder="Ваша фамилия"
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Отчество</label>
                        <input
                            type="text"
                            name="patronymic"
                            value={formData.patronymic}
                            onChange={handleChange}
                            placeholder="Ваше отчество (необязательно)"
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Дата рождения</label>
                        <input
                            type="date"
                            name="birthday"
                            value={formData.birthday}
                            onChange={handleChange}
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <button
                        type="submit"
                        className={styles.button}
                        disabled={loading}
                    >
                        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                    </button>
                </form>

                <p className={styles.link}>
                    Уже есть аккаунт? <Link to="/login">Войти</Link>
                </p>
            </div>
        </div>
    )
}

export default RegisterPage
