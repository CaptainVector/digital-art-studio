import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/vazirmatn/arabic-400.css'
import '@fontsource/vazirmatn/arabic-700.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
