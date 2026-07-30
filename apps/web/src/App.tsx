import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Assets } from './pages/Assets/Assets';
import { AssetDetails } from './pages/Assets/AssetDetails';
import { Findings } from './pages/Findings/Findings';
import { FindingDetails } from './pages/Findings/FindingDetails';
import { Scans } from './pages/Scans/Scans';
import { ScanDetails } from './pages/Scans/ScanDetails';
import { Remediations } from './pages/Remediations/Remediations';
import { RemediationDetails } from './pages/Remediations/RemediationDetails';
import { Tickets } from './pages/Tickets/Tickets';
import { TicketDetails } from './pages/Tickets/TicketDetails';
import { Reports } from './pages/Reports/Reports';
import { ReportDetails } from './pages/Reports/ReportDetails';
import { Users } from './pages/Users/Users';
import { Settings } from './pages/Settings/Settings';
import { ActivityLog } from './pages/Activity/ActivityLog';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/assets/:id" element={<AssetDetails />} />
          <Route path="/findings" element={<Findings />} />
          <Route path="/findings/:id" element={<FindingDetails />} />
          <Route path="/scans" element={<Scans />} />
          <Route path="/scans/:id" element={<ScanDetails />} />
          <Route path="/remediations" element={<Remediations />} />
          <Route path="/remediations/:id" element={<RemediationDetails />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/tickets/:id" element={<TicketDetails />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:id" element={<ReportDetails />} />
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/activity" element={<ActivityLog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
