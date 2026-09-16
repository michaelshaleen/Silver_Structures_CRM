import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../state/store';
import type { Estimate, EstimateStatus } from '../types';
import { documentTotal } from '../lib/derive';
import { currency } from '../lib/format';
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
import { EstimateStatusBadge } from '../components/StatusBadges';
import { LineItemsEditor } from '../components/LineItemsEditor';

const NEXT_STATUS: { value: EstimateStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
];

export function EstimateDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const {
    snapshot,
    loading,
    updateEstimate,
    setEstimateStatus,
    deleteEstimate,
    createJobFromEstimate,
  } = useStore();

  const estimate = snapshot.estimates.find((row) => row.id === id);
  const lead = snapshot.leads.find((row) => row.id === estimate?.leadId);
  const job = snapshot.jobs.find((row) => row.estimateId === id);
  const [draft, setDraft] = useState<Estimate | null>(estimate ?? null);

  useEffect(() => {
    setDraft(estimate ?? null);
  }, [estimate]);

  if (loading) return <p className="py-12 text-center text-sm text-steel-500">Loading…</p>;
  if (!estimate || !draft) {
    return (
      <EmptyState
        title="Estimate not found"
        action={<Button onClick={() => navigate('/estimates')}>Back to estimates</Button>}
      />
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(estimate);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/estimates" className="text-xs text-steel-500 hover:text-steel-800">
            ← All estimates
          </Link>
          <h1 className="text-xl font-semibold text-steel-900">{estimate.number}</h1>
          <p className="text-xs text-steel-500">
            {lead ? (
              <Link to={`/leads/${lead.id}`} className="hover:underline">
                {lead.name}
              </Link>
            ) : (
              'Unknown client'
            )}{' '}
            · <EstimateStatusBadge status={estimate.status} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/print/estimate/${estimate.id}`}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-steel-800 ring-1 ring-steel-300 hover:bg-steel-50"
          >
            Print / PDF
          </Link>
          <Button variant="primary" disabled={!dirty} onClick={() => void updateEstimate(estimate.id, draft)}>
            {dirty ? 'Save changes' : 'Saved'}
          </Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-steel-600">Status:</span>
          {NEXT_STATUS.map((option) => (
            <Button
              key={option.value}
              variant={estimate.status === option.value ? 'primary' : 'secondary'}
              onClick={() => void setEstimateStatus(estimate.id, option.value)}
            >
              {option.label}
            </Button>
          ))}
          <span className="grow" />
          {job ? (
            <Link
              to={`/jobs/${job.id}`}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-steel-800 ring-1 ring-steel-300 hover:bg-steel-50"
            >
              Go to job →
            </Link>
          ) : (
            <Button
              onClick={async () => {
                const created = await createJobFromEstimate(estimate.id);
                navigate(`/jobs/${created.id}`);
              }}
            >
              Accept &amp; schedule job
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle>Estimate details</SectionTitle>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Title">
            <Input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </Field>
          <Field label="Issue date">
            <Input
              type="date"
              value={draft.issueDate}
              onChange={(event) => setDraft({ ...draft, issueDate: event.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes / terms" hint="Shows on the printed estimate.">
              <Textarea
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle
          action={
            <span className="text-sm text-steel-500">
              {currency(documentTotal(draft.lineItems))}
            </span>
          }
        >
          Line items
        </SectionTitle>
        <LineItemsEditor
          items={draft.lineItems}
          onChange={(lineItems) => setDraft({ ...draft, lineItems })}
        />
      </Card>

      <div className="flex justify-end">
        <ConfirmButton
          label="Delete estimate"
          confirmLabel={`Delete ${estimate.number}?`}
          onConfirm={async () => {
            await deleteEstimate(estimate.id);
            navigate('/estimates');
          }}
        />
      </div>
    </div>
  );
}
