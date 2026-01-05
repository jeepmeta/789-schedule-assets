// src/components/Tile.jsx
import React from 'react';
import './Tile.css';


export default function Tile({ host, isLive, showVideo, flameSettings, onClick }) {
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
    <button
      className={`tile ${isLive ? 'tile--live' : ''}`}
      onClick={onClick}
      type="button"
    >
      <div className="tile-inner">
        <div className="tile-header">
          <div className="tile-title">{host.displayName || host.id}</div>
          {isLive && <div className="tile-pill">Live</div>}
        </div>

        <div className="tile-body">
          {showVideo && (
            <div className="tile-flame-wrapper" style={flameStyle}>
              {/* Replace with your actual video element / component */}
              <video
                className="tile-flame-video"
                autoPlay
                loop
                muted
                playsInline
                src={host.flameSrc}
              />
            </div>
          )}

          <div className="tile-meta">
            {host.social?.x && (
              <a
                href={host.social.x}
                className="tile-link"
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
              >
                X
              </a>
            )}
            {host.social?.website && (
              <a
                href={host.social.website}
                className="tile-link"
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
              >
                Site
              </a>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
