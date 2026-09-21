import { supabase } from '@/lib/supabase';
import { toMember, type Member, type SetMemberActiveResult } from '@/types/models';

/** Admin only: the database function rejects other callers with NOT_AUTHORIZED. */
export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase.rpc('admin_list_members');
  if (error) throw error;
  return (data ?? []).map(toMember);
}

export async function fetchMember(memberId: string): Promise<Member | null> {
  const { data, error } = await supabase.rpc('admin_list_members', { p_member_id: memberId });
  if (error) throw error;
  const row = data?.[0];
  return row ? toMember(row) : null;
}

/** The ONLY way a player level can change (admin_set_member_level checks the role). */
export async function setMemberLevel(memberId: string, levelId: number): Promise<void> {
  const { error } = await supabase.rpc('admin_set_member_level', {
    p_member_id: memberId,
    p_player_level_id: levelId,
  });
  if (error) throw error;
}

/** Deactivating also frees the member's spots in lessons that have not started. */
export async function setMemberActive(
  memberId: string,
  active: boolean,
): Promise<SetMemberActiveResult> {
  const { data, error } = await supabase.rpc('admin_set_member_active', {
    p_member_id: memberId,
    p_active: active,
  });
  if (error) throw error;
  return data as unknown as SetMemberActiveResult;
}

export function filterMembers(members: Member[], search: string): Member[] {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return members;
  return members.filter(
    (member) =>
      member.full_name.toLocaleLowerCase().includes(query) ||
      member.email.toLocaleLowerCase().includes(query),
  );
}
