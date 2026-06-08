import React from 'react';
import { CheckCircle, AlertOctagon, X } from 'lucide-react';
import { clsx } from 'clsx';

const ScanNotification = ({ type = 'error', message, onDismiss }) => {
  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div
      className={clsx(
        'text-sm px-4 py-3 rounded-xl flex items-start gap-2 border',
        isSuccess
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : 'bg-red-500/10 border-red-500/20 text-red-400'
      )}
      role="alert"
    >
      {isSuccess ? (
        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertOctagon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      )}
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default ScanNotification;
