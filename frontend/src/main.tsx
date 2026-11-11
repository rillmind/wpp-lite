import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { registerNotifyWorker } from './api/notify'
import { fitKeyboard } from './api/mobile'

registerNotifyWorker()
fitKeyboard()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
