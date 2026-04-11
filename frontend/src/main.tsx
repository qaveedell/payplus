import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'vazirmatn/Vazirmatn-font-face.css';
import './i18n/i18n';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
