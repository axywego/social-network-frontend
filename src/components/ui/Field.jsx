import { useId } from 'react'
import styles from './Field.module.css'

/**
 * Labelled form control. Renders a <textarea> when `as="textarea"`.
 * Wires up id / label / hint / error association automatically.
 */
export default function Field({
    as = 'input',
    label,
    hint,
    error,
    className = '',
    controlClassName = '',
    ...rest
}) {
    const generatedId = useId()
    const id = rest.id ?? generatedId
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
    const Control = as

    return (
        <div className={`${styles.field} ${className}`}>
            {label && (
                <label className={styles.label} htmlFor={id}>
                    {label}
                </label>
            )}

            <Control
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className={`${styles.control} ${as === 'textarea' ? styles.textarea : ''} ${
                    error ? styles.invalid : ''
                } ${controlClassName}`}
                {...rest}
            />

            {error ? (
                <p className={styles.error} id={`${id}-error`}>
                    {error}
                </p>
            ) : hint ? (
                <p className={styles.hint} id={`${id}-hint`}>
                    {hint}
                </p>
            ) : null}
        </div>
    )
}
