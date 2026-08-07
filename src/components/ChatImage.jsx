import { useState, useEffect } from 'react'
import { chatService } from '../services/chatService'

function ChatImage({ imageUrl, className }) {
    const [blobUrl, setBlobUrl] = useState(null)

    useEffect(() => {
        let objectUrl = null
        let cancelled = false

        chatService.fetchImageBlob(imageUrl).then(url => {
            if (!cancelled) {
                objectUrl = url
                setBlobUrl(url)
            }
        }).catch(err => console.error('Ошибка загрузки изображения:', err))

        return () => {
            cancelled = true
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [imageUrl])

    if (!blobUrl) return <div className={className} style={{ background: '#eee', minHeight: 100 }} />

    return <img src={blobUrl} alt="attachment" className={className} />
}

export default ChatImage