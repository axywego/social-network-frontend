import styles from './GlassCard.module.css'

export default function GlassCard({
    as: Tag = 'div',
    tone = 'base',
    lift = false,
    className = '',
    children,
    ...rest
}) {
    const classes = [
        'glass-surface',
        tone === 'strong' && 'glass-surface--strong',
        tone === 'quiet' && 'glass-surface--quiet',
        lift && 'glass-surface--lift',
        styles.card,
        className,
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <Tag className={classes} {...rest}>
            {children}
        </Tag>
    )
}
