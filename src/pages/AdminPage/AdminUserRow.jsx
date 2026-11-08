import { Link } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import Avatar from '../../components/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import styles from './AdminRow.module.css'

export default function AdminUserRow({ user, busy, onUnban }) {
    const fullName = `${user.first_name} ${user.last_name}`.trim()

    return (
        <div className={styles.row}>
            <Link className={styles.person} to={`/users/${user.id}`}>
                <Avatar avatarUrl={user.avatar_url} size={44} />
                <div className={styles.info}>
                    <span className={styles.name}>{fullName}</span>
                    <span className={styles.username}>@{user.username}</span>
                </div>
            </Link>

            <div className={styles.actions}>
                {user.role === 'admin' && <Badge tone="brand">Админ</Badge>}
                {user.is_banned && <Badge tone="danger">Забанен</Badge>}

                {onUnban && (
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={ShieldOff}
                        disabled={busy}
                        onClick={() => onUnban(user.id)}
                    >
                        Разбанить
                    </Button>
                )}
            </div>
        </div>
    )
}