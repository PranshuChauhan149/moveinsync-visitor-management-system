import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { RequireAuth, RedirectIfAuth, RequireRole } from './components/RouteGuards';
import AppShell from './layouts/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VisitorsPage from './pages/VisitorsPage';
import VisitorDetailPage from './pages/VisitorDetailPage';
import InviteVisitorPage from './pages/InviteVisitorPage';
import ApprovalsPage from './pages/ApprovalsPage';
import FrontDeskPage from './pages/FrontDeskPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import VisitorPassPage from './pages/VisitorPassPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route element={<RedirectIfAuth />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* Protected routes */}
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<DashboardPage />} />

                {/* Visitors — Admin, Host & Front Desk */}
                <Route element={<RequireRole roles={['ADMIN', 'HOST', 'FRONT_DESK']} />}>
                  <Route path="/visitors" element={<VisitorsPage />} />
                </Route>
                <Route path="/visitors/:id" element={<VisitorDetailPage />} />
                <Route path="/visitors/:id/pass" element={<VisitorPassPage />} />

                {/* Invite — Admin & Host */}
                <Route element={<RequireRole roles={['ADMIN', 'HOST']} />}>
                  <Route path="/invite" element={<InviteVisitorPage />} />
                </Route>

                {/* Approvals — Admin & Host */}
                <Route element={<RequireRole roles={['ADMIN', 'HOST']} />}>
                  <Route path="/approvals" element={<ApprovalsPage />} />
                </Route>

                {/* Front Desk — Admin & Front Desk */}
                <Route element={<RequireRole roles={['ADMIN', 'FRONT_DESK']} />}>
                  <Route path="/front-desk" element={<FrontDeskPage />} />
                </Route>

                {/* Admin-only routes */}
                <Route element={<RequireRole roles={['ADMIN']} />}>
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/audit-logs" element={<AuditLogsPage />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              fontSize: '14px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
