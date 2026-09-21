import '@fontsource-variable/noto-sans-kr';
import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthBoundary from './shared/components/AuthBoundary.jsx';
import App from './App.jsx';
import './shared/styles.css';

createRoot(document.getElementById('root')).render(<AuthBoundary><App /></AuthBoundary>);
