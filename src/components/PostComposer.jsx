import { useState, useRef } from 'react'
import { postService } from '../services/postService'
import styles from './PostComposer.module.css'

function PostComposer({ onPostCreated }) {
    const [text, setText] = useState('')
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [posting, setPosting] = useState(false)
    const fileInputRef = useRef(null)

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
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
        try {
            const post = await postService.createPost({ content: text.trim() || null, image_url: imageFile ? "image" : "" })

            console.log(post)

            if (imageFile) {
                await postService.uploadPostImage(post.post_id, imageFile)
            }

            setText('')
            handleRemoveImage()
            onPostCreated?.()
        } catch (err) {
            console.error(err)
        } finally {
            setPosting(false)
        }
    }

    return (
        <form className={styles.postForm} onSubmit={handleSubmit}>
            <textarea
                placeholder="Что нового?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
            />

            {imagePreview && (
                <div className={styles.previewWrap}>
                    <img src={imagePreview} alt="preview" className={styles.preview} />
                    <button type="button" className={styles.removePreview} onClick={handleRemoveImage}>✕</button>
                </div>
            )}

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