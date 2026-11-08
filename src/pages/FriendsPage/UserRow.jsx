import { Link } from 'react-router-dom'
import { Check, UserMinus, UserPlus, X } from 'lucide-react'
import Avatar from '../../components/Avatar'
import Button from '../../components/ui/Button'
import styles from './UserRow.module.css'

export default function UserRow({ user, actions, online = false }) {
    const fullName = `${user.first_name} ${user.last_name}`.trim()

    return (
        <div className={styles.row}>
            <Link className={styles.person} to={`/users/${user.id}`}>
                <Avatar avatarUrl={user.avatar_url} size={44} isOnline={online} />
                <div className={styles.info}>
                    <span className={styles.name}>{fullName}</span>
                    <span className={styles.username}>@{user.username}</span>
                </div>
            </Link>

            <div className={styles.actions}>
                {actions ? actions(user) : (
                    <Button variant="primary" size="sm" icon={UserPlus}>
                        Добавить
                    </Button>
                )}
            </div>
        </div>
    )
}

export function AcceptButton({ onClick }) {
    return (
        <Button variant="primary" size="sm" icon={Check} onClick={onClick}>
            Принять
        </Button>
    )
}

export function DeclineButton({ onClick, label = 'Отклонить' }) {
    return (
        <Button variant="ghost" size="sm" icon={X} onClick={onClick}>
            {label}
        </Button>
    )
}

export function RemoveButton({ onClick }) {
    return (
        <Button variant="danger" size="sm" icon={UserMinus} onClick={onClick}>
            Удалить
        </Button>
    )
}
