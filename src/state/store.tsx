import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  Attachment,
  AttachmentKind,
  AttachmentOwner,
  Estimate,
  EstimateStatus,
  Invoice,
  InvoiceStatus,
  Job,
  JobStatus,
  Lead,
  LineItem,
  Snapshot,
  Stage,
} from '../types';
import { EMPTY_SNAPSHOT } from '../types';
import { getRepository } from '../data';
import { normalizeLeadInput, type CreateLeadInput } from '../data/leadIntake';
import { documentTotal, nextNumber } from '../lib/derive';
import { addDays, todayIso } from '../lib/format';
import { uid } from '../lib/id';

interface StoreValue {
  snapshot: Snapshot;
  loading: boolean;
  error: string | null;
  backend: 'local' | 'supabase';
  refresh(): Promise<void>;

  /** The single lead-creation entry point the whole UI uses. */
  createLead(input: CreateLeadInput): Promise<Lead>;
  updateLead(id: string, patch: Partial<Lead>): Promise<void>;
  setLeadStage(id: string, stage: Stage): Promise<void>;
  deleteLead(id: string): Promise<void>;

  addNote(leadId: string, body: string): Promise<void>;
  deleteNote(id: string): Promise<void>;

  addAttachment(
    ownerType: AttachmentOwner,
    ownerId: string,
    kind: AttachmentKind,
    file: File,
  ): Promise<Attachment>;
  deleteAttachment(id: string): Promise<void>;

  createEstimate(leadId: string, title: string): Promise<Estimate>;
  updateEstimate(id: string, patch: Partial<Estimate>): Promise<void>;
  setEstimateStatus(id: string, status: EstimateStatus): Promise<void>;
  deleteEstimate(id: string): Promise<void>;

  createJobFromEstimate(estimateId: string): Promise<Job>;
  createJob(leadId: string, title: string): Promise<Job>;
  updateJob(id: string, patch: Partial<Job>): Promise<void>;
  setJobStatus(id: string, status: JobStatus): Promise<void>;
  deleteJob(id: string): Promise<void>;

  createInvoiceFromJob(jobId: string): Promise<Invoice>;
  updateInvoice(id: string, patch: Partial<Invoice>): Promise<void>;
  setInvoiceStatus(id: string, status: InvoiceStatus): Promise<void>;
  deleteInvoice(id: string): Promise<void>;

  resetDemoData(): Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

const repository = getRepository();

/** Copies line items so an invoice can pull from an estimate without sharing ids. */
function cloneLineItems(items: LineItem[]): LineItem[] {
  return items.map((item) => ({ ...item, id: uid('li') }));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await repository.load();
      setSnapshot(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<StoreValue>(() => {
    /** Runs a repository write, then reloads. Small dataset, always-correct UI. */
    const commit = async <T,>(work: () => Promise<T>): Promise<T> => {
      try {
        const result = await work();
        await refresh();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong.';
        setError(message);
        throw err;
      }
    };

    const current = () => snapshot;

    return {
      snapshot,
      loading,
      error,
      backend: repository.kind,
      refresh,

      createLead: (input) =>
        commit(() => repository.createLead(normalizeLeadInput(input))),

      updateLead: async (id, patch) => {
        await commit(() => repository.updateLead(id, patch));
      },

      setLeadStage: async (id, stage) => {
        await commit(() => repository.updateLead(id, { stage }));
      },

      deleteLead: async (id) => {
        await commit(() => repository.deleteLead(id));
      },

      addNote: async (leadId, body) => {
        await commit(() => repository.addNote(leadId, body.trim()));
      },

      deleteNote: async (id) => {
        await commit(() => repository.deleteNote(id));
      },

      addAttachment: (ownerType, ownerId, kind, file) =>
        commit(() =>
          repository.addAttachment(
            {
              ownerType,
              ownerId,
              kind,
              name: file.name,
              mimeType: file.type,
              size: file.size,
              url: '',
            },
            file,
          ),
        ),

      deleteAttachment: async (id) => {
        await commit(() => repository.deleteAttachment(id));
      },

      createEstimate: (leadId, title) =>
        commit(() =>
          repository.createEstimate({
            leadId,
            number: nextNumber(current().estimates.map((e) => e.number), 'EST', 1001),
            title,
            issueDate: todayIso(),
            status: 'draft',
            notes: '',
            lineItems: [{ id: uid('li'), description: '', qty: 1, unitPrice: 0 }],
          }),
        ),

      updateEstimate: async (id, patch) => {
        await commit(() => repository.updateEstimate(id, patch));
      },

      setEstimateStatus: async (id, status) => {
        const estimate = current().estimates.find((e) => e.id === id);
        await commit(async () => {
          await repository.updateEstimate(id, { status });
          if (!estimate) return;
          // Pipeline follows the paperwork: sending an estimate or getting a
          // yes/no back moves the lead along unless it is already further on.
          if (status === 'sent') {
            const lead = current().leads.find((l) => l.id === estimate.leadId);
            if (lead && (lead.stage === 'new_lead' || lead.stage === 'contacted')) {
              await repository.updateLead(lead.id, { stage: 'estimate_sent' });
            }
          }
          if (status === 'accepted') {
            await repository.updateLead(estimate.leadId, { stage: 'won' });
          }
          if (status === 'declined') {
            await repository.updateLead(estimate.leadId, { stage: 'lost' });
          }
        });
      },

      deleteEstimate: async (id) => {
        await commit(() => repository.deleteEstimate(id));
      },

      createJobFromEstimate: (estimateId) => {
        const estimate = current().estimates.find((e) => e.id === estimateId);
        if (!estimate) throw new Error('Estimate not found.');
        return commit(async () => {
          const job = await repository.createJob({
            leadId: estimate.leadId,
            estimateId: estimate.id,
            title: estimate.title || 'Job',
            startDate: todayIso(),
            endDate: addDays(todayIso(), 14),
            status: 'scheduled',
            notes: '',
          });
          if (estimate.status !== 'accepted') {
            await repository.updateEstimate(estimate.id, { status: 'accepted' });
          }
          await repository.updateLead(estimate.leadId, { stage: 'won' });
          return job;
        });
      },

      createJob: (leadId, title) =>
        commit(async () => {
          const job = await repository.createJob({
            leadId,
            estimateId: null,
            title,
            startDate: todayIso(),
            endDate: addDays(todayIso(), 14),
            status: 'scheduled',
            notes: '',
          });
          await repository.updateLead(leadId, { stage: 'won' });
          return job;
        }),

      updateJob: async (id, patch) => {
        await commit(() => repository.updateJob(id, patch));
      },

      setJobStatus: async (id, status) => {
        const job = current().jobs.find((j) => j.id === id);
        await commit(async () => {
          await repository.updateJob(id, { status });
          if (!job) return;
          if (status === 'in_progress') {
            await repository.updateLead(job.leadId, { stage: 'in_progress' });
          }
          if (status === 'completed') {
            await repository.updateLead(job.leadId, { stage: 'completed' });
          }
        });
      },

      deleteJob: async (id) => {
        await commit(() => repository.deleteJob(id));
      },

      createInvoiceFromJob: (jobId) => {
        const job = current().jobs.find((j) => j.id === jobId);
        if (!job) throw new Error('Job not found.');
        const estimate = current().estimates.find((e) => e.id === job.estimateId);
        return commit(async () => {
          const invoice = await repository.createInvoice({
            jobId: job.id,
            leadId: job.leadId,
            number: nextNumber(current().invoices.map((i) => i.number), 'INV', 2001),
            issueDate: todayIso(),
            dueDate: addDays(todayIso(), 14),
            status: 'draft',
            paymentLink: '',
            notes: '',
            lineItems: estimate
              ? cloneLineItems(estimate.lineItems)
              : [{ id: uid('li'), description: job.title, qty: 1, unitPrice: 0 }],
          });
          await repository.updateLead(job.leadId, { stage: 'invoiced' });
          return invoice;
        });
      },

      updateInvoice: async (id, patch) => {
        await commit(() => repository.updateInvoice(id, patch));
      },

      setInvoiceStatus: async (id, status) => {
        const invoice = current().invoices.find((i) => i.id === id);
        await commit(async () => {
          await repository.updateInvoice(id, { status });
          if (!invoice) return;
          if (status === 'sent' || status === 'overdue') {
            await repository.updateLead(invoice.leadId, { stage: 'invoiced' });
          }
          if (status === 'paid') {
            await repository.updateLead(invoice.leadId, { stage: 'paid' });
          }
        });
      },

      deleteInvoice: async (id) => {
        await commit(() => repository.deleteInvoice(id));
      },

      resetDemoData: async () => {
        if (!repository.reset) throw new Error('Reset is only available in local demo mode.');
        await commit(() => repository.reset!());
      },
    };
  }, [snapshot, loading, error, refresh]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>.');
  return ctx;
}

/** Convenience lookups used all over the detail pages. */
export function useLead(id: string | undefined): Lead | undefined {
  const { snapshot } = useStore();
  return snapshot.leads.find((lead) => lead.id === id);
}

export function useAttachments(ownerType: AttachmentOwner, ownerId: string): Attachment[] {
  const { snapshot } = useStore();
  return snapshot.attachments.filter(
    (file) => file.ownerType === ownerType && file.ownerId === ownerId,
  );
}

export { documentTotal };
