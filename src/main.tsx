// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
// --- A MUDANÇA É AQUI ---
import App from '@/App'; // Antes era './App'
// --- FIM DA MUDANÇA ---

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);