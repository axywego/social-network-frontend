import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { authService } from '../../services/authService'
import { useAuthContext } from '../../context/AuthContext'
import AuthShell from '../../components/ui/AuthShell'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import Alert from '../../components/ui/Alert'
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
        <AuthShell
            title="С возвращением"
            subtitle="Войдите, чтобы продолжить общение"
            footer={
                <>
                    Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
                </>
            }
        >
            {error && <Alert>{error}</Alert>}

            <form onSubmit={handleSubmit} className={styles.form}>
                <Field
                    label="Логин"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder="Введите логин"
                />

                <Field
                    label="Пароль"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Введите пароль"
                />

                <Button type="submit" variant="primary" size="lg" block icon={LogIn} disabled={loading}>
                    {loading ? 'Входим...' : 'Войти'}
                </Button>
            </form>
        </AuthShell>
    )
}

export default LoginPage
