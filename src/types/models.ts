import type { Database, Enums, Tables } from './database';

export type UserRole = Enums<'user_role'>;
export type LessonStatus = Enums<'lesson_status'>;
export type RegistrationStatus = Enums<'registration_status'>;

export type PlayerLevel = Tables<'player_levels'>;

/** Full member record (own profile, or any member for admins). */
export interface Member {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_path: string | null;
  role: UserRole;
  player_level_id: number | null;
  player_level_name: string | null;
  active: boolean;
  /** When the coach first approved the account. NULL means it is still pending. */
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  upcoming_lessons_count: number;
}

/**
 * An account is unusable both before the coach approves it and after they
 * deactivate it. `approved_at` tells the two apart, so each one gets its own
 * explanation instead of a single confusing "inactive".
 */
export type AccountState = 'pending' | 'active' | 'deactivated';

export function getAccountState(member: Pick<Member, 'active' | 'approved_at'>): AccountState {
  if (member.active) return 'active';
  return member.approved_at ? 'deactivated' : 'pending';
}

type MemberDetailsRow = Database['public']['CompositeTypes']['member_details'];

/** Composite type fields are nullable in generated types; the SQL never returns nulls for these. */
export function toMember(row: MemberDetailsRow): Member {
  return {
    id: row.id ?? '',
    full_name: row.full_name ?? '',
    email: row.email ?? '',
    phone: row.phone,
    avatar_path: row.avatar_path,
    role: row.role ?? 'player',
    player_level_id: row.player_level_id,
    player_level_name: row.player_level_name,
    active: row.active ?? false,
    approved_at: row.approved_at,
    created_at: row.created_at ?? '',
    updated_at: row.updated_at ?? '',
    upcoming_lessons_count: row.upcoming_lessons_count ?? 0,
  };
}

/** Result of join_lesson / cancel_registration. */
export interface RegistrationResult {
  success: boolean;
  status: RegistrationStatus;
  registration_id: string;
  lesson_id: string;
  registered_count: number;
  capacity: number;
}

/** Result of admin_set_member_active. */
export interface SetMemberActiveResult {
  success: boolean;
  active: boolean;
  /** True only for the first approval of a pending sign-up. */
  approved: boolean;
  cancelled_registrations: number;
}
