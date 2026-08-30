import styles from './ToastContainer.module.css'

const ICONS = {
    new_message: '💬',
    new_friend: '👤',
    new_comment: '✏️',
    new_like: '❤️',
}

function ToastContainer({ toasts, onDismiss }) {
    return (
        <div className={styles.container}>
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={styles.toast}
                    onClick={() => onDismiss(toast.id)}
                >
                    <span className={styles.icon}>{ICONS[toast.type] ?? '🔔'}</span>
                    <div className={styles.body}>
                        <div className={styles.title}>{toast.title}</div>
                        <div className={styles.text}>{toast.text}</div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default ToastContainer