import { Heart, MessageCircle, UserPlus, Bell } from 'lucide-react'
import styles from './ToastContainer.module.css'

const ICONS = {
    new_message: MessageCircle,
    new_friend: UserPlus,
    new_comment: Bell,
    new_like: Heart,
}

function ToastContainer({ toasts, onDismiss }) {
    return (
        <div className={styles.container}>
            {toasts.map(toast => {
                const Icon = ICONS[toast.type] ?? Bell
                return (
                    <div
                        key={toast.id}
                        className={styles.toast}
                        onClick={() => onDismiss(toast.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                onDismiss(toast.id)
                            }
                        }}
                    >
                        <span className={styles.icon}>
                            <Icon aria-hidden="true" />
                        </span>
                        <div className={styles.body}>
                            <div className={styles.title}>{toast.title}</div>
                            <div className={styles.text}>{toast.text}</div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default ToastContainer
