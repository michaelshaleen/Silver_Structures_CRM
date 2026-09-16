import type { Estimate, Invoice, Job, LineItem, Snapshot, Stage } from '../types';

export function lineTotal(item: LineItem): number {
  return (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
}

export function documentTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

export function nextNumber(existing: string[], prefix: string, start: number): string {
  const highest = existing.reduce((max, value) => {
    const match = value.match(/(\d+)\s*$/);
    const parsed = match ? Number(match[1]) : NaN;
    return Number.isFinite(parsed) && parsed > max ? parsed : max;
  }, start - 1);
  return `${prefix}-${highest + 1}`;
}

export function estimatesForLead(snapshot: Snapshot, leadId: string): Estimate[] {
  return snapshot.estimates.filter((estimate) => estimate.leadId === leadId);
}

export function jobsForLead(snapshot: Snapshot, leadId: string): Job[] {
  return snapshot.jobs.filter((job) => job.leadId === leadId);
}

export function invoicesForLead(snapshot: Snapshot, leadId: string): Invoice[] {
  return snapshot.invoices.filter((invoice) => invoice.leadId === leadId);
}

export function stageCounts(snapshot: Snapshot): Record<Stage, number> {
  const counts = {} as Record<Stage, number>;
  for (const lead of snapshot.leads) {
    counts[lead.stage] = (counts[lead.stage] ?? 0) + 1;
  }
  return counts;
}

export function outstandingInvoiceTotal(snapshot: Snapshot): number {
  return snapshot.invoices
    .filter((invoice) => invoice.status === 'sent' || invoice.status === 'overdue')
    .reduce((sum, invoice) => sum + documentTotal(invoice.lineItems), 0);
}

export function paidThisMonth(snapshot: Snapshot): number {
  const now = new Date();
  return snapshot.invoices
    .filter((invoice) => {
      if (invoice.status !== 'paid') return false;
      const issued = new Date(invoice.issueDate);
      return (
        issued.getFullYear() === now.getFullYear() && issued.getMonth() === now.getMonth()
      );
    })
    .reduce((sum, invoice) => sum + documentTotal(invoice.lineItems), 0);
}

export function upcomingJobs(snapshot: Snapshot, withinDays = 45): Job[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = today.getTime() + withinDays * 86_400_000;

  return snapshot.jobs
    .filter((job) => {
      if (!job.startDate || job.status === 'completed') return false;
      const start = new Date(`${job.startDate}T00:00:00`).getTime();
      return start >= today.getTime() && start <= horizon;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function activeJobs(snapshot: Snapshot): Job[] {
  return snapshot.jobs.filter((job) => job.status === 'in_progress');
}
