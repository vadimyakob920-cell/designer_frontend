import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.tsx'

// Backend has CORS enabled; call it directly (more reliable than the Vite proxy).
axios.defaults.baseURL = import.meta.env.VITE_API_URL ?? 'https://sense-backend-0589.onrender.com
axios.defaults.headers.common['Content-Type'] = 'application/json'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
