// src/config.js
// Wrapper that re-exports values from config.json so existing named imports work.

import cfg from './config.json';

export const ASSET_BASE_URL = cfg.ASSET_BASE_URL;
export const BACKGROUND_IMAGE = cfg.BACKGROUND_IMAGE;
export const FLAMES = cfg.FLAMES;
export const TIMEZONE = cfg.TIMEZONE;
export const WIDGET = cfg.WIDGET;
export const HOSTS = cfg.HOSTS;

// default export for any modules that import default
export default cfg;
