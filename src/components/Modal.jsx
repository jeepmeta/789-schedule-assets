// src/components/Modal.jsx
import React from 'react';
import './Modal.css';


export default function Modal({ host, isLive, flameSettings, onClose }) {
  const {
    scale = 1,
    offsetX = 0,
    offsetY = 0,
    saturation = 1,
    brightness = 1,
    opacity = 1
  } = flameSettings || {};

  const flameStyle = {
    '--flame-scale': scale,
    '--flame-offset-x': `${offsetX}px`,
    '--flame-offset-y': `${offsetY}px`,
    '--flame-saturation': saturation,
    '--flame-brightness': brightness,
    '--flame-opacity': opacity
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <header className="modal-header">
          <div className="modal-title">
            {host.displayName || host.id}
            {isLive && <span className="modal-pill">Live</span>}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-preview">
            {host.flameSrc && (
              <div className="modal-flame-wrapper" style={flameStyle}>
                <video
                  className="modal-flame-video"
                  autoPlay
                  loop
                  muted
                  playsInline
                  src={host.flameSrc}
                />
              </div>
            )}
          </div>

          <div className="modal-info">
            {host.social?.x && (
              <div className="modal-row">
                <span className="modal-label">X:</span>
                <a
                  href={host.social.x}
                  target="_blank"
                  rel="noreferrer"
                >
                  {host.social.x}
                </a>
              </div>
            )}
            {host.social?.website && (
              <div className="modal-row">
                <span className="modal-label">Website:</span>
                <a
                  href={host.social.website}
                  target="_blank"
                  rel="noreferrer"
                >
                  {host.social.website}
                </a>
              </div>
            )}
            {host.description && (
              <div className="modal-row">
                <span className="modal-label">About:</span>
                <span className="modal-text">{host.description}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
