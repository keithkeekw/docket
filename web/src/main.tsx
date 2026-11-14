import { APP_NAME } from '@app/shared';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { preloadDeferredChunks } from './lib/deferredChunks';
import './styles/fonts.css';
import './index.css';

document.title = APP_NAME;
preloadDeferredChunks();

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root not found');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
