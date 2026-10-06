import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, UserPlus } from 'lucide-react'
import { authService } from '../../services/authService'
import { userService } from '../../services/userService'
import { useAuthContext } from '../../context/AuthContext'
import Avatar from '../../components/Avatar'
import { validateImageFile } from '../../utils/imageFile'
import { todayIso, validateBirthday } from '../../utils/birthday'
import AuthShell from '../../components/ui/AuthShell'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import Alert from '../../components/ui/Alert'
import styles from './RegisterPage.module.css'

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

    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview)
        }
    }, [avatarPreview])

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

        const validationError = validateImageFile(file)
        if (validationError) {
            setError(validationError)
            e.target.value = ''
            return
        }
        setError('')

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

        const birthdayError = validateBirthday(dataToSend.birthday)
        if (birthdayError) {
            setError(birthdayError)
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
        <AuthShell
            title="Создать аккаунт"
            subtitle="Пара полей — и вы в ленте"
            footer={
                <>
                    Уже есть аккаунт? <Link to="/login">Войти</Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.avatarRow}>
                    <button
                        type="button"
                        className={styles.avatarButton}
                        onClick={handleAvatarClick}
                        aria-label="Выбрать аватар"
                    >
                        {avatarPreview ? (
                            // Avatar-компонент не умеет в blob: URL (он всегда клеит API_URL),
                            // поэтому локальное превью рендерим обычным img напрямую
                            <img className={styles.avatarPreview} src={avatarPreview} alt="" width={104} height={104} />
                        ) : (
                            <Avatar avatarUrl={null} size={104} />
                        )}
                        <span className={styles.avatarBadge} aria-hidden="true">
                            <Camera />
                        </span>
                    </button>
                    <input
                        id="avatar-input"
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="visually-hidden"
                    />
                </div>

                <div className={styles.grid}>
                    <Field
                        label="Имя"
                        name="first_name"
                        type="text"
                        autoComplete="given-name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                        placeholder="Ваше имя"
                    />
                    <Field
                        label="Фамилия"
                        name="last_name"
                        type="text"
                        autoComplete="family-name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                        placeholder="Ваша фамилия"
                    />
                </div>

                <Field
                    label="Отчество"
                    name="patronymic"
                    type="text"
                    autoComplete="additional-name"
                    value={formData.patronymic}
                    onChange={handleChange}
                    placeholder="Необязательно"
                />

                <Field
                    label="Логин"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder="Только латиница, 5–32 символа"
                />

                <Field
                    label="Пароль"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Минимум 8 символов, без пробелов"
                />

                <Field
                    label="Дата рождения"
                    name="birthday"
                    type="date"
                    value={formData.birthday}
                    max={todayIso()}
                    onChange={handleChange}
                    hint="Необязательно"
                />

                {error && <Alert>{error}</Alert>}

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    block
                    icon={UserPlus}
                    disabled={loading}
                >
                    {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </Button>
            </form>
        </AuthShell>
    )
}

export default RegisterPage
