import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/* Tipografías self-hosted (woff2, subset latin + latin-ext). Cero Google Fonts. */
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/jetbrains-mono/latin-ext-400.css';
import '@fontsource/jetbrains-mono/latin-ext-500.css';
import '@fontsource/jetbrains-mono/latin-ext-700.css';
import '@fontsource/ibm-plex-serif/latin-400.css';
import '@fontsource/ibm-plex-serif/latin-700.css';
import '@fontsource/ibm-plex-serif/latin-ext-400.css';
import '@fontsource/ibm-plex-serif/latin-ext-700.css';

import './styles/index.css';
import { App } from './app/App';

const container = document.getElementById('root');
if (!container) throw new Error('Falta el contenedor #root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
