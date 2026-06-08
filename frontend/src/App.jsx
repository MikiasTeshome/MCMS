import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { I18nProvider } from './i18n/I18nProvider.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import './i18n/index.js'; // Bootstrap i18next configs

function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}

export default App;
