import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import { BAN_PATH, getBanInfo } from '../../services/banState'

function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuthContext()

    if (!isAuthenticated) {
        return <Navigate to={getBanInfo() ? BAN_PATH : '/login'} replace />
    }

    return children
}

export default ProtectedRoute
