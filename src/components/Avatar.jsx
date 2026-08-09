const API_URL = import.meta.env.VITE_API_URL

function Avatar({ avatarUrl, size = 100 }) {
  const src = avatarUrl ? `${API_URL}${avatarUrl}` : "/default-avatar.png"

  return (
    <img
      src={src}
      alt="avatar"
      width={size}
      height={size}
      style={{ borderRadius: "50%", objectFit: "cover" }}
    />
  )
}

export default Avatar