import React, { useState } from 'react';
import { HOSTS, WIDGET, FLAMES, ASSET_BASE_URL } from '../config';

/**
 * Lightweight studio mixing board UI.
 * This admin panel is a local-only editor for quick tweaks.
 * It does not commit to GitHub automatically. Use Export/Import to persist.
 */

function Labeled({ label, children }) {
  return (
    <div className="control-row">
      <div className="control-label">{label}</div>
      <div className="control-field">{children}</div>
    </div>
  );
}

export default function AdminPanel() {
  const [localWidget, setLocalWidget] = useState(WIDGET);
  const [localHosts, setLocalHosts] = useState(HOSTS);

  function updateWidget(key, value) {
    setLocalWidget(prev => ({ ...prev, [key]: value }));
  }

  function updateHost(idx, key, value) {
    setLocalHosts(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: value };
      return copy;
    });
  }

  function exportJSON() {
    const payload = { WIDGET: localWidget, HOSTS: localHosts, FLAMES, ASSET_BASE_URL };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '789-schedule-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (parsed.WIDGET) setLocalWidget(parsed.WIDGET);
        if (parsed.HOSTS) setLocalHosts(parsed.HOSTS);
        alert('Imported config applied to studio (local only).');
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="admin-root" style={{ background: '#0b0b0b', color: '#ffd400' }}>
      <h2 className="studio-title">Studio Mixing Board</h2>

      <section className="panel">
        <h3>Global Controls</h3>
        <Labeled label="Tile Size">
          <input
            type="range"
            min="80"
            max="320"
            value={localWidget.tileSizePx}
            onChange={(e) => updateWidget('tileSizePx', Number(e.target.value))}
          />
          <span className="value">{localWidget.tileSizePx}px</span>
        </Labeled>

        <Labeled label="Tile Gap">
          <input
            type="range"
            min="4"
            max="40"
            value={localWidget.tileGapPx}
            onChange={(e) => updateWidget('tileGapPx', Number(e.target.value))}
          />
          <span className="value">{localWidget.tileGapPx}px</span>
        </Labeled>

        <Labeled label="Live Effect Opacity">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={localWidget.liveEffect.opacity}
            onChange={(e) => updateWidget('liveEffect', { ...localWidget.liveEffect, opacity: Number(e.target.value) })}
          />
          <span className="value">{localWidget.liveEffect.opacity}</span>
        </Labeled>

        <Labeled label="Parallax Intensity">
          <input type="range" min="0" max="1" step="0.01" defaultValue="0.08" />
          <span className="value">0.08</span>
        </Labeled>

        <div className="studio-actions">
          <button onClick={exportJSON} className="btn">Export Config</button>
          <label className="btn file">
            Import Config
            <input type="file" accept="application/json" onChange={importJSON} />
          </label>
        </div>
      </section>

      <section className="panel">
        <h3>Hosts</h3>
        <div className="hosts-list">
          {localHosts.map((h, idx) => (
            <div className="host-card" key={h.id}>
              <div className="host-header">
                <strong>{h.name}</strong>
                <span className="host-id">{h.id}</span>
              </div>

              <Labeled label="X URL">
                <input type="text" value={h.xUrl} onChange={(e) => updateHost(idx, 'xUrl', e.target.value)} />
              </Labeled>

              <Labeled label="Flame X">
                <input type="text" value={h.flamePlacement?.x || ''} onChange={(e) => updateHost(idx, 'flamePlacement', { ...(h.flamePlacement || {}), x: e.target.value })} placeholder="50%" />
              </Labeled>

              <Labeled label="Flame Y">
                <input type="text" value={h.flamePlacement?.y || ''} onChange={(e) => updateHost(idx, 'flamePlacement', { ...(h.flamePlacement || {}), y: e.target.value })} placeholder="60%" />
              </Labeled>

              <Labeled label="Flame Scale">
                <input type="number" step="0.1" value={h.flamePlacement?.scale || 1} onChange={(e) => updateHost(idx, 'flamePlacement', { ...(h.flamePlacement || {}), scale: Number(e.target.value) })} />
              </Labeled>

              <Labeled label="Video Source">
                <input type="text" value={h.liveEffect?.videoSource || ''} onChange={(e) => updateHost(idx, 'liveEffect', { ...(h.liveEffect || {}), videoSource: e.target.value })} placeholder={`${ASSET_BASE_URL}/flames/...`} />
              </Labeled>
            </div>
          ))}
        </div>
      </section>

      <footer className="studio-footer">
        <small>Studio is local-only. Use Export to save changes and replace config.js in repo to persist.</small>
      </footer>
    </div>
  );
}
