import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CropProof } from './CropProof'
import '../../src/styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CropProof />
  </StrictMode>,
)
