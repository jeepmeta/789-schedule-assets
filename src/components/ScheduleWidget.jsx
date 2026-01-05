// src/components/ScheduleWidget.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { HOSTS as BASE_HOSTS, TIMEZONE, WIDGET, BACKGROUND_IMAGE } from '../config';
import { nowMinutesInTZ, isNowInRange } from '../utils/time';
import Tile from './Tile';
import Modal from './Modal';
import { subscribeToOverrides } from '../lib/overrideBus';

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
  const [overrides, setOverrides] = useState(() =>
    typeof window !== 'undefined' ? window.__ADMIN_OVERRIDES || {} : {}
  );

  // Listen for real-time updates from AdminPanel
  useEffect(() => {
    const unsubscribe = subscribeToOverrides(next => {
      setOverrides({ ...(next || {}) });
    });
    return unsubscribe;
  }, []);

  const mergedHosts = useMemo(
    () => mergeHostsWithOverrides(BASE_HOSTS, overrides.hosts),
    [overrides.hosts]
  );

  useEffect(() => {
    const id = setInterval(
      () => setNowMin(nowMinutesInTZ(TIMEZONE)),
      WIDGET.updateIntervalMs || 30000
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const matches = [];
    for (const host of mergedHosts) {
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

  const orderedRowKeys = ['day', 'zippo', 'night'];
  const rows = orderedRowKeys
    .map(key => ({
      key,
      hosts: mergedHosts.filter(h => h.row === key)
    }))
    .filter(r => r.hosts.length > 0);

  const bgOpacity =
    overrides.globals?.backgroundOpacity ??
    WIDGET.backgroundOpacity ??
    1;

  const parallax =
    overrides.globals?.parallaxIntensity ??
    WIDGET.parallaxIntensity ??
    0.08;

  const tileSize =
    overrides.globals?.tileSize ??
    WIDGET.tileSizePx ??
    200;

  const tileGap =
    overrides.globals?.tileGap ??
    WIDGET.tileGapPx ??
    12;

  const flameSettings =
    overrides.globals?.flameSettings || {};

  return (
    <div
      className="schedule-root"
      style={{
        '--tile-size': `${tileSize}px`,
        '--tile-gap': `${tileGap}px`,
        '--bg-opacity': bgOpacity,
        '--parallax-intensity': parallax,
        backgroundImage: `url(${BACKGROUND_IMAGE})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'cover'
      }}
    >
      {rows.map(row => (
        <div className="row" key={row.key} role="list" aria-label={row.key}>
          {row.hosts.map(host => {
            const isLive = liveIds.includes(host.id);
            const settings = host.flameType
              ? flameSettings[host.flameType] || {}
              : {};
            return (
              <Tile
                key={host.id}
                host={host}
                isLive={isLive}
                showVideo={isLive}
                flameSettings={settings}
                onClick={() => setModalHost(host)}
              />
            );
          })}
        </div>
      ))}

      {modalHost && (
        <Modal
          host={modalHost}
          isLive={liveIds.includes(modalHost.id)}
          flameSettings={
            modalHost.flameType ? flameSettings[modalHost.flameType] || {} : {}
          }
          onClose={() => setModalHost(null)}
        />
      )}
    </div>
  );
}
