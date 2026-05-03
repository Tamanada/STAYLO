import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import './i18n'
import App from './App.jsx'

// HelmetProvider lets per-page <SEO> components override <title>, <meta>,
// <link rel="canonical">, etc. — Google's renderer executes the React tree
// during indexing, so these dynamic head tags do count for SEO.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
