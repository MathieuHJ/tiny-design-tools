import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Concentric } from './Concentric'
import '../../src/tokens.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Concentric />
  </StrictMode>,
)
