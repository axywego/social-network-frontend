import styles from './EmptyState.module.css'

export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
    return (
        <div className={`${styles.empty} ${className}`}>
            {Icon && (
                <div className={styles.iconWrap}>
                    <Icon className={styles.icon} aria-hidden="true" />
                </div>
            )}
            {title && <p className={styles.title}>{title}</p>}
            {description && <p className={styles.description}>{description}</p>}
            {action}
        </div>
    )
}
