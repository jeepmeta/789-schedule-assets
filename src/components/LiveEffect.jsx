import React from 'react';
import { WIDGET } from '../config';

export default function LiveEffect({ videoSrc, placement = {}, styleOverrides = {} }) {
  const style = {
    position: 'absolute',
    left: placement.x || WIDGET.flamePlacement.x,
    top: placement.y || WIDGET.flamePlacement.y,
    transform: `translate(-50%, -50%) scale(${placement.scale ?? 1})`,
    mixBlendMode: styleOverrides.blendMode || WIDGET.liveEffect.blendMode,
    opacity: styleOverrides.opacity ?? WIDGET.liveEffect.opacity,
    pointerEvents: 'none',
    zIndex: 0,
    width: '160%',
    height: '160%',
    objectFit: 'cover',
    filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))'
  };

  return (
    <video
      className="live-video"
      src={videoSrc}
      style={style}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
}
