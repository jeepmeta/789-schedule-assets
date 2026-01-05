// src/components/LiveEffect.jsx
import React from 'react';
import { WIDGET } from '../config';

/**
 * LiveEffect
 * - Renders the flame video behind the tile image.
 * - Applies global flame settings from admin overrides (window.__ADMIN_OVERRIDES.glames or globals.flameSettings)
 * - styleOverrides param can override opacity/blendMode from host.liveEffect or WIDGET.liveEffect
 */

function getGlobalFlameSettings() {
  const admin = typeof window !== 'undefined' ? window.__ADMIN_OVERRIDES || {} : {};
  return (admin.globals && admin.globals.flameSettings) || WIDGET.flamePlacement || {};
}

export default function LiveEffect({ videoSrc, placement = {}, styleOverrides = {} }) {
  if (!videoSrc) return null;

  const globalSettings = getGlobalFlameSettings();

  // merge placement: host placement overrides global placement
  const left = placement.x || globalSettings.x || WIDGET.flamePlacement.x || '50%';
  const top = placement.y || globalSettings.y || WIDGET.flamePlacement.y || '60%';
  const scale = (placement.scale ?? globalSettings.scale ?? WIDGET.flamePlacement.scale ?? 1);

  // visual adjustments
  const saturation = (globalSettings.saturation ?? 1);
  const brightness = (globalSettings.brightness ?? 1);
  const opacity = (globalSettings.opacity ?? styleOverrides.opacity ?? WIDGET.liveEffect.opacity ?? 1);
  const blendMode = styleOverrides.blendMode || WIDGET.liveEffect.blendMode || 'screen';

  const style = {
    position: 'absolute',
    left,
    top,
    transform: `translate(-50%, -50%) scale(${scale})`,
    mixBlendMode: blendMode,
    opacity,
    pointerEvents: 'none',
    zIndex: 0,
    width: '160%',
    height: '160%',
    objectFit: 'cover',
    filter: `saturate(${saturation}) brightness(${brightness}) drop-shadow(0 8px 24px rgba(0,0,0,0.6))`,
    willChange: 'transform, opacity, filter'
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
