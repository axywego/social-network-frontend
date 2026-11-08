import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import styles from './Alert.module.css'

const ICONS = {
    error: AlertCircle,
    warning: AlertTriangle,
    success: CheckCircle2,
    info: Info,
}

export default function Alert({ tone = 'error', action, className = '', children }) {
    const Icon = ICONS[tone] ?? Info

    return (
        <div className={`${styles.alert} ${styles[tone]} ${className}`} role="alert">
            <Icon className={styles.icon} aria-hidden="true" />
            <div className={styles.body}>{children}</div>
            {action}
        </div>
    )
}
