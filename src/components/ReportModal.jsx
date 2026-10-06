import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Flag, X } from 'lucide-react'
import { complaintService } from '../services/complaintService'
import Alert from './ui/Alert'
import Button from './ui/Button'
import Spinner from './ui/Spinner'
import styles from './ReportModal.module.css'

const DUPLICATE_STATUS = 409

/**
 * Reason picker behind every "Пожаловаться" action. A complaint is
 * filed against a user, so `target` is the reported account and
 * `subject` only describes where the report came from.
 */
export default function ReportModal({ target, subject, onClose, onSubmitted }) {
    const [reasons, setReasons] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)

    const dialogRef = useRef(null)

    useEffect(() => {
        const controller = new AbortController()

        complaintService.getReasons({ signal: controller.signal })
            .then(data => {
                setReasons(data)
                setSelectedId(data.length > 0 ? data[0].id : null)
            })
            .catch(err => {
                if (err.name === 'CanceledError' || err.name === 'AbortError') return
                setError('Не удалось загрузить причины жалобы')
                console.error(err)
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false)
            })

        return () => controller.abort()
    }, [])

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKey)

        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        dialogRef.current?.focus()

        return () => {
            window.removeEventListener('keydown', handleKey)
            document.body.style.overflow = prevOverflow
        }
    }, [onClose])

    const handleSubmit = useCallback(async () => {
        if (selectedId == null) return
        setSubmitting(true)
        setError(null)
        try {
            await complaintService.createComplaint({
                reportedId: target.id,
                reasonId: selectedId,
            })
            onSubmitted()
            onClose()
        } catch (err) {
            console.error(err)
            setError(err.response?.status === DUPLICATE_STATUS
                ? 'Вы уже пожаловались на этого пользователя — повторная жалоба не создаётся'
                : 'Не удалось отправить жалобу. Попробуйте ещё раз.')
            setSubmitting(false)
        }
    }, [onClose, onSubmitted, selectedId, target.id])

    const modal = (
        <div className={styles.overlay} onClick={onClose}>
            <div
                ref={dialogRef}
                className={`glass-surface ${styles.dialog}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-modal-title"
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
            >
                <header className={styles.header}>
                    <div className={styles.headings}>
                        <h2 className={styles.title} id="report-modal-title">Пожаловаться</h2>
                        <p className={styles.subtitle}>
                            {subject ? `${subject} · ` : ''}@{target.username}
                        </p>
                    </div>
                    <button
                        type="button"
                        className={styles.close}
                        onClick={onClose}
                        aria-label="Закрыть"
                    >
                        <X aria-hidden="true" />
                    </button>
                </header>

                <p className={styles.hint}>Выберите причину — жалоба попадёт в админ-панель.</p>

                {loading ? (
                    <Spinner label="Загружаем причины" />
                ) : (
                    <ul className={styles.reasons} role="radiogroup" aria-label="Причина жалобы">
                        {reasons.map(reason => (
                            <li key={reason.id}>
                                <label
                                    className={`${styles.reason} ${selectedId === reason.id ? styles.reasonSelected : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="ban-reason"
                                        value={reason.id}
                                        checked={selectedId === reason.id}
                                        onChange={() => setSelectedId(reason.id)}
                                        className="visually-hidden"
                                    />
                                    <span className={styles.reasonText}>{reason.note}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                )}

                {error && <Alert>{error}</Alert>}

                <footer className={styles.footer}>
                    <Button variant="ghost" onClick={onClose}>Отмена</Button>
                    <Button
                        variant="danger"
                        icon={Flag}
                        disabled={loading || submitting || selectedId == null}
                        onClick={handleSubmit}
                    >
                        {submitting ? 'Отправляем...' : 'Отправить жалобу'}
                    </Button>
                </footer>
            </div>
        </div>
    )

    return createPortal(modal, document.body)
}