// ---------------------------------------------------------------------------
// Popup entry — renders <App /> inside <ErrorBoundary> inside React root
// ---------------------------------------------------------------------------

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './ErrorBoundary.js';
import { App } from './App.js';
import '../../../../packages/ui/src/tokens.css';
import './styles.css';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
