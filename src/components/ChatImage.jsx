import { useState, useEffect, useMemo } from 'react'
import { chatService } from '../services/chatService'
import ImageZoomModal from './ImageZoomModal'

function ChatImage({ imageUrl, className, width, height }) {
    const [blob, setBlob] = useState(null)
    const blobUrl = blob?.source === imageUrl ? blob.url : null

    const [isZoomOpen, setIsZoomOpen] = useState(false)

    const displaySize = useMemo(() => {
        if (!width || !height) {
            return { width: 300, height: 200 }
        }

        const MAX_WIDTH = 280
        const MAX_HEIGHT = 350

        const ratio = Math.min(
            MAX_WIDTH / width,
            MAX_HEIGHT / height,
            1
        )

        return {
            width: Math.round(width * ratio),
            height: Math.round(height * ratio)
        }
    }, [width, height])


    useEffect(() => {
        let cancelled = false
        let loadedUrl = null

        chatService.fetchImageBlob(imageUrl)
            .then(url => {
                loadedUrl = url
                if (!cancelled) {
                    setBlob({ source: imageUrl, url })
                } else {
                    URL.revokeObjectURL(url)
                }
            })
            .catch(err => console.error('Не удалось загрузить изображение чата:', err))

        return () => {
            cancelled = true
            if (loadedUrl) URL.revokeObjectURL(loadedUrl)
        }
    }, [imageUrl])


    return (
        <div
            className={className}
            style={{
                width: displaySize.width,
                height: displaySize.height,
                borderRadius: 8,
                overflow: 'hidden',
                background: '#eee'
            }}
        >
            {blobUrl && (
                <button type="button" onClick={() => setIsZoomOpen(true)} aria-label="Открыть изображение чата" style={{ padding: 0, border: 0, background: 'none', width: '100%', height: '100%', cursor: 'zoom-in' }}>
                    <img
                        src={blobUrl}
                        alt="Изображение чата"
                        width={displaySize.width}
                        height={displaySize.height}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                </button>
            )}
            {isZoomOpen && (
                <ImageZoomModal
                    src={blobUrl}
                    onClose={() => setIsZoomOpen(false)}
                />
            )}
        </div>
    )
}

export default ChatImage
