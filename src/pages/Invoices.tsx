import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { documentTotal } from '../lib/derive';
import { currency, daysUntil, shortDate } from '../lib/format';
import { Card, EmptyState, Input, Select } from '../components/ui';
import { InvoiceStatusBadge } from '../components/StatusBadges';

const STATUSES = ['draft', 'sent', 'paid', 'overdue'] as const;

export function Invoices() {
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
    return snapshot.invoices
      .filter((invoice) => {
        if (status && invoice.status !== status) return false;
        if (!needle) return true;
        const lead = snapshot.leads.find((row) => row.id === invoice.leadId);
        return `${invoice.number} ${lead?.name ?? ''}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  }, [snapshot.invoices, snapshot.leads, q, status]);

  const outstanding = rows
    .filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'draft')
    .reduce((sum, invoice) => sum + documentTotal(invoice.lineItems), 0);

  if (loading) return <p className="py-12 text-center text-sm text-steel-500">Loading…</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold text-steel-900">Invoices</h1>
        <p className="text-sm text-steel-500">
          {currency(outstanding)} outstanding
        </p>
      </div>

      <Card className="p-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input
              type="search"
              value={q}
              placeholder="Search number or client…"
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
          <EmptyState title="No invoices" body="Open a job and hit “+ Invoice this job”." />
        ) : (
          <ul className="divide-y divide-steel-100">
            {rows.map((invoice) => {
              const lead = snapshot.leads.find((row) => row.id === invoice.leadId);
              const late =
                invoice.status !== 'paid' &&
                invoice.status !== 'draft' &&
                invoice.dueDate &&
                daysUntil(invoice.dueDate) < 0;
              return (
                <li key={invoice.id}>
                  <Link
                    to={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-steel-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-steel-900">
                        {invoice.number} · {lead?.name ?? 'Unknown client'}
                      </p>
                      <p className={`text-xs ${late ? 'text-red-600' : 'text-steel-500'}`}>
                        Due {shortDate(invoice.dueDate)}
                        {late ? ` · ${Math.abs(daysUntil(invoice.dueDate))} days late` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-steel-900">
                        {currency(documentTotal(invoice.lineItems))}
                      </span>
                      <InvoiceStatusBadge status={invoice.status} />
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
