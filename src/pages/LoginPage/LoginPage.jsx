import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { useAuthContext } from '../../context/AuthContext'
import styles from './LoginPage.module.css'

function LoginPage() {
    const navigate = useNavigate()
    const { login } = useAuthContext()
    const [formData, setFormData] = useState({
        username: '',
        password: ''
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

        try {
            await authService.login(formData)
            await login()
            navigate('/feed')
        } catch (err) {
            if (err.response?.status === 422) {
                setError('Неверный логин или пароль')
            } else {
                setError(err.response?.data?.detail || 'Ошибка входа')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>Вход</h1>
                
                {error && <div className={styles.error}>{error}</div>}
                
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label>Логин</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            placeholder="Введите логин"
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Пароль</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="Введите пароль"
                        />
                    </div>

                    <button 
                        type="submit" 
                        className={styles.button}
                        disabled={loading}
                    >
                        {loading ? 'Вход...' : 'Войти'}
                    </button>
                </form>

                <p className={styles.link}>
                    Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
                </p>
            </div>
        </div>
    )
}

export default LoginPage