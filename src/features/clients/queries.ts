import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type { ClientListItem, ClientStatus } from './lib';

type DB = SupabaseClient<Database>;

export interface ClientNote {
  id: string;
  body: string;
  createdAt: string;
}

export interface ClientFile {
  id: string;
  fileName: string;
  storagePath: string;
  createdAt: string;
  signedUrl: string | null;
}

export interface ClientProfile {
  clientId: string;
  name: string | null;
  email: string | null;
  avatarPath: string | null;
  status: ClientStatus;
  goals: string | null;
  injuries: string | null;
  tags: string[];
  startDate: string | null;
}

/**
 * All of a trainer's linked clients (client_id set). Leads/pending invites belong to P1-02.
 * The profile embed is RLS-scoped: an archived client's profile row is not readable, so its
 * name/avatar come back null and the UI falls back to the email or a placeholder.
 */
export async function listClients(
  supabase: DB,
  trainerId: string,
): Promise<{ items: ClientListItem[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('trainer_clients')
    .select(
      'client_id, status, tags, start_date, invite_email, profile:profiles!trainer_clients_client_id_fkey(full_name, avatar_path)',
    )
    .eq('trainer_id', trainerId)
    .not('client_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) return { items: null, error: error.message };

  const items: ClientListItem[] = (data ?? []).map((row) => ({
    clientId: row.client_id as string,
    name: row.profile?.full_name ?? null,
    email: row.invite_email ?? null,
    avatarPath: row.profile?.avatar_path ?? null,
    status: row.status,
    tags: row.tags ?? [],
    startDate: row.start_date ?? null,
  }));
  return { items, error: null };
}

/** The trainer_clients row for one client, or null when the trainer is not linked (→ not-found). */
export async function getClientForTrainer(
  supabase: DB,
  trainerId: string,
  clientId: string,
): Promise<ClientProfile | null> {
  const { data, error } = await supabase
    .from('trainer_clients')
    .select(
      'client_id, status, goals, injuries_notes, tags, start_date, invite_email, profile:profiles!trainer_clients_client_id_fkey(full_name, avatar_path)',
    )
    .eq('trainer_id', trainerId)
    .eq('client_id', clientId)
    .maybeSingle();

  if (error || !data || !data.client_id) return null;

  return {
    clientId: data.client_id,
    name: data.profile?.full_name ?? null,
    email: data.invite_email ?? null,
    avatarPath: data.profile?.avatar_path ?? null,
    status: data.status,
    goals: data.goals ?? null,
    injuries: data.injuries_notes ?? null,
    tags: data.tags ?? [],
    startDate: data.start_date ?? null,
  };
}

export async function listNotes(
  supabase: DB,
  trainerId: string,
  clientId: string,
): Promise<{ notes: ClientNote[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('client_notes')
    .select('id, body, created_at')
    .eq('trainer_id', trainerId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) return { notes: null, error: error.message };
  return {
    notes: (data ?? []).map((n) => ({ id: n.id, body: n.body, createdAt: n.created_at })),
    error: null,
  };
}

export async function listFiles(
  supabase: DB,
  trainerId: string,
  clientId: string,
): Promise<{ files: ClientFile[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('client_files')
    .select('id, file_name, storage_path, created_at')
    .eq('trainer_id', trainerId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) return { files: null, error: error.message };

  const rows = data ?? [];
  const signed = await Promise.all(
    rows.map((f) => supabase.storage.from('client-files').createSignedUrl(f.storage_path, 3600)),
  );
  const files: ClientFile[] = rows.map((f, i) => ({
    id: f.id,
    fileName: f.file_name,
    storagePath: f.storage_path,
    createdAt: f.created_at,
    signedUrl: signed[i]?.data?.signedUrl ?? null,
  }));
  return { files, error: null };
}
