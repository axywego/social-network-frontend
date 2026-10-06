import { LoaderCircle } from 'lucide-react'
import styles from './Spinner.module.css'

export default function Spinner({ label = 'Загрузка', className = '' }) {
    return (
        <div className={`${styles.wrapper} ${className}`} role="status">
            <LoaderCircle className={styles.spinner} aria-hidden="true" />
            <span className={styles.label}>{label}</span>
        </div>
    )
}
