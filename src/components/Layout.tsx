import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../state/auth';
import { useStore } from '../state/store';
import { AddLeadModal } from './AddLeadModal';
import { Button } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▤', end: true },
  { to: '/board', label: 'Board', icon: '▥', end: false },
  { to: '/leads', label: 'Leads', icon: '☰', end: false },
  { to: '/estimates', label: 'Estimates', icon: '✎', end: false },
  { to: '/jobs', label: 'Jobs', icon: '⚒', end: false },
  { to: '/invoices', label: 'Invoices', icon: '$', end: false },
];

export function Layout() {
  const { identity, signOut, mode } = useAuth();
  const { error, backend, resetDemoData } = useStore();
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex min-h-full flex-col bg-steel-100">
      <header className="sticky top-0 z-30 border-b border-steel-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-steel-900 text-sm font-bold text-hivis-400">
            SS
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-steel-900">Silver S Construction</p>
            <p className="truncate text-xs text-steel-500">
              {identity ?? 'Owner'} · {backend === 'local' ? 'Local demo data' : 'Supabase'}
            </p>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-steel-900 text-white' : 'text-steel-600 hover:bg-steel-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <Button variant="primary" onClick={() => setAdding(true)}>
            <span className="sm:hidden">+</span>
            <span className="hidden sm:inline">+ Add lead</span>
          </Button>
          <Button variant="ghost" onClick={() => void signOut()} title="Sign out">
            ⏻
          </Button>
        </div>
      </header>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-24 md:pb-8">
        <Outlet />
      </main>

      <footer className="no-print mx-auto hidden w-full max-w-6xl px-4 pb-6 text-xs text-steel-400 md:block">
        {mode === 'local' ? (
          <span>
            Demo mode — data lives in this browser only.{' '}
            <button
              type="button"
              className="underline hover:text-steel-600"
              onClick={() => {
                if (window.confirm('Reset everything back to the demo data?')) {
                  void resetDemoData();
                }
              }}
            >
              Reset demo data
            </button>
          </span>
        ) : (
          <span>Connected to Supabase.</span>
        )}
      </footer>

      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-steel-200 bg-white md:hidden">
        <div className="flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  isActive ? 'text-steel-900' : 'text-steel-400'
                }`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <AddLeadModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
