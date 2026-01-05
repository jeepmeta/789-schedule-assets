// src/components/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { HOSTS as BASE_HOSTS, WIDGET as BASE_WIDGET, FLAMES, ASSET_BASE_URL } from '../config';
import { buildGitHubOAuthUrl } from '../utils/githubClient';

/**
 * AdminPanel (complete rewrite)
 *
 * Features baked in:
 * - Hosts list with editable X URL, Website URL, and Force Live toggle (for testing)
 * - Single flame controls per flame type (bic, zippo): scale, placement X/Y, saturation, brightness, opacity
 * - Global controls: background opacity, parallax intensity, tile size, tile gap
 * - Export / Import JSON snapshot
 * - Reset Studio overrides
 * - Save to GitHub button (starts OAuth flow and stores payload in sessionStorage)
 *
 * Implementation notes:
 * - All runtime overrides are written to window.__ADMIN_OVERRIDES so ScheduleWidget reads them live.
 * - Save to GitHub opens the GitHub OAuth authorize page in a popup. The oauth-callback.html page (in public/)
 *   should read the code/state and post to your backend to complete the commit.
 * - No secrets are embedded here. Provide your GitHub OAuth Client ID via window.__ADMIN_OVERRIDES.githubClientId
 *   or replace the placeholder below before building for production.
 */

function Labeled({ label, children }) {
  return (
    <div className="control-row">
      <div className="control-label">{label}</div>
      <div className="control-field">{children}</div>
    </div>
  );
}

function initialOverridesFromWindow() {
  return typeof window !== 'undefined' ? (window.__ADMIN_OVERRIDES || {}) : {};
}

export default function AdminPanel() {
  // Local editable copies
  const [localHosts, setLocalHosts] = useState(() => BASE_HOSTS.map(h => ({ ...h })));
  const [localWidget, setLocalWidget] = useState(() => ({ ...BASE_WIDGET }));
  const [overrides, setOverrides] = useState(() => initialOverridesFromWindow());
  const [statusMessage, setStatusMessage] = useState('');

  // Ensure window.__ADMIN_OVERRIDES exists and initialize
  useEffect(() => {
    window.__ADMIN_OVERRIDES = window.__ADMIN_OVERRIDES || {};
    window.__ADMIN_OVERRIDES.hosts = window.__ADMIN_OVERRIDES.hosts || localHosts;
    window.__ADMIN_OVERRIDES.globals = window.__ADMIN_OVERRIDES.globals || {};
    setOverrides(window.__ADMIN_OVERRIDES);
  }, []);

  // Sync localHosts and localWidget into window overrides whenever they change
  useEffect(() => {
    const next = {
      ...overrides,
      hosts: localHosts,
      globals: { ...(overrides.globals || {}), ...localWidget }
    };
    window.__ADMIN_OVERRIDES = next;
    setOverrides(next);
  }, [localHosts, localWidget]);

  /* ---------------- Host editing helpers ---------------- */
  function updateHostField(idx, key, value) {
    setLocalHosts(prev => {
      const copy = prev.map(h => ({ ...h }));
      copy[idx] = { ...copy[idx], [key]: value };
      return copy;
    });
  }

  function updateHostNested(idx, key, nestedKey, value) {
    setLocalHosts(prev => {
      const copy = prev.map(h => ({ ...h }));
      copy[idx] = { ...copy[idx], [key]: { ...(copy[idx][key] || {}), [nestedKey]: value } };
      return copy;
    });
  }

  function toggleForceLive(idx) {
    setLocalHosts(prev => {
      const copy = prev.map(h => ({ ...h }));
      copy[idx].forceLive = !copy[idx].forceLive;
      return copy;
    });
  }

  /* ---------------- Flame settings helpers ---------------- */
  const flameTypes = Object.keys(FLAMES || {});

  function updateFlameSetting(type, key, value) {
    setOverrides(prev => {
      const globals = { ...(prev.globals || {}) };
      const flameSettings = { ...(globals.flameSettings || {}) };
      flameSettings[type] = { ...(flameSettings[type] || {}), [key]: value };
      const next = { ...prev, globals: { ...globals, flameSettings } };
      window.__ADMIN_OVERRIDES = next;
      setOverrides(next);
      return next;
    });
  }

  function updateGlobalFlameSetting(key, value) {
    setOverrides(prev => {
      const globals = { ...(prev.globals || {}) };
      const flameSettings = { ...(globals.flameSettings || {}) };
      flameTypes.forEach(t => {
        flameSettings[t] = { ...(flameSettings[t] || {}), [key]: value };
      });
      const next = { ...prev, globals: { ...globals, flameSettings } };
      window.__ADMIN_OVERRIDES = next;
      setOverrides(next);
      return next;
    });
  }

  /* ---------------- Global widget helpers ---------------- */
  function updateWidgetField(key, value) {
    setLocalWidget(prev => ({ ...prev, [key]: value }));
  }

  /* ---------------- Export / Import / Reset ---------------- */
  function exportJSON() {
    const payload = { hosts: localHosts, globals: overrides.globals || {}, widget: localWidget, assetBase: ASSET_BASE_URL };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '789-studio-overrides.json';
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Exported studio JSON.');
  }

  function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (parsed.hosts) setLocalHosts(parsed.hosts);
        if (parsed.widget) setLocalWidget(parsed.widget);
        if (parsed.globals) {
          const next = { ...overrides, globals: parsed.globals };
          window.__ADMIN_OVERRIDES = next;
          setOverrides(next);
        }
        setStatusMessage('Imported studio JSON (local only).');
      } catch (err) {
        setStatusMessage('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  }

  function resetOverrides() {
    window.__ADMIN_OVERRIDES = {};
    setOverrides({});
    setLocalHosts(BASE_HOSTS.map(h => ({ ...h })));
    setLocalWidget({ ...BASE_WIDGET });
    setStatusMessage('Studio overrides reset (local only).');
  }

  /* ---------------- Save to GitHub (OAuth start) ----------------
     This component only starts the OAuth flow and stores the payload
     in sessionStorage keyed by a random state. The oauth-callback.html
     page must exist in public/ and will complete the flow by posting
     the code + payload to your backend.
  -----------------------------------------------------------------*/
  const BACKEND_URL = window.__ADMIN_OVERRIDES?.backendUrl || 'http://localhost:4000';
  const GITHUB_OAUTH_CLIENT_ID = window.__ADMIN_OVERRIDES?.githubClientId || 'Ov23linsfojqP0SM2qM0';
  const OAUTH_REDIRECT_URI = window.__ADMIN_OVERRIDES?.oauthRedirect || `${window.location.origin}/oauth-callback.html`;

  function startOAuthAndSave(payload) {
    try {
      const state = Math.random().toString(36).slice(2);
      sessionStorage.setItem(`studio_payload_${state}`, JSON.stringify(payload));
      const oauthUrl = buildGitHubOAuthUrl(GITHUB_OAUTH_CLIENT_ID, OAUTH_REDIRECT_URI, state);
      const w = window.open(oauthUrl, 'github_oauth', 'width=600,height=700');
      if (!w) {
        setStatusMessage('Popup blocked. Allow popups for this site to save to GitHub.');
        return;
      }
      setStatusMessage('Opened GitHub authorization popup. Complete authorization to save.');
    } catch (err) {
      setStatusMessage('Failed to start OAuth: ' + (err.message || err));
    }
  }

  function handleSaveToRepo() {
    const payload = {
      hosts: localHosts,
      globals: overrides.globals || {},
      widget: localWidget,
      // optional: allow user to override filename/commit message via UI later
      filename: 'src/config.json',
      commitMessage: 'Update studio overrides via Studio'
    };
    startOAuthAndSave(payload);
  }

  /* ---------------- Render UI ---------------- */
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
            onChange={(e) => updateWidgetField('tileSizePx', Number(e.target.value))}
          />
          <span className="value">{localWidget.tileSizePx}px</span>
        </Labeled>

        <Labeled label="Tile Gap">
          <input
            type="range"
            min="4"
            max="40"
            value={localWidget.tileGapPx}
            onChange={(e) => updateWidgetField('tileGapPx', Number(e.target.value))}
          />
          <span className="value">{localWidget.tileGapPx}px</span>
        </Labeled>

        <Labeled label="Background Opacity">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={overrides.globals?.backgroundOpacity ?? (localWidget.backgroundOpacity ?? 1)}
            onChange={(e) => {
              const v = Number(e.target.value);
              setOverrides(prev => {
                const next = { ...prev, globals: { ...(prev.globals || {}), backgroundOpacity: v } };
                window.__ADMIN_OVERRIDES = next;
                setOverrides(next);
                return next;
              });
            }}
          />
          <span className="value">{(overrides.globals?.backgroundOpacity ?? (localWidget.backgroundOpacity ?? 1)).toFixed(2)}</span>
        </Labeled>

        <Labeled label="Parallax Intensity">
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={overrides.globals?.parallaxIntensity ?? (localWidget.parallaxIntensity ?? 0.08)}
            onChange={(e) => {
              const v = Number(e.target.value);
              setOverrides(prev => {
                const next = { ...prev, globals: { ...(prev.globals || {}), parallaxIntensity: v } };
                window.__ADMIN_OVERRIDES = next;
                setOverrides(next);
                return next;
              });
            }}
          />
          <span className="value">{(overrides.globals?.parallaxIntensity ?? (localWidget.parallaxIntensity ?? 0.08)).toFixed(2)}</span>
        </Labeled>

        <div className="studio-actions" style={{ marginTop: 8 }}>
          <button onClick={exportJSON} className="btn">Export Studio JSON</button>

          <label className="btn file" style={{ display: 'inline-block', marginLeft: 8 }}>
            Import Studio JSON
            <input type="file" accept="application/json" onChange={importJSON} />
          </label>

          <button onClick={handleSaveToRepo} className="btn" style={{ marginLeft: 8 }}>Save to GitHub</button>

          <button onClick={resetOverrides} className="btn" style={{ marginLeft: 8 }}>Reset Studio</button>
        </div>
      </section>

      <section className="panel">
        <h3>Flame Video Controls (global per type)</h3>
        <p style={{ color: '#ccc', marginTop: 0 }}>Adjust flame visuals for each flame type. These settings apply to all hosts of that type.</p>

        {flameTypes.map((type) => {
          const fs = (overrides.globals && overrides.globals.flameSettings && overrides.globals.flameSettings[type]) || {};
          return (
            <div key={type} style={{ marginBottom: 12, padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
              <strong style={{ textTransform: 'capitalize' }}>{type} flame</strong>

              <Labeled label="Scale">
                <input
                  type="range"
                  min="0.4"
                  max="2"
                  step="0.01"
                  value={fs.scale ?? 1}
                  onChange={(e) => updateFlameSetting(type, 'scale', Number(e.target.value))}
                />
                <span className="value">{(fs.scale ?? 1).toFixed(2)}</span>
              </Labeled>

              <Labeled label="Placement X">
                <input
                  type="text"
                  value={fs.x ?? ''}
                  placeholder="50%"
                  onChange={(e) => updateFlameSetting(type, 'x', e.target.value)}
                />
              </Labeled>

              <Labeled label="Placement Y">
                <input
                  type="text"
                  value={fs.y ?? ''}
                  placeholder="60%"
                  onChange={(e) => updateFlameSetting(type, 'y', e.target.value)}
                />
              </Labeled>

              <Labeled label="Saturation">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={fs.saturation ?? 1}
                  onChange={(e) => updateFlameSetting(type, 'saturation', Number(e.target.value))}
                />
                <span className="value">{(fs.saturation ?? 1).toFixed(2)}</span>
              </Labeled>

              <Labeled label="Brightness">
                <input
                  type="range"
                  min="0.2"
                  max="2"
                  step="0.01"
                  value={fs.brightness ?? 1}
                  onChange={(e) => updateFlameSetting(type, 'brightness', Number(e.target.value))}
                />
                <span className="value">{(fs.brightness ?? 1).toFixed(2)}</span>
              </Labeled>

              <Labeled label="Opacity">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={fs.opacity ?? (BASE_WIDGET.liveEffect.opacity ?? 1)}
                  onChange={(e) => updateFlameSetting(type, 'opacity', Number(e.target.value))}
                />
                <span className="value">{(fs.opacity ?? (BASE_WIDGET.liveEffect.opacity ?? 1)).toFixed(2)}</span>
              </Labeled>
            </div>
          );
        })}

        <div style={{ marginTop: 8 }}>
          <strong style={{ color: '#ccc' }}>Global flame adjustments</strong>
          <Labeled label="Apply Saturation">
            <input type="range" min="0" max="2" step="0.01" onChange={(e) => updateGlobalFlameSetting('saturation', Number(e.target.value))} />
            <span className="value">applies to all types</span>
          </Labeled>
        </div>
      </section>

      <section className="panel">
        <h3>Hosts</h3>
        <div className="hosts-list">
          {localHosts.map((h, idx) => (
            <div className="host-card" key={h.id}>
              <div className="host-header">
                <strong>{h.name}</strong>
                <span className="host-id" style={{ color: '#999' }}>{h.id}</span>
              </div>

              <Labeled label="X URL">
                <input type="text" value={h.xUrl || ''} onChange={(e) => updateHostField(idx, 'xUrl', e.target.value)} />
              </Labeled>

              <Labeled label="Website">
                <input type="text" value={h.website || ''} onChange={(e) => updateHostField(idx, 'website', e.target.value)} />
              </Labeled>

              <Labeled label="Force Live">
                <button
                  className="btn"
                  onClick={() => toggleForceLive(idx)}
                  style={{ background: h.forceLive ? '#ffb84d' : undefined }}
                >
                  {h.forceLive ? 'Forced Live' : 'Toggle Live'}
                </button>
              </Labeled>

              <Labeled label="Video Source">
                <input type="text" value={h.liveEffect?.videoSource || ''} onChange={(e) => updateHostNested(idx, 'liveEffect', 'videoSource', e.target.value)} placeholder={`${ASSET_BASE_URL}/flames/...`} />
              </Labeled>
            </div>
          ))}
        </div>
      </section>

      <footer className="studio-footer" style={{ marginTop: 12 }}>
        <small style={{ color: '#999' }}>Studio is local-only. Use Export to save a snapshot. Save to GitHub will open an OAuth popup and complete the commit via your backend.</small>
        <div style={{ marginTop: 8, color: '#ffd400' }}>{statusMessage}</div>
      </footer>
    </div>
  );
}
