import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../state/store';
import {
  LEAD_SOURCES,
  PIPELINE_STAGES,
  SOURCE_LABELS,
  STAGE_LABELS,
  type Estimate,
} from '../types';
import { documentTotal } from '../lib/derive';
import { currency, shortDate } from '../lib/format';
import { Card, EmptyState, Input, Select } from '../components/ui';
import { StageBadge } from '../components/StatusBadges';

type SortKey = 'newest' | 'oldest' | 'name';

export function Leads() {
  const { snapshot, loading } = useStore();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const stage = params.get('stage') ?? '';
  const source = params.get('source') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const sort = (params.get('sort') as SortKey) || 'newest';

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = snapshot.leads.filter((lead) => {
      if (stage && lead.stage !== stage) return false;
      if (source && lead.source !== source) return false;
      if (from && lead.createdAt.slice(0, 10) < from) return false;
      if (to && lead.createdAt.slice(0, 10) > to) return false;
      if (!needle) return true;
      return [lead.name, lead.email, lead.phone, lead.address, lead.description]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });

    return filtered.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt);
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [snapshot.leads, q, stage, source, from, to, sort]);

  if (loading) return <p className="py-12 text-center text-sm text-steel-500">Loading…</p>;

  const filtersOn = Boolean(q || stage || source || from || to);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold text-steel-900">Leads &amp; clients</h1>
        <p className="text-sm text-steel-500">
          {rows.length} of {snapshot.leads.length}
        </p>
      </div>

      <Card className="p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Input
              type="search"
              value={q}
              placeholder="Search name, email, address…"
              onChange={(event) => setParam('q', event.target.value)}
            />
          </div>
          <Select value={stage} onChange={(event) => setParam('stage', event.target.value)}>
            <option value="">All stages</option>
            {PIPELINE_STAGES.map((value) => (
              <option key={value} value={value}>
                {STAGE_LABELS[value]}
              </option>
            ))}
          </Select>
          <Select value={source} onChange={(event) => setParam('source', event.target.value)}>
            <option value="">All sources</option>
            {LEAD_SOURCES.map((value) => (
              <option key={value} value={value}>
                {SOURCE_LABELS[value]}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            aria-label="Created from"
            value={from}
            onChange={(event) => setParam('from', event.target.value)}
          />
          <Input
            type="date"
            aria-label="Created to"
            value={to}
            onChange={(event) => setParam('to', event.target.value)}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Select
            className="w-auto py-1 text-xs"
            value={sort}
            onChange={(event) => setParam('sort', event.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">By name</option>
          </Select>
          {filtersOn ? (
            <button
              type="button"
              className="text-xs text-steel-500 underline hover:text-steel-800"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No leads match"
            body={filtersOn ? 'Try widening the filters.' : 'Add your first lead to get started.'}
          />
        ) : (
          <>
            {/* Table on desktop, stacked rows on a phone. */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="border-b border-steel-200 text-xs tracking-wide text-steel-500 uppercase">
                <tr>
                  <th className="px-4 py-2 font-semibold">Name</th>
                  <th className="px-4 py-2 font-semibold">Project</th>
                  <th className="px-4 py-2 font-semibold">Source</th>
                  <th className="px-4 py-2 font-semibold">Stage</th>
                  <th className="px-4 py-2 text-right font-semibold">Estimate</th>
                  <th className="px-4 py-2 text-right font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {rows.map((lead) => (
                  <tr key={lead.id} className="hover:bg-steel-50">
                    <td className="px-4 py-2.5">
                      <Link to={`/leads/${lead.id}`} className="font-medium text-steel-900 hover:underline">
                        {lead.name}
                      </Link>
                      <p className="text-xs text-steel-500">{lead.phone || lead.email}</p>
                    </td>
                    <td className="max-w-xs px-4 py-2.5">
                      <p className="truncate text-steel-700">{lead.description || '—'}</p>
                      <p className="truncate text-xs text-steel-500">{lead.address}</p>
                    </td>
                    <td className="px-4 py-2.5 text-steel-600">{SOURCE_LABELS[lead.source]}</td>
                    <td className="px-4 py-2.5">
                      <StageBadge stage={lead.stage} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-steel-700">
                      {estimateValue(lead.id, snapshot.estimates)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-steel-500">{shortDate(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-steel-100 md:hidden">
              {rows.map((lead) => (
                <li key={lead.id}>
                  <Link to={`/leads/${lead.id}`} className="block px-4 py-3 hover:bg-steel-50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-steel-900">{lead.name}</p>
                      <StageBadge stage={lead.stage} />
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-steel-500">
                      {lead.description || lead.address || '—'}
                    </p>
                    <p className="mt-1 text-xs text-steel-400">
                      {SOURCE_LABELS[lead.source]} · {shortDate(lead.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

function estimateValue(leadId: string, estimates: Estimate[]): string {
  const totals = estimates
    .filter((estimate) => estimate.leadId === leadId)
    .map((estimate) => documentTotal(estimate.lineItems));
  return totals.length === 0 ? '—' : currency(Math.max(...totals));
}
