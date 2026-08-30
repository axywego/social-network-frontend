import { createContext, useContext } from 'react'

const PostActionsContext = createContext(null)

export function PostActionsProvider({
    onEdit,
    onDelete,
    onReport,
    editingPostId,
    onSaveEdit,
    onCancelEdit,
    children,
}) {
    return (
        <PostActionsContext.Provider
            value={{ onEdit, onDelete, onReport, editingPostId, onSaveEdit, onCancelEdit }}
        >
            {children}
        </PostActionsContext.Provider>
    )
}

export function usePostActions() {
    const ctx = useContext(PostActionsContext)
    if (!ctx) {
        throw new Error('usePostActions должен использоваться внутри PostActionsProvider')
    }
    return ctx
}