import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './index.css'
import App from './App.jsx'
import axios from 'axios'

axios.defaults.baseURL = 'https://sense-backend-534j.onrender.com/mongod'
axios.defaults.headers.common['Content-Type'] = 'application/json'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)