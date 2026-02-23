
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './src/auth/AuthContext';
import AppInner from './App';

const AppWrapper: React.FC = () => {
  const [sessionExpired, setSessionExpired] = useState(false);
  return (
    <BrowserRouter>
      <AuthProvider onSessionTimeout={() => setSessionExpired(true)}>
        <AppInner
          sessionExpired={sessionExpired}
          onSessionExpiredDismiss={() => setSessionExpired(false)}
        />
      </AuthProvider>
    </BrowserRouter>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);
