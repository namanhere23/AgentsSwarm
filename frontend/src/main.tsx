/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { RouteGuard } from './components/RouteGuard';
import './index.css';

// Dashboard layout placeholder. Ensuing milestones will build pages under /dashboard
const DashboardLayout: React.FC = () => (
  <div className="flex min-h-screen bg-dark-bg p-8 text-white">
    <div className="w-full">
      <h1 className="text-2xl font-bold border-b border-dark-border pb-4">Dashboard Scaffolding</h1>
      <p className="mt-4 text-sm text-gray-400">Foundation complete. Swarm launcher and Live Trace view components will mount here.</p>
    </div>
  </div>
);

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
  </React.StrictMode>
);
