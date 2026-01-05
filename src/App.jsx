// src/App.jsx
import React from 'react';
import AdminPanel from './components/AdminPanel';
import ScheduleWidget from './components/ScheduleWidget';
import './App.css';

export default function App() {
  return (
    <div className="app-shell">
      <div className="app-left">
        <AdminPanel />
      </div>
      <div className="app-right">
        <ScheduleWidget />
      </div>
    </div>
  );
}
