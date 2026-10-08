import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CropProof } from './CropProof'
import '../../src/tokens.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CropProof />
  </StrictMode>,
)
