import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import VideoGenerator from './VideoGenerator'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VideoGenerator/>
  </StrictMode>,
)
