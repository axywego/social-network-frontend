import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { useAuthContext } from '../../context/AuthContext'
import styles from './RegisterPage.module.css'

function RegisterPage() {
    const navigate = useNavigate()
    const { login } = useAuthContext()
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        patronymic: '',
        birthday: ''
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        // Подготовка данных (пустые строки в null)
        const dataToSend = {
            ...formData,
            patronymic: formData.patronymic || null,
            birthday: formData.birthday || null
        }

        try {
            // Регистрируемся
            await authService.register(dataToSend)
            
            // Автоматически логинимся
            await authService.login({
                username: formData.username,
                password: formData.password
            })
            
            login()
            navigate('/profile')
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
                
                {error && <div className={styles.error}>{error}</div>}
                
                <form onSubmit={handleSubmit} className={styles.form}>
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