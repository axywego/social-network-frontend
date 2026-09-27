export const MAX_IMAGE_SIZE = 10 * 1024 * 1024

export function validateImageFile(file) {
    if (!file.type.startsWith('image/')) return 'Выберите файл изображения'
    if (file.size > MAX_IMAGE_SIZE) return 'Изображение должно быть меньше 10 МБ'
    return null
}
