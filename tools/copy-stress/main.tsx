import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CopyStress } from './CopyStress'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CopyStress />
  </StrictMode>,
)
