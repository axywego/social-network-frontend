import { useState, useRef, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"

export default function ImageZoomModal({ src, onClose }) {
    const imgRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)

    // Держим scale/position в ref — не в state, чтобы не ре-рендерить компонент
    const transform = useRef({ scale: 1, x: 0, y: 0 })
    const dragStart = useRef({ x: 0, y: 0 })
    const posStart = useRef({ x: 0, y: 0 })

    const MIN_SCALE = 1
    const MAX_SCALE = 5

    const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

    // Применяем transform напрямую к DOM-элементу — минуя React
    const applyTransform = useCallback(() => {
        if (!imgRef.current) return
        const { scale, x, y } = transform.current
        imgRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
        imgRef.current.style.cursor = scale > 1 ? "grab" : "zoom-in"
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
        if (imgRef.current) imgRef.current.style.cursor = transform.current.scale > 1 ? "grab" : "zoom-in"
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
            onMouseDown={handleOverlayMouseDown}
            onWheel={handleWheel}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 0, 0, 0.9)",
                userSelect: "none",
                touchAction: "none",
            }}
        >
            <div
                onMouseDown={(e) => e.stopPropagation()}
                style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8, zIndex: 10 }}
            >
                <IconButton onClick={() => zoomBy(1.3)} label="Увеличить"><ZoomIn size={18} /></IconButton>
                <IconButton onClick={() => zoomBy(1 / 1.3)} label="Уменьшить"><ZoomOut size={18} /></IconButton>
                <IconButton onClick={resetView} label="Сбросить"><RotateCcw size={18} /></IconButton>
                <IconButton onClick={onClose} label="Закрыть"><X size={18} /></IconButton>
            </div>

            <img
                ref={imgRef}
                src={src}
                alt=""
                draggable={false}
                onMouseDown={handleMouseDown}
                style={{
                    maxWidth: "85vw",
                    maxHeight: "85vh",
                    objectFit: "contain",
                    cursor: "zoom-in",
                    willChange: "transform",
                }}
            />

            <p style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.5)", fontSize: 14, margin: 0 }}>
                Колесо мыши — зум · перетаскивание — сдвиг · клик за фото — закрыть
            </p>
        </div>
    )

    return createPortal(modal, document.body)
}

function IconButton({ onClick, label, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 8, borderRadius: 8, border: "none",
                background: "rgba(255,255,255,0.1)", color: "white", cursor: "pointer",
                transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
        >
            {children}
        </button>
    )
}