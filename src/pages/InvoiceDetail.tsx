import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../state/store';
import type { Invoice, InvoiceStatus } from '../types';
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
import { InvoiceStatusBadge } from '../components/StatusBadges';
import { LineItemsEditor } from '../components/LineItemsEditor';

const STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

export function InvoiceDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { snapshot, loading, updateInvoice, setInvoiceStatus, deleteInvoice } = useStore();

  const invoice = snapshot.invoices.find((row) => row.id === id);
  const lead = snapshot.leads.find((row) => row.id === invoice?.leadId);
  const job = snapshot.jobs.find((row) => row.id === invoice?.jobId);
  const estimate = snapshot.estimates.find((row) => row.id === job?.estimateId);
  const [draft, setDraft] = useState<Invoice | null>(invoice ?? null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDraft(invoice ?? null);
  }, [invoice]);

  if (loading) return <p className="py-12 text-center text-sm text-steel-500">Loading…</p>;
  if (!invoice || !draft) {
    return (
      <EmptyState
        title="Invoice not found"
        action={<Button onClick={() => navigate('/invoices')}>Back to invoices</Button>}
      />
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(invoice);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/invoices" className="text-xs text-steel-500 hover:text-steel-800">
            ← All invoices
          </Link>
          <h1 className="text-xl font-semibold text-steel-900">{invoice.number}</h1>
          <p className="text-xs text-steel-500">
            {lead ? (
              <Link to={`/leads/${lead.id}`} className="hover:underline">
                {lead.name}
              </Link>
            ) : (
              'Unknown client'
            )}{' '}
            · <InvoiceStatusBadge status={invoice.status} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/print/invoice/${invoice.id}`}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-steel-800 ring-1 ring-steel-300 hover:bg-steel-50"
          >
            Print / PDF
          </Link>
          <Button variant="primary" disabled={!dirty} onClick={() => void updateInvoice(invoice.id, draft)}>
            {dirty ? 'Save changes' : 'Saved'}
          </Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-steel-600">Status:</span>
          {STATUSES.map((option) => (
            <Button
              key={option.value}
              variant={invoice.status === option.value ? 'primary' : 'secondary'}
              onClick={() => void setInvoiceStatus(invoice.id, option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Invoice details</SectionTitle>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Issue date">
            <Input
              type="date"
              value={draft.issueDate}
              onChange={(event) => setDraft({ ...draft, issueDate: event.target.value })}
            />
          </Field>
          <Field label="Due date">
            <Input
              type="date"
              value={draft.dueDate}
              onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Payment link"
              hint="Paste whatever link you're using — Stripe, Square, PayPal, Venmo. It just gets shown on the invoice; nothing is processed here."
            >
              <Input
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={draft.paymentLink}
                onChange={(event) => setDraft({ ...draft, paymentLink: event.target.value })}
              />
            </Field>
            {invoice.paymentLink ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a
                  href={invoice.paymentLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-steel-600 underline hover:text-steel-900"
                >
                  Open link
                </a>
                <Button
                  onClick={async () => {
                    await navigator.clipboard?.writeText(invoice.paymentLink);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <Field label="Notes" hint="Shows on the printed invoice.">
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
            <div className="flex items-center gap-2">
              {estimate ? (
                <Button
                  onClick={() =>
                    setDraft({
                      ...draft,
                      lineItems: estimate.lineItems.map((item) => ({ ...item })),
                    })
                  }
                >
                  Pull from {estimate.number}
                </Button>
              ) : null}
              <span className="text-sm text-steel-500">{currency(documentTotal(draft.lineItems))}</span>
            </div>
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
          label="Delete invoice"
          confirmLabel={`Delete ${invoice.number}?`}
          onConfirm={async () => {
            await deleteInvoice(invoice.id);
            navigate('/invoices');
          }}
        />
      </div>
    </div>
  );
}
