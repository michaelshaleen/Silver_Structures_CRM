import { Badge } from './ui';
import { STAGE_LABELS, type EstimateStatus, type InvoiceStatus, type JobStatus, type Stage } from '../types';

const STAGE_TONES: Record<Stage, 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'violet'> = {
  new_lead: 'blue',
  contacted: 'blue',
  estimate_sent: 'amber',
  won: 'violet',
  lost: 'red',
  in_progress: 'amber',
  completed: 'green',
  invoiced: 'violet',
  paid: 'green',
};

export function StageBadge({ stage }: { stage: Stage }) {
  return <Badge tone={STAGE_TONES[stage]}>{STAGE_LABELS[stage]}</Badge>;
}

export function EstimateStatusBadge({ status }: { status: EstimateStatus }) {
  const tone = { draft: 'neutral', sent: 'amber', accepted: 'green', declined: 'red' } as const;
  const label = { draft: 'Draft', sent: 'Sent', accepted: 'Accepted', declined: 'Declined' };
  return <Badge tone={tone[status]}>{label[status]}</Badge>;
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const tone = { scheduled: 'blue', in_progress: 'amber', completed: 'green' } as const;
  const label = { scheduled: 'Scheduled', in_progress: 'In progress', completed: 'Completed' };
  return <Badge tone={tone[status]}>{label[status]}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const tone = { draft: 'neutral', sent: 'amber', paid: 'green', overdue: 'red' } as const;
  const label = { draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue' };
  return <Badge tone={tone[status]}>{label[status]}</Badge>;
}
