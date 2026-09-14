import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

let savedTheme = localStorage.getItem("nox_theme") || "midnight";
if (savedTheme === "cobalt") {
  savedTheme = "midnight";
  localStorage.setItem("nox_theme", "midnight");
}
document.documentElement.setAttribute("data-theme", savedTheme);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
