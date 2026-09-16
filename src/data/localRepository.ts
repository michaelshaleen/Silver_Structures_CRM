import type { Attachment, Estimate, Invoice, Job, Lead, Note, Snapshot } from '../types';
import { EMPTY_SNAPSHOT } from '../types';
import { nowIso, uid } from '../lib/id';
import type {
  CrmRepository,
  NewAttachment,
  NewEstimate,
  NewInvoice,
  NewJob,
} from './repository';
import type { NormalizedLead } from './leadIntake';
import { seedSnapshot } from './seed';

const STORAGE_KEY = 'silver-s-crm:v1';

/** Files are inlined as data URLs here, so keep them small enough for localStorage. */
export const MAX_UPLOAD_BYTES = 1_500_000;

function read(): Snapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedSnapshot();
      write(seeded);
      return seeded;
    }
    return { ...EMPTY_SNAPSHOT, ...(JSON.parse(raw) as Partial<Snapshot>) };
  } catch {
    return seedSnapshot();
  }
}

function write(snapshot: Snapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    throw new Error(
      'Local storage is full. Remove a few photo attachments, or connect Supabase for real file storage.',
    );
  }
}

function mutate<T>(fn: (snapshot: Snapshot) => T): T {
  const snapshot = read();
  const result = fn(snapshot);
  write(snapshot);
  return result;
}

function patchRow<T extends { id: string; updatedAt: string }>(
  rows: T[],
  id: string,
  patch: Partial<T>,
  label: string,
): T {
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) throw new Error(`${label} not found.`);
  const next = { ...rows[index], ...patch, id, updatedAt: nowIso() };
  rows[index] = next;
  return next;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export const localRepository: CrmRepository = {
  kind: 'local',

  async load() {
    return read();
  },

  async createLead(lead: NormalizedLead) {
    return mutate((snapshot) => {
      const row: Lead = { ...lead, id: uid('lead'), updatedAt: nowIso() };
      snapshot.leads.unshift(row);
      return row;
    });
  },

  async updateLead(id, patch) {
    return mutate((snapshot) => patchRow(snapshot.leads, id, patch, 'Lead'));
  },

  async deleteLead(id) {
    mutate((snapshot) => {
      const jobIds = snapshot.jobs.filter((job) => job.leadId === id).map((job) => job.id);
      snapshot.leads = snapshot.leads.filter((lead) => lead.id !== id);
      snapshot.notes = snapshot.notes.filter((note) => note.leadId !== id);
      snapshot.estimates = snapshot.estimates.filter((est) => est.leadId !== id);
      snapshot.invoices = snapshot.invoices.filter((inv) => inv.leadId !== id);
      snapshot.jobs = snapshot.jobs.filter((job) => job.leadId !== id);
      snapshot.attachments = snapshot.attachments.filter(
        (file) =>
          !(file.ownerType === 'lead' && file.ownerId === id) &&
          !(file.ownerType === 'job' && jobIds.includes(file.ownerId)),
      );
    });
  },

  async addNote(leadId, body) {
    return mutate((snapshot) => {
      const note: Note = { id: uid('note'), leadId, body, createdAt: nowIso() };
      snapshot.notes.unshift(note);
      return note;
    });
  },

  async deleteNote(id) {
    mutate((snapshot) => {
      snapshot.notes = snapshot.notes.filter((note) => note.id !== id);
    });
  },

  async addAttachment(input: NewAttachment, file?: File) {
    if (file && file.size > MAX_UPLOAD_BYTES) {
      throw new Error(
        `${file.name} is too large for local demo storage (limit ${Math.round(
          MAX_UPLOAD_BYTES / 1000,
        )} KB). Connect Supabase Storage for full-size photos.`,
      );
    }
    const url = file ? await fileToDataUrl(file) : input.url;
    return mutate((snapshot) => {
      const row: Attachment = { ...input, url, id: uid('file'), createdAt: nowIso() };
      snapshot.attachments.unshift(row);
      return row;
    });
  },

  async deleteAttachment(id) {
    mutate((snapshot) => {
      snapshot.attachments = snapshot.attachments.filter((file) => file.id !== id);
    });
  },

  async createEstimate(input: NewEstimate) {
    return mutate((snapshot) => {
      const row: Estimate = {
        ...input,
        id: uid('est'),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      snapshot.estimates.unshift(row);
      return row;
    });
  },

  async updateEstimate(id, patch) {
    return mutate((snapshot) => patchRow(snapshot.estimates, id, patch, 'Estimate'));
  },

  async deleteEstimate(id) {
    mutate((snapshot) => {
      snapshot.estimates = snapshot.estimates.filter((est) => est.id !== id);
      snapshot.jobs = snapshot.jobs.map((job) =>
        job.estimateId === id ? { ...job, estimateId: null } : job,
      );
    });
  },

  async createJob(input: NewJob) {
    return mutate((snapshot) => {
      const row: Job = { ...input, id: uid('job'), createdAt: nowIso(), updatedAt: nowIso() };
      snapshot.jobs.unshift(row);
      return row;
    });
  },

  async updateJob(id, patch) {
    return mutate((snapshot) => patchRow(snapshot.jobs, id, patch, 'Job'));
  },

  async deleteJob(id) {
    mutate((snapshot) => {
      snapshot.jobs = snapshot.jobs.filter((job) => job.id !== id);
      snapshot.invoices = snapshot.invoices.filter((inv) => inv.jobId !== id);
      snapshot.attachments = snapshot.attachments.filter(
        (file) => !(file.ownerType === 'job' && file.ownerId === id),
      );
    });
  },

  async createInvoice(input: NewInvoice) {
    return mutate((snapshot) => {
      const row: Invoice = {
        ...input,
        id: uid('inv'),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      snapshot.invoices.unshift(row);
      return row;
    });
  },

  async updateInvoice(id, patch) {
    return mutate((snapshot) => patchRow(snapshot.invoices, id, patch, 'Invoice'));
  },

  async deleteInvoice(id) {
    mutate((snapshot) => {
      snapshot.invoices = snapshot.invoices.filter((inv) => inv.id !== id);
    });
  },

  async reset() {
    write(seedSnapshot());
  },
};
