import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import Layout from './components/Layout'

import LoginPage from './pages/LoginPage/LoginPage'
import RegisterPage from './pages/RegisterPage/RegisterPage'
import FeedPage from './pages/FeedPage/FeedPage'
import FriendsPage from './pages/FriendsPage/FriendsPage'
import ChatsPage from './pages/ChatsPage/ChatsPage'
import ChatWindowPage from './pages/ChatWindowPage/ChatWindowPage'
import ProfilePage from './pages/ProfilePage/ProfilePage'
import UserProfilePage from './pages/UserProfilePage/UserProfilePage'

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                        <Route path="/feed" element={<FeedPage />} />
                        <Route path="/friends" element={<FriendsPage />} />
                        <Route path="/chats" element={<ChatsPage />} />
                        <Route path="/chats/:chatId" element={<ChatWindowPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/users/:userId" element={<UserProfilePage />} />
                    </Route>

                    <Route path="/" element={<Navigate to="/feed" replace />} />
                    <Route path="*" element={<Navigate to="/feed" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App