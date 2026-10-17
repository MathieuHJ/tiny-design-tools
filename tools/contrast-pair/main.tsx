import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/tokens.css'
import './styles.css'
import { ContrastPair } from './ContrastPair'

createRoot(document.getElementById('root')!).render(<StrictMode><ContrastPair /></StrictMode>)
