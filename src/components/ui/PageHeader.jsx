import styles from './PageHeader.module.css'

/** Consistent page title + optional action row. */
export default function PageHeader({ title, subtitle, action, className = '' }) {
    return (
        <div className={`${styles.header} ${className}`}>
            <div className={styles.text}>
                <h1 className={styles.title}>{title}</h1>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            {action && <div className={styles.action}>{action}</div>}
        </div>
    )
}
