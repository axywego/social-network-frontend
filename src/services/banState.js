const BAN_KEY = 'banInfo'
export const BAN_PATH = '/banned'

export function saveBanInfo(reason) {
    try {
        sessionStorage.setItem(BAN_KEY, JSON.stringify({ reason: reason ?? null }))
    } catch {
        return
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
        return
    }
}

export function isBanDetail(detail) {
    return Boolean(detail && typeof detail === 'object' && detail.code === 'user_banned')
}