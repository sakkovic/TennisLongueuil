import { useMutation, useQuery } from '@tanstack/react-query';

import { useInvalidateLessons } from '@/features/lessons/hooks';
import { queryKeys } from '@/lib/queryClient';

import { fetchMember, fetchMembers, setMemberActive, setMemberLevel } from './api';

export function useMembers() {
  return useQuery({ queryKey: queryKeys.members, queryFn: fetchMembers });
}

export function useMember(memberId: string) {
  return useQuery({
    queryKey: queryKeys.member(memberId),
    queryFn: () => fetchMember(memberId),
    enabled: Boolean(memberId),
  });
}

export function useSetMemberLevel() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: ({ memberId, levelId }: { memberId: string; levelId: number }) =>
      setMemberLevel(memberId, levelId),
    onSettled: invalidate,
  });
}

export function useSetMemberActive() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: ({ memberId, active }: { memberId: string; active: boolean }) =>
      setMemberActive(memberId, active),
    onSettled: invalidate,
  });
}
