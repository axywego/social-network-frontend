import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import LoginPage from './pages/LoginPage/LoginPage'
import RegisterPage from './pages/RegisterPage/RegisterPage'
import ProfilePage from './pages/ProfilePage/ProfilePage'
import ChatsPage from './pages/ChatsPage/ChatsPage'
import ChatWindow from './pages/ChatWindow/ChatWindow'
import FriendsPage from './pages/FriendsPage/FriendsPage'


function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route 
                        path="/profile" 
                        element={
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        } 
                    />
                    <Route path="/chats" element={<ProtectedRoute><ChatsPage /></ProtectedRoute>} />
                    <Route path="/chats/:chatId" element={<ProtectedRoute><ChatWindow /></ProtectedRoute>} />
                    <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App