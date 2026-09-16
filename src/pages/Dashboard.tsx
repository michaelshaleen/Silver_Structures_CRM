import { Link } from 'react-router-dom';
import { useStore } from '../state/store';
import { BOARD_STAGES, STAGE_LABELS } from '../types';
import {
  activeJobs,
  documentTotal,
  outstandingInvoiceTotal,
  paidThisMonth,
  stageCounts,
  upcomingJobs,
} from '../lib/derive';
import { currency, daysUntil, shortDate } from '../lib/format';
import { Card, EmptyState, SectionTitle } from '../components/ui';
import { InvoiceStatusBadge, StageBadge } from '../components/StatusBadges';

export function Dashboard() {
  const { snapshot, loading } = useStore();
  const counts = stageCounts(snapshot);
  const upcoming = upcomingJobs(snapshot);
  const running = activeJobs(snapshot);
  const openInvoices = snapshot.invoices.filter(
    (invoice) => invoice.status === 'sent' || invoice.status === 'overdue',
  );

  if (loading) return <p className="py-12 text-center text-sm text-steel-500">Loading…</p>;

  const newLeads = (counts.new_lead ?? 0) + (counts.contacted ?? 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open leads" value={String(newLeads)} hint="New + contacted" to="/board" />
        <Stat
          label="Jobs running"
          value={String(running.length)}
          hint="In progress"
          to="/jobs"
        />
        <Stat
          label="Money out the door"
          value={currency(outstandingInvoiceTotal(snapshot))}
          hint={`${openInvoices.length} unpaid invoice${openInvoices.length === 1 ? '' : 's'}`}
          to="/invoices"
        />
        <Stat
          label="Paid this month"
          value={currency(paidThisMonth(snapshot))}
          hint="Invoices marked paid"
          to="/invoices"
        />
      </div>

      <Card>
        <SectionTitle
          action={
            <Link to="/board" className="text-sm font-medium text-steel-600 hover:text-steel-900">
              Open board →
            </Link>
          }
        >
          Pipeline
        </SectionTitle>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl bg-steel-200 sm:grid-cols-4 lg:grid-cols-8">
          {BOARD_STAGES.map((stage) => (
            <Link
              key={stage}
              to={`/leads?stage=${stage}`}
              className="bg-white px-3 py-4 transition hover:bg-steel-50"
            >
              <p className="text-2xl font-semibold tabular-nums text-steel-900">
                {counts[stage] ?? 0}
              </p>
              <p className="mt-1 text-xs leading-tight text-steel-500">{STAGE_LABELS[stage]}</p>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Upcoming job starts</SectionTitle>
          {upcoming.length === 0 ? (
            <EmptyState title="Nothing scheduled" body="Accepted estimates turn into jobs with a start date." />
          ) : (
            <ul className="divide-y divide-steel-100">
              {upcoming.map((job) => {
                const lead = snapshot.leads.find((row) => row.id === job.leadId);
                const days = daysUntil(job.startDate);
                return (
                  <li key={job.id}>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-steel-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-steel-900">{job.title}</p>
                        <p className="truncate text-xs text-steel-500">{lead?.name ?? 'Unknown client'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-steel-700">{shortDate(job.startDate)}</p>
                        <p className="text-xs text-steel-500">
                          {days === 0 ? 'Starts today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle>Waiting on payment</SectionTitle>
          {openInvoices.length === 0 ? (
            <EmptyState title="Nothing outstanding" body="Invoices you've sent will show up here until they're marked paid." />
          ) : (
            <ul className="divide-y divide-steel-100">
              {openInvoices.map((invoice) => {
                const lead = snapshot.leads.find((row) => row.id === invoice.leadId);
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
                        <p className="text-xs text-steel-500">Due {shortDate(invoice.dueDate)}</p>
                      </div>
                      <div className="flex items-center gap-2">
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

      <Card>
        <SectionTitle
          action={
            <Link to="/leads" className="text-sm font-medium text-steel-600 hover:text-steel-900">
              All leads →
            </Link>
          }
        >
          Newest leads
        </SectionTitle>
        {snapshot.leads.length === 0 ? (
          <EmptyState title="No leads yet" body="Use “+ Add lead” to enter one from the quote form." />
        ) : (
          <ul className="divide-y divide-steel-100">
            {[...snapshot.leads]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 5)
              .map((lead) => (
                <li key={lead.id}>
                  <Link
                    to={`/leads/${lead.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-steel-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-steel-900">{lead.name}</p>
                      <p className="truncate text-xs text-steel-500">{lead.description || lead.address}</p>
                    </div>
                    <StageBadge stage={lead.stage} />
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  to,
}: {
  label: string;
  value: string;
  hint: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-steel-200 bg-white p-4 shadow-sm transition hover:border-steel-300 hover:shadow"
    >
      <p className="text-xs font-medium tracking-wide text-steel-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-steel-900">{value}</p>
      <p className="mt-0.5 text-xs text-steel-500">{hint}</p>
    </Link>
  );
}
