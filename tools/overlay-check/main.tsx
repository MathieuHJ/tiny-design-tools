import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/tokens.css'
import './styles.css'
import { OverlayCheck } from './OverlayCheck'

createRoot(document.getElementById('root')!).render(<StrictMode><OverlayCheck /></StrictMode>)
