// src/components/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { HOSTS as BASE_HOSTS, WIDGET as BASE_WIDGET, FLAMES, ASSET_BASE_URL } from '../config';
import { buildGitHubOAuthUrl } from '../utils/githubClient';
import { emitOverrides } from '../lib/overrideBus';
import './AdminPanel.css';

function Labeled({ label, children }) {
  return (
    <div className="admin-control-row">
      <div className="admin-control-label">{label}</div>
      <div className="admin-control-field">{children}</div>
    </div>
  );
}

function initialOverridesFromWindow() {
  return typeof window !== 'undefined' ? (window.__ADMIN_OVERRIDES || {}) : {};
}

export default function AdminPanel() {
  const [localHosts, setLocalHosts] = useState(() => BASE_HOSTS.map(h => ({ ...h })));
  const [localWidget, setLocalWidget] = useState(() => ({ ...BASE_WIDGET }));
  const [overrides, setOverrides] = useState(() => initialOverridesFromWindow());
  const [statusMessage, setStatusMessage] = useState('');
  const [sectionOpen, setSectionOpen] = useState({
    hosts: true,
    flames: true,
    globals: true,
    io: true
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.dataset.theme || 'dark'
      : 'dark'
  );

  // Initialize global overrides
  useEffect(() => {
    window.__ADMIN_OVERRIDES = window.__ADMIN_OVERRIDES || {};
    window.__ADMIN_OVERRIDES.hosts = window.__ADMIN_OVERRIDES.hosts || localHosts;
    window.__ADMIN_OVERRIDES.globals = window.__ADMIN_OVERRIDES.globals || {};
    setOverrides(window.__ADMIN_OVERRIDES);
    emitOverrides(window.__ADMIN_OVERRIDES);
  }, []);

  // Sync local state -> global overrides on changes
  useEffect(() => {
    const next = {
      ...overrides,
      hosts: localHosts,
      globals: { ...(overrides.globals || {}), ...localWidget }
    };
    window.__ADMIN_OVERRIDES = next;
    setOverrides(next);
    emitOverrides(next);
  }, [localHosts, localWidget]);

  // Keyboard shortcut: Cmd+S / Ctrl+S => Save to GitHub
  useEffect(() => {
    function handleKeydown(e) {
      const isSaveCombo =
        (e.metaKey || e.ctrlKey) &&
        (e.key === 's' || e.key === 'S');
      if (!isSaveCombo) return;
      e.preventDefault();
      handleSaveToRepo();
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  // Theme handling
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }

  // Collapse / expand all
  function expandAll() {
    setSectionOpen({ hosts: true, flames: true, globals: true, io: true });
  }

  function collapseAll() {
    setSectionOpen({ hosts: false, flames: false, globals: false, io: false });
  }

  function toggleSection(key) {
    setSectionOpen(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();

  function matchesQuery(text) {
    if (!normalizedQuery) return true;
    if (!text) return false;
    return String(text).toLowerCase().includes(normalizedQuery);
  }

  // Host editing
  function updateHostField(idx, key, value) {
    setLocalHosts(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: value };
      return copy;
    });
  }

  function updateHostNested(idx, key, nestedKey, value) {
    setLocalHosts(prev => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        [key]: { ...(copy[idx][key] || {}), [nestedKey]: value }
      };
      return copy;
    });
  }

  function toggleForceLive(idx) {
    setLocalHosts(prev => {
      const copy = [...prev];
      copy[idx].forceLive = !copy[idx].forceLive;
      return copy;
    });
  }

  function resetHosts() {
    const reset = BASE_HOSTS.map(h => ({ ...h }));
    setLocalHosts(reset);
    setStatusMessage('Hosts reset to defaults.');
  }

  // Flames
  const flameTypes = Object.keys(FLAMES || {});

  function updateFlameSetting(type, key, value) {
    setOverrides(prev => {
      const globals = { ...(prev.globals || {}) };
      const flameSettings = { ...(globals.flameSettings || {}) };
      flameSettings[type] = { ...(flameSettings[type] || {}), [key]: value };
      const next = { ...prev, globals: { ...globals, flameSettings } };
      window.__ADMIN_OVERRIDES = next;
      emitOverrides(next);
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
      emitOverrides(next);
      return next;
    });
  }

  function resetFlames() {
    setOverrides(prev => {
      const globals = { ...(prev.globals || {}) };
      delete globals.flameSettings;
      const next = { ...prev, globals };
      window.__ADMIN_OVERRIDES = next;
      emitOverrides(next);
      return next;
    });
    setStatusMessage('Flame settings reset.');
  }

  // Widget globals
  function updateWidgetField(key, value) {
    setLocalWidget(prev => ({ ...prev, [key]: value }));
  }

  function resetGlobals() {
    setLocalWidget({ ...BASE_WIDGET });
    setOverrides(prev => {
      const globals = { ...(prev.globals || {}) };
      const next = { ...prev, globals };
      window.__ADMIN_OVERRIDES = next;
      emitOverrides(next);
      return next;
    });
    setStatusMessage('Global widget settings reset.');
  }

  // Import / Export / Reset (global)
  function exportJSON() {
    const payload = {
      hosts: localHosts,
      globals: overrides.globals || {},
      widget: localWidget,
      assetBase: ASSET_BASE_URL
    };

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
          emitOverrides(next);
        }

        setStatusMessage('Imported studio JSON.');
      } catch {
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
    emitOverrides({});
    setStatusMessage('Studio reset.');
  }

  // OAuth Save to GitHub
  const BACKEND_URL = window.__ADMIN_OVERRIDES?.backendUrl || 'http://localhost:4000';
  const GITHUB_OAUTH_CLIENT_ID = window.__ADMIN_OVERRIDES?.githubClientId || '';
  const OAUTH_REDIRECT_URI =
    window.__ADMIN_OVERRIDES?.oauthRedirect || `${window.location.origin}/oauth-callback.html`;

  function startOAuthAndSave(payload) {
    if (!GITHUB_OAUTH_CLIENT_ID) {
      setStatusMessage('Missing GitHub OAuth Client ID.');
      return;
    }

    try {
      const state = Math.random().toString(36).slice(2);
      sessionStorage.setItem(`studio_payload_${state}`, JSON.stringify(payload));

      const oauthUrl = buildGitHubOAuthUrl(
        GITHUB_OAUTH_CLIENT_ID,
        OAUTH_REDIRECT_URI,
        state
      );

      const popup = window.open(oauthUrl, 'github_oauth', 'width=600,height=700');

      if (!popup) {
        setStatusMessage('Popup blocked. Enable popups to continue.');
        return;
      }

      setStatusMessage('GitHub authorization popup opened.');
    } catch (err) {
      setStatusMessage('OAuth start failed: ' + (err?.message || String(err)));
    }
  }

  function handleSaveToRepo() {
    const payload = {
      hosts: localHosts,
      globals: overrides.globals || {},
      widget: localWidget,
      filename: 'src/config.json',
      commitMessage: 'Update studio overrides via Studio',
      backendUrl: BACKEND_URL
    };

    startOAuthAndSave(payload);
  }

  // Filter logic per section
  const filteredHosts = localHosts.filter(h =>
    !normalizedQuery ||
    matchesQuery(h.id) ||
    matchesQuery(h.social?.x) ||
    matchesQuery(h.social?.website)
  );

  const filteredFlameTypes = flameTypes.filter(type =>
    matchesQuery(type)
  );

  const globalsMatch =
    !normalizedQuery ||
    matchesQuery('background opacity') ||
    matchesQuery('parallax') ||
    matchesQuery('tile size') ||
    matchesQuery('tile gap');

  return (
    <div className="admin-panel-shell">
      <div className="admin-panel">
        <header className="admin-header">
          <div className="admin-header-top">
            <div className="admin-title">789 Studio</div>
            <div className="admin-theme-toggle">
              <span className="admin-theme-label">Theme</span>
              <button
                type="button"
                className="admin-btn admin-btn--sm"
                onClick={toggleTheme}
              >
                {theme === 'dark' ? 'Dark' : 'Light'}
              </button>
            </div>
          </div>
          <div className="admin-subtitle">
            Host routing, flames, and global widget tuning
          </div>
          <div className="admin-header-row">
            <input
              className="admin-search-input"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="admin-header-actions">
              <button
                type="button"
                className="admin-btn admin-btn--sm"
                onClick={expandAll}
              >
                Expand all
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--sm"
                onClick={collapseAll}
              >
                Collapse all
              </button>
            </div>
          </div>
        </header>

        {/* HOSTS */}
        <section className="admin-section">
          <div className="admin-section-header-row">
            <button
              type="button"
              className="admin-section-header"
              onClick={() => toggleSection('hosts')}
            >
              <span>Hosts</span>
              <span className="admin-section-toggle">
                {sectionOpen.hosts ? '−' : '+'}
              </span>
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--xs"
              onClick={resetHosts}
            >
              Reset
            </button>
          </div>

          {sectionOpen.hosts && (
            <div className="admin-section-body">
              {filteredHosts.map((host, idx) => (
                <div key={idx} className="admin-card">
                  <div className="admin-card-title">{host.id || `Host ${idx + 1}`}</div>

                  <Labeled label="Host ID">
                    <input
                      className="admin-input"
                      value={host.id || ''}
                      onChange={e => updateHostField(idx, 'id', e.target.value)}
                    />
                  </Labeled>

                  <Labeled label="X URL">
                    <input
                      className="admin-input"
                      value={host.social?.x || ''}
                      onChange={e => updateHostNested(idx, 'social', 'x', e.target.value)}
                    />
                  </Labeled>

                  <Labeled label="Website URL">
                    <input
                      className="admin-input"
                      value={host.social?.website || ''}
                      onChange={e =>
                        updateHostNested(idx, 'social', 'website', e.target.value)
                      }
                    />
                  </Labeled>

                  <Labeled label="Force Live">
                    <label className="admin-toggle">
                      <input
                        type="checkbox"
                        checked={!!host.forceLive}
                        onChange={() => toggleForceLive(idx)}
                      />
                      <span className="admin-toggle-label">
                        {host.forceLive ? 'On' : 'Off'}
                      </span>
                    </label>
                  </Labeled>
                </div>
              ))}
              {filteredHosts.length === 0 && (
                <div className="admin-empty">No hosts match this search.</div>
              )}
            </div>
          )}
        </section>

        {/* FLAMES */}
        <section className="admin-section">
          <div className="admin-section-header-row">
            <button
              type="button"
              className="admin-section-header"
              onClick={() => toggleSection('flames')}
            >
              <span>Flames</span>
              <span className="admin-section-toggle">
                {sectionOpen.flames ? '−' : '+'}
              </span>
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--xs"
              onClick={resetFlames}
            >
              Reset
            </button>
          </div>

          {sectionOpen.flames && (
            <div className="admin-section-body">
              {filteredFlameTypes.map(type => {
                const settings = overrides?.globals?.flameSettings?.[type] || {};
                return (
                  <div key={type} className="admin-card">
                    <div className="admin-card-title">{type}</div>

                    <Labeled label="Scale">
                      <input
                        type="range"
                        min="0.2"
                        max="2"
                        step="0.05"
                        value={settings.scale ?? 1}
                        onChange={e =>
                          updateFlameSetting(type, 'scale', parseFloat(e.target.value))
                        }
                      />
                    </Labeled>

                    <Labeled label="Offset X">
                      <input
                        type="range"
                        min="-200"
                        max="200"
                        step="1"
                        value={settings.offsetX ?? 0}
                        onChange={e =>
                          updateFlameSetting(type, 'offsetX', parseFloat(e.target.value))
                        }
                      />
                    </Labeled>

                    <Labeled label="Offset Y">
                      <input
                        type="range"
                        min="-200"
                        max="200"
                        step="1"
                        value={settings.offsetY ?? 0}
                        onChange={e =>
                          updateFlameSetting(type, 'offsetY', parseFloat(e.target.value))
                        }
                      />
                    </Labeled>

                    <Labeled label="Saturation">
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={settings.saturation ?? 1}
                        onChange={e =>
                          updateFlameSetting(type, 'saturation', parseFloat(e.target.value))
                        }
                      />
                    </Labeled>

                    <Labeled label="Brightness">
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={settings.brightness ?? 1}
                        onChange={e =>
                          updateFlameSetting(type, 'brightness', parseFloat(e.target.value))
                        }
                      />
                    </Labeled>

                    <Labeled label="Opacity">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={settings.opacity ?? 1}
                        onChange={e =>
                          updateFlameSetting(type, 'opacity', parseFloat(e.target.value))
                        }
                      />
                    </Labeled>
                  </div>
                );
              })}
              {filteredFlameTypes.length === 0 && (
                <div className="admin-empty">No flames match this search.</div>
              )}

              <div className="admin-card admin-card--inline">
                <div className="admin-card-title">Global flame tuning</div>

                <Labeled label="Global Saturation">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    defaultValue={1}
                    onChange={e =>
                      updateGlobalFlameSetting('saturation', parseFloat(e.target.value))
                    }
                  />
                </Labeled>

                <Labeled label="Global Brightness">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    defaultValue={1}
                    onChange={e =>
                      updateGlobalFlameSetting('brightness', parseFloat(e.target.value))
                    }
                  />
                </Labeled>

                <Labeled label="Global Opacity">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    defaultValue={1}
                    onChange={e =>
                      updateGlobalFlameSetting('opacity', parseFloat(e.target.value))
                    }
                  />
                </Labeled>
              </div>
            </div>
          )}
        </section>

        {/* GLOBAL WIDGET SETTINGS */}
        <section className="admin-section">
          <div className="admin-section-header-row">
            <button
              type="button"
              className="admin-section-header"
              onClick={() => toggleSection('globals')}
            >
              <span>Global widget settings</span>
              <span className="admin-section-toggle">
                {sectionOpen.globals ? '−' : '+'}
              </span>
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--xs"
              onClick={resetGlobals}
            >
              Reset
            </button>
          </div>

          {sectionOpen.globals && (
            <div className="admin-section-body">
              {globalsMatch && (
                <>
                  <div className="admin-card">
                    <div className="admin-card-title">Backdrop and parallax</div>

                    <Labeled label="Background opacity">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={localWidget.backgroundOpacity ?? 0.9}
                        onChange={e =>
                          updateWidgetField('backgroundOpacity', parseFloat(e.target.value))
                        }
                      />
                    </Labeled>

                    <Labeled label="Parallax intensity">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={localWidget.parallaxIntensity ?? 0.4}
                        onChange={e =>
                          updateWidgetField('parallaxIntensity', parseFloat(e.target.value))
                        }
                      />
                    </Labeled>
                  </div>

                  <div className="admin-card">
                    <div className="admin-card-title">Tile layout</div>

                    <Labeled label="Tile size">
                      <input
                        type="range"
                        min="120"
                        max="320"
                        step="4"
                        value={localWidget.tileSize ?? 200}
                        onChange={e =>
                          updateWidgetField('tileSize', parseFloat(e.target.value))
                        }
                      />
                    </Labeled>

                    <Labeled label="Tile gap">
                      <input
                        type="range"
                        min="4"
                        max="32"
                        step="1"
                        value={localWidget.tileGap ?? 12}
                        onChange={e =>
                          updateWidgetField('tileGap', parseFloat(e.target.value))
                        }
                      />
                    </Labeled>
                  </div>
                </>
              )}
              {!globalsMatch && (
                <div className="admin-empty">No globals match this search.</div>
              )}
            </div>
          )}
        </section>

        {/* IMPORT / EXPORT / RESET */}
        <section className="admin-section admin-section--bottom">
          <button
            type="button"
            className="admin-section-header"
            onClick={() => toggleSection('io')}
          >
            <span>Import / Export / Reset</span>
            <span className="admin-section-toggle">
              {sectionOpen.io ? '−' : '+'}
            </span>
          </button>

          {sectionOpen.io && (
            <div className="admin-section-body">
              <div className="admin-card">
                <div className="admin-card-title">JSON snapshots</div>

                <div className="admin-io-row">
                  <button type="button" className="admin-btn" onClick={exportJSON}>
                    Export JSON
                  </button>

                  <label className="admin-file-label">
                    Import JSON
                    <input
                      type="file"
                      accept="application/json"
                      onChange={importJSON}
                      className="admin-file-input"
                    />
                  </label>

                  <button
                    type="button"
                    className="admin-btn admin-btn--danger"
                    onClick={resetOverrides}
                  >
                    Reset Studio
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="admin-footer">
          <div className="admin-footer-left">
            <span className="admin-status-label">Status:</span>
            <span className="admin-status-text">
              {statusMessage || 'Ready.'}
            </span>
          </div>

          <div className="admin-footer-right">
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={handleSaveToRepo}
            >
              Save to GitHub
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
