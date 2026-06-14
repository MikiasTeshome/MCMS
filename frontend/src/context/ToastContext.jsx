import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle, error: XCircle, warning: AlertTriangle };

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = 'success', duration = 4000) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, success: (m) => toast(m, 'success'), error: (m) => toast(m, 'error'), warning: (m) => toast(m, 'warning') }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || CheckCircle;
          return (
            <div key={t.id} className="toast-item pointer-events-auto" role="alert">
              <Icon className="w-5 h-5 flex-shrink-0 text-app-secondary" aria-hidden="true" />
              <p className="font-medium flex-1 leading-snug">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="btn-icon p-1" aria-label="Dismiss notification">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
