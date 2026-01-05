import React, { useRef, useEffect, useState } from 'react';
import LiveEffect from './LiveEffect';
import { WIDGET, FLAMES } from '../config';

export default function Tile({ host, isLive, onClick }) {
  const imgRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      });
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const flameSrc = host.liveEffect?.videoSource || FLAMES[host.type]?.primary;

  return (
    <div
      className={`tile ${isLive ? 'live' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      aria-pressed={isLive}
      aria-label={`${host.name} ${isLive ? 'live' : ''}`}
      style={{ '--flame-x': host.flamePlacement?.x || WIDGET.flamePlacement.x, '--flame-y': host.flamePlacement?.y || WIDGET.flamePlacement.y }}
    >
      {isLive && WIDGET.liveEffect.videoEnabled && flameSrc && (
        <LiveEffect
          videoSrc={flameSrc}
          placement={host.flamePlacement || WIDGET.flamePlacement}
          styleOverrides={host.liveEffect || WIDGET.liveEffect}
        />
      )}

      <div className="tile-image" ref={imgRef}>
        {visible ? (
          <img
            src={host.image}
            alt={host.name}
            loading="lazy"
            draggable="false"
            style={{ imageRendering: 'auto' }}
          />
        ) : (
          <div className="placeholder" aria-hidden="true" />
        )}
      </div>

      <div className="tile-overlay" aria-hidden="true">
        {isLive && <div className="live-badge">LIVE</div>}
      </div>
    </div>
  );
}
