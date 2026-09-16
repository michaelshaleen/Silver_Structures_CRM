import type {
  Attachment,
  Estimate,
  Invoice,
  Job,
  Lead,
  Note,
  Snapshot,
} from '../types';
import type { NormalizedLead } from './leadIntake';

export type NewEstimate = Omit<Estimate, 'id' | 'createdAt' | 'updatedAt'>;
export type NewJob = Omit<Job, 'id' | 'createdAt' | 'updatedAt'>;
export type NewInvoice = Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>;
export type NewAttachment = Omit<Attachment, 'id' | 'createdAt'>;

/**
 * Everything the UI is allowed to do to the data, in one interface.
 * `localRepository` implements it against localStorage; `supabaseRepository`
 * implements it against Postgres + Storage. The UI never imports either
 * directly — it goes through `getRepository()` in ./index.
 */
export interface CrmRepository {
  readonly kind: 'local' | 'supabase';

  /** One read of everything. The dataset is a single owner-operator's book of work. */
  load(): Promise<Snapshot>;

  createLead(lead: NormalizedLead): Promise<Lead>;
  updateLead(id: string, patch: Partial<Lead>): Promise<Lead>;
  deleteLead(id: string): Promise<void>;

  addNote(leadId: string, body: string): Promise<Note>;
  deleteNote(id: string): Promise<void>;

  addAttachment(input: NewAttachment, file?: File): Promise<Attachment>;
  deleteAttachment(id: string): Promise<void>;

  createEstimate(input: NewEstimate): Promise<Estimate>;
  updateEstimate(id: string, patch: Partial<Estimate>): Promise<Estimate>;
  deleteEstimate(id: string): Promise<void>;

  createJob(input: NewJob): Promise<Job>;
  updateJob(id: string, patch: Partial<Job>): Promise<Job>;
  deleteJob(id: string): Promise<void>;

  createInvoice(input: NewInvoice): Promise<Invoice>;
  updateInvoice(id: string, patch: Partial<Invoice>): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;

  /** Wipes and reloads the demo data. Local mode only; a no-op on Supabase. */
  reset?(): Promise<void>;
}
