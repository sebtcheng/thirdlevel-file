import './devtools/dev-bootstrap';
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { IconContext } from '@phosphor-icons/react'
import App from './App.jsx'
import './index.css'
import { devLogger } from './devtools/dev-logger'
import { DevErrorBoundary } from './devtools/DevErrorBoundary'
import { DevProfiler } from './devtools/DevProfiler'

ReactDOM.createRoot(document.getElementById('root'), devLogger.reactRootErrorHandlers).render(
  <DevProfiler id="Root">
    <React.StrictMode>
      <DevErrorBoundary>
        <AuthProvider>
            <IconContext.Provider value={{ weight: 'duotone', size: '1em', color: 'currentColor', mirrored: false }}>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <App />
          </BrowserRouter>
          </IconContext.Provider>
        </AuthProvider>
      </DevErrorBoundary>
    </React.StrictMode>
  </DevProfiler>,
)
