import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../state/store';
import {
  LEAD_SOURCES,
  PIPELINE_STAGES,
  SOURCE_LABELS,
  STAGE_LABELS,
  type Lead,
  type Stage,
} from '../types';
import {
  documentTotal,
  estimatesForLead,
  invoicesForLead,
  jobsForLead,
} from '../lib/derive';
import { currency, dateTime, phoneHref, shortDate } from '../lib/format';
import {
  Button,
  Card,
  ConfirmButton,
  EmptyState,
  Field,
  Input,
  SectionTitle,
  Select,
  Textarea,
} from '../components/ui';
import {
  EstimateStatusBadge,
  InvoiceStatusBadge,
  JobStatusBadge,
} from '../components/StatusBadges';
import { AttachmentGrid } from '../components/Attachments';

export function LeadDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const {
    snapshot,
    loading,
    updateLead,
    deleteLead,
    setLeadStage,
    addNote,
    deleteNote,
    createEstimate,
    createJob,
  } = useStore();

  const lead = snapshot.leads.find((row) => row.id === id);
  const [draft, setDraft] = useState<Lead | null>(lead ?? null);
  const [noteBody, setNoteBody] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setDraft(lead ?? null);
  }, [lead]);

  const estimates = useMemo(() => (lead ? estimatesForLead(snapshot, lead.id) : []), [snapshot, lead]);
  const jobs = useMemo(() => (lead ? jobsForLead(snapshot, lead.id) : []), [snapshot, lead]);
  const invoices = useMemo(() => (lead ? invoicesForLead(snapshot, lead.id) : []), [snapshot, lead]);
  const notes = snapshot.notes.filter((note) => note.leadId === id);

  if (loading) return <p className="py-12 text-center text-sm text-steel-500">Loading…</p>;
  if (!lead || !draft) {
    return (
      <EmptyState
        title="Lead not found"
        body="It may have been deleted."
        action={<Button onClick={() => navigate('/leads')}>Back to leads</Button>}
      />
    );
  }

  const dirty =
    draft.name !== lead.name ||
    draft.email !== lead.email ||
    draft.phone !== lead.phone ||
    draft.address !== lead.address ||
    draft.description !== lead.description ||
    draft.source !== lead.source;

  async function save() {
    if (!draft) return;
    await updateLead(draft.id, {
      name: draft.name,
      email: draft.email,
      phone: draft.phone,
      address: draft.address,
      description: draft.description,
      source: draft.source,
    });
    setSavedAt(new Date().toLocaleTimeString());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/leads" className="text-xs text-steel-500 hover:text-steel-800">
            ← All leads
          </Link>
          <h1 className="truncate text-xl font-semibold text-steel-900">{lead.name}</h1>
          <p className="text-xs text-steel-500">
            Added {shortDate(lead.createdAt)} · {SOURCE_LABELS[lead.source]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            aria-label="Pipeline stage"
            value={lead.stage}
            className="w-auto"
            onChange={(event) => void setLeadStage(lead.id, event.target.value as Stage)}
          >
            {PIPELINE_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {lead.phone ? (
          <a
            href={phoneHref(lead.phone)}
            className="rounded-lg bg-steel-900 px-3 py-2 text-sm font-medium text-white"
          >
            Call {lead.phone}
          </a>
        ) : null}
        {lead.email ? (
          <a
            href={`mailto:${lead.email}`}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-steel-800 ring-1 ring-steel-300"
          >
            Email
          </a>
        ) : null}
        {lead.address ? (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(lead.address)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-steel-800 ring-1 ring-steel-300"
          >
            Directions
          </a>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <SectionTitle
              action={
                <div className="flex items-center gap-2">
                  {savedAt && !dirty ? (
                    <span className="text-xs text-steel-400">Saved {savedAt}</span>
                  ) : null}
                  <Button variant="primary" disabled={!dirty} onClick={() => void save()}>
                    Save
                  </Button>
                </div>
              }
            >
              Details
            </SectionTitle>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </Field>
              <Field label="Lead source">
                <Select
                  value={draft.source}
                  onChange={(event) =>
                    setDraft({ ...draft, source: event.target.value as Lead['source'] })
                  }
                >
                  {LEAD_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {SOURCE_LABELS[source]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                />
              </Field>
              <Field label="Phone">
                <Input
                  type="tel"
                  value={draft.phone}
                  onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Project address">
                  <Input
                    value={draft.address}
                    onChange={(event) => setDraft({ ...draft, address: event.target.value })}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Project description">
                  <Textarea
                    value={draft.description}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>Activity notes</SectionTitle>
            <div className="space-y-3 p-4">
              <Textarea
                value={noteBody}
                placeholder="What happened? Calls, site visits, decisions…"
                onChange={(event) => setNoteBody(event.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  disabled={!noteBody.trim()}
                  onClick={async () => {
                    await addNote(lead.id, noteBody);
                    setNoteBody('');
                  }}
                >
                  Add note
                </Button>
              </div>
            </div>
            {notes.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-steel-500">No notes yet.</p>
            ) : (
              <ul className="divide-y divide-steel-100 border-t border-steel-200">
                {notes.map((note) => (
                  <li key={note.id} className="group px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm whitespace-pre-wrap text-steel-800">{note.body}</p>
                      <button
                        type="button"
                        aria-label="Delete note"
                        className="shrink-0 text-xs text-steel-300 hover:text-red-600"
                        onClick={() => void deleteNote(note.id)}
                      >
                        ✕
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-steel-400">{dateTime(note.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <SectionTitle>Files &amp; photos</SectionTitle>
            <AttachmentGrid
              ownerType="lead"
              ownerId={lead.id}
              kind="file"
              label="Attachments"
              emptyText="Plans, inspiration photos, insurance paperwork — anything tied to this client."
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionTitle
              action={
                <Button
                  onClick={async () => {
                    const estimate = await createEstimate(lead.id, lead.description.slice(0, 60) || 'Estimate');
                    navigate(`/estimates/${estimate.id}`);
                  }}
                >
                  + New
                </Button>
              }
            >
              Estimates
            </SectionTitle>
            {estimates.length === 0 ? (
              <p className="px-4 py-4 text-sm text-steel-500">No estimates yet.</p>
            ) : (
              <ul className="divide-y divide-steel-100">
                {estimates.map((estimate) => (
                  <li key={estimate.id}>
                    <Link
                      to={`/estimates/${estimate.id}`}
                      className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-steel-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-steel-900">
                          {estimate.number}
                        </p>
                        <p className="truncate text-xs text-steel-500">{estimate.title}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm tabular-nums text-steel-800">
                          {currency(documentTotal(estimate.lineItems))}
                        </p>
                        <EstimateStatusBadge status={estimate.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <SectionTitle
              action={
                <Button
                  onClick={async () => {
                    const job = await createJob(lead.id, lead.description.slice(0, 60) || 'Job');
                    navigate(`/jobs/${job.id}`);
                  }}
                >
                  + New
                </Button>
              }
            >
              Jobs
            </SectionTitle>
            {jobs.length === 0 ? (
              <p className="px-4 py-4 text-sm text-steel-500">No jobs yet.</p>
            ) : (
              <ul className="divide-y divide-steel-100">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-steel-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-steel-900">{job.title}</p>
                        <p className="text-xs text-steel-500">
                          {shortDate(job.startDate)} → {shortDate(job.endDate)}
                        </p>
                      </div>
                      <JobStatusBadge status={job.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <SectionTitle>Invoices</SectionTitle>
            {invoices.length === 0 ? (
              <p className="px-4 py-4 text-sm text-steel-500">
                Invoices are created from a job.
              </p>
            ) : (
              <ul className="divide-y divide-steel-100">
                {invoices.map((invoice) => (
                  <li key={invoice.id}>
                    <Link
                      to={`/invoices/${invoice.id}`}
                      className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-steel-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-steel-900">
                          {invoice.number}
                        </p>
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
              label="Delete lead"
              confirmLabel={`Delete ${lead.name} and everything attached to them?`}
              onConfirm={async () => {
                await deleteLead(lead.id);
                navigate('/leads');
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
