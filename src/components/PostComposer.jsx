import { useState, useRef, useEffect } from 'react'
import { ImagePlus, Send, X } from 'lucide-react'
import { postService } from '../services/postService'
import { useAuthContext } from '../context/AuthContext'
import { validateImageFile } from '../utils/imageFile'
import GlassCard from './ui/GlassCard'
import Button from './ui/Button'
import Alert from './ui/Alert'
import Avatar from './Avatar'
import styles from './PostComposer.module.css'

function PostComposer({ onPostCreated }) {
    const { currentUser } = useAuthContext()
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

    const canSubmit = Boolean(text.trim() || imageFile) && !posting

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!canSubmit) return

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
        <GlassCard as="form" className={styles.composer} onSubmit={handleSubmit}>
            <div className={styles.head}>
                <Avatar avatarUrl={currentUser?.avatar_url} size={40} />
                <label className="visually-hidden" htmlFor="post-content">Текст поста</label>
                <textarea
                    id="post-content"
                    className={styles.textarea}
                    placeholder="Что нового?"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={2}
                />
            </div>

            {imagePreview && (
                <div className={styles.previewWrap}>
                    <img src={imagePreview} alt="Предпросмотр" className={styles.preview} />
                    <button
                        type="button"
                        className={styles.previewRemove}
                        onClick={handleRemoveImage}
                        aria-label="Убрать изображение"
                    >
                        <X />
                    </button>
                </div>
            )}

            {error && <Alert>{error}</Alert>}

            <div className={styles.actions}>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={ImagePlus}
                    onClick={() => fileInputRef.current?.click()}
                >
                    Фото
                </Button>
                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="visually-hidden"
                />

                <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    icon={Send}
                    disabled={!canSubmit}
                >
                    {posting ? 'Публикуем...' : 'Опубликовать'}
                </Button>
            </div>
        </GlassCard>
    )
}

export default PostComposer
