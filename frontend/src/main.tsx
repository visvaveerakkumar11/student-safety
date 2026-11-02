import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/useAuth'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <App />
          <Toaster theme="light" position="top-right" richColors closeButton />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
