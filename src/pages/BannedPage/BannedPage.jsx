import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { authService } from '../../services/authService'
import { clearBanInfo, getBanInfo } from '../../services/banState'
import AuthShell from '../../components/ui/AuthShell'
import Button from '../../components/ui/Button'
import styles from './BannedPage.module.css'

function BannedPage() {
    const navigate = useNavigate()
    const banInfo = getBanInfo()

    // Read once on mount: the notice must survive the reload the
    // interceptor triggers, but must not stick around afterwards.
    useEffect(() => {
        clearBanInfo()
    }, [])

    const handleLogout = async () => {
        await authService.logout()
        clearBanInfo()
        navigate('/login', { replace: true })
    }

    return (
        <AuthShell
            title="Вы забанены"
            subtitle="Доступ к Coova ограничен до решения администрации"
        >
            <div className={styles.card}>
                <div className={styles.iconWrap}>
                    <ShieldOff className={styles.icon} aria-hidden="true" />
                </div>

                <p className={styles.reason}>
                    {banInfo?.reason
                        ? `Причина: ${banInfo.reason}`
                        : 'Причина обращения к администрации.'}
                </p>
                <p className={styles.hint}>
                    Если считаете бан ошибкой — опишите ситуацию администрации.
                </p>

                <Button variant="secondary" block onClick={handleLogout}>
                    Выйти из аккаунта
                </Button>
            </div>
        </AuthShell>
    )
}

export default BannedPage