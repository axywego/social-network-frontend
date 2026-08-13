import { createContext, useContext } from 'react'

const PostActionsContext = createContext(null)

const noop = () => {}

export function PostActionsProvider({ onEdit, onDelete, onReport, children }) {
    const value = {
        onEdit: onEdit || noop,
        onDelete: onDelete || noop,
        onReport: onReport || noop,
    }

    return (
        <PostActionsContext.Provider value={value}>
            {children}
        </PostActionsContext.Provider>
    )
}

export function usePostActions() {
    const context = useContext(PostActionsContext)
    if (!context) {
        throw new Error('usePostActions должен использоваться внутри PostActionsProvider')
    }
    return context
}