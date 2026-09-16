import type { CrmRepository } from './repository';
import { localRepository } from './localRepository';
import { supabaseRepository } from './supabaseRepository';
import { isSupabaseConfigured } from './supabaseClient';

/**
 * The one place the app decides where data lives. Fill in the Supabase env
 * vars and every screen switches over — no component changes.
 */
export function getRepository(): CrmRepository {
  return isSupabaseConfigured ? supabaseRepository : localRepository;
}

export type { CrmRepository };
