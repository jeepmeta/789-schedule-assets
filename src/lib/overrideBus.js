// src/lib/overrideBus.js

const EVENT_NAME = 'studio-updated';

export function emitOverrides(overrides) {
  const detail = overrides ?? (typeof window !== 'undefined' ? window.__ADMIN_OVERRIDES : {});
  const event = new CustomEvent(EVENT_NAME, { detail });
  window.dispatchEvent(event);
}

export function subscribeToOverrides(handler) {
  function wrapped(e) {
    handler(e.detail || {});
  }
  window.addEventListener(EVENT_NAME, wrapped);
  return () => window.removeEventListener(EVENT_NAME, wrapped);
}
