/**
 * Supabase implementation of CrmRepository.
 *
 * Unused until VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set. Run
 * supabase/schema.sql in the Supabase SQL editor first — the column names below
 * match it exactly (snake_case in Postgres, camelCase in the app).
 */
import type {
  Attachment,
  Estimate,
  Invoice,
  Job,
  Lead,
  Note,
  Snapshot,
} from '../types';
import type {
  CrmRepository,
  NewAttachment,
  NewEstimate,
  NewInvoice,
  NewJob,
} from './repository';
import type { NormalizedLead } from './leadIntake';
import { supabase } from './supabaseClient';

const BUCKET = 'attachments';

type Row = Record<string, unknown>;

/** Supabase's untyped client hands back `any`; this narrows it in one place. */
function unwrap<T = Row>(result: { data: unknown; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null || result.data === undefined) {
    throw new Error('Supabase returned no rows.');
  }
  return result.data as T;
}

const toLead = (row: Row): Lead => ({
  id: row.id as string,
  name: row.name as string,
  email: (row.email as string) ?? '',
  phone: (row.phone as string) ?? '',
  address: (row.address as string) ?? '',
  description: (row.description as string) ?? '',
  source: row.source as Lead['source'],
  stage: row.stage as Lead['stage'],
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const fromLead = (lead: Partial<Lead>): Row => ({
  ...(lead.name !== undefined && { name: lead.name }),
  ...(lead.email !== undefined && { email: lead.email }),
  ...(lead.phone !== undefined && { phone: lead.phone }),
  ...(lead.address !== undefined && { address: lead.address }),
  ...(lead.description !== undefined && { description: lead.description }),
  ...(lead.source !== undefined && { source: lead.source }),
  ...(lead.stage !== undefined && { stage: lead.stage }),
  ...(lead.createdAt !== undefined && { created_at: lead.createdAt }),
  updated_at: new Date().toISOString(),
});

const toEstimate = (row: Row): Estimate => ({
  id: row.id as string,
  leadId: row.lead_id as string,
  number: row.number as string,
  title: (row.title as string) ?? '',
  issueDate: row.issue_date as string,
  status: row.status as Estimate['status'],
  notes: (row.notes as string) ?? '',
  lineItems: (row.line_items as Estimate['lineItems']) ?? [],
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const fromEstimate = (est: Partial<Estimate>): Row => ({
  ...(est.leadId !== undefined && { lead_id: est.leadId }),
  ...(est.number !== undefined && { number: est.number }),
  ...(est.title !== undefined && { title: est.title }),
  ...(est.issueDate !== undefined && { issue_date: est.issueDate }),
  ...(est.status !== undefined && { status: est.status }),
  ...(est.notes !== undefined && { notes: est.notes }),
  ...(est.lineItems !== undefined && { line_items: est.lineItems }),
  updated_at: new Date().toISOString(),
});

const toJob = (row: Row): Job => ({
  id: row.id as string,
  leadId: row.lead_id as string,
  estimateId: (row.estimate_id as string) ?? null,
  title: (row.title as string) ?? '',
  startDate: (row.start_date as string) ?? '',
  endDate: (row.end_date as string) ?? '',
  status: row.status as Job['status'],
  notes: (row.notes as string) ?? '',
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const fromJob = (job: Partial<Job>): Row => ({
  ...(job.leadId !== undefined && { lead_id: job.leadId }),
  ...(job.estimateId !== undefined && { estimate_id: job.estimateId }),
  ...(job.title !== undefined && { title: job.title }),
  ...(job.startDate !== undefined && { start_date: job.startDate || null }),
  ...(job.endDate !== undefined && { end_date: job.endDate || null }),
  ...(job.status !== undefined && { status: job.status }),
  ...(job.notes !== undefined && { notes: job.notes }),
  updated_at: new Date().toISOString(),
});

const toInvoice = (row: Row): Invoice => ({
  id: row.id as string,
  jobId: row.job_id as string,
  leadId: row.lead_id as string,
  number: row.number as string,
  issueDate: row.issue_date as string,
  dueDate: (row.due_date as string) ?? '',
  status: row.status as Invoice['status'],
  paymentLink: (row.payment_link as string) ?? '',
  notes: (row.notes as string) ?? '',
  lineItems: (row.line_items as Invoice['lineItems']) ?? [],
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const fromInvoice = (inv: Partial<Invoice>): Row => ({
  ...(inv.jobId !== undefined && { job_id: inv.jobId }),
  ...(inv.leadId !== undefined && { lead_id: inv.leadId }),
  ...(inv.number !== undefined && { number: inv.number }),
  ...(inv.issueDate !== undefined && { issue_date: inv.issueDate }),
  ...(inv.dueDate !== undefined && { due_date: inv.dueDate || null }),
  ...(inv.status !== undefined && { status: inv.status }),
  ...(inv.paymentLink !== undefined && { payment_link: inv.paymentLink }),
  ...(inv.notes !== undefined && { notes: inv.notes }),
  ...(inv.lineItems !== undefined && { line_items: inv.lineItems }),
  updated_at: new Date().toISOString(),
});

const toNote = (row: Row): Note => ({
  id: row.id as string,
  leadId: row.lead_id as string,
  body: row.body as string,
  createdAt: row.created_at as string,
});

const toAttachment = (row: Row): Attachment => ({
  id: row.id as string,
  ownerType: row.owner_type as Attachment['ownerType'],
  // owner_ref points at the lead or job; owner_id is the auth user (RLS).
  ownerId: row.owner_ref as string,
  kind: row.kind as Attachment['kind'],
  name: row.name as string,
  mimeType: (row.mime_type as string) ?? '',
  size: (row.size as number) ?? 0,
  url: (row.url as string) ?? '',
  createdAt: row.created_at as string,
});

export const supabaseRepository: CrmRepository = {
  kind: 'supabase',

  async load(): Promise<Snapshot> {
    const db = supabase();
    const [leads, notes, attachments, estimates, jobs, invoices] = await Promise.all([
      db.from('leads').select('*').order('created_at', { ascending: false }),
      db.from('notes').select('*').order('created_at', { ascending: false }),
      db.from('attachments').select('*').order('created_at', { ascending: false }),
      db.from('estimates').select('*').order('created_at', { ascending: false }),
      db.from('jobs').select('*').order('created_at', { ascending: false }),
      db.from('invoices').select('*').order('created_at', { ascending: false }),
    ]);

    return {
      leads: unwrap<Row[]>(leads).map(toLead),
      notes: unwrap<Row[]>(notes).map(toNote),
      attachments: unwrap<Row[]>(attachments).map(toAttachment),
      estimates: unwrap<Row[]>(estimates).map(toEstimate),
      jobs: unwrap<Row[]>(jobs).map(toJob),
      invoices: unwrap<Row[]>(invoices).map(toInvoice),
    };
  },

  async createLead(lead: NormalizedLead) {
    const data = unwrap(
      await supabase().from('leads').insert(fromLead(lead)).select().single(),
    );
    return toLead(data);
  },

  async updateLead(id, patch) {
    const data = unwrap(
      await supabase().from('leads').update(fromLead(patch)).eq('id', id).select().single(),
    );
    return toLead(data);
  },

  async deleteLead(id) {
    const { error } = await supabase().from('leads').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async addNote(leadId, body) {
    const data = unwrap(
      await supabase().from('notes').insert({ lead_id: leadId, body }).select().single(),
    );
    return toNote(data);
  },

  async deleteNote(id) {
    const { error } = await supabase().from('notes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async addAttachment(input: NewAttachment, file?: File) {
    let url = input.url;

    if (file) {
      const path = `${input.ownerType}/${input.ownerId}/${Date.now()}-${file.name}`;
      const upload = await supabase().storage.from(BUCKET).upload(path, file, { upsert: false });
      if (upload.error) throw new Error(upload.error.message);
      url = supabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }

    const data = unwrap(
      await supabase()
        .from('attachments')
        .insert({
          owner_type: input.ownerType,
          owner_ref: input.ownerId,
          kind: input.kind,
          name: input.name,
          mime_type: input.mimeType,
          size: input.size,
          url,
        })
        .select()
        .single(),
    );
    return toAttachment(data);
  },

  async deleteAttachment(id) {
    const { error } = await supabase().from('attachments').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async createEstimate(input: NewEstimate) {
    const data = unwrap(
      await supabase().from('estimates').insert(fromEstimate(input)).select().single(),
    );
    return toEstimate(data);
  },

  async updateEstimate(id, patch) {
    const data = unwrap(
      await supabase().from('estimates').update(fromEstimate(patch)).eq('id', id).select().single(),
    );
    return toEstimate(data);
  },

  async deleteEstimate(id) {
    const { error } = await supabase().from('estimates').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async createJob(input: NewJob) {
    const data = unwrap(await supabase().from('jobs').insert(fromJob(input)).select().single());
    return toJob(data);
  },

  async updateJob(id, patch) {
    const data = unwrap(
      await supabase().from('jobs').update(fromJob(patch)).eq('id', id).select().single(),
    );
    return toJob(data);
  },

  async deleteJob(id) {
    const { error } = await supabase().from('jobs').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async createInvoice(input: NewInvoice) {
    const data = unwrap(
      await supabase().from('invoices').insert(fromInvoice(input)).select().single(),
    );
    return toInvoice(data);
  },

  async updateInvoice(id, patch) {
    const data = unwrap(
      await supabase().from('invoices').update(fromInvoice(patch)).eq('id', id).select().single(),
    );
    return toInvoice(data);
  },

  async deleteInvoice(id) {
    const { error } = await supabase().from('invoices').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
