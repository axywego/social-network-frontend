import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/tokens.css'
import './styles/themes.css'
import './styles/glass.css'
import './index.css'

createRoot(document.getElementById('root')).render(
    <App />,
)
