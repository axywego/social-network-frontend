import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'

/**
 * Admin area guard. The API checks the role too — this only keeps
 * non-admins from reaching a page that would only 401.
 */
function AdminRoute({ children }) {
    const { currentUser } = useAuthContext()

    if (currentUser?.role !== 'admin') {
        return <Navigate to="/feed" replace />
    }

    return children
}

export default AdminRoute