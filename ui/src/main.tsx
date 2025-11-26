import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Apply theme from localStorage before React renders to prevent flash
const applyTheme = () => {
  if (typeof window === 'undefined') return
  const stored = localStorage.getItem('theme')
  const theme = (stored === 'dark' || stored === 'light') ? stored : 'light'
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

applyTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
