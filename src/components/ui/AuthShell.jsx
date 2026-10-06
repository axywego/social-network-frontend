import GlassCard from './GlassCard'
import styles from './AuthShell.module.css'

/**
 * Shared frame for Login / Register so the two pages cannot drift
 * apart again. Left column is the brand panel, hidden on mobile.
 */
export default function AuthShell({ title, subtitle, children, footer }) {
    return (
        <div className={styles.page}>
            <GlassCard className={styles.card}>
                <aside className={styles.brand} aria-hidden="true">
                    <div className={styles.brandTop}>
                        <span className={styles.mark} />
                        <span className={styles.wordmark}>Coova</span>
                    </div>
                    <p className={styles.tagline}>
                        Общайтесь с друзьями, делитесь тем, что важно, и оставайтесь на связи.
                    </p>
                    <ul className={styles.points}>
                        <li className={styles.point}>Лента друзей и комментарии</li>
                        <li className={styles.point}>Личные чаты и группы</li>
                        <li className={styles.point}>Профили и списки друзей</li>
                    </ul>
                </aside>

                <div className={styles.panel}>
                    <div className={styles.panelBrand}>
                        <span className={styles.mark} />
                        <span className={styles.wordmark}>Coova</span>
                    </div>

                    <header className={styles.head}>
                        <h1 className={styles.title}>{title}</h1>
                        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                    </header>

                    {children}

                    {footer && <div className={styles.footer}>{footer}</div>}
                </div>
            </GlassCard>
        </div>
    )
}
