import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { documentTotal } from '../lib/derive';
import { currency, shortDate } from '../lib/format';
import { Card, EmptyState, Input, Select } from '../components/ui';
import { EstimateStatusBadge } from '../components/StatusBadges';

const STATUSES = ['draft', 'sent', 'accepted', 'declined'] as const;

export function Estimates() {
  const { snapshot, loading } = useStore();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return snapshot.estimates
      .filter((estimate) => {
        if (status && estimate.status !== status) return false;
        if (!needle) return true;
        const lead = snapshot.leads.find((row) => row.id === estimate.leadId);
        return `${estimate.number} ${estimate.title} ${lead?.name ?? ''}`
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  }, [snapshot.estimates, snapshot.leads, q, status]);

  if (loading) return <p className="py-12 text-center text-sm text-steel-500">Loading…</p>;

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold text-steel-900">Estimates</h1>

      <Card className="p-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input
              type="search"
              value={q}
              placeholder="Search number, title, client…"
              onChange={(event) => setParam('q', event.target.value)}
            />
          </div>
          <Select value={status} onChange={(event) => setParam('status', event.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value[0].toUpperCase() + value.slice(1)}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No estimates"
            body="Open a lead and hit “+ New” under Estimates to write one."
          />
        ) : (
          <ul className="divide-y divide-steel-100">
            {rows.map((estimate) => {
              const lead = snapshot.leads.find((row) => row.id === estimate.leadId);
              return (
                <li key={estimate.id}>
                  <Link
                    to={`/estimates/${estimate.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-steel-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-steel-900">
                        {estimate.number} · {lead?.name ?? 'Unknown client'}
                      </p>
                      <p className="truncate text-xs text-steel-500">
                        {estimate.title || '—'} · {shortDate(estimate.issueDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-steel-900">
                        {currency(documentTotal(estimate.lineItems))}
                      </span>
                      <EstimateStatusBadge status={estimate.status} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
