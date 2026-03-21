import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const rootElement = document.getElementById('plec-preview-root');

if (rootElement) {
  createRoot(rootElement).render(<App />);
}
