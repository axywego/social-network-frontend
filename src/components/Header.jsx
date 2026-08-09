import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import Avatar from './Avatar'
import styles from './Header.module.css'

function Header() {
    const { currentUser } = useAuthContext()
    const headerRef = useRef(null)

    useEffect(() => {
        const el = headerRef.current
        if (!el) return

        const updateHeight = () => {
            document.documentElement.style.setProperty('--header-height', `${el.offsetHeight}px`)
        }

        updateHeight()

        const observer = new ResizeObserver(updateHeight)
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return (
        <header ref={headerRef} className={styles.header}>
            <div className={styles.inner}>
                <NavLink to="/feed" className={styles.logo}>Coova</NavLink>
                <nav className={styles.nav}>
                    <NavLink to="/feed" className={({ isActive }) => isActive ? styles.active : styles.link}>
                        Лента
                    </NavLink>
                    <NavLink to="/friends" className={({ isActive }) => isActive ? styles.active : styles.link}>
                        Друзья
                    </NavLink>
                    <NavLink to="/chats" className={({ isActive }) => isActive ? styles.active : styles.link}>
                        Чаты
                    </NavLink>
                    <NavLink to="/profile" className={styles.profileLink}>
                        <Avatar avatarUrl={currentUser.avatar_url} size={34} />
                    </NavLink>
                </nav>
            </div>
        </header>
    )
}

export default Header