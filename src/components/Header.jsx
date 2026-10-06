import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, MessageCircle, ShieldCheck, UserCircle, Users } from 'lucide-react'
import { useAuthContext } from '../context/AuthContext'
import Avatar from './Avatar'
import ThemeSwitcher from './ui/ThemeSwitcher'
import styles from './Header.module.css'

const NAV_ITEMS = [
    { to: '/feed', label: 'Лента', icon: Home },
    { to: '/friends', label: 'Друзья', icon: Users },
    { to: '/chats', label: 'Чаты', icon: MessageCircle },
    { to: '/profile', label: 'Профиль', icon: UserCircle },
]

const ADMIN_ITEM = { to: '/admin', label: 'Админ', icon: ShieldCheck }

function Header() {
    const { currentUser } = useAuthContext()
    const barRef = useRef(null)
    const location = useLocation()
    const isChatRoute = location.pathname.startsWith('/chats/') && location.pathname !== '/chats'

    // Publish the real sticky-bar height so full-height views (chat) can
    // offset themselves without hardcoding a magic number.
    useEffect(() => {
        const el = barRef.current
        if (!el) return

        const updateHeight = () => {
            document.documentElement.style.setProperty('--header-height', `${el.offsetHeight}px`)
        }

        updateHeight()

        const observer = new ResizeObserver(updateHeight)
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const isAdmin = currentUser?.role === 'admin'
    const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS

    return (
        <div ref={barRef} className={styles.bar} data-hidden={isChatRoute ? 'true' : undefined}>
            <header className={`glass-surface ${styles.header}`}>
                <NavLink to="/feed" className={styles.logo} aria-label="Coova — в ленту">
                    <span className={styles.mark} aria-hidden="true" />
                    <span className={styles.wordmark}>Coova</span>
                </NavLink>

                <nav className={styles.nav} aria-label="Основная навигация">
                    {navItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            aria-label={label}
                            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
                        >
                            <Icon className={styles.icon} aria-hidden="true" />
                            <span className={styles.label}>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className={styles.actions}>
                    <ThemeSwitcher className={styles.themeSwitcherDesktop} />
                </div>
            </header>
        </div>
    )
}

export default Header
