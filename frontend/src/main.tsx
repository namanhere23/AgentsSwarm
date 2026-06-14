import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Login } from './pages/Login';
import { RouteGuard } from './components/RouteGuard';
import { DashboardLayout } from './components/DashboardLayout';
import './index.css';

// Import all pages
import { SwarmLauncher } from './pages/dashboard/SwarmLauncher';
import { LiveTraceView } from './pages/dashboard/LiveTraceView';
import { ApprovalCenter } from './pages/dashboard/ApprovalCenter';
import { MemoryExplorer } from './pages/dashboard/MemoryExplorer';
import { CrewManager } from './pages/dashboard/CrewManager';
import { AuditLogView } from './pages/dashboard/AuditLogView';
import { SystemStatus } from './pages/dashboard/SystemStatus';
import { ApiKeys } from './pages/dashboard/ApiKeys';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: <RouteGuard />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <SwarmLauncher /> },
          { path: 'trace', element: <LiveTraceView /> },
          { path: 'trace/:runId', element: <LiveTraceView /> },
          { path: 'approvals', element: <ApprovalCenter /> },
          { path: 'memory', element: <MemoryExplorer /> },
          { path: 'crews', element: <CrewManager /> },
          { path: 'audit', element: <AuditLogView /> },
          { path: 'system', element: <SystemStatus /> },
          { path: 'api-keys', element: <ApiKeys /> },
        ]
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#18181b',
          color: '#f8fafc',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          fontSize: '14px',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        success: { iconTheme: { primary: '#10b981', secondary: '#18181b' } },
        error:   { iconTheme: { primary: '#e11d48', secondary: '#18181b' } },
      }}
    />
  </React.StrictMode>
);
