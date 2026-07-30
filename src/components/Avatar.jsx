function Avatar({ avatarUrl, size = 100 }) {
  const baseUrl = "http://localhost:8000"
  const src = avatarUrl ? `${baseUrl}${avatarUrl}` : "/default-avatar.png"

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