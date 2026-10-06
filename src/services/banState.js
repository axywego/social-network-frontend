const BAN_KEY = 'banInfo'
export const BAN_PATH = '/banned'

/**
 * Ban notice for the current tab. sessionStorage (not local) so a
 * ban on one device never leaks the notice to another one.
 */
export function saveBanInfo(reason) {
    try {
        sessionStorage.setItem(BAN_KEY, JSON.stringify({ reason: reason ?? null }))
    } catch {
        // Private mode / storage disabled — the redirect still works.
    }
}

export function getBanInfo() {
    try {
        const raw = sessionStorage.getItem(BAN_KEY)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export function clearBanInfo() {
    try {
        sessionStorage.removeItem(BAN_KEY)
    } catch {
        // ignore
    }
}

export function isBanDetail(detail) {
    return Boolean(detail && typeof detail === 'object' && detail.code === 'user_banned')
}