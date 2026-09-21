import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

import { updateMyProfile, updatePassword, uploadMyAvatar, type ProfileUpdate } from './api';

function useInvalidateProfile() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
      // Name and photo also appear in participant lists.
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons }),
    ]);
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (update: ProfileUpdate) => {
      if (!user) throw new Error('NOT_AUTHENTICATED');
      return updateMyProfile(user.id, update);
    },
    onSuccess: invalidate,
  });
}

export function useUploadAvatar() {
  const { user } = useAuth();
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (localUri: string) => {
      if (!user) throw new Error('NOT_AUTHENTICATED');
      return uploadMyAvatar(user.id, localUri);
    },
    onSuccess: invalidate,
  });
}

export function useUpdatePassword() {
  return useMutation({ mutationFn: updatePassword });
}
