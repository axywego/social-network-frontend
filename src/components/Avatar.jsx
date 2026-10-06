import defaultAvatar from '../assets/default-avatar.png'
import styles from './Avatar.module.css'

const API_URL = import.meta.env.VITE_API_URL

export function resolveAvatarUrl(avatarUrl) {
    return avatarUrl ? `${API_URL}${avatarUrl}` : defaultAvatar
}

export default function Avatar({ avatarUrl, size = 100, isOnline = false, className = '' }) {
    const src = resolveAvatarUrl(avatarUrl)
    const dot = Math.max(8, Math.round(size * 0.26))

    return (
        <span
            className={`${styles.avatar} ${className}`}
            style={{ '--size': `${size}px`, '--dot': `${dot}px` }}
        >
            <img className={styles.image} src={src} alt="" width={size} height={size} />
            {isOnline && <span className={styles.online} aria-label="В сети" />}
        </span>
    )
}
