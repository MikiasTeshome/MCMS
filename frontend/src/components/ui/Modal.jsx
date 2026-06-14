import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ open, onClose, title, icon: Icon, children, maxWidth = 'max-w-lg' }) => {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${maxWidth}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="modal-title">
            {Icon && <Icon className="w-5 h-5 icon-muted" />}
            <span>{title}</span>
          </h3>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
