// ---------------------------------------------------------------------------
// Options entry — renders <Options /> inside React root
// ---------------------------------------------------------------------------

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Options } from './Options.js';
import '../../../../packages/ui/src/tokens.css';
import './styles.css';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Options />
    </React.StrictMode>,
  );
}
