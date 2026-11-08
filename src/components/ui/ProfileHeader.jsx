import { Cake } from 'lucide-react'
import Avatar from '../Avatar'
import styles from './ProfileHeader.module.css'

export default function ProfileHeader({ profile, isOnline = false, avatarOverlay, nameAction, stats = [], actions }) {
    const fullName = [profile.last_name, profile.first_name, profile.patronymic]
        .filter(Boolean)
        .join(' ')

    return (
        <div className={styles.card}>
            <div className={styles.avatarWrap}>
                <Avatar avatarUrl={profile.avatar_url} size={104} isOnline={isOnline} />
                {avatarOverlay}
            </div>

            <div className={styles.info}>
                <div className={styles.nameRow}>
                    <h1 className={styles.name}>{fullName}</h1>
                    {nameAction}
                </div>
                <p className={styles.username}>@{profile.username}</p>

                {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

                {profile.birthday && (
                    <p className={styles.birthday}>
                        <Cake aria-hidden="true" />
                        {new Date(profile.birthday).toLocaleDateString('ru-RU')}
                    </p>
                )}

                {stats.length > 0 && (
                    <dl className={styles.stats}>
                        {stats.map(stat => {
                            const Tag = stat.onClick ? 'button' : 'div'
                            return (
                                <Tag
                                    key={stat.label}
                                    type={stat.onClick ? 'button' : undefined}
                                    className={styles.stat}
                                    onClick={stat.onClick}
                                >
                                    <dt className={styles.statLabel}>{stat.label}</dt>
                                    <dd className={styles.statValue}>{stat.value}</dd>
                                </Tag>
                            )
                        })}
                    </dl>
                )}

                {actions && <div className={styles.actions}>{actions}</div>}
            </div>
        </div>
    )
}
