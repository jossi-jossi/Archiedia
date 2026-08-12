import 'pretendard/dist/web/variable/pretendardvariable.css'
import './styles/nocturne.css'
import './styles/accent-override.css'
import './styles/app.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { pingSupabase } from './lib/supabase'

void pingSupabase()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
