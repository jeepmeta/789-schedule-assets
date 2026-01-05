// src/components/Tile.jsx
import React, { useRef, useEffect, useState } from 'react';
import LiveEffect from './LiveEffect';
import { WIDGET, FLAMES } from '../config';

/**
 * Tile
 * - Shows zippoClosed / zippoOpen for zippo hosts depending on isLive.
 * - Mounts LiveEffect video when showVideo is true.
 * - Reads per-host flamePlacement if present; otherwise LiveEffect will use global flame settings.
 */

export default function Tile({ host, isLive, showVideo, onClick }) {
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

  const imageSrc = (() => {
    if (host.type === 'zippo') {
      if (isLive && host.zippoOpen) return host.zippoOpen;
      if (!isLive && host.zippoClosed) return host.zippoClosed;
      return host.image;
    }
    return host.image;
  })();

  // flame video source: per-host override or FLAMES[type].primary
  const flameSrc = (host.liveEffect && host.liveEffect.videoSource) || (FLAMES[host.type] && FLAMES[host.type].primary);

  return (
    <div
      className={`tile ${isLive ? 'live' : ''} ${host.type === 'zippo' ? 'zippo-tile' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      aria-pressed={isLive}
      aria-label={`${host.name} ${isLive ? 'live' : ''}`}
      style={{
        // expose per-host flame placement as CSS variables for fine tuning (if present)
        '--flame-x': host.flamePlacement?.x || undefined,
        '--flame-y': host.flamePlacement?.y || undefined,
        '--flame-scale': host.flamePlacement?.scale ?? undefined
      }}
    >
      {isLive && showVideo && WIDGET.liveEffect.videoEnabled && flameSrc && (
        <LiveEffect
          videoSrc={flameSrc}
          placement={host.flamePlacement || undefined}
          styleOverrides={host.liveEffect || undefined}
        />
      )}

      <div className="tile-image" ref={imgRef}>
        {visible ? (
          <img
            src={imageSrc}
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
        {isLive && !showVideo && <div className="live-glow" aria-hidden="true" />}
      </div>
    </div>
  );
}
