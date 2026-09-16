import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './state/auth';
import { StoreProvider } from './state/store';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Board } from './pages/Board';
import { Leads } from './pages/Leads';
import { LeadDetail } from './pages/LeadDetail';
import { Estimates } from './pages/Estimates';
import { EstimateDetail } from './pages/EstimateDetail';
import { Jobs } from './pages/Jobs';
import { JobDetail } from './pages/JobDetail';
import { Invoices } from './pages/Invoices';
import { InvoiceDetail } from './pages/InvoiceDetail';
import { PrintDocument } from './pages/PrintDocument';
import { EmptyState } from './components/ui';

function Shell() {
  const { ready, signedIn } = useAuth();

  if (!ready) {
    return <p className="py-16 text-center text-sm text-steel-500">Loading…</p>;
  }

  if (!signedIn) return <Login />;

  return (
    <StoreProvider>
      <Routes>
        {/* Print views render outside the app chrome so only the document prints. */}
        <Route path="/print/:kind/:id" element={<PrintDocument />} />
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="board" element={<Board />} />
          <Route path="leads" element={<Leads />} />
          <Route path="leads/:id" element={<LeadDetail />} />
          <Route path="estimates" element={<Estimates />} />
          <Route path="estimates/:id" element={<EstimateDetail />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
          <Route path="clients" element={<Navigate to="/leads" replace />} />
          <Route path="*" element={<EmptyState title="Page not found" />} />
        </Route>
      </Routes>
    </StoreProvider>
  );
}

/**
 * Plain static hosting (a demo link, S3, GitHub Pages) has no SPA fallback, so
 * refreshing /leads there would 404. Build with VITE_ROUTER=hash for those; the
 * dev server and any host with a rewrite rule use clean paths.
 */
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;

export function App() {
  return (
    <Router>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </Router>
  );
}
