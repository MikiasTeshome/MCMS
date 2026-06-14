import React from 'react';
import { CheckCircle, AlertOctagon, X } from 'lucide-react';
import { clsx } from 'clsx';

const ScanNotification = ({ type = 'error', message, onDismiss }) => {
  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div
      className={clsx(isSuccess ? 'alert-success' : 'alert-error')}
      role="alert"
    >
      {isSuccess ? (
        <CheckCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      ) : (
        <AlertOctagon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      )}
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="btn-icon p-0.5"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default ScanNotification;
