import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Squint } from './Squint'
import '../../src/tokens.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Squint />
  </StrictMode>,
)
