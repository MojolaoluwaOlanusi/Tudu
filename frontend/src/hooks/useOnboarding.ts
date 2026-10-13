import { useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingService, type SeedResult } from '../services/onboardingService';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../lib/queryClient';

/**
 * Seeds the user's first board from a template. Invalidates both boards and
 * tasks on success, because the seed can add columns and example cards.
 */
export const useSeedBoard = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<SeedResult, unknown, string>({
    mutationFn: (template) => onboardingService.seed(token!, template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};
