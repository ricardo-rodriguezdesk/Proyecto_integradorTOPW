import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/** Ventana modal (variant="center") o panel lateral (variant="side"). */
export default function Modal({ open, onClose, children, variant = 'center', className = '', label = 'Detalle' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={`overlay overlay-${variant}`} onMouseDown={onClose}>
      <div
        className={`modal modal-${variant} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
