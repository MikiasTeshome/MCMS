import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const ModalOverlay = ({ children, onClose }) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="presentation">
      {children}
    </div>,
    document.body
  );
};

const Modal = ({ open, onClose, title, icon: Icon, children, maxWidth = 'max-w-lg' }) => {
  if (!open) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className={`modal-content ${maxWidth}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="modal-title">
            {Icon && <Icon className="w-5 h-5 icon-muted" />}
            <span>{title}</span>
          </h3>
          <button type="button" onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </ModalOverlay>
  );
};

export default Modal;
