import { useState, useEffect, useCallback, useRef } from 'react'
import { ShieldBan, ShieldCheck, Users } from 'lucide-react'
import { adminService } from '../../services/adminService'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Alert from '../../components/ui/Alert'
import Pagination from '../../components/ui/Pagination'
import ComplaintRow from './ComplaintRow'
import AdminUserRow from './AdminUserRow'
import styles from './AdminPage.module.css'

const TABS = { COMPLAINTS: 'complaints', BANNED: 'banned', USERS: 'users' }
const PAGE_SIZE = 20

const TAB_ITEMS = [
    { id: TABS.COMPLAINTS, label: 'Жалобы', icon: ShieldCheck },
    { id: TABS.BANNED, label: 'Забаненные', icon: ShieldBan },
    { id: TABS.USERS, label: 'Пользователи', icon: Users },
]

const LOADERS = {
    [TABS.COMPLAINTS]: adminService.getComplaints,
    [TABS.BANNED]: adminService.getBannedUsers,
    [TABS.USERS]: adminService.getUsers,
}

const EMPTY_RESULT = { items: [], total: 0, pages: 1, loaded: false }

function AdminPage() {
    const [activeTab, setActiveTab] = useState(TABS.COMPLAINTS)
    const [pagesByTab, setPagesByTab] = useState({
        [TABS.COMPLAINTS]: 1,
        [TABS.BANNED]: 1,
        [TABS.USERS]: 1,
    })
    const [results, setResults] = useState({
        [TABS.COMPLAINTS]: EMPTY_RESULT,
        [TABS.BANNED]: EMPTY_RESULT,
        [TABS.USERS]: EMPTY_RESULT,
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [notice, setNotice] = useState(null)
    const [busyId, setBusyId] = useState(null)

    const abortRef = useRef(null)

    const page = pagesByTab[activeTab]
    const result = results[activeTab]

    const applySuccess = useCallback((tab, data) => {
        setResults(prev => ({
            ...prev,
            [tab]: {
                items: data.items,
                total: data.total,
                pages: data.pages,
                loaded: true,
            },
        }))
        setError(null)
    }, [])

    const applyFailure = useCallback((err) => {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return
        setError('Не удалось загрузить данные админ-панели')
        console.error(err)
    }, [])

    const load = useCallback((tab, targetPage) => {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        return LOADERS[tab]({ page: targetPage, size: PAGE_SIZE, signal: controller.signal })
            .then(data => applySuccess(tab, data))
            .catch(applyFailure)
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false)
            })
    }, [applySuccess, applyFailure])

    useEffect(() => {
        load(activeTab, pagesByTab[activeTab])
        return () => abortRef.current?.abort()
    }, [activeTab, pagesByTab, load])

    const goToPage = (nextPage) => {
        setLoading(true)
        setPagesByTab(prev => ({ ...prev, [activeTab]: nextPage }))
    }

    const selectTab = (tab) => {
        setLoading(true)
        setActiveTab(tab)
        setNotice(null)
        setError(null)
    }

    const refreshAfterRemoval = (remaining) => {
        if (remaining === 0 && page > 1) {
            goToPage(page - 1)
        } else {
            setLoading(true)
            load(activeTab, page)
        }
    }

    const runAction = async (action, id, successText) => {
        setBusyId(id)
        setError(null)
        try {
            await action(id)
            setNotice(successText)
            return true
        } catch (err) {
            console.error(err)
            if (err.response?.status === 404) {
                setNotice('Запись уже обработана — список обновлён')
                load(activeTab, page)
            } else {
                setError('Не удалось выполнить действие')
            }
            return false
        } finally {
            setBusyId(null)
        }
    }

    const handleApprove = async (complaintId) => {
        const ok = await runAction(
            adminService.approveComplaint,
            complaintId,
            'Жалоба одобрена, пользователь забанен'
        )
        if (ok) {
            refreshAfterRemoval(result.items.filter(item => item.id !== complaintId).length)
        }
    }

    const handleDecline = async (complaintId) => {
        const ok = await runAction(
            adminService.declineComplaint,
            complaintId,
            'Жалоба отклонена'
        )
        if (ok) {
            refreshAfterRemoval(result.items.filter(item => item.id !== complaintId).length)
        }
    }

    const handleUnban = async (userId) => {
        const ok = await runAction(adminService.unbanUser, userId, 'Пользователь разбанен')
        if (ok) {
            refreshAfterRemoval(result.items.filter(item => item.id !== userId).length)
        }
    }

    const renderRows = () => {
        if (loading && result.items.length === 0) {
            return <Spinner label="Загружаем данные" />
        }

        if (result.items.length === 0) {
            const EMPTY = {
                [TABS.COMPLAINTS]: {
                    icon: ShieldCheck,
                    title: 'Жалоб нет',
                    description: 'Все жалобы обработаны.',
                },
                [TABS.BANNED]: {
                    icon: ShieldBan,
                    title: 'Никто не забанен',
                    description: 'Забаненные пользователи появятся здесь.',
                },
                [TABS.USERS]: {
                    icon: Users,
                    title: 'Пользователей нет',
                    description: 'Зарегистрированные пользователи появятся здесь.',
                },
            }[activeTab]

            return <EmptyState {...EMPTY} />
        }

        if (activeTab === TABS.COMPLAINTS) {
            return result.items.map(complaint => (
                <ComplaintRow
                    key={complaint.id}
                    complaint={complaint}
                    busy={busyId === complaint.id}
                    onApprove={handleApprove}
                    onDecline={handleDecline}
                />
            ))
        }

        return result.items.map(user => (
            <AdminUserRow
                key={user.id}
                user={user}
                busy={busyId === user.id}
                onUnban={activeTab === TABS.BANNED ? handleUnban : undefined}
            />
        ))
    }

    return (
        <div className={styles.container}>
            <PageHeader
                title="Админ-панель"
                subtitle="Жалобы, баны и пользователи"
            />

            <div className={styles.tabs} role="tablist" aria-label="Разделы админ-панели">
                {TAB_ITEMS.map(({ id, label, icon: Icon }) => {
                    const tabResult = results[id]
                    return (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === id}
                            className={`${styles.tab} ${activeTab === id ? styles.tabActive : ''}`}
                            onClick={() => selectTab(id)}
                        >
                            <Icon className={styles.tabIcon} aria-hidden="true" />
                            {label}
                            {tabResult.loaded && <span className={styles.tabCount}>{tabResult.total}</span>}
                        </button>
                    )
                })}
            </div>

            {error && <Alert>{error}</Alert>}
            {notice && <Alert tone="success">{notice}</Alert>}

            <div className={styles.list} aria-busy={loading}>
                {renderRows()}
            </div>

            <Pagination
                page={result.pages ? page : 1}
                pages={result.pages}
                total={result.total}
                onChange={goToPage}
            />
        </div>
    )
}

export default AdminPage