import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'
import styles from './Pagination.module.css'

/**
 * Page stepper for paginated lists. `pages` comes straight from the
 * API envelope; hides itself when there is nothing to page through.
 */
export default function Pagination({ page = 1, pages = 1, total = 0, onChange, className = '' }) {
    if (total === 0 || pages <= 1) return null

    const canGoBack = page > 1
    const canGoForward = page < pages

    return (
        <nav className={`${styles.pagination} ${className}`} aria-label="Постраничная навигация">
            <Button
                variant="ghost"
                size="sm"
                icon={ChevronLeft}
                disabled={!canGoBack}
                onClick={() => onChange(page - 1)}
            >
                Назад
            </Button>

            <span className={styles.status}>
                Страница {page} из {pages}
            </span>

            <Button
                variant="ghost"
                size="sm"
                iconRight={ChevronRight}
                disabled={!canGoForward}
                onClick={() => onChange(page + 1)}
            >
                Вперёд
            </Button>
        </nav>
    )
}