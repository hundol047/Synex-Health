import '@fontsource-variable/noto-sans-kr';
import React from 'react';
import { createRoot } from 'react-dom/client';
import NativeServerSetup from './shared/components/NativeServerSetup.jsx';
import AuthBoundary from './shared/components/AuthBoundary.jsx';
import App from './App.jsx';
import ErrorBoundary from './shared/components/ErrorBoundary.jsx';
import Onboarding from './shared/components/Onboarding.jsx';
import './shared/styles.css';
import './shared/personal-screen.css';

createRoot(document.getElementById('root')).render(<ErrorBoundary><Onboarding><NativeServerSetup><AuthBoundary><App /></AuthBoundary></NativeServerSetup></Onboarding></ErrorBoundary>);
