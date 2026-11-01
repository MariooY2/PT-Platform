import type { Database } from '@/lib/supabase/types';

// The exercise columns the library and detail view read (docs/data-model.md §5).
export type Exercise = Pick<
  Database['public']['Tables']['exercises']['Row'],
  | 'id'
  | 'trainer_id'
  | 'name'
  | 'primary_muscle'
  | 'secondary_muscles'
  | 'equipment'
  | 'category'
  | 'video_url'
  | 'instructions'
>;
