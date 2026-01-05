// src/components/ScheduleWidget.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { HOSTS as BASE_HOSTS, TIMEZONE, WIDGET, BACKGROUND_IMAGE } from '../config';
import { nowMinutesInTZ, isNowInRange, hhmmToMinutes } from '../utils/time';
import Tile from './Tile';
import Modal from './Modal';

/**
 * ScheduleWidget
 * - Computes live hosts based on schedule OR admin "forceLive" overrides.
 * - All live hosts will mount flame video (no priority).
 * - Reads admin overrides from window.__ADMIN_OVERRIDES (set by AdminPanel).
 */

function mergeHostsWithOverrides(baseHosts, overridesHosts = []) {
  if (!Array.isArray(overridesHosts) || overridesHosts.length === 0) return baseHosts;
  const map = new Map();
  baseHosts.forEach(h => map.set(h.id, { ...h }));
  overridesHosts.forEach(oh => {
    if (!oh || !oh.id) return;
    const existing = map.get(oh.id) || { id: oh.id };
    map.set(oh.id, { ...existing, ...oh });
  });
  return Array.from(map.values());
}

export default function ScheduleWidget() {
  const [nowMin, setNowMin] = useState(() => nowMinutesInTZ(TIMEZONE));
  const [liveIds, setLiveIds] = useState([]);
  const [modalHost, setModalHost] = useState(null);

  // read overrides from global window object (AdminPanel writes here)
  const adminOverrides = typeof window !== 'undefined' ? window.__ADMIN_OVERRIDES || {} : {};
  const mergedHosts = useMemo(() => mergeHostsWithOverrides(BASE_HOSTS, adminOverrides.hosts), [adminOverrides.hosts]);

  useEffect(() => {
    const id = setInterval(() => setNowMin(nowMinutesInTZ(TIMEZONE)), WIDGET.updateIntervalMs || 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const matches = [];
    for (const host of mergedHosts) {
      // If admin forced live, treat as live regardless of schedule
      if (host.forceLive) {
        matches.push(host.id);
        continue;
      }
      for (const slot of host.schedule || []) {
        if (isNowInRange(nowMin, slot.start, slot.end)) {
          matches.push(host.id);
          break;
        }
      }
    }
    setLiveIds(matches);
  }, [nowMin, mergedHosts]);

  // Ensure rows render in this specific order: day, zippo, night
  const orderedRowKeys = ['day', 'zippo', 'night'];
  const rows = orderedRowKeys.map(key => ({
    key,
    hosts: mergedHosts.filter(h => h.row === key)
  })).filter(r => r.hosts.length > 0);

  // background opacity from admin overrides or widget defaults
  const bgOpacity = (adminOverrides.globals && typeof adminOverrides.globals.backgroundOpacity === 'number')
    ? adminOverrides.globals.backgroundOpacity
    : (WIDGET.backgroundOpacity ?? 1);

  // parallax intensity
  const parallax = (adminOverrides.globals && typeof adminOverrides.globals.parallaxIntensity === 'number')
    ? adminOverrides.globals.parallaxIntensity
    : (WIDGET.parallaxIntensity ?? 0.08);

  return (
    <div
      className="schedule-root"
      style={{
        '--tile-size': `${WIDGET.tileSizePx}px`,
        '--tile-gap': `${WIDGET.tileGapPx}px`,
        backgroundImage: `url(${BACKGROUND_IMAGE})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        // apply background opacity via overlay color using CSS variable
        '--bg-opacity': bgOpacity,
        '--parallax-intensity': parallax
      }}
    >
      {rows.map(row => (
        <div className="row" key={row.key} role="list" aria-label={row.key}>
          {row.hosts.map(host => {
            const isLive = liveIds.includes(host.id);
            // showVideo = isLive (all live spaces get flame)
            const showVideo = isLive;
            return (
              <Tile
                key={host.id}
                host={host}
                isLive={isLive}
                showVideo={showVideo}
                onClick={() => setModalHost(host)}
              />
            );
          })}
        </div>
      ))}

      {modalHost && (
        <Modal host={modalHost} onClose={() => setModalHost(null)} />
      )}
    </div>
  );
}
