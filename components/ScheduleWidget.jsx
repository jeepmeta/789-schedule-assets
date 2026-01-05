import React, { useEffect, useState } from 'react';
import { HOSTS, TIMEZONE, WIDGET, BACKGROUND_IMAGE } from '../config';
import { nowMinutesInTZ, isNowInRange, hhmmToMinutes } from '../utils/time';
import Tile from './Tile';
import Modal from './Modal';

export default function ScheduleWidget() {
  const [nowMin, setNowMin] = useState(() => nowMinutesInTZ(TIMEZONE));
  const [liveIds, setLiveIds] = useState([]);
  const [modalHost, setModalHost] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNowMin(nowMinutesInTZ(TIMEZONE)), WIDGET.updateIntervalMs || 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const matches = [];
    for (const host of HOSTS) {
      for (const slot of host.schedule) {
        const start = slot.start;
        const end = slot.end;
        if (isNowInRange(nowMin, start, end)) {
          matches.push(host.id);
          break;
        }
      }
    }
    setLiveIds(matches);
  }, [nowMin]);

  // group hosts by row for layout
  const rows = HOSTS.reduce((acc, h) => {
    acc[h.row] = acc[h.row] || [];
    acc[h.row].push(h);
    return acc;
  }, {});

  return (
    <div
      className="schedule-root"
      style={{
        '--tile-size': `${WIDGET.tileSizePx}px`,
        '--tile-gap': `${WIDGET.tileGapPx}px`,
        backgroundImage: `url(${BACKGROUND_IMAGE})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'cover'
      }}
    >
      {Object.keys(rows).map(rowKey => (
        <div className="row" key={rowKey} role="list" aria-label={rowKey}>
          {rows[rowKey].map(host => (
            <Tile
              key={host.id}
              host={host}
              isLive={liveIds.includes(host.id)}
              onClick={() => setModalHost(host)}
            />
          ))}
        </div>
      ))}

      {modalHost && (
        <Modal host={modalHost} onClose={() => setModalHost(null)} />
      )}
    </div>
  );
}
