import React, { useState } from 'react';
import ScheduleWidget from './components/ScheduleWidget';
import AdminPanel from './components/AdminPanel';
import { WIDGET } from './config';

export default function App() {
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div className="app-root" style={{ background: WIDGET.theme.background }}>
      <div className="topbar">
        <div className="brand">789 Schedule</div>
        <button
          className="admin-toggle"
          onClick={() => setShowAdmin(v => !v)}
          aria-pressed={showAdmin}
        >
          {showAdmin ? 'Close Studio' : 'Open Studio'}
        </button>
      </div>

      <div className="main">
        <div className="widget-pane">
          <ScheduleWidget />
        </div>

        {showAdmin && (
          <div className="admin-pane" aria-hidden={!showAdmin}>
            <AdminPanel />
          </div>
        )}
      </div>
    </div>
  );
}
