import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { COMPANY } from '../config';
import type { LineItem } from '../types';
import { documentTotal, lineTotal } from '../lib/derive';
import { currency, shortDate } from '../lib/format';
import { Button, EmptyState } from '../components/ui';

/**
 * The printable estimate / invoice. "Save as PDF" in the browser's print
 * dialog is the PDF export — no PDF library, and it prints identically from
 * a phone.
 */
export function PrintDocument() {
  const { kind = 'estimate', id = '' } = useParams();
  const navigate = useNavigate();
  const { snapshot, loading } = useStore();

  const isInvoice = kind === 'invoice';
  const estimate = snapshot.estimates.find((row) => row.id === id);
  const invoice = snapshot.invoices.find((row) => row.id === id);
  const doc = isInvoice ? invoice : estimate;

  if (loading) return <p className="py-12 text-center text-sm text-steel-500">Loading…</p>;
  if (!doc) {
    return (
      <EmptyState
        title="Document not found"
        action={<Button onClick={() => navigate(-1)}>Go back</Button>}
      />
    );
  }

  const lead = snapshot.leads.find((row) => row.id === doc.leadId);
  const items: LineItem[] = doc.lineItems;
  const total = documentTotal(items);
  const dueDate = isInvoice ? invoice?.dueDate : undefined;
  const paymentLink = isInvoice ? invoice?.paymentLink : undefined;

  return (
    <div className="print-page min-h-full bg-steel-100 py-6">
      <div className="no-print mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 px-4">
        <Link
          to={isInvoice ? `/invoices/${doc.id}` : `/estimates/${doc.id}`}
          className="text-sm text-steel-600 hover:text-steel-900"
        >
          ← Back to {isInvoice ? 'invoice' : 'estimate'}
        </Link>
        <div className="flex items-center gap-2">
          <p className="hidden text-xs text-steel-500 sm:block">
            Choose “Save as PDF” as the destination to export.
          </p>
          <Button variant="primary" onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <article className="print-sheet mx-auto max-w-3xl bg-white p-8 shadow-sm sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-steel-300 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-steel-900">{COMPANY.name}</h1>
            <p className="text-sm text-steel-500">{COMPANY.tagline}</p>
            <p className="mt-2 text-xs leading-relaxed text-steel-600">
              {COMPANY.address}
              <br />
              {COMPANY.phone} · {COMPANY.email}
              <br />
              {COMPANY.license}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold tracking-widest text-steel-500 uppercase">
              {isInvoice ? 'Invoice' : 'Estimate'}
            </p>
            <p className="text-xl font-semibold text-steel-900">{doc.number}</p>
            <p className="mt-1 text-xs text-steel-600">Issued {shortDate(doc.issueDate)}</p>
            {dueDate ? <p className="text-xs text-steel-600">Due {shortDate(dueDate)}</p> : null}
          </div>
        </header>

        <section className="grid gap-6 border-b border-steel-200 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-widest text-steel-500 uppercase">
              Prepared for
            </p>
            <p className="mt-1 text-sm font-medium text-steel-900">{lead?.name ?? '—'}</p>
            <p className="text-sm whitespace-pre-line text-steel-600">
              {lead?.address}
              {lead?.phone ? `\n${lead.phone}` : ''}
              {lead?.email ? `\n${lead.email}` : ''}
            </p>
          </div>
          {!isInvoice && estimate?.title ? (
            <div>
              <p className="text-xs font-semibold tracking-widest text-steel-500 uppercase">
                Project
              </p>
              <p className="mt-1 text-sm text-steel-800">{estimate.title}</p>
            </div>
          ) : null}
        </section>

        <table className="w-full py-6 text-sm">
          <thead>
            <tr className="border-b border-steel-300 text-left text-xs tracking-wide text-steel-500 uppercase">
              <th className="py-2 font-semibold">Description</th>
              <th className="w-20 py-2 text-right font-semibold">Qty</th>
              <th className="w-28 py-2 text-right font-semibold">Unit</th>
              <th className="w-28 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-2.5 pr-3 text-steel-800">{item.description || '—'}</td>
                <td className="py-2.5 text-right tabular-nums text-steel-600">{item.qty}</td>
                <td className="py-2.5 text-right tabular-nums text-steel-600">
                  {currency(item.unitPrice)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-steel-900">
                  {currency(lineTotal(item))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-steel-300">
              <td colSpan={3} className="py-3 pr-4 text-right text-sm font-semibold text-steel-700">
                Total
              </td>
              <td className="py-3 text-right text-lg font-bold tabular-nums text-steel-900">
                {currency(total)}
              </td>
            </tr>
          </tfoot>
        </table>

        {paymentLink ? (
          <section className="mt-2 rounded-lg border border-steel-200 bg-steel-50 px-4 py-3">
            <p className="text-xs font-semibold tracking-widest text-steel-500 uppercase">Pay online</p>
            <p className="mt-1 text-sm break-all text-steel-800">{paymentLink}</p>
          </section>
        ) : null}

        {doc.notes ? (
          <section className="mt-6 border-t border-steel-200 pt-4">
            <p className="text-xs font-semibold tracking-widest text-steel-500 uppercase">Notes</p>
            <p className="mt-1 text-sm whitespace-pre-wrap text-steel-700">{doc.notes}</p>
          </section>
        ) : null}

        <footer className="mt-10 border-t border-steel-200 pt-4 text-xs text-steel-500">
          {isInvoice
            ? 'Thank you for your business.'
            : 'This estimate is based on the scope described above. Changes to scope may change the price.'}
        </footer>
      </article>
    </div>
  );
}
