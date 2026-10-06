export const MAX_AGE_YEARS = 120

/**
 * Birthday rules for the registration and profile-edit forms.
 * Returns an error message, or null when the value is acceptable.
 * Empty is always acceptable — the field is optional.
 */
export function validateBirthday(value) {
    if (!value) return null

    // <input type="date"> always yields YYYY-MM-DD; anything else came
    // from somewhere we do not control, so do not trust it.
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (!match) return 'Укажите дату в формате ГГГГ-ММ-ДД'

    const [, year, month, day] = match.map(Number)
    const date = new Date(year, month - 1, day)
    // Two-digit years are mapped into the 1900s by the Date constructor.
    if (year < 100) date.setFullYear(year)

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return 'Такой даты не существует'
    }

    const today = new Date()
    if (date > today) return 'Дата рождения не может быть в будущем'

    const age =
        today.getFullYear() -
        year -
        (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day) ? 1 : 0)
    if (age > MAX_AGE_YEARS) return `Дата рождения не может быть раньше ${MAX_AGE_YEARS} лет`

    return null
}

/** Today as YYYY-MM-DD, for the input's `max` attribute. */
export function todayIso() {
    const today = new Date()
    const pad = n => String(n).padStart(2, '0')
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
}