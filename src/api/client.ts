import axios from 'axios'

const DEFAULT_API_URL = 'https://sense-backend-0589.onrender.com'

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim()
  if (configured) {
    return configured.replace(/\/$/, '')
  }
  return DEFAULT_API_URL
}

export const apiBaseUrl = resolveApiBaseUrl()

axios.defaults.baseURL = apiBaseUrl
axios.defaults.headers.common['Content-Type'] = 'application/json'

if (import.meta.env.PROD && /localhost|127\.0\.0\.1/.test(apiBaseUrl)) {
  console.error('API base URL points to localhost in production:', apiBaseUrl)
}

export default axios
