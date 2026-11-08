import styles from './Button.module.css'

export default function Button({
    variant = 'secondary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    iconOnly = false,
    block = false,
    className = '',
    children,
    type = 'button',
    ...rest
}) {
    const classes = [
        'ui-button',
        styles.button,
        styles[variant],
        styles[size],
        iconOnly ? styles.iconOnly : '',
        block ? styles.block : '',
        className,
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <button type={type} className={classes} {...rest}>
            {Icon && <Icon className={styles.icon} aria-hidden="true" />}
            {children != null && children !== '' && (
                <span className={`ui-button__label ${styles.label}`}>{children}</span>
            )}
            {IconRight && <IconRight className={styles.icon} aria-hidden="true" />}
        </button>
    )
}
