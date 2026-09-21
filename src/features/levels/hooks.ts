import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import type { PlayerLevel } from '@/types/models';

async function fetchLevels(): Promise<PlayerLevel[]> {
  const { data, error } = await supabase
    .from('player_levels')
    .select('id, name, rank, active, created_at')
    .order('rank');
  if (error) throw error;
  return data;
}

/** Player levels come from the database, so new levels need no app release. */
export function useLevels() {
  return useQuery({
    queryKey: queryKeys.levels,
    queryFn: fetchLevels,
    staleTime: 10 * 60_000,
  });
}

export function findLevel(levels: PlayerLevel[] | undefined, id: number | null | undefined) {
  if (id == null) return undefined;
  return levels?.find((level) => level.id === id);
}
