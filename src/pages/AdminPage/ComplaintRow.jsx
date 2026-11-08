import { Link } from 'react-router-dom'
import { Ban } from 'lucide-react'
import Button from '../../components/ui/Button'
import styles from './AdminRow.module.css'

const formatDate = (value) => new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
})

export default function ComplaintRow({ complaint, busy, onApprove, onDecline }) {
    return (
        <article className={styles.row}>
            <div className={styles.info}>
                <div className={styles.titles}>
                    <span className={styles.name}>@{complaint.sender_username}</span>
                    <span className={styles.arrow} aria-hidden="true">&rarr;</span>
                    <Link className={styles.reported} to={`/users/${complaint.reported_id}`}>
                        @{complaint.reported_username}
                    </Link>
                </div>
                <p className={styles.reason}>{complaint.ban_reason}</p>
                <span className={styles.meta}>{formatDate(complaint.reported_at)}</span>
            </div>

            <div className={styles.actions}>
                <Button
                    variant="danger"
                    size="sm"
                    icon={Ban}
                    disabled={busy}
                    onClick={() => onApprove(complaint.id)}
                >
                    Забанить
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => onDecline(complaint.id)}
                >
                    Отклонить
                </Button>
            </div>
        </article>
    )
}