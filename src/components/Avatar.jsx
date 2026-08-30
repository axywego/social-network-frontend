import defaultAvatar from '../assets/default-avatar.png'

const API_URL = import.meta.env.VITE_API_URL

export function resolveAvatarUrl(avatarUrl) {
    return avatarUrl ? `${API_URL}${avatarUrl}` : defaultAvatar
}

export default function Avatar({ avatarUrl, size = 100, isOnline = false }) {
    const src = resolveAvatarUrl(avatarUrl)

    return (
        <div style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
            <img
                src={src}
                alt="avatar"
                width={size}
                height={size}
                style={{ borderRadius: "50%", objectFit: "cover" }}
            />
            {isOnline && (
                <span
                    style={{
                        position: "absolute",
                        zIndex: 10,
                        bottom: 0,
                        right: 0,
                        width: size * 0.28,
                        height: size * 0.28,
                        borderRadius: "50%",
                        backgroundColor: "#22c55e",
                        border: "2px solid white",
                        boxSizing: "border-box"
                    }}
                />
            )}
        </div>
    )
}