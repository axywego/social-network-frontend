import { useState, useRef, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import styles from './ImageZoomModal.module.css'

export default function ImageZoomModal({ src, onClose }) {
    const imgRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)

    const transform = useRef({ scale: 1, x: 0, y: 0 })
    const dragStart = useRef({ x: 0, y: 0 })
    const posStart = useRef({ x: 0, y: 0 })

    const MIN_SCALE = 1
    const MAX_SCALE = 5

    const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

    const applyTransform = useCallback(() => {
        if (!imgRef.current) return
        const { scale, x, y } = transform.current
        imgRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
    }, [])

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", handleKey)

        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"

        return () => {
            window.removeEventListener("keydown", handleKey)
            document.body.style.overflow = prevOverflow
        }
    }, [onClose])

    const handleWheel = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        const rect = imgRef.current.getBoundingClientRect()
        const cursorX = e.clientX - rect.left - rect.width / 2
        const cursorY = e.clientY - rect.top - rect.height / 2

        const { scale, x, y } = transform.current
        const delta = -e.deltaY * 0.0015
        const newScale = clampScale(scale + delta * scale)
        const scaleRatio = newScale / scale

        transform.current = {
            scale: newScale,
            x: x - cursorX * (scaleRatio - 1),
            y: y - cursorY * (scaleRatio - 1),
        }
        applyTransform()
    }, [applyTransform])

    const handleMouseDown = (e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
        if (imgRef.current) imgRef.current.style.transition = "none"
        dragStart.current = { x: e.clientX, y: e.clientY }
        posStart.current = { x: transform.current.x, y: transform.current.y }
    }

    const handleMouseMove = useCallback((e) => {
        const dx = e.clientX - dragStart.current.x
        const dy = e.clientY - dragStart.current.y
        transform.current = {
            ...transform.current,
            x: posStart.current.x + dx,
            y: posStart.current.y + dy,
        }
        applyTransform()
    }, [applyTransform])

    const handleMouseUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove)
            window.addEventListener("mouseup", handleMouseUp)
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [isDragging, handleMouseMove, handleMouseUp])

    const handleOverlayMouseDown = (e) => {
        if (e.button !== 0) return
        if (e.target === e.currentTarget) onClose()
    }

    const zoomBy = (factor) => {
        transform.current = { ...transform.current, scale: clampScale(transform.current.scale * factor) }
        applyTransform()
    }

    const resetView = () => {
        transform.current = { scale: 1, x: 0, y: 0 }
        applyTransform()
    }

    const modal = (
        <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label="Просмотр изображения"
            onMouseDown={handleOverlayMouseDown}
            onWheel={handleWheel}
        >
            <div className={styles.toolbar} onMouseDown={(e) => e.stopPropagation()}>
                <IconButton onClick={() => zoomBy(1.3)} label="Увеличить"><ZoomIn /></IconButton>
                <IconButton onClick={() => zoomBy(1 / 1.3)} label="Уменьшить"><ZoomOut /></IconButton>
                <IconButton onClick={resetView} label="Сбросить"><RotateCcw /></IconButton>
                <IconButton onClick={onClose} label="Закрыть"><X /></IconButton>
            </div>

            <img
                ref={imgRef}
                className={styles.image}
                src={src}
                alt=""
                draggable={false}
                onMouseDown={handleMouseDown}
            />

            <p className={styles.hint}>
                Колесо мыши — зум · перетаскивание — сдвиг · клик за фото — закрыть
            </p>
        </div>
    )

    return createPortal(modal, document.body)
}

function IconButton({ onClick, label, children }) {
    return (
        <button type="button" className={styles.iconBtn} onClick={onClick} aria-label={label}>
            {children}
        </button>
    )
}
