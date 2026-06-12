import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import AddVM from './pages/AddVM';
import VmDashboardPage from './pages/VmDashboardPage';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import AddUser from './pages/AddUser.jsx';
import Dashboard from './pages/Dashboard.jsx';
import StallDashboard from './pages/StallDashboard.jsx';

// Core Layout Shells & New Pages
import AppLayout from './layouts/AppLayout';
import PageContainer from './layouts/PageContainer';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider } from './theme/ThemeProvider';

import NodesList from './pages/NodesList.jsx';
import ClustersList from './pages/ClustersList.jsx';
import StorageVolumes from './pages/StorageVolumes.jsx';
import PerformanceTrends from './pages/PerformanceTrends.jsx';
import EntityUsage from './pages/EntityUsage.jsx';
import DivisionUsage from './pages/DivisionUsage.jsx';
import CapacityProjections from './pages/CapacityProjections.jsx';
import MyAnalytics from './pages/MyAnalytics.jsx';
import SyncCenter from './pages/SyncCenter.jsx';

import SyncLogsCenter from './pages/SyncLogsCenter.jsx';
import UserDirectory from './pages/UserDirectory.jsx';
import VmRequestsManager from './pages/VmRequestsManager.jsx';
import VmOwnershipConsole from './pages/VmOwnershipConsole.jsx';
import RequestVmForm from './pages/RequestVmForm.jsx';

function AppContent() {
  const allRoles = ['admin', 'manager', 'user'];
  const opsRoles = ['admin', 'manager'];
  const adminOnly = ['admin'];
  const userOnly = ['user'];

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      
      {/* Existing Protected Routes (Wrapped in AppLayout) */}
      <Route path="/home" element={<ProtectedRoute allowedRoles={allRoles}><AppLayout><Home /></AppLayout></ProtectedRoute>} />
      <Route path="/change-password" element={<ProtectedRoute allowedRoles={allRoles}><AppLayout><ChangePassword /></AppLayout></ProtectedRoute>} />
      <Route path="/add" element={<ProtectedRoute allowedRoles={adminOnly}><AppLayout><AddVM /></AppLayout></ProtectedRoute>} />
      <Route path="/add-user" element={<ProtectedRoute allowedRoles={adminOnly}><AppLayout><AddUser /></AppLayout></ProtectedRoute>} />
      <Route path="/proxmox/vms" element={<ProtectedRoute allowedRoles={allRoles}><AppLayout><VmDashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={allRoles}><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/stalldashboard" element={<ProtectedRoute allowedRoles={opsRoles}><AppLayout><StallDashboard /></AppLayout></ProtectedRoute>} />

      {/* New Placeholder & Redirect Routes (Task 10) */}
      <Route path="/overview" element={<ProtectedRoute allowedRoles={allRoles}><AppLayout><PageContainer title="Overview"><Navigate to="/dashboard" replace /></PageContainer></AppLayout></ProtectedRoute>} />
      
      <Route path="/infrastructure/clusters" element={<ProtectedRoute allowedRoles={opsRoles}><AppLayout><ClustersList /></AppLayout></ProtectedRoute>} />
      <Route path="/infrastructure/nodes" element={<ProtectedRoute allowedRoles={opsRoles}><AppLayout><NodesList /></AppLayout></ProtectedRoute>} />
      <Route path="/infrastructure/storage" element={<ProtectedRoute allowedRoles={opsRoles}><AppLayout><StorageVolumes /></AppLayout></ProtectedRoute>} />

      <Route path="/monitoring/pressure" element={<ProtectedRoute allowedRoles={opsRoles}><AppLayout><Navigate to="/stalldashboard" replace /></AppLayout></ProtectedRoute>} />
      <Route path="/monitoring/trends" element={<ProtectedRoute allowedRoles={opsRoles}><AppLayout><PerformanceTrends /></AppLayout></ProtectedRoute>} />

      <Route path="/analytics/entity-usage" element={<ProtectedRoute allowedRoles={opsRoles}><AppLayout><EntityUsage /></AppLayout></ProtectedRoute>} />
      <Route path="/analytics/division-usage" element={<ProtectedRoute allowedRoles={opsRoles}><AppLayout><DivisionUsage /></AppLayout></ProtectedRoute>} />
      <Route path="/analytics/capacity-projection" element={<ProtectedRoute allowedRoles={opsRoles}><AppLayout><CapacityProjections /></AppLayout></ProtectedRoute>} />
      <Route path="/analytics/my-analytics" element={<ProtectedRoute allowedRoles={userOnly}><AppLayout><MyAnalytics /></AppLayout></ProtectedRoute>} />

      <Route path="/reports" element={<ProtectedRoute allowedRoles={allRoles}><AppLayout><PageContainer title="Custom Reports"><div className="text-slate-500 dark:text-slate-400">Manage custom report schemas and scheduled exports placeholder. Note: You can export reports directly from the Proxmox VMs tab.</div></PageContainer></AppLayout></ProtectedRoute>} />

      <Route path="/administration/users" element={<ProtectedRoute allowedRoles={adminOnly}><AppLayout><PageContainer title="Add User Credentials"><Navigate to="/add-user" replace /></PageContainer></AppLayout></ProtectedRoute>} />
      <Route path="/administration/users-list" element={<ProtectedRoute allowedRoles={adminOnly}><AppLayout><UserDirectory /></AppLayout></ProtectedRoute>} />
      <Route path="/administration/requests" element={<ProtectedRoute allowedRoles={adminOnly}><AppLayout><VmRequestsManager /></AppLayout></ProtectedRoute>} />
      <Route path="/administration/ownership" element={<ProtectedRoute allowedRoles={adminOnly}><AppLayout><VmOwnershipConsole /></AppLayout></ProtectedRoute>} />
      <Route path="/administration/sync-logs" element={<ProtectedRoute allowedRoles={adminOnly}><AppLayout><SyncLogsCenter /></AppLayout></ProtectedRoute>} />
      <Route path="/administration/sync" element={<ProtectedRoute allowedRoles={adminOnly}><AppLayout><SyncCenter /></AppLayout></ProtectedRoute>} />
      <Route path="/administration/add-vm" element={<ProtectedRoute allowedRoles={adminOnly}><AppLayout><PageContainer title="Add VM Provision"><Navigate to="/add" replace /></PageContainer></AppLayout></ProtectedRoute>} />

      <Route path="/user/request-vm" element={<ProtectedRoute allowedRoles={userOnly}><AppLayout><RequestVmForm /></AppLayout></ProtectedRoute>} />

      <Route path="/settings/profile" element={<ProtectedRoute allowedRoles={allRoles}><AppLayout><PageContainer title="My Profile"><div className="text-slate-500 dark:text-slate-400">User focal points information and security settings placeholder.</div></PageContainer></AppLayout></ProtectedRoute>} />
      <Route path="/settings/theme" element={<ProtectedRoute allowedRoles={allRoles}><AppLayout><PageContainer title="Theme Settings"><div className="text-slate-500 dark:text-slate-400">Theme customization preferences placeholder. Note: You can toggle dark/light theme directly using the theme switcher in the topbar.</div></PageContainer></AppLayout></ProtectedRoute>} />
      <Route path="/settings/password" element={<ProtectedRoute allowedRoles={allRoles}><AppLayout><PageContainer title="Change Password"><Navigate to="/change-password" replace /></PageContainer></AppLayout></ProtectedRoute>} />

      {/* Wildcard Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;