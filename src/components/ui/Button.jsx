import styles from './Button.module.css'

/**
 * variant: primary | secondary | ghost | danger
 * size:    sm | md | lg
 */
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
        // Stable global hook so a page module can target the button
        // (e.g. hide its label on narrow screens) without reaching
        // into this module's hashed class names.
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
