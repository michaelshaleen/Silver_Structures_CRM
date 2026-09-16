/** Domain model for the Silver S Construction CRM. */

export const PIPELINE_STAGES = [
  'new_lead',
  'contacted',
  'estimate_sent',
  'won',
  'lost',
  'in_progress',
  'completed',
  'invoiced',
  'paid',
] as const;

export type Stage = (typeof PIPELINE_STAGES)[number];

/** Stages shown as columns on the kanban board, in pipeline order. */
export const BOARD_STAGES: Stage[] = [
  'new_lead',
  'contacted',
  'estimate_sent',
  'won',
  'in_progress',
  'completed',
  'invoiced',
  'paid',
];

export const STAGE_LABELS: Record<Stage, string> = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  estimate_sent: 'Estimate Sent',
  won: 'Won (Job Scheduled)',
  lost: 'Lost',
  in_progress: 'In Progress',
  completed: 'Completed',
  invoiced: 'Invoiced',
  paid: 'Paid',
};

export const LEAD_SOURCES = [
  'website_form',
  'instagram',
  'referral',
  'walk_in',
  'other',
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const SOURCE_LABELS: Record<LeadSource, string> = {
  website_form: 'Website form',
  instagram: 'Instagram',
  referral: 'Referral',
  walk_in: 'Walk-in',
  other: 'Other',
};

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  source: LeadSource;
  stage: Stage;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  leadId: string;
  body: string;
  createdAt: string;
}

export type AttachmentOwner = 'lead' | 'job';
export type AttachmentKind = 'file' | 'before' | 'after';

export interface Attachment {
  id: string;
  ownerType: AttachmentOwner;
  ownerId: string;
  kind: AttachmentKind;
  name: string;
  mimeType: string;
  size: number;
  /** Data URL in local mode; a Supabase Storage public/signed URL once wired up. */
  url: string;
  createdAt: string;
}

export interface LineItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'declined';

export interface Estimate {
  id: string;
  leadId: string;
  number: string;
  title: string;
  issueDate: string;
  status: EstimateStatus;
  notes: string;
  lineItems: LineItem[];
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = 'scheduled' | 'in_progress' | 'completed';

export interface Job {
  id: string;
  leadId: string;
  estimateId: string | null;
  title: string;
  startDate: string;
  endDate: string;
  status: JobStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  jobId: string;
  leadId: string;
  number: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  /** Plain URL/text the owner pastes in (Stripe, Square, PayPal, Venmo...). No processing. */
  paymentLink: string;
  notes: string;
  lineItems: LineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Snapshot {
  leads: Lead[];
  notes: Note[];
  attachments: Attachment[];
  estimates: Estimate[];
  jobs: Job[];
  invoices: Invoice[];
}

export const EMPTY_SNAPSHOT: Snapshot = {
  leads: [],
  notes: [],
  attachments: [],
  estimates: [],
  jobs: [],
  invoices: [],
};
