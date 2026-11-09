import React, { useState } from 'react';
import { House as FiHome, MapPin as FiMapPin, SquaresFour as FiGrid, Book as FiBook, ChartBar as FiBarChart2 } from '@phosphor-icons/react';
import FloatingLabelInput from '../components/forms/FloatingLabelInput.jsx';

const Dashboard = () => {
  const [activeNav, setActiveNav] = useState('Overview');

  const navItems = [
    { label: 'Overview', icon: FiHome },
    { label: 'Regions', icon: FiMapPin },
    { label: 'Schools', icon: FiGrid },
    { label: 'Resources', icon: FiBook },
    { label: 'Reports', icon: FiBarChart2 },
  ];

  const kpis = [
    { label: 'Total Learners', value: '27.4M', note: 'Across all active regions', accent: 'blue' },
    { label: 'Priority Schools', value: '1,248', note: 'Marked for resource review', accent: 'gold' },
    { label: 'Teachers', value: '895K', note: 'Current staffing inventory', accent: 'blue' },
    { label: 'Critical Alerts', value: '86', note: 'Require immediate validation', accent: 'red' },
  ];

  const chartData = [
    { label: 'NCR', value: 88, status: 'stable' },
    { label: 'Region III', value: 72, status: 'priority' },
    { label: 'Region IV-A', value: 61, status: 'critical' },
    { label: 'Region VII', value: 79, status: 'stable' },
    { label: 'BARMM', value: 54, status: 'critical' },
  ];

  return (
    <div className="dashboard-theme app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo-card">
            <span className="text-blue-600 font-bold">Insight</span>
            <span className="text-red-600 font-bold">ED</span>
          </div>
        </div>
        <nav className="nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a 
                href="#" 
                key={item.label}
                className={activeNav === item.label ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); setActiveNav(item.label); }}
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-content">
            <div className="eyebrow">National Education Command Center</div>
            <h1>
              <span className="text-blue">Insight</span>
              <span className="text-red">ED</span> Resource Dashboard
            </h1>
          </div>
        </header>

        <div className="content-pad">
          <div className="filter-bar">
            <div className="filter-select-wrapper">
              <FloatingLabelInput as="select" label="Region"><option>All Regions</option></FloatingLabelInput>
            </div>
            <div className="filter-select-wrapper">
              <FloatingLabelInput as="select" label="Division"><option>All Divisions</option></FloatingLabelInput>
            </div>
            <div className="filter-select-wrapper">
              <FloatingLabelInput as="select" label="Category"><option>All Categories</option></FloatingLabelInput>
            </div>
            <div className="filter-select-wrapper">
              <FloatingLabelInput as="select" label="School Year"><option>2026-2027</option></FloatingLabelInput>
            </div>
            <button className="apply-btn">Apply Filters</button>
          </div>

          <div className="kpi-row">
            {kpis.map((kpi, idx) => (
              <div className={`card kpi-card border-l-${kpi.accent}`} key={idx}>
                <div className={`kpi-accent bg-${kpi.accent}`}></div>
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-note">{kpi.note}</div>
              </div>
            ))}
          </div>

          <div className="grid-layout">
            <div className="card chart-card">
              <div className="card-header">
                <div>
                  <h2>Regional Resource Balance</h2>
                  <p>Blue is the default data color; gold highlights priority segments; red flags risk.</p>
                </div>
                <div className="badge">SAMPLE</div>
              </div>
              <div className="chart-rows">
                {chartData.map((row) => (
                  <div className="chart-row" key={row.label}>
                    <div className="chart-label">{row.label}</div>
                    <div className="chart-bar-container">
                      <div className={`chart-bar bg-${row.status}`} style={{ width: `${row.value}%` }}></div>
                    </div>
                    <div className="chart-value">{row.value}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card priority-card">
              <div className="card-header">
                <h2>Priority Signals</h2>
                <p>Use color sparingly so alerts remain meaningful.</p>
              </div>
              <div className="priority-list">
                <div className="priority-item">
                  <div className="dot dot-blue"></div>
                  <span className="priority-label">Stable Coverage</span>
                  <span className="priority-color">Blue</span>
                </div>
                <div className="priority-item">
                  <div className="dot dot-gold"></div>
                  <span className="priority-label">Needs Review</span>
                  <span className="priority-color">Gold</span>
                </div>
                <div className="priority-item">
                  <div className="dot dot-red"></div>
                  <span className="priority-label">Critical Gap</span>
                  <span className="priority-color">Red</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
