import React, { useEffect, useRef } from 'react';

export default function Modal({ host, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevFocus = document.activeElement;
    if (dialogRef.current) dialogRef.current.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      if (prevFocus) prevFocus.focus();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${host.name} details`}>
      <div className="modal" ref={dialogRef} tabIndex={-1}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-body">
          <img src={host.summaryImage || host.image} alt={`${host.name} summary`} />
          <div className="modal-actions">
            <a
              className="cta"
              href={host.xUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit {host.xHandle}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
