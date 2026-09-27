import { useState, useRef, useEffect } from 'react'
import { postService } from '../services/postService'
import { validateImageFile } from '../utils/imageFile'
import styles from './PostComposer.module.css'

function PostComposer({ onPostCreated }) {
    const [text, setText] = useState('')
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [posting, setPosting] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef(null)

    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview)
        }
    }, [imagePreview])

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const validationError = validateImageFile(file)
        if (validationError) {
            setError(validationError)
            e.target.value = ''
            return
        }
        setError('')
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
    }

    const handleRemoveImage = () => {
        setImageFile(null)
        setImagePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!text.trim() && !imageFile) return

        setPosting(true)
        setError('')
        try {
            let imageUrl = null
            if (imageFile) {
                const { filename } = await postService.uploadImage(imageFile)
                imageUrl = filename
            }

            await postService.createPost({ content: text.trim() || null, image_url: imageUrl })

            setText('')
            handleRemoveImage()
            onPostCreated?.()
        } catch (err) {
            console.error(err)
            setError('Не удалось опубликовать пост. Попробуйте ещё раз.')
        } finally {
            setPosting(false)
        }
    }

    return (
        <form className={styles.postForm} onSubmit={handleSubmit}>
            <label className="visually-hidden" htmlFor="post-content">Текст поста</label>
            <textarea
                id="post-content"
                placeholder="Что нового?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
            />

            {imagePreview && (
                <div className={styles.previewWrap}>
                    <img src={imagePreview} alt="preview" className={styles.preview} />
                    <button type="button" className={styles.removePreview} onClick={handleRemoveImage} aria-label="Убрать изображение">✕</button>
                </div>
            )}

            {error && <p className={styles.error} role="alert">{error}</p>}

            <div className={styles.formActions}>
                <button type="button" className={styles.attachBtn} onClick={() => fileInputRef.current?.click()}>
                    📎 Фото
                </button>
                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                />
                <button type="submit" className={styles.postBtn} disabled={posting || (!text.trim() && !imageFile)}>
                    {posting ? 'Публикация...' : 'Опубликовать'}
                </button>
            </div>
        </form>
    )
}

export default PostComposer
