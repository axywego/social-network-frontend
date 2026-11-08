import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'

function AdminRoute({ children }) {
    const { currentUser } = useAuthContext()

    if (currentUser?.role !== 'admin') {
        return <Navigate to="/feed" replace />
    }

    return children
}

export default AdminRoute
