// utils/time.js
// Time helpers using Intl to respect DST in America/New_York

export function nowMinutesInTZ(timeZone = 'America/New_York') {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  const parts = fmt.formatToParts(now);
  const hour = Number(parts.find(p => p.type === 'hour').value);
  const minute = Number(parts.find(p => p.type === 'minute').value);
  return hour * 60 + minute;
}

export function hhmmToMinutes(hhmm) {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr || 0);
  return ((h % 24) * 60) + m;
}

export function isNowInRange(nowMin, startHHmm, endHHmm) {
  const s = hhmmToMinutes(startHHmm);
  const e = hhmmToMinutes(endHHmm === '24:00' ? '00:00' : endHHmm);
  if (e > s) return nowMin >= s && nowMin < e;
  // crosses midnight
  return nowMin >= s || nowMin < e;
}
