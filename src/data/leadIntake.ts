/**
 * THE single entry point for creating a lead.
 *
 * Every path that creates a lead — the "Add Lead" form today, and tomorrow a
 * Zapier webhook watching the quote-form inbox or an embedded form on the
 * website — goes through `normalizeLeadInput` + `repository.createLead`.
 *
 * This module is deliberately free of React and of any storage client so the
 * exact same validation can run in a Supabase Edge Function / API route later.
 * See docs/LEAD_INTAKE.md.
 */
import type { Lead, LeadSource, Stage } from '../types';
import { LEAD_SOURCES } from '../types';

/** The shape of the website quote form: name, email, phone, address, description. */
export interface CreateLeadInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
  source?: string;
  stage?: Stage;
  /** Optional ISO timestamp, so an import can preserve the original submit time. */
  createdAt?: string;
}

export type NormalizedLead = Omit<Lead, 'id' | 'updatedAt'>;

export class LeadValidationError extends Error {
  readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super(Object.values(fieldErrors)[0] ?? 'Invalid lead');
    this.name = 'LeadValidationError';
    this.fieldErrors = fieldErrors;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function coerceSource(value: string | undefined): LeadSource {
  if (!value) return 'other';
  const slug = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const aliases: Record<string, LeadSource> = {
    website: 'website_form',
    web: 'website_form',
    website_form: 'website_form',
    quote_form: 'website_form',
    form: 'website_form',
    ig: 'instagram',
    insta: 'instagram',
    instagram: 'instagram',
    referral: 'referral',
    referred: 'referral',
    walk_in: 'walk_in',
    walkin: 'walk_in',
  };
  const mapped = aliases[slug];
  if (mapped) return mapped;
  return (LEAD_SOURCES as readonly string[]).includes(slug) ? (slug as LeadSource) : 'other';
}

function clean(value: string | undefined): string {
  return (value ?? '').trim();
}

/**
 * Validates and normalizes raw lead input from any source.
 * Throws LeadValidationError with per-field messages when the input is unusable.
 */
export function normalizeLeadInput(input: CreateLeadInput): NormalizedLead {
  const name = clean(input.name);
  const email = clean(input.email).toLowerCase();
  const phone = clean(input.phone);
  const errors: Record<string, string> = {};

  if (!name) errors.name = 'Name is required.';
  if (!email && !phone) errors.email = 'Add an email or a phone number.';
  if (email && !EMAIL_RE.test(email)) errors.email = "That email doesn't look right.";

  if (Object.keys(errors).length > 0) throw new LeadValidationError(errors);

  const createdAt = input.createdAt ?? new Date().toISOString();

  return {
    name,
    email,
    phone,
    address: clean(input.address),
    description: clean(input.description),
    source: coerceSource(input.source),
    stage: input.stage ?? 'new_lead',
    createdAt,
  };
}

/** True when two leads look like the same person — used to warn on duplicates. */
export function isLikelyDuplicate(a: NormalizedLead, b: Lead): boolean {
  const email = a.email && b.email && a.email === b.email.toLowerCase();
  const digits = (s: string) => s.replace(/\D/g, '');
  const phone = a.phone && b.phone && digits(a.phone) === digits(b.phone);
  return Boolean(email || phone);
}
