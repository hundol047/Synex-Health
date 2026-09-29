import '@fontsource-variable/noto-sans-kr';
import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthBoundary from './shared/components/AuthBoundary.jsx';
import App from './App.jsx';
import ErrorBoundary from './shared/components/ErrorBoundary.jsx';
import Onboarding from './shared/components/Onboarding.jsx';
import './shared/styles.css';

createRoot(document.getElementById('root')).render(<ErrorBoundary><Onboarding><AuthBoundary><App /></AuthBoundary></Onboarding></ErrorBoundary>);
