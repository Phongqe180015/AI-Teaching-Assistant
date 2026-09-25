import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/store/AuthContext'
import { ThemeProvider } from '@/store/ThemeContext'
import { LanguageProvider } from '@/store/LanguageContext'
import { ReactQueryProvider } from '@/store/ReactQueryProvider'
import App from './App'
import './utils/i18n'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReactQueryProvider>
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ReactQueryProvider>
  </StrictMode>,
)
