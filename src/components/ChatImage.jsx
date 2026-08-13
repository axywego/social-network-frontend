import { useState, useEffect, useMemo } from 'react'
import { chatService } from '../services/chatService'

function ChatImage({ imageUrl, className, width, height }) {
    const [blobUrl, setBlobUrl] = useState(null)

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

        chatService.fetchImageBlob(imageUrl)
            .then(url => {
                if (!cancelled) {
                    setBlobUrl(url)
                }
            })

        return () => {
            cancelled = true
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
                <img
                    src={blobUrl}
                    alt="attachment"
                    width={displaySize.width}
                    height={displaySize.height}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                    }}
                />
            )}
        </div>
    )
}

export default ChatImage