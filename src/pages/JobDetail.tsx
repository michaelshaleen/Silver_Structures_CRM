import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../state/store';
import type { Job, JobStatus } from '../types';
import { documentTotal } from '../lib/derive';
import { currency, shortDate } from '../lib/format';
import {
  Button,
  Card,
  ConfirmButton,
  EmptyState,
  Field,
  Input,
  SectionTitle,
  Textarea,
} from '../components/ui';
import { InvoiceStatusBadge, JobStatusBadge } from '../components/StatusBadges';
import { AttachmentGrid } from '../components/Attachments';

const STATUSES: { value: JobStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

export function JobDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { snapshot, loading, updateJob, setJobStatus, deleteJob, createInvoiceFromJob } = useStore();

  const job = snapshot.jobs.find((row) => row.id === id);
  const lead = snapshot.leads.find((row) => row.id === job?.leadId);
  const estimate = snapshot.estimates.find((row) => row.id === job?.estimateId);
  const invoices = snapshot.invoices.filter((row) => row.jobId === id);
  const [draft, setDraft] = useState<Job | null>(job ?? null);

  useEffect(() => {
    setDraft(job ?? null);
  }, [job]);

  if (loading) return <p className="py-12 text-center text-sm text-steel-500">Loading…</p>;
  if (!job || !draft) {
    return (
      <EmptyState
        title="Job not found"
        action={<Button onClick={() => navigate('/jobs')}>Back to jobs</Button>}
      />
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(job);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/jobs" className="text-xs text-steel-500 hover:text-steel-800">
            ← All jobs
          </Link>
          <h1 className="truncate text-xl font-semibold text-steel-900">{job.title}</h1>
          <p className="text-xs text-steel-500">
            {lead ? (
              <Link to={`/leads/${lead.id}`} className="hover:underline">
                {lead.name}
              </Link>
            ) : (
              'Unknown client'
            )}{' '}
            · <JobStatusBadge status={job.status} />
          </p>
        </div>
        <Button variant="primary" disabled={!dirty} onClick={() => void updateJob(job.id, draft)}>
          {dirty ? 'Save changes' : 'Saved'}
        </Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-steel-600">Status:</span>
          {STATUSES.map((option) => (
            <Button
              key={option.value}
              variant={job.status === option.value ? 'primary' : 'secondary'}
              onClick={() => void setJobStatus(job.id, option.value)}
            >
              {option.label}
            </Button>
          ))}
          <span className="grow" />
          <Button
            onClick={async () => {
              const invoice = await createInvoiceFromJob(job.id);
              navigate(`/invoices/${invoice.id}`);
            }}
          >
            + Invoice this job
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <SectionTitle>Schedule &amp; notes</SectionTitle>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <Field label="Job title">
                <Input
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start">
                  <Input
                    type="date"
                    value={draft.startDate}
                    onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
                  />
                </Field>
                <Field label="End">
                  <Input
                    type="date"
                    value={draft.endDate}
                    onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Job notes" hint="Materials, change orders, what's left to do.">
                  <Textarea
                    value={draft.notes}
                    onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>Before photos</SectionTitle>
            <AttachmentGrid
              ownerType="job"
              ownerId={job.id}
              kind="before"
              label="Before"
              emptyText="Shoot the space before demo — useful for change-order disputes."
            />
          </Card>

          <Card>
            <SectionTitle>After photos</SectionTitle>
            <AttachmentGrid
              ownerType="job"
              ownerId={job.id}
              kind="after"
              label="After"
              emptyText="Finished work — the stuff worth putting on Instagram."
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionTitle>Source estimate</SectionTitle>
            {estimate ? (
              <Link
                to={`/estimates/${estimate.id}`}
                className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-steel-50"
              >
                <div>
                  <p className="text-sm font-medium text-steel-900">{estimate.number}</p>
                  <p className="text-xs text-steel-500">{estimate.title}</p>
                </div>
                <span className="text-sm tabular-nums text-steel-800">
                  {currency(documentTotal(estimate.lineItems))}
                </span>
              </Link>
            ) : (
              <p className="px-4 py-4 text-sm text-steel-500">
                This job wasn't created from an estimate.
              </p>
            )}
          </Card>

          <Card>
            <SectionTitle>Invoices</SectionTitle>
            {invoices.length === 0 ? (
              <p className="px-4 py-4 text-sm text-steel-500">None yet.</p>
            ) : (
              <ul className="divide-y divide-steel-100">
                {invoices.map((invoice) => (
                  <li key={invoice.id}>
                    <Link
                      to={`/invoices/${invoice.id}`}
                      className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-steel-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-steel-900">{invoice.number}</p>
                        <p className="text-xs text-steel-500">Due {shortDate(invoice.dueDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm tabular-nums text-steel-800">
                          {currency(documentTotal(invoice.lineItems))}
                        </p>
                        <InvoiceStatusBadge status={invoice.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="flex justify-end">
            <ConfirmButton
              label="Delete job"
              confirmLabel={`Delete ${job.title} and its invoices?`}
              onConfirm={async () => {
                await deleteJob(job.id);
                navigate('/jobs');
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
