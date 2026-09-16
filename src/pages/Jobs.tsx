import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { shortDate } from '../lib/format';
import { Card, EmptyState, Input, Select } from '../components/ui';
import { JobStatusBadge } from '../components/StatusBadges';

const STATUSES = ['scheduled', 'in_progress', 'completed'] as const;

export function Jobs() {
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
    return snapshot.jobs
      .filter((job) => {
        if (status && job.status !== status) return false;
        if (!needle) return true;
        const lead = snapshot.leads.find((row) => row.id === job.leadId);
        return `${job.title} ${lead?.name ?? ''} ${lead?.address ?? ''}`
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  }, [snapshot.jobs, snapshot.leads, q, status]);

  if (loading) return <p className="py-12 text-center text-sm text-steel-500">Loading…</p>;

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold text-steel-900">Jobs</h1>

      <Card className="p-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input
              type="search"
              value={q}
              placeholder="Search job, client, address…"
              onChange={(event) => setParam('q', event.target.value)}
            />
          </div>
          <Select value={status} onChange={(event) => setParam('status', event.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value === 'in_progress' ? 'In progress' : value[0].toUpperCase() + value.slice(1)}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No jobs"
            body="Accept an estimate to schedule the work, or add a job from a lead."
          />
        ) : (
          <ul className="divide-y divide-steel-100">
            {rows.map((job) => {
              const lead = snapshot.leads.find((row) => row.id === job.leadId);
              return (
                <li key={job.id}>
                  <Link
                    to={`/jobs/${job.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-steel-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-steel-900">{job.title}</p>
                      <p className="truncate text-xs text-steel-500">
                        {lead?.name ?? 'Unknown client'} · {shortDate(job.startDate)} →{' '}
                        {shortDate(job.endDate)}
                      </p>
                    </div>
                    <JobStatusBadge status={job.status} />
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
